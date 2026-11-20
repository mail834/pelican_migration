# Sanity CMS

Project: `th8gmrhr`. Dataset: `production`.

The website is connected to published Sanity content. The initial import created 68 content documents: 44 independent page settings, 4 blog posts, 6 reusable videos, 11 video/text testimonials, 2 unique visa approvals and collection settings. Existing local content remains a fallback when the CMS is unavailable or collection management is disabled.

## Open the editor

Studio is hosted by Sanity at its own address, `https://<hostname>.sanity.studio`, separate from the public website. Keeping the editor on a different origin means a problem on a public page can never act with an editor's signed-in session. Sign in with a Sanity account that belongs to this project. Sanity controls editor permissions; no write token is exposed to the public website. When `SANITY_STUDIO_URL` is set on the website, `https://<website>/studio` redirects editors there.

### Deploy or update the hosted Studio

```sh
npm ci --prefix studio                # once per checkout
(cd studio && npx sanity login)       # once, as a project administrator
npm run cms:deploy                    # builds and uploads Studio; first run asks for a hostname
```

After the first deploy, set `SANITY_STUDIO_HOSTNAME=<hostname>` in `studio/.env` to skip the prompt, and set `SANITY_STUDIO_URL=https://<hostname>.sanity.studio` in the website's Vercel environment. Redeploy Studio after any schema change in `studio/schemaTypes`.

In Sanity Manage → API → CORS origins, keep only the Studio host (added automatically on deploy) and `http://localhost:3333` for local editing. The website reads Sanity only from the server, so it needs no CORS entry. Remove any entry for the public website domain or `http://localhost:3000`.

### Local editing

```sh
npm run cms:studio
```

This opens `http://localhost:3333`. Studio is a separate app, so its editing packages do not increase the website’s visitor JavaScript bundle.

The website no longer builds or serves Studio. Studio dependencies (`npm ci --prefix studio`) are needed only on machines that edit schemas, run imports or deploy Studio. `npm run cms:build` checks that Studio compiles without deploying it.

## What editors can manage

| Studio area | Website behavior |
| --- | --- |
| Visa Approvals | Upload approval images with alt text, country, visa type and display order. `Feature on homepage` controls the home selection; the gallery shows the collection. Approvals are real client documents: tick `Personal data redacted` only after checking that the name, passport/UCI/file numbers, date of birth, address and signature are hidden. Studio won't publish without it, and the website never shows an unticked approval. |
| Videos | Add an 11-character YouTube ID or upload compressed MP4/WebM. Upload a thumbnail; optional WebVTT captions are supported for uploaded videos. Long videos are best streamed through YouTube. |
| Testimonials | Choose video or text, client display name, quote/rating or a reusable video. Homepage features video testimonials only. |
| Page Sections → choose a page | Edit only that page’s FAQ questions/answers, guide video and testimonial selection. Drag references/FAQ items to reorder. Country pages remain independent. The path on these pinned records is fixed. |
| Blog Posts | Create/edit a slug, publication date, cover image/alt, excerpt, rich article body and SEO title/description. The editor supports headings, links, lists, emphasis, quotes and article images. |
| Collection Settings | Switch the approval, blog and homepage testimonial collections between CMS-managed content and local fallbacks. Imported settings enable CMS management. An empty managed collection stays empty. |

New blog URLs work without rebuilding. Published posts with a future publication date appear after that time and the next cache refresh. Unpublishing/deleting an article in managed mode removes it rather than restoring an old local article. A missing/unavailable CMS connection uses the local fallback; this is availability behavior, not a permanent content backup.

The homepage’s video testimonial collection is controlled by Collection Settings and each testimonial’s homepage flag. Other pages use their own selected video/text testimonials. To configure FAQ/testimonial/guide sections for a newly created blog URL, use “All / additional page settings” and enter its `/blogs/slug` path.

