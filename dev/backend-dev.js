/* Dev stand-in for backend-supabase.js. Same window.RT_BACKEND interface, no network.
   Data lives in localStorage and syncs across tabs of one browser (BroadcastChannel + storage events).
   Host login: any email, password "host". Add ?reset=1 to the URL to reload the seed data.
   Mirrors the database rules: signed-out visitors may only write answers and guests, and may not delete. */
(function () {
  'use strict';
  var KEY = 'rtdev_docs', PKEY = 'rtdev_photos', SKEY = 'rtdev_session', PASSWORD = 'host';
  var B = { configured: true, db: null, auth: null, assets: null, dev: true };
  var bc = null; try { bc = new BroadcastChannel('rtdev'); } catch (e) {}

  function clone(x) { return x === undefined ? undefined : JSON.parse(JSON.stringify(x)); }
  function read(k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function write(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { console.warn('dev backend: storage full', e); throw { code: 'resource_exhausted', message: 'Browser storage is full' }; } }
  function seed() {
    var d = {};
    (window.RT_SEED || []).forEach(function (r) { (d[r[0]] = d[r[0]] || {})[r[1]] = clone(r[2]); });
    return d;
  }
  function merge(a, b) {
    var o = Object.assign({}, a);
    Object.keys(b).forEach(function (k) {
      var bv = b[k], av = a[k];
      if (bv && typeof bv === 'object' && !Array.isArray(bv) && av && typeof av === 'object' && !Array.isArray(av)) o[k] = merge(av, bv);
      else o[k] = bv;
    });
    return o;
  }
  var wait = function () { return new Promise(function (r) { setTimeout(r, 15); }); };

  if (/[?&]reset=1/.test(location.search)) {
    try { localStorage.removeItem(KEY); localStorage.removeItem(PKEY); } catch (e) {}
    try { history.replaceState(null, '', location.pathname + location.hash); } catch (e) {}
  }
  var docs = read(KEY, null);
  if (!docs) { docs = seed(); try { write(KEY, docs); } catch (e) {} }
  var photos = read(PKEY, {});
  var subs = new Set(), authCbs = [], pollOnly = new Set();

  // `docs` is this tab's view (what snapshots see); localStorage is the "server".
  // Collections marked poll-only pick up other tabs' changes every 15 s, like backend-supabase.js.
  function store() { return read(KEY, {}) || {}; }
  function fire() { subs.forEach(function (f) { try { f(); } catch (e) { console.error(e); } }); }
  function commit(col, id, d) {
    var all = store();
    if (d === undefined) { if (all[col]) delete all[col][id]; if (docs[col]) delete docs[col][id]; }
    else { (all[col] = all[col] || {})[id] = d; (docs[col] = docs[col] || {})[id] = clone(d); }
    write(KEY, all); if (bc) bc.postMessage('docs'); fire();
  }
  function pull() { var all = store(); pollOnly.forEach(function (c) { all[c] = docs[c]; }); docs = all; photos = read(PKEY, {}); fire(); }
  setInterval(function () { if (!pollOnly.size) return; var all = store(); pollOnly.forEach(function (c) { docs[c] = all[c]; }); fire(); }, 15000);
  if (bc) bc.onmessage = function (e) { if (e.data === 'docs') pull(); else if (e.data === 'auth') authCbs.forEach(function (f) { f(); }); };
  window.addEventListener('storage', function (e) { if (e.key === KEY || e.key === PKEY) pull(); else if (e.key === SKEY) authCbs.forEach(function (f) { f(); }); });

  function session() { return read(SKEY, null); }
  function host() { var s = session(); return !!(s && s.user && s.user.email); }
  // Same checks as supabase/schema.sql: guests answer only the live, open question under their own id.
  var GID = /^g[A-Za-z0-9]{1,40}$/;
  function guestCanAnswer(id, d) {
    var s = (store().game || {}).state || {};
    if (!d || s.qid !== d.q || s.phase !== 'collect' || s.locked) return false;
    if (!GID.test(String(d.g))) return false;
    var base = d.q + '__' + d.g;
    return id === base || /^__[1-5]$/.test(id.slice(base.length)) && id.indexOf(base) === 0;
  }
  function guard(col, op, id, d) {
    if (host()) return;
    var ok = op !== 'delete' && (col === 'answers' ? guestCanAnswer(id, d) : col === 'guests' && GID.test(id));
    if (!ok) throw { code: 'permission_denied', message: 'new row violates row-level security policy' };
  }

  function snap(id, d) { return { id: id, exists: d !== undefined, data: function () { return clone(d); }, metadata: {} }; }
  function qsnap(col, filters) {
    var all = docs[col] || {}, out = [];
    Object.keys(all).sort().forEach(function (id) {
      var d = all[id];
      if (filters.every(function (f) { return f[1] === '==' ? d[f[0]] === f[2] : true; })) out.push(snap(id, d));
    });
    return { docs: out, size: out.length, empty: !out.length, docChanges: function () { return []; } };
  }
  function watch(fn) { subs.add(fn); setTimeout(fn, 0); return function () { subs.delete(fn); }; }
  function doc(path) {
    var i = path.indexOf('/'), col = path.slice(0, i), id = path.slice(i + 1);
    var self = {
      id: id, path: path,
      get: async function () { await wait(); return snap(id, (store()[col] || {})[id]); },
      set: async function (d) { await wait(); guard(col, 'set', id, d); commit(col, id, clone(d)); },
      update: async function (d) {
        await wait();
        var cur = (store()[col] || {})[id];
        if (cur === undefined) throw { code: 'invalid_argument', message: 'Document does not exist' };
        var next = merge(cur, clone(d)); guard(col, 'update', id, next); commit(col, id, next);
      },
      delete: async function () { await wait(); guard(col, 'delete', id); commit(col, id, undefined); },
      onSnapshot: function (next) {
        var last;
        return watch(function () { var d = (docs[col] || {})[id], s = JSON.stringify(d === undefined ? null : d); if (s !== last) { last = s; next(snap(id, d)); } });
      }
    };
    return self;
  }
  function query(col, filters) {
    return {
      where: function (f, o, v) { return query(col, filters.concat([[f, o, v]])); },
      orderBy: function () { return this; },
      limit: function () { return this; },
      get: async function () { await wait(); return qsnap(col, filters); },
      onSnapshot: function (next) {
        var last;
        return watch(function () { var qs = qsnap(col, filters), s = JSON.stringify(qs.docs.map(function (d) { return [d.id, d.data()]; })); if (s !== last) { last = s; next(qs); } });
      }
    };
  }

  B.photoUrl = function (id) { return photos[id] || ''; };
  B.init = async function () {
    B.db = { setPollOnly: function (cols) { (cols || []).forEach(function (c) { pollOnly.add(c); }); }, doc: doc, collection: function (col) { return Object.assign(query(col, []), { path: col, doc: function (id) { return doc(col + '/' + id); } }); } };
    function changed() { if (bc) bc.postMessage('auth'); authCbs.forEach(function (f) { f(); }); }
    B.auth = {
      session: async function () { return session(); },
      signIn: async function (email, pw) {
        await wait();
        if (pw !== PASSWORD) throw { message: 'Invalid login credentials' };
        write(SKEY, { user: { email: email } }); changed();
      },
      magic: async function () { await wait(); throw { message: 'Sign-in links are not available in the dev backend. Use password "host".' }; },
      signOut: async function () { try { localStorage.removeItem(SKEY); } catch (e) {} changed(); },
      onChange: function (cb) { authCbs.push(cb); }
    };
    B.isHost = async function () { return host(); };
    B.assets = {
      upload: async function (blob, opts) {
        var type = (opts && opts.type) || blob.type || 'image/jpeg';
        var url = await new Promise(function (res, rej) { var r = new FileReader(); r.onload = function () { res(r.result); }; r.onerror = rej; r.readAsDataURL(blob); });
        var id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8) + (type.indexOf('png') > -1 ? '.png' : '.jpg');
        photos[id] = url; write(PKEY, photos); if (bc) bc.postMessage('docs');
        return { id: id, url: url };
      }
    };
    return true;
  };

  window.RT_DEV = { reset: function () { localStorage.removeItem(KEY); localStorage.removeItem(PKEY); location.reload(); }, dump: function () { return store(); } };
  window.RT_BACKEND = B;
})();
