/* Original TeacherBuddy workflows. No APK code, artwork or question papers are bundled. */
(function () {
  "use strict";
  const A = window.__TB,
    { esc, svg, LS } = A;
  Object.assign(A.I, {
    check: '<path d="m5 12 4 4L19 6"/>',
    download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
    upload: '<path d="M12 16V4m-5 5 5-5 5 5M4 16v5h16v-5"/>',
    print: '<path d="M7 8V3h10v5M7 17H3V8h18v9h-4M7 14h10v7H7z"/>',
    plus: '<path d="M12 4v16M4 12h16"/>',
    x: '<path d="m6 6 12 12M6 18 18 6"/>',
    copy: '<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V3H3v13h5"/>',
  });
  const tr = (hi, en) => A.L({ hi, en });
  const $ = (s) => document.querySelector(s);
  const today = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  const year = () => {
    const d = new Date(),
      y = d.getFullYear() - (d.getMonth() < 3 ? 1 : 0);
    return `${y}-${String(y + 1).slice(-2)}`;
  };
  const uid = () =>
    crypto.randomUUID
      ? crypto.randomUUID()
      : Date.now().toString(36) + "-" + Math.random().toString(36).slice(2);
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const KEY = "tb_workspace_v1";
  const fresh = () => ({
    version: 1,
    revision: 0,
    profile: { school: "", teacher: "", session: year() },
    students: [],
    attendance: [],
    assessments: [],
    portfolios: [],
    meals: [],
    openings: [],
    timetable: [],
    registers: [],
    tasks: [],
    documents: [],
    worksheets: [],
  });
  const arrays = [
    "students",
    "attendance",
    "assessments",
    "portfolios",
    "meals",
    "openings",
    "timetable",
    "registers",
    "tasks",
    "documents",
    "worksheets",
  ];
  let state = fresh(),
    raw = null,
    dirty = false,
    storageError = "",
    pendingRestore = null;
  const validDate = (v) =>
    typeof v === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(v) &&
    !isNaN(Date.parse(v + "T00:00:00Z")) &&
    new Date(v + "T00:00:00Z").toISOString().slice(0, 10) === v;
  const text = (v, max = 2000) => typeof v === "string" && v.length <= max;
  const num = (v) =>
    typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 1e9;
  function validate(s) {
    if (
      !s ||
      s.version !== 1 ||
      !Number.isSafeInteger(s.revision) ||
      s.revision < 0 ||
      !s.profile ||
      !text(s.profile.school, 200) ||
      !text(s.profile.teacher, 200) ||
      !text(s.profile.session, 40) ||
      !s.profile.session.trim()
    )
      throw Error(
        tr("बैकअप का प्रारूप सही नहीं है।", "Invalid workspace backup."),
      );
    for (const k of arrays)
      if (!Array.isArray(s[k]) || s[k].length > 30000)
        throw Error("Invalid collection: " + k);
    const walk = (o, depth = 0) => {
      if (depth > 12) throw Error("Backup too deeply nested");
      if (typeof o === "string" && o.length > 100000)
        throw Error("Text too long");
      if (o && typeof o === "object")
        for (const k of Object.keys(o)) {
          if (["__proto__", "constructor", "prototype"].includes(k))
            throw Error("Unsafe key");
          walk(o[k], depth + 1);
        }
    };
    walk(s);
    const sessions = (r) => text(r.session, 40) && r.session.trim();
    const identified = (r) =>
      typeof r.id === "string" && /^[A-Za-z0-9_-]{1,100}$/.test(r.id);
    for (const k of arrays) {
      const ids = new Set();
      for (const r of s[k]) {
        if (!r || !identified(r) || ids.has(r.id))
          throw Error("Invalid or duplicate record: " + k);
        ids.add(r.id);
      }
    }
    const valid = {
      students: (r) =>
        sessions(r) &&
        text(r.name, 200) &&
        r.name.trim() &&
        text(r.className, 60) &&
        r.className.trim() &&
        text(r.roll, 60) &&
        text(r.guardian, 200) &&
        typeof r.archived === "boolean",
      attendance: (r) =>
        sessions(r) &&
        validDate(r.date) &&
        text(r.className, 60) &&
        typeof r.holiday === "boolean" &&
        r.marks &&
        typeof r.marks === "object" &&
        !Array.isArray(r.marks) &&
        Object.entries(r.marks).every(
          ([k, v]) =>
            s.students.some((x) => x.id === k && x.session === r.session) &&
            ["P", "A", "L", ""].includes(v),
        ),
      assessments: (r) =>
        sessions(r) &&
        validDate(r.date) &&
        text(r.className, 60) &&
        text(r.subject, 100) &&
        text(r.term, 60) &&
        num(r.max) &&
        r.max > 0 &&
        r.marks &&
        typeof r.marks === "object" &&
        !Array.isArray(r.marks) &&
        Object.entries(r.marks).every(
          ([k, v]) =>
            s.students.some((x) => x.id === k && x.session === r.session) &&
            (v === null || (num(v) && v <= r.max)),
        ),
      portfolios: (r) =>
        sessions(r) &&
        s.students.some(
          (x) => x.id === r.studentId && x.session === r.session,
        ) &&
        ["strengths", "support", "evidence", "goal", "guardian"].every((k) =>
          text(r[k]),
        ) &&
        (!r.review || validDate(r.review)),
      meals: (r) =>
        sessions(r) &&
        validDate(r.date) &&
        [
          "primary",
          "upper",
          "grainIn",
          "grainOut",
          "milkIn",
          "milkOut",
          "received",
          "spent",
        ].every((k) => num(r[k])) &&
        Number.isInteger(r.primary) &&
        Number.isInteger(r.upper) &&
        text(r.note),
      openings: (r) =>
        sessions(r) &&
        /^\d{4}-(0[1-9]|1[0-2])$/.test(r.month) &&
        ["grain", "milk", "cash"].every((k) => num(r[k])),
      timetable: (r) =>
        sessions(r) &&
        text(r.className, 60) &&
        text(r.subject, 100) &&
        text(r.teacher, 200) &&
        text(r.room, 100) &&
        Number.isInteger(r.day) &&
        r.day >= 1 &&
        r.day <= 6 &&
        /^([01]\d|2[0-3]):[0-5]\d$/.test(r.start) &&
        /^([01]\d|2[0-3]):[0-5]\d$/.test(r.end) &&
        r.start < r.end,
      registers: (r) =>
        sessions(r) &&
        validDate(r.date) &&
        text(r.kind, 60) &&
        text(r.name, 200) &&
        text(r.detail) &&
        text(r.action) &&
        (!r.due || validDate(r.due)) &&
        num(r.amount),
      tasks: (r) =>
        sessions(r) &&
        text(r.title, 300) &&
        validDate(r.due) &&
        typeof r.done === "boolean",
      documents: (r) =>
        sessions(r) &&
        text(r.title, 200) &&
        text(r.body, 20000) &&
        validDate(r.date),
      worksheets: (r) =>
        sessions(r) &&
        text(r.title, 200) &&
        text(r.body, 20000) &&
        text(r.answers, 20000) &&
        validDate(r.date),
    };
    for (const k of arrays)
      if (!s[k].every(valid[k])) throw Error("Invalid records: " + k);
    const logicalKeys = {
      attendance: (r) => [r.session, r.date, r.className],
      assessments: (r) => [r.session, r.date, r.className, r.subject, r.term],
      portfolios: (r) => [r.session, r.studentId],
      meals: (r) => [r.session, r.date],
      openings: (r) => [r.session, r.month],
    };
    for (const [k, key] of Object.entries(logicalKeys)) {
      const keys = s[k].map((r) => JSON.stringify(key(r)));
      if (new Set(keys).size !== keys.length)
        throw Error("Duplicate records: " + k);
    }
    return s;
  }
  try {
    raw = localStorage.getItem(KEY);
    if (raw) state = validate(JSON.parse(raw));
  } catch (e) {
    storageError = tr(
      "सहेजा डेटा पढ़ा नहीं जा सका। बैकअप लें; यह डेटा बदला नहीं जाएगा।",
      "Saved data could not be read. Download a recovery copy; existing data will not be overwritten.",
    );
  }
  function commit(mutator, recovering = false) {
    try {
      if (storageError && !recovering) throw Error(storageError);
      if (localStorage.getItem(KEY) !== raw)
        throw Error(
          tr(
            "दूसरे टैब में डेटा बदला है। अपना काम कॉपी करें और पेज दोबारा खोलें।",
            "Another tab changed your data. Copy your unsaved work and reload before saving.",
          ),
        );
      const next = clone(state);
      mutator(next);
      next.revision++;
      validate(next);
      const serialized = JSON.stringify(next);
      localStorage.setItem(KEY, serialized);
      state = next;
      raw = serialized;
      if (recovering) storageError = "";
      dirty = false;
      A.toast(tr("इस डिवाइस पर सहेजा गया", "Saved on this device"));
      return true;
    } catch (e) {
      showError(
        e.message ||
          tr(
            "सहेज नहीं पाए। बैकअप लें और जगह खाली करें।",
            "Could not save. Back up your work and free some storage.",
          ),
      );
      return false;
    }
  }
  function showError(msg) {
    let box = $("#workspaceError");
    if (!box) {
      box = document.createElement("div");
      box.id = "workspaceError";
      $(".tb-work")?.prepend(box);
    }
    if (box) {
      box.className = "error";
      box.setAttribute("role", "alert");
      box.textContent = msg;
      box.scrollIntoView({ block: "nearest" });
    }
  }
  const current = (k) =>
    state[k].filter((r) => r.session === state.profile.session);
  const students = (className, archived = false) =>
    current("students")
      .filter(
        (s) =>
          (archived || !s.archived) &&
          (!className || s.className === className),
      )
      .sort(
        (a, b) =>
          a.className.localeCompare(b.className, undefined, {
            numeric: true,
          }) ||
          a.roll.localeCompare(b.roll, undefined, { numeric: true }) ||
          a.name.localeCompare(b.name),
      );
  const classes = () => [
    ...new Set(students(null, true).map((s) => s.className)),
  ];
  const getStudent = (id) => state.students.find((s) => s.id === id);
  const studentName = (id) =>
    getStudent(id)?.name || tr("विद्यार्थी", "Student");
  const money = (n) => Number(n).toFixed(2);
  const button = (label, action, icon = "check", primary = false, extra = "") =>
    `<button type="button" class="btn ${primary ? "primary" : ""}" data-ws="${action}" ${extra}>${svg(icon)}${esc(label)}</button>`;
  const submit = () =>
    `<button class="btn primary" type="submit">${svg("check")}${tr("सहेजें", "Save")}</button>`;
  const input = (id, label, value = "", type = "text", extra = "") =>
    `<label for="${id}">${esc(label)}<input id="${id}" name="${id}" type="${type}" value="${esc(value)}" ${extra}></label>`;
  const area = (id, label, value = "", extra = "") =>
    `<label class="wide" for="${id}">${esc(label)}<textarea id="${id}" name="${id}" maxlength="2000" ${extra}>${esc(value)}</textarea></label>`;
  const select = (id, label, options, value = "", extra = "") =>
    `<label for="${id}">${esc(label)}<select id="${id}" name="${id}" ${extra}>${options
      .map((o) => {
        const [v, t] = Array.isArray(o) ? o : [o, o];
        return `<option value="${esc(v)}" ${String(v) === String(value) ? "selected" : ""}>${esc(t)}</option>`;
      })
      .join("")}</select></label>`;
  const values = (form) => Object.fromEntries(new FormData(form).entries());
  const table = (heads, rows) =>
    `<div class="table-wrap"><table><thead><tr>${heads.map((h) => `<th scope="col">${esc(h)}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table></div>`;
  const row = (cells) =>
    `<tr>${cells.map((c) => `<td>${c}</td>`).join("")}</tr>`;
  const empty = (
    message = tr(
      "अभी कोई रिकॉर्ड नहीं। ऊपर विवरण भरकर सहेजें।",
      "No records yet. Fill in the details above and save.",
    ),
  ) => `<div class="empty-state">${esc(message)}</div>`;
  const panel = (title, body) =>
    `<section class="panel"><h2>${esc(title)}</h2>${body}</section>`;
  const hint = (s) => `<p class="hint">${esc(s)}</p>`;
  const form = (id, body) =>
    `<form id="${id}" data-edit-form><div class="form-grid">${body}</div><div class="toolbar">${submit()}</div></form>`;
  const upsert = (s, key, r) => {
    const i = s[key].findIndex((x) => x.id === r.id);
    if (i < 0) s[key].push(r);
    else s[key][i] = r;
  };
  function rerender() {
    A.refresh();
  }
  function confirmDiscard() {
    return (
      !dirty ||
      confirm(
        tr(
          "बदलाव सहेजे नहीं गए हैं। इन्हें छोड़कर आगे जाएँ?",
          "Your changes are not saved. Discard them and continue?",
        ),
      )
    );
  }
  const features = [
    [
      "students",
      "users",
      "विद्यार्थी सूची",
      "Student roster",
      "नाम एक बार भरें, हर पंजी में उपयोग करें",
      "Enter names once; reuse across registers",
      "daily",
    ],
    [
      "attendance",
      "clipboard",
      "दैनिक उपस्थिति",
      "Daily attendance",
      "उपस्थिति भरें, मासिक सारांश निकालें",
      "Mark attendance and print monthly summaries",
      "daily",
    ],
    [
      "assessments",
      "chart",
      "आकलन व अंक",
      "Assessment tracker",
      "आधार रेखा, SA व विषयवार प्रगति",
      "Baseline, term marks and subject progress",
      "classroom",
    ],
    [
      "portfolio",
      "cap",
      "विद्यार्थी पोर्टफोलियो",
      "Student portfolio",
      "उपलब्धि, सुधार व अभिभावक टिप्पणी",
      "Strengths, next steps and guardian feedback",
      "classroom",
    ],
    [
      "meal-ledger",
      "bowl",
      "पोषाहार व दूध पंजी",
      "Meals & milk register",
      "दैनिक स्टॉक, खर्च व मासिक सारांश",
      "Daily stock, spending and monthly statements",
      "daily",
    ],
    [
      "timetable",
      "calendar",
      "समय-सारणी",
      "Timetable planner",
      "शिक्षक व कक्षा के समय टकराव जाँचें",
      "Plan lessons with teacher and room clash checks",
      "classroom",
    ],
    [
      "worksheets",
      "book",
      "अभ्यास व प्रश्न-पत्र",
      "Worksheet studio",
      "कक्षा 1–5 अभ्यास, उत्तर व संपादन",
      "Classes 1–5 practice, answer keys and editing",
      "classroom",
    ],
    [
      "registers",
      "folder",
      "विद्यालय पंजिकाएँ",
      "School registers",
      "आगंतुक, PTM, बिल, स्टाफ व प्रशिक्षण",
      "Visitors, PTM, bills, staff and training",
      "office",
    ],
    [
      "documents",
      "doc",
      "प्रपत्र व आमंत्रण",
      "Forms & invitations",
      "HRA, प्रवेश, चुनाव, NILP व समारोह",
      "HRA, admission, election, NILP and events",
      "office",
    ],
    [
      "tasks",
      "check",
      "काम व समय-सीमा",
      "Tasks & deadlines",
      "ज़रूरी काम और अनुवर्ती कार्रवाई",
      "Keep track of duties and follow-ups",
      "daily",
    ],
    [
      "rajasthan",
      "school",
      "राजस्थान कार्य सहायता",
      "Rajasthan work desk",
      "शाला दर्पण, शिविरा, सेवा कार्य की तैयारी",
      "Shala Darpan, Shivira and service preparation",
      "office",
    ],
    [
      "backup",
      "download",
      "बैकअप व सेटिंग",
      "Backup & settings",
      "विद्यालय, सत्र और डेटा की सुरक्षित प्रति",
      "School, session and a portable copy of your work",
      "office",
    ],
  ];
  const title = (id) => {
    const f = features.find((x) => x[0] === id);
    return f ? tr(f[2], f[3]) : "";
  };
  function cards(list) {
    return `<div class="feature-grid">${list.map((f) => `<a class="feature" href="#/${f[0]}" data-feature-category="${f[6]}" data-feature-text="${esc(f.slice(2, 6).join(" ").toLowerCase())}"><span class="ic" aria-hidden="true">${svg(f[1])}</span><strong>${esc(tr(f[2], f[3]))}</strong><small>${esc(tr(f[4], f[5]))}</small><span class="badge">${tr("ऑफ़लाइन", "Offline")}</span></a>`).join("")}</div>`;
  }
  function wrap(id, body) {
    return `<div class="tb-work"><div class="status-line"><span>${esc(state.profile.school || tr("मेरा विद्यालय", "My school"))} · ${esc(state.profile.session)}</span><span>${tr("डेटा इस डिवाइस पर रहता है", "Data stays on this device")}</span></div>${id === "home" ? "" : `<div class="mini-nav"><a href="#/home">${tr("← होम", "← Home")}</a><a href="#/students">${title("students")}</a><a href="#/backup">${title("backup")}</a></div><h1 style="margin-bottom:12px">${esc(title(id))}</h1>`}<div id="workspaceError" role="alert">${storageError ? esc(storageError) : ""}</div>${body}</div>`;
  }
  function printDoc(name, body) {
    A.printHTML(
      name,
      `<h1>${esc(state.profile.school || "TeacherBuddy")}</h1><p>${esc(state.profile.session)} · ${esc(name)}</p>${body}<div class="sig"><div>${esc(state.profile.teacher)}<br>${tr("तैयारकर्ता", "Prepared by")}</div><div>${tr("जाँचकर्ता / संस्था प्रधान", "Checked by / Head of school")}</div></div>`,
    );
  }
  function csv(name, heads, rows) {
    const cell = (v) => {
      let s = String(v ?? "");
      if (/^[\s]*[=+\-@]/.test(s)) s = "'" + s;
      return '"' + s.replace(/"/g, '""') + '"';
    };
    A.download(
      name + ".csv",
      "\ufeff" +
        [heads, ...rows].map((r) => r.map(cell).join(",")).join("\r\n"),
      "text/csv;charset=utf-8",
    );
  }
  function bindForm(id, fn) {
    $("#" + id)?.addEventListener("submit", (e) => {
      e.preventDefault();
      try {
        fn(values(e.currentTarget), e.currentTarget);
      } catch (err) {
        showError(err.message);
      }
    });
  }
  function home() {
    const due = current("tasks").filter((t) => !t.done && t.due <= today());
    const totals = current("attendance")
      .filter((r) => r.date === today() && !r.holiday)
      .reduce(
        (n, r) => n + Object.values(r.marks).filter((v) => v === "P").length,
        0,
      );
    return wrap(
      "home",
      `<section class="welcome"><div class="hero-label"><span class="rajasthan-flower" aria-hidden="true"></span>${tr("पधारो सा · राजस्थान शिक्षक साथी", "Padharo sa · Made for Rajasthan teachers")}</div><h1>${tr('विद्यालय के हर काम का<br><span class="multicolor-text">एक सरल साथी।</span>', 'More time to teach.<br><span class="multicolor-text">A simpler school day.</span>')}</h1><p>${tr("उपस्थिति, पढ़ाई और विद्यालय के काम—सब व्यवस्थित। आपके लिए आसान, आपके समय का साथी।", "Attendance, learning and school paperwork, thoughtfully organised. Simple tools for the work that matters.")}</p><div class="hero-actions"><a class="btn" href="#/${students().length ? "attendance" : "students"}">${svg("users")}${students().length ? tr("आज की उपस्थिति भरें", "Mark today’s attendance") : tr("विद्यार्थी जोड़कर शुरू करें", "Start with your students")}</a><a class="btn secondary" href="#/resources">${tr("सभी सुविधाएँ", "Explore all resources")}</a></div><div class="hero-footnote"><span class="dot"></span>${tr("ऑफ़लाइन टूल · हिन्दी और English · निःशुल्क", "Offline tools · Hindi & English · Free to use")}</div></section>
${!state.profile.school ? '<div class="onboarding">'+panel(tr("पहली बार उपयोग कर रहे हैं?", "New here?"), `<div class="steps-row"><span><b>1</b>${tr("विद्यालय व सत्र चुनें", "Set school & session")}</span><span><b>2</b>${tr("विद्यार्थी जोड़ें", "Add students")}</span><span><b>3</b>${tr("काम सहेजें और बैकअप लें", "Save your work & back it up")}</span></div><a class="btn" href="#/backup">${tr("विद्यालय सेट करें", "Set up my school")}</a>`)+'</div>' : ""}
<div class="stats-row"><div class="stat-card"><b>${students().length}</b><span>${tr("विद्यार्थी", "Students")}</span></div><div class="stat-card"><b>${totals}</b><span>${tr("आज उपस्थित", "Present today")}</span></div><div class="stat-card"><b>${due.length}</b><span>${tr("आज तक करने हैं", "Tasks due")}</span></div></div>
${
  due.length
    ? panel(
        tr("आज ध्यान दें", "Needs your attention"),
        due
          .slice(0, 4)
          .map(
            (t) =>
              `<div class="task-row"><span>${esc(t.title)} <small>(${esc(t.due)})</small><a href="#/tasks">${tr("देखें", "View")}</a></div>`,
          )
          .join(""),
      )
    : ""
}
<div class="list-head"><h2>${tr("आपको क्या करना है?", "What would you like to do?")}</h2>${button(tr("बड़ा अक्षर", "Larger text"), "large", "search")}</div>${input("featureSearch", tr("टूल खोजें — हिन्दी या English", "Find a tool — Hindi or English"), "", "search", 'placeholder="उपस्थिति, attendance, PTM…" class="search-tools"')}
<div class="filter-pills" role="group" aria-label="${tr('सुविधा वर्ग','Feature categories')}">${[['all','सभी','All tools'],['daily','रोज़ के काम','Daily work'],['classroom','कक्षा व पढ़ाई','Classroom'],['office','विद्यालय कार्यालय','School office']].map(([id,hi,en])=>`<button type="button" data-category="${id}" aria-pressed="${id==='all'}">${tr(hi,en)}</button>`).join('')}</div>${cards(features)}<div id="noFeatures" hidden>${empty(tr("कोई टूल नहीं मिला। दूसरा शब्द खोजें।", "No tools found. Try another word."))}</div>
${panel(tr("पहले से मौजूद सभी सुविधाएँ", "All your existing tools"), `<p>${tr("वेतन, अवकाश पत्र, पाठ योजना, सरकारी पोर्टल और अन्य संसाधन।", "Salary, leave letters, lesson planning, government portals and other resources.")}</p><div class="toolbar"><a class="btn" href="#/resources">${tr("सभी संसाधन देखें", "Browse all resources")}</a><a class="btn" href="#/letters">${tr("पत्र बनाएँ", "Create a letter")}</a><a class="btn" href="#/salary">${tr("वेतन कैलकुलेटर", "Salary calculators")}</a><a class="btn" href="#/portals">${tr("सरकारी पोर्टल · इंटरनेट", "Government portals · Internet")}</a></div>`)}
${hint(tr("काम सहेजने के लिए “सहेजें” दबाएँ। ब्राउज़र डेटा मिटने पर रिकॉर्ड मिट सकते हैं—नियमित बैकअप लें। सरकारी पोर्टल और बाहरी PDF के लिए इंटरनेट चाहिए।", "Press Save to keep your work. Clearing browser data can erase records—download backups regularly. Government portals and external PDFs need internet."))}`,
    );
  }
  function rosterPage() {
    return wrap(
      "students",
      hint(
        tr(
          "कक्षा/सेक्शन एक समान लिखें, जैसे 3-A। पुराने रिकॉर्ड रखने के लिए विद्यार्थी को संग्रहित करें।",
          "Use a consistent class/section, such as 3-A. Archive a student to preserve their earlier records.",
        ),
      ) +
        panel(
          tr("विद्यार्थी जोड़ें या सुधारें", "Add or edit a student"),
          form(
            "studentForm",
            `<input type="hidden" name="id" id="studentId">${input("name", tr("विद्यार्थी का नाम", "Student name"), "", "text", 'required maxlength="200"')}${input("className", tr("कक्षा / सेक्शन", "Class / section"), "", "text", 'required maxlength="60" placeholder="3-A"')}${input("roll", tr("रोल नंबर", "Roll number"), "", "text", 'maxlength="60"')}${input("guardian", tr("अभिभावक का नाम", "Guardian name"), "", "text", 'maxlength="200"')}`,
          ),
        ) +
        panel(
          tr("एक साथ नाम जोड़ें", "Add several students"),
          form(
            "bulkStudents",
            input(
              "bulkClass",
              tr("कक्षा / सेक्शन", "Class / section"),
              "",
              "text",
              'required maxlength="60"',
            ) +
              area(
                "names",
                tr(
                  "हर पंक्ति पर एक नाम (अधिकतम 100)",
                  "One name per line (up to 100)",
                ),
                "",
                "required",
              ),
          ),
        ) +
        panel(
          tr("मेरे विद्यार्थी", "My students"),
          `<div class="toolbar">${button("CSV", "roster-csv", "download")}${button(tr("प्रिंट / PDF", "Print / PDF"), "roster-print", "print")}</div>` +
            (students(null, true).length
              ? table(
                  [
                    tr("नाम", "Name"),
                    tr("कक्षा", "Class"),
                    tr("रोल", "Roll"),
                    tr("अभिभावक", "Guardian"),
                    tr("कार्रवाई", "Action"),
                  ],
                  students(null, true).map((s) =>
                    row([
                      esc(s.name) +
                        (s.archived
                          ? ` <span class="badge">${tr("संग्रहित", "Archived")}</span>`
                          : ""),
                      esc(s.className),
                      esc(s.roll),
                      esc(s.guardian),
                      button(
                        tr("सुधारें", "Edit"),
                        "student-edit",
                        "doc",
                        false,
                        `data-id="${s.id}"`,
                      ) +
                        button(
                          s.archived
                            ? tr("वापस लाएँ", "Restore")
                            : tr("संग्रहित करें", "Archive"),
                          "student-archive",
                          "folder",
                          false,
                          `data-id="${s.id}"`,
                        ),
                    ]),
                  ),
                )
              : empty()),
        ),
    );
  }
  function rosterHook() {
    bindForm("studentForm", (v) => {
      const existing = getStudent(v.id);
      const name = v.name.trim(),
        className = v.className.trim();
      if (!name || !className)
        throw Error(tr("नाम और कक्षा भरें।", "Enter a name and class."));
      if (
        existing &&
        className !== existing.className &&
        current("attendance").some((r) => existing.id in r.marks)
      )
        throw Error(
          tr(
            "उपस्थिति वाले विद्यार्थी की कक्षा बदलने के लिए नए सत्र में नई प्रविष्टि बनाएँ।",
            "For a student with attendance, create a new entry in the new session to change class.",
          ),
        );
      if (
        v.roll.trim() &&
        students(className, true).some(
          (s) => s.id !== v.id && s.roll === v.roll.trim(),
        )
      )
        throw Error(
          tr(
            "इस कक्षा में रोल नंबर पहले से है।",
            "That roll number already exists in this class.",
          ),
        );
      if (
        commit((s) =>
          upsert(s, "students", {
            id: v.id || uid(),
            session: s.profile.session,
            name,
            className,
            roll: v.roll.trim(),
            guardian: v.guardian.trim(),
            archived: existing?.archived || false,
          }),
        )
      )
        rerender();
    });
    bindForm("bulkStudents", (v) => {
      const names = v.names
        .split("\n")
        .map((n) => n.trim())
        .filter(Boolean);
      if (
        !names.length ||
        names.length > 100 ||
        names.some((n) => n.length > 200) ||
        !v.bulkClass.trim()
      )
        throw Error(
          tr("कक्षा व 1–100 नाम भरें।", "Enter a class and 1–100 names."),
        );
      if (
        commit((s) =>
          names.forEach((name) =>
            s.students.push({
              id: uid(),
              session: s.profile.session,
              name,
              className: v.bulkClass.trim(),
              roll: "",
              guardian: "",
              archived: false,
            }),
          ),
        )
      )
        rerender();
    });
  }
  let attendanceClass = "",
    attendanceDate = today(),
    attendanceMonth = today().slice(0, 7);
  function classFilter(id, value) {
    return select(
      id,
      tr("कक्षा / सेक्शन", "Class / section"),
      classes().length
        ? classes()
        : [["", tr("पहले विद्यार्थी जोड़ें", "Add students first")]],
      value,
    );
  }
  function attendancePage() {
    attendanceClass = classes().includes(attendanceClass)
      ? attendanceClass
      : classes()[0] || "";
    const record = current("attendance").find(
      (r) => r.className === attendanceClass && r.date === attendanceDate,
    );
    const roster = students(attendanceClass);
    const oldIds = Object.keys(record?.marks || {});
    for (const id of oldIds) {
      const s = getStudent(id);
      if (s && !roster.some((x) => x.id === id)) roster.push(s);
    }
    return wrap(
      "attendance",
      hint(
        tr(
          "खाली का अर्थ “दर्ज नहीं”; इसे अनुपस्थित नहीं गिना जाता। अवकाश चुनने पर उस दिन उपस्थिति नहीं गिनी जाएगी।",
          "Blank means unmarked, not absent. A school holiday is excluded from attendance totals.",
        ),
      ) +
        `<div class="panel form-grid">${classFilter("attendanceClass", attendanceClass)}${input("attendanceDate", tr("उपस्थिति की तारीख", "Attendance date"), attendanceDate, "date", "required")}</div>` +
        panel(
          tr("उपस्थिति दर्ज करें", "Mark attendance"),
          roster.length
            ? `<form id="attendanceForm" data-edit-form><label class="check"><input type="checkbox" name="holiday" ${record?.holiday ? "checked" : ""}>${tr("विद्यालय अवकाश", "School holiday")}</label><div class="toolbar">${button(tr("सभी उपस्थित", "Mark all present"), "all-present", "users")}</div>${table(
                [tr("विद्यार्थी", "Student"), tr("स्थिति", "Status")],
                roster.map((s) =>
                  row([
                    esc(s.name),
                    select(
                      "att-" + s.id,
                      s.name,
                      [
                        ["", tr("दर्ज नहीं", "Unmarked")],
                        ["P", tr("उपस्थित", "Present")],
                        ["A", tr("अनुपस्थित", "Absent")],
                        ["L", tr("अवकाश पर", "On leave")],
                      ],
                      record?.marks[s.id] || "",
                    ),
                  ]),
                ),
              )}${submit()}</form>`
            : empty(
                tr(
                  "पहले विद्यार्थी सूची में नाम जोड़ें।",
                  "Add students to your roster first.",
                ),
              ),
        ) +
        panel(
          tr("मासिक सारांश", "Monthly summary"),
          input(
            "attendanceMonth",
            tr("रिपोर्ट का माह", "Report month"),
            attendanceMonth,
            "month",
          ) +
            `<div class="toolbar">${button(tr("प्रिंट / PDF", "Print / PDF"), "attendance-print", "print")}${button("CSV", "attendance-csv", "download")}</div>` +
            attendanceSummary(),
        ),
    );
  }
  function attendanceRows() {
    const records = current("attendance").filter(
      (r) =>
        r.className === attendanceClass &&
        r.date.startsWith(attendanceMonth) &&
        !r.holiday,
    );
    const ids = [
      ...new Set([
        ...students(attendanceClass).map((s) => s.id),
        ...records.flatMap((r) => Object.keys(r.marks)),
      ]),
    ];
    return ids.map((id) => {
      const counts = { P: 0, A: 0, L: 0 };
      records.forEach((r) => {
        if (r.marks[id]) counts[r.marks[id]]++;
      });
      const total = counts.P + counts.A + counts.L;
      return [
        studentName(id),
        counts.P,
        counts.A,
        counts.L,
        total,
        total ? ((counts.P * 100) / total).toFixed(1) + "%" : "—",
      ];
    });
  }
  const attendanceHeads = () => [
    tr("विद्यार्थी", "Student"),
    tr("उपस्थित", "Present"),
    tr("अनुपस्थित", "Absent"),
    tr("अवकाश", "Leave"),
    tr("दर्ज दिन", "Marked days"),
    tr("उपस्थिति %", "Attendance %"),
  ];
  function attendanceSummary() {
    return (
      hint(
        tr(
          "प्रतिशत = उपस्थित ÷ (उपस्थित + अनुपस्थित + अवकाश)। केवल दर्ज दिनों पर आधारित।",
          "Percentage = present ÷ (present + absent + leave). Based only on marked days.",
        ),
      ) +
      table(
        attendanceHeads(),
        attendanceRows().map((r) => row(r.map(esc))),
      )
    );
  }
  function filterChange(id, fn) {
    const control = $("#" + id);
    if (!control) return;
    let previous = control.value;
    control.addEventListener("change", (e) => {
      if (!confirmDiscard()) {
        control.value = previous;
        return;
      }
      dirty = false;
      previous = e.target.value;
      fn(previous);
      rerender();
    });
  }
  function attendanceHook() {
    filterChange("attendanceClass", (v) => (attendanceClass = v));
    filterChange("attendanceDate", (v) => {
      if (validDate(v)) attendanceDate = v;
    });
    filterChange("attendanceMonth", (v) => {
      if (v) attendanceMonth = v;
    });
    bindForm("attendanceForm", (v, f) => {
      if (!validDate(attendanceDate) || attendanceDate > today())
        throw Error(
          tr("आज या पिछली तारीख चुनें।", "Choose today or an earlier date."),
        );
      const existing = current("attendance").find(
        (r) => r.className === attendanceClass && r.date === attendanceDate,
      );
      const marks = {};
      f.querySelectorAll("select").forEach(
        (x) => (marks[x.id.slice(4)] = v.holiday ? "" : x.value),
      );
      if (
        commit((s) =>
          upsert(s, "attendance", {
            id: existing?.id || uid(),
            session: s.profile.session,
            className: attendanceClass,
            date: attendanceDate,
            holiday: !!v.holiday,
            marks,
          }),
        )
      )
        rerender();
    });
  }
  let assessmentId = "",
    assessmentClass = "";
  const subjects = () => [
    ["Hindi", tr("हिन्दी", "Hindi")],
    ["English", "English"],
    ["Mathematics", tr("गणित", "Mathematics")],
    ["EVS", tr("पर्यावरण", "EVS")],
    ["Science", tr("विज्ञान", "Science")],
    ["Social Science", tr("सामाजिक विज्ञान", "Social Science")],
    ["Other", tr("अन्य", "Other")],
  ];
  function assessmentPage() {
    const r = current("assessments").find((x) => x.id === assessmentId);
    assessmentClass =
      r?.className ||
      (classes().includes(assessmentClass)
        ? assessmentClass
        : classes()[0] || "");
    const roster = students(assessmentClass);
    for (const id of Object.keys(r?.marks || {})) {
      const s = getStudent(id);
      if (s && !roster.some((x) => x.id === id)) roster.push(s);
    }
    return wrap(
      "assessments",
      hint(
        tr(
          "अंक 0 हो सकते हैं। अनुपस्थित / आकलन नहीं हुआ हो तो खाली छोड़ें। कोई आधिकारिक ग्रेड नियम स्वतः लागू नहीं होता।",
          "Zero is a valid mark. Leave blank if absent or not assessed. No official grading scale is assumed.",
        ),
      ) +
        panel(
          tr("आकलन विवरण", "Assessment details"),
          `<div class="toolbar">${button(tr("नया आकलन", "New assessment"), "assessment-new", "plus")}</div>${classFilter("assessmentClass", assessmentClass)}<form id="assessmentForm" data-edit-form><div class="form-grid">${input("date", tr("दिनांक", "Date"), r?.date || today(), "date", "required")}${select("subject", tr("विषय", "Subject"), subjects(), r?.subject || "Hindi")}${select(
            "term",
            tr("आकलन", "Assessment"),
            [
              ["Baseline", tr("आधार रेखा", "Baseline")],
              ["SA1", "SA 1"],
              ["SA2", "SA 2"],
              ["SA3", "SA 3"],
              ["FA", tr("सतत आकलन", "Formative")],
            ],
            r?.term || "Baseline",
          )}${input("max", tr("पूर्णांक", "Maximum marks"), r?.max || 20, "number", 'required min="1" max="1000" step="0.01"')}</div>${
            roster.length
              ? table(
                  [tr("विद्यार्थी", "Student"), tr("प्राप्तांक", "Marks")],
                  roster.map((s) =>
                    row([
                      esc(s.name),
                      input(
                        "mark-" + s.id,
                        s.name,
                        r?.marks[s.id] ?? "",
                        "number",
                        'min="0" max="1000" step="0.01"',
                      ),
                    ]),
                  ),
                )
              : empty()
          }<div class="toolbar">${roster.length ? submit() : ""}</div></form>`,
        ) +
        panel(
          tr("सहेजे आकलन", "Saved assessments"),
          current("assessments").length
            ? table(
                [
                  tr("दिनांक", "Date"),
                  tr("कक्षा", "Class"),
                  tr("आकलन", "Assessment"),
                  tr("कार्रवाई", "Action"),
                ],
                current("assessments").map((x) =>
                  row([
                    esc(x.date),
                    esc(x.className),
                    esc(x.subject + " · " + x.term),
                    button(
                      tr("खोलें", "Open"),
                      "assessment-edit",
                      "doc",
                      false,
                      `data-id="${x.id}"`,
                    ) +
                      button(
                        tr("प्रिंट", "Print"),
                        "assessment-print",
                        "print",
                        false,
                        `data-id="${x.id}"`,
                      ),
                  ]),
                ),
              )
            : empty(),
        ),
    );
  }
  function assessmentHook() {
    filterChange("assessmentClass", (v) => {
      assessmentId = "";
      assessmentClass = v;
    });
    bindForm("assessmentForm", (v, f) => {
      const marks = {};
      f.querySelectorAll('[name^="mark-"]').forEach((x) => {
        const value = x.value.trim() === "" ? null : Number(x.value);
        if (value !== null && (!num(value) || value > Number(v.max)))
          throw Error(
            tr(
              "प्राप्तांक पूर्णांक से अधिक नहीं हो सकते।",
              "Marks cannot exceed the maximum.",
            ),
          );
        marks[x.name.slice(5)] = value;
      });
      const existing = current("assessments").find(
        (r) =>
          r.className === assessmentClass &&
          r.subject === v.subject &&
          r.term === v.term &&
          r.date === v.date,
      );
      if (existing && existing.id !== assessmentId)
        throw Error(
          tr(
            "यह आकलन पहले से है। नीचे “खोलें” से सुधारें।",
            "This assessment already exists. Open it below to edit.",
          ),
        );
      if (
        commit((s) =>
          upsert(s, "assessments", {
            id: assessmentId || uid(),
            session: s.profile.session,
            className: assessmentClass,
            date: v.date,
            subject: v.subject,
            term: v.term,
            max: Number(v.max),
            marks,
          }),
        )
      )
        rerender();
    });
  }
  function assessmentReport(r) {
    return table(
      [
        tr("विद्यार्थी", "Student"),
        tr("प्राप्तांक", "Marks"),
        tr("पूर्णांक", "Maximum"),
        "%",
      ],
      Object.entries(r.marks).map(([id, v]) =>
        row([
          esc(studentName(id)),
          v === null ? "—" : esc(v),
          esc(r.max),
          v === null ? "—" : ((v * 100) / r.max).toFixed(1),
        ]),
      ),
    );
  }
  let portfolioStudent = "";
  function portfolioPage() {
    const list = students(null, true);
    portfolioStudent = list.some((s) => s.id === portfolioStudent)
      ? portfolioStudent
      : list[0]?.id || "";
    const p = current("portfolios").find(
      (r) => r.studentId === portfolioStudent,
    );
    return wrap(
      "portfolio",
      select(
        "portfolioStudent",
        tr("विद्यार्थी चुनें", "Choose a student"),
        list.map((s) => [s.id, `${s.name} · ${s.className}`]),
        portfolioStudent,
      ) +
        hint(
          tr(
            "विद्यालय बदलने पर साझा करने योग्य प्रगति रिकॉर्ड। बच्चे की विशिष्ट उपलब्धि व अगला छोटा लक्ष्य लिखें।",
            "A portable progress record. Describe the child’s specific achievements and one achievable next step.",
          ),
        ) +
        (list.length
          ? panel(
              tr("पोर्टफोलियो लिखें", "Write the portfolio"),
              form(
                "portfolioForm",
                area(
                  "strengths",
                  tr("बच्चे की खूबियाँ व रुचियाँ", "Strengths and interests"),
                  p?.strengths,
                ) +
                  area(
                    "support",
                    tr("कहाँ सहयोग चाहिए", "Support needed"),
                    p?.support,
                  ) +
                  area(
                    "evidence",
                    tr(
                      "काम / प्रगति के उदाहरण",
                      "Examples of work and progress",
                    ),
                    p?.evidence,
                  ) +
                  area(
                    "goal",
                    tr("अगला सीखने का लक्ष्य", "Next learning goal"),
                    p?.goal,
                  ) +
                  area(
                    "guardian",
                    tr("अभिभावक की टिप्पणी", "Guardian feedback"),
                    p?.guardian,
                  ) +
                  input(
                    "review",
                    tr("अगली समीक्षा", "Next review"),
                    p?.review || "",
                    "date",
                  ),
              ) +
                `<div class="toolbar">${button(tr("सहेजा पोर्टफोलियो प्रिंट करें", "Print saved portfolio"), "portfolio-print", "print")}</div>`,
            ) +
            panel(
              tr("विषयवार आकलन इतिहास", "Assessment history"),
              portfolioMarks(),
            )
          : empty(tr("पहले विद्यार्थी जोड़ें।", "Add a student first."))),
    );
  }
  function portfolioMarks() {
    return table(
      [
        tr("दिनांक", "Date"),
        tr("विषय", "Subject"),
        tr("आकलन", "Assessment"),
        tr("अंक", "Marks"),
      ],
      current("assessments")
        .filter((r) => portfolioStudent in r.marks)
        .map((r) =>
          row([
            esc(r.date),
            esc(r.subject),
            esc(r.term),
            r.marks[portfolioStudent] === null
              ? tr("आकलन नहीं हुआ", "Not assessed")
              : esc(r.marks[portfolioStudent] + " / " + r.max),
          ]),
        ),
    );
  }
  function portfolioHook() {
    filterChange("portfolioStudent", (v) => (portfolioStudent = v));
    bindForm("portfolioForm", (v) => {
      const p = current("portfolios").find(
        (r) => r.studentId === portfolioStudent,
      );
      if (
        commit((s) =>
          upsert(s, "portfolios", {
            id: p?.id || uid(),
            session: s.profile.session,
            studentId: portfolioStudent,
            ...v,
          }),
        )
      )
        rerender();
    });
  }
  let mealMonth = today().slice(0, 7),
    mealId = "";
  function mealTotals(s = state, month = mealMonth) {
    const opening = s.openings.find(
      (r) => r.session === s.profile.session && r.month === month,
    ) || { grain: 0, milk: 0, cash: 0 };
    const rows = s.meals
      .filter(
        (r) => r.session === s.profile.session && r.date.startsWith(month),
      )
      .sort((a, b) => a.date.localeCompare(b.date));
    const total = {
      primary: 0,
      upper: 0,
      grainIn: 0,
      grainOut: 0,
      milkIn: 0,
      milkOut: 0,
      received: 0,
      spent: 0,
    };
    let grain = opening.grain,
      milk = opening.milk,
      cash = opening.cash;
    for (const r of rows) {
      for (const k of Object.keys(total)) total[k] += r[k];
      grain += r.grainIn - r.grainOut;
      milk += r.milkIn - r.milkOut;
      cash += r.received - r.spent;
      if (grain < -0.00001 || milk < -0.00001 || cash < -0.00001)
        throw Error(
          tr(
            "इस तारीख पर स्टॉक या राशि ऋणात्मक है: ",
            "Stock or cash becomes negative on ",
          ) +
            r.date +
            tr(
              "। प्रारंभिक शेष व प्राप्ति जाँचें।",
              ". Check the opening balance and receipts.",
            ),
        );
    }
    return { opening, rows, total, grain, milk, cash };
  }
  function mealPage() {
    const r = current("meals").find((x) => x.id === mealId);
    const o = current("openings").find((x) => x.month === mealMonth);
    let report;
    try {
      report = mealReport();
    } catch (e) {
      report = hint(e.message);
    }
    return wrap(
      "meal-ledger",
      hint(
        tr(
          "वास्तविक प्राप्ति, उपयोग और खर्च भरें। मासिक सारांश सहायता के लिए है; विभागीय UC / MDCF प्रारूप का विकल्प नहीं। दूध की मात्रा पूरे माह लीटर में रखें।",
          "Enter actual receipts, use and spending. The monthly statement is a working summary, not a prescribed UC / MDCF form. Keep milk quantities in litres throughout the month.",
        ),
      ) +
        input(
          "mealMonth",
          tr("माह चुनें", "Choose month"),
          mealMonth,
          "month",
          "required",
        ) +
        panel(
          tr("1. महीने का प्रारंभिक शेष", "1. Opening balances for this month"),
          form(
            "openingForm",
            input(
              "grain",
              tr("खाद्यान्न (किग्रा)", "Grain (kg)"),
              o?.grain ?? 0,
              "number",
              'required min="0" step="0.001"',
            ) +
              input(
                "milk",
                tr("दूध (लीटर)", "Milk (litres)"),
                o?.milk ?? 0,
                "number",
                'required min="0" step="0.001"',
              ) +
              input(
                "cash",
                tr("राशि (₹)", "Cash (₹)"),
                o?.cash ?? 0,
                "number",
                'required min="0" step="0.01"',
              ),
          ),
        ) +
        panel(
          tr("2. दैनिक प्रविष्टि", "2. Daily entry"),
          `<div class="toolbar">${button(tr("नई प्रविष्टि", "New entry"), "meal-new", "plus")}</div>` +
            form(
              "mealForm",
              input(
                "date",
                tr("दिनांक", "Date"),
                r?.date ||
                  (today().startsWith(mealMonth) ? today() : mealMonth + "-01"),
                "date",
                "required",
              ) +
                input(
                  "primary",
                  tr("कक्षा 1–5: भोजन पाने वाले", "Classes 1–5: meals served"),
                  r?.primary ?? 0,
                  "number",
                  'required min="0" step="1"',
                ) +
                input(
                  "upper",
                  tr("कक्षा 6–8: भोजन पाने वाले", "Classes 6–8: meals served"),
                  r?.upper ?? 0,
                  "number",
                  'required min="0" step="1"',
                ) +
                input(
                  "grainIn",
                  tr("खाद्यान्न प्राप्त (किग्रा)", "Grain received (kg)"),
                  r?.grainIn ?? 0,
                  "number",
                  'required min="0" step="0.001"',
                ) +
                input(
                  "grainOut",
                  tr("खाद्यान्न उपयोग (किग्रा)", "Grain used (kg)"),
                  r?.grainOut ?? 0,
                  "number",
                  'required min="0" step="0.001"',
                ) +
                input(
                  "milkIn",
                  tr("दूध प्राप्त (लीटर)", "Milk received (litres)"),
                  r?.milkIn ?? 0,
                  "number",
                  'required min="0" step="0.001"',
                ) +
                input(
                  "milkOut",
                  tr("दूध वितरण (लीटर)", "Milk distributed (litres)"),
                  r?.milkOut ?? 0,
                  "number",
                  'required min="0" step="0.001"',
                ) +
                input(
                  "received",
                  tr("राशि प्राप्त (₹)", "Cash received (₹)"),
                  r?.received ?? 0,
                  "number",
                  'required min="0" step="0.01"',
                ) +
                input(
                  "spent",
                  tr("वास्तविक खर्च (₹)", "Actual spending (₹)"),
                  r?.spent ?? 0,
                  "number",
                  'required min="0" step="0.01"',
                ) +
                area(
                  "note",
                  tr(
                    "मेन्यू / बिल संदर्भ / टिप्पणी",
                    "Menu / bill reference / note",
                  ),
                  r?.note,
                ),
            ),
        ) +
        panel(
          tr("3. मासिक सारांश", "3. Monthly statement"),
          `<div class="toolbar">${button(tr("प्रिंट / PDF", "Print / PDF"), "meal-print", "print")}${button("CSV", "meal-csv", "download")}</div>` +
            report,
        ),
    );
  }
  function mealReport() {
    const t = mealTotals();
    return (
      `<div class="stats-row"><div class="stat-card"><b>${t.total.primary + t.total.upper}</b><span>${tr("कुल भोजन", "Total meals")}</span></div><div class="stat-card"><b>${t.grain.toFixed(3)}</b><span>${tr("शेष खाद्यान्न (किग्रा)", "Closing grain (kg)")}</span></div><div class="stat-card"><b>₹${money(t.cash)}</b><span>${tr("शेष राशि", "Closing cash")}</span></div></div>` +
      table(
        [
          tr("मद", "Item"),
          tr("प्रारंभ", "Opening"),
          tr("प्राप्त", "Received"),
          tr("उपयोग / खर्च", "Used / spent"),
          tr("शेष", "Closing"),
        ],
        [
          row([
            tr("खाद्यान्न किग्रा", "Grain kg"),
            t.opening.grain,
            t.total.grainIn.toFixed(3),
            t.total.grainOut.toFixed(3),
            t.grain.toFixed(3),
          ]),
          row([
            tr("दूध लीटर", "Milk litres"),
            t.opening.milk,
            t.total.milkIn.toFixed(3),
            t.total.milkOut.toFixed(3),
            t.milk.toFixed(3),
          ]),
          row([
            tr("राशि ₹", "Cash ₹"),
            money(t.opening.cash),
            money(t.total.received),
            money(t.total.spent),
            money(t.cash),
          ]),
        ],
      ) +
      hint(
        tr("कक्षा 1–5 भोजन: ", "Classes 1–5 meals: ") +
          t.total.primary +
          " · " +
          tr("कक्षा 6–8 भोजन: ", "Classes 6–8 meals: ") +
          t.total.upper,
      ) +
      table(
        [
          tr("दिनांक", "Date"),
          tr("भोजन", "Meals"),
          tr("खाद्यान्न उपयोग", "Grain used"),
          tr("खर्च ₹", "Spent ₹"),
          tr("टिप्पणी", "Note"),
          tr("कार्रवाई", "Action"),
        ],
        t.rows.map((r) =>
          row([
            esc(r.date),
            r.primary + r.upper,
            r.grainOut,
            money(r.spent),
            esc(r.note),
            button(
              tr("सुधारें", "Edit"),
              "meal-edit",
              "doc",
              false,
              `data-id="${r.id}"`,
            ),
          ]),
        ),
      )
    );
  }
  function mealHook() {
    filterChange("mealMonth", (v) => {
      if (v) {
        mealMonth = v;
        mealId = "";
      }
    });
    bindForm("openingForm", (v) => {
      const old = current("openings").find((r) => r.month === mealMonth);
      if (
        commit((s) => {
          upsert(s, "openings", {
            id: old?.id || uid(),
            session: s.profile.session,
            month: mealMonth,
            grain: +v.grain,
            milk: +v.milk,
            cash: +v.cash,
          });
          mealTotals(s);
        })
      )
        rerender();
    });
    bindForm("mealForm", (v) => {
      if (!v.date.startsWith(mealMonth))
        throw Error(
          tr(
            "चुने हुए माह की तारीख भरें।",
            "Enter a date in the selected month.",
          ),
        );
      const old = current("meals").find((r) => r.date === v.date);
      if (old && old.id !== mealId)
        throw Error(
          tr(
            "इस दिन की प्रविष्टि पहले से है। नीचे से सुधारें।",
            "This date already has an entry. Edit it below.",
          ),
        );
      const r = {
        id: mealId || uid(),
        session: state.profile.session,
        date: v.date,
        note: v.note,
      };
      for (const k of [
        "primary",
        "upper",
        "grainIn",
        "grainOut",
        "milkIn",
        "milkOut",
        "received",
        "spent",
      ])
        r[k] = +v[k];
      if (
        commit((s) => {
          upsert(s, "meals", r);
          mealTotals(s);
        })
      ) {
        mealId = "";
        rerender();
      }
    });
  }
  const days = () => [
    [1, tr("सोमवार", "Monday")],
    [2, tr("मंगलवार", "Tuesday")],
    [3, tr("बुधवार", "Wednesday")],
    [4, tr("गुरुवार", "Thursday")],
    [5, tr("शुक्रवार", "Friday")],
    [6, tr("शनिवार", "Saturday")],
  ];
  let timetableId = "";
  function clashes(r, rows) {
    const norm = (s) => s.trim().toLowerCase();
    return rows.filter(
      (x) =>
        x.id !== r.id &&
        x.day === r.day &&
        x.start < r.end &&
        r.start < x.end &&
        ((norm(x.teacher) && norm(x.teacher) === norm(r.teacher)) ||
          norm(x.className) === norm(r.className) ||
          (norm(r.room) && norm(r.room) === norm(x.room))),
    );
  }
  function timetablePage() {
    const r = current("timetable").find((x) => x.id === timetableId);
    return wrap(
      "timetable",
      hint(
        tr(
          "दो / चार शिक्षक या बहु-कक्षा विद्यालय के लिए अपना समय भरें। संयुक्त कक्षा को एक नाम दें, जैसे 1+2। प्रखर पठन कालांश विषय में लिख सकते हैं। यह आधिकारिक समय-सारणी नहीं है।",
          "Use your own times for two-teacher, four-teacher or multigrade schools. Give a combined class one name, such as 1+2. Add Prakhar reading as a subject. This is not an official timetable.",
        ),
      ) +
        panel(
          tr("कालांश जोड़ें", "Add a period"),
          form(
            "timetableForm",
            select("day", tr("दिन", "Day"), days(), r?.day || 1) +
              input(
                "className",
                tr("कक्षा / संयुक्त कक्षा", "Class / combined class"),
                r?.className || "",
                "text",
                'required maxlength="60"',
              ) +
              input(
                "subject",
                tr("विषय / गतिविधि", "Subject / activity"),
                r?.subject || "",
                "text",
                'required maxlength="100"',
              ) +
              input(
                "teacher",
                tr("शिक्षक", "Teacher"),
                r?.teacher || "",
                "text",
                'required maxlength="200"',
              ) +
              input(
                "room",
                tr("कमरा (वैकल्पिक)", "Room (optional)"),
                r?.room || "",
                "text",
                'maxlength="100"',
              ) +
              input(
                "start",
                tr("शुरू", "Start"),
                r?.start || "10:00",
                "time",
                "required",
              ) +
              input(
                "end",
                tr("समाप्त", "End"),
                r?.end || "10:40",
                "time",
                "required",
              ),
          ) + button(tr("नया कालांश", "New period"), "timetable-new", "plus"),
        ) +
        panel(
          tr("साप्ताहिक योजना", "Weekly plan"),
          `<div class="toolbar">${button(tr("प्रिंट / PDF", "Print / PDF"), "timetable-print", "print")}${button("CSV", "timetable-csv", "download")}</div>` +
            timetableReport(true),
        ),
    );
  }
  function timetableRows() {
    return current("timetable").sort(
      (a, b) =>
        a.day - b.day ||
        a.start.localeCompare(b.start) ||
        a.className.localeCompare(b.className),
    );
  }
  function timetableReport(actions = false) {
    return table(
      [
        tr("दिन", "Day"),
        tr("समय", "Time"),
        tr("कक्षा", "Class"),
        tr("विषय", "Subject"),
        tr("शिक्षक", "Teacher"),
        tr("कमरा", "Room"),
        ...(actions ? [tr("कार्रवाई", "Action")] : []),
      ],
      timetableRows().map((r) =>
        row([
          esc(days().find((x) => x[0] === r.day)[1]),
          esc(r.start + "–" + r.end),
          esc(r.className),
          esc(r.subject),
          esc(r.teacher),
          esc(r.room),
          ...(actions
            ? [
                button(
                  tr("सुधारें", "Edit"),
                  "timetable-edit",
                  "doc",
                  false,
                  `data-id="${r.id}"`,
                ) +
                  button(
                    tr("हटाएँ", "Remove"),
                    "delete",
                    "x",
                    false,
                    `data-key="timetable" data-id="${r.id}"`,
                  ),
              ]
            : []),
        ]),
      ),
    );
  }
  function timetableHook() {
    bindForm("timetableForm", (v) => {
      const r = {
        ...v,
        id: timetableId || uid(),
        session: state.profile.session,
        day: +v.day,
      };
      for (const k of ["teacher", "className", "subject", "room"])
        r[k] = r[k].trim();
      if (r.start >= r.end)
        throw Error(
          tr(
            "समाप्ति का समय शुरू होने के बाद रखें।",
            "End time must be after start time.",
          ),
        );
      if (!r.teacher || !r.className || !r.subject)
        throw Error(
          tr(
            "शिक्षक, कक्षा और विषय भरें।",
            "Enter teacher, class and subject.",
          ),
        );
      const conflict = clashes(r, current("timetable"));
      if (conflict.length)
        throw Error(
          tr("समय टकराव: ", "Schedule clash: ") +
            conflict
              .map((x) => `${x.teacher} · ${x.className} · ${x.start}–${x.end}`)
              .join(", "),
        );
      if (commit((s) => upsert(s, "timetable", r))) {
        timetableId = "";
        rerender();
      }
    });
  }
  let worksheetId = "";
  function questions(subject, level, count, language) {
    const hi = language === "hi",
      pick = (a, b) => (hi ? a : b),
      result = [];
    let seed = level * 37 + count * 13;
    const rand = (n) => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed % n;
    };
    const banks = {
      Hindi: [
        [
          ["अ से शुरू होने वाला एक शब्द लिखो।", "अनार / अन्य सही शब्द"],
          ["अपना नाम लिखो।", "शिक्षक जाँचें"],
          ["क से शुरू होने वाला एक शब्द बोलो।", "कमल / अन्य सही शब्द"],
          ["माँ शब्द पढ़ो और लिखो।", "माँ"],
          ["दो फलों के नाम बताओ।", "आम, केला / अन्य सही उत्तर"],
        ],
        [
          ["दिन का उल्टा अर्थ वाला शब्द लिखो।", "रात"],
          ["एक पशु और एक पक्षी का नाम लिखो।", "गाय, तोता / अन्य सही उत्तर"],
          [
            "मैं विद्यालय जाता / जाती हूँ। वाक्य पढ़ो।",
            "शिक्षक उच्चारण जाँचें",
          ],
          ["किताब का बहुवचन लिखो।", "किताबें"],
          ["अपने मित्र के बारे में एक वाक्य लिखो।", "शिक्षक जाँचें"],
        ],
        [
          ["जल का समान अर्थ वाला शब्द लिखो।", "पानी"],
          ["वाक्य में क्रिया पहचानो: सीमा दौड़ती है।", "दौड़ती है"],
          ["अपने विद्यालय पर तीन वाक्य लिखो।", "शिक्षक विषय व वाक्य जाँचें"],
          ["अच्छा का विलोम लिखो।", "बुरा"],
          [
            "पेड़ हमारे लिए क्यों उपयोगी हैं?",
            "छाया, फल, हवा आदि; शिक्षक जाँचें",
          ],
        ],
        [
          ["वाक्य में विशेषण पहचानो: यह लाल फूल है।", "लाल"],
          [
            "वाक्य को भूतकाल में लिखो: राम खेलता है।",
            "राम खेलता था / राम ने खेला",
          ],
          ["स्वच्छता पर चार वाक्य लिखो।", "शिक्षक जाँचें"],
          ["ईमानदारी से जुड़ी छोटी घटना लिखो।", "शिक्षक जाँचें"],
          ["सूर्य के दो पर्यायवाची लिखो।", "रवि, सूरज / दिनकर"],
        ],
        [
          ["जल संरक्षण पर पाँच वाक्य लिखो।", "शिक्षक विचार व भाषा जाँचें"],
          ["वाक्य में संज्ञा पहचानो: मोहन जयपुर गया।", "मोहन, जयपुर"],
          [
            "अवकाश के लिए छोटा प्रार्थना पत्र लिखो।",
            "शिक्षक प्रारूप, कारण व भाषा जाँचें",
          ],
          [
            "मेहनत का फल विषय पर छोटी कहानी लिखो।",
            "शिक्षक क्रम व संदेश जाँचें",
          ],
          ["नौ दो ग्यारह होना मुहावरे का अर्थ लिखो।", "भाग जाना"],
        ],
      ],
      English: [
        [
          ["Write the first three letters of the alphabet.", "A, B, C"],
          ["Write your name.", "Teacher checks"],
          ["Name one colour.", "Any correct colour"],
          ["Fill in: c_t.", "cat"],
          ["Write the small letter for B.", "b"],
        ],
        [
          ["Fill in: I ___ a student.", "am"],
          ["Write the plural of cat.", "cats"],
          ["Name two things in your classroom.", "Any two appropriate objects"],
          ["Write the opposite of big.", "small"],
          ["Write a sentence using sun.", "Teacher checks"],
        ],
        [
          ["Choose: She (has / have) a book.", "has"],
          ["Underline the verb: Birds fly.", "fly"],
          ["Write three sentences about your friend.", "Teacher checks"],
          ["Write the opposite of early.", "late"],
          ["Fill in: ___ apple. (a / an)", "an"],
        ],
        [
          ["Write the past tense of go.", "went"],
          ["Find the adjective: The tall tree sways.", "tall"],
          ["Write a question beginning with Where.", "Teacher checks"],
          ["Join using and: I read. I write.", "I read and write."],
          ["Write four sentences about your school.", "Teacher checks"],
        ],
        [
          ["Change to past tense: She writes a letter.", "She wrote a letter."],
          [
            "Write a short invitation to your friend.",
            "Teacher checks purpose, date and place",
          ],
          ["Identify the adverb: He speaks softly.", "softly"],
          [
            "Explain why we should save water in four sentences.",
            "Teacher checks",
          ],
          [
            "Make a question: They are playing outside.",
            "Are they playing outside?",
          ],
        ],
      ],
      EVS: [
        [
          [
            pick("हाथ कब धोने चाहिए?", "When should you wash your hands?"),
            pick(
              "भोजन से पहले और शौच के बाद",
              "Before eating and after using the toilet",
            ),
          ],
          [
            pick("एक पालतू पशु का नाम बताओ।", "Name a domestic animal."),
            pick("गाय / कुत्ता / अन्य", "Cow / dog / other"),
          ],
          [
            pick("पीने के लिए हमें क्या चाहिए?", "What do we need to drink?"),
            pick("साफ पानी", "Clean water"),
          ],
        ],
        [
          [
            pick(
              "पौधे को बढ़ने के लिए क्या चाहिए?",
              "What does a plant need to grow?",
            ),
            pick("पानी, हवा, प्रकाश", "Water, air, light"),
          ],
          [
            pick("कचरा कहाँ डालना चाहिए?", "Where should we put rubbish?"),
            pick("कूड़ेदान में", "In a bin"),
          ],
          [
            pick("दो स्वस्थ भोजन के नाम बताओ।", "Name two healthy foods."),
            pick(
              "फल, दाल / अन्य सही उत्तर",
              "Fruit, pulses / other appropriate answers",
            ),
          ],
        ],
        [
          [
            pick("जड़ का एक काम लिखो।", "Write one function of roots."),
            pick(
              "पानी सोखना / पौधे को पकड़ना",
              "Absorb water / anchor the plant",
            ),
          ],
          [
            pick(
              "पानी बचाने के दो तरीके लिखो।",
              "Write two ways to save water.",
            ),
            pick("नल बंद करना, रिसाव ठीक करना", "Close taps, repair leaks"),
          ],
          [
            pick(
              "पक्षियों के शरीर पर क्या होता है?",
              "What covers a bird’s body?",
            ),
            pick("पंख", "Feathers"),
          ],
        ],
        [
          [
            pick("वाष्पीकरण क्या है?", "What is evaporation?"),
            pick("द्रव का वाष्प में बदलना", "Liquid changing into vapour"),
          ],
          [
            pick("एक खाद्य शृंखला लिखो।", "Write one food chain."),
            pick(
              "घास → बकरी → बाघ / उचित उदाहरण",
              "Grass → goat → tiger / suitable example",
            ),
          ],
          [
            pick(
              "मानचित्र में दिशाएँ क्यों उपयोगी हैं?",
              "Why are directions useful on a map?",
            ),
            pick(
              "स्थान ढूँढने व रास्ता समझने के लिए",
              "To locate places and understand routes",
            ),
          ],
        ],
        [
          [
            pick(
              "जल चक्र के तीन चरण लिखो।",
              "Name three stages of the water cycle.",
            ),
            pick(
              "वाष्पीकरण, संघनन, वर्षण",
              "Evaporation, condensation, precipitation",
            ),
          ],
          [
            pick(
              "कचरे का पृथक्करण क्यों करना चाहिए?",
              "Why should we separate waste?",
            ),
            pick(
              "पुनर्चक्रण, खाद व सुरक्षित निपटान के लिए",
              "For recycling, composting and safe disposal",
            ),
          ],
          [
            pick(
              "स्थानीय जल स्रोत बचाने की योजना लिखो।",
              "Write a plan to protect a local water source.",
            ),
            pick(
              "शिक्षक व्यावहारिक कदम जाँचें",
              "Teacher checks practical steps",
            ),
          ],
        ],
      ],
    };
    if (subject === "Mathematics") {
      for (let i = 0; i < count; i++) {
        let a, b, q, ans;
        const op = i % 3;
        if (level === 1) {
          a = rand(10) + 1;
          b = rand(9) + 1;
          q = `${a} + ${b} = ____`;
          ans = a + b;
        } else if (op === 0) {
          a = rand(10 ** Math.min(level, 3)) + 1;
          b = rand(10 ** Math.min(level - 1, 2)) + 1;
          q = `${a} + ${b} = ____`;
          ans = a + b;
        } else if (op === 1) {
          a = rand(10 ** Math.min(level, 3)) + 10;
          b = rand(a);
          q = `${a} − ${b} = ____`;
          ans = a - b;
        } else if (level < 4) {
          a = rand(9) + 2;
          b = rand(level * 3) + 1;
          q = `${a} × ${b} = ____`;
          ans = a * b;
        } else {
          b = rand(10) + 2;
          ans = rand(15) + 1;
          a = b * ans;
          q = `${a} ÷ ${b} = ____`;
        }
        result.push([q, String(ans)]);
      }
    } else {
      const bank = banks[subject][level - 1];
      for (let i = 0; i < Math.min(count, bank.length); i++)
        result.push(bank[i]);
    }
    return result;
  }
  function worksheetPage() {
    const r = current("worksheets").find((x) => x.id === worksheetId);
    return wrap(
      "worksheets",
      hint(
        tr(
          "मूल अभ्यास सामग्री: आधिकारिक प्रश्न-पत्र नहीं। बच्चे के स्तर के अनुसार संपादन करें। भाषा/पर्यावरण में सीमित प्रश्न हैं; गणित में 20 तक बना सकते हैं।",
          "Original practice material, not official exam papers. Adapt it to the child’s level. Language and EVS have a small prompt bank; maths supports up to 20 questions.",
        ),
      ) +
        panel(
          tr("1. अभ्यास बनाएँ", "1. Create practice"),
          `<div class="form-grid">${select("wsClass", tr("कक्षा / स्तर", "Class / level"), [1, 2, 3, 4, 5], 1)}${select("wsSubject", tr("विषय", "Subject"), subjects().slice(0, 4), "Mathematics")}${select(
            "wsLanguage",
            tr("निर्देश की भाषा", "Instruction language"),
            [
              ["hi", "हिन्दी"],
              ["en", "English"],
            ],
            A.LANG,
          )}${input("wsCount", tr("प्रश्न संख्या", "Number of questions"), 10, "number", 'min="1" max="20" step="1"')}${select(
            "wsType",
            tr("प्रकार", "Type"),
            [
              [tr("अभ्यास", "Practice"), tr("अभ्यास", "Practice")],
              ["Baseline", "Baseline"],
              ["SA 1", "SA 1"],
              ["SA 2", "SA 2"],
              ["SA 3", "SA 3"],
            ],
          )}</div><div class="toolbar">${button(tr("प्रश्न तैयार करें", "Generate questions"), "worksheet-generate", "bolt", true)}</div>`,
        ) +
        panel(
          tr("2. संपादन और सहेजना", "2. Edit and save"),
          form(
            "worksheetForm",
            input(
              "title",
              tr("शीर्षक", "Title"),
              r?.title || "",
              "text",
              'required maxlength="200"',
            ) +
              area(
                "body",
                tr("प्रश्न (इन्हें बदल सकते हैं)", "Questions (editable)"),
                r?.body || "",
                "required",
              ) +
              area(
                "answers",
                tr(
                  "उत्तर कुंजी (अलग प्रिंट होगी)",
                  "Answer key (printed separately)",
                ),
                r?.answers || "",
              ),
          ) +
            `<div class="toolbar">${button(tr("प्रश्न-पत्र प्रिंट", "Print questions"), "worksheet-print", "print")}${button(tr("उत्तर प्रिंट", "Print answer key"), "answers-print", "print")}</div>`,
        ) +
        panel(
          tr("सहेजे प्रश्न-पत्र", "Saved worksheets"),
          current("worksheets").length
            ? current("worksheets")
                .map(
                  (r) =>
                    `<div class="task-row"><span>${esc(r.title)}</span>${button(tr("खोलें", "Open"), "worksheet-edit", "book", false, `data-id="${r.id}"`)}</div>`,
                )
                .join("")
            : empty(),
        ),
    );
  }
  function worksheetHook() {
    for (const id of ["body", "answers"]) $("#" + id).maxLength = 20000;
    bindForm("worksheetForm", (v) => {
      const id = worksheetId || uid();
      if (
        commit((s) =>
          upsert(s, "worksheets", {
            ...v,
            id,
            session: s.profile.session,
            date: today(),
          }),
        )
      ) {
        worksheetId = id;
        rerender();
      }
    });
  }
  const registerKinds = () => [
    ["visitor", tr("आगंतुक पंजी", "Visitor register")],
    ["ptm", tr("अभिभावक बैठक (PTM)", "Parent meeting (PTM)")],
    ["staff", tr("स्टाफ व सेवा कार्य", "Staff & service tasks")],
    ["training", tr("प्रशिक्षण व CPD", "Training & CPD")],
    ["bill", tr("बिल व भुगतान", "Bills & payments")],
    ["stock", tr("सामग्री / पुस्तक पंजी", "Stock / library register")],
    ["nilp", tr("NILP शिक्षार्थी", "NILP learner log")],
    ["remedial", tr("उपचारात्मक शिक्षण", "Remedial teaching")],
  ];
  let registerKind = "visitor",
    registerId = "";
  function registerPage() {
    const r = current("registers").find((x) => x.id === registerId);
    return wrap(
      "registers",
      select(
        "registerKind",
        tr("पंजी चुनें", "Choose a register"),
        registerKinds(),
        registerKind,
      ) +
        hint(
          tr(
            "इस पंजी में केवल जरूरी विवरण रखें। “अगली तारीख” वाले रिकॉर्ड होम के कामों में स्वतः नहीं जुड़ते; नीचे लंबित कार्य देखें।",
            "Keep only necessary details. Follow-up dates remain in this register; pending entries are shown below.",
          ),
        ) +
        panel(
          tr("प्रविष्टि जोड़ें", "Add an entry"),
          form(
            "registerForm",
            input(
              "date",
              tr("दिनांक", "Date"),
              r?.date || today(),
              "date",
              "required",
            ) +
              input(
                "name",
                tr("व्यक्ति / मद का नाम", "Person / item name"),
                r?.name || "",
                "text",
                'required maxlength="200"',
              ) +
              area(
                "detail",
                tr("उद्देश्य / विवरण / मात्रा", "Purpose / details / quantity"),
                r?.detail || "",
              ) +
              area(
                "action",
                tr("निर्णय / कार्रवाई / स्थिति", "Decision / action / status"),
                r?.action || "",
              ) +
              input(
                "due",
                tr("अगली तारीख (वैकल्पिक)", "Follow-up date (optional)"),
                r?.due || "",
                "date",
              ) +
              input(
                "amount",
                tr(
                  "राशि ₹ / प्रशिक्षण घंटे / मात्रा (मद विवरण में इकाई लिखें)",
                  "Amount ₹ / training hours / quantity (write unit in details)",
                ),
                r?.amount || 0,
                "number",
                'required min="0" step="0.01"',
              ),
          ) + button(tr("नई प्रविष्टि", "New entry"), "register-new", "plus"),
        ) +
        panel(
          tr("सहेजी प्रविष्टियाँ", "Saved entries"),
          `<div class="toolbar">${button(tr("प्रिंट / PDF", "Print / PDF"), "register-print", "print")}${button("CSV", "register-csv", "download")}</div>` +
            registerReport(true),
        ),
    );
  }
  function registerRows() {
    return current("registers")
      .filter((r) => r.kind === registerKind)
      .sort((a, b) => b.date.localeCompare(a.date));
  }
  function registerReport(actions = false) {
    return registerRows().length
      ? table(
          [
            tr("दिनांक", "Date"),
            tr("नाम", "Name"),
            tr("विवरण", "Details"),
            tr("कार्रवाई", "Action"),
            tr("अगली तारीख", "Follow-up"),
            tr("राशि / संख्या", "Amount / count"),
            ...(actions ? [""] : []),
          ],
          registerRows().map((r) =>
            row([
              esc(r.date),
              esc(r.name),
              esc(r.detail),
              esc(r.action),
              esc(r.due) +
                (r.due && r.due <= today()
                  ? ` <span class="badge">${tr("समीक्षा करें", "Review due")}</span>`
                  : ""),
              esc(r.amount),
              ...(actions
                ? [
                    button(
                      tr("सुधारें", "Edit"),
                      "register-edit",
                      "doc",
                      false,
                      `data-id="${r.id}"`,
                    ),
                  ]
                : []),
            ]),
          ),
        )
      : empty();
  }
  function registerHook() {
    filterChange("registerKind", (v) => {
      registerKind = v;
      registerId = "";
    });
    bindForm("registerForm", (v) => {
      if (!v.name.trim()) throw Error(tr("नाम भरें।", "Enter a name."));
      if (
        commit((s) =>
          upsert(s, "registers", {
            ...v,
            name: v.name.trim(),
            amount: +v.amount,
            id: registerId || uid(),
            session: s.profile.session,
            kind: registerKind,
          }),
        )
      ) {
        registerId = "";
        rerender();
      }
    });
  }
  function tasksPage() {
    const tasks = current("tasks").sort(
      (a, b) => Number(a.done) - Number(b.done) || a.due.localeCompare(b.due),
    );
    return wrap(
      "tasks",
      hint(
        tr(
          "स्मरण सूची ऐप खोलने पर दिखती है। ऐप बंद होने पर सूचना नहीं भेजी जाती।",
          "Your reminders appear when you open the app. Notifications are not sent while it is closed.",
        ),
      ) +
        panel(
          tr("नया काम", "New task"),
          form(
            "taskForm",
            input(
              "title",
              tr("क्या करना है?", "What needs doing?"),
              "",
              "text",
              'required maxlength="300"',
            ) +
              input(
                "due",
                tr("कब तक?", "Due date"),
                today(),
                "date",
                "required",
              ),
          ),
        ) +
        panel(
          tr("मेरे काम", "My tasks"),
          tasks.length
            ? tasks
                .map(
                  (t) =>
                    `<div class="task-row"><div class="${t.done ? "done" : ""}"><strong>${esc(t.title)}</strong><br><small>${esc(t.due)} ${!t.done && t.due < today() ? tr("· समय बीत गया", "· Overdue") : ""}</small></div><div>${button(t.done ? tr("फिर खोलें", "Reopen") : tr("पूरा हुआ", "Mark done"), "task-toggle", "check", false, `data-id="${t.id}"`)}${button(tr("हटाएँ", "Remove"), "delete", "x", false, `data-key="tasks" data-id="${t.id}"`)}</div></div>`,
                )
                .join("")
            : empty(
                tr(
                  "कोई काम बाकी नहीं। नया काम ऊपर जोड़ें।",
                  "Nothing on your list. Add a task above.",
                ),
              ),
        ),
    );
  }
  function tasksHook() {
    bindForm("taskForm", (v) => {
      if (!v.title.trim())
        throw Error(tr("काम का नाम लिखें।", "Enter a task title."));
      if (
        commit((s) =>
          s.tasks.push({
            id: uid(),
            session: s.profile.session,
            title: v.title.trim(),
            due: v.due,
            done: false,
          }),
        )
      )
        rerender();
    });
  }
  const documentTypes = () => [
    ["ptm", tr("PTM / मेगा PTM आमंत्रण", "PTM / Mega PTM invitation")],
    [
      "independence",
      tr("स्वतंत्रता दिवस आमंत्रण", "Independence Day invitation"),
    ],
    ["republic", tr("गणतंत्र दिवस आमंत्रण", "Republic Day invitation")],
    ["admission", tr("अस्थायी प्रवेश विवरण", "Provisional admission request")],
    ["hra", tr("HRA आवेदन मसौदा", "HRA application draft")],
    [
      "election",
      tr("चुनाव ड्यूटी / मतदान अवकाश", "Election duty / voting leave"),
    ],
    ["vidya", tr("विद्या संबल आवेदन", "Vidya Sambal application")],
    ["nilp", tr("NILP शिक्षार्थी विवरण", "NILP learner details")],
    ["games", tr("शिक्षक खेल आवेदन", "Teacher sports application")],
    [
      "service",
      tr("सेवा / परिवीक्षा / ACP अनुरोध", "Service / probation / ACP request"),
    ],
    ["salary", tr("वेतन आहरण अनुरोध", "Salary drawal request")],
  ];
  let documentId = "";
  function documentPage() {
    const r = current("documents").find((x) => x.id === documentId);
    return wrap(
      "documents",
      hint(
        tr(
          "ये संपादन योग्य मसौदे हैं। प्रमाण-पत्र या सरकारी स्वीकृति नहीं। संबंधित कार्यालय का निर्धारित प्रारूप और आवश्यक संलग्नक जाँचें।",
          "These are editable drafts, not certificates or government approvals. Check the receiving office’s prescribed format and required attachments.",
        ),
      ) +
        panel(
          tr("1. विवरण भरें", "1. Fill the details"),
          `<div class="form-grid">${select("docType", tr("प्रपत्र", "Document"), documentTypes())}${input("docName", tr("आवेदक / विद्यार्थी / आमंत्रित व्यक्ति", "Applicant / student / invitee"), state.profile.teacher, "text", 'maxlength="200"')}${input("docDate", tr("आयोजन / आवेदन की तारीख", "Event / application date"), today(), "date")}${input("docTime", tr("समय (आमंत्रण हेतु)", "Time (for invitations)"), "10:00", "time")}${input("docPlace", tr("स्थान / कार्यालय", "Venue / office"), state.profile.school, "text", 'maxlength="200"')}${input("docRef", tr("पद / कक्षा / आदेश संदर्भ", "Post / class / order reference"), "", "text", 'maxlength="200"')}${area("docDetails", tr("कारण, विवरण व संलग्नक", "Reason, details and attachments"), "")}</div><div class="toolbar">${button(tr("मसौदा बनाएँ", "Create draft"), "document-generate", "doc", true)}</div>`,
        ) +
        panel(
          tr("2. जाँचें, संपादित करें और सहेजें", "2. Review, edit and save"),
          form(
            "documentForm",
            input(
              "title",
              tr("शीर्षक", "Title"),
              r?.title || "",
              "text",
              'required maxlength="200"',
            ) +
              area(
                "body",
                tr("पत्र का पाठ", "Document text"),
                r?.body || "",
                "required",
              ),
          ) +
            `<div class="toolbar">${button(tr("प्रिंट / PDF", "Print / PDF"), "document-print", "print")}${button(tr("कॉपी करें", "Copy text"), "document-copy", "copy")}</div>`,
        ) +
        panel(
          tr("सहेजे दस्तावेज़", "Saved documents"),
          current("documents").length
            ? current("documents")
                .map(
                  (r) =>
                    `<div class="task-row"><span>${esc(r.title)} · ${esc(r.date)}</span>${button(tr("खोलें", "Open"), "document-edit", "doc", false, `data-id="${r.id}"`)}</div>`,
                )
                .join("")
            : empty(),
        ),
    );
  }
  function documentHook() {
    $("#body").maxLength = 20000;
    bindForm("documentForm", (v) => {
      const id = documentId || uid();
      if (
        commit((s) =>
          upsert(s, "documents", {
            ...v,
            id,
            session: s.profile.session,
            date: today(),
          }),
        )
      ) {
        documentId = id;
        rerender();
      }
    });
  }
  function generateDocument() {
    if (!confirmDiscard()) return;
    const kind = $("#docType").value,
      name = $("#docName").value.trim(),
      date = $("#docDate").value,
      time = $("#docTime").value,
      place = $("#docPlace").value.trim(),
      ref = $("#docRef").value.trim(),
      details = $("#docDetails").value.trim();
    if (!validDate(date)) {
      showError(tr("सही तारीख भरें।", "Enter a valid date."));
      return;
    }
    const label = documentTypes().find((x) => x[0] === kind)[1];
    let body;
    if (["ptm", "independence", "republic"].includes(kind)) {
      body = tr(
        `आदरणीय ${name || "अभिभावक / अतिथि"},\n\nआपको ${label} हेतु सादर आमंत्रित किया जाता है।\nदिनांक: ${date}\nसमय: ${time}\nस्थान: ${place}\n\n${kind === "ptm" ? "हम बच्चे की सीखने की प्रगति, रुचियों और सहयोग की योजना पर मिलकर चर्चा करेंगे।" : ""}\n${details}\n\nसादर,\n${state.profile.teacher}\n${state.profile.school}`,
        `Dear ${name || "Parent / Guest"},\n\nYou are warmly invited to our ${label}.\nDate: ${date}\nTime: ${time}\nVenue: ${place}\n\n${kind === "ptm" ? "We will discuss your child’s progress, interests and next learning steps together." : ""}\n${details}\n\nRegards,\n${state.profile.teacher}\n${state.profile.school}`,
      );
    } else {
      const requests = {
        admission: tr(
          "विद्यार्थी के अस्थायी प्रवेश हेतु आवेदन पर विचार करने का निवेदन है।",
          "Please consider the request for provisional admission.",
        ),
        hra: tr(
          "लागू नियमों के अंतर्गत मकान किराया भत्ते हेतु मेरे आवेदन की जाँच कर आवश्यक कार्रवाई करें।",
          "Please examine my house rent allowance application under the applicable rules.",
        ),
        election: tr(
          "संलग्न आदेश / मतदान विवरण के आधार पर ड्यूटी अथवा अवकाश संबंधी आवश्यक कार्रवाई का निवेदन है।",
          "Please take the necessary action on duty or leave based on the attached order / voting details.",
        ),
        vidya: tr(
          "विज्ञापित पद के लिए मेरी योग्यता एवं संलग्न दस्तावेजों के आधार पर आवेदन पर विचार करें।",
          "Please consider my application for the advertised post based on my qualifications and attached documents.",
        ),
        nilp: tr(
          "शिक्षार्थी विवरण का सत्यापन कर निर्धारित पंजीकरण प्रक्रिया में मार्गदर्शन दें।",
          "Please verify the learner details and guide the prescribed registration process.",
        ),
        games: tr(
          "निर्दिष्ट खेल प्रतियोगिता में भाग लेने की अनुमति हेतु आवेदन प्रस्तुत है।",
          "I request permission to participate in the specified sports competition.",
        ),
        service: tr(
          "मेरे सेवा अभिलेख एवं संलग्न विवरण के आधार पर अनुरोधित सेवा प्रकरण की जाँच करें।",
          "Please examine the requested service matter using my service records and attached details.",
        ),
        salary: tr(
          "संलग्न उपस्थिति एवं सेवा विवरण की जाँच कर नियमानुसार वेतन आहरण की कार्रवाई करें।",
          "Please verify the attached attendance and service details and process salary drawal under the applicable rules.",
        ),
      };
      body = tr(
        `सेवा में,\n${place || "संस्था प्रधान / संबंधित अधिकारी"}\n\nविषय: ${label}\nसंदर्भ / पद / कक्षा: ${ref}\n\nमहोदय / महोदया,\n${requests[kind]}\n\nआवेदक / विद्यार्थी: ${name}\n${details}\n\nदिनांक: ${date}\nहस्ताक्षर: __________________\nनाम: ${name}\n\nसंलग्नक: विवरण के अनुसार`,
        `To,\n${place || "Head of school / concerned officer"}\n\nSubject: ${label}\nReference / post / class: ${ref}\n\nSir / Madam,\n${requests[kind]}\n\nApplicant / student: ${name}\n${details}\n\nDate: ${date}\nSignature: __________________\nName: ${name}\n\nAttachments: as listed in the details`,
      );
    }
    documentId = "";
    $("#title").value = label;
    $("#body").value = body;
    dirty = true;
    $("#title").focus();
  }
  function backupPage() {
    return wrap(
      "backup",
      panel(
        tr("विद्यालय और शैक्षिक सत्र", "School and academic session"),
        form(
          "profileForm",
          input(
            "school",
            tr("विद्यालय का नाम", "School name"),
            state.profile.school,
            "text",
            'required maxlength="200"',
          ) +
            input(
              "teacher",
              tr("शिक्षक का नाम", "Teacher name"),
              state.profile.teacher,
              "text",
              'maxlength="200"',
            ) +
            input(
              "session",
              tr("शैक्षिक सत्र", "Academic session"),
              state.profile.session,
              "text",
              'required maxlength="40" placeholder="2026-27"',
            ),
        ) +
          hint(
            tr(
              "सत्र बदलने से पुराने रिकॉर्ड नहीं मिटते। उन्हें देखने के लिए पुराना सत्र फिर लिखें। नए सत्र में विद्यार्थी स्वतः प्रमोट नहीं होते।",
              "Changing session keeps earlier records. Enter the earlier session to view them. Students are not automatically promoted.",
            ),
          ),
      ) +
        panel(
          tr("अपने काम की सुरक्षित प्रति", "Keep a copy of your work"),
          `<p>${tr("इस कार्यस्थल के सभी सत्रों के विद्यार्थी, उपस्थिति, आकलन, पोर्टफोलियो, पोषाहार, समय-सारणी, पंजिकाएँ, काम और दस्तावेज़ एक फ़ाइल में।", "One file with all workspace sessions: students, attendance, assessments, portfolios, meals, timetables, registers, tasks and documents.")}</p><div class="toolbar">${button(tr("बैकअप डाउनलोड करें", "Download backup"), "backup-export", "download", true)}${button(tr("रिकवरी प्रति", "Download recovery copy"), "recovery", "download")}</div>${hint(tr("इस फ़ाइल में आपके भरे हुए निजी रिकॉर्ड हैं। इसे सुरक्षित रखें। पुरानी सुविधाओं के सहेजे पत्र/वेतन/लिंक इस कार्यस्थल बैकअप में शामिल नहीं हैं।", "This file contains the personal records you entered. Keep it safe. Saved letters, salary data and links from the legacy tools are not included in this workspace backup."))}<label for="restoreFile">${tr("बैकअप फ़ाइल चुनें (अधिकतम 10 MB)", "Choose a backup file (up to 10 MB)")}<input type="file" id="restoreFile" accept=".json,application/json"></label><div id="restorePreview" aria-live="polite"></div>`,
        ) +
        panel(
          tr("ऑफ़लाइन उपयोग", "Use without internet"),
          `<p>${tr("वेबसाइट एक बार पूरी लोड करें। उपलब्ध होने पर ब्राउज़र मेन्यू से “ऐप इंस्टॉल करें / होम स्क्रीन पर जोड़ें” चुनें। या एकल HTML प्रति डाउनलोड करें।", "Load the website fully once. When available, use your browser menu to install the app or add it to your home screen. You can also download the single HTML copy.")}</p><div id="offlineStatus" role="status">${tr("ऑफ़लाइन उपलब्धता जाँच रहे हैं…", "Checking offline availability…")}</div><div class="toolbar"><a class="btn" href="TeacherBuddy.html" download="TeacherBuddy.html">${svg("download")}${tr("ऑफ़लाइन HTML डाउनलोड", "Download offline HTML")}</a>${button(tr("बड़ा अक्षर चालू / बंद", "Toggle larger text"), "large", "search")}</div>${hint(tr("बाहरी पोर्टल / PDF इंटरनेट पर खुलते हैं। अलग ब्राउज़र या HTML फ़ाइल में डेटा ले जाने के लिए बैकअप आयात करें। इस ऐप में कोई स्वतः क्लाउड सिंक नहीं है।", "External portals / PDFs need internet. Import a backup to move records to another browser or HTML file. There is no automatic cloud sync."))}`,
        ),
    );
  }
  function backupHook() {
    pendingRestore = null;
    bindForm("profileForm", (v) => {
      v.session = v.session.trim();
      if (!v.school.trim() || !v.session)
        throw Error(
          tr("विद्यालय और सत्र भरें।", "Enter the school and session."),
        );
      if (
        commit(
          (s) =>
            (s.profile = {
              school: v.school.trim(),
              teacher: v.teacher.trim(),
              session: v.session,
            }),
        )
      ) {
        assessmentId = "";
        mealId = "";
        timetableId = "";
        registerId = "";
        worksheetId = "";
        documentId = "";
        rerender();
      }
    });
    $("#restoreFile").addEventListener("change", async (e) => {
      const f = e.target.files[0];
      pendingRestore = null;
      $("#restorePreview").textContent = "";
      if (!f) return;
      try {
        if (f.size > 10 * 1024 * 1024)
          throw Error(
            tr("फ़ाइल 10 MB से बड़ी है।", "File is larger than 10 MB."),
          );
        const parsed = JSON.parse(await f.text());
        if (parsed.app !== "TeacherBuddy Workspace" || parsed.format !== 1)
          throw Error(
            tr(
              "TeacherBuddy कार्यस्थल बैकअप चुनें।",
              "Choose a TeacherBuddy workspace backup.",
            ),
          );
        const candidate = validate(parsed.data);
        if ($("#restorePreview") === null) return;
        pendingRestore = candidate;
        $("#restorePreview").innerHTML =
          `<div class="success"><strong>${esc(candidate.profile.school || "TeacherBuddy")}</strong><p>${candidate.students.length} ${tr("विद्यार्थी", "students")} · ${candidate.attendance.length} ${tr("उपस्थिति रिकॉर्ड", "attendance records")} · ${candidate.documents.length} ${tr("दस्तावेज़", "documents")}</p><p>${tr("आयात करने से इस कार्यस्थल के सभी वर्तमान सत्रों का डेटा बदलेगा। पहले वर्तमान बैकअप डाउनलोड करें।", "Restoring replaces every current workspace session. Download your current backup first.")}</p>${button(tr("इस बैकअप से पुनर्स्थापित करें", "Restore this backup"), "backup-restore", "upload")}</div>`;
      } catch (err) {
        showError(
          tr("आयात नहीं हुआ: ", "Import not performed: ") + err.message,
        );
      }
    });
    const status = $("#offlineStatus");
    if (location.protocol === "file:") {
      status.textContent = tr(
        "यह HTML फ़ाइल ऑफ़लाइन चल सकती है।",
        "This HTML file can run offline.",
      );
    } else if ("caches" in window) {
      caches
        .keys()
        .then(async (keys) => {
          const key = keys.find((k) => k.startsWith("teacherbuddy-v2-"));
          const c = key ? await caches.open(key) : null;
          const hit = c
            ? await c.match(new URL("index.html", location.href).href)
            : null;
          if (status.isConnected)
            status.textContent = hit
              ? tr(
                  "✓ ऐप की ऑफ़लाइन प्रति तैयार है।",
                  "✓ Offline app copy is ready.",
                )
              : tr(
                  "ऑफ़लाइन प्रति अभी तैयार नहीं है। ऑनलाइन रहते हुए पेज दोबारा खोलें या HTML डाउनलोड करें।",
                  "Offline copy is not ready yet. Reload while online or download the HTML file.",
                );
        })
        .catch(() => {
          status.textContent = tr(
            "ऑफ़लाइन कैश उपलब्ध नहीं। HTML डाउनलोड करें।",
            "Offline cache unavailable. Download the HTML file.",
          );
        });
    } else
      status.textContent = tr(
        "HTML डाउनलोड करके ऑफ़लाइन उपयोग करें।",
        "Download the HTML file for offline use.",
      );
  }
  function exportBackup() {
    A.download(
      "TeacherBuddy-backup-" + today() + ".json",
      JSON.stringify(
        {
          app: "TeacherBuddy Workspace",
          format: 1,
          exportedAt: new Date().toISOString(),
          data: state,
        },
        null,
        2,
      ),
      "application/json",
    );
  }
  function dispatch(action, node) {
    const id = node.dataset.id;
    switch (action) {
      case "large": {
        const enabled =
          !document.documentElement.classList.contains("tb-large");
        document.documentElement.classList.toggle("tb-large", enabled);
        LS.set("largeText", enabled);
        break;
      }
      case "student-edit": {
        if (!confirmDiscard()) return;
        const s = getStudent(id);
        $("#studentId").value = s.id;
        for (const k of ["name", "className", "roll", "guardian"])
          $("#" + k).value = s[k];
        dirty = false;
        $("#name").focus();
        break;
      }
      case "student-archive":
        if (
          confirmDiscard() &&
          commit((s) => {
            const r = s.students.find((x) => x.id === id);
            r.archived = !r.archived;
          })
        )
          rerender();
        break;
      case "roster-csv":
        csv(
          "students",
          [
            tr("नाम", "Name"),
            tr("कक्षा", "Class"),
            tr("रोल", "Roll"),
            tr("अभिभावक", "Guardian"),
          ],
          students(null, true).map((s) => [
            s.name,
            s.className,
            s.roll,
            s.guardian,
          ]),
        );
        break;
      case "roster-print":
        printDoc(
          title("students"),
          table(
            [
              tr("नाम", "Name"),
              tr("कक्षा", "Class"),
              tr("रोल", "Roll"),
              tr("अभिभावक", "Guardian"),
            ],
            students().map((s) =>
              row([s.name, s.className, s.roll, s.guardian].map(esc)),
            ),
          ),
        );
        break;
      case "all-present":
        $('#attendanceForm [name="holiday"]').checked = false;
        $("#attendanceForm")
          .querySelectorAll("select")
          .forEach((s) => (s.value = "P"));
        dirty = true;
        break;
      case "attendance-print":
        printDoc(
          `${title("attendance")} · ${attendanceClass} · ${attendanceMonth}`,
          attendanceSummary(),
        );
        break;
      case "attendance-csv":
        csv(
          "attendance-" + attendanceClass + "-" + attendanceMonth,
          attendanceHeads(),
          attendanceRows(),
        );
        break;
      case "assessment-new":
        if (confirmDiscard()) {
          assessmentId = "";
          dirty = false;
          rerender();
        }
        break;
      case "assessment-edit":
        if (confirmDiscard()) {
          assessmentId = id;
          dirty = false;
          rerender();
        }
        break;
      case "assessment-print": {
        const r = current("assessments").find((x) => x.id === id);
        printDoc(
          `${r.className} · ${r.subject} · ${r.term} · ${r.date}`,
          assessmentReport(r),
        );
        break;
      }
      case "portfolio-print": {
        if (dirty) {
          showError(
            tr(
              "प्रिंट से पहले पोर्टफोलियो सहेजें।",
              "Save the portfolio before printing.",
            ),
          );
          return;
        }
        const p = current("portfolios").find(
          (r) => r.studentId === portfolioStudent,
        );
        if (!p) {
          showError(tr("पहले पोर्टफोलियो सहेजें।", "Save a portfolio first."));
          return;
        }
        const s = getStudent(portfolioStudent);
        printDoc(
          `${title("portfolio")} · ${s.name} · ${s.className}`,
          ["strengths", "support", "evidence", "goal", "guardian", "review"]
            .map(
              (k, i) =>
                `<h2>${esc([tr("खूबियाँ", "Strengths"), tr("सहयोग", "Support"), tr("प्रगति के उदाहरण", "Evidence"), tr("अगला लक्ष्य", "Next goal"), tr("अभिभावक", "Guardian"), tr("अगली समीक्षा", "Next review")][i])}</h2><p class="pre">${esc(p[k])}</p>`,
            )
            .join("") + portfolioMarks(),
        );
        break;
      }
      case "meal-new":
        if (confirmDiscard()) {
          mealId = "";
          dirty = false;
          rerender();
        }
        break;
      case "meal-edit":
        if (confirmDiscard()) {
          mealId = id;
          dirty = false;
          rerender();
        }
        break;
      case "meal-print":
        printDoc(
          title("meal-ledger") + " · " + mealMonth,
          mealReport().replace(/<button[\s\S]*?<\/button>/g, ""),
        );
        break;
      case "meal-csv": {
        const rows = mealTotals().rows;
        csv(
          "meals-" + mealMonth,
          [
            "Date",
            "Primary meals",
            "Upper meals",
            "Grain received kg",
            "Grain used kg",
            "Milk received litres",
            "Milk distributed litres",
            "Cash received INR",
            "Spent INR",
            "Note",
          ],
          rows.map((r) => [
            r.date,
            r.primary,
            r.upper,
            r.grainIn,
            r.grainOut,
            r.milkIn,
            r.milkOut,
            r.received,
            r.spent,
            r.note,
          ]),
        );
        break;
      }
      case "timetable-new":
        if (confirmDiscard()) {
          timetableId = "";
          dirty = false;
          rerender();
        }
        break;
      case "timetable-edit":
        if (confirmDiscard()) {
          timetableId = id;
          dirty = false;
          rerender();
        }
        break;
      case "timetable-print":
        printDoc(title("timetable"), timetableReport());
        break;
      case "timetable-csv":
        csv(
          "timetable",
          ["Day", "Start", "End", "Class", "Subject", "Teacher", "Room"],
          timetableRows().map((r) => [
            days().find((x) => x[0] === r.day)[1],
            r.start,
            r.end,
            r.className,
            r.subject,
            r.teacher,
            r.room,
          ]),
        );
        break;
      case "worksheet-generate": {
        if (!confirmDiscard()) return;
        const count = Number($("#wsCount").value);
        if (!Number.isInteger(count) || count < 1 || count > 20) {
          showError(
            tr("1 से 20 प्रश्न चुनें।", "Choose between 1 and 20 questions."),
          );
          return;
        }
        const level = +$("#wsClass").value,
          subject = $("#wsSubject").value,
          lang = $("#wsLanguage").value;
        const qs = questions(subject, level, count, lang);
        worksheetId = "";
        $("#title").value =
          `${$("#wsType").value} · ${subject} · ${tr("कक्षा", "Class")} ${level}`;
        $("#body").value = qs
          .map((q, i) => `${i + 1}. ${q[0]}\n\n____________________________`)
          .join("\n\n");
        $("#answers").value = qs.map((q, i) => `${i + 1}. ${q[1]}`).join("\n");
        dirty = true;
        $("#title").focus();
        break;
      }
      case "worksheet-edit":
        if (confirmDiscard()) {
          worksheetId = id;
          dirty = false;
          rerender();
        }
        break;
      case "worksheet-print":
      case "answers-print": {
        const answers = action === "answers-print";
        const body = $(answers ? "#answers" : "#body").value;
        if (!body.trim()) {
          showError(
            tr(
              "पहले प्रश्न / उत्तर बनाएँ।",
              "Create questions / answers first.",
            ),
          );
          return;
        }
        printDoc(
          $("#title").value +
            (answers ? " · " + tr("उत्तर कुंजी", "Answer key") : ""),
          (answers
            ? ""
            : `<p>${tr("नाम: __________________ कक्षा: ______ दिनांक: ______", "Name: __________________ Class: ______ Date: ______")}</p>`) +
            `<div class="pre">${esc(body)}</div>`,
        );
        break;
      }
      case "register-new":
        if (confirmDiscard()) {
          registerId = "";
          dirty = false;
          rerender();
        }
        break;
      case "register-edit":
        if (confirmDiscard()) {
          registerId = id;
          dirty = false;
          rerender();
        }
        break;
      case "register-print":
        printDoc(
          registerKinds().find((x) => x[0] === registerKind)[1],
          registerReport(),
        );
        break;
      case "register-csv":
        csv(
          "register-" + registerKind,
          ["Date", "Name", "Details", "Action", "Follow-up", "Amount / count"],
          registerRows().map((r) => [
            r.date,
            r.name,
            r.detail,
            r.action,
            r.due,
            r.amount,
          ]),
        );
        break;
      case "task-toggle":
        if (
          confirmDiscard() &&
          commit((s) => {
            const t = s.tasks.find((x) => x.id === id);
            t.done = !t.done;
          })
        )
          rerender();
        break;
      case "delete":
        if (
          confirmDiscard() &&
          confirm(
            tr(
              "यह प्रविष्टि हटाएँ? यह वापस नहीं आएगी।",
              "Remove this entry? This cannot be undone.",
            ),
          ) &&
          ["tasks", "timetable"].includes(node.dataset.key)
        ) {
          if (
            commit(
              (s) =>
                (s[node.dataset.key] = s[node.dataset.key].filter(
                  (x) => x.id !== id,
                )),
            )
          ) {
            timetableId = "";
            rerender();
          }
        }
        break;
      case "document-generate":
        generateDocument();
        break;
      case "document-edit":
        if (confirmDiscard()) {
          documentId = id;
          dirty = false;
          rerender();
        }
        break;
      case "document-print":
        if ($("#body").value.trim())
          printDoc(
            $("#title").value,
            `<div class="pre">${esc($("#body").value)}</div>`,
          );
        else showError(tr("पहले मसौदा बनाएँ।", "Create a draft first."));
        break;
      case "document-copy":
        A.copyText($("#body").value);
        break;
      case "backup-export":
        if (storageError) {
          showError(tr("पहले रिकवरी प्रति डाउनलोड करें; मौजूदा डेटा पढ़ा नहीं जा सका।", "Download the recovery copy first; the existing data could not be read."));
          return;
        }
        exportBackup();
        break;
      case "recovery":
        try {
          A.download(
            "TeacherBuddy-recovery-" + today() + ".txt",
            localStorage.getItem(KEY) || "No saved workspace data",
            "text/plain",
          );
        } catch (e) {
          showError(e.message);
        }
        break;
      case "backup-restore": {
        if (!pendingRestore) return;
        if (
          !confirmDiscard() ||
          !confirm(
            tr(
              "बैकअप से सभी कार्यस्थल सत्रों का वर्तमान डेटा बदलें?",
              "Replace all current workspace sessions with this backup?",
            ),
          )
        )
          return;
        const restored = clone(pendingRestore);
        if (
          commit((s) => {
            for (const k of ["profile", ...arrays]) s[k] = restored[k];
          }, true)
        ) {
          pendingRestore = null;
          assessmentId = "";
          mealId = "";
          timetableId = "";
          registerId = "";
          worksheetId = "";
          documentId = "";
          rerender();
        }
        break;
      }
    }
  }
  const rajasthanWorkflows = () => [
    {
      id: "school",
      title: tr(
        "शाला दर्पण: विद्यालय व विद्यार्थी",
        "Shala Darpan: school & students",
      ),
      url: "https://rajshaladarpan.rajasthan.gov.in/",
      tools: [
        ["students", "विद्यार्थी सूची", "Student roster"],
        ["attendance", "उपस्थिति सारांश", "Attendance summary"],
      ],
      steps: [
        tr("नामांकन व कक्षा सूची की जाँच", "Check enrolment and class lists"),
        tr(
          "उपस्थिति पंजिका और पोर्टल प्रविष्टि का मिलान",
          "Reconcile attendance register with portal entries",
        ),
        tr(
          "सुधार के लिए लंबित विद्यार्थी / स्टाफ विवरण सूचीबद्ध करें",
          "List student / staff details that need correction",
        ),
        tr(
          "पोर्टल पर कार्य पूरा कर पावती / संदर्भ सुरक्षित रखें",
          "Complete portal work and keep the acknowledgement / reference",
        ),
      ],
    },
    {
      id: "cce",
      title: tr("CCE / SIQE व प्रखर पठन", "CCE / SIQE & Prakhar reading"),
      url: "https://rajshaladarpan.rajasthan.gov.in/",
      tools: [
        ["assessments", "आकलन", "Assessments"],
        ["portfolio", "पोर्टफोलियो", "Portfolio"],
        ["timetable", "पठन कालांश", "Reading period"],
      ],
      steps: [
        tr(
          "आकलन में शेष बच्चों की पहचान करें",
          "Identify children still to be assessed",
        ),
        tr(
          "सीखने के प्रमाण व अगला लक्ष्य पोर्टफोलियो में लिखें",
          "Record learning evidence and next steps in portfolios",
        ),
        tr(
          "पठन कालांश व सहयोग समूह की योजना बनाएँ",
          "Plan reading periods and support groups",
        ),
        tr(
          "वर्तमान विभागीय निर्देश से अभिलेख मिलाएँ",
          "Check records against the current departmental instructions",
        ),
      ],
    },
    {
      id: "mdm",
      title: tr(
        "पोषाहार / PM POSHAN मासिक तैयारी",
        "PM POSHAN monthly preparation",
      ),
      url: "https://rajshaladarpan.rajasthan.gov.in/",
      tools: [
        ["meal-ledger", "पोषाहार पंजी", "Meal register"],
        ["registers", "बिल संदर्भ", "Bill references"],
      ],
      steps: [
        tr(
          "खाद्यान्न व दूध का भौतिक शेष मिलाएँ",
          "Reconcile physical grain and milk balances",
        ),
        tr(
          "भोजन संख्या, प्राप्ति, खर्च और बिल जाँचें",
          "Check meals served, receipts, spending and bills",
        ),
        tr(
          "जिले के वर्तमान UC / MDCF प्रारूप में विवरण भरें",
          "Enter details in the district’s current UC / MDCF format",
        ),
        tr(
          "संस्था प्रधान से जाँच कर कार्यालय को भेजने का संदर्भ रखें",
          "Have the head review it and retain the submission reference",
        ),
      ],
    },
    {
      id: "service",
      title: tr(
        "वेतन, सेवा व परिवीक्षा प्रकरण",
        "Salary, service & probation matters",
      ),
      url: "https://sso.rajasthan.gov.in/",
      tools: [
        ["salary", "वेतन कैलकुलेटर", "Salary calculators"],
        ["documents", "आवेदन मसौदा", "Application draft"],
        ["registers", "अनुवर्ती पंजी", "Follow-up register"],
      ],
      steps: [
        tr(
          "संबंधित नवीन आदेश और अपनी सेवा प्रविष्टियाँ जाँचें",
          "Check the applicable current order and your service entries",
        ),
        tr(
          "कार्यालय द्वारा माँगे गए संलग्नक तैयार करें",
          "Prepare the attachments requested by your office",
        ),
        tr(
          "SSO से संबंधित सेवा में आवेदन / स्थिति देखें",
          "Use SSO to open the relevant service and check the application",
        ),
        tr(
          "पावती, लंबित कारण और अगली कार्रवाई लिखें",
          "Record the acknowledgement, pending reason and next action",
        ),
      ],
    },
    {
      id: "session",
      title: tr(
        "शिविरा व नए सत्र की तैयारी",
        "Shivira & new-session preparation",
      ),
      url: "https://education.rajasthan.gov.in/",
      tools: [
        ["shivira", "शिविरा पंचांग", "Shivira Panchang"],
        ["admission", "प्रवेश सहायता", "Admission resources"],
        ["tasks", "काम सूची", "Task list"],
      ],
      steps: [
        tr(
          "वर्तमान शिविरा पंचांग से विद्यालय की तिथियाँ मिलाएँ",
          "Check school dates against the current Shivira calendar",
        ),
        tr(
          "प्रवेश दस्तावेज़ व विद्यार्थी सूची की जाँच करें",
          "Review admission documents and student lists",
        ),
        tr(
          "समय-सारणी, पुस्तक वितरण व अभिभावक बैठक की तैयारी करें",
          "Prepare timetable, book distribution and parent meetings",
        ),
        tr(
          "पुराने सत्र का बैकअप लें, फिर नया सत्र चुनें",
          "Back up the earlier session before switching to the new one",
        ),
      ],
    },
  ];
  function rajasthanPage() {
    return wrap(
      "rajasthan",
      hint(
        tr(
          "राजस्थान के विद्यालयों के लिए तैयारी सूची। अंतिम तिथि, पात्रता, दर और निर्धारित प्रारूप वर्तमान विभागीय आदेश से लें। यह सूची ऑफ़लाइन है; पोर्टल पर जमा करने के लिए इंटरनेट चाहिए।",
          "Preparation checklists for Rajasthan schools. Use current departmental orders for deadlines, eligibility, rates and prescribed forms. Checklists work offline; portal submissions need internet.",
        ),
      ) +
        rajasthanWorkflows()
          .map((w) =>
            panel(
              w.title,
              `<ol>${w.steps.map((t) => `<li>${esc(t)}</li>`).join("")}</ol><div class="toolbar">${w.tools.map(([id, hi, en]) => `<a class="btn" href="#/${id}">${esc(tr(hi, en))}</a>`).join("")}<a class="btn" href="${w.url}" target="_blank" rel="noopener noreferrer">${svg("ext")}${tr("आधिकारिक पोर्टल · इंटरनेट", "Official portal · Internet")}</a></div><form data-workflow="${w.id}"><div class="form-grid">${input("due-" + w.id, tr("अपनी कार्य-तिथि चुनें", "Choose your own target date"), today(), "date", "required")}</div><div class="toolbar"><button class="btn" type="submit">${svg("plus")}${tr("इन्हें मेरी काम सूची में जोड़ें", "Add these to my task list")}</button></div></form>`,
            ),
          )
          .join("") +
        hint(
          tr(
            "शाला दर्पण पर समस्या के लिए विद्यालय / PEEO लॉगिन में Help Centre Module—School Issues देखें। पासवर्ड या OTP यहाँ न भरें।",
            "For Shala Darpan issues, see Help Centre Module—School Issues in the School / PEEO login. Do not enter passwords or OTPs here.",
          ),
        ) +
        `<p class="hint"><a href="https://rajshaladarpan.rajasthan.gov.in/" target="_blank" rel="noopener noreferrer">${tr("स्रोत: शाला दर्पण सार्वजनिक सूचना", "Source: Shala Darpan public notice")}</a> · ${tr("संदर्भ जाँच: 5 सितंबर 2026", "Reference checked: 5 September 2026")}</p>`,
    );
  }
  function rajasthanHook() {
    document.querySelectorAll("[data-workflow]").forEach((f) =>
      f.addEventListener("submit", (e) => {
        e.preventDefault();
        const w = rajasthanWorkflows().find((x) => x.id === f.dataset.workflow),
          due = f.querySelector("input").value;
        if (!validDate(due)) {
          showError(tr("सही तारीख चुनें।", "Choose a valid date."));
          return;
        }
        if (
          commit((s) => {
            for (const title of w.steps) {
              if (
                !s.tasks.some(
                  (t) =>
                    t.session === s.profile.session &&
                    t.title === title &&
                    t.due === due,
                )
              )
                s.tasks.push({
                  id: uid(),
                  session: s.profile.session,
                  title,
                  due,
                  done: false,
                });
            }
          })
        )
          rerender();
      }),
    );
  }
  // Register the new pages before the existing app boots; the legacy home remains accessible.
  window.PAGES.resources = window.PAGES.home;
  A.NAV[0].items.splice(
    1,
    0,
    ...features
      .slice(0, 2)
      .map((f) => ({ id: f[0], icon: f[1], t: { hi: f[2], en: f[3] } })),
  );
  A.NAV.splice(1, 0, {
    label: { hi: "मेरा ऑफ़लाइन कार्यस्थल", en: "My offline workspace" },
    items: features
      .slice(2)
      .map((f) => ({ id: f[0], icon: f[1], t: { hi: f[2], en: f[3] } })),
  });
  A.NAV[A.NAV.length - 1].items.unshift({
    id: "resources",
    icon: "folder",
    t: { hi: "सभी संसाधन", en: "All resources" },
  });
  Object.assign(window.PAGES, {
    home,
    students: rosterPage,
    attendance: attendancePage,
    assessments: assessmentPage,
    portfolio: portfolioPage,
    "meal-ledger": mealPage,
    timetable: timetablePage,
    worksheets: worksheetPage,
    registers: registerPage,
    documents: documentPage,
    tasks: tasksPage,
    backup: backupPage,
    rajasthan: rajasthanPage,
  });
  window.PAGE_HOOKS.rajasthan = rajasthanHook;
  Object.assign(window.PAGE_HOOKS, {
    home() {
      const search = $("#featureSearch");
      let category = 'all';
      const filter = () => {
        let count = 0;
        document.querySelectorAll("[data-feature-text]").forEach((card) => {
          const hit = (category==='all'||card.dataset.featureCategory===category) && card.dataset.featureText.includes(
            search.value.trim().toLowerCase(),
          );
          card.hidden = !hit;
          card.style.display = hit ? "" : "none";
          if (hit) count++;
        });
        $("#noFeatures").hidden = !!count;
      };
      search.addEventListener("input", filter);
      document.querySelectorAll('[data-category]').forEach(button=>button.addEventListener('click',()=>{
        category=button.dataset.category;
        document.querySelectorAll('[data-category]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
        filter();
      }));
    },
    students: rosterHook,
    attendance: attendanceHook,
    assessments: assessmentHook,
    portfolio: portfolioHook,
    "meal-ledger": mealHook,
    timetable: timetableHook,
    worksheets: worksheetHook,
    registers: registerHook,
    documents: documentHook,
    tasks: tasksHook,
    backup: backupHook,
  });
  document.documentElement.classList.toggle(
    "tb-large",
    LS.get("largeText", false),
  );
  document.addEventListener("input", (e) => {
    if (e.target.closest(".tb-work [data-edit-form]")) dirty = true;
  });
  document.addEventListener("change", (e) => {
    if (e.target.closest(".tb-work [data-edit-form]")) dirty = true;
  });
  document.addEventListener(
    "click",
    (e) => {
      const nav = e.target.closest('a[href^="#/"],#langHi,#langEn');
      if (nav && dirty) {
        if (!confirmDiscard()) {
          e.preventDefault();
          e.stopImmediatePropagation();
          return;
        }
        dirty = false;
      }
    },
    true,
  );
  document.addEventListener("click", (e) => {
    const node = e.target.closest("[data-ws]");
    if (node) {
      try {
        dispatch(node.dataset.ws, node);
      } catch (err) {
        showError(err.message);
      }
    }
  });
  window.addEventListener("beforeunload", (e) => {
    if (dirty) {
      e.preventDefault();
      e.returnValue = "";
    }
  });
  let lastHash = location.hash;
  window.addEventListener("hashchange", (e) => {
    if (dirty && !confirmDiscard()) {
      e.stopImmediatePropagation();
      history.replaceState(
        null,
        "",
        location.pathname + location.search + lastHash,
      );
      return;
    }
    dirty = false;
    lastHash = location.hash;
  });
  // Expose pure functions for deterministic data and calculation regression tests.
  window.TeacherWorkspace = {
    validate,
    fresh,
    mealTotals,
    clashes,
    questions,
    validDate,
  };
})();
