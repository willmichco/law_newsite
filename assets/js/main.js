/* LSN LAW FIRM – tương tác giao diện (không phụ thuộc thư viện) */
(function () {
  "use strict";

  var doc = document.documentElement;
  doc.classList.add("js");
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  /* ---------- Header shadow + nút lên đầu trang ---------- */
  var header = $("#header");
  var toTop = $("#to-top");
  var floating = $(".floating");
  function onScroll() {
    var y = window.scrollY;
    header.classList.toggle("is-scrolled", y > 10);
    toTop.classList.toggle("is-visible", y > 600);
    floating.classList.toggle("is-visible", y > 300);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  toTop.addEventListener("click", function () { window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" }); });

  /* ---------- Menu mobile ---------- */
  var nav = $("#nav");
  var burger = $("#burger");
  var backdrop = null;
  function setNav(open) {
    nav.classList.toggle("is-open", open);
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", open ? "Đóng menu" : "Mở menu");
    $("use", burger).setAttribute("href", open ? "#i-close" : "#i-menu");
    document.body.classList.toggle("no-scroll", open);
    if (open) {
      backdrop = document.createElement("div");
      backdrop.className = "nav-backdrop";
      backdrop.addEventListener("click", function () { setNav(false); });
      document.body.appendChild(backdrop);
    } else if (backdrop) {
      backdrop.remove();
      backdrop = null;
    }
  }
  burger.addEventListener("click", function () { setNav(!nav.classList.contains("is-open")); });
  $$(".nav__link", nav).forEach(function (a) { a.addEventListener("click", function () { setNav(false); }); });
  window.addEventListener("resize", function () { if (window.innerWidth > 1024 && nav.classList.contains("is-open")) setNav(false); });

  /* ---------- Đánh dấu mục menu theo vị trí cuộn ---------- */
  var links = $$(".nav__link");
  var sections = links.map(function (a) { return $(a.getAttribute("href")); }).filter(Boolean);
  if ("IntersectionObserver" in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        links.forEach(function (a) { a.classList.toggle("is-active", a.getAttribute("href") === "#" + e.target.id); });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    sections.forEach(function (s) { spy.observe(s); });
  }

  /* ---------- Hero slider ---------- */
  var slides = $$(".hero__slide");
  var dots = $$(".hero__dots button");
  var current = 0, timer = null;
  function go(i) {
    current = (i + slides.length) % slides.length;
    slides.forEach(function (s, k) { s.classList.toggle("is-active", k === current); s.setAttribute("aria-hidden", String(k !== current)); });
    dots.forEach(function (d, k) { d.classList.toggle("is-active", k === current); d.setAttribute("aria-selected", String(k === current)); });
  }
  function play() { if (!reduceMotion && slides.length > 1) { stop(); timer = setInterval(function () { go(current + 1); }, 6500); } }
  function stop() { clearInterval(timer); }
  dots.forEach(function (d, k) { d.addEventListener("click", function () { go(k); play(); }); });
  var hero = $(".hero");
  hero.addEventListener("mouseenter", stop);
  hero.addEventListener("mouseleave", play);
  go(0);
  play();

  /* ---------- Hiện dần khi cuộn + đếm số ---------- */
  function countUp(el) {
    var target = parseInt(el.getAttribute("data-count"), 10);
    var vi = el.getAttribute("data-format") === "vi";
    var fmt = function (n) { return vi ? n.toLocaleString("vi-VN") : String(n); };
    if (reduceMotion) { el.textContent = fmt(target); return; }
    var start = null, dur = 1600;
    function step(t) {
      if (!start) start = t;
      var p = Math.min((t - start) / dur, 1);
      el.textContent = fmt(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  var reveals = $$(".reveal");
  var counters = $$("[data-count]");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target;
        if (el.classList.contains("reveal")) {
          var siblings = $$(".reveal", el.parentElement);
          el.style.transitionDelay = Math.min(siblings.indexOf(el), 5) * 80 + "ms";
          el.classList.add("is-in");
        }
        if (el.hasAttribute("data-count")) countUp(el);
        obs.unobserve(el);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    reveals.concat(counters).forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("is-in"); });
  }

  /* ---------- Overlay: tìm kiếm + đặt lịch ---------- */
  var lastFocus = null;
  function openOverlay(el) {
    lastFocus = document.activeElement;
    el.hidden = false;
    document.body.classList.add("no-scroll");
    var first = $("input, select, textarea, button", el);
    setTimeout(function () { if (first) first.focus(); }, 30);
  }
  function closeOverlay(el) {
    el.hidden = true;
    if (!nav.classList.contains("is-open")) document.body.classList.remove("no-scroll");
    if (lastFocus) lastFocus.focus();
  }
  var search = $("#search");
  var booking = $("#booking");
  $$("[data-open-search]").forEach(function (b) { b.addEventListener("click", function () { openOverlay(search); }); });
  $$("[data-open-booking]").forEach(function (b) {
    b.addEventListener("click", function (e) { e.preventDefault(); if (nav.classList.contains("is-open")) setNav(false); openOverlay(booking); });
  });
  $$(".overlay").forEach(function (ov) {
    ov.addEventListener("click", function (e) {
      if (e.target === ov || e.target.closest("[data-close]")) closeOverlay(ov);
    });
  });
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    $$(".overlay").forEach(function (ov) { if (!ov.hidden) closeOverlay(ov); });
    if (nav.classList.contains("is-open")) setNav(false);
  });
  $(".search__form").addEventListener("submit", function (e) {
    e.preventDefault();
    closeOverlay(search);
    $("#linh-vuc").scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
  });

  /* ---------- Biểu mẫu tư vấn ----------
     Chưa có backend: form chỉ kiểm tra dữ liệu và hiển thị thông báo.
     Khi triển khai thật, gửi dữ liệu tới API/Formspree/Google Apps Script tại vị trí đánh dấu. */
  $$("[data-form]").forEach(function (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var status = $(".form__status", form);
      var ok = true;
      $$("input, textarea, select", form).forEach(function (f) {
        var bad = !f.checkValidity();
        if (f.type === "checkbox") f.closest(".consent").classList.toggle("is-invalid", bad);
        else f.classList.toggle("is-invalid", bad);
        if (bad && ok) { ok = false; f.focus(); }
      });
      if (!ok) {
        status.className = "form__status is-err";
        status.textContent = "Vui lòng kiểm tra lại các trường bắt buộc (*) và xác nhận đồng ý xử lý dữ liệu cá nhân.";
        return;
      }
      // TODO: gửi dữ liệu thật tại đây, ví dụ: fetch(ENDPOINT, { method: "POST", body: new FormData(form) })
      status.className = "form__status is-ok";
      status.textContent = "Cảm ơn bạn! Yêu cầu đã được ghi nhận, luật sư phụ trách sẽ liên hệ lại trong vòng 24 giờ làm việc.";
      form.reset();
    });
    form.addEventListener("input", function (e) {
      if (e.target.classList) e.target.classList.remove("is-invalid");
      var c = e.target.closest && e.target.closest(".consent");
      if (c) c.classList.remove("is-invalid");
    });
  });

  var news = $("[data-newsletter]");
  if (news) news.addEventListener("submit", function (e) {
    e.preventDefault();
    var input = $("input", news);
    if (!input.checkValidity()) { input.focus(); return; }
    input.value = "";
    input.placeholder = "Đã đăng ký – cảm ơn bạn!";
  });

  /* ---------- Chuyển ngôn ngữ (khung) ---------- */
  $$(".lang button").forEach(function (b, _, all) {
    b.addEventListener("click", function () {
      all.forEach(function (x) { x.classList.toggle("is-active", x === b); x.setAttribute("aria-pressed", String(x === b)); });
    });
  });

  /* ---------- Năm bản quyền ---------- */
  $$("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });
})();
