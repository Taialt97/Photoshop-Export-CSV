# Implementation Plan — Browse Memory + Clipping Masks

Two features, shipped **one at a time**. Feature 1 must be tested and confirmed working before Feature 1 is merged and Feature 2 is started.

Working style: one feature branch per feature, off `main`, matching the existing repo convention (`feature/*`).

---

## Feature 1 — Browse remembers last location

**Branch:** `feature/browse-memory`

### Behavior (agreed)

- Two independent memories, one per Browse button:
  - `btnBrowse` → Export Location (destination folder picker)
  - `btnBrowseCsv` → CSV Manifest File picker
- Each dialog opens at the folder last used **by that button**, persisted across Photoshop launches.
- Fallback chain when there's no memory yet (first run, or the remembered folder no longer exists): active document's folder → `Folder.myDocuments`.
- Memory is written when the user actually confirms a pick (cancel changes nothing).

### Current state

| Location | What it does today |
| --- | --- |
| `Export Layers To Files (Fast).jsx:2800` | `btnBrowse.onClick` → `getActiveDocFolder() \|\| prefs.destination` |
| `:3061` | `btnBrowseCsv.onClick` → `getActiveDocFolder()`, seeds a dummy `File` for `openDlg` |
| `:2774` | `getActiveDocFolder()` |
| `:3297` `saveSettings` / `:3392` `getDefaultSettings` / `:3474` `getSettings` | `app.putCustomOptions` / `getCustomOptions` persistence, keyed off `DEFAULT_SETTINGS` type IDs |

There is already a persistence layer — the new values ride along in it, no new mechanism needed.

### Steps

1. **Add two setting keys** — `lastBrowseDestDir` and `lastBrowseCsvDir` — to the `DEFAULT_SETTINGS` type-ID map, to `getDefaultSettings()` (default `""`), and to `getSettings()` (`desc.getString(...)`).
2. **Persist them in `saveSettings()`** via `desc.putString(...)`. Values come from module-level vars updated by the click handlers, not from a dialog field (there is no text field for them).
3. **Add a helper** `resolveStartFolder(rememberedPath)` — returns a `Folder` for `rememberedPath` if it exists on disk, else `getActiveDocFolder()`, else `Folder.myDocuments`. One helper, used by both buttons, so the fallback rule can't drift.
4. **Rewire `btnBrowse.onClick`** — start at `resolveStartFolder(prefs.lastBrowseDestDir)`; on a successful pick, record `newFilePath.fsName` into the module var.
5. **Rewire `btnBrowseCsv.onClick`** — same start folder resolution, seeded through the existing `new File(dir + "/dummy.csv").openDlg(...)` trick; on success record `csvFile.parent.fsName` (the *folder*, not the file).
6. **Guard the CS3-or-lower path** — `saveSettings`/`getSettings` early-return when `!env.cs3OrHigher`; the new code must degrade to today's behavior, not throw.

### Test (manual, in Photoshop)

1. Fresh state (or after `app.eraseCustomOptions`): both Browse buttons open at the PSD's folder. ✔ same as today
2. Pick a destination in folder **A**, pick a CSV from folder **B**. Cancel out of the script.
3. Reopen the script: Export Location Browse opens at **A**, CSV Browse opens at **B** — *independently*.
4. Quit Photoshop, relaunch, reopen script: still **A** and **B**.
5. Delete/rename folder **A** on disk, reopen: destination Browse falls back to the doc folder without an error.
6. Open Browse and hit **Cancel**: memory unchanged.
7. Run a full export end-to-end to confirm nothing in `saveSettings` broke (a bad type ID silently wipes *all* saved settings — this is the main regression risk).

---

## Feature 2 — Export assets including their clipping masks

**Branch:** `feature/clipping-masks` (started only after Feature 1 is confirmed)

### The bug

Both export paths **isolate** the target by hiding every layer in the document and re-showing only the target plus its ancestors:

