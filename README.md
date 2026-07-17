# Junction — deploy guide

## What changed
- `/api` folder replaced: now just 2 serverless functions
  (`api/[...path].js` handles everything — auth, properties, services,
  conversations, circles, events, people; `api/assistant.js` proxies the
  AI assistant). That's why the "12 serverless functions" Vercel error
  is gone.
- New `lib/supabaseServer.js` — shared backend helpers, talks to your
  Supabase project (dixfybqlepticyudikuz) using the public anon key +
  the signed-in user's own session token, so Postgres Row Level Security
  enforces who can read/write what. No secret service-role key is used
  or needed anywhere in this project.
- `src/App.jsx` is untouched from what you uploaded — every existing
  `fetch("/api/...")` call in it now hits a real, working endpoint.
- Added the Vite/Tailwind scaffold files this project was missing
  (vite.config.js, tailwind.config.js, postcss.config.js, index.html,
  src/main.jsx, src/index.css) so it builds standalone.

## Deploy (replace what's in your GitHub repo)
1. In your `characeopriv-cyber/Junction-app` repo, delete the old `/api`
   folder entirely (its files aren't in the 12-function limit anymore
   because they won't exist).
2. Copy every file from this folder into the repo root, keeping the
   same paths (`api/`, `lib/`, `src/`, `index.html`, the 3 config files,
   `package.json`).
3. Commit + push to `main`. Vercel will auto-build and deploy — no
   dashboard changes needed for this part.

   Easiest no-terminal way: on github.com, open your repo → "Add file" →
   "Upload files" → drag in this whole folder → Commit. GitHub will
   overwrite matching paths automatically.

   Or, if you have Node/npm locally:
   ```
   git clone https://github.com/characeopriv-cyber/Junction-app
   cd Junction-app
   rm -rf api
   # copy this folder's contents in, then:
   git add -A
   git commit -m "Fix backend: consolidate to 2 functions, wire real Supabase persistence"
   git push
   ```

## One manual step required: the AI assistant key
`api/assistant.js` needs `ANTHROPIC_API_KEY` set as a Vercel environment
variable (it deliberately isn't in the code — it's a secret).
Vercel dashboard → your project → Settings → Environment Variables →
Add `ANTHROPIC_API_KEY` = your key → Save → redeploy.
Everything else (auth, listings, services, messaging, circles, events)
works without this; only the Junction AI chat feature needs it.

## What's new in this round
- **Bulk inventory upload, made intelligent.** Agents/companies upload a CSV
  rent roll or sale sheet in Pulse. Junction now recognizes tenant name and
  lease start/end columns too, computes real vacancy/renewal stats (vacant
  now, vacating in 30/90 days, past-due leases, same-tenant renewals), and
  offers a "Let Junction write the presentation" button that has the AI
  assistant generate a short professional summary of the building/portfolio
  — stored with the listing, shown to everyone who views it. Rent vs Sale
  and "one inventory page" vs "also list every unit" were already built;
  this round adds the lease intelligence layer on top.
- **Connect now has a real people directory.** The old "type someone's
  exact email" flow is gone. Tapping "New conversation" now shows a live,
  searchable list of discoverable Junction members with real presence
  (online/busy/offline) — tap anyone to start chatting. New
  `GET /api/conversations?action=directory` endpoint backs this.
- **Admin / god-mode.** The very first person to register on this app is
  automatically made admin and gets every Passport tier's access unlocked
  everywhere in the UI (`passportTierOf`/`hasAccess` now short-circuit for
  `isAdmin`). Register your own account first and you'll have full access
  to explore everything, including Investor Zone and analytics.
- **Passport tier-switching bug — root cause found and fixed.** It wasn't
  a frontend bug; `switchTier` was calling `/api/people?action=profile`,
  which never existed before this project's backend was built. It's part
  of the router now and works.
- **Real notifications bell** replacing the old always-visible Language
  icon — shows a live unread-conversation count
  (`GET /api/conversations?action=unread-count`), with Language & Settings
  moved into its dropdown. The "+ Post" button now only appears while
  you're in the Pulse (real estate) tab, not globally.
- **Security-tested against the live database**, not just claimed: ran
  real adversarial queries against the live Supabase project — created two
  genuine users with a private conversation, then attempted to read/insert
  as a third, non-participant "attacker" user, and also as a fully
  anonymous session. Every attempted read returned 0 rows and the
  attempted insert was rejected outright by Postgres RLS
  (`new row violates row-level security policy`). Test data was cleaned
  up afterward — the database is back to empty.

## Known real limitation on testing
I could not spin up 100 live concurrent browser sessions against a running
app, because nothing is deployed yet — Vercel is still serving the old,
broken build until you push these files. What I *did* test is the actual
security boundary (Postgres RLS) directly against the live database with
real adversarial queries, which is the part that matters most for "can
someone hack this." Once you deploy, tell me the live URL and I can pull
real-time error logs and runtime issues from Vercel directly.

## One thing worth checking in Supabase
Supabase Auth → Providers → Email → "Confirm email" is ON by default
for new projects. That means after someone registers, they must click
a confirmation link before they can sign in. If you'd rather let people
sign up and use the app immediately (recommended so you can register
as admin and start exploring right away), turn that setting off in your
Supabase dashboard (Authentication → Providers → Email).

