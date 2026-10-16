// Run with: node tests/reports.test.cjs
const fs = require("node:fs");
const path = require("node:path");
const app = fs.readFileSync(path.join(__dirname, "../app.js"), "utf8");
const reportSource = fs.readFileSync(path.join(__dirname, "../student-report.js"), "utf8");
function assert(value, message) { if (!value) throw new Error(message); }
const authSource = app.slice(app.indexOf("function isTeacherPasswordConfigured()"), app.indexOf("function updateTeacherPasswordEntry("));
function scenario(options = {}) {
  const handlers = {};
  let html = "", notice = "", printed = false, printHandler;
  const logs = [
    {studentId:"a",studentName:"Alice",classId:"c",periodId:"q",type:"Restroom",outAt:"2026-10-01",note:"ALICE <script>bad</script>"},
    {studentId:"b",studentName:"Bob",classId:"c",periodId:"q",type:"Tardy",outAt:"2026-10-02",note:"BOB_ENTRY"},
    {studentId:"z",studentName:"Zed",classId:"other",periodId:"q",type:"Restroom",outAt:"2026-10-01",note:"OTHER_CLASS"}
  ];
  const state = {students:[{id:"a",name:"Alice"},{id:"b",name:"Bob"}], logs,
    settings:{schoolYear:"2026",teacherPassword:"1234",teacherPasswordConfigured:true}};
  const dialog = {open:false,close(){this.open=false;},showModal(){this.open=true;},querySelector(){return null;}};
  const els = {teacherPasswordDialog:dialog,teacherPasswordEntry:{value:"1234"},
    teacherPasswordError:{},teacherPasswordDialogTitle:{},teacherPasswordDialogText:{},teacherPasswordSubmitBtn:{},
    tabs:[],views:{},
    ...Object.fromEntries(Object.entries({logStudentFilter:options.student || "a",logClassFilter:options.classId || "c",
      logPeriodFilter:options.period || "all",typeFilter:options.type || "all",logStudentSearch:options.search || ""})
      .map(([k,value])=>[k,{value}]))};
  const report = {document:{write(s){html=s;},close(){},getElementById(){return {addEventListener(_,fn){printHandler=fn;}};}},
    focus(){},print(){printed=true;}};
  const document = {getElementById(id){return {addEventListener(_,fn){handlers[id]=fn;}};}};
  const window = {open(){return options.popupBlocked ? null : report;}};
  const e = s => String(s).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
  const execute = new Function("state","els","document","window","alert","escapeHtml","getClass","getTypeLabel",
    "getLogStatus","formatDateTime","getMinutes","getPeriodById","isTardyStrike","options","handlers","assert",
    `let teacherUnlocked=false, activeViewName="student", pendingTeacherView="teacher";
     function render() {} function saveState() {} function requestAnimationFrame(fn) { fn(); }
     ${authSource}
     ${reportSource}
     if (options.createPassword) state.settings.teacherPasswordConfigured=false;
     if (!options.locked) unlockTeacherView();
     if (!options.locked) {
       assert(activeViewName==="teacher", "Real unlock flow did not open dashboard");
       assert(teacherUnlocked===false, "Test must reproduce consumed unlock flag");
     }
     if (options.leave) showView("student");
     if (options.dialog) els.teacherPasswordDialog.open=true;
     const before=JSON.stringify(state);
     handlers[options.classReport ? "printClassReportBtn" : "printStudentReportBtn"]();
     assert(JSON.stringify(state)===before, "Report mutated stored data");
     return {activeViewName};
    `);
  execute(state,els,document,window,s=>notice=s,e,id=>id==="c"?{name:"Biology"}:id==="other"?{name:"Other"}:null,
    s=>s,()=>"Status",s=>s||"",()=>"",()=>({name:"Quarter"}),log=>log.type==="Tardy",options,handlers,assert);
  if(printHandler) {printHandler();assert(printed,"Print button failed");}
  assert(!html.includes("OTHER_CLASS"),"Leaked another class");
  assert(!html.includes("<script>bad</script>"),"Unescaped record");
  return {html,notice};
}
let result=scenario();
assert(result.html.includes("ALICE")&&!result.html.includes("BOB_ENTRY"),"Student regression");
assert(scenario({createPassword:true}).html.includes("ALICE"),"First password setup");
for(const options of [{locked:true},{leave:true},{dialog:true},{student:"all"},{popupBlocked:true}]) {
  result=scenario(options);assert(result.notice&&!result.html,"Expected guarded report");
}
result=scenario({classReport:true,search:"nonmatching",student:"a"});
assert(result.html.includes("ALICE")&&result.html.includes("BOB_ENTRY")&&result.html.includes("<th>Student</th>"),"Full class report");
assert(scenario({classReport:true,student:"all"}).html.includes("BOB_ENTRY"),"Class without selected student");
for(const classId of ["all","missing"]) {
  result=scenario({classReport:true,classId});assert(result.notice&&!result.html,"Require valid class");
}
result=scenario({classReport:true,type:"Tardy"});
assert(result.html.includes("BOB_ENTRY")&&!result.html.includes("ALICE"),"Type filter");
for(const classReport of [false,true]) {
  result=scenario({classReport,period:"none"});
  assert(result.html.includes("No entries match"),"Empty period report");
}
assert(scenario({search:"missing"}).html.includes("No entries match"),"Student name search");
console.log("15 report scenarios passed, including real unlock flow, scope, filters, escaping and no mutation.");
