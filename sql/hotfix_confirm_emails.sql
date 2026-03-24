-- ============================================================
-- Hotfix: 既存の未確認アカウントを一括確認済みにする
-- ============================================================
-- auth.usersテーブルのemail_confirmed_atがNULLのユーザーを
-- 現在時刻で確認済みに更新する
-- ============================================================

UPDATE auth.users
SET email_confirmed_at = now(),
    updated_at = now()
WHERE email_confirmed_at IS NULL;

-- 確認
DO $$ 
DECLARE
  v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count FROM auth.users WHERE email_confirmed_at IS NOT NULL;
  RAISE NOTICE '確認済みユーザー数: %', v_count;
END $$;
