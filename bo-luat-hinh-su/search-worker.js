/*
 * Luồng tìm kiếm nền (Web Worker): nạp toàn văn một lần, quét trong vài chục
 * mili-giây mà không làm đứng giao diện đọc.
 */
'use strict';
importScripts('lx-core.js');

var P = [];        // đoạn văn: { a, o, k: 'l' | 'c', i, t, lo, fo }
var T = [];        // tên điều: { id, o, t, lo, fo }
var ready = false;
var pending = null;

function strip(h) {
  return h.replace(/<sup class="fn"[^>]*>.*?<\/sup>/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}

self.onmessage = function (e) {
  var m = e.data;
  if (m.type === 'init') init(m);
  else if (m.type === 'search') {
    if (ready) self.postMessage(run(m));
    else pending = m;                       // chỉ giữ yêu cầu mới nhất
  }
};

function init(m) {
  var order = {};
  T = m.titles.map(function (x, o) {
    order[x[0]] = o;
    return { id: x[0], o: o, t: x[1], lo: x[1].toLowerCase(), fo: LX.fold(x[1]) };
  });
  var done = 0, total = m.chapters.length;
  Promise.all(m.chapters.map(function (id) {
    return fetch('data/' + id + '.json?v=' + m.v)
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (arr) {
        done++;
        self.postMessage({ type: 'progress', done: done, total: total });
        return arr;
      });
  })).then(function (lists) {
    lists.forEach(function (arr) {
      arr.forEach(function (a) {
        var o = order[a.id];
        a.law.forEach(function (p, i) { add(a.id, o, 'l', i, p[1]); });
        a.cm.forEach(function (p, i) { add(a.id, o, 'c', i, p[1]); });
      });
    });
    ready = true;
    self.postMessage({ type: 'ready', n: P.length });
    if (pending) { self.postMessage(run(pending)); pending = null; }
  }).catch(function (err) {
    self.postMessage({ type: 'error', message: String(err && err.message || err) });
  });
}

function add(a, o, k, i, h) {
  var t = strip(h).trim();
  if (t) P.push({ a: a, o: o, k: k, i: i, t: t, lo: t.toLowerCase(), fo: LX.fold(t) });
}

function snippet(p, cq) {
  var sp = cq.find(p.t, p.lo);
  var first = sp.length ? sp[0][0] : 0;
  var s = Math.max(0, first - 80);
  if (s > 0) { var a = p.t.indexOf(' ', s); if (a > -1 && a < first) s = a + 1; }
  var e = Math.min(p.t.length, (sp.length ? sp[0][1] : 0) + 200);
  if (e < p.t.length) { var b = p.t.lastIndexOf(' ', e); if (b > first + 30) e = b; }
  var marks = [];
  for (var k = 0; k < sp.length; k++) if (sp[k][0] >= s && sp[k][1] <= e) marks.push([sp[k][0] - s, sp[k][1] - s]);
  return [p.k, p.i, p.t.slice(s, e), marks, s > 0 ? 1 : 0, e < p.t.length ? 1 : 0];
}

function run(m) {
  var t0 = Date.now();
  var pq = LX.parseQuery(m.q);
  var cq = LX.compile(pq);
  var exact = new Map(), loose = new Map();
  if (cq.empty) return { type: 'result', id: m.id, q: m.q, exact: [], loose: [], ms: 0 };

  function rec(map, id, o) {
    var r = map.get(id);
    if (!r) { r = { id: id, o: o, lh: 0, cm: 0, th: 0, sn: [], ps: [] }; map.set(id, r); }
    return r;
  }

  for (var n = 0; n < P.length; n++) {
    var p = P[n], map = null;
    if (cq.exact(p.lo, p.fo)) map = exact;
    else if (cq.hasLoose && cq.loose(p.lo, p.fo)) map = loose;
    if (!map) continue;
    var r = rec(map, p.a, p.o);
    if (p.k === 'l') r.lh++; else r.cm++;
    r.ps.push(p.k + p.i);
    var same = 0;
    for (var j = 0; j < r.sn.length; j++) if (r.sn[j][0] === p.k) same++;
    if (same < 2) r.sn.push(snippet(p, cq));
  }
  for (var k = 0; k < T.length; k++) {
    var t = T[k];
    if (cq.exact(t.lo, t.fo)) rec(exact, t.id, t.o).th = 1;
    else if (cq.hasLoose && cq.loose(t.lo, t.fo)) rec(loose, t.id, t.o).th = 1;
  }

  var byOrder = function (a, b) { return a.o - b.o; };
  var ex = Array.from(exact.values()).sort(byOrder);
  var lo = Array.from(loose.values()).filter(function (r) { return !exact.has(r.id); }).sort(byOrder);
  return { type: 'result', id: m.id, q: m.q, exact: ex, loose: lo, ms: Date.now() - t0 };
}
