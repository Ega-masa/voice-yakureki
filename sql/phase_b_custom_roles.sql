-- ============================================================
-- Phase B: カスタムロール管理
-- 音声薬歴ツール v5.4.0
-- ============================================================
-- 実行場所: Supabase SQL Editor
-- 前提: Phase A (hourly_stats) が実行済み
-- ============================================================

-- ========================================
-- 1. permissions マスタテーブル
--    システムで管理する権限の一覧
-- ========================================
CREATE TABLE IF NOT EXISTS permissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,         -- 権限キー (例: 'record.create')
  label TEXT NOT NULL,              -- 表示名 (例: '録音作成')
  description TEXT DEFAULT '',      -- 説明
  category TEXT NOT NULL DEFAULT 'general', -- カテゴリ分類
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 初期権限データの投入
INSERT INTO permissions (key, label, description, category, sort_order) VALUES
  -- 録音関連
  ('record.create',    '録音・文字起こし',     '音声の録音と文字起こしを実行できる',            'recording',  10),
  ('record.view_own',  '自分の録音閲覧',       '自分が作成した録音記録を閲覧できる',            'recording',  20),
  ('record.view_store','店舗の録音閲覧',       '同じ店舗の全録音記録を閲覧できる',              'recording',  30),
  ('record.edit',      '録音編集',             '録音記録のSOAP内容を編集できる',                'recording',  40),
  ('record.delete',    '録音削除',             '録音記録を削除できる',                          'recording',  50),
  ('record.export',    '録音エクスポート',     'Musubi用テキストのコピー・エクスポートができる', 'recording',  60),
  -- 管理関連
  ('admin.access',     '管理画面アクセス',     '管理画面を開くことができる',                    'admin',     100),
  ('admin.stats',      '統計閲覧',             '使用統計データを閲覧できる',                    'admin',     110),
  ('admin.store',      '店舗管理',             '店舗の追加・編集・削除ができる',                'admin',     120),
  ('admin.user',       'ユーザー管理',         'ユーザーの追加・編集・削除ができる',            'admin',     130),
  ('admin.approve',    '申請承認',             '新規登録申請を承認・拒否できる',                'admin',     140),
  ('admin.apikey',     'APIキー管理',          'APIキーの閲覧・追加・編集ができる',             'admin',     150),
  ('admin.company',    '会社管理',             '会社の追加・編集ができる',                      'admin',     160),
  ('admin.role',       'ロール管理',           'ロールの追加・編集・権限設定ができる',          'admin',     170)
ON CONFLICT (key) DO NOTHING;

-- ========================================
-- 2. roles テーブル
--    カスタムロール定義
-- ========================================
CREATE TABLE IF NOT EXISTS roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,               -- ロール名 (例: 'エリアマネージャー')
  description TEXT DEFAULT '',
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,  -- NULL=グローバル
  is_system BOOLEAN DEFAULT false,  -- システム組込みロール（削除不可）
  is_active BOOLEAN DEFAULT true,
  color TEXT DEFAULT '#6366f1',     -- UIバッジカラー
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ========================================
-- 3. role_permissions テーブル
--    ロールと権限の紐付け（多対多）
-- ========================================
CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(role_id, permission_id)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_perm ON role_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_roles_company ON roles(company_id);

-- ========================================
-- 4. 既存ロールのマイグレーション
--    super_admin / store_admin / pharmacist を roles テーブルに作成
-- ========================================
INSERT INTO roles (name, description, is_system, color, sort_order) VALUES
  ('全体管理者',   '全ての操作が可能なシステム管理者', true, '#7c3aed', 1),
  ('店舗管理者',   '担当店舗の管理とユーザー管理が可能', true, '#0d9488', 2),
  ('薬剤師',       '録音・文字起こし・SOAP編集が可能', true, '#2563eb', 3)
ON CONFLICT DO NOTHING;

-- 全体管理者: 全権限
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.name = '全体管理者'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 店舗管理者: 録音全般 + 管理画面(一部)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.name = '店舗管理者'
  AND p.key IN (
    'record.create','record.view_own','record.view_store','record.edit','record.delete','record.export',
    'admin.access','admin.stats','admin.user','admin.approve'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 薬剤師: 録音のみ
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.name = '薬剤師'
  AND p.key IN (
    'record.create','record.view_own','record.edit','record.export'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ========================================
-- 5. users テーブルに role_id カラム追加
--    （既存 role TEXT との並行運用）
-- ========================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='role_id') THEN
    ALTER TABLE users ADD COLUMN role_id UUID REFERENCES roles(id);
  END IF;
END $$;

-- 既存ユーザーの role_id をマイグレーション
UPDATE users SET role_id = (SELECT id FROM roles WHERE name = '全体管理者' LIMIT 1) WHERE role = 'super_admin' AND role_id IS NULL;
UPDATE users SET role_id = (SELECT id FROM roles WHERE name = '店舗管理者' LIMIT 1) WHERE role = 'store_admin' AND role_id IS NULL;
UPDATE users SET role_id = (SELECT id FROM roles WHERE name = '薬剤師'     LIMIT 1) WHERE role = 'pharmacist'  AND role_id IS NULL;

-- ========================================
-- 6. RLS
-- ========================================
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "permissions_select" ON permissions;
CREATE POLICY "permissions_select" ON permissions FOR SELECT USING (true);
DROP POLICY IF EXISTS "roles_select" ON roles;
CREATE POLICY "roles_select" ON roles FOR SELECT USING (true);
DROP POLICY IF EXISTS "roles_insert" ON roles;
CREATE POLICY "roles_insert" ON roles FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "roles_update" ON roles;
CREATE POLICY "roles_update" ON roles FOR UPDATE USING (true);
DROP POLICY IF EXISTS "roles_delete" ON roles;
CREATE POLICY "roles_delete" ON roles FOR DELETE USING (true);
DROP POLICY IF EXISTS "role_permissions_select" ON role_permissions;
CREATE POLICY "role_permissions_select" ON role_permissions FOR SELECT USING (true);
DROP POLICY IF EXISTS "role_permissions_insert" ON role_permissions;
CREATE POLICY "role_permissions_insert" ON role_permissions FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "role_permissions_delete" ON role_permissions;
CREATE POLICY "role_permissions_delete" ON role_permissions FOR DELETE USING (true);

-- ========================================
-- 7. ヘルパービュー: ユーザーの権限一覧
-- ========================================
CREATE OR REPLACE VIEW user_permissions_view AS
SELECT
  u.id AS user_id,
  u.email,
  u.role AS legacy_role,
  r.id AS role_id,
  r.name AS role_name,
  ARRAY_AGG(p.key ORDER BY p.sort_order) AS permission_keys
FROM users u
LEFT JOIN roles r ON u.role_id = r.id
LEFT JOIN role_permissions rp ON rp.role_id = r.id
LEFT JOIN permissions p ON rp.permission_id = p.id
GROUP BY u.id, u.email, u.role, r.id, r.name;

-- ========================================
DO $$ BEGIN RAISE NOTICE 'Phase B: カスタムロール管理テーブル作成完了！'; END $$;
