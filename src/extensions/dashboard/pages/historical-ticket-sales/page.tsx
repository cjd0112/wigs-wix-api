import {useCallback, useEffect, useMemo, useState} from 'react';
import type {FC} from 'react';
import {
    flexRender,
    getCoreRowModel,
    getExpandedRowModel,
    getFacetedRowModel,
    getFacetedUniqueValues,
    getFilteredRowModel,
    getGroupedRowModel,
    getSortedRowModel,
    useReactTable,
} from '@tanstack/react-table';
import type {
    Column,
    ColumnDef,
    ColumnFiltersState,
    ExpandedState,
    GroupingState,
    SortingState,
} from '@tanstack/react-table';
import {
    Box,
    Button,
    Card,
    EmptyState,
    FormField,
    Loader,
    Page,
    Text,
    WixDesignSystemProvider,
} from '@wix/design-system';
import '@wix/design-system/styles.global.css';
import {items} from '@wix/data';
import {orders, wixEventsV2} from '@wix/events';
import {TicketChart} from "./ticket-chart.tsx";
import type {AllConcertsChartData, AllConcertsPoint} from "./ticket-chart.tsx";

// ─── Types ────────────────────────────────────────────────────────────────────

const SourceCollectionName = 'Import2'

interface TicketRow {
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
    ticketCount: number | null;
    purchaseDate: string;
    purchaseDateISO: string;
    isHistoricalOrder: boolean;
    wixOrderNumber: string;
}

