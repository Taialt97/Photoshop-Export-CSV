# Implementation Plan — SO Drilling, Multi-Destination, SO Scopes

One step at a time. Every step ends with a **Checkpoint** you run yourself in Photoshop before we move on.
Nothing merges until its checkpoint passes. If a checkpoint fails, we fix or revert that step only.

**Rules for every step**

- Work happens on a git branch (`feature/so-drilling`); one commit per step, so any step can be reverted alone.
- Existing behavior is sacred: after every step, an *old* manifest must produce byte-identical results.
- `DRY_RUN = true` is the first test of every step (resolve + report, write nothing).

---

## Step 0 — Safety net (no code changes)

- [ ] Create branch `feature/so-drilling`.
- [ ] Build a small **test PSD** (`Examples/frame_test.psd`): smart object `frame` containing layers `frame outside`, `frame inside`, `background`, `glow`, `numbers`; plus one *nested* SO for later steps; plus a normal group + layer for regression; plus one **artboard** containing a group and a layer (with some content NOT filling the artboard, to test bounds).
- [ ] Run the current script on `Examples/basic.csv` against a real PSD. Save the outputs → this is the **golden baseline**.
- [ ] Note the timing summary numbers (duplicate / export) for later comparison.

**Checkpoint:** baseline outputs saved somewhere safe; script runs clean on current master.

---

## Step 1 — `::` recognized in parsing (no behavior change)

Touches: `parseCsvFile`, `splitCsvLine`, `resolveCsvPath` (tokenizer only).

- Path strings are split on `::` into segments; each segment keeps the existing `/` grammar.
- A path containing `::` resolves its **first** segment only; if it lands on a smart object, DRY_RUN reports `SO-drill row (not yet executed)`. No export from inside yet.
- Paths without `::` go through the exact same code path as today.

**Checkpoint:**
- [ ] DRY_RUN on an old manifest → identical report to Step 0.
- [ ] DRY_RUN on `frame_test.csv` → drill rows listed as recognized, plain rows resolve normally.
- [ ] A `::` path whose prefix is NOT a smart object → clear error in summary, run continues.

---

## Step 2 — Drill one level: export a layer from inside an SO

Touches: `resolveCsvPath`, `runCsvManifest`, `exportSingleLayer`.

- On the duplicate, resolve to the SO layer, open its contents (edit-contents), resolve the remainder inside with the same resolver, export, close **without saving**.
- One SO, one level, layers only. Ignore performance for now (open/close per row is fine).

**Checkpoint:**
- [ ] `frame parts/` rows from `frame_test.csv` export correctly with chosen names.
- [ ] Exported pixels match what you see opening the SO by hand.
- [ ] Old manifests still byte-identical.
- [ ] The original PSD and the SO contents are untouched afterwards (no save prompts).

---

## Step 3 — Everything works *inside* an SO: folders, `[n]`, flatten, hidden

Touches: mostly verification; resolver is shared so this should already work.

- `frame::SomeGroup` flattens the group inside the SO; `frame::[0]` indexes; hidden layers inside the SO export anyway (same rule as outside).

**Checkpoint:**
- [ ] Add such rows to `frame_test.csv`, verify each output.
- [ ] Empty-target and unresolved-row reporting works for inside-SO paths.

---

## Step 4 — Nested SOs (chained `::`)

Touches: `resolveCsvPath` recursion, open/close bookkeeping.

- `boldEagle::boldEagle::wings` — each `::` opens the next SO from within the previous one. Close order: innermost first, never save.

**Checkpoint:**
- [ ] 2-level drill exports correctly from the test PSD.
- [ ] Deliberately broken chain (middle segment not an SO) → reported, run continues, no stray open documents left behind.

---

## Step 5 — Open each SO once (performance)

Touches: `runCsvManifest` (sort/group rows by SO-prefix before the export loop).

- Rows sharing the same `::` prefix run consecutively against a single opened SO document.
- Pure reordering of work — outputs must be identical to Step 4.

