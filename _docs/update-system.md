# Procedia Update System

## Runtime Design

Procedia checks a stable metadata file at:

`https://raw.githubusercontent.com/MontassarAbdelhedi/Procedia/main/latest.json`

The metadata points only to a tagged GitHub Release ZIP. Drafts, prereleases, branches, and Git working trees are not update sources. `package.json` is the development version authority; `npm run version:sync` synchronizes the CEP manifest, installer, and reporting fallbacks.

Updater state is stored outside the extension at:

`%APPDATA%\Uppercut Studio\Procedia\updater-state.json`

The same application-data root contains updater staging, caches, and diagnostics. CEP `localStorage` retains preferences and presets. Graph and version-control data remain embedded in the user's `.aep` Reserved Comp.

The update flow is:

1. Validate stable semantic-version metadata and AE/updater compatibility.
2. Download through trusted HTTPS GitHub hosts into a unique application-data directory.
3. Stream SHA-256 verification against `latest.json`.
4. Run the copied external PowerShell helper to inspect every ZIP entry, reject traversal/absolute paths/symlinks, and extract to staging.
5. Validate the extension ID, archive version, entry point, manifest, dispatcher, script manifest, and updater helper.
6. Write an install plan and show `Restart After Effects to finish the update.`
7. The external helper waits for every `AfterFX` process to exit, renames the current install to one backup, moves staging into place, preserves Inno Setup uninstaller files, and validates the installed package.
8. On failure, the helper removes the partial target and restores the backup.
9. On the first successful startup of the new version, Procedia confirms activation and removes the one retained backup.

The panel never reports installation success before a later startup reads the new manifest version.

## Release Metadata

`npm run release` generates `latest.json` in the repository root and in `dist/`:

```json
{
  "version": "1.2.0",
  "downloadUrl": "https://github.com/MontassarAbdelhedi/Procedia/releases/download/v1.2.0/procedia-v1.2.0.zip",
  "sha256": "ARCHIVE_SHA256_HASH",
  "publishedAt": "2026-08-20T12:00:00.000Z",
  "minimumAfterEffectsVersion": "17.0",
  "minimumUpdaterVersion": "1.0.0",
  "releaseNotesUrl": "https://github.com/MontassarAbdelhedi/Procedia/releases/tag/v1.2.0"
}
```

Do not edit the generated checksum manually. Do not publish `latest.json` until its matching tagged release asset is ready.

## Publishing A Release

Prerequisites: Node.js 18+, PowerShell 5.1+, GitHub CLI, Git, Inno Setup 6 when publishing the optional fresh-install EXE, and After Effects 2020 plus the newest supported AE version for smoke testing.

1. Update the authoritative package version:

```powershell
npm version 1.2.0 --no-git-tag-version
```

2. Move changelog entries from `Unreleased` to `1.2.0` with the release date.

3. Build the extension ZIP, checksum, and metadata:

```powershell
npm run release
```

This runs all tests, synchronizes version sources, builds `build/`, creates `dist\procedia-v1.2.0.zip`, writes `dist\procedia-v1.2.0.zip.sha256`, and generates `latest.json`.

4. Optionally build the fresh-install EXE after `npm run build`:

```powershell
& "C:\Program Files (x86)\Inno Setup 6\ISCC.exe" "scripts\installer.iss"
```

5. Install `build/` in a clean test profile and perform the smoke tests below.

6. Commit the version, changelog, and generated root `latest.json`, then tag. Push only the tag first so existing clients cannot see the new feed before the asset exists:

```powershell
git add package.json package-lock.json CSXS/manifest.xml scripts/installer.iss reporting/envSnapshot.js reporting/reporter/core.js CHANGELOG.md latest.json
git commit -m "Release v1.2.0"
git tag v1.2.0
git push origin v1.2.0
```

7. Create a draft GitHub Release and upload the exact generated artifacts, then publish it:

```powershell
gh release create v1.2.0 "dist\procedia-v1.2.0.zip" "dist\procedia-v1.2.0.zip.sha256" "dist\latest.json" --title "Procedia v1.2.0" --generate-notes --verify-tag --draft
gh release edit v1.2.0 --draft=false
```

If an installer was built, upload it separately:

```powershell
gh release upload v1.2.0 "dist\Procedia_Setup_v1.2.0.exe"
```

8. Push `main` only after the tagged release and asset are publicly downloadable. This atomically exposes the new `latest.json` feed to installed clients:

```powershell
git push origin main
```

9. Verify the published archive checksum:

```powershell
(Get-FileHash -Algorithm SHA256 "dist\procedia-v1.2.0.zip").Hash.ToLower()
Get-Content "dist\procedia-v1.2.0.zip.sha256"
```

10. Verify an older installed Procedia detects the release, stages it, requests an AE restart, activates the tagged version, preserves presets/settings/projects, and removes the badge only after the new version starts.

## Manual Matrix

Verify on Windows with After Effects 2020 and the newest supported After Effects release:

- Panel loads without console errors.
- Automatic checks do not delay graph restoration and run at most once per 24 hours.
- Offline startup is unaffected.
- Manual checks bypass the throttle.
- Badge click opens Settings directly to Updates.
- Download progress is real when `Content-Length` exists and indeterminate otherwise.
- Invalid checksums and corrupt/traversal archives leave the current install untouched.
- Closing only the panel does not swap files while After Effects remains open.
- Closing After Effects completes the swap; a locked-file failure restores the previous directory.
- Settings, presets, `.aep` graphs, VCS history, and saved graph files remain unchanged.
- The new version reports success only after its next healthy initialization.

Procedia currently supports Windows only; no macOS installer or helper is shipped.

## Operational Notes

- The repository and release assets must remain public. For a private repository, replace the public feed with an authenticated release service issuing short-lived signed URLs; never embed a GitHub token.
- Redirects are limited to the configured GitHub release hosts and HTTPS.
- The current feed is checksum-protected but not cryptographically signed. A future hardening step is a detached signature over canonical `latest.json` with a public key embedded in Procedia.
- Technical errors are logged to CEP DevTools; user-facing messages do not include stack traces or credentials.
