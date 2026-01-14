# Tài Liệu Nghiệp Vụ & Kỹ Thuật: Dự Án Quản Lý Chi Tiêu (ChiTieuApp)

Tài liệu này cung cấp cái nhìn chi tiết về toàn bộ logic nghiệp vụ, luồng xử lý dữ liệu và cấu trúc kỹ thuật của ứng dụng Quản lý chi tiêu nhóm.

---

## 1. Tổng Quan Hệ Thống
Ứng dụng được thiết kế nhằm mục đích minh bạch hóa tài chính cho các nhóm (gia đình, bạn bè, đồng nghiệp) sống chung hoặc đi du lịch cùng nhau. Điểm mạnh của hệ thống là khả năng tính toán nợ nần tự động và luồng xác nhận thanh toán chặt chẽ.

**Công nghệ cốt lõi:**
- **Frontend**: Next.js 14 (App Router), React, Tailwind CSS, Shadcn UI.
- **Backend**: API Routes (Next.js), Prisma ORM.
- **Database**: MariaDB / MySQL.
- **Xác thực**: JWT (JSON Web Token) lưu trong HttpOnly Cookie.

---

## 2. Logic Nghiệp Vụ Chi Tiết

### 2.1. Quản Lý Tài Khoản & Quyền Hạn
- **Đăng nhập (Login)**: Hệ thống sử dụng cơ chế đăng nhập tập trung. Tính năng đăng ký đã được khóa để đảm bảo chỉ những người dùng được cấp phép mới có thể truy cập.
- **Phân quyền (RBAC)**:
    - **ADMIN**: Có quyền quản lý Workspace, Sheet, Thành viên, xóa bất kỳ khoản chi nào và ghi đè trạng thái thanh toán.
    - **MEMBER**: Có quyền trong phạm vi Workspace của mình, tạo khoản chi, xác nhận thanh toán của chính mình hoặc các khoản mình chi hộ.

### 2.2. Tổ Chức Dữ Liệu: Workspace & Sheet
- **Workspace**: Đơn vị tổ chức cao nhất (Ví dụ: "Nhà chung", "Công ty"). Mỗi Workspace có danh sách thành viên và các cài đặt riêng.
- **Sheet (Bảng tính)**: Chia nhỏ quản lý theo tháng hoặc theo kỳ du lịch.
    - **Thùng rác (Recycle Bin)**: Các Sheet khi xóa sẽ rơi vào trạng thái `DELETED` (Soft delete), có thể khôi phục lại từ mục Thùng rác để tránh mất mát dữ liệu do lầm tưởng.
    - **Dữ liệu độc lập**: Mỗi Sheet có một tập hợp các khoản chi riêng, không ảnh hưởng đến số dư của Sheet khác.

### 2.3. Nghiệp Vụ Quản Lý Khoản Chi (Expenses)
Mỗi hóa đơn được tạo ra bao gồm: Người trả (`Payer`), Số tiền (`Amount`), Nội dung, Ngày tháng và Loại hình chi:
- **SHARED (Chia đều)**: Hệ thống tự động lấy tổng số tiền chia đều cho **tất cả** thành viên đang hoạt động trong Sheet.
- **PRIVATE (Chi riêng)**: Người dùng chủ động chọn những người thụ hưởng. Số tiền được chia đều cho danh sách những người được chọn.
- **Lưu vết**: Mỗi thay đổi (Tạo, Sửa, Xóa) đều được ghi lại trong Activity Log.

### 2.4. Luồng Vòng Đời Thanh Toán (Payment Lifecycle)
Đây là tính năng quan trọng nhất đảm bảo tính chính xác của sổ sách:
1. **Gửi yêu cầu (Mark as Paid - Debtor)**: Khi người nợ đã trả tiền, họ nhấn tích vào tên mình. Trạng thái chuyển sang **Chờ xác nhận (Pending)** - Biểu tượng đồng hồ màu cam.
2. **Xác nhận/Từ chối (Payer Action)**: 
    - Người chi tiền nhận được thông báo.
    - Người chi có quyền nhấn **Xác nhận** (nếu đã nhận tiền) hoặc **Từ chối** (nếu chưa nhận hoặc sai số tiền).
    - **Hộp thoại xác nhận**: Luôn hiển thị câu hỏi xác nhận trước khi thực hiện để tránh bấm nhầm.
3. **Khóa trạng thái (Immutability)**:
    - Một khi đã được người chi Xác nhận, trạng thái trở thành **Đã trả (Paid)** - Tích xanh.
    - **Người chi** không thể tùy tiện chuyển ngược lại thành "Chưa trả" (trừ khi làm admin) để đảm bảo tính minh bạch.
    - **Người nợ** được phép hoàn tác (revert) chính trạng thái của mình nếu họ phát hiện sai sót sau khi đã bấm xác nhận.

