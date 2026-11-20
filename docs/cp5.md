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

## Video demo

[Video demo](demo/demo.mp4) gồm cảnh chơi thực do người dùng ghi trên Windows, sau đó là bảng tổng hợp kết quả kiểm thử, headless, soak và benchmark trước tối ưu. [Ảnh gameplay](demo/gameplay.png) được trích từ clip nguồn.

Còn chờ benchmark sau tối ưu trên máy Windows, GitHub Release và link LMS.
