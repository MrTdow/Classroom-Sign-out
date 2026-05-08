const STORAGE_KEY = "classroomSignOutTracker.v1";
const DEFAULT_CLASS_RULES = {
  hallPassLimit: 8,
  lunchDetentionStrikes: 3,
  maxStudentsOut: 0
};

function makeId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

const defaultState = {
  settings: {
    schoolYear: "2026-2027",
    threshold: 8,
    teacherPassword: "",
    teacherPasswordConfigured: false,
    classroomOptions: ["Locker", "Loaner Chromebook", "Nurse", "Office"],
    periods: [
      { id: "q1", name: "1st 9 Weeks", start: "2026-08-17", end: "2026-10-16" },
      { id: "q2", name: "2nd 9 Weeks", start: "2026-10-19", end: "2026-12-18" },
      { id: "q3", name: "3rd 9 Weeks", start: "2027-01-04", end: "2027-03-12" },
      { id: "q4", name: "4th 9 Weeks", start: "2027-03-15", end: "2027-05-26" }
    ]
  },
  classes: [
    { id: "default-class", name: "My Class", rules: clone(DEFAULT_CLASS_RULES) }
  ],
  students: [
    { id: makeId(), classId: "default-class", name: "Sample Student" }
  ],
  logs: []
};

let state = loadState();
let selectedStudentId = null;
let activeClassId = state.classes[0]?.id || "default-class";
let pendingAction = null;
let pendingHallPassLimit = null;
let pendingMaxOutApproval = null;
let pendingPinAction = null;
let pendingTeacherView = null;
let teacherUnlocked = false;
let editingLogId = null;
let activeSetupTab = "classes";
let activeRuleClassId = activeClassId;
let activeViewName = "student";

const els = {
  tabs: document.querySelectorAll(".tab"),
  views: {
    student: document.getElementById("studentView"),
    teacher: document.getElementById("teacherView"),
    setup: document.getElementById("setupView")
  },
  todayPill: document.getElementById("todayPill"),
  studentClassTabs: document.getElementById("studentClassTabs"),
  studentGrid: document.getElementById("studentGrid"),
  actionPanel: document.getElementById("actionPanel"),
  studentOutCount: document.getElementById("studentOutCount"),
  studentCurrentOutList: document.getElementById("studentCurrentOutList"),
  dashboardClassFilter: document.getElementById("dashboardClassFilter"),
  periodFilter: document.getElementById("periodFilter"),
  watchlist: document.getElementById("watchlist"),
  currentOutList: document.getElementById("currentOutList"),
  outCount: document.getElementById("outCount"),
  logClassFilter: document.getElementById("logClassFilter"),
  typeFilter: document.getElementById("typeFilter"),
  logTable: document.getElementById("logTable"),
  downloadCsvBtn: document.getElementById("downloadCsvBtn"),
  classNameInput: document.getElementById("classNameInput"),
  addClassBtn: document.getElementById("addClassBtn"),
  classList: document.getElementById("classList"),
  bulkClassSelect: document.getElementById("bulkClassSelect"),
  bulkStudentInput: document.getElementById("bulkStudentInput"),
  importStudentsBtn: document.getElementById("importStudentsBtn"),
  studentClassSelect: document.getElementById("studentClassSelect"),
  studentNameInput: document.getElementById("studentNameInput"),
  addStudentBtn: document.getElementById("addStudentBtn"),
  studentList: document.getElementById("studentList"),
  ruleClassSelect: document.getElementById("ruleClassSelect"),
  schoolYearInput: document.getElementById("schoolYearInput"),
  thresholdInput: document.getElementById("thresholdInput"),
  lunchDetentionStrikesInput: document.getElementById("lunchDetentionStrikesInput"),
  maxStudentsOutInput: document.getElementById("maxStudentsOutInput"),
  teacherPasswordInput: document.getElementById("teacherPasswordInput"),
  periodEditor: document.getElementById("periodEditor"),
  saveSettingsBtn: document.getElementById("saveSettingsBtn"),
  saveClassRulesBtn: document.getElementById("saveClassRulesBtn"),
  saveSchoolYearBtn: document.getElementById("saveSchoolYearBtn"),
  classroomOptionInput: document.getElementById("classroomOptionInput"),
  addClassroomOptionBtn: document.getElementById("addClassroomOptionBtn"),
  classroomOptionList: document.getElementById("classroomOptionList"),
  destinationField: document.getElementById("destinationField"),
  destinationSelect: document.getElementById("destinationSelect"),
  tardyPassField: document.getElementById("tardyPassField"),
  noteField: document.getElementById("noteField"),
  noteDialog: document.getElementById("noteDialog"),
  noteDialogTitle: document.getElementById("noteDialogTitle"),
  noteDialogText: document.getElementById("noteDialogText"),
  noteInput: document.getElementById("noteInput"),
  confirmActionBtn: document.getElementById("confirmActionBtn"),
  hallPassLimitDialog: document.getElementById("hallPassLimitDialog"),
  hallPassLimitText: document.getElementById("hallPassLimitText"),
  maxOutDialog: document.getElementById("maxOutDialog"),
  maxOutDialogText: document.getElementById("maxOutDialogText"),
  maxOutPasswordInput: document.getElementById("maxOutPasswordInput"),
  maxOutPasswordError: document.getElementById("maxOutPasswordError"),
  pinDialog: document.getElementById("pinDialog"),
  pinDialogText: document.getElementById("pinDialogText"),
  pinInput: document.getElementById("pinInput"),
  pinError: document.getElementById("pinError"),
  teacherPasswordDialog: document.getElementById("teacherPasswordDialog"),
  teacherPasswordDialogTitle: document.getElementById("teacherPasswordDialogTitle"),
  teacherPasswordDialogText: document.getElementById("teacherPasswordDialogText"),
  teacherPasswordEntry: document.getElementById("teacherPasswordEntry"),
  teacherPasswordError: document.getElementById("teacherPasswordError"),
  teacherPasswordSubmitBtn: document.getElementById("teacherPasswordSubmitBtn"),
  editLogDialog: document.getElementById("editLogDialog"),
  editStudentSelect: document.getElementById("editStudentSelect"),
  editTypeSelect: document.getElementById("editTypeSelect"),
  editDestinationField: document.getElementById("editDestinationField"),
  editDestinationSelect: document.getElementById("editDestinationSelect"),
  editExtraHallPassField: document.getElementById("editExtraHallPassField"),
  editExtraHallPassInput: document.getElementById("editExtraHallPassInput"),
  editPassField: document.getElementById("editPassField"),
  editPassSelect: document.getElementById("editPassSelect"),
  editOutAtInput: document.getElementById("editOutAtInput"),
  editInAtField: document.getElementById("editInAtField"),
  editInAtInput: document.getElementById("editInAtInput"),
  editPeriodSelect: document.getElementById("editPeriodSelect"),
  editNoteInput: document.getElementById("editNoteInput"),
  editReturnNoteInput: document.getElementById("editReturnNoteInput"),
  saveEditedLogBtn: document.getElementById("saveEditedLogBtn"),
  backupBtn: document.getElementById("backupBtn"),
  restoreFile: document.getElementById("restoreFile")
};

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return normalizeState(clone(defaultState));

  try {
    const parsed = JSON.parse(saved);
    return normalizeState({
      ...clone(defaultState),
      ...parsed,
      settings: {
        ...clone(defaultState.settings),
        ...(parsed.settings || {})
      },
      classes: Array.isArray(parsed.classes) ? parsed.classes : clone(defaultState.classes),
      students: Array.isArray(parsed.students) ? parsed.students : [],
      logs: Array.isArray(parsed.logs) ? parsed.logs : []
    });
  } catch {
    return normalizeState(clone(defaultState));
  }
}

