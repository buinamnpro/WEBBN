# 📊 LMS Questions Dashboard

Ứng dụng web hiển thị real-time các câu hỏi từ hệ thống LMS, kết nối với Supabase để lưu trữ và đồng bộ dữ liệu.

## ✨ Tính năng chính

- 🔄 **Real-time Updates:** Hiển thị câu hỏi mới ngay lập tức từ Supabase
- 🔔 **Thông báo:** Popup và âm thanh khi có câu hỏi mới
- 🔁 **Auto-refresh:** Tự động làm mới dữ liệu mỗi 30 giây
- 📱 **Responsive Design:** Tối ưu cho cả mobile và desktop
- 🎨 **Modern UI:** Giao diện đẹp với glassmorphism effect
- ⚡ **Performance:** Tải nhanh, mượt mà

## 📋 Yêu cầu hệ thống

- Trình duyệt hiện đại (Chrome, Firefox, Edge, Safari)
- Kết nối Internet để truy cập Supabase
- Chrome Extension `lms-supabase-extension` (tùy chọn)

## 🚀 Cài đặt và Sử dụng

### Cách 1: Chạy trực tiếp

1. Clone hoặc download repository này
2. Mở file `dist/index.html` trong trình duyệt
3. Đảm bảo đã cấu hình Supabase (xem phần Cấu hình)

### Cách 2: Deploy lên hosting

