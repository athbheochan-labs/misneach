# Mobile Deep Links and Universal/App Links

This runbook configures in-app routing from email/browser links for Android and iOS.

## Scope

- Android custom scheme + App Links wiring
- iOS Universal Links wiring checklist
- Capacitor in-app URL handling

## Implemented in code

- Android intent filters in:
  - `apps/cleachtadh-mobile/android/app/src/main/AndroidManifest.xml`
- In-app URL handler in:
  - `apps/cleachtadh-web/src/routes/+layout.svelte`
  - `apps/cleachtadh-web/src/lib/mobile/deep-links.ts`

## Android App Links

1. Publish `assetlinks.json` at:
   - `https://misneach.site/.well-known/assetlinks.json`
   - `https://www.misneach.site/.well-known/assetlinks.json`

2. Include your release signing cert SHA-256 fingerprint and package:

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "ie.misneach.cleachtadh",
      "sha256_cert_fingerprints": ["<RELEASE_CERT_SHA256>"]
    }
  }
]
```

3. Verify:

```bash
adb shell am start -a android.intent.action.VIEW -d "https://www.misneach.site/auth/verify-request?token=test&email=test@example.com"
```

## iOS Universal Links

1. Publish `apple-app-site-association` at:
   - `https://misneach.site/.well-known/apple-app-site-association`
   - `https://www.misneach.site/.well-known/apple-app-site-association`

2. Template:

```json
{
  "applinks": {
    "details": [
      {
        "appIDs": ["<APPLE_TEAM_ID>.ie.misneach.cleachtadh"],
        "components": [{ "/": "/auth/*" }, { "/": "/dashboard/*" }]
      }
    ]
  }
}
```

3. In Xcode for the iOS target, enable Associated Domains:
   - `applinks:misneach.site`
   - `applinks:www.misneach.site`

## Custom scheme fallback

Custom scheme is `ie.misneach.cleachtadh://...` and is handled by the same app URL listener.

Android test:

```bash
adb shell am start -a android.intent.action.VIEW -d "ie.misneach.cleachtadh://auth/verify-request?token=test&email=test@example.com"
```
