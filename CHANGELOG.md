# Changelog

## Phase 3 · Ticket-03

- Contract v1.2 thêm dầu, lịch sử thắp, sức chứa và trạng thái drain. Scenario cho phép đặt dầu, số lần thắp và mục tiêu của Bóng Mực.
- Đèn sáng hao dầu, nhận thêm đom đóm và có thể tắt. Thắp lại cần 5 đom đóm. Chỉ đèn còn ít nhất 30 dầu tạo vùng an toàn.
- Thời lượng mới là 240/270/300 giây. Chỉ thắng ở bình minh với 3/4/5 đèn sáng tương ứng. Lý do all_lit được thay bằng dawn_survived.
- Điểm nạp giảm xuống 5 mỗi đom đóm. Thắp lại, ngăn hút dầu và dầu còn lại có điểm riêng. Bỏ thưởng giây còn lại.
- Hồi quy cũ được cập nhật thời lượng, điểm, thời điểm thắng. Các test CP2 về pause, lướt, rơi, bục, bùa, gió và Gió Lạc vẫn được chạy.

## Phase 4 · v1.0.0

- Contract v1.3 thêm lệnh benchmark và soak.
- Bảng xếp hạng cục bộ top 10, hỗ trợ tên tiếng Việt và xuất JSON.
- Đổi phím, phụ đề thông tin, giảm chuyển động và chữ lớn.

## Phase 2

- Chuỗi ba Đêm, địa hình chuẩn, lướt, Bùa Gió, Gió Lạc và tạm dừng.
- Contract v1.1, thêm dữ liệu headless và cập nhật thông số.

## Phase 1

- Đêm 1, game 3D và CLI headless Contract v1.0.
- Thu đom đóm, thắp đèn, Tỏa Sáng, Bóng Mực và vòng chơi thử lại.
