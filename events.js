const collectProfileForm = () => {
  const activeSports = [...document.querySelectorAll("[data-profile-sport]:checked")].map(
    (input) => input.dataset.profileSport
  );
  const sportPriorities = getKnownSports().reduce((priorities, sport) => {
    priorities[sport] =
      document.querySelector(`[data-profile-sport-role="${sport}"]`)?.value ||
      (sport === document.querySelector("#profilePrimarySport").value ? "Primary" : "Secondary");
    return priorities;
  }, {});

  return normalizeAthleteProfile({
    name: document.querySelector("#profileName").value,
    primarySport: document.querySelector("#profilePrimarySport").value,
    activeSports,
    sportPriorities,
    goalId: document.querySelector("#profileGoal").value,
    weeklyDays: Number(document.querySelector("#profileDays").value) || 4,
    trainingDays:
      document.querySelector("#profileTrainingDays").value || defaultProfile.trainingDays,
    trainingStyle: document.querySelector("#profileTrainingStyle").value,
    preferredSessionLength: document.querySelector("#profileSessionLength").value,
    intensityPreference: document.querySelector("#profileIntensity").value,
    experienceLevel: document.querySelector("#profileExperience").value,
    access: document.querySelector("#profileAccess").value,
    otherActivities: document.querySelector("#profileOtherActivities").value,
    watchAreas: document.querySelector("#profileWatchAreas").value || defaultProfile.watchAreas,
    note: document.querySelector("#profileNote").value || "",
  });
};

