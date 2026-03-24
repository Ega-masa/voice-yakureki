-- ============================================================
-- Phase C: SOAPテンプレート管理 + 記載チェック設定
-- 音声薬歴ツール v5.5.0
-- ============================================================
-- 実行場所: Supabase SQL Editor
-- 前提: Phase A, B が実行済み
-- ============================================================

-- ========================================
-- 1. soap_templates テーブル
--    定型SOAPテンプレート（会社/店舗単位でカスタマイズ可）
-- ========================================
CREATE TABLE IF NOT EXISTS soap_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,                -- テンプレート名 (例: '初回面談用', 'ハイリスク薬')
  description TEXT DEFAULT '',
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,  -- NULL=グローバル
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,       -- NULL=会社全体
  -- SOAP各項目のテンプレートテキスト
  soap_s TEXT DEFAULT '',
  soap_o TEXT DEFAULT '',
  soap_a TEXT DEFAULT '',
  soap_ep TEXT DEFAULT '',
  soap_cp TEXT DEFAULT '',
  soap_op TEXT DEFAULT '',
  soap_p TEXT DEFAULT '',
  soap_q TEXT DEFAULT '',
  soap_other TEXT DEFAULT '',
  soap_highrisk TEXT DEFAULT '',
  -- メタ
  category TEXT DEFAULT 'general',   -- general / highrisk / initial / followup / custom
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_soap_templates_company ON soap_templates(company_id);
CREATE INDEX IF NOT EXISTS idx_soap_templates_store ON soap_templates(store_id);
CREATE INDEX IF NOT EXISTS idx_soap_templates_category ON soap_templates(category);

-- ========================================
-- 2. soap_check_rules テーブル
--    SOAP記載漏れチェックルール
-- ========================================
CREATE TABLE IF NOT EXISTS soap_check_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,               -- ルール名
  description TEXT DEFAULT '',
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  -- どのSOAP項目が必須か
  required_fields TEXT[] DEFAULT '{}',  -- ['soap_s','soap_o','soap_a','soap_p'] etc.
  -- 最低文字数（0=チェックなし）
  min_length INT DEFAULT 0,
  -- 対象カテゴリ (general/highrisk/initial 等)
  applies_to TEXT DEFAULT 'general',
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_soap_check_rules_company ON soap_check_rules(company_id);

-- ========================================
-- 3. 初期テンプレートデータ
-- ========================================
INSERT INTO soap_templates (name, description, category, sort_order, soap_s, soap_o, soap_a, soap_p) VALUES
(
  '初回面談（基本）',
  '初回来局時の基本テンプレート',
  'initial', 1,
  '初回来局。主訴：',
  '処方内容確認済。お薬手帳確認。アレルギー歴：なし。併用薬：',
  '処方内容に問題なし。コンプライアンス確認済。',
  '次回来局時に服薬状況と副作用の有無を確認する。'
),
(
  '継続処方（定期）',
  '定期的な処方の継続フォロー用',
  'followup', 2,
  '定期来局。体調変化：',
  '前回処方と同内容。残薬：',
  '服薬状況良好。副作用なし。コンプライアンス良好。',
  '経過観察。次回来局時に確認。'
),
(
  'ハイリスク薬',
  'ハイリスク薬の服薬指導用',
  'highrisk', 3,
  '来局。自覚症状：',
  '処方確認済。検査値：',
  '服薬状況確認済。副作用モニタリング実施。',
  '次回来局時に検査値と副作用を確認。医師への情報提供を検討。'
),
(
  '残薬調整',
  '残薬がある場合の調整用',
  'general', 4,
  '来局。残薬あり。',
  '残薬確認：',
  '残薬調整を実施。処方日数を変更。',
  '残薬調整済。次回来局時に残薬の有無を確認。'
)
ON CONFLICT DO NOTHING;

-- ========================================
-- 4. 初期チェックルール
-- ========================================
INSERT INTO soap_check_rules (name, description, required_fields, min_length, applies_to, sort_order) VALUES
(
  '基本チェック（SOAPのSとP必須）',
  '最低限S（主観的情報）とP（計画）は記載が必要',
  ARRAY['soap_s', 'soap_p'],
  5,
  'general',
  1
),
(
  'ハイリスク薬チェック',
  'ハイリスク薬ではS/O/A/P全てとハイリスク項目が必須',
  ARRAY['soap_s', 'soap_o', 'soap_a', 'soap_p', 'soap_highrisk'],
  10,
  'highrisk',
  2
)
ON CONFLICT DO NOTHING;

-- ========================================
-- 5. RLS
-- ========================================
ALTER TABLE soap_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE soap_check_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "soap_templates_select" ON soap_templates;
CREATE POLICY "soap_templates_select" ON soap_templates FOR SELECT USING (true);
DROP POLICY IF EXISTS "soap_templates_insert" ON soap_templates;
CREATE POLICY "soap_templates_insert" ON soap_templates FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "soap_templates_update" ON soap_templates;
CREATE POLICY "soap_templates_update" ON soap_templates FOR UPDATE USING (true);
DROP POLICY IF EXISTS "soap_templates_delete" ON soap_templates;
CREATE POLICY "soap_templates_delete" ON soap_templates FOR DELETE USING (true);

DROP POLICY IF EXISTS "soap_check_rules_select" ON soap_check_rules;
CREATE POLICY "soap_check_rules_select" ON soap_check_rules FOR SELECT USING (true);
DROP POLICY IF EXISTS "soap_check_rules_insert" ON soap_check_rules;
CREATE POLICY "soap_check_rules_insert" ON soap_check_rules FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "soap_check_rules_update" ON soap_check_rules;
CREATE POLICY "soap_check_rules_update" ON soap_check_rules FOR UPDATE USING (true);
DROP POLICY IF EXISTS "soap_check_rules_delete" ON soap_check_rules;
CREATE POLICY "soap_check_rules_delete" ON soap_check_rules FOR DELETE USING (true);

-- ========================================
DO $$ BEGIN RAISE NOTICE 'Phase C: SOAPテンプレート＋記載チェック テーブル作成完了！'; END $$;
