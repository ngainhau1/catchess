# Rule: Kiến trúc Tách biệt (Separation of Concerns)

Code phải được chia nhỏ thành các module có chức năng riêng biệt rõ ràng. Không trộn lẫn logic đọc DOM, logic cờ vua và logic vẽ giao diện vào cùng một file.

## Các module lõi
1. `scraper.js`: Chỉ làm một nhiệm vụ duy nhất là ĐỌC trạng thái từ DOM (Chess.com) và dịch nó sang chuỗi chuẩn (FEN/PGN). Không xử lý engine, không vẽ giao diện.
2. `engine.js` (hoặc `offscreen.js` / `background.js`): Chỉ nhận chuỗi FEN, gọi Stockfish WebAssembly, cấu hình depth/MultiPV, và nhận kết quả `bestmove` trả về.
3. `ui.js`: Chỉ làm nhiệm vụ VẼ (render) mũi tên hoặc overlay SVG lên bàn cờ. Không tự ý parse DOM để lấy dữ liệu, chỉ nhận lệnh từ module khác (ví dụ qua `chrome.runtime.onMessage`).

Sự tách biệt này giúp dễ dàng test từng module độc lập (ví dụ: test UI bằng cách gửi dữ liệu giả mạo từ console).
