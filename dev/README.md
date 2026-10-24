# Dev harness

Runs the whole game in one browser with no Supabase project. `backend-dev.js` replaces `backend-supabase.js` with an in-memory stand-in that keeps data in `localStorage` and syncs it between tabs.

## Run it

From the repo root:

```
python3 -m http.server 8000
```

Then open these in separate tabs or windows of the same browser:

- Host console: http://localhost:8000/dev/#host (any email, password `host`)
- TV: http://localhost:8000/dev/#tv
- Guest phone: http://localhost:8000/dev/#play (use the browser's device toolbar for a phone-sized view)

The dev page loads the real `app.js` and `style.css` from the repo root, so whatever you change there shows up on reload.

## Notes

- **Start over:** add `?reset=1` once, e.g. `http://localhost:8000/dev/?reset=1#host`. That reloads the starter questions from `seed.js` and clears answers and photos. You can also run `RT_DEV.reset()` in the console.
- **Seed data:** `seed.js` is generated from `supabase/seed.sql`. Regenerate it if the seed changes.
- **Access rules:** the dev backend copies the database rules. Signed out, a tab can only send answers to the live, open question and its own join record. Signed in, everything is allowed. Every tab shares one sign-in, so sign out in the host tab to test as a guest.
- **Photos:** photos are stored as data URLs in `localStorage`. Browser storage is small (about 5 MB), so a dozen photos is the practical limit.
- **"Email me a link":** not available here. It only works against Supabase.
- **Dump the data:** `RT_DEV.dump()` in the console returns all stored data.
