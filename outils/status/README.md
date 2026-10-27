# SpeedRunners 2 status aggregate

The public `assets/js/sr2-status.js` consumes `/service-catalog/v1/sr2-status`.
The existing private catalogue collector imports `SR2Presence` from
`sr2_presence.py`, passes its existing `UCHPresence` monitor to the constructor,
and serves `snapshot()` at `/sr2-status`. No account or game service is modified.

Health follows the monitored shared brainCloud sign-in dispatcher. Matchmaking
and races use Photon; this is not a Photon region or tournament availability test.

The operator explicitly authorized reading the existing internal presence source
with its existing host-local credential. Only the anonymous total for the exact
SR2 title, status OnlinePlay and freshness at most 90 seconds is published. This
counts reported game presence, not occupied Photon-room slots. Names, account
identifiers, raw source responses and credentials must not be logged, retained
or exposed. The credential stays in its existing private host file and never in
this repository or browser assets.

Missing or invalid presence yields an unavailable count, not a fictional zero.
The credential-protected source is an existing internal debug endpoint: if it is
removed or its contract changes, migrate to an aggregate internal endpoint and
keep the public counter unavailable until that migration is verified.
