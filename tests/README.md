# Version 1.2 verification

The historical notes below describe earlier builds. Version 1.2 replaces whole-list writes with authenticated, versioned operations.

- Nine isolated Python tests cover authentication, private-file protection, image validation, concurrent stock sales, atomic rollback, idempotency, cancellation, stale edits, migration and backup restoration.
- `python -B tests/run_all.py` runs these and both Edge browser suites against a disposable database. Playwright must be available through NODE_PATH. Port 8765 must be free.
- Browser suites cover photo upload/reload, offline persistence, sale retries after a lost acknowledgement, draft and saved quotations, conflicting edits, recovery exports with cached photos, ZIP restore and responsive layouts.
- Physical Android 16 checks for 1.2 verified authenticated file:// requests, native JSON export and PDF printing in the separate `.phototest` app. Earlier camera/gallery tests are recorded below. Other Android versions and an in-place production upgrade still need device acceptance testing.
- Version 1.2 (code 3) release is unsigned until the existing release signing credentials are configured. The production signed APK has not been replaced.
- `android_probe.cjs` is a historical v1 helper; its storage/authentication assumptions do not reproduce the v2 checks.
- Automatic scheduled/offsite backups, browser offline cold starts, HTTPS and individual user accounts are not implemented.

## Historical version 1.1 results

# Photo-storage verification — 2026-09-17

## Verified

- Python API: valid photo upload and retrieval, matching file extension, CORS on photos, malformed request rejection, SQLite persistence and connection cleanup.
- Headless Edge: three gallery previews/upload, camera input with capture=environment, server persistence after reload, cached images/local saves with API and photo requests blocked, reconnect uploads before record sync, Android callback cancellation preserves selection. No page errors.
- Physical Android 16 device, separate `.phototest` debug application: native camera result and native gallery result reached the WebView, previewed, uploaded to the configured `http://192.168.0.5:8000` server, and persisted after reload using the isolated data server.
- Android file:// reload with API/photo requests blocked: cached images and an offline record survived; reconnect synchronized successfully.
- `assembleRelease` and release vital lint passed. Version 1.1 (code 2). Release APK is unsigned pending credentials for the existing `android/key`; the previous signed APK is unchanged.

## Reproduce

Run `python -B tests/test_photos.py` for API tests. For browser tests, run `python -B tests/test_photos.py --serve` in another terminal (temporary database/photos, localhost port 8765), then `node tests/photos.browser.cjs` with Playwright available in NODE_PATH and Edge installed. This script resets only the isolated server data.

Build a separate device test app with `android/gradlew.bat -p android -PphotoTest=true assembleDebug`. Install its APK, launch `br.com.calculadordepisos.phototest/br.com.calculadordepisos.MainActivity`, reverse device port 8765 to host 8765, and forward host port 9223 to that process's `webview_devtools_remote_<pid>` socket. `tests/android_probe.cjs` contains the device checks; native camera/gallery interactions are performed on the phone. Debugging is enabled only in debuggable builds. Release builds keep the production application ID.

## Limits

Physical tests covered one Android 16 device; older Android versions were compiled but not exercised. Browser offline checks keep the web assets reachable while the API/photos are unavailable. A full browser cold start while its web host is offline needs an offline app shell; the Android APK already bundles that shell. Pending records use the existing whole-list server API, which does not resolve simultaneous edits from multiple devices. Cached photos remain until app/site data is cleared.

Production records were not changed by test saves. Two test uploads were verified on the configured server and their temporary files removed; all record writes used disposable data. The separate test app, forwarded ports and device fixtures were removed after verification. The original installed Android app/data were left intact.

## System bar color follow-up
Verified on the Android 16 device: light background/status/navigation areas match #F5F5F5; dark areas match #1E1E1E. Theme switching updates status/navigation icon appearance. Native inset and window backgrounds now follow the theme, with contrast scrims disabled. Debug/release builds and release vital lint passed. Screenshots: theme-light.png and theme-dark.png. The temporary test app was removed.

## UI polish follow-up
Unified 48px controls, inline SVG icons, accessible theme labels/focus rings, responsive action groups, explicit dialog close buttons, gallery picker button, and improved dark-mode muted text. Browser checks passed on all four screens at 320/360/768/1200px without horizontal overflow; mobile header controls measured 48px each. Photo regression and gallery-picker checks passed. Release build/vital lint passed and APK assets match the web sources.
