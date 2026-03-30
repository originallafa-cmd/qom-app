-- ============================================
-- Queen of Mahshi — Database Schema
-- ============================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- STAFF
-- ============================================
CREATE TABLE staff (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  pin_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('staff', 'admin')),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed staff
-- PINs will be set via admin portal; these are placeholders
INSERT INTO staff (name, role) VALUES
  ('Cisene', 'staff'),
  ('Rose Catherine', 'staff'),
  ('Malimie', 'staff'),
  ('Mae Ann', 'staff'),
  ('Reyana', 'staff');

-- ============================================
-- DAILY SALES
-- ============================================
CREATE TABLE daily_sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL,
  cash NUMERIC(10,2) NOT NULL DEFAULT 0,
  card NUMERIC(10,2) NOT NULL DEFAULT 0,
  talabat NUMERIC(10,2) NOT NULL DEFAULT 0,
  total NUMERIC(10,2) GENERATED ALWAYS AS (cash + card + talabat) STORED,
  expenses NUMERIC(10,2) NOT NULL DEFAULT 0,
  net NUMERIC(10,2) GENERATED ALWAYS AS (cash + card + talabat - expenses) STORED,
  notes TEXT,
  staff_id UUID REFERENCES staff(id),
  opening_cash NUMERIC(10,2) NOT NULL DEFAULT 0,
  pt_cash NUMERIC(10,2) NOT NULL DEFAULT 0,
  closing_cash NUMERIC(10,2) GENERATED ALWAYS AS (opening_cash + cash - expenses + pt_cash) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES staff(id),
  UNIQUE(date)
);

CREATE INDEX idx_daily_sales_date ON daily_sales(date DESC);

-- ============================================
-- EXPENSE ITEMS (line items per daily entry)
-- ============================================
CREATE TABLE expense_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  daily_sales_id UUID NOT NULL REFERENCES daily_sales(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('vegetables', 'bread', 'drinks', 'cleaning', 'other'))
);

CREATE INDEX idx_expense_items_daily ON expense_items(daily_sales_id);

-- ============================================
-- UNIFIED INVENTORY
-- ============================================
CREATE TABLE inventory_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('grocery', 'packaging', 'kitchen')),
  category TEXT,
  qty NUMERIC(10,2) NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'pcs',
  reorder_at NUMERIC(10,2) NOT NULL DEFAULT 0,
  usage_rate NUMERIC(10,2) DEFAULT 0,
  usage_period TEXT DEFAULT 'weekly' CHECK (usage_period IN ('daily', 'weekly')),
  time_remaining NUMERIC(10,2) DEFAULT 0,
  status TEXT GENERATED ALWAYS AS (
    CASE
      WHEN qty <= 0 THEN 'out'
      WHEN qty <= reorder_at THEN 'low'
      ELSE 'ok'
    END
  ) STORED,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('critical', 'high', 'normal', 'low')),
  supplier TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_inventory_type ON inventory_items(type);
CREATE INDEX idx_inventory_status ON inventory_items(status);

-- ============================================
-- INVENTORY COUNTS (history)
-- ============================================
CREATE TABLE inventory_counts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  qty NUMERIC(10,2) NOT NULL,
  counted_by UUID REFERENCES staff(id),
  counted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_inventory_counts_item ON inventory_counts(item_id, counted_at DESC);

