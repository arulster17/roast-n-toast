# Roast & Toast

A live party game. Guests answer on their phones, answers appear on the big screen as word clouds, bars, photo tiles and caption walls, and the host runs and restyles everything from a console.

Static site (GitHub Pages) + Supabase (live data, host login, photo storage). Guests need no account.

## Addresses
- Guests: `https://YOUR-SITE/#play`
- TV: `https://YOUR-SITE/#tv`
- Host console: `https://YOUR-SITE/#host` (sign-in required)

## Set up (about 15 minutes)

### 1. Supabase
1. Create a free project at supabase.com.
2. SQL Editor > New query: paste `supabase/schema.sql`, Run. Then paste `supabase/seed.sql`, Run (loads the starter questions). Both are safe to run again, for example after you pull a newer `schema.sql`.
3. Authentication > Sign In / Providers: turn off "Allow new users to sign up". Hosts are added by hand in the next step, and nobody else needs an account.
4. Authentication > Users > Add user > Create new user. Use your email and a password, tick "Auto Confirm User".
5. SQL Editor: `insert into public.hosts (email) values ('your-email@example.com');` (the same email as step 4). Add more hosts the same way.
6. Authentication > URL Configuration: set Site URL to your published address (section 3 below). Add the same address under Redirect URLs. This is only needed for "email me a sign-in link".
7. Project Settings > API Keys: copy the Project URL and the public key (`anon` key or Publishable key, either works). Never use the `service_role` or Secret key.

### 2. Config
Put the two values into `config.js`, commit, push.

### 3. GitHub Pages
Repository Settings > Pages > Build from branch `main`, folder `/ (root)`. Your address is `https://<user>.github.io/<repo>/`.

### 4. Try it
Open `#host`, sign in, press "Start game", then open `#play` on a phone. Setup > "Add 12 sample answers" rehearses a question with fake guests.

## Try it locally (no Supabase needed)
From the repo root run `python3 -m http.server 8000`. Then open these as tabs in one browser:
- `http://localhost:8000/dev/#host` (any email, password `host`)
- `http://localhost:8000/dev/#tv`
- `http://localhost:8000/dev/#play`

The dev backend in `dev/` keeps everything in the browser and syncs the tabs. Add `?reset=1` to the URL to reload the starter questions. More in `dev/README.md`.

## Notes
- The anon key is meant to be public. Database rules (`schema.sql`) let guests write only their join record and answers to the live question while it is collecting. Once you close submissions or reveal, late answers are refused. Everything else needs a host login.
- Guests are anonymous, so the rules cannot tell one guest from another. A determined guest could still overwrite someone else's answer to the live question. Hide anything odd from the host console.
- "Email me a sign-in link": open the link on the same device and browser where you asked for it. Only the newest link works.
- Sign out only signs out that device. Your spare host device stays signed in.
- Free Supabase projects pause after a week of no activity. Open the host console the day before to wake it.
- Keep a spare device signed in as host. Arrow keys and Space move through the game.
- Files: `app.js` (TV, phone and host screens), `backend-supabase.js` (data, login, photos), `style.css`, `dev/` (local test backend).
