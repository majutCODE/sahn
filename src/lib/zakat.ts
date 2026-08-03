/**
 * Zakat calculation. Pure, so the arithmetic that decides what someone owes is
 * testable and stated in one place.
 *
 * Sahn does not decide the contested questions for the user. Where schools
 * differ on whether an asset counts — pensions, unpaid receivables, shares held
 * long-term — the calculator shows the difference as a note and lets the user
 * choose. See ASSET_NOTES.
 */

export const ASSET_KINDS = [
  'cash',
  'bank',
  'gold',
  'silver',
  'business_inventory',
  'receivables',
  'shares',
  'crypto',
  'property_for_sale',
  'pension'
] as const;
export type AssetKind = (typeof ASSET_KINDS)[number];

export const LIABILITY_KINDS = ['debts', 'bills_due', 'business_payables'] as const;
export type LiabilityKind = (typeof LIABILITY_KINDS)[number];

/** The rate. 1/40th, and not a setting. */
export const ZAKAT_RATE = 0.025;

/**
 * Nisab thresholds in grams of the metal. These are the classical weights:
 * 20 mithqal of gold and 200 dirhams of silver.
 */
export const NISAB_GOLD_GRAMS = 87.48;
export const NISAB_SILVER_GRAMS = 612.36;

const GRAMS_PER_TROY_OUNCE = 31.1034768;

export type NisabBasis = 'gold' | 'silver';

export type SpotPrice = {
  /** Price per troy ounce, in the user's currency. */
  gold: number;
  silver: number;
  currency: string;
  /** When the price was fetched — stored with the record for reproducibility. */
  fetchedAt: string;
};

/**
 * The nisab in the user's currency.
 *
 * Silver gives a much lower threshold than gold, so more people owe zakat under
 * it. Both are held by recognised positions and the spec is explicit that the
 * user picks — this function does not choose for them.
 */
export function nisabValue(spot: SpotPrice, basis: NisabBasis): number {
  const perGram =
    basis === 'gold'
      ? spot.gold / GRAMS_PER_TROY_OUNCE
      : spot.silver / GRAMS_PER_TROY_OUNCE;
  const grams = basis === 'gold' ? NISAB_GOLD_GRAMS : NISAB_SILVER_GRAMS;
  return perGram * grams;
}

export type Holdings = {
  /** Currency amounts, keyed by asset kind. Gold and silver are grams. */
  assets: Partial<Record<AssetKind, number>>;
  liabilities: Partial<Record<LiabilityKind, number>>;
};

export type ZakatResult = {
  /** Value of zakatable assets, with metals converted to currency. */
  assetTotal: number;
  liabilityTotal: number;
  /** Assets minus liabilities, floored at zero. */
  netWorth: number;
  nisab: number;
  /** False when net worth is below the threshold — nothing is owed. */
  meetsNisab: boolean;
  amountDue: number;
};

/**
 * Gold and silver are entered by weight, not value — that is how people hold
 * them, and it keeps the record meaningful when the spot price moves.
 */
function assetValue(kind: AssetKind, amount: number, spot: SpotPrice): number {
  if (kind === 'gold') return (amount / GRAMS_PER_TROY_OUNCE) * spot.gold;
  if (kind === 'silver') return (amount / GRAMS_PER_TROY_OUNCE) * spot.silver;
  return amount;
}

export function calculateZakat(
  holdings: Holdings,
  spot: SpotPrice,
  basis: NisabBasis
): ZakatResult {
  const assetTotal = ASSET_KINDS.reduce((sum, kind) => {
    const amount = holdings.assets[kind] ?? 0;
    if (!Number.isFinite(amount) || amount <= 0) return sum;
    return sum + assetValue(kind, amount, spot);
  }, 0);

  const liabilityTotal = LIABILITY_KINDS.reduce((sum, kind) => {
    const amount = holdings.liabilities[kind] ?? 0;
    if (!Number.isFinite(amount) || amount <= 0) return sum;
    return sum + amount;
  }, 0);

  // Liabilities can exceed assets; that means nothing is owed, not a negative
  // zakat, and not a negative net worth carried into the nisab comparison.
  const netWorth = Math.max(0, assetTotal - liabilityTotal);
  const nisab = nisabValue(spot, basis);
  const meetsNisab = netWorth >= nisab;

  return {
    assetTotal: round2(assetTotal),
    liabilityTotal: round2(liabilityTotal),
    netWorth: round2(netWorth),
    nisab: round2(nisab),
    meetsNisab,
    // Zakat is due on the whole of the net worth once nisab is met, not on the
    // excess above it.
    amountDue: meetsNisab ? round2(netWorth * ZAKAT_RATE) : 0
  };
}

/** Currency to two places, avoiding the usual float drift on .005 cases. */
function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * The hawl is a lunar year, not a solar one — roughly 354 days. Using 365 would
 * quietly delay the due date by eleven days every year.
 */
export function nextHawlDate(from: Date): Date {
  const next = new Date(from);
  next.setDate(next.getDate() + 354);
  return next;
}

/**
 * Where the schools differ. Shown against the relevant input as a note; the
 * calculator never resolves these on the user's behalf.
 */
export const CONTESTED_ASSETS: readonly AssetKind[] = [
  'receivables',
  'shares',
  'pension',
  'property_for_sale',
  'crypto'
];
