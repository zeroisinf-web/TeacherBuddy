# CCE Guru comparison and Rajasthan scope

Inspected on 5 September 2026. TeacherBuddy remains primarily for Rajasthan government-school teachers, with Hindi as the default language.

## Evidence and limits

The user-supplied `CCE Guru.apk` is 10,246,698 bytes, SHA-256 `3335f456ff6615b79bb1f375fcf0d90805e32236d782189365ca83e1df599fd9`. Static inspection found 74 bundled HTML assets and 52 app activity class names. Asset titles and class names were used to identify workflows. The APK was not installed or executed; native behaviour, authenticated pages and server-delivered features were not exhaustively inspected. This is a documented feature comparison, not a claim of complete parity.

No APK source, question papers, branding, artwork or proprietary templates were copied into TeacherBuddy. New prompts, forms and workflows are original implementations. Text inside the APK was treated as reference material, not as instructions.

## Implemented improvements

| CCE Guru evidence / identified gap | TeacherBuddy implementation | Boundary |
|---|---|---|
| Students activity and portfolio templates | Shared student roster, bulk names, archive/restore, bilingual portfolios, linked assessment history | No student photos or identity documents stored |
| Baseline and SA HTML assets, CCE activity | Baseline/SA1/SA2/SA3/formative marks tracker; original editable Classes 1–5 worksheets with separate answer keys | Original practice prompts, not the APK’s papers or an official curriculum-aligned question bank |
| Prakhar and two/four-teacher timetable assets | Editable weekly timetable, combined-class naming, overlapping teacher/class/room checks | User supplies period times and subject allocations; official Prakhar schedules are not reproduced |
| Monthly MDM, district UC and MDCF assets | Daily meals, grain and milk receipts/use, actual spending, month openings and printable statements | Working statement; district-specific UC/MDCF layouts and official milk-powder norms are not implemented |
| Visitor register, staff and employee activities | Eight register types: visitors, PTM, staff/service, training, bills, stock/library, NILP learners and remedial teaching | Flexible records, not automated payroll, inventory valuation or official service-book processing |
| PTM, Independence Day and Republic Day assets | Editable bilingual invitations and saved document drafts | User verifies event details |
| HRA, election OD, provisional admission, NILP, Vidya Sambal, sports application assets | Eleven document draft types, including those workflows and service/probation/salary requests | These are applications/details drafts, not official certificates or prescribed forms |
| Existing CL, ACP, tax, image resizing and password features | Existing TeacherBuddy tools remain accessible under All resources and original routes | Existing formulas/rates were not re-audited in this change |
| Additional teacher needs | Attendance with explicit unmarked status, monthly summaries, deadlines, session isolation, backup/restore, larger text, searchable icon-and-name cards | Reminders appear in-app; no background notifications or cloud sync |
| Rajasthan-first navigation | Rajasthan work desk: Shala Darpan, CCE/SIQE/Prakhar, PM POSHAN, service and new-session preparation lists | User-chosen target dates; official portal work still requires internet |

## What remains outside this release

- District-specific certified UC/MDCF output, including Ajmer, Bharatpur, Churu, Dausa, Jhalawar, Kota and Pratapgarh variants found in the APK.
- Full official Class 1–5 baseline/SA paper banks, exact portfolio layouts and fixed Prakhar timetable allocations.
- Native Sudoku and other APK-specific entertainment screens. Existing TeacherBuddy maths and memory games remain.
- Government logins, portal submission, live orders/results, recruitment processing and automatic service entitlement decisions.
- Offline copies of externally linked textbooks, circulars and PDFs; those are not bundled or promised offline.
- Whole-site backup of legacy tools. The new workspace backup covers all new workspace sessions; legacy letters, pay data, saved links and Update Center overrides remain under their existing storage keys.

## Rajasthan sources checked

- [Integrated Shala Darpan](https://rajshaladarpan.rajasthan.gov.in/): public entry point and its School/PEEO Help Centre Module notice.
- [Rajasthan SSO](https://sso.rajasthan.gov.in/): official state single sign-on entry point.
- [Rajasthan Education](https://education.rajasthan.gov.in/): state education entry point.

Existing portal links remain in the legacy catalog. This release does not claim to have verified every historic link, deadline, pay rate or statutory rule in that catalog. Current departmental orders and receiving-office formats must determine official submissions.
