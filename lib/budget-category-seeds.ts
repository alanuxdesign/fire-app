export type SystemCategorySeed = {
  slug: string;
  label: string;
  icon: string;
  isIncome?: boolean;
  sortOrder: number;
};

export const SYSTEM_CATEGORY_SEEDS: SystemCategorySeed[] = [
  { slug: "income", label: "Income", icon: "Wallet", isIncome: true, sortOrder: 0 },
  { slug: "paychecks", label: "Paychecks", icon: "Banknote", isIncome: true, sortOrder: 1 },
  { slug: "interest", label: "Interest & dividends", icon: "TrendingUp", isIncome: true, sortOrder: 2 },
  { slug: "transfer", label: "Transfer", icon: "ArrowLeftRight", sortOrder: 3 },
  { slug: "groceries", label: "Groceries", icon: "ShoppingCart", sortOrder: 10 },
  { slug: "dining", label: "Dining", icon: "Utensils", sortOrder: 11 },
  { slug: "shopping", label: "Shopping", icon: "ShoppingBag", sortOrder: 20 },
  { slug: "travel", label: "Travel", icon: "Plane", sortOrder: 30 },
  { slug: "transport", label: "Transportation", icon: "Car", sortOrder: 31 },
  { slug: "utilities", label: "Utilities", icon: "Zap", sortOrder: 40 },
  { slug: "bills", label: "Rent & bills", icon: "Receipt", sortOrder: 41 },
  { slug: "entertainment", label: "Entertainment", icon: "Tv", sortOrder: 50 },
  { slug: "health", label: "Health & medical", icon: "HeartPulse", sortOrder: 60 },
  { slug: "personal", label: "Personal care", icon: "Sparkles", sortOrder: 70 },
  { slug: "home", label: "Home", icon: "House", sortOrder: 80 },
  { slug: "education", label: "Education & services", icon: "GraduationCap", sortOrder: 90 },
  { slug: "fees", label: "Fees & charges", icon: "Landmark", sortOrder: 100 },
  { slug: "other", label: "Other", icon: "CircleDollarSign", sortOrder: 200 },
];
