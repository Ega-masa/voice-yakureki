-- ============================================================
-- 旧アカウント停止 + クリーンアップ
-- v5.7 ログイン方式変更に伴う移行処理
-- ============================================================

-- 1. 旧メール認証アカウント（@vy.internal以外）を無効化
-- auth.usersのban_durationを設定して無効化
-- ※ 管理者が手動で作成した @vy.internal アカウントは維持
UPDATE auth.users
SET banned_until = '2999-12-31'::timestamptz,
    updated_at = now()
WHERE email NOT LIKE '%@vy.internal'
  AND id NOT IN (SELECT auth_user_id FROM stores WHERE auth_user_id IS NOT NULL)
  AND id NOT IN (SELECT auth_user_id FROM admin_accounts WHERE auth_user_id IS NOT NULL);

-- 確認: 無効化されたアカウント数
DO $$
DECLARE v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count FROM auth.users WHERE banned_until > now() AND email NOT LIKE '%@vy.internal';
  RAISE NOTICE '無効化された旧アカウント数: %', v_count;
END $$;

-- 2. 不要テーブルデータのクリーンアップ
-- user_stores: 旧ユーザーの紐付けを削除
DELETE FROM user_stores
WHERE user_id NOT IN (SELECT auth_user_id FROM stores WHERE auth_user_id IS NOT NULL)
  AND user_id NOT IN (SELECT auth_user_id FROM admin_accounts WHERE auth_user_id IS NOT NULL);

-- 3. 確認クエリ
DO $$
DECLARE
  v_active INT; v_stores INT; v_admins INT;
BEGIN
  SELECT COUNT(*) INTO v_active FROM auth.users WHERE (banned_until IS NULL OR banned_until < now()) AND email LIKE '%@vy.internal';
  SELECT COUNT(*) INTO v_stores FROM stores WHERE auth_user_id IS NOT NULL;
  SELECT COUNT(*) INTO v_admins FROM admin_accounts WHERE auth_user_id IS NOT NULL;
  RAISE NOTICE '有効なvy.internalアカウント: % / 開通済み店舗: % / 管理者: %', v_active, v_stores, v_admins;
END $$;

-- ========================================
DO $$ BEGIN RAISE NOTICE '旧アカウント停止 + クリーンアップ完了！'; END $$;
