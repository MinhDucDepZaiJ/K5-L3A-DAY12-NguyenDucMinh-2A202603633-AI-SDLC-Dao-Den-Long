# Đảo Đèn Lồng · Phase 1

Điều khiển Mây trên Đảo Bến, thu đom đóm và nạp đủ ánh sáng vào năm Đèn Lồng Lớn.

## Chạy

Cần Node.js 20+ và trình duyệt hiện đại. Trong thư mục dự án chạy:

```bash
node serve.mjs
```

Mở http://127.0.0.1:8000. Dùng WASD/phím mũi tên để đi, Q/Z xoay góc nhìn, Space nhảy, E nạp đèn và F tỏa sáng.

Mỗi đom đóm nhặt được cộng 10 điểm, đèn sáng cộng 100 điểm, mỗi Bóng Mực bị choáng cộng 25 điểm. Khi thắng, mỗi giây nguyên còn lại cộng 2 điểm và mỗi lửa còn lại cộng 50 điểm. Mép đảo chặn người chơi. Bị chạm mất lửa nhưng không rơi đom đóm.

## Kiểm chứng

```bash
node --test
node headless.mjs --seed 42 --night 1 --ticks 600 --out run.jsonl
```

Dùng thêm `--scenario file.json`, `--inputs file.json` và `--snapshot-every 10` để tái tạo ca cụ thể. Xem kế hoạch, giả định và kết quả trong [docs/phase-1.md](docs/phase-1.md).
