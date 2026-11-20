# Đảo Đèn Lồng · Phase 3

Điều khiển Mây qua Đảo Bến, Đảo Cau và Đảo Chuông. Gom đom đóm và giữ đủ đèn sáng tới bình minh.

## Chạy game

Cần Node.js 20+ và trình duyệt hiện đại. Mở terminal trong thư mục chứa `serve.mjs`:

```bash
node serve.mjs
```

Mở http://127.0.0.1:8000 rồi chọn **Bắt đầu**. Dùng **WASD** hoặc phím mũi tên để di chuyển, kéo chuột hoặc **Q/Z** để xoay camera, **Space** để nhảy, **Shift** để lướt, **E** để nạp đèn, **F** để Tỏa Sáng và **Esc/P** để tạm dừng.

- Giữ ít nhất 3/5, 4/6 và 5/7 đèn sáng ở bình minh. Châm dầu bằng E. Đèn thắp mới cần 10 đom đóm, thắp lại cần 5.
- Bảng màu dễ phân biệt bật trong Cài đặt và được lưu. Đèn yếu nhấp nháy. Đèn tắt có thân xẹp và vết rách.
- Menu tạm dừng cho phép tiếp tục, chơi lại Đêm, chỉnh âm lượng và độ nhạy chuột hoặc về menu chính. Hai thanh cài đặt được lưu trong trình duyệt.

## Sáng tạo của tôi

Mây mặc áo dài hai tà, để tóc dài và cầm đèn lồng ở tay phải. Mô hình dựng bằng hình học 3D trong mã nguồn.

## Kiểm chứng

```bash
node --test
node headless.mjs --seed 42 --night 3 --ticks 18000 --out run.jsonl
```

`--night` nhận 1, 2 hoặc 3. Dùng thêm `--scenario file.json`, `--inputs file.json` và `--snapshot-every 10` để tái tạo ca. Xem [tiêu chí nghiệm thu và kết quả CP3](docs/phase-3.md).
