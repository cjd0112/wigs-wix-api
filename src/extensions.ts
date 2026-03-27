import { app } from '@wix/astro/builders';
import { dashboardpageHistoricalTicketSales } from './extensions/dashboard/pages/historical-ticket-sales/extensions.ts';
import { dashboardpageTicketBuyerBehaviour } from './extensions/dashboard/pages/ticket-buyer-behaviour/extensions.ts';

export default app()
  .use(dashboardpageHistoricalTicketSales)
  .use(dashboardpageTicketBuyerBehaviour)