function normalizeState(incoming) {
  const settings = {
    ...clone(defaultState.settings),
    ...(incoming.settings || {}),
    classroomOptions: normalizeClassroomOptions(incoming.settings?.classroomOptions)
  };
  const fallbackClass = incoming.classes?.[0] || { id: "default-class", name: "My Class" };
  const rawClasses = Array.isArray(incoming.classes) && incoming.classes.length ? incoming.classes : [fallbackClass];
  const classes = rawClasses.map((classItem) => ({
    ...classItem,
    rules: normalizeClassRules(classItem.rules || incoming.settings)
  }));
  const classIds = new Set(classes.map((item) => item.id));
  const students = (incoming.students || []).map((student) => ({
    ...student,
    pin: student.pin || "",
    classId: classIds.has(student.classId) ? student.classId : classes[0].id
  }));
  const studentClassMap = new Map(students.map((student) => [student.id, student.classId]));
  const logs = (incoming.logs || []).map((log) => ({
    ...log,
    classId: classIds.has(log.classId) ? log.classId : studentClassMap.get(log.studentId) || classes[0].id,
    countsAsHallPass: log.type !== "Tardy" ? log.countsAsHallPass !== false : false,
    isExtraHallPass: Boolean(log.isExtraHallPass || log.hallPassChoice === "Extra hall pass")
  }));
  return { ...incoming, settings, classes, students, logs };
}

function normalizeClassroomOptions(options) {
  const source = Array.isArray(options) && options.length ? options : defaultState.settings.classroomOptions;
  return [...new Set(source.map((option) => String(option).trim()).filter(Boolean))];
}

function normalizeClassRules(rules = {}) {
  const hallPassLimit = Number(rules.hallPassLimit ?? rules.threshold ?? DEFAULT_CLASS_RULES.hallPassLimit);
  const lunchDetentionStrikes = Number(rules.lunchDetentionStrikes ?? DEFAULT_CLASS_RULES.lunchDetentionStrikes);
  const maxStudentsOut = Number(rules.maxStudentsOut ?? DEFAULT_CLASS_RULES.maxStudentsOut);
  return {
    hallPassLimit: Number.isFinite(hallPassLimit) && hallPassLimit >= 0 ? Math.floor(hallPassLimit) : DEFAULT_CLASS_RULES.hallPassLimit,
    lunchDetentionStrikes: Number.isFinite(lunchDetentionStrikes) && lunchDetentionStrikes >= 1 ? Math.floor(lunchDetentionStrikes) : DEFAULT_CLASS_RULES.lunchDetentionStrikes,
    maxStudentsOut: Number.isFinite(maxStudentsOut) && maxStudentsOut >= 0 ? Math.floor(maxStudentsOut) : DEFAULT_CLASS_RULES.maxStudentsOut
  };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function formatDateTime(value) {
  if (!value) return "";
  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function formatDate(value) {
  if (!value) return "";
  return new Date(`${value}T00:00:00`).toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function toDatetimeLocal(value) {
  if (!value) return "";
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function fromDatetimeLocal(value) {
  return value ? new Date(value).toISOString() : "";
}

function localDateKey(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getStudent(id) {
  return state.students.find((student) => student.id === id);
}

function getLog(id) {
  return state.logs.find((log) => log.id === id);
}

function getClass(id) {
  return state.classes.find((classItem) => classItem.id === id);
}

function getClassRules(classId) {
  return normalizeClassRules(getClass(classId)?.rules);
}

function getStudentRules(studentId) {
  const student = getStudent(studentId);
  return getClassRules(student?.classId);
}

function getStudentsForClass(classId) {
  return state.students
    .filter((student) => student.classId === classId)
    .sort((a, b) => a.name.localeCompare(b.name));
}

function getOpenLog(studentId) {
  return state.logs.find((log) => log.studentId === studentId && log.type !== "Tardy" && !log.inAt);
}

function getOpenLogsForClass(classId) {
  return state.logs.filter((log) => log.classId === classId && log.type !== "Tardy" && !log.inAt);
}

function getPeriodForDate(value) {
  const date = localDateKey(value);
  return state.settings.periods.find((period) => date >= period.start && date <= period.end);
}

function getPeriodById(periodId) {
  return state.settings.periods.find((period) => period.id === periodId);
}

function getCurrentPeriod() {
  const today = localDateKey();
  return state.settings.periods.find((period) => today >= period.start && today <= period.end) || state.settings.periods[0];
}

function getMinutes(log) {
  if (!log.outAt || !log.inAt) return "";
  return Math.max(1, Math.round((new Date(log.inAt) - new Date(log.outAt)) / 60000));
}

function isTardyStrike(log) {
  return log.type === "Tardy" && log.passStatus !== "Pass";
}

function isHallPassUse(log) {
  return log.type !== "Tardy" && log.countsAsHallPass !== false;
}

function getPeriodLogsForStudent(studentId, periodId) {
  return state.logs.filter((log) => log.studentId === studentId && log.periodId === periodId);
}

function getStudentPeriodStats(studentId, periodId) {
  const logs = getPeriodLogsForStudent(studentId, periodId);
  const rules = getStudentRules(studentId);
  const hallPassesUsed = logs.filter(isHallPassUse).length;
  const tardyStrikes = logs.filter(isTardyStrike).length;
  return {
    hallPassLimit: rules.hallPassLimit,
    lunchDetentionStrikes: rules.lunchDetentionStrikes,
    hallPassesUsed,
    extraHallPasses: rules.hallPassLimit > 0 ? Math.max(0, hallPassesUsed - rules.hallPassLimit) : 0,
    hallPassesRemaining: rules.hallPassLimit > 0 ? Math.max(0, rules.hallPassLimit - hallPassesUsed) : "No limit",
    tardies: logs.filter((log) => log.type === "Tardy").length,
    tardyStrikes
  };
}

function getTardyStrikeMessage(strikes, limit = DEFAULT_CLASS_RULES.lunchDetentionStrikes) {
  if (strikes >= limit) return "Lunch detention threshold reached.";
  if (strikes === limit - 1) return "Warning: one more tardy strike may result in lunch detention.";
  if (strikes === 1) return "You have 1 tardy strike.";
  return "";
}

function getHallPassWarningMessage(used, limit = DEFAULT_CLASS_RULES.hallPassLimit) {
  if (limit <= 0) return "";
  const remaining = limit - used;
  if (used > limit) return "You are over your hall pass limit. Please check with your teacher before leaving.";
  if (used === limit) return `You have used all ${limit} hall passes. Please check with your teacher before leaving.`;
  if (remaining === 1) return "Warning: You only have 1 hall pass left this 9 weeks.";
  if (remaining === 2) return "Warning: You only have 2 hall passes left this 9 weeks.";
  return "";
}

function getLogStatus(log) {
  if (log.type === "Tardy") return isTardyStrike(log) ? "Tardy strike / no pass" : "Tardy with pass";
  if (log.isExtraHallPass || log.hallPassChoice === "Extra hall pass") return "Extra hall pass";
  return "Normal sign-out";
}

function getTypeLabel(type) {
  return type === "Classroom" ? "Other Destination" : type;
}

function getSignOutLabel(log) {
  return log.destination || getTypeLabel(log.type);
}

function isTeacherPasswordConfigured() {
  const password = String(state.settings.teacherPassword || "").trim();
  return Boolean(state.settings.teacherPasswordConfigured && password);
}

function isProtectedTeacherView(viewName) {
  return viewName === "teacher" || viewName === "setup";
}

function showView(viewName) {
  activeViewName = viewName;
  els.tabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.view === viewName));
  Object.entries(els.views).forEach(([name, view]) => {
    view.classList.toggle("active", name === viewName);
  });
  render();
  if (isProtectedTeacherView(viewName)) {
    teacherUnlocked = false;
  }
}

function switchView(viewName) {
  if (viewName === activeViewName) return;
  if (isProtectedTeacherView(viewName) && !teacherUnlocked) {
    pendingTeacherView = viewName;
    els.teacherPasswordEntry.value = "";
    els.teacherPasswordError.textContent = "";
    const needsSetup = !isTeacherPasswordConfigured();
    els.teacherPasswordDialogTitle.textContent = needsSetup ? "Create Teacher Password" : "Teacher Access";
    els.teacherPasswordDialogText.textContent = needsSetup
      ? "Create a teacher password before opening the Teacher Dashboard or Setup."
      : "Enter the teacher password to continue.";
    els.teacherPasswordEntry.placeholder = needsSetup ? "Create teacher password" : "Teacher password";
    els.teacherPasswordSubmitBtn.textContent = needsSetup ? "Save Password" : "Unlock";
    els.teacherPasswordDialog.showModal();
    return;
  }
  showView(viewName);
}

function unlockTeacherView() {
  const entered = els.teacherPasswordEntry.value.trim();
  if (!isTeacherPasswordConfigured()) {
    if (!entered) {
      els.teacherPasswordError.textContent = "Create a password first.";
      return;
    }
    state.settings.teacherPassword = entered;
    state.settings.teacherPasswordConfigured = true;
    saveState();
    teacherUnlocked = true;
    const viewName = pendingTeacherView || "setup";
    pendingTeacherView = null;
    els.teacherPasswordDialog.close("created");
    showView(viewName);
    return;
  }
  const expected = state.settings.teacherPassword;
  if (entered !== expected) {
    if (entered === "reset") {
      state.settings.teacherPassword = "";
      state.settings.teacherPasswordConfigured = false;
      saveState();
      els.teacherPasswordEntry.value = "";
      els.teacherPasswordError.textContent = "Password reset. Type a new teacher password and press Unlock.";
      els.teacherPasswordDialogTitle.textContent = "Create Teacher Password";
      els.teacherPasswordDialogText.textContent = "Create a teacher password before opening the Teacher Dashboard or Setup.";
      els.teacherPasswordEntry.placeholder = "Create teacher password";
      els.teacherPasswordSubmitBtn.textContent = "Save Password";
      return;
    }
    els.teacherPasswordError.textContent = "Incorrect password. Type reset to create a new teacher password.";
    els.teacherPasswordEntry.value = "";
    return;
  }
  teacherUnlocked = true;
  const viewName = pendingTeacherView || "teacher";
  pendingTeacherView = null;
  els.teacherPasswordDialog.close("unlocked");
  showView(viewName);
}

function ensureActiveClass() {
  if (!state.classes.some((classItem) => classItem.id === activeClassId)) {
    activeClassId = state.classes[0]?.id || "default-class";
  }
  if (!state.classes.some((classItem) => classItem.id === activeRuleClassId)) {
    activeRuleClassId = activeClassId;
  }
  if (selectedStudentId) {
    const selectedStudent = getStudent(selectedStudentId);
    if (!selectedStudent || selectedStudent.classId !== activeClassId) selectedStudentId = null;
  }
}

function addClass() {
  const name = els.classNameInput.value.trim();
  if (!name) return;
  const duplicate = state.classes.some((classItem) => classItem.name.toLowerCase() === name.toLowerCase());
  if (duplicate) {
    alert("That class already exists.");
    return;
  }
  const classItem = { id: makeId(), name, rules: clone(DEFAULT_CLASS_RULES) };
  state.classes.push(classItem);
  activeClassId = classItem.id;
  activeRuleClassId = classItem.id;
  els.classNameInput.value = "";
  saveState();
  render();
}

function removeClass(classId) {
  const classItem = getClass(classId);
  if (!classItem) return;
  const classStudents = getStudentsForClass(classId);
  if (classStudents.length) {
    alert("Move or remove the students from this class before deleting it.");
    return;
  }
  if (state.classes.length === 1) {
    alert("Keep at least one class in the tracker.");
    return;
  }
  if (!confirm(`Delete ${classItem.name}?`)) return;
  state.classes = state.classes.filter((item) => item.id !== classId);
  ensureActiveClass();
  saveState();
  render();
}

function parsePastedNames(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^\d+[\).\-\s]+/, "").trim())
    .filter(Boolean);
}

