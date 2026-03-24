-- ============================================================
-- Security Fix v2: RLS厳格化 + APIキー安全取得関数
-- ============================================================
-- 前回のsecurity_fix_rls.sqlの改良版（これ1本で完結）
-- ============================================================

-- ========================================
-- 1. api_keys: admin のみ直接読み取り可
-- ========================================
DROP POLICY IF EXISTS "api_keys_select" ON api_keys;
DROP POLICY IF EXISTS "api_keys_select_admin" ON api_keys;
DROP POLICY IF EXISTS "api_keys_insert" ON api_keys;
DROP POLICY IF EXISTS "api_keys_update" ON api_keys;
DROP POLICY IF EXISTS "api_keys_delete" ON api_keys;

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "api_keys_select_admin" ON api_keys FOR SELECT USING (
  auth.uid() IN (SELECT id FROM users WHERE role IN ('super_admin','store_admin'))
);
CREATE POLICY "api_keys_insert" ON api_keys FOR INSERT WITH CHECK (
  auth.uid() IN (SELECT id FROM users WHERE role = 'super_admin')
);
CREATE POLICY "api_keys_update" ON api_keys FOR UPDATE USING (
  auth.uid() IN (SELECT id FROM users WHERE role = 'super_admin')
);
CREATE POLICY "api_keys_delete" ON api_keys FOR DELETE USING (
  auth.uid() IN (SELECT id FROM users WHERE role = 'super_admin')
);

-- ========================================
-- 2. APIキー安全取得関数（SECURITY DEFINER）
--    一般ユーザーはこの関数経由でキーの「値」だけ取得
--    テーブルを直接SELECTはできない
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
  -- 認証チェック
  IF auth.uid() IS NULL THEN RETURN NULL; END IF;

  -- 店舗固有キーを先に探す
  IF p_store_id IS NOT NULL THEN
    SELECT api_key INTO v_key FROM api_keys
    WHERE service = p_service AND store_id = p_store_id AND is_active = true
    LIMIT 1;
    IF v_key IS NOT NULL THEN RETURN v_key; END IF;
  END IF;

  -- グローバルキー
  SELECT api_key INTO v_key FROM api_keys
  WHERE service = p_service AND store_id IS NULL AND is_active = true
  LIMIT 1;

  RETURN v_key;
END;
$$;

-- ========================================
-- 3. records: 同じ会社のレコードのみ
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

CREATE POLICY "records_select_company" ON records FOR SELECT USING (
  auth.uid() IN (SELECT id FROM users WHERE role = 'super_admin')
  OR store_id IN (
    SELECT s.id FROM stores s
    WHERE s.company_id = (SELECT company_id FROM users WHERE id = auth.uid())
  )
);
CREATE POLICY "records_insert_auth" ON records FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "records_update_auth" ON records FOR UPDATE USING (
  created_by = auth.uid()
  OR auth.uid() IN (SELECT id FROM users WHERE role IN ('super_admin','store_admin'))
);
CREATE POLICY "records_delete_auth" ON records FOR DELETE USING (
  created_by = auth.uid()
  OR auth.uid() IN (SELECT id FROM users WHERE role IN ('super_admin','store_admin'))
);

-- ========================================
-- 4. users: 同じ会社 + 自分自身
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

CREATE POLICY "users_select_company" ON users FOR SELECT USING (
  id = auth.uid()
  OR auth.uid() IN (SELECT id FROM users u2 WHERE u2.role = 'super_admin' AND u2.id != users.id)
  OR company_id = (SELECT company_id FROM users WHERE id = auth.uid())
);
CREATE POLICY "users_insert_auth" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "users_update_auth" ON users FOR UPDATE USING (
  id = auth.uid()
  OR auth.uid() IN (SELECT id FROM users WHERE role IN ('super_admin','store_admin'))
);
CREATE POLICY "users_delete_auth" ON users FOR DELETE USING (
  auth.uid() IN (SELECT id FROM users WHERE role = 'super_admin')
);

-- ========================================
-- 5. stores: 認証済みなら閲覧可（店舗選択に必要）
-- ========================================
DROP POLICY IF EXISTS "stores_select" ON stores;
DROP POLICY IF EXISTS "stores_select_auth" ON stores;

ALTER TABLE stores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stores_select_auth" ON stores FOR SELECT USING (auth.uid() IS NOT NULL);

-- ========================================
DO $$ BEGIN RAISE NOTICE 'Security Fix v2 完了！'; END $$;
