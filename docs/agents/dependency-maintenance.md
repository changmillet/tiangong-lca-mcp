---
title: MCP Dependency Maintenance
docType: guide
scope: repo
status: active
authoritative: false
owner: mcp
language: en
whenToUse:
  - when reviewing dependency proposals or changing monitoring coverage
whenToUpdate:
  - when monitoring, manual acceptance or image-validation prerequisites change
checkPaths:
  - .github/dependabot.yml
  - docs/agents/dependency-maintenance.md
lastReviewedAt: 2026-10-26
lastReviewedCommit: 653359ed371fb26c04899608add6b5b9b011c9e6
lastReviewedNote: 'MCP #84: bounded npm/Actions discovery reuses existing portable checks; image monitoring remains an explicit unqualified prerequisite.'
related:
  - ../../AGENTS.md
  - repo-validation.md
---

# Dependency maintenance

Dependabot monitors the single root pnpm graph on Mondays at 04:00 and GitHub Actions at 04:20, in Asia/Shanghai. Both entries use a seven-day version cooldown. The initial limits are two npm PRs and one Actions PR. Related MCP transport and Inspector/React updates, Supabase packages, Oxlint packages and development tools have patch/minor groups; package majors and the exact internal SDK remain separately visible. Preserve full-SHA Actions references when updating them.

Keep `@types/node` on Node 24 LTS: the npm entry ignores versions `>=25.0.0`, while all 24.x patch and minor updates remain eligible under the existing monitoring policy. Revisit this exclusion only after an explicitly approved runtime/toolchain major upgrade; a newer typings major alone is not adoption approval.

All PRs already run the four-platform `quality-gate.yml` with a frozen install and `pnpm prepush:gate`. Monitoring adds no general check or developer command. Review the actual manifest/lockfile diff and retain the Node 24 type boundary, reviewed MCP v1 transports, Inspector development peer graph, exact internal SDK, compiler/package-manager pins and workspace install restrictions. The canonical gate includes packed-runtime and clean-worktree proof; do not weaken its transport, validation, auth or production-tree assertions to accept an update.

Lock-only resolution maintenance requires the repository contract and this guide to exist, without mandatory documentation metadata edits. Human review of the resolution diff and existing tests remain required. Manifests, source, runtime pins, Dockerfile and mixed changes retain their separate semantic review rules.

## Docker monitoring prerequisite

The owned Dockerfile uses `node:24.19.0-alpine` and installs the exact published MCP package rather than the current source tree. Existing portable tests assert the Docker contract and exercise a packed consumer, but the current quality gate does not build an image. The image procedure in `DEV_EN.md` additionally requires a no-cache, no-provenance Linux ARM64 build, patched OpenSSL readback and a scan-compatible ECR manifest with COMPLETE and zero HIGH/CRITICAL findings. Source regex tests and a portable package pass cannot substitute for that proof.

Docker updater activation is deferred under [MCP #86](https://github.com/tiangong-lca/mcp/issues/86). Before adding a Docker ecosystem entry, qualify a scoped image-validation path for Docker inputs, preserve the exact package/runtime relationship and retain the existing scan and deployment gates. Image/ECR qualification, registry publication and ECS operations remain separate authorized work; this monitoring change neither runs them nor claims they pass. Do not resolve a proposed Node major by silently changing runtime pins.

## Manual acceptance and hosted evidence

Configuration takes effect from `main`. Verify dependency graph/security settings and the first actual updater job and candidate lockfile separately; local tests and a merged configuration do not prove hosted updater success. Security triage is separate from the weekly version queue and cooldown.

Automatic merging is disabled for this rollout. Review and adopt an accepted same-repository proposal through the workspace controller's existing-PR preview and bound continuation, retaining its useful body context and direct Issue ownership. Never create a replacement PR to work around intake. Before Issue association, establish that any independent merge service is disabled or has an effective live Dependabot exclusion, including queued work; native GitHub merge state alone is insufficient. Keep proposals unadopted while that policy is unknown. Exact child integration and releases retain their existing contracts.

References: [Dependabot options](https://docs.github.com/en/code-security/reference/supply-chain-security/dependabot-options-reference), [version update configuration](https://docs.github.com/en/code-security/how-tos/secure-your-supply-chain/secure-your-dependencies/configure-version-updates).
