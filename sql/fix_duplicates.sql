-- ============================================================
-- Fix: 重複データクリーンアップ + UNIQUE制約追加
-- ============================================================
-- 実行場所: Supabase SQL Editor
-- これ1本で Phase B + C の修正が完了します
-- ============================================================

-- ========================================
-- 1. roles の重複クリーンアップ
--    同じ name で最古の1件だけ残す
-- ========================================
DELETE FROM role_permissions
WHERE role_id IN (
  SELECT id FROM roles
  WHERE id NOT IN (
    SELECT DISTINCT ON (name) id FROM roles ORDER BY name, created_at ASC
  )
);

UPDATE users SET role_id = NULL
WHERE role_id IN (
  SELECT id FROM roles
  WHERE id NOT IN (
    SELECT DISTINCT ON (name) id FROM roles ORDER BY name, created_at ASC
  )
);

DELETE FROM roles
WHERE id NOT IN (
  SELECT DISTINCT ON (name) id FROM roles ORDER BY name, created_at ASC
);

-- role_id の再紐付け（クリーンアップ後の正しいIDに）
UPDATE users SET role_id = (SELECT id FROM roles WHERE name = '全体管理者' LIMIT 1) WHERE role = 'super_admin';
UPDATE users SET role_id = (SELECT id FROM roles WHERE name = '店舗管理者' LIMIT 1) WHERE role = 'store_admin';
UPDATE users SET role_id = (SELECT id FROM roles WHERE name = '薬剤師'     LIMIT 1) WHERE role = 'pharmacist';

-- ========================================
-- 2. soap_templates の重複クリーンアップ
-- ========================================
DELETE FROM soap_templates
WHERE id NOT IN (
  SELECT DISTINCT ON (name) id FROM soap_templates ORDER BY name, created_at ASC
);

-- ========================================
-- 3. soap_check_rules の重複クリーンアップ
-- ========================================
DELETE FROM soap_check_rules
WHERE id NOT IN (
  SELECT DISTINCT ON (name) id FROM soap_check_rules ORDER BY name, created_at ASC
);

-- ========================================
-- 4. UNIQUE制約を追加（再発防止）
-- ========================================
-- roles: 同じ会社内でロール名はユニーク
-- (company_id が NULL の場合も考慮して関数インデックスを使用)
DROP INDEX IF EXISTS idx_roles_name_unique;
CREATE UNIQUE INDEX idx_roles_name_unique ON roles (name, COALESCE(company_id, '00000000-0000-0000-0000-000000000000'));

-- soap_templates: 同じ名前+会社+店舗の組み合わせはユニーク
DROP INDEX IF EXISTS idx_soap_templates_name_unique;
CREATE UNIQUE INDEX idx_soap_templates_name_unique ON soap_templates (name, COALESCE(company_id, '00000000-0000-0000-0000-000000000000'), COALESCE(store_id, '00000000-0000-0000-0000-000000000000'));

-- soap_check_rules: 同じ名前+会社の組み合わせはユニーク
DROP INDEX IF EXISTS idx_soap_check_rules_name_unique;
CREATE UNIQUE INDEX idx_soap_check_rules_name_unique ON soap_check_rules (name, COALESCE(company_id, '00000000-0000-0000-0000-000000000000'));

-- ========================================
-- 5. 権限の再投入（重複削除で消えた分を補完）
-- ========================================
-- 全体管理者: 全権限
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.name = '全体管理者'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 店舗管理者
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.name = '店舗管理者'
  AND p.key IN (
    'record.create','record.view_own','record.view_store','record.edit','record.delete','record.export',
    'admin.access','admin.stats','admin.user','admin.approve'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 薬剤師
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.name = '薬剤師'
  AND p.key IN (
    'record.create','record.view_own','record.edit','record.export'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ========================================
DO $$ BEGIN RAISE NOTICE '重複クリーンアップ + UNIQUE制約追加 完了！'; END $$;
