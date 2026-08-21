# Releasing Procedia

`package.json` is the authoritative version source. Use `npm run release` to run tests, synchronize all shipped version fields, build the production extension, create the raw update ZIP, calculate SHA-256, and generate `latest.json`.

The complete release procedure, exact GitHub commands, update metadata schema, storage locations, rollback behavior, and manual AE 2020/newest-version verification matrix are documented in [`_docs/update-system.md`](_docs/update-system.md).

Quick command:

```powershell
npm version 1.2.0 --no-git-tag-version
npm run release
```

Never publish a branch archive or the installer-only ZIP as the in-app update payload. The updater accepts the generated `procedia-v<version>.zip` from a tagged GitHub Release.
