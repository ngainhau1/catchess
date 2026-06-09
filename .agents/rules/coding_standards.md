# Rule: Công nghệ & Cú pháp

Định hướng phong cách viết code cho toàn bộ dự án:

1. **Công nghệ:** Chỉ sử dụng Vanilla JavaScript (ES6+). KHÔNG dùng React, Vue hay jQuery. Tiện ích phải nhẹ nhất có thể.
2. **Giao tiếp Asynchronous:** Môi trường Extension bị cô lập giữa Content Scripts và Background Workers. Mọi luồng giao tiếp phải sử dụng `chrome.runtime.sendMessage` và `chrome.runtime.onMessage.addListener`.
3. **Promise & Async/Await:** Luôn bọc các lệnh gọi message bất đồng bộ bằng Promise hoặc Async/Await để code dễ đọc.
4. **Tài liệu (Documentation):** Viết JSDoc chi tiết trên đầu các hàm cốt lõi. Giải thích đầu vào (params) và đầu ra (returns), ví dụ `/** @param {string} fen - Chuỗi trạng thái cờ */`.
5. **Log & Debug:** Sử dụng biến môi trường hoặc hằng số (vd: `const DEBUG = true`) để bọc các lệnh `console.log()`. Không để rác log trong code Production.
