# Photoshop Export — CSV Manifest

A Photoshop script that exports layers to image files driven by a **CSV manifest**. Each row names **exactly what to export** and how big to render it — one row = one output image. A row that points at a **layer** exports that layer; a row that points at a **folder** flattens that whole folder into a single image.

> Forked from [**antipalindrome / Photoshop-Export-Layers-to-Files-Fast**](https://github.com/antipalindrome/Photoshop-Export-Layers-to-Files-Fast). All the upstream features still work; this fork wraps a CSV-focused dialog around them.

## Install

1. Download `Export Layers To Files (Fast).jsx` and `Export Layers To Files (Fast)-progress_bar.json` (they must sit in the **same folder**).
2. In Photoshop: **File → Scripts → Browse…** and pick the `.jsx`.
3. Optional: drop both files into Photoshop's `Presets/Scripts` folder so the script appears under **File → Scripts**.

## Use

1. Open your PSD/PSB.
2. Run the script. Browse buttons start in the open document's folder.
3. Pick a **CSV Manifest File** (see schema below).
4. Pick an **Export Location**.
5. Hit **Start Export**.

There is no "target folder" picker and no row-count-must-match rule anymore: every row addresses its source explicitly via the **`Path`** column, so inserting or reordering layers in Photoshop never misaligns your manifest. Limiting the run to specific top-level groups is done with the optional [`scope:`](#scope) line in the CSV.

Before exporting, the script silently **auto-saves** your document and then does **all work on a duplicate** — your original PSD is never modified. When the run finishes it shows a summary (with timing) and opens the output folder.

## CSV manifest schema

```csv
Width,Height,Padding,Filename,Mode,Path
500,500,10,symbol_01,fit,Symbols/Coin
600,400,5,banner,canvas,UI/Banner
,,,logo_raw,,Branding/Logo
512,512,0,hero,fit,Characters/Hero
```

| Column     | Required | Description                                                                                   |
| ---------- | -------- | --------------------------------------------------------------------------------------------- |
| `Width`    | no       | Output canvas width in px. **Empty or `0` → natural size** (no resize).                        |
| `Height`   | no       | Output canvas height in px. Empty or `0` → natural size. Width and Height are **independent**. |
| `Padding`  | no       | Px kept around the asset before fitting (`fit` mode only). Empty → `0`.                        |
| `Filename` | yes      | Output filename, no extension. **Output-only** — unrelated to the layer name. May contain `subfolder/name`. |
| `Mode`     | no       | `fit` (default) or `canvas`.                                                                   |
| `Path`     | yes      | The source locator — which layer or folder to export (see [Path grammar](#path-grammar)).      |

Anything you name is exported **even if it (or a parent group) is hidden** — putting it in the manifest *is* the intent to export it.

### Sizing & padding

- **`fit`** (default): the asset is scaled to fit inside `(Width − Padding×2) × (Height − Padding×2)`, then centered on an exact `Width × Height` canvas.
- **`canvas`**: the asset keeps its original pixel size, centered on a `Width × Height` canvas; anything larger than the canvas is cropped (centered). **Padding has no effect in `canvas` mode.**
- **Empty Width/Height** exports the asset at its own natural size — no resizing, no fixed canvas. (Natural size wins even if `Mode` is `canvas`.)

```csv
300,300,50,my_asset,fit,Art/MyAsset
```

→ the asset is scaled to fit `200×200` (300 − 50×2) and centered on a `300×300` canvas.

### Path grammar

A `Path` is slash-separated segments read **top-down through the Layers panel**, starting from the document root (or from a [scope](#scope) root if `scope:` is set). Each segment is one of:

| Segment   | Meaning |
| --------- | ------- |
| `Name`    | A child matched by name (case-sensitive; surrounding whitespace is trimmed, since Photoshop names often carry trailing spaces). |
| `[n]`     | The n-th **direct child**, where `[0]` is the **TOP** layer in the panel and `n` increases downward. `[n]` counts **every** direct child — art layers **and** sub-groups — exactly as the panel shows. |

- Mix them freely: `Jackpots/grand`, `LowSymbols/[0]`, `Wild/[1]/Text`.
- Only a segment that is **exactly `[digits]`** is an index. `Symbols [ALL]` is a **name** (the brackets are part of it), not an index.
- The final segment may resolve to either a **layer** (→ exported as a layer) or a **folder** (→ flattened to one image). There is no third case.

```csv
166,168,0,3_A,fit,LowSymbols/3_A         # a layer
166,168,0,top_low,fit,LowSymbols/[0]      # the top child of LowSymbols
277,272,0,jackpot_grand,fit,Jackpots/grand # a FOLDER -> flattened to one image
0,0,0,everything,fit,Symbols [ALL]         # whole group flattened ("[ALL]" is a name)
```

### Folder = flatten (always)

A `Path` that lands on a group **flattens the entire group into a single image**, sized exactly like a layer row. There is no option to auto-explode a folder into its children — if you want N images, write N rows. This keeps every output traceable to exactly one row.

### Scope

An optional `scope:` line (case-insensitive) **before the header** lists one or more **top-level groups** to export, by name or `[index]`, comma-separated:

```csv
scope: Jackpots, LowSymbols
Width,Height,Padding,Filename,Mode,Path
277,272,0,grand,fit,grand
166,168,0,top,fit,[0]
```

- Each row's `Path` is resolved **relative to a scope root** (so `grand` above means `Jackpots/grand`, then `LowSymbols/grand`).
- Scopes are processed **in the order listed**, and each one writes into **its own output sub-folder** named after the scope (`OUT/Jackpots/…`, `OUT/LowSymbols/…`) — so a same-named asset in two scopes never overwrites.
- A row that doesn't resolve inside a given scope is skipped for that scope (and reported).
- With **no** `scope:` line, `Path`s are absolute from the document root.

### Filename column

- **Subfolders**: `subfolder/name` places the file in a subfolder of the export location (created automatically; nesting allowed: `hud/icons/health`).
- **Commas in names**: wrap the field in double quotes (`"name, with comma"`).
- The extension comes from the chosen export format.

### Comments, blank lines, headers

- Blank lines and lines starting with `#` are ignored.
- **Inline comments** are supported: anything from a `#` to the end of a line is ignored (e.g. `166,168,0,3_A,fit,LowSymbols/3_A # low symbol A`).
- A leading text header row (`Width,Height,Padding,Filename,Mode,Path`) is detected and skipped automatically.

### Validation & error reporting

Path resolution happens up front on the duplicate, so problems surface without waiting through an export. The run never aborts for one bad row — it exports everything that resolves and reports the rest in the end-of-run summary, which lists:

- **Bad scopes** (a scope that names no top-level group) — surfaced first/loudest, since a bad scope silently drops a whole branch.
- **Unresolved rows** (path matches nothing) — that row is skipped; the rest still export.
- **Duplicate-name overwrites** — two rows writing the same filename into the same folder (detected across rows and across scopes).
- **Empty targets** — a layer/folder with no pixels is skipped instead of writing a blank canvas.
- **Hidden-group flattens** — informational, since flattening a hidden whole group is a big action.
- **Timing** — duplicate time + export time, always shown.

> **Old-format CSVs are rejected.** The previous positional format (1 row = 1 layer by position) and its `folder:` / `-ignore` markers are gone. A file using them fails with a clear message telling you to update it.

See **`export_template.csv`** for a fully annotated template, and the **`Examples/`** folder for working manifests (including a `scope:` demo).

## Worked example

For a document whose top-level groups are `Jackpots` (with hidden sub-groups `grand`, `major`, `minor`, `mini`) and `LowSymbols` (with layers `3_A`, `2_K`, `1_Q`, `0_J`):

```csv
Width,Height,Padding,Filename,Mode,Path
277,272,0,symbols/symbol_19,fit,Jackpots/grand   # flatten "grand" group -> one image
277,272,0,symbols/symbol_18,fit,Jackpots/major   # flatten "major" group (hidden) -> exported anyway
166,168,0,symbols/symbol_3,fit,LowSymbols/3_A    # a layer
166,168,0,symbols/symbol_0,fit,LowSymbols/[3]    # the 4th child of LowSymbols (0_J)
```

Each `Jackpots/*` row flattens a group into a single image (the hidden ones are forced visible just for the export); each `LowSymbols/*` row exports one layer. Outputs land in `symbols/` under the export location.

## Dev toggles

A small block near the top of the `.jsx` controls behavior — flip and re-run, no other changes needed.

```js
var CSV_FOCUSED_UI = true;            // hide legacy panels, show only the CSV workflow
var DEBUG_CSV_MANIFEST = false;       // force-write the CSV debug log
var DRY_RUN = false;                  // resolve + report every row/scope but write NOTHING
var SHOW_VISIBLE_ONLY = true;         // show "Visible Only" checkbox in the action area
var SHOW_CSV_DEBUG_CHECKBOX = false;  // show the "Write CSV debug log" checkbox in the dialog
```

## Supported formats

PNG-24, PNG-8, JPG, TIFF, PDF, TGA, BMP, PSD.

## Requirements

Adobe Photoshop CS2 or later. Tested on macOS; should work on Windows since the upstream script does.

## Credits & License

- Original script: [antipalindrome / Photoshop-Export-Layers-to-Files-Fast](https://github.com/antipalindrome/Photoshop-Export-Layers-to-Files-Fast) — all upstream contributors.
- CSV manifest workflow + UI overhaul in this fork: [Taialt97](https://github.com/Taialt97).

MIT — see [LICENSE](LICENSE).
