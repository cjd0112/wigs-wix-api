import { extensions } from '@wix/astro/builders';

export const dashboardpageHistoricalTicketSales = extensions.dashboardPage({
  id: 'f3a2e1d0-bc98-47e6-a5d4-c3b2a1908070',
  title: 'Historical Ticket Sales',
  routePath: 'historical-ticket-sales',
  component: './extensions/dashboard/pages/historical-ticket-sales/page.tsx',
});
