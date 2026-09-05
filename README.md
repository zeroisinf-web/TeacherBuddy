# TeacherBuddy — शिक्षक साथी

राजस्थान के विद्यालय शिक्षकों के लिए निःशुल्क, ऑफ़लाइन सहायक।
A free, offline toolkit for Rajasthan school teachers.

**Repository:** https://github.com/zeroisinf-web/TeacherBuddy
**⬇️ Offline copy:** [TeacherBuddy.html](TeacherBuddy.html) — right-click → Save link as

---

## क्या है यह / What this is

वेबसाइट **एक ही HTML फ़ाइल** के रूप में चलती है। उपयोग करने के लिए बिल्ड, फ़्रेमवर्क या CDN नहीं चाहिए। नए कार्यस्थल के स्रोत बदलने के बाद `npm run build` चलाएँ।
टूल ऑफ़लाइन चलते हैं; सरकारी पोर्टल और बाहरी PDF के लिए इंटरनेट चाहिए।

The app runs as **one HTML file** with no runtime dependencies. The new workspace source is compiled into both HTML copies using `npm run build`. Built files are committed, so no build is needed to open or host them.
Local tools work offline. External portals, results and linked PDFs require internet.

### नया: राजस्थान ऑफ़लाइन कार्यस्थल / Rajasthan offline workspace

Twelve labelled, searchable feature cards, Hindi/English controls and a larger-text option:

- Shared student roster with bulk name entry, editing and archive/restore.
- Daily attendance, school holidays, explicit unmarked status, monthly percentages and CSV/print export.
- Baseline/SA/formative assessment records and linked student portfolios.
- Meals and milk ledger with monthly openings, receipts, use, spending and balance checks.
- Weekly timetable with teacher, class and room overlap detection.
- Original editable Classes 1–5 practice worksheets and separate answer keys.
- Eight school register types and eleven document/invitation draft types.
- Tasks, session isolation, validated workspace backup/restore and save-failure protection.
- Rajasthan work desk for Shala Darpan, CCE/SIQE, Prakhar, PM POSHAN and service preparation.

[Quick-start guide / उपयोग मार्गदर्शिका](docs/WORKSPACE-GUIDE.md) · [CCE Guru comparison and remaining gaps](docs/CCE-GURU-COMPARISON.md)

**Scope:** Forms are editable working drafts, not prescribed government certificates. Meal reports do not reproduce district-specific UC/MDCF layouts. Current Rajasthan orders determine official requirements. Workspace backups cover the new workspace across all sessions; legacy tools retain their separate storage.

### Development and checks

```sh
npm ci
npm run build
npx playwright install chromium
npm test
```

Edit `src/workspace.js` and `src/workspace.css` for new workflows. Legacy pages remain in `index.html`, outside the generated workspace markers. The build regenerates `TeacherBuddy.html` and changes the offline cache version. Do not edit the generated workspace block directly.

Tests exercise real browser workflows, persistence, invalid input, backup/restore, conflicting saves, offline reload, mobile layouts and the standalone HTML file. Test artifacts are written next to the repository under `test-artifacts/` and contain only fictional test data.

### पहले से उपलब्ध खंड / Existing resource sections

शिविरा पंचांग · प्रपत्र एवं पत्र जनरेटर · पाठ योजना एवं प्रार्थना सभा · वेतन एवं कर कैलकुलेटर ·
नवीन सत्र एवं प्रवेश · प्रश्न-पत्र · परिणाम · CCE/SIQE · मध्याह्न भोजन · पुस्तकें एवं पाठ्यक्रम ·
प्रशिक्षण · विभागीय आदेश · प्रपत्र एवं स्रोत · पोर्टल एवं लॉगिन · अभियान · अवकाश एवं CL ·
IFMS 3.0 · प्री डी.एल.एड. · टूल्स · अद्यतन केंद्र · परिचय · निजता नीति

### मुख्य बातें

- **188 सत्यापित सरकारी लिंक** — शाला दर्पण, RBSE, RSCERT, SSO, IFMS, PayManager, SIPF, RGHS, UDISE+, DIKSHA, iGOT
- **13 तैयार प्रपत्र** — भरिए और सीधे प्रिंट/PDF कीजिए (CL, CCL, चिकित्सा अवकाश, TC, चरित्र प्रमाण-पत्र, SMC कार्यवृत्त…)
- **23 ऑफ़लाइन टूल्स** — 7वाँ वेतनमान, DA एरियर, आयकर तुलना, MDM खाद्यान्न, ग्रेड सारणी, इमेज रिड्यूसर…
- **41 तैयार CCE टिप्पणियाँ** — एक क्लिक में कॉपी
- **हिन्दी / English** — पूरा इंटरफ़ेस एवं पूरी सामग्री
- `Ctrl+K` से पूरी साइट में खोज

