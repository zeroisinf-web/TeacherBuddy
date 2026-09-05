# TeacherBuddy 2.1 review — 5 September 2026

## Interface

Original interface inspired by the whitespace and rounded surfaces of Google One: multicolor feature cards, Hindi/English labels, category filters, restrained Rajasthan arch details and a Padharo sa greeting. All 24-unit interface SVGs have explicit sizes; accordion icons previously expanded beyond 700 pixels.

## Rate corrections and evidence

These are dated source checks, not a live update service. User-saved Update Center overrides are retained. Actual payroll deductions can override calculated SI, RGHS and GPF/NPS, including zero.

| Item | Correction / retained value | Official source |
|---|---|---|
| HRA | Rajasthan Y 20%, Z 10%, effective 1 November 2024; removed central-style X category; added no-HRA option | [Finance order](https://finance.rajasthan.gov.in/PDFDOCS/RULES/14114.pdf) |
| SI | ₹2,200 in the ₹28,501–46,500 band, replacing ₹1,800 | [SIPF premium rates](https://sipf.rajasthan.gov.in/SIPremiumRates.aspx) |
| RGHS | ₹265 / 440 / 658 / 875 for the published seventh-pay bands, effective 1 April 2022 | [RGHS circular compilation](https://rghs.rajasthan.gov.in/Circular_10.pdf) |
| GPF | Published subscription slabs replace blanket 6% default | [SIPF slabs](https://sipf.rajasthan.gov.in/GPFSubscriptionSlabs.aspx) |
| DA | Retained 60%, effective 1 January 2026 | [Finance order](https://finance.rajasthan.gov.in/PDFDOCS/RULES/14945.pdf) |
| PM POSHAN | Retained ₹6.78 / ₹10.17, effective 1 May 2025 | [Meal provision](https://pmposhan.education.gov.in/Meal%20Provision.html) |

Tax comparison now includes new-regime rebate marginal relief, caps the supported deductions and declines estimates above ₹50 lakh. Its stated scope is resident salaried taxpayers under 60 with normal-rate salary income. [Income Tax Department guidance](https://www.incometax.gov.in/iec/foportal/help/all-topics/e-filing-services/file-itr-2-online) supports the published slab/rebate structure; full current-year filing eligibility and all Finance Act 2026 provisions have not been exhaustively validated.

The expired August training banner was replaced. Legacy calendar, training, orders and calculator pages link to a dated review. The Finance Department index listed an RSR amendment dated 3 September 2026; its legal conditions were not interpreted. All Shivira 2026–27 dates, old deadlines and every legacy URL are not certified current.

## APK coverage

[Complete static inventory](APK-INVENTORY.md): 74 bundled HTML assets, one dependency HTML document and 52 application activity names. Static inspection does not expose every native or authenticated workflow. [Comparison and known gaps](CCE-GURU-COMPARISON.md) remains authoritative: district-certified UC/MDCF, exact official paper/portfolio banks, fixed Prakhar allocations, Sudoku and full legacy backup are incomplete. No proprietary APK code, paper content or artwork was copied.

## Validation

- Existing 24 browser workflow checks pass, including offline reload, local records, recovery, conflict handling and standalone HTML.
- 37 routes checked at widths 1440, 390 and 320: no oversized interface SVGs or horizontal page overflow.
- Category/search interaction, source page and payroll SI/RGHS/GPF/HRA calculations checked, including explicit zero and blank deduction overrides.
- Tax boundaries: ₹12.75 lakh gross → zero new-regime tax; ₹12.76 lakh → ₹1,040 with marginal relief and cess; ₹15 lakh → ₹97,500; above ₹50 lakh → detailed-calculation message.
- Desktop and mobile screenshots visually inspected. No browser runtime errors.
