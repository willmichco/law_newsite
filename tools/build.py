# -*- coding: utf-8 -*-
"""Sinh toàn bộ website tĩnh Công Ty Luật TNHH Luật Sư Nam.

    python3 tools/build.py

Nguồn nội dung:
    tools/data.py            Thông tin pháp nhân, 8 lĩnh vực, bài viết, câu hỏi thường gặp
    src/pages/*.html         Nội dung các trang đơn lẻ (có khối <!--meta {...} --> ở đầu)
    src/bai-viet/*.html      Nội dung bài viết
    src/bo-luat-hinh-su.html Nội dung trang tra cứu Bộ luật Hình sự

Kết quả: <duong-dan>/index.html cho mọi trang, 404.html, sitemap.xml, robots.txt,
site.webmanifest, assets/search-index.json.
"""
import datetime
import hashlib
import html
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import blhs  # noqa: E402
from data import (ARTICLE_BY_SLUG, ARTICLES, BASE_PATH, FAQ, FIRM, SERVICE_BY_SLUG,  # noqa: E402
                  SERVICES, SITE_URL, articles_for_service)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "src")
TODAY = datetime.date.today().isoformat()
ORG_ID = SITE_URL + "/#organization"
SITE_ID = SITE_URL + "/#website"


def esc(s):
    return html.escape(s, quote=True)


def strip_tags(s):
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", s)).strip()


def file_hash(rel):
    with open(os.path.join(ROOT, rel), "rb") as fh:
        return hashlib.md5(fh.read()).hexdigest()[:8]


def abs_url(path):
    return SITE_URL + "/" + path


# ---------------------------------------------------------------------------
# Biểu tượng SVG (sprite)
# ---------------------------------------------------------------------------
SPRITE = """<svg xmlns="http://www.w3.org/2000/svg" style="display:none" aria-hidden="true">
  <symbol id="i-arrow" viewBox="0 0 24 24"><path d="M4 12h15M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></symbol>
  <symbol id="i-chevron" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></symbol>
  <symbol id="i-search" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M20 20l-4-4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></symbol>
  <symbol id="i-menu" viewBox="0 0 24 24"><path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></symbol>
  <symbol id="i-close" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></symbol>
  <symbol id="i-scale" viewBox="0 0 48 48"><g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M24 6v34M14 42h20M10 12h28"/><path d="M12 12L5 27h14L12 12zM36 12l-7 15h14l-7-15z"/><path d="M5 27a7 4 0 0 0 14 0M29 27a7 4 0 0 0 14 0"/></g></symbol>
  <symbol id="i-shield" viewBox="0 0 48 48"><path d="M24 4l16 6v12c0 10-7 18-16 22C15 40 8 32 8 22V10l16-6z" fill="currentColor"/><path d="M24 15l2.6 5.4 5.9.8-4.3 4.1 1 5.8L24 28.3l-5.2 2.8 1-5.8-4.3-4.1 5.9-.8L24 15z" fill="#fff"/></symbol>
  <symbol id="i-team" viewBox="0 0 48 48"><g fill="currentColor"><circle cx="24" cy="15" r="6"/><circle cx="11" cy="18" r="4.5"/><circle cx="37" cy="18" r="4.5"/><path d="M13 36c0-6.6 4.9-11 11-11s11 4.4 11 11v2H13v-2z"/><path d="M3 36c0-5 3.4-8.5 8-8.5 1.4 0 2.6.3 3.7.9A13.6 13.6 0 0 0 11 36v2H3v-2zM45 36c0-5-3.4-8.5-8-8.5-1.4 0-2.6.3-3.7.9A13.6 13.6 0 0 1 37 36v2h8v-2z"/></g></symbol>
  <symbol id="i-inherit" viewBox="0 0 48 48"><path d="M24 7 10 15v25h28V15L24 7Zm-7 33V23h14v17M18 16h12M21 29h6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></symbol>
  <symbol id="i-gavel" viewBox="0 0 48 48"><path d="M9 39h30M15 39V24h18v15M20 30h8M24 24V10m-8 7 8-7 8 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></symbol>
  <symbol id="i-house" viewBox="0 0 48 48"><path d="M12 41V9h24v32M8 41h32M18 16h4m4 0h4m-12 7h4m4 0h4m-12 7h4m4 0h4M21 41v-5h6v5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></symbol>
  <symbol id="i-heart" viewBox="0 0 48 48"><path d="M24 41S6 30 6 17.5A9.5 9.5 0 0 1 24 13a9.5 9.5 0 0 1 18 4.5C42 30 24 41 24 41z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></symbol>
  <symbol id="i-doc" viewBox="0 0 48 48"><g fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"><path d="M12 6h18l8 8v28H12z"/><path d="M30 6v8h8M18 20h14M18 26h14M18 32h10"/></g></symbol>
  <symbol id="i-network" viewBox="0 0 48 48"><g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="24" cy="12" r="5"/><circle cx="10" cy="20" r="4"/><circle cx="38" cy="20" r="4"/><path d="M14 38c0-6 4.5-10 10-10s10 4 10 10M2 36c0-4.5 3-7.5 8-7.5M46 36c0-4.5-3-7.5-8-7.5"/></g></symbol>
  <symbol id="i-shield-check" viewBox="0 0 48 48"><path d="M24 7 10 13v10c0 9 5.8 15.3 14 18 8.2-2.7 14-9 14-18V13L24 7Zm-6 17 4 4 8-9" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></symbol>
  <symbol id="i-diamond" viewBox="0 0 48 48"><g fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 8h24l8 10-20 24L4 18z"/><path d="M4 18h40M18 8l-4 10 10 24 10-24-4-10"/></g></symbol>
  <symbol id="i-steps" viewBox="0 0 48 48"><g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="12" r="4"/><circle cx="38" cy="36" r="4"/><path d="M14 12h14a6 6 0 0 1 0 12H20a6 6 0 0 0 0 12h14"/></g></symbol>
  <symbol id="i-user" viewBox="0 0 48 48"><g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="24" cy="16" r="8"/><path d="M8 42c0-9 7-15 16-15s16 6 16 15"/></g></symbol>
  <symbol id="i-clock48" viewBox="0 0 48 48"><g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="24" cy="24" r="18"/><path d="M24 13v11l7 5"/></g></symbol>
  <symbol id="i-book" viewBox="0 0 48 48"><g fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"><path d="M8 9h13a5 5 0 0 1 5 5v26a4 4 0 0 0-4-4H8z"/><path d="M40 9H29a5 5 0 0 0-3 1M40 9v27H30a4 4 0 0 0-4 4"/></g></symbol>
  <symbol id="i-question" viewBox="0 0 48 48"><g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="24" cy="24" r="18"/><path d="M18.5 19a5.5 5.5 0 1 1 7.7 5c-1.4.7-2.2 1.8-2.2 3.3V29M24 35v.5"/></g></symbol>
  <symbol id="i-pin" viewBox="0 0 24 24"><path d="M12 2a7 7 0 0 0-7 7c0 5.3 7 13 7 13s7-7.7 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z" fill="currentColor"/></symbol>
  <symbol id="i-phone" viewBox="0 0 24 24"><path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z" fill="currentColor"/></symbol>
  <symbol id="i-mail" viewBox="0 0 24 24"><path d="M3 5h18a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zm1 2.2V17h16V7.2l-8 5.3-8-5.3zM5.5 7l6.5 4.3L18.5 7h-13z" fill="currentColor"/></symbol>
  <symbol id="i-clock" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 7v5l3 2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></symbol>
  <symbol id="i-chat" viewBox="0 0 24 24"><path d="M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9l-5 4v-4H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></symbol>
  <symbol id="i-up" viewBox="0 0 24 24"><path d="M6 15l6-6 6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></symbol>
  <symbol id="i-check" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></symbol>
  <symbol id="i-calendar" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></g></symbol>
  <symbol id="i-arrow-l" viewBox="0 0 24 24"><path d="M20 12H5M11 6l-6 6 6 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></symbol>
  <symbol id="i-chevron-r" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></symbol>
  <symbol id="i-bookmark" viewBox="0 0 24 24"><path d="M6 3h12v18l-6-4.5L6 21z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></symbol>
  <symbol id="i-print" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M7 8V3h10v5M7 17H4V9h16v8h-3"/><path d="M7 14h10v7H7z"/></g></symbol>
  <symbol id="i-share" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="M8.2 10.8l7.6-4.4M8.2 13.2l7.6 4.4"/></g></symbol>
  <symbol id="i-copy" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><rect x="8" y="8" width="12" height="13" rx="1.5"/><path d="M16 8V4.5A1.5 1.5 0 0 0 14.5 3h-9A1.5 1.5 0 0 0 4 4.5V16a1.5 1.5 0 0 0 1.5 1.5H8"/></g></symbol>
  <symbol id="i-link" viewBox="0 0 24 24"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></symbol>
  <symbol id="i-map" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><rect x="9" y="3" width="6" height="5" rx="1"/><rect x="2" y="16" width="6" height="5" rx="1"/><rect x="9" y="16" width="6" height="5" rx="1"/><rect x="16" y="16" width="6" height="5" rx="1"/><path d="M12 8v4M5 16v-4h14v4M12 12v4"/></g></symbol>
  <symbol id="i-alert" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M12 3 2 20h20L12 3z" stroke-linejoin="round"/><path d="M12 10v4M12 17v.5"/></g></symbol>
</svg>"""


