# Earnings Tracker

A shift, sales, tips, and tip-out tracker for restaurant teams.

## Features

- Receipt scanning with camera capture or photo upload
- Automatic start time default of `5:00 PM`
- OCR extraction for receipt date, top-of-receipt time, sales, and credit tips
- Tip-out tracking based on your configured sales percentage
- Fixed bi-weekly pay periods anchored to March 6, 2026 through March 19, 2026
- Local device mode for quick personal tracking
- Optional Supabase login and sync so each coworker gets a private account across devices

## Local development

```bash
npm install
npm run dev
```

## iPhone wrapper in Xcode

This repo now includes an iOS wrapper project at [`ios/TipsCafeWrapper.xcodeproj`](./ios/TipsCafeWrapper.xcodeproj).

What it does:

- opens `https://tips.cafe` inside a native `WKWebView`
- keeps login cookies so coworkers can stay signed in
- gives you back, forward, reload, and share controls in the app

To open it:

1. Open `ios/TipsCafeWrapper.xcodeproj` in Xcode.
2. Pick an iPhone simulator or your connected iPhone.
3. Set your Apple Developer team under `Signing & Capabilities` if Xcode asks.
4. Press Run.

Notes:

- the current bundle id is `com.tipscafe.wrapper`
- you can change the app name and bundle id in Xcode later
- if you want, we can add a real app icon and splash screen next

## Turn on cloud accounts

1. Create a Supabase project.
2. In the Supabase SQL editor, run [`supabase/schema.sql`](./supabase/schema.sql).
3. In Supabase Authentication, keep email/password enabled.
4. Copy `.env.example` to `.env` and add your project values.
5. In Vercel, add the same env vars:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
6. Redeploy the app.

Once those env vars are present, the app switches from local device mode to password-protected cloud accounts automatically.

## Importing old browser data

If you already tracked shifts in local mode on a device, sign in after cloud mode is enabled and use the in-app `Import My Local Data` button. That will copy the local shifts and settings from that device into your online account.
