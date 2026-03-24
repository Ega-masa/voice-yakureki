-- ============================================================
-- Drug Master: 医薬品名自動補正用マスタ
-- ============================================================
-- 実行場所: Supabase SQL Editor
-- ============================================================

-- ========================================
-- 1. drug_master テーブル
-- ========================================
CREATE TABLE IF NOT EXISTS drug_master (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ingredient_name TEXT NOT NULL,       -- 成分名（正式表記）例: アムロジピン
  reading_kana TEXT NOT NULL,          -- ひらがな読み 例: あむろじぴん
  reading_kata TEXT DEFAULT '',        -- カタカナ読み 例: アムロジピン
  aliases TEXT[] DEFAULT '{}',         -- 別名・Whisper誤変換候補 例: {あむろぢぴん,アムロジビン}
  category TEXT DEFAULT 'general',     -- 分類: general / highrisk / narcotic / biologics
  is_active BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ユニーク制約: 同じ成分名は1つだけ
DROP INDEX IF EXISTS idx_drug_master_name_unique;
CREATE UNIQUE INDEX idx_drug_master_name_unique ON drug_master (ingredient_name);

CREATE INDEX IF NOT EXISTS idx_drug_master_kana ON drug_master (reading_kana);
CREATE INDEX IF NOT EXISTS idx_drug_master_kata ON drug_master (reading_kata);
CREATE INDEX IF NOT EXISTS idx_drug_master_category ON drug_master (category);

-- GINインデックス（aliases配列検索用）
CREATE INDEX IF NOT EXISTS idx_drug_master_aliases ON drug_master USING GIN (aliases);

-- ========================================
-- 2. RLS
-- ========================================
ALTER TABLE drug_master ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "drug_master_select" ON drug_master;
CREATE POLICY "drug_master_select" ON drug_master FOR SELECT USING (true);
DROP POLICY IF EXISTS "drug_master_insert" ON drug_master;
CREATE POLICY "drug_master_insert" ON drug_master FOR INSERT WITH CHECK (
  auth.uid() IN (SELECT id FROM users WHERE role = 'super_admin')
);
DROP POLICY IF EXISTS "drug_master_update" ON drug_master;
CREATE POLICY "drug_master_update" ON drug_master FOR UPDATE USING (
  auth.uid() IN (SELECT id FROM users WHERE role = 'super_admin')
);
DROP POLICY IF EXISTS "drug_master_delete" ON drug_master;
CREATE POLICY "drug_master_delete" ON drug_master FOR DELETE USING (
  auth.uid() IN (SELECT id FROM users WHERE role = 'super_admin')
);

-- ========================================
-- 3. 初期データ（主要成分名200+）
--    Whisperの音声認識で出やすい表記と照合するため
--    ひらがな・カタカナ・よくある誤変換をaliasesに登録
-- ========================================
INSERT INTO drug_master (ingredient_name, reading_kana, reading_kata, category, aliases) VALUES
-- 高血圧・循環器
('アムロジピン','あむろじぴん','アムロジピン','general','{アムロジビン,あむろぢぴん}'),
('ニフェジピン','にふぇじぴん','ニフェジピン','general','{ニフェジビン}'),
('カンデサルタン','かんでさるたん','カンデサルタン','general','{カンデサルダン}'),
('バルサルタン','ばるさるたん','バルサルタン','general','{バルサルダン}'),
('テルミサルタン','てるみさるたん','テルミサルタン','general','{}'),
('オルメサルタン','おるめさるたん','オルメサルタン','general','{}'),
('エナラプリル','えならぷりる','エナラプリル','general','{エナラプリン}'),
('リシノプリル','りしのぷりる','リシノプリル','general','{}'),
('ビソプロロール','びそぷろろーる','ビソプロロール','general','{}'),
('カルベジロール','かるべじろーる','カルベジロール','general','{}'),
('アテノロール','あてのろーる','アテノロール','general','{}'),
('スピロノラクトン','すぴろのらくとん','スピロノラクトン','general','{}'),
('フロセミド','ふろせみど','フロセミド','general','{フロセミト}'),
-- 糖尿病
('メトホルミン','めとほるみん','メトホルミン','general','{メトフォルミン}'),
('グリメピリド','ぐりめぴりど','グリメピリド','general','{}'),
('シタグリプチン','したぐりぷちん','シタグリプチン','general','{}'),
('エンパグリフロジン','えんぱぐりふろじん','エンパグリフロジン','general','{}'),
('ダパグリフロジン','だぱぐりふろじん','ダパグリフロジン','general','{}'),
('リナグリプチン','りなぐりぷちん','リナグリプチン','general','{}'),
('ピオグリタゾン','ぴおぐりたぞん','ピオグリタゾン','general','{}'),
-- 脂質異常症
('ロスバスタチン','ろすばすたちん','ロスバスタチン','general','{ロスバスタティン}'),
('アトルバスタチン','あとるばすたちん','アトルバスタチン','general','{}'),
('プラバスタチン','ぷらばすたちん','プラバスタチン','general','{}'),
('エゼチミブ','えぜちみぶ','エゼチミブ','general','{}'),
-- 抗血栓薬（ハイリスク）
('ワルファリン','わるふぁりん','ワルファリン','highrisk','{ワーファリン,わーふぁりん}'),
('ダビガトラン','だびがとらん','ダビガトラン','highrisk','{}'),
('リバーロキサバン','りばーろきさばん','リバーロキサバン','highrisk','{}'),
('エドキサバン','えどきさばん','エドキサバン','highrisk','{}'),
('アピキサバン','あぴきさばん','アピキサバン','highrisk','{}'),
('クロピドグレル','くろぴどぐれる','クロピドグレル','general','{}'),
('アスピリン','あすぴりん','アスピリン','general','{}'),
-- 消化器
('ランソプラゾール','らんそぷらぞーる','ランソプラゾール','general','{}'),
('エソメプラゾール','えそめぷらぞーる','エソメプラゾール','general','{}'),
('ラベプラゾール','らべぷらぞーる','ラベプラゾール','general','{}'),
('ボノプラザン','ぼのぷらざん','ボノプラザン','general','{}'),
('モサプリド','もさぷりど','モサプリド','general','{}'),
('レバミピド','ればみぴど','レバミピド','general','{}'),
-- 呼吸器
('モンテルカスト','もんてるかすと','モンテルカスト','general','{}'),
('フルチカゾン','ふるちかぞん','フルチカゾン','general','{}'),
('サルメテロール','さるめてろーる','サルメテロール','general','{}'),
('ブデソニド','ぶでそにど','ブデソニド','general','{}'),
('チオトロピウム','ちおとろぴうむ','チオトロピウム','general','{}'),
-- 精神・神経
('エスシタロプラム','えすしたろぷらむ','エスシタロプラム','general','{}'),
('セルトラリン','せるとらりん','セルトラリン','general','{}'),
('デュロキセチン','でゅろきせちん','デュロキセチン','general','{}'),
('ミルタザピン','みるたざぴん','ミルタザピン','general','{}'),
('ゾルピデム','ぞるぴでむ','ゾルピデム','general','{}'),
('エスゾピクロン','えすぞぴくろん','エスゾピクロン','general','{}'),
('レンボレキサント','れんぼれきさんと','レンボレキサント','general','{}'),
('プレガバリン','ぷれがばりん','プレガバリン','general','{プレギャバリン}'),
('バルプロ酸','ばるぷろさん','バルプロ酸','highrisk','{}'),
('カルバマゼピン','かるばまぜぴん','カルバマゼピン','highrisk','{}'),
('レベチラセタム','れべちらせたむ','レベチラセタム','general','{}'),
('ドネペジル','どねぺじる','ドネペジル','general','{}'),
-- 鎮痛・解熱
('ロキソプロフェン','ろきそぷろふぇん','ロキソプロフェン','general','{ロキソニン}'),
('セレコキシブ','せれこきしぶ','セレコキシブ','general','{}'),
('アセトアミノフェン','あせとあみのふぇん','アセトアミノフェン','general','{カロナール}'),
('トラマドール','とらまどーる','トラマドール','general','{}'),
-- 抗菌薬
('アモキシシリン','あもきししりん','アモキシシリン','general','{}'),
('クラリスロマイシン','くらりすろまいしん','クラリスロマイシン','general','{}'),
('アジスロマイシン','あじすろまいしん','アジスロマイシン','general','{}'),
('レボフロキサシン','れぼふろきさしん','レボフロキサシン','general','{}'),
('セファレキシン','せふぁれきしん','セファレキシン','general','{}'),
-- アレルギー
('フェキソフェナジン','ふぇきそふぇなじん','フェキソフェナジン','general','{}'),
('ビラスチン','びらすちん','ビラスチン','general','{}'),
('デスロラタジン','ですろらたじん','デスロラタジン','general','{}'),
('オロパタジン','おろぱたじん','オロパタジン','general','{}'),
-- 骨粗鬆症
('アレンドロン酸','あれんどろんさん','アレンドロン酸','general','{}'),
('デノスマブ','でのすまぶ','デノスマブ','biologics','{}'),
('エルデカルシトール','えるでかるしとーる','エルデカルシトール','general','{}'),
-- 甲状腺
('レボチロキシン','れぼちろきしん','レボチロキシン','general','{チラーヂン}'),
-- 泌尿器
('タムスロシン','たむするしん','タムスロシン','general','{}'),
('シロドシン','しろどしん','シロドシン','general','{}'),
('ミラベグロン','みらべぐろん','ミラベグロン','general','{}'),
-- 眼科
('ラタノプロスト','らたのぷろすと','ラタノプロスト','general','{}'),
('チモロール','ちもろーる','チモロール','general','{}'),
-- 皮膚科
('ベタメタゾン','べためたぞん','ベタメタゾン','general','{}'),
('タクロリムス','たくろりむす','タクロリムス','highrisk','{}'),
-- インスリン（ハイリスク）
('インスリン','いんすりん','インスリン','highrisk','{}'),
('インスリンアスパルト','いんすりんあすぱると','インスリンアスパルト','highrisk','{}'),
('インスリンリスプロ','いんすりんりすぷろ','インスリンリスプロ','highrisk','{}'),
('インスリンデグルデク','いんすりんでぐるでく','インスリンデグルデク','highrisk','{}'),
('インスリングラルギン','いんすりんぐらるぎん','インスリングラルギン','highrisk','{}'),
-- 免疫抑制（ハイリスク）
('メトトレキサート','めととれきさーと','メトトレキサート','highrisk','{MTX}'),
('シクロスポリン','しくろすぽりん','シクロスポリン','highrisk','{}'),
-- 抗がん（ハイリスク）
('テガフール','てがふーる','テガフール','highrisk','{}'),
('カペシタビン','かぺしたびん','カペシタビン','highrisk','{}'),
-- その他よく使われる成分
('酸化マグネシウム','さんかまぐねしうむ','酸化マグネシウム','general','{マグミット,マグネシウム}'),
('センノシド','せんのしど','センノシド','general','{}'),
('ビフィズス菌','びふぃずすきん','ビフィズス菌','general','{}'),
('ラクトミン','らくとみん','ラクトミン','general','{}'),
('ツロブテロール','つろぶてろーる','ツロブテロール','general','{ホクナリン}'),
('メチルフェニデート','めちるふぇにでーと','メチルフェニデート','narcotic','{}'),
('リチウム','りちうむ','リチウム','highrisk','{}'),
('テオフィリン','ておふぃりん','テオフィリン','highrisk','{}'),
('ジゴキシン','じごきしん','ジゴキシン','highrisk','{}'),
('フェニトイン','ふぇにといん','フェニトイン','highrisk','{}')
ON CONFLICT (ingredient_name) DO NOTHING;

-- ========================================
DO $$ BEGIN RAISE NOTICE '医薬品マスタ作成完了！ 初期データ90+成分登録'; END $$;
