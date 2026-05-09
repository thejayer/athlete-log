# UX Consistency Audit

Date: 2026-05-09

## Scope

This pass reviewed the full single-page app for inconsistent sizing, typography, motion, and control treatment across dashboard, logging, programs, planner, goals, GPS, recovery, import, and mobile navigation surfaces.

## Fixed In This Pass

- Added shared CSS tokens for spacing, text scale, control heights, radii, hover lift, and motion timing.
- Standardized primary, ghost, and icon buttons around one control height and radius.
- Normalized form fields, labels, select menus, textareas, compact controls, and disabled button states.
- Aligned repeated card families including metrics, analytics, records, drills, trends, goals, programs, practice cards, today cards, and GPS panels.
- Smoothed hover and focus effects so cards, planner items, calendar items, and quick picks use the same motion rhythm.
- Tightened mobile navigation, floating log action, and small-screen hero sizing to use the same token scale.
- Bumped the service-worker cache so the refreshed stylesheet ships cleanly to installed/browser-cached versions of the app.

## Design Rules Going Forward

- Use `--control-height`, `--control-height-sm`, and `--control-radius` for interactive controls.
- Use `--text-label`, `--text-caption`, `--text-ui`, `--text-body`, `--text-section`, `--text-card-title`, `--text-stat`, and `--text-display` instead of one-off font sizes.
- Use `--space-*`, `--card-padding`, and `--panel-padding` for layout spacing unless a fixed dimension is tied to a chart, map, or icon.
- Use `--motion-fast`, `--motion-med`, `--press-lift`, and `--hover-lift` for hover/focus movement.
- Keep cards for repeated items and tools; avoid nesting card surfaces inside other card surfaces.

## Follow-Up Opportunities

- Add visual regression screenshots for core views once the app has a browser test harness.
- Split the large stylesheet into feature sections or CSS layers when the app moves to a bundler.
- Introduce reusable component markup patterns if/when this becomes a React or Next app.
