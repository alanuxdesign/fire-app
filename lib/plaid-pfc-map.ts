/**
 * Maps Plaid Personal Finance Category (primary + detailed) to app bucket slugs.
 * Detailed match first (Monarch/Mint style), then primary, then other.
 */

const DETAILED_TO_SLUG: Record<string, string> = {
  // Income
  INCOME_DIVIDENDS: "interest",
  INCOME_INTEREST_EARNED: "interest",
  INCOME_RETIREMENT_PENSION: "paychecks",
  INCOME_TAX_REFUND: "income",
  INCOME_UNEMPLOYMENT: "paychecks",
  INCOME_WAGES: "paychecks",
  INCOME_SALARY: "paychecks",
  INCOME_OTHER_INCOME: "income",
  INCOME_GIG_EARNINGS: "paychecks",
  INCOME_CHILD_SUPPORT: "income",
  INCOME_RENTAL: "income",

  // Transfers
  TRANSFER_IN_DEPOSIT: "transfer",
  TRANSFER_IN_ACCOUNT_TRANSFER: "transfer",
  TRANSFER_IN_SAVINGS: "transfer",
  TRANSFER_IN_INVESTMENT_AND_RETIREMENT_FUNDS: "transfer",
  TRANSFER_IN_OTHER_TRANSFER_IN: "transfer",
  TRANSFER_OUT_WITHDRAWAL: "transfer",
  TRANSFER_OUT_ACCOUNT_TRANSFER: "transfer",
  TRANSFER_OUT_SAVINGS: "transfer",
  TRANSFER_OUT_INVESTMENT_AND_RETIREMENT_FUNDS: "transfer",
  TRANSFER_OUT_OTHER_TRANSFER_OUT: "transfer",
  LOAN_PAYMENTS_CREDIT_CARD_PAYMENT: "transfer",
  LOAN_PAYMENTS_PERSONAL_LOAN_PAYMENT: "transfer",
  LOAN_PAYMENTS_MORTGAGE_PAYMENT: "transfer",
  LOAN_PAYMENTS_STUDENT_LOAN_PAYMENT: "transfer",
  LOAN_PAYMENTS_OTHER_PAYMENT: "transfer",

  // Food
  FOOD_AND_DRINK_GROCERIES: "groceries",
  FOOD_AND_DRINK_RESTAURANT: "dining",
  FOOD_AND_DRINK_COFFEE: "dining",
  FOOD_AND_DRINK_FAST_FOOD: "dining",
  FOOD_AND_DRINK_VENDING_MACHINES: "dining",
  FOOD_AND_DRINK_OTHER_FOOD_AND_DRINK: "dining",

  // Shopping
  GENERAL_MERCHANDISE_SUPERSTORES: "shopping",
  GENERAL_MERCHANDISE_DEPARTMENT_STORES: "shopping",
  GENERAL_MERCHANDISE_DISCOUNT_STORES: "shopping",
  GENERAL_MERCHANDISE_ONLINE_MARKETPLACES: "shopping",
  GENERAL_MERCHANDISE_CLOTHING_AND_ACCESSORIES: "shopping",
  GENERAL_MERCHANDISE_ELECTRONICS: "shopping",
  GENERAL_MERCHANDISE_SPORTING_GOODS: "shopping",
  GENERAL_MERCHANDISE_BOOKSTORES_AND_NEWSSTANDS: "shopping",
  GENERAL_MERCHANDISE_OFFICE_SUPPLIES: "shopping",
  GENERAL_MERCHANDISE_PET_SUPPLIES: "shopping",
  GENERAL_MERCHANDISE_OTHER_GENERAL_MERCHANDISE: "shopping",

  // Travel & transport
  TRAVEL_FLIGHTS: "travel",
  TRAVEL_LODGING: "travel",
  TRAVEL_RENTAL_CARS: "travel",
  TRAVEL_OTHER_TRAVEL: "travel",
  TRANSPORTATION_PUBLIC_TRANSIT: "transport",
  TRANSPORTATION_TAXIS_AND_RIDE_SHARES: "transport",
  TRANSPORTATION_GAS: "transport",
  TRANSPORTATION_PARKING: "transport",
  TRANSPORTATION_TOLLS: "transport",
  TRANSPORTATION_BIKES_AND_SCOOTERS: "transport",
  TRANSPORTATION_OTHER_TRANSPORTATION: "transport",

  // Home & utilities
  RENT_AND_UTILITIES_RENT: "bills",
  RENT_AND_UTILITIES_GAS_AND_ELECTRICITY: "utilities",
  RENT_AND_UTILITIES_INTERNET_AND_CABLE: "utilities",
  RENT_AND_UTILITIES_TELEPHONE: "utilities",
  RENT_AND_UTILITIES_WATER: "utilities",
  RENT_AND_UTILITIES_SEWAGE_AND_WASTE_MANAGEMENT: "utilities",
  RENT_AND_UTILITIES_OTHER_UTILITIES: "utilities",
  HOME_IMPROVEMENT_FURNITURE: "home",
  HOME_IMPROVEMENT_HARDWARE: "home",
  HOME_IMPROVEMENT_REPAIR_AND_MAINTENANCE: "home",
  HOME_IMPROVEMENT_SECURITY: "home",
  HOME_IMPROVEMENT_OTHER_HOME_IMPROVEMENT: "home",

  // Medical
  MEDICAL_PRIMARY_CARE: "health",
  MEDICAL_DENTAL_CARE: "health",
  MEDICAL_NURSING_CARE: "health",
  MEDICAL_PHARMACIES_AND_SUPPLEMENTS: "health",
  MEDICAL_VETERINARY_SERVICES: "health",
  MEDICAL_OTHER_MEDICAL: "health",

  // Entertainment & personal
  ENTERTAINMENT_CASINOS_AND_GAMBLING: "entertainment",
  ENTERTAINMENT_MUSIC_AND_AUDIO: "entertainment",
  ENTERTAINMENT_SPORTING_EVENTS_AMUSEMENT_PARKS_AND_MUSEUMS: "entertainment",
  ENTERTAINMENT_TV_AND_MOVIES: "entertainment",
  ENTERTAINMENT_VIDEO_GAMES: "entertainment",
  ENTERTAINMENT_OTHER_ENTERTAINMENT: "entertainment",
  PERSONAL_CARE_GYMS_AND_FITNESS_CENTERS: "personal",
  PERSONAL_CARE_HAIR_AND_BEAUTY: "personal",
  PERSONAL_CARE_LAUNDRY_AND_DRY_CLEANING: "personal",
  PERSONAL_CARE_OTHER_PERSONAL_CARE: "personal",

  // Services & education
  GENERAL_SERVICES_ACCOUNTING_AND_FINANCIAL_PLANNING: "education",
  GENERAL_SERVICES_AUTOMOTIVE: "transport",
  GENERAL_SERVICES_CHILDCARE: "education",
  GENERAL_SERVICES_CONSULTING_AND_LEGAL: "education",
  GENERAL_SERVICES_EDUCATION: "education",
  GENERAL_SERVICES_INSURANCE: "bills",
  GENERAL_SERVICES_POSTAGE_AND_SHIPPING: "shopping",
  GENERAL_SERVICES_STORAGE: "home",
  GENERAL_SERVICES_OTHER_GENERAL_SERVICES: "education",

  // Bank fees
  BANK_FEES_ATM_FEES: "fees",
  BANK_FEES_FOREIGN_TRANSACTION_FEES: "fees",
  BANK_FEES_INSUFFICIENT_FUNDS: "fees",
  BANK_FEES_INTEREST_CHARGE: "fees",
  BANK_FEES_OVERDRAFT_FEES: "fees",
  BANK_FEES_OTHER_BANK_FEES: "fees",

  // Government & tax
  GOVERNMENT_AND_NON_PROFIT_DONATIONS: "other",
  GOVERNMENT_AND_NON_PROFIT_GOVERNMENT_DEPARTMENTS_AND_AGENCIES: "other",
  GOVERNMENT_AND_NON_PROFIT_TAX_PAYMENT: "other",
  GOVERNMENT_AND_NON_PROFIT_OTHER_GOVERNMENT_AND_NON_PROFIT: "other",
};

