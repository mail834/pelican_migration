/**
 * Copy a Sanity export (NDJSON) into the project/dataset configured for this Studio, using the signed-in CLI user.
 *
 *   SANITY_STUDIO_PROJECT_ID=<target> npx sanity exec scripts/copy-dataset.mjs --with-user-token -- <export.ndjson>
 *     [--local-dir=../.media-cache] [--skip-unverifiable] [--apply]
 *
 * - Uploads EVERY image asset (not only referenced ones: the website links many assets by URL), verifies the new
 *   asset ID is identical to the source ID (Sanity derives it from the file's SHA-1), and restores asset metadata.
 * - Creates content documents in one transaction. Uses `create`, so it never overwrites an existing document.
 * - Dry run unless --apply. Refuses to run if the target dataset already has content documents.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { getCliClient } from "sanity/cli";

const args = process.argv.slice(2).filter((arg) => arg !== "--");
const apply = args.includes("--apply");
const file = args.find((arg) => !arg.startsWith("--"));
const expectedProject = process.env.SANITY_STUDIO_PROJECT_ID;
if (!file || !expectedProject) throw new Error("Usage: SANITY_STUDIO_PROJECT_ID=<target> sanity exec scripts/copy-dataset.mjs --with-user-token -- <export.ndjson> [--apply]");

const client = getCliClient({ apiVersion: "2025-02-19" });
const { projectId, dataset } = client.config();
if (projectId !== expectedProject) throw new Error(`Client is configured for ${projectId}, expected ${expectedProject}. Aborting.`);

const docs = fs.readFileSync(file, "utf8").trim().split("\n").map((line) => JSON.parse(line));
const assets = docs.filter((doc) => doc._type === "sanity.imageAsset" || doc._type === "sanity.fileAsset");
const content = docs.filter((doc) => !doc._type.startsWith("sanity.") && !doc._id.startsWith("_."));
const existing = await client.fetch(`count(*[!(_type match "sanity.*") && !(_type match "system.*") && !(_id in path("_.**"))])`);
console.log(`Target ${projectId}/${dataset}: ${existing} existing content documents.`);
console.log(`Source: ${assets.length} assets, ${content.length} content documents.`);
if (existing > 0) throw new Error("Target dataset already has content. Refusing to copy into it.");
if (!apply) { console.log("Dry run only. Re-run with --apply to copy."); process.exit(0); }

// Optional folder(s) of original files (e.g. ../.media-cache), indexed by SHA-1. The public CDN re-encodes
// WebP, so byte-identical originals (and therefore identical asset IDs) can come only from local copies.
const sha1Of = (bytes) => crypto.createHash("sha1").update(bytes).digest("hex");
const localFiles = new Map();
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
  const full = path.join(dir, entry.name);
  if (entry.isDirectory()) walk(full); else localFiles.set(sha1Of(fs.readFileSync(full)), full);
});
for (const arg of args.filter((a) => a.startsWith("--local-dir="))) walk(path.resolve(arg.slice("--local-dir=".length)));
const skipUnverifiable = args.includes("--skip-unverifiable");
const referenced = new Set(JSON.stringify(content).match(/(?:image|file)-[a-f0-9]{40}-[\w-]+/g) ?? []);

const METADATA_FIELDS = ["title", "description", "altText", "creditLine", "label", "source"];
const failures = [];
const skipped = [];
let done = 0;
async function originalBytes(asset) {
  if (localFiles.has(asset.sha1hash)) return fs.readFileSync(localFiles.get(asset.sha1hash));
  // Without an Accept header naming the original type, the CDN re-encodes WebP/AVIF to PNG/JPEG.
  const response = await fetch(asset.url, { headers: { Accept: `${asset.mimeType},*/*;q=0.1` }, signal: AbortSignal.timeout(60_000) });
  if (!response.ok) throw new Error(`download ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  return sha1Of(bytes) === asset.sha1hash ? bytes : null;
}
async function copyAsset(asset) {
  const kind = asset._type === "sanity.imageAsset" ? "image" : "file";
  const bytes = await originalBytes(asset);
  if (!bytes) {
    if (skipUnverifiable && !referenced.has(asset._id)) { skipped.push(`${asset._id} (${asset.originalFilename})`); return; }
    throw new Error("no byte-identical original available (CDN copy is re-encoded); provide it via --local-dir");
  }
  const uploaded = await client.assets.upload(kind, bytes, { filename: asset.originalFilename, contentType: asset.mimeType });
  if (uploaded._id !== asset._id) throw new Error(`asset ID changed: ${asset._id} -> ${uploaded._id}`);
  const metadata = Object.fromEntries(METADATA_FIELDS.filter((key) => asset[key] != null).map((key) => [key, asset[key]]));
  if (Object.keys(metadata).length) await client.patch(asset._id).set(metadata).commit();
}
const queue = [...assets];
await Promise.all(Array.from({ length: 6 }, async () => {
  for (let asset = queue.shift(); asset; asset = queue.shift()) {
    try { await copyAsset(asset); } catch (error) { failures.push(`${asset._id}: ${error.message}`); }
    if (++done % 25 === 0 || done === assets.length) console.log(`Assets ${done}/${assets.length}`);
  }
}));
if (skipped.length) console.log(`Skipped ${skipped.length} unreferenced asset(s) with no verifiable original:\n  ${skipped.join("\n  ")}`);
if (failures.length) { console.error(`${failures.length} asset(s) failed; content NOT copied:\n${failures.join("\n")}`); process.exit(1); }

const transaction = client.transaction();
for (const { _rev, _updatedAt, ...doc } of content) transaction.create(doc);
await transaction.commit({ visibility: "sync" });
const counts = await client.fetch(`{"assets": count(*[_type in ["sanity.imageAsset", "sanity.fileAsset"]]), "content": count(*[!(_type match "sanity.*") && !(_type match "system.*") && !(_id in path("_.**"))])}`);
console.log(`Copied. Target now has ${counts.assets} assets and ${counts.content} content documents.`);