def ico(name, cls="ico"):
    return f'<svg class="{cls}" aria-hidden="true"><use href="#{name}"/></svg>'


ARROW = ico("i-arrow")

# ---------------------------------------------------------------------------
# Menu
# ---------------------------------------------------------------------------
NAV = [
    ("home", "Trang chủ", "", None),
    ("about", "Giới thiệu", "gioi-thieu/", [
        ("Về Luật Sư Nam", "gioi-thieu/", "Triết lý hành nghề và cam kết nghề nghiệp"),
        ("Vì sao chọn chúng tôi", "vi-sao-chon-chung-toi/", "Bốn nguyên tắc trong mọi hồ sơ"),
        ("Quy trình làm việc", "quy-trinh-lam-viec/", "Bốn bước và hồ sơ cần chuẩn bị"),
    ]),
    ("services", "Lĩnh vực hoạt động", "dich-vu/", "services"),
    ("team", "Đội ngũ luật sư", "doi-ngu-luat-su/", None),
    ("knowledge", "Kiến thức pháp lý", "kien-thuc-phap-ly/", [
        ("Bài viết pháp lý", "kien-thuc-phap-ly/", "Phân tích, hướng dẫn theo từng lĩnh vực"),
        ("Tra cứu Bộ luật Hình sự", "bo-luat-hinh-su/", "Toàn văn kèm bình luận từng điều"),
        ("Câu hỏi thường gặp", "cau-hoi-thuong-gap/", "Chi phí, bảo mật, thời hạn"),
    ]),
    ("contact", "Liên hệ", "lien-he/", None),
]


def cur(page, href):
    return ' aria-current="page"' if page["path"] == href else ""


def nav_html(page, r):
    items = []
    for key, label, href, sub in NAV:
        active = page.get("section") == key
        current = page["path"] == href
        attrs = ' aria-current="page"' if current else ""
        cls = "nav__link" + (" is-active" if active else "")
        if not sub:
            items.append(f'<li class="nav__item"><a class="{cls}" href="{r}{href}"{attrs}>{label}</a></li>')
            continue
        sid = f"sub-{key}"
        if sub == "services":
            links = "".join(
                f'<li><a class="nav__sublink" href="{r}dich-vu/{s["slug"]}/"{cur(page, "dich-vu/" + s["slug"] + "/")}>'
                f'{ico(s["icon"], "nav__subicon")}<span>{esc(s["name"])}</span></a></li>' for s in SERVICES)
            links += f'<li class="nav__suball"><a href="{r}dich-vu/">Tổng quan 8 lĩnh vực {ARROW}</a></li>'
            sub_cls = "nav__sub nav__sub--mega"
        else:
            links = "".join(
                f'<li><a class="nav__sublink" href="{r}{h}"{cur(page, h)}>'
                f'<span>{esc(t)}<small>{esc(d)}</small></span></a></li>' for t, h, d in sub)
            sub_cls = "nav__sub"
        items.append(
            f'<li class="nav__item has-sub"><a class="{cls}" href="{r}{href}"{attrs}>{label}</a>'
            f'<button class="nav__toggle" type="button" aria-expanded="false" aria-controls="{sid}" '
            f'aria-label="Mở menu {label}">{ico("i-chevron")}</button>'
            f'<ul class="{sub_cls}" id="{sid}">{links}</ul></li>')
    return "\n        ".join(items)


def logo_html(r):
    return f"""<a class="logo" href="{r or './'}" aria-label="{FIRM["legal_name"]} – Trang chủ">
      <img class="logo__img" src="{r}assets/img/logo-lsn.webp" width="52" height="52" alt="">
      <span class="logo__text"><span class="logo__tag">Công ty Luật TNHH</span><span class="logo__name">Luật Sư Nam</span></span>
    </a>"""


def header_html(page, r):
    return f"""<header class="header site-header" id="site-header">
  <div class="container header__inner">
    {logo_html(r)}

    <nav class="nav" id="nav" aria-label="Điều hướng chính">
      <ul class="nav__list">
        {nav_html(page, r)}
      </ul>
      <div class="nav__mobile-extra">
        <a class="btn btn--primary btn--block" href="{r}lien-he/#gui-yeu-cau" data-open-booking>Đặt lịch tư vấn {ARROW}</a>
        <a class="nav__hotline" href="tel:{FIRM["phone_tel"]}">{ico("i-phone")} {FIRM["phone"]}</a>
      </div>
    </nav>

    <div class="header__actions">
      <button class="icon-btn" type="button" aria-label="Tìm kiếm trên website" data-open-search>{ico("i-search", "")}</button>
      <a class="btn btn--primary btn--sm header__cta" href="tel:{FIRM["phone_tel"]}" aria-label="Gọi luật sư: {FIRM["phone"]}">{ico("i-phone")}<span>{FIRM["phone"]}</span></a>
      <button class="icon-btn burger" type="button" aria-label="Mở menu" aria-expanded="false" aria-controls="nav" id="burger">{ico("i-menu", "")}</button>
    </div>
  </div>
</header>"""


def footer_html(r):
    services = "".join(f'<li><a href="{r}dich-vu/{s["slug"]}/">{esc(s["name"])}</a></li>' for s in SERVICES)
    return f"""<footer class="footer site-footer">
  <div class="container footer__grid">
    <div class="footer__brand">
      {logo_html(r)}
      <p class="footer__about"><strong>{FIRM["legal_name"]}</strong> tư vấn pháp luật, đại diện và tham gia tố tụng cho cá nhân, doanh nghiệp tại Thành phố Hồ Chí Minh và các tỉnh thành trên cả nước. Hoạt động theo Giấy đăng ký hoạt động do Sở Tư pháp cấp.</p>
      <div class="social">
        <a href="{FIRM["zalo"]}" target="_blank" rel="noopener" aria-label="Nhắn Zalo {FIRM["phone"]}" class="social__zalo">Zalo</a>
        <a href="tel:{FIRM["phone_tel"]}" aria-label="Gọi {FIRM["phone"]}">{ico("i-phone", "")}</a>
        <a href="mailto:{FIRM["email"]}" aria-label="Gửi email">{ico("i-mail", "")}</a>
        <a href="https://www.google.com/maps/search/?api=1&amp;query={FIRM["maps_query"]}" target="_blank" rel="noopener" aria-label="Mở bản đồ văn phòng">{ico("i-pin", "")}</a>
      </div>
    </div>

    <div>
      <h2 class="footer__title">Về chúng tôi</h2>
      <ul class="footer__links">
        <li><a href="{r}gioi-thieu/">Giới thiệu Luật Sư Nam</a></li>
        <li><a href="{r}doi-ngu-luat-su/">Đội ngũ luật sư</a></li>
        <li><a href="{r}vi-sao-chon-chung-toi/">Vì sao chọn chúng tôi</a></li>
        <li><a href="{r}quy-trinh-lam-viec/">Quy trình làm việc</a></li>
        <li><a href="{r}kien-thuc-phap-ly/">Kiến thức pháp lý</a></li>
        <li><a href="{r}bo-luat-hinh-su/">Tra cứu Bộ luật Hình sự</a></li>
        <li><a href="{r}cau-hoi-thuong-gap/">Câu hỏi thường gặp</a></li>
        <li><a href="{r}lien-he/">Liên hệ</a></li>
      </ul>
    </div>

    <div>
      <h2 class="footer__title">Lĩnh vực hoạt động</h2>
      <ul class="footer__links">{services}</ul>
    </div>

    <div>
      <h2 class="footer__title">Văn phòng</h2>
      <ul class="footer__contact">
        <li>{ico("i-pin")}<span>{FIRM["street"]},<br>{FIRM["ward"]},<br>{FIRM["city"]}</span></li>
        <li>{ico("i-phone")}<a href="tel:{FIRM["phone_tel"]}">{FIRM["phone"]}</a></li>
        <li>{ico("i-mail")}<a href="mailto:{FIRM["email"]}">{FIRM["email"]}</a></li>
        <li>{ico("i-clock")}<span>{FIRM["hours"]}</span></li>
      </ul>
    </div>
  </div>
  <div class="footer__disclaimer">
    <div class="container">
      <p><strong>Miễn trừ trách nhiệm:</strong> Nội dung trên website chỉ mang tính thông tin pháp lý chung, không phải ý kiến tư vấn cho một vụ việc cụ thể và không làm phát sinh quan hệ luật sư – khách hàng. Quy định pháp luật có thể thay đổi theo thời điểm. Xem đầy đủ tại <a href="{r}mien-tru-trach-nhiem/">Tuyên bố miễn trừ trách nhiệm</a>.</p>
    </div>
  </div>
  <div class="footer__bottom">
    <div class="container footer__bottom-inner">
      <p>© <span data-year>{TODAY[:4]}</span> {FIRM["legal_name"]}.</p>
      <p class="footer__legal"><a href="{r}chinh-sach-bao-mat/">Chính sách bảo mật</a><a href="{r}dieu-khoan-su-dung/">Điều khoản sử dụng</a><a href="{r}mien-tru-trach-nhiem/">Miễn trừ trách nhiệm</a></p>
    </div>
  </div>
</footer>"""


