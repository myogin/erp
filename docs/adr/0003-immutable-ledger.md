# Posted Journal Entries are immutable

Once a Journal Entry is posted it can never be edited or deleted; corrections are made only through a Reversal. A closed Accounting Period rejects any new Posting dated inside it. Debits must equal credits, enforced in the database, not only in the UI. Document Numbers are gap-free per Company, document type and year. These rules are deliberately stricter than typical CRUD so the books stay auditable. Adding them later would mean auditing and repairing existing data, so they apply from day one.
