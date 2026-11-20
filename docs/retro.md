# Retro Day 12

## Kết quả qua bốn phase

| Phase | Kết quả và điều chỉnh |
|---|---|
| 1 | Chạy được mô phỏng với 5 ca tự động và JSONL tất định. Lần chạy trên PowerShell phát hiện test phụ thuộc thư mục hiện tại. Đường dẫn script trong test đã đổi sang đường dẫn tương đối theo module. |
| 2 | Chuẩn hóa bản đồ, mở rộng ba Đêm và tăng lên 11 ca. Test hồi quy bắt được các kỳ vọng về vận tốc, chi phí đèn và nhịp bất tử còn dùng số cũ. |
| 3 | Đổi sang giữ đèn tới bình minh. 16 ca kiểm hao dầu, hút dầu, châm và thắp lại, điểm và thứ tự xử lý tick cuối. |
| 4 | 19 ca đạt. Soak 10 Đêm có 0 crash với cấu hình phát hành. Video và ảnh gameplay được bổ sung ở CP5. Còn chờ số FPS sau tối ưu. |

## Làm việc với AI

Dùng cùng một module mô phỏng ở CLI và giao diện giúp viết kịch bản nhỏ trước khi chạy kiểm tra lớn. JSONL và mốc tick cho phép đối chiếu lỗi thứ tự sự kiện. AGENTS.md hữu ích nhất ở những điểm dễ quên, đặc biệt là phân biệt tick ngoài với sim_tick, và làm tròn dầu ở đầu ra. Test hồi quy đã bắt kỳ vọng lỗi thời sau thay đổi luật.

UI mô phỏng đã giúp xác nhận luồng ba Đêm, nhưng bỏ sót các vấn đề chỉ thấy trong trình duyệt. Lần đo soak ban đầu cho thấy mức RSS tăng vượt ngưỡng. Đo lại với Node jitless cho RSS ổn định hơn. Benchmark trình duyệt hiện thiếu số đo và chưa thể kết luận đạt ngưỡng FPS.

Phiên làm việc chưa cung cấp tổng số token hoặc chi phí AI. Các cách tiết kiệm đã dùng gồm tái sử dụng mô phỏng, chỉ đọc phần code cần sửa và dùng kịch bản tối giản để chẩn đoán.

Nếu làm lại, mình sẽ thiết lập đường đo desktop từ CP1, chạy trên Windows và Linux sớm, và ghi ảnh hoặc clip ngay khi kiểm tra bản chơi đầu tiên.