# ---------------------------------------------------------------------------
# Biểu mẫu tư vấn (dùng chung trang Liên hệ và cửa sổ Đặt lịch)
# ---------------------------------------------------------------------------
def form_html(fid, r, booking=False):
    opts = "".join(f"<option>{esc(s['name'])}</option>" for s in SERVICES)
    extra = ""
    if booking:
        extra = f"""
  <div class="form__row">
    <div class="field"><label for="{fid}-date">Ngày mong muốn</label><input id="{fid}-date" name="date" type="date"></div>
    <div class="field"><label for="{fid}-mode">Hình thức</label>
      <select id="{fid}-mode" name="mode"><option>Tại văn phòng</option><option>Qua điện thoại</option><option>Họp trực tuyến</option></select>
    </div>
  </div>"""
    return f"""<form class="form" id="{fid}" data-form novalidate>
  <div class="form__hp" aria-hidden="true"><label>Để trống ô này<input type="text" name="botcheck" tabindex="-1" autocomplete="off"></label></div>
  <div class="form__row">
    <div class="field"><label for="{fid}-name">Họ và tên <b>*</b></label><input id="{fid}-name" name="name" type="text" autocomplete="name" required placeholder="Nguyễn Văn A"></div>
    <div class="field"><label for="{fid}-phone">Số điện thoại <b>*</b></label><input id="{fid}-phone" name="phone" type="tel" autocomplete="tel" required pattern="^(\\+84|0)[0-9 .]{{8,12}}$" placeholder="0900 000 000"></div>
  </div>
  <div class="form__row">
    <div class="field"><label for="{fid}-email">Email</label><input id="{fid}-email" name="email" type="email" autocomplete="email" placeholder="email@cuaban.vn"></div>
    <div class="field"><label for="{fid}-service">Lĩnh vực cần tư vấn</label>
      <select id="{fid}-service" name="service"><option value="">Chọn lĩnh vực</option>{opts}<option>Chưa rõ / Khác</option></select>
    </div>
  </div>{extra}
  <div class="field"><label for="{fid}-message">Nội dung cần tư vấn <b>*</b></label><textarea id="{fid}-message" name="message" rows="4" required placeholder="Mô tả ngắn gọn sự việc, mốc thời gian quan trọng và điều bạn mong muốn…"></textarea></div>
  <label class="consent" for="{fid}-consent"><input id="{fid}-consent" type="checkbox" name="consent" required> <span>Tôi đồng ý để {FIRM["legal_name"]} xử lý dữ liệu cá nhân nêu trên nhằm liên hệ và tư vấn theo <a href="{r}chinh-sach-bao-mat/">Chính sách bảo mật</a>.</span></label>
  <button class="btn btn--primary btn--block" type="submit">{"Xác nhận đặt lịch" if booking else "Gửi yêu cầu tư vấn"} {ARROW}</button>
  <p class="form__note">Gửi yêu cầu chưa làm phát sinh quan hệ luật sư – khách hàng. Vui lòng không gửi tài liệu mật qua biểu mẫu; với vụ việc khẩn cấp, hãy gọi <a href="tel:{FIRM["phone_tel"]}">{FIRM["phone"]}</a>.</p>
  <p class="form__status" role="status" aria-live="polite"></p>
</form>"""


def overlays_html(r):
    return f"""<div class="floating">
  <a class="floating__btn floating__btn--zalo" href="{FIRM["zalo"]}" target="_blank" rel="noopener" aria-label="Nhắn Zalo {FIRM["phone"]}">Zalo</a>
  <a class="floating__btn floating__btn--phone" href="tel:{FIRM["phone_tel"]}" aria-label="Gọi hotline {FIRM["phone"]}">{ico("i-phone", "")}</a>
  <button class="floating__btn floating__btn--top" type="button" aria-label="Lên đầu trang" id="to-top">{ico("i-up", "")}</button>
</div>

<div class="overlay search" id="search" hidden>
  <div class="search__box" role="dialog" aria-modal="true" aria-label="Tìm kiếm trên website">
    <button class="icon-btn overlay__close" type="button" aria-label="Đóng" data-close>{ico("i-close", "")}</button>
    <form class="search__form" role="search" action="{r}kien-thuc-phap-ly/">
      {ico("i-search")}
      <input type="search" id="search-q" name="q" placeholder="Tìm lĩnh vực, bài viết, câu hỏi…" aria-label="Từ khóa tìm kiếm" autocomplete="off">
    </form>
    <ul class="search__results" id="search-results" aria-live="polite"></ul>
    <p class="search__hint">Gợi ý:
      <a href="{r}dich-vu/thua-ke/">Thừa kế</a>
      <a href="{r}dich-vu/hon-nhan-gia-dinh/">Ly hôn</a>
      <a href="{r}dich-vu/dat-dai-bat-dong-san/">Tranh chấp đất đai</a>
      <a href="{r}bo-luat-hinh-su/">Bộ luật Hình sự</a>
    </p>
  </div>
</div>

<div class="overlay modal" id="booking" hidden>
  <div class="modal__dialog" role="dialog" aria-modal="true" aria-labelledby="booking-title">
    <button class="icon-btn overlay__close" type="button" aria-label="Đóng" data-close>{ico("i-close", "")}</button>
    <div class="modal__head">
      {ico("i-calendar", "modal__icon")}
      <div>
        <h2 id="booking-title">Đặt lịch tư vấn</h2>
        <p>Chọn thời gian phù hợp, luật sư sẽ gọi lại xác nhận lịch hẹn trong giờ làm việc.</p>
      </div>
    </div>
    {form_html("booking-form", r, booking=True)}
  </div>
</div>"""


# ---------------------------------------------------------------------------
# Thành phần trang
# ---------------------------------------------------------------------------
def breadcrumb_html(crumbs, r):
    parts = []
    for i, (name, path) in enumerate(crumbs):
        if i == len(crumbs) - 1:
            parts.append(f'<li aria-current="page">{esc(name)}</li>')
        else:
            parts.append(f'<li><a href="{r}{path}">{esc(name)}</a></li>')
    return f'<nav class="breadcrumb" aria-label="Đường dẫn"><ol>{"".join(parts)}</ol></nav>'


def page_hero_html(page, r):
    h = page.get("hero") or {}
    bg = h.get("image", "assets/img/hero.webp")
    actions = h.get("actions", "")
    extra = h.get("extra", "")
    aside = h.get("aside", "")
    lead = f'<p class="page-hero__lead">{page["lead"]}</p>' if page.get("lead") else ""
    eyebrow = f'<p class="eyebrow eyebrow--light">{esc(page["eyebrow"])}</p>' if page.get("eyebrow") else ""
    grid = " page-hero__inner--split" if aside else ""
    return f"""<section class="page-hero">
  <div class="page-hero__bg" style="background-image:url('{r}{bg}')" aria-hidden="true"></div>
  <div class="container page-hero__inner{grid}">
    <div class="page-hero__copy">
      {breadcrumb_html(page["crumbs"], r)}
      {eyebrow}
      <h1 class="page-hero__title">{page["h1"]}</h1>
      {lead}
      {extra}
      {f'<div class="page-hero__actions">{actions}</div>' if actions else ''}
    </div>
    {aside}
  </div>
</section>"""


def cta_band(r, eyebrow="Tư vấn pháp lý", title="Bạn cần tư vấn pháp lý?",
             text="Liên hệ ngay để được luật sư trực tiếp lắng nghe, đánh giá hồ sơ và đề xuất hướng xử lý phù hợp.",
             sub="Hãy để Luật Sư Nam đồng hành cùng bạn!"):
    sub_html = f'<p class="cta__sub">{sub}</p>' if sub else ""
    return f"""<section class="cta">
  <div class="container cta__inner">
    <div>
      <p class="eyebrow eyebrow--gold">{esc(eyebrow)}</p>
      <h2 class="cta__title">{title}</h2>
      {sub_html}
      <p class="cta__text">{text}</p>
    </div>
    <div class="cta__actions">
      <a class="btn btn--primary btn--lg btn--outline-gold" href="{r}lien-he/#gui-yeu-cau" data-open-booking>Đặt lịch tư vấn {ARROW}</a>
      <a class="cta__phone" href="tel:{FIRM["phone_tel"]}">{ico("i-phone")} {FIRM["phone"]}</a>
    </div>
  </div>
</section>"""


def service_card(s, r, heading="h3"):
    return f"""<article class="service reveal">
  <a class="service__img" href="{r}dich-vu/{s["slug"]}/" tabindex="-1" aria-hidden="true"><img src="{r}assets/img/dich-vu/{s["slug"]}.webp" alt="" loading="lazy" width="600" height="300"></a>
  <div class="service__body">
    {ico(s["icon"], "service__icon")}
    <{heading} class="service__title"><a href="{r}dich-vu/{s["slug"]}/">{esc(s["name"])}</a></{heading}>
    <p>{esc(s["short"])}</p>
    <span class="circle-link" aria-hidden="true">{ico("i-arrow", "")}</span>
  </div>
</article>"""


def services_grid(r, exclude=None, only=None, cls="services__grid"):
    items = [SERVICE_BY_SLUG[x] for x in only] if only else [s for s in SERVICES if s["slug"] != exclude]
    return f'<div class="{cls}">' + "".join(service_card(s, r) for s in items) + "</div>"


def vi_date(iso):
    y, m, d = iso.split("-")
    return f"{int(d):02d} Tháng {int(m)}, {y}"