function addStudentToClass(name, classId) {
  const duplicate = state.students.some(
    (student) => student.classId === classId && student.name.toLowerCase() === name.toLowerCase()
  );
  if (duplicate) return false;
  state.students.push({ id: makeId(), classId, name, pin: "" });
  return true;
}

function importBulkStudents() {
  const classId = els.bulkClassSelect.value || activeClassId;
  const names = parsePastedNames(els.bulkStudentInput.value);
  if (!classId || !names.length) return;
  const added = names.filter((name) => addStudentToClass(name, classId)).length;
  activeClassId = classId;
  els.bulkStudentInput.value = "";
  state.students.sort((a, b) => a.name.localeCompare(b.name));
  saveState();
  render();
  alert(`Added ${added} student${added === 1 ? "" : "s"}.`);
}

function addClassroomOption() {
  const option = els.classroomOptionInput.value.trim();
  if (!option) return;
  const duplicate = state.settings.classroomOptions.some((item) => item.toLowerCase() === option.toLowerCase());
  if (duplicate) {
    alert("That option already exists.");
    return;
  }
  state.settings.classroomOptions.push(option);
  els.classroomOptionInput.value = "";
  saveState();
  render();
}

function removeClassroomOption(option) {
  if (state.settings.classroomOptions.length === 1) {
    alert("Keep at least one destination option.");
    return;
  }
  state.settings.classroomOptions = state.settings.classroomOptions.filter((item) => item !== option);
  saveState();
  render();
}

function renderEditLogFields() {
  const type = els.editTypeSelect.value;
  els.editDestinationField.hidden = type !== "Classroom";
  els.editExtraHallPassField.hidden = type === "Tardy";
  els.editPassField.hidden = type !== "Tardy";
  els.editInAtField.hidden = type === "Tardy";
}

function openEditLogDialog(logId) {
  const log = getLog(logId);
  if (!log) return;
  editingLogId = logId;
  els.editStudentSelect.innerHTML = state.students
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((student) => {
      const className = getClass(student.classId)?.name || "Class";
      return `<option value="${student.id}">${escapeHtml(student.name)} (${escapeHtml(className)})</option>`;
    })
    .join("");
  els.editDestinationSelect.innerHTML = state.settings.classroomOptions
    .map((option) => `<option value="${escapeHtml(option)}">${escapeHtml(option)}</option>`)
    .join("");
  els.editPeriodSelect.innerHTML = state.settings.periods
    .map((period) => `<option value="${period.id}">${escapeHtml(period.name)}</option>`)
    .join("");

  els.editStudentSelect.value = log.studentId;
  els.editTypeSelect.value = log.type;
  els.editDestinationSelect.value = log.destination || state.settings.classroomOptions[0] || "";
  els.editExtraHallPassInput.checked = Boolean(log.isExtraHallPass || log.hallPassChoice === "Extra hall pass");
  els.editPassSelect.value = log.passStatus || "No Pass";
  els.editOutAtInput.value = toDatetimeLocal(log.outAt);
  els.editInAtInput.value = toDatetimeLocal(log.inAt);
  els.editPeriodSelect.value = log.periodId;
  els.editNoteInput.value = log.note || "";
  els.editReturnNoteInput.value = log.returnNote || "";
  renderEditLogFields();
  els.editLogDialog.showModal();
}

