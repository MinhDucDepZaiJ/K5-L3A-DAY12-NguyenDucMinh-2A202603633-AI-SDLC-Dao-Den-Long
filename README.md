# Đảo Đèn Lồng · Phase 2

Điều khiển Mây qua Đảo Bến, Đảo Cau và Đảo Chuông. Gom đom đóm, thắp đủ đèn rồi sang Đêm tiếp theo.

## Chạy game

Cần Node.js 20+ và trình duyệt hiện đại. Mở terminal trong thư mục chứa `serve.mjs`:

```bash
node serve.mjs
```

Mở http://127.0.0.1:8000 rồi chọn **Bắt đầu**. Dùng **WASD** hoặc phím mũi tên để di chuyển, kéo chuột hoặc **Q/Z** để xoay camera, **Space** để nhảy, **Shift** để lướt, **E** để nạp đèn, **F** để Tỏa Sáng và **Esc/P** để tạm dừng.

- Mỗi đèn cần 10 đom đóm. Bùa Gió tăng tốc và bỏ hồi chiêu lướt trong 10 giây.
- Mỗi đom đóm nạp cộng 10 điểm, mỗi đèn sáng cộng 100 điểm, mỗi Bóng Mực trúng Tỏa Sáng cộng 5 điểm. Khi thắng, cộng 2 điểm mỗi giây nguyên còn lại và 50 điểm mỗi Ngọn Lửa còn lại. Bình Minh tổng hợp điểm ba Đêm đã thắng.
- Menu tạm dừng cho phép tiếp tục, chơi lại Đêm, chỉnh âm lượng và độ nhạy chuột hoặc về menu chính. Hai thanh cài đặt được lưu trong trình duyệt.

## Sáng tạo của tôi

Mây mặc áo dài hai tà, để tóc dài và cầm đèn lồng ở tay phải. Mô hình dựng bằng hình học 3D trong mã nguồn.

## Kiểm chứng

```bash
node --test
node headless.mjs --seed 42 --night 3 --ticks 21600 --out run.jsonl
```

`--night` nhận 1, 2 hoặc 3. Dùng thêm `--scenario file.json`, `--inputs file.json` và `--snapshot-every 10` để tái tạo ca. Xem [tiêu chí nghiệm thu và kết quả CP2](docs/phase-2.md).
