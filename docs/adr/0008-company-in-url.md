# The active Company is part of the URL

Every Company-scoped page lives under the Company's code in lowercase, e.g. `/cva/jurnal` or `/cvb/penggajian`. Each page resolves the Company from the URL and checks the user's access to it. A dropdown in the top bar switches Company by navigating to the same page under another code. Pages that are not about one Company (settings, the user's own account) have no code in their URL.

We chose this over a "current Company" stored in a cookie. Staff will have several tabs open across CVs. With a cookie, a form opened in one tab can silently post to whichever CV was picked last in another, and in an accounting system that is an expensive mistake. With the URL, links are unambiguous and can be shared.

## Consequences

- Company codes must not collide with top-level routes (`masuk`, `setup`, `pengaturan`, …). The access module rejects reserved codes.
- Every Company-scoped page and Server Action must take the Company from the URL and call the access check. It must never take the Company from client state.
