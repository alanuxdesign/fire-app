export type AccountHolding = {
  id: string;
  symbol: string;
  name: string;
  quantity: number;
  price: number | null;
  value: number;
  costBasis: number | null;
  gainLoss: number | null;
  gainLossPercent: number | null;
};

export type AccountHoldingsResponse = {
  holdings: AccountHolding[];
  totalValue: number;
  totalGainLoss: number | null;
  totalGainLossPercent: number | null;
  asOf: string | null;
};

export function isInvestmentFinancialAccount(
  type: string,
  subtype: string | null,
): boolean {
  return (
    type === "investment" ||
    type === "brokerage" ||
    subtype?.toLowerCase().includes("investment") === true ||
    subtype?.toLowerCase().includes("brokerage") === true
  );
}

export function accountShowsHoldings(
  account: {
    group: string;
    type: string;
    subtype: string | null;
    isManual: boolean;
    marketSymbol: string | null;
    plaidAccountId: string | null;
  },
): boolean {
  if (account.group === "Investments") {
    return true;
  }
  if (account.isManual && account.marketSymbol) {
    return true;
  }
  return (
    Boolean(account.plaidAccountId) &&
    isInvestmentFinancialAccount(account.type, account.subtype)
  );
}

function computeGain(
  value: number,
  costBasis: number | null | undefined,
): { gainLoss: number | null; gainLossPercent: number | null } {
  if (costBasis == null || !Number.isFinite(costBasis) || costBasis === 0) {
    return { gainLoss: null, gainLossPercent: null };
  }

  const gainLoss = value - costBasis;
  return {
    gainLoss,
    gainLossPercent: (gainLoss / Math.abs(costBasis)) * 100,
  };
}

export function buildHoldingsSummary(
  holdings: AccountHolding[],
  asOf: string | null = null,
): AccountHoldingsResponse {
  const totalValue = holdings.reduce((sum, row) => sum + row.value, 0);
  const withGain = holdings.filter((row) => row.gainLoss != null);
  const totalGainLoss =
    withGain.length > 0
      ? withGain.reduce((sum, row) => sum + (row.gainLoss ?? 0), 0)
      : null;
  const totalCostBasis = holdings.reduce(
    (sum, row) => sum + (row.costBasis ?? 0),
    0,
  );
  const totalGainLossPercent =
    totalGainLoss != null && totalCostBasis > 0
      ? (totalGainLoss / totalCostBasis) * 100
      : null;

  return {
    holdings,
    totalValue,
    totalGainLoss,
    totalGainLossPercent,
    asOf,
  };
}

export function manualMarketHolding(
  symbol: string,
  name: string,
  quantity: number,
  value: number,
  price: number | null,
): AccountHolding {
  return {
    id: `manual-${symbol}`,
    symbol,
    name,
    quantity,
    price,
    value,
    costBasis: null,
    gainLoss: null,
    gainLossPercent: null,
  };
}

export function mapPlaidHolding(
  holding: {
    account_id: string;
    security_id: string;
    quantity: number;
    institution_price: number;
    institution_value: number;
    cost_basis?: number | null;
  },
  security: {
    security_id: string;
    name: string | null;
    ticker_symbol?: string | null;
    unofficial_currency_code?: string | null;
  } | undefined,
): AccountHolding {
  const value = holding.institution_value;
  const costBasis =
    holding.cost_basis != null && Number.isFinite(holding.cost_basis)
      ? holding.cost_basis
      : null;
  const { gainLoss, gainLossPercent } = computeGain(value, costBasis);

  const symbol =
    security?.ticker_symbol?.trim() ||
    security?.unofficial_currency_code?.trim() ||
    "—";

  return {
    id: `${holding.account_id}-${holding.security_id}`,
    symbol,
    name: security?.name?.trim() || symbol,
    quantity: holding.quantity,
    price: Number.isFinite(holding.institution_price)
      ? holding.institution_price
      : null,
    value,
    costBasis,
    gainLoss,
    gainLossPercent,
  };
}
