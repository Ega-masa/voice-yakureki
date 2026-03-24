-- ============================================================
-- ログイン方式変更: 店舗ID + パスワード方式
-- ============================================================

-- 1. stores テーブルにログイン情報カラムを追加
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='stores' AND column_name='login_id') THEN
    ALTER TABLE stores ADD COLUMN login_id TEXT UNIQUE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='stores' AND column_name='auth_user_id') THEN
    ALTER TABLE stores ADD COLUMN auth_user_id UUID;
  END IF;
END $$;

-- login_id のインデックス
DROP INDEX IF EXISTS idx_stores_login_id;
CREATE UNIQUE INDEX idx_stores_login_id ON stores (login_id) WHERE login_id IS NOT NULL;

-- 2. admin_accounts テーブル（管理者専用ログイン）
CREATE TABLE IF NOT EXISTS admin_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  login_id TEXT NOT NULL UNIQUE,          -- admin-xxx
  auth_user_id UUID,                       -- Supabase Auth の user id
  display_name TEXT DEFAULT '',
  role TEXT DEFAULT 'super_admin',
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE admin_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_accounts_select" ON admin_accounts;
CREATE POLICY "admin_accounts_select" ON admin_accounts FOR SELECT USING (true);
DROP POLICY IF EXISTS "admin_accounts_insert" ON admin_accounts;
CREATE POLICY "admin_accounts_insert" ON admin_accounts FOR INSERT WITH CHECK (
  get_my_role() = 'super_admin'
);
DROP POLICY IF EXISTS "admin_accounts_update" ON admin_accounts;
CREATE POLICY "admin_accounts_update" ON admin_accounts FOR UPDATE USING (
  get_my_role() = 'super_admin'
);
DROP POLICY IF EXISTS "admin_accounts_delete" ON admin_accounts;
CREATE POLICY "admin_accounts_delete" ON admin_accounts FOR DELETE USING (
  get_my_role() = 'super_admin'
);

-- 3. login_id 生成関数
CREATE OR REPLACE FUNCTION generate_store_login_id()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := 'YK-';
  i INT;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  -- 重複チェック
  IF EXISTS (SELECT 1 FROM stores WHERE login_id = result) THEN
    RETURN generate_store_login_id(); -- 再帰
  END IF;
  RETURN result;
END;
$$;

-- 4. 既存店舗にlogin_idを自動付与（まだないもの）
UPDATE stores SET login_id = generate_store_login_id() WHERE login_id IS NULL;

-- 5. 店舗INSERT時に自動でlogin_id付与するトリガー
CREATE OR REPLACE FUNCTION fn_auto_store_login_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.login_id IS NULL THEN
    NEW.login_id := generate_store_login_id();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_store_login_id ON stores;
CREATE TRIGGER trg_auto_store_login_id
  BEFORE INSERT ON stores
  FOR EACH ROW
  EXECUTE FUNCTION fn_auto_store_login_id();

-- ========================================
DO $$ BEGIN RAISE NOTICE 'ログイン方式変更SQL完了！'; END $$;
