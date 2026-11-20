# CP5 · Hồ sơ nộp

- [Đánh giá và retro](retro.md).
- [Benchmark gốc trên Windows / Edge](proof/bench-edge-baseline.json). FPS trung bình 45,43, 1% low 14,51 và tải 2.621 ms. Đây là số đo trước tối ưu, ghi nhận chưa đạt hai ngưỡng FPS.
- [Đối chiếu mô phỏng trước và sau tối ưu](proof/cp5-simulation-parity.txt). Cảnh bench và cả ba Đêm phát cùng sự kiện và snapshot trong 1.980 tick kiểm tra.
- [Soak CP4](../soak.json) và [ghi chú CP4](phase-4.md). Bản cập nhật cần đo lại trên cùng máy để so sánh FPS.
- Git bundle chứa lịch sử và các tag cục bộ. GitHub Release và link nộp LMS chưa có vì chưa có remote được ủy quyền.

## Đo lại trên Windows

```powershell
node --test
node bench.mjs --seed 42 --duration 30 --out bench.json
node --jitless --expose-gc soak.mjs --seed 7 --nights 10 --out soak.json
```

## Thứ tự quay demo dưới 5 phút

1. Mở menu và vào Đêm 1. Quay đoạn nhặt đom đóm, tạm dừng rồi tiếp tục.
2. Nếu có đủ đom đóm, thắp một đèn. Quay vòng an toàn và HUD.
3. Chạy test, mở kết quả bench và báo cáo soak. Hiện cả số đo đạt lẫn số đo chưa đạt.
4. Cho thấy Contract v1.3 và các tag. Nếu Sinh tồn đã mở khóa, quay vài giây ở cuối.

Video và ảnh README chưa được ghi lại. Dùng video thật từ lần chơi trên bản nộp.