### 2.5. Trung Tâm Thông Báo (Notification Center)
Tích hợp ngay trên Header với hệ thống tab thông minh:
- **Cần xác nhận**: Những yêu cầu từ người khác đang đợi bạn phê duyệt (với tư cách người chi).
- **Đã gửi**: Những yêu cầu bạn đã gửi đi và đang đợi người khác xác nhận.
- **Lịch sử**: Lưu lại các giao dịch đã hoàn tất trong vòng 30 ngày gần nhất.
- **Real-time**: Số lượng yêu cầu chờ xử lý được cập nhật liên tục qua hiệu ứng chuông rung.

### 2.6. Thống Kê & Báo Cáo
- **Số dư tổng quát**: Hiển thị tổng chi, tiền lẻ cần thu về và nợ cần trả.
- **Ma trận nợ (Debt Matrix)**: Thuật toán tự động đối trừ các khoản nợ chéo. Kết quả cuối cùng hiển thị dưới dạng: "A nợ B bao nhiêu" một cách trực quan nhất.
- **Hoạt động gần đây (Activity Log)**: Luồng dữ liệu thời gian thực ghi lại mọi hành động: ai đã thêm bill, ai đã xác nhận tiền, ai đã xóa sheet...

---

## 3. Kiến Trúc Kỹ Thuật

### 3.1. Database Schema (Prisma)
- `User`: Thông tin đăng nhập, vai trò.
- `Workspace`: Nhóm làm việc.
- `Member`: Thành viên trong Workspace (hỗ trợ `status='DELETED'`).
- `Sheet`: Nhóm hóa đơn theo định kỳ.
- `Expense`: Thông tin hóa đơn gốc.
- `Split`: Chi tiết từng người nợ trong mỗi hóa đơn (Lưu trữ trạng thái `isPaid`, `isPending`, `paidAt`).
- `ActivityLog`: Nhật ký hành động.

### 3.2. Logic Tính Toán (Backend logic)
Toàn bộ việc tính toán nợ được thực hiện tại Backend khi lấy dữ liệu Sheet:
1. Lấy tất cả `Expense` và `Split` trong Sheet.
2. Với mỗi `Split`:
    - Nếu `isPaid=true`: Đã hoàn tất, không tính vào nợ hiện tại.
    - Nếu `isPaid=false`: Tính vào nợ của `memberId` dành cho `payerId`.
3. Đối trừ công nợ chéo giữa các cặp thành viên để tối giản hóa số lần chuyển tiền.

---

## 4. Giao Diện & Trải Nghiệm (UI/UX)
- **Thiết kế High-end**: Sử dụng tông màu Indigo làm chủ đạo, kết hợp các gradient mượt mà và bo góc hiện đại.
- **Tương tác**: Các hiệu ứng hover (bóng đổ, scale), micro-animations (chuông rung, badge đập theo nhịp) tạo cảm giác ứng dụng "sống".
- **Typo**: Đồng nhất sử dụng font **Inter** cho toàn hệ thống để đảm bảo sự chuyên nghiệp và dễ đọc.
- **Responsive**: Tương thích hoàn toàn trên Mobile và Desktop.

---

## 5. Danh Mục File Quan Trọng

| Module | File Component (Frontend) | File API (Backend) |
| :--- | :--- | :--- |
| **Hóa đơn** | `Forms/AddBillForm.tsx` | `api/expenses/route.ts` |
| **Xác nhận nợ** | `Dashboard/HistoryTable.tsx` | `api/payments/confirm/route.ts` |
| **Thông báo** | `Dashboard/ConfirmationModal.tsx`| `api/notifications/route.ts` |
| **Nhật ký** | `Dashboard/ActivityLogList.tsx` | `api/activities/route.ts` |
| **Số dư** | `Dashboard/PrivateMatrix.tsx` | `api/sheets/[id]/route.ts` |
| **Database** | `prisma/schema.prisma` | - |

---

## 6. Hướng Dẫn Kỹ Thuật (How-to)

### 6.1. Lấy Site Key & Secret Key cho Cloudflare Turnstile
Để tính năng chặn spam hoạt động, bạn cần đăng ký 2 key này từ Cloudflare:

1. **Truy cập**: [Cloudflare Dashboard](https://dash.cloudflare.com/) > chọn **Turnstile** (ở menu bên trái).
2. **Add Site**:
    - **Site Name**: Điền tên nhận diện (VD: *ChiTieu App*).
    - **Domain**: Điền domain của bạn (VD: `s1006.phongdinh.info.vn`) và thêm cả `localhost` để test.
    - **Widget Mode**: Chọn **Managed** (Khuyên dùng - Tự động check, ít khi bắt user click).
3. **Hoàn tất**: Nhấn **Create**.
4. **Lấy Key**:
    - Copy **Site Key** → Dán vào `.env`: `NEXT_PUBLIC_TURNSTILE_SITE_KEY=...`
    - Copy **Secret Key** → Dán vào `.env`: `TURNSTILE_SECRET_KEY=...`
