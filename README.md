# Time Slots

Local-first personal scheduler with optional Supabase cloud sync.

## Local Development

```bash
./scripts/dev.sh
```

If your shell has no global `node`, the script falls back to the Codex bundled Node runtime.

To run a production build locally:

```bash
./scripts/build.sh
```

## Supabase Setup

1. Create a Supabase project.
2. Open the SQL editor and run `supabase/schema.sql`.
3. In Authentication settings, enable Email provider and magic links.
4. Add redirect URLs:
   - `http://127.0.0.1:3000`
   - your Vercel production URL
5. Copy `.env.local.example` to `.env.local` and fill:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
6. Restart the dev server.

The app remains local-first. Sign in with email, then use `Sync now` to push local IndexedDB data to Supabase and pull remote changes.

## Vercel Deployment

1. Push this project to GitHub.
2. Import it into Vercel as a Next.js project.
3. Add the same Supabase environment variables in Vercel Project Settings.
4. Add the Vercel production URL to Supabase Auth redirect URLs.
5. Deploy.