The guide video fields contain the existing section heading and introduction. Actual service-guide videos were not available in the original implementation; choose a reusable video and enable that section to publish it. The importer intentionally leaves these guide sections disabled until a source is assigned.

## Caching and publishing webhook

Website queries run only on the server, use the published perspective, request selected fields with bounded lists, and are cached for one hour in production. Development bypasses the persistent data cache. Video iframes/files are mounted only when a visitor presses Play. Next Image handles responsive image sizing and lazy loading against Sanity’s image CDN.

Set `SANITY_REVALIDATE_SECRET` in the website’s hosting environment. A random local secret was generated in `.env.local`; never publish it in client configuration.

In Sanity Manage → API → Webhooks, create a webhook:

- URL: `https://YOUR_WEBSITE_DOMAIN/api/sanity/revalidate`
- Dataset: `production`
- Triggers: create, update and delete
- Secret: the same `SANITY_REVALIDATE_SECRET`
- Drafts: excluded
- Filter:

```groq
!(_id in path("drafts.**")) && _type in [
  "pageContent", "blogPost", "visaApproval", "testimonial", "video",
  "siteContent", "sanity.imageAsset", "sanity.fileAsset"
]
```

Projection:

```groq
{
  "_type": coalesce(after()._type, before()._type),
  "pagePath": coalesce(after().pagePath, before().pagePath),
  "previousPagePath": before().pagePath,
  "slug": coalesce(after().slug.current, before().slug.current),
  "previousSlug": before().slug.current
}
```

The endpoint validates Sanity’s signature over the raw request body before invalidating content-specific tags. It also handles old/new page paths and article slugs. Video/testimonial edits invalidate cached referring page content. The webhook must target the deployed Next.js website, not the old WordPress site. Localhost is not reachable from Sanity; rely on development’s uncached fetches locally.

## Configuration

Website (`.env.local` locally, hosting environment in production):

```text
SANITY_PROJECT_ID=th8gmrhr
SANITY_DATASET=production
SANITY_API_READ_TOKEN=         # required: Viewer token, the dataset is private
SANITY_REVALIDATE_SECRET=      # server-only webhook secret
```

The Studio build maps `SANITY_PROJECT_ID` and `SANITY_DATASET` to its public `SANITY_STUDIO_*` equivalents automatically, so root `.env.local` works for Studio commands too. Tokens and webhook secrets are never mapped to public variables.

### Private dataset

The `production` dataset is private, so anonymous API queries see no documents. Without `SANITY_API_READ_TOKEN`, the website quietly falls back to local content, so set the token before switching the dataset to private. The steps, in order:

1. In sanity.io/manage → project `th8gmrhr` → API → Tokens, create a token with the **Viewer** role. Add it as `SANITY_API_READ_TOKEN` in `.env.local` and in the Vercel environment, then redeploy.
2. Make the dataset private: `cd studio && npx sanity dataset visibility set production private`.
3. Check: `node --env-file=.env.local scripts/verify-cms-live.cjs` should report `DATA-001: dataset is not publicly readable`.

Uploaded images and files on `cdn.sanity.io` stay reachable by URL even when the dataset is private. Anyone can open an asset whose URL they know, but nobody can list the assets anymore. A private dataset does not replace redaction.

Studio (`studio/.env`):

```text
SANITY_STUDIO_PROJECT_ID=th8gmrhr
SANITY_STUDIO_DATASET=production
```

Use `SANITY_WRITE_TOKEN` only for the import script, in root `.env.local` or `studio/.env`, never with a `SANITY_STUDIO_` or `NEXT_PUBLIC_` prefix. The website does not need write access. Remove the import token from the production website environment after importing; keep it only where future deliberate imports run.

## Repeatable import

```sh
npm run cms:export
npm run seed --prefix studio
npm run seed --prefix studio -- --apply
```

