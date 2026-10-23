# JD2022 website integration

The progress estimate is 80%, not a percentage of automated tests passed. Verified: Home, Gift Machine/Avatar navigation,
WDF voting, shared players/avatars and scoring, and Switch–Citron against the deployed backend. Ryujinx pairs were tested
on the domestic server. Larger groups, separate-home sessions, phone scoring and optional modes remain open.

`jd22-counts.js` wraps the existing `nxOnlineCounts` helper without replacing other games. It accepts only a successful
JD aggregate response with its exact title ID and a nonnegative integer count. Zero players is operational; unavailable
or malformed replies remove JD's count and mark its availability false. No fake players or hardcoded online state.
The count represents WDF members with authenticated traffic in the previous two minutes, not all users browsing Home.

Deployment prerequisites:

1. JD backend exposes `/api/stats` with aggregate fields only (`game`, `titleId`, `online`, `connected`, `countScope`).
2. Install the public JD CA as `assets/certs/jd22-ca.pem` (no private key).
3. Merge `justdance22-nginx.conf.example` into the existing website server block; validate nginx before reload.
4. Preserve the actual deployed versions of the counts wrapper, progress list and status page. Production currently includes
   additional games not yet present on this repository's main branch; add the JD entries without replacing those lists.
5. Load `jd22-counts.js` after the existing counts wrapper and before pages.js/rework.js. In production, the existing status
   logic already consumes `availability`; keep it. This PR adds the equivalent JD check to the older main-branch status code.
6. Verify real zero/two-player responses and backend unavailability, plus unchanged status for existing games.

Roll back only this integration's assets/config changes and restore the previous JD binary if its new endpoint fails.
No account service, shared proxy or unrelated game needs a restart. The website nginx reload and JD restart require
operator approval after reviewing the concrete deployment changes.
