# Roles: Owner and Admin are global, and only an Owner manages salary-visible Roles

Owner and Admin are global Roles that cover every Company, including ones created later. Finance, HR and Management are granted per Company. Salary data is visible only to Owner and HR, and both must use 2FA (an authenticator app, enforced before the user can reach anything else).

An Admin manages Companies, Users and the Finance and Management Roles, but deliberately does **not** see salaries (UU PDP). To keep it that way, only an Owner may grant or revoke Owner, Admin or HR, or reset the password of a User who holds one. Otherwise an Admin could grant themselves HR, or take over an HR account. The last Owner can never be revoked.

There is no public sign-up. The first Owner is created at `/setup`, which works only while no User exists and only for the email in `BOOTSTRAP_OWNER_EMAIL`. Every later User is created by an Owner or Admin with a Temporary Password that must be changed at first login. Sensitive actions are written to an append-only Audit Log; a database trigger rejects updates and deletes.
