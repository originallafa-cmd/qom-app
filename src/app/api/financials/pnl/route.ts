import { NextResponse } from "next/server";
import { createServiceSupabase } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month") || new Date().toISOString().slice(0, 7);
    const monthStart = month + "-01";
    const monthEnd = month + "-31";

    const supabase = await createServiceSupabase();

    const [salesRes, expensesRes] = await Promise.all([
      supabase
        .from("daily_sales")
        .select("cash, card, talabat, total, expenses")
        .gte("date", monthStart)
        .lte("date", monthEnd),
      supabase
        .from("expenses_monthly")
        .select("amount, category, status")
        .eq("month", month),
    ]);

    const sales = salesRes.data || [];
    const monthlyExpenses = expensesRes.data || [];

    // Gross revenue
    const grossCash = sales.reduce((s, r) => s + (r.cash || 0), 0);
    const grossCard = sales.reduce((s, r) => s + (r.card || 0), 0);
    const grossTalabat = sales.reduce((s, r) => s + (r.talabat || 0), 0);
    const grossTotal = grossCash + grossCard + grossTalabat;

    // Actual revenue after fees
    const actualCash = grossCash; // 100%
    const actualCard = grossCard * 0.9774; // 97.74%
    const actualTalabat = grossTalabat * 0.717; // 71.7%
    const actualTotal = actualCash + actualCard + actualTalabat;

    // Fees lost
    const cardFees = grossCard * 0.0226;
    const talabatFees = grossTalabat * 0.283;
    const totalFees = cardFees + talabatFees;

    // Daily expenses (petty cash)
    const dailyExpenses = sales.reduce((s, r) => s + (r.expenses || 0), 0);

    // Monthly fixed expenses
    const fixedExpenses = monthlyExpenses.reduce((s, r) => s + (r.amount || 0), 0);
    const totalExpenses = dailyExpenses + fixedExpenses;

    // Net profit
    const netProfit = actualTotal - totalExpenses;

    // Expense breakdown by category
    const expenseByCategory: Record<string, number> = {};
    monthlyExpenses.forEach((e) => {
      expenseByCategory[e.category] = (expenseByCategory[e.category] || 0) + e.amount;
    });

    return NextResponse.json({
      month,
      days: sales.length,
      gross: {
        cash: grossCash,
        card: grossCard,
        talabat: grossTalabat,
        total: grossTotal,
      },
      fees: {
        card: cardFees,
        talabat: talabatFees,
        total: totalFees,
      },
      actual: {
        cash: actualCash,
        card: actualCard,
        talabat: actualTalabat,
        total: actualTotal,
      },
      expenses: {
        daily: dailyExpenses,
        fixed: fixedExpenses,
        total: totalExpenses,
        byCategory: expenseByCategory,
      },
      netProfit,
    });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
