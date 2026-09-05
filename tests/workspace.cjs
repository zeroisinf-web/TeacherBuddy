const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
let chromium;
try {
  ({ chromium } = require("@playwright/test"));
} catch {
  ({ chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright"));
}
const root = path.resolve(__dirname, ".."),
  results = [];
const artifacts = path.join(root, "..", "test-artifacts");
fs.mkdirSync(artifacts, { recursive: true });
const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent(
    new URL(req.url, "http://localhost").pathname,
  );
  const file = path.resolve(
    root,
    "." + (pathname === "/" ? "/index.html" : pathname),
  );
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) {
    res.writeHead(404);
    res.end("Not found");
    return;
  }
  res.setHeader(
    "Content-Type",
    {
      html: "text/html; charset=utf-8",
      js: "text/javascript",
      json: "application/json",
      svg: "image/svg+xml",
      png: "image/png",
    }[file.split(".").pop()] || "text/plain",
  );
  fs.createReadStream(file).pipe(res);
});
(async () => {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const url = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      acceptDownloads: true,
    });
    const page = await context.newPage(),
      errors = [];
    page.on("pageerror", (e) => {
      errors.push(e.message);
      console.error("BROWSER ERROR", e.stack);
    });
    page.on("dialog", (d) => d.accept());
    const check = (name) => {
      results.push(name);
      console.log("PASS " + name);
    };
    const go = async (route) => {
      await page.goto(url + "/#/" + route);
      await page.locator("#main").waitFor();
    };
    const click = async (action) =>
      page.locator(`[data-ws="${action}"]`).first().click();
    const fill = async (id, value) =>
      page.locator("#" + id).fill(String(value));
    const save = async (id) =>
      page.locator("#" + id + ' button[type="submit"]').click();
    await go("home");
    await page.locator("#langEn").click();
    assert.equal(await page.locator(".feature").count(), 12);
    await fill("featureSearch", "attendance");
    assert.equal(await page.locator(".feature:visible").count(), 1);
    await fill("featureSearch", "");
    await page.screenshot({
      path: path.join(artifacts, "desktop-home.png"),
      fullPage: true,
    });
    check("Bilingual home and feature search");
    await go("backup");
    await fill("school", "Government Primary School");
    await fill("teacher", "Anita Sharma");
    await fill("session", "2026-27");
    await save("profileForm");
    await go("students");
    await fill("name", "Asha");
    await fill("className", "3-A");
    await fill("roll", "1");
    await fill("guardian", "Parent");
    await save("studentForm");
    await fill("bulkClass", "3-A");
    await fill("names", "Ravi\nMeena");
    await save("bulkStudents");
    let data = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("tb_workspace_v1")),
    );
    assert.equal(data.students.length, 3);
    const ids = data.students.map((s) => s.id);
    await page.reload();
    assert.equal(await page.locator('[data-ws="student-edit"]').count(), 3);
    check("Roster add, bulk add and persistence");
    await go("attendance");
    await click("all-present");
    await page.locator(`[id="att-${ids[1]}"]`).selectOption("A");
    await page.locator(`[id="att-${ids[2]}"]`).selectOption("");
    await save("attendanceForm");
    data = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("tb_workspace_v1")),
    );
    assert.deepEqual(Object.values(data.attendance[0].marks).sort(), [
      "",
      "A",
      "P",
    ]);
    const summary = await page.locator(".panel").last().innerText();
    assert(summary.includes("100.0%"));
    assert(summary.includes("0.0%"));
    await page.locator('[name="holiday"]').check();
    await save("attendanceForm");
    assert(
      await page
        .locator(".panel")
        .last()
        .innerText()
        .then((t) => !t.includes("100.0%")),
    );
    await page.locator('[name="holiday"]').uncheck();
    await click("all-present");
    await save("attendanceForm");
    check("Attendance: blanks, absence, holiday and percentages");
    await go("assessments");
    await fill("max", 20);
    await page.locator(`[id="mark-${ids[0]}"]`).fill("0");
    await page.locator(`[id="mark-${ids[1]}"]`).fill("21");
    await save("assessmentForm");
    assert.match(await page.locator("#workspaceError").innerText(), /exceed/);
    await page.locator(`[id="mark-${ids[1]}"]`).fill("16");
    await save("assessmentForm");
    data = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("tb_workspace_v1")),
    );
    assert.equal(data.assessments[0].marks[ids[0]], 0);
    assert.equal(data.assessments[0].marks[ids[2]], null);
    check("Assessment marks validation; zero remains distinct from missing");
    await go("portfolio");
    await page.locator("#portfolioStudent").selectOption(ids[0]);
    await fill("strengths", "Reads aloud confidently");
    await fill("goal", "Read a short story independently");
    await save("portfolioForm");
    assert.match(await page.locator("#main").innerText(), /0 \/ 20/);
    check("Portfolio shares student assessment history");
    await go("meal-ledger");
    await fill("grain", 10);
    await fill("milk", 5);
    await fill("cash", 100);
    await save("openingForm");
    await fill("primary", 10);
    await fill("grainOut", 2);
    await fill("milkOut", 1);
    await fill("spent", 40);
    await save("mealForm");
    await click("meal-edit");
    await fill("grainOut", 20);
    await save("mealForm");
    assert.match(await page.locator("#workspaceError").innerText(), /negative/);
    data = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("tb_workspace_v1")),
    );
    assert.equal(data.meals[0].grainOut, 2);
    await fill("grainOut", 2);
    await save("mealForm");
    assert.match(await page.locator(".stats-row").innerText(), /8.000/);
    check(
      "Meals: stock and cash totals; negative stock is rejected without data loss",
    );
    await go("timetable");
    await fill("className", "3-A");
    await fill("subject", "Hindi");
    await fill("teacher", "Anita");
    await save("timetableForm");
    await fill("className", "4-A");
    await fill("subject", "Math");
    await fill("teacher", "Anita");
    await save("timetableForm");
    assert.match(await page.locator("#workspaceError").innerText(), /clash/);
    await fill("start", "10:40");
    await fill("end", "11:20");
    await save("timetableForm");
    data = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("tb_workspace_v1")),
    );
    assert.equal(data.timetable.length, 2);
    check("Teacher timetable conflict and adjacent-period acceptance");
    await go("worksheets");
    await click("worksheet-generate");
    assert.match(await page.locator("#body").inputValue(), /1\./);
    await save("worksheetForm");
    data = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("tb_workspace_v1")),
    );
    assert.equal(data.worksheets.length, 1);
    const popupPromise = page.waitForEvent("popup");
    await click("worksheet-print");
    const popup = await popupPromise;
    await popup.waitForLoadState();
    assert.match(await popup.locator("body").innerText(), /Name:/);
    assert(
      !(await popup
        .locator("body")
        .innerText()
        .then((t) => t.includes("Answer key"))),
    );
    await popup.close();
    check("Worksheet generation, persistence and separate printable questions");
    await go("documents");
    await page.locator("#docType").selectOption("hra");
    await click("document-generate");
    assert.match(
      await page.locator("#body").inputValue(),
      /house rent allowance/,
    );
    await save("documentForm");
    check("Editable HRA draft saves");
    await go("registers");
    await page.locator("#registerKind").selectOption("ptm");
    await fill("name", "Asha’s parent");
    await fill("detail", "Reading progress");
    await save("registerForm");
    check("Parent meeting register");
    await go("tasks");
    await fill("title", "Submit monthly statement");
    await save("taskForm");
    await click("task-toggle");
    assert.equal(await page.locator(".task-row .done").count(), 1);
    check("Tasks complete and persist");
    await go("backup");
    const downloadPromise = page.waitForEvent("download");
    await click("backup-export");
    const downloaded = await downloadPromise;
    const backupPath = path.join(artifacts, "backup.json");
    await downloaded.saveAs(backupPath);
    const backed = JSON.parse(fs.readFileSync(backupPath, "utf8"));
    assert.equal(backed.data.students.length, 3);
    await page
      .locator("#restoreFile")
      .setInputFiles({
        name: "invalid.json",
        mimeType: "application/json",
        buffer: Buffer.from(
          '{"app":"TeacherBuddy Workspace","format":1,"data":{"version":8}}',
        ),
      });
    await page.waitForFunction(() =>
      document
        .querySelector("#workspaceError")
        .textContent.includes("Import not performed"),
    );
    await page.locator("#restoreFile").setInputFiles(backupPath);
    await click("backup-restore");
    data = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("tb_workspace_v1")),
    );
    assert.equal(data.students.length, 3);
    check("Backup download, validation and restore");
    const recoveryContext=await browser.newContext();
    const recoveryPage=await recoveryContext.newPage();
    recoveryPage.on('dialog',d=>d.accept());
    await recoveryPage.goto(url+'/#/backup');
    await recoveryPage.locator('#langEn').click();
    await recoveryPage.evaluate(()=>localStorage.setItem('tb_workspace_v1','{broken'));
    await recoveryPage.reload();
    assert.match(await recoveryPage.locator('#workspaceError').innerText(),/could not be read/);
    assert.equal(await recoveryPage.evaluate(()=>localStorage.getItem('tb_workspace_v1')),'{broken');
    await recoveryPage.locator('#restoreFile').setInputFiles(backupPath);
    await recoveryPage.locator('[data-ws="backup-restore"]').click();
    assert.equal(await recoveryPage.evaluate(()=>JSON.parse(localStorage.getItem('tb_workspace_v1')).students.length),3);
    await recoveryContext.close();
    check('Corrupt storage is preserved and can be recovered from a validated backup');
    await fill("session", "2027-28");
    await save("profileForm");
    await go("students");
    assert.equal(await page.locator('[data-ws="student-edit"]').count(), 0);
    await go("backup");
    await fill("session", "2026-27");
    await save("profileForm");
    check("Session isolation preserves previous records");
    const pure = await page.evaluate(() => {
      const w = TeacherWorkspace,
        s = w.fresh(),
        checks = [];
      checks.push(!w.validDate("2026-02-31") && w.validDate("2024-02-29"));
      const row = {
        id: "1",
        day: 1,
        start: "10:00",
        end: "10:40",
        className: "3-A",
        teacher: "Anita",
        room: "1",
      };
      checks.push(
        w.clashes({ ...row, id: "2", teacher: "Other", className: "4-A" }, [
          row,
        ]).length === 1,
      );
      checks.push(
        w.clashes({ ...row, id: "2", start: "10:40", end: "11:00" }, [row])
          .length === 0,
      );
      checks.push(w.questions("Mathematics", 5, 20, "en").length === 20);
      checks.push(w.questions("Hindi", 1, 20, "hi").length === 5);
      try {
        w.validate({ ...s, students: [{ id: "broken" }] });
        checks.push(false);
      } catch {
        checks.push(true);
      }
      return checks;
    });
    assert(pure.every(Boolean));
    check(
      "Pure validation: dates, room clashes, worksheet bounds, malformed records",
    );
    // Simulated quota failure must leave persisted data unchanged and show an error.
    await go("tasks");
    const before = await page.evaluate(() =>
      localStorage.getItem("tb_workspace_v1"),
    );
    await page.evaluate(() => {
      window.originalSet = Storage.prototype.setItem;
      Storage.prototype.setItem = function (k, v) {
        if (k === "tb_workspace_v1")
          throw new DOMException("Storage is full", "QuotaExceededError");
        return window.originalSet.call(this, k, v);
      };
    });
    await fill("title", "Must not be lost");
    await save("taskForm");
    assert.match(await page.locator("#workspaceError").innerText(), /full/);
    assert.equal(
      await page.evaluate(() => localStorage.getItem("tb_workspace_v1")),
      before,
    );
    await page.evaluate(() => (Storage.prototype.setItem = window.originalSet));
    check("Quota failure never reports success or overwrites saved data");
    await go("attendance");
    await page.locator(`[id="att-${ids[0]}"]`).selectOption("L");
    const previousMonth = await page.locator("#attendanceMonth").inputValue();
    page.removeAllListeners("dialog");
    page.on("dialog", d => d.dismiss());
    await page.locator("#attendanceMonth").fill("2026-01");
    await page.locator("#attendanceMonth").blur();
    assert.equal(await page.locator("#attendanceMonth").inputValue(),previousMonth);
    assert.equal(await page.locator(`[id="att-${ids[0]}"]`).inputValue(),"L");
    await page.evaluate(()=>{location.hash="#/tasks";});
    await page.waitForTimeout(100);
    assert(await page.locator("#attendanceForm").count());
    page.removeAllListeners("dialog"); page.on("dialog",d=>d.accept());
    check("Cancelling a filter change or hash navigation keeps unsaved work");
    await go("tasks");
    const other = await context.newPage();
    await other.goto(url+"/#/tasks");
    await other.locator("#title").fill("Another tab saved this");
    await other.locator("#taskForm button[type=submit]").click();
    await fill("title","Stale tab must not overwrite");await save("taskForm");
    assert.match(await page.locator("#workspaceError").innerText(),/Another tab/);
    await other.close();
    check("Concurrent tabs cannot silently overwrite one another");
    await go("rajasthan");
    await page.locator('[data-workflow="school"] button').click();
    const tasksOnce = await page.evaluate(()=>JSON.parse(localStorage.getItem("tb_workspace_v1")).tasks.length);
    await page.locator('[data-workflow="school"] button').click();
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem("tb_workspace_v1")).tasks.length),tasksOnce);
    check("Rajasthan preparation lists add tasks without duplicates");
    const unsafe = await page.evaluate(()=>{
      const s=JSON.parse(localStorage.getItem("tb_workspace_v1"));
      s.students[0].id='\"><img src=x onerror=alert(1)>';
      try{TeacherWorkspace.validate(s);return false;}catch{return true;}
    });assert(unsafe);check("Backup identifiers reject HTML injection");
    await go("home");
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.waitForFunction(
      () => navigator.serviceWorker.controller !== null,
    );
    await context.setOffline(true);
    await page.reload();
    assert.equal(await page.locator(".feature").count(), 12);
    await go("students");
    assert.equal(await page.locator('[data-ws="student-edit"]').count(), 3);
    await context.setOffline(false);
    check("Service worker reload and stored roster work without network");
    const mobile = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      deviceScaleFactor: 1,
    });
    const mp = await mobile.newPage();
    await mp.goto(url);
    await mp.screenshot({
      path: path.join(artifacts, "mobile-home.png"),
      fullPage: true,
    });
    await mp.screenshot({
      path: path.join(artifacts, "mobile-first-screen.png"),
    });
    assert(
      await mp.evaluate(() => document.documentElement.scrollWidth <= 390),
    );
    for (const route of [
      "students",
      "attendance",
      "assessments",
      "portfolio",
      "meal-ledger",
      "timetable",
      "worksheets",
      "registers",
      "documents",
      "tasks",
      "backup",
      "rajasthan",
      "resources",
      "letters",
      "salary",
      "cce",
      "tools",
    ]) {
      await mp.goto(url + "/#/" + route);
      assert(
        await mp
          .locator("#main")
          .innerText()
          .then((t) => t.length > 30),
        route,
      );
      assert(
        await mp.evaluate(() => document.documentElement.scrollWidth <= 390),
        route + " horizontal overflow",
      );
    }
    check(
      "Mobile layouts and legacy routes render without horizontal page overflow",
    );
    const local = await browser.newContext();
    const lp = await local.newPage();
    await lp.goto(
      "file:///" + path.join(root, "TeacherBuddy.html").replace(/\\/g, "/"),
    );
    assert.equal(await lp.locator(".feature").count(), 12);
    check("Standalone HTML opens without a server");
    assert.deepEqual(errors, []);
    assert.equal(
      fs.readFileSync(path.join(root, "index.html"), "utf8"),
      fs.readFileSync(path.join(root, "TeacherBuddy.html"), "utf8"),
    );
    check("No browser runtime errors; hosted and standalone files identical");
    fs.writeFileSync(
      path.join(artifacts, "results.json"),
      JSON.stringify({ passed: results.length, checks: results }, null, 2),
    );
    console.log(`SUCCESS ${results.length} checks`);
  } finally {
    await browser.close();
  }
})()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => server.close());
