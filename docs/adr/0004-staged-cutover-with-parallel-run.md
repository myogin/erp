# Staged Cutover after Parallel Run, migrating opening balances only

Payroll and accounting cut over separately. Payroll cuts over at the start of a month, after two consecutive Parallel Runs match gaji.id exactly (net pay, PPh 21 and BPJS per Employee). Accounting cuts over at the start of a fiscal year or quarter, so no annual report is split across two systems. Each Cutover is signed off by the internal staff doing the reconciliation. Legacy subscriptions continue until then.

We migrate only master data, Opening Balances (accounts, open receivables and payables) and year-to-date PPh 21 per Employee. Older history is kept as exported archives (PDF/Excel) rather than migrated, because full migration is costly and prone to reconciliation gaps for little value.