function saveEditedLog() {
  const log = getLog(editingLogId);
  const student = getStudent(els.editStudentSelect.value);
  if (!log || !student) return;

  const type = els.editTypeSelect.value;
  log.studentId = student.id;
  log.studentName = student.name;
  log.classId = student.classId;
  log.type = type;
  log.countsAsHallPass = type !== "Tardy";
  log.isExtraHallPass = type !== "Tardy" && els.editExtraHallPassInput.checked;
  if (type === "Tardy") {
    log.hallPassChoice = "";
  } else if (log.isExtraHallPass) {
    log.hallPassChoice = "Extra hall pass";
  } else if (log.hallPassChoice === "Extra hall pass") {
    log.hallPassChoice = "";
  }
  log.destination = type === "Classroom" ? els.editDestinationSelect.value : "";
  log.passStatus = type === "Tardy" ? els.editPassSelect.value : "";
  log.outAt = fromDatetimeLocal(els.editOutAtInput.value) || log.outAt;
  log.inAt = type === "Tardy" ? log.outAt : fromDatetimeLocal(els.editInAtInput.value);
  log.periodId = els.editPeriodSelect.value || getPeriodForDate(log.outAt)?.id || "outside";
  log.note = type === "Restroom" || type === "Tardy" ? "" : els.editNoteInput.value.trim();
  log.returnNote = type === "Tardy" ? "" : els.editReturnNoteInput.value.trim();
  editingLogId = null;
  saveState();
  render();
}

function deleteLog(logId) {
  const log = getLog(logId);
  if (!log) return;
  if (!confirm(`Delete this ${log.type.toLowerCase()} entry for ${log.studentName}?`)) return;
  state.logs = state.logs.filter((item) => item.id !== logId);
  saveState();
  render();
}

function requestStudentPin(studentId, actionLabel, onSuccess) {
  const student = getStudent(studentId);
  if (!student) return;
  pendingPinAction = { studentId, onSuccess };
  els.pinDialogText.textContent = `${student.name}, enter your 4-digit PIN to ${actionLabel}.`;
  els.pinInput.value = "";
  els.pinError.textContent = student.pin ? "" : "PIN not set. Ask your teacher.";
  els.pinDialog.showModal();
}

function confirmStudentPin() {
  if (!pendingPinAction) return;
  const student = getStudent(pendingPinAction.studentId);
  if (!student || !student.pin) {
    els.pinError.textContent = "PIN not set. Ask your teacher.";
    els.pinInput.value = "";
    return;
  }
  if (els.pinInput.value !== student.pin) {
    els.pinError.textContent = "Incorrect PIN. Try again or ask your teacher.";
    els.pinInput.value = "";
    return;
  }
  const action = pendingPinAction.onSuccess;
  pendingPinAction = null;
  els.pinDialog.close("verified");
  action();
}

function openHallPassLimitDialog(action, studentId) {
  const student = getStudent(studentId);
  const period = getCurrentPeriod();
  const stats = getStudentPeriodStats(studentId, period.id);
  pendingHallPassLimit = { action, studentId };
  els.hallPassLimitText.textContent = `${student.name}, you have used all ${stats.hallPassLimit} hall passes for this 9 weeks. Please check with your teacher before leaving. With teacher approval, how should this be recorded?`;
  els.hallPassLimitDialog.showModal();
}

function isClassOutLimitReached(studentId) {
  const student = getStudent(studentId);
  if (!student) return false;
  const rules = getClassRules(student.classId);
  if (rules.maxStudentsOut <= 0) return false;
  return getOpenLogsForClass(student.classId).length >= rules.maxStudentsOut;
}

function openMaxOutApprovalDialog(action, studentId) {
  const student = getStudent(studentId);
  const rules = getStudentRules(studentId);
  const openCount = student ? getOpenLogsForClass(student.classId).length : 0;
  pendingMaxOutApproval = { action, studentId };
  els.maxOutDialogText.textContent = `${getClass(student?.classId)?.name || "This class"} already has ${openCount} student${openCount === 1 ? "" : "s"} signed out. The class limit is ${rules.maxStudentsOut}. Teacher approval is required before another sign-out.`;
  els.maxOutPasswordInput.value = "";
  els.maxOutPasswordError.textContent = "";
  els.maxOutDialog.showModal();
}

function continueAfterMaxOutApproval() {
  if (!pendingMaxOutApproval) return;
  if (!isTeacherPasswordConfigured()) {
    els.maxOutPasswordError.textContent = "Teacher password is not set. Set it in Setup first.";
    return;
  }
  if (els.maxOutPasswordInput.value.trim() !== state.settings.teacherPassword) {
    els.maxOutPasswordError.textContent = "Incorrect teacher password.";
    els.maxOutPasswordInput.value = "";
    return;
  }
  const { action, studentId } = pendingMaxOutApproval;
  pendingMaxOutApproval = null;
  els.maxOutDialog.close("approved");
  continueHallPassAction(action, studentId, { skipMaxOutCheck: true });
}

function startHallPassAction(action, studentId) {
  requestStudentPin(studentId, "use a hall pass", () => continueHallPassAction(action, studentId));
}

function continueHallPassAction(action, studentId, options = {}) {
  if (!options.skipMaxOutCheck && isClassOutLimitReached(studentId)) {
    openMaxOutApprovalDialog(action, studentId);
    return;
  }
  const period = getCurrentPeriod();
  const stats = getStudentPeriodStats(studentId, period.id);
  if (stats.hallPassLimit > 0 && stats.hallPassesUsed >= stats.hallPassLimit) {
    openHallPassLimitDialog(action, studentId);
    return;
  }
  if (action === "restroom") {
    saveAction("restroom", studentId);
    render();
  } else {
    openNoteDialog(action, studentId);
  }
}

function openNoteDialog(action, studentId, options = {}) {
  const student = getStudent(studentId);
  pendingAction = { action, studentId, options };
  if (action === "sign-in") {
    els.noteDialogTitle.textContent = "Sign back in";
    els.noteDialogText.textContent = `${student.name} is returning to class.`;
  } else if (action === "tardy") {
    els.noteDialogTitle.textContent = "Record tardy";
    els.noteDialogText.textContent = `${student.name} is being marked tardy. A pass will keep this from counting as a strike.`;
  } else {
    els.noteDialogTitle.textContent = action === "classroom" ? "Sign out to destination" : `Sign out to ${action}`;
    els.noteDialogText.textContent = `${student.name} is signing out.`;
  }
  els.destinationField.hidden = action !== "classroom";
  els.destinationSelect.innerHTML = state.settings.classroomOptions
    .map((option) => `<option value="${escapeHtml(option)}">${escapeHtml(option)}</option>`)
    .join("");
  els.tardyPassField.hidden = action !== "tardy";
  els.noteField.hidden = action === "restroom" || action === "tardy";
  const noPassOption = document.querySelector('input[name="tardyPassStatus"][value="No Pass"]');
  if (noPassOption) noPassOption.checked = true;
  els.noteInput.value = "";
  els.noteDialog.showModal();
}

function completePendingAction() {
  if (!pendingAction) return;

  const { action, studentId, options } = pendingAction;
  saveAction(action, studentId, options || {});
  pendingAction = null;
  render();
}

