// ============================================
// Database Types
// ============================================

export interface Staff {
  id: string;
  name: string;
  pin_hash: string;
  role: "staff" | "admin";
  active: boolean;
  created_at: string;
}

export interface DailySales {
  id: string;
  date: string;
  cash: number;
  card: number;
  talabat: number;
  total: number;
  expenses: number;
  net: number;
  notes: string | null;
  staff_id: string | null;
  opening_cash: number;
  pt_cash: number;
  closing_cash: number;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
  // Joined
  staff?: Staff;
  expense_items?: ExpenseItem[];
}

export interface ExpenseItem {
  id: string;
  daily_sales_id: string;
  description: string;
  amount: number;
  category: "vegetables" | "bread" | "drinks" | "cleaning" | "other";
}

export type InventoryType = "grocery" | "packaging" | "kitchen";
export type InventoryStatus = "ok" | "low" | "out";

export interface InventoryItem {
  id: string;
  name: string;
  type: InventoryType;
  category: string | null;
  qty: number;
  unit: string;
  reorder_at: number;
  usage_rate: number;
  usage_period: "daily" | "weekly";
  time_remaining: number;
  status: InventoryStatus;
  priority: "critical" | "high" | "normal" | "low";
  supplier: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface InventoryCount {
  id: string;
  item_id: string;
  qty: number;
  counted_by: string | null;
  counted_at: string;
}

export interface ProductionLog {
  id: string;
  date: string;
  item: string;
  quantity: number;
  unit: string;
  made_by: string | null;
  notes: string | null;
  created_at: string;
}

export interface Delivery {
  id: string;
  date: string;
  supplier: string;
  items_json: Record<string, unknown>[];
  received_by: string | null;
  notes: string | null;
  created_at: string;
}

export interface BankTransaction {
  id: string;
  date: string;
  description: string;
  debit: number;
  credit: number;
  balance: number | null;
  biz_or_personal: "biz" | "personal";
  category: string | null;
  ref_no: string | null;
  notes: string | null;
  created_at: string;
}

export interface EquityEntry {
  id: string;
  date: string;
  type: "personal_from_biz" | "personal_into_biz" | "adjustment";
  amount: number;
  description: string | null;
  running_total: number;
  created_at: string;
}

export interface MonthlyExpense {
  id: string;
  month: string;
  item: string;
  amount: number;
  status: "pending" | "paid" | "overdue";
  category: string;
  notes: string | null;
  created_at: string;
}

export interface TalabatPayout {
  id: string;
  payout_id: string | null;
  date: string;
  amount: number;
  period_start: string | null;
  period_end: string | null;
  order_count: number | null;
  created_at: string;
}

export interface OrderHistory {
  id: string;
  order_no: string | null;
  datetime: string;
  amount: number;
  payment_type: string | null;
  status: string;
  notes: string | null;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  table_name: string;
  record_id: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  created_at: string;
}

export interface Notification {
  id: string;
  type: "inventory" | "sales" | "bank" | "expense" | "system";
  message: string;
  severity: "info" | "warning" | "critical";
  read: boolean;
  data: Record<string, unknown> | null;
  created_at: string;
}

// ============================================
// App Types
// ============================================

export interface DashboardKPIs {
  todayRevenue: number;
  todayOrders: number;
  monthRevenue: number;
  monthAvgDaily: number;
  monthAOV: number;
  adcbBalance: number;
  equityBalance: number;
  channelSplit: {
    cash: number;
    card: number;
    talabat: number;
  };
  inventoryAlerts: {
    out: number;
    low: number;
  };
}

export interface SalesReportRow {
  date: string;
  cash: number;
  card: number;
  talabat: number;
  total: number;
  expenses: number;
  net: number;
  notes: string | null;
  staff_name: string | null;
}

export interface ExpenseCategory {
  value: string;
  label: string;
}

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  { value: "vegetables", label: "Vegetables" },
  { value: "bread", label: "Bread" },
  { value: "drinks", label: "Drinks" },
  { value: "cleaning", label: "Cleaning" },
  { value: "other", label: "Other" },
];
