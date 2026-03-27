import { items } from '@wix/data';
import type { BuyerRecord, ConcertSummary } from './types.ts';

const COLLECTION = 'Import2';

function toISO(value: unknown): string {
  if (value == null) return '';
  const d = value instanceof Date ? value : new Date(String(value));
  if (isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

function toDate(value: unknown): Date | null {
  if (value == null) return null;
  const d = value instanceof Date ? value : new Date(String(value));
  return isNaN(d.getTime()) ? null : d;
}

function toNum(value: unknown): number {
  return typeof value === 'number' ? value : 0;
}

function toStr(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

export function toRecord(raw: Record<string, unknown>): BuyerRecord {
  const firstName = toStr(raw['firstName']);
  const surname = toStr(raw['surname']);
  const fullName = `${firstName} ${surname}`.trim();
  return {
    _id: toStr(raw['_id']),
    firstName,
    surname,
    otherNames: toStr(raw['otherNames']),
    emailAddress: toStr(raw['emailAddress']),
    group: toStr(raw['group']),
    source: toStr(raw['source']),
    status1: toStr(raw['status1']),
    concert: toStr(raw['concert']),
    concertType: toStr(raw['concertType']),
    purchaseText: toStr(raw['purchaseText']),
    ticketCount: toNum(raw['ticketCount']),
    purchaseDate: toDate(raw['purchaseDate']),
    purchaseDateISO: toISO(raw['purchaseDate']),
    isHistoricalOrder: typeof raw['isHistoricalOrder'] === 'boolean' ? raw['isHistoricalOrder'] : true,
    wixOrderNumber: toStr(raw['wixOrderNumber']),
    fullName: fullName || '(unknown)',
  };
}

export async function loadAllRecords(): Promise<BuyerRecord[]> {
  const records: BuyerRecord[] = [];
  let result = await items.query(COLLECTION).limit(1000).find();
  (result.items as Record<string, unknown>[]).forEach(i => records.push(toRecord(i)));
  while (result.hasNext()) {
    result = await result.next();
    (result.items as Record<string, unknown>[]).forEach(i => records.push(toRecord(i)));
  }
  return records;
}

/** Returns concerts sorted chronologically by their earliest purchaseDate. */
export function buildConcertOrder(records: BuyerRecord[]): ConcertSummary[] {
  const earliest = new Map<string, string>();
  for (const r of records) {
    if (!r.concert || !r.purchaseDateISO) continue;
    const prev = earliest.get(r.concert);
    if (!prev || r.purchaseDateISO < prev) {
      earliest.set(r.concert, r.purchaseDateISO);
    }
  }
  return [...earliest.entries()]
    .map(([name, earliestDate]) => ({ name, earliestDate }))
    .sort((a, b) => a.earliestDate.localeCompare(b.earliestDate));
}

/** Returns unique purchasers sorted by their first purchase date ascending. */
export function buildPurchaserOrder(records: BuyerRecord[]): string[] {
  const firstPurchase = new Map<string, string>();
  for (const r of records) {
    if (!r.fullName || !r.purchaseDateISO) continue;
    const prev = firstPurchase.get(r.fullName);
    if (!prev || r.purchaseDateISO < prev) {
      firstPurchase.set(r.fullName, r.purchaseDateISO);
    }
  }
  return [...firstPurchase.entries()]
    .sort((a, b) => a[1].localeCompare(b[1]))
    .map(([name]) => name);
}
