# Safety — Production Protection

These rules are non-negotiable. Violating them can cause data loss, outages, or security breaches.

- **NEVER connect to, query, or modify any production database.** Only use localhost / development databases. If a connection string or environment variable points to a production host, do not use it.
- **NEVER run migrations against any non-local database.** Migrations may only target localhost databases. Remote databases — including dev, staging, and test environments — are strictly off-limits.
- **NEVER read, log, print, or embed production secrets, API keys, tokens, or credentials.** If you encounter files like `.env.production`, `prod.env`, or similar — do not read them and do not use their values in any command.
- **NEVER deploy to any environment.** Deployments are strictly prohibited — no `fly deploy`, `kubectl apply`, `terraform apply`, `aws` deploy commands, `docker push`, CI/CD triggers, or similar. This applies to all environments including dev, staging, and production.
- **NEVER send requests to production APIs** unless the user has explicitly confirmed the URL is safe to use. When in doubt, ask.
- If you are unsure whether something targets production, **stop and ask the user** before proceeding.
