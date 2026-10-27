# The COA Template is redesigned, not copied from Accurate

An export of the three Accurate databases (issue #20) showed their charts do not share codes: Merubali uses a flat 4-digit chart, while Kreasi and Karya share a hierarchical one (4-digit headers, children numbered parent code + 2 digits) that has since drifted, so the same code often means different accounts. Only one code matched across all three. Copying any one chart would leave the other two Companies with mismatched codes, defeating ADR-0002, so the COA Template is designed afresh on the Kreasi/Karya hierarchy. Detail that only one Company needs (its bank accounts, Merubali's raw materials) lives in that Company's Sub-accounts, not in the template. ERP account codes therefore differ from Accurate's, and each Company gets an Account Mapping from Accurate codes to ERP Accounts for Opening Balances and the Parallel Run. The template and mappings are approved by Finance before #5 is built.

## Considered Options

- **Copy one Company's Accurate chart as the template**: least migration work for that Company, rejected because the other two would need their codes remapped anyway and the result would inherit drifted, inconsistent naming.
- **Keep each Company's own chart**: no remapping at all, rejected because combined reporting would need a permanent cross-Company mapping instead of a simple sum.
