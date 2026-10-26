# ERP

A single, centralised system that runs accounting and payroll for a small group of Indonesian companies, replacing Accurate and gaji.id. Code uses the English terms below; the UI shows the Indonesian label in brackets.

## Organisation & access

**Company** [Perusahaan]:
One legal entity (a CV) with its own NPWP, books and payroll. Every piece of business data belongs to exactly one Company.
_Avoid_: Tenant, entity, branch, CV (in code)

**User**:
A person who can log in to the system. A User is not necessarily an Employee.
_Avoid_: Account, member

**Role**:
A named set of permissions granted to a User for one Company: `owner`, `admin`, `finance`, `hr`, `management`.
_Avoid_: Group, level

**Owner** [Pemilik]:
Role with full access to every Company, including salary data, and final approval authority.

**Admin**:
Role that manages Users, Roles and system settings. Does not see salary data unless also granted `hr`.
_Avoid_: Superuser

**Management** [Manajemen]:
Role that reads reports and dashboards but does not enter transactions.

## Accounting

**Chart of Accounts** [Bagan Akun]:
The list of Accounts for one Company, copied from the shared COA Template so account codes match across Companies.
_Avoid_: COA list, ledger list

**COA Template**:
The standard set of account codes that every Company's Chart of Accounts is created from.

**Account** [Akun]:
A single line in a Chart of Accounts that balances are tracked against.
_Avoid_: Ledger, GL code

**Journal Entry** [Jurnal]:
A dated set of debit and credit lines whose totals are equal. Every financial effect in the system ends up as a Journal Entry.
_Avoid_: Transaction, voucher

**Posting** [Posting]:
Making a Journal Entry final. A posted Journal Entry can never be edited or deleted.
_Avoid_: Save, commit, approve

**Reversal** [Jurnal Balik]:
A new Journal Entry that cancels a posted one line for line. The only way to correct a posted entry.
_Avoid_: Void, delete, undo

**Accounting Period** [Periode]:
A calendar month of one Company's books.

**Period Close** [Tutup Buku]:
Locking an Accounting Period so nothing more can be posted with a date inside it.
_Avoid_: Freeze, finalise

**Document Number** [Nomor Dokumen]:
A gap-free sequential identifier per Company, document type and year, e.g. `INV/CVA/2027/0001`.
_Avoid_: Reference, ID

**Opening Balance** [Saldo Awal]:
The balance of an Account, receivable or payable brought over from a Legacy System at Cutover.

## Payroll

**Employee** [Karyawan]:
A person employed by exactly one Company and paid through Payroll.
_Avoid_: Staff, worker, user

**Pay Component** [Komponen Gaji]:
One earning or deduction line that makes up pay, such as base salary, an allowance or a BPJS deduction.
_Avoid_: Salary item, allowance (as the generic term)

**Payroll Run** [Proses Gaji]:
One monthly calculation of pay for all Employees of one Company. Posting it produces its Journal Entry.
_Avoid_: Payroll batch, salary process

**Payslip** [Slip Gaji]:
One Employee's result from a Payroll Run.
_Avoid_: Pay stub, salary slip

**PPh 21**:
Income tax withheld from an Employee's pay under the TER method.
_Avoid_: Income tax, withholding (unqualified)

**Withholding Slip** [Bukti Potong 1721-A1]:
The annual statement of PPh 21 withheld from one Employee.
_Avoid_: Tax certificate

**BPJS Contribution** [Iuran BPJS]:
A mandatory social-security contribution (JHT, JP, JKK, JKM or Kesehatan), split between Employer and Employee shares.

**Bank Transfer File** [File Transfer Bank]:
A bulk-payment file generated from a Payroll Run and uploaded manually to internet banking.

**Employee Portal** [Portal Karyawan]:
The minimal self-service area where an Employee views and downloads their own Payslips and Withholding Slips.

## Migration

**Legacy System**:
Accurate (accounting) or gaji.id (payroll), the systems this ERP replaces.
_Avoid_: Old app

**Usage Audit**:
The survey of which Legacy System features are actually used. Anything absent from it is not built.

**Parallel Run** [Uji Paralel]:
Running the same month in both a Legacy System and this ERP and reconciling the results.

**Cutover**:
The date from which a module stops using its Legacy System. Payroll and accounting cut over separately.
_Avoid_: Go-live, migration date
