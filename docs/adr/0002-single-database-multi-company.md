# One database for all Companies, separated by company_id

All three CVs live in one application and one PostgreSQL database. Every business record carries a `company_id`, and access is checked per Company. Each Company keeps its own books, NPWP, Document Number sequences and Payroll Runs. Every Chart of Accounts is copied from one shared COA Template so account codes match, which makes combined reporting a simple sum. There is no automatic intercompany elimination; intercompany transactions are ordinary Journal Entries in each Company. An Employee belongs to exactly one Company.

## Considered Options

- **Database (or schema) per Company**: stronger isolation, rejected because combined reporting and a single AI agent view would need cross-database queries, and three small CVs don't justify the operational cost.