interface ChartPoint {
    date: string;
    cumulative: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(value: unknown): string {
    if (value == null) return '';
    const d = value instanceof Date ? value : new Date(String(value));
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-GB', {day: 'numeric', month: 'long', year: 'numeric'});
}

function toISODate(value: unknown): string {
    if (value == null) return '';
    const d = value instanceof Date ? value : new Date(String(value));
    if (isNaN(d.getTime())) return '';
    return d.toISOString().slice(0, 10);
}

function toTicketRow(item: Record<string, unknown>): TicketRow {
    return {
        _id: typeof item['_id'] === 'string' ? item['_id'] : '',
        firstName: typeof item['firstName'] === 'string' ? item['firstName'] : '',
        surname: typeof item['surname'] === 'string' ? item['surname'] : '',
        otherNames: typeof item['otherNames'] === 'string' ? item['otherNames'] : '',
        emailAddress: typeof item['emailAddress'] === 'string' ? item['emailAddress'] : '',
        group: typeof item['group'] === 'string' ? item['group'] : '',
        source: typeof item['source'] === 'string' ? item['source'] : '',
        status1: typeof item['status1'] === 'string' ? item['status1'] : '',
        concert: typeof item['concert'] === 'string' ? item['concert'] : '',
        concertType: typeof item['concertType'] === 'string' ? item['concertType'] : '',
        purchaseText: typeof item['purchaseText'] === 'string' ? item['purchaseText'] : '',
        ticketCount: typeof item['ticketCount'] === 'number' ? item['ticketCount'] : null,
        purchaseDate: formatDate(item['purchaseDate']),
        purchaseDateISO: toISODate(item['purchaseDate']),
        isHistoricalOrder: typeof item['isHistoricalOrder'] === 'boolean' ? item['isHistoricalOrder'] : true,
        wixOrderNumber: typeof item['wixOrderNumber'] === 'string' ? item['wixOrderNumber'] : '',
    };
}

function buildChartData(rows: TicketRow[], concert: string): ChartPoint[] {
    const byDay = new Map<string, number>();
    for (const row of rows) {
        if (row.concert === concert && row.purchaseDateISO) {
            byDay.set(row.purchaseDateISO, (byDay.get(row.purchaseDateISO) ?? 0) + (row.ticketCount ?? 0));
        }
    }
    let running = 0;
    return [...byDay.keys()].sort().map(iso => {
        running += byDay.get(iso) ?? 0;
        const label = new Date(iso).toLocaleDateString('en-GB', {day: 'numeric', month: 'short', year: '2-digit'});
        return {date: label, cumulative: running};
    });
}

// ─── Relative-chart helpers ───────────────────────────────────────────────────

const MONTH_MAP_STR: Record<string, string> = {
    january: '01', jan: '01', february: '02', feb: '02', march: '03', mar: '03',
    april: '04', apr: '04', may: '05', june: '06', jun: '06',
    july: '07', jul: '07', august: '08', aug: '08',
    september: '09', sep: '09', sept: '09', october: '10', oct: '10',
    november: '11', nov: '11', december: '12', dec: '12',
};
const MONTH_IDX: Record<string, number> = {
    january: 0, jan: 0, february: 1, feb: 1, march: 2, mar: 2,
    april: 3, apr: 3, may: 4, june: 5, jun: 5,
    july: 6, jul: 6, august: 7, aug: 7,
    september: 8, sep: 8, sept: 8, october: 9, oct: 9,
    november: 10, nov: 10, december: 11, dec: 11,
};

// Matches full month names or 3-letter abbreviations (case-insensitive)
const MO = '(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)';

function parseConcertDate(title: string): Date | null {
    // "25 March 2026", "25th Mar 2026"
    let m = title.match(new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+${MO}\\s+(\\d{4})\\b`, 'i'));
    if (m) return new Date(parseInt(m[3]), MONTH_IDX[m[2].toLowerCase()], parseInt(m[1]));
    // "March 25, 2026", "Mar 25 2026"
    m = title.match(new RegExp(`\\b${MO}\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s+(\\d{4})\\b`, 'i'));
    if (m) return new Date(parseInt(m[3]), MONTH_IDX[m[1].toLowerCase()], parseInt(m[2]));
    // "25/03/2026" or "25-03-2026"
    m = title.match(/\b(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})\b/);
    if (m) return new Date(parseInt(m[3]), parseInt(m[2]) - 1, parseInt(m[1]));
    return null;
}

function abbreviateConcert(title: string): string {
    let s = title;
    s = s.replace(/WIGS Conservatoire Series/gi, 'WCS');
    s = s.replace(/Royal College of Music/gi, 'RCM');
    s = s.replace(/Royal Academy of Music/gi, 'RAM');
    // "25 March 2026" / "25 Mar 2026"
    s = s.replace(
        new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+${MO}\\s+(\\d{4})\\b`, 'gi'),
        (_, d, mo, y) => `${d.padStart(2, '0')}-${MONTH_MAP_STR[mo.toLowerCase()]}-${y.slice(2)}`,
    );
    // "March 25, 2026" / "Mar 25 2026"
    s = s.replace(
        new RegExp(`\\b${MO}\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s+(\\d{4})\\b`, 'gi'),
        (_, mo, d, y) => `${d.padStart(2, '0')}-${MONTH_MAP_STR[mo.toLowerCase()]}-${y.slice(2)}`,
    );
    // "25/03/2026" or "25-03-2026"
    s = s.replace(
        /\b(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})\b/g,
        (_, d, mo, y) => `${d.padStart(2, '0')}-${mo.padStart(2, '0')}-${y.slice(2)}`,
    );
    return s.trim();
}

function buildRelativeConcertChartData(rows: TicketRow[]): AllConcertsChartData {
    const profRows = rows.filter(r => r.concertType === 'PROFESSIONAL' && r.purchaseDateISO);
    const concerts = [...new Set(profRows.map(r => r.concert).filter(Boolean))];

    const concertsWithDates: { name: string; abbrev: string; eventDate: Date }[] = [];
    for (const concert of concerts) {
        const eventDate = parseConcertDate(concert);
        if (eventDate) concertsWithDates.push({name: concert, abbrev: abbreviateConcert(concert), eventDate});
    }
    if (concertsWithDates.length === 0) return {data: [], concertNames: []};

    const nameToAbbrev = new Map(concertsWithDates.map(c => [c.name, c.abbrev]));
    const nameToEventDate = new Map(concertsWithDates.map(c => [c.name, c.eventDate]));

    // Weekly ticket counts per concert (keyed by abbreviated name)
    const weeklySales = new Map<string, Map<number, number>>();
    for (const c of concertsWithDates) weeklySales.set(c.abbrev, new Map());

    let minWeek = 0;
    for (const row of profRows) {
        const eventDate = nameToEventDate.get(row.concert);
        if (!eventDate) continue;
        const weekOffset = Math.floor(
            (new Date(row.purchaseDateISO).getTime() - eventDate.getTime()) / (7 * 24 * 3600 * 1000),
        );
        if (weekOffset < minWeek) minWeek = weekOffset;
        const abbrev = nameToAbbrev.get(row.concert)!;
        const wmap = weeklySales.get(abbrev)!;
        wmap.set(weekOffset, (wmap.get(weekOffset) ?? 0) + (row.ticketCount ?? 0));
    }

    const weeks = Array.from({length: -minWeek + 1}, (_, i) => minWeek + i);
    const concertNames = concertsWithDates.map(c => c.abbrev);

    const data: AllConcertsPoint[] = weeks.map(week => {
        const point: AllConcertsPoint = {weekOffset: week};
        for (const c of concertsWithDates) {
            let cum = 0;
            for (const [w, count] of weeklySales.get(c.abbrev)!) {
                if (w <= week) cum += count;
            }
            point[c.abbrev] = cum;
        }
        return point;
    });

    return {data, concertNames};
}

