# CatChess Agents Configuration

Thư mục này (`.agents`) chứa toàn bộ cấu hình, luật lệ, vai trò và quy trình làm việc (workflows) dành cho các AI Agent (như Claude, Cursor, Copilot) tham gia phát triển dự án CatChess.

## Cấu trúc thư mục:
- `checklists/`: Các danh sách kiểm tra (vd: kiểm tra trước khi release, kiểm tra bảo mật CSP).
- `decisions/`: Ghi lại các quyết định kiến trúc (ADR - Architecture Decision Records).
- `research/`: Chứa các tài liệu nghiên cứu (vd: cách vượt qua CSP của Chess.com).
- `roles/`: Định nghĩa vai trò của AI (vd: Extension Developer, Chess Engine Expert).
- `rules/`: Các luật lệ cốt lõi (DOM parsing, performance, code style).
- `specs/`: Đặc tả kỹ thuật (yêu cầu hệ thống, luồng dữ liệu).
- `templates/`: Các mẫu (template) cho PR, Issue, hoặc file code mới.
- `workflows/`: Các quy trình xử lý công việc từng bước.

Việc chia nhỏ giúp AI đọc ngữ cảnh chính xác hơn khi được yêu cầu xử lý một module cụ thể.
