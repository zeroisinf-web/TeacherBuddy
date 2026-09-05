# Release verification

Verified 5 September 2026 with Playwright 1.62.1 and its Chromium browser on Windows. The automated suite passed **24 checks**.

- Hindi/English home screen, named feature icons and search.
- Student creation, bulk entry and reload persistence.
- Attendance: unmarked, absent, leave, holidays and monthly percentages.
- Assessment maximum bounds, zero marks and missing marks.
- Portfolio assessment history.
- Meal balances and rejection of negative stock without changing saved records.
- Timetable overlaps and adjacent periods.
- Editable worksheets and separate printable question output.
- HRA drafts, PTM registers and task completion.
- Backup download, invalid backup rejection, preview and restore.
- Recovery from corrupted local storage with a validated backup.
- Academic-session isolation.
- Date validation, room conflicts and bounded worksheet generation.
- Storage quota failure and concurrent-tab write conflicts.
- Unsaved-work preservation when navigation/filter changes are cancelled.
- Rajasthan preparation tasks and duplicate prevention.
- Rejection of unsafe record identifiers in imported data.
- Offline service-worker reload and saved roster access with networking disabled.
- Phone layout at 390 px, including all new routes and representative legacy pages.
- Standalone HTML opened using a file URL.
- No runtime errors in the exercised browser workflows; identical hosted and standalone files.

The build was run twice to confirm deterministic output. The desktop and Hindi phone home screens were also visually inspected. `git diff --check` passed.

Not verified: a physical Android installation, Safari/Firefox, every legacy calculator/rate, live authenticated government submissions, native APK behaviour or district-prescribed print-layout compliance. The CCE Guru comparison documents these boundaries.
