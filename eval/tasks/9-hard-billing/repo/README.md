# billing-service

Invoices, subscriptions, refunds and payouts for the shop, plus the integrations around them.

- `src/invoices/`: invoice totals, numbering and rendering (PDF/email).
- `src/payments/`: charging invoices through the card gateway.
- `src/lib/`: shared helpers (money, currency, logging, validation).
- `src/reports/`: finance exports. The revenue ledger is kept in USD.
- `src/integrations/`: ERP, CRM and tax-provider clients.

Amounts on invoices are decimal numbers in major units (dollars, yen). The gateway takes integer minor units.

`npm test` runs `test/*.test.js`.
