-- ============================================
-- 주식회사 오름히 회계관리 시스템 v4.0 - 데이터베이스 설정
-- Supabase SQL Editor에서 이 파일 전체를 복사하여 실행하세요
-- ============================================

-- 1. 매출
CREATE TABLE IF NOT EXISTS revenue (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  date DATE NOT NULL,
  client TEXT,
  description TEXT,
  amount NUMERIC NOT NULL DEFAULT 0,
  category TEXT NOT NULL DEFAULT '기타매출',
  memo TEXT
);

-- 2. 지출 (image_url 추가 - 영수증 이미지)
CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  date DATE NOT NULL,
  pay_method TEXT NOT NULL DEFAULT '법인카드',
  client TEXT,
  description TEXT,
  amount NUMERIC NOT NULL DEFAULT 0,
  category TEXT NOT NULL DEFAULT '기타',
  card_name TEXT,
  memo TEXT,
  image_url TEXT
);

-- 3. 정기지출
CREATE TABLE IF NOT EXISTS recurring (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT '구독서비스',
  cycle TEXT NOT NULL DEFAULT '매월',
  amount NUMERIC NOT NULL DEFAULT 0,
  pay_method TEXT NOT NULL DEFAULT '법인카드',
  next_date DATE,
  memo TEXT,
  active BOOLEAN DEFAULT TRUE
);

-- 4. 통장관리
CREATE TABLE IF NOT EXISTS bank_transactions (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  date DATE NOT NULL,
  bank_name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT '입금',
  amount NUMERIC NOT NULL DEFAULT 0,
  description TEXT,
  balance NUMERIC DEFAULT 0,
  memo TEXT
);

-- 5. 거래처
CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  name TEXT NOT NULL,
  biz_no TEXT,
  contact TEXT,
  email TEXT,
  ar NUMERIC DEFAULT 0,
  ap NUMERIC DEFAULT 0
);

-- 6. 세금계산서
CREATE TABLE IF NOT EXISTS tax_invoices (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  type TEXT NOT NULL DEFAULT '발행',
  date DATE NOT NULL,
  client TEXT,
  supply NUMERIC NOT NULL DEFAULT 0,
  tax NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  status TEXT DEFAULT '발행완료'
);

-- 7. 급여
CREATE TABLE IF NOT EXISTS payroll (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  name TEXT NOT NULL,
  position TEXT,
  base_salary NUMERIC NOT NULL DEFAULT 0,
  bonus NUMERIC DEFAULT 0,
  deductions NUMERIC DEFAULT 0,
  gross NUMERIC DEFAULT 0,
  income_tax NUMERIC DEFAULT 0,
  pension NUMERIC DEFAULT 0,
  health NUMERIC DEFAULT 0,
  employ NUMERIC DEFAULT 0,
  total_ded NUMERIC DEFAULT 0,
  net_pay NUMERIC DEFAULT 0,
  pay_date DATE
);

-- 8. 계약/견적
CREATE TABLE IF NOT EXISTS contracts (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  date DATE NOT NULL,
  type TEXT NOT NULL DEFAULT '계약서',
  client TEXT,
  title TEXT NOT NULL,
  amount NUMERIC DEFAULT 0,
  start_date DATE,
  end_date DATE,
  status TEXT DEFAULT '진행중',
  memo TEXT
);

-- 9. 증빙관리
CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  date DATE NOT NULL,
  doc_type TEXT NOT NULL DEFAULT '세금계산서',
  description TEXT NOT NULL,
  amount NUMERIC DEFAULT 0,
  status TEXT DEFAULT '보관완료',
  memo TEXT
);

-- 10. 메모장 (NEW)
CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  title TEXT NOT NULL,
  content TEXT,
  pinned BOOLEAN DEFAULT FALSE
);

-- 11. 예산 (NEW)
CREATE TABLE IF NOT EXISTS budgets (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  category TEXT NOT NULL,
  monthly_limit NUMERIC NOT NULL DEFAULT 0,
  active BOOLEAN DEFAULT TRUE
);

-- 12. 즐겨찾기 거래 (NEW)
CREATE TABLE IF NOT EXISTS favorites (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  label TEXT NOT NULL,
  date_offset INT DEFAULT 0,
  pay_method TEXT,
  client TEXT,
  description TEXT,
  amount NUMERIC DEFAULT 0,
  category TEXT,
  table_name TEXT NOT NULL DEFAULT 'expenses'
);

-- 13. 앱 설정 (NEW)
CREATE TABLE IF NOT EXISTS app_settings (
  id TEXT PRIMARY KEY DEFAULT 'main',
  pin_hash TEXT,
  font_size TEXT DEFAULT 'medium',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 기본 설정 행 추가
INSERT INTO app_settings (id, font_size) VALUES ('main', 'medium') ON CONFLICT (id) DO NOTHING;

-- ============================================
-- Row Level Security + 정책
-- ============================================
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'revenue','expenses','recurring','bank_transactions','clients',
    'tax_invoices','payroll','contracts','documents',
    'notes','budgets','favorites','app_settings'
  ])
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY "Allow all" ON %I FOR ALL USING (true) WITH CHECK (true)', t);
  END LOOP;
END $$;

-- ============================================
-- 영수증 이미지 저장소 (Supabase Storage)
-- ============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Allow public upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'receipts');

CREATE POLICY "Allow public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'receipts');

CREATE POLICY "Allow public delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'receipts');
