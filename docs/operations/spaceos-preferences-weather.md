# SpaceOS preferences and Weather

The shell provides GeeO branding, VI/EN, and device preferences, without a Gee-O Auth session or HR data. Clicking the focused dock app minimizes it; clicking a minimized app restores it. Arrange preserves open/minimized apps and focus; Close all is separate. Repeated Alt+arrow movement returns a window to normal mode.

## Device preferences

Appearance supports light/dark/system, shell accents, six presets, image/video dimming from 0–80%, auto/frost/glass/opaque materials, and reduced motion. Automatic selects conservative frost; enhanced glass is explicit. Disabling glass, reduced transparency/contrast, or unsupported browsers selects opaque surfaces. App content remains readable.

PNG/JPEG/WebP images up to 3 MB are decoded before use and stored with device preferences. MP4/WebM video up to 15 MB uses IndexedDB `geeospace-ui-media`, separate from business storage. Video is not uploaded; object URLs are revoked on replacement/removal. Pause video when hidden, motion-reduced, or animation-disabled. Autoplay blocking may retain a static frame; failed/missing media returns to GeeO background with feedback. Files can be dropped on desktop or Appearance. Reset changes appearance/removes device video while preserving layout/apps.

`geeospace.desktop.appearance.v1` migrates additively, preserving existing theme/image/glass settings. Layout uses a separate key. Saves debounce for 250ms and flush on pagehide; rejected/full storage shows feedback and retains changes in-session. Never store tokens, student records, work data, or payroll in preferences.

The companion is a newly created GeeO SVG robot with pause/resume, hide/show, bounded dragging away from chrome, arrow-key operation, and Today/Requests/Assistant shortcuts. Waving is brief and respects pause/reduced motion. Mobile uses a compact character with touch/focus controls and optional hiding. It does not generate private notifications or AI answers.

## Weather consent and configuration

Weather is off by default: no provider requests or geolocation prompt on startup. Users select a city or explicitly request approximate location. Coordinates round to 0.1 degrees; only the chosen location persists on-device. Turning off clears consent/location, stops refresh, and removes observations from UI. Location is not attached to a Gee-O account.

The `/api/weather` BFF accepts search/forecast only, not destination URLs. Open-Meteo hosts are fixed; redirects are rejected. Current limits are a 6-second timeout, 30-minute cache up to 100 queries, at most 20 in-flight queries per isolate, and coalescing duplicates. These are not deployment-wide quotas/rate limits; monitor usage before broad exposure. Return filtered locations/observations/error codes, not credentials or exception URLs. Observation time differs from fetch time; retain and label older observations during offline/error/stale states. Visible pages refresh every 30 minutes, with manual refresh and online recovery.

Next.js development and Workers with `APP_ENV=development` use evaluation endpoints. Other environments require the server secret `WEATHER_API_KEY` for commercial Open-Meteo. Missing configuration returns 503 `configuration`, without falling back to free endpoints. Provision secrets through the target environment, never Git/chat. Owners must confirm [Open-Meteo terms and plans](https://open-meteo.com/en/pricing) before production activation. This UI work does not authorize purchases/deployment. Show provider attribution; the adapter caches neither tokens nor GeeO data.

## Validation

Regression references: [appearance](../../tests/unit/appearance.test.ts), [Weather](../../tests/unit/weather.test.ts), [windows](../../tests/unit/desktop-window.test.ts), and [shell browser checks](../../tests/e2e/spaceos-chrome.spec.ts). Record evidence against the tested revision. Headless browsers do not establish Safari, real trackpad/touch, or 120Hz behavior.
