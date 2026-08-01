# Releasing Procedia

## Prerequisites

- Node.js installed locally
- After Effects 2025+ for manual verification
- Git access to the repository

## Step-by-step

### 1. Verify all tests pass

```bash
npm test
```

All 67 tests must pass before proceeding.

### 2. Update the version number

Three files reference the version:

| File | Key | Line pattern |
|------|-----|-------------|
| `package.json` | `"version"` | `"version": "0.0.4"` |
| `CSXS/manifest.xml` | `ExtensionBundleVersion` | `Version="0.0.4"` |
| `CSXS/manifest.xml` | `Extension.Id` → `Version` | `<Extension Id="com.uppercut.procedia" Version="0.0.4"/>` |

All three must match.

### 3. Update CHANGELOG.md

Move the `[Unreleased]` section entries into a new `[version]` heading with today's date.

### 4. Build the extension

```bash
npm run build
```

This runs `scripts/build.js`, which:
- Copies the repo tree (excluding `.git`, `node_modules`, `tests`, `_docs`, `build/`) into `build/`
- Injects the Sentry DSN and Reporting API URL from `SENTRY_DSN` / `REPORTING_API_URL` env vars or `.debug/build.config.json`
- Leaves unresolved placeholders as-is (the panel degrades gracefully: no Sentry, console-only reporting)

The `build/` directory is gitignored and is the distributable extension folder.

### 5. Manual smoke test

Install the `build/` folder as a CEP extension and verify:
- Panel opens in AE without console errors
- Drop a Comp node → comp appears in AE project panel
- Drop a Text node → wired into the comp → layer appears in the comp
- Drag a wire to delete it → ghost cascade triggers correctly
- Undo/redo works (Ctrl+Z / Ctrl+Y)
- Save a preset and drop it back
- The walkthrough auto-starts on first load (cleared `localStorage`)

### 6. Commit and tag

```bash
git add -A
git commit -m "Release v0.0.4"
git tag v0.0.4
git push origin main --tags
```

### 7. Distribute

The `build/` folder is ready for distribution. Copy it to:

```
%APPDATA%\Adobe\CEP\extensions\com.uppercut.procedia\
```

For fresh installs, the user must also copy the `.debug` folder alongside the extension folder if using a debug manifest.

## Notes

- **Production builds** require valid `SENTRY_DSN` and `REPORTING_API_URL` values. If these are not set, the panel operates without error reporting.
- **Debug builds** can use `build.config.json` in a `.debug/` folder at the repo root (this folder is gitignored).
- After updating the CSXS manifest, AE may require a restart to pick up changes to `RequiredRuntime` or `HostList` ranges.
