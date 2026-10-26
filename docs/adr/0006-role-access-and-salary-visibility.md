# Role-based access per Company; Admin cannot see salaries

Users get Roles per Company: `owner`, `admin`, `finance`, `hr`, `management`. Salary data is visible only to `owner` and `hr`. `admin` manages Users, Roles and settings but deliberately does **not** see salaries, so technical administration doesn't imply access to pay data (UU PDP). Roles that can see salaries must use 2FA, and every sensitive action (changing pay, Posting, Reversal, Period Close) is written to an audit log.