The default seed command is a dry run. `--apply` uploads the existing local image assets and uses deterministic IDs with `createIfNotExists`; it never replaces edited documents. Re-exporting only changes local import files, not Sanity. Asset uploads are deduplicated by Sanity. The two approval images are imported once each rather than reproducing the repeated sample cards.

## Validation

- `npm run test:cms`: page isolation, empty collections, unpublishing, invalidation, signed webhook checks, lazy video mount and import records (mocked network).
- `node scripts/verify-cms-live.cjs`: read-only GROQ query checks against this project.
- `npm run typecheck --prefix studio`
- `npm run cms:build`
- `npm run build`

`NEXT_BUILD_DIR=.next-cms npm run build` supports a fresh isolated production build without touching a running development server’s `.next` directory. The default output remains `.next`.

## Optimized website images

The 236 raster assets were compressed to WebP (quality 85, transparency preserved, maximum 2560 × 2560 without upscaling), then uploaded to this project's Sanity image CDN. Their combined size fell from 250.65 MB to 26.33 MB. `src/content/image-assets.json` maps the original readable content paths to CDN URLs and asset references; these paths no longer require files in `public`. Keep this manifest in source control.

The custom Next Image loader requests responsive widths and automatic formats from Sanity directly, avoiding Vercel's image transformation pipeline. Plain certification/university images and decorative backgrounds use the same URL resolver. SVG logos and icons stay local. Existing CMS image fields were switched only when their asset hash matched the original local image, preserving editor replacements.

`node scripts/migrate-images.mjs --upload` compresses new raster files placed in `public/images` and adds missing mappings. Compression staging is ignored by Git and Vercel. After uploading a replacement for an existing path, deliberately update its manifest entry; the script preserves existing entries. Run `npm run cms:export` to refresh import records after adding assets. Run `npm run test:site` to check literal and generated content paths before removing migrated local files.

Keep `.media-cache` (it holds the byte-identical originals of the uploaded images). Sanity's public CDN serves only re-encoded copies of WebP files, so these local files are the only way to reproduce exact asset IDs, for example when moving to another Sanity project (`studio/scripts/copy-dataset.mjs --local-dir=../.media-cache`).

Vercel installs and builds only the website. The `studio` folder is excluded by `.vercelignore`.

## Bandwidth budget

The free Sanity plan includes 100 GB of CDN bandwidth per month. Sanity bills every byte its CDN serves, including its own cache hits. Browsers cache images for a year, so returning visitors cost nothing. New visitors pay the full page weight.

How the site keeps that small:

- **Quality by width** (`src/lib/image-url.ts`): q=75 up to 640px, q=65 above. Widths above 640px are requested almost only by 2–3× screens, where the difference is not visible.
- **Width ladder capped at 1920px** (`next.config.ts` → `images.deviceSizes`). Next's default reaches 3840px.
- **Every image has an explicit width.** Plain `<img>` tags pass one to `imageUrl()` and lazy-load. Never call `imageUrl(path)` without a width for a visible image, because that serves the full original.
- **`auto=format`** serves AVIF/WebP. AVIF is generated in the background, so the first requests may be WebP.
- **Uploaded videos are limited to 25 MB** by the Studio schema. Prefer YouTube, because every view of an uploaded video downloads the whole file from Sanity.

Measured on a production build with a cold cache, scrolling each page to the bottom (19 Nov 2026, 10 representative pages):

| Device | Average per page | Homepage |
| --- | --- | --- |
| Phone 390px @3× | ≈ 270 KB | ≈ 1.4–1.7 MB |
| Laptop 1440px @1× | ≈ 160 KB | ≈ 550 KB |
| Retina 1440px @2× | ≈ 235 KB | ≈ 1.05 MB |

At about 270 KB per new-visitor page view, 100 GB covers roughly 350,000 page views a month. For the homepage on phones alone it is about 65,000. Planned next step: put a Cloudflare cache in front of the Sanity image CDN, so Sanity serves each image variant about once per edge location rather than once per visitor. Check actual usage in Sanity Manage → Usage.