function saveAction(action, studentId, options = {}) {
  const student = getStudent(studentId);
  if (!student) return;

  const now = new Date().toISOString();
  const note = action === "restroom" || action === "tardy" ? "" : els.noteInput.value.trim();
  const period = getPeriodForDate(now) || getCurrentPeriod();
  const destination = action === "classroom" ? els.destinationSelect.value : "";
  const passStatusInput = document.querySelector('input[name="tardyPassStatus"]:checked');
  const actionType = action === "hall-pass-tardy" ? "Tardy" : action === "tardy" ? "Tardy" : action === "restroom" ? "Restroom" : "Classroom";
  const passStatus = actionType === "Tardy" ? options.passStatus || passStatusInput?.value || "No Pass" : "";
  const actionDestination = actionType === "Classroom" ? destination : "";
  const actionNote = options.note || note;

  if (action === "sign-in") {
    const openLog = getOpenLog(studentId);
    if (openLog) {
      openLog.inAt = now;
      openLog.returnNote = note;
    }
  } else {
    state.logs.unshift({
      id: makeId(),
      studentId,
      studentName: student.name,
      classId: student.classId,
      type: actionType,
      destination: actionDestination,
      passStatus,
      countsAsHallPass: actionType !== "Tardy",
      isExtraHallPass: Boolean(options.isExtraHallPass),
      outAt: now,
      inAt: actionType === "Tardy" ? now : "",
      periodId: period ? period.id : "outside",
      note: actionNote,
      hallPassChoice: options.hallPassChoice || "",
      returnNote: ""
    });
  }

  saveState();
}

function addStudent() {
  const name = els.studentNameInput.value.trim();
  if (!name) return;
  const classId = els.studentClassSelect.value || activeClassId;
  if (!addStudentToClass(name, classId)) {
    alert("That student is already in this class.");
    return;
  }
  state.students.sort((a, b) => a.name.localeCompare(b.name));
  activeClassId = classId;
  els.studentNameInput.value = "";
  saveState();
  render();
}

function updateStudentPin(studentId, pin) {
  const student = getStudent(studentId);
  if (!student) return;
  const cleanPin = pin.trim();
  if (cleanPin && !/^\d{4}$/.test(cleanPin)) {
    alert("Student PINs must be exactly 4 digits.");
    renderSetup();
    return;
  }
  student.pin = cleanPin;
  saveState();
  renderSetup();
}

function generatePin() {
  return String(Math.floor(Math.random() * 10000)).padStart(4, "0");
}

function generateMissingPins() {
  const visibleStudents = getStudentsForClass(activeClassId);
  const usedPins = new Set(state.students.map((student) => student.pin).filter(Boolean));
  let updated = 0;
  visibleStudents.forEach((student) => {
    if (student.pin) return;
    let pin = generatePin();
    let attempts = 0;
    while (usedPins.has(pin) && attempts < 50) {
      pin = generatePin();
      attempts += 1;
    }
    student.pin = pin;
    usedPins.add(pin);
    updated += 1;
  });
  saveState();
  renderSetup();
  alert(`Generated PINs for ${updated} student${updated === 1 ? "" : "s"}.`);
}

function removeStudent(studentId) {
  const student = getStudent(studentId);
  if (!student) return;
  const hasLogs = state.logs.some((log) => log.studentId === studentId);
  const message = hasLogs
    ? `${student.name} has log history. Remove them from the active roster but keep their past entries?`
    : `Remove ${student.name} from the roster?`;
  if (!confirm(message)) return;
  state.students = state.students.filter((item) => item.id !== studentId);
  if (selectedStudentId === studentId) selectedStudentId = null;
  saveState();
  render();
}

function saveSettings() {
  const teacherPassword = els.teacherPasswordInput.value.trim();
  saveSchoolYearSettings(false);
  state.settings.teacherPassword = teacherPassword;
  state.settings.teacherPasswordConfigured = Boolean(teacherPassword);
  saveState();
  render();
}

function saveSchoolYearSettings(showAlert = true) {
  const periods = state.settings.periods.map((period) => ({
    ...period,
    start: document.getElementById(`${period.id}-start`).value,
    end: document.getElementById(`${period.id}-end`).value
  }));

  state.settings = {
    ...state.settings,
    schoolYear: els.schoolYearInput.value.trim() || "School Year",
    periods
  };
  saveState();
  render();
  if (showAlert) alert("School year settings saved.");
}

function saveClassRules() {
  const classId = els.ruleClassSelect.value || activeRuleClassId || activeClassId;
  const classItem = getClass(classId);
  if (!classItem) return;
  classItem.rules = normalizeClassRules({
    hallPassLimit: els.thresholdInput.value,
    lunchDetentionStrikes: els.lunchDetentionStrikesInput.value,
    maxStudentsOut: els.maxStudentsOutInput.value
  });
  activeRuleClassId = classId;
  saveState();
  render();
  alert(`Rules saved for ${classItem.name}.`);
}

function renderStudentStation() {
  ensureActiveClass();
  els.todayPill.textContent = new Date().toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric"
  });

  els.studentClassTabs.innerHTML = state.classes.map((classItem) => `
    <button class="class-tab ${classItem.id === activeClassId ? "active" : ""}" data-class-tab="${classItem.id}" type="button">
      ${escapeHtml(classItem.name)}
    </button>
  `).join("");

  const visibleStudents = getStudentsForClass(activeClassId);
  if (!visibleStudents.length) {
    els.studentGrid.innerHTML = `<p class="no-data">Add students to ${escapeHtml(getClass(activeClassId)?.name || "this class")} in Setup to begin.</p>`;
    selectedStudentId = null;
  } else {
    els.studentGrid.innerHTML = visibleStudents
      .map((student) => {
        const openLog = getOpenLog(student.id);
        const status = openLog ? `Signed out: ${getSignOutLabel(openLog)}` : "Ready";
        const classes = [
          "student-card",
          selectedStudentId === student.id ? "active" : "",
          openLog ? "signed-out" : ""
        ].join(" ");
        return `
          <button class="${classes}" data-select-student="${student.id}" type="button">
            <strong>${escapeHtml(student.name)}</strong>
            <span>${escapeHtml(status)}</span>
          </button>
        `;
      })
      .join("");
  }

  renderStudentCurrentOutList();
  renderActionPanel();
}

function renderStudentCurrentOutList() {
  const openLogs = getOpenLogsForClass(activeClassId);
  els.studentOutCount.textContent = openLogs.length;
  els.studentCurrentOutList.innerHTML = openLogs.length
    ? openLogs.map((log) => `
        <div class="current-row">
          <div>
            <strong>${escapeHtml(log.studentName)}</strong>
            <span>${escapeHtml(getSignOutLabel(log))} since ${formatDateTime(log.outAt)}</span>
          </div>
        </div>
      `).join("")
    : `<p class="no-data">No students are currently signed out.</p>`;
}

