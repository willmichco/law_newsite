# LSN LAW FIRM – Website

Khung website tĩnh (HTML/CSS/JS thuần, không cần build) cho Công ty Luật LSN, dựng theo bản thiết kế gốc và giữ nguyên bảng màu: navy, đỏ đô, vàng đồng và kem.

## Cấu trúc

```
index.html                 Trang chủ (toàn bộ các khối nội dung)
chinh-sach-bao-mat.html    Chính sách bảo vệ dữ liệu cá nhân và điều khoản sử dụng
assets/css/style.css       Toàn bộ giao diện; biến màu nằm trong :root
assets/js/main.js          Menu mobile, slider, đếm số, popup đặt lịch, form
assets/img/                Ảnh (đang dùng ảnh cắt từ bản thiết kế, cần thay ảnh thật)
.github/workflows/pages.yml  Tự động triển khai lên GitHub Pages khi push vào main
```

## Các khối trên trang chủ

1. Thanh thông tin (giờ làm việc, email, hotline, VI/EN)
2. Header cố định với menu, tìm kiếm và nút **Đặt lịch tư vấn**
3. Hero slider (2 slide) và băng "Pháp lý vững vàng"
4. Về chúng tôi và 3 giá trị cốt lõi
5. Lĩnh vực hoạt động (6 dịch vụ)
6. Vì sao chọn chúng tôi (số liệu có hiệu ứng đếm)
7. Đội ngũ luật sư
8. Bài viết nổi bật
9. Khối CTA
10. Liên hệ và form gửi yêu cầu (có ô đồng ý xử lý dữ liệu cá nhân)
11. Footer với thông tin giấy đăng ký hoạt động và miễn trừ trách nhiệm
12. Nút nổi Zalo, gọi điện, lên đầu trang; popup đặt lịch; ô tìm kiếm

## Việc cần hoàn thiện trước khi chạy chính thức

- [ ] Thay ảnh trong `assets/img/` bằng ảnh thật, độ phân giải cao. Ảnh hiện tại được cắt từ bản mockup nên hơi mờ. Kích thước khuyến nghị: hero 2400×1100, dịch vụ 800×400, luật sư 1200×600, bài viết 1200×400.
- [ ] Điền số **Giấy đăng ký hoạt động** do Sở Tư pháp cấp (footer).
- [ ] Xác minh địa chỉ theo địa giới hành chính mới sau sắp xếp đơn vị hành chính năm 2025 (hiện ghi "Phường Cửa Nam, TP. Hà Nội").
- [ ] Chuẩn bị tài liệu chứng minh cho các số liệu quảng cáo (10+ năm, 1.000+ hồ sơ, 98% hài lòng, 50+ đối tác), hoặc sửa lại cho đúng thực tế.
- [ ] Kết nối form tới backend, Formspree hoặc Google Apps Script (xem `TODO` trong `assets/js/main.js`).
- [ ] Gắn link Facebook, LinkedIn, YouTube, Zalo thật.
- [ ] Hoàn thiện nội dung `chinh-sach-bao-mat.html` theo hoạt động xử lý dữ liệu thực tế.
- [ ] Tách các trang con (chi tiết lĩnh vực, hồ sơ luật sư, bài viết, tuyển dụng) khi có nội dung.

## Chạy thử trên máy

```bash
python3 -m http.server 8000
# mở http://localhost:8000
```

## Triển khai

Mỗi lần push vào `main`, GitHub Actions sẽ xuất bản site sang nhánh `gh-pages`. Trong **Settings → Pages**, chọn *Deploy from a branch* → `gh-pages` / `root` (chỉ cần làm một lần).
