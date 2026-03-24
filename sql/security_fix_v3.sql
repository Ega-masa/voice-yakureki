-- ============================================================
-- Security Fix v3: RLS再帰問題の根本修正
-- ============================================================
-- 問題: usersテーブルのRLSポリシーがusersテーブル自身を
--       サブクエリで参照→再帰→タイムアウト
-- 解決: SECURITY DEFINER関数でRLSをバイパスして情報取得
-- ============================================================

-- ========================================
-- 1. ヘルパー関数: 自分のcompany_idを取得（RLSバイパス）
-- ========================================
CREATE OR REPLACE FUNCTION get_my_company_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT company_id FROM users WHERE id = auth.uid();
$$;

-- ========================================
-- 2. ヘルパー関数: 自分のroleを取得（RLSバイパス）
-- ========================================
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role FROM users WHERE id = auth.uid();
$$;

-- ========================================
-- 3. users テーブル RLS（再帰なし版）
-- ========================================
DROP POLICY IF EXISTS "users_select" ON users;
DROP POLICY IF EXISTS "users_select_company" ON users;
DROP POLICY IF EXISTS "users_insert" ON users;
DROP POLICY IF EXISTS "users_insert_auth" ON users;
DROP POLICY IF EXISTS "users_update" ON users;
DROP POLICY IF EXISTS "users_update_auth" ON users;
DROP POLICY IF EXISTS "users_delete" ON users;
DROP POLICY IF EXISTS "users_delete_auth" ON users;

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- SELECT: 自分自身 OR 同じ会社 OR super_admin
CREATE POLICY "users_select_safe" ON users FOR SELECT USING (
  id = auth.uid()
  OR get_my_role() = 'super_admin'
  OR company_id = get_my_company_id()
);

CREATE POLICY "users_insert_safe" ON users FOR INSERT WITH CHECK (true);

CREATE POLICY "users_update_safe" ON users FOR UPDATE USING (
  id = auth.uid()
  OR get_my_role() IN ('super_admin', 'store_admin')
);

CREATE POLICY "users_delete_safe" ON users FOR DELETE USING (
  get_my_role() = 'super_admin'
);

-- ========================================
-- 4. records テーブル RLS（再帰なし版）
-- ========================================
DROP POLICY IF EXISTS "records_select" ON records;
DROP POLICY IF EXISTS "records_select_company" ON records;
DROP POLICY IF EXISTS "records_insert" ON records;
DROP POLICY IF EXISTS "records_insert_auth" ON records;
DROP POLICY IF EXISTS "records_update" ON records;
DROP POLICY IF EXISTS "records_update_auth" ON records;
DROP POLICY IF EXISTS "records_delete" ON records;
DROP POLICY IF EXISTS "records_delete_auth" ON records;

ALTER TABLE records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "records_select_safe" ON records FOR SELECT USING (
  get_my_role() = 'super_admin'
  OR store_id IN (
    SELECT id FROM stores WHERE company_id = get_my_company_id()
  )
);

CREATE POLICY "records_insert_safe" ON records FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "records_update_safe" ON records FOR UPDATE USING (
  created_by = auth.uid()
  OR get_my_role() IN ('super_admin', 'store_admin')
);

CREATE POLICY "records_delete_safe" ON records FOR DELETE USING (
  created_by = auth.uid()
  OR get_my_role() IN ('super_admin', 'store_admin')
);

-- ========================================
-- 5. api_keys テーブル RLS
-- ========================================
DROP POLICY IF EXISTS "api_keys_select" ON api_keys;
DROP POLICY IF EXISTS "api_keys_select_admin" ON api_keys;
DROP POLICY IF EXISTS "api_keys_insert" ON api_keys;
DROP POLICY IF EXISTS "api_keys_update" ON api_keys;
DROP POLICY IF EXISTS "api_keys_delete" ON api_keys;

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "api_keys_select_admin" ON api_keys FOR SELECT USING (
  get_my_role() IN ('super_admin', 'store_admin')
);
CREATE POLICY "api_keys_insert_admin" ON api_keys FOR INSERT WITH CHECK (
  get_my_role() = 'super_admin'
);
CREATE POLICY "api_keys_update_admin" ON api_keys FOR UPDATE USING (
  get_my_role() = 'super_admin'
);
CREATE POLICY "api_keys_delete_admin" ON api_keys FOR DELETE USING (
  get_my_role() = 'super_admin'
);

