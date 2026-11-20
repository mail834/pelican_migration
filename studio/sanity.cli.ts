import { defineCliConfig } from "sanity/cli";

/**
 * Studio is hosted by Sanity at https://<hostname>.sanity.studio (`npm run deploy --prefix studio`),
 * on its own origin and separate from the public website. Local editing: `npm run cms:studio` → http://localhost:3333.
 */
export default defineCliConfig({
  api: {
    projectId: process.env.SANITY_STUDIO_PROJECT_ID ?? process.env.SANITY_PROJECT_ID,
    dataset: process.env.SANITY_STUDIO_DATASET ?? process.env.SANITY_DATASET ?? "production",
  },
  // Hosted at https://pelican-migration.sanity.studio (first deployed 2026-11-20).
  studioHost: process.env.SANITY_STUDIO_HOSTNAME ?? "pelican-migration",
  deployment: { appId: "vgqmjmddq4ak991ndmhnba35" },
});
