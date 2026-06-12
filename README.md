# Photoshop Export — CSV Manifest

A Photoshop script that exports layers to image files driven by a **CSV manifest** — width, height, padding, filename and fit mode are defined per row, instead of being identical for every layer.

> Forked from [**antipalindrome / Photoshop-Export-Layers-to-Files-Fast**](https://github.com/antipalindrome/Photoshop-Export-Layers-to-Files-Fast). All the upstream features still work; this fork wraps a CSV-focused dialog around them.

## Install

1. Download `Export Layers To Files (Fast).jsx` and `Export Layers To Files (Fast)-progress_bar.json` (must sit in the **same folder**).
2. In Photoshop: **File → Scripts → Browse…** and pick the `.jsx`.
3. Optional: drop both files into Photoshop's `Presets/Scripts` folder so the script appears under `File → Scripts`.

## Use

1. Open your PSD/PSB.
2. Run the script. Browse buttons start in the open document's folder.
3. Pick a **Target Folder** (only top-level groups are listed by default — tick **Show all groups** to expand).
4. Pick a **CSV Manifest File** (see schema below).
5. Pick an **Export Location**.
6. Hit **Start Export**.

Each CSV row maps **1-to-1** with a layer, top to bottom: row 1 is the topmost layer, row 2 the next, and so on. The row count must match the layer count — if it doesn't, a review dialog opens so you can fix the manifest before exporting.

## CSV manifest schema

```csv
Width,Height,Padding,Filename,Mode
500,500,10,symbol_01,fit
600,400,5,banner_01,canvas
0,0,0,-ignore
480,80,0,ui/button_play,fit
```

| Column     | Required | Description                                                       |
| ---------- | -------- | ----------------------------------------------------------------- |
| `Width`    | yes      | Output canvas width in pixels                                     |
| `Height`   | yes      | Output canvas height in pixels                                    |
| `Padding`  | yes      | Padding in pixels around the layer content (`fit` mode only)      |
| `Filename` | yes      | Output filename, no extension — the extension comes from the chosen format |
| `Mode`     | no       | `fit` (default) — scale the layer to fit inside the canvas minus padding · `canvas` — keep the layer at its original size; content larger than the canvas is cropped (centered) |

### Filename column

- **Subfolders**: `subfolder/name` places the file in a subfolder of the export location (created automatically, nesting allowed: `hud/icons/health`). A subfolder in the CSV always takes precedence. When a row has no subfolder, files are written straight to the export location by default — untick **Flatten Nested Folders** in the dialog to instead mirror the layer's Photoshop group hierarchy.
- **Skipping a layer**: the special value `-ignore` skips that layer — no file is exported, but the row still counts so the rows below stay aligned. Use `0,0,0,-ignore`.
- **Commas in names**: wrap the field in double quotes (`"name, with comma"`). Unquoted commas in the filename also work as long as the final field isn't the word `fit` or `canvas`.
- Explicit CSV filenames **overwrite** existing files — the name in the manifest is treated as intentional.

### Comments, blank lines, headers

- Lines starting with `#` and blank lines are ignored.
- A leading text header row (`Width,Height,Padding,Filename,Mode`) is detected and skipped automatically.

### Validation & error reporting

- **Malformed rows** (fewer than 4 columns, or non-numeric Width/Height/Padding) are skipped with a warning that lists the offending line numbers.
- **Count mismatch** between CSV rows and exportable layers opens the in-dialog manifest review so you can fix it.
- A **missing target folder** (renamed/deleted group) aborts the export with a message instead of silently exporting everything.
- **Empty layers** are skipped with a warning instead of producing a blank full-canvas image.
- Rows with no usable dimensions (zero width/height that aren't `-ignore`) export the layer **unresized** under its layer name, with `-001`-style suffixes to avoid overwriting duplicates.
- After the export, a summary lists any errors or warnings that occurred.

See `export_template.csv` for a fully annotated template and `Examples/` for real manifests.

## Dev toggles

A small block near the top of the `.jsx` controls dialog visibility — flip and re-run, no other changes needed.

```js
var CSV_FOCUSED_UI = true;            // hide legacy panels, show only the CSV workflow
var DEBUG_CSV_MANIFEST = false;       // force-write the CSV debug log
var SHOW_VISIBLE_ONLY = true;         // show "Visible Only" checkbox in the action area
var SHOW_CSV_DEBUG_CHECKBOX = false;  // show the "Write CSV debug log" checkbox in the dialog
var TARGET_FOLDER_DEFAULT_NESTED = false; // false: top-level groups only · true: full nested tree
```

The debug log is written to the system temp folder (`ExportLayersCSV-debug.log`) and reset at the start of each run.

## Supported formats

PNG-24, PNG-8, JPG, TIFF, PDF, TGA, BMP, PSD.

## Requirements

Adobe Photoshop CS2 or later. Tested on macOS; should work on Windows since the upstream script does.

## Credits & License

- Original script: [antipalindrome / Photoshop-Export-Layers-to-Files-Fast](https://github.com/antipalindrome/Photoshop-Export-Layers-to-Files-Fast) — all upstream contributors.
- CSV manifest workflow + UI overhaul in this fork: [Taialt97](https://github.com/Taialt97).

MIT — see [LICENSE](LICENSE).
