import {Box, Card, Dropdown, FormField, Text} from "@wix/design-system";
import {CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis} from "recharts";

export const ALL_CONCERTS_ID = '__all__';

const PALETTE = [
    '#3899EC', '#E87C1E', '#60B034', '#CB3636', '#8B5CF6',
    '#F59E0B', '#14B8A6', '#EC4899', '#6366F1', '#84CC16',
    '#0EA5E9', '#F97316', '#22C55E', '#EF4444', '#A855F7',
];

export interface AllConcertsPoint {
    weekOffset: number;
    [key: string]: number;
}

export interface AllConcertsChartData {
    data: AllConcertsPoint[];
    concertNames: string[]; // abbreviated names, used as chart dataKeys
}

export interface TicketChartProps {
    concertType: string,
    concertOptions: {id: string, value: string}[]
    selectedConcert: string | null
    setSelectedConcert: (concert: string | null) => void
    chartData: {date: string, cumulative: number}[]
    chartTotal: number
    allConcertsData?: AllConcertsChartData
}

export const TicketChart = ({
    concertType, concertOptions, selectedConcert, setSelectedConcert,
    chartData, chartTotal, allConcertsData,
}: TicketChartProps) => {
    const options = allConcertsData
        ? [{id: ALL_CONCERTS_ID, value: 'All Concerts'}, ...concertOptions]
        : concertOptions;

    const isAllMode = selectedConcert === ALL_CONCERTS_ID;
    const hasAllData = allConcertsData && allConcertsData.data.length > 0;

    return (
        <Card>
            <Card.Header title={`Cumulative Ticket Sales (${concertType})`}/>
            <Card.Content>
                <Box direction="vertical" gap="20px">
                    <FormField label="Concerts">
                        <Dropdown
                            placeholder="Choose a concert…"
                            options={options}
                            selectedId={selectedConcert ?? undefined}
                            onSelect={opt => setSelectedConcert(String(opt.id))}
                            popoverProps={{appendTo: 'window'}}
                        />
                    </FormField>

                    {/* ── All Concerts relative chart ── */}
                    {isAllMode && hasAllData && (
                        <Box direction="vertical" gap="8px">
                            <Text size="small" secondary>
                                All PROFESSIONAL concerts — cumulative tickets sold by weeks before event date
                            </Text>
                            <ResponsiveContainer width="100%" height={380}>
                                <LineChart
                                    data={allConcertsData!.data}
                                    margin={{top: 8, right: 24, left: 0, bottom: 28}}
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb"/>
                                    <XAxis
                                        dataKey="weekOffset"
                                        type="number"
                                        domain={['dataMin', 0]}
                                        tickFormatter={w => w === 0 ? 'Event' : `${-(w as number)}w`}
                                        tick={{fontSize: 10}}
                                        label={{
                                            value: 'Weeks before event',
                                            position: 'insideBottom',
                                            offset: -14,
                                            fontSize: 11,
                                            fill: '#939393',
                                        }}
                                    />
                                    <YAxis allowDecimals={false} tick={{fontSize: 11}} width={40}/>
                                    <Tooltip
                                        labelFormatter={w =>
                                            (w as number) === 0
                                                ? 'Event week'
                                                : `${Math.abs(w as number)} week${Math.abs(w as number) !== 1 ? 's' : ''} before event`
                                        }
                                    />
                                    <Legend wrapperStyle={{fontSize: 10, paddingTop: 8}}/>
                                    {allConcertsData!.concertNames.map((name, i) => (
                                        <Line
                                            key={name}
                                            type="monotone"
                                            dataKey={name}
                                            name={name}
                                            stroke={PALETTE[i % PALETTE.length]}
                                            strokeWidth={2}
                                            dot={false}
                                            activeDot={{r: 4}}
                                            connectNulls
                                        />
                                    ))}
                                </LineChart>
                            </ResponsiveContainer>
                        </Box>
                    )}

                    {isAllMode && !hasAllData && (
                        <Box align="center" paddingTop="12px" paddingBottom="12px">
                            <Text secondary>No concerts with parseable event dates found.</Text>
                        </Box>
                    )}

                    {/* ── Single concert chart ── */}
                    {!isAllMode && selectedConcert && chartData.length === 0 && (
                        <Text secondary>No dated purchase records found for this concert.</Text>
                    )}
                    {!isAllMode && !selectedConcert && (
                        <Box align="center" paddingTop="12px" paddingBottom="12px">
                            <Text secondary>Select a concert above to view its sales trend.</Text>
                        </Box>
                    )}
                    {!isAllMode && chartData.length > 0 && (
                        <Box direction="vertical" gap="8px">
                            <Text size="small" secondary>
                                {selectedConcert} — {chartTotal} total
                                ticket{chartTotal !== 1 ? 's' : ''} sold
                            </Text>
                            <ResponsiveContainer width="100%" height={260}>
                                <LineChart data={chartData}
                                           margin={{top: 8, right: 24, left: 0, bottom: 8}}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb"/>
                                    <XAxis dataKey="date" tick={{fontSize: 11}}
                                           interval="preserveStartEnd"/>
                                    <YAxis allowDecimals={false} tick={{fontSize: 11}} width={40}/>
                                    <Tooltip formatter={value => [value, 'Total tickets sold']}/>
                                    <Line type="monotone" dataKey="cumulative" stroke="#3899EC"
                                          strokeWidth={2}
                                          dot={{r: 3, fill: '#3899EC'}} activeDot={{r: 5}}/>
                                </LineChart>
                            </ResponsiveContainer>
                        </Box>
                    )}
                </Box>
            </Card.Content>
        </Card>
    );
};
