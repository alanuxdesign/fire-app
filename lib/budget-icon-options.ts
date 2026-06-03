/** Lucide icon names available when creating or editing buckets. */
export const BUCKET_ICON_OPTIONS = [
  "CircleDollarSign",
  "Utensils",
  "ShoppingCart",
  "Car",
  "Home",
  "Zap",
  "Heart",
  "Plane",
  "Gift",
  "GraduationCap",
  "Briefcase",
  "Coffee",
  "Smartphone",
  "Shirt",
  "Baby",
  "Dumbbell",
  "PawPrint",
  "Wrench",
] as const;

export type BucketIconName = (typeof BUCKET_ICON_OPTIONS)[number];
