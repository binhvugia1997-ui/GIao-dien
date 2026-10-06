# Report Extractor — bản mẫu giao diện (prototype)

Bản mẫu React + Tailwind CSS dựng lại giao diện ứng dụng Windows **“Report Extractor” phiên bản 1.3.2 — Build 015**
(Python/Tkinter) để lập trình viên dùng làm mẫu khi dựng lại bằng Tkinter.

Ảnh mẫu phong cách: `KakaoTalk_20261006_094023879.png` (gốc trong repo).
Mã nguồn tham chiếu: <https://github.com/binhvugia1997-ui/TNP/tree/arena%2F01a10c02-tnp>.

## Chạy thử

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # kiểm tra kiểu + build tĩnh vào dist/
```

Yêu cầu Node 18+. Không có backend, không gọi API trả phí: toàn bộ dữ liệu là dữ liệu mẫu trong `src/data/mock.ts`.

## Ba tab (chỉ hiển thị một tab tại một thời điểm)

| Tab | Nội dung chính |
| --- | --- |
| **Danh sách báo cáo** | Nguồn dữ liệu (thư mục PPTX, file kiểm chứng, file kết quả, bộ lọc thời gian) · bảng báo cáo 65% + khung chi tiết 35% · xử lý · nhật ký gọn · thống kê · tiến độ · thao tác kết quả |
| **Cài đặt** | Kết nối Ollama · Tùy chọn xử lý · Cập nhật · Chẩn đoán · Nhật ký (menu dọc bên trái) |
| **Học cải tiến** | Tổng quan · Kiểm tra ảnh cải tiến · Kiểm tra nội dung cải tiến · Mô hình & dữ liệu |

Đầu ứng dụng hiển thị `Report Extractor — 1.3.2 — Build 015`. Không có thanh tiêu đề Windows, không có nút
thu nhỏ/phóng to/đóng, không có sidebar thay cho ba tab.

## Thao tác đã hoạt động trong bản demo

- Chuyển tab; chọn dòng trong bảng → cập nhật khung chi tiết; tìm kiếm; lọc trạng thái; Quét lại;
  Khôi phục; Xóa khỏi danh sách (chỉ rời hàng đợi, không xóa file nguồn).
- Mở hộp thoại **Xem ảnh lớn** (QPN), **Xem đầy đủ** (nguyên nhân, nội dung đối sách cải thiện),
  **Xem chi tiết** (ảnh Sau cải tiến).
- **Bắt đầu xử lý** / **Dừng sau file hiện tại** / tùy chọn *Xử lý lại báo cáo đã xử lý — ghi đè các trường tự động*
  (mặc định tắt); khi chạy, các thao tác thay đổi nguồn và hàng đợi bị vô hiệu hóa.
- Thống kê Hoàn thành / Cần kiểm tra / Lỗi / Bỏ qua và thanh tiến độ (% · file hiện tại · giai đoạn · đã chạy ·
  còn khoảng) tính từ cùng một nguồn dữ liệu với bảng → số liệu luôn khớp.
- Nhật ký xử lý thu gọn/mở rộng; nhật ký đầy đủ trong **Cài đặt → Nhật ký** (Xóa phần hiển thị không xóa file log).
- **Cài đặt → Kết nối Ollama**: kiểm tra kết nối, làm mới model, lưu cấu hình, tìm Ollama trong mạng LAN
  (Tìm / Dừng tìm / Xem kết quả, nút *Sử dụng server này* cho từng server tìm được), trạng thái heuristic khi
  Ollama không khả dụng.
- **Cài đặt → Cập nhật**: kiểm tra cập nhật, cập nhật ngay, tiến trình; **Chẩn đoán** chạy 4 mục kiểm tra.
- **Học cải tiến**: chọn nhãn xác nhận + ghi chú + lưu nhãn cho ảnh và cho vùng nội dung; *Cập nhật Excel từ nhãn
  đã lưu* mô phỏng đúng nhánh Excel bị khóa (nhãn vẫn lưu thành công, có nút **Thử lại**).

Thao tác xử lý PPTX, đọc/ghi Excel, Ollama và chọn thư mục chỉ là **mô phỏng** (có nhãn ghi rõ trong giao diện).

## Mô phỏng trạng thái

Tab **Danh sách báo cáo** có thẻ *Mô phỏng trạng thái* (chỉ tồn tại trong bản mẫu) để chuyển nhanh giữa:
chưa có dữ liệu · sẵn sàng · đang xử lý · đang chờ dừng · hoàn thành · cần kiểm tra · lỗi · bỏ qua.

## Bám theo quy tắc nghiệp vụ của ứng dụng gốc

- Vendor name và Ngày phát sinh để người dùng điền tay; chương trình không tự điền (ghi rõ trong khung chi tiết
  và tab Tùy chọn xử lý).
- QPN là ảnh gốc lấy từ report nguồn; ảnh cải tiến chỉ lấy ảnh “Sau cải tiến” thuộc phần CẢI TIẾN TRONG SẢN XUẤT.
- Nguyên nhân giữ nguyên văn; nội dung đối sách cải tiến sao chép đầy đủ và loại phần “Xử lý tạm thời”.
- Không ghi đè báo cáo nguồn hoặc file Excel mẫu.
- AI chỉ xác định **vị trí** nội dung; chương trình sao chép văn bản và ảnh gốc.

## Cấu trúc mã nguồn

```
src/
├─ App.tsx                    khung ứng dụng + điều hướng ba tab
├─ index.css                  lớp style dùng chung (card, field, btn, chip, bảng)
├─ types.ts                   trạng thái, nhãn, hằng số tiếng Việt (theo app/gui_controller.py)
├─ data/mock.ts               dữ liệu mẫu (báo cáo, nhật ký, server Ollama, ứng viên học)
├─ state/store.tsx            trạng thái dùng chung + mô phỏng pipeline/tiến độ/label
├─ components/
│  ├─ ui.tsx                  Card, Button, Field, Checkbox, ProgressBar, Modal, StatusChip…
│  ├─ AppHeader.tsx           tiêu đề + ba tab
│  ├─ PathPicker.tsx          hộp chọn đường dẫn mô phỏng
│  └─ report/                 SourcePanel, ReportTable, ReportDetail, ProcessingCard,
│                             LogAndStats, FooterBar, DemoStates
├─ tabs/ReportListTab.tsx     tab 1 — Danh sách báo cáo
├─ tabs/SettingsTab.tsx       tab 2 — Cài đặt
└─ tabs/LearningTab.tsx       tab 3 — Học cải tiến
public/mock/                  ảnh mẫu cho QPN, ảnh trước/sau cải tiến
```

Ghi chú kỹ thuật cho bản dựng Tkinter: màu và khoảng cách lấy từ `tailwind.config.js` + `src/index.css`,
bảng dùng chung một nguồn dữ liệu với thống kê và tiến độ, khung chi tiết 35% bên phải chỉ cập nhật khi đổi dòng
đang chọn, và mọi vùng nội dung dài đều cuộn được hoặc mở trong hộp thoại riêng.