-- ============================================
-- PRODUCTION LOG
-- ============================================
CREATE TABLE production_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  item TEXT NOT NULL,
  quantity NUMERIC(10,2) NOT NULL,
  unit TEXT NOT NULL DEFAULT 'pcs',
  made_by UUID REFERENCES staff(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_production_date ON production_log(date DESC);

-- ============================================
-- DELIVERIES
-- ============================================
CREATE TABLE deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  supplier TEXT NOT NULL,
  items_json JSONB NOT NULL DEFAULT '[]',
  received_by UUID REFERENCES staff(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- BANK TRANSACTIONS
-- ============================================
CREATE TABLE bank_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL,
  description TEXT NOT NULL,
  debit NUMERIC(12,2) DEFAULT 0,
  credit NUMERIC(12,2) DEFAULT 0,
  balance NUMERIC(12,2),
  biz_or_personal TEXT NOT NULL DEFAULT 'biz' CHECK (biz_or_personal IN ('biz', 'personal')),
  category TEXT,
  ref_no TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bank_date ON bank_transactions(date DESC);

-- ============================================
-- EQUITY LEDGER (reset to zero Mar 28, 2026)
-- ============================================
CREATE TABLE equity_ledger (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  type TEXT NOT NULL CHECK (type IN ('personal_from_biz', 'personal_into_biz', 'adjustment')),
  amount NUMERIC(12,2) NOT NULL,
  description TEXT,
  running_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Initial reset entry
INSERT INTO equity_ledger (date, type, amount, description, running_total)
VALUES ('2026-03-28', 'adjustment', 0, 'Equity reset to zero — Mohamed & Ahmed agreed to call it even', 0);

-- ============================================
-- MONTHLY EXPENSES (fixed costs)
-- ============================================
CREATE TABLE expenses_monthly (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  month TEXT NOT NULL, -- Format: '2026-03'
  item TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue')),
  category TEXT NOT NULL CHECK (category IN ('salaries', 'rent', 'suppliers', 'utilities', 'delivery', 'packaging', 'petty_cash', 'other')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_expenses_month ON expenses_monthly(month);

-- ============================================
-- TALABAT PAYOUTS
-- ============================================
CREATE TABLE talabat_payouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payout_id TEXT,
  date DATE NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  period_start DATE,
  period_end DATE,
  order_count INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- ORDERS HISTORY (Sapaad CSV import)
-- ============================================
CREATE TABLE orders_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_no TEXT,
  datetime TIMESTAMPTZ NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  payment_type TEXT,
  status TEXT DEFAULT 'completed',
  notes TEXT
);

CREATE INDEX idx_orders_datetime ON orders_history(datetime DESC);

-- ============================================
-- SETTINGS (key-value config)
-- ============================================
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed settings
INSERT INTO settings (key, value) VALUES
  ('restaurant_name', '"Queen of Mahshi"'),
  ('restaurant_name_ar', '"ملكة المحشي"'),
  ('legal_name', '"ORIGINAL LAFA CAFETERIA LLC SPC"'),
  ('owners', '["Mohamed", "Ahmed"]'),
  ('ownership_split', '50'),
  ('talabat_total_fee_pct', '28.3'),
  ('talabat_keep_pct', '71.7'),
  ('card_fee_pct', '2.26'),
  ('card_keep_pct', '97.74'),
  ('low_revenue_threshold', '500'),
  ('high_expense_threshold', '500'),
  ('low_bank_threshold', '5000'),
  ('equity_reset_date', '"2026-03-28"'),
  ('adcb_account', '"14333797820001"');

-- ============================================
-- AUDIT LOG
-- ============================================
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES staff(id),
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_created ON audit_log(created_at DESC);

-- ============================================
-- NOTIFICATIONS
-- ============================================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL CHECK (type IN ('inventory', 'sales', 'bank', 'expense', 'system')),
  message TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  read BOOLEAN NOT NULL DEFAULT false,
  data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_unread ON notifications(read, created_at DESC);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_daily_sales_updated
  BEFORE UPDATE ON daily_sales
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_inventory_updated
  BEFORE UPDATE ON inventory_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-calculate inventory time_remaining on update
CREATE OR REPLACE FUNCTION calc_time_remaining()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.usage_rate > 0 THEN
    NEW.time_remaining = NEW.qty / NEW.usage_rate;
  ELSE
    NEW.time_remaining = 0;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_inventory_time_remaining
  BEFORE INSERT OR UPDATE ON inventory_items
  FOR EACH ROW EXECUTE FUNCTION calc_time_remaining();
