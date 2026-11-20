# CP3 · Đèn cạn dầu

## Tiêu chí nghiệm thu

- Dầu giảm đúng theo tick. Đèn hết dầu tắt, châm dầu và thắp lại theo chi phí Ticket-03.
- Bóng Mực đi tới đèn yếu, hút cộng dồn, đổi trạng thái đúng điều kiện. Vùng an toàn trở lại ở ngưỡng 30.
- Chỉ thắng lúc bình minh nếu còn sống và đủ số đèn. Kiểm điểm, sức chứa và thứ tự ưu tiên hết lửa.
- CLI xuất Contract v1.2. Chạy test hồi quy của CP2 và ca mới cho các luật thay thế.
- Giao diện hiển thị dầu, đèn xẹp khi tắt, cảnh báo đèn yếu và lưu bảng màu dễ phân biệt.

## Quyết định thiết kế

Dầu được lưu bằng số nguyên theo đơn vị 1/60. Giảm dầu theo sim_tick trước khi di chuyển và tương tác. Đèn nhớ từng được thắp để chọn chi phí. Thắng được xét sau mọi cập nhật của tick bình minh. fuel_drain ghi sau mỗi 60 tick hút liên tục của từng Bóng Mực. Khoảng cách tương tác dùng XZ như CP2.

## Kết quả

- [16 ca headless](proof/cp3-tests.txt) đạt. Ca hồi quy thay đổi kỳ vọng theo thời lượng, công thức điểm và thời điểm thắng mới.
- [Ba Đêm chạy đủ thời lượng](proof/cp3-headless.txt) và lặp cùng seed cho đầu ra giống hệt. Scenario đo tắt quái và gió để chạy đến bình minh.
- Giao diện đã qua kiểm tra cú pháp JavaScript. Chưa kiểm tra trực quan trong trình duyệt hoặc chạy test ẩn của giảng viên.
