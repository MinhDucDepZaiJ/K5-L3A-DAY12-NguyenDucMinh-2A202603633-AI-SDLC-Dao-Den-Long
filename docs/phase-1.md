# CP1 · PRD-0

## Kế hoạch kiểm chứng

- CLI: kiểm tick 0, tọa độ theo yaw, input giữ trạng thái, cạnh lên, dữ liệu sai và JSONL tất định.
- Gameplay: dùng scenario để kiểm nhặt, nạp đèn, stun, sát thương, vùng an toàn, thắng và thua.
- Trình duyệt: kiểm HUD, điều khiển và chơi lại trong bản 3D.
- Clone sạch, chạy lệnh build và kiểm tra toàn bộ test.

## Giả định

Đảo bán kính 34 m và chặn ở mép. Tương tác chọn đèn chưa sáng gần nhất, chuyển tối đa số đom đóm còn thiếu. Đom đóm nhặt tự động theo XZ. Đèn đã sáng tạo vùng an toàn. Bóng Mực xuất hiện theo thời gian và đuổi Mây. Nhảy là chuyển động thẳng đứng. Điểm thưởng thời gian nguyên và lửa còn lại được cộng khi thắng. Tham số nằm trong game.contract.json.

## Nhật ký AI

Codex đọc PRD/contract, xây logic dùng chung rồi kiểm với test tự tạo. Dùng JSON cấu hình chung để tránh lặp số giữa headless và UI. Giao diện phiên này chưa cung cấp số token hoặc chi phí thực tế.

## Kết quả

| Kiểm chứng | Kết quả |
|---|---|
| Node headless, CP0 | Smoke test chạy thành công trong môi trường local. Chưa tạo repo public hoặc kiểm tra trợ giảng bằng tài khoản. |
| Clone sạch, build và test | 5/5 test đạt. Xem [log](proof/cp1-tests.txt). |
| Chạy lặp seed 42, 600 tick | JSONL giống từng byte. Xem [hash](proof/cp1-determinism.txt) và [output](proof/cp1-seed42.jsonl). |
| HTTP bản giao diện | Trang, cấu hình và các module trả về thành công. Chưa chơi thử và xác nhận đồ họa/điều khiển trong trình duyệt. |
| Git | Có tag phase-1 cục bộ. Chưa push GitHub. |
| CP2–CP4 | Ticket-02–04 bị khóa trên lab board tại thời điểm kiểm tra. |
| CP5 | Chờ bản phát hành để quay demo và hoàn tất nộp. |
