# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the App

Open `index.html` directly in a browser — no server, no build step required. Chart.js 4.4.1 is loaded via CDN.

## Architecture

Three files:
- `index.html` — HTML structure only, links to `style.css` and `app.js`
- `style.css` — Dark theme with CSS custom properties (`--bg`, `--amber`, `--green`, `--red`, `--blue`, etc.)
- `app.js` — All vanilla JS: state management, rendering, Chart.js integration

**State** is a single `state` object with three top-level keys:
- `months` — array of monthly entries (`{ year, month, credits, debits, cats: { food, fuel, night, travel, shop, transport, other } }`)
- `repayments` — array of debt repayment transactions (`{ date, amount, note }`)
- `debt` — parameters (`{ total, rate }`)

State is persisted to `localStorage` under the key `budget_tracker_v1`.

**Four tabs**, each with its own render function:
| Tab | Render Function | Purpose |
|-----|----------------|---------|
| Dashboard | `renderDashboard()` | Overview metrics and Chart.js charts |
| Import | `renderImportList()` | Add/edit/delete monthly entries |
| Debt | `renderDette()` | Repayment tracking, simulator, history |
| Insights | `renderInsights()` | Data-driven financial advice |

**Export functions:**
- `exportPDF()` — switches to dashboard tab then calls `window.print()`. Print CSS in `style.css` hides all interactive chrome and applies a light theme.
- `exportEmail()` — builds a formatted plain-text summary and opens a `mailto:` link with the content pre-filled.

**Chart management:** Chart instances are stored in the `charts` object and must be explicitly destroyed via `destroyChart(id)` before re-creation to avoid Canvas reuse errors.

## Key Conventions

- Month numbers follow JS convention: 0–11. Arrays `MN` (short) and `MNF` (full) map index to French name.
- Currency is CHF, formatted with `fmt(n)` which uses `toLocaleString('fr-CH')`.
- Toast notifications use `toast(msg, type)` where `type` is `'success'` or `'error'`.
- Tab switching is handled by `goTab(id)` which toggles `.active` classes and calls the appropriate render function.
- Insights in `renderInsights()` are fully data-driven — no hardcoded personal advice.