-- ========================================
-- 6. APIキー安全取得関数（一般ユーザー用）
-- ========================================
CREATE OR REPLACE FUNCTION get_api_key(p_service TEXT, p_store_id UUID DEFAULT NULL)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key TEXT;
BEGIN
  IF auth.uid() IS NULL THEN RETURN NULL; END IF;
  IF p_store_id IS NOT NULL THEN
    SELECT api_key INTO v_key FROM api_keys
    WHERE service = p_service AND store_id = p_store_id AND is_active = true LIMIT 1;
    IF v_key IS NOT NULL THEN RETURN v_key; END IF;
  END IF;
  SELECT api_key INTO v_key FROM api_keys
  WHERE service = p_service AND store_id IS NULL AND is_active = true LIMIT 1;
  RETURN v_key;
END;
$$;

-- ========================================
-- 7. stores: 認証済みなら閲覧可
-- ========================================
DROP POLICY IF EXISTS "stores_select" ON stores;
DROP POLICY IF EXISTS "stores_select_auth" ON stores;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stores_select_auth" ON stores FOR SELECT USING (auth.uid() IS NOT NULL);

-- stores の INSERT/UPDATE/DELETE（管理者のみ）
DROP POLICY IF EXISTS "stores_insert_admin" ON stores;
DROP POLICY IF EXISTS "stores_update_admin" ON stores;
DROP POLICY IF EXISTS "stores_delete_admin" ON stores;
CREATE POLICY "stores_insert_admin" ON stores FOR INSERT WITH CHECK (
  get_my_role() = 'super_admin'
);
CREATE POLICY "stores_update_admin" ON stores FOR UPDATE USING (
  get_my_role() IN ('super_admin', 'store_admin')
);
CREATE POLICY "stores_delete_admin" ON stores FOR DELETE USING (
  get_my_role() = 'super_admin'
);

-- ========================================
-- 8. user_stores: 認証済みなら閲覧可
-- ========================================
DROP POLICY IF EXISTS "user_stores_select" ON user_stores;
DROP POLICY IF EXISTS "user_stores_select_auth" ON user_stores;
DROP POLICY IF EXISTS "user_stores_insert" ON user_stores;
DROP POLICY IF EXISTS "user_stores_insert_auth" ON user_stores;
DROP POLICY IF EXISTS "user_stores_delete" ON user_stores;
DROP POLICY IF EXISTS "user_stores_delete_auth" ON user_stores;

ALTER TABLE user_stores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_stores_select_auth" ON user_stores FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "user_stores_insert_auth" ON user_stores FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "user_stores_delete_auth" ON user_stores FOR DELETE USING (
  user_id = auth.uid() OR get_my_role() IN ('super_admin', 'store_admin')
);

-- ========================================
-- 9. companies: 認証済みなら閲覧可
-- ========================================
DROP POLICY IF EXISTS "companies_select" ON companies;
DROP POLICY IF EXISTS "companies_select_auth" ON companies;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "companies_select_auth" ON companies FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "companies_insert_admin" ON companies;
DROP POLICY IF EXISTS "companies_update_admin" ON companies;
DROP POLICY IF EXISTS "companies_delete_admin" ON companies;
CREATE POLICY "companies_insert_admin" ON companies FOR INSERT WITH CHECK (
  get_my_role() = 'super_admin'
);
CREATE POLICY "companies_update_admin" ON companies FOR UPDATE USING (
  get_my_role() = 'super_admin'
);
CREATE POLICY "companies_delete_admin" ON companies FOR DELETE USING (
  get_my_role() = 'super_admin'
);

-- ========================================
DO $$ BEGIN RAISE NOTICE 'Security Fix v3 完了！RLS再帰問題解決済み'; END $$;
