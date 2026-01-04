// ============================================
// CẤU HÌNH AI - Google Gemini API
// ============================================
// API Key được lưu trong localStorage của browser
// Người dùng có thể nhập key trực tiếp trên giao diện
// ============================================

const AI_CONFIG = {
    // Model sử dụng (gemma-3-4b-it - open source, có thể quota riêng)
    MODEL: 'gemma-3-4b-it',
    
    // Bật/tắt tính năng AI check
    ENABLED: true,
    
    // Hiển thị giải thích từ AI
    SHOW_EXPLANATION: true,
    
    // Timeout cho API call (ms)
    TIMEOUT: 10000,
    
    // Lấy API Key từ localStorage
    get GEMINI_API_KEY() {
        return localStorage.getItem('gemini_api_key') || '';
    },
    
    // Lưu API Key vào localStorage
    setApiKey(key) {
        if (key && key.trim()) {
            localStorage.setItem('gemini_api_key', key.trim());
            return true;
        }
        return false;
    },
    
    // Xóa API Key
    clearApiKey() {
        localStorage.removeItem('gemini_api_key');
    }
};

// Kiểm tra API Key
function isAIConfigured() {
    return AI_CONFIG.ENABLED && 
           AI_CONFIG.GEMINI_API_KEY && 
           AI_CONFIG.GEMINI_API_KEY.trim() !== '';
}

// Hiển thị dialog nhập API Key
function showApiKeyDialog() {
    const currentKey = AI_CONFIG.GEMINI_API_KEY;
    const maskedKey = currentKey ? currentKey.substring(0, 10) + '...' : '(chưa có)';
    
    const newKey = prompt(
        `🔑 Cấu hình API Key Google Gemini\n\n` +
        `Key hiện tại: ${maskedKey}\n\n` +
        `Hướng dẫn lấy key miễn phí:\n` +
        `1. Vào: https://makersuite.google.com/app/apikey\n` +
        `2. Đăng nhập Google\n` +
        `3. Bấm "Create API Key"\n` +
        `4. Copy và dán vào đây:\n\n` +
        `(Để trống và OK để xóa key)`,
        currentKey
    );
    
    if (newKey === null) return false; // Cancelled
    
    if (newKey.trim() === '') {
        AI_CONFIG.clearApiKey();
        alert('Đã xóa API Key. AI check sẽ bị tắt.');
        return false;
    }
    
    AI_CONFIG.setApiKey(newKey);
    alert('✅ Đã lưu API Key! AI check đã được bật.');
    return true;
}

console.log('AI Config loaded. AI enabled:', isAIConfigured());