def article_card(a, r, heading="h3"):
    return f"""<article class="post reveal">
  <a class="post__img" href="{r}kien-thuc-phap-ly/{a["slug"]}/" tabindex="-1" aria-hidden="true"><img src="{r}assets/img/bai-viet/{a["slug"]}.webp" alt="" loading="lazy" width="720" height="240"></a>
  <div class="post__body">
    <p class="post__meta"><a class="tag" href="{r}dich-vu/{a["service"]}/">{esc(a["category"])}</a><time datetime="{a["published"]}">{ico("i-clock")}{vi_date(a["published"])}</time></p>
    <{heading} class="post__title"><a href="{r}kien-thuc-phap-ly/{a["slug"]}/">{esc(a["card_title"])}</a></{heading}>
    <p>{esc(a["excerpt"])}</p>
  </div>
</article>"""


def articles_grid(r, items=None, cls="cards-3"):
    items = items if items is not None else ARTICLES
    return f'<div class="{cls}">' + "".join(article_card(a, r) for a in items) + "</div>"


def faq_list(r, items=None):
    out = []
    for f in (items or FAQ):
        body = "".join(f"<p>{p}</p>" for p in f["a"]).replace("{{root}}", r)
        out.append(f"""<details class="faq__item" id="{f["id"]}">
  <summary><span>{esc(f["q"])}</span>{ico("i-chevron", "faq__chev")}</summary>
  <div class="faq__answer">{body}</div>
</details>""")
    return '<div class="faq">' + "".join(out) + "</div>"


def check_list(items):
    return '<ul class="check-list">' + "".join(f"<li>{ico('i-check')}<span>{esc(i)}</span></li>" for i in items) + "</ul>"


TOKEN_RE = re.compile(r"\{\{(\w+)(?::([^}]*))?\}\}")


def render_tokens(body, page, r):
    def rep(m):
        name, arg = m.group(1), m.group(2)
        if name == "root":
            return r
        if name in ("phone", "phone_tel", "email", "zalo", "address", "hours", "hours_note", "maps_query",
                    "legal_name", "street", "ward", "city"):
            return FIRM[name]
        if name == "form":
            return form_html(arg or "contact-form", r)
        if name == "cta":
            return cta_band(r)
        if name == "services_grid":
            return services_grid(r)
        if name == "articles_grid":
            return articles_grid(r)
        if name == "faq_list":
            ids = arg.split(",") if arg else None
            return faq_list(r, [f for f in FAQ if f["id"] in ids] if ids else None)
        if name == "arrow":
            return ARROW
        if name == "ico":
            nm, _, cls = arg.partition("|")
            return ico(nm, cls or "ico")
        raise KeyError(f"Token không xác định: {name} ({page['path']})")
    return TOKEN_RE.sub(rep, body)


# ---------------------------------------------------------------------------
# Dữ liệu có cấu trúc (JSON-LD)
# ---------------------------------------------------------------------------
def org_node():
    return {
        "@type": "LegalService",
        "@id": ORG_ID,
        "name": FIRM["legal_name"],
        "alternateName": FIRM["short_name"],
        "slogan": FIRM["slogan"],
        "url": SITE_URL + "/",
        "logo": {"@type": "ImageObject", "url": abs_url("assets/img/icon-512.png"), "width": 512, "height": 512},
        "image": abs_url("assets/img/og-image.jpg"),
        "description": "Công ty luật tại Thành phố Hồ Chí Minh, tư vấn và tham gia tố tụng trong các lĩnh vực thừa kế, "
                       "đất đai, hôn nhân gia đình, lao động, hình sự, dân sự, công chứng và tranh chấp thương mại.",
        "telephone": FIRM["phone_intl"],
        "email": FIRM["email"],
        "priceRange": "Theo thỏa thuận",
        "address": {
            "@type": "PostalAddress",
            "streetAddress": FIRM["street"],
            "addressLocality": FIRM["ward"],
            "addressRegion": FIRM["city"],
            "addressCountry": "VN",
        },
        "openingHoursSpecification": [{
            "@type": "OpeningHoursSpecification",
            "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
            "opens": "08:00", "closes": "17:30",
        }],
        "areaServed": [{"@type": "City", "name": "Thành phố Hồ Chí Minh"}, {"@type": "Country", "name": "Việt Nam"}],
        "knowsLanguage": ["vi"],
        "sameAs": [FIRM["zalo"]],
        "hasOfferCatalog": {
            "@type": "OfferCatalog",
            "name": "Lĩnh vực hoạt động",
            "itemListElement": [{"@type": "Offer", "itemOffered": {"@id": abs_url(f"dich-vu/{s['slug']}/") + "#service"}}
                                for s in SERVICES],
        },
    }


def jsonld(page):
    url = abs_url(page["path"])
    org = org_node()
    if page["path"] not in ("", "lien-he/", "gioi-thieu/"):
        org = {k: org[k] for k in ("@type", "@id", "name", "alternateName", "url", "logo", "image", "telephone", "email", "address")}
    graph = [org, {
        "@type": "WebSite", "@id": SITE_ID, "url": SITE_URL + "/", "name": FIRM["legal_name"], "alternateName": FIRM["short_name"],
        "inLanguage": "vi", "publisher": {"@id": ORG_ID},
    }]
    webpage = {
        "@type": page.get("schema_type", "WebPage"), "@id": url + "#webpage", "url": url,
        "name": page["title"], "description": page["description"], "inLanguage": "vi",
        "isPartOf": {"@id": SITE_ID}, "about": {"@id": ORG_ID},
        "primaryImageOfPage": {"@type": "ImageObject", "url": abs_url(page.get("image", "assets/img/og-image.jpg"))},
        "dateModified": page.get("modified", TODAY),
    }
    if page["path"]:
        webpage["breadcrumb"] = {"@id": url + "#breadcrumb"}
        graph.append({
            "@type": "BreadcrumbList", "@id": url + "#breadcrumb",
            "itemListElement": [{"@type": "ListItem", "position": i + 1, "name": n, "item": abs_url(p)}
                                for i, (n, p) in enumerate(page["crumbs"])],
        })
    webpage.update(page.get("webpage_extra", {}))
    graph.append(webpage)
    graph.extend(page.get("schema", []))
    data = {"@context": "https://schema.org", "@graph": graph}
    return json.dumps(data, ensure_ascii=False, indent=1).replace("</", "<\\/")


# ---------------------------------------------------------------------------
# Khung trang
# ---------------------------------------------------------------------------
def layout(page):
    r = page.get("root_override", "../" * page["path"].count("/"))
    css_v, js_v = file_hash("assets/css/style.css"), file_hash("assets/js/main.js")
    url = abs_url(page["path"])
    # Ảnh chia sẻ luôn dùng JPG 1200×630 để tương thích Facebook, Zalo, LinkedIn
    image = abs_url("assets/img/og-image.jpg")
    robots = "noindex, follow" if page.get("noindex") else "index, follow, max-image-preview:large, max-snippet:-1"
    og_type = page.get("og_type", "website")
    art_meta = ""
    if og_type == "article":
        art_meta = (f'\n<meta property="article:published_time" content="{page["published"]}">'
                    f'\n<meta property="article:modified_time" content="{page["modified"]}">'
                    f'\n<meta property="article:section" content="{esc(page["article_section"])}">')
    preload = "".join(f'\n<link rel="preload" as="image" href="{r}{p}" fetchpriority="high">' for p in page.get("preload_images", []))
    extra_head = page.get("extra_head", "").replace("{{root}}", r)
    hero = render_tokens(page_hero_html(page, r), page, r) if page.get("page_hero", True) else ""
    body = render_tokens(page["body"], page, r)
    body = re.sub(r"\s*<!--\s*(GHI CHÚ CHO NGƯỜI QUẢN TRỊ|Nội dung trang tra cứu).*?-->", "", body, flags=re.S)
    scripts = "".join(f'\n<script src="{r}{s}" defer></script>' for s in page.get("scripts", []))
    body_cls = f' class="{page["body_class"]}"' if page.get("body_class") else ""
    canonical = "" if page.get("noindex") else f'\n<link rel="canonical" href="{url}">'
    return f"""<!doctype html>
<html lang="vi" data-root="{r}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{esc(page["title"])}</title>
<meta name="description" content="{esc(page["description"])}">
<meta name="robots" content="{robots}">{canonical}
<meta name="author" content="{FIRM["legal_name"]}">
<meta name="theme-color" content="#041b2e">
<meta name="format-detection" content="telephone=no">
<meta property="og:type" content="{og_type}">
<meta property="og:site_name" content="{FIRM["legal_name"]}">
<meta property="og:locale" content="vi_VN">
<meta property="og:title" content="{esc(page.get("og_title", page["title"]))}">
<meta property="og:description" content="{esc(page["description"])}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{image}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="{FIRM["legal_name"]}">{art_meta}
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{esc(page.get("og_title", page["title"]))}">
<meta name="twitter:description" content="{esc(page["description"])}">
<meta name="twitter:image" content="{image}">
<link rel="icon" href="{r}assets/img/favicon-32.png" sizes="32x32" type="image/png">
<link rel="icon" href="{r}assets/img/icon-192.png" sizes="192x192" type="image/png">
<link rel="apple-touch-icon" href="{r}assets/img/apple-touch-icon.png">
<link rel="manifest" href="{r}site.webmanifest">
<link rel="preload" href="{r}assets/fonts/be-vietnam-pro-400-normal-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="{r}assets/fonts/be-vietnam-pro-400-normal-vietnamese.woff2" as="font" type="font/woff2" crossorigin>{preload}
<link rel="stylesheet" href="{r}assets/css/style.css?v={css_v}">{extra_head}
<script type="application/ld+json">
{jsonld(page)}
</script>
</head>
<body{body_cls}>
<a class="skip-link" href="#main">Bỏ qua đến nội dung chính</a>
{SPRITE}
{header_html(page, r)}

<main id="main">
{hero}
{body}
</main>

{footer_html(r)}

{overlays_html(r)}

<script src="{r}assets/js/main.js?v={js_v}" defer></script>{scripts}
</body>
</html>
"""


