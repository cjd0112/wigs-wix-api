import { useEffect, useState } from 'react';
import type { FC } from 'react';
import {
  Box,
  EmptyState,
  Loader,
  Page,
  WixDesignSystemProvider,
} from '@wix/design-system';
import '@wix/design-system/styles.global.css';

import { loadAllRecords, buildConcertOrder, buildPurchaserOrder } from './data.ts';
import type { BuyerRecord, ConcertSummary } from './types.ts';
import { ChartReturning } from './chart-returning.tsx';
import { ChartHeatmap } from './chart-heatmap.tsx';
import { ChartTimeline } from './chart-timeline.tsx';
import { ChartTopPurchasers } from './chart-top-purchasers.tsx';

const TicketBuyerBehaviourPage: FC = () => {
  const [records, setRecords] = useState<BuyerRecord[]>([]);
  const [concertOrder, setConcertOrder] = useState<ConcertSummary[]>([]);
  const [purchaserOrder, setPurchaserOrder] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const all = await loadAllRecords();
        setRecords(all);
        setConcertOrder(buildConcertOrder(all));
        setPurchaserOrder(buildPurchaserOrder(all));
      } catch (err) {
        console.error(err);
        setError('Failed to load data. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  if (loading) {
    return (
      <WixDesignSystemProvider features={{ newColorsBranding: true }}>
        <Page>
          <Page.Header title="Ticket Buyer Behaviour" subtitle="Loading data…" />
          <Page.Content>
            <Box align="center" verticalAlign="middle" height="400px">
              <Loader size="medium" />
            </Box>
          </Page.Content>
        </Page>
      </WixDesignSystemProvider>
    );
  }

  if (error) {
    return (
      <WixDesignSystemProvider features={{ newColorsBranding: true }}>
        <Page>
          <Page.Header title="Ticket Buyer Behaviour" subtitle="" />
          <Page.Content>
            <EmptyState skin="page" title="Something went wrong" subtitle={error} />
          </Page.Content>
        </Page>
      </WixDesignSystemProvider>
    );
  }

  const uniquePurchasers = purchaserOrder.length;
  const totalRecords = records.length;

  return (
    <WixDesignSystemProvider features={{ newColorsBranding: true }}>
      <Page>
        <Page.Header
          title="Ticket Buyer Behaviour"
          subtitle={`${totalRecords} records · ${uniquePurchasers} unique purchasers · ${concertOrder.length} concerts`}
        />
        <Page.Content>
          <ChartReturning records={records} concertOrder={concertOrder} />
          <Box height="24px" />
          <ChartHeatmap
            records={records}
            concertOrder={concertOrder}
            purchaserOrder={purchaserOrder}
          />
          <Box height="24px" />
          <ChartTimeline records={records} purchaserOrder={purchaserOrder} />
          <Box height="24px" />
          <ChartTopPurchasers records={records} />
          <Box height="48px" />
        </Page.Content>
      </Page>
    </WixDesignSystemProvider>
  );
};

export default TicketBuyerBehaviourPage;
