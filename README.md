[README.md](https://github.com/user-attachments/files/29138521/README.md)
# ⚡ Google Form AutoFill

A browser automation tool that auto-fills Google Forms — built to eliminate repetitive feedback form submissions for engineering students.

---

## 🎯 The Problem

Every semester, students fill out multi-page feedback forms with 10-15 identical questions per subject — same rating scale, same options, repeated across 6+ subjects. It's repetitive and time-consuming.

## ✨ What it does

- **Page 1** — left untouched for manual student detail entry (name, roll number, etc.)
- **Page 2 onward** — automatically selects the last option on every MCQ/radio/dropdown question
- **Text fields** — auto-filled with a placeholder dot
- **Elective subject pages** — detected automatically; pauses with a popup so the student can manually pick their subject, then resumes auto-filling
- **Before final submission** — shows a confirmation popup so nothing is submitted blindly

## 🧩 Available versions

| Version | Folder | Setup required |
|---|---|---|
| **Chrome Extension** (recommended) | [`/extension`](./extension) | Install once, runs forever |
| **Tampermonkey Script** | [`/tampermonkey-version`](./tampermonkey-version) | Install Tampermonkey + script |
| **Web/Bookmarklet version** | [`/web-version`](./web-version) | No extension, drag a bookmarklet |

## 🚀 Installation — Chrome Extension

1. Download or clone this repo
2. Open `chrome://extensions` in Chrome
3. Enable **Developer mode** (top right toggle)
4. Click **Load unpacked** → select the `extension/` folder
5. Open any Google Form — it activates automatically

## 🛠️ How it works

- **MutationObserver** watches the DOM for page transitions, since Google Forms uses soft navigation (no full page reload between sections)
- **Pure DOM manipulation** (`createElement`, `textContent`, `appendChild`) — no `innerHTML`, since Google Forms enforces a strict Content Security Policy that blocks it
- **Retry-based option detection** — Google Forms renders MCQ options progressively, so the script waits and re-checks until all options are loaded before selecting the last one
- **Keyword-based page detection** — scans page text for elective-related keywords to decide when to pause for manual input

## 📂 Repository structure

```
google-form-autofill/
├── extension/              # Chrome Extension (Manifest V3)
│   ├── manifest.json
│   ├── content.js
│   ├── popup.html
│   └── icons/
├── tampermonkey-version/
│   └── autofill.user.js
├── web-version/
│   ├── index.html
│   └── autofill.js
├── docs/
│   └── screenshots/
└── README.md
```

## 🐛 Challenges solved

| Issue | Fix |
|---|---|
| `TrustedHTML` CSP violation crashing the script | Replaced all `innerHTML` usage with safe DOM methods |
| Script not detecting page transitions | Implemented persistent `MutationObserver` on `document.body` |
| Wrong MCQ option selected | Added retry loop to wait for all options to render before selecting |
| Bookmarklet truncation / async failures | Split into a lightweight loader + externally hosted script |

## ⚠️ Disclaimer

This project was built as a personal learning exercise in browser automation, DOM manipulation, and Chrome extension development. It is intended for use on forms where automated/default responses are appropriate (e.g. testing, demo forms) — always use responsibly and in line with your institution's policies.

## 📝 License

MIT — feel free to fork, learn from, or build on this.

---

Built by Thayanithy as a portfolio project exploring browser automation and Chrome extension development.
