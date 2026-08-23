Part of: [Spec do Bingo (próxima fase)](../map.md)
Type: research
Status: answered
Answers: [../issues/03-fonte-dados-bjcp.md](../issues/03-fonte-dados-bjcp.md)

# Data source for the complete current BJCP style list

## Question

Where can Bingo get a trustworthy, machine-readable (JSON/CSV/etc.) source for the full current BJCP beer style list (~100+ styles), to replace the hand-picked 11-entry sample at `src/assets/data/bjcp_styles.json`? What fields does it expose, and what are the licensing/redistribution constraints?

## TL;DR / Recommendation

- **No official machine-readable format exists for the 2021 guidelines.** BJCP only publishes the 2021 edition as PDF (and previously DOCX). The official downloads page still only offers structured formats (XML/XLSX/XLS) for the older **2015** edition. For 2021, the official BJCP page merely *links out* to third-party JSON conversions and states they "have not been checked by the BJCP for accuracy." — [bjcp.org/beer-styles/downloads-and-resources/](https://www.bjcp.org/beer-styles/downloads-and-resources/)
- **Best third-party structured source: [`beerjson/bjcp-json`](https://github.com/beerjson/bjcp-json)** (`styles/bjcp_styleguide-2021.json`), published under the `beerjson` GitHub org (the same org that maintains the joint BJCP/ASBC/Brewers Association BeerJSON interchange-format standard). It ships the full 2021 guideline (110 style/subcategory entries) in the structured BeerJSON `style` schema, is **MIT-licensed**, and was last pushed **2022-02-22**.
- **Actively-maintained alternative: [`ascholer/bjcp-styleview`](https://github.com/ascholer/bjcp-styleview)** (`styles.json`) — the same dataset that BJCP's own downloads page links to as "the 2021 beer guidelines as JSON ... with an associated Style Viewer app." Much more recently touched (**last push 2025-07-12**), but it carries **no LICENSE file** in the repo, and its README explicitly restates BJCP's copyright and reproduction restrictions on the data (quoted below) — meaning redistributing more than id/name/numeric ranges from it is legally the same constrained situation as redistributing from the PDF directly.
- **Recommendation for Bingo**: pull `id` (style_id), `name`, `category_id`/`category` (and optionally the numeric vital-statistics ranges and `type`/`tags`) from `beerjson/bjcp-json`'s `bjcp_styleguide-2021.json` (clean MIT-licensed code repo, single well-defined schema, no mixed-language noise except one entry — see caveats). This is squarely inside what BJCP's own FAQ says is reusable without extra permission ("naming and numbering system, the style parameters ... can be used for other purposes"). **Do not** copy the full text fields (aroma/appearance/flavor/mouthfeel/comments/history/ingredients/style_comparison/examples) into Bingo's bundled repo without separately confirming that's acceptable — BJCP's FAQ says "the full content of the guidelines may not" be reused that way without permission (see Licensing section).

## 1. Does BJCP itself publish structured data?

Checked directly:
- [bjcp.org/bjcp-style-guidelines/](https://www.bjcp.org/bjcp-style-guidelines/) — official landing page for the guidelines; only links to the PDF document itself, no structured-data download.
- [bjcp.org/beer-styles/downloads-and-resources/](https://www.bjcp.org/beer-styles/downloads-and-resources/) — the actual "Downloads and Resources" hub. For the **2015** edition it officially hosts:
  - PDF: `legacy.bjcp.org/docs/2015_Guidelines_Beer.pdf`
  - DOCX: `legacy.bjcp.org/docs/2015_Guidelines_Beer.docx`
  - Consolidated PDF (beer+mead+cider): `legacy.bjcp.org/docs/2015_Guidelines_Consolidated.pdf`
  - Single-file XML: `legacy.bjcp.org/docs/2015_styleguide.xml`
  - Separate-file XML (community): [github.com/Smedbergm/BJCP_2015](https://github.com/Smedbergm/BJCP_2015)
  - XLSX: `legacy.bjcp.org/docs/2015_Guidelines.xlsx`, `legacy.bjcp.org/docs/2015_Styles.xlsx`
  - XLS: `legacy.bjcp.org/docs/2015_Examples.xls` (commercial examples), `legacy.bjcp.org/docs/2015_ClassicStyles.xls`
  - For **2021**, the page only lists **PDF** as the official format, then names two community JSON conversions as unofficial extras: "2021 beer guidelines as JSON maintained on GitHub by Andrew Scholer, with an associated Style Viewer app" and "2021 beer guidelines as JSON by Yuriy Krutilin," explicitly caveated: *"All have been supplied by external contributors but have not been checked by the BJCP for accuracy."*
- The current official 2021 PDF is at [bjcp.org/wp-content/uploads/2025/02/2021_Guidelines_Beer_1.25.pdf](https://www.bjcp.org/wp-content/uploads/2025/02/2021_Guidelines_Beer_1.25.pdf) (fetched and inspected directly, see §4). No JSON/CSV/API sibling exists for it on bjcp.org.

**Conclusion**: BJCP does not publish the current (2021) guidelines in any machine-readable format itself. Anyone wanting structured 2021 data must use a third-party conversion.

## 2. Third-party structured datasets evaluated

Metadata pulled directly from the GitHub API (`gh api repos/<owner>/<repo>`) on 2026-08-21:

| Repo | Targets 2021? | Last push | License (GitHub-detected) | Stars | Notes |
|---|---|---|---|---|---|
| [`beerjson/bjcp-json`](https://github.com/beerjson/bjcp-json) | Yes (`styles/bjcp_styleguide-2021.json`, plus 2017 and 2015 files) | 2022-02-22 | **MIT** (LICENSE file present) | 15 | Under the official `beerjson` GitHub org (BeerJSON is the joint BJCP/ASBC/Brewers-Association data-interchange standard, [beerjson.github.io/beerjson](https://beerjson.github.io/beerjson/)). Structured with the BeerJSON `style` schema. 110 style entries in the 2021 file. |
| [`ascholer/bjcp-styleview`](https://github.com/ascholer/bjcp-styleview) | Yes | **2025-07-12** (most recently updated of all candidates) | **None** — no LICENSE file in repo (`.gitignore`, `README.md`, `beerReader.js`, `index.html`, `styles.json` only) | 16 | This is the exact dataset BJCP's own downloads page links to ("Andrew Scholer ... Style Viewer app"). Data built by "running the PDF guidelines through a PDF → markdown converter and then parsing that into json"; README warns of "small issues due to that translation process." |
| [`bjcp-brasil/styleguide-2021`](https://github.com/bjcp-brasil/styleguide-2021) | Yes, English + Brazilian-Portuguese | 2026-07-10 (actively maintained) | None found (no LICENSE file) | 7 | Manually maintained from the official English text; JSON/XML/YAML in parallel. Portuguese version auto-generated from a LaTeX source repo. README states "Everything about the 2021 Style Guidelines is owned by BJCP." Potentially useful if Bingo ever wants pt-BR style names, but no license clarity. |
| [`jrdn91/bjcp-guidelines-2021`](https://github.com/jrdn91/bjcp-guidelines-2021) | Yes, published as npm package `2021-beer-styles` w/ TypeScript types | 2022-08-14 | MIT | 1 | Author self-admits "some of the styles are not 100% accurate to the BJCP 2021 style guidelines" due to Word-doc conversion. Low adoption (1 star). |
| [`lrdodge/bjcp-style-data`](https://github.com/lrdodge/bjcp-style-data) | **No** — last touched 2015, predates the 2021 (and 2017) revisions | 2015-06-28 | MIT | 12 | Outdated; same category as `meanphil/bjcp-guidelines-2015`-style forks the ticket said to avoid. Formats: CSV, ARFF, JSON. Not recommended. |
| `beerjson/beerjson` (the format **spec** repo, not the data) | N/A | 2026-08-21 (very active, 164 stars) | MIT | 164 | This is the schema/spec project itself (`json/style.json` defines the style object shape used by `bjcp-json`). Doesn't ship BJCP style *data* directly — `beerjson/bjcp-json` is the sibling repo that does, using this schema. |

Searched via GitHub topic/search and web search for other 2021-targeting repos ("bjcp-styles", forks of `meanphil/bjcp-guidelines-2015`, etc.) — the above were the significant, distinct candidates surfaced. The official bjcp.org page also names a "Yuriy Krutilin" JSON conversion, but no locatable current GitHub repo could be confirmed under that name (his active GitHub profile, [github.com/krutilin](https://github.com/krutilin), has no BJCP-related repos as of this check) — it may be the `beerjson/bjcp-json` repo itself (Krutilin is plausibly a `beerjson` org contributor) or may have been removed/renamed; **not independently verifiable**, so not relied upon here.

## 3. Field list of the best candidate(s)

### `beerjson/bjcp-json` — `styles/bjcp_styleguide-2021.json` (recommended)

Top-level: `{"beerjson": {"version": "2.01", "styles": [ ...110 entries... ]}}`.

Distinct keys enumerated by walking every one of the 110 entries (via `python3`/`json`, see below):

- `style_id` — e.g. `"3B"` (maps to current `id`)
- `name` — e.g. `"Czech Premium Pale Lager"` (maps to current `name`)
- `category` — category name, e.g. `"Czech Lager"`
- `category_id` — e.g. `"3"`
- `category_description` — long-form prose describing the whole category
- `type` — style type (e.g. lager/ale/mixed — corresponds to BJCP's "Overall Impression"-adjacent classification)
- `tags` — array of style tags (BJCP's own tag taxonomy: strength, color, fermentation, era, etc. — see the guide's "Style Tag Reference")
- `overall_impression` — prose
- `aroma` — prose
- `appearance` — prose
- `flavor` — prose
- `mouthfeel` — prose
- `comments` — prose
- `history` — prose
- `ingredients` — characteristic ingredients, prose
- `style_comparison` — prose
- `entry_instructions` — present only on styles requiring extra entrant-specified detail (e.g. specialty/spice/fruit/historical/local styles)
- `examples` — array of commercial example names
- `vital_statistics` (BeerJSON groups the numeric ranges under this key in some entries) containing, and/or as sibling top-level keys depending on entry:
  - `original_gravity.minimum/maximum.{value,unit}` (OG, unit `"sg"`)
  - `final_gravity.minimum/maximum.{value,unit}` (FG, unit `"sg"`)
  - `international_bitterness_units.minimum/maximum.{value,unit}` (IBU)
  - `color.minimum/maximum.{value,unit}` (SRM)
  - `alcohol_by_volume.minimum/maximum.{value,unit}` (ABV, unit `"%"`)
- `style_guide` — which edition/guide this entry belongs to
- `currently_defined_types`, `strength_classifications` — present on a handful of "family" entries that enumerate sub-variants
- `notes` — free text, present on some local/appendix styles (e.g. entry-category suggestion notes)

**Caveat found while inspecting the raw file directly** (`https://raw.githubusercontent.com/beerjson/bjcp-json/main/styles/bjcp_styleguide-2021.json`, downloaded and parsed with Python): at least one entry — `X4 "Catharina Sour"` (a Brazilian local style, Appendix B of the official guide) — has its prose fields rendered with **Portuguese key names and Portuguese text** (`impressao_geral`, `aparencia`, `sabor`, `sensacao_de_boca`, `comentarios`, `historia`, `ingredientes` instead of the English `overall_impression`/`appearance`/`flavor`/... used everywhere else), alongside a `notes` field in Portuguese too. This looks like an artifact of the conversion pipeline for that one appendix entry, not a deliberate bilingual feature — worth defensive/tolerant parsing (or just ignoring prose fields entirely) if Bingo consumes this file, since Bingo only needs `style_id`/`name`/`category` today.

### `ascholer/bjcp-styleview` — `styles.json` (alternative / more current)

Field names (flatter naming convention, all lowercase, no underscores):
- `number` (style id, e.g. `"21A"`), `name`, `category`, `categorynumber`
- `overallimpression`, `aroma`, `appearance`, `flavor`, `mouthfeel`, `comments`, `history`, `characteristicingredients`, `stylecomparison`
- `entryinstructions` (specialty/local styles only)
- `commercialexamples`
- `tags`
- Vital statistics as flat min/max pairs: `ogmin`/`ogmax`, `fgmin`/`fgmax`, `ibumin`/`ibumax`, `srmmin`/`srmmax`, `abvmin`/`abvmax`

Functionally the same content as `beerjson/bjcp-json`, sourced independently (PDF → markdown → JSON pipeline per its own README) rather than via the BeerJSON schema.

## 4. Licensing / redistribution restrictions

### From the official BJCP PDF front matter (fetched directly and parsed page 1 of `2021_Guidelines_Beer_1.25.pdf`)

> "BEER JUDGE CERTIFICATION PROGRAM 2021 STYLE GUIDELINES
> Beer Style Guidelines
>
> Copyright © 2023, BJCP, Inc.
> The BJCP grants the right to make copies for use in BJCP-sanctioned competitions or for educational/judge training purposes.
> All other rights reserved.
> Updates available at www.bjcp.org"

(Source: [2021_Guidelines_Beer_1.25.pdf](https://www.bjcp.org/wp-content/uploads/2025/02/2021_Guidelines_Beer_1.25.pdf), page 1, downloaded and text-extracted directly.)

### From the official BJCP FAQ pages (fetched directly)

[bjcp.org/faq/i-want-to-use-your-style-guidelines-can-i/](https://www.bjcp.org/faq/i-want-to-use-your-style-guidelines-can-i/):

> "the style guidelines are used with the permission of the BJCP, and are Copyright 2021, Beer Judge Certification Program, Inc."

> "do not profit from our guidelines (the resulting version must be provided for free if used in an app or other format)"

> "We do not allow the guidelines to be posted on other web sites (PDF or text); all links should point to our master version."

> "clearly state ... that the most current master version can be found on the BJCP web site"

> **"Our naming and numbering system, the style parameters, and the overall impression section can be used for other purposes, but the full content of the guidelines may not."**

> Translations/adaptations require prior approval — contact the Communications Director and share screenshots for review.

[bjcp.org/faq/what-if-i-want-to-reformat-the-guidelines-or-use-them-a-different-way/](https://www.bjcp.org/faq/what-if-i-want-to-reformat-the-guidelines-or-use-them-a-different-way/):

> "You may not sell or post online reformatted versions of the Style Guidelines."

> "Since the BJCP holds the Copyright on the Style Guidelines, we also will hold Copyright on any derivative works."

> Reformatting into apps/databases/study tools/different file formats is explicitly welcomed ("Sure, go ahead") but any public/online posting of the reformatted version needs BJCP's prior review/approval, and BJCP will credit the contributor while holding copyright on the resulting derivative.

**Reading of this for Bingo**: the clause *"Our naming and numbering system, the style parameters ... can be used for other purposes"* is the operative permission for what Bingo actually needs — it directly covers `id` (numbering), `name` (naming), and the numeric vital statistics (OG/FG/IBU/SRM/ABV, i.e. "style parameters"). It also explicitly extends to the "overall impression section." It does **not** extend to the rest of the descriptive prose (aroma/appearance/flavor/mouthfeel/comments/history/ingredients/style_comparison/entry_instructions/examples) — reproducing those verbatim inside Bingo's bundled JSON would fall under "the full content of the guidelines," which the FAQ says "may not" be reused this way without separately contacting BJCP's Communications Director.

### From the `ascholer/bjcp-styleview` README (the exact dataset BJCP's own resources page links to)

> "BJCP style information contained in styles.json is Copyright © 2021 BJCP and used by permission."

> "You may not use these materials for any commercial purpose without permission."

> "You are NOT authorized to copy and post these guidelines, in any form, either on the web or in print, without specific permission from the BJCP."

This confirms the underlying *data* in that repo carries the same restriction as the official PDF — the repo's own **code** (parser/viewer) has no separate license (no LICENSE file was found in the repo listing), so there is no additional open-source grant beyond what's already implied by it being public on GitHub; you'd be relying entirely on BJCP's own permission language above for the data itself.

### `beerjson/bjcp-json` license

The repository has an MIT **LICENSE** file (confirmed via `raw.githubusercontent.com/beerjson/bjcp-json/main/LICENSE` — standard MIT boilerplate, "Copyright (c) 2017 beerjson"). This MIT grant covers the **repo/code and the JSON-format packaging itself**; it does not and cannot override BJCP's own copyright claim on the underlying guideline *content* baked into that JSON (BJCP's copyright is on the creative/textual content, which the MIT license from a third party cannot license away). So: the container (this specific JSON serialization, file structure, scripts) is MIT; the guideline text/data inside it is still BJCP's copyrighted material, subject to the FAQ restrictions quoted above.

### `bjcp-brasil/styleguide-2021`

No LICENSE file in the repo. README states plainly: "Everything about the 2021 Style Guidelines is owned by BJCP." No additional permissive grant for the JSON/XML/YAML packaging itself.

## Practical implication for Bingo

Bingo's current `bjcp_styles.json` already only stores `{id, name}` — exactly the subset of data that BJCP's own FAQ explicitly permits reuse of ("naming and numbering system"). Expanding to the full ~110-entry 2021 list using **only** `id`/`name`/`category` (and optionally OG/FG/IBU/SRM/ABV ranges and `tags`, all covered by "style parameters") from `beerjson/bjcp-json`'s `bjcp_styleguide-2021.json` stays within that permission and uses a cleanly MIT-licensed source repo as the *technical* origin. If a future feature wants to show full style descriptions (aroma/flavor/etc.) inside the app, that step requires either (a) linking out to the official BJCP guidelines page/PDF rather than reproducing the text in Bingo's own bundle, or (b) contacting BJCP's Communications Director for explicit permission per the FAQ, and if BJCP approves a public version, expect them to require it be provided free of charge and to require the master-version-link/attribution language.

## Sources

- [bjcp.org/bjcp-style-guidelines/](https://www.bjcp.org/bjcp-style-guidelines/) — official guidelines landing page
- [bjcp.org/beer-styles/downloads-and-resources/](https://www.bjcp.org/beer-styles/downloads-and-resources/) — official downloads/resources hub, lists 2015 structured formats + links to third-party 2021 JSON
- [bjcp.org/wp-content/uploads/2025/02/2021_Guidelines_Beer_1.25.pdf](https://www.bjcp.org/wp-content/uploads/2025/02/2021_Guidelines_Beer_1.25.pdf) — official 2021 PDF (downloaded and text-extracted directly for this research)
- [bjcp.org/faq/i-want-to-use-your-style-guidelines-can-i/](https://www.bjcp.org/faq/i-want-to-use-your-style-guidelines-can-i/) — official FAQ on reuse/permission
- [bjcp.org/faq/what-if-i-want-to-reformat-the-guidelines-or-use-them-a-different-way/](https://www.bjcp.org/faq/what-if-i-want-to-reformat-the-guidelines-or-use-them-a-different-way/) — official FAQ on reformatting
- [github.com/beerjson/bjcp-json](https://github.com/beerjson/bjcp-json) — recommended structured data source (MIT license, BeerJSON schema)
- [github.com/beerjson/bjcp-json/blob/main/styles/bjcp_styleguide-2021.json](https://github.com/beerjson/bjcp-json/blob/main/styles/bjcp_styleguide-2021.json) — the actual 2021 data file inspected
- [github.com/beerjson/beerjson](https://github.com/beerjson/beerjson) — BeerJSON standard/spec repo (joint BJCP/ASBC/Brewers Association), defines the `style` schema used by `bjcp-json`
- [beerjson.github.io/beerjson/](https://beerjson.github.io/beerjson/) — BeerJSON documentation site
- [github.com/ascholer/bjcp-styleview](https://github.com/ascholer/bjcp-styleview) — most recently updated third-party 2021 dataset, linked from bjcp.org itself, no LICENSE file
- [github.com/bjcp-brasil/styleguide-2021](https://github.com/bjcp-brasil/styleguide-2021) — actively maintained EN + pt-BR dataset, no LICENSE file
- [github.com/jrdn91/bjcp-guidelines-2021](https://github.com/jrdn91/bjcp-guidelines-2021) — MIT-licensed npm package, self-reported accuracy issues
- [github.com/lrdodge/bjcp-style-data](https://github.com/lrdodge/bjcp-style-data) — outdated (2015-only), not recommended
- GitHub API (`gh api repos/<owner>/<repo>`) — used to confirm `pushed_at`, `license.spdx_id`, `stargazers_count`, `archived` for all candidate repos, queried 2026-08-21
