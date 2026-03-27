import { useMemo, useState } from 'react';
import { Card } from '@wix/design-system';
import type { BuyerRecord, ConcertSummary } from './types.ts';

interface Props {
  records: BuyerRecord[];
  concertOrder: ConcertSummary[];
  purchaserOrder: string[];
}

const FONT = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";

const MONTH_MAP: Record<string, string> = {
  january: '01', jan: '01', february: '02', feb: '02', march: '03', mar: '03',
  april: '04', apr: '04', may: '05', june: '06', jun: '06',
  july: '07', jul: '07', august: '08', aug: '08',
  september: '09', sep: '09', sept: '09', october: '10', oct: '10',
  november: '11', nov: '11', december: '12', dec: '12',
};

const MO = '(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)';

function displayName(concert: string): string {
  let s = concert;

  // Text substitutions
  s = s.replace(/WIGS Conservatoire Series/gi, 'WCS');
  s = s.replace(/Royal College of Music/gi, '\nRCM');
  s = s.replace(/Royal Academy of Music/gi, '\nRAM');

  // Date: "25 March 2026", "25th Mar 2026"
  s = s.replace(
    new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+${MO}\\s+(\\d{4})\\b`, 'gi'),
    (_, d, m, y) => `\n${d.padStart(2, '0')}-${MONTH_MAP[m.toLowerCase()]}-${y.slice(2)}`,
  );

  // Date: "March 25, 2026", "Mar 25 2026"
  s = s.replace(
    new RegExp(`\\b${MO}\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s+(\\d{4})\\b`, 'gi'),
    (_, m, d, y) => `\n${d.padStart(2, '0')}-${MONTH_MAP[m.toLowerCase()]}-${y.slice(2)}`,
  );

  // Date: "25/03/2026" or "25-03-2026"
  s = s.replace(
    /\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\b/g,
    (_, d, m, y) => `\n${d.padStart(2, '0')}-${m.padStart(2, '0')}-${y.slice(2)}`,
  );

  return s.trim();
}

function ticketColor(count: number): string {
  if (count <= 0) return 'transparent';
  if (count === 1) return '#BEE3F8';
  if (count === 2) return '#63B3ED';
  if (count <= 4) return '#3182CE';
  return '#1A365D';
}

export function ChartHeatmap({ records, concertOrder, purchaserOrder }: Props) {
  const [search, setSearch] = useState('');

  const ticketMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of records) {
      if (!r.fullName || !r.concert) continue;
      const key = `${r.fullName}||${r.concert}`;
      map.set(key, (map.get(key) ?? 0) + r.ticketCount);
    }
    return map;
  }, [records]);

  const filteredPurchasers = useMemo(() => {
    if (!search.trim()) return purchaserOrder;
    const q = search.toLowerCase();
    return purchaserOrder.filter(p => p.toLowerCase().includes(q));
  }, [purchaserOrder, search]);

  const concerts = concertOrder.map(c => c.name);

  return (
    <Card>
      <Card.Header title="Purchaser × Concert Heatmap" />
      <Card.Content>
        <div style={{ marginBottom: 12 }}>
          <input
            type="text"
            placeholder="Search purchaser name…"
            value={search}
            onChange={e => setSearch(e.target.value)}
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
        </div>
        <div style={{ overflow: 'auto', maxHeight: 500, overscrollBehaviorX: 'contain' }}>
          <table
            style={{
              borderCollapse: 'collapse',
              fontFamily: FONT,
              fontSize: 11,
              minWidth: concerts.length * 32 + 180,
            }}
          >
            <thead>
              <tr style={{ height: 120 }}>
                {/* Corner cell — sticky both horizontally and vertically */}
                <th
                  style={{
                    minWidth: 100,
                    textAlign: 'left',
                    padding: '4px 8px',
                    background: '#eef2f7',
                    position: 'sticky',
                    left: 0,
                    top: 0,
                    zIndex: 4,
                    verticalAlign: 'bottom',
                    fontWeight: 600,
                    color: '#4a5568',
                  }}
                >
                  Purchaser
                </th>
                {concerts.map(c => (
                  <th
                    key={c}
                    style={{
                      width: 28,
                      padding: '4px 2px',
                      verticalAlign: 'bottom',
                      position: 'sticky',
                      top: 0,
                      zIndex: 3,
                      background: '#eef2f7',
                    }}
                  >
                    <div
                      style={{
                        transform: 'rotate(-45deg)',
                        transformOrigin: 'bottom left',
                        whiteSpace: 'wrap',
                        fontSize: 11,
                        fontWeight: 800,
                        color: '#4a5568',
                        display: 'inline-block',
                        minWidth: 100,
                        paddingBottom: 4,
                      }}
                    >
                      {displayName(c)}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredPurchasers.map((purchaser, ri) => (
                <tr key={purchaser} style={{ background: ri % 2 === 0 ? '#fff' : '#f4f7fb' }}>
                  <td
                    style={{
                      padding: '3px 8px',
                      whiteSpace: 'nowrap',
                      maxWidth: 160,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      position: 'sticky',
                      left: 0,
                      background: ri % 2 === 0 ? '#fff' : '#f4f7fb',
                      zIndex: 1,
                      fontFamily: FONT,
                      color: '#162d3d',
                    }}
                    title={purchaser}
                  >
                    {purchaser}
                  </td>
                  {concerts.map(c => {
                    const count = ticketMap.get(`${purchaser}||${c}`) ?? 0;
                    return (
                      <td key={c} style={{ padding: '3px 2px', textAlign: 'center' }}>
                        {count > 0 ? (
                          <div
                            title={`${purchaser} — ${c}: ${count} ticket${count !== 1 ? 's' : ''}`}
                            style={{
                              width: 20,
                              height: 20,
                              margin: '0 auto',
                              borderRadius: 3,
                              background: ticketColor(count),
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: count >= 3 ? '#fff' : '#1A365D',
                              fontSize: 9,
                              fontWeight: 600,
                            }}
                          >
                            {count}
                          </div>
                        ) : (
                          <div style={{ width: 20, height: 20, margin: '0 auto' }} />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ marginTop: 8, fontSize: 11, color: '#939393', fontFamily: FONT }}>
          Showing {filteredPurchasers.length} of {purchaserOrder.length} purchasers
        </div>
      </Card.Content>
    </Card>
  );
}
