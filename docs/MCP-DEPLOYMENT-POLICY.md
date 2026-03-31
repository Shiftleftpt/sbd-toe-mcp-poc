# MCP Deployment Policy

## Goal

Keep the current npm package stable while the V2 runtime line is still in
development.

The graph can continue to publish normally, but this MCP must not consume
moving targets automatically.

## Runtime Source Policy

### Local Development

For development branches, the MCP must use:

- `UPSTREAM_SOURCE=local`
- a local clone of the graph repo
- a pinned local lock file:
  [`data/upstream/graph-runtime-lock.json`](../data/upstream/graph-runtime-lock.json)

The local checkout flow validates:

- graph repo path
- graph branch
- graph `HEAD` commit
- `run_id`
- `substrate_version`
- `primary_artifact`

If any of those drift, `npm run checkout:backend` fails fast.

To refresh the lock after intentionally updating the graph clone, run:

```bash
npm run lock:graph-runtime
```

### Release-Based Consumption

If the MCP is configured to consume a graph release:

- it must use an exact tag
- `latest` is forbidden
- range-like values such as `>v2.*` or `v2.*` are forbidden

Allowed examples:

- `v2.0.0`
- `v2.0.0-rc.1`

Forbidden examples:

- `latest`
- `v2.*`
- `>v2.*`

This prevents accidental upgrades when the graph publishes newer releases.

## Distribution Channels

### Stable

Stable release means:

- same npm package name: `@shiftleftpt/sbd-toe-mcp`
- stable semver tag only: `vX.Y.Z`
- publish to npm `latest`
- only from the protected stable branch

This is the only channel that affects current `npx` users.

### Preview

Preview means:

- same codebase
- no npm publish
- distribution by CI artifact or local bundle only
- version labelled as preview in the bundle filename

This is the correct channel while V2 is still under evaluation.

### Local Dev

Local dev means:

- checkout from local graph clone
- pinned lock file
- run the MCP locally from source or from `dist/`

## Package Naming Policy

Do **not** create a second npm package for V2.

Reasons:

- it fragments adoption
- it creates duplicated maintenance overhead
- the stable package is already correct for current users
- preview delivery can be handled by artifacts and local bundles

So the policy is:

- keep the same package name
- version normally in git when needed
- do not publish dev builds to npm yet
- only publish once the V2 line is accepted for stable rollout

## CI/CD Policy

### Preview Workflow

Preview workflow must:

- run validation
- build the project
- build the release bundle
- upload the bundle as a CI artifact
- never call `npm publish`

### Stable Release Workflow

Stable release workflow must:

- trigger only on stable tags `vX.Y.Z`
- reject prerelease or non-pinned tag shapes
- build and validate the bundle
- publish to npm only after all validations pass

## Recommended Rollout

1. Keep V2 in preview using local graph lock + preview artifacts.
2. Run smoke and qualitative evaluation.
3. Fix MCP or graph issues until the preview line is acceptable.
4. Cut a stable MCP version only when the preview line is approved.
