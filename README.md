# LSN Law Firm – Công Ty Luật TNHH Luật Sư Nam

Website tĩnh nhiều trang (HTML, CSS, JavaScript thuần), dùng giao diện mới LSN Law Firm và nội dung chuyển từ website cũ [`willmichco/Website`](https://github.com/willmichco/Website).

- Xem trực tiếp: <https://willmichco.github.io/law_newsite/>
- Chỉ cần sửa nội dung trong `tools/data.py` và `src/`, sau đó chạy `python3 tools/build.py` để sinh lại toàn bộ trang.

## Sơ đồ website

| Đường dẫn | Trang | Dữ liệu có cấu trúc |
|---|---|---|
| `/` | Trang chủ | LegalService, WebSite |
| `/gioi-thieu/` | Giới thiệu, triết lý hành nghề, cam kết nghề nghiệp | AboutPage |
| `/doi-ngu-luat-su/` | Hồ sơ Luật sư Nam | ProfilePage, Person |
| `/vi-sao-chon-chung-toi/` | Bốn nguyên tắc làm việc | WebPage |
| `/quy-trinh-lam-viec/` | Quy trình 4 bước, hồ sơ cần chuẩn bị | WebPage |
| `/dich-vu/` | Tổng quan 8 lĩnh vực | CollectionPage, ItemList |
| `/dich-vu/<lĩnh-vực>/` | 8 trang dịch vụ: thừa kế, tranh tụng, hôn nhân gia đình, đất đai, lao động, hình sự, dân sự, công chứng | Service |
| `/kien-thuc-phap-ly/` | Danh mục bài viết và công cụ | CollectionPage, ItemList |
| `/kien-thuc-phap-ly/<bài-viết>/` | 3 bài viết pháp lý | Article |
| `/bo-luat-hinh-su/` | Từ điển Bộ luật Hình sự: cách tìm kiếm, các điều thường gặp theo chủ đề, cấu trúc Bộ luật | CollectionPage (about: Legislation) |
| `/bo-luat-hinh-su/chuong-<số>/` | 27 trang chương: danh sách điều kèm trích đoạn | CollectionPage |
| `/bo-luat-hinh-su/dieu-<số>/` | 428 trang điều luật: quy định, bình luận, điều liên quan, bản đồ tư duy | WebPage (about: Legislation) |
| `/cau-hoi-thuong-gap/` | 7 câu hỏi thường gặp | FAQPage |
| `/lien-he/` | Liên hệ, biểu mẫu, bản đồ | ContactPage |
| `/chinh-sach-bao-mat/`, `/dieu-khoan-su-dung/`, `/mien-tru-trach-nhiem/` | Văn bản pháp lý của website | WebPage |

Mọi trang có: `title` và `description` riêng, `canonical`, Open Graph, Twitter Card, breadcrumb hiển thị kèm `BreadcrumbList`. Đường dẫn giữ nguyên như website cũ để không mất thứ hạng khi chuyển tên miền.

## Liên kết nội bộ

- Menu có menu xổ cho **Giới thiệu**, **Lĩnh vực hoạt động** (8 lĩnh vực) và **Kiến thức pháp lý**.
- Mỗi trang dịch vụ liên kết tới 3 lĩnh vực liên quan (khai báo ở trường `related` trong `tools/data.py`), bài viết liên quan, quy trình làm việc và câu hỏi thường gặp.
- Mỗi bài viết có mục lục, liên kết trong nội dung tới trang dịch vụ, khung “Cần luật sư về…”, danh sách lĩnh vực liên quan và bài viết khác.
- Footer liên kết tới toàn bộ trang chính và 8 lĩnh vực.
- Tìm kiếm trong website (biểu tượng kính lúp) dùng chỉ mục `assets/search-index.json` do script sinh ra.

## Cấu trúc thư mục

```
tools/data.py              Thông tin pháp nhân, 8 lĩnh vực, bài viết, câu hỏi thường gặp
tools/build.py             Sinh toàn bộ trang, sitemap.xml, robots.txt, site.webmanifest, chỉ mục tìm kiếm
tools/build_blhs.py        Chuyển tệp Word bình luận BLHS thành dữ liệu tra cứu
tools/make_icons.py        Sinh logo, favicon, biểu tượng ứng dụng và ảnh chia sẻ (og-image) từ logo gốc
src/brand/logo-lsn.webp    Logo gốc (nền trong suốt)
src/pages/*.html           Nội dung các trang đơn lẻ (khối <!--meta {...} --> ở đầu là tiêu đề, mô tả)
src/bai-viet/*.html        Nội dung bài viết
src/bo-luat-hinh-su.html   Nội dung trang tra cứu BLHS
assets/css/style.css       Giao diện (biến màu, phông chữ ở :root)
assets/js/main.js          Menu, tìm kiếm, biểu mẫu (dòng đầu: WEB3FORMS_KEY), bản đồ
assets/fonts/              Be Vietnam Pro, phông sans-serif duy nhất của website (tự lưu trữ, SIL OFL 1.1)
assets/img/                Ảnh
bo-luat-hinh-su/           Trình đọc và dữ liệu Bộ luật Hình sự
```

Các tệp `index.html`, `404.html`, `sitemap.xml`, `robots.txt`, `site.webmanifest`, `assets/search-index.json` do `tools/build.py` sinh ra. **Không sửa trực tiếp các tệp này**, sửa nguồn rồi chạy lại script.

## Sửa nội dung thường gặp

| Muốn sửa | Sửa tại |
|---|---|
| Số điện thoại, email, địa chỉ, giờ làm việc | `FIRM` trong `tools/data.py` (và `CONTACT_*` đầu tệp `assets/js/main.js`) |
| Nội dung một lĩnh vực | Mục tương ứng trong `SERVICES` (`tools/data.py`) |
| Thêm bài viết | Thêm mục vào `ARTICLES`, tạo `src/bai-viet/<slug>.html`, thêm ảnh `assets/img/bai-viet/<slug>.webp` (720×240) |
| Câu hỏi thường gặp | `FAQ` trong `tools/data.py` |
| Hồ sơ luật sư | `src/pages/doi-ngu-luat-su.html` (xem ghi chú cho người quản trị trong tệp) |
| Tên miền | `SITE_URL`, `BASE_PATH` đầu tệp `tools/data.py` |
| Logo, favicon, ảnh chia sẻ | Thay `src/brand/logo-lsn.webp` (hoặc `assets/img/hero.webp`), chạy `pip install pillow fonttools brotli && python3 tools/make_icons.py` |
| Phông chữ | `--font-sans` (chữ thường), `--font-heading` (tiêu đề) ở `:root` trong `assets/css/style.css` |

```bash
python3 tools/build.py                 # sinh lại website
python3 -m http.server 8000            # xem thử tại http://localhost:8000
```

Cập nhật dữ liệu Bộ luật Hình sự: `pip install python-docx && python3 tools/build_blhs.py "Binh-luan-BLHS.docx" && python3 tools/build.py`.

### Từ điển Bộ luật Hình sự

Dải tiêu đề và ô tìm kiếm nằm ngay dưới thanh menu, chia cột trùng bố cục 3 cột bên dưới: tên từ điển thẳng cột mục lục, ô tìm kiếm bắt đầu thẳng cột nội dung và kết thúc thẳng nút “Đặt lịch tư vấn”.

Trang tổng quan `/bo-luat-hinh-su/` đi theo 3 cách tra cứu: (1) tìm kiếm, kèm ví dụ bấm thử; (2) các điều thường gặp, xếp theo chủ đề và dẫn tới chương; (3) cấu trúc Bộ luật theo phần, chương. Danh sách điều thường gặp khai báo ở `topics` trong `Renderer.hub` (`tools/blhs.py`).

Mỗi điều luật có trang riêng `/bo-luat-hinh-su/dieu-<số>/`, bố cục 3 cột:

- **Trái:** mục lục Phần → Chương → Mục → Điều. Trên điện thoại, mục lục mở dạng ngăn kéo qua nút “Mục lục”.
- **Giữa:**
  - Thanh chuyển Điều trước/sau, chọn chương, chọn điều.
  - Hộp “Quy định của luật”.
  - Các nút Lưu, In, Chia sẻ, Trích dẫn.
  - 5 tab: Bình luận khoa học, Góc nhìn Luật sư Nam, Bản án liên quan, Tình huống thực tiễn, Điều liên quan.
- **Phải:**
  - Tìm kiếm liên quan: thuật ngữ có thật trong văn bản điều luật.
  - Điều liên quan: từ các liên kết dẫn chiếu giữa các điều.
  - Bản đồ tư duy, sinh tự động theo nội dung điều luật:
    - điều có định nghĩa: các khái niệm được định nghĩa;
    - điều về tội danh: khung hình phạt theo từng khoản;
    - trường hợp còn lại: cấu trúc các khoản.
  - Văn bản liên quan.

Liên kết sâu:

| Mục đích | Dạng liên kết |
|---|---|
| Tới một khoản | `…/dieu-51/#k1` |
| Tới một điểm | `…/dieu-51/#k1-s` |
| Tìm kiếm | `…/bo-luat-hinh-su/?q=án treo` |

Liên kết cũ dạng `#d173` và `#tim=…` tự chuyển sang địa chỉ mới.

**Bổ sung nội dung các tab** Góc nhìn Luật sư Nam, Bản án liên quan, Tình huống thực tiễn:

1. Sao chép `src/blhs/_mau.html` thành `src/blhs/<số điều>.html`.
2. Điền nội dung.
3. Chạy lại `python3 tools/build.py`.

## Việc cần làm trước khi chạy chính thức

- [ ] **Bật GitHub Pages**: Settings → Pages → *Deploy from a branch* → `gh-pages` / `(root)`.
- [ ] **Kích hoạt biểu mẫu**: lấy Access Key miễn phí tại <https://web3forms.com> (nhập `luatsunam.hcm@gmail.com`), dán vào `WEB3FORMS_KEY` ở đầu `assets/js/main.js`. Khi chưa có key, biểu mẫu mở ứng dụng email của khách.
- [ ] **Luật sư phụ trách rà soát 3 bài viết** trong `src/bai-viet/` trước khi công bố chính thức.
- [ ] Bổ sung số Thẻ luật sư, Đoàn Luật sư tại trang Đội ngũ (chỉ công bố thông tin đã được luật sư đồng ý).
- [ ] Thay ảnh minh họa lấy từ bản mockup (`assets/img/hero.webp`, `assets/img/dich-vu/*`, `assets/img/bai-viet/*`) bằng ảnh thật độ phân giải cao; sau khi thay `hero.webp`, chạy lại `tools/make_icons.py` để cập nhật ảnh chia sẻ.
- [ ] Khi có tên miền riêng: sửa `SITE_URL`/`BASE_PATH`, chạy lại build, khai báo tên miền trong Settings → Pages, nộp `sitemap.xml` lên Google Search Console.
- [ ] Chuyển hướng hoặc đặt `noindex` cho website cũ (`willmichco.github.io/Website/`) để tránh trùng lặp nội dung với website mới.

> ⚖️ Khi sửa nội dung, không thêm cụm cam kết kết quả (“cam kết thắng kiện”…) và không đăng số liệu chưa kiểm chứng. Bộ Quy tắc Đạo đức và Ứng xử nghề nghiệp luật sư Việt Nam nghiêm cấm luật sư hứa hẹn bảo đảm kết quả vụ việc (Quy tắc 9.1.6).

## Triển khai

Mỗi lần push vào `main`, GitHub Actions (`.github/workflows/pages.yml`) xuất bản website sang nhánh `gh-pages` (bỏ qua `src/`, `tools/`, README).