**Checkpoint:**
- [ ] Same outputs as Step 4 (compare files).
- [ ] Timing summary shows fewer SO opens / faster run on a multi-row drill manifest.

---

## Step 6 — Render cache + multi-destination via duplicate rows

Touches: `runCsvManifest`, `exportSingleLayer`, `exportFlattenedFolder`, `saveImage`.

- Cache key: `Path + Width + Height + Padding + Mode`. Second row with the same key re-saves the cached render instead of re-rendering.
- This *is* the multi-folder feature: the three `background` rows in `frame_test.csv` render once, save three times.
- Duplicate-overwrite detection still keyed on final output path (unchanged).

**Checkpoint:**
- [ ] `frame_test.csv` full run: 8 files, `background` present in 3 folders with the right names.
- [ ] Summary/timing confirms background rendered once.
- [ ] Two rows, same Path, *different* size → NOT cached, both render.

---

## Step 7 — Multi-value Filename (optional sugar)

Touches: `parseCsvFile`, `csvOutputParts`.

- `"a/name1;b/name2"` in Filename expands internally to duplicate rows (which Step 6 already handles). `;` split only, quoted field.

**Checkpoint:**
- [ ] The commented one-row alternative in `frame_test.csv` produces the same 3 background files as the three-row version.
- [ ] Filenames containing no `;` behave exactly as before.

---

## Step 7.5 — Artboard support

Touches: `resolveCsvPath` (artboard detection), `exportFlattenedFolder` (bounds).

- Artboards already resolve as groups in paths (`Artboard 1/Symbols/Coin`) — verify, don't assume.
- **Artboard-aware flatten**: a path landing on an artboard flattens clipped to the **artboard's frame bounds**, not content bounds — art that doesn't fill the frame keeps the frame size; art bleeding past the edge gets clipped. (Normal groups keep content-bounds behavior, unchanged.)
- Layers *inside* artboards export exactly like layers inside groups.

**Checkpoint:**
- [ ] Row targeting a layer inside an artboard exports correctly.
- [ ] Row targeting the artboard itself → output canvas = artboard frame size, under-filled area transparent, overflow clipped.
- [ ] Non-artboard folder flattens unchanged from Step 6 output.
- [ ] Old manifests still byte-identical.

---

## Step 8 — SO scopes

Touches: `parseScopeFolderLine`, scope resolution in `runCsvManifest`.

- Scope entries become full paths and may end in `::` (e.g. `scope: frame::`). Row paths resolve relative to inside the SO. Scope output folder name sanitized (`frame` / `Coin_FX`).

**Checkpoint:**
- [ ] A `scope: frame::` manifest with bare paths (`background`, `glow`) exports correctly into its scope folder.
- [ ] Bad SO scope → surfaced loudly, like bad scopes today.
- [ ] Mixed scope list (normal group + SO scope) works, ordered output folders per scope.

---

## Step 9 — Per-row resolution modifier (native vs placed)

Touches: path/row grammar (small), export sizing.

- Default: SO-internal exports at the SO's **native** resolution. Opt-in per row to **placed** (scaled-as-in-parent) size — exact syntax decided at this step (likely a Mode suffix like `fit@placed`).

**Checkpoint:**
- [ ] Scale the `frame` SO to ~50% in the parent PSD; native row exports full-res, placed row exports scaled.
- [ ] Rows without the modifier are unchanged from Step 6 output.

---

## Step 10 — Polish, docs, regression sweep

- [ ] Summary additions: SO opens count, cache hits, linked-SO rejection message (embedded only for now — linked SOs error clearly).
- [ ] Update `README.md` (path grammar, scopes, cache) + `export_template.csv`.
- [ ] Final regression: run **every** CSV in `Examples/` (old and new) and diff against goldens.
- [ ] Merge branch.

---

**Suggested pace:** one step per session. You test the checkpoint in Photoshop, confirm, then we start the next step. Steps 1–4 are the risky core; 5–7.5 are safe layering; 8–9 are independent and can be reordered or dropped.
