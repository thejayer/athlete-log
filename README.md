# Athlete Log

A static MVP prototype for a sport-performance training app: Hevy-style logging, but organized around golf, tennis, pickleball, endurance, CrossFit, swimming, cycling, and lifting.

Open `index.html` in a browser to try it.

## Development workflow

- Open a pull request into `main` for changes.
- GitHub Actions runs syntax checks, lint, format check, unit tests, and the static app integrity verifier on every pull request.
- CodeRabbit reviews pull requests in GitHub before merge.
- Merging to `main` runs the same checks and deploys the static app to GitHub Pages.

Local checks:

```bash
npm run check:js       # node --check across each top-level JS file
npm run lint           # eslint
npm run format:check   # prettier --check
npm test               # vitest run (unit tests)
npm run test:verify    # static app integrity check (file presence, manifest, etc.)
```

## Running tests

Unit tests live in `tests/` next to a small `tests/helpers/loadAppContext.mjs`
that loads the script-tag JS files into a Node `vm` sandbox so they can be
exercised without a browser. Tests use Vitest:

```bash
npm test           # one-shot
npm run test:watch # interactive watcher
```

Two test files today:

- `tests/utils.test.mjs` — covers every export in `utils.js` (date helpers, safe storage, CSV row parsing) with happy-path and edge-case coverage.
- `tests/analytics.test.mjs` — covers readiness scoring, week-bucket load (input to acute-to-chronic ratio), personal-record detection, and recommendation selection in `analytics.js`.

Until the store extraction lands (COM-150), tests for `app.js`, `render.js`, and `events.js` are deliberately deferred — those files are tightly coupled to the DOM and to module-level globals.

## Current prototype

- Template-driven sport logging for golf range sessions, golf short-game practice, golf rounds, tennis ball machine sessions, tennis matches, pickleball drills, pickleball matches, running, and lifting.
- Dynamic fields adapt to each session type.
- Saved sessions persist in browser `localStorage` and mirror to IndexedDB when the browser allows it.
- The reset button restores the demo training log.
- Dashboard readiness, load, sport mix, recommendations, and coach notes are calculated from saved sessions.
- Recovery body map sliders persist locally and influence the recommendation engine.
- Visual system updated with a more premium sport-performance aesthetic, responsive panels, and refined light/dark themes.
- Theme shifted to a Texas Tech-inspired red, black, white, and graphite palette with cleaner Google-inspired Material-style surfaces and controls.
- Session history now supports dates, sport filters, search, sorting, editing, duplication, deletion, and structured field values for future charts.
- Weekly Planner view supports planned sessions by day, template-based scheduling, local persistence, balance warnings, reset, and completing planned sessions into the training log.
- Goals view supports active outcome selection, persisted primary goal state, goal progress, recommended templates, sidebar goal updates, and goal-aware dashboard coaching.
- Progress now includes calculated analytics cards for weekly load, sport mix, goal focus, recovery risk, and trend readouts.
- Mobile polish includes a bottom navigation bar, floating log button, sticky save button while logging, compact mobile cards, and snackbar feedback for key actions.
- Sports view adds sport-specific dashboards for golf, tennis, pickleball, endurance, and strength, plus quick-start templates and recent sport sessions.
- Session detail panels turn logged workouts into richer breakdowns with metrics, related sessions, and a coach readout.
- Calendar view combines planned and completed sessions in a month layout, with completed sessions opening detail and planned sessions completing into the log.
- Progress now includes personal records for golf, tennis, pickleball, endurance, and lifting, with quick links back to the session that set each mark.
- Program Builder can generate four-week blocks and load week one into the planner.
- Drill Library adds reusable golf, tennis, pickleball, strength, and endurance drills that can start the matching log template.
- Progress includes richer trend charts for weekly load, sport momentum, recovery heat, and sport-filtered views.
- Compare view supports side-by-side session comparison across duration, effort, outcome, and structured fields.
- Data tools export JSON/CSV and import Athlete Log JSON back into local storage.
- Progress data tools now include an Apple Health, Strava, and Garmin-style CSV mapping preview for future connected imports.
- Log Workout includes session and rest timers for lifts, ball machine blocks, range work, and intervals.
- Advanced analytics adds consistency, planner completion, acute-to-chronic load, soreness pressure, PR coverage, and primary sport signal.
- Empty states and accessibility polish improve keyboard navigation, focus state, and screen-reader feedback.
- UI polish adds a sticky status header, refined hover/focus states, improved dark-mode surfaces, motion with reduced-motion support, cleaner mobile navigation, and more premium card treatments.
- Profile setup personalizes primary sport, goal, availability, preferred days, watch areas, and recommendation context.
- Dashboard daily readiness check-ins track sleep, soreness, energy, stress, motivation, and notes, then adjust readiness and recommendations.
- Dashboard now includes a Today command center for readiness, planned sessions, recommended work, and the last logged workout.
- Library custom builder saves personal golf drills, tennis ball machine patterns, pickleball blocks, endurance work, or lifting templates that can be launched into the log.
- Logged sessions now receive a session score, and saved sessions can be turned into reusable custom templates.
- Lifting logs now support Hevy-style exercise set rows with exercise, set number, reps, weight, and RPE.
- Sport-specific detail includes richer golf scoring, range miss patterns, tennis serve/error/target stats, and pickleball drop/dink/reset metrics.
- Program progression can load a smart week adjusted by profile, readiness, soreness, and available training days.
- PWA metadata, app icon, and a service worker make the app installable/offline when served from localhost or HTTPS.
- Shared utility code now lives in `utils.js` for local date keys, safe storage reads, and CSV row parsing.
- Workout and rest timer behavior now lives in `timers.js`.
- Static catalog/default data now lives in `data.js`.
- Readiness, scoring, records, progress, and recommendation logic now live in `analytics.js`.
- Screen rendering now lives in `render.js`, and event wiring now lives in `events.js`.
- Custom templates can now be edited, duplicated, show their created date, and be scheduled from the Planner.
- Golf now has richer range, short-game, and round fields, plus a golf dashboard block, scoring recommendations, and session-level golf analysis.
- Golf GPS Round Mode adds a simulated 18-hole course, yardages, hazards, club recommendations, hole scoring, a scorecard, and save-to-log round recap.
- Golf GPS now persists in-progress rounds, supports editable club carry/total distances, shot tracking, per-hole strategy notes, tuning for wind/elevation/temperature/lie/shot type, saved GPS scorecards, strokes-gained-lite buckets, and generated practice plans.
