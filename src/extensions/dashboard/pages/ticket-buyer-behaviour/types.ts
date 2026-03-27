export interface BuyerRecord {
  _id: string;
  firstName: string;
  surname: string;
  otherNames: string;
  emailAddress: string;
  group: string;
  source: string;
  status1: string;
  concert: string;
  concertType: string;
  purchaseText: string;
  ticketCount: number;
  purchaseDate: Date | null;
  purchaseDateISO: string;
  isHistoricalOrder: boolean;
  wixOrderNumber: string;
  fullName: string;
}

export interface ConcertSummary {
  name: string;
  earliestDate: string; // ISO date
}

export interface ReturningBarDatum {
  concert: string;
  New: number;
  Returning: number;
}

export interface HeatmapCell {
  purchaser: string;
  concert: string;
  count: number;
}

export interface TimelineDot {
  x: number; // unix ms
  y: number; // ticketCount (used as dot size)
  concertName: string;
  concertType: string;
  dateLabel: string;
  count: number;
}

export interface TopPurchaser {
  name: string;
  total: number;
}
