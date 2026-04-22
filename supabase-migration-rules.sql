-- ============================================
-- 회계앱 - 분류 규칙 테이블 추가
-- Supabase SQL Editor에서 실행하세요
-- ============================================

CREATE TABLE IF NOT EXISTS category_rules (
  id TEXT PRIMARY KEY,
  client TEXT NOT NULL,
  category TEXT NOT NULL,
  pay_method TEXT DEFAULT '체크카드',
  type TEXT DEFAULT 'expense',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE category_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON category_rules FOR ALL USING (true) WITH CHECK (true);
