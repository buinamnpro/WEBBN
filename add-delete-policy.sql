-- Thêm DELETE policy cho bảng lms_questions
-- Chạy SQL này trong Supabase SQL Editor

-- Xóa policy DELETE cũ nếu có
DROP POLICY IF EXISTS "Enable delete for all users" ON lms_questions;

-- Tạo policy DELETE mới
CREATE POLICY "Enable delete for all users"
ON lms_questions FOR DELETE
USING (true);

-- Kiểm tra policies hiện tại
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'lms_questions'
ORDER BY cmd;

-- Test DELETE policy
-- (Chạy query này để test xem có thể DELETE không)
SELECT COUNT(*) as total_questions FROM lms_questions; 