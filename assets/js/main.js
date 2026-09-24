/* =====================================================================
   LSN LAW FIRM – Công Ty Luật TNHH Luật Sư Nam
   ---------------------------------------------------------------------
   CẤU HÌNH BIỂU MẪU
   WEB3FORMS_KEY: lấy miễn phí tại https://web3forms.com (nhập email công ty,
   nhận access key qua email rồi dán vào đây). Khi chưa có key, biểu mẫu tự
   chuyển sang mở ứng dụng email của khách nên website vẫn hoạt động.
   ===================================================================== */
var WEB3FORMS_KEY = 'DAN_ACCESS_KEY_WEB3FORMS_VAO_DAY';
var CONTACT_EMAIL = 'luatsunam.hcm@gmail.com';
var CONTACT_PHONE = '0983 498 499';

(function () {
  'use strict';

  var doc = document.documentElement;
  doc.classList.add('js');
  var ROOT = doc.getAttribute('data-root') || '';
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  /* ---------- Header, nút nổi ---------- */
  var header = $('#site-header');
  var toTop = $('#to-top');
  var floating = $('.floating');
  function onScroll() {
    var y = window.scrollY;
    if (header) header.classList.toggle('is-scrolled', y > 10);
    if (toTop) toTop.classList.toggle('is-visible', y > 600);
    if (floating) floating.classList.toggle('is-visible', y > 300);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  if (toTop) toTop.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' }); });

  /* ---------- Menu mobile ---------- */
  var nav = $('#nav');
  var burger = $('#burger');
  var backdrop = null;
  var mobileQuery = window.matchMedia('(max-width: 1080px)');
  function setNav(open) {
    if (!nav || !burger) return;
    nav.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Đóng menu' : 'Mở menu');
    $('use', burger).setAttribute('href', open ? '#i-close' : '#i-menu');
    document.body.classList.toggle('no-scroll', open);
    if (open) {
      backdrop = document.createElement('div');
      backdrop.className = 'nav-backdrop';
      backdrop.addEventListener('click', function () { setNav(false); });
      document.body.appendChild(backdrop);
    } else if (backdrop) {
      backdrop.remove();
      backdrop = null;
    }
  }
  if (burger) burger.addEventListener('click', function () { setNav(!nav.classList.contains('is-open')); });
  window.addEventListener('resize', function () { if (!mobileQuery.matches && nav && nav.classList.contains('is-open')) setNav(false); });

  /* ---------- Menu xổ xuống ---------- */
  var toggles = $$('.nav__toggle');
  function closeSubs(except) {
    toggles.forEach(function (btn) {
      if (btn === except) return;
      btn.parentElement.classList.remove('is-open');
      btn.setAttribute('aria-expanded', 'false');
    });
  }
  toggles.forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = btn.parentElement.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', String(open));
      closeSubs(btn);
    });
  });
  // Mở sẵn nhóm menu chứa trang hiện tại khi xem trên điện thoại
  $$('.nav__item.has-sub').forEach(function (item) {
    if ($('.nav__sublink[aria-current="page"]', item) && mobileQuery.matches) {
      item.classList.add('is-open');
      $('.nav__toggle', item).setAttribute('aria-expanded', 'true');
    }
  });
  document.addEventListener('click', function (e) {
    if (!mobileQuery.matches && !e.target.closest('.nav__item')) closeSubs();
  });

  /* ---------- Hero slider (trang chủ) ---------- */
  var slides = $$('.hero__slide');
  var dots = $$('.hero__dots button');
  if (slides.length > 1) {
    var current = 0, timer = null;
    var go = function (i) {
      current = (i + slides.length) % slides.length;
      slides.forEach(function (s, k) { s.classList.toggle('is-active', k === current); s.setAttribute('aria-hidden', String(k !== current)); });
      dots.forEach(function (d, k) { d.classList.toggle('is-active', k === current); d.setAttribute('aria-selected', String(k === current)); });
    };
    var stop = function () { clearInterval(timer); };
    var play = function () { if (!reduceMotion) { stop(); timer = setInterval(function () { go(current + 1); }, 6500); } };
    dots.forEach(function (d, k) { d.addEventListener('click', function () { go(k); play(); }); });
    var hero = $('.hero');
    hero.addEventListener('mouseenter', stop);
    hero.addEventListener('mouseleave', play);
    go(0);
    play();
  }

  /* ---------- Hiện dần khi cuộn + đếm số ---------- */
  function countUp(el) {
    var target = parseInt(el.getAttribute('data-count'), 10);
    var pad = parseInt(el.getAttribute('data-pad') || '0', 10);
    var fmt = function (n) { var s = String(n); while (s.length < pad) s = '0' + s; return s; };
    if (reduceMotion) { el.textContent = fmt(target); return; }
    var start = null, dur = 1400;
    function step(t) {
      if (!start) start = t;
      var p = Math.min((t - start) / dur, 1);
      el.textContent = fmt(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  var reveals = $$('.reveal');
  var counters = $$('[data-count]');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target;
        if (el.classList.contains('reveal')) {
          var siblings = $$(':scope > .reveal', el.parentElement);
          el.style.transitionDelay = Math.min(Math.max(siblings.indexOf(el), 0), 5) * 70 + 'ms';
          el.classList.add('is-in');
        }
        if (el.hasAttribute('data-count')) countUp(el);
        obs.unobserve(el);
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -30px 0px' });
    reveals.concat(counters).forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* ---------- Cửa sổ: tìm kiếm + đặt lịch ---------- */
  var lastFocus = null;
  function openOverlay(el) {
    lastFocus = document.activeElement;
    el.hidden = false;
    document.body.classList.add('no-scroll');
    var first = $('input:not([type=hidden]):not([tabindex="-1"]), select, textarea', el);
    setTimeout(function () { if (first) first.focus(); }, 30);
  }
  function closeOverlay(el) {
    el.hidden = true;
    if (!nav || !nav.classList.contains('is-open')) document.body.classList.remove('no-scroll');
    if (lastFocus) lastFocus.focus();
  }
  var search = $('#search');
  var booking = $('#booking');
  $$('[data-open-search]').forEach(function (b) { b.addEventListener('click', function () { openOverlay(search); loadIndex(); }); });
  $$('[data-open-booking]').forEach(function (b) {
    b.addEventListener('click', function (e) {
      e.preventDefault();
      if (nav && nav.classList.contains('is-open')) setNav(false);
      openOverlay(booking);
    });
  });
  $$('.overlay').forEach(function (ov) {
    ov.addEventListener('click', function (e) { if (e.target === ov || e.target.closest('[data-close]')) closeOverlay(ov); });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    $$('.overlay').forEach(function (ov) { if (!ov.hidden) closeOverlay(ov); });
    if (nav && nav.classList.contains('is-open')) setNav(false);
    closeSubs();
  });

  /* ---------- Tìm kiếm trong website ---------- */
  var index = null;
  var qInput = $('#search-q');
  var results = $('#search-results');
  function fold(s) {
    return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function loadIndex() {
    if (index) return Promise.resolve(index);
    return fetch(ROOT + 'assets/search-index.json').then(function (r) { return r.json(); }).then(function (data) {
      index = data.map(function (d) { d._t = fold(d.t); d._all = fold(d.t + ' ' + d.d + ' ' + d.k + ' ' + d.s); return d; });
      return index;
    }).catch(function () { index = []; return index; });
  }
  function runSearch() {
    var q = fold(qInput.value.trim());
    if (!q) { results.innerHTML = ''; return; }
    var words = q.split(/\s+/);
    loadIndex().then(function (idx) {
      var hits = idx.map(function (d) {
        var score = 0;
        words.forEach(function (w) {
          if (d._t.indexOf(w) > -1) score += 5;
          else if (d._all.indexOf(w) > -1) score += 1;
          else score -= 10;
        });
        if (d._t.indexOf(q) > -1) score += 8;
        return { d: d, s: score };
      }).filter(function (h) { return h.s > 0; }).sort(function (a, b) { return b.s - a.s; }).slice(0, 8);
      results.innerHTML = hits.length ? hits.map(function (h) {
        return '<li><a href="' + ROOT + h.d.u + '"><em>' + esc(h.d.s || 'Trang') + '</em><strong>' + esc(h.d.t) + '</strong><small>' + esc(h.d.d) + '</small></a></li>';
      }).join('') : '<li class="search__empty">Không tìm thấy nội dung phù hợp. Hãy thử từ khóa khác hoặc <a href="' + ROOT + 'lien-he/">hỏi trực tiếp luật sư</a>.</li>';
    });
  }
  if (qInput) {
    qInput.addEventListener('input', runSearch);
    $('.search__form').addEventListener('submit', function (e) {
      e.preventDefault();
      var first = $('a', results);
      if (first) window.location.href = first.getAttribute('href');
    });
  }

  /* ---------- Biểu mẫu tư vấn ---------- */
  function buildMailto(d) {
    var subject = 'Yêu cầu tư vấn pháp lý - ' + (d.service || 'Chưa chọn lĩnh vực');
    var body = [
      'Họ và tên: ' + d.name,
      'Số điện thoại: ' + d.phone,
      'Email: ' + (d.email || 'Không cung cấp'),
      'Lĩnh vực: ' + (d.service || 'Chưa chọn'),
      d.date ? 'Ngày mong muốn: ' + d.date : '',
      d.mode ? 'Hình thức: ' + d.mode : '',
      '',
      'Nội dung cần tư vấn:',
      d.message
    ].filter(function (x, i) { return x !== '' || i === 6; }).join('\n');
    return 'mailto:' + CONTACT_EMAIL + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
  }

  $$('[data-form]').forEach(function (form) {
    var status = $('.form__status', form);
    var btn = $('button[type="submit"]', form);
    var label = btn ? btn.innerHTML : '';
    function setStatus(text, ok) { status.textContent = text; status.className = 'form__status ' + (ok ? 'is-ok' : 'is-err'); }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var fd = new FormData(form);
      if ((fd.get('botcheck') || '').toString().trim()) return; // bẫy chống spam

      var ok = true;
      $$('input, textarea, select', form).forEach(function (f) {
        if (f.name === 'botcheck') return;
        var bad = !f.checkValidity();
        if (f.type === 'checkbox') f.closest('.consent').classList.toggle('is-invalid', bad);
        else f.classList.toggle('is-invalid', bad);
        if (bad && ok) { ok = false; f.focus(); }
      });
      if (!ok) {
        setStatus('Vui lòng kiểm tra lại các trường bắt buộc (*) và xác nhận đồng ý xử lý dữ liệu cá nhân.', false);
        return;
      }

      var d = {};
      ['name', 'phone', 'email', 'service', 'message', 'date', 'mode'].forEach(function (k) { d[k] = (fd.get(k) || '').toString().trim(); });

      if (!WEB3FORMS_KEY || WEB3FORMS_KEY.indexOf('DAN_') === 0) {
        setStatus('Cảm ơn ' + (d.name || 'bạn') + '. Ứng dụng email sẽ mở để bạn kiểm tra và gửi yêu cầu.', true);
        window.location.href = buildMailto(d);
        return;
      }

      if (btn) { btn.setAttribute('aria-busy', 'true'); btn.textContent = 'Đang gửi…'; }
      fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          access_key: WEB3FORMS_KEY,
          subject: '[Website] ' + (form.id === 'booking-form' ? 'Đặt lịch tư vấn' : 'Yêu cầu tư vấn') + ' - ' + (d.service || 'Chưa chọn lĩnh vực'),
          from_name: 'Website Luật Sư Nam',
          'Họ và tên': d.name,
          'Số điện thoại': d.phone,
          Email: d.email || 'Không cung cấp',
          'Lĩnh vực': d.service || 'Chưa chọn',
          'Ngày mong muốn': d.date || '—',
          'Hình thức': d.mode || '—',
          'Nội dung': d.message,
          'Đồng ý xử lý dữ liệu': 'Có',
          'Trang gửi': window.location.pathname
        })
      }).then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (json) {
          if (!res.ok || json.success === false) throw new Error(json.message || 'Gửi không thành công');
          form.reset();
          setStatus('Cảm ơn ' + (d.name || 'bạn') + '. Chúng tôi đã nhận được yêu cầu và sẽ liên hệ lại trong giờ làm việc, thường trong vòng 24 giờ làm việc.', true);
        });
      }).catch(function () {
        setStatus('Chưa gửi được yêu cầu. Vui lòng gọi ' + CONTACT_PHONE + ' hoặc email ' + CONTACT_EMAIL + ' để được hỗ trợ ngay.', false);
      }).then(function () {
        if (btn) { btn.removeAttribute('aria-busy'); btn.innerHTML = label; }
      });
    });

    form.addEventListener('input', function (e) {
      if (e.target.classList) e.target.classList.remove('is-invalid');
      var c = e.target.closest && e.target.closest('.consent');
      if (c) c.classList.remove('is-invalid');
    });
  });

  /* ---------- Bản đồ: chỉ tải khi người dùng bấm ---------- */
  $$('.map[data-map]').forEach(function (box) {
    var btn = $('.map__load', box);
    btn.addEventListener('click', function () {
      var f = document.createElement('iframe');
      f.src = box.getAttribute('data-map');
      f.title = 'Bản đồ vị trí văn phòng Công Ty Luật TNHH Luật Sư Nam';
      f.loading = 'lazy';
      f.referrerPolicy = 'no-referrer-when-downgrade';
      f.allowFullscreen = true;
      box.appendChild(f);
      btn.remove();
    });
  });

  /* ---------- Mục lục bài viết: đánh dấu mục đang đọc ---------- */
  var tocLinks = $$('.toc a[href^="#"]');
  if (tocLinks.length && 'IntersectionObserver' in window) {
    var map = {};
    tocLinks.forEach(function (a) { map[a.getAttribute('href').slice(1)] = a; });
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        tocLinks.forEach(function (a) { a.classList.remove('is-active'); });
        if (map[e.target.id]) map[e.target.id].classList.add('is-active');
      });
    }, { rootMargin: '-20% 0px -70% 0px' });
    Object.keys(map).forEach(function (id) { var el = document.getElementById(id); if (el) spy.observe(el); });
  }

  /* ---------- Mở câu hỏi khi truy cập bằng liên kết #id ---------- */
  function openFromHash() {
    var id = decodeURIComponent(location.hash.slice(1));
    if (!id) return;
    var el = document.getElementById(id);
    if (el && el.tagName === 'DETAILS') el.open = true;
  }
  window.addEventListener('hashchange', openFromHash);
  openFromHash();

  /* ---------- Năm bản quyền ---------- */
  $$('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });
})();
