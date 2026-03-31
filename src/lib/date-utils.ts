/**
 * Get the last day of a month in YYYY-MM-DD format
 */
export function lastDayOfMonth(month: string): string {
  const [year, mon] = month.split("-").map(Number);
  const lastDay = new Date(year, mon, 0).getDate();
  return `${month}-${String(lastDay).padStart(2, "0")}`;
}
