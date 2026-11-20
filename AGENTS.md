# Đảo Đèn Lồng
Đọc PRD hoặc ticket đã phát hành và ghi tiêu chí nghiệm thu trước khi sửa.
Giữ logic 60 Hz trong game.mjs và dùng lại ở trình duyệt lẫn CLI.
Chạy node --test trước khi gắn tag. Lưu log thật, ghi rõ test chưa chạy.

Phase 2 dùng Contract v1.1. Đọc docs/phase-2.md trước khi đổi mô phỏng.
Giữ thứ tự xử lý trong game.step và dùng sim_tick cho gameplay. Tick ngoài vẫn tăng khi CLI tạm dừng.
Tọa độ chuẩn đặt trong world.mjs. Chạy node --test và smoke cả ba giá trị --night trước khi phát hành.

Phase 3 dùng Contract v1.2. Xem docs/phase-3.md và CHANGELOG.md.
Xử lý hao dầu và hút dầu trước tương tác, kiểm kết quả bình minh cuối tick. Không làm tròn dầu nội bộ.

Phase 4 dùng Contract v1.3. Chạy node --test và lệnh soak_cmd được khai báo.
Ghi số benchmark thực, nêu cấu hình đo và không dùng cảnh gameplay tùy chỉnh để đo.
