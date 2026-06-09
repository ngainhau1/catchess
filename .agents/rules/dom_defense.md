# Rule: Phòng thủ DOM (Defensive DOM Parsing)

Môi trường web (đặc biệt là Chess.com) thay đổi DOM liên tục (obfuscated class names, thay đổi cấu trúc thẻ HTML). 

## Yêu cầu bắt buộc
1. KHÔNG sử dụng các selector quá cụ thể hoặc phụ thuộc vào cấu trúc DOM sâu (ví dụ: `div > div:nth-child(2) > span`).
2. Ưu tiên sử dụng Regex để trích xuất class name chứa dữ liệu (ví dụ tìm class khớp `/square-\d{2}/` hoặc `/piece (w|b)(p|n|b|r|q|k)/`).
3. Luôn sử dụng `try-catch` và kiểm tra `null` khi dùng `querySelector` hoặc duyệt qua `NodeList`.
4. Nếu không tìm thấy element, phải có cơ chế retry bằng `setTimeout` hoặc `MutationObserver`, không được quăng (throw) lỗi làm crash toàn bộ extension.
