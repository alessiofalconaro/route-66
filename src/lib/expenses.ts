// Expense math: proportional shares, as specified in CLAUDE.md section 5.
// Every expense is split equally among ALL travelers; the payer's own share
// offsets what they are owed. Example: Jesse pays $150 for the three of them
// → his share is $50 → the app credits Jesse +$100 net, the others -$50 each.

import type { Expense, Traveler } from '../types';

/** Net balance per traveler id. Positive = is owed money, negative = owes. */
export function netBalances(expenses: Expense[], travelers: Traveler[]): Record<string, number> {
  const net: Record<string, number> = {};
  for (const t of travelers) net[t.id] = 0;

  for (const e of expenses) {
    const share = e.amountUsd / travelers.length;
    for (const t of travelers) {
      if (t.id === e.payerId) {
        // payer paid the whole thing but also consumed their own share
        net[t.id] += e.amountUsd - share;
      } else {
        net[t.id] -= share;
      }
    }
  }
  return net;
}

export interface Settlement {
  fromId: string;
  toId: string;
  amountUsd: number;
}

/**
 * Turns net balances into a minimal "who pays whom" list.
 * Greedy algorithm: biggest debtor pays biggest creditor until settled.
 */
export function settlements(net: Record<string, number>): Settlement[] {
  // Copy into sortable arrays of [id, amount]
  const debtors = Object.entries(net)
    .filter(([, v]) => v < -0.005)
    .map(([id, v]) => ({ id, amt: -v }));
  const creditors = Object.entries(net)
    .filter(([, v]) => v > 0.005)
    .map(([id, v]) => ({ id, amt: v }));

  const result: Settlement[] = [];
  let d = 0;
  let c = 0;
  while (d < debtors.length && c < creditors.length) {
    const pay = Math.min(debtors[d].amt, creditors[c].amt);
    result.push({ fromId: debtors[d].id, toId: creditors[c].id, amountUsd: pay });
    debtors[d].amt -= pay;
    creditors[c].amt -= pay;
    if (debtors[d].amt < 0.005) d++;
    if (creditors[c].amt < 0.005) c++;
  }
  return result;
}

export function fmtUsd(n: number): string {
  return `$${n.toFixed(2)}`;
}
