-- ============================================================
-- ユーザー管理の詳細権限 + パスワードリセット対応
-- ============================================================

-- 1. 詳細権限の追加
INSERT INTO permissions (key, label, description, category, sort_order) VALUES
  ('admin.user.view',      'ユーザー閲覧',        'ユーザー一覧を閲覧できる',                    'admin', 131),
  ('admin.user.edit',      'ユーザー編集',        'ユーザー情報（氏名・社員番号・店舗）を編集できる', 'admin', 132),
  ('admin.user.role',      'ロール変更',          'ユーザーのロールを変更できる',                  'admin', 133),
  ('admin.user.password',  'パスワードリセット',  'ユーザーのパスワードをリセットできる',          'admin', 134),
  ('admin.user.company',   '所属会社変更',        'ユーザーの所属会社を変更できる（最上位のみ推奨）', 'admin', 135),
  ('admin.user.delete',    'ユーザー削除',        'ユーザーを削除できる',                          'admin', 136),
  ('admin.user.add',       'ユーザー追加',        '新しいユーザーを追加できる',                    'admin', 137)
ON CONFLICT (key) DO NOTHING;

-- 2. 既存ロールに新権限を付与
-- 全体管理者: 全権限
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.name = '全体管理者' AND p.key LIKE 'admin.user.%'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 店舗管理者: 閲覧・編集・追加のみ（ロール変更・パスワード・会社変更・削除は不可）
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.name = '店舗管理者' AND p.key IN ('admin.user.view', 'admin.user.edit', 'admin.user.add')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 3. users テーブルに password_reset_requested カラム追加
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='password_reset_requested') THEN
    ALTER TABLE users ADD COLUMN password_reset_requested BOOLEAN DEFAULT false;
  END IF;
END $$;

-- ========================================
DO $$ BEGIN RAISE NOTICE 'ユーザー管理詳細権限 + パスワードリセット対応 完了！'; END $$;
