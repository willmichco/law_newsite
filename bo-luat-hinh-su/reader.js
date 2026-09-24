/*
 * Trình tra cứu Bộ luật Hình sự — Công Ty Luật TNHH Luật Sư Nam
 *
 * Kiến trúc
 *  - Toàn bộ Bộ luật hiển thị như MỘT văn bản liền mạch; mỗi chương chỉ được
 *    nạp và dựng khi người đọc tới gần, chương ở quá xa được giải phóng để
 *    trang luôn nhẹ.
 *  - Vị trí đọc được neo cố định mỗi khi nội dung phía trên thay đổi, nên văn
 *    bản không bao giờ "nhảy" dưới mắt người đọc.
 *  - Tìm kiếm toàn văn chạy trong luồng nền (search-worker.js).
 */
(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var root = document.documentElement;
  var LX = window.LX;
  var TOC = JSON.parse($('#toc-data').textContent);

  var doc = $('#lx-doc'), tocEl = $('#lx-toc'), resEl = $('#lx-results');
  var qEl = $('#lx-q'), sugEl = $('#lx-suggest'), barEl = $('.lx-bar');
  var progEl = $('#lx-progress'), navEl = $('#lx-nav'), whereEl = $('#lx-where');
  var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  root.style.overflowAnchor = 'none';          // vị trí đọc do trang tự neo
  // styles.css đặt cuộn mượt cho toàn site; ở đây một cú nhảy có thể xa hàng
  // trăm nghìn pixel nên trang tự quyết định khi nào cuộn mượt, khi nào nhảy thẳng.
  root.style.scrollBehavior = 'auto';
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

  var esc = function (s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  };

  /* ================================================================
   * 1. CHỈ MỤC
   * ================================================================ */
  var CH = TOC.chapters, ART = [], byArt = {}, byCh = {}, partOf = {};
  TOC.parts.forEach(function (p) { partOf[p.id] = p; });
  CH.forEach(function (c, ci) {
    c.i = ci; c.state = 'empty'; byCh[c.id] = c;
    c.a.forEach(function (a) { a.ch = c.id; a.i = ART.length; ART.push(a); byArt[a.id] = a; });
  });
  var chLabel = function (c) { return c.num ? 'Chương ' + c.num : partOf[c.part].label; };
  var chTitle = function (c) { return chLabel(c) + ' · ' + c.name; };

  /* ================================================================
   * 2. TUỲ CHỌN NGƯỜI ĐỌC (lưu trên trình duyệt)
   * ================================================================ */
  var pref = {
    get: function (k, d) { try { var v = localStorage.getItem('lx.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem('lx.' + k, JSON.stringify(v)); } catch (e) { /* bỏ qua */ } }
  };
  var mode = TOC.withCommentary ? pref.get('mode', 'both') : 'law';
  if (['both', 'law', 'cm'].indexOf(mode) < 0) mode = 'both';
  var fs = 16;                                  // cỡ chữ cố định
  try { localStorage.removeItem('lx.fs'); } catch (e) { /* bỏ qua */ }

  /* ================================================================
   * 3. BỐ CỤC & NEO VỊ TRÍ ĐỌC
   * ================================================================ */
  var topOff = 150;
  function measure() {
    var h = ($('#site-header') || {}).offsetHeight || 0;
    root.style.setProperty('--hdr', h + 'px');
    root.style.setProperty('--bar', barEl.offsetHeight + 'px');
    topOff = h + barEl.offsetHeight;
  }

  function anchorEl() {
    if (doc.hidden) return null;
    var r = doc.getBoundingClientRect();
    if (r.bottom < topOff || r.top > innerHeight) return null;
    var x = Math.min(r.left + 36, r.right - 8);
    var ys = [14, 70, 150, 280];
    for (var k = 0; k < ys.length; k++) {
      var el = document.elementFromPoint(x, topOff + ys[k]);
      var a = el && el.closest('[data-p], .lx-ah, .lx-ch-h, .lx-ch-b, .lx-muc, .lx-part');
      if (a && doc.contains(a)) return a;
    }
    return null;
  }
  // Chạy fn() mà giữ nguyên vị trí của đoạn đang đọc trên màn hình
  function keep(fn) {
    var a = anchorEl(), before = a ? a.getBoundingClientRect().top : 0;
    fn();
    if (a && a.isConnected) {
      var d = a.getBoundingClientRect().top - before;
      if (Math.abs(d) > 0.5) window.scrollBy(0, d);
    }
  }

  /* Ước lượng chiều cao chương chưa nạp (tự hiệu chỉnh theo chương đã dựng) */
  var ratio = { both: 0.33, law: 0.37, cm: 0.33 }, OVER = 190;
  var chars = function (c) { return mode === 'law' ? c.sz[0] : mode === 'cm' ? c.sz[1] : c.sz[0] + c.sz[1]; };
  var widthF = function () { return 760 / Math.max(260, Math.min(760, doc.clientWidth || 760)); };
  var est = function (c) { return Math.round(chars(c) * ratio[mode] * (fs / 16) * widthF() + c.a.length * OVER); };
  function calibrate(c, b) {
    var n = chars(c);
    if (n < 5000) return;
    var r = (b.offsetHeight - c.a.length * OVER) / n / (fs / 16) / widthF();
    if (r > 0.08 && r < 1.5) ratio[mode] = ratio[mode] * 0.35 + r * 0.65;
  }
  var bodyOf = function (c) { return c.el || (c.el = doc.querySelector('#ch-' + c.id + ' > .lx-ch-b')); };
  function refreshPlaceholders() {
    CH.forEach(function (c) { if (c.state !== 'done') bodyOf(c).style.height = est(c) + 'px'; });
  }

  /* ================================================================
   * 4. DỰNG VĂN BẢN
   * ================================================================ */
  var ICON = {
    quote: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7h4v4H8.5c0 2 1 3 2.5 3.5V17c-3-.5-4-3-4-6V7Zm7 0h4v4h-2.5c0 2 1 3 2.5 3.5V17c-3-.5-4-3-4-6V7Z"/></svg>',
    link: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>'
  };
  var AM_NOTE = 'Theo chú thích của tài liệu gốc: những điều, khoản, điểm có gắn dấu sao (*) là những điều, khoản, điểm đã được sửa đổi, bổ sung theo Luật sửa đổi, bổ sung một số điều của Bộ luật hình sự năm 2015.';

  function skeleton() {
    var h = '', lastPart = '';
    CH.forEach(function (c) {
      if (c.part !== lastPart) {
        lastPart = c.part;
        var p = partOf[c.part];
        h += '<div class="lx-part" role="heading" aria-level="2"><span>' + esc(p.label) + '</span>' + esc(p.name) + '</div>';
      }
      h += '<section class="lx-ch" id="ch-' + c.id + '" data-ch="' + c.id + '" aria-label="' + esc(chTitle(c)) + '">' +
        (c.num ? '<header class="lx-ch-h"><div class="k">Chương ' + c.num + '</div><h2>' + esc(c.name) + '</h2>' +
          '<div class="r">Điều ' + c.a[0].id + ' – ' + c.a[c.a.length - 1].id + ' · ' + c.a.length + ' điều</div></header>' : '') +
        '<div class="lx-ch-b" style="height:' + est(c) + 'px"><div class="lx-ph" aria-hidden="true"></div></div></section>';
    });
    doc.innerHTML = h;
    doc.className = 'lx-doc mode-' + mode;
    root.style.setProperty('--lx-fs', fs + 'px');
  }

  function fixPara(h, fn, isLaw) {
    h = h.replace(/<sup class="fn" data-fn="(\d+)">/g, function (_, n) {
      return '<sup class="fn" data-fn="' + n + '" tabindex="0" role="button" aria-label="Chú thích ' + n + '" title="' + esc(fn[n] || '') + '">';
    });
    if (isLaw) h = h.replace(/\*((?:<\/[a-z]+>)*)$/, '<span class="lx-star" title="Được sửa đổi, bổ sung">*</span>$1');
    return h;
  }

  function artHTML(a, d) {
    var fn = d.fn || {};
    var law = d.law.map(function (p, i) { return '<p class="' + p[0] + '" data-p="l' + i + '">' + fixPara(p[1], fn, true) + '</p>'; }).join('');
    var cm = d.cm.map(function (p, i) { return '<p class="' + p[0] + '" data-p="c' + i + '">' + fixPara(p[1], fn, false) + '</p>'; }).join('');
    var fnKeys = Object.keys(fn);
    var fns = fnKeys.length ? '<ol class="lx-fns" aria-label="Chú thích">' + fnKeys.map(function (n) {
      return '<li value="' + n + '" id="fn' + n + '">' + esc(fn[n]) + '</li>';
    }).join('') + '</ol>' : '';
    var badges = (a.am ? '<span class="lx-b am" title="' + esc(AM_NOTE) + '">Có sửa đổi, bổ sung (*)</span>' : '') +
      (a.n25 ? '<span class="lx-b n25">Điểm mới năm 2025</span>' : '') +
      (a.rep ? '<span class="lx-b rep">Đã bãi bỏ</span>' : '');
    return '<article class="lx-art' + (a.rep ? ' is-rep' : '') + '" id="d' + a.id + '" data-a="' + a.id + '">' +
      '<header class="lx-ah"><div class="n">Điều ' + a.id + '</div><h3>' + esc(a.t) + '</h3>' +
      (badges ? '<div class="lx-bs">' + badges + '</div>' : '') +
      '<div class="lx-tools">' +
        '<button type="button" data-act="cite" title="Sao chép trích dẫn" aria-label="Sao chép trích dẫn Điều ' + a.id + '">' + ICON.quote + '</button>' +
        '<button type="button" data-act="link" title="Sao chép liên kết" aria-label="Sao chép liên kết Điều ' + a.id + '">' + ICON.link + '</button>' +
      '</div></header>' +
      '<div class="lx-law"><div class="lx-lbl">Văn bản điều luật</div>' + law + '</div>' +
      (cm ? '<div class="lx-cm"><div class="lx-lbl">Bình luận</div>' + cm + fns + '</div>' +
            '<button type="button" class="lx-more" data-act="more" aria-expanded="false"><span>Xem bình luận</span> Điều ' + a.id + '</button>'
          : (fns ? '<div class="lx-cm">' + fns + '</div>' : '')) +
      '</article>';
  }

  var chunks = {};
  function load(id) {
    if (!chunks[id]) {
      chunks[id] = fetch('data/' + id + '.json?v=' + TOC.v)
        .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        .catch(function (e) { delete chunks[id]; throw e; });
    }
    return chunks[id];
  }

  function ensure(id) {
    var c = byCh[id];
    if (c.state === 'done') return Promise.resolve(c);
    if (c.wait) return c.wait;
    c.wait = load(id).then(function (data) {
      c.wait = null;
      render(c, data);
      return c;
    }, function (err) {
      c.wait = null;
      var b = bodyOf(c);
      keep(function () {
        b.style.height = '';
        b.innerHTML = '<div class="lx-err">Chưa tải được nội dung ' + esc(chLabel(c)) +
          '. <button type="button" data-act="retry" data-ch="' + c.id + '">Thử lại</button></div>';
      });
      throw err;
    });
    return c.wait;
  }

  function render(c, data) {
    var d = {};
    data.forEach(function (x) { d[x.id] = x; });
    var h = '', muc = null;
    c.a.forEach(function (a) {
      if (a.m != null && a.m !== muc) {
        muc = a.m;
        var m = c.muc.filter(function (x) { return x.n === a.m; })[0];
        if (m) h += '<h3 class="lx-muc">' + esc(m.name) + (m.added ? ' <span class="lx-added" title="Tiêu đề này không có trong tài liệu gốc; được bổ sung theo cấu trúc chính thức của Bộ luật Hình sự năm 2015.">bổ sung tiêu đề</span>' : '') + '</h3>';
      }
      h += artHTML(a, d[a.id]);
    });
    var b = bodyOf(c);
    keep(function () { b.innerHTML = h; b.style.height = ''; });
    c.state = 'done';
    calibrate(c, b);
    if (HQ) paint(c);
  }

  // Giải phóng chương ở rất xa: giữ nguyên chiều cao nên không gây xê dịch
  function release(c) {
    if (c.state !== 'done' || c.wait || doc.hidden) return;
    if (cur && byArt[cur] && byArt[cur].ch === c.id) return;
    var b = bodyOf(c), h = b.offsetHeight;
    if (!h) return;
    b.style.height = h + 'px';
    b.innerHTML = '<div class="lx-ph" aria-hidden="true"></div>';
    c.state = 'empty';
  }

  var lazyIO, farIO;
  function observe() {
    lazyIO = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) ensure(e.target.dataset.ch).catch(function () {}); });
    }, { rootMargin: '1600px 0px 1600px 0px' });
    farIO = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (!e.isIntersecting) release(byCh[e.target.dataset.ch]); });
    }, { rootMargin: '12000px 0px 12000px 0px' });
    $$('.lx-ch', doc).forEach(function (s) { lazyIO.observe(s); farIO.observe(s); });
  }

  /* ================================================================
   * 5. MỤC LỤC
   * ================================================================ */
  function buildToc() {
    var h = '<div class="lx-tocx"><b>Mục lục</b><button type="button" data-close-toc aria-label="Đóng mục lục">×</button></div>' +
      '<div class="lx-tf" role="group" aria-label="Lọc mục lục">' +
      '<button type="button" data-tf="all" aria-pressed="true">Tất cả</button>' +
      '<button type="button" data-tf="n25" aria-pressed="false">Điểm mới 2025 <b>' + TOC.stats.n25 + '</b></button>' +
      '<button type="button" data-tf="am" aria-pressed="false">Có sửa đổi (*) <b>' + TOC.stats.am + '</b></button>' +
      '</div><nav class="lx-tn" aria-label="Mục lục Bộ luật Hình sự">';
    var lastPart = '';
    CH.forEach(function (c) {
      if (c.part !== lastPart) {
        lastPart = c.part;
        h += '<div class="lx-tp">' + esc(partOf[c.part].label) + ' · ' + esc(partOf[c.part].name) + '</div>';
      }
      h += '<details class="lx-tc" data-ch="' + c.id + '"><summary>' +
        '<span class="k">' + (c.num ? 'Chương ' + c.num : 'Phần III') + '</span>' +
        '<span class="nm">' + esc(c.name) + '</span>' +
        '<span class="rg">' + (c.a.length > 1 ? c.a[0].id + '–' + c.a[c.a.length - 1].id : 'Điều ' + c.a[0].id) + '</span></summary>';
      var muc = null;
      c.a.forEach(function (a) {
        if (a.m != null && a.m !== muc) {
          muc = a.m;
          var m = c.muc.filter(function (x) { return x.n === a.m; })[0];
          if (m) h += '<div class="lx-tm">' + esc(m.name) + '</div>';
        }
        h += '<a class="lx-ta' + (a.n25 ? ' f-n25' : '') + (a.am ? ' f-am' : '') + (a.rep ? ' rep' : '') +
          '" href="#d' + a.id + '" data-a="' + a.id + '"><span class="n">' + a.id + '</span><span class="t">' + esc(a.t) + '</span>' +
          (a.n25 ? '<i class="t25" title="Có điểm mới năm 2025">2025</i>' : '') +
          (a.am ? '<i class="tam" title="Có sửa đổi, bổ sung (*)"></i>' : '') + '</a>';
      });
      h += '</details>';
    });
    tocEl.innerHTML = h + '</nav>';
    tocEl.dataset.filter = 'all';
  }

  var tocCur = null, autoOpen = null;
  function tocActive(id) {
    if (tocCur) tocCur.classList.remove('on');
    var el = tocEl.querySelector('.lx-ta[data-a="' + id + '"]');
    if (!el) return;
    el.classList.add('on'); tocCur = el;
    var det = el.closest('details');
    if (!det.open) {
      if (autoOpen && autoOpen !== det && tocEl.dataset.filter === 'all') autoOpen.open = false;
      det.open = true; autoOpen = det;
    }
    if (!tocEl.matches(':hover') && tocEl.scrollHeight > tocEl.clientHeight) {
      var tr = tocEl.getBoundingClientRect(), er = el.getBoundingClientRect();
      if (er.top < tr.top + 48 || er.bottom > tr.bottom - 48) tocEl.scrollTop += er.top - tr.top - tr.height / 3;
    }
  }

  tocEl.addEventListener('click', function (e) {
    if (e.target.closest('[data-close-toc]')) { closeDrawer(); $('#lx-toc-btn').focus(); return; }
    var f = e.target.closest('[data-tf]');
    if (f) {
      var v = f.dataset.tf;
      tocEl.dataset.filter = v;
      $$('[data-tf]', tocEl).forEach(function (b) { b.setAttribute('aria-pressed', String(b === f)); });
      $$('.lx-tc', tocEl).forEach(function (d) {
        var n = v === 'all' ? 1 : d.querySelectorAll('.f-' + v).length;
        d.hidden = !n;
        d.open = v !== 'all' ? true : (tocCur ? d.contains(tocCur) : false);
      });
      return;
    }
    var a = e.target.closest('.lx-ta');
    if (a && !e.metaKey && !e.ctrlKey && !e.shiftKey) {
      e.preventDefault();
      closeDrawer();
      go(a.dataset.a);
    }
  });

  /* ================================================================
   * 6. THEO DÕI VỊ TRÍ ĐỌC
   * ================================================================ */
  var cur = null, ticking = false, hashTimer = 0;
  function spy() {
    ticking = false;
    if (doc.hidden) return;
    var r = doc.getBoundingClientRect();
    var x = Math.min(r.left + 30, r.right - 6), el = null;
    [40, 110, 220].some(function (dy) {
      var t = document.elementFromPoint(x, topOff + dy);
      el = t && t.closest('.lx-art');
      return !!el;
    });
    if (el && el.dataset.a !== cur) setCur(el.dataset.a, false);
  }
  function setCur(id, fromNav) {
    cur = id;
    var a = byArt[id];
    progEl.style.transform = 'scaleX(' + ((a.i + 1) / ART.length).toFixed(4) + ')';
    whereEl.textContent = 'Điều ' + id;
    tocActive(id);
    if (!fromNav) {
      clearTimeout(hashTimer);
      hashTimer = setTimeout(function () {
        if (resEl.hidden) history.replaceState(history.state, '', '#d' + cur);
      }, 450);
    }
  }
  addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(spy); }
  }, { passive: true });

  /* ================================================================
   * 7. ĐIỀU HƯỚNG
   * ================================================================ */
  function scrollToEl(el, pos) {
    var r = el.getBoundingClientRect();
    var y = pos === 'center'
      ? scrollY + r.top - Math.max(topOff + 24, (innerHeight - Math.min(r.height, innerHeight * 0.6)) / 2)
      : scrollY + r.top - topOff - 12;
    var near = Math.abs(y - scrollY) < innerHeight * 1.5;
    window.scrollTo({ top: Math.max(0, y), behavior: near && !reduced ? 'smooth' : 'instant' });
  }
  function flash(el) {
    el.classList.remove('lx-flash'); void el.offsetWidth; el.classList.add('lx-flash');
  }

  function go(id, o) {
    o = o || {};
    var a = byArt[id];
    if (!a) { toast('Không có Điều ' + id + ' trong Bộ luật'); return Promise.resolve(false); }
    clearTimeout(liveTimer);                  // huỷ lượt tìm tự động còn treo
    if (!resEl.hidden) closeResults(false);
    return ensure(a.ch).then(function () {
      var art = document.getElementById('d' + id);
      if (!art) return false;
      var t = art;
      if (o.p) {
        var p = art.querySelector('[data-p="' + o.p + '"]');
        if (p) {
          t = p;
          if (mode === 'law' && o.p[0] === 'c') openCm(art, true);
          if (mode === 'cm' && o.p[0] === 'l') art.classList.add('show-law');
        }
      }
      scrollToEl(t, o.p ? 'center' : 'start');
      flash(t);
      setCur(id, true);
      if (o.push !== false) history.pushState({ d: id }, '', '#d' + id);
      return true;
    }, function () {
      toast('Chưa tải được nội dung. Vui lòng kiểm tra kết nối mạng.');
      return false;
    });
  }

  function step(dir) {
    var i = cur ? byArt[cur].i + dir : 0;
    if (i >= 0 && i < ART.length) go(ART[i].id);
  }

  // "điểm s khoản 1 điều 51", "k2 đ173", "Điều 217a", "173"
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
  function refLabel(r) {
    return (r.p ? 'Điểm ' + r.p + ' ' : '') + (r.k ? (r.p ? 'khoản ' : 'Khoản ') + r.k + ' ' : '') + (r.p || r.k ? 'Điều ' : 'Điều ') + r.id;
  }
  function goRef(r) {
    if (!r.k && !r.p) return go(r.id);
    var a = byArt[r.id];
    return ensure(a.ch).then(function () {
      var ps = $$('#d' + r.id + ' .lx-law p'), i = -1;
      var txt = function (j) { return ps[j].textContent.trim(); };
      if (r.k) for (var j = 0; j < ps.length; j++) if (txt(j).indexOf(r.k + '.') === 0) { i = j; break; }
      if (r.p) {
        for (var q = Math.max(0, i + 1); q < ps.length; q++) {
          if (i >= 0 && /^\d{1,2}\./.test(txt(q))) break;
          if (txt(q).indexOf(r.p + ')') === 0) { i = q; break; }
        }
      }
      if (i < 0) toast('Không tìm thấy ' + refLabel(r).replace(/ Điều \S+$/, '') + ' trong Điều ' + r.id + ' — đã mở Điều ' + r.id);
      return go(r.id, { p: i >= 0 ? ps[i].dataset.p : null });
    });
  }

  /* ================================================================
   * 8. CHẾ ĐỘ HIỂN THỊ & CỠ CHỮ
   * ================================================================ */
  function setMode(m) {
    if (!TOC.withCommentary) m = 'law';
    keep(function () {
      mode = m;
      doc.className = 'lx-doc mode-' + m;
      $$('.lx-art.show-cm, .lx-art.show-law', doc).forEach(function (el) { el.classList.remove('show-cm', 'show-law'); });
      $$('.lx-more[aria-expanded="true"]', doc).forEach(function (b) { b.setAttribute('aria-expanded', 'false'); b.firstChild.textContent = 'Xem bình luận'; });
      refreshPlaceholders();
    });
    $$('[data-mode]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.mode === m)); });
    pref.set('mode', m);
  }
  function openCm(art, force) {
    var on = force === true ? true : !art.classList.contains('show-cm');
    keep(function () { art.classList.toggle('show-cm', on); });
    var b = art.querySelector('.lx-more');
    if (b) { b.setAttribute('aria-expanded', String(on)); b.firstChild.textContent = on ? 'Thu gọn bình luận' : 'Xem bình luận'; }
  }

  /* ================================================================
   * 9. GỢI Ý TỨC THÌ (không cần chờ dữ liệu toàn văn)
   * ================================================================ */
  var sug = [], sugI = -1;
  function markText(text, spans) {
    var out = '', last = 0;
    spans.forEach(function (s) { out += esc(text.slice(last, s[0])) + '<mark>' + esc(text.slice(s[0], s[1])) + '</mark>'; last = s[1]; });
    return out + esc(text.slice(last));
  }
  function suggest() {
    var q = qEl.value.trim();
    sug = []; sugI = -1;
    if (!q) return hideSug();
    var ref = parseRef(q);
    if (ref) sug.push({ kind: 'ref', ref: ref, html: '<b>' + esc(refLabel(ref)) + '</b><span>' + esc(byArt[ref.id].t) + '</span>', tag: 'Đi tới' });
    if (q.replace(/\s/g, '').length >= 2) {
      var cq = LX.compile(LX.parseQuery(q), { prefix: true });
      if (!cq.empty) {
        var hits = [];
        for (var k = 0; k < ART.length && hits.length < 40; k++) if (cq.test(ART[k].t)) hits.push(ART[k]);
        hits.sort(function (x, y) { return (cq.find(y.t)[0] ? 0 : 1) - (cq.find(x.t)[0] ? 0 : 1) || x.i - y.i; });
        hits.slice(0, ref ? 5 : 7).forEach(function (a) {
          if (ref && a.id === ref.id) return;
          sug.push({ kind: 'art', id: a.id, html: '<b>Điều ' + a.id + '.</b><span>' + markText(a.t, cq.find(a.t)) + '</span>', tag: chLabel(byCh[a.ch]) });
        });
        CH.filter(function (c) { return c.num && cq.test(c.name); }).slice(0, 2).forEach(function (c) {
          sug.push({ kind: 'ch', id: c.id, html: '<b>Chương ' + c.num + '.</b><span>' + markText(c.name, cq.find(c.name)) + '</span>', tag: c.a.length + ' điều' });
        });
      }
      sug.push({ kind: 'full', q: q, html: '<span class="lx-sg-full">Tìm <b>“' + esc(q) + '”</b> trong toàn văn điều luật và bình luận</span>', tag: 'Enter' });
    }
    if (!sug.length) return hideSug();
    sugEl.innerHTML = sug.map(function (s, i) {
      return '<div class="lx-sg" role="option" id="lx-sg' + i + '" data-i="' + i + '" aria-selected="false">' +
        '<span class="lx-sg-m">' + s.html + '</span><span class="lx-sg-t">' + esc(s.tag) + '</span></div>';
    }).join('');
    sugEl.hidden = false;
    qEl.setAttribute('aria-expanded', 'true');
  }
  function hideSug() {
    sugEl.hidden = true; sugI = -1;
    qEl.setAttribute('aria-expanded', 'false');
    qEl.removeAttribute('aria-activedescendant');
  }
  function sugMove(d) {
    if (sugEl.hidden || !sug.length) return;
    sugI = (sugI + d + sug.length) % sug.length;
    $$('.lx-sg', sugEl).forEach(function (el, i) { el.setAttribute('aria-selected', String(i === sugI)); });
    qEl.setAttribute('aria-activedescendant', 'lx-sg' + sugI);
    var el = $('#lx-sg' + sugI); if (el) el.scrollIntoView({ block: 'nearest' });
  }
  function pick(s) {
    hideSug();
    if (s.kind === 'ref') goRef(s.ref);
    else if (s.kind === 'art') go(s.id);
    else if (s.kind === 'ch') { closeResults(false); ensure(s.id).then(function () { scrollToEl($('#ch-' + s.id), 'start'); }); }
    else search(s.q, true);
    if (s.kind !== 'full') qEl.blur();
  }
  function submit() {
    var q = qEl.value.trim();
    if (!q) return;
    if (sugI >= 0 && sug[sugI]) return pick(sug[sugI]);
    var ref = parseRef(q);
    hideSug();
    if (ref) { qEl.blur(); return goRef(ref); }
    search(q, true);
  }

  /* ================================================================
   * 10. TÌM KIẾM TOÀN VĂN (luồng nền)
   * ================================================================ */
  var W = null, wReady = false, wFail = false, seq = 0, R = null, loadPct = 0;
  var view = { scope: 'all', where: '', sort: 'group', limit: 40 };

  function worker() {
    if (W || wFail) return W;
    try {
      W = new Worker('search-worker.js?v=' + TOC.v);
    } catch (e) { wFail = true; return null; }
    W.onmessage = function (e) {
      var m = e.data;
      if (m.type === 'progress') { loadPct = Math.round(m.done / m.total * 100); if (!resEl.hidden && (!R || R.pending)) drawPending(); }
      else if (m.type === 'ready') wReady = true;
      else if (m.type === 'result' && m.id === seq) { R = m; view.limit = 40; drawResults(); }
      else if (m.type === 'error') { wFail = true; if (!resEl.hidden) drawError(); }
    };
    W.onerror = function () { wFail = true; if (!resEl.hidden) drawError(); };
    W.postMessage({ type: 'init', v: TOC.v, chapters: CH.map(function (c) { return c.id; }), titles: ART.map(function (a) { return [a.id, a.t]; }) });
    return W;
  }

  var liveTimer = 0;
  function search(q, push) {
    clearTimeout(liveTimer);
    q = q.trim();
    if (!q) return;
    qEl.value = q;
    openResults();
    if (!worker()) return drawError();
    seq++;
    R = { pending: true, q: q };
    drawPending();
    W.postMessage({ type: 'search', id: seq, q: q });
    var url = '#tim=' + encodeURIComponent(q);
    if (push) history.pushState({ q: q }, '', url); else history.replaceState({ q: q }, '', url);
  }

  var savedY = 0;
  function openResults() {
    if (resEl.hidden) {
      savedY = scrollY;
      resEl.hidden = false;
      doc.hidden = true;
      navEl.hidden = true;
    }
    var y = $('.lx-body').getBoundingClientRect().top + scrollY - topOff - 8;
    if (scrollY > y) window.scrollTo(0, Math.max(0, y));
  }
  function closeResults(restore) {
    clearTimeout(liveTimer);
    if (resEl.hidden) return;
    resEl.hidden = true;
    doc.hidden = false;
    if (restore) window.scrollTo(0, savedY);
    if (HQ && hits.length) navEl.hidden = false;
    if (restore && cur) history.replaceState({ d: cur }, '', '#d' + cur);
  }

  function drawPending() {
    resEl.innerHTML = '<div class="lx-rloading" role="status"><span class="lx-spin" aria-hidden="true"></span>' +
      (wReady ? 'Đang tìm…' : 'Đang chuẩn bị dữ liệu tìm kiếm' + (loadPct ? ' — ' + loadPct + '%' : '') + '…') +
      '<small>Chỉ nạp một lần; các lần tìm sau gần như tức thì.</small></div>';
  }
  function drawError() {
    resEl.innerHTML = '<div class="lx-rempty"><h2>Chưa thể tìm kiếm toàn văn</h2><p>Trình duyệt chưa tải được dữ liệu tìm kiếm. ' +
      'Vui lòng kiểm tra kết nối mạng rồi tải lại trang. Bạn vẫn có thể tra theo số điều hoặc dùng mục lục bên trái.</p>' +
      '<button type="button" class="lx-btn" data-close>Quay lại văn bản</button></div>';
  }

  function inWhere(r) {
    if (!view.where) return true;
    var a = byArt[r.id];
    return a.ch === view.where || byCh[a.ch].part === view.where;
  }
  function inScope(r, sc) {
    return sc === 'all' || (sc === 'law' && r.lh) || (sc === 'cm' && r.cm) || (sc === 'title' && r.th);
  }
  function hitCount(r, sc) {
    return sc === 'law' ? r.lh : sc === 'cm' ? r.cm : sc === 'title' ? (r.th ? 1 : 0) : r.lh + r.cm + (r.lh + r.cm ? 0 : r.th);
  }

  function drawResults() {
    if (!R || R.pending) return;
    var cq = LX.compile(LX.parseQuery(R.q));
    var base = R.exact.concat(R.loose).filter(inWhere);
    var cnt = {};
    ['all', 'law', 'cm', 'title'].forEach(function (sc) {
      var list = base.filter(function (r) { return inScope(r, sc); });
      cnt[sc] = { arts: list.length, hits: list.reduce(function (s, r) { return s + hitCount(r, sc); }, 0) };
    });
    var list = base.filter(function (r) { return inScope(r, view.scope); });
    var ex = list.filter(function (r) { return R.exact.indexOf(r) > -1; });
    var lo = list.filter(function (r) { return R.loose.indexOf(r) > -1; });
    var score = function (r) { return (r.th ? 1000 : 0) + r.lh * 6 + r.cm; };
    if (view.sort === 'rel') { ex.sort(function (a, b) { return score(b) - score(a); }); lo.sort(function (a, b) { return score(b) - score(a); }); }

    var opts = '<option value="">Toàn bộ Bộ luật</option>' + TOC.parts.map(function (p) {
      return '<optgroup label="' + esc(p.label + ' · ' + p.name) + '"><option value="' + p.id + '"' + (view.where === p.id ? ' selected' : '') + '>Cả ' + esc(p.label.toLowerCase()) + '</option>' +
        CH.filter(function (c) { return c.part === p.id && c.num; }).map(function (c) {
          return '<option value="' + c.id + '"' + (view.where === c.id ? ' selected' : '') + '>Chương ' + c.num + ' · ' + esc(c.name) + '</option>';
        }).join('') + '</optgroup>';
    }).join('');

    var chip = function (sc, label) {
      return '<button type="button" data-scope="' + sc + '" aria-pressed="' + (view.scope === sc) + '"' + (cnt[sc].arts ? '' : ' disabled') + '>' +
        label + ' <b>' + cnt[sc].arts + '</b></button>';
    };
    var sortBtn = function (v, label) { return '<button type="button" data-sort="' + v + '" aria-pressed="' + (view.sort === v) + '">' + label + '</button>'; };

    var total = cnt[view.scope];
    var pq = LX.parseQuery(R.q);
    var h = '<div class="lx-rhead">' +
      '<div class="lx-rsum" role="status"><span>' + (total.arts
        ? 'Tìm thấy <b>' + total.hits.toLocaleString('vi-VN') + '</b> kết quả trong <b>' + total.arts + '</b> điều'
        : 'Không có kết quả') + ' cho “' + esc(R.q) + '”</span>' +
        '<small>' + (pq.toned ? 'Chữ có dấu được khớp đúng dấu, chữ không dấu khớp mọi dấu' : 'Đang tìm không dấu — gõ có dấu để lọc chính xác hơn') +
        ' · ' + R.ms + ' ms</small></div>' +
      '<button type="button" class="lx-rclose" data-close aria-label="Đóng kết quả, quay lại văn bản">Quay lại văn bản <span aria-hidden="true">×</span></button></div>' +
      '<div class="lx-rctl"><div class="lx-chips" role="group" aria-label="Phạm vi">' +
        chip('all', 'Tất cả') + chip('law', 'Điều luật') + chip('cm', 'Bình luận') + chip('title', 'Tên điều') + '</div>' +
        '<label class="lx-rwhere"><span>Trong</span><select id="lx-rwhere">' + opts + '</select></label>' +
        '<div class="lx-chips lx-sort" role="group" aria-label="Cách trình bày">' + sortBtn('group', 'Theo chương') + sortBtn('order', 'Theo thứ tự điều') + sortBtn('rel', 'Liên quan nhất') + '</div>' +
      '</div>';

    if (!list.length) {
      h += '<div class="lx-rempty"><h2>Không tìm thấy kết quả phù hợp</h2><ul>' +
        '<li>Kiểm tra lại chính tả, hoặc thử gõ <b>không dấu</b> để mở rộng kết quả.</li>' +
        '<li>Dùng từ khóa ngắn hơn, hoặc bỏ ngoặc kép để không bắt buộc các từ đứng liền nhau.</li>' +
        (view.where || view.scope !== 'all' ? '<li>Mở rộng phạm vi tìm về <b>Tất cả</b> và <b>Toàn bộ Bộ luật</b>.</li>' : '') +
        '<li>Tra theo số điều: gõ <b>173</b>, hoặc <b>điểm s khoản 1 điều 51</b>.</li></ul></div>';
      resEl.innerHTML = h;
      return;
    }

    var shown = 0, limit = view.limit;
    function cards(arr) {
      var out = '';
      if (view.sort === 'group') {
        var g = null, buf = '', gA = 0, gH = 0;
        var flush = function () { if (g) out += '<details class="lx-rg" open><summary><span class="k">' + esc(chLabel(g)) + '</span> ' + esc(g.name) + '<span class="c">' + gA + ' điều · ' + gH + ' kết quả</span></summary>' + buf + '</details>'; };
        arr.forEach(function (r) {
          if (shown >= limit) return;
          var c = byCh[byArt[r.id].ch];
          if (c !== g) { flush(); g = c; buf = ''; gA = 0; gH = 0; }
          buf += card(r, cq); gA++; gH += hitCount(r, view.scope); shown++;
        });
        flush();
      } else {
        arr.forEach(function (r) { if (shown < limit) { out += card(r, cq); shown++; } });
      }
      return out;
    }
    if (ex.length) h += cards(ex);
    if (lo.length && shown < limit) {
      h += '<div class="lx-rsep"><b>Kết quả gần đúng</b> — có đủ các từ “' + esc(pq.terms.join(' ')) + '” nhưng không đứng liền nhau</div>' + cards(lo);
    }
    if (list.length > shown) {
      h += '<button type="button" class="lx-btn lx-rmore" data-more>Hiển thị thêm ' + Math.min(40, list.length - shown) + ' điều <small>(còn ' + (list.length - shown) + ')</small></button>';
    }
    resEl.innerHTML = h;
  }

  function card(r, cq) {
    var a = byArt[r.id];
    var sn = r.sn.filter(function (s) { return view.scope === 'all' || view.scope === 'title' || (view.scope === 'law' ? s[0] === 'l' : s[0] === 'c'); }).slice(0, 3);
    var ps = r.ps.filter(function (p) { return view.scope === 'all' || view.scope === 'title' || (view.scope === 'law' ? p[0] === 'l' : p[0] === 'c'); });
    var meta = [];
    if (r.th) meta.push('<span class="tt">Khớp tên điều</span>');
    if (r.lh && view.scope !== 'cm') meta.push('<span>' + r.lh + ' đoạn điều luật</span>');
    if (r.cm && view.scope !== 'law') meta.push('<span>' + r.cm + ' đoạn bình luận</span>');
    return '<article class="lx-hit">' +
      '<a class="lx-hit-t" href="#d' + a.id + '" data-go="' + a.id + '"><span>Điều ' + a.id + '.</span> ' + markText(a.t, r.th ? cq.find(a.t) : []) + '</a>' +
      '<div class="lx-hit-m">' + meta.join('') + (a.n25 ? '<span class="n25">Điểm mới 2025</span>' : '') + '</div>' +
      sn.map(function (s) {
        return '<button type="button" class="lx-snip" data-go="' + a.id + '" data-p="' + s[0] + s[1] + '">' +
          '<span class="w ' + s[0] + '">' + (s[0] === 'l' ? 'Điều luật' : 'Bình luận') + '</span>' +
          '<span class="x">' + (s[4] ? '…' : '') + markText(s[2], s[3]) + (s[5] ? '…' : '') + '</span></button>';
      }).join('') +
      (ps.length > sn.length ? '<a class="lx-hit-all" href="#d' + a.id + '" data-go="' + a.id + '" data-p="' + ps[0] + '">Xem lần lượt cả ' + ps.length + ' đoạn khớp trong Điều ' + a.id + ' <span aria-hidden="true">→</span></a>' : '') +
      '</article>';
  }

  resEl.addEventListener('click', function (e) {
    var g = e.target.closest('[data-go]');
    if (g) { e.preventDefault(); openHit(g.dataset.go, g.dataset.p || null); return; }
    var sc = e.target.closest('[data-scope]');
    if (sc) { view.scope = sc.dataset.scope; view.limit = 40; drawResults(); return; }
    var so = e.target.closest('[data-sort]');
    if (so) { view.sort = so.dataset.sort; drawResults(); return; }
    if (e.target.closest('[data-more]')) { view.limit += 40; drawResults(); return; }
    if (e.target.closest('[data-close]')) closeResults(true);
  });
  resEl.addEventListener('change', function (e) {
    if (e.target.id === 'lx-rwhere') { view.where = e.target.value; view.limit = 40; drawResults(); }
  });

  /* ================================================================
   * 11. TÔ SÁNG & ĐI QUA TỪNG KẾT QUẢ
   * ================================================================ */
  var HAS_HL = typeof CSS !== 'undefined' && CSS.highlights && typeof Highlight === 'function';
  var hlAll = HAS_HL ? new Highlight() : null, hlCur = HAS_HL ? new Highlight() : null;
  if (HAS_HL) { CSS.highlights.set('lx-hit', hlAll); CSS.highlights.set('lx-cur', hlCur); }
  var HQ = null, hits = [], byChHits = {}, hitI = -1;

  function textRanges(el) {
    var nodes = [], text = '';
    var tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) { return n.parentNode.closest && n.parentNode.closest('sup.fn') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT; }
    });
    var n;
    while ((n = tw.nextNode())) { nodes.push([n, text.length]); text += n.data; }
    if (!nodes.length) return [];
    var at = function (pos) {
      for (var k = nodes.length - 1; k >= 0; k--) if (nodes[k][1] <= pos) return [nodes[k][0], Math.min(pos - nodes[k][1], nodes[k][0].data.length)];
      return [nodes[0][0], 0];
    };
    return HQ.find(text).map(function (s) {
      var r = document.createRange(), a = at(s[0]), b = at(s[1]);
      r.setStart(a[0], a[1]); r.setEnd(b[0], b[1]);
      return r;
    });
  }
  function mark(el, cls) {
    var rs = textRanges(el);
    if (HAS_HL) { rs.forEach(function (r) { (cls === 'cur' ? hlCur : hlAll).add(r); }); return; }
    for (var k = rs.length - 1; k >= 0; k--) {           // dự phòng cho trình duyệt cũ
      var r = rs[k];
      if (r.startContainer !== r.endContainer) continue;
      var m = document.createElement('mark'); m.className = 'lx-hl';
      try { r.surroundContents(m); } catch (e) { /* bỏ qua */ }
    }
  }
  function paint(c) {
    (byChHits[c.id] || []).forEach(function (h) {
      var el = document.querySelector('#d' + h.id + ' [data-p="' + h.p + '"]');
      if (el && !el.dataset.hl) { el.dataset.hl = '1'; mark(el); }
    });
  }
  function unpaint() {
    if (HAS_HL) { hlAll.clear(); hlCur.clear(); }
    else $$('mark.lx-hl', doc).forEach(function (m) { m.replaceWith(document.createTextNode(m.textContent)); });
    $$('[data-hl]', doc).forEach(function (el) { el.removeAttribute('data-hl'); });
    $$('.lx-cur', doc).forEach(function (el) { el.classList.remove('lx-cur'); });
  }

  function openHit(id, p) {
    var sc = view.scope;
    var list = R.exact.concat(R.loose).filter(inWhere).filter(function (r) { return inScope(r, sc); })
      .sort(function (a, b) { return byArt[a.id].i - byArt[b.id].i; });
    unpaint();
    hits = []; byChHits = {};
    list.forEach(function (r) {
      r.ps.forEach(function (ps) {
        if (sc === 'law' && ps[0] !== 'l') return;
        if (sc === 'cm' && ps[0] !== 'c') return;
        var h = { id: r.id, p: ps, ch: byArt[r.id].ch };
        hits.push(h);
        (byChHits[h.ch] = byChHits[h.ch] || []).push(h);
      });
    });
    HQ = LX.compile(LX.parseQuery(R.q));
    hitI = 0;
    for (var k = 0; k < hits.length; k++) {
      if (hits[k].id === id && (!p || hits[k].p === p)) { hitI = k; break; }
    }
    if (!hits.length) return go(id);
    CH.forEach(function (c) { if (c.state === 'done') paint(c); });
    toHit(hitI, true);
  }
  function toHit(i, push) {
    if (!hits.length) return;
    hitI = (i + hits.length) % hits.length;
    var h = hits[hitI];
    navEl.hidden = false;
    $('.c', navEl).textContent = (hitI + 1) + ' / ' + hits.length;
    go(h.id, { p: h.p, push: push }).then(function () {
      $$('.lx-cur', doc).forEach(function (el) { el.classList.remove('lx-cur'); });
      if (HAS_HL) hlCur.clear();
      var el = document.querySelector('#d' + h.id + ' [data-p="' + h.p + '"]');
      if (el) { el.classList.add('lx-cur'); mark(el, 'cur'); }
    });
  }
  function clearHits() {
    unpaint(); HQ = null; hits = []; byChHits = {}; navEl.hidden = true;
  }
  navEl.addEventListener('click', function (e) {
    var b = e.target.closest('[data-nav]');
    if (!b) return;
    var v = b.dataset.nav;
    if (v === 'prev') toHit(hitI - 1, false);
    else if (v === 'next') toHit(hitI + 1, false);
    else if (v === 'list') { openResults(); drawResults(); }
    else if (v === 'close') clearHits();
  });

  /* ================================================================
   * 12. TIỆN ÍCH: sao chép, chú thích, thông báo
   * ================================================================ */
  var toastT = 0;
  function toast(msg) {
    var t = $('#lx-toast');
    t.textContent = msg; t.hidden = false; t.classList.add('on');
    clearTimeout(toastT);
    toastT = setTimeout(function () { t.classList.remove('on'); setTimeout(function () { t.hidden = true; }, 250); }, 2600);
  }
  function copy(text, ok) {
    var done = function () { toast(ok); };
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, fallback);
    else fallback();
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); done(); } catch (e) { toast('Trình duyệt không cho phép sao chép tự động'); }
      ta.remove();
    }
  }
  var pop = $('#lx-pop');
  function showFn(sup) {
    var txt = sup.getAttribute('title') || '';
    pop.innerHTML = '<b>Chú thích ' + esc(sup.dataset.fn) + '</b>' + esc(txt);
    pop.hidden = false;
    var r = sup.getBoundingClientRect();
    var left = Math.min(Math.max(12, r.left - 20), innerWidth - pop.offsetWidth - 12);
    pop.style.left = left + 'px';
    pop.style.top = (r.bottom + 8 + pop.offsetHeight > innerHeight ? r.top - pop.offsetHeight - 8 : r.bottom + 8) + 'px';
  }

  doc.addEventListener('click', function (e) {
    var x = e.target.closest('a.xr');
    if (x) { e.preventDefault(); go(x.getAttribute('href').slice(2)); return; }
    var f = e.target.closest('sup.fn');
    if (f) { e.stopPropagation(); showFn(f); return; }
    var b = e.target.closest('[data-act]');
    if (!b) return;
    var act = b.dataset.act, art = b.closest('.lx-art');
    if (act === 'retry') { ensure(b.dataset.ch).catch(function () {}); return; }
    var id = art && art.dataset.a, a = byArt[id];
    if (act === 'cite') {
      copy('Điều ' + id + ' (' + a.t + ') Bộ luật Hình sự số 100/2015/QH13, được sửa đổi, bổ sung bởi Luật số 12/2017/QH14 và Luật số 86/2025/QH15.', 'Đã sao chép trích dẫn Điều ' + id);
    } else if (act === 'link') {
      copy(location.origin + location.pathname + '#d' + id, 'Đã sao chép liên kết tới Điều ' + id);
    } else if (act === 'more') openCm(art);
  });
  doc.addEventListener('keydown', function (e) {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('sup.fn')) { e.preventDefault(); showFn(e.target); }
  });
  document.addEventListener('click', function (e) {
    if (!pop.hidden && !e.target.closest('#lx-pop')) pop.hidden = true;
    if (!e.target.closest('.lx-search')) hideSug();
  });
  addEventListener('scroll', function () { if (!pop.hidden) pop.hidden = true; }, { passive: true });

  /* ================================================================
   * 13. THANH CÔNG CỤ, BÀN PHÍM, MỤC LỤC TRÊN ĐIỆN THOẠI
   * ================================================================ */
  qEl.addEventListener('input', function () {
    suggest();
    worker();
    if (!resEl.hidden) {
      clearTimeout(liveTimer);
      liveTimer = setTimeout(function () {
        var q = qEl.value.trim();
        if (q.replace(/\s/g, '').length >= 2 && !parseRef(q)) search(q, false);
      }, 320);
    }
  });
  qEl.addEventListener('focus', function () { worker(); if (qEl.value.trim()) suggest(); });
  qEl.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); sugMove(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); sugMove(-1); }
    else if (e.key === 'Escape') {
      // Ô type="search" mặc định bị xoá trắng khi nhấn Esc: lần đầu chỉ đóng gợi ý, giữ từ khoá
      if (!sugEl.hidden) { e.preventDefault(); e.stopPropagation(); hideSug(); }
      else if (!qEl.value) qEl.blur();
    }
  });
  qEl.form.addEventListener('submit', function (e) { e.preventDefault(); submit(); });
  sugEl.addEventListener('mousedown', function (e) {
    var el = e.target.closest('.lx-sg');
    if (el) { e.preventDefault(); pick(sug[+el.dataset.i]); }
  });
  $('#lx-clear').addEventListener('click', function () { qEl.value = ''; hideSug(); qEl.focus(); });

  $$('[data-mode]').forEach(function (b) { b.addEventListener('click', function () { setMode(b.dataset.mode); }); });
  $$('[data-try]').forEach(function (b) {
    b.addEventListener('click', function () { qEl.value = b.dataset.try; submit(); });
  });

  function closeDrawer() { document.body.classList.remove('lx-drawer'); $('#lx-toc-btn').setAttribute('aria-expanded', 'false'); }
  $('#lx-toc-btn').addEventListener('click', function () {
    var on = !document.body.classList.contains('lx-drawer');
    document.body.classList.toggle('lx-drawer', on);
    this.setAttribute('aria-expanded', String(on));
    if (on && tocCur) tocCur.scrollIntoView({ block: 'center' });
  });
  $('.lx-scrim').addEventListener('click', closeDrawer);
  $('#lx-opt-btn').addEventListener('click', function () {
    var on = !barEl.classList.contains('opts-open');
    barEl.classList.toggle('opts-open', on);
    this.setAttribute('aria-expanded', String(on));
    measure();
  });

  addEventListener('keydown', function (e) {
    var t = e.target, typing = /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable;
    if ((e.key === '/' && !typing) || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')) {
      e.preventDefault(); qEl.focus(); qEl.select(); return;
    }
    if (typing || e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === 'Escape') {
      if (document.body.classList.contains('lx-drawer')) closeDrawer();
      else if (!pop.hidden) pop.hidden = true;
      else if (!resEl.hidden) closeResults(true);
      else if (HQ) clearHits();
    } else if (e.key === ']') step(1);
    else if (e.key === '[') step(-1);
    else if (HQ && (e.key === 'n' || e.key === 'N')) toHit(hitI + (e.shiftKey ? -1 : 1), false);
  });

  /* ================================================================
   * 14. ĐỊNH TUYẾN (#d173, #d173-l3, #tim=...)
   * ================================================================ */
  function route() {
    var h = '';
    try { h = decodeURIComponent(location.hash.slice(1)); } catch (e) { h = location.hash.slice(1); }
    if (h.indexOf('tim=') === 0) {
      var q = h.slice(4);
      if (R && !R.pending && R.q === q) { openResults(); drawResults(); } else search(q, false);
      return;
    }
    var m = h.match(/^d(\d{1,3}[a-z]?)(?:-([lc]\d+))?$/);
    if (m && byArt[m[1]]) { go(m[1], { push: false, p: m[2] || null }); return; }
    if (!resEl.hidden) closeResults(true);
  }
  addEventListener('popstate', route);

  var resizeT = 0, lastW = innerWidth;
  addEventListener('resize', function () {
    clearTimeout(resizeT);
    resizeT = setTimeout(function () {
      measure();
      if (innerWidth !== lastW) { lastW = innerWidth; keep(refreshPlaceholders); }
    }, 150);
  });

  /* ================================================================
   * 15. KHỞI ĐỘNG
   * ================================================================ */
  measure();
  buildToc();
  skeleton();
  setMode(mode);
  $$('[data-mode]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.mode === mode)); });
  observe();
  document.body.classList.add('lx-ready');
  if (location.hash.length > 1) route();
  else setCur(ART[0].id, true);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { measure(); });
})();
