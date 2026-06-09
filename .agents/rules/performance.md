# Rule: Tối ưu hóa Hiệu suất (Performance First)

Tiện ích mở rộng chạy chung luồng (thread) với trang web. Bất kỳ sự chậm trễ nào trong code sẽ làm trang web bị giật lag (laggy).

## Yêu cầu bắt buộc
1. **Debounce / Throttle:** `MutationObserver` có thể bị kích hoạt hàng chục, hàng trăm lần khi một quân cờ di chuyển (do animation). BẮT BUỘC phải dùng kỹ thuật Debounce (khoảng 50-200ms) trước khi xử lý DOM hoặc gọi hàm nặng.
2. **Web Workers:** KHÔNG BAO GIỜ chạy Stockfish.js hoặc các vòng lặp tính toán sâu (engine search) trên Main Thread. Phải đẩy chúng vào Web Worker (nếu dùng Offscreen Document) hoặc Background Service Worker.
3. **Quản lý bộ nhớ:** Khi không cần thiết, phải dọn dẹp các sự kiện, tắt Worker, tránh rò rỉ bộ nhớ (Memory Leak). Hạn chế tạo quá nhiều object mới trong vòng lặp của MutationObserver.
