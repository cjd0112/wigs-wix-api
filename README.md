# Wigs Wix API — Concert Ticket Analytics App

A Wix Custom App built with Astro and React that adds two back-office dashboard pages to your Wix site for analysing concert ticket sales data.

---

## Prerequisites

Before running the project you need a `.env.local` file in the project root containing your Wix API credentials:

```
WIX_CLOUD_PROVIDER=CLOUDFLARE
WIX_CLIENT_ID=<your-wix-app-id>
WIX_CLIENT_SECRET=<your-wix-oauth-secret>
WIX_CLIENT_PUBLIC_KEY=<your-rsa-public-key>
```

Without this file the app cannot authenticate with the Wix APIs and will fail to start.

---

## Getting Started

```bash
npm install
npm run dev      # start local dev server
npm run build    # production build
npm run release  # deploy to Wix
```

---

## Extensions

The app registers two dashboard page extensions. Both read from the same Wix Data collection (`Import2`), which holds ticket purchase records for concerts.

### 1. Historical Ticket Sales

**Route**: `/historical-ticket-sales`

Displays cumulative ticket sales over time and lets you sync order data from Wix Events into the data collection.

**What it does:**

- Loads all records from the `Import2` data collection (paginated in batches of 500).
- Renders a line chart showing cumulative ticket sales per week, relative to each concert date.
- Supports filtering by individual concert and by concert type (`PROFESSIONAL` vs `RCM/RAM`).
- **Sync** — fetches orders directly from the Wix Events API and bulk-inserts any new ones into `Import2`, deduplicating on `wixOrderNumber`.
- **Remove Synced** — deletes previously synced Wix Events orders from the collection, leaving manually imported historical records untouched.

**Key files:**

```
src/extensions/dashboard/pages/historical-ticket-sales/
├── extensions.ts   # Extension registration
├── page.tsx        # Main component — data loading, sync logic, chart rendering
└── ticket-chart.tsx # Reusable line chart component
```

---

### 2. Ticket Buyer Behaviour

**Route**: `/ticket-buyer-behaviour`

Analyses purchasing patterns across buyers and concerts using four interactive visualisations.

**What it does:**

- Loads all records from `Import2` on mount.
- Shows summary metrics: total records, unique purchasers, concert count.
- Renders four charts:

  | Chart | Type | What it shows |
  |---|---|---|
  | Returning Buyers | Stacked bar | New vs returning buyers per concert |
  | Purchaser Heatmap | Heatmap grid | Ticket counts per buyer × concert combination |
  | Purchase Timeline | Scatter plot | Purchase date vs quantity, coloured by concert type |
  | Top Purchasers | Bar chart | Top 10 buyers by total tickets purchased |

**Key files:**

```
src/extensions/dashboard/pages/ticket-buyer-behaviour/
├── extensions.ts         # Extension registration
├── page.tsx              # Main component — layout and metric summary
├── data.ts               # Data loading and transformation utilities
├── types.ts              # TypeScript interfaces (BuyerRecord, ConcertSummary, etc.)
├── chart-returning.tsx   # New vs returning buyers chart
├── chart-heatmap.tsx     # Purchaser × concert heatmap
├── chart-timeline.tsx    # Purchase timeline scatter plot
└── chart-top-purchasers.tsx # Top purchasers bar chart
```

---

## How Extensions Are Registered

Every extension follows the same three-step pattern:

### Step 1 — Define the extension

Create an `extensions.ts` file inside your extension's directory:

```typescript
// src/extensions/dashboard/pages/my-new-page/extensions.ts
import { extensions } from '@wix/astro/builders';

export const dashboardpageMyNewPage = extensions.dashboardPage({
  id: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', // unique UUID
  title: 'My New Page',
  routePath: 'my-new-page',
  component: './extensions/dashboard/pages/my-new-page/page.tsx',
});
```

- `id` must be a unique UUID. Generate one with `crypto.randomUUID()` or any UUID tool.
- `routePath` becomes the URL path under your app's base route.
- `component` is the path to your React page component (relative to `src/`).

### Step 2 — Create the page component

```typescript
// src/extensions/dashboard/pages/my-new-page/page.tsx
import React from 'react';
import { Page, Card } from '@wix/design-system';

export default function MyNewPage() {
  return (
    <Page>
      <Page.Header title="My New Page" />
      <Page.Content>
        <Card>
          <Card.Content>Hello from my extension!</Card.Content>
        </Card>
      </Page.Content>
    </Page>
  );
}
```

### Step 3 — Register the extension in the app

Add your extension to `src/extensions.ts`:

```typescript
import { app } from '@wix/astro/builders';
import { dashboardpageHistoricalTicketSales } from './extensions/dashboard/pages/historical-ticket-sales/extensions.ts';
import { dashboardpageTicketBuyerBehaviour } from './extensions/dashboard/pages/ticket-buyer-behaviour/extensions.ts';
import { dashboardpageMyNewPage } from './extensions/dashboard/pages/my-new-page/extensions.ts';

export default app()
  .use(dashboardpageHistoricalTicketSales)
  .use(dashboardpageTicketBuyerBehaviour)
  .use(dashboardpageMyNewPage); // add your extension here
```

The Wix CLI picks up the updated registry on the next `dev` or `build` run and generates an updated `dist/_wix/app-manifest.json` automatically.

---

## Tech Stack

| Tool | Purpose |
|---|---|
| [Wix CLI](https://dev.wix.com/docs/build-apps/developer-tools/cli) | App scaffolding, dev server, deployment |
| [Astro](https://astro.build) | SSR framework (Cloudflare Workers adapter) |
| [React](https://react.dev) | UI components |
| [Wix Design System](https://wix-style-react.com) | Dashboard UI components |
| [Recharts](https://recharts.org) | Data visualisation |
| [TanStack Table](https://tanstack.com/table) | Sortable/filterable data tables |
| [@wix/data](https://dev.wix.com/docs/sdk/api-reference/data) | Wix Data collection client |
| [@wix/events](https://dev.wix.com/docs/sdk/api-reference/events) | Wix Events orders API |