function renderActionPanel() {
  const student = getStudent(selectedStudentId);
  if (!student) {
    els.actionPanel.innerHTML = `
      <div class="empty-state">
        <h2>No student selected</h2>
        <p>Select a student to sign out, sign back in, or record a tardy.</p>
      </div>
    `;
    return;
  }

  const openLog = getOpenLog(student.id);
  const currentPeriod = getCurrentPeriod();
  const stats = getStudentPeriodStats(student.id, currentPeriod.id);
  const hallPassWarning = getHallPassWarningMessage(stats.hallPassesUsed, stats.hallPassLimit);
  const tardyWarning = getTardyStrikeMessage(stats.tardyStrikes, stats.lunchDetentionStrikes);
  const summaryHtml = `
    <div class="student-summary">
      <div><strong>Hall passes used this 9 weeks:</strong> ${stats.hallPassLimit > 0 ? `${stats.hallPassesUsed} / ${stats.hallPassLimit}` : `${stats.hallPassesUsed} / No limit`}</div>
      <div><strong>Hall passes remaining:</strong> ${stats.hallPassesRemaining}</div>
      <div><strong>Tardy strikes this 9 weeks:</strong> ${stats.tardyStrikes} / ${stats.lunchDetentionStrikes}</div>
      ${hallPassWarning ? `<p>${escapeHtml(hallPassWarning)}</p>` : ""}
      ${tardyWarning ? `<p>${escapeHtml(tardyWarning)}</p>` : ""}
    </div>
  `;
  if (openLog) {
    els.actionPanel.innerHTML = `
      <p class="eyebrow">Selected Student</p>
      <h2 class="selected-name">${escapeHtml(student.name)}</h2>
      <p class="muted">Currently signed out for ${escapeHtml(getSignOutLabel(openLog))} since ${formatDateTime(openLog.outAt)}.</p>
      ${summaryHtml}
      <div class="action-stack">
        <button class="big-action sign-in" data-action="sign-in" type="button">Sign Back In</button>
      </div>
    `;
    return;
  }

  els.actionPanel.innerHTML = `
    <p class="eyebrow">Selected Student</p>
    <h2 class="selected-name">${escapeHtml(student.name)}</h2>
    ${summaryHtml}
    <div class="action-stack">
      <button class="big-action restroom" data-action="restroom" type="button">Hall Pass: Restroom</button>
      <button class="big-action classroom" data-action="classroom" type="button">Hall Pass: Other Destination</button>
      <button class="big-action tardy" data-action="tardy" type="button">Record Tardy</button>
    </div>
  `;
}

function renderTeacherDashboard() {
  ensureActiveClass();
  const currentPeriod = getCurrentPeriod();
  const selectedPeriodId = els.periodFilter.value || currentPeriod.id;
  const filterClassIds = new Set(["all", ...state.classes.map((classItem) => classItem.id)]);
  const selectedClassId = filterClassIds.has(els.dashboardClassFilter.value) ? els.dashboardClassFilter.value : "all";
  const selectedLogClassId = filterClassIds.has(els.logClassFilter.value) ? els.logClassFilter.value : "all";

  const classOptions = [
    `<option value="all">All classes</option>`,
    ...state.classes.map((classItem) => `<option value="${classItem.id}">${escapeHtml(classItem.name)}</option>`)
  ].join("");
  els.dashboardClassFilter.innerHTML = classOptions;
  els.logClassFilter.innerHTML = classOptions;
  els.dashboardClassFilter.value = selectedClassId;
  els.logClassFilter.value = selectedLogClassId;

  els.periodFilter.innerHTML = state.settings.periods
    .map((period) => `<option value="${period.id}">${period.name}</option>`)
    .join("");
  els.periodFilter.value = selectedPeriodId;

  const period = getPeriodById(selectedPeriodId) || currentPeriod;
  const dashboardStudents = state.students.filter((student) => selectedClassId === "all" || student.classId === selectedClassId);
  const summaries = dashboardStudents.map((student) => {
    const stats = getStudentPeriodStats(student.id, period.id);
    return {
      student,
      ...stats
    };
  }).sort((a, b) => b.tardyStrikes - a.tardyStrikes || b.extraHallPasses - a.extraHallPasses || b.hallPassesUsed - a.hallPassesUsed || b.tardies - a.tardies || a.student.name.localeCompare(b.student.name));

  const watchItems = summaries.filter((item) => item.hallPassesUsed > 0 || item.tardies > 0);
  els.watchlist.innerHTML = watchItems.length
    ? watchItems.map((item) => {
        const hasHallPassLimit = item.hallPassLimit > 0;
        const detention = item.tardyStrikes >= item.lunchDetentionStrikes;
        const extraHallPass = item.extraHallPasses > 0;
        const closeToDetention = item.tardyStrikes === item.lunchDetentionStrikes - 1;
        const flagged = detention || extraHallPass;
        const warning = !flagged && ((hasHallPassLimit && item.hallPassesUsed >= item.hallPassLimit - 1) || closeToDetention);
        const className = flagged ? "flagged" : warning ? "warning" : "";
        const hallPassStatus = item.hallPassesUsed >= item.hallPassLimit ? "Hall pass limit" : "Low hall passes";
        const status = detention ? "Lunch detention" : extraHallPass ? "Extra hall pass" : closeToDetention ? "Close to detention" : warning ? hallPassStatus : "OK";
        const hallPassSummary = hasHallPassLimit ? `${item.hallPassesUsed}/${item.hallPassLimit}` : `${item.hallPassesUsed}/No limit`;
        return `
          <div class="summary-row ${className}">
            <div>
              <strong>${escapeHtml(item.student.name)}</strong>
              <span>${hallPassSummary} hall passes used, ${item.extraHallPasses} extra, ${item.hallPassesRemaining} remaining, ${item.tardyStrikes}/${item.lunchDetentionStrikes} tardy strikes during ${escapeHtml(period.name)}${selectedClassId === "all" ? `, ${escapeHtml(getClass(item.student.classId)?.name || "Class")}` : ""}</span>
            </div>
            <span class="status-pill">${status}</span>
          </div>
        `;
      }).join("")
    : `<p class="no-data">No entries for ${escapeHtml(period.name)} yet.</p>`;

  const openLogs = state.logs.filter((log) => log.type !== "Tardy" && !log.inAt && (selectedClassId === "all" || log.classId === selectedClassId));
  els.outCount.textContent = openLogs.length;
  els.currentOutList.innerHTML = openLogs.length
    ? openLogs.map((log) => `
        <div class="current-row">
          <div>
            <strong>${escapeHtml(log.studentName)}</strong>
            <span>${escapeHtml(getSignOutLabel(log))} since ${formatDateTime(log.outAt)}${selectedClassId === "all" ? `, ${escapeHtml(getClass(log.classId)?.name || "Class")}` : ""}</span>
          </div>
          <button class="secondary" data-quick-sign-in="${log.studentId}" type="button">Sign In</button>
        </div>
      `).join("")
    : `<p class="no-data">No students are currently signed out.</p>`;

  renderLogTable();
}

function renderLogTable() {
  const type = els.typeFilter.value || "all";
  const classId = els.logClassFilter.value || "all";
  const logs = state.logs.filter((log) => (type === "all" || log.type === type) && (classId === "all" || log.classId === classId));

  els.logTable.innerHTML = logs.length
    ? logs.map((log) => {
        const period = getPeriodById(log.periodId);
        const note = [log.destination, log.hallPassChoice, log.passStatus, isTardyStrike(log) ? "Strike" : "", log.note, log.returnNote].filter(Boolean).join(" / ");
        return `
          <tr>
            <td>${escapeHtml(log.studentName)}</td>
            <td>${escapeHtml(getClass(log.classId)?.name || "Class")}</td>
            <td>${escapeHtml(getTypeLabel(log.type))}</td>
            <td>${escapeHtml(getLogStatus(log))}</td>
            <td>${formatDateTime(log.outAt)}</td>
            <td>${formatDateTime(log.inAt)}</td>
            <td>${getMinutes(log)}</td>
            <td>${period ? escapeHtml(period.name) : "Outside dates"}</td>
            <td>${escapeHtml(note)}</td>
            <td>
              <div class="table-actions">
                <button class="secondary small-button" data-edit-log="${log.id}" type="button">Edit</button>
                <button class="danger small-button" data-delete-log="${log.id}" type="button">Delete</button>
              </div>
            </td>
          </tr>
        `;
      }).join("")
    : `<tr><td colspan="10">No entries yet.</td></tr>`;
}

