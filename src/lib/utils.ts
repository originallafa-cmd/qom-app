import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatAED(amount: number): string {
  return `${amount.toLocaleString("en-AE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} AED`;
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateShort(date: string | Date): string {
  return new Date(date).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
  });
}

// Fee calculations
export const FEES = {
  TALABAT_TOTAL_PCT: 28.3,
  TALABAT_KEEP_PCT: 71.7,
  CARD_FEE_PCT: 2.26,
  CARD_KEEP_PCT: 97.74,
  CASH_KEEP_PCT: 100,
} as const;

export function calcActualRevenue(cash: number, card: number, talabat: number) {
  const actualCash = cash;
  const actualCard = card * (FEES.CARD_KEEP_PCT / 100);
  const actualTalabat = talabat * (FEES.TALABAT_KEEP_PCT / 100);
  return {
    actualCash,
    actualCard,
    actualTalabat,
    total: actualCash + actualCard + actualTalabat,
  };
}

export function calcClosingCash(
  openingCash: number,
  cashSales: number,
  cashExpenses: number,
  ptCash: number
) {
  return openingCash + cashSales - cashExpenses + ptCash;
}
