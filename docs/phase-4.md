# CP4 · Bình minh

| Mục | Kết quả |
|---|---|
| Regression | [19 ca chạy thành công](proof/cp4-tests.txt), gồm 16 ca CP3 và 3 ca CP4. Các ca ẩn của giảng viên chưa chạy. |
| Soak | [soak.json](../soak.json), 10 Đêm trong một tiến trình, 0 crash. RSS 35,125 lên 38 MiB, tăng 8,2%. |
| Benchmark | Đã triển khai cảnh chuẩn, lấy thời gian từng frame và thống kê. Test tự động kiểm 200 Bóng Mực, 100 đom đóm và ba đèn đầy dầu. Cảnh bench dùng cùng bộ vẽ game. Chưa có số FPS desktop. Chromium dừng khi tạo socket tiến trình trong môi trường shell. |
| Bảng xếp hạng | Test top 10, thứ tự đồng điểm, Unicode, đọc lại dữ liệu từ tiến trình khác và xuất JSON. |
| Accessibility | Đã triển khai đổi phím, ràng buộc trùng phím, phụ đề, chỉ hướng Bóng Mực, giảm chuyển động và chữ lớn. Cần xác nhận trực quan ở 1280×720. |
| Phát hành | Có ZIP chạy bằng Node, tag phase-4 và v1.0.0 cục bộ. GitHub Release cần repo và quyền GitHub. |
| Ảnh và demo | Chưa ghi được trực tiếp trong môi trường này. |

## Quyết định và giả định

- Benchmark dùng canvas 1280×720, camera bán kính ngang 30 m và cao 15 m. Khung đo tính từ ranh giới warmup đến hết khoảng yêu cầu, chỉ đếm cặp frame nằm trọn trong cửa sổ đo.
- Điểm leaderboard là tổng các Đêm thắng. Dữ liệu lưu trên máy chạy Node, nên CLI có thể xuất cùng bảng điểm với UI. Tên cho phép chữ cái Unicode, chữ số và dấu gạch dưới.
- Seed soak bắt đầu từ giá trị CLI, với chỉ số Đêm bắt đầu 0. Cờ Node jitless được chọn sau lần đo đầu tăng khoảng 31%. Đo hai mốc đều áp dụng cùng cấu hình.