// ─── Column filter component ──────────────────────────────────────────────────

function UniqueValuesFilter({column}: { column: Column<TicketRow, unknown> }) {
    const uniqueValues = useMemo(
        () => [...column.getFacetedUniqueValues().keys()].filter(Boolean).sort(),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [column.getFacetedUniqueValues()],
    );
    const current = (column.getFilterValue() as string) ?? '';

    return (
        <select
            value={current}
            onChange={e => column.setFilterValue(e.target.value || undefined)}
            style={{
                width: '100%',
                fontSize: 11,
                padding: '2px 4px',
                border: '1px solid #dfe3eb',
                borderRadius: 4,
                background: '#fff',
                color: current ? '#162d3d' : '#939393',
                marginTop: 4,
            }}
        >
            <option value="">All</option>
            {uniqueValues.map(v => (
                <option key={v} value={v}>{v}</option>
            ))}
        </select>
    );
}

// ─── Column definitions ───────────────────────────────────────────────────────

const columnDefs: ColumnDef<TicketRow>[] = [
    {accessorKey: 'firstName', header: 'First Name', size: 130},
    {accessorKey: 'surname', header: 'Surname', size: 140},
    {accessorKey: 'otherNames', header: 'Other Names', size: 130},
    {accessorKey: 'emailAddress', header: 'Email', size: 240},
    {accessorKey: 'concert', header: 'Concert', size: 280},
    {
        accessorKey: 'ticketCount',
        header: 'Tickets',
        size: 80,
        filterFn: 'equals',
        cell: info => info.getValue() ?? '—',
    },
    {accessorKey: 'purchaseDate', header: 'Purchase Date', size: 160},
];

const GROUPABLE_COLUMNS = [
    {id: 'concert', value: 'Concert'},
    {id: 'surname', value: 'Surname'},
];

// ─── Styles ───────────────────────────────────────────────────────────────────

const FONT = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";

const tblStyle: React.CSSProperties = {width: '100%', borderCollapse: 'collapse', fontSize: 15, fontFamily: FONT};
const thStyle: React.CSSProperties = {
    padding: '12px 14px 8px',
    background: '#eef2f7',
    borderBottom: '2px solid #c8d3e0',
    textAlign: 'left',
    whiteSpace: 'nowrap',
    verticalAlign: 'top',
    position: 'sticky',
    top: 0,
    zIndex: 1,
    fontFamily: FONT,
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    color: '#4a5568',
};
const tdStyle: React.CSSProperties = {padding: '10px 14px', borderBottom: '1px solid #e8edf3', fontFamily: FONT};
const sortIcon = (dir: false | 'asc' | 'desc') =>
    dir === 'asc' ? ' ↑' : dir === 'desc' ? ' ↓' : '';

// ─── Main page ────────────────────────────────────────────────────────────────

