// voice-yakureki v5.5.0 api/admin.js
// 管理者専用API: パスワードリセット、会社コード検索
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

// service_role_key を使う管理者用クライアント
function getAdminClient() {
  const url = process.env.SUPABASE_URL || 'https://lrtcrczgwxilukltetxa.supabase.co';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

// anon_key を使う一般クライアント（認証検証用）
function getAnonClient() {
  const url = process.env.SUPABASE_URL || 'https://lrtcrczgwxilukltetxa.supabase.co';
  const key = process.env.SUPABASE_ANON_KEY || '';
  return createClient(url, key);
}

// リクエスト元ユーザーの認証＋ロール確認
async function verifyAdmin(req) {
  const authHeader = req.headers?.authorization;
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  try {
    const anon = getAnonClient();
    const { data, error } = await anon.auth.getUser(token);
    if (error || !data?.user) return null;
    // usersテーブルからロール確認
    const admin = getAdminClient();
    if (!admin) return null;
    const { data: userRow } = await admin.from('users').select('id, role, role_id, company_id').eq('id', data.user.id).single();
    return userRow;
  } catch { return null; }
}

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const admin = getAdminClient();
  if (!admin) return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY not configured' });

  const { action } = req.body || {};

  // === 会社コード検索（認証不要） ===
  if (action === 'find_company_by_email') {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'email is required' });
    try {
      const { data: user } = await admin.from('users').select('company_id').eq('email', email.toLowerCase().trim()).single();
      if (!user?.company_id) return res.status(404).json({ error: 'アカウントが見つかりません' });
      const { data: company } = await admin.from('companies').select('company_code, name').eq('id', user.company_id).single();
      if (!company) return res.status(404).json({ error: '会社情報が見つかりません' });
      // セキュリティ: コードの一部だけ返す
      const code = company.company_code;
      const masked = code.length > 2 ? code[0] + '*'.repeat(code.length - 2) + code[code.length - 1] : '***';
      return res.status(200).json({ company_name: company.name, masked_code: masked });
    } catch (e) { return res.status(500).json({ error: e.message }); }
  }

  // === 以下は管理者認証が必要 ===
  const caller = await verifyAdmin(req);
  if (!caller) return res.status(401).json({ error: 'Unauthorized' });

  // === パスワードリセット ===
  if (action === 'reset_password') {
    const { target_user_id, new_password } = req.body;
    if (!target_user_id || !new_password) return res.status(400).json({ error: 'target_user_id and new_password are required' });
    if (new_password.length < 6) return res.status(400).json({ error: 'パスワードは6文字以上必要です' });

    // ロール階層チェック
    try {
      const { data: targetUser } = await admin.from('users').select('role, role_id').eq('id', target_user_id).single();
      if (!targetUser) return res.status(404).json({ error: 'ユーザーが見つかりません' });

      // sort_orderで階層チェック
      const { data: roles } = await admin.from('roles').select('id, sort_order').order('sort_order');
      const callerRole = (roles || []).find(r => r.id === caller.role_id);
      const targetRole = (roles || []).find(r => r.id === targetUser.role_id);
      const callerOrder = callerRole?.sort_order ?? (caller.role === 'super_admin' ? 0 : 99);
      const targetOrder = targetRole?.sort_order ?? (targetUser.role === 'super_admin' ? 0 : 99);
      if (callerOrder > targetOrder) return res.status(403).json({ error: '上位ロールのユーザーのパスワードは変更できません' });

      // パスワード更新
      const { error } = await admin.auth.admin.updateUserById(target_user_id, { password: new_password });
      if (error) throw error;
      return res.status(200).json({ success: true });
    } catch (e) { return res.status(500).json({ error: e.message }); }
  }

  // === パスワードリセット（メール経由セルフサービス） ===
  if (action === 'request_password_reset') {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'email is required' });
    try {
      // ユーザー存在確認
      const { data: user } = await admin.from('users').select('id, display_name').eq('email', email.toLowerCase().trim()).single();
      if (!user) return res.status(404).json({ error: 'アカウントが見つかりません' });
      // 管理者にリセット依頼フラグを立てる（password_reset_requested カラムがあれば使うが、なくても動く）
      try {
        await admin.from('users').update({ password_reset_requested: true }).eq('id', user.id);
      } catch {}
      return res.status(200).json({ success: true, message: '管理者にパスワードリセットを依頼しました' });
    } catch (e) { return res.status(500).json({ error: e.message }); }
  }

  return res.status(400).json({ error: 'Unknown action' });
}
