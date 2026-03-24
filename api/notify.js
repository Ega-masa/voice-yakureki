// voice-yakureki v5.6.0 api/notify.js
// Slack通知送信API
import { createClient } from '@supabase/supabase-js'

const ALLOWED_ORIGINS = [
  'https://voice-yakureki.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
];

function setCors(req, res) {
  const origin = req.headers?.origin || '';
  if (ALLOWED_ORIGINS.includes(origin) || origin.startsWith('chrome-extension://')) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function getAdminClient() {
  const url = process.env.SUPABASE_URL || 'https://lrtcrczgwxilukltetxa.supabase.co';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const admin = getAdminClient();
  if (!admin) return res.status(500).json({ error: 'Service key not configured' });

  const { event, company_id, data } = req.body || {};
  if (!event) return res.status(400).json({ error: 'event is required' });

  try {
    // 該当会社の通知設定を取得
    let q = admin.from('notification_settings').select('*').eq('is_active', true);
    if (company_id) {
      // 会社固有 + グローバル（company_id IS NULL）の両方
      q = q.or(`company_id.eq.${company_id},company_id.is.null`);
    }
    const { data: settings } = await q;
    if (!settings || settings.length === 0) return res.status(200).json({ sent: 0 });

    let sent = 0;
    for (const setting of settings) {
      if (!setting.webhook_url) continue;

      // イベントに応じた通知可否チェック
      const eventMap = {
        'new_signup': setting.notify_new_signup,
        'password_reset': setting.notify_password_reset,
        'user_approved': setting.notify_user_approved,
        'daily_stats': setting.notify_daily_stats,
      };
      if (!eventMap[event]) continue;

      // Slackメッセージ組み立て
      const icons = { new_signup: '📋', password_reset: '🔑', user_approved: '✅', daily_stats: '📊' };
      const titles = { new_signup: '新規登録申請', password_reset: 'パスワードリセット依頼', user_approved: 'ユーザー承認', daily_stats: '日次統計レポート' };
      const blocks = [
        { type: 'header', text: { type: 'plain_text', text: `${icons[event] || '🔔'} ${titles[event] || event}` } },
      ];
      if (data?.user_name) blocks.push({ type: 'section', text: { type: 'mrkdwn', text: `*ユーザー:* ${data.user_name}` } });
      if (data?.email) blocks.push({ type: 'section', text: { type: 'mrkdwn', text: `*メール:* ${data.email}` } });
      if (data?.store_name) blocks.push({ type: 'section', text: { type: 'mrkdwn', text: `*店舗:* ${data.store_name}` } });
      if (data?.message) blocks.push({ type: 'section', text: { type: 'mrkdwn', text: data.message } });
      blocks.push({ type: 'context', elements: [{ type: 'mrkdwn', text: `音声薬歴ツール • ${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}` }] });

      try {
        const r = await fetch(setting.webhook_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ blocks }),
        });
        if (r.ok) sent++;
      } catch (e) { console.error('Slack send error:', e); }
    }
    return res.status(200).json({ sent });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
