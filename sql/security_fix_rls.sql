-- ============================================================
-- Security Fix: RLS厳格化
-- ============================================================
-- 実行場所: Supabase SQL Editor
-- ============================================================

-- ========================================
-- 1. api_keys: super_admin のみ読み取り可
-- ========================================
DROP POLICY IF EXISTS "api_keys_select" ON api_keys;
DROP POLICY IF EXISTS "api_keys_select_admin" ON api_keys;
DROP POLICY IF EXISTS "api_keys_insert" ON api_keys;
DROP POLICY IF EXISTS "api_keys_update" ON api_keys;
DROP POLICY IF EXISTS "api_keys_delete" ON api_keys;

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- super_admin のみ全操作可能
CREATE POLICY "api_keys_select_admin" ON api_keys
  FOR SELECT USING (
    auth.uid() IN (SELECT id FROM users WHERE role = 'super_admin')
  );
CREATE POLICY "api_keys_insert" ON api_keys
  FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT id FROM users WHERE role = 'super_admin')
  );
CREATE POLICY "api_keys_update" ON api_keys
  FOR UPDATE USING (
    auth.uid() IN (SELECT id FROM users WHERE role = 'super_admin')
  );
CREATE POLICY "api_keys_delete" ON api_keys
  FOR DELETE USING (
    auth.uid() IN (SELECT id FROM users WHERE role = 'super_admin')
  );

-- ========================================
-- 2. records: 同じ会社の人だけ閲覧可
--    (store_idから会社を辿ってフィルタ)
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

-- 自分の会社のレコードのみ閲覧可 (super_admin は全件)
CREATE POLICY "records_select_company" ON records
  FOR SELECT USING (
    auth.uid() IN (SELECT id FROM users WHERE role = 'super_admin')
    OR
    store_id IN (
      SELECT s.id FROM stores s
      WHERE s.company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    )
  );

CREATE POLICY "records_insert_auth" ON records
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "records_update_auth" ON records
  FOR UPDATE USING (
    created_by = auth.uid()
    OR auth.uid() IN (SELECT id FROM users WHERE role IN ('super_admin', 'store_admin'))
  );

CREATE POLICY "records_delete_auth" ON records
  FOR DELETE USING (
    created_by = auth.uid()
    OR auth.uid() IN (SELECT id FROM users WHERE role IN ('super_admin', 'store_admin'))
  );

-- ========================================
-- 3. users: 同じ会社のユーザーのみ閲覧可
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

-- 自分自身 + 同じ会社 + super_admin
CREATE POLICY "users_select_company" ON users
  FOR SELECT USING (
    id = auth.uid()
    OR auth.uid() IN (SELECT id FROM users WHERE role = 'super_admin')
    OR company_id = (SELECT company_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "users_insert_auth" ON users
  FOR INSERT WITH CHECK (true);  -- 新規登録時に必要

CREATE POLICY "users_update_auth" ON users
  FOR UPDATE USING (
    id = auth.uid()
    OR auth.uid() IN (SELECT id FROM users WHERE role IN ('super_admin', 'store_admin'))
  );

CREATE POLICY "users_delete_auth" ON users
  FOR DELETE USING (
    auth.uid() IN (SELECT id FROM users WHERE role = 'super_admin')
  );

-- ========================================
DO $$ BEGIN RAISE NOTICE 'セキュリティ修正: RLS厳格化 完了！'; END $$;
