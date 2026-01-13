# Tài Liệu Dự Án: Quản Lý Chi Tiêu (ChiTieuApp)

## 1. Tổng Quan
Ứng dụng web giúp quản lý chi tiêu nhóm, tính toán nợ nần tự động và minh bạch hóa tài chính giữa các thành viên.

**Công nghệ sử dụng:**
-   **Frontend**: Next.js 14 (App Router), React, Shadcn UI, Tailwind CSS.
-   **Backend**: Next.js API Routes.
-   **Database**: MariaDB (via Prisma ORM).
-   **Helper**: Lucide React (Icons), Date-fns (Date manipulations).

## 2. Cấu Trúc Dự Án

### Các thư mục chính
-   `src/app`: Chứa các pages và routing của Next.js.
    -   `page.tsx`: Màn hình Dashboard chính.
    -   `layout.tsx`: Layout chung (Font, Metadata).
    -   `globals.css`: Tailwind directives & CSS biến (colors).
    -   `api/`: Các endpoint API xử lý logic backend.
-   `src/components`: Các UI component.
    -   `Dashboard/`: Các component nghiệp vụ chính (Bảng, Form, Biểu đồ).
    -   `Forms/`: Các torm nhập liệu (Thêm bill).
    -   `Layout/`: Header, Footer.
    -   `ui/`: Các component cơ sở của Shadcn (Button, Card, Input...).
-   `src/lib`: Các hàm tiện ích (utils, prisma client).
-   `prisma/`: Schema cơ sở dữ liệu và seed data.

## 3. Logic & Nghiệp Vụ Chính

### 3.1. Quản Lý Chi Tiêu (Expenses) -> `src/app/api/expenses`
-   **Mô hình**: Mỗi khoản chi (`Expense`) có:
    -   `payerId`: Người trả tiền.
    -   `amount`: Số tiền.
    -   `type`: `SHARED` (Chia đều) hoặc `PRIVATE` (Chi riêng).
    -   `splits`: Danh sách người thụ hưởng (nếu là `PRIVATE` thì chỉ những người được chọn, nếu `SHARED` thì tất cả member trong Sheet).
-   **File xử lý chính**:
    -   Backend: `src/app/api/expenses/route.ts` (Tạo/Lấy danh sách).
    -   Frontend: `src/components/Forms/AddBillForm.tsx` (Form thêm mới).

### 3.2. Tính Toán Nợ (Debt Calculation)
Đây là logic phức tạp nhất, chuyển đổi từ danh sách chi tiêu sang "Ai nợ ai bao nhiêu".

-   **Logic**:
    1.  Duyệt qua từng hóa đơn (`Expense`).
    2.  Nếu là `SHARED`:
        -   Số tiền mỗi beneficiary phải chịu = `amount` / `total_members`.
        -   Ghi nợ: Mỗi beneficiary nợ Payer số tiền này.
    3.  Nếu là `PRIVATE`:
        -   Số tiền mỗi beneficiary phải chịu = `amount` / `selected_beneficiaries_count`.
        -   Ghi nợ: Những người được chọn nợ Payer số tiền này.
    4.  Cộng dồn tất cả các khoản nợ giữa cặp (A, B) để ra con số cuối cùng (Net Debt).

-   **File hiển thị**:
    -   `src/components/Dashboard/PrivateMatrix.tsx`: Hiển thị ma trận chi tiết "Chi hộ".
        -   **Dòng (Row)**: Người nợ.
        -   **Cột (Column)**: Người được trả.
        -   **Ô (Cell)**: Số tiền cụ thể cần trả.
    -   `src/components/Dashboard/SummaryTable.tsx`: Bảng tổng kết số dư.
        -   Hiển thị ai đang Dương tiền (đã chi nhiều hơn mức phải đóng) và ai Âm tiền (cần đóng thêm).

### 3.3. Quản Lý Sheet (Tháng/Kỳ) -> `src/components/Dashboard/SheetSelector.tsx`
-   Hệ thống chia theo `Sheet` (ví dụ: "Tháng 1/2026", "Đi Du Lịch Đà Lạt").
-   Mỗi Sheet hoạt động độc lập với danh sách thành viên và hóa đơn riêng.

### 3.4. Xác Thực (Authentication)
-   **Middleware**: `src/middleware.ts` chặn truy cập nếu chưa có Token.
-   **Login**: `src/app/login/page.tsx`.
-   **API Auth**: `src/app/api/auth/*`.

## 4. Đường Dẫn File Cụ Thể (Key Files)

| Chức năng | File Component (Frontend) | File API (Backend) |
| :--- | :--- | :--- |
| **Trang chủ** | `src/app/page.tsx` | - |
| **Thêm Hóa Đơn** | `src/components/Forms/AddBillForm.tsx` | `src/app/api/expenses/route.ts` |
| **Hiện Lịch Sử** | `src/components/Dashboard/HistoryTable.tsx` | `src/app/api/sheets/[id]/route.ts` |
| **Ma Trận Nợ** | `src/components/Dashboard/PrivateMatrix.tsx` | (Tính toán tại `src/app/api/sheets/[id]/route.ts`) |
| **Bảng Tổng Kết**| `src/components/Dashboard/SummaryTable.tsx` | (Tính toán tại `src/app/api/sheets/[id]/route.ts`) |
| **Quản Lý User** | `src/components/Dashboard/MemberManager.tsx` | `src/app/api/members/route.ts` |
| **Database** | `prisma/schema.prisma` | - |
