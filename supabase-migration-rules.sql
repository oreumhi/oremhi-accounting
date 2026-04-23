-- ============================================
-- 회계앱 - 분류 규칙 + 영수증 보관함 테이블 추가
-- Supabase SQL Editor에서 실행하세요
-- ============================================

-- 1. 분류 규칙 테이블
CREATE TABLE IF NOT EXISTS category_rules (
  id TEXT PRIMARY KEY,
  client TEXT NOT NULL,
  category TEXT NOT NULL,
  pay_method TEXT DEFAULT '체크카드',
  type TEXT DEFAULT 'expense',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE category_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all category_rules" ON category_rules FOR ALL USING (true) WITH CHECK (true);

-- 2. 영수증 보관함 테이블
CREATE TABLE IF NOT EXISTS receipt_storage (
  id TEXT PRIMARY KEY,
  image_url TEXT NOT NULL,
  date TEXT,
  amount NUMERIC DEFAULT 0,
  client TEXT DEFAULT '',
  memo TEXT DEFAULT '',
  linked BOOLEAN DEFAULT false,
  linked_expense_id TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE receipt_storage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all receipt_storage" ON receipt_storage FOR ALL USING (true) WITH CHECK (true);
