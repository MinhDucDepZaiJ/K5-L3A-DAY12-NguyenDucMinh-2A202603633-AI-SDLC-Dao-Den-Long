# CP2 · Ba hòn đảo

## Tiêu chí nghiệm thu

- Đêm 1–3 dùng địa hình, tọa độ và thông số của Ticket-02. Kịch bản CLI kiểm tọa độ, cầu, dốc, bục và gió.
- Gió Lạc đuổi khi đủ đom đóm, chỉ cướp một lần và thả lại khi trúng Pulse lúc chạy trốn.
- Bùa tăng tốc và bỏ hồi chiêu lượt trong 600 tick, rồi hồi sinh đúng lịch.
- Giao diện có menu, giới thiệu từng Đêm, kết quả, chơi lại, tổng điểm Bình Minh.
- Tạm dừng giữ nguyên thời gian mô phỏng. Menu tạm dừng có tiếp tục, chơi lại, cài đặt, về menu.
- Âm lượng và độ nhạy được lưu. Âm thanh báo sự kiện và gió hoạt động sau thao tác đầu tiên.
- HUD hiển thị tiến độ, đom đóm, hồi chiêu, nhắc nạp và chỉ hướng đèn ngoài màn hình. Bảng màu và ánh sáng theo ticket.
- Chạy lại kiểm tra CP1 với thông số chuẩn. Chạy đủ 21600 tick headless trong 30 giây, đo FPS ở 1280×720.

## Giả định

Gió đầu tiên bắt đầu tại giây 30. Tọa độ đom đóm dùng điểm sinh theo seed, góc tăng từ +X hướng +Z. Snapshot dùng giây cho hồi chiêu và TTL, TTL null cho đom đóm thường. Entity đặt qua scenario hoạt động ngay trừ khi chỉ định trạng thái.

## Kết quả

- [11 ca headless](proof/cp2-tests.txt) đạt. Các ca Phase 1 được chạy lại với thời lượng mới, tốc độ 6 m/s, chi phí 10 đom đóm, Pulse 3 đom đóm/đẩy 4 m và bất tử 90 tick. Snapshot tick 1 được tìm theo loại vì có thêm sự kiện night_start.
- [Chạy đủ thời lượng cả ba Đêm](proof/cp2-headless.txt) với scenario tắt quái và gió để giữ nhân vật sống đến bình minh. Mỗi lần dưới 1 s. Đêm 3 mặc định chạy hai lần cùng seed cho JSONL giống từng byte.
- [Mô phỏng giao diện](proof/cp2-ui-mock.txt) với đèn thắp sẵn kiểm tra tạm dừng, lưu âm lượng và tổng điểm qua ba Đêm. Đây là kiểm thử logic giao diện bằng DOM mô phỏng.
- Còn cần xác nhận FPS thực ở 1280×720, hình ảnh và âm thanh trong trình duyệt. Bộ test ẩn của giảng viên chưa chạy. Tag ở repo cục bộ, chưa push.

## Nhật ký AI

Codex chuyển ảnh Ticket-02 thành tiêu chí nghiệm thu, triển khai địa hình và gameplay trước khi nối giao diện, rồi kiểm tra bằng scenario CLI. Các test đầu tiên còn dùng thông số CP1 và được cập nhật theo giá trị chuẩn. Ghép logic và CLI dùng chung để giảm thao tác lặp. Phiên này chưa có thống kê token hoặc chi phí thực.
