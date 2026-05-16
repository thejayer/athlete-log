// Single source of truth for mutable app state.
//
// What lives here: the 10 state slices listed in COM-150 — sessions,
// plannedSessions, recovery, customDrills, readinessCheckins, athleteProfile,
// activeGoalId, activeProgramId, golfClubBag, gpsRound.
//
// What does NOT live here: UI-transient state (editingSessionId, calendarCursor,
// installPromptEvent), static catalogs in data.js (sessionTemplates, goals,
// programBlueprints, golfGpsCourse, etc.), and shape normalizers (still in app.js
// where they're shared with events.js for the import flow).
//
// API (see COM-150 acceptance criteria):
//   store.init({ values, persist }, mirrorFn?)  - one-time seed from app.js
//   store.getState()                            - frozen snapshot (shallow clone)
//   store.subscribe(listener)                   - unsubscribe via returned fn
//   store.update(slice, updater)                - generic; updater can be fn or value
//   store.updateSessions(fn) / updateRecovery(fn) / ...  - per-slice setters
//   store.setActiveGoalId(id) / setActiveProgramId(id)   - scalar slices
//
// Loaded as a classic script tag (not an ES module) so the existing script-tag
// app keeps working. Listed in index.html before app.js so `store` is in scope
// during app.js init.

const store = (() => {
  const state = {};
  /** @type {Record<string, { storageKey: string, serialize?: "raw" }>} */
  const persistConfig = {};
  const listeners = new Set();
  let mirrorFn = () => {};
  let notifying = false;

  const getState = () => Object.freeze({ ...state });

  const persistSlice = (slice, value) => {
    const cfg = persistConfig[slice];
    if (!cfg) return;
    if (cfg.serialize === "raw") {
      if (value == null) localStorage.removeItem(cfg.storageKey);
      else localStorage.setItem(cfg.storageKey, String(value));
    } else {
      localStorage.setItem(cfg.storageKey, JSON.stringify(value));
    }
  };

  const notify = () => {
    if (notifying) return;
    notifying = true;
    try {
      const snapshot = getState();
      listeners.forEach((fn) => fn(snapshot));
    } finally {
      notifying = false;
    }
  };

  const update = (slice, updater) => {
    const prev = state[slice];
    const next = typeof updater === "function" ? updater(prev) : updater;
    if (next === prev) return;
    state[slice] = next;
    persistSlice(slice, next);
    mirrorFn();
    notify();
  };

  const subscribe = (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  const init = ({ values, persist }, mirror) => {
    Object.assign(state, values);
    Object.assign(persistConfig, persist);
    if (typeof mirror === "function") mirrorFn = mirror;
  };

  return {
    init,
    getState,
    subscribe,
    update,
    updateSessions: (fn) => update("sessions", fn),
    updatePlannedSessions: (fn) => update("plannedSessions", fn),
    updateRecovery: (fn) => update("recovery", fn),
    updateAthleteProfile: (fn) => update("athleteProfile", fn),
    updateCustomDrills: (fn) => update("customDrills", fn),
    updateReadinessCheckins: (fn) => update("readinessCheckins", fn),
    updateGolfClubBag: (fn) => update("golfClubBag", fn),
    updateGpsRound: (fn) => update("gpsRound", fn),
    setActiveGoalId: (id) => update("activeGoalId", id),
    setActiveProgramId: (id) => update("activeProgramId", id),
  };
})();
