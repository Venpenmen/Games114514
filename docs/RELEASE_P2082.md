# P20.8.2 release audit (in progress)

Source: origin/main 3aea31b + accepted 8bff510 in isolated codex/release-p2082 worktree.
Included: committed three-game platform, accounts/lifecycle, authoritative presentation and accepted P0-P4 frontend.
Excluded: all uncommitted TDM/local-admin/SDK test adapter changes; Gen7/Qwen/ML and bot experiments; newly introduced work/experiments tree. Stable committed bot helper modules retained unchanged.
Compatibility fix: chat requires the correct match and permissions but tolerates stale phase; game actions still require exact phase. Targeted existing service test extended for wrong-match rejection, retry deduplication and rate limiting.
Production: existing dice-werewolf runtime .env says 3199 / auto / production / work/logs/dice-preview.db; 3199 initially offline. Backup contains 23 legacy sessions,39 rooms,506 receipts, integrity ok. Room452690 ACTION is the only unfinished match; user explicitly authorized abandonment after backup. No3216 DB/source copied.
Migration: built-in additive account schema v0->v1; verify on production copy first. Legacy visitor profile claim remains supported; session/room/receipt tables retained. No TDM schema included.
Rollback: stop only release runtime, restore consistent original DB backup if deployment migration needs rollback; use retained original dice-werewolf runtime/config/dist, not a mixed rebuild. Root launcher will target the isolated release, and both original launchers are backed up.
No deployment or main push until tests and DB-copy rehearsal pass. Final details appended after verification.

## Pre-deployment validation completed
- Core check/build successful; unit156/156 (test adapter suite intentionally excluded). Release entry index-CXBOl2Hj.js; fresh clean checkout changes generated scope/chunk hashes, so the previously deployed preview bundle is not copied.
- Browser evidence: accepted P4/333 evidence reused for unchanged frontend/engine; clean release adds real4/6/8/9/11 desktop/three landscape drafts, portrait drawer and guide; accounts/multi-device and classic games/shared UX plus real ninja tournament verified. Old account test omitted the now-required return confirmation; test fixed, authentication/permissions unchanged.
- Production-copy schema rehearsal retains23 legacy sessions/39 rooms before identity claim; integrity ok, stable legacy cookie namespace, claim retains player ID, TDM absent, wrong Origin403.
- Production-copy real Socket.IO smoke completes all3 games, chat, final results and own-room closure. No test DB copied into production.
- Backup: root work/logs/production-p2082-backup-20261121-225908, manifest + production.db + old dist/config/runtime source. Legacy unfinished452690 authorized for backup-then-stop by user.
- Existing public14938 endpoint currently forwards to3216 (confirmed frpc upstream socket3216), not3199. NoFRP change made; formal public3199 endpoint confirmation pending from user.

Legacy-data compatibility addendum: the original production DB predates account history tables but still contains two genuinely finished matches. A release-only migration archives these canonical plugin final results into history (real original updated timestamps and participant IDs), idempotently, before normal room expiry can remove them. It also performs the user-authorized452690 stop with a backup-body SHA256 compare-and-swap, preserves the room/seats, resets readiness, and does not fabricate a winner. Production-copy rehearsal verified2 archived records, second import0,39 retained rooms/23 sessions, integrity ok and legacy claim identity unchanged. No TDM or new runtime authority was introduced.