# ---------------------------------------------------------------------------
# Đọc trang nguồn
# ---------------------------------------------------------------------------
META_RE = re.compile(r"^\s*<!--meta\s*(\{.*?\})\s*-->\s*", re.S)


def load_src(rel):
    with open(os.path.join(SRC, rel), encoding="utf-8") as fh:
        text = fh.read()
    m = META_RE.match(text)
    meta = json.loads(m.group(1)) if m else {}
    return meta, text[m.end():] if m else text


HOME = ("Trang chủ", "")


def crumbs_for(*items):
    return [HOME] + list(items)


# ---------------------------------------------------------------------------
# Trang dịch vụ
# ---------------------------------------------------------------------------
def service_page(s):
    path = f"dich-vu/{s['slug']}/"
    arts = articles_for_service(s["slug"])
    n = SERVICES.index(s) + 1
    scope = "".join(f"""<article class="scope-card reveal">
  <span class="scope-card__num">{i:02d}</span>
  <h3>{esc(h)}</h3>
  <p>{esc(p)}</p>
</article>""" for i, (h, p) in enumerate(s["scope"], 1))
    steps = "".join(f"""<li class="steps__item">
  <span class="steps__num">{i:02d}</span>
  <h3>{esc(h)}</h3>
  <p>{esc(p)}</p>
</li>""" for i, (h, p) in enumerate(s["steps"], 1))
    laws = "".join(f"<li>{esc(x)}</li>" for x in s["laws"])
    tags = "".join(f"<li>{esc(t)}</li>" for t in s["tags"])
    aside = f"""<figure class="svc-figure">
      <img src="{{{{root}}}}assets/img/dich-vu/{s["slug"]}.webp" alt="{esc(s["image_alt"])}" width="600" height="300" fetchpriority="high">
      <figcaption>
        <span class="svc-figure__num">{n:02d}</span>
        <small>Trọng tâm dịch vụ</small>
        <strong>{esc(s["focus_title"])}</strong>
        <span>{esc(s["focus_text"])}</span>
        <ul class="svc-figure__tags">{tags}</ul>
      </figcaption>
    </figure>"""
    fillers = [
        ("bo-luat-hinh-su/", "i-book", "Công cụ tra cứu", "Bộ luật Hình sự 2015 kèm bình luận",
         "Tra toàn văn 428 điều, tìm theo điều, khoản, điểm; có dấu hoặc không dấu.", True),
        ("cau-hoi-thuong-gap/", "i-question", "Hỏi đáp", "Câu hỏi thường gặp khi thuê luật sư",
         "Chi phí theo Điều 55 Luật Luật sư, bảo mật thông tin, thời hiệu và thời gian phản hồi.", False),
        ("quy-trinh-lam-viec/#ho-so-can-chuan-bi", "i-steps", "Chuẩn bị trước", "Hồ sơ nên mang theo buổi làm việc đầu tiên",
         "Danh mục giấy tờ chung giúp luật sư đánh giá chính xác ngay từ buổi đầu.", False),
    ]
    if s["slug"] != "hinh-su":
        fillers = fillers[1:] + fillers[:1]
    cards = [article_card(a, "{{root}}") for a in arts[:3]]
    for href, icn, eb, title, text, navy in fillers[:3 - len(cards)]:
        cards.append(f"""<a class="kcard{' kcard--navy' if navy else ''} reveal" href="{{{{root}}}}{href}">
  {ico(icn, "kcard__icon")}
  <span class="eyebrow{' eyebrow--gold' if navy else ''}">{eb}</span>
  <span class="kcard__title">{title}</span>
  <p>{text}</p>
  <span class="link-arrow{' link-arrow--light' if navy else ''}">Xem chi tiết {ARROW}</span>
</a>""")
    heading = f"Bài viết và tài liệu về {esc(s['name'].lower())}" if arts else "Tài liệu hữu ích trước khi gặp luật sư"
    related_articles = ""
    if True:
        related_articles = f"""
<section class="section section--cream">
  <div class="container">
    <div class="section-head reveal">
      <div class="heading-block">
        <p class="eyebrow">Kiến thức pháp lý</p>
        <h2 class="h2">{heading}</h2>
      </div>
      <a class="link-arrow" href="{{{{root}}}}kien-thuc-phap-ly/">Tất cả bài viết pháp lý {ARROW}</a>
    </div>
    <div class="cards-3">{"".join(cards)}</div>
  </div>
</section>"""
    body = f"""
<section class="section section--cream">
  <div class="container">
    <div class="section-head section-head--stack reveal">
      <div class="heading-block">
        <p class="eyebrow">Phạm vi hỗ trợ</p>
        <h2 class="h2">{esc(s["scope_title"])}</h2>
      </div>
      <p class="section-head__text">{esc(s["scope_intro"])}</p>
    </div>
    <div class="scope-grid">{scope}</div>
  </div>
</section>

<section class="section">
  <div class="container svc-docs">
    <div class="svc-docs__col card reveal">
      <h2 class="h3">{ico("i-doc", "h3__icon")}{esc(s.get("docs_title", "Hồ sơ nên chuẩn bị"))}</h2>
      {check_list(s["docs"])}
      <p class="svc-docs__more">Danh mục chung cho buổi làm việc đầu tiên có tại trang <a href="{{{{root}}}}quy-trinh-lam-viec/#ho-so-can-chuan-bi">Quy trình làm việc</a>.</p>
    </div>
    <div class="svc-docs__col card reveal">
      <h2 class="h3">{ico("i-diamond", "h3__icon")}Khách hàng nhận được</h2>
      {check_list(s["deliverables"])}
    </div>
    <aside class="svc-docs__side reveal">
      <div class="callout">
        <h2 class="callout__title">{esc(s["principle_title"])}</h2>
        <p>{esc(s["principle_text"])}</p>
      </div>
      <div class="laws">
        <h2 class="laws__title">{ico("i-book", "h3__icon")}Căn cứ pháp lý chủ yếu</h2>
        <ul>{laws}</ul>
        <p class="laws__note">Danh mục tham khảo; văn bản áp dụng cụ thể được luật sư xác định theo từng vụ việc.</p>
      </div>
    </aside>
  </div>
</section>

<section class="section section--navy">
  <div class="container">
    <div class="section-head reveal">
      <div class="heading-block heading-block--light">
        <p class="eyebrow eyebrow--gold">{esc(s.get("steps_title", "Quy trình thực hiện"))}</p>
        <h2 class="h2 h2--light">Năm bước luật sư đồng hành cùng bạn</h2>
      </div>
      <a class="link-arrow link-arrow--light" href="{{{{root}}}}quy-trinh-lam-viec/">Quy trình làm việc chung {ARROW}</a>
    </div>
    <ol class="steps">{steps}</ol>
    <div class="note reveal">
      {ico("i-alert", "note__icon")}
      <p><strong>{esc(s["note_title"])}:</strong> {esc(s["note_text"])}</p>
    </div>
  </div>
</section>
{related_articles}
<section class="section">
  <div class="container">
    <div class="section-head reveal">
      <div class="heading-block">
        <p class="eyebrow">Lĩnh vực liên quan</p>
        <h2 class="h2">Vụ việc thường liên quan đến</h2>
      </div>
      <a class="link-arrow" href="{{{{root}}}}dich-vu/">Tổng quan 8 lĩnh vực {ARROW}</a>
    </div>
    {services_grid("{{root}}", only=s["related"], cls="services__grid services__grid--3")}
  </div>
</section>

{cta_band("{{root}}", s["cta_eyebrow"], esc(s["cta_title"]), esc(s["cta_text"]), sub="")}
"""
    url = abs_url(path)
    return {
        "path": path,
        "section": "services",
        "title": f'{s["title"]} | {FIRM["short_name"]}',
        "description": s["description"],
        "eyebrow": s["eyebrow"],
        "h1": esc(s["name"]),
        "lead": esc(s["lead"]),
        "crumbs": crumbs_for(("Lĩnh vực hoạt động", "dich-vu/"), (s["name"], path)),
        "image": f'assets/img/dich-vu/{s["slug"]}.webp',
        "image_alt": s["image_alt"],
        "hero": {
            "image": "assets/img/hero.webp",
            "aside": aside,
            "actions": f'<a class="btn btn--primary" href="{{{{root}}}}lien-he/#gui-yeu-cau" data-open-booking>Đặt lịch tư vấn {ARROW}</a>'
                       f'<a class="btn btn--ghost" href="tel:{FIRM["phone_tel"]}">{ico("i-phone")} {FIRM["phone"]}</a>',
        },
        "body": body,
        "schema": [{
            "@type": "Service", "@id": url + "#service", "name": s["name"], "serviceType": s["title"],
            "description": s["description"], "url": url, "provider": {"@id": ORG_ID},
            "areaServed": [{"@type": "City", "name": "Thành phố Hồ Chí Minh"}, {"@type": "Country", "name": "Việt Nam"}],
            "image": abs_url(f'assets/img/dich-vu/{s["slug"]}.webp'),
        }],
        "webpage_extra": {"mainEntity": {"@id": url + "#service"}},
    }