function renderSetup() {
  ensureActiveClass();
  document.querySelectorAll("[data-setup-tab]").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.setupTab === activeSetupTab);
  });
  document.querySelectorAll("[data-setup-section]").forEach((section) => {
    section.classList.toggle("active", section.dataset.setupSection === activeSetupTab);
  });

  els.schoolYearInput.value = state.settings.schoolYear;
  els.teacherPasswordInput.value = state.settings.teacherPassword || "";
  const classOptions = state.classes
    .map((classItem) => `<option value="${classItem.id}">${escapeHtml(classItem.name)}</option>`)
    .join("");
  els.bulkClassSelect.innerHTML = classOptions;
  els.studentClassSelect.innerHTML = classOptions;
  els.ruleClassSelect.innerHTML = classOptions;
  els.bulkClassSelect.value = activeClassId;
  els.studentClassSelect.value = activeClassId;
  els.ruleClassSelect.value = activeRuleClassId;
  const activeRules = getClassRules(activeRuleClassId);
  els.thresholdInput.value = activeRules.hallPassLimit;
  els.lunchDetentionStrikesInput.value = activeRules.lunchDetentionStrikes;
  els.maxStudentsOutInput.value = activeRules.maxStudentsOut;

  els.classList.innerHTML = state.classes.map((classItem) => {
    const count = getStudentsForClass(classItem.id).length;
    const rules = getClassRules(classItem.id);
    const hallPassRuleText = rules.hallPassLimit > 0 ? `${rules.hallPassLimit} hall passes` : "No hall pass limit";
    const maxOutText = rules.maxStudentsOut > 0 ? `${rules.maxStudentsOut} out max` : "No out max";
    return `
      <div class="student-row">
        <div>
          <strong>${escapeHtml(classItem.name)}</strong>
          <span>${count} student${count === 1 ? "" : "s"} - ${hallPassRuleText} - ${maxOutText} - detention at ${rules.lunchDetentionStrikes} tardy strike${rules.lunchDetentionStrikes === 1 ? "" : "s"}</span>
        </div>
        <div class="row-actions">
          <button class="secondary" data-set-active-class="${classItem.id}" type="button">View</button>
          <button class="secondary" data-edit-class-rules="${classItem.id}" type="button">Rules</button>
          <button class="danger" data-remove-class="${classItem.id}" type="button">Delete</button>
        </div>
      </div>
    `;
  }).join("");

  const visibleStudents = getStudentsForClass(activeClassId);
  const missingPins = visibleStudents.filter((student) => !student.pin).length;
  els.studentList.innerHTML = visibleStudents.length
    ? `
        <div class="list-toolbar">
          <span>${missingPins} student${missingPins === 1 ? "" : "s"} without a PIN in ${escapeHtml(getClass(activeClassId)?.name || "this class")}</span>
          <button class="secondary" data-generate-missing-pins type="button">Generate Missing PINs</button>
        </div>
        ${visibleStudents.map((student) => `
        <div class="student-row">
          <div>
            <strong>${escapeHtml(student.name)}</strong>
            <span>${state.logs.filter((log) => log.studentId === student.id).length} saved entries - PIN ${student.pin ? "set" : "not set"}</span>
            <label class="pin-edit-label">
              Student PIN
              <input data-student-pin="${student.id}" type="text" inputmode="numeric" maxlength="4" value="${escapeHtml(student.pin || "")}" placeholder="4 digits">
            </label>
          </div>
          <button class="danger" data-remove-student="${student.id}" type="button">Remove</button>
        </div>
      `).join("")}
      `
    : `<p class="no-data">No students have been added to ${escapeHtml(getClass(activeClassId)?.name || "this class")} yet.</p>`;

  els.periodEditor.innerHTML = state.settings.periods.map((period) => `
    <div class="period-row">
      <strong>${escapeHtml(period.name)}</strong>
      <label>
        Start
        <input id="${period.id}-start" type="date" value="${period.start}">
      </label>
      <label>
        End
        <input id="${period.id}-end" type="date" value="${period.end}">
      </label>
    </div>
  `).join("");

  els.classroomOptionList.innerHTML = state.settings.classroomOptions.map((option) => `
    <div class="option-row">
      <strong>${escapeHtml(option)}</strong>
      <button class="danger" data-remove-classroom-option="${escapeHtml(option)}" type="button">Remove</button>
    </div>
  `).join("");
}

function render() {
  renderStudentStation();
  renderTeacherDashboard();
  renderSetup();
}

function exportCsv() {
  const rows = [
    ["Student", "Class", "Type", "Status", "Out or Arrival", "In", "Minutes", "9 Weeks", "Note"]
  ];

  state.logs.forEach((log) => {
    const period = getPeriodById(log.periodId);
    rows.push([
      log.studentName,
      getClass(log.classId)?.name || "Class",
      getTypeLabel(log.type),
      getLogStatus(log),
      formatDateTime(log.outAt),
      formatDateTime(log.inAt),
      getMinutes(log),
      period ? period.name : "Outside dates",
      [log.destination, log.hallPassChoice, log.passStatus, isTardyStrike(log) ? "Strike" : "", log.note, log.returnNote].filter(Boolean).join(" / ")
    ]);
  });

  downloadFile(
    `classroom-signout-${state.settings.schoolYear}.csv`,
    rows.map((row) => row.map(csvCell).join(",")).join("\n"),
    "text/csv"
  );
}

function exportBackup() {
  downloadFile(
    `classroom-signout-backup-${state.settings.schoolYear}.json`,
    JSON.stringify(state, null, 2),
    "application/json"
  );
}

function restoreBackup(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const incoming = JSON.parse(reader.result);
      if (!Array.isArray(incoming.students) || !Array.isArray(incoming.logs) || !incoming.settings) {
        throw new Error("Invalid backup file");
      }
      state = normalizeState(incoming);
      selectedStudentId = null;
      ensureActiveClass();
      saveState();
      render();
      alert("Backup imported.");
    } catch {
      alert("That backup file could not be imported.");
    }
  };
  reader.readAsText(file);
}

function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function csvCell(value) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function clickOnEnter(event, action) {
  if (event.key !== "Enter" || event.shiftKey || event.ctrlKey || event.altKey) return;
  event.preventDefault();
  action();
}

function clickFocusedButtonOnEnter(event) {
  if (event.key !== "Enter" || event.shiftKey || event.ctrlKey || event.altKey) return false;
  const target = event.target;
  if (!(target instanceof HTMLElement)) return false;
  if (target.matches("input, textarea, select")) return false;
  const clickTarget = target.closest('button, [role="button"], .file-button');
  if (!clickTarget || clickTarget.getAttribute("aria-disabled") === "true" || clickTarget.disabled) return false;
  event.preventDefault();
  clickTarget.click();
  return true;
}