- `exportSingleLayer` (`:1022`) → `hideAllLayersDeep()` then `layer.visible = true` + ancestors
- `exportFlattenedFolder` (`:1078`) → `hideAllLayersDeep()` then `showLayerSetTree(ls)` + ancestors

A Hue/Saturation (or any adjustment / texture) layer clipped **onto** the target sits *above* it in the panel and is **not** the target, not a descendant, and not an ancestor — so it gets hidden and never composites. Result: the asset exports without its adjustment.

The word "clip" appears **nowhere** in the script today, so this is new logic, not a fix to existing logic.

### Scope (agreed)

- **In scope:** the target is the clip **base**; the layers clipped onto it must be included. Applies to layer rows *and* folder rows (a layer clipped onto a group), and — since the Smart Object drill path reuses the same two export functions — inside drilled SOs too.
- **Always on.** No dialog checkbox, no CSV column.
- **Hidden clipped layers stay hidden.** A clipped layer the user toggled off is not force-shown. (Note the asymmetry: `showLayerSetTree` already force-shows everything *inside* a folder row. Clipped layers attached from *outside* the folder follow the visible-only rule instead. Flagging this now so it isn't a surprise.)
- **Out of scope:** the target is itself clipped to a base below it (`layer.grouped === true`). Isolating it hides its base, so it renders empty or unclipped. Left alone for now — see "Deferred" below.

### How clipping is detected

Photoshop's DOM exposes `layer.grouped` — `true` means "clipped to the layer below". A clipping stack is a **run of consecutive `grouped === true` layers directly above the base, in the same parent container**. Both `ArtLayer` and `LayerSet` expose `.grouped`, so a group can be a clip base and a group can be clipped.

Index direction matters: in `container.layers`, index `0` is the **top** of the panel. So for a base at index `i`, the clipped layers are at `i-1`, `i-2`, … as long as `.grouped` is true; the first `.grouped === false` layer ends the stack.

### Steps

1. **`findClippedLayers(target)`** — new helper. Locates `target` in `target.parent.layers`, walks upward (decreasing index) collecting layers while `.grouped === true`, stops at the first non-clipped layer or the top of the container. Returns an array (empty for the common case). Wrapped in try/catch — `.grouped` throws on some layer kinds and a throw here must not kill the export.
2. **`showClippedLayers(target)`** — calls `findClippedLayers`, sets `visible = true` only on members that were **already visible** before the run's `hideAllLayersDeep` wiped visibility. This requires knowing the *original* visibility, which `hideAllLayersDeep` destroys →
3. **Record original visibility inside the existing hide pass — no extra traversal.** `hideAllLayersDeep` (`:796`) already walks the whole tree and already writes `.visible = false` on every layer. Read `.visible` immediately before that write and stash it in a map keyed by `layer.id`, guarded by a "already recorded for this document" flag so it happens on the **first** hide only and every later call is unchanged.
   - Cost: **zero additional traversals**; one extra property read per layer, once per document per run.
   - Per-document keying matters: the Smart Object drill path calls `hideAllLayersDeep(app.activeDocument.layers)` against the *opened SO document*, which is a different layer tree. Key the "recorded" flag by document id, not a single global boolean, or SO rows silently get no clipping support.
   - Rejected alternative: a dedicated snapshot pass right after the duplicate. Correct but wasteful, and it can't see inside Smart Objects (they aren't open yet). The CSV path **bypasses `collectLayersAM` entirely** (`main()` `:501`), so there is no existing collected-layer data to reuse — that was worth checking before adding a walk.
