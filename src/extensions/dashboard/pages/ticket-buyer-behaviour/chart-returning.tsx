import { useMemo } from 'react';
import { Card } from '@wix/design-system';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { BuyerRecord, ConcertSummary, ReturningBarDatum } from './types.ts';

interface Props {
  records: BuyerRecord[];
  concertOrder: ConcertSummary[];
}

const FONT = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";

export function ChartReturning({ records, concertOrder }: Props) {
  const data = useMemo<ReturningBarDatum[]>(() => {
    // Determine each purchaser's first concert (chronologically)
    const firstConcert = new Map<string, string>();
    const concertDateMap = new Map<string, string>();
    for (const c of concertOrder) concertDateMap.set(c.name, c.earliestDate);

    for (const r of records) {
      if (!r.fullName || !r.concert) continue;
      const prev = firstConcert.get(r.fullName);
      if (!prev) {
        firstConcert.set(r.fullName, r.concert);
      } else {
        const prevDate = concertDateMap.get(prev) ?? '';
        const currDate = concertDateMap.get(r.concert) ?? '';
        if (currDate < prevDate) firstConcert.set(r.fullName, r.concert);
      }
    }

    // Per concert, count new vs returning unique buyers
    const concertBuyers = new Map<string, Set<string>>();
    for (const r of records) {
      if (!r.concert || !r.fullName) continue;
      if (!concertBuyers.has(r.concert)) concertBuyers.set(r.concert, new Set());
      concertBuyers.get(r.concert)!.add(r.fullName);
    }

    return concertOrder.map(({ name }) => {
      const buyers = concertBuyers.get(name) ?? new Set<string>();
      let newCount = 0;
      let returningCount = 0;
      for (const buyer of buyers) {
        if (firstConcert.get(buyer) === name) newCount++;
        else returningCount++;
      }
      // Truncate long concert names for display
      const label = name.length > 28 ? name.slice(0, 26) + '…' : name;
      return { concert: label, New: newCount, Returning: returningCount };
    });
  }, [records, concertOrder]);

  return (
    <Card>
      <Card.Header title="Returning vs New Buyers per Concert" />
      <Card.Content>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={data} margin={{ top: 8, right: 24, left: 0, bottom: 80 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="concert"
              tick={{ fontSize: 10, fontFamily: FONT }}
              interval={0}
              angle={-45}
              textAnchor="end"
            />
            <YAxis allowDecimals={false} tick={{ fontSize: 11, fontFamily: FONT }} width={40} />
            <Tooltip />
            <Legend verticalAlign="top" />
            <Bar dataKey="New" stackId="a" fill="#3899EC" />
            <Bar dataKey="Returning" stackId="a" fill="#F5A623" />
          </BarChart>
        </ResponsiveContainer>
      </Card.Content>
    </Card>
  );
}