document.addEventListener("click", (event) => {
  const setupTab = event.target.closest("[data-setup-tab]");
  if (setupTab) {
    activeSetupTab = setupTab.dataset.setupTab;
    renderSetup();
    return;
  }

  const classTab = event.target.closest("[data-class-tab]");
  if (classTab) {
    activeClassId = classTab.dataset.classTab;
    selectedStudentId = null;
    render();
    return;
  }

  const activeClassButton = event.target.closest("[data-set-active-class]");
  if (activeClassButton) {
    activeClassId = activeClassButton.dataset.setActiveClass;
    selectedStudentId = null;
    activeSetupTab = "students";
    render();
    return;
  }

  const editRulesButton = event.target.closest("[data-edit-class-rules]");
  if (editRulesButton) {
    activeRuleClassId = editRulesButton.dataset.editClassRules;
    activeSetupTab = "rules";
    render();
    return;
  }

  const removeClassButton = event.target.closest("[data-remove-class]");
  if (removeClassButton) {
    removeClass(removeClassButton.dataset.removeClass);
    return;
  }

  const removeOptionButton = event.target.closest("[data-remove-classroom-option]");
  if (removeOptionButton) {
    removeClassroomOption(removeOptionButton.dataset.removeClassroomOption);
    return;
  }

  const generatePinsButton = event.target.closest("[data-generate-missing-pins]");
  if (generatePinsButton) {
    generateMissingPins();
    return;
  }

  const editLogButton = event.target.closest("[data-edit-log]");
  if (editLogButton) {
    openEditLogDialog(editLogButton.dataset.editLog);
    return;
  }

  const deleteLogButton = event.target.closest("[data-delete-log]");
  if (deleteLogButton) {
    deleteLog(deleteLogButton.dataset.deleteLog);
    return;
  }

  const studentButton = event.target.closest("[data-select-student]");
  if (studentButton) {
    selectedStudentId = studentButton.dataset.selectStudent;
    renderStudentStation();
    return;
  }

  const actionButton = event.target.closest("[data-action]");
  if (actionButton && selectedStudentId) {
    const action = actionButton.dataset.action;
    if (action === "restroom" || action === "classroom") {
      startHallPassAction(action, selectedStudentId);
    } else if (action === "sign-in") {
      requestStudentPin(selectedStudentId, "sign back in", () => openNoteDialog(action, selectedStudentId));
    } else {
      requestStudentPin(selectedStudentId, "record a tardy", () => openNoteDialog(action, selectedStudentId));
    }
    return;
  }

  const quickSignInButton = event.target.closest("[data-quick-sign-in]");
  if (quickSignInButton) {
    selectedStudentId = quickSignInButton.dataset.quickSignIn;
    requestStudentPin(selectedStudentId, "sign back in", () => openNoteDialog("sign-in", selectedStudentId));
    return;
  }

  const removeButton = event.target.closest("[data-remove-student]");
  if (removeButton) {
    removeStudent(removeButton.dataset.removeStudent);
  }
});

document.addEventListener("change", (event) => {
  const pinInput = event.target.closest("[data-student-pin]");
  if (pinInput) updateStudentPin(pinInput.dataset.studentPin, pinInput.value);
});

document.addEventListener("keydown", (event) => {
  if (clickFocusedButtonOnEnter(event)) return;

  const pinInput = event.target.closest("[data-student-pin]");
  if (pinInput) {
    clickOnEnter(event, () => {
      updateStudentPin(pinInput.dataset.studentPin, pinInput.value);
      pinInput.blur();
    });
    return;
  }

  if (event.target?.id?.endsWith("-start") || event.target?.id?.endsWith("-end")) {
    clickOnEnter(event, () => saveSchoolYearSettings(true));
  }
});

els.tabs.forEach((tab) => tab.addEventListener("click", () => switchView(tab.dataset.view)));
els.dashboardClassFilter.addEventListener("change", renderTeacherDashboard);
els.periodFilter.addEventListener("change", renderTeacherDashboard);
els.logClassFilter.addEventListener("change", renderLogTable);
els.typeFilter.addEventListener("change", renderLogTable);
els.downloadCsvBtn.addEventListener("click", exportCsv);
els.backupBtn.addEventListener("click", exportBackup);
els.addClassBtn.addEventListener("click", addClass);
els.classNameInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") addClass();
});
els.importStudentsBtn.addEventListener("click", importBulkStudents);
els.bulkClassSelect.addEventListener("change", () => {
  activeClassId = els.bulkClassSelect.value;
  selectedStudentId = null;
  renderSetup();
});
els.addClassroomOptionBtn.addEventListener("click", addClassroomOption);
els.classroomOptionInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") addClassroomOption();
});
els.addStudentBtn.addEventListener("click", addStudent);
els.studentClassSelect.addEventListener("change", () => {
  activeClassId = els.studentClassSelect.value;
  selectedStudentId = null;
  renderSetup();
});
els.studentNameInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") addStudent();
});
els.saveSettingsBtn.addEventListener("click", saveSettings);
els.saveClassRulesBtn.addEventListener("click", saveClassRules);
els.saveSchoolYearBtn.addEventListener("click", () => saveSchoolYearSettings(true));
els.thresholdInput.addEventListener("keydown", (event) => clickOnEnter(event, saveClassRules));
els.lunchDetentionStrikesInput.addEventListener("keydown", (event) => clickOnEnter(event, saveClassRules));
els.maxStudentsOutInput.addEventListener("keydown", (event) => clickOnEnter(event, saveClassRules));
els.teacherPasswordInput.addEventListener("keydown", (event) => clickOnEnter(event, saveSettings));
els.schoolYearInput.addEventListener("keydown", (event) => clickOnEnter(event, () => saveSchoolYearSettings(true)));
els.ruleClassSelect.addEventListener("change", () => {
  activeRuleClassId = els.ruleClassSelect.value;
  renderSetup();
});
els.restoreFile.addEventListener("change", (event) => {
  const [file] = event.target.files;
  if (file) restoreBackup(file);
  event.target.value = "";
});
els.noteDialog.addEventListener("close", () => {
  if (els.noteDialog.returnValue === "confirm") completePendingAction();
  pendingAction = null;
});
els.pinDialog.querySelector("form").addEventListener("submit", (event) => {
  if (!event.submitter || event.submitter.value === "confirm") {
    event.preventDefault();
    confirmStudentPin();
    return;
  }
  pendingPinAction = null;
});
els.pinInput.addEventListener("input", () => {
  els.pinInput.value = els.pinInput.value.replace(/\D/g, "").slice(0, 4);
  els.pinError.textContent = "";
});
els.maxOutDialog.querySelector("form").addEventListener("submit", (event) => {
  if (!event.submitter || event.submitter.value === "approve") {
    event.preventDefault();
    continueAfterMaxOutApproval();
    return;
  }
  pendingMaxOutApproval = null;
});
els.maxOutPasswordInput.addEventListener("input", () => {
  els.maxOutPasswordError.textContent = "";
});
els.teacherPasswordDialog.querySelector("form").addEventListener("submit", (event) => {
  if (!event.submitter || event.submitter.value === "confirm") {
    event.preventDefault();
    unlockTeacherView();
    return;
  }
  pendingTeacherView = null;
  showView("student");
});
els.teacherPasswordEntry.addEventListener("input", () => {
  els.teacherPasswordError.textContent = "";
});
els.hallPassLimitDialog.addEventListener("close", () => {
  if (!pendingHallPassLimit) return;
  const { action, studentId } = pendingHallPassLimit;
  const choice = els.hallPassLimitDialog.returnValue;
  pendingHallPassLimit = null;
  if (choice === "extra") {
    if (action === "restroom") {
      saveAction("restroom", studentId, { hallPassChoice: "Extra hall pass", isExtraHallPass: true });
      render();
    } else {
      openNoteDialog(action, studentId, { hallPassChoice: "Extra hall pass", isExtraHallPass: true });
    }
  } else if (choice === "tardy") {
    requestStudentPin(studentId, "count this as a tardy strike", () => {
      saveAction("hall-pass-tardy", studentId, {
        passStatus: "No Pass",
        note: "Counted as tardy after hall pass limit",
        hallPassChoice: "Count as tardy"
      });
      render();
    });
  }
});
els.editTypeSelect.addEventListener("change", renderEditLogFields);
els.editLogDialog.addEventListener("close", () => {
  if (els.editLogDialog.returnValue === "save") saveEditedLog();
  editingLogId = null;
});

render();