function setupEventListeners() {
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => setView(button.dataset.view, { focus: true }));
  });

  document.querySelectorAll("[data-view-jump]").forEach((button) => {
    button.addEventListener("click", () => setView(button.dataset.viewJump, { focus: true }));
  });

  document.querySelector("#sessionType").addEventListener("change", () => {
    applyTemplate(document.querySelector("#sessionType").value, {
      keepEditing: Boolean(editingSessionId),
    });
  });

  document.querySelector("#themeToggle").addEventListener("click", () => {
    document.body.classList.toggle("dark");
  });

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    installPromptEvent = event;
    document.querySelector("#installApp").hidden = false;
  });

  document.querySelector("#installApp").addEventListener("click", async () => {
    if (!installPromptEvent) {
      showToast("Install is available when served over localhost or HTTPS");
      return;
    }
    installPromptEvent.prompt();
    await installPromptEvent.userChoice;
    installPromptEvent = null;
    document.querySelector("#installApp").hidden = true;
  });

  document.querySelector("#startSessionTimer").addEventListener("click", startSessionTimer);
  document.querySelector("#pauseSessionTimer").addEventListener("click", pauseSessionTimer);
  document.querySelector("#resetSessionTimer").addEventListener("click", resetSessionTimer);
  document.querySelector("#startRestTimer").addEventListener("click", startRestTimer);
  document.querySelector("#addRest15").addEventListener("click", () => addRestTime(15));
  document.querySelector("#resetRestTimer").addEventListener("click", resetRestTimer);
  document.querySelector("#previewImportMapping").addEventListener("click", renderImportPreview);
  document.querySelector("#importSource").addEventListener("change", renderImportPreview);

  document.querySelector("#readinessForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const checkin = {
      date: getToday(),
      sleep: Number(document.querySelector("#checkinSleep").value),
      soreness: Number(document.querySelector("#checkinSoreness").value),
      energy: Number(document.querySelector("#checkinEnergy").value),
      stress: Number(document.querySelector("#checkinStress").value),
      motivation: Number(document.querySelector("#checkinMotivation").value),
      note: document.querySelector("#checkinNote").value.trim(),
    };
    readinessCheckins = [
      checkin,
      ...readinessCheckins.filter((item) => item.date !== checkin.date),
    ].slice(0, 60);
    saveReadiness();
    renderDashboard();
    renderProgress();
    renderPlanner();
    showToast("Readiness check-in saved");
  });

  document.querySelectorAll("#readinessForm input").forEach((input) => {
    input.addEventListener("input", () => {
      const preview = getReadinessScoreFromCheckin({
        sleep: Number(document.querySelector("#checkinSleep").value),
        soreness: Number(document.querySelector("#checkinSoreness").value),
        energy: Number(document.querySelector("#checkinEnergy").value),
        stress: Number(document.querySelector("#checkinStress").value),
        motivation: Number(document.querySelector("#checkinMotivation").value),
      });
      document.querySelector("#readinessScore").textContent = `Preview ready: ${preview}`;
    });
  });

  document.querySelector("#customDrillForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const title = document.querySelector("#customDrillTitle").value.trim();
    const detail = document.querySelector("#customDrillDetail").value.trim();
    const type = document.querySelector("#customDrillType").value;
    const template = getTemplate(type);
    if (!title || !detail) {
      showToast("Add a template name and session plan");
      return;
    }
    const wasEditing = Boolean(editingCustomDrillId);

    const drill = {
      id: editingCustomDrillId || createDrillId(),
      sport: template.sport,
      type,
      title,
      tags: document
        .querySelector("#customDrillTags")
        .value.split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      detail,
      cue:
        document.querySelector("#customDrillCue").value.trim() ||
        "Keep the intent clear and stop when quality drops.",
      createdAt: getCustomDrill(editingCustomDrillId)?.createdAt || getToday(),
    };
    if (editingCustomDrillId) {
      customDrills = customDrills.map((item) => (item.id === editingCustomDrillId ? drill : item));
    } else {
      customDrills.unshift(drill);
    }
    saveCustomDrills();
    renderLibraryFilters();
    renderDrillLibrary();
    renderTemplates();
    renderPlannerControls();
    resetCustomDrillForm();
    showToast(wasEditing ? "Custom template updated" : "Custom drill saved");
  });

  document
    .querySelector("#customDrillSport")
    .addEventListener("change", renderCustomDrillTypeOptions);
  document.querySelector("#clearCustomDrill").addEventListener("click", resetCustomDrillForm);
  document.querySelector("#progressSportFilter").addEventListener("change", renderTrendCharts);
  document.querySelector("#refreshTodayPlan").addEventListener("click", () => {
    renderTodayPanel();
    showToast("Today panel refreshed");
  });

  document.querySelector("#todayGrid").addEventListener("click", (event) => {
    const completeButton = event.target.closest("[data-today-complete]");
    const openButton = event.target.closest("[data-today-open]");
    const viewJump = event.target.closest("[data-view-jump]");

    if (completeButton) {
      completePlannedSession(completeButton.dataset.todayComplete);
      return;
    }

    if (openButton) {
      activeSessionId = openButton.dataset.todayOpen;
      renderSessions();
      setView("log", { focus: true });
      document
        .querySelector("#sessionDetailPanel")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    if (viewJump) setView(viewJump.dataset.viewJump, { focus: true });
  });

  document.querySelector("#golfGpsView").addEventListener("change", (event) => {
    if (event.target.closest("[data-club-row]")) return;
    if (event.target.id === "gpsWindAdjustment") {
      gpsWindAdjustment = Number(event.target.value) || 0;
      markGpsRoundDirty();
      saveGpsRound();
      renderGolfGps();
      return;
    }
    if (event.target.id === "gpsElevationAdjustment") {
      gpsElevationAdjustment = Number(event.target.value) || 0;
      markGpsRoundDirty();
      saveGpsRound();
      renderGolfGps();
      return;
    }
    if (event.target.id === "gpsTemperature") {
      gpsTemperature = Number(event.target.value) || 72;
      markGpsRoundDirty();
      saveGpsRound();
      renderGolfGps();
      return;
    }
    updateGpsHoleScore(true);
    renderGolfGps();
  });

  document.querySelector("#golfGpsView").addEventListener("click", (event) => {
    const holeButton = event.target.closest("[data-gps-hole]");
    if (holeButton) {
      updateGpsHoleScore();
      activeGpsHole = Number(holeButton.dataset.gpsHole);
      renderGolfGps();
      return;
    }

    if (event.target.closest("[data-gps-hole-prev]")) {
      updateGpsHoleScore();
      activeGpsHole = activeGpsHole === 1 ? golfGpsCourse.holes.length : activeGpsHole - 1;
      renderGolfGps();
      return;
    }

    if (event.target.closest("[data-gps-hole-next]")) {
      updateGpsHoleScore();
      activeGpsHole = activeGpsHole === golfGpsCourse.holes.length ? 1 : activeGpsHole + 1;
      renderGolfGps();
      return;
    }

    if (event.target.closest("[data-gps-save-hole]")) {
      updateGpsHoleScore(true);
      showToast(`Hole ${activeGpsHole} saved`);
      renderGolfGps();
      return;
    }

    if (event.target.closest("[data-gps-add-shot]")) {
      addGpsShot();
      showToast("Shot added");
      renderGolfGps();
      return;
    }

    const removeShotButton = event.target.closest("[data-gps-remove-shot]");
    if (removeShotButton) {
      removeGpsShot(removeShotButton.dataset.gpsRemoveShot);
      renderGolfGps();
      return;
    }

    if (event.target.closest("[data-gps-save-clubs]")) {
      updateClubBagFromForm();
      showToast("Club bag saved");
      renderGolfGps();
      return;
    }

    if (event.target.closest("[data-gps-reset-round]")) {
      resetGpsRound();
      return;
    }

    if (event.target.closest("[data-gps-save-round]")) {
      saveGpsRoundToLog();
    }
  });

  document.querySelector("#profileForm").addEventListener("click", (event) => {
    const templateButton = event.target.closest("[data-profile-template]");
    if (!templateButton) return;
    applyTemplate(templateButton.dataset.profileTemplate);
    setView("log", { focus: true });
  });

  document.querySelector("#profileForm").addEventListener("change", (event) => {
    if (event.target.id === "profilePrimarySport") {
      const primarySport = event.target.value;
      const primarySportInput = document.querySelector(`[data-profile-sport="${primarySport}"]`);
      if (primarySportInput) {
        primarySportInput.checked = true;
        primarySportInput.closest(".profile-sport-card")?.classList.add("active");
      }
      document.querySelectorAll("[data-profile-sport-role]").forEach((select) => {
        if (select.dataset.profileSportRole !== primarySport && select.value === "Primary")
          select.value = "Secondary";
      });
      const primarySportRole = document.querySelector(
        `[data-profile-sport-role="${primarySport}"]`
      );
      if (primarySportRole) primarySportRole.value = "Primary";
      document.querySelector("#profileGoal").value = getDefaultGoalForSport(primarySport).id;
    }

    const sportInput = event.target.closest("[data-profile-sport]");
    if (sportInput)
      sportInput.closest(".profile-sport-card")?.classList.toggle("active", sportInput.checked);

    athleteProfile = collectProfileForm();
    activeGoalId = getProfileActiveGoalId(athleteProfile, activeGoalId);
    activeProgramId = getProfileActiveProgramId(athleteProfile, activeProgramId);
    renderProfile();
    renderGoals();
    renderDashboard();
    renderSportDashboards();
    renderPlanner();
    renderProgress();
    renderProgramControls();
    renderPrograms();
  });

  document.querySelector("#profileForm").addEventListener("submit", (event) => {
    event.preventDefault();
    athleteProfile = collectProfileForm();
    activeGoalId = getProfileActiveGoalId(athleteProfile, activeGoalId);
    activeProgramId = getProfileActiveProgramId(athleteProfile, getProfileProgramId());
    saveProfile();
    saveGoal();
    saveProgram();
    renderProfile();
    renderGoals();
    renderDashboard();
    renderSportDashboards();
    renderProgress();
    renderProgramControls();
    renderPrograms();
    renderPlanner();
    showToast("Profile saved and recommendations updated");
  });

  document.querySelector("#workoutForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const sessionType = document.querySelector("#sessionType").value;
    const values = collectFieldValues(sessionType);
    const wasEditing = Boolean(editingSessionId);
    const session = {
      id: editingSessionId || createId(),
      date: document.querySelector("#sessionDate").value || getToday(),
      type: sessionType,
      durationMinutes: Number(document.querySelector("#duration").value),
      effortScore: Number(document.querySelector("#effort").value),
      outcome: document.querySelector("#outcome").value,
      values,
      sets: collectLiftSets(),
      note: document.querySelector("#notes").value,
    };

    if (editingSessionId) {
      sessions = sessions.map((item) => (item.id === editingSessionId ? session : item));
    } else {
      sessions.unshift(session);
    }

    activeSessionId = session.id;
    editingSessionId = null;
    saveSessions();
    renderSessions();
    updateEditState();
    showToast(wasEditing ? "Session updated" : "Session saved");
    setView("log");
  });

  document.querySelector("#resetLog").addEventListener("click", () => {
    sessions = cloneItems(defaultSessions);
    activeSessionId = sessions[0]?.id || null;
    editingSessionId = null;
    saveSessions();
    renderSessions();
    updateEditState();
    showToast("Demo log restored");
  });

  document.querySelector("#cancelEdit").addEventListener("click", () => {
    editingSessionId = null;
    applyTemplate(document.querySelector("#sessionType").value);
  });

  document.querySelector("#addLiftSet").addEventListener("click", () => {
    const sets = collectLiftSets();
    const last = sets.at(-1) || getDefaultLiftSets()[0];
    renderLiftSets([...sets, { ...last, set: sets.length + 1 }]);
  });

  document.querySelector("#liftSetList").addEventListener("click", (event) => {
    const button = event.target.closest("[data-lift-remove]");
    if (!button) return;
    button.closest("[data-lift-row]").remove();
  });

  document.querySelector("#sessionList").addEventListener("click", (event) => {
    const viewJump = event.target.closest("[data-view-jump]");
    if (viewJump) {
      setView(viewJump.dataset.viewJump, { focus: true });
      return;
    }

    const button = event.target.closest("[data-session-action]");
    const card = event.target.closest("[data-session-open]");

    if (!button && card) {
      activeSessionId = card.dataset.sessionOpen;
      renderSessions();
      renderSessionDetail();
      document
        .querySelector("#sessionDetailPanel")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    if (!button) return;

    const sessionId = button.dataset.sessionId;
    if (button.dataset.sessionAction === "view") {
      activeSessionId = sessionId;
      renderSessions();
      renderSessionDetail();
      document
        .querySelector("#sessionDetailPanel")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    if (button.dataset.sessionAction === "edit") loadSessionForEdit(sessionId);
    if (button.dataset.sessionAction === "duplicate") duplicateSession(sessionId);
    if (button.dataset.sessionAction === "delete") deleteSession(sessionId);
  });

  document.querySelector("#sessionDetailPanel").addEventListener("click", (event) => {
    const button = event.target.closest("[data-session-action]");
    if (!button) return;

    const sessionId = button.dataset.sessionId;
    if (button.dataset.sessionAction === "view") {
      activeSessionId = sessionId;
      renderSessions();
    }
    if (button.dataset.sessionAction === "duplicate") duplicateSession(sessionId);
    if (button.dataset.sessionAction === "template") saveSessionAsTemplate(sessionId);
  });

  document.querySelector("#sportDashboardGrid").addEventListener("click", (event) => {
    const templateButton = event.target.closest("[data-sport-template]");
    const sessionButton = event.target.closest("[data-session-action]");

    if (templateButton) {
      applyTemplate(templateButton.dataset.sportTemplate);
      setView("log");
      return;
    }

    if (sessionButton && sessionButton.dataset.sessionAction === "view") {
      activeSessionId = sessionButton.dataset.sessionId;
      renderSessions();
      setView("log");
      document
        .querySelector("#sessionDetailPanel")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });

  document.querySelector("#programFocus").addEventListener("change", () => {
    activeProgramId = document.querySelector("#programFocus").value;
    saveProgram();
    renderProgramOutput();
  });

  document.querySelector("#programVolume").addEventListener("change", renderProgramOutput);

  document.querySelector("#generateProgram").addEventListener("click", () => {
    renderProgramOutput();
    showToast("Program block generated");
  });

  document.querySelector("#loadProgramWeek").addEventListener("click", () => {
    plannedSessions = createProgramPlan(0);
    savePlanner();
    renderPlanner();
    showToast("Week one loaded into planner");
    setView("planner");
  });

  document.querySelector("#loadSmartWeek").addEventListener("click", () => {
    plannedSessions = createSmartProgramPlan();
    savePlanner();
    renderPlanner();
    showToast("Smart week adjusted from profile and readiness");
    setView("planner");
  });

  document.querySelector("#programGrid").addEventListener("click", (event) => {
    const button = event.target.closest("[data-program-jump]");
    if (!button) return;

    const tagMap = {
      Golf: "golf-power",
      Tennis: "tennis-durability",
      Pickle: "pickleball-resilience",
      Hybrid: "hybrid-base",
    };
    activeProgramId = tagMap[button.dataset.programJump] || "hybrid-base";
    document.querySelector("#programFocus").value = activeProgramId;
    saveProgram();
    renderProgramOutput();
  });

  document.querySelector("#libraryFilter").addEventListener("change", renderDrillLibrary);
  document.querySelector("#librarySearch").addEventListener("input", renderDrillLibrary);

  document.querySelector("#drillGrid").addEventListener("click", (event) => {
    const editButton = event.target.closest("[data-drill-edit]");
    const duplicateButton = event.target.closest("[data-drill-duplicate]");
    const deleteButton = event.target.closest("[data-drill-delete]");
    if (editButton) {
      loadCustomDrillForEdit(editButton.dataset.drillEdit);
      return;
    }

    if (duplicateButton) {
      duplicateCustomDrill(duplicateButton.dataset.drillDuplicate);
      return;
    }

    if (deleteButton) {
      customDrills = customDrills.filter((drill) => drill.id !== deleteButton.dataset.drillDelete);
      saveCustomDrills();
      renderLibraryFilters();
      renderDrillLibrary();
      renderTemplates();
      renderPlannerControls();
      showToast("Custom drill deleted");
      return;
    }

    const button = event.target.closest("[data-drill-template]");
    if (!button) return;

    applyTemplate(button.dataset.drillTemplate);
    const drill = customDrills.find((item) => item.id === button.dataset.drillId);
    if (drill)
      document.querySelector("#notes").value = `${drill.title}: ${drill.detail} Cue: ${drill.cue}`;
    setView("log");
  });

  document.querySelector("#recordsGrid").addEventListener("click", (event) => {
    const sessionButton = event.target.closest("[data-record-session]");
    const templateButton = event.target.closest("[data-record-template]");

    if (sessionButton) {
      activeSessionId = sessionButton.dataset.recordSession;
      renderSessions();
      setView("log");
      document
        .querySelector("#sessionDetailPanel")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    if (templateButton) {
      applyTemplate(templateButton.dataset.recordTemplate);
      setView("log");
    }
  });

  document.querySelector("#compareA").addEventListener("change", renderCompare);
  document.querySelector("#compareB").addEventListener("change", renderCompare);

  document.querySelector("#calendarGrid").addEventListener("click", (event) => {
    const completedButton = event.target.closest("[data-calendar-completed]");
    const plannedButton = event.target.closest("[data-calendar-planned]");

    if (completedButton) {
      activeSessionId = completedButton.dataset.calendarCompleted;
      renderSessions();
      setView("log");
      document
        .querySelector("#sessionDetailPanel")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    if (plannedButton) {
      completePlannedSession(plannedButton.dataset.calendarPlanned);
      setView("log");
    }
  });

  document.querySelector("#prevMonth").addEventListener("click", () => {
    calendarCursor.setMonth(calendarCursor.getMonth() - 1);
    renderCalendar();
  });

  document.querySelector("#todayMonth").addEventListener("click", () => {
    calendarCursor = new Date();
    calendarCursor.setDate(1);
    renderCalendar();
  });

  document.querySelector("#nextMonth").addEventListener("click", () => {
    calendarCursor.setMonth(calendarCursor.getMonth() + 1);
    renderCalendar();
  });

  document.querySelector("#exportJson").addEventListener("click", () => {
    downloadTextFile(
      "athlete-log-export.json",
      JSON.stringify(serializeLogData(), null, 2),
      "application/json"
    );
    showToast("JSON export prepared");
  });

  document.querySelector("#exportCsv").addEventListener("click", () => {
    const header = ["date", "type", "sport", "durationMinutes", "effortScore", "outcome", "notes"];
    const rows = sessions.map((session) => [
      session.date,
      session.type,
      getTemplate(session.type).sport,
      getSessionMinutes(session),
      getSessionEffort(session),
      session.outcome,
      session.note,
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell || "").replaceAll('"', '""')}"`).join(","))
      .join("\n");
    downloadTextFile("athlete-log-sessions.csv", csv, "text/csv");
    showToast("CSV export prepared");
  });

  document.querySelector("#importJson").addEventListener("click", () => {
    try {
      const payload = JSON.parse(document.querySelector("#importJsonText").value);
      if (!Array.isArray(payload.sessions)) throw new Error("Missing sessions array");
      sessions = payload.sessions.map(normalizeSession);
      plannedSessions = Array.isArray(payload.plannedSessions)
        ? payload.plannedSessions.map(normalizePlan)
        : plannedSessions;
      recovery = Array.isArray(payload.recovery) ? payload.recovery : recovery;
      athleteProfile = payload.athleteProfile
        ? normalizeAthleteProfile(payload.athleteProfile)
        : athleteProfile;
      activeGoalId = getProfileActiveGoalId(
        athleteProfile,
        normalizeGoalId(payload.activeGoalId, activeGoalId)
      );
      activeProgramId = getProfileActiveProgramId(
        athleteProfile,
        normalizeProgramId(payload.activeProgramId, activeProgramId)
      );
      athleteProfile = normalizeAthleteProfile({
        ...athleteProfile,
        goalId: activeGoalId,
        activeGoalId,
        programId: activeProgramId,
        activeProgramId,
      });
      customDrills = Array.isArray(payload.customDrills)
        ? payload.customDrills.map(normalizeCustomDrill)
        : customDrills;
      readinessCheckins = Array.isArray(payload.readinessCheckins)
        ? payload.readinessCheckins
        : readinessCheckins;
      golfClubBag = Array.isArray(payload.golfClubBag)
        ? normalizeGolfClubBag(payload.golfClubBag)
        : golfClubBag;
      if (payload.golfGpsRound) {
        activeGpsHole = golfGpsCourse.holes.some(
          (hole) => hole.number === Number(payload.golfGpsRound.activeGpsHole)
        )
          ? Number(payload.golfGpsRound.activeGpsHole)
          : 1;
        gpsWindAdjustment = Number(payload.golfGpsRound.windAdjustment) || 0;
        gpsElevationAdjustment = Number(payload.golfGpsRound.elevationAdjustment) || 0;
        gpsTemperature = Number(payload.golfGpsRound.temperature) || 72;
        gpsRoundStartedAt = payload.golfGpsRound.startedAt || gpsRoundStartedAt;
        gpsSavedSessionId = payload.golfGpsRound.savedSessionId || null;
        gpsRoundScore = { ...defaultGpsRoundScore(), ...(payload.golfGpsRound.score || {}) };
      }
      activeSessionId = sessions[0]?.id || null;
      saveSessions();
      savePlanner();
      saveRecovery();
      saveProfile();
      saveCustomDrills();
      saveReadiness();
      saveClubBag();
      saveGpsRound();
      saveGoal();
      saveProgram();
      renderSessions();
      renderPlanner();
      renderGoals();
      renderBodyMap();
      renderProfile();
      renderSportDashboards();
      renderProgramControls();
      renderPrograms();
      renderDashboard();
      renderProgress();
      renderLibraryFilters();
      renderDrillLibrary();
      renderTemplates();
      renderGolfGps();
      document.querySelector("#importJsonText").value = "";
      showToast("Import complete");
    } catch (_error) {
      showToast("Import failed: check the JSON");
    }
  });

  document.querySelector("#historyFilter").addEventListener("change", renderSessions);
  document.querySelector("#historySearch").addEventListener("input", renderSessions);
  document.querySelector("#historySort").addEventListener("change", renderSessions);

  document.querySelector("#planType").addEventListener("change", () => {
    document.querySelector("#planDuration").value = getSelectedPlanTemplate().defaultDuration;
  });

  document.querySelector("#plannerForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const planSelection = parsePlanTypeValue(document.querySelector("#planType").value);
    plannedSessions.push({
      id: createId(),
      day: document.querySelector("#planDay").value,
      type: planSelection.type,
      customDrillId: planSelection.customDrillId,
      durationMinutes: Number(document.querySelector("#planDuration").value),
      priority: document.querySelector("#planPriority").value,
    });
    savePlanner();
    renderPlanner();
    showToast("Session added to planner");
  });

  document.querySelector("#plannerBoard").addEventListener("click", (event) => {
    const button = event.target.closest("[data-plan-action]");
    if (!button) return;

    if (button.dataset.planAction === "complete") completePlannedSession(button.dataset.planId);
    if (button.dataset.planAction === "delete") deletePlannedSession(button.dataset.planId);
  });

  document.querySelector("#resetPlanner").addEventListener("click", () => {
    plannedSessions = cloneItems(defaultPlannedSessions).map(normalizePlan);
    savePlanner();
    renderPlanner();
    showToast("Planner reset");
  });

  document.querySelector("#goalGrid").addEventListener("click", (event) => {
    const button = event.target.closest("[data-goal-id]");
    if (!button) return;

    activeGoalId = button.dataset.goalId;
    saveGoal();
    renderGoals();
    renderDashboard();
    showToast(`Goal set to ${getGoal(activeGoalId).title}`);
  });

  document.querySelector("#goalDetail").addEventListener("click", (event) => {
    const button = event.target.closest("[data-goal-template]");
    if (!button) return;

    applyTemplate(button.dataset.goalTemplate);
    setView("log");
  });

  document.querySelector("#resetRecovery").addEventListener("click", () => {
    recovery = cloneItems(defaultRecovery);
    saveRecovery();
    renderBodyMap();
    renderDashboard();
    renderProgress();
    renderPlanner();
    renderGoals();
    renderSportDashboards();
    showToast("Recovery reset");
  });
}
