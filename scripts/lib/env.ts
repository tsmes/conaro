// Side-effect module: load Next.js-style env files (.env.local, .env.test,
// .env, …) from project root before the importing script touches process.env.
// Mirrors how `next dev` / `next build` resolve env so tsx-run scripts and
// drizzle config see the same values the app does. On Railway the .env*
// files don't exist; loadEnvConfig is then a no-op and process.env wins.
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());
