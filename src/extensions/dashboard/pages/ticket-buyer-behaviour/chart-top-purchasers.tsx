import { useMemo, useState } from 'react';
import { Card } from '@wix/design-system';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { BuyerRecord, TopPurchaser } from './types.ts';

interface Props {
  records: BuyerRecord[];
}

const FONT = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";

type FilterType = 'All' | 'PROFESSIONAL' | 'RCM or RAM';

const FILTER_OPTIONS: { id: FilterType; label: string }[] = [
  { id: 'All', label: 'All' },
  { id: 'PROFESSIONAL', label: 'PROFESSIONAL' },
  { id: 'RCM or RAM', label: 'RCM or RAM' },
];

export function ChartTopPurchasers({ records }: Props) {
  const [filter, setFilter] = useState<FilterType>('All');

  const data = useMemo<TopPurchaser[]>(() => {
    const totals = new Map<string, number>();
    const filtered = filter === 'All' ? records : records.filter(r => r.concertType === filter);
    for (const r of filtered) {
      if (!r.fullName) continue;
      totals.set(r.fullName, (totals.get(r.fullName) ?? 0) + r.ticketCount);
    }
    return [...totals.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([name, total]) => ({
        name: name.length > 22 ? name.slice(0, 20) + '…' : name,
        total,
      }));
  }, [records, filter]);

  return (
    <Card>
      <Card.Header title="Top 20 Purchasers by Total Tickets" />
      <Card.Content>
        <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: FONT, fontSize: 13, color: '#4a5568' }}>Concert type:</span>
          <select
            value={filter}
            onChange={e => setFilter(e.target.value as FilterType)}
            style={{
              padding: '6px 10px',
              fontSize: 13,
              fontFamily: FONT,
              border: '1px solid #dfe3eb',
              borderRadius: 6,
              background: '#fff',
              color: '#162d3d',
            }}
          >
            {FILTER_OPTIONS.map(o => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <ResponsiveContainer width="100%" height={Math.max(300, data.length * 36)}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 4, right: 40, left: 8, bottom: 4 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
            <XAxis
              type="number"
              allowDecimals={false}
              tick={{ fontSize: 11, fontFamily: FONT }}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={150}
              tick={{ fontSize: 11, fontFamily: FONT }}
            />
            <Tooltip
              formatter={(value) => [value ?? 0, 'Total tickets']}
            />
            <Bar dataKey="total" fill="#3899EC" radius={[0, 4, 4, 0]} label={{ position: 'right', fontSize: 11, fontFamily: FONT }} />
          </BarChart>
        </ResponsiveContainer>
      </Card.Content>
    </Card>
  );
}
