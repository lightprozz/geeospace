# SpaceOS chrome, interaction, and motion

SpaceOS is Geeospace's OS layer. Preserve the selected Zuey composition/behavior, GeeO branding/tokens, and Next.js/React stack. Apple HIG informs consistency, legibility, and control; it does not require SwiftUI or authorize reuse of Apple/Zuey portraits, wallpapers, or SF Symbols as product assets.

Retain Weather, VI/EN, the GeeO companion with pause/hide, and advanced Appearance. This document defines the design contract. Implementation and acceptance evidence belong in execution records; a visible widget does not prove every requirement is met.

Register: Product. Scene: desktop multitasking and mobile Home/sheets for teachers/staff. Direction: familiar, compact OS interaction with depth for app/context tracking. Color: GeeO primary and semantic colors; shell customization does not change business meaning. Type: GeeO Inter. Signature: menubar, dynamic dock, windows, and GeeO companion. Dials: variance 3, motion 5 with reduced-motion support, density 5.

## Applying Apple guidance

Motion must be purposeful, brief, input-driven, and interruptible, without delaying work. This is guidance rather than prescribed durations. See [Apple HIG Motion](https://developer.apple.com/design/human-interface-guidelines/motion).

Glass separates controls from content rather than covering every card. See [Materials](https://developer.apple.com/design/human-interface-guidelines/materials). The macOS 27 WWDC26 material guidance emphasizes readable diffusion, separating rims/specular highlights, and accessibility adaptation. See [WWDC26](https://developer.apple.com/videos/play/wwdc2026/102/).

Flexible windows and keyboard/pointing input support work on Mac. Apply [Designing for macOS](https://developer.apple.com/design/human-interface-guidelines/designing-for-macos) to the web without taking browser Cmd+W/Q or pretending to be the operating system's menu bar.

The selected Zuey dock behavior remains: clicking the focused app minimizes it. Apple references do not silently replace that choice.

## Header and dock

| Surface | Design contract |
|---|---|
| Menubar | Fine-pointer desktop baseline 36px; coarse/mobile space supports 44px hit areas. GeeO logo, active app when applicable, right utilities, labeled account chip, and clock; do not force every device into reference 28px controls |
| Utilities | Weather, VI/EN, palette/shortcut, theme, companion toggle, account, clock. Use priority/keyboard-accessible overflow instead of overlaps |
| Account | Visible label and truthful auth state; unconfigured clients open connection status rather than fabricated sign-in |
| Dock | Apps first, utilities second; Home remains in apps. Do not duplicate learning/LMS merely to match a reference icon count |
| Geometry | At desktop 1440+, reference icons 48px, dock about 66px high, 10px bottom offset, 6px gap. Smaller/coarse layouts must fit while retaining touch targets. Measure CSS px and DPR, not screenshot pixels |
| Fish-eye | Neighbors move to make room, not just scale inside fixed slots. Smooth curve, reference peak 1.55/reach 150px, reduced amplitude when needed. Hover is for mouse/trackpad, not simulated touch hover |
| State | Distinguish closed/running/active/minimized through dots, focus, and labels. Tooltips provide names/shortcuts on hover and keyboard focus. Overview exposes pressed state |
| Arrange | Preserve open apps, content, drafts, state, and URL; change only geometry/bounds rather than resetting default apps |
| Close all | Separate from show-desktop/minimize; honor each module's unsaved-work contract |

## State and orchestration

Separate target state from presentation state. Business/UI state cannot depend on animation playback/completion. Each transform has one owner; lifecycle, FLIP, overview, and gestures must not overwrite one another.

| Situation | Result and transition |
|---|---|
| Dock → closed app | Open from the nearest control/dock origin, focus, update hash; preserve mounted content when merely hidden |
| Dock → background app | Bring forward without replaying entrance |
| Dock → focused app | Minimize toward its icon; focus the next valid app |
| Dock → minimized app | Reverse minimize rather than use generic entrance |
| Restore during minimize | Retarget from current position/size/opacity without resetting |
| Close | Fast exit around window center, disable input, restore valid focus; distinct from dock minimize |
| Maximize/snap/overview | FLIP from current visual rectangle; avoid continuous app-wide layout animation |
| Gesture during transition | Hand off from current frame to pointer without snapping to the old target |
| Resize/breakpoint during transition | Rebase bounds and discard desktop-only presentation on mobile; overview must not cover Home/sheets |
| Background/reduced motion | Resolve to correct target state; no invisible input-active windows or stuck overlays |

Opening origins include control type, rectangle, timestamp, and validity; reference lifetime 700ms. Do not retain coordinates from a closed launcher indefinitely. Restore focus to a real surviving trigger rather than always the logo.

## Motion tokens and choreography

These are proposed SpaceOS baselines derived from the selected interaction and web needs, not Apple-published timings. Tune against video and profiling before acceptance.

| Motion | Baseline | Easing/path |
|---|---|---|
| Press/focus | 90–120ms | Immediate feedback, slight scale/brightness, no layout shift |
| Pointer-driven dock | Per frame; return 200–340ms | Continuous neighbor spacing and damped spring |
| Tooltip | Hover delay 150–250ms, enter 150ms | Opacity/4px shift; keyboard access does not wait for discovery |
| Menu/popover/palette | Enter 150–200ms, exit 120–160ms | Trigger-origin ease-out/in, not a whole-screen fade |
| Open window | 340–440ms | Grow from nearest origin with a controlled short spring; avoid prolonged content distortion |
| Minimize | About 440ms | Multi-stage narrowing then acceleration toward dock, distinct easing |
| Restore | 400–440ms | Reverse minimize path with quick settling, not generic rectangle interpolation |
| Close | About 150ms | Center around 50%/40%, slight scale/opacity/downshift, ease-in |
| Maximize/snap/overview | 300–340ms | Transform-only FLIP with coordinated focus layer/labels |
| Mobile sheet | Enter 360–440ms, exit 240–300ms | Vertical movement, slight Home recession, cancelled drag returns in 160–220ms from finger position |
| Theme/material | 200–340ms | Crossfade where supported without resetting content/focus/preferences |

Interrupt/retarget continuously in position/opacity, preserving spring velocity if supported. Do not queue animations after rapid clicks, delay state until a timer, or replay entrance on focus. Production token parsing must handle CSS `ms` and `s`.

## Materials, depth, and legibility

Menubar, dock, titlebars, and popovers are functional material layers. Tables, forms, learning content, and payroll use readable surfaces. Keep shadows/rims/specular highlights restrained and focused/inactive states distinct. Avoid full-screen blur as decoration.

Enable enhanced materials only when capability and performance permit. Frost is a fallback; opaque supports reduced transparency/contrast or user choice. Web CSS does not inherit native Liquid Glass preferences. Test reduced motion, reduced transparency, contrast, and forced colors separately.

More transparency is not automatically more faithful. Diffuse moving backgrounds enough for controls/text across themes and complex wallpapers. Do not animate large backdrop-filter regions during dragging.

## Selected utilities

| Utility | Required behavior |
|---|---|
| Weather | Off by default; explicit city selection or approximate location request. Loading/offline/denied/not-found/error/stale/refresh/off and attribution; no fabricated temperature or startup location prompt |
| VI/EN | Translate shell/menu/tooltips/ARIA/widgets/settings/placeholders while preserving IDs, hashes, geometry, themes, preferences, and business-state meaning |
| GeeO companion | GeeO-owned/new artwork; show/hide, pause/resume, bounded dragging, rest/interaction states, and guidance opening real apps. No personal reference portraits or fabricated notices/AI answers |
| Advanced Appearance | Light/dark/system, GeeO-compatible accents, image/video dimming, branded presets, custom image/video, drag/drop, scoped reset, material tiers, and motion preferences |

The companion currently provides generic guidance; private notices require their source/policy integration. Pausing it does not disable required OS navigation motion. Stop media/effect loops when hidden, motion-reduced, paused, or no longer displayed.

Device images/video are not uploaded automatically. Use appropriate blob storage for large media and revoke object URLs. Handle full/unavailable storage with clear feedback and in-session use. Migrate old preferences without losing theme/layout/media. Never store tokens, student records, work records, or payroll in preferences.

Weather uses an isolated real-source adapter with bounded timeout/cache. Open-Meteo is an evaluation option; commercial deployment requires an appropriate provider plan. See [pricing](https://open-meteo.com/en/pricing). Credential provisioning belongs on the server through the deployment route, never chat. Provider/production activation requires an owner and does not block shell geometry work.

## Smoothness validation

These are proposed acceptance targets, not current measurements or Apple guarantees.

- Feedback within 100ms for each input; chrome does not wait for business APIs to acknowledge input.
- Exercise open → minimize → restore → close at 10%/50%/90% progress and rapid clicks. No jumps, ghosts, stale callbacks, hash/focus mismatch. Cover pointercancel, lost capture, and breakpoint changes.
- Sweep dock both ways and enter/leave quickly: no overlap, unstable tooltip, overflow, or accidental clicks from moving targets.
- Measure frame pacing against actual refresh: T≈16.7ms at 60Hz and T≈8.3ms at 120Hz. Proposed steady-state p95≤1.25T, under 1% frames above 2T, and no animation-caused task over 50ms. Record hardware/browser/DPR/refresh/profiler overhead; one headless run is insufficient.
- Cover Chrome/Safari, mouse/trackpad, coarse input, keyboard, 320/375/768/1440 and large screens, 200% reflow, both themes, high-contrast wallpaper, and reduced preferences. Mark unavailable combinations unverified.
- Compare reference/remake video at identical viewport/theme/state/timeline for origin, path, duration, easing, and settling. Final screenshots establish layout only.
- Check after 50 open/close cycles and hidden utilities: listeners, RAF, object URLs, animations, and media must not accumulate.

[App layout](./spaceos-embedded-app-layout.md) owns embedded toolbar/content/theme rules; [app acceptance](./spaceos-app-development.md#internal-saas-quality-acceptance) connects these checks to release evidence.
