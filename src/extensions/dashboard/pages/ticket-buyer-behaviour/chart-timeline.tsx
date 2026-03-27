import { useMemo, useState } from 'react';
import { Card } from '@wix/design-system';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ZAxis,
} from 'recharts';
import type { BuyerRecord, TimelineDot } from './types.ts';

interface Props {
  records: BuyerRecord[];
  purchaserOrder: string[];
}

const FONT = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";

function dotColor(concertType: string): string {
  if (concertType === 'PROFESSIONAL') return '#3899EC';
  return '#48BB78';
}

interface TooltipPayloadItem {
  payload?: TimelineDot;
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayloadItem[] }) {
  if (!active || !payload || payload.length === 0) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #dfe3eb',
        borderRadius: 6,
        padding: '8px 12px',
        fontFamily: FONT,
        fontSize: 12,
      }}
    >
      <div style={{ fontWeight: 600 }}>{d.concertName}</div>
      <div style={{ color: '#939393' }}>{d.dateLabel}</div>
      <div>{d.count} ticket{d.count !== 1 ? 's' : ''}</div>
      <div style={{ color: dotColor(d.concertType) }}>{d.concertType}</div>
    </div>
  );
}

export function ChartTimeline({ records, purchaserOrder }: Props) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return purchaserOrder;
    const q = search.toLowerCase();
    return purchaserOrder.filter(p => p.toLowerCase().includes(q));
  }, [purchaserOrder, search]);

  const dots = useMemo<TimelineDot[]>(() => {
    if (!selected) return [];
    return records
      .filter(r => r.fullName === selected && r.purchaseDate !== null)
      .map(r => ({
        x: (r.purchaseDate as Date).getTime(),
        y: 1,
        concertName: r.concert,
        concertType: r.concertType,
        dateLabel: (r.purchaseDate as Date).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }),
        count: r.ticketCount,
      }));
  }, [records, selected]);

  // Split into two groups for colouring
  const profDots = dots.filter(d => d.concertType === 'PROFESSIONAL');
  const rcmDots = dots.filter(d => d.concertType !== 'PROFESSIONAL');

  const xMin = dots.length > 0 ? Math.min(...dots.map(d => d.x)) - 86400000 * 14 : undefined;
  const xMax = dots.length > 0 ? Math.max(...dots.map(d => d.x)) + 86400000 * 14 : undefined;

  return (
    <Card>
      <Card.Header title="Individual Purchaser Timeline" />
      <Card.Content>
        <div style={{ position: 'relative', marginBottom: 12 }}>
          <input
            type="text"
            placeholder="Search purchaser name…"
            value={search}
            onChange={e => {
              setSearch(e.target.value);
              setSelected(null);
            }}
            style={{
              width: '100%',
              padding: '8px 12px',
              fontSize: 13,
              fontFamily: FONT,
              border: '1px solid #dfe3eb',
              borderRadius: 6,
              boxSizing: 'border-box',
            }}
          />
          {search.trim() && !selected && filtered.length > 0 && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                background: '#fff',
                border: '1px solid #dfe3eb',
                borderRadius: 6,
                zIndex: 10,
                maxHeight: 200,
                overflowY: 'auto',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              }}
            >
              {filtered.slice(0, 50).map(p => (
                <div
                  key={p}
                  onClick={() => {
                    setSelected(p);
                    setSearch(p);
                  }}
                  style={{
                    padding: '8px 12px',
                    cursor: 'pointer',
                    fontFamily: FONT,
                    fontSize: 13,
                    color: '#162d3d',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLDivElement).style.background = '#eef2f7';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLDivElement).style.background = '#fff';
                  }}
                >
                  {p}
                </div>
              ))}
            </div>
          )}
        </div>

        {!selected && (
          <div
            style={{
              textAlign: 'center',
              padding: '40px 0',
              color: '#939393',
              fontFamily: FONT,
              fontSize: 13,
            }}
          >
            Search and select a purchaser above to view their purchase timeline.
          </div>
        )}

        {selected && dots.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: '40px 0',
              color: '#939393',
              fontFamily: FONT,
              fontSize: 13,
            }}
          >
            No dated purchase records found for {selected}.
          </div>
        )}

        {selected && dots.length > 0 && (
          <>
            <div style={{ marginBottom: 8, fontFamily: FONT, fontSize: 12, color: '#939393' }}>
              <span style={{ color: '#3899EC', fontWeight: 600 }}>■</span> PROFESSIONAL &nbsp;
              <span style={{ color: '#48BB78', fontWeight: 600 }}>■</span> RCM or RAM
            </div>
            <ResponsiveContainer width="100%" height={140}>
              <ScatterChart margin={{ top: 8, right: 24, left: 0, bottom: 8 }}>
                <XAxis
                  dataKey="x"
                  type="number"
                  domain={[xMin ?? 'auto', xMax ?? 'auto']}
                  tickFormatter={v =>
                    new Date(v).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })
                  }
                  tick={{ fontSize: 10, fontFamily: FONT }}
                  scale="time"
                />
                <YAxis dataKey="y" type="number" hide />
                <ZAxis dataKey="count" range={[60, 300]} />
                <Tooltip content={<CustomTooltip />} />
                {profDots.length > 0 && (
                  <Scatter data={profDots} fill="#3899EC" opacity={0.85} />
                )}
                {rcmDots.length > 0 && (
                  <Scatter data={rcmDots} fill="#48BB78" opacity={0.85} />
                )}
              </ScatterChart>
            </ResponsiveContainer>
          </>
        )}
      </Card.Content>
    </Card>
  );
}