def services_hub():
    path = "dich-vu/"
    modes = [
        ("I", "Tư vấn pháp luật", "Phân tích quy định, trả lời câu hỏi pháp lý bằng lời nói hoặc bằng văn bản; soạn thảo, rà soát hợp đồng, đơn từ và các tài liệu pháp lý khác."),
        ("II", "Đại diện ngoài tố tụng", "Thay mặt khách hàng làm việc, thương lượng, hòa giải với các bên liên quan và thực hiện thủ tục tại cơ quan nhà nước trong phạm vi được ủy quyền."),
        ("III", "Tham gia tố tụng", "Bào chữa, bảo vệ quyền và lợi ích hợp pháp hoặc đại diện cho đương sự trong các vụ án hình sự, dân sự, hôn nhân gia đình, lao động, kinh doanh thương mại và tại Trọng tài."),
    ]
    mode_html = "".join(f"""<article class="pillar reveal">
  <span class="pillar__num">{n}</span>
  <h3>{h}</h3>
  <p>{p}</p>
</article>""" for n, h, p in modes)
    body = f"""
<section class="section section--cream">
  <div class="container">
    <div class="section-head reveal">
      <div class="heading-block">
        <p class="eyebrow">Tám lĩnh vực</p>
        <h2 class="h2">Chuyên môn pháp lý toàn diện</h2>
      </div>
      <p class="section-head__text">Chọn lĩnh vực gần nhất với vụ việc của bạn để xem phạm vi hỗ trợ, tài liệu cần chuẩn bị và các bước luật sư sẽ thực hiện.</p>
    </div>
    {{{{services_grid}}}}
  </div>
</section>

<section class="section">
  <div class="container">
    <div class="section-head section-head--center reveal">
      <div class="heading-block heading-block--center">
        <p class="eyebrow">Hình thức hỗ trợ</p>
        <h2 class="h2">Ba cách luật sư đồng hành</h2>
      </div>
      <p class="section-head__text">Tùy tính chất vụ việc, khách hàng có thể lựa chọn một hoặc kết hợp nhiều hình thức dưới đây, theo phạm vi quy định tại Luật Luật sư.</p>
    </div>
    <div class="pillars">{mode_html}</div>
  </div>
</section>

{cta_band("{{root}}", "Chưa rõ lĩnh vực", "Chưa rõ vụ việc thuộc lĩnh vực nào?", "Hãy mô tả ngắn gọn sự việc và tài liệu đang có. Luật sư sẽ xác định vấn đề pháp lý chính và hướng xử lý phù hợp.", sub="")}
"""
    url = abs_url(path)
    return {
        "path": path, "section": "services", "schema_type": "CollectionPage",
        "title": f'Lĩnh vực hoạt động – Dịch vụ pháp lý | {FIRM["short_name"]}',
        "description": "Luật Sư Nam tư vấn, đại diện và tham gia tố tụng trong 8 lĩnh vực: thừa kế, tranh tụng, hôn nhân gia đình, đất đai, lao động, hình sự, dân sự, công chứng.",
        "eyebrow": "Lĩnh vực hoạt động",
        "h1": "Dịch vụ pháp lý cho <em>cá nhân và doanh nghiệp</em>",
        "lead": "Luật Sư Nam tư vấn, đại diện và tham gia tố tụng trong tám lĩnh vực hành nghề chính. Mỗi lĩnh vực có trang riêng mô tả phạm vi hỗ trợ, hồ sơ cần chuẩn bị và quy trình thực hiện.",
        "crumbs": crumbs_for(("Lĩnh vực hoạt động", path)),
        "hero": {"image": "assets/img/hero.webp"},
        "body": body,
        "webpage_extra": {"mainEntity": {
            "@type": "ItemList", "numberOfItems": len(SERVICES),
            "itemListElement": [{"@type": "ListItem", "position": i + 1, "url": abs_url(f"dich-vu/{s['slug']}/"), "name": s["name"]}
                                for i, s in enumerate(SERVICES)]}},
    }


# ---------------------------------------------------------------------------
# Bài viết
# ---------------------------------------------------------------------------
H2_RE = re.compile(r'<h2 id="([^"]+)">(.*?)</h2>', re.S)


def article_page(a):
    path = f"kien-thuc-phap-ly/{a['slug']}/"
    meta, content = load_src(f"bai-viet/{a['slug']}.html")
    toc = "".join(f'<li><a href="#{i}">{strip_tags(t)}</a></li>' for i, t in H2_RE.findall(content))
    words = len(strip_tags(content).split())
    minutes = max(1, round(words / 220))
    svc = SERVICE_BY_SLUG[a["service"]]
    others = [x for x in ARTICLES if x["slug"] != a["slug"]]
    related_svcs = "".join(
        f'<li><a href="{{{{root}}}}dich-vu/{x}/">{ico(SERVICE_BY_SLUG[x]["icon"], "rel-list__icon")}<span>{esc(SERVICE_BY_SLUG[x]["name"])}</span>{ARROW}</a></li>'
        for x in a["related_services"])
    extra = f"""<p class="article-meta">
        <span>{ico("i-user")}Ban biên tập {FIRM["short_name"]}</span>
        <span>{ico("i-calendar")}Đăng <time datetime="{a["published"]}">{vi_date(a["published"])}</time></span>
        <span>{ico("i-clock")}Cập nhật <time datetime="{a["modified"]}">{vi_date(a["modified"])}</time> · {minutes} phút đọc</span>
      </p>"""
    body = f"""
<div class="section section--article">
  <div class="container article-layout">
    <article class="prose" id="noi-dung-bai-viet">
      <img class="prose__cover" src="{{{{root}}}}assets/img/bai-viet/{a["slug"]}.webp" alt="{esc(a["image_alt"])}" width="720" height="240" fetchpriority="high">
      {content}
      <div class="article-disclaimer">
        {ico("i-alert", "note__icon")}
        <p>Bài viết mang tính thông tin pháp lý chung tại thời điểm cập nhật, không thay thế ý kiến tư vấn cho vụ việc cụ thể. Văn bản pháp luật có thể được sửa đổi, bổ sung sau ngày đăng; vui lòng kiểm tra hiệu lực hoặc <a href="{{{{root}}}}lien-he/">liên hệ luật sư</a> trước khi quyết định.</p>
      </div>
    </article>
    <aside class="article-aside">
      <div class="aside-card aside-card--toc">
        <p class="aside-card__title">Nội dung bài viết</p>
        <ol class="toc">{toc}</ol>
      </div>
      <div class="aside-card aside-card--cta">
        {ico(svc["icon"], "aside-card__icon")}
        <p class="aside-card__title">Cần luật sư về {esc(svc["name"].lower())}?</p>
        <p>{esc(svc["short"])}</p>
        <a class="btn btn--primary btn--block btn--sm" href="{{{{root}}}}dich-vu/{svc["slug"]}/">Xem dịch vụ {esc(svc["name"])} {ARROW}</a>
        <a class="aside-card__phone" href="tel:{FIRM["phone_tel"]}">{ico("i-phone")} {FIRM["phone"]}</a>
      </div>
      <div class="aside-card">
        <p class="aside-card__title">Lĩnh vực liên quan</p>
        <ul class="rel-list">{related_svcs}</ul>
      </div>
    </aside>
  </div>
</div>

<section class="section section--cream">
  <div class="container">
    <div class="section-head reveal">
      <div class="heading-block">
        <p class="eyebrow">Đọc tiếp</p>
        <h2 class="h2">Bài viết khác</h2>
      </div>
      <a class="link-arrow" href="{{{{root}}}}kien-thuc-phap-ly/">Tất cả bài viết {ARROW}</a>
    </div>
    {articles_grid("{{root}}", others, cls="cards-2")}
  </div>
</section>

{cta_band("{{root}}", svc["cta_eyebrow"], esc(svc["cta_title"]), esc(svc["cta_text"]), sub="")}
"""
    url = abs_url(path)
    return {
        "path": path, "section": "knowledge", "og_type": "article",
        "published": a["published"], "modified": a["modified"], "article_section": a["category"],
        "title": f'{a["seo_title"]} | {FIRM["short_name"]}',
        "og_title": a["title"],
        "description": a["description"],
        "eyebrow": a["category"],
        "h1": esc(a["title"]),
        "crumbs": crumbs_for(("Kiến thức pháp lý", "kien-thuc-phap-ly/"), (a["card_title"], path)),
        "image": f'assets/img/bai-viet/{a["slug"]}.webp', "image_alt": a["image_alt"],
        "hero": {"image": "assets/img/hero.webp", "extra": extra},
        "body": body, "modified": a["modified"],
        "schema": [{
            "@type": "Article", "@id": url + "#article", "headline": a["title"], "description": a["description"],
            "image": abs_url(f'assets/img/bai-viet/{a["slug"]}.webp'), "datePublished": a["published"],
            "dateModified": a["modified"], "inLanguage": "vi", "articleSection": a["category"], "wordCount": words,
            "author": {"@id": ORG_ID}, "publisher": {"@id": ORG_ID},
            "mainEntityOfPage": {"@id": url + "#webpage"},
            "about": {"@id": abs_url(f'dich-vu/{a["service"]}/') + "#service"},
        }],
    }


