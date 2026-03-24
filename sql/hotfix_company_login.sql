-- ============================================================
-- Hotfix: ログイン前の会社コード検索を許可
-- ============================================================
-- 問題: companiesテーブルのRLSが auth.uid() IS NOT NULL のため
--       ログイン画面で会社コード検証ができない
-- 解決: 未認証でも会社コード検索だけできる関数を用意
-- ============================================================

-- 方法1: companiesのSELECTを未認証でも許可（会社名・コードは機密ではない）
DROP POLICY IF EXISTS "companies_select_auth" ON companies;
DROP POLICY IF EXISTS "companies_select_public" ON companies;

CREATE POLICY "companies_select_public" ON companies
  FOR SELECT USING (true);

-- 方法2（併用）: 安全な関数でコード検索（最小限の情報のみ返す）
CREATE OR REPLACE FUNCTION find_company_by_code(p_code TEXT)
RETURNS TABLE(id UUID, name TEXT, company_code TEXT)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT c.id, c.name, c.company_code
  FROM companies c
  WHERE c.company_code = UPPER(p_code) AND c.is_active = true
  LIMIT 1;
$$;

-- ========================================
DO $$ BEGIN RAISE NOTICE 'Hotfix: 会社コード検索 修正完了！'; END $$;
