-- ============================================================
-- Phase A: hourly_stats テーブル + 自動集計トリガー
-- 音声薬歴ツール v5.4.0
-- ============================================================
-- 実行場所: Supabase SQL Editor
-- 注意: 上から順に全体を1回で実行してください
-- ============================================================

-- ========================================
-- 1. hourly_stats テーブル作成
--    時間帯別の録音集計（永続保存）
-- ========================================
CREATE TABLE IF NOT EXISTS hourly_stats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  stat_date DATE NOT NULL,
  stat_hour INT NOT NULL CHECK (stat_hour >= 0 AND stat_hour <= 23),
  record_count INT NOT NULL DEFAULT 0,
  total_duration_sec INT NOT NULL DEFAULT 0,
  user_ids TEXT[] DEFAULT '{}',  -- その時間帯に録音したユーザーIDリスト
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- 店舗 × 日付 × 時間 でユニーク
  UNIQUE(store_id, stat_date, stat_hour)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_hourly_stats_date ON hourly_stats(stat_date);
CREATE INDEX IF NOT EXISTS idx_hourly_stats_store ON hourly_stats(store_id);
CREATE INDEX IF NOT EXISTS idx_hourly_stats_company ON hourly_stats(company_id);
CREATE INDEX IF NOT EXISTS idx_hourly_stats_store_date ON hourly_stats(store_id, stat_date);
CREATE INDEX IF NOT EXISTS idx_hourly_stats_company_date ON hourly_stats(company_id, stat_date);

-- ========================================
-- 2. トリガー関数: records INSERT 時に hourly_stats を更新
-- ========================================
CREATE OR REPLACE FUNCTION fn_update_hourly_stats()
RETURNS TRIGGER AS $$
DECLARE
  v_date DATE;
  v_hour INT;
  v_company_id UUID;
  v_user_id TEXT;
BEGIN
  -- JST (UTC+9) で日付・時間を取得
  v_date := (NEW.created_at AT TIME ZONE 'Asia/Tokyo')::DATE;
  v_hour := EXTRACT(HOUR FROM (NEW.created_at AT TIME ZONE 'Asia/Tokyo'));
  v_user_id := COALESCE(NEW.created_by::TEXT, '');
  
  -- 店舗から会社IDを取得
  IF NEW.store_id IS NOT NULL THEN
    SELECT company_id INTO v_company_id FROM stores WHERE id = NEW.store_id;
  END IF;

  -- UPSERT: 存在すればカウントアップ、なければ新規作成
  INSERT INTO hourly_stats (store_id, company_id, stat_date, stat_hour, record_count, total_duration_sec, user_ids)
  VALUES (
    NEW.store_id,
    v_company_id,
    v_date,
    v_hour,
    1,
    COALESCE(NEW.duration_sec, 0),
    CASE WHEN v_user_id = '' THEN '{}' ELSE ARRAY[v_user_id] END
  )
  ON CONFLICT (store_id, stat_date, stat_hour)
  DO UPDATE SET
    record_count = hourly_stats.record_count + 1,
    total_duration_sec = hourly_stats.total_duration_sec + COALESCE(NEW.duration_sec, 0),
    user_ids = CASE 
      WHEN v_user_id = '' THEN hourly_stats.user_ids
      WHEN v_user_id = ANY(hourly_stats.user_ids) THEN hourly_stats.user_ids
      ELSE array_append(hourly_stats.user_ids, v_user_id)
    END,
    updated_at = now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- トリガー設定
DROP TRIGGER IF EXISTS trg_hourly_stats ON records;
CREATE TRIGGER trg_hourly_stats
  AFTER INSERT ON records
  FOR EACH ROW
  EXECUTE FUNCTION fn_update_hourly_stats();

-- ========================================
-- 3. バックフィル: 既存 records から hourly_stats を生成
-- ========================================
INSERT INTO hourly_stats (store_id, company_id, stat_date, stat_hour, record_count, total_duration_sec, user_ids)
SELECT
  r.store_id,
  s.company_id,
  (r.created_at AT TIME ZONE 'Asia/Tokyo')::DATE AS stat_date,
  EXTRACT(HOUR FROM (r.created_at AT TIME ZONE 'Asia/Tokyo'))::INT AS stat_hour,
  COUNT(*) AS record_count,
  COALESCE(SUM(r.duration_sec), 0) AS total_duration_sec,
  ARRAY_AGG(DISTINCT r.created_by::TEXT) FILTER (WHERE r.created_by IS NOT NULL) AS user_ids
FROM records r
LEFT JOIN stores s ON r.store_id = s.id
GROUP BY r.store_id, s.company_id,
  (r.created_at AT TIME ZONE 'Asia/Tokyo')::DATE,
  EXTRACT(HOUR FROM (r.created_at AT TIME ZONE 'Asia/Tokyo'))::INT
ON CONFLICT (store_id, stat_date, stat_hour)
DO UPDATE SET
  record_count = EXCLUDED.record_count,
  total_duration_sec = EXCLUDED.total_duration_sec,
  user_ids = EXCLUDED.user_ids,
  updated_at = now();

-- ========================================
-- 4. RLS (Row Level Security)
-- ========================================
ALTER TABLE hourly_stats ENABLE ROW LEVEL SECURITY;

-- 既存ポリシーがあれば削除してから再作成
DROP POLICY IF EXISTS "hourly_stats_select" ON hourly_stats;
CREATE POLICY "hourly_stats_select" ON hourly_stats
  FOR SELECT USING (true);

-- INSERT/UPDATE は system（トリガー経由）のみ
-- トリガー関数が SECURITY DEFINER なので RLS を bypass する

-- ========================================
-- 5. daily_stats ビュー（日別集計の便利ビュー）
-- ========================================
CREATE OR REPLACE VIEW daily_stats AS
SELECT
  store_id,
  company_id,
  stat_date,
  SUM(record_count) AS record_count,
  SUM(total_duration_sec) AS total_duration_sec,
  (SELECT COUNT(DISTINCT u) FROM hourly_stats h2, UNNEST(h2.user_ids) u 
   WHERE h2.store_id = hourly_stats.store_id AND h2.stat_date = hourly_stats.stat_date) AS unique_users
FROM hourly_stats
GROUP BY store_id, company_id, stat_date;

-- ========================================
-- 完了メッセージ
-- ========================================
DO $$ BEGIN RAISE NOTICE 'Phase A: hourly_stats テーブル作成完了！'; END $$;