def knowledge_hub():
    path = "kien-thuc-phap-ly/"
    body = f"""
<section class="section section--cream">
  <div class="container">
    <div class="section-head reveal">
      <div class="heading-block">
        <p class="eyebrow">Bài viết mới</p>
        <h2 class="h2">Phân tích và hướng dẫn pháp lý</h2>
      </div>
      <p class="section-head__text">Mỗi bài viết gắn với một lĩnh vực hành nghề, trích dẫn điều luật cụ thể và ghi rõ ngày cập nhật.</p>
    </div>
    {{{{articles_grid}}}}
  </div>
</section>

<section class="section">
  <div class="container tools-grid">
    <a class="tool-card tool-card--navy reveal" href="{{{{root}}}}bo-luat-hinh-su/">
      {ico("i-book", "tool-card__icon")}
      <span class="eyebrow eyebrow--gold">Công cụ tra cứu</span>
      <h2 class="tool-card__title">Bộ luật Hình sự 2015 (sửa đổi 2017, 2025)</h2>
      <p>Toàn văn 428 điều kèm bình luận từng điều; tìm kiếm có dấu, không dấu, tra nhanh theo điều, khoản, điểm.</p>
      <span class="link-arrow link-arrow--light">Mở công cụ tra cứu {ARROW}</span>
    </a>
    <a class="tool-card reveal" href="{{{{root}}}}cau-hoi-thuong-gap/">
      {ico("i-question", "tool-card__icon")}
      <span class="eyebrow">Hỏi đáp</span>
      <h2 class="tool-card__title">Câu hỏi thường gặp khi làm việc với luật sư</h2>
      <p>Chi phí thuê luật sư, bảo mật thông tin, thời hiệu, thời gian phản hồi và phạm vi hoạt động.</p>
      <span class="link-arrow">Xem câu hỏi thường gặp {ARROW}</span>
    </a>
  </div>
</section>

<section class="section section--cream">
  <div class="container">
    <div class="section-head reveal">
      <div class="heading-block">
        <p class="eyebrow">Theo lĩnh vực</p>
        <h2 class="h2">Tìm hiểu dịch vụ theo vấn đề của bạn</h2>
      </div>
      <a class="link-arrow" href="{{{{root}}}}dich-vu/">Tổng quan 8 lĩnh vực {ARROW}</a>
    </div>
    <ul class="topic-links">
      {"".join(f'<li><a href="{{{{root}}}}dich-vu/{s["slug"]}/">{ico(s["icon"], "topic-links__icon")}{esc(s["name"])}</a></li>' for s in SERVICES)}
    </ul>
  </div>
</section>

{{{{cta}}}}
"""
    return {
        "path": path, "section": "knowledge", "schema_type": "CollectionPage",
        "title": f'Kiến thức pháp lý – Bài viết, tra cứu luật | {FIRM["short_name"]}',
        "description": "Bài viết phân tích pháp luật về thừa kế, hôn nhân gia đình, đất đai; tra cứu Bộ luật Hình sự kèm bình luận và giải đáp thắc mắc khi làm việc với luật sư.",
        "eyebrow": "Kiến thức pháp lý",
        "h1": "Thông tin pháp lý <em>rõ ràng, có căn cứ</em>",
        "lead": "Phân tích, hướng dẫn và công cụ tra cứu do đội ngũ Luật Sư Nam biên soạn, giúp bạn hiểu quyền và nghĩa vụ trước khi đưa ra quyết định.",
        "crumbs": crumbs_for(("Kiến thức pháp lý", path)),
        "hero": {"image": "assets/img/hero.webp"},
        "body": body,
        "webpage_extra": {"mainEntity": {
            "@type": "ItemList", "numberOfItems": len(ARTICLES),
            "itemListElement": [{"@type": "ListItem", "position": i + 1, "url": abs_url(f"kien-thuc-phap-ly/{a['slug']}/"), "name": a["title"]}
                                for i, a in enumerate(ARTICLES)]}},
    }


def faq_page():
    path = "cau-hoi-thuong-gap/"
    body = f"""
<section class="section section--cream">
  <div class="container faq-layout">
    <div class="reveal">{{{{faq_list}}}}
      <p class="faq__foot">Các giải đáp trên mang tính thông tin chung, không thay thế ý kiến tư vấn cho vụ việc cụ thể. Xem thêm <a href="{{{{root}}}}mien-tru-trach-nhiem/">Tuyên bố miễn trừ trách nhiệm</a>.</p>
    </div>
    <aside class="faq-aside">
      <div class="aside-card aside-card--cta">
        {ico("i-chat", "aside-card__icon")}
        <p class="aside-card__title">Chưa thấy câu trả lời?</p>
        <p>Gửi câu hỏi cho luật sư. Chúng tôi phản hồi trong giờ làm việc, thường trong vòng 24 giờ làm việc.</p>
        <a class="btn btn--primary btn--block btn--sm" href="{{{{root}}}}lien-he/#gui-yeu-cau">Gửi câu hỏi {ARROW}</a>
        <a class="aside-card__phone" href="tel:{FIRM["phone_tel"]}">{ico("i-phone")} {FIRM["phone"]}</a>
      </div>
      <div class="aside-card">
        <p class="aside-card__title">Tìm hiểu thêm</p>
        <ul class="rel-list">
          <li><a href="{{{{root}}}}quy-trinh-lam-viec/">{ico("i-steps", "rel-list__icon")}<span>Quy trình làm việc</span>{ARROW}</a></li>
          <li><a href="{{{{root}}}}vi-sao-chon-chung-toi/">{ico("i-diamond", "rel-list__icon")}<span>Vì sao chọn chúng tôi</span>{ARROW}</a></li>
          <li><a href="{{{{root}}}}kien-thuc-phap-ly/">{ico("i-book", "rel-list__icon")}<span>Kiến thức pháp lý</span>{ARROW}</a></li>
        </ul>
      </div>
    </aside>
  </div>
</section>
{{{{cta}}}}
"""
    url = abs_url(path)
    return {
        "path": path, "section": "knowledge", "schema_type": "FAQPage",
        "title": f'Câu hỏi thường gặp khi thuê luật sư | {FIRM["short_name"]}',
        "description": "Giải đáp về chi phí thuê luật sư theo Điều 55 Luật Luật sư, bảo mật thông tin, cam kết kết quả, thời hiệu, thời gian phản hồi và vụ việc ngoài TP.HCM.",
        "eyebrow": "Câu hỏi thường gặp",
        "h1": "Những điều khách hàng <em>hay hỏi nhất</em>",
        "lead": "Chi phí, bảo mật, thời hạn và cách bắt đầu làm việc với luật sư, giải đáp ngắn gọn và có dẫn chiếu quy định.",
        "crumbs": crumbs_for(("Kiến thức pháp lý", "kien-thuc-phap-ly/"), ("Câu hỏi thường gặp", path)),
        "hero": {"image": "assets/img/van-phong.webp"},
        "body": body,
        "webpage_extra": {"mainEntity": [{
            "@type": "Question", "name": f["q"],
            "acceptedAnswer": {"@type": "Answer", "text": " ".join(strip_tags(p.replace("{{root}}", "")) for p in f["a"])},
        } for f in FAQ]},
    }


# ---------------------------------------------------------------------------
# Trang đơn lẻ từ src/pages
# ---------------------------------------------------------------------------
def simple_page(name, path, section, crumbs, **extra):
    meta, body = load_src(f"pages/{name}.html")
    page = {"path": path, "section": section, "crumbs": crumbs, "body": body}
    page.update(meta)
    page.update(extra)
    if "title" in page and not page["title"].endswith(FIRM["short_name"]) and path:
        page["title"] = f'{page["title"]} | {FIRM["short_name"]}'
    return page


# ---------------------------------------------------------------------------
# Từ điển Bộ luật Hình sự
# ---------------------------------------------------------------------------
CODE_LEGISLATION = {"@type": "Legislation", "name": "Bộ luật Hình sự", "legislationIdentifier": "100/2015/QH13",
                    "legislationJurisdiction": "VN", "inLanguage": "vi"}