const HistoricalTicketSalesPage: FC = () => {
    const [allRows, setAllRows] = useState<TicketRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedConcertProfessional, setSelectedConcertProfessional] = useState<string | null>(null);
    const [selectedConcertRCMorRAM, setSelectedConcertRCMorRAM] = useState<string | null>(null);

    // Sync state
    const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'removing'>('idle');
    const [syncMessage, setSyncMessage] = useState<string | null>(null);

    // TanStack state
    const [sorting, setSorting] = useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
    const [grouping, setGrouping] = useState<GroupingState>([]);
    const [expanded, setExpanded] = useState<ExpandedState>({});

    // ── Fetch ──────────────────────────────────────────────────────────────────
    const fetchRows = useCallback(async () => {
        const rows: TicketRow[] = [];
        let result = await items.query(SourceCollectionName).descending('purchaseDate').limit(500).find();
        (result.items as Record<string, unknown>[]).forEach(i => rows.push(toTicketRow(i)));
        while (result.hasNext()) {
            result = await result.next();
            (result.items as Record<string, unknown>[]).forEach(i => rows.push(toTicketRow(i)));
        }
        setAllRows(rows);
    }, []);

    useEffect(() => {
        const load = async () => {
            try {
                await fetchRows();
            } catch (err) {
                console.error(err);
                setError('Failed to load ticket sales. Please try again.');
            } finally {
                setLoading(false);
            }
        };
        void load();
    }, [fetchRows]);

    // ── Sync from Wix Events ───────────────────────────────────────────────────
    const handleSync = useCallback(async () => {
        setSyncStatus('syncing');
        setSyncMessage(null);
        try {
            // Build set of already-imported order numbers from current data
            const existingOrderNumbers = new Set(allRows.map(r => r.wixOrderNumber).filter(Boolean));

            // Fetch all events to build eventId → { title, dateStr } map
            const eventMap = new Map<string, { title: string; dateStr: string }>();
            const extractEventEntry = (ev: Record<string, unknown>) => {
                if (!ev['_id'] || !ev['title']) return;
                const dateAndTime = (ev['dateAndTimeSettings'] as Record<string, unknown> | undefined);
                const startDate = dateAndTime?.['startDate'];
                let dateStr = '';
                if (startDate) {
                    const d = startDate instanceof Date ? startDate : new Date(String(startDate));
                    if (!isNaN(d.getTime())) {
                        dateStr = d.toLocaleDateString('en-GB', {day: '2-digit', month: 'short', year: 'numeric'});
                    }
                }
                eventMap.set(String(ev['_id']), {title: String(ev['title']), dateStr});
            };
            let eventsResult = await wixEventsV2.queryEvents().limit(100).find();
            for (const ev of eventsResult.items) extractEventEntry(ev as unknown as Record<string, unknown>);
            while (eventsResult.hasNext()) {
                eventsResult = await eventsResult.next();
                for (const ev of eventsResult.items) extractEventEntry(ev as unknown as Record<string, unknown>);
            }

            // Fetch all orders paginated with DETAILS fieldset
            const BATCH = 100;
            let offset = 0;
            let addedCount = 0;
            let skippedCount = 0;
            const newItems: Record<string, unknown>[] = [];

            while (true) {
                const response = await orders.listOrders({
                    fieldset: ['DETAILS'],
                    limit: BATCH,
                    offset,
                });
                const batch = response.orders ?? [];
                if (batch.length === 0) break;

                for (const order of batch) {
                    const orderNum = order.orderNumber ?? '';
                    if (!orderNum || existingOrderNumbers.has(orderNum)) {
                        skippedCount++;
                        continue;
                    }
                    const eventEntry = order.eventId ? eventMap.get(order.eventId) : undefined;
                    const eventTitle = eventEntry?.title ?? '';
                    const concert = eventTitle && eventEntry?.dateStr
                        ? `${eventTitle} - ${eventEntry.dateStr}`
                        : eventTitle;
                    const concertType =
                        eventTitle.includes('Royal College of Music')
                        || eventTitle.includes('Royal Academy ')
                        || eventTitle.includes("Coached ")
                        || eventTitle.includes("Advanced ") ? 'RCM or RAM' : 'PROFESSIONAL';
                    newItems.push({
                        firstName: order.firstName ?? '',
                        surname: order.lastName ?? '',
                        emailAddress: order.email ?? '',
                        ticketCount: order.ticketsQuantity ?? null,
                        purchaseDate: order.created ?? null,
                        status1: order.status ?? '',
                        concert,
                        concertType,
                        source: 'Wix Events',
                        isHistoricalOrder: false,
                        wixOrderNumber: orderNum,
                        otherNames: '',
                        group: '',
                        purchaseText: '',
                    });
                    existingOrderNumbers.add(orderNum);
                    addedCount++;
                }

                if (batch.length < BATCH) break;
                offset += BATCH;
            }

            // Bulk insert in batches of 100
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const bulkInsert = items.bulkInsert as any;
            for (let i = 0; i < newItems.length; i += 100) {
                await bulkInsert(SourceCollectionName, newItems.slice(i, i + 100));
            }

            await fetchRows();
            setSyncMessage(`Sync complete: ${addedCount} new order${addedCount !== 1 ? 's' : ''} added, ${skippedCount} already existed.`);
        } catch (err) {
            console.error(err);
            setSyncMessage('Sync failed. Please check the console and try again.');
        } finally {
            setSyncStatus('idle');
        }
    }, [allRows, fetchRows]);

    // ── Remove Wix Events orders ───────────────────────────────────────────────
    const handleRemove = useCallback(async () => {
        setSyncStatus('removing');
        setSyncMessage(null);
        try {
            const idsToDelete: string[] = [];
            let result = await items.query(SourceCollectionName).eq('isHistoricalOrder', false).limit(1000).find();
            (result.items as Record<string, unknown>[]).forEach(i => {
                if (typeof i['_id'] === 'string') idsToDelete.push(i['_id']);
            });
            while (result.hasNext()) {
                result = await result.next();
                (result.items as Record<string, unknown>[]).forEach(i => {
                    if (typeof i['_id'] === 'string') idsToDelete.push(i['_id']);
                });
            }

            // Bulk remove in batches of 100
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const bulkRemove = items.bulkRemove as any;
            for (let i = 0; i < idsToDelete.length; i += 100) {
                await bulkRemove(SourceCollectionName, idsToDelete.slice(i, i + 100));
            }

            await fetchRows();
            setSyncMessage(`Removed ${idsToDelete.length} Wix Events order${idsToDelete.length !== 1 ? 's' : ''}.`);
        } catch (err) {
            console.error(err);
            setSyncMessage('Remove failed. Please check the console and try again.');
        } finally {
            setSyncStatus('idle');
        }
    }, [fetchRows]);

    // ── Chart data ─────────────────────────────────────────────────────────────
    const concertOptionsProfessional = useMemo(
        () => [...new Set(allRows.filter(z => z.concertType == "PROFESSIONAL").map(r => r.concert).filter(Boolean))].sort().map(n => ({
            id: n,
            value: n
        })),
        [allRows],
    );

    const concertOptionsRCMAndRAM = useMemo(
        () => [...new Set(allRows.filter(z => z.concertType == "RCM or RAM").map(r => r.concert).filter(Boolean))].sort().map(n => ({
            id: n,
            value: n
        })),
        [allRows],
    );

    const allConcertsData = useMemo(
        () => buildRelativeConcertChartData(allRows),
        [allRows],
    );

    const chartDataProfessional = useMemo<ChartPoint[]>(
        () => (selectedConcertProfessional ? buildChartData(allRows, selectedConcertProfessional) : []),
        [allRows, selectedConcertProfessional],
    );
    const chartTotalProfessional = chartDataProfessional.length > 0 ? chartDataProfessional[chartDataProfessional.length - 1].cumulative : 0;

    const chartDataRCMorRAM = useMemo<ChartPoint[]>(
        () => (selectedConcertRCMorRAM ? buildChartData(allRows, selectedConcertRCMorRAM) : []),
        [allRows, selectedConcertRCMorRAM],
    );
    const chartTotalRCMorRAM = chartDataRCMorRAM.length > 0 ? chartDataRCMorRAM[chartDataRCMorRAM.length - 1].cumulative : 0;

    // ── TanStack table ─────────────────────────────────────────────────────────
    const table = useReactTable({
        data: allRows,
        columns: columnDefs,
        state: {sorting, columnFilters, grouping, expanded},
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        onGroupingChange: v => {
            setGrouping(v);
            setExpanded({});
        },
        onExpandedChange: setExpanded,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getGroupedRowModel: getGroupedRowModel(),
        getExpandedRowModel: getExpandedRowModel(),
        getFacetedRowModel: getFacetedRowModel(),
        getFacetedUniqueValues: getFacetedUniqueValues(),
    });

    // ── Loading / error ────────────────────────────────────────────────────────
    if (loading) {
        return (
            <WixDesignSystemProvider features={{newColorsBranding: true}}>
                <Page>
                    <Page.Header title="Historical Ticket Sales" subtitle="Loading data…"/>
                    <Page.Content>
                        <Box align="center" verticalAlign="middle" height="400px">
                            <Loader size="medium"/>
                        </Box>
                    </Page.Content>
                </Page>
            </WixDesignSystemProvider>
        );
    }

    if (error) {
        return (
            <WixDesignSystemProvider features={{newColorsBranding: true}}>
                <Page>
                    <Page.Header title="Historical Ticket Sales" subtitle=""/>
                    <Page.Content>
                        <EmptyState skin="page" title="Something went wrong" subtitle={error}/>
                    </Page.Content>
                </Page>
            </WixDesignSystemProvider>
        );
    }

    const {rows} = table.getRowModel();
    const totalFiltered = table.getFilteredRowModel().rows.length;
    const isBusy = syncStatus !== 'idle';

    return (
        <WixDesignSystemProvider features={{newColorsBranding: true}}>
            <Page>
                <Page.Header
                    title="Historical Ticket Sales"
                    subtitle={`${allRows.length} records total · ${totalFiltered} shown after filters`}
                    actionsBar={
                        <Box direction="horizontal" gap="12px" verticalAlign="middle">
                            <Button
                                size="medium"
                                onClick={handleSync}
                                disabled={isBusy}
                            >
                                {syncStatus === 'syncing' ? 'Syncing…' : 'Sync from Wix Events'}
                            </Button>
                            <Button
                                size="medium"
                                skin="destructive"
                                priority="secondary"
                                onClick={handleRemove}
                                disabled={isBusy}
                            >
                                {syncStatus === 'removing' ? 'Removing…' : 'Remove Wix Events'}
                            </Button>
                        </Box>
                    }
                />
                <Page.Content>

                    {syncMessage && (
                        <Box marginBottom="16px">
                            <Text size="small" secondary>{syncMessage}</Text>
                        </Box>
                    )}

                    <TicketChart concertType="PROFESSIONAL" selectedConcert={selectedConcertProfessional}
                                 chartData={chartDataProfessional} chartTotal={chartTotalProfessional}
                                 concertOptions={concertOptionsProfessional}
                                 setSelectedConcert={setSelectedConcertProfessional} allConcertsData={allConcertsData}/>

                    <Box height="24px"/>

                    <TicketChart concertType="RCM and RAM" selectedConcert={selectedConcertRCMorRAM}
                                 chartData={chartDataRCMorRAM} chartTotal={chartTotalRCMorRAM}
                                 concertOptions={concertOptionsRCMAndRAM}
                                 setSelectedConcert={setSelectedConcertRCMorRAM}>
                    </TicketChart>

                    <Box height="24px"/>

                    {/* ── Table controls ────────────────────────────────────────────── */}
                    {/*<Card>*/}
                    {/*    <Card.Content>*/}
                    {/*        <Box direction="horizontal" gap="16px" verticalAlign="middle">*/}
                    {/*            <FormField label="Group by">*/}
                    {/*                <select*/}
                    {/*                    value={grouping[0] ?? ''}*/}
                    {/*                    onChange={e => setGrouping(e.target.value ? [e.target.value] : [])}*/}
                    {/*                    style={{*/}
                    {/*                        padding: '6px 10px',*/}
                    {/*                        fontSize: 13,*/}
                    {/*                        fontFamily: FONT,*/}
                    {/*                        border: '1px solid #dfe3eb',*/}
                    {/*                        borderRadius: 6,*/}
                    {/*                        background: '#fff'*/}
                    {/*                    }}*/}
                    {/*                >*/}
                    {/*                    <option value="">(none)</option>*/}
                    {/*                    {GROUPABLE_COLUMNS.map(c => (*/}
                    {/*                        <option key={c.id} value={c.id}>{c.value}</option>*/}
                    {/*                    ))}*/}
                    {/*                </select>*/}
                    {/*            </FormField>*/}
                    {/*            <Box marginTop="20px">*/}
                    {/*                <Text size="small" secondary>{totalFiltered} records</Text>*/}
                    {/*            </Box>*/}
                    {/*        </Box>*/}
                    {/*    </Card.Content>*/}
                    {/*</Card>*/}

                    <Box height="8px"/>

                    {/*/!* ── Table ─────────────────────────────────────────────────────── *!/*/}
                    {/*<div style={{overflow: 'auto', maxHeight: 'calc(100vh - 420px)', borderRadius: 8, border: '1px solid #c8d3e0'}}>*/}
                    {/*    <table style={tblStyle}>*/}
                    {/*        <thead>*/}
                    {/*        {table.getHeaderGroups().map(headerGroup => (*/}
                    {/*            <tr key={headerGroup.id}>*/}
                    {/*                {headerGroup.headers.map(header => (*/}
                    {/*                    <th key={header.id}*/}
                    {/*                        style={{...thStyle, width: header.getSize(), minWidth: header.getSize()}}>*/}
                    {/*                        <div*/}
                    {/*                            style={{*/}
                    {/*                                cursor: header.column.getCanSort() ? 'pointer' : 'default',*/}
                    {/*                                fontWeight: 600,*/}
                    {/*                                fontSize: 12*/}
                    {/*                            }}*/}
                    {/*                            onClick={header.column.getToggleSortingHandler()}*/}
                    {/*                        >*/}
                    {/*                            {flexRender(header.column.columnDef.header, header.getContext())}*/}
                    {/*                            {sortIcon(header.column.getIsSorted())}*/}
                    {/*                        </div>*/}
                    {/*                        {header.column.getCanFilter() && (*/}
                    {/*                            <UniqueValuesFilter column={header.column}/>*/}
                    {/*                        )}*/}
                    {/*                    </th>*/}
                    {/*                ))}*/}
                    {/*            </tr>*/}
                    {/*        ))}*/}
                    {/*        </thead>*/}
                    {/*        <tbody>*/}
                    {/*        {rows.length === 0 ? (*/}
                    {/*            <tr>*/}
                    {/*                <td colSpan={columnDefs.length}*/}
                    {/*                    style={{...tdStyle, textAlign: 'center', padding: 32, color: '#939393'}}>*/}
                    {/*                    No records match the current filters.*/}
                    {/*                </td>*/}
                    {/*            </tr>*/}
                    {/*        ) : (*/}
                    {/*            rows.map(row => (*/}
                    {/*                <tr key={row.id}*/}
                    {/*                    style={{background: row.getIsGrouped() ? '#eef2f7' : row.index % 2 === 0 ? '#ffffff' : '#f4f7fb'}}>*/}
                    {/*                    {row.getVisibleCells().map(cell => (*/}
                    {/*                        <td key={cell.id} style={tdStyle}>*/}
                    {/*                            {cell.getIsGrouped() ? (*/}
                    {/*                                <span*/}
                    {/*                                    style={{cursor: 'pointer', fontWeight: 600}}*/}
                    {/*                                    onClick={row.getToggleExpandedHandler()}*/}
                    {/*                                >*/}
                    {/*                                    {row.getIsExpanded() ? '▾' : '▸'}{' '}*/}
                    {/*                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}{' '}*/}
                    {/*                                    <span style={{*/}
                    {/*                                        color: '#939393',*/}
                    {/*                                        fontWeight: 400*/}
                    {/*                                    }}>({row.subRows.length})</span>*/}
                    {/*                                </span>*/}
                    {/*                            ) : cell.getIsAggregated() ? null : cell.getIsPlaceholder() ? null : (*/}
                    {/*                                flexRender(cell.column.columnDef.cell, cell.getContext())*/}
                    {/*                            )}*/}
                    {/*                        </td>*/}
                    {/*                    ))}*/}
                    {/*                </tr>*/}
                    {/*            ))*/}
                    {/*        )}*/}
                    {/*        </tbody>*/}
                    {/*    </table>*/}
                    {/*</div>*/}

                </Page.Content>
            </Page>
        </WixDesignSystemProvider>
    );
};

export default HistoricalTicketSalesPage;
