-- ============================================================
-- Slack通知設定 + 通知ルール
-- ============================================================

-- 1. notification_settings テーブル
CREATE TABLE IF NOT EXISTS notification_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  channel TEXT NOT NULL DEFAULT 'slack',     -- slack / email / webhook
  webhook_url TEXT NOT NULL DEFAULT '',       -- Slack Incoming Webhook URL
  channel_name TEXT DEFAULT '',               -- 通知先チャンネル名（表示用）
  -- どのイベントで通知するか
  notify_new_signup BOOLEAN DEFAULT true,     -- 新規登録申請
  notify_password_reset BOOLEAN DEFAULT true, -- パスワードリセット依頼
  notify_user_approved BOOLEAN DEFAULT true,  -- ユーザー承認時
  notify_daily_stats BOOLEAN DEFAULT false,   -- 日次統計レポート
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

DROP INDEX IF EXISTS idx_notification_settings_company;
CREATE INDEX idx_notification_settings_company ON notification_settings(company_id);

ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notif_select" ON notification_settings;
CREATE POLICY "notif_select" ON notification_settings FOR SELECT USING (
  get_my_role() IN ('super_admin', 'store_admin')
);
DROP POLICY IF EXISTS "notif_insert" ON notification_settings;
CREATE POLICY "notif_insert" ON notification_settings FOR INSERT WITH CHECK (
  get_my_role() = 'super_admin'
);
DROP POLICY IF EXISTS "notif_update" ON notification_settings;
CREATE POLICY "notif_update" ON notification_settings FOR UPDATE USING (
  get_my_role() = 'super_admin'
);
DROP POLICY IF EXISTS "notif_delete" ON notification_settings;
CREATE POLICY "notif_delete" ON notification_settings FOR DELETE USING (
  get_my_role() = 'super_admin'
);

DO $$ BEGIN RAISE NOTICE 'Slack通知設定テーブル作成完了！'; END $$;
