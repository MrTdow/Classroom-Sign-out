// Read-only reporting, loaded after app.js.
(() => {
  function printReport(scope) {
    const isClassReport = scope === "class";
    // showView consumes the one-use unlock flag after displaying a protected view.
    // Only the authenticated teacher dashboard can launch reports.
    if (activeViewName !== "teacher" || els.teacherPasswordDialog.open) {
      alert("Unlock the Teacher Dashboard first.");
      return;
    }
    const student = state.students.find(item => item.id === els.logStudentFilter.value);
    if (!isClassReport && !student) {
      alert("Select one student from the All students dropdown before printing.");
      return;
    }
    const classId = els.logClassFilter.value || "all";
    if (isClassReport && (classId === "all" || !getClass(classId))) {
      alert("Select one class in the Year Log class dropdown before printing.");
      return;
    }
    const periodId = els.logPeriodFilter.value || "all";
    const type = els.typeFilter.value || "all";
    const search = isClassReport ? "" : els.logStudentSearch.value.trim().toLowerCase();
    const logs = state.logs.filter(log =>
      (isClassReport || log.studentId === student.id) &&
      (classId === "all" || log.classId === classId) &&
      (periodId === "all" || log.periodId === periodId) &&
      (type === "all" || log.type === type) &&
      (!search || log.studentName.toLowerCase().includes(search))
    ).slice().sort((a, b) => new Date(a.outAt) - new Date(b.outAt));
    const e = value => escapeHtml(String(value ?? ""));
    const rows = logs.map(log => {
      const note = [log.destination, log.hallPassChoice, log.passStatus,
        isTardyStrike(log) ? "Strike" : "", log.note, log.returnNote].filter(Boolean).join(" / ");
      return "<tr>" + [
        ...(isClassReport ? [log.studentName] : []),
        getClass(log.classId)?.name || "Class", getTypeLabel(log.type),
        getLogStatus(log), formatDateTime(log.outAt), formatDateTime(log.inAt),
        getMinutes(log), getPeriodById(log.periodId)?.name || "Outside dates", note
      ].map(value => "<td>" + e(value) + "</td>").join("") + "</tr>";
    }).join("");
    const report = window.open("", "_blank");
    if (!report) {
      alert("Allow pop-ups for this app, then click the report button again.");
      return;
    }
    const periodLabel = periodId === "all" ? "All 9 weeks" : getPeriodById(periodId)?.name || periodId;
    const classLabel = classId === "all" ? "All classes" : getClass(classId)?.name || "Class";
    const reportName = isClassReport ? classLabel : student.name;
    const reportTitle = isClassReport ? "Class Sign-Out Report" : "Student Sign-Out Report";
    report.document.write(`<!doctype html><html lang="en"><head><meta charset="utf-8">
      <title>${e(reportName)} — ${e(reportTitle)}</title>
      <style>
        @page { size: landscape; margin: 12mm; }
        * { box-sizing: border-box; }
        body { font: 12px Arial, sans-serif; color: #172033; margin: 24px; }
        h1 { font-size: 24px; margin-bottom: 6px; }
        h2 { font-size: 18px; margin: 0 0 12px; }
        p { line-height: 1.5; }
        table { border-collapse: collapse; width: 100%; table-layout: fixed; }
        th, td { border: 1px solid #b7bec8; text-align: left; vertical-align: top;
          padding: 7px; overflow-wrap: anywhere; }
        th { background: #edf1f5; }
        thead { display: table-header-group; }
        tr { break-inside: avoid; }
        th:last-child { width: 23%; }
        button { padding: 10px 16px; cursor: pointer; }
        .toolbar { margin-bottom: 24px; }
        @media print { body { margin: 0; } .toolbar { display: none; } }
      </style></head><body>
      <div class="toolbar"><button id="printReport" type="button">Print / Save as PDF</button>
      <p>This report is a snapshot. Close this tab when finished.</p></div>
      <h1>${e(reportTitle)}</h1><h2>${e(reportName)}</h2>
      <p>School year: ${e(state.settings.schoolYear)}<br>
      ${e(classLabel)} · ${e(periodLabel)} · ${e(type === "all" ? "All types" : getTypeLabel(type))}
      ${search ? "<br>Name search: " + e(els.logStudentSearch.value.trim()) : ""}<br>
      Generated: ${e(new Date().toLocaleString())}</p>
      ${isClassReport ? "<p>Includes all students in the selected class; student selection and name search are not applied.</p>" : ""}
      <p><strong>${logs.length} matching entries</strong></p>
      <table><thead><tr>${isClassReport ? "<th>Student</th>" : ""}<th>Class</th><th>Type</th><th>Status</th><th>Out / Arrival</th>
      <th>In</th><th>Minutes</th><th>9 Weeks</th><th>Destination / Notes</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="' + (isClassReport ? 9 : 8) + '">No entries match the selected filters.</td></tr>'}</tbody></table>
      <p>Minutes are shown for completed trips; open trips have no final duration.</p>
      </body></html>`);
    report.document.close();
    report.document.getElementById("printReport").addEventListener("click", () => {
      report.focus();
      report.print();
    });
    report.opener = null;
    report.focus();
  }
  document.getElementById("printStudentReportBtn").addEventListener("click", () => printReport("student"));
  document.getElementById("printClassReportBtn").addEventListener("click", () => printReport("class"));
})();