4. **Hook into `exportSingleLayer`** — after `layer.visible = true` and the ancestor walk, call `showClippedLayers(layer)`. Must run **before** `bakeLayerStyleInPlace`, the effects stamp, and `trimToRenderedPixels`, so the clipped adjustment is part of what gets baked, filtered and trimmed.
5. **Hook into `exportFlattenedFolder`** — same call after `showLayerSetTree(ls)` and the ancestor walk, targeting `ls`.
6. **Ancestor visibility for the clipped layers** — they share the target's parent, so the existing ancestor walk already covers them. Assert this rather than assume it; if a clipped layer is ever found in a different container, skip it and warn instead of guessing.
7. **Warning for the unhandled direction** — if the target itself has `grouped === true`, push a warning into the run summary ("clipped to the layer below; base not included") so a wrong-looking export is explained rather than silent. Cheap, and it turns the deferred case into a known limitation instead of a bug report.
8. **Update docs** — `README.md` (a short "Clipping masks" note under the folder/layer export rules) and `script-breakdown.html` if it documents the isolation logic.

### Performance budget

What each row already costs, in order of weight:

1. `storeHistory()` + `restoreHistory()` — a history snapshot and revert. Dominant by a wide margin.
2. `saveImage` — disk I/O, plus resize / canvas / trim ops.
3. `hideAllLayersDeep(doc.layers)` — **twice per row** (once in the `try`, once in the `finally`), each a full tree traversal with a property write per layer.

What the feature adds per row:

- `findClippedLayers(target)` — locate the target among its siblings, then read `.grouped` walking upward until the run ends. Bounded by the target's sibling count, and in practice a handful of property reads.
- `visible = true` on 0–2 layers.

That is a fraction of **one** `hideAllLayersDeep` call, against the two already run per row — and both of those are themselves far below `storeHistory`/`restoreHistory`. The one-time visibility recording is now folded into a traversal that already happens.

**Don't take that on trust.** The script already has a `Profiler` (`:4190`) and the CSV summary already prints an export duration (`showCsvSummary`, `:1690`). Before/after timings on your real manifest settle it in one run — if the delta is measurable I'll cache the sibling lookup per isolation, since consecutive rows sharing an `isolationKey` already share a render.

### Test (manual, in Photoshop — build a small PSD)

| # | Setup | Expected |
| --- | --- | --- |
| 1 | Layer `Coin`, Hue/Sat clipped onto it | Export of `Coin` shows the hue shift |
| 2 | Same, Hue/Sat **hidden** | Export of `Coin` is unadjusted (hidden respected) |
| 3 | Two clipped layers stacked on `Coin` (Hue/Sat + Levels) | Both apply |
| 4 | Clipped stack, then a **non**-clipped layer above it | The non-clipped layer does **not** leak in |
| 5 | Group `Jackpots/grand`, a texture layer clipped onto the group | Flattened folder export includes the texture |
| 6 | Layer with **no** clipping at all | Byte-identical to pre-change output (regression check) |
| 7 | Clipped adjustment that reports full-canvas bounds | `trimToRenderedPixels` still crops to the base's pixels, not the whole canvas |
| 8 | Clipped layer inside a Smart Object, addressed with a `::` drill row | Same behavior as the top level |
| 9 | A row whose target is itself clipped (`grouped === true`) | Warning in the summary; run does not fail |
| 10 | Full multi-row manifest, before vs after | Only the rows with clipping change |

Test 6 is the one that matters most — diff a full export run against a pre-change run and confirm only the clipped assets moved.

### Deferred (not in this pass)

- Target is itself a clipped layer (`grouped === true`) — needs its base visible to render at all, which then composites the base's pixels into the output. The correct fix is probably converting the clip into a real layer mask on a duplicate. Warned about (step 7), not implemented.
- The legacy non-CSV export path (`exportLayers`, `:587`) has the same isolation blind spot. Not touched, since the CSV path is the one in use. Easy follow-up if wanted.

---

## Sequence

1. Branch `feature/browse-memory` → implement → **you test** → confirm → merge to `main`.
2. Branch `feature/clipping-masks` → implement → **you test** → confirm → merge to `main`.

No work starts on Feature 2 until Feature 1 is confirmed working.
