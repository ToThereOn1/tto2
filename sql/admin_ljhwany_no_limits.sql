-- ============================================================
-- ljhwany@gmail.com 계정을 admin_users에 추가
-- 이 계정은 펫 등록 한도 및 편지 전송 한도 제한이 없음
-- ============================================================

-- 1. ljhwany@gmail.com 의 user id를 admin_users에 추가
INSERT INTO admin_users (id, email, role)
SELECT id, email, 'super_admin'
FROM auth.users
WHERE email = 'ljhwany@gmail.com'
ON CONFLICT (id) DO NOTHING;

-- 2. (선택) users 테이블 subscription_tier도 'basic'으로 설정
--    (write 페이지 admin bypass가 동작하므로 필수는 아님)
UPDATE public.users
SET subscription_tier = 'basic'
WHERE id = (
    SELECT id FROM auth.users WHERE email = 'ljhwany@gmail.com'
)
AND subscription_tier = 'free';