def blhs_pages():
    code = blhs.Code()
    rd = blhs.Renderer(code, ico, ARROW, FIRM)
    common = {
        "section": "knowledge", "page_hero": False, "body_class": "tdl-page", "index_k": False,
        "extra_head": '\n<link rel="stylesheet" href="{{root}}bo-luat-hinh-su/tu-dien.css?v=' + file_hash("bo-luat-hinh-su/tu-dien.css") + '">',
        "scripts": ["bo-luat-hinh-su/lx-core.js?v=" + file_hash("bo-luat-hinh-su/lx-core.js"),
                    "bo-luat-hinh-su/tu-dien.js?v=" + file_hash("bo-luat-hinh-su/tu-dien.js")],
    }
    hub_crumb = ("Bộ luật Hình sự", "bo-luat-hinh-su/")
    pages = []
    st = code.toc["stats"]
    hub = dict(common)
    hub.update({
        "path": "bo-luat-hinh-su/", "h1": "Bộ luật Hình sự",
        "title": f'Từ điển Bộ luật Hình sự 2015 – Tra cứu kèm bình luận | {FIRM["short_name"]}',
        "description": f'Tra cứu toàn văn {st["arts"]} điều Bộ luật Hình sự 2015 (sửa đổi 2017, 2025) kèm bình luận từng điều; tìm theo số điều, khoản, điểm, tội danh, có dấu hoặc không dấu.',
        "crumbs": crumbs_for(("Kiến thức pháp lý", "kien-thuc-phap-ly/"), hub_crumb),
        "body": rd.hub("../"),
        "schema_type": "CollectionPage",
        "webpage_extra": {"about": CODE_LEGISLATION},
    })
    pages.append(hub)
    for ch in code.chapters:
        path = f"bo-luat-hinh-su/{ch['slug']}/"
        names = ", ".join(a["t"].lower() for a in ch["a"][:4])
        rng = f'Điều {ch["a"][0]["id"]}–{ch["a"][-1]["id"]}' if len(ch["a"]) > 1 else f'Điều {ch["a"][0]["id"]}'
        desc = f'{ch["title"]} Bộ luật Hình sự 2015 ({rng}, {len(ch["a"])} điều): {names}… Toàn văn kèm bình luận.'
        pg = dict(common)
        pg.update({
            "path": path, "h1": ch["title"],
            "title": f'{ch["title"]} – Bộ luật Hình sự | {FIRM["short_name"]}',
            "description": desc if len(desc) <= 175 else desc[:172].rsplit(" ", 1)[0] + "…",
            "crumbs": crumbs_for(hub_crumb, (ch["label"], path)),
            "body": rd.chapter(ch, "../../"),
            "schema_type": "CollectionPage",
            "webpage_extra": {"about": CODE_LEGISLATION},
        })
        pages.append(pg)
    for a in code.arts:
        path = f"bo-luat-hinh-su/dieu-{a['id']}/"
        head = f'Điều {a["id"]} BLHS 2015 – {a["t"]}: '
        desc = head + code.excerpt(a, max(60, 158 - len(head)))
        if len(desc) > 165:
            desc = desc[:160].rsplit(" ", 1)[0].rstrip(",;:") + "…"
        pg = dict(common)
        pg.update({
            "path": path, "h1": f'Điều {a["id"]}. {a["t"]}',
            "title": f'Điều {a["id"]} Bộ luật Hình sự: {a["t"]} | {FIRM["short_name"]}',
            "description": desc,
            "crumbs": crumbs_for(hub_crumb, (a["ch"]["label"], f'bo-luat-hinh-su/{a["ch"]["slug"]}/'), (f'Điều {a["id"]}', path)),
            "body": rd.article(a, "../../"),
            "search_title": f'Điều {a["id"]}. {a["t"]}',
            "search_desc": code.excerpt(a, 150),
            "webpage_extra": {"about": {
                "@type": "Legislation", "name": f'Điều {a["id"]}. {a["t"]}', "legislationJurisdiction": "VN", "inLanguage": "vi",
                "legislationIdentifier": f'Điều {a["id"]} Bộ luật Hình sự số 100/2015/QH13', "isPartOf": CODE_LEGISLATION}},
        })
        pages.append(pg)
    return pages


def all_pages():
    pages = []
    meta, body = load_src("pages/home.html")
    home = {"path": "", "section": "home", "crumbs": [HOME], "body": body, "page_hero": False,
            "preload_images": ["assets/img/hero.webp"]}
    home.update(meta)
    pages.append(home)

    pages.append(simple_page("gioi-thieu", "gioi-thieu/", "about",
                             crumbs_for(("Giới thiệu", "gioi-thieu/")), schema_type="AboutPage"))
    team = simple_page("doi-ngu-luat-su", "doi-ngu-luat-su/", "team", crumbs_for(("Đội ngũ luật sư", "doi-ngu-luat-su/")),
                       schema_type="ProfilePage", image="assets/img/luat-su-nam.webp", image_alt="Luật sư Nam tại phiên tòa")
    team["schema"] = [{
        "@type": "Person", "@id": abs_url("doi-ngu-luat-su/") + "#luat-su-nam", "name": "Luật sư Nam",
        "jobTitle": "Luật sư điều hành", "worksFor": {"@id": ORG_ID},
        "image": abs_url("assets/img/luat-su-nam.webp"),
        "knowsAbout": ["Luật Hình sự", "Tranh tụng", "Luật Dân sự", "Luật Đất đai"],
        "url": abs_url("doi-ngu-luat-su/"),
    }]
    team["webpage_extra"] = {"mainEntity": {"@id": abs_url("doi-ngu-luat-su/") + "#luat-su-nam"}}
    pages.append(team)
    pages.append(simple_page("vi-sao-chon-chung-toi", "vi-sao-chon-chung-toi/", "about",
                             crumbs_for(("Giới thiệu", "gioi-thieu/"), ("Vì sao chọn chúng tôi", "vi-sao-chon-chung-toi/"))))
    pages.append(simple_page("quy-trinh-lam-viec", "quy-trinh-lam-viec/", "about",
                             crumbs_for(("Giới thiệu", "gioi-thieu/"), ("Quy trình làm việc", "quy-trinh-lam-viec/"))))
    pages.append(services_hub())
    pages.extend(service_page(s) for s in SERVICES)
    pages.append(knowledge_hub())
    pages.extend(article_page(a) for a in ARTICLES)
    pages.append(faq_page())

    pages.extend(blhs_pages())

    pages.append(simple_page("lien-he", "lien-he/", "contact", crumbs_for(("Liên hệ", "lien-he/")), schema_type="ContactPage"))
    for name, label in [("chinh-sach-bao-mat", "Chính sách bảo mật"), ("dieu-khoan-su-dung", "Điều khoản sử dụng"),
                        ("mien-tru-trach-nhiem", "Miễn trừ trách nhiệm")]:
        pages.append(simple_page(name, f"{name}/", "", crumbs_for((label, f"{name}/"))))

    nf = simple_page("404", "404.html", "", [HOME], noindex=True, root_override=BASE_PATH, page_hero=False)
    pages.append(nf)
    return pages


# ---------------------------------------------------------------------------
# Tệp phụ trợ
# ---------------------------------------------------------------------------
def write(rel, text):
    full = os.path.join(ROOT, rel)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with open(full, "w", encoding="utf-8") as fh:
        fh.write(text)


def main():
    pages = all_pages()
    for p in pages:
        out = p["path"] if p["path"].endswith(".html") else p["path"] + "index.html"
        write(out, layout(p))

    indexable = [p for p in pages if not p.get("noindex")]
    urls = "".join(
        f"  <url>\n    <loc>{abs_url(p['path'])}</loc>\n    <lastmod>{p.get('modified', TODAY)}</lastmod>\n  </url>\n"
        for p in indexable)
    write("sitemap.xml", f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n{urls}</urlset>\n')
    write("robots.txt", f"# {FIRM['legal_name']}\nUser-agent: *\nAllow: /\n\nSitemap: {SITE_URL}/sitemap.xml\n")
    write("site.webmanifest", json.dumps({
        "name": FIRM["legal_name"], "short_name": "Luật Sư Nam", "description": "Tư vấn pháp lý và tham gia tố tụng tại Thành phố Hồ Chí Minh.",
        "lang": "vi", "start_url": "./", "scope": "./", "display": "standalone",
        "background_color": "#041b2e", "theme_color": "#041b2e",
        "icons": [{"src": "assets/img/icon-192.png", "sizes": "192x192", "type": "image/png"},
                  {"src": "assets/img/icon-512.png", "sizes": "512x512", "type": "image/png"},
                  {"src": "assets/img/apple-touch-icon.png", "sizes": "180x180", "type": "image/png"}],
    }, ensure_ascii=False, indent=2) + "\n")

    # Chỉ mục tìm kiếm trong site
    index = []
    for p in indexable:
        if p.get("index_k", True):
            heads = re.findall(r"<h[23][^>]*>(.*?)</h[23]>", render_tokens(p["body"], p, ""), re.S)
            keys = " · ".join(strip_tags(h) for h in heads)[:600]
        else:
            keys = ""
        section = "Bộ luật Hình sự" if p["path"].startswith("bo-luat-hinh-su/") else \
            next((lbl for key, lbl, _, _ in NAV if key == p.get("section")), "")
        index.append({"t": p.get("search_title") or (p["crumbs"][-1][0] if p["path"] else FIRM["legal_name"]), "u": p["path"],
                      "d": p.get("search_desc") or p["description"], "s": section, "k": keys})
    for f in FAQ:
        index.append({"t": f["q"], "u": f"cau-hoi-thuong-gap/#{f['id']}", "d": strip_tags(f["a"][0].replace("{{root}}", ""))[:180],
                      "s": "Câu hỏi thường gặp", "k": ""})
    write("assets/search-index.json", json.dumps(index, ensure_ascii=False, separators=(",", ":")))

    print(f"Đã tạo {len(pages)} trang, sitemap {len(indexable)} URL.")


if __name__ == "__main__":
    main()
