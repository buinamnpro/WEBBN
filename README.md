# 📊 LMS Questions Dashboard

Web app đơn giản để hiển thị real-time các câu hỏi LMS từ Supabase.

## 🚀 Tính năng

- **Real-time display:** Hiển thị câu hỏi mới ngay lập tức
- **Auto-refresh:** Tự động cập nhật mỗi 30 giây
- **Notification:** Thông báo và âm thanh khi có câu hỏi mới
- **Responsive:** Hoạt động tốt trên mobile và desktop
- **Modern UI:** Giao diện đẹp với glassmorphism design

## 📁 Cấu trúc file

```
lms-dashboard/
├── index.html          # Trang chính
├── style.css           # CSS styling
├── script.js           # JavaScript logic
├── supabase-config.js  # Supabase config
└── README.md          # Hướng dẫn
```

## 🛠 Cách sử dụng

### 1. Mở web app
- Mở file `index.html` trong browser
- Hoặc host lên GitHub Pages/Vercel

### 2. Kết nối Supabase
- Đảm bảo bảng `lms_questions` đã được tạo trong Supabase
- Kiểm tra API key trong `supabase-config.js`

### 3. Sử dụng Chrome Extension
- Load extension `lms-supabase-extension`
- Vào trang LMS và ấn `Ctrl+↑`
- Câu hỏi sẽ xuất hiện real-time trên dashboard

## 🎨 Giao diện

### Header
- **Tiêu đề:** LMS Questions Dashboard
- **Total Questions:** Số lượng câu hỏi
- **Real-time Status:** Trạng thái kết nối

### Main Content
- **Loading:** Spinner khi đang tải
- **Questions List:** Danh sách câu hỏi
- **Empty State:** Khi chưa có câu hỏi

### Question Card
- **Question ID:** Số thứ tự câu hỏi
- **Type:** Loại câu hỏi (RADIO, CHECKBOX, etc.)
- **Time:** Thời gian tạo
- **Question Text:** Nội dung câu hỏi
- **Answers:** Đáp án (nếu có)
- **Meta:** URL và User Agent

## ⚡ Real-time Features

### Auto-refresh
- Cập nhật mỗi 30 giây
- Hiển thị thời gian cập nhật cuối

### New Question Indicator
- Câu hỏi mới có border xanh
- Highlight tự động biến mất sau 5 giây

### Notifications
- Popup notification khi có câu hỏi mới
- Âm thanh thông báo
- Hiển thị ở góc phải trên

## 🔧 Cấu hình

### Supabase Config
```javascript
const SUPABASE_CONFIG = {
    URL: 'your-supabase-url',
    ANON_KEY: 'your-anon-key',
    TABLE_NAME: 'lms_questions'
};
```

### Bảng Supabase
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

## 🚀 Deployment

### GitHub Pages
1. Push code lên GitHub
2. Vào Settings → Pages
3. Chọn Source: Deploy from a branch
4. Chọn branch main

### Vercel
1. Install Vercel CLI
2. Run `vercel` trong folder
3. Follow instructions

### Netlify
1. Drag & drop folder lên Netlify
2. Hoặc connect với GitHub repo

## 🔍 Troubleshooting

### Không hiển thị câu hỏi
- Kiểm tra kết nối Supabase
- Kiểm tra API key
- Kiểm tra bảng `lms_questions`

### Real-time không hoạt động
- Kiểm tra RLS policies
- Kiểm tra Supabase Realtime
- Refresh trang

### Lỗi CORS
- Đảm bảo domain được whitelist trong Supabase
- Kiểm tra API key permissions

## 📱 Mobile Support

Web app hoàn toàn responsive:
- Header stack vertically trên mobile
- Question cards full width
- Touch-friendly buttons
- Optimized font sizes

## 🎯 Tương lai

- [ ] Thêm filters và search
- [ ] Export dữ liệu
- [ ] Analytics charts
- [ ] User authentication
- [ ] Multiple Supabase projects 