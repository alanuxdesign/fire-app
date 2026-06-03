/** Client-only helpers for dismissing budget bucket alerts per month. */

export function budgetAlertDismissKey(month: string, bucketId: string): string {
  return `budget-alert-dismiss:${month}:${bucketId}`;
}

export function isBudgetAlertDismissed(
  month: string,
  bucketId: string,
): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(budgetAlertDismissKey(month, bucketId)) === "1";
}

export function dismissBudgetAlert(month: string, bucketId: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(budgetAlertDismissKey(month, bucketId), "1");
}