const PRIMARY_TO_SLUG: Record<string, string> = {
  INCOME: "income",
  TRANSFER_IN: "transfer",
  TRANSFER_OUT: "transfer",
  LOAN_PAYMENTS: "transfer",
  FOOD_AND_DRINK: "dining",
  GENERAL_MERCHANDISE: "shopping",
  TRAVEL: "travel",
  TRANSPORTATION: "transport",
  RENT_AND_UTILITIES: "bills",
  ENTERTAINMENT: "entertainment",
  MEDICAL: "health",
  PERSONAL_CARE: "personal",
  HOME_IMPROVEMENT: "home",
  GENERAL_SERVICES: "education",
  BANK_FEES: "fees",
  GOVERNMENT_AND_NON_PROFIT: "other",
};

export function bucketSlugForPlaid(
  primary: string | null | undefined,
  detailed: string | null | undefined,
): string {
  if (detailed && DETAILED_TO_SLUG[detailed]) {
    return DETAILED_TO_SLUG[detailed];
  }
  if (primary && PRIMARY_TO_SLUG[primary]) {
    return PRIMARY_TO_SLUG[primary];
  }
  if (primary && DETAILED_TO_SLUG[primary]) {
    return DETAILED_TO_SLUG[primary];
  }
  return "other";
}

export function isLowPfcConfidence(
  confidence: string | null | undefined,
): boolean {
  return confidence === "LOW";
}
