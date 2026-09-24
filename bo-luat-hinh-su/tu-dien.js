/* =====================================================================
   TỪ ĐIỂN BỘ LUẬT HÌNH SỰ – tương tác trang tổng quan, chương, điều luật
   Cần lx-core.js (window.LX) nạp trước. Tìm kiếm toàn văn dùng search-worker.js.
   ===================================================================== */
(function () {
  'use strict';

  var root = document.querySelector('.tdl');
  if (!root || !window.LX) return;
  var LX = window.LX;
  var BASE = root.getAttribute('data-base') || '';
  var V = root.getAttribute('data-v') || '';
  var isHub = root.classList.contains('tdl--hub');
  var article = document.querySelector('.tdl-article');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function letterId(ch) { return ch === 'đ' ? 'dd' : ch; }
  function artUrl(id) { return BASE + 'dieu-' + id + '/'; }

  var toastEl = $('.tdl-toast'), toastT = 0;
  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.hidden = false;
    clearTimeout(toastT);
    toastT = setTimeout(function () { toastEl.hidden = true; }, 2600);
  }

  var store = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* bỏ qua */ } }
  };

  /* ---------- Dữ liệu mục lục (nạp khi cần) ---------- */
  var tocP = null, ART = [], byArt = {}, CH = [], byCh = {};
  function loadToc() {
    if (tocP) return tocP;
    tocP = fetch(BASE + 'data/toc.json?v=' + V).then(function (r) { return r.json(); }).then(function (t) {
      CH = t.chapters;
      CH.forEach(function (c) {
        c.slug = c.num ? 'chuong-' + romanToInt(c.num) : 'dieu-khoan-thi-hanh';
        c.label = c.num ? 'Chương ' + c.num : 'Điều khoản thi hành';
        byCh[c.id] = c;
        c.a.forEach(function (a) { a.ch = c.id; a.i = ART.length; ART.push(a); byArt[a.id] = a; });
      });
      return t;
    });
    return tocP;
  }
  function romanToInt(s) {
    var v = { I: 1, V: 5, X: 10, L: 50 }, t = 0, p = 0;
    for (var k = s.length - 1; k >= 0; k--) { var n = v[s[k]]; t += n < p ? -n : n; p = Math.max(p, n); }
    return t;
  }

  /* ---------- Mục lục: mở chương thì nạp danh sách điều ---------- */
  $$('.tdl-toc__ch').forEach(function (d) {
    d.addEventListener('toggle', function () {
      var ol = $('ol[data-lazy]', d);
      if (!d.open || !ol || ol.children.length) return;
      ol.innerHTML = '<li class="tdl-toc__loading">Đang tải…</li>';
      loadToc().then(function () {
        var c = byCh[d.getAttribute('data-ch')];
        var h = '<li class="tdl-toc__overview"><a href="' + BASE + c.slug + '/">Tổng quan ' + esc(c.label.toLowerCase()) + ' →</a></li>';
        var lastM = null, muc = {};
        (c.muc || []).forEach(function (m) { muc[m.n] = m.name; });
        c.a.forEach(function (a) {
          if (a.m && a.m !== lastM) { lastM = a.m; h += '<li class="tdl-toc__muc">' + esc(muc[a.m] || '') + '</li>'; }
          h += '<li><a href="' + artUrl(a.id) + '"><span class="n">Điều ' + esc(a.id) + '</span><span class="t">' + esc(a.t) + '</span></a></li>';
        });
        ol.innerHTML = h;
        ol.removeAttribute('data-lazy');
      }).catch(function () { ol.innerHTML = '<li class="tdl-toc__loading">Không tải được mục lục. Vui lòng thử lại.</li>'; });
    });
  });
  // Cuộn mục lục tới điều đang xem
  var curLink = $('.tdl-toc__arts a[aria-current="page"]');
  var tocBody = $('.tdl-toc__body');
  if (curLink && tocBody) tocBody.scrollTop = Math.max(0, curLink.offsetTop - tocBody.clientHeight / 3);

  // Ngăn kéo mục lục trên điện thoại
  function drawer(open) {
    document.body.classList.toggle('tdl-drawer', open);
    document.body.classList.toggle('no-scroll', open);
    if (open) { var c = $('.tdl-toc__arts a[aria-current="page"]'); setTimeout(function () { (c || $('.tdl-toc__close')).focus(); }, 50); }
  }
  $$('[data-toc-open]').forEach(function (b) { b.addEventListener('click', function () { drawer(true); }); });
  $$('[data-toc-close]').forEach(function (b) { b.addEventListener('click', function () { drawer(false); }); });
  document.addEventListener('click', function (e) {
    if (document.body.classList.contains('tdl-drawer') && !e.target.closest('.tdl-toc') && !e.target.closest('[data-toc-open]')) drawer(false);
  });

  /* ---------- Chọn chương / điều ---------- */
  $$('select[data-go]').forEach(function (s) { s.addEventListener('change', function () { if (s.value) location.href = s.value; }); });

  /* ---------- Nhận diện "điểm s khoản 1 điều 51", "173", "Điều 217a" ---------- */
  function parseRef(raw) {
    var s = raw.normalize('NFC').toLowerCase().replace(/[,;]/g, ' ').replace(/\s+/g, ' ').trim();
    var m = s.match(/^(?:điều|dieu|đ\.?|d\.?)?\s*(\d{1,3}[a-z]?)$/);
    if (m && byArt[m[1]]) return { id: m[1] };
    var d = s.match(/(?:điều|dieu)\s*(\d{1,3}[a-z]?)(?!\d)/) || s.match(/(?:^|\s)(?:đ|d)\.?\s*(\d{1,3}[a-z]?)$/);
    if (!d || !byArt[d[1]]) return null;
    var k = s.match(/(?:khoản|khoan|k\.?)\s*(\d{1,2})(?!\d)/);
    var p = s.match(/(?:điểm|diem)\s*([a-zđ])(?![a-zà-ỹđ])/);
    if (!k && !p && !/^(?:điều|dieu)\s*\d/.test(s)) return null;
    return { id: d[1], k: k ? k[1] : null, p: p ? p[1] : null };
  }
  function refLabel(r) { return (r.p ? 'Điểm ' + r.p + ' ' : '') + (r.k ? (r.p ? 'khoản ' : 'Khoản ') + r.k + ' ' : '') + 'Điều ' + r.id; }
  function refUrl(r) {
    var hash = r.k ? '#k' + r.k + (r.p ? '-' + letterId(r.p) : '') : (r.p ? '#d-' + letterId(r.p) : '');
    return artUrl(r.id) + hash;
  }

  /* ---------- Ô tìm kiếm + gợi ý tức thì ---------- */
  var form = $('.tdl-search'), qEl = $('#tdl-q'), sugEl = $('#tdl-sug');
  var sug = [], sugI = -1;
  function mark(text, spans) {
    var out = '', last = 0;
    spans.forEach(function (s) { out += esc(text.slice(last, s[0])) + '<mark>' + esc(text.slice(s[0], s[1])) + '</mark>'; last = s[1]; });
    return out + esc(text.slice(last));
  }
  function hideSug() { sugEl.hidden = true; sugI = -1; qEl.setAttribute('aria-expanded', 'false'); qEl.removeAttribute('aria-activedescendant'); }
  function suggest() {
    var q = qEl.value.trim();
    sug = []; sugI = -1;
    if (!q) return hideSug();
    loadToc().then(function () {
      if (qEl.value.trim() !== q) return;
      var ref = parseRef(q);
      if (ref) sug.push({ url: refUrl(ref), html: '<b>' + esc(refLabel(ref)) + '</b><span>' + esc(byArt[ref.id].t) + '</span>', tag: 'Đi tới' });
      if (q.replace(/\s/g, '').length >= 2) {
        var cq = LX.compile(LX.parseQuery(q), { prefix: true });
        if (!cq.empty) {
          var hits = [];
          for (var k = 0; k < ART.length && hits.length < 40; k++) if (cq.test(ART[k].t)) hits.push(ART[k]);
          hits.slice(0, ref ? 5 : 7).forEach(function (a) {
            if (ref && a.id === ref.id) return;
            sug.push({ url: artUrl(a.id), html: '<b>Điều ' + esc(a.id) + '.</b><span>' + mark(a.t, cq.find(a.t)) + '</span>', tag: byCh[a.ch].label });
          });
          CH.filter(function (c) { return c.num && cq.test(c.name); }).slice(0, 2).forEach(function (c) {
            sug.push({ url: BASE + c.slug + '/', html: '<b>' + esc(c.label) + '.</b><span>' + mark(c.name, cq.find(c.name)) + '</span>', tag: c.a.length + ' điều' });
          });
        }
        sug.push({ full: q, html: '<span class="tdl-sg--full">Tìm “' + esc(q) + '” trong toàn văn điều luật và bình luận</span>', tag: 'Enter' });
      }
      if (!sug.length) return hideSug();
      sugEl.innerHTML = sug.map(function (s, i) {
        return '<div class="tdl-sg" role="option" id="tdl-sg' + i + '" data-i="' + i + '" aria-selected="false"><span class="tdl-sg__m">' + s.html + '</span><span class="tdl-sg__t">' + esc(s.tag) + '</span></div>';
      }).join('');
      sugEl.hidden = false;
      qEl.setAttribute('aria-expanded', 'true');
    });
  }
  function pick(s) {
    hideSug();
    if (s.url) location.href = s.url;
    else fullSearch(s.full, true);
  }
  function fullSearch(q, push) {
    if (isHub) runSearch(q, push);
    else location.href = BASE + '?q=' + encodeURIComponent(q);
  }
  if (qEl) {
    var sugT = 0;
    qEl.addEventListener('input', function () { clearTimeout(sugT); sugT = setTimeout(suggest, 90); });
    qEl.addEventListener('focus', function () { if (qEl.value.trim()) suggest(); });
    qEl.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        if (sugEl.hidden || !sug.length) return;
        e.preventDefault();
        sugI = (sugI + (e.key === 'ArrowDown' ? 1 : -1) + sug.length) % sug.length;
        $$('.tdl-sg', sugEl).forEach(function (el, i) { el.setAttribute('aria-selected', String(i === sugI)); });
        qEl.setAttribute('aria-activedescendant', 'tdl-sg' + sugI);
      } else if (e.key === 'Escape') hideSug();
    });
    sugEl.addEventListener('mousedown', function (e) {
      var el = e.target.closest('.tdl-sg');
      if (el) { e.preventDefault(); pick(sug[+el.getAttribute('data-i')]); }
    });
    document.addEventListener('click', function (e) { if (!e.target.closest('.tdl-search')) hideSug(); });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var q = qEl.value.trim();
      if (!q) return;
      if (sugI >= 0 && sug[sugI]) return pick(sug[sugI]);
      loadToc().then(function () {
        var ref = parseRef(q);
        hideSug();
        if (ref) location.href = refUrl(ref);
        else fullSearch(q, true);
      });
    });
  }

  /* ---------- Phím tắt ---------- */
  document.addEventListener('keydown', function (e) {
    var t = e.target, typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
    if (typing || e.altKey || e.metaKey || e.ctrlKey) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k' && qEl) { e.preventDefault(); qEl.focus(); qEl.select(); }
      return;
    }
    if (e.key === '/' && qEl) { e.preventDefault(); qEl.focus(); qEl.select(); }
    else if (e.key === '[') { var p = $('a[rel="prev"].tdl-nav__btn'); if (p) location.href = p.href; }
    else if (e.key === ']') { var n = $('a[rel="next"].tdl-nav__btn'); if (n) location.href = n.href; }
    else if (e.key === 'Escape' && document.body.classList.contains('tdl-drawer')) drawer(false);
  });

  /* ---------- Tab trên trang điều luật ---------- */
  var tabs = $$('.tdl-tab');
  function selectTab(tab, focus) {
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      $('#' + t.getAttribute('aria-controls')).hidden = !on;
    });
    if (focus) tab.focus();
  }
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { selectTab(t); });
    t.addEventListener('keydown', function (e) {
      var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (e.key === 'Home') { e.preventDefault(); selectTab(tabs[0], true); }
      else if (e.key === 'End') { e.preventDefault(); selectTab(tabs[tabs.length - 1], true); }
      else if (d) { e.preventDefault(); selectTab(tabs[(i + d + tabs.length) % tabs.length], true); }
    });
  });

  /* ---------- Đi tới đoạn văn: #k1-a, #l3 (đoạn luật thứ 3), #c5 (đoạn bình luận thứ 5) ---------- */
  function flash(el) {
    if (!el) return;
    var panel = el.closest('.tdl-panel');
    if (panel && panel.hidden) selectTab($('#' + panel.getAttribute('aria-labelledby')));
    el.classList.add('tdl-flash');
    el.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' });
    setTimeout(function () { el.classList.remove('tdl-flash'); }, 2600);
  }
  function fromHash() {
    var h = decodeURIComponent(location.hash.slice(1));
    if (!h || !article) return;
    var m = h.match(/^([lc])(\d+)$/);
    if (m) {
      var list = m[1] === 'l' ? $$('.tdl-law__body > p') : $$('#panel-binh-luan .tdl-cm > *');
      return flash(list[+m[2]]);
    }
    var el = document.getElementById(h);
    if (el && el.closest('.tdl-panel')) flash(el);
  }
  window.addEventListener('hashchange', fromHash);
  if (article) setTimeout(fromHash, 60);

  // Tô sáng từ khóa khi mở từ trang kết quả (?q=...)
  var params = new URLSearchParams(location.search);
  var hlq = params.get('q');
  if (article && hlq) {
    var cq = LX.compile(LX.parseQuery(hlq));
    if (!cq.empty) {
      $$('.tdl-law__body > p, #panel-binh-luan .tdl-cm > *').forEach(function (p) {
        var walker = document.createTreeWalker(p, NodeFilter.SHOW_TEXT), nodes = [], n;
        while ((n = walker.nextNode())) nodes.push(n);
        nodes.forEach(function (node) {
          var text = node.nodeValue, spans = cq.find(text);
          if (!spans.length) return;
          var frag = document.createDocumentFragment(), last = 0;
          spans.forEach(function (s) {
            frag.appendChild(document.createTextNode(text.slice(last, s[0])));
            var mk = document.createElement('mark'); mk.className = 'tdl-hl'; mk.textContent = text.slice(s[0], s[1]);
            frag.appendChild(mk); last = s[1];
          });
          frag.appendChild(document.createTextNode(text.slice(last)));
          node.parentNode.replaceChild(frag, node);
        });
      });
      if (!location.hash) { var first = $('.tdl-hl'); if (first) setTimeout(function () { flash(first.closest('p, h3, h4')); }, 60); }
    }
  }

  /* ---------- Lưu, In, Chia sẻ, Trích dẫn ---------- */
  var SAVE_KEY = 'lsn-blhs-da-luu';
  function saved() { return store.get(SAVE_KEY, []); }
  function copyText(text, okMsg) {
    var done = function () { toast(okMsg); };
    var fallback = function () {
      var ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); done(); } catch (e) { toast('Không sao chép được, vui lòng sao chép thủ công.'); }
      ta.remove();
    };
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, fallback);
    else fallback();
  }
  if (article) {
    var aid = article.getAttribute('data-id'), atitle = article.getAttribute('data-title');
    var saveBtn = $('[data-act="save"]', article);
    var isSaved = function () { return saved().some(function (x) { return x.id === aid; }); };
    var syncSave = function () {
      var on = isSaved();
      saveBtn.setAttribute('aria-pressed', String(on));
      $('span', saveBtn).textContent = on ? 'Đã lưu' : 'Lưu';
    };
    syncSave();
    $$('[data-act]', article).forEach(function (b) {
      b.addEventListener('click', function () {
        var act = b.getAttribute('data-act');
        var url = location.origin + location.pathname;
        if (act === 'save') {
          var list = saved().filter(function (x) { return x.id !== aid; });
          if (!isSaved()) { list.unshift({ id: aid, t: atitle }); toast('Đã lưu Điều ' + aid + '. Xem lại tại trang tổng quan Bộ luật Hình sự.'); }
          else toast('Đã bỏ lưu Điều ' + aid + '.');
          store.set(SAVE_KEY, list.slice(0, 50));
          syncSave();
        } else if (act === 'print') {
          window.print();
        } else if (act === 'share') {
          var data = { title: 'Điều ' + aid + ' Bộ luật Hình sự: ' + atitle, url: url };
          if (navigator.share) navigator.share(data).catch(function () {});
          else copyText(url, 'Đã sao chép liên kết Điều ' + aid + '.');
        } else if (act === 'cite') {
          copyText('Điều ' + aid + '. ' + atitle + ' – Bộ luật Hình sự số 100/2015/QH13 (sửa đổi, bổ sung năm 2017, 2025). ' + url, 'Đã sao chép trích dẫn Điều ' + aid + '.');
        }
      });
    });
  }

  /* ---------- Trang tổng quan: điều đã lưu ---------- */
  var savedBox = $('#tdl-saved');
  if (savedBox) {
    var list = saved();
    if (list.length) {
      $('ul', savedBox).innerHTML = list.slice(0, 12).map(function (x) {
        return '<li><a href="' + artUrl(x.id) + '"><b>Điều ' + esc(x.id) + '</b><span>' + esc(x.t) + '</span></a></li>';
      }).join('');
      savedBox.hidden = false;
    }
  }

  /* ---------- Trang tổng quan: tìm kiếm toàn văn ---------- */
  var resEl = $('#tdl-results'), overview = $('#tdl-overview');
  var W = null, wReady = false, wFail = false, seq = 0, loadPct = 0, R = null, limit = 30;
  function worker() {
    if (W || wFail) return W;
    try { W = new Worker(BASE + 'search-worker.js?v=' + V); } catch (e) { wFail = true; return null; }
    W.onmessage = function (e) {
      var m = e.data;
      if (m.type === 'progress') { loadPct = Math.round(m.done / m.total * 100); if (!R || R.pending) drawPending(); }
      else if (m.type === 'ready') wReady = true;
      else if (m.type === 'result' && m.id === seq) { R = m; limit = 30; drawResults(); }
      else if (m.type === 'error') { wFail = true; drawError(); }
    };
    W.onerror = function () { wFail = true; drawError(); };
    loadToc().then(function () {
      W.postMessage({ type: 'init', v: V, chapters: CH.map(function (c) { return c.id; }), titles: ART.map(function (a) { return [a.id, a.t]; }) });
    });
    return W;
  }
  function showResults(on) {
    if (!resEl) return;
    resEl.hidden = !on;
    overview.hidden = on;
  }
  function drawPending() {
    resEl.innerHTML = '<div class="tdl-loading" role="status"><span class="tdl-spin" aria-hidden="true"></span>' +
      (wReady ? 'Đang tìm…' : 'Đang chuẩn bị dữ liệu tìm kiếm' + (loadPct ? ' (' + loadPct + '%)' : '') + '… Chỉ nạp một lần.') + '</div>';
  }
  function drawError() {
    if (!resEl) return;
    resEl.innerHTML = '<div class="tdl-empty"><p><b>Chưa thể tìm kiếm toàn văn.</b> Trình duyệt chưa tải được dữ liệu. Vui lòng kiểm tra kết nối rồi tải lại trang; bạn vẫn có thể tra theo số điều hoặc dùng mục lục.</p></div>';
  }
  function runSearch(q, push) {
    q = (q || '').trim();
    if (!q || !resEl) return;
    if (qEl) qEl.value = q;
    showResults(true);
    if (!worker()) return drawError();
    seq++;
    R = { pending: true, q: q };
    drawPending();
    var send = function () { W.postMessage({ type: 'search', id: seq, q: q }); };
    loadToc().then(send);
    var url = location.pathname + '?q=' + encodeURIComponent(q);
    if (push) history.pushState({ q: q }, '', url); else history.replaceState({ q: q }, '', url);
    document.title = 'Tìm “' + q + '” – Bộ luật Hình sự | Luật Sư Nam';
    resEl.scrollIntoView({ block: 'start', behavior: 'auto' });
  }
  function snippetHTML(sn) {
    var t = sn[2], marks = sn[3], out = '', last = 0;
    marks.forEach(function (m) { out += esc(t.slice(last, m[0])) + '<mark>' + esc(t.slice(m[0], m[1])) + '</mark>'; last = m[1]; });
    return (sn[4] ? '… ' : '') + out + esc(t.slice(last)) + (sn[5] ? ' …' : '');
  }
  function score(r) { return r.th * 1000 + r.lh * 6 + r.cm; }
  function drawResults() {
    var bySc = function (a, b) { return score(b) - score(a) || a.o - b.o; };
    var list = R.exact.slice().sort(bySc).concat(R.loose.slice().sort(bySc));
    var qs = '?q=' + encodeURIComponent(R.q);
    var h = '<div class="tdl-results__head"><h1>Kết quả cho “' + esc(R.q) + '”</h1>' +
      '<button type="button" class="tdl-results__close" data-close-results>← Về trang tổng quan</button>' +
      '<p>' + (list.length ? 'Tìm thấy ' + list.length + ' điều' + (R.loose.length ? ' (' + R.exact.length + ' điều khớp nguyên cụm)' : '') : 'Không tìm thấy kết quả phù hợp') +
      '. Gõ không dấu để tìm mọi biến thể; đặt cụm từ trong ngoặc kép để tìm chính xác.</p></div>';
    list.slice(0, limit).forEach(function (r) {
      var a = byArt[r.id], c = byCh[a.ch];
      var meta = [];
      if (r.th) meta.push('Khớp tên điều');
      if (r.lh) meta.push(r.lh + ' đoạn điều luật');
      if (r.cm) meta.push(r.cm + ' đoạn bình luận');
      h += '<article class="tdl-res"><a class="tdl-res__title" href="' + artUrl(r.id) + qs + '">Điều ' + esc(r.id) + '. ' + esc(a.t) + '</a>' +
        '<div class="tdl-res__meta"><span>' + esc(c.label) + (c.num ? ' – ' + esc(c.name) : '') + '</span><span>' + meta.join(' · ') + '</span></div>' +
        r.sn.slice(0, 3).map(function (sn) {
          return '<a class="tdl-res__snip" href="' + artUrl(r.id) + qs + '#' + sn[0] + sn[1] + '"><em class="' + sn[0] + '">' + (sn[0] === 'l' ? 'Điều luật' : 'Bình luận') + '</em><span>' + snippetHTML(sn) + '</span></a>';
        }).join('') + '</article>';
    });
    if (list.length > limit) h += '<button type="button" class="btn btn--outline btn--sm tdl-res__more" data-more>Hiển thị thêm ' + Math.min(30, list.length - limit) + ' điều</button>';
    resEl.innerHTML = h;
  }
  if (resEl) {
    resEl.addEventListener('click', function (e) {
      if (e.target.closest('[data-more]')) { limit += 30; drawResults(); }
      else if (e.target.closest('[data-close-results]')) {
        showResults(false);
        history.pushState({}, '', location.pathname);
        document.title = document.querySelector('meta[property="og:title"]').content;
        if (qEl) qEl.value = '';
      }
    });
    $$('[data-try]').forEach(function (b) {
      b.addEventListener('click', function () {
        var q = b.getAttribute('data-try');
        if (qEl) qEl.value = q;
        loadToc().then(function () { var ref = parseRef(q); if (ref) location.href = refUrl(ref); else runSearch(q, true); });
      });
    });
    window.addEventListener('popstate', function () {
      var q = new URLSearchParams(location.search).get('q');
      if (q) runSearch(q, false); else showResults(false);
    });
    // Liên kết cũ: #d173 → trang Điều 173; #tim=án treo → kết quả tìm kiếm
    var hsh = decodeURIComponent(location.hash.slice(1));
    var old = hsh.match(/^d(\d{1,3}[a-z]?)$/);
    if (old) location.replace(artUrl(old[1]));
    else if (hsh.indexOf('tim=') === 0) runSearch(hsh.slice(4), false);
    else if (hlq) runSearch(hlq, false);
  }
})();
