import { describe, expect, it } from 'vitest';
import {
  NISAB_GOLD_GRAMS,
  NISAB_SILVER_GRAMS,
  ZAKAT_RATE,
  calculateZakat,
  nextHawlDate,
  nisabValue,
  type SpotPrice
} from '@/lib/zakat';

// Round numbers so the expected values are checkable by hand.
const spot: SpotPrice = {
  gold: 3110.34768, // £100/gram exactly, at 31.1034768 g per troy ounce
  silver: 31.1034768, // £1/gram exactly
  currency: 'GBP',
  fetchedAt: '2026-08-03T00:00:00.000Z'
};

describe('nisab', () => {
  it('values the gold nisab at 87.48g of gold', () => {
    expect(nisabValue(spot, 'gold')).toBeCloseTo(NISAB_GOLD_GRAMS * 100, 2);
  });

  it('values the silver nisab at 612.36g of silver', () => {
    expect(nisabValue(spot, 'silver')).toBeCloseTo(NISAB_SILVER_GRAMS * 1, 2);
  });

  it('gives a much lower threshold on silver than on gold', () => {
    // This is the whole reason the user picks: the silver nisab catches far
    // more people. If these ever converge, something is wrong.
    expect(nisabValue(spot, 'silver')).toBeLessThan(nisabValue(spot, 'gold'));
  });
});

describe('calculation', () => {
  it('charges 2.5% of net worth once nisab is met', () => {
    const result = calculateZakat(
      { assets: { cash: 10_000 }, liabilities: {} },
      spot,
      'silver'
    );
    expect(result.meetsNisab).toBe(true);
    expect(result.amountDue).toBe(250);
    expect(result.amountDue).toBeCloseTo(10_000 * ZAKAT_RATE, 2);
  });

  it('charges on the whole amount, not only the excess above nisab', () => {
    const result = calculateZakat(
      { assets: { cash: 1000 }, liabilities: {} },
      spot,
      'silver'
    );
    // Silver nisab here is £612.36. A naive "excess only" reading would
    // charge 2.5% of £387.64 — this asserts against that mistake.
    expect(result.amountDue).toBe(25);
  });

  it('owes nothing below nisab', () => {
    const result = calculateZakat(
      { assets: { cash: 500 }, liabilities: {} },
      spot,
      'silver'
    );
    expect(result.meetsNisab).toBe(false);
    expect(result.amountDue).toBe(0);
  });

  it('deducts liabilities before testing nisab', () => {
    const result = calculateZakat(
      { assets: { cash: 1000 }, liabilities: { debts: 600 } },
      spot,
      'silver'
    );
    expect(result.netWorth).toBe(400);
    expect(result.meetsNisab).toBe(false);
    expect(result.amountDue).toBe(0);
  });

  it('never returns a negative amount when debts exceed assets', () => {
    const result = calculateZakat(
      { assets: { cash: 1000 }, liabilities: { debts: 5000 } },
      spot,
      'silver'
    );
    expect(result.netWorth).toBe(0);
    expect(result.amountDue).toBe(0);
  });

  it('converts gold and silver from grams to currency', () => {
    const result = calculateZakat(
      { assets: { gold: 100, silver: 1000 }, liabilities: {} },
      spot,
      'gold'
    );
    // 100g gold at £100/g plus 1000g silver at £1/g.
    expect(result.assetTotal).toBeCloseTo(11_000, 2);
  });

  it('sums every asset class', () => {
    const result = calculateZakat(
      {
        assets: {
          cash: 1000,
          bank: 2000,
          business_inventory: 500,
          receivables: 300,
          shares: 1200,
          crypto: 400,
          property_for_sale: 5000,
          pension: 3000
        },
        liabilities: {}
      },
      spot,
      'gold'
    );
    expect(result.assetTotal).toBe(13_400);
  });

  it('ignores blank, negative and non-finite inputs', () => {
    const result = calculateZakat(
      {
        assets: { cash: 1000, bank: -500, crypto: NaN },
        liabilities: { debts: -100 }
      },
      spot,
      'silver'
    );
    expect(result.assetTotal).toBe(1000);
    expect(result.liabilityTotal).toBe(0);
  });

  it('sits exactly on the threshold without owing nothing', () => {
    const nisab = nisabValue(spot, 'silver');
    const result = calculateZakat(
      { assets: { cash: nisab }, liabilities: {} },
      spot,
      'silver'
    );
    expect(result.meetsNisab).toBe(true);
    expect(result.amountDue).toBeGreaterThan(0);
  });
});

describe('hawl', () => {
  it('advances by a lunar year, not a solar one', () => {
    const from = new Date(2026, 0, 1);
    const next = nextHawlDate(from);
    const days = Math.round((next.getTime() - from.getTime()) / 86_400_000);
    expect(days).toBe(354);
    // A solar year would silently push the due date back eleven days a year.
    expect(days).toBeLessThan(365);
  });
});
