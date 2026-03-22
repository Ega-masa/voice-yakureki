// voice-yakureki v5.2.0 api/soap.js
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'GET') {
    const hasKey = !!process.env.ANTHROPIC_API_KEY;
    return res.status(200).json({
      status: 'ok', version: '5.2.0', file: 'api/soap.js',
      anthropic_key_set: hasKey,
      timestamp: new Date().toISOString()
    });
  }
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });

  const { transcript } = req.body || {};
  if (!transcript) return res.status(400).json({ error: 'transcript is required' });

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        system: `あなたは調剤薬局の薬歴SOAP分類アシスタントです。
薬剤師の服薬指導の文字起こしテキストを受け取り、以下のカテゴリに振り分けてください。

カテゴリ:
- S: 主観的情報（患者の訴え、自覚症状、服薬状況、生活習慣の発言）
- O: 客観的情報（検査値、バイタル、処方内容、外見的所見）
- A: 評価（薬剤師によるアセスメント、判断、コンプライアンス評価）
- EP: 教育計画（患者への説明内容、指導事項）
- CP: ケアプラン（治療方針、薬学的介入計画）
- OP: 観察計画（次回確認事項、モニタリング項目）
- P: 計画（今後の方針、フォローアップ予定）

ルール:
- テキストに含まれない情報は空文字にする
- 原文の表現をできるだけ活かす
- 医薬品名は正確に記載する
- 応答はJSON形式のみ。説明文は不要

必ず以下のJSON形式で応答してください:
{"S":"","O":"","A":"","EP":"","CP":"","OP":"","P":""}`,
        messages: [{ role: 'user', content: transcript }],
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({
        error: data.error?.message || JSON.stringify(data),
        detail: 'Anthropic API error'
      });
    }

    const text = data.content?.[0]?.text || '';
    let soap;
    try {
      const cleaned = text.replace(/```json\n?/g, '').replace(/```/g, '').trim();
      soap = JSON.parse(cleaned);
    } catch (e) {
      soap = { raw: text, parseError: true };
    }

    return res.status(200).json({ soap, version: '5.2.0' });
  } catch (e) {
    return res.status(500).json({ error: e.message, detail: 'Fetch failed' });
  }
}
