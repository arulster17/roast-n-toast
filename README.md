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
2. SQL Editor > New query: paste `supabase/schema.sql`, Run. Then paste `supabase/seed.sql`, Run (loads the starter questions).
3. Authentication > Users > Add user > Create new user. Use your email and a password, tick "Auto Confirm User".
4. SQL Editor: `insert into public.hosts (email) values ('your-email@example.com');` (the same email as step 3). Add more hosts the same way.
5. Authentication > URL Configuration: set Site URL to your published address (step 3 below). Add the same address under Redirect URLs. This is only needed for "email me a sign-in link".
6. Project Settings > API: copy the Project URL and the `anon` public key.

### 2. Config
Put the two values into `config.js`, commit, push.

### 3. GitHub Pages
Repository Settings > Pages > Build from branch `main`, folder `/ (root)`. Your address is `https://<user>.github.io/<repo>/`.

### 4. Try it
Open `#host`, sign in, press "Start game", then open `#play` on a phone. Share & tools > "Add 12 sample answers" rehearses a question with fake guests.

## Notes
- The anon key is meant to be public. Database rules (`schema.sql`) let guests write only answers and their join record. Everything else needs a host login.
- Free Supabase projects pause after a week of no activity. Open the host console the day before to wake it.
- Keep a spare device signed in as host. Arrow keys and Space move through the game.
- Files: `app.js` (TV, phone and host screens), `backend-supabase.js` (data, login, photos), `style.css`.