Xem phần [Deployment](#-deployment) bên dưới.

### Sử dụng với Chrome Extension

1. Cài đặt extension `lms-supabase-extension`
2. Mở trang LMS trong trình duyệt
3. Nhấn `Ctrl + ↑` để gửi câu hỏi lên Supabase
4. Dashboard sẽ tự động hiển thị câu hỏi mới

## 📁 Cấu trúc dự án

```
lms-dashboard/
├── dist/                    # Thư mục build/deploy
│   ├── index.html          # Trang chính
│   ├── style.css           # Stylesheet
│   ├── script.js           # Logic chính
│   ├── version.js          # Version info
│   ├── random-fix.js       # Utility scripts
│   └── data/               # Dữ liệu CSV
│       ├── HSK1.csv
│       ├── HSK2.csv
│       ├── HSK3.csv
│       └── ...
├── firebase.json           # Firebase config (nếu dùng Firebase)
└── README.md              # Tài liệu này
```

## 🔧 Cấu hình

### 1. Cấu hình Supabase

Tạo bảng `lms_questions` trong Supabase với cấu trúc sau:

```sql
CREATE TABLE lms_questions (
    id SERIAL PRIMARY KEY,
    main_question TEXT NOT NULL,
    type VARCHAR(50),
    answers JSONB,
    groupradio JSONB,
    group_input JSONB,
    dragdrop JSONB,
    dragdrop_dictionary JSONB,
    dragdropV2 JSONB,
    dragdropV2_dictionary JSONB,
    page_url TEXT,
    timestamp TIMESTAMP DEFAULT NOW(),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### 2. Cấu hình API Keys

Cập nhật thông tin Supabase trong file `dist/script.js`:

```javascript
const SUPABASE_CONFIG = {
    URL: 'https://your-project.supabase.co',
    ANON_KEY: 'your-anon-key-here',
    TABLE_NAME: 'lms_questions'
};
```

### 3. Cấu hình Realtime

Trong Supabase Dashboard:
1. Vào **Database** → **Replication**
2. Bật replication cho bảng `lms_questions`
3. Đảm bảo RLS (Row Level Security) được cấu hình đúng

## 🎨 Giao diện

### Header Section
- **Tiêu đề:** LMS Questions Dashboard
- **Tổng số câu hỏi:** Hiển thị số lượng câu hỏi hiện tại
- **Trạng thái kết nối:** Real-time connection status

### Main Content
- **Loading state:** Spinner khi đang tải dữ liệu
- **Danh sách câu hỏi:** Hiển thị tất cả câu hỏi
- **Empty state:** Thông báo khi chưa có câu hỏi nào

### Question Card
Mỗi card hiển thị:
- **ID:** Số thứ tự câu hỏi
- **Loại:** RADIO, CHECKBOX, DRAGDROP, etc.
- **Thời gian:** Timestamp khi tạo
- **Nội dung:** Text câu hỏi
- **Đáp án:** Danh sách đáp án (nếu có)
- **Metadata:** URL nguồn và User Agent

## ⚡ Tính năng Real-time

### Auto-refresh
- Tự động cập nhật mỗi 30 giây
- Hiển thị thời gian cập nhật cuối cùng
- Có thể tắt/bật manual refresh

### New Question Indicator
- Câu hỏi mới có border màu xanh lá
- Highlight tự động biến mất sau 5 giây
- Animation mượt mà khi xuất hiện

### Notifications
- Popup notification ở góc phải trên
- Âm thanh thông báo (có thể tắt)
- Hiển thị nội dung câu hỏi mới
- Tự động ẩn sau vài giây

## 🚀 Deployment

### GitHub Pages

1. Push code lên GitHub repository
2. Vào **Settings** → **Pages**
3. Chọn **Source:** Deploy from a branch
4. Chọn branch `main` và folder `dist`
5. Truy cập: `https://username.github.io/repo-name/`

### Vercel

```bash
# Cài đặt Vercel CLI
npm i -g vercel

# Deploy
cd dist
vercel
```

### Netlify

1. Kéo thả thư mục `dist` lên [Netlify Drop](https://app.netlify.com/drop)
2. Hoặc kết nối với GitHub repository
3. Set build command: (để trống)
4. Set publish directory: `dist`

### Firebase Hosting

```bash
# Cài đặt Firebase CLI
npm install -g firebase-tools

# Login và init
firebase login
firebase init hosting

# Deploy
firebase deploy
```

## 🔍 Xử lý sự cố

### ❌ Không hiển thị câu hỏi

**Nguyên nhân có thể:**
- Kết nối Supabase bị lỗi
- API key không đúng
- Bảng `lms_questions` chưa được tạo
- RLS policies chặn truy cập

**Giải pháp:**
1. Kiểm tra console browser (F12) để xem lỗi
2. Xác minh API key trong `script.js`
3. Kiểm tra bảng trong Supabase Dashboard
4. Kiểm tra RLS policies trong Supabase

### ❌ Real-time không hoạt động

**Nguyên nhân:**
- Realtime chưa được bật cho bảng
- RLS policies chặn subscription
- Kết nối mạng không ổn định

**Giải pháp:**
1. Bật Replication cho bảng trong Supabase
2. Kiểm tra RLS policies cho SELECT và SUBSCRIBE
3. Refresh trang và kiểm tra lại

### ❌ Lỗi CORS

**Nguyên nhân:**
- Domain chưa được whitelist trong Supabase
- API key không có quyền truy cập

**Giải pháp:**
1. Vào Supabase Dashboard → Settings → API
2. Thêm domain vào CORS settings
3. Hoặc sử dụng `*` cho development (không khuyến nghị cho production)

### ❌ Âm thanh thông báo không phát

**Giải pháp:**
- Kiểm tra volume trình duyệt
- Đảm bảo trang web có quyền phát âm thanh
- Kiểm tra console để xem lỗi

## 📱 Hỗ trợ Mobile

Ứng dụng được tối ưu cho mobile:
- ✅ Header tự động stack trên màn hình nhỏ
- ✅ Question cards full width, dễ đọc
- ✅ Touch-friendly buttons và controls
- ✅ Font size tối ưu cho mobile
- ✅ Smooth scrolling

## 🛠 Công nghệ sử dụng

- **HTML5** - Cấu trúc trang
- **CSS3** - Styling với glassmorphism
- **Vanilla JavaScript** - Logic và API calls
- **Supabase** - Backend và Realtime
- **Fetch API** - HTTP requests

## 📝 Changelog

Xem file `dist/version.js` để biết thông tin phiên bản.

## 🤝 Đóng góp

Mọi đóng góp đều được chào đón! Vui lòng:
1. Fork repository
2. Tạo feature branch
3. Commit changes
4. Push và tạo Pull Request

## 📄 License

Dự án này được phát hành dưới license tự do.

## 🎯 Roadmap

Các tính năng dự kiến trong tương lai:

- [ ] 🔍 Tìm kiếm và lọc câu hỏi
- [ ] 📊 Analytics và biểu đồ thống kê
- [ ] 📥 Export dữ liệu (CSV, JSON)
- [ ] 🔐 Xác thực người dùng
- [ ] 🎨 Tùy chỉnh theme
- [ ] 📱 Progressive Web App (PWA)
- [ ] 🌐 Hỗ trợ nhiều Supabase projects
- [ ] 🔔 Cấu hình thông báo tùy chỉnh

## 📞 Liên hệ

Nếu có câu hỏi hoặc gặp vấn đề, vui lòng tạo issue trên GitHub repository.

---

**Made with ❤️ for LMS Education**
