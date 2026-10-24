/* Supabase backend for Roast & Toast.
   Exposes window.RT_BACKEND with: configured, init(), db, auth, assets, isHost(), photoUrl(id).
   db mimics a tiny document store: doc(path), collection(name) with get/set/update/delete/onSnapshot/where,
   plus setPollOnly([col, ...]) to refresh some collections by polling instead of a live channel. */
(function () {
  'use strict';
  var cfg = window.RT_CONFIG || {};
  var B = { configured: !!(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY), db: null, auth: null, assets: null, sb: null };
  var BUCKET = 'photos';

  B.photoUrl = function (id) {
    return String(cfg.SUPABASE_URL || '').replace(/\/$/, '') + '/storage/v1/object/public/' + BUCKET + '/' + encodeURIComponent(id);
  };

  function clone(x) { return x === undefined ? undefined : JSON.parse(JSON.stringify(x)); }
  function conv(e) { return { code: (e && e.code) || 'unavailable', message: (e && e.message) || 'Request failed' }; }
  function merge(a, b) {
    var o = Object.assign({}, a);
    Object.keys(b).forEach(function (k) {
      var bv = b[k], av = a[k];
      if (bv && typeof bv === 'object' && !Array.isArray(bv) && av && typeof av === 'object' && !Array.isArray(av)) o[k] = merge(av, bv);
      else o[k] = bv;
    });
    return o;
  }

  function makeDb(sb) {
    var caches = {}, pollOnly = new Set();
    function C(col) {
      return caches[col] || (caches[col] = { rows: new Map(), loadP: null, subs: new Set(), ch: null, timer: null, ready: false, seq: 0, inflight: 0, log: [] });
    }
    function fire(c) { c.subs.forEach(function (f) { try { f(); } catch (e) { console.error(e); } }); }
    // Every change to the cache goes through here. While a full reload is in flight, changes are
    // also logged so they can be replayed onto the reload's (possibly older) snapshot.
    function apply(c, id, d) {
      c.seq++;
      if (d === undefined) c.rows.delete(id); else c.rows.set(id, d);
      if (c.inflight) c.log.push({ seq: c.seq, id: id, d: d });
      fire(c);
    }
    async function reload(col) {
      var c = C(col), all = [], from = 0, page = 1000, start = c.seq;
      c.inflight++;
      try {
        for (;;) {
          var r = await sb.from('docs').select('id,data').eq('col', col).order('id').range(from, from + page - 1);
          if (r.error) throw r.error;
          all = all.concat(r.data);
          if (r.data.length < page) break;
          from += page;
        }
        var m = new Map();
        all.forEach(function (x) { m.set(x.id, x.data); });
        c.log.forEach(function (e) { if (e.seq > start) { if (e.d === undefined) m.delete(e.id); else m.set(e.id, e.d); } });
        c.rows = m; c.ready = true;
      } finally {
        c.inflight--;
        if (!c.inflight) c.log = [];
      }
      fire(c);
    }
    function ensure(col) {
      var c = C(col);
      if (!c.loadP) c.loadP = reload(col).catch(function (e) { c.loadP = null; throw e; });
      return c.loadP;
    }
    function watch(col, fn, errCb) {
      var c = C(col);
      c.subs.add(fn);
      ensure(col).then(function () { fn(); }).catch(function (e) { if (errCb) errCb(conv(e)); });
      if (pollOnly.has(col)) {
        if (!c.timer) c.timer = setInterval(function () { reload(col).catch(function () {}); }, 15000);
      } else if (!c.ch) {
        c.ch = sb.channel('docs-' + col)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'docs', filter: 'col=eq.' + col }, function (p) {
            // Supabase does not apply filters to DELETE events, so check the collection here.
            if (p.eventType === 'DELETE') { if (p.old && p.old.col === col) apply(c, p.old.id, undefined); }
            else if (p.new && p.new.col === col) apply(c, p.new.id, p.new.data);
          })
          // Reload on every (re)subscribe: changes made before the channel was ready are not replayed.
          .subscribe(function (st) { if (st === 'SUBSCRIBED') reload(col).catch(function () {}); });
        c.timer = setInterval(function () { reload(col).catch(function () {}); }, 15000);
      }
      return function () { c.subs.delete(fn); };
    }
    function snap(id, d) { return { id: id, exists: d !== undefined, data: function () { return d; }, metadata: {} }; }
    function qsnap(col, filters) {
      var docs = [];
      C(col).rows.forEach(function (d, id) {
        if (filters.every(function (f) { return f[1] === '==' ? d[f[0]] === f[2] : true; })) docs.push(snap(id, d));
      });
      docs.sort(function (a, b) { return a.id < b.id ? -1 : 1; });
      return { docs: docs, size: docs.length, empty: !docs.length, docChanges: function () { return []; } };
    }
    function doc(path) {
      var i = path.indexOf('/'), col = path.slice(0, i), id = path.slice(i + 1);
      var self = {
        id: id, path: path,
        get: async function () {
          var r = await sb.from('docs').select('data').eq('col', col).eq('id', id).maybeSingle();
          if (r.error) throw conv(r.error);
          return snap(id, r.data ? r.data.data : undefined);
        },
        set: async function (d) {
          d = clone(d);
          var r = await sb.from('docs').upsert({ col: col, id: id, data: d, updated_at: new Date().toISOString() });
          if (r.error) throw conv(r.error);
          apply(C(col), id, d);
        },
        update: async function (d) {
          var cur = await self.get();
          if (!cur.exists) throw { code: 'invalid_argument', message: 'Document does not exist' };
          await self.set(merge(cur.data(), clone(d)));
        },
        delete: async function () {
          var r = await sb.from('docs').delete().eq('col', col).eq('id', id);
          if (r.error) throw conv(r.error);
          apply(C(col), id, undefined);
        },
        onSnapshot: function (next, err) {
          var last;
          return watch(col, function () {
            var d = C(col).rows.get(id), s = JSON.stringify(d === undefined ? null : d);
            if (s !== last) { last = s; next(snap(id, d)); }
          }, err);
        }
      };
      return self;
    }
    function query(col, filters) {
      return {
        where: function (f, o, v) { return query(col, filters.concat([[f, o, v]])); },
        orderBy: function () { return this; },
        limit: function () { return this; },
        get: async function () { await ensure(col); return qsnap(col, filters); },
        onSnapshot: function (next, err) {
          var last;
          return watch(col, function () {
            var qs = qsnap(col, filters), s = JSON.stringify(qs.docs.map(function (d) { return [d.id, d.data()]; }));
            if (s !== last) { last = s; next(qs); }
          }, err);
        }
      };
    }
    function collection(col) {
      return Object.assign(query(col, []), { path: col, doc: function (id) { return doc(col + '/' + id); } });
    }
    // Collections named here are refreshed by polling only, with no live channel. Call before the
    // first onSnapshot. Every live subscriber receives every change, so phones that do not need
    // other guests' answers should poll them to stay under Supabase's realtime message limits.
    function setPollOnly(cols) { (cols || []).forEach(function (col) { pollOnly.add(col); }); }
    return { doc: doc, collection: collection, setPollOnly: setPollOnly };
  }

  B.init = async function () {
    if (!B.configured) return false;
    if (!window.supabase || !window.supabase.createClient) { console.error('supabase-js did not load'); return false; }
    var sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, flowType: 'pkce' },
      realtime: { params: { eventsPerSecond: 20 } }
    });
    B.sb = sb;
    B.db = makeDb(sb);
    B.auth = {
      session: async function () { var r = await sb.auth.getSession(); return r.data && r.data.session; },
      signIn: async function (email, pw) {
        var r = await sb.auth.signInWithPassword({ email: email, password: pw });
        if (r.error) throw r.error;
      },
      magic: async function (email) {
        var r = await sb.auth.signInWithOtp({ email: email, options: { emailRedirectTo: location.href.split('#')[0].split('?')[0] + '#host', shouldCreateUser: false } });
        if (r.error) throw r.error;
      },
      signOut: async function () { await sb.auth.signOut({ scope: 'local' }); },
      onChange: function (cb) { sb.auth.onAuthStateChange(function () { setTimeout(cb, 0); }); }
    };
    B.isHost = async function () {
      var s = await B.auth.session();
      if (!s || !s.user || !s.user.email) return false;
      var r = await sb.from('hosts').select('email').ilike('email', s.user.email).maybeSingle();
      return !!(r.data && r.data.email);
    };
    B.assets = {
      upload: async function (blob, opts) {
        var type = (opts && opts.type) || blob.type || 'image/jpeg';
        var ext = type.indexOf('png') > -1 ? 'png' : type.indexOf('webp') > -1 ? 'webp' : 'jpg';
        var id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8) + '.' + ext;
        var r = await sb.storage.from(BUCKET).upload(id, blob, { contentType: type, cacheControl: '31536000', upsert: false });
        if (r.error) throw { code: 'upstream_error', message: r.error.message };
        return { id: id, url: B.photoUrl(id) };
      }
    };
    return true;
  };

  window.RT_BACKEND = B;
})();