---

## फ़ाइलें / Files

| फ़ाइल | काम |
|---|---|
| `index.html` | पूरी वेबसाइट — यही सब कुछ है |
| `TeacherBuddy.html` | वही फ़ाइल, ऑफ़लाइन डाउनलोड हेतु |
| `ads.txt` | **⚠ यहाँ अपना AdSense पब्लिशर आईडी भरें** |
| `manifest.json`, `sw.js`, `icon.svg` | मोबाइल पर “ऐप की तरह” इंस्टॉल एवं ऑफ़लाइन कैश |
| `robots.txt`, `sitemap.xml`, `404.html` | सर्च इंजन एवं त्रुटि पृष्ठ |
| `.nojekyll` | GitHub Pages को फ़ाइलें ज्यों की त्यों परोसने हेतु |

---

## विज्ञापन चालू करना / Turning ads on

विज्ञापन तब तक नहीं चलेंगे जब तक असली पब्लिशर आईडी न भरा जाए। **दो जगह** बदलना है:

**1. `index.html`** — `Ctrl+F` से `ads:` खोजें (EDIT ZONE में):

```js
ads: {
  enabled: true,
  client:  "ca-pub-XXXXXXXXXXXXXXXX",   // ← अपना आईडी यहाँ
  mode:    "auto",                       // "auto" या "manual"
  slot:    "XXXXXXXXXX",                 // केवल manual मोड में
  reserve: 96
}
```

**2. `ads.txt`** — वही आईडी, `ca-` उपसर्ग हटाकर:

```
google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0
```

`TeacherBuddy.html` भी `index.html` की प्रतिलिपि है — बदलाव के बाद उसे भी बदल दें
(या `index.html` कॉपी करके `TeacherBuddy.html` नाम से सहेज दें)।

### AdSense डैशबोर्ड में ज़रूरी सेटिंग

`mode: "auto"` में Google स्वयं नीचे चिपका हुआ विज्ञापन दिखाता है। डैशबोर्ड में जाकर:

- **Auto ads → Anchor ads: चालू रखें** (यही नीचे की पट्टी है)
- **Vignette / Interstitial ads: बंद कर दें** — ये पूरे स्क्रीन पर आते हैं और उपयोगकर्ता को बहुत परेशान करते हैं
- **In-page / In-article ads: बंद रखें** — वरना सामग्री के बीच में विज्ञापन घुस जाएँगे

अनुमोदन (approval) मिलने तक विज्ञापन नहीं दिखेंगे — यह सामान्य है और इसमें कुछ दिन लग सकते हैं।

---

## अपडेट करना / Updating

सरकार कोई दर, तिथि या लिंक बदले तो **दो तरीके**:

1. **ऐप के भीतर** — साइट खोलकर **अद्यतन केंद्र** → खंड चुनें → JSON बदलें → सहेजें
   (यह केवल आपके ब्राउज़र में रहता है; निर्यात/आयात भी वहीं से)
2. **स्थायी रूप से** — `index.html` में `Ctrl+F` से `TB_DATA` खोजें और **EDIT ZONE** में बदलें,
   फिर कमिट कर दें

सबसे ज़्यादा बदलने वाली चीज़ें `rates` खंड में हैं — DA %, HRA, SI एवं RGHS स्लैब,
आयकर स्लैब, MDM मानदंड।

---

## अस्वीकरण / Disclaimer

यह **सरकारी वेबसाइट या ऐप नहीं** है। सामग्री केवल शैक्षिक एवं सहायक उद्देश्य से संकलित है तथा
सभी लिंक आधिकारिक सरकारी पोर्टल पर ही जाते हैं। किसी भी भिन्नता की स्थिति में संबंधित विभाग
द्वारा जारी **मूल आदेश, परिपत्र एवं पोर्टल ही अंतिम एवं मान्य** होंगे।

वेतन, एरियर एवं आयकर की गणनाएँ **केवल अनुमान** हेतु हैं। शिविरा पंचांग की तिथियाँ अपने विद्यालय
के आधिकारिक पंचांग से मिलान कर लें। PDF एवं सामग्री के अधिकार संबंधित विभाग/प्रकाशक के पास सुरक्षित हैं।

**मुख्य स्रोत:** शाला दर्पण राजस्थान · माध्यमिक शिक्षा बोर्ड अजमेर (RBSE) · RSCERT उदयपुर ·
शिक्षा विभाग राजस्थान · वित्त विभाग राजस्थान · शिक्षा मंत्रालय, भारत सरकार
