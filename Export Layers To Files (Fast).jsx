// NAME:
//  Export Layers To Files

// VERSION:
// v1.0.0 (CSV Manifest fork — based on antipalindrome upstream v2.7.1)

// REQUIRES:
//  Adobe Photoshop CS2 or higher

// Most current version always available at: https://github.com/antipalindrome/Photoshop-Export-Layers-to-Files-Fast

// enable double-clicking from Finder/Explorer (CS2 and higher)
#target photoshop

var BATCH_OPERATION = false;

app.bringToFront();

//
// Type definitions
//

var FileNameType = {
    AS_LAYERS: 1,
    INDEX_ASC: 2,
    INDEX_DESC: 3,
    AS_LAYERS_NO_EXT: 4,
    AS_LAYERS_WITH_GROUP: 5,

    values: function() {
        return [this.AS_LAYERS_NO_EXT, this.AS_LAYERS, this.AS_LAYERS_WITH_GROUP, this.INDEX_DESC, this.INDEX_ASC];
    },

    forIndex: function(index) {
        return this.values()[index];
    },

    getIndex: function(value) {
        return indexOf(this.values(), value);
    }
};

var LetterCase = {
    KEEP: 1,
    LOWERCASE: 2,
    UPPERCASE: 3,

    values: function() {
        return [this.KEEP, this.LOWERCASE, this.UPPERCASE];
    },

    forIndex: function(index) {
        return this.values()[index];
    },

    getIndex: function(value) {
        return indexOf(this.values(), value);
    },

    toExtensionType: function(value) {
        switch (value) {

            case this.KEEP:
                return Extension.NONE;

            case this.LOWERCASE:
                return Extension.LOWERCASE;

            case this.UPPERCASE:
                return Extension.UPPERCASE;

            default:
                return Extension.NONE;
        }
    }
};

var TrimPrefType = {
    DONT_TRIM: 1,
    INDIVIDUAL: 2,
    INDIVIDUAL_USE_TRIM: 3,
    COMBINED: 4,

    values: function() {
        return [this.INDIVIDUAL, this.INDIVIDUAL_USE_TRIM, this.COMBINED];
    },

    forIndex: function(index) {
        return this.values()[index];
    },

    getIndex: function(value) {
        return indexOf(this.values(), value);
    }
};

var ExportLayerTarget = {
    ALL_LAYERS: 1,
    SELECTED_LAYERS: 2, // Export selection, leave the rest as is, visibility for parent groups will be forced.

    values: function() {
        return [this.ALL_LAYERS, this.VISIBLE_LAYERS, this.SELECTED_LAYERS];
    },

    forIndex: function(index) {
        return this.values()[index];
    },

    getIndex: function(value) {
        return indexOf(this.values(), value);
    }
};

var Formats = {
    "PNG-24": {
        index: 0,
        fileType: "PNG-24",
        fileExtension: ".png",
        formatArgs: function() {
            var options = new ExportOptionsSaveForWeb();
            options.format = SaveDocumentType.PNG;
            options.PNG8 = false;
            options.interlaced = prefs.png24Interlaced;
            options.matteColor = Matte.values()[prefs.png24Matte];
            options.transparency = prefs.png24Transparency;
            return options;
        }
    },
    "PNG-8": {
        index: 1,
        fileType: "PNG-8",
        fileExtension: ".png",
        formatArgs: function() {
            var colorReductionType = [
                ColorReductionType.PERCEPTUAL,
                ColorReductionType.SELECTIVE,
                ColorReductionType.ADAPTIVE,
                ColorReductionType.RESTRICTIVE,
                null,
                ColorReductionType.BLACKWHITE,
                ColorReductionType.GRAYSCALE,
                ColorReductionType.MACINTOSH,
                ColorReductionType.WINDOWS
            ];
            var ditherType = [
                Dither.NONE,
                Dither.DIFFUSION,
                Dither.PATTERN,
                Dither.NOISE
            ];
  
            var options = new ExportOptionsSaveForWeb();
            options.format = SaveDocumentType.PNG;
            options.PNG8 = true;
            options.colorReduction = colorReductionType[prefs.png8ColorReduction];
            options.colors = parseInt(prefs.png8NumberOfColors, 10);
            options.dither = ditherType[prefs.png8DitherType];
            if (options.dither == Dither.DIFFUSION) {
                options.ditherAmount = prefs.png8DitherValue;
            }
            options.interlaced = prefs.png8Interlaced;
            options.transparency = prefs.png8Transparency;
            options.matteColor = Matte.values()[prefs.png8Matte];
            if (options.transparency) {
                options.transparencyDither = ditherType[prefs.png8TransparencyDitherType];
                if (options.transparencyDither == Dither.DIFFUSION) {
                    options.transparencyAmount = prefs.png8TransparencyDitherValue;
                }
            }
            return options;
        }
    },
    "JPG": {
        index: 2,
        fileType: "JPG",
        fileExtension: ".jpg",
        formatArgs: function() {
            var options = new JPEGSaveOptions();
            var ratio = 12 / 100;
            options.quality = Math.round(prefs.jpgQuality * ratio);
            var matte = [MatteType.WHITE, MatteType.BLACK, MatteType.SEMIGRAY, null, MatteType.BACKGROUND, MatteType.FOREGROUND]
            options.matte = matte[prefs.jpgMatte];
            options.embedColorProfile = prefs.jpgIcc;
            if (prefs.jpgProgressive) {
                options.formatOptions = FormatOptions.PROGRESSIVE;
                options.scans = 3;
            } else if (prefs.jpgOptimized) {
                options.formatOptions = FormatOptions.OPTIMIZEDBASELINE;
            } else {
                options.formatOptions = FormatOptions.STANDARDBASELINE;
            }
            return options;
        }
    },
    "TIFF": {
        index: 3,
        fileType: "TIF",
        fileExtension: ".tif",
        formatArgs: function() {
            var options = new TiffSaveOptions();
            var ratio = 12 / 100;
            options.jpegQuality = Math.round(prefs.tifQuality * ratio);
            var encoding = [TIFFEncoding.NONE, TIFFEncoding.TIFFLZW, TIFFEncoding.TIFFZIP, TIFFEncoding.JPEG];
            options.imageCompression = encoding[prefs.tifEncoding];
            options.alphaChannels = prefs.tifAlphaChannel; 
            options.layers = false; 
            options.embedColorProfile = prefs.tifIcc;
            options.transparency = prefs.tifTransparency; 
            return options;
        }
    },
    "PDF": {
        index: 4,
        fileType: "PDF",
        fileExtension: ".pdf",
        formatArgs: function() {
            var standardType = [
                PDFStandard.NONE,
                PDFStandard.PDFX1A2001,
                PDFStandard.PDFX1A2003,
                PDFStandard.PDFX32002,
                PDFStandard.PDFX32003,
                PDFStandard.PDFX42008
            ];
            var compatibilityType = [
                PDFCompatibility.PDF13,
                PDFCompatibility.PDF14,
                PDFCompatibility.PDF15,
                PDFCompatibility.PDF16,
                PDFCompatibility.PDF17
            ];
            var resampleType = [
                PDFResample.NONE,
                PDFResample.PDFAVERAGE,
                PDFResample.PDFSUBSAMPLE,
                PDFResample.PDFBICUBIC
            ];
            var encodingType = [
                PDFEncoding.NONE,
                PDFEncoding.PDFZIP,
                PDFEncoding.JPEG
            ];
            var destinationProfileList = ["Japan Color 2001 Coated","Japan Color 2001 Uncoated","Japan Color 2002 Newspaper","Japan Color 2003 Web Coated","Japan Web Coated (Ad)","U.S. Sheetfed Coated v2","U.S. Sheetfed Uncoated v2","U.S. Web Coated (SWOP) v2","U.S. Web Uncoated v2","-","sRGB IEC61966-2.1","Adobe RGB (1998)","Apple RGB","ColorMatch RGBimage P3","ProPhoto RGB","Rec.601 NTSC Gamma 2.4","Rec.601 PAL Gamma 2.4","Rec.709 Gamma 2.4"]; 
            
            var options = new PDFSaveOptions();
            options.PDFStandard = standardType[prefs.pdfStandard];
            options.PDFCompatibility = compatibilityType[prefs.pdfCompatibility];
            var ratio = 12 / 100;
            options.jpegQuality = Math.round(prefs.pdfQuality * ratio);           
            options.encoding = encodingType[prefs.pdfEncoding];
            options.alphaChannels = prefs.pdfAlphaChannel;
            options.embedColorProfile = prefs.pdfIcc;        
            options.layers = false;
            options.colorConversion = prefs.pdfColorConversion;
            options.destinationProfile = prefs.pdfColorConversion ? destinationProfileList[prefs.pdfDestinationProfile] : "";
            options.profileInclusionPolicy = false;
            options.downSample = resampleType[prefs.pdfDownSample];
            options.downSampleSize = parseInt(prefs.pdfDownSampleSize, 10);
            options.downSampleSizeLimit = parseInt(prefs.pdfDownSampleSizeLimit, 10);
            options.preserveEditing = false; 
            options.embedThumbnail = false;
            options.optimizeForWeb = true;
            options.view = false;
            options.convertToEightBit = true;           
            return options;
        }
    },
    "TGA": {
        index: 5,
        fileType: "TGA",
        fileExtension: ".tga",
        formatArgs: function() { 
            var options = new TargaSaveOptions();
            options.alphaChannels = prefs.tgaAlphaChannel;
            options.rleCompression = prefs.tgaRleCompression;
            var resolution_enum = [TargaBitsPerPixels.SIXTEEN, TargaBitsPerPixels.TWENTYFOUR, TargaBitsPerPixels.THIRTYTWO];
            options.resolution = resolution_enum[prefs.tgaDepth];
            return options;
        }
    },
    "BMP": {
        index: 6,
        fileType: "BMP",
        fileExtension: ".bmp",
        formatArgs: function() { 
            var options = new BMPSaveOptions();
            options.osType = OperatingSystem.WINDOWS;
            options.alphaChannels = prefs.bmpAlphaChannel;
            options.rleCompression = prefs.bmpRleCompression;
            options.flipRowOrder = prefs.bmpFlipRowOrder;
            var resolution_enum = [
                BMPDepthType.TWENTYFOUR,
                BMPDepthType.THIRTYTWO,
                BMPDepthType.BMP_R5G6B5,
                BMPDepthType.BMP_A1R5G5B5,
                BMPDepthType.BMP_A4R4G4B4
            ];
            options.depth = resolution_enum[prefs.bmpDepth];
            return options;
        }
    },
    "PSD": {
        index: 7,
        fileType: "PSD",
        fileExtension: ".psd", 
        formatArgs: function() {
            var options = new PhotoshopSaveOptions();
            options.layers = false;
            return options;
        }
    }
}   

var Matte = {
    white: function() {
        var WHITE = new RGBColor();
        WHITE.red = 255;
        WHITE.green = 255;
        WHITE.blue = 255;
        return WHITE;
    },
    black: function() {
        var BLACK = new RGBColor();
        BLACK.red = 0;
        BLACK.green = 0;
        BLACK.blue = 0;
        return BLACK;
    },
    gray: function() {
        var GRAY = new RGBColor();
        GRAY.red = 127;
        GRAY.green = 127;
        GRAY.blue = 127;
        return GRAY;
    },
    values: function() {
        return [this.white(), this.black(), this.gray(), null, app.backgroundColor.rgb, app.foregroundColor.rgb];
    }
}

// Settings

var USER_SETTINGS_ID = "exportLayersToFilesCustomDefaultSettings";
var DEFAULT_SETTINGS = {
    // common
    bmpAlphaChannel: app.stringIDToTypeID("bmpAlphaChannel"),
    bmpDepth: app.stringIDToTypeID("bmpDepth"),
    bmpFlipRowOrder: app.stringIDToTypeID("bmpFlipRowOrder"),
    bmpRleCompression: app.stringIDToTypeID("bmpRleCompression"),
    delimiter: app.stringIDToTypeID("delimiter"),
    destination: app.stringIDToTypeID("destFolder"),
    exportBackground: app.stringIDToTypeID("exportBackground"),
    exportForeground: app.stringIDToTypeID("exportForeground"),
    exportLayerTarget: app.stringIDToTypeID("exportLayerTarget"),
    fileType: app.stringIDToTypeID("fileType"),
    groupsAsFolders: app.stringIDToTypeID("groupsAsFolders"),
    ignoreLayers: app.stringIDToTypeID('ignoreLayers'),
    ignoreLayersString: app.stringIDToTypeID('ignoreLayersString'),
    jpgQuality: app.stringIDToTypeID('jpgQuality'),
    jpgMatte: app.stringIDToTypeID('jpgMatte'),
    jpgIcc: app.stringIDToTypeID('jpgIcc'),
    jpgOptimized: app.stringIDToTypeID('jpgOptimized'),
    jpgProgressive: app.stringIDToTypeID('jpgProgressive'),
    tifQuality: app.stringIDToTypeID('tifQuality'),
    tifEncoding: app.stringIDToTypeID('tifEncoding'),
    tifAlphaChannel: app.stringIDToTypeID("tifAlphaChannel"),
    tifIcc: app.stringIDToTypeID('tifIcc'),
    tifTransparency: app.stringIDToTypeID('tifTransparency'),
    pdfStandard: app.stringIDToTypeID('pdfStandard'),
    pdfCompatibility: app.stringIDToTypeID('pdfCompatibility'),
    pdfQuality: app.stringIDToTypeID('pdfQuality'),
    pdfEncoding: app.stringIDToTypeID('pdfEncoding'),
    pdfAlphaChannel: app.stringIDToTypeID("pdfAlphaChannel"),
    pdfIcc: app.stringIDToTypeID('pdfIcc'),
    pdfColorConversion: app.stringIDToTypeID('pdfColorConversion'),
    pdfDestinationProfile: app.stringIDToTypeID('pdfDestinationProfile'),
    pdfDownSample: app.stringIDToTypeID('pdfDownSample'),
    pdfDownSampleSize: app.stringIDToTypeID('pdfDownSampleSize'),
    pdfDownSampleSizeLimit: app.stringIDToTypeID('pdfDownSampleSizeLimit'),
    letterCase: app.stringIDToTypeID("letterCase"),
    nameFiles: app.stringIDToTypeID("nameFiles"),
    outputPrefix: app.stringIDToTypeID("outputPrefix"),
    outputSuffix: app.stringIDToTypeID("outputSuffix"),
    overwrite: app.stringIDToTypeID("overwrite"),
    padding: app.stringIDToTypeID("padding"),
    paddingValue: app.stringIDToTypeID("paddingValue"),
    png8ColorReduction: app.stringIDToTypeID("png8ColorReduction"),
    png8NumberOfColors: app.stringIDToTypeID("png8NumberOfColors"),
    png8DitherType: app.stringIDToTypeID("png8DitherType"),
    png8DitherValue: app.stringIDToTypeID("png8DitherValue"),
    png8Matte: app.stringIDToTypeID("png8Matte"),
    png8Transparency: app.stringIDToTypeID("png8Transparency"),
    png8TransparencyDitherType: app.stringIDToTypeID("png8TransparencyDitherType"),
    png8TransparencyDitherValue: app.stringIDToTypeID("png8TransparencyDitherValue"),
    png8Interlaced: app.stringIDToTypeID("png8Interlaced"),
    png24Interlaced: app.stringIDToTypeID('png24Interlaced'),
    png24Matte: app.stringIDToTypeID('png24Matte'),
    png24Transparency: app.stringIDToTypeID('png24Transparency'),
    scale: app.stringIDToTypeID("scale"),
    scaleValue: app.stringIDToTypeID("scaleValue"),
    silent: app.stringIDToTypeID("silent"),
    tgaAlphaChannel: app.stringIDToTypeID("tgaAlphaChannel"),
    tgaDepth: app.stringIDToTypeID("tgaDepth"),
    tgaRleCompression: app.stringIDToTypeID("tgaRleCompression"),
    topGroupAsFolder: app.stringIDToTypeID("topGroupAsFolder"),
    trim: app.stringIDToTypeID("trim"),
    trimValue: app.stringIDToTypeID("trimValue"),
    useDelimiter: app.stringIDToTypeID("useDelimiter"),
    visibleOnly: app.stringIDToTypeID('visibleOnly'),
};

//
// Global variables
//

var env = new Object();
env.profiling = false;

var prefs = new Object();
var userCancelled = false;
var layers;
var visibleLayers;
var selectedLayers;
var groups;
var layerCount = 0;
var visibleLayerCount = 0;
var selectedLayerCount = 0;
var csvManifestData = [];
// Top-level scope entries parsed from a leading "scope:" line in the CSV (may be empty).
var csvScopes = [];
// Set by the Manifest panel checkbox while the dialog is open.
var csvManifestDebugEnabled = false;

// =====================================================================
// UI Visibility Toggles — flip these to show/hide controls in the dialog
// =====================================================================
// When true: single visible CSV panel, legacy controls in a hidden group, native window close, no footer.
var CSV_FOCUSED_UI = true;
// When true: same as checking "Write CSV debug log" in the dialog (no UI needed for devs).
var DEBUG_CSV_MANIFEST = false;
// Dev-only: when true, the CSV run resolves + reports every row/scope and writes NOTHING.
var DRY_RUN = false;
// When true: show the "Visible Only" checkbox in the bottom action area.
var SHOW_VISIBLE_ONLY = true;
// When true: show the "Write CSV debug log" checkbox in the Manifest panel.
var SHOW_CSV_DEBUG_CHECKBOX = false;

// Upper bound when disambiguating colliding file/folder names with -001, -002, ...
var MAX_COLLISION_ATTEMPTS = 100;

//
// Entry point
//

bootstrap();

//
// Processing logic
//

function main() {
    // user preferences
    prefs = new Object();
    prefs = getSettings();

    userCancelled = false;

    // create progress bar
    var progressBarWindow = createProgressBar();
    if (!progressBarWindow) {
        return "cancel";
    }

    // count layers
    var profiler = new Profiler(env.profiling);
    var layerCountResult = countLayers(progressBarWindow);
    if (userCancelled) {
        return "cancel";
    }
    layerCount = layerCountResult.layerCount;
    visibleLayerCount = layerCountResult.visibleLayerCount;
    selectedLayerCount = layerCountResult.selectedLayerCount;
    var countDuration = profiler.getDuration(true, true);
    if (env.profiling) {
        alert("Layers counted in " + profiler.format(countDuration), "Debug info");
    }

    // show dialog
    if (BATCH_OPERATION || showDialog() === 1) {
        if(BATCH_OPERATION) {
            finalizeSettingsPrerun();
        }
        prefs.documentName = app.activeDocument.name.split('.')[0];
        var savedDialogMode = app.displayDialogs;
        app.displayDialogs = DialogModes.NO;

        // CSV Manifest mode (explicit addressing): auto-save the original, then do ALL
        // work on a duplicate. Bypasses the positional collect/export path entirely.
        if (prefs.csvEnabled && csvManifestData && csvManifestData.length > 0) {
            autoSaveSourceSilently();
            env.sourceDoc = app.activeDocument; // for the destructive-op guard below
            var csvProfiler = new Profiler(true);
            csvProfiler.resetLastTime();
            env.documentCopy = app.activeDocument.duplicate();
            var dupMs = csvProfiler.getDuration(true, true).getTime();
            runCsvManifest(prefs.silent ? null : progressBarWindow, csvProfiler, dupMs);
            app.activeDocument.close(SaveOptions.DONOTSAVECHANGES);
            env.documentCopy = null;
            app.displayDialogs = savedDialogMode;
            return;
        }

        env.documentCopy = app.activeDocument.duplicate();

        // collect layers
        profiler.resetLastTime();
        var collected = collectLayers(progressBarWindow);
        if (userCancelled) {
            alert("Export cancelled! No files saved.", "Finished", false);
            return "cancel";
        }
        layers = collected.layers;
        visibleLayers = collected.visibleLayers;
        selectedLayers = collected.selectedLayers;
        groups = collected.groups;
        var collectionDuration = profiler.getDuration(true, true);
        if (env.profiling) {
            alert("Layers collected in " + profiler.format(collectionDuration), "Debug info");
        }

        // create unique folders

        var foldersOk = !prefs.groupsAsFolders;
        if (prefs.groupsAsFolders) {
            foldersOk = createUniqueFolders(prefs.exportLayerTarget);
            if (foldersOk !== true) {
                alert(foldersOk + " Not exporting layers.", "Failed", true);
            }
        }

        // export
        if (foldersOk === true) {
            profiler.resetLastTime();

            var count = exportLayers(prefs.exportLayerTarget, prefs.silent ? null : progressBarWindow);
            var exportDuration = profiler.getDuration(true, true);

            var message = "";
            if (userCancelled) {
                message += "Export cancelled!\n\n";
            }
            message += "Saved " + count.count + " files.";
            if (env.profiling) {
                message += "\n\nExport function took " + profiler.format(collectionDuration) + " + " + profiler.format(exportDuration) + " to perform.";
            }
            if (count.error) {
                message += "\n\nSome layers failed to export! (Are there many layers with the same name?)";
            }
            if(!prefs.silent && !BATCH_OPERATION) {
                alert(message, "Finished", count.error);
            }
        }

        app.activeDocument.close(SaveOptions.DONOTSAVECHANGES);
        env.documentCopy = null;
        app.displayDialogs = savedDialogMode;
    } else {
        return "cancel";
    }
}

// Silently persist the source document before duplicating, so the run starts from a
// clean saved state (spec §6.1). A never-saved document (no file path) is left alone --
// there is no prior state to preserve and we must not pop a Save As dialog. A save
// failure never aborts the export (the duplicate still captures current pixels).
function autoSaveSourceSilently() {
    try {
        var doc = app.activeDocument;
        var hasPath = false;
        try { hasPath = (doc.path != null); } catch (eP) { hasPath = false; }
        if (hasPath) { doc.save(); }
    } catch (e) { /* best-effort */ }
}

function exportLayers(exportLayerTarget, progressBarWindow) {
    var retVal = {
        count: 0,
        error: false
    };
    var doc = app.activeDocument;

    // Select a subset of layers to export.

    var layerCount = layers.length;
    var layersToExport;


    switch (exportLayerTarget) {
        case ExportLayerTarget.ALL_LAYERS:
            layersToExport = layers;
            break;

        case ExportLayerTarget.SELECTED_LAYERS:
            layersToExport = selectedLayers;
            // Bg layer is redundant since everything else outside the selection is essentially a background/foreground.
            prefs.exportBackground = false;
            prefs.exportForeground = false;
            break;

        default:
            layersToExport = layers;
            break;
    }

    var count = prefs.exportBackground ? layersToExport.length - 1 : layersToExport.length;

    if (count < 1) {
        return retVal;
    }

    // Export.

    if ((layerCount == 1) && (layers[0].layer.isBackgroundLayer || prefs.exportForeground)) {
        // Flattened images don't support LayerComps or visibility toggling, so export it directly.

        storeHistory();

        if (prefs.scale)
            scaleImage();

        if (prefs.padding)
            addPadding();

        if (saveImage(layers[0].layer.name)) {
            ++retVal.count;
        } else {
            retVal.error = true;
        }

        restoreHistory();

    } else {
        // Single trim of all layers combined.
        if (prefs.trimValue == TrimPrefType.COMBINED) {
            var UPDATE_NUM = 20;
            if (progressBarWindow) {
                var stepCount = (exportLayerTarget == ExportLayerTarget.ALL_LAYERS) ? count / UPDATE_NUM + 1 : 1;
                showProgressBar(progressBarWindow, "Trimming...", stepCount);
            }

            if (exportLayerTarget == ExportLayerTarget.ALL_LAYERS) {
                // For combined trim across all layers, make all layers visible.
                for (var i = 0; i < count; ++i) {
                    makeVisible(layersToExport[i]);

                    if (progressBarWindow && (i % UPDATE_NUM == 0)) {
                        updateProgressBar(progressBarWindow);
                        repaintProgressBar(progressBarWindow);
                        if (userCancelled) {
                            progressBarWindow.hide();
                            return retVal;
                        }
                    }
                }
            }

            doc.trim(TrimType.TRANSPARENT);
        }

        if (progressBarWindow) {
            showProgressBar(progressBarWindow, "Exporting 1 of " + count + "...", count);
        }

        // Turn off all layers when exporting all layers - even seemingly invisible ones.
        // When visibility is switched, the parent group becomes visible and a previously invisible child may become visible by accident.
        for (var i = 0; i < count; ++i) {
            makeInvisible(layersToExport[i]);
        }

        if (prefs.exportBackground) {
            makeVisible(layersToExport[count]);
        }

        if (prefs.exportForeground) {
            makeVisible(layersToExport[0]);
        }

        var countDigits = 0;
        if (prefs.nameFiles != FileNameType.AS_LAYERS) {
            countDigits = ("" + count).length;
        }

        // export layers
        for (var i = (prefs.exportForeground ? 1 : 0); i < count; ++i) {
            var layer = layersToExport[i].layer;

            // Ignore layers that are prefixed with ignoreLayersString
            if (isIgnoredLayer(layer)) continue;

            var fileName;
            switch (prefs.nameFiles) {

                case FileNameType.AS_LAYERS_NO_EXT:
                    fileName = makeFileNameFromLayerName(layersToExport[i], true, false, count - i);
                    break;

                case FileNameType.AS_LAYERS:
                    fileName = makeFileNameFromLayerName(layersToExport[i], false, false, count - i);
                    break;

                case FileNameType.AS_LAYERS_WITH_GROUP:
                    fileName = makeFileNameFromLayerName(layersToExport[i], false, true, count - i);
                    break;

                case FileNameType.INDEX_ASC:
                    fileName = makeFileNameFromIndex(count - i, countDigits, layersToExport[i]);
                    break;

                case FileNameType.INDEX_DESC:
                    fileName = makeFileNameFromIndex(i + 1, countDigits, layersToExport[i]);
                    break;
            }

            if (fileName) {
                if ((prefs.trimValue != TrimPrefType.INDIVIDUAL) || ((layer.bounds[0] < layer.bounds[2]) && ((layer.bounds[1] < layer.bounds[3])))) { // skip empty layers when trimming

                    storeHistory();

                    makeVisible(layersToExport[i]);

                    if (prefs.trimValue == TrimPrefType.INDIVIDUAL) {
                        try {
                            doc.crop(layer.bounds);
                        } catch (e) {
                            // Crop can fail on empty layers; exporting uncropped is the fallback.
                        }
                    }
                    if (prefs.trimValue == TrimPrefType.INDIVIDUAL_USE_TRIM) {
                        doc.trim(TrimType.TRANSPARENT);
                    }

                    var folderSafe = true;
                    if (prefs.groupsAsFolders) {
                        var parentFolder = (new File(fileName)).parent;
                        folderSafe = createFolder(parentFolder);
                        retVal.error = (retVal.error || !folderSafe);
                    }

                    if (folderSafe) {

                        if (prefs.scale)
                            scaleImage();

                        if (prefs.padding)
                            addPadding();

                        if (saveImage(fileName)) {
                            ++retVal.count;
                        } else {
                            retVal.error = true;
                        }
                    }

                    if (prefs.trimValue == TrimPrefType.INDIVIDUAL || folderSafe) {
                        restoreHistory()
                    }

                    layer.visible = false;
                }
            } else {
                retVal.error = true;
            }

            if (progressBarWindow) {
                updateProgressBar(progressBarWindow, "Exporting " + (i + 1) + " of " + count + "...");
                repaintProgressBar(progressBarWindow);
                if (userCancelled) {
                    break;
                }
            }
        }

        if (progressBarWindow) {
            progressBarWindow.hide();
        }
    }

    return retVal;
}

// Hide every layer in the document (depth-first). Always pass a freshly queried
// `app.activeDocument.layers` so the references are valid even right after a
// merge()+history revert (which leaves the merged group's own references stale).
function hideAllLayersDeep(layerColl) {
    for (var i = 0; i < layerColl.length; i++) {
        var lyr = layerColl[i];
        try { lyr.visible = false; } catch (e) { /* background may resist */ }
        if (lyr.typename === "LayerSet") { hideAllLayersDeep(lyr.layers); }
    }
}

// Force a LayerSet and everything under it visible. A flatten row means "export this whole
// folder" (named means wanted), so every descendant is shown -- including ones the author
// toggled off -- otherwise merge() would run on hidden content and yield an empty result.
// Transparency is preserved separately by neutralizing the opaque Background layer, not by
// hiding content here.
function showLayerSetTree(ls) {
    ls.visible = true;
    for (var i = 0; i < ls.layers.length; i++) {
        var lyr = ls.layers[i];
        lyr.visible = true;
        if (lyr.typename === "LayerSet") { showLayerSetTree(lyr); }
    }
}

// A true Background layer is opaque and cannot be hidden, so it would composite into every
// saved image (turning transparent exports opaque). Convert it to a normal layer on the
// duplicate so isolation can hide it. Safe: only the duplicate is ever touched.
function neutralizeBackgroundLayer() {
    try {
        var bg = app.activeDocument.backgroundLayer; // throws if there is none
        if (bg) { bg.isBackgroundLayer = false; }
    } catch (e) { /* no background layer */ }
}

// Apply a row's W/H/Mode to the current (already-cropped) document.
//   - Empty/0 Width or Height -> leave at natural size (checked BEFORE mode, so a
//     canvas-mode row with no dimensions never tries to center on a 0x0 canvas).
//   - fit    -> scale into (W - 2*pad) x (H - 2*pad), then exact W x H canvas.
//   - canvas -> exact W x H canvas only (original px, overflow cropped; pad ignored).
function applyCsvSizing(row) {
    if (!(row.width > 0 && row.height > 0)) { return; }
    if (row.mode === "canvas") {
        setCanvasToExactSize(row.width, row.height);
    } else {
        resizeImageToFit(row.width, row.height, row.padding);
        setCanvasToExactSize(row.width, row.height);
    }
}

// Normalize a row's Filename into { folders, safeName } where `folders` is the relative
// output sub-path (scope folder + any "subfolder/" embedded in the Filename) and
// `safeName` is the sanitized base name (extension stripped). Pure: no disk side effects,
// so the validation pass can derive a stable collision key from the same logic the export
// uses to build the actual file.
function csvOutputParts(filenameField, scopeName) {
    var rawName = filenameField;
    var subPath = "";
    var slashIdx = rawName.lastIndexOf("/");
    if (slashIdx >= 0) {
        subPath = rawName.substring(0, slashIdx + 1);
        rawName = rawName.substring(slashIdx + 1);
    }
    var folders = "";
    if (scopeName && scopeName.length > 0) {
        folders += makeValidFileName(scopeName, prefs.useDelimiter) + "/";
    }
    if (subPath.length > 0) {
        var segs = subPath.split("/");
        for (var i = 0; i < segs.length; i++) {
            var seg = csvTrim(segs[i]);
            if (seg.length > 0) { folders += makeValidFileName(seg, prefs.useDelimiter) + "/"; }
        }
    }
    var safeName = makeValidFileName(rawName, prefs.useDelimiter);
    var dotIdx = safeName.lastIndexOf(".");
    if (dotIdx > 0) { safeName = safeName.substring(0, dotIdx); }
    if (safeName.length === 0) { safeName = "untitled"; }
    return { folders: folders, safeName: safeName };
}

// Lower-cased collision key for a row's resolved output (filesystem is case-insensitive
// on macOS/Windows). Two rows with the same key write the same file in the same folder.
function csvOutputKey(filenameField, scopeName) {
    var parts = csvOutputParts(filenameField, scopeName);
    return (parts.folders + "/" + parts.safeName).toLowerCase();
}

// Resolve a row's Filename to an output File within its scope folder, creating any
// intermediate folders. Returns { file: File|null, error: string|null }.
function csvOutputFile(filenameField, scopeName, ext) {
    var parts = csvOutputParts(filenameField, scopeName);
    var basePath = prefs.destination + "/" + parts.folders + parts.safeName;
    if (parts.folders.length > 0) {
        var parentFolder = (new File(basePath + ext)).parent;
        if (!createFolder(parentFolder)) {
            return { file: null, error: "could not create folder \"" + parts.folders + "\"" };
        }
    }
    return { file: makeUniqueFileHandle(basePath, ext), error: null };
}

// Export one resolved ArtLayer row: isolate the layer (force it AND every ancestor group
// visible, regardless of stored visibility), crop to its bounds, size per the row, save.
// Wrapped in store/restore history so the crop/resize are undone; visibility is reset by
// the leading and trailing hideAllLayersDeep (restoreHistory does NOT undo visibility).
function exportSingleLayer(layer, row, scopeName, retVal, failures, warnings, ext) {
    var label = row.path;
    storeHistory();
    try {
        hideAllLayersDeep(app.activeDocument.layers);
        layer.visible = true;
        var anc = layer.parent;
        while (anc && anc.typename === "LayerSet") { anc.visible = true; anc = anc.parent; }

        var b = layer.bounds;
        if (!((b[0] < b[2]) && (b[1] < b[3]))) {
            warnings.push("\"" + label + "\": layer has no pixels -- skipped");
            return;
        }
        try { app.activeDocument.crop(layer.bounds); } catch (eCrop) { }

        applyCsvSizing(row);

        var out = csvOutputFile(row.filename, scopeName, ext);
        if (out.error) {
            failures.push("\"" + label + "\": " + out.error);
            retVal.error = true;
        } else if (saveImage(out.file)) {
            ++retVal.count;
        } else {
            failures.push("\"" + label + "\": failed to save \"" + out.file.name + "\"");
            retVal.error = true;
        }
    } catch (e) {
        failures.push("\"" + label + "\": " + e.message);
        retVal.error = true;
    } finally {
        restoreHistory();
        try { hideAllLayersDeep(app.activeDocument.layers); } catch (eHide) { }
    }
}

// Export one resolved LayerSet row as a single flattened image: isolate the group (hide
// all, re-show the whole group + ancestors), crop to the group's content bounds, size, save.
// Flattening is done by saveImage's composite (not merge(), which bakes a black Pass-Through
// backdrop), so transparency is preserved exactly like a layer row. restoreHistory undoes
// the crop; the leading/trailing hide reset visibility. The caller re-resolves `ls` fresh per
// row because the crop+undo leaves refs stale.
function exportFlattenedFolder(ls, row, scopeName, retVal, failures, warnings, ext) {
    var label = row.path;
    var wasHidden = false;
    try { wasHidden = !ls.visible; } catch (eVis) { }
    storeHistory();
    try {
        // Isolate the group: hide every layer in the doc, then re-show the target group AND
        // all its descendants (so the composite has content) and force its ancestors visible. The
        // opaque Background was already demoted to a normal layer (neutralizeBackgroundLayer)
        // so this hide actually hides it -- that is what keeps the flattened output transparent.
        hideAllLayersDeep(app.activeDocument.layers);
        showLayerSetTree(ls);
        var anc = ls.parent;
        while (anc && anc.typename === "LayerSet") { anc.visible = true; anc = anc.parent; }

        // Do NOT merge() the group: merging a Pass Through group (the default blend mode)
        // bakes a black backdrop into the result. saveImage already flattens the visible
        // composite into one image, so we just isolate the group (everything else hidden),
        // crop to the group's content bounds, and save -- identical to the transparent
        // single-layer path, which also relies on saveImage's composite rather than merging.
        var b = ls.bounds;
        if (!((b[0] < b[2]) && (b[1] < b[3]))) {
            warnings.push("\"" + label + "\": flattened group has no pixels -- skipped");
            return;
        }
        try { app.activeDocument.crop(ls.bounds); } catch (eCrop) { }

        applyCsvSizing(row);

        var out = csvOutputFile(row.filename, scopeName, ext);
        if (out.error) {
            failures.push("\"" + label + "\": " + out.error);
            retVal.error = true;
        } else if (saveImage(out.file)) {
            ++retVal.count;
            if (wasHidden) {
                warnings.push("\"" + label + "\": flattened a HIDDEN group (forced visible to export)");
            }
        } else {
            failures.push("\"" + label + "\": failed to save \"" + out.file.name + "\"");
            retVal.error = true;
        }
    } catch (e) {
        failures.push("\"" + label + "\": " + e.message);
        retVal.error = true;
    } finally {
        restoreHistory();
        // Reset to an all-hidden base with freshly queried refs so the next row isn't
        // contaminated by this group's left-over visibility (restoreHistory doesn't undo it).
        try { hideAllLayersDeep(app.activeDocument.layers); } catch (eHide) { }
    }
}

// Orchestrate a CSV manifest export on the duplicate document. Runs entirely on the
// duplicate (env.documentCopy); the original is never touched. Flow (spec §6):
//   1. guard that we are on the duplicate, and that there is something to export;
//   2. resolve scope roots to refs (by stable id) BEFORE pruning, then prune the
//      duplicate's top-level groups not in scope;
//   3. validation pass: resolve every row up front, collecting unresolved rows, bad
//      scopes, and duplicate-filename collisions (no pixels checked here -- that needs a
//      destructive merge, so it is deferred to the export pass);
//   4. export pass: re-resolve each row live (refs go stale after merge()+undo) and
//      dispatch to exportSingleLayer / exportFlattenedFolder, each scope into OUT/<scope>/;
//   5. summary (bad scopes first/loud) with always-on duplicate + export timing;
//   6. open the output folder.
// `profiler` is an enabled Profiler; `dupDurationMs` is the duplicate() time captured by
// the caller. Returns the saved-file count.
function runCsvManifest(progressBarWindow, profiler, dupDurationMs) {
    var savedDialogMode = app.displayDialogs;
    app.displayDialogs = DialogModes.NO;
    var ext = prefs.fileExtension;

    var retVal = { count: 0, error: false };
    var failures = [];   // hard errors (save/folder failures)
    var warnings = [];   // non-fatal (unresolved rows, collisions, empty, hidden flatten)
    var badScopes = [];  // scope entries that did not resolve to a top-level group

    // Defensive: every destructive op below must run on the duplicate, never the source.
    // Two genuinely different Document objects compare unequal reliably, so this catches a
    // failed/absent duplicate (where the active doc would still be the original).
    if (!env.documentCopy || (env.sourceDoc && app.activeDocument === env.sourceDoc)) {
        alert("Internal error: CSV export is not running on the document duplicate. Aborting to protect your file.", "CSV Export", true);
        app.displayDialogs = savedDialogMode;
        return 0;
    }

    // Empty / all-comment manifest -> nothing to export (don't crash the prune/validate).
    if (!csvManifestData || csvManifestData.length === 0) {
        alert("Nothing to export: the CSV manifest has no rows.", "CSV Export", false);
        app.displayDialogs = savedDialogMode;
        return 0;
    }

    // An opaque Background layer can't be hidden and would composite into every export
    // (single layer AND flattened folder), so demote it to a normal layer on the duplicate.
    neutralizeBackgroundLayer();

    // --- Build export jobs: { scopeName, rootId } (rootId null => document root) ---
    var jobs = [];
    if (csvScopes && csvScopes.length > 0) {
        // Resolve scope roots to references (and read their stable ids) BEFORE pruning --
        // an index re-lookup after prune would be wrong, but an id re-lookup stays valid.
        var keepIds = [];
        var scopeRootById = []; // parallel to csvScopes: the id, or null if unresolved
        for (var s = 0; s < csvScopes.length; s++) {
            var resolved = resolveCsvPath(csvScopes[s], app.activeDocument);
            // A scope must be a TOP-LEVEL group: its parent is the document. A nested group
            // would make the prune (by top-level id) delete its own ancestor -- reject it.
            var isTopLevelGroup = resolved && resolved.typename === "LayerSet" &&
                resolved.parent && resolved.parent.typename === "Document";
            if (!isTopLevelGroup) {
                badScopes.push(csvScopes[s]);
                scopeRootById.push(null);
            } else {
                scopeRootById.push(resolved.id);
                keepIds.push(resolved.id);
            }
        }
        // Prune: remove top-level groups whose id is not a scope root. Snapshot the live
        // collection first -- removing from it while iterating shifts indices.
        var topSets = [];
        for (var ti = 0; ti < app.activeDocument.layerSets.length; ti++) {
            topSets.push(app.activeDocument.layerSets[ti]);
        }
        for (var di = 0; di < topSets.length; di++) {
            var setId = topSets[di].id;
            var inScope = false;
            for (var ki = 0; ki < keepIds.length; ki++) {
                if (keepIds[ki] === setId) { inScope = true; break; }
            }
            if (!inScope) {
                try { topSets[di].remove(); } catch (eRem) { }
            }
        }
        for (var sj = 0; sj < csvScopes.length; sj++) {
            if (scopeRootById[sj] !== null) {
                jobs.push({ scopeName: csvScopes[sj], rootId: scopeRootById[sj] });
            }
        }
    } else {
        jobs.push({ scopeName: "", rootId: null });
    }

    // --- Validation pass: resolve every row, collect failures + collisions ---
    // Returns the live root container for a job (re-found by id so it survives sibling
    // pruning and per-row merge()+undo).
    function jobRoot(job) {
        if (job.rootId === null) { return app.activeDocument; }
        return findTopLevelSetById(job.rootId);
    }

    var unresolvedRows = [];   // human-readable "scope:path" strings
    var collisions = [];       // "scope:path overwrites earlier <name>" strings
    var seenKeys = {};         // collision key -> first "scope:path" that claimed it
    var resolvableCount = 0;
    for (var jv = 0; jv < jobs.length; jv++) {
        var jobV = jobs[jv];
        var rootV = jobRoot(jobV);
        var scopeLabel = jobV.scopeName.length ? (jobV.scopeName + " / ") : "";
        for (var rv = 0; rv < csvManifestData.length; rv++) {
            var rowV = csvManifestData[rv];
            var hit = rootV ? resolveCsvPath(rowV.path, rootV) : null;
            if (!hit) {
                unresolvedRows.push(scopeLabel + rowV.path);
                continue;
            }
            resolvableCount++;
            var key = csvOutputKey(rowV.filename, jobV.scopeName);
            if (seenKeys[key]) {
                collisions.push(scopeLabel + rowV.path + " -> \"" + rowV.filename + "\" overwrites " + seenKeys[key]);
            } else {
                seenKeys[key] = scopeLabel + rowV.path;
            }
        }
    }
    // Validation refs are intentionally discarded here; the export pass re-resolves live.

    // Dev dry-run, or nothing resolves at all: report and write nothing.
    if (DRY_RUN || resolvableCount === 0) {
        app.displayDialogs = savedDialogMode;
        var head = DRY_RUN ? "DRY RUN (no files written)." :
            "Nothing to export: no CSV row resolved to a layer or folder.";
        showCsvSummary(head, 0, failures, warnings, badScopes, unresolvedRows, collisions,
            dupDurationMs, profiler.format(profiler.getDuration(true, true)));
        return 0;
    }

    // --- Export pass: re-resolve each row live and dispatch ---
    if (progressBarWindow) {
        showProgressBar(progressBarWindow, "Exporting (CSV Manifest)...", jobs.length * csvManifestData.length);
    }
    var done = 0;
    try {
        for (var je = 0; je < jobs.length && !userCancelled; je++) {
            var job = jobs[je];
            for (var re = 0; re < csvManifestData.length; re++) {
                var row = csvManifestData[re];
                var root = jobRoot(job);
                var target = root ? resolveCsvPath(row.path, root) : null;
                if (target) {
                    if (target.typename === "LayerSet") {
                        exportFlattenedFolder(target, row, job.scopeName, retVal, failures, warnings, ext);
                    } else {
                        exportSingleLayer(target, row, job.scopeName, retVal, failures, warnings, ext);
                    }
                }
                done++;
                if (progressBarWindow) {
                    updateProgressBar(progressBarWindow, "Exporting " + done + " of " + (jobs.length * csvManifestData.length) + "...");
                    repaintProgressBar(progressBarWindow);
                    if (userCancelled) { break; }
                }
            }
        }
    } finally {
        app.displayDialogs = savedDialogMode;
        if (progressBarWindow) { progressBarWindow.hide(); }
    }

    var exportDuration = profiler.format(profiler.getDuration(true, true));
    var head = "Saved " + retVal.count + " file(s)." + (userCancelled ? "  (cancelled early)" : "");
    showCsvSummary(head, retVal.count, failures, warnings, badScopes, unresolvedRows, collisions,
        dupDurationMs, exportDuration);

    // Open the output folder when done.
    try { (new Folder(prefs.destination)).execute(); } catch (eOpen) { }

    return retVal.count;
}

// Build and show the end-of-run CSV summary. Bad scopes are surfaced first and loud
// (a bad scope silently drops a whole branch the user intended to export). Timing is
// always included so duplicate() vs export cost can be compared later.
function showCsvSummary(headline, count, failures, warnings, badScopes, unresolvedRows, collisions, dupDurationMs, exportDurationStr) {
    var maxPer = 10;
    function section(title, items) {
        if (!items || items.length === 0) { return ""; }
        var shown = items.slice(0, maxPer).join("\n  ");
        var more = items.length > maxPer ? ("\n  ...and " + (items.length - maxPer) + " more") : "";
        return "\n\n" + title + " (" + items.length + "):\n  " + shown + more;
    }
    var msg = headline;
    msg += section("** BAD SCOPE — whole branch skipped **", badScopes);
    msg += section("Unresolved rows (skipped)", unresolvedRows);
    msg += section("Errors", failures);
    msg += section("Duplicate-name overwrites", collisions);
    msg += section("Warnings", warnings);
    msg += "\n\nTiming:  duplicate " + formatMs(dupDurationMs) + "   +   export " + exportDurationStr;
    var isError = (failures.length > 0) || (badScopes.length > 0);
    alert(msg, "CSV Export Summary", isError);
}

// Format a millisecond duration as the same HH:MM:SS.mmm shape the Profiler uses.
function formatMs(ms) {
    if (ms === null || typeof ms === "undefined") { return "n/a"; }
    var d = new Date(ms);
    return padder(d.getUTCHours(), 2) + ":" + padder(d.getUTCMinutes(), 2) + ":" +
        padder(d.getUTCSeconds(), 2) + "." + padder(d.getUTCMilliseconds(), 3);
}

// Returns a File handle for basePath+ext; when the file already exists and
// overwriting is off, appends -001, -002, ... until a free name is found.
function makeUniqueFileHandle(basePath, ext) {
    var handle = new File(basePath + ext);
    if (!handle.exists || prefs.overwrite) {
        return handle;
    }
    for (var n = 1; n <= MAX_COLLISION_ATTEMPTS; n++) {
        handle = new File(basePath + "-" + padder(n, 3) + ext);
        if (!handle.exists) {
            return handle;
        }
    }
    return new File(basePath + ext);
}

function isIgnoredLayer(layer) {
    return prefs.ignoreLayers
        && prefs.ignoreLayersString.length > 0
        && layer.name.indexOf(prefs.ignoreLayersString) === 0;
}

function scaleImage() {
    var width = app.activeDocument.width.as("px") * (prefs.scaleValue / 100);
    app.activeDocument.resizeImage(UnitValue(width, "px"), null, null, ResampleMethod.BICUBICSHARPER);
}

function addPadding() {
    oldH = app.activeDocument.height.as("px");
    oldW = app.activeDocument.width.as("px");

    var width = (app.activeDocument.width.as("px")) + (prefs.paddingValue * 2);
    var height = (app.activeDocument.height.as("px")) + (prefs.paddingValue * 2);
    var widthUnit = new UnitValue(width + " pixels");
    var heightUnit = new UnitValue(height + " pixels");

    app.activeDocument.resizeCanvas(widthUnit, heightUnit, AnchorPosition.MIDDLECENTER);
}

// =====================
// CSV Manifest helpers
// =====================

// Resolve a slash-separated CSV path to a live ArtLayer or LayerSet (or null), read
// top-down from rootContainer (the document, or a scope-root LayerSet). Each segment is:
//   [n]   -- the n-th DIRECT child in panel order (top = 0, increasing downward),
//            counting art layers AND sub-groups interleaved (container.layers).
//   name  -- a child matched by name, trimmed on both sides, case-sensitive.
// Only a segment that is exactly "[" + digits + "]" is an index; "Symbols [ALL]" is a
// name (the brackets are part of it). The final segment may resolve to either type.
function resolveCsvPath(pathStr, rootContainer) {
    if (!pathStr || csvTrim(pathStr).length === 0) { return null; }
    var segs = pathStr.split("/");
    var current = rootContainer; // a Document or LayerSet -- both expose .layers
    var result = null;
    for (var i = 0; i < segs.length; i++) {
        var seg = csvTrim(segs[i]);
        if (seg.length === 0) { continue; }
        // Need a container to descend into; a previously-resolved ArtLayer has no children.
        if (!current || !current.layers) { return null; }
        var child = null;
        if (/^\[\d+\]$/.test(seg)) {
            var idx = parseInt(seg.substring(1, seg.length - 1), 10);
            if (idx >= 0 && idx < current.layers.length) { child = current.layers[idx]; }
        } else {
            for (var c = 0; c < current.layers.length; c++) {
                if (csvTrim(current.layers[c].name) === seg) { child = current.layers[c]; break; }
            }
        }
        if (!child) { return null; }
        result = child;
        current = (child.typename === "LayerSet") ? child : null;
    }
    return result;
}

// Find a top-level LayerSet on the duplicate by its stable layer id (survives pruning of
// sibling groups, unlike an index or a pre-prune object reference).
function findTopLevelSetById(id) {
    var sets = app.activeDocument.layerSets;
    for (var i = 0; i < sets.length; i++) {
        if (sets[i].id === id) { return sets[i]; }
    }
    return null;
}

// #region agent log
// Human-readable CSV manifest diagnostics. Order: temp, script folder, Desktop.
// The log is truncated on the first write of each run.
var csvDebugLogStarted = false;
function csvManifestDebugLog(location, message, n1, n2, n3) {
    if (!DEBUG_CSV_MANIFEST && !csvManifestDebugEnabled) {
        return;
    }
    var ts = new Date().toString();
    var a = (n1 !== undefined && n1 !== null) ? String(n1) : "";
    var b = (n2 !== undefined && n2 !== null) ? String(n2) : "";
    var c = (n3 !== undefined && n3 !== null) ? String(n3) : "";
    var line = ts + " | " + location + " | " + message + " | " + a + " | " + b + " | " + c;
    try {
        $.writeln("[CSV-Manifest] " + line);
    } catch (eW) { }
    var paths = [];
    try {
        paths.push(Folder.temp.fsName + "/ExportLayersCSV-debug.log");
    } catch (eT) { }
    if (typeof env !== "undefined" && env && env.scriptFileDirectory) {
        paths.push(env.scriptFileDirectory + "/ExportLayersCSV-debug.log");
    }
    try {
        paths.push(Folder.desktop.fsName + "/ExportLayersCSV-debug.log");
    } catch (eD) { }
    for (var pi = 0; pi < paths.length; pi++) {
        try {
            var lf = new File(paths[pi]);
            lf.open(csvDebugLogStarted ? "a" : "w");
            lf.writeln(line);
            lf.close();
            csvDebugLogStarted = true;
            return;
        } catch (eF) { }
    }
}
// #endregion

function csvTrim(str) {
    return str.replace(/^\s+/, "").replace(/\s+$/, "");
}

// Split a CSV line into fields, honoring double quotes ("" escapes a quote).
// Unquoted commas still split; quoted commas are kept inside the field.
function splitCsvLine(line) {
    var fields = [];
    var cur = "";
    var inQuotes = false;
    for (var i = 0; i < line.length; i++) {
        var ch = line.charAt(i);
        if (inQuotes) {
            if (ch === '"') {
                if (i + 1 < line.length && line.charAt(i + 1) === '"') {
                    cur += '"';
                    i++;
                } else {
                    inQuotes = false;
                }
            } else {
                cur += ch;
            }
        } else if (ch === '"') {
            inQuotes = true;
        } else if (ch === ",") {
            fields.push(cur);
            cur = "";
        } else {
            cur += ch;
        }
    }
    fields.push(cur);
    return fields;
}

// Strip a trailing inline comment (everything from the first unquoted '#').
// Lets users annotate rows, e.g. `598,352,0,page_2,fit #Paytable`.
function stripInlineComment(line) {
    var inQuotes = false;
    for (var i = 0; i < line.length; i++) {
        var ch = line.charAt(i);
        if (ch === '"') { inQuotes = !inQuotes; }
        else if (ch === '#' && !inQuotes) { return line.substring(0, i); }
    }
    return line;
}

// Empty -> 0 (natural size). A valid non-negative integer -> that value. Otherwise null
// (signals a malformed row to the caller).
function parseCsvDimension(str) {
    if (str.length === 0) { return 0; }
    var n = parseInt(str, 10);
    if (isNaN(n)) { return null; }
    return n < 0 ? 0 : n;
}

// Parse the CSV manifest into row objects plus an optional scope list.
// Format: Width,Height,Padding,Filename,Mode,Path  (header auto-detected & skipped).
//   - Width/Height/Padding may be empty (=> 0 => natural size).
//   - Mode is optional ("fit" default / "canvas").
//   - Filename is required (output-only, may contain "subfolder/name").
//   - Path is required: the source locator resolved by resolveCsvPath().
// A leading "scope: A, B" line (case-insensitive) lists top-level groups to export in order.
// Returns { rows: [...], scopes: [...] }. An OLD-format file (folder:/-ignore marker, or a
// row whose last field is literally fit/canvas with no Path) aborts with a clear message.
function parseCsvFile(filePath) {
    var rows = [];
    var scopes = [];
    var f = new File(filePath);
    if (!f.exists) {
        alert("CSV file not found:\n" + filePath, "CSV Error", true);
        return { rows: rows, scopes: scopes };
    }
    var skipped = [];
    try {
        f.open("r");
        var firstDataLine = true;
        var lineNum = 0;
        while (!f.eof) {
            var line = stripInlineComment(f.readln());
            lineNum++;
            var trimmed = csvTrim(line);
            if (trimmed.length === 0) { continue; }

            // "scope:" directive (case-insensitive): one or more top-level groups,
            // comma-separated. May appear before the header.
            if (trimmed.toLowerCase().indexOf("scope:") === 0) {
                var spec = trimmed.substring(trimmed.indexOf(":") + 1);
                var sParts = spec.split(",");
                for (var si = 0; si < sParts.length; si++) {
                    var sName = csvTrim(sParts[si]);
                    if (sName.length > 0) { scopes.push(sName); }
                }
                continue;
            }

            var parts = splitCsvLine(line);
            var col0 = csvTrim(parts[0]);

            if (firstDataLine) {
                firstDataLine = false;
                // Skip a text header row (e.g. "Width,Height,Padding,Filename,Mode,Path").
                // A data row may legitimately have an EMPTY Width (natural size), so only a
                // non-empty, non-numeric first cell counts as a header.
                if (col0.length > 0 && isNaN(parseInt(col0, 10))) { continue; }
            }

            // Reject the old positional format up front rather than mis-parsing it.
            for (var fi = 0; fi < parts.length; fi++) {
                var fv = csvTrim(parts[fi]).toLowerCase();
                if (fv.indexOf("folder:") === 0 || fv === "-ignore") {
                    try { f.close(); } catch (eC1) { }
                    alert(
                        "This CSV uses the OLD format (\"folder:\" / \"-ignore\" markers).\n\n" +
                        "The manifest format changed: each row now needs a Path column\n" +
                        "(Width,Height,Padding,Filename,Mode,Path) naming the layer or folder\n" +
                        "to export. Please update the CSV.",
                        "CSV Format Changed", true);
                    return { rows: [], scopes: [] };
                }
            }

            if (parts.length < 5) {
                skipped.push("line " + lineNum + ": needs Width,Height,Padding,Filename,[Mode,]Path");
                continue;
            }

            // Path is the last field. A bare "fit"/"canvas" there means the row has no
            // Path column -- i.e. the old format -- so flag it instead of mis-reading.
            var pathStr = csvTrim(parts[parts.length - 1]);
            var pathLower = pathStr.toLowerCase();
            if (pathLower === "fit" || pathLower === "canvas") {
                try { f.close(); } catch (eC2) { }
                alert(
                    "This CSV looks like the OLD format (last column is \"" + pathStr + "\").\n\n" +
                    "Rows now end with a Path column naming the layer or folder to export:\n" +
                    "Width,Height,Padding,Filename,Mode,Path. Please update the CSV.",
                    "CSV Format Changed", true);
                return { rows: [], scopes: [] };
            }

            // The field before Path is Mode only when it is a known keyword; otherwise
            // Mode defaults to "fit" and that field is part of the Filename (so an
            // unquoted comma inside a filename is preserved via the join below).
            var modeField = csvTrim(parts[parts.length - 2]).toLowerCase();
            var hasMode = (modeField === "fit" || modeField === "canvas");
            var mode = hasMode ? modeField : "fit";
            var fnEnd = hasMode ? (parts.length - 2) : (parts.length - 1);

            var nameParts = [];
            for (var k = 3; k < fnEnd; k++) { nameParts.push(csvTrim(parts[k])); }
            var fn = nameParts.join(",");

            var w = parseCsvDimension(col0);
            var h = parseCsvDimension(csvTrim(parts[1]));
            var p = parseCsvDimension(csvTrim(parts[2]));
            if (w === null || h === null || p === null) {
                skipped.push("line " + lineNum + ": Width/Height/Padding must be numbers (or empty)");
                continue;
            }
            if (fn.length === 0) {
                skipped.push("line " + lineNum + ": Filename is required");
                continue;
            }
            if (pathStr.length === 0) {
                skipped.push("line " + lineNum + ": Path is required");
                continue;
            }

            rows.push({ width: w, height: h, padding: p, filename: fn, mode: mode, path: pathStr });
        }
        f.close();
    } catch (e) {
        alert("Failed to read CSV file:\n" + e.message, "CSV Error", true);
        return { rows: [], scopes: [] };
    }
    if (skipped.length > 0) {
        var maxShown = 10;
        var lines = skipped.slice(0, maxShown).join("\n");
        if (skipped.length > maxShown) {
            lines += "\n...and " + (skipped.length - maxShown) + " more";
        }
        alert("Skipped " + skipped.length + " malformed CSV row(s):\n\n" + lines, "CSV Warning", false);
    }
    return { rows: rows, scopes: scopes };
}

function resizeImageToFit(canvasW, canvasH, padding) {
    var doc = app.activeDocument;
    var curW = doc.width.as("px");
    var curH = doc.height.as("px");
    if (curW <= 0 || curH <= 0) { return; }
    var pad = Math.max(padding, 0);
    var safeW = Math.max(canvasW - pad * 2, 1);
    var safeH = Math.max(canvasH - pad * 2, 1);
    var scale = Math.min(safeW / curW, safeH / curH);
    var newW = Math.round(curW * scale);
    var newH = Math.round(curH * scale);
    doc.resizeImage(UnitValue(newW, "px"), UnitValue(newH, "px"), null, ResampleMethod.BICUBICSHARPER);
}

function setCanvasToExactSize(canvasW, canvasH) {
    app.activeDocument.resizeCanvas(
        UnitValue(canvasW, "px"),
        UnitValue(canvasH, "px"),
        AnchorPosition.MIDDLECENTER
    );
}

function createFolder(folder) {
    var result = true;
    var missingFolders = [];

    var parentFolder = folder;
    while (parentFolder) {
        if (!parentFolder.exists) {
            missingFolders.push(parentFolder);
        }

        parentFolder = parentFolder.parent;
    }

    try {
        for (var i = missingFolders.length - 1; i >= 0; --i) {
            if (!missingFolders[i].create()) {
                result = false;
                break;
            }
        }
    } catch (e) {
        result = false;
    }

    return result;
}

function createUniqueFolders(exportLayerTarget) {
    var isTargetGroup;

    switch (exportLayerTarget) {
        case ExportLayerTarget.SELECTED_LAYERS:
            isTargetGroup = function(group) {
                return group.selected;
            };
            break;

        default:
            isTargetGroup = function(group) {
                return true;
            };
            break;
    }

    for (var i = 0; i < groups.length; ++i) {
        var group = groups[i];
        if (isTargetGroup(group)) {
            var path = makeFolderName(group);
            var folder = new Folder(path);
            if (folder.exists && !prefs.overwrite) {
                var renamed = false;
                for (var j = 1; j <= MAX_COLLISION_ATTEMPTS; ++j) {
                    var handle = new Folder(path + "-" + padder(j, 3));
                    if (!handle.exists) {
                        try {
                            renamed = folder.rename(handle.name);
                        } catch (e) {}
                        break;
                    }
                }

                if (!renamed) {
                    return "Directory '" + folder.name + "' already exists. Failed to rename.";
                }
            }

            folder = new Folder(path);
            try {
                if (!folder.create()) {
                    throw new Error();
                }
            } catch (e) {
                return "Failed to create directory '" + folder.name + "'.";
            }
        }
    }

    return true;
}

function saveImage(fileName) {
    try {
        if (prefs.formatArgs instanceof ExportOptionsSaveForWeb) {
            // Document.exportDocument() is unreliable -- it ignores some of the export options.
            // Avoid it if possible.
            switch (prefs.fileType) {

                case "PNG-24":
                    exportPng24AM(fileName, prefs.formatArgs);
                    break;

                case "PNG-8":
                    exportPng8AM(fileName, prefs.formatArgs);
                    break;

                default:
                    app.activeDocument.exportDocument(fileName, ExportType.SAVEFORWEB, prefs.formatArgs);
                    break;
            }
        } else {
            app.activeDocument.saveAs(fileName, prefs.formatArgs, true, LetterCase.toExtensionType(prefs.letterCase));
        }
    } catch (e) {
        return false;
    }

    return true;
}

function makeFolderName(group) {
    var folderName = makeValidFileName(group.layer.name, prefs.useDelimiter);
    if (folderName.length == 0) {
        folderName = "Group";
    }

    folderName = prefs.destination + "/" + folderName;

    return folderName;
}

function makeFileNameFromIndex(index, numOfDigits, layer) {
    var fileName = "" + padder(index, numOfDigits);
    return getUniqueFileName(fileName, layer, index);
}

function getParentTree(layer, parents) {
    if(layer instanceof Document) { return parents; }
    parents.push(layer.name)
    if(layer.parent) {
        return getParentTree(layer.parent, parents);
    }
    return parents;
}

function getFullGroupName(layer) {
    var parents = getParentTree(layer, []);
    var name = "";
    for(var i = parents.length - 1; i >= 0; i--) {
        name += " " + parents[i];
    }
    return name;
}

function makeFileNameFromLayerName(layer, stripExt, withGroup, index) {
    var layerName = withGroup ? getFullGroupName(layer.layer) : layer.layer.name;
    var fileName = makeValidFileName(layerName, prefs.useDelimiter);
    if (stripExt) {
        var dotIdx = fileName.lastIndexOf('.');
        if (dotIdx >= 0) {
            fileName = fileName.substring(0, dotIdx);
        }
    }
    if (fileName.length == 0) {
        fileName = "Layer";
    }
    return getUniqueFileName(fileName, layer, index);
}

function getUniqueFileName(fileName, layer, index) {
    var ext = prefs.fileExtension;
    var date = new Date();
    // These are all the valid formattings supported by prefix/suffix
    var replacements = [
        ["{i}", index], 
        ["{ii}", padder(index, 2)], 
        ["{iii}", padder(index, 3)], 
        ["{iiii}", padder(index, 4)],
        ["{ln}", layer.layer.name],
        ["{dn}", prefs.documentName],
        ["{M}", (date.getMonth() + 1)],
        ["{MM}", padder(date.getMonth() + 1, 2)],
        ["{D}", date.getDate()],
        ["{DD}",padder(date.getDate(), 2)],
        ["{YY}", ("" + date.getFullYear()).substring(2)],
        ["{YYYY}", date.getFullYear()],
        ["{HH}", padder(date.getHours(), 2)],
        ["{mm}", padder(date.getMinutes(), 2)],
        ["{ss}", padder(date.getSeconds(), 2)],
        ["{sss}", padder(date.getMilliseconds(), 3)],
    ];

    var outputPrefix = prefs.outputPrefix;
    var outputSuffix = prefs.outputSuffix;
    if(outputPrefix || outputSuffix) {
        for(var i = 0; i < replacements.length; i++) {
            if(outputPrefix) {
                outputPrefix = outputPrefix.replace(replacements[i][0], replacements[i][1]);
            }
            if(outputSuffix) {
                outputSuffix = outputSuffix.replace(replacements[i][0], replacements[i][1]);
            }
        }
    }

    fileName = makeValidFileName(outputPrefix + fileName + outputSuffix, prefs.useDelimiter);
    if (prefs.letterCase == LetterCase.LOWERCASE) {
        fileName = fileName.toLowerCase();
        ext = ext.toLowerCase();
    } else if (prefs.letterCase == LetterCase.UPPERCASE) {
        fileName = fileName.toUpperCase();
        ext = ext.toUpperCase();
    }

    var localFolders = "";
    if (prefs.groupsAsFolders) {
        var parent = layer.parent;
        while (parent) {
            localFolders = makeValidFileName(parent.layer.name, prefs.useDelimiter) + "/" + localFolders;
            parent = parent.parent;
        }
    } else if (prefs.topGroupAsFolder) {
        var topGroup = null;
        var parent = layer.parent;

        while (parent) {
            if (parent.layer && parent.layer.typename == "LayerSet" && parent.layer.parent == activeDocument) {
                topGroup = parent.layer;
                break;
            }
            parent = parent.parent;
        }
        if (topGroup) {
            var filePath = prefs.destination + "/" + topGroup.name;
            var subFolder = new Folder(filePath);
            if (!subFolder.exists) {
                subFolder.create();
            }
            localFolders = topGroup.name + "/";
        }
    }

    fileName = prefs.destination + "/" + localFolders + fileName;

    // Check if the file already exists. In such case a numeric suffix will be added to disambiguate.
    var uniqueName = fileName;
    for (var i = 1; i <= MAX_COLLISION_ATTEMPTS; ++i) {
        var handle = File(uniqueName + ext);
        if (handle.exists && !prefs.overwrite) {
            uniqueName = fileName + "-" + padder(i, 3);
        } else {
            return handle;
        }
    }

    return false;
}

function forEachLayer(inCollection, doFunc, result, traverseInvisibleSets) {
    var length = inCollection.length;
    for (var i = 0; i < length; ++i) {
        var layer = inCollection[i];
        if (layer.layer && layer.layer.typename == "LayerSet") {
            if (traverseInvisibleSets || layer.visible) {
                result = forEachLayer(layer.layers, doFunc, result, traverseInvisibleSets);
            }
        } else {
            result = doFunc(layer, result);
        }
    }

    return result;
}

// Indexed access to Layers via the default provided API is very slow, so all layers should be
// collected into a separate collection beforehand and that should be accessed repeatedly.
function collectLayers(progressBarWindow) {
    // proxy to lower level ActionManager code
    return collectLayersAM(progressBarWindow);
}

function countLayers(progressBarWindow) {
    // proxy to lower level ActionManager code
    return countLayersAM(progressBarWindow);
}

function undo(doc) {
    doc.activeHistoryState = doc.historyStates[doc.historyStates.length - 2];
}

function makeInvisible(layer) {
    setVisible(layer, false);
}

function makeVisible(layer) {
    setVisible(layer, true);
}

function setVisible(layer, isVisible) {
    layer.layer.visible = isVisible;

    var current = layer.parent;
    while (current) {
        if (!current.layer.visible) {
            current.layer.visible = isVisible;
        }
        current = current.parent;
    }
}

function isAdjustmentLayer(layer) {
    switch (layer.kind) {

        case LayerKind.BRIGHTNESSCONTRAST:
        case LayerKind.CHANNELMIXER:
        case LayerKind.COLORBALANCE:
        case LayerKind.CURVES:
        case LayerKind.GRADIENTMAP:
        case LayerKind.HUESATURATION:
        case LayerKind.INVERSION:
        case LayerKind.LEVELS:
        case LayerKind.POSTERIZE:
        case LayerKind.SELECTIVECOLOR:
        case LayerKind.THRESHOLD:
            return true;

        default:
            return false;
    }

}

function finalizeSettingsPrerun() {
    // Reload prefs to make sure they are up-to-date
    prefs = getSettings();

    // Some image format prefs are not retained through inputs
    // so we need to load them separately
    var format = Formats[prefs.fileType];
    prefs.fileType = format.fileType;
    prefs.fileExtension = format.fileExtension;
    prefs.formatArgs = format.formatArgs();

    var destFolder = new Folder(prefs.destination);
    if (!destFolder.exists) {
        destFolder.create();
    }
}

//
// User interface
//


function createProgressBar() {
    // read progress bar resource
    var rsrcFile = new File(env.scriptFileDirectory + "/" + encodeURI("Export Layers To Files (Fast)-progress_bar.json"));
    var rsrcString = loadResource(rsrcFile);
    if (!rsrcString) {
        return false;
    }

    // create window
    var win;
    try {
        win = new Window(rsrcString);
    } catch (e) {
        alert("Progress bar resource is corrupt! Please, redownload the script with all files.", "Error", true);
        return false;
    }

    win.barRow.cancelBtn.onClick = function() {
        userCancelled = true;
    };

    win.onResizing = win.onResize = function() {
        this.layout.resize();
    }

    win.onClose = function() {
        userCancelled = true;
        return false;
    };
    return win;
}

function showProgressBar(win, message, maxValue) {
    win.lblMessage.text = message;
    win.barRow.bar.maxvalue = maxValue;
    win.barRow.bar.value = 0;

    win.center();
    win.show();
    repaintProgressBar(win, true);
}

function updateProgressBar(win, message) {
    ++win.barRow.bar.value;
    if (message) {
        win.lblMessage.text = message;
    }
}

function repaintProgressBar(win, force /* = false*/ ) {
    if (env.version >= 11) { // CS4 added support for UI updates; the previous method became unbearably slow, as is app.refresh()
        if (force) {
            app.refresh();
        } else {
            win.update();
        }
    } else {
        // CS3 and below
        var d = new ActionDescriptor();
        d.putEnumerated(app.stringIDToTypeID('state'), app.stringIDToTypeID('state'), app.stringIDToTypeID('redrawComplete'));
        app.executeAction(app.stringIDToTypeID('wait'), d, DialogModes.NO);
    }
}

function getActiveDocFolder() {
    try { return app.activeDocument.path; } catch (e) { return null; }
}

function showDialog() {
    // Build dialog
    var dialog;
    try {
        dialog = makeMainDialog();
    } catch (e) {
        alert("Error opening dialog! Please, file an issue and try an older version.", "Error", true);
        return false;
    }

    var fields = getDialogFields(dialog);

    // If the visible top-area checkbox exists, make it the canonical cbVisibleOnly
    // so all existing reads/writes of fields.cbVisibleOnly drive the visible control.
    if (SHOW_VISIBLE_ONLY && fields.cbVisibleOnlyTop) {
        fields.cbVisibleOnly = fields.cbVisibleOnlyTop;
    }

    // ===================
    // DESTINATION SECTION
    // ===================
    fields.txtDestination.text = prefs.destination;
    fields.btnBrowse.onClick = function() {
        var startFolder = getActiveDocFolder() || prefs.destination;
        var newFilePath = Folder.selectDialog("Select destination folder", startFolder);
        if (newFilePath) {
            fields.txtDestination.text = newFilePath.fsName;
        }
    };


    // ==============
    // EXPORT SECTION
    // ==============
    fields.radioAll.onClick = function() {
        prefs.exportLayerTarget = ExportLayerTarget.ALL_LAYERS;
        fields.cbBackground.enabled = (layerCount > 1);
        fields.cbForeground.enabled = (layerCount > 1);
    };
    fields.radioSelected.onClick = function() {
        prefs.exportLayerTarget = ExportLayerTarget.SELECTED_LAYERS;
        fields.cbBackground.enabled = false;
        fields.cbForeground.enabled = false;
        fields.cbBackground.value = false;
        fields.cbForeground.value = false;
    };
    fields.radioSelected.enabled = (selectedLayerCount > 0);

    if(prefs.exportLayerTarget === ExportLayerTarget.SELECTED_LAYERS && fields.radioSelected.enabled) {
        fields.radioSelected.value = true;
    }

    fields.cbVisibleOnly.enabled = (visibleLayerCount > 0);
    fields.cbVisibleOnly.value = prefs.visibleOnly;
    fields.cbIgnorePrefix.value = prefs.ignoreLayers;
    fields.txtIgnorePrefix.enabled = prefs.ignoreLayers;

    fields.txtIgnorePrefix.text = prefs.ignoreLayersString;
    fields.cbIgnorePrefix.onClick = function() {
        fields.txtIgnorePrefix.enabled = this.value;
    };


    // =================
    // FILENAMES SECTION
    // =================
    fields.ddNameAs.selection = FileNameType.getIndex(prefs.nameFiles);
    fields.ddLetterCasing.selection = LetterCase.getIndex(prefs.letterCase);

    fields.cbDelimiter.value = prefs.useDelimiter;
    fields.cbDelimiter.onClick = function() {
        fields.txtDelimiter.enabled = this.value;
    };

    fields.txtDelimiter.enabled = prefs.useDelimiter;
    fields.txtDelimiter.text = prefs.delimiter;
    fields.txtDelimiter.onChange = function() {
        this.text = makeValidDelimiter(this.text);
    }

    fields.txtPrefix.text = prefs.outputPrefix;
    fields.txtPrefix.onChange = function() {
        this.text = makeValidFileName(this.text, false, true);
    };

    fields.txtSuffix.text = prefs.outputSuffix;
    fields.txtSuffix.onChange = function() {
        this.text = makeValidFileName(this.text, false, true);
    };


    // ==============
    // ACTION SECTION
    // ==============
    fields.btnRun.onClick = function() {
        // CSV Manifest: parse the file and arm the run. Path resolution and validation
        // happen inside runCsvManifest (on the duplicate), so there is no count check or
        // review dialog here -- just confirm a parseable file with at least one row.
        if (CSV_FOCUSED_UI || fields.cbCsvEnabled.value) {
            var csvPath = csvTrim(fields.txtCsvPath.text);
            if (csvPath.length === 0) {
                alert("Select a CSV manifest file.", "CSV Manifest", true);
                return;
            }
            var parsed = parseCsvFile(csvPath);
            csvManifestData = parsed.rows;
            csvScopes = parsed.scopes;
            if (csvManifestData.length === 0) {
                alert("The CSV file is empty or could not be parsed.", "CSV Manifest", true);
                return;
            }
            prefs.csvEnabled = true;
            prefs.csvFilePath = csvPath;
        } else if (!CSV_FOCUSED_UI) {
            prefs.csvEnabled = false;
            prefs.csvFilePath = "";
            csvManifestData = [];
            csvScopes = [];
        }

        // Preserve CSV runtime prefs before finalizeSettingsPrerun wipes prefs
        var _csvEnabled = prefs.csvEnabled;
        var _csvFilePath = prefs.csvFilePath;

        saveSettings(dialog);
        finalizeSettingsPrerun();

        // Restore CSV runtime prefs
        prefs.csvEnabled = _csvEnabled;
        prefs.csvFilePath = _csvFilePath;

        var format = Formats[prefs.fileType];
        fields.tabpnlExportOptions.selection = format.index;

        dialog.close(1);
    };

    if (fields.btnSaveAndCancel) {
        fields.btnSaveAndCancel.enabled = env.cs3OrHigher;
        fields.btnSaveAndCancel.onClick = function() {
            saveSettings(dialog);
            dialog.close(0);
        };
    }

    if (fields.btnCancel) {
        fields.btnCancel.onClick = function() {
            dialog.close(0);
        };
    }

    fields.cbOverwriteFiles.value = prefs.overwrite;
    fields.cbSilent.value = prefs.silent;

    // ======================
    // OUTPUT OPTIONS SECTION
    // ======================

    fields.cbGroupsAsFolders.value = prefs.groupsAsFolders;
    fields.cbGroupsAsFolders.onClick = function() {
        fields.cbTopGroupsAsFolders.enabled = !this.value;
    };

    fields.cbTopGroupsAsFolders.value = prefs.topGroupAsFolder;
    fields.cbTopGroupsAsFolders.onClick = function() {
        fields.cbGroupsAsFolders.enabled = !this.value;
    };

    fields.cbGroupsAsFolders.enabled = !prefs.topGroupAsFolder;
    fields.cbTopGroupsAsFolders.enabled = !prefs.groupsAsFolders;


    // =============================
    // BACKGROUND/FOREGROUND SECTION
    // =============================
    fields.cbBackground.enabled = (layerCount > 1 && !fields.radioSelected.value);
    fields.cbForeground.enabled = (layerCount > 1 && !fields.radioSelected.value);
    fields.cbBackground.value = prefs.exportBackground && fields.cbBackground.enabled;
    fields.cbForeground.value = prefs.exportForeground && fields.cbForeground.enabled;


    // =====================
    // MODIFY LAYERS SECTION
    // =====================

    // ============
    // TRIM SECTION
    // ============
    fields.cbTrim.value = prefs.trim;
    fields.cbTrim.onClick = function() {
        fields.ddTrim.enabled = this.value;
    };

    fields.ddTrim.enabled = prefs.trim;
    fields.ddTrim.selection = prefs.trimValue === TrimPrefType.DONT_TRIM ? 0 : TrimPrefType.getIndex(prefs.trimValue);

    // ===============
    // PADDING SECTION
    // ===============
    fields.cbPadding.value = prefs.padding;
    fields.grpPaddingLabel.enabled = prefs.padding;
    fields.txtPadding.text = prefs.paddingValue;
    fields.txtPadding.onChange = function() {
    var paddingNum = parseInt(this.text, 10);
    if (isNaN(paddingNum)) {
        paddingNum = prefs.paddingValue;
    }
    paddingNum = Math.max(paddingNum, 0);
    this.text = paddingNum;
    };
    fields.cbPadding.onClick = function() {
        fields.grpPaddingLabel.enabled = this.value;
    };

    // =============
    // SCALE SECTION
    // =============
    fields.cbScale.value = prefs.scale;
    fields.grpScaleLabel.enabled = prefs.scale;
    fields.txtScale.text = prefs.scaleValue;
    fields.txtScale.onChange = function() {
    var scaleNum = parseInt(this.text, 10);
    if (isNaN(scaleNum)) {
        scaleNum = prefs.paddingValue;
    }
    scaleNum = Math.max(scaleNum, 1);
    this.text = scaleNum;
    };
    fields.cbScale.onClick = function() {
        fields.grpScaleLabel.enabled = this.value;
    };

    // ========================
    // CSV MANIFEST SECTION
    // ========================
    if (CSV_FOCUSED_UI) {
        fields.cbCsvEnabled.value = true;
    } else {
        fields.cbCsvEnabled.value = false;
    }
    fields.cbCsvManifestDebug.value = false;
    csvManifestDebugEnabled = false;
    fields.txtCsvPath.text = "";

    if (CSV_FOCUSED_UI) {
        fields.txtCsvPath.enabled = true;
        fields.btnBrowseCsv.enabled = true;
        fields.cbCsvManifestDebug.enabled = true;
        fields.cbPadding.enabled = false;
        fields.grpPaddingLabel.enabled = false;
        fields.cbScale.enabled = false;
        fields.grpScaleLabel.enabled = false;
        fields.ddNameAs.enabled = false;
    } else {
        fields.txtCsvPath.enabled = false;
        fields.btnBrowseCsv.enabled = false;
        fields.cbCsvManifestDebug.enabled = false;

        fields.cbCsvEnabled.onClick = function() {
            var on = this.value;
            fields.txtCsvPath.enabled = on;
            fields.btnBrowseCsv.enabled = on;
            fields.cbCsvManifestDebug.enabled = on;

            fields.cbPadding.enabled = !on;
            fields.grpPaddingLabel.enabled = !on && fields.cbPadding.value;
            fields.cbScale.enabled = !on;
            fields.grpScaleLabel.enabled = !on && fields.cbScale.value;
            fields.ddNameAs.enabled = !on;
        };
    }

    fields.cbCsvManifestDebug.onClick = function() {
        csvManifestDebugEnabled = this.value;
    };

    fields.btnBrowseCsv.onClick = function() {
        var startFolder = getActiveDocFolder();
        var seed = startFolder ? new File(startFolder.fsName + "/dummy.csv") : new File();
        var csvFile = seed.openDlg("Select CSV manifest file", "CSV Files:*.csv,All Files:*.*");
        if (csvFile) {
            fields.txtCsvPath.text = csvFile.fsName;
        }
    };

    // =================
    // EXPORT AS SECTION
    // =================
    var format = Formats[prefs.fileType];
    fields.tabpnlExportOptions.selection = format.index;

    // PNG 24
    // ======
    fields.ddPng24Matte.selection = prefs.png24Matte;

    fields.grpPng24Matte.enabled = !prefs.png24Transparency;
    fields.cbPng24Transparency.value = prefs.png24Transparency;
    fields.cbPng24Transparency.onClick = function() {
        fields.grpPng24Matte.enabled = !this.value;
    };

    fields.cbPng24Interlaced.value = prefs.png24Interlaced;

    // PNG 8
    // =====
    fields.ddPng8ColorReduction.selection = prefs.png8ColorReduction;
    fields.txtPng8NumberofColors.text = prefs.png8NumberOfColors;
    fields.txtPng8NumberofColors.onChange = function() {
        var colorNum = parseInt(this.text, 10);
        if (isNaN(colorNum)) {
            colorNum = prefs.png8NumberOfColors;
        } 
        colorNum = Math.min(colorNum, 256);
        colorNum = Math.max(colorNum, 0);
        this.text = colorNum;
    };

    fields.ddPng8Dither.selection = prefs.png8DitherType;
    fields.ddPng8Dither.onChange = function() {
         fields.grpPng8DitherSlider.enabled = this.selection.index === 1;
    }

    fields.grpPng8DitherSlider.enabled = prefs.png8DitherType === 1;
    fields.sldrPng8Dither.value = prefs.png8DitherValue;
    fields.lblPng8DitherValue.text = prefs.png8DitherValue + "%";
    fields.sldrPng8Dither.onChanging = function() {
        this.value = Math.floor(this.value);
        fields.lblPng8DitherValue.text = this.value + "%";
    }

    fields.ddPng8Matte.enabled = !prefs.png8Transparency;
    fields.ddPng8Matte.selection = prefs.png8Matte;

    fields.cbPng8Transparency.value = prefs.png8Transparency;
    fields.cbPng8Transparency.onClick = function() {
        fields.grpPng8TransparencyDither.enabled = this.value;
        fields.ddPng8Matte.enabled = !this.value;
    }
    fields.grpPng8TransparencyDither.enabled = prefs.png8Transparency;
    fields.ddPng8TransparencyDither.selection = prefs.png8TransparencyDitherType;
    fields.ddPng8TransparencyDither.onChange = function() {
        fields.sldrPng8TransparencyDither.enabled = this.selection.index === 1;
        fields.lblPng8TransparencyDitherValue.enabled = this.selection.index === 1;
    }

    fields.sldrPng8TransparencyDither.enabled = prefs.png8Transparency && prefs.png8TransparencyDitherType === 1;
    fields.lblPng8TransparencyDitherValue.enabled = prefs.png8Transparency && prefs.png8TransparencyDitherType === 1;
    fields.sldrPng8TransparencyDither.value = prefs.png8TransparencyDitherValue;
    fields.lblPng8TransparencyDitherValue.text = prefs.png8TransparencyDitherValue + "%";
    fields.sldrPng8TransparencyDither.onChanging = function() {
        this.value = Math.floor(this.value);
        fields.lblPng8TransparencyDitherValue.text = this.value + "%";
    }

    fields.cbPng8Interlaced.value = prefs.png8Interlaced;

    // JPG
    // ===

    fields.sldrJpgQuality.value = prefs.jpgQuality;
    fields.lblJpgQualityValue.text = prefs.jpgQuality;
    fields.sldrJpgQuality.onChanging = function() {
        this.value = Math.floor(this.value);
        fields.lblJpgQualityValue.text = this.value;
    }

    fields.ddJpgMatte.selection = prefs.jpgMatte;
    fields.cbJpgIcc.value = prefs.jpgIcc;
    fields.cbJpgOptimized.value = prefs.jpgOptimized;
    fields.cbJpgProgressive.value = prefs.jpgProgressive;

    // TIF
    // ===
    fields.ddTifEncoding.selection = prefs.tifEncoding;
    fields.ddTifEncoding.onChange = function() {
         fields.grpTifQuality.enabled = this.selection.index === 3;
    }

    fields.grpTifQuality.enabled = prefs.tifEncoding === 3;
    fields.sldrTifQuality.value = prefs.tifQuality;
    fields.lblTifQualityValue.text = prefs.tifQuality;
    fields.sldrTifQuality.onChanging = function() {
        this.value = Math.floor(this.value);
        fields.lblTifQualityValue.text = this.value;
    }

    fields.cbTifWithAlpha.value = prefs.tifAlphaChannel;
    fields.cbTifIcc.value = prefs.tifIcc;
    fields.cbTifTransparency.value = prefs.tifTransparency;
  
    // PDF
    // ===
    fields.ddPdfStandard.selection = prefs.pdfStandard;
    fields.ddPdfCompatibility.selection = prefs.pdfCompatibility;
    fields.ddPdfEncoding.selection = prefs.pdfEncoding;
    fields.ddPdfEncoding.onChange = function() {
         fields.grpPdfQuality.enabled = this.selection.index === 2;
    }
    fields.grpPdfQuality.enabled = prefs.pdfEncoding === 2;
    fields.sldrPdfQuality.value = prefs.pdfQuality;
    fields.lblPdfQualityValue.text = prefs.pdfQuality;
    fields.sldrPdfQuality.onChanging = function() {
        this.value = Math.floor(this.value);
        fields.lblPdfQualityValue.text = this.value;
    }
    
    fields.cbPdfWithAlpha.value = prefs.pdfAlphaChannel;
    fields.cbPdfIcc.value = prefs.pdfIcc;

    fields.cbPdfColorConversion.value = prefs.pdfColorConversion;
    fields.cbPdfColorConversion.onClick = function() {
        fields.grpPdfDestinationProfile.enabled = this.value;
    }
    fields.grpPdfDestinationProfile.enabled = prefs.pdfColorConversion;
    fields.ddPdfDestinationProfile.selection = prefs.pdfDestinationProfile;
    fields.ddPdfDownSample.selection = prefs.pdfDownSample;
    fields.ddPdfDownSample.onChange = function() {
        fields.grpPdfDownSampleSize.enabled = this.selection.index > 0;
   }
   fields.grpPdfDownSampleSize.enabled = prefs.pdfDownSample > 0;
    fields.txtPdfDownSampleSize.text = prefs.pdfDownSampleSize;
    fields.txtPdfDownSampleSize.onChange = function() {
        var sampleSize = parseInt(this.text, 10);
        if (isNaN(sampleSize)) {
            sampleSize = prefs.pdfDownSampleSize;
        }
        this.text = sampleSize;
        fields.txtPdfDownSampleSizeLimit.text = this.text * 1.5;
    };
    fields.txtPdfDownSampleSizeLimit.text = prefs.pdfDownSampleSizeLimit;

    // TGA
    // ===
    fields.ddTgaDepth.selection = prefs.tgaDepth;
    fields.cbTgaRleCompression.value = prefs.tgaRleCompression;
    fields.cbTgaWithAlpha.value = prefs.tgaAlphaChannel;

    // BMP
    // ===
    fields.ddBmpDepth.selection = prefs.bmpDepth;
    fields.cbBmpRleCompression.value = prefs.bmpRleCompression;
    fields.cbBmpWithAlpha.value = prefs.bmpAlphaChannel;
    fields.cbBmpFlipRowOrder.value = prefs.bmpFlipRowOrder;

    // ================
    // METADATA MESSAGE
    // ================
    if (fields.lblMetadata) {
        fields.lblMetadata.text = formatString(fields.lblMetadata.text, layerCount, visibleLayerCount, selectedLayerCount);
    }

    // CSV-focused mode: title-bar close has no Cancel button. Per ScriptUI docs, modal show()
    // returns the value passed to close(); if the window is dismissed without that path, it returns 0.
    // main() only continues when showDialog() === 1, so OS close should not start export.

    if (CSV_FOCUSED_UI) {
        function csvApplyWindowSize(contentW, contentH) {
            var dm = dialog.margins || [0, 0, 0, 0];
            var chromeX = (dm[0] || 0) + (dm[2] || 0) + 28;
            var chromeY = (dm[1] || 0) + (dm[3] || 0) + 48;
            var fw = Math.max(400, Math.ceil(contentW) + chromeX);
            var fh = Math.max(320, Math.ceil(contentH) + chromeY);
            try {
                dialog.preferredSize = [fw, fh];
            } catch (ePs) { }
            try {
                dialog.size = [fw, fh];
            } catch (eSz) { }
            try {
                var db = dialog.bounds;
                if (db && db.length >= 4) {
                    dialog.bounds = [db[0], db[1], db[0] + fw, db[1] + fh];
                }
            } catch (eBd) { }
        }
        function csvLayoutRelayout() {
            if (dialog.layout && dialog.layout.layout) {
                dialog.layout.layout(true);
            }
            if (dialog.layout && dialog.layout.resize) {
                dialog.layout.resize();
            }
        }
        function csvPackFromPanel() {
            var pnlCsv = dialog.findElement("pnlCsvExport");
            if (!pnlCsv || !pnlCsv.bounds) {
                return;
            }
            var bb = pnlCsv.bounds;
            var gw = bb[2] - bb[0];
            var gh = bb[3] - bb[1];
            if (gw > 10 && gh > 10) {
                csvApplyWindowSize(gw, gh);
            }
        }
        try {
            csvApplyWindowSize(420, 360);
            csvLayoutRelayout();
        } catch (eCsvLayout1) { }
        var pass;
        for (pass = 0; pass < 2; pass++) {
            try {
                csvPackFromPanel();
                csvLayoutRelayout();
            } catch (eCsvPass) { }
        }
    }

    dialog.center();
    return dialog.show();
}

function saveSettings(dialog) {
    if (!env.cs3OrHigher) {
        return;
    }

    var desc = new ActionDescriptor();
    var fields = getDialogFields(dialog);
        // common

    // We use the value of input fields to save the settings
    var exportLayerTarget = ExportLayerTarget.ALL_LAYERS;
    if (fields.radioSelected.value) {
        exportLayerTarget = ExportLayerTarget.SELECTED_LAYERS;
    }
    desc.putBoolean(DEFAULT_SETTINGS.bmpAlphaChannel, fields.cbBmpWithAlpha.value);
    desc.putInteger(DEFAULT_SETTINGS.bmpDepth, fields.ddBmpDepth.selection.index);
    desc.putBoolean(DEFAULT_SETTINGS.bmpFlipRowOrder, fields.cbBmpFlipRowOrder.value);
    desc.putBoolean(DEFAULT_SETTINGS.bmpRleCompression, fields.cbBmpRleCompression.value);

    desc.putString(DEFAULT_SETTINGS.delimiter, fields.txtDelimiter.text);
    desc.putString(DEFAULT_SETTINGS.destination, fields.txtDestination.text);
    desc.putBoolean(DEFAULT_SETTINGS.exportBackground, fields.cbBackground.value);
    desc.putBoolean(DEFAULT_SETTINGS.exportForeground, fields.cbForeground.value);
    desc.putInteger(DEFAULT_SETTINGS.exportLayerTarget, exportLayerTarget);
    desc.putString(DEFAULT_SETTINGS.fileType, fields.tabpnlExportOptions.selection.text);
    desc.putBoolean(DEFAULT_SETTINGS.groupsAsFolders, fields.cbGroupsAsFolders.value);
    desc.putBoolean(DEFAULT_SETTINGS.ignoreLayers, fields.cbIgnorePrefix.value);
    desc.putString(DEFAULT_SETTINGS.ignoreLayersString, fields.txtIgnorePrefix.text);

    desc.putInteger(DEFAULT_SETTINGS.jpgQuality, fields.sldrJpgQuality.value);
    desc.putInteger(DEFAULT_SETTINGS.jpgMatte, fields.ddJpgMatte.selection.index);
    desc.putBoolean(DEFAULT_SETTINGS.jpgIcc, fields.cbJpgIcc.value);
    desc.putBoolean(DEFAULT_SETTINGS.jpgOptimized, fields.cbJpgOptimized.value);
    desc.putBoolean(DEFAULT_SETTINGS.jpgProgressive, fields.cbJpgProgressive.value);

    desc.putInteger(DEFAULT_SETTINGS.tifQuality, fields.sldrTifQuality.value);
    desc.putInteger(DEFAULT_SETTINGS.tifEncoding, fields.ddTifEncoding.selection.index);
    desc.putBoolean(DEFAULT_SETTINGS.tifAlphaChannel, fields.cbTifWithAlpha.value);
    desc.putBoolean(DEFAULT_SETTINGS.tifIcc, fields.cbTifIcc.value);
    desc.putBoolean(DEFAULT_SETTINGS.tifTransparency, fields.cbTifTransparency.value);

    desc.putInteger(DEFAULT_SETTINGS.pdfStandard, fields.ddPdfStandard.selection.index);
    desc.putInteger(DEFAULT_SETTINGS.pdfCompatibility, fields.ddPdfCompatibility.selection.index);
    desc.putInteger(DEFAULT_SETTINGS.pdfQuality, fields.sldrPdfQuality.value);
    desc.putInteger(DEFAULT_SETTINGS.pdfEncoding, fields.ddPdfEncoding.selection.index);
    desc.putBoolean(DEFAULT_SETTINGS.pdfAlphaChannel, fields.cbPdfWithAlpha.value);
    desc.putBoolean(DEFAULT_SETTINGS.pdfIcc, fields.cbPdfIcc.value);
    desc.putBoolean(DEFAULT_SETTINGS.pdfColorConversion, fields.cbPdfColorConversion.value);
    desc.putInteger(DEFAULT_SETTINGS.pdfDestinationProfile, fields.ddPdfDestinationProfile.selection.index);
    desc.putInteger(DEFAULT_SETTINGS.pdfDownSample, fields.ddPdfDownSample.selection.index);
    desc.putInteger(DEFAULT_SETTINGS.pdfDownSampleSize, parseInt(fields.txtPdfDownSampleSize.text));
    desc.putInteger(DEFAULT_SETTINGS.pdfDownSampleSizeLimit, parseInt(fields.txtPdfDownSampleSizeLimit.text));

    desc.putInteger(DEFAULT_SETTINGS.letterCase, LetterCase.forIndex(fields.ddLetterCasing.selection.index));
    desc.putInteger(DEFAULT_SETTINGS.nameFiles, FileNameType.forIndex(fields.ddNameAs.selection.index));
    desc.putString(DEFAULT_SETTINGS.outputPrefix, fields.txtPrefix.text);
    desc.putString(DEFAULT_SETTINGS.outputSuffix, fields.txtSuffix.text);
    desc.putBoolean(DEFAULT_SETTINGS.overwrite, fields.cbOverwriteFiles.value);
    desc.putBoolean(DEFAULT_SETTINGS.silent, fields.cbSilent.value);
    desc.putBoolean(DEFAULT_SETTINGS.padding, fields.cbPadding.value);
    desc.putInteger(DEFAULT_SETTINGS.paddingValue, parseInt(fields.txtPadding.text));
    
    desc.putInteger(DEFAULT_SETTINGS.png8ColorReduction, fields.ddPng8ColorReduction.selection.index);
    desc.putInteger(DEFAULT_SETTINGS.png8NumberOfColors, parseInt(fields.txtPng8NumberofColors.text));
    desc.putInteger(DEFAULT_SETTINGS.png8DitherType, fields.ddPng8Dither.selection.index);
    desc.putInteger(DEFAULT_SETTINGS.png8DitherValue, fields.sldrPng8Dither.value);
    desc.putInteger(DEFAULT_SETTINGS.png8Matte, fields.ddPng8Matte.selection.index);
    desc.putBoolean(DEFAULT_SETTINGS.png8Transparency, fields.cbPng8Transparency.value);
    desc.putInteger(DEFAULT_SETTINGS.png8TransparencyDitherType, fields.ddPng8TransparencyDither.selection.index);
    desc.putInteger(DEFAULT_SETTINGS.png8TransparencyDitherValue, fields.sldrPng8TransparencyDither.value);
    desc.putBoolean(DEFAULT_SETTINGS.png8Interlaced, fields.cbPng8Interlaced.value);

    desc.putBoolean(DEFAULT_SETTINGS.png24Interlaced, fields.cbPng24Interlaced.value);
    desc.putInteger(DEFAULT_SETTINGS.png24Matte, fields.ddPng24Matte.selection.index);
    desc.putBoolean(DEFAULT_SETTINGS.png24Transparency, fields.cbPng24Transparency.value);

    desc.putBoolean(DEFAULT_SETTINGS.scale, fields.cbScale.value);
    desc.putInteger(DEFAULT_SETTINGS.scaleValue, parseFloat(fields.txtScale.text));

    desc.putInteger(DEFAULT_SETTINGS.tgaDepth, fields.ddTgaDepth.selection.index);
    desc.putBoolean(DEFAULT_SETTINGS.tgaAlphaChannel, fields.cbTgaWithAlpha.value);
    desc.putBoolean(DEFAULT_SETTINGS.tgaRleCompression, fields.cbTgaRleCompression.value);

    desc.putBoolean(DEFAULT_SETTINGS.topGroupAsFolder, fields.cbTopGroupsAsFolders.value);
    desc.putBoolean(DEFAULT_SETTINGS.trim, fields.cbTrim.value);
    desc.putInteger(DEFAULT_SETTINGS.trimValue, fields.cbTrim.value ? TrimPrefType.forIndex(fields.ddTrim.selection.index) : TrimPrefType.DONT_TRIM);
    desc.putBoolean(DEFAULT_SETTINGS.useDelimiter, fields.cbDelimiter.value);
    desc.putBoolean(DEFAULT_SETTINGS.visibleOnly, fields.cbVisibleOnly.value);

    // Save settings.
    // "true" means setting persists across Photoshop launches.
    app.putCustomOptions(USER_SETTINGS_ID, desc, true);
}


function getDefaultSettings() {
    if (!env.cs3OrHigher) {
        return null;
    }
    var result = null;
    var destinationDefault;
    try {
        destinationDefault = app.activeDocument.path;
    } catch (e) {
        destinationDefault = Folder.myDocuments;
    }

        // might throw if format changed or got corrupt
        result = {
            bmpAlphaChannel: false,
            bmpDepth: 0,
            bmpFlipRowOrder: false,
            bmpRleCompression: false,
            delimiter: "_",
            destination: destinationDefault,
            exportBackground: false,
            exportForeground: false,
            exportLayerTarget: ExportLayerTarget.ALL_LAYERS,
            fileType: "PNG-24",
            groupsAsFolders: false,
            ignoreLayersString: "!",
            jpgIcc: false,
            jpgMatte: 0,
            jpgOptimized: false,
            jpgProgressive: false,
            jpgQuality: 100,
            letterCase: LetterCase.KEEP,
            nameFiles: FileNameType.AS_LAYERS_NO_EXT,
            outputPrefix: "",
            outputSuffix:"",
            overwrite: false,
            padding: false,
            paddingValue: 0,
            pdfAlphaChannel: false,
            pdfColorConversion: false,
            pdfCompatibility: 0,
            pdfDestinationProfile: 5,
            pdfDownSample: 3,
            pdfDownSampleSize: 300,
            pdfDownSampleSizeLimit: 450,
            pdfEncoding: 2,
            pdfIcc: false,
            pdfQuality: 100,
            pdfStandard: 0,
            png24Interlaced: false,
            png24Matte: 0,
            png24Transparency: false,
            png8ColorReduction: 0,
            png8DitherType: 0,
            png8DitherValue: 100,
            png8Interlaced: false,
            png8Matte: 0,
            png8NumberOfColors: 256,
            png8Transparency: false,
            png8TransparencyDitherType: 0,
            png8TransparencyDitherValue: 100,
            scale: false,
            scaleValue: 100,
            silent: false,
            tgaAlphaChannel: false,
            tgaDepth: 0,
            tgaRleCompression: false,
            tifAlphaChannel: false,
            tifEncoding: 1,
            tifIcc: false,
            tifTransparency: false,
            tifQuality: 100,
            topGroupAsFolder: false,
            trim: false,
            trimValue: TrimPrefType.INDIVIDUAL,
            useDelimiter: false,
            visibleOnly: false,
        };

    return result;
}

function getSettings(formatOpts) {
    if (!env.cs3OrHigher) {
        return null;
    }

    var desc;
    var savedSettings = {};
    try {
        // might throw if settings not present (not saved previously)
        desc = app.getCustomOptions(USER_SETTINGS_ID);

        // might throw if format changed or got corrupt
        savedSettings = {
            bmpAlphaChannel: desc.getBoolean(DEFAULT_SETTINGS.bmpAlphaChannel),
            bmpDepth: desc.getInteger(DEFAULT_SETTINGS.bmpDepth),
            bmpFlipRowOrder: desc.getBoolean(DEFAULT_SETTINGS.bmpFlipRowOrder),
            bmpRleCompression: desc.getBoolean(DEFAULT_SETTINGS.bmpRleCompression),
            delimiter: desc.getString(DEFAULT_SETTINGS.delimiter),
            destination: desc.getString(DEFAULT_SETTINGS.destination),
            exportBackground: desc.getBoolean(DEFAULT_SETTINGS.exportBackground),
            exportForeground: desc.getBoolean(DEFAULT_SETTINGS.exportForeground),
            exportLayerTarget: desc.getInteger(DEFAULT_SETTINGS.exportLayerTarget),
            fileType: desc.getString(DEFAULT_SETTINGS.fileType),
            groupsAsFolders: desc.getBoolean(DEFAULT_SETTINGS.groupsAsFolders),
            ignoreLayers: desc.getBoolean(DEFAULT_SETTINGS.ignoreLayers),
            ignoreLayersString: desc.getString(DEFAULT_SETTINGS.ignoreLayersString),
            jpgIcc: desc.getBoolean(DEFAULT_SETTINGS.jpgIcc),
            jpgMatte: desc.getInteger(DEFAULT_SETTINGS.jpgMatte),
            jpgOptimized: desc.getBoolean(DEFAULT_SETTINGS.jpgOptimized),
            jpgProgressive: desc.getBoolean(DEFAULT_SETTINGS.jpgProgressive),
            jpgQuality: desc.getInteger(DEFAULT_SETTINGS.jpgQuality),
            letterCase: desc.getInteger(DEFAULT_SETTINGS.letterCase),
            nameFiles: desc.getInteger(DEFAULT_SETTINGS.nameFiles),
            outputPrefix: desc.getString(DEFAULT_SETTINGS.outputPrefix),
            outputSuffix: desc.getString(DEFAULT_SETTINGS.outputSuffix),
            overwrite: desc.getBoolean(DEFAULT_SETTINGS.overwrite),
            padding: desc.getBoolean(DEFAULT_SETTINGS.padding),
            paddingValue: desc.getInteger(DEFAULT_SETTINGS.paddingValue),
            pdfAlphaChannel: desc.getBoolean(DEFAULT_SETTINGS.pdfAlphaChannel),
            pdfColorConversion: desc.getBoolean(DEFAULT_SETTINGS.pdfColorConversion),
            pdfCompatibility: desc.getInteger(DEFAULT_SETTINGS.pdfCompatibility),
            pdfDestinationProfile: desc.getInteger(DEFAULT_SETTINGS.pdfDestinationProfile),
            pdfDownSample: desc.getInteger(DEFAULT_SETTINGS.pdfDownSample),
            pdfDownSampleSize: desc.getInteger(DEFAULT_SETTINGS.pdfDownSampleSize),
            pdfDownSampleSizeLimit: desc.getInteger(DEFAULT_SETTINGS.pdfDownSampleSizeLimit),
            pdfEncoding: desc.getInteger(DEFAULT_SETTINGS.pdfEncoding),
            pdfIcc: desc.getBoolean(DEFAULT_SETTINGS.pdfIcc),
            pdfQuality: desc.getInteger(DEFAULT_SETTINGS.pdfQuality),
            pdfStandard: desc.getInteger(DEFAULT_SETTINGS.pdfStandard),
            png24Interlaced: desc.getBoolean(DEFAULT_SETTINGS.png24Interlaced),
            png24Matte: desc.getInteger(DEFAULT_SETTINGS.png24Matte),
            png24Transparency: desc.getBoolean(DEFAULT_SETTINGS.png24Transparency),
            png8ColorReduction: desc.getInteger(DEFAULT_SETTINGS.png8ColorReduction),
            png8DitherType: desc.getInteger(DEFAULT_SETTINGS.png8DitherType),
            png8DitherValue: desc.getInteger(DEFAULT_SETTINGS.png8DitherValue),
            png8Interlaced: desc.getBoolean(DEFAULT_SETTINGS.png8Interlaced),
            png8Matte: desc.getInteger(DEFAULT_SETTINGS.png8Matte),
            png8NumberOfColors: desc.getInteger(DEFAULT_SETTINGS.png8NumberOfColors),
            png8Transparency: desc.getBoolean(DEFAULT_SETTINGS.png8Transparency),
            png8TransparencyDitherType: desc.getInteger(DEFAULT_SETTINGS.png8TransparencyDitherType),
            png8TransparencyDitherValue: desc.getInteger(DEFAULT_SETTINGS.png8TransparencyDitherValue),
            scale: desc.getBoolean(DEFAULT_SETTINGS.scale),
            scaleValue: desc.getInteger(DEFAULT_SETTINGS.scaleValue),
            silent: desc.getBoolean(DEFAULT_SETTINGS.silent),
            tgaAlphaChannel: desc.getBoolean(DEFAULT_SETTINGS.tgaAlphaChannel),
            tgaDepth: desc.getInteger(DEFAULT_SETTINGS.tgaDepth),
            tgaRleCompression: desc.getBoolean(DEFAULT_SETTINGS.tgaRleCompression),
            tifAlphaChannel: desc.getBoolean(DEFAULT_SETTINGS.tifAlphaChannel),
            tifEncoding: desc.getInteger(DEFAULT_SETTINGS.tifEncoding),
            tifIcc: desc.getBoolean(DEFAULT_SETTINGS.tifIcc),
            tifTransparency: desc.getBoolean(DEFAULT_SETTINGS.tifTransparency),
            tifQuality: desc.getInteger(DEFAULT_SETTINGS.tifQuality),
            topGroupAsFolder: desc.getBoolean(DEFAULT_SETTINGS.topGroupAsFolder),
            trim: desc.getBoolean(DEFAULT_SETTINGS.trim),
            trimValue: desc.getInteger(DEFAULT_SETTINGS.trimValue),
            useDelimiter: desc.getBoolean(DEFAULT_SETTINGS.useDelimiter),
            visibleOnly: desc.getBoolean(DEFAULT_SETTINGS.visibleOnly),

        };
    } catch (e) {
    }

    var defaultSettings = getDefaultSettings();
    var settings = {};
    for (var prop in defaultSettings) { settings[prop] = defaultSettings[prop]; }
    for (var prop in savedSettings) { settings[prop] = savedSettings[prop]; }
    return settings;
}

//
// Bootstrapper (version support, getting additional environment settings, error handling...)
//

function bootstrap() {
    function showError(err) {
        alert(err + ': on line ' + err.line, 'Script Error', true);
    }

    // initialisation of class methods
    defineProfilerMethods();

    // check if there's a document open
    try {
        var doc = app.activeDocument; // this actually triggers the exception
        if (!doc) { // this is just for sure if it ever behaves differently in other versions
            throw new Error();
        }
    } catch (e) {
        alert("No document is open! Nothing to export.", "Error", true);
        return "cancel";
    }

    try {
        // setup the environment

        env = new Object();

        env.version = parseInt(app.version, 10);

        if (env.version < 9) {
            alert("Photoshop versions before CS2 are not supported!", "Error", true);
            return "cancel";
        }

        env.cs3OrHigher = (env.version >= 10);

        // get script's file name
        if (env.cs3OrHigher) {
            env.scriptFileName = $.fileName;
        } else {
            try {
                //throw new Error();        
                // doesn't provide the file name, at least in CS2
                var illegal = RUNTIME_ERROR;
            } catch (e) {
                env.scriptFileName = e.fileName;
            }
        }

        env.scriptFileDirectory = (new File(env.scriptFileName)).parent;

        // run the script itself
        if (env.cs3OrHigher) {
            // suspend history for CS3 or higher
            app.activeDocument.suspendHistory('Export Layers To Files', 'main()');
        } else {
            main();
        }

        if (env.documentCopy) {
            var _dm = app.displayDialogs;
            app.displayDialogs = DialogModes.NO;
            env.documentCopy.close(SaveOptions.DONOTSAVECHANGES);
            app.displayDialogs = _dm;
        }
    } catch (e) {
        // report errors unless the user cancelled
        if (e.number != 8007) showError(e);
        if (env.documentCopy) {
            var _dm2 = app.displayDialogs;
            app.displayDialogs = DialogModes.NO;
            env.documentCopy.close(SaveOptions.DONOTSAVECHANGES);
            app.displayDialogs = _dm2;
        }
        return "cancel";
    }
}

//
// ActionManager mud
//

// Faster layer collection:
//  https://forums.adobe.com/message/2666611

function collectLayersAM(progressBarWindow) {
    var layers = [],
        visibleLayers = [],
        selectedLayers = [],
        groups = [];
    var layerCount = 0;

    var ref = null;
    var desc = null;

    var idOrdn = app.charIDToTypeID("Ordn");

    // Get layer count reported by the active Document object - it never includes the background.
    ref = new ActionReference();
    ref.putEnumerated(app.charIDToTypeID("Dcmn"), app.charIDToTypeID("Ordn"), app.charIDToTypeID("Trgt"));
    desc = app.executeActionGet(ref);
    layerCount = desc.getInteger(app.charIDToTypeID("NmbL"));

    if (layerCount == 0) {
        // This is a flattened image that contains only the background (which is always visible).
        var bg = app.activeDocument.backgroundLayer;
        var layer = { layer: bg, parent: null };
        layers.push(layer);
        visibleLayers.push(layer);
    } else {
        // There are more layers that may or may not contain a background. The background is always at 0;
        // other layers are indexed from 1.

        var idLyr = app.charIDToTypeID("Lyr ");
        var idLayerSection = app.stringIDToTypeID("layerSection");
        var idVsbl = app.charIDToTypeID("Vsbl");
        var idNull = app.charIDToTypeID("null");
        var idSlct = app.charIDToTypeID("slct");
        var idMkVs = app.charIDToTypeID("MkVs");

        var FEW_LAYERS = 10;

        if (progressBarWindow) {
            // The layer count is actually + 1 if there's a background present, but it should be no biggie.
            showProgressBar(progressBarWindow, "Collecting layers... Might take up to several seconds.", (layerCount + FEW_LAYERS) / FEW_LAYERS);
        }

        // Query current selection.
        ref = new ActionReference();
        ref.putEnumerated(idLyr, idOrdn, app.charIDToTypeID("Trgt"));
        var selectionDesc = app.executeActionGet(ref);
        var selectionIdx = selectionDesc.getInteger(app.charIDToTypeID("ItmI"));

        try {
            // Collect normal layers.
            var visibleInGroup = [true];
            var layerVisible;
            var currentGroup = null;
            var layerSection;
            var selected = 0;

            for (var i = layerCount; i >= 1; --i) {
                // check if it's an art layer (not a group) that can be selected
                ref = new ActionReference();
                ref.putIndex(idLyr, i);
                desc = app.executeActionGet(ref);
                layerVisible = desc.getBoolean(idVsbl);
                layerSection = app.typeIDToStringID(desc.getEnumerationValue(idLayerSection));
                if ((layerSection == "layerSectionContent") ||
                    (layerSection == "layerSectionStart")) {
                    // select the layer and then retrieve it via Document.activeLayer
                    desc.clear();
                    desc.putReference(idNull, ref);
                    desc.putBoolean(idMkVs, false);
                    app.executeAction(idSlct, desc, DialogModes.NO);

                    var activeLayer = app.activeDocument.activeLayer;

                    if (layerSection == "layerSectionContent") {
                        if (!isAdjustmentLayer(activeLayer)) {
                            var layer = { layer: activeLayer, parent: currentGroup };
                            var isLayerVisible = prefs.visibleOnly && layerVisible
                            var isGroupVisible = isLayerVisible && currentGroup && currentGroup.visible;
                            var noGroupJustLayer = isLayerVisible && !currentGroup;
                            var exportAll = !prefs.visibleOnly;
                            if(isGroupVisible || noGroupJustLayer || exportAll) {
                                layers.push(layer);
                            }
                            if (layerVisible && visibleInGroup[visibleInGroup.length - 1]) {
                                visibleLayers.push(layer);
                            }
                            if (selected > 0 && (isLayerVisible || exportAll)) {
                                selectedLayers.push(layer);
                            }
                            if (currentGroup) {
                                currentGroup.children.push(layer);
                            }
                        }
                    } else {
                        var group = { layer: activeLayer, parent: currentGroup, children: [] };
                        group.visible = (layerVisible && visibleInGroup[visibleInGroup.length - 1]);
                        if (group.parent == null) {
                            groups.push(group);
                        } else {
                            group.parent.children.push(group);
                        }
                        currentGroup = group;
                        visibleInGroup.push(group.visible);
                        // Only check for selected groups. In CS2, 1 and only 1 layer/group is always selected (active).
                        // It is useless to export just 1 art layer, so only layer groups (sets) are supported.
                        if ((selectionIdx == i) || (selected > 0)) {
                            selected++;
                            group.selected = true;
                        }
                    }
                } else if (layerSection == "layerSectionEnd") {
                    currentGroup = currentGroup.parent;
                    visibleInGroup.pop();
                    if (selected > 0) {
                        selected--;
                    }
                }

                if (progressBarWindow && ((i % FEW_LAYERS == 0) || (i == layerCount))) {
                    updateProgressBar(progressBarWindow);
                    repaintProgressBar(progressBarWindow);
                    if (userCancelled) {
                        throw new Error("cancel");
                    }
                }
            }

            // Collect the background.
            ref = new ActionReference();
            ref.putIndex(idLyr, 0);
            try {
                desc = app.executeActionGet(ref);
                var bg = app.activeDocument.backgroundLayer;
                var layer = { layer: bg, parent: null };
                layers.push(layer);
                if (bg.visible) {
                    visibleLayers.push(layer);
                }

                if (progressBarWindow) {
                    updateProgressBar(progressBarWindow);
                    repaintProgressBar(progressBarWindow);
                }
            } catch (e) {
                // no background, move on
            }
        } catch (e) {
            if (e.message != "cancel") throw e;
        }

        if (progressBarWindow) {
            progressBarWindow.hide();
        }
    }

    return { layers: layers, visibleLayers: visibleLayers, selectedLayers: selectedLayers, groups: groups };
}

function countLayersAM(progressBarWindow) {
    var layerCount = 0;
    var preciseLayerCount = 0;
    var visLayerCount = 0;
    var selLayerCount = 0;

    var ref = null;
    var desc = null;

    var idOrdn = app.charIDToTypeID("Ordn");
    var idLyr = app.charIDToTypeID("Lyr ");

    // Get layer count reported by the active Document object - it never includes the background.
    ref = new ActionReference();
    ref.putEnumerated(app.charIDToTypeID("Dcmn"), app.charIDToTypeID("Ordn"), app.charIDToTypeID("Trgt"));
    desc = app.executeActionGet(ref);
    layerCount = desc.getInteger(app.charIDToTypeID("NmbL"));

    // Query current selection.
    ref = new ActionReference();
    ref.putEnumerated(idLyr, idOrdn, app.charIDToTypeID("Trgt"));
    var selectionDesc = app.executeActionGet(ref);
    // Something is always selected even if nothing is selected in GUI.
    var selectionIdx = selectionDesc.getInteger(app.charIDToTypeID("ItmI"));

    if (layerCount == 0) {
        // This is a flattened image that contains only the background (which is always visible).
        preciseLayerCount = 1;
        visLayerCount = 1;
    } else {
        // There are more layers that may or may not contain a background. The background is always at 0;
        // other layers are indexed from 1.

        var idLayerSection = app.stringIDToTypeID("layerSection");
        var idVsbl = app.charIDToTypeID("Vsbl");
        var idNull = app.charIDToTypeID("null");
        var idSlct = app.charIDToTypeID("slct");
        var idMkVs = app.charIDToTypeID("MkVs");

        var FEW_LAYERS = 10;

        if (progressBarWindow) {
            // The layer count is actually + 1 if there's a background present, but it should be no biggie.
            showProgressBar(progressBarWindow, "Counting layers... Might take up to several seconds.", (layerCount + FEW_LAYERS) / FEW_LAYERS);
        }

        try {
            // Collect normal layers.
            var visibleInGroup = [true];
            var layerVisible;
            var layerSection;
            var selected = 0;
            for (var i = layerCount; i >= 1; --i) {
                // check if it's an art layer (not a group) that can be selected
                ref = new ActionReference();
                ref.putIndex(idLyr, i);
                desc = app.executeActionGet(ref);
                layerVisible = desc.getBoolean(idVsbl);
                layerSection = app.typeIDToStringID(desc.getEnumerationValue(idLayerSection));
                if (layerSection == "layerSectionContent") {
                    preciseLayerCount++;
                    if (layerVisible && visibleInGroup[visibleInGroup.length - 1]) {
                        visLayerCount++;
                    }
                    if (selected > 0) {
                        selLayerCount++;
                    }
                } else if (layerSection == "layerSectionStart") {
                    visibleInGroup.push(layerVisible && visibleInGroup[visibleInGroup.length - 1]);
                    // Only check for selected groups. In CS2, 1 and only 1 layer/group is always selected (active).
                    // It is useless to export just 1 art layer, so only layer groups (sets) are supported.
                    if ((selectionIdx == i) || (selected > 0)) {
                        selected++;
                    }
                } else if (layerSection == "layerSectionEnd") {
                    visibleInGroup.pop();
                    if (selected > 0) {
                        selected--;
                    }
                }

                if (progressBarWindow && ((i % FEW_LAYERS == 0) || (i == layerCount))) {
                    updateProgressBar(progressBarWindow);
                    repaintProgressBar(progressBarWindow);
                    if (userCancelled) {
                        throw new Error("cancel");
                    }
                }
            }

            // Collect the background.
            try {
                var bg = app.activeDocument.backgroundLayer;
                preciseLayerCount++;
                if (bg.visible) {
                    visLayerCount++;
                }

                if (progressBarWindow) {
                    updateProgressBar(progressBarWindow);
                    repaintProgressBar(progressBarWindow);
                }
            } catch (e) {
                // no background, move on
            }
        } catch (e) {
            if (e.message != "cancel") throw e;
        }

        if (progressBarWindow) {
            progressBarWindow.hide();
        }
    }

    return { layerCount: preciseLayerCount, visibleLayerCount: visLayerCount, selectedLayerCount: selLayerCount };
}

function exportPng24AM(fileName, options) {
    var desc = new ActionDescriptor(),
        desc2 = new ActionDescriptor();
    desc2.putEnumerated(app.charIDToTypeID("Op  "), app.charIDToTypeID("SWOp"), app.charIDToTypeID("OpSa"));
    desc2.putEnumerated(app.charIDToTypeID("Fmt "), app.charIDToTypeID("IRFm"), app.charIDToTypeID("PN24"));
    desc2.putBoolean(app.charIDToTypeID("Intr"), options.interlaced);
    desc2.putBoolean(app.charIDToTypeID("Trns"), options.transparency);
    desc2.putBoolean(app.charIDToTypeID("Mtt "), true);
    desc2.putInteger(app.charIDToTypeID("MttR"), options.matteColor.red);
    desc2.putInteger(app.charIDToTypeID("MttG"), options.matteColor.green);
    desc2.putInteger(app.charIDToTypeID("MttB"), options.matteColor.blue);
    desc2.putBoolean(app.charIDToTypeID("SHTM"), false);
    desc2.putBoolean(app.charIDToTypeID("SImg"), true);
    desc2.putBoolean(app.charIDToTypeID("SSSO"), false);
    desc2.putList(app.charIDToTypeID("SSLt"), new ActionList());
    desc2.putBoolean(app.charIDToTypeID("DIDr"), false);
    desc2.putPath(app.charIDToTypeID("In  "), new File(fileName));
    desc.putObject(app.charIDToTypeID("Usng"), app.stringIDToTypeID("SaveForWeb"), desc2);
    app.executeAction(app.charIDToTypeID("Expr"), desc, DialogModes.NO);
}

function exportPng8AM(fileName, options) {
    var id5 = app.charIDToTypeID("Expr");
    var desc3 = new ActionDescriptor();
    var id6 = app.charIDToTypeID("Usng");
    var desc4 = new ActionDescriptor();
    var id7 = app.charIDToTypeID("Op  ");
    var id8 = app.charIDToTypeID("SWOp");
    var id9 = app.charIDToTypeID("OpSa");
    desc4.putEnumerated(id7, id8, id9);
    var id10 = app.charIDToTypeID("Fmt ");
    var id11 = app.charIDToTypeID("IRFm");
    var id12 = app.charIDToTypeID("PNG8");
    desc4.putEnumerated(id10, id11, id12);
    var id13 = app.charIDToTypeID("Intr"); //Interlaced
    desc4.putBoolean(id13, options.interlaced);
    var id14 = app.charIDToTypeID("RedA");
    var id15 = app.charIDToTypeID("IRRd");
    //Algorithm
    var id16;
    switch (options.colorReduction) {

        case ColorReductionType.PERCEPTUAL:
            id16 = app.charIDToTypeID("Prcp");
            break;

        case ColorReductionType.SELECTIVE:
            id16 = app.charIDToTypeID("Sltv");
            break;

        case ColorReductionType.ADAPTIVE:
            id16 = app.charIDToTypeID("Adpt");
            break;

        case ColorReductionType.RESTRICTIVE:
            id16 = app.charIDToTypeID("Web ");
            break;

            // CUSTOM not supported

        case ColorReductionType.BLACKWHITE:
        case ColorReductionType.GRAYSCALE:
        case ColorReductionType.MACINTOSH:
        case ColorReductionType.WINDOWS:
            id16 = app.charIDToTypeID("FlBs");
            break;

        default:
            throw new Error("Unknown color reduction algorithm. Cannot export PNG-8!");
    }
    desc4.putEnumerated(id14, id15, id16);
    var id361 = app.charIDToTypeID("FBPl");
    switch (options.colorReduction) {

        case ColorReductionType.BLACKWHITE:
            desc4.putString(id361, "Black & White");
            break;

        case ColorReductionType.GRAYSCALE:
            desc4.putString(id361, "Grayscale");
            break;

        case ColorReductionType.MACINTOSH:
            desc4.putString(id361, "Mac OS");
            break;

        case ColorReductionType.WINDOWS:
            desc4.putString(id361, "Windows");
            break;
    }
    var id17 = app.charIDToTypeID("RChT");
    desc4.putBoolean(id17, false);
    var id18 = app.charIDToTypeID("RChV");
    desc4.putBoolean(id18, false);
    var id19 = app.charIDToTypeID("AuRd");
    desc4.putBoolean(id19, false);
    var id20 = app.charIDToTypeID("NCol"); //NO. Of Colors
    desc4.putInteger(id20, options.colors);
    var id21 = app.charIDToTypeID("Dthr"); //Dither
    var id22 = app.charIDToTypeID("IRDt");
    //Dither type
    var id23;
    switch (options.dither) {

        case Dither.NONE:
            id23 = app.charIDToTypeID("None");
            break;

        case Dither.DIFFUSION:
            id23 = app.charIDToTypeID("Dfsn");
            break;

        case Dither.PATTERN:
            id23 = app.charIDToTypeID("Ptrn");
            break;

        case Dither.NOISE:
            id23 = app.charIDToTypeID("BNoi");
            break;

        default:
            throw new Error("Unknown dither type. Cannot export PNG-8!");
    }
    desc4.putEnumerated(id21, id22, id23);
    var id24 = app.charIDToTypeID("DthA");
    desc4.putInteger(id24, options.ditherAmount);
    var id25 = app.charIDToTypeID("DChS");
    desc4.putInteger(id25, 0);
    var id26 = app.charIDToTypeID("DCUI");
    desc4.putInteger(id26, 0);
    var id27 = app.charIDToTypeID("DChT");
    desc4.putBoolean(id27, false);
    var id28 = app.charIDToTypeID("DChV");
    desc4.putBoolean(id28, false);
    var id29 = app.charIDToTypeID("WebS");
    desc4.putInteger(id29, 0);
    var id30 = app.charIDToTypeID("TDth"); //transparency dither
    var id31 = app.charIDToTypeID("IRDt");
    var id32;
    switch (options.transparencyDither) {

        case Dither.NONE:
            id32 = app.charIDToTypeID("None");
            break;

        case Dither.DIFFUSION:
            id32 = app.charIDToTypeID("Dfsn");
            break;

        case Dither.PATTERN:
            id32 = app.charIDToTypeID("Ptrn");
            break;

        case Dither.NOISE:
            id32 = app.charIDToTypeID("BNoi");
            break;

        default:
            throw new Error("Unknown transparency dither algorithm. Cannot export PNG-8!");
    }
    desc4.putEnumerated(id30, id31, id32);
    var id33 = app.charIDToTypeID("TDtA");
    desc4.putInteger(id33, options.transparencyAmount);
    var id34 = app.charIDToTypeID("Trns"); //Transparency
    desc4.putBoolean(id34, options.transparency);
    var id35 = app.charIDToTypeID("Mtt ");
    desc4.putBoolean(id35, true); //matte
    var id36 = app.charIDToTypeID("MttR"); //matte color
    desc4.putInteger(id36, options.matteColor.red);
    var id37 = app.charIDToTypeID("MttG");
    desc4.putInteger(id37, options.matteColor.green);
    var id38 = app.charIDToTypeID("MttB");
    desc4.putInteger(id38, options.matteColor.blue);
    var id39 = app.charIDToTypeID("SHTM");
    desc4.putBoolean(id39, false);
    var id40 = app.charIDToTypeID("SImg");
    desc4.putBoolean(id40, true);
    var id41 = app.charIDToTypeID("SSSO");
    desc4.putBoolean(id41, false);
    var id42 = app.charIDToTypeID("SSLt");
    var list1 = new ActionList();
    desc4.putList(id42, list1);
    var id43 = app.charIDToTypeID("DIDr");
    desc4.putBoolean(id43, false);
    var id44 = app.charIDToTypeID("In  ");
    desc4.putPath(id44, new File(fileName));
    var id45 = app.stringIDToTypeID("SaveForWeb");
    desc3.putObject(id6, id45, desc4);
    app.executeAction(id5, desc3, DialogModes.NO);
}

//
// Utilities
//

function padder(input, padLength) {
    // pad the input with zeroes up to indicated length
    var length = padLength + 1 - input.toString().length;
    var result = (new Array(Math.max(length, 0))).join('0') + input;
    return result;
}

function makeValidFileName(fileName, useDelimiter, ignoreTrim) {
    // ignoreTrim is used for prefix/suffix so they can add a leading/trailing space in if they want
    var validName = ignoreTrim ? fileName : fileName.replace(/^\s+|\s+$/gm, ''); // trim spaces
    validName = validName.replace(/[\\\*\/\?:"\|<>]/g, ''); // remove characters not allowed in a file name
    if (useDelimiter && prefs.delimiter.length > 0) {
        validName = validName.replace(/[ ]/g, prefs.delimiter); // replace spaces with chosen delimiter, since some programs still may have troubles with them
    }
    return validName;
}

function makeValidDelimiter(delimiter) {
    return delimiter.replace(/[\\\/\*\?\|\.:"<>%,;=]/g, '');
}

function formatString(text) {
    var args = Array.prototype.slice.call(arguments, 1);
    return text.replace(/\{(\d+)\}/g, function(match, number) {
        return (typeof args[number] != 'undefined') ? args[number] : match;
    });
}

var history;

function storeHistory() {
    history = app.activeDocument.activeHistoryState;
}

function restoreHistory() {
    app.activeDocument.activeHistoryState = history;
}

function indexOf(array, element) {
    var index = -1;
    for (var i = 0; i < array.length; ++i) {
        if (array[i] === element) {
            index = i;
            break;
        }
    }
    return index;
}

function loadResource(file) {
    var rsrcString;
    if (!file.exists) {
        alert("Resource file '" + file.name + "' for the export dialog is missing! Please, download the rest of the files that come with this script.", "Error", true);
        return false;
    }
    try {
        file.open("r");
        if (file.error) throw file.error;
        rsrcString = file.read();
        if (file.error) throw file.error;
        if (!file.close()) {
            throw file.error;
        }
    } catch (error) {
        alert("Failed to read the resource file '" + file.name + "'!\n\nReason: " + error + "\n\nPlease, check it's available for reading and redownload it in case it became corrupted.", "Error", true);
        return false;
    }

    return rsrcString;
}

function Profiler(enabled) {
    this.enabled = enabled;
    if (this.enabled) {
        this.startTime = new Date();
        this.lastTime = this.startTime;
    }
}

function defineProfilerMethods() {
    Profiler.prototype.getDuration = function(rememberAsLastCall, sinceLastCall) {
        if (this.enabled) {
            var currentTime = new Date();
            var lastTime = sinceLastCall ? this.lastTime : this.startTime;
            if (rememberAsLastCall) {
                this.lastTime = currentTime;
            }
            return new Date(currentTime.getTime() - lastTime.getTime());
        }
    }

    Profiler.prototype.resetLastTime = function() {
        this.lastTime = new Date();
    };

    Profiler.prototype.format = function(duration) {
        var output = padder(duration.getUTCHours(), 2) + ":";
        output += padder(duration.getUTCMinutes(), 2) + ":";
        output += padder(duration.getUTCSeconds(), 2) + ".";
        output += padder(duration.getUTCMilliseconds(), 3);
        return output;
    };
}

function getDialogFields(dialog) {
    return {
        btnBrowse: dialog.findElement("btnBrowse"),
        txtDestination: dialog.findElement("txtDestination"),

        radioAll: dialog.findElement("radioAll"),
        radioSelected: dialog.findElement("radioSelected"),
        cbVisibleOnly: dialog.findElement("cbVisibleOnly"),
        cbVisibleOnlyTop: dialog.findElement("cbVisibleOnlyTop"),
        cbIgnorePrefix: dialog.findElement("cbIgnorePrefix"),
        txtIgnorePrefix: dialog.findElement("txtIgnorePrefix"),

        ddNameAs: dialog.findElement("ddNameAs"),
        cbDelimiter: dialog.findElement("cbDelimiter"),
        txtDelimiter: dialog.findElement("txtDelimiter"),
        ddLetterCasing: dialog.findElement("ddLetterCasing"),
        txtPrefix: dialog.findElement("txtPrefix"),
        txtSuffix: dialog.findElement("txtSuffix"),

        btnRun: dialog.findElement("btnRun"),
        btnCancel: dialog.findElement("btnCancel"),
        btnSaveAndCancel: dialog.findElement("btnSaveAndCancel"),
        cbOverwriteFiles: dialog.findElement("cbOverwriteFiles"),
        cbSilent: dialog.findElement("cbSilent"),

        cbGroupsAsFolders: dialog.findElement("cbGroupsAsFolders"),
        cbTopGroupsAsFolders: dialog.findElement("cbTopGroupsAsFolders"),

        cbForeground: dialog.findElement("cbForeground"),
        cbBackground: dialog.findElement("cbBackground"),

        cbTrim: dialog.findElement("cbTrim"),
        ddTrim: dialog.findElement("ddTrim"),

        cbPadding: dialog.findElement("cbPadding"),
        grpPaddingLabel: dialog.findElement("grpPaddingLabel"),
        txtPadding: dialog.findElement("txtPadding"),

        cbScale: dialog.findElement("cbScale"),
        grpScaleLabel: dialog.findElement("grpScaleLabel"),
        txtScale: dialog.findElement("txtScale"),

        tabpnlExportOptions: dialog.findElement("tabpnlExportOptions"),
        // PNG 24
        grpPng24Matte: dialog.findElement("grpPng24Matte"),
        ddPng24Matte: dialog.findElement("ddPng24Matte"),
        cbPng24Transparency: dialog.findElement("cbPng24Transparency"),
        cbPng24Interlaced: dialog.findElement("cbPng24Interlaced"),
        // PNG 8
        ddPng8ColorReduction: dialog.findElement("ddPng8ColorReduction"),
        txtPng8NumberofColors: dialog.findElement("txtPng8NumberofColors"),
        ddPng8Dither: dialog.findElement("ddPng8Dither"),
        grpPng8DitherSlider: dialog.findElement("grpPng8DitherSlider"),
        sldrPng8Dither: dialog.findElement("sldrPng8Dither"),
        lblPng8DitherValue: dialog.findElement("lblPng8DitherValue"),
        ddPng8Matte: dialog.findElement("ddPng8Matte"),
        cbPng8Transparency: dialog.findElement("cbPng8Transparency"),
        grpPng8TransparencyDither: dialog.findElement("grpPng8TransparencyDither"),
        ddPng8TransparencyDither: dialog.findElement("ddPng8TransparencyDither"),
        sldrPng8TransparencyDither: dialog.findElement("sldrPng8TransparencyDither"),
        lblPng8TransparencyDitherValue: dialog.findElement("lblPng8TransparencyDitherValue"),
        cbPng8Interlaced: dialog.findElement("cbPng8Interlaced"),
        // JPG
        sldrJpgQuality: dialog.findElement("sldrJpgQuality"),
        lblJpgQualityValue: dialog.findElement("lblJpgQualityValue"),
        ddJpgMatte: dialog.findElement("ddJpgMatte"),
        cbJpgIcc: dialog.findElement("cbJpgIcc"),
        cbJpgOptimized: dialog.findElement("cbJpgOptimized"),
        cbJpgProgressive: dialog.findElement("cbJpgProgressive"),
        // TIF
        grpTifQuality: dialog.findElement("grpTifQuality"),
        sldrTifQuality: dialog.findElement("sldrTifQuality"),
        lblTifQualityValue: dialog.findElement("lblTifQualityValue"),
        ddTifEncoding: dialog.findElement("ddTifEncoding"),
        cbTifWithAlpha: dialog.findElement("cbTifWithAlpha"),
        cbTifIcc: dialog.findElement("cbTifIcc"),
        cbTifTransparency: dialog.findElement("cbTifTransparency"),
        // PDF
        ddPdfStandard: dialog.findElement("ddPdfStandard"),
        ddPdfCompatibility: dialog.findElement("ddPdfCompatibility"),
        grpPdfQuality: dialog.findElement("grpPdfQuality"),
        sldrPdfQuality: dialog.findElement("sldrPdfQuality"),
        lblPdfQualityValue: dialog.findElement("lblPdfQualityValue"),
        ddPdfEncoding: dialog.findElement("ddPdfEncoding"),
        cbPdfWithAlpha: dialog.findElement("cbPdfWithAlpha"),
        cbPdfIcc: dialog.findElement("cbPdfIcc"),
        cbPdfColorConversion: dialog.findElement("cbPdfColorConversion"),
        grpPdfDestinationProfile: dialog.findElement("grpPdfDestinationProfile"),
        ddPdfDestinationProfile: dialog.findElement("ddPdfDestinationProfile"),
        grpPdfDownSampleSize: dialog.findElement("grpPdfDownSampleSize"),
        ddPdfDownSample: dialog.findElement("ddPdfDownSample"),
        txtPdfDownSampleSize: dialog.findElement("txtPdfDownSampleSize"),
        txtPdfDownSampleSizeLimit: dialog.findElement("txtPdfDownSampleSizeLimit"),
        // TGA
        ddTgaDepth: dialog.findElement("ddTgaDepth"),
        cbTgaWithAlpha: dialog.findElement("cbTgaWithAlpha"),
        cbTgaRleCompression: dialog.findElement("cbTgaRleCompression"),
        // BMP
        ddBmpDepth: dialog.findElement("ddBmpDepth"),
        cbBmpWithAlpha: dialog.findElement("cbBmpWithAlpha"),
        cbBmpRleCompression: dialog.findElement("cbBmpRleCompression"),
        cbBmpFlipRowOrder: dialog.findElement("cbBmpFlipRowOrder"),

        lblMetadata: dialog.findElement("lblMetadata"),

        cbCsvEnabled: dialog.findElement("cbCsvEnabled"),
        txtCsvPath: dialog.findElement("txtCsvPath"),
        btnBrowseCsv: dialog.findElement("btnBrowseCsv"),
        cbCsvManifestDebug: dialog.findElement("cbCsvManifestDebug"),
    }
}

function makeMainDialog() {    
    // DIALOG
    // ======
    var dialog = CSV_FOCUSED_UI
        ? new Window("dialog", undefined, [0, 0, 460, 420], {closeButton: true, resizeable: true})
        : new Window("dialog", undefined, undefined, {closeButton: false, resizeable: true});
    dialog.text = CSV_FOCUSED_UI ? "CSV Manifest Export" : "Export Layers To Files v2.7.1";
    dialog.orientation = "column"; 
    // CSV mode: top-align so the visible panel stays at the top; center/center stacks oddly with a hidden sibling.
    dialog.alignChildren = CSV_FOCUSED_UI ? ["fill", "top"] : ["center", "center"];
    dialog.spacing = CSV_FOCUSED_UI ? 4 : 5;
    dialog.margins = CSV_FOCUSED_UI ? [8, 8, 8, 8] : [10, 10, 10, 5];

    var grpLegacyHidden = null;
    var legacyCol = null;
    var pnlCsvExport = null;
    var grpColContainer = null;
    var grpCol1 = null;
    var grpCol2 = null;
    var pnlDestination = null;

    if (CSV_FOCUSED_UI) {
        // Visible panel must be the first dialog child: on macOS, an invisible legacy group still
        // participates in layout and can push content off-screen if listed first.
        pnlCsvExport = dialog.add("panel", undefined, undefined, {name: "pnlCsvExport"});
        pnlCsvExport.text = "CSV manifest export";
        pnlCsvExport.orientation = "column";
        pnlCsvExport.alignChildren = ["fill", "top"];
        pnlCsvExport.spacing = 6;
        pnlCsvExport.margins = 8;
        pnlCsvExport.alignment = ["fill", "top"];

        grpLegacyHidden = dialog.add("group", undefined, {name: "grpLegacyHidden"});
        grpLegacyHidden.visible = false;
        grpLegacyHidden.margins = 0;
        legacyCol = grpLegacyHidden.add("group");
        legacyCol.orientation = "column";
        legacyCol.alignChildren = ["left", "top"];
        legacyCol.spacing = 6;
    } else {
        // GRPCOLCONTAINER
        grpColContainer = dialog.add("group", undefined, {name: "grpColContainer"});
        grpColContainer.orientation = "row";
        grpColContainer.alignChildren = ["center","center"];
        grpColContainer.spacing = 10;
        grpColContainer.margins = 0;

        grpCol1 = grpColContainer.add("group", undefined, {name: "grpCol1"});
        grpCol1.orientation = "column";
        grpCol1.alignChildren = ["left","center"];
        grpCol1.spacing = 17;
        grpCol1.margins = 0;
        grpCol1.alignment = ["center","top"];

        pnlDestination = grpCol1.add("panel", undefined, undefined, {name: "pnlDestination"});
        pnlDestination.text = "Output destination & format";
        pnlDestination.orientation = "column";
        pnlDestination.alignChildren = ["fill", "top"];
        pnlDestination.spacing = 8;
        pnlDestination.margins = 10;
        pnlDestination.alignment = ["fill", "center"];

        grpCol2 = grpColContainer.add("group", undefined, {name: "grpCol2"});
        grpCol2.orientation = "column";
        grpCol2.alignChildren = ["left","center"];
        grpCol2.spacing = 10;
        grpCol2.margins = 0;
        grpCol2.alignment = ["center","top"];
    }

    var formatActionsParent = CSV_FOCUSED_UI ? pnlCsvExport : pnlDestination;

    // PNLEXPORT
    // =========
    var pnlExport = (CSV_FOCUSED_UI ? legacyCol : grpCol1).add("panel", undefined, undefined, {name: "pnlExport"}); 
    pnlExport.text = "Export"; 
    pnlExport.orientation = "column"; 
    pnlExport.alignChildren = ["left","top"]; 
    pnlExport.spacing = 11; 
    pnlExport.margins = 10; 
    pnlExport.alignment = ["fill","center"]; 

    // GRPEXPORT
    // =========
    var grpExport = pnlExport.add("group", undefined, {name: "grpExport"}); 
    grpExport.orientation = "row"; 
    grpExport.alignChildren = ["left","center"]; 
    grpExport.spacing = 10; 
    grpExport.margins = 0; 

    var radioAll = grpExport.add("radiobutton", undefined, undefined, {name: "radioAll"}); 
    radioAll.helpTip = "Exports all layers"; 
    radioAll.text = "All Layers"; 
    radioAll.value = true; 

    var radioSelected = grpExport.add("radiobutton", undefined, undefined, {name: "radioSelected"}); 
    radioSelected.helpTip = "Only exports selected group. Must select a group to be enabled."; 
    radioSelected.text = "Selected Group"; 

    // GRPIGNORE
    // =========
    var grpIgnore = pnlExport.add("group", undefined, {name: "grpIgnore"}); 
    grpIgnore.orientation = "column"; 
    grpIgnore.alignChildren = ["left","center"]; 
    grpIgnore.spacing = 5; 
    grpIgnore.margins = 0; 

    var cbVisibleOnly = grpIgnore.add("checkbox", undefined, undefined, {name: "cbVisibleOnly"}); 
    cbVisibleOnly.helpTip = "Whether to export only visible layers"; 
    cbVisibleOnly.text = "Visible Only"; 

    // GRPIGNOREPREFIX
    // ===============
    var grpIgnorePrefix = grpIgnore.add("group", undefined, {name: "grpIgnorePrefix"}); 
    grpIgnorePrefix.orientation = "row"; 
    grpIgnorePrefix.alignChildren = ["left","center"]; 
    grpIgnorePrefix.spacing = 10; 
    grpIgnorePrefix.margins = 0; 

    var cbIgnorePrefix = grpIgnorePrefix.add("checkbox", undefined, undefined, {name: "cbIgnorePrefix"}); 
    cbIgnorePrefix.helpTip = "Ignore layers starting with"; 
    cbIgnorePrefix.text = "Ignore Layers Starting With "; 

    var txtIgnorePrefix = grpIgnorePrefix.add('edittext {properties: {name: "txtIgnorePrefix"}}'); 
    txtIgnorePrefix.helpTip = "The prefix to match against"; 
    txtIgnorePrefix.text = "!"; 
    txtIgnorePrefix.preferredSize.width = 31; 

    // PNLNAMEFILES
    // ============
    var pnlNameFiles = (CSV_FOCUSED_UI ? legacyCol : grpCol1).add("panel", undefined, undefined, {name: "pnlNameFiles"}); 
    pnlNameFiles.text = "Filenames"; 
    pnlNameFiles.orientation = "column"; 
    pnlNameFiles.alignChildren = ["left","top"]; 
    pnlNameFiles.spacing = 4; 
    pnlNameFiles.margins = [10,10,10,10]; 
    pnlNameFiles.alignment = ["fill","center"]; 

    var ddNameAs_array = ["Use layer name (strip extension)","Use layer name (keep extension)","Use layer and parent group names","Use index descending","Use index ascending"]; 
    var ddNameAs = pnlNameFiles.add("dropdownlist", undefined, undefined, {name: "ddNameAs", items: ddNameAs_array}); 
    ddNameAs.selection = 0; 

    // GRPDELIMITER
    // ============
    var grpDelimiter = pnlNameFiles.add("group", undefined, {name: "grpDelimiter"}); 
    grpDelimiter.orientation = "row"; 
    grpDelimiter.alignChildren = ["left","center"]; 
    grpDelimiter.spacing = 10; 
    grpDelimiter.margins = 0; 

    var cbDelimiter = grpDelimiter.add("checkbox", undefined, undefined, {name: "cbDelimiter"}); 
    cbDelimiter.helpTip = "Whether to use a custom delimiter between words"; 
    cbDelimiter.text = "Use Custom Delimiter"; 

    var txtDelimiter = grpDelimiter.add('edittext {properties: {name: "txtDelimiter"}}'); 
    txtDelimiter.helpTip = "The delimiter to use between words"; 
    txtDelimiter.text = "_"; 
    txtDelimiter.preferredSize.width = 22; 

    // GRPCASING
    // =========
    var grpCasing = pnlNameFiles.add("group", undefined, {name: "grpCasing"}); 
    grpCasing.orientation = "row"; 
    grpCasing.alignChildren = ["left","center"]; 
    grpCasing.spacing = 10; 
    grpCasing.margins = 0; 

    var lblLetterCasing = grpCasing.add("statictext", undefined, undefined, {name: "lblLetterCasing"}); 
    lblLetterCasing.text = "Letter Casing"; 

    var ddLetterCasing_array = ["Keep","Lowercase","Uppercase"]; 
    var ddLetterCasing = grpCasing.add("dropdownlist", undefined, undefined, {name: "ddLetterCasing", items: ddLetterCasing_array}); 
    ddLetterCasing.selection = 0; 

    // GRPPREFIXSUFFIXWRAPPER
    // ======================
    var grpPrefixSuffixWrapper = pnlNameFiles.add("group", undefined, {name: "grpPrefixSuffixWrapper"}); 
    grpPrefixSuffixWrapper.orientation = "column"; 
    grpPrefixSuffixWrapper.alignChildren = ["left","center"]; 
    grpPrefixSuffixWrapper.spacing = 0; 
    grpPrefixSuffixWrapper.margins = 0; 

    // GRPPREFIXSUFFIXLABEL
    // ====================
    var grpPrefixSuffixLabel = grpPrefixSuffixWrapper.add("group", undefined, {name: "grpPrefixSuffixLabel"}); 
    grpPrefixSuffixLabel.orientation = "row"; 
    grpPrefixSuffixLabel.alignChildren = ["left","center"]; 
    grpPrefixSuffixLabel.spacing = 81; 
    grpPrefixSuffixLabel.margins = [0,0,0,0]; 

    var lblPrefix = grpPrefixSuffixLabel.add("statictext", undefined, undefined, {name: "lblPrefix"}); 
    lblPrefix.text = "Prefix"; 
    lblPrefix.alignment = ["left","center"]; 

    var lblSuffix = grpPrefixSuffixLabel.add("statictext", undefined, undefined, {name: "lblSuffix"}); 
    lblSuffix.text = "Suffix"; 

    // GRPPREFIXSUFFIX
    // ===============
    var grpPrefixSuffix = grpPrefixSuffixWrapper.add("group", undefined, {name: "grpPrefixSuffix"}); 
    grpPrefixSuffix.orientation = "row"; 
    grpPrefixSuffix.alignChildren = ["left","center"]; 
    grpPrefixSuffix.spacing = 2; 
    grpPrefixSuffix.margins = 0; 

    var txtPrefix = grpPrefixSuffix.add('edittext {properties: {name: "txtPrefix"}}'); 
    txtPrefix.helpTip = "Prefix will be added before every layer name"; 
    txtPrefix.preferredSize.width = 100; 

    var lblEllipsis = grpPrefixSuffix.add("statictext", undefined, undefined, {name: "lblEllipsis"}); 
    lblEllipsis.text = "..."; 

    var txtSuffix = grpPrefixSuffix.add('edittext {properties: {name: "txtSuffix"}}'); 
    txtSuffix.helpTip = "Suffix will be added after every layer name"; 
    txtSuffix.preferredSize.width = 100; 

    // PNLOUTPUT
    // =========
    var pnlOutput = (CSV_FOCUSED_UI ? legacyCol : grpCol2).add("panel", undefined, undefined, {name: "pnlOutput"}); 
    pnlOutput.text = "Output Options"; 
    pnlOutput.orientation = "column"; 
    pnlOutput.alignChildren = ["left","top"]; 
    pnlOutput.spacing = 10; 
    pnlOutput.margins = 10; 
    pnlOutput.alignment = ["fill","center"]; 

    // GRPGROUPSAS
    // ===========
    var grpGroupsAs = pnlOutput.add("group", undefined, {name: "grpGroupsAs"}); 
    grpGroupsAs.orientation = "column"; 
    grpGroupsAs.alignChildren = ["left","center"]; 
    grpGroupsAs.spacing = 5; 
    grpGroupsAs.margins = 0; 

    var cbGroupsAsFolders = grpGroupsAs.add("checkbox", undefined, undefined, {name: "cbGroupsAsFolders"}); 
    cbGroupsAsFolders.helpTip = "Groups and sub-groups are saved as directories."; 
    cbGroupsAsFolders.text = "Groups as Folders"; 

    var cbTopGroupsAsFolders = grpGroupsAs.add("checkbox", undefined, undefined, {name: "cbTopGroupsAsFolders"});
    cbTopGroupsAsFolders.helpTip = "Groups are saved as directories. Layers in nested groups will be saved in their topmost group.";
    cbTopGroupsAsFolders.text = "Top Groups as Folders";

    // PNLOUTPUT
    // =========
    var dvdrOutput = pnlOutput.add("panel", undefined, undefined, {name: "dvdrOutput"}); 
    dvdrOutput.alignment = "fill"; 

    // GRPFOREGROUNDBACKGROUND
    // =======================
    var grpForegroundBackground = pnlOutput.add("group", undefined, {name: "grpForegroundBackground"}); 
    grpForegroundBackground.orientation = "column"; 
    grpForegroundBackground.alignChildren = ["left","center"]; 
    grpForegroundBackground.spacing = 5; 
    grpForegroundBackground.margins = 0; 

    var cbForeground = grpForegroundBackground.add("checkbox", undefined, undefined, {name: "cbForeground"}); 
    cbForeground.helpTip = "The top layer will be used as a foreground in every export."; 
    cbForeground.text = "Top Layer as Foreground"; 

    var cbBackground = grpForegroundBackground.add("checkbox", undefined, undefined, {name: "cbBackground"}); 
    cbBackground.helpTip = "The bottom layer will be used as a background in every export."; 
    cbBackground.text = "Bottom Layer as Background"; 

    // PNLMODIFYLAYERS
    // ===============
    var pnlModifyLayers = (CSV_FOCUSED_UI ? legacyCol : grpCol2).add("panel", undefined, undefined, {name: "pnlModifyLayers"}); 
    pnlModifyLayers.text = "Modify Layers"; 
    pnlModifyLayers.orientation = "column"; 
    pnlModifyLayers.alignChildren = ["left","top"]; 
    pnlModifyLayers.spacing = 5; 
    pnlModifyLayers.margins = 10; 
    pnlModifyLayers.alignment = ["fill","center"]; 

    // GRPTRIM
    // =======
    var grpTrim = pnlModifyLayers.add("group", undefined, {name: "grpTrim"}); 
    grpTrim.orientation = "row"; 
    grpTrim.alignChildren = ["left","center"]; 
    grpTrim.spacing = 10; 
    grpTrim.margins = 0; 

    var cbTrim = grpTrim.add("checkbox", undefined, undefined, {name: "cbTrim"}); 
    cbTrim.helpTip = "Whether to trim before export"; 
    cbTrim.text = "Trim"; 

    var ddTrim_array = ["Each Layer","Each Layer (use trim())","Combined"]; 
    var ddTrim = grpTrim.add("dropdownlist", undefined, undefined, {name: "ddTrim", items: ddTrim_array}); 
    ddTrim.selection = 0; 

    // GRPPADDING
    // ==========
    var grpPadding = pnlModifyLayers.add("group", undefined, {name: "grpPadding"}); 
    grpPadding.orientation = "row"; 
    grpPadding.alignChildren = ["left","center"]; 
    grpPadding.spacing = 10; 
    grpPadding.margins = 0; 

    var cbPadding = grpPadding.add("checkbox", undefined, undefined, {name: "cbPadding"}); 
    cbPadding.helpTip = "Whether to add padding to every layer before export"; 
    cbPadding.text = "Padding"; 

    // GRPPADDINGLABEL
    // ===============
    var grpPaddingLabel = grpPadding.add("group", undefined, {name: "grpPaddingLabel"}); 
    grpPaddingLabel.orientation = "row"; 
    grpPaddingLabel.alignChildren = ["left","center"]; 
    grpPaddingLabel.spacing = 0; 
    grpPaddingLabel.margins = 0; 

    var txtPadding = grpPaddingLabel.add('edittext {properties: {name: "txtPadding"}}'); 
    txtPadding.text = "0"; 
    txtPadding.preferredSize.width = 29; 

    var lblPadding = grpPaddingLabel.add("statictext", undefined, undefined, {name: "lblPadding"}); 
    lblPadding.text = "px"; 

    // GRPSCALE
    // ========
    var grpScale = pnlModifyLayers.add("group", undefined, {name: "grpScale"}); 
    grpScale.orientation = "row"; 
    grpScale.alignChildren = ["left","center"]; 
    grpScale.spacing = 10; 
    grpScale.margins = 0; 

    var cbScale = grpScale.add("checkbox", undefined, undefined, {name: "cbScale"}); 
    cbScale.helpTip = "Whether to scale every layer before export"; 
    cbScale.text = "Scale"; 

    // GRPSCALELABEL
    // =============
    var grpScaleLabel = grpScale.add("group", undefined, {name: "grpScaleLabel"}); 
    grpScaleLabel.orientation = "row"; 
    grpScaleLabel.alignChildren = ["left","center"]; 
    grpScaleLabel.spacing = 0; 
    grpScaleLabel.margins = 0; 

    var txtScale = grpScaleLabel.add('edittext {properties: {name: "txtScale"}}'); 
    txtScale.text = "100"; 
    txtScale.preferredSize.width = 36; 

    var lblScale = grpScaleLabel.add("statictext", undefined, undefined, {name: "lblScale"}); 
    lblScale.text = "%"; 

    // PNLEXPORTAS (under formatActionsParent: pnlDestination legacy, or pnlCsvExport)
    // ===========
    var pnlExportAs = formatActionsParent.add("panel", undefined, undefined, {name: "pnlExportAs", borderStyle: "none"}); 
    pnlExportAs.text = "Export As"; 
    pnlExportAs.orientation = "column"; 
    pnlExportAs.alignChildren = CSV_FOCUSED_UI ? ["fill", "top"] : ["center", "center"];
    pnlExportAs.spacing = CSV_FOCUSED_UI ? 6 : 10;
    pnlExportAs.margins = CSV_FOCUSED_UI ? [0, 4, 0, 0] : [0, 6, 0, 0];
    pnlExportAs.alignment = CSV_FOCUSED_UI ? ["fill", "top"] : ["fill", "center"];

    // TABPNLEXPORTOPTIONS
    // ===================
    var tabpnlExportOptions = pnlExportAs.add("tabbedpanel", undefined, undefined, {name: "tabpnlExportOptions"}); 
    tabpnlExportOptions.alignChildren = "fill"; 
    tabpnlExportOptions.preferredSize.width = 400;
    if (CSV_FOCUSED_UI) {
        tabpnlExportOptions.preferredSize.height = 260;
    }
    tabpnlExportOptions.margins = 0; 
    tabpnlExportOptions.alignment = CSV_FOCUSED_UI ? ["fill", "top"] : ["fill", "center"];

    // TABPNG24
    // ========
    var tabPng24 = tabpnlExportOptions.add("tab", undefined, undefined, {name: "tabPng24"}); 
    tabPng24.text = "PNG-24"; 
    tabPng24.orientation = "column"; 
    tabPng24.alignChildren = ["left","top"]; 
    tabPng24.spacing = 5; 
    tabPng24.margins = 10; 

    // GRPPNG24MATTE
    // =============
    var grpPng24Matte = tabPng24.add("group", undefined, {name: "grpPng24Matte"}); 
    grpPng24Matte.orientation = "row"; 
    grpPng24Matte.alignChildren = ["left","center"]; 
    grpPng24Matte.spacing = 10; 
    grpPng24Matte.margins = 0; 

    var lblPng24Matte = grpPng24Matte.add("statictext", undefined, undefined, {name: "lblPng24Matte"}); 
    lblPng24Matte.text = "Matte"; 

    var ddPng24Matte_array = ["White","Black","Gray","-","Background","Foreground"]; 
    var ddPng24Matte = grpPng24Matte.add("dropdownlist", undefined, undefined, {name: "ddPng24Matte", items: ddPng24Matte_array}); 
    ddPng24Matte.selection = 0; 

    // TABPNG24
    // ========
    var cbPng24Transparency = tabPng24.add("checkbox", undefined, undefined, {name: "cbPng24Transparency"}); 
    cbPng24Transparency.text = "Transparency"; 

    var cbPng24Interlaced = tabPng24.add("checkbox", undefined, undefined, {name: "cbPng24Interlaced"}); 
    cbPng24Interlaced.text = "Interlaced"; 

    // TABPNG8
    // =======
    var tabPng8 = tabpnlExportOptions.add("tab", undefined, undefined, {name: "tabPng8"}); 
    tabPng8.text = "PNG-8"; 
    tabPng8.orientation = "column"; 
    tabPng8.alignChildren = ["left","top"]; 
    tabPng8.spacing = 5; 
    tabPng8.margins = 10; 

    // GRPPNG8COLORREDUCTION
    // =====================
    var grpPng8ColorReduction = tabPng8.add("group", undefined, {name: "grpPng8ColorReduction"}); 
    grpPng8ColorReduction.orientation = "row"; 
    grpPng8ColorReduction.alignChildren = ["left","center"]; 
    grpPng8ColorReduction.spacing = 10; 
    grpPng8ColorReduction.margins = 0; 

    var lblPng8ColorReduction = grpPng8ColorReduction.add("statictext", undefined, undefined, {name: "lblPng8ColorReduction"}); 
    lblPng8ColorReduction.text = "Color Reduction"; 

    var ddPng8ColorReduction_array = ["Perceptual","Selective","Adaptive","Restrictive (Web)","-","Black & White","Grayscale","Mac OS","Windows"]; 
    var ddPng8ColorReduction = grpPng8ColorReduction.add("dropdownlist", undefined, undefined, {name: "ddPng8ColorReduction", items: ddPng8ColorReduction_array}); 
    ddPng8ColorReduction.selection = 0; 

    // GRPPNG8NUMBEROFCOLORS
    // =====================
    var grpPng8NumberOfColors = tabPng8.add("group", undefined, {name: "grpPng8NumberOfColors"}); 
    grpPng8NumberOfColors.orientation = "row"; 
    grpPng8NumberOfColors.alignChildren = ["left","center"]; 
    grpPng8NumberOfColors.spacing = 10; 
    grpPng8NumberOfColors.margins = 0; 

    var lblNumberOfColors = grpPng8NumberOfColors.add("statictext", undefined, undefined, {name: "lblNumberOfColors"}); 
    lblNumberOfColors.text = "Number of Colors"; 

    var txtPng8NumberofColors = grpPng8NumberOfColors.add('edittext {properties: {name: "txtPng8NumberofColors"}}'); 
    txtPng8NumberofColors.preferredSize.width = 36; 

    // GRPPNG8DITHER
    // =============
    var grpPng8Dither = tabPng8.add("group", undefined, {name: "grpPng8Dither"}); 
    grpPng8Dither.orientation = "row"; 
    grpPng8Dither.alignChildren = ["left","center"]; 
    grpPng8Dither.spacing = 10; 
    grpPng8Dither.margins = 0; 

    var lblPng8Dither = grpPng8Dither.add("statictext", undefined, undefined, {name: "lblPng8Dither"}); 
    lblPng8Dither.text = "Dither"; 

    var ddPng8Dither_array = ["None","Diffusion","Pattern","Noise"]; 
    var ddPng8Dither = grpPng8Dither.add("dropdownlist", undefined, undefined, {name: "ddPng8Dither", items: ddPng8Dither_array}); 
    ddPng8Dither.selection = 1; 

    // GRPPNG8DITHERSLIDER
    // ===================
    var grpPng8DitherSlider = grpPng8Dither.add("group", undefined, {name: "grpPng8DitherSlider"}); 
    grpPng8DitherSlider.enabled = false; 
    grpPng8DitherSlider.orientation = "row"; 
    grpPng8DitherSlider.alignChildren = ["left","center"]; 
    grpPng8DitherSlider.spacing = 10; 
    grpPng8DitherSlider.margins = 0; 

    var sldrPng8Dither = grpPng8DitherSlider.add("slider", undefined, undefined, undefined, undefined, {name: "sldrPng8Dither"}); 
    sldrPng8Dither.minvalue = 0; 
    sldrPng8Dither.maxvalue = 100; 
    sldrPng8Dither.value = 50; 
    sldrPng8Dither.preferredSize.width = 100; 

    var lblPng8DitherValue = grpPng8DitherSlider.add("statictext", undefined, undefined, {name: "lblPng8DitherValue"}); 
    lblPng8DitherValue.text = "100%"; 

    // GRPPNG8MATTE
    // ============
    var grpPng8Matte = tabPng8.add("group", undefined, {name: "grpPng8Matte"}); 
    grpPng8Matte.orientation = "row"; 
    grpPng8Matte.alignChildren = ["left","center"]; 
    grpPng8Matte.spacing = 10; 
    grpPng8Matte.margins = 0; 

    var lblPng8Matte = grpPng8Matte.add("statictext", undefined, undefined, {name: "lblPng8Matte"}); 
    lblPng8Matte.text = "Matte"; 

    var ddPng8Matte_array = ["White","Black","Gray","-","Background","Foreground"]; 
    var ddPng8Matte = grpPng8Matte.add("dropdownlist", undefined, undefined, {name: "ddPng8Matte", items: ddPng8Matte_array}); 
    ddPng8Matte.selection = 0; 

    // GRPPNG8TRANSPARENCY
    // ===================
    var grpPng8Transparency = tabPng8.add("group", undefined, {name: "grpPng8Transparency"}); 
    grpPng8Transparency.orientation = "row"; 
    grpPng8Transparency.alignChildren = ["left","center"]; 
    grpPng8Transparency.spacing = 10; 
    grpPng8Transparency.margins = 0; 

    var cbPng8Transparency = grpPng8Transparency.add("checkbox", undefined, undefined, {name: "cbPng8Transparency"}); 
    cbPng8Transparency.text = "Transparency"; 

    // GRPPNG8TRANSPARENCYDITHER
    // =========================
    var grpPng8TransparencyDither = grpPng8Transparency.add("group", undefined, {name: "grpPng8TransparencyDither"}); 
    grpPng8TransparencyDither.enabled = false; 
    grpPng8TransparencyDither.orientation = "row"; 
    grpPng8TransparencyDither.alignChildren = ["left","center"]; 
    grpPng8TransparencyDither.spacing = 10; 
    grpPng8TransparencyDither.margins = 0; 

    var lblPng8TransparencyDither = grpPng8TransparencyDither.add("statictext", undefined, undefined, {name: "lblPng8TransparencyDither"}); 
    lblPng8TransparencyDither.text = "Transparency Dither"; 

    var ddPng8TransparencyDither_array = ["None","Diffusion","Pattern","Noise"]; 
    var ddPng8TransparencyDither = grpPng8TransparencyDither.add("dropdownlist", undefined, undefined, {name: "ddPng8TransparencyDither", items: ddPng8TransparencyDither_array}); 
    ddPng8TransparencyDither.selection = 0; 

    var sldrPng8TransparencyDither = grpPng8TransparencyDither.add("slider", undefined, undefined, undefined, undefined, {name: "sldrPng8TransparencyDither"}); 
    sldrPng8TransparencyDither.minvalue = 0; 
    sldrPng8TransparencyDither.maxvalue = 100; 
    sldrPng8TransparencyDither.value = 50; 
    sldrPng8TransparencyDither.preferredSize.width = 100; 

    var lblPng8TransparencyDitherValue = grpPng8TransparencyDither.add("statictext", undefined, undefined, {name: "lblPng8TransparencyDitherValue"}); 
    lblPng8TransparencyDitherValue.text = "100%"; 

    // TABPNG8
    // =======
    var cbPng8Interlaced = tabPng8.add("checkbox", undefined, undefined, {name: "cbPng8Interlaced"}); 
    cbPng8Interlaced.text = "Interlaced"; 

    // TABJPG
    // ======
    var tabJpg = tabpnlExportOptions.add("tab", undefined, undefined, {name: "tabJpg"}); 
    tabJpg.text = "JPG"; 
    tabJpg.orientation = "column"; 
    tabJpg.alignChildren = ["left","top"]; 
    tabJpg.spacing = 5; 
    tabJpg.margins = 10; 

    // GRPJPGQUALITY
    // =============
    var grpJpgQuality = tabJpg.add("group", undefined, {name: "grpJpgQuality"}); 
    grpJpgQuality.orientation = "row"; 
    grpJpgQuality.alignChildren = ["left","center"]; 
    grpJpgQuality.spacing = 10; 
    grpJpgQuality.margins = 0; 

    var lblQuality = grpJpgQuality.add("statictext", undefined, undefined, {name: "lblQuality"}); 
    lblQuality.text = "Quality"; 

    var sldrJpgQuality = grpJpgQuality.add("slider", undefined, undefined, undefined, undefined, {name: "sldrJpgQuality"}); 
    sldrJpgQuality.minvalue = 0; 
    sldrJpgQuality.maxvalue = 100; 
    sldrJpgQuality.value = 50; 
    sldrJpgQuality.preferredSize.width = 200; 

    var lblJpgQualityValue = grpJpgQuality.add("statictext", undefined, undefined, {name: "lblJpgQualityValue"}); 
    lblJpgQualityValue.text = "100"; 

    // GRPJPGMATTE
    // ===========
    var grpJpgMatte = tabJpg.add("group", undefined, {name: "grpJpgMatte"}); 
    grpJpgMatte.orientation = "row"; 
    grpJpgMatte.alignChildren = ["left","center"]; 
    grpJpgMatte.spacing = 10; 
    grpJpgMatte.margins = 0; 

    var lblJpgMatte = grpJpgMatte.add("statictext", undefined, undefined, {name: "lblJpgMatte"}); 
    lblJpgMatte.text = "Matte"; 

    var ddJpgMatte_array = ["White","Black","Gray","-","Background","Foreground"]; 
    var ddJpgMatte = grpJpgMatte.add("dropdownlist", undefined, undefined, {name: "ddJpgMatte", items: ddJpgMatte_array}); 
    ddJpgMatte.selection = 0; 

    // TABJPG
    // ======
    var cbJpgIcc = tabJpg.add("checkbox", undefined, undefined, {name: "cbJpgIcc"}); 
    cbJpgIcc.text = "ICC Profile"; 

    var cbJpgOptimized = tabJpg.add("checkbox", undefined, undefined, {name: "cbJpgOptimized"}); 
    cbJpgOptimized.text = "Optimized"; 

    var cbJpgProgressive = tabJpg.add("checkbox", undefined, undefined, {name: "cbJpgProgressive"}); 
    cbJpgProgressive.text = "Progressive"; 

    // TABTIF
    // ======
    var tabTif = tabpnlExportOptions.add("tab", undefined, undefined, {name: "tabTif"}); 
    tabTif.text = "TIFF"; 
    tabTif.orientation = "column"; 
    tabTif.alignChildren = ["left","top"]; 
    tabTif.spacing = 5; 
    tabTif.margins = 10; 

    // GRPTIFENCODING
    // ==============
    var grpTifEncoding = tabTif.add("group", undefined, {name: "grpTifEncoding"}); 
    grpTifEncoding.orientation = "row"; 
    grpTifEncoding.alignChildren = ["left","center"]; 
    grpTifEncoding.spacing = 10; 
    grpTifEncoding.margins = 0; 

    var lblTifEncoding = grpTifEncoding.add("statictext", undefined, undefined, {name: "lblTifEncoding"}); 
    lblTifEncoding.text = "Image Compression"; 

    var ddTifEncoding_array = ["None","LZW","ZIP","JPG"]; 
    var ddTifEncoding = grpTifEncoding.add("dropdownlist", undefined, undefined, {name: "ddTifEncoding", items: ddTifEncoding_array}); 
    ddTifEncoding.selection = 0; 

    // GRPTIFQUALITY
    // =============
    var grpTifQuality = grpTifEncoding.add("group", undefined, {name: "grpTifQuality"}); 
    grpTifQuality.orientation = "row"; 
    grpTifQuality.alignChildren = ["left","center"]; 
    grpTifQuality.spacing = 10; 
    grpTifQuality.margins = 0; 

    var lblTifQuality = grpTifQuality.add("statictext", undefined, undefined, {name: "lblTifQuality"}); 
    lblTifQuality.text = "Quality"; 

    var sldrTifQuality = grpTifQuality.add("slider", undefined, undefined, undefined, undefined, {name: "sldrTifQuality"}); 
    sldrTifQuality.minvalue = 0; 
    sldrTifQuality.maxvalue = 100; 
    sldrTifQuality.value = 50; 
    sldrTifQuality.preferredSize.width = 100; 

    var lblTifQualityValue = grpTifQuality.add("statictext", undefined, undefined, {name: "lblTifQualityValue"}); 
    lblTifQualityValue.text = "100"; 

    // TABTIF
    // ======
    var cbTifWithAlpha = tabTif.add("checkbox", undefined, undefined, {name: "cbTifWithAlpha"}); 
    cbTifWithAlpha.text = "With Alpha Channel"; 

    var cbTifIcc = tabTif.add("checkbox", undefined, undefined, {name: "cbTifIcc"}); 
    cbTifIcc.text = "ICC Profile"; 

    var cbTifTransparency = tabTif.add("checkbox", undefined, undefined, {name: "cbTifTransparency"}); 
    cbTifTransparency.text = "Transparency"; 

    // TABPDF
    // ======
    var tabPdf = tabpnlExportOptions.add("tab", undefined, undefined, {name: "tabPdf"}); 
    tabPdf.text = "PDF"; 
    tabPdf.orientation = "column"; 
    tabPdf.alignChildren = ["left","top"]; 
    tabPdf.spacing = 5; 
    tabPdf.margins = 10; 

    // GRPPDFSTANDARD
    // ==============
    var grpPdfStandard = tabPdf.add("group", undefined, {name: "grpPdfStandard"}); 
    grpPdfStandard.orientation = "row"; 
    grpPdfStandard.alignChildren = ["left","center"]; 
    grpPdfStandard.spacing = 10; 
    grpPdfStandard.margins = 0; 

    var lblPdfStandard = grpPdfStandard.add("statictext", undefined, undefined, {name: "lblPdfStandard"}); 
    lblPdfStandard.text = "Standard"; 

    var ddPdfStandard_array = ["None","PDF/X-1a:2001","PDF/X-1a:2003","PDF/X-3:2002","PDF/X-3:2003","PDF/X-4:2010"]; 
    var ddPdfStandard = grpPdfStandard.add("dropdownlist", undefined, undefined, {name: "ddPdfStandard", items: ddPdfStandard_array}); 
    ddPdfStandard.selection = 0; 

    var lblPdfCompatibility = grpPdfStandard.add("statictext", undefined, undefined, {name: "lblPdfCompatibility"}); 
    lblPdfCompatibility.text = "Compatibility"; 

    var ddPdfCompatibility_array = ["Acrobat 4 (PDF 1.3)","Acrobat 5 (PDF 1.4)","Acrobat 6 (PDF 1.5)","Acrobat 7 (PDF 1.6)","Acrobat 8 (PDF 1.7)"]; 
    var ddPdfCompatibility = grpPdfStandard.add("dropdownlist", undefined, undefined, {name: "ddPdfCompatibility", items: ddPdfCompatibility_array}); 
    ddPdfCompatibility.selection = 0; 

    // GRPPDFCOLORCONVERSION
    // =====================
    var grpPdfColorConversion = tabPdf.add("group", undefined, {name: "grpPdfColorConversion"}); 
    grpPdfColorConversion.orientation = "row"; 
    grpPdfColorConversion.alignChildren = ["left","center"]; 
    grpPdfColorConversion.spacing = 10; 
    grpPdfColorConversion.margins = 0; 

    var cbPdfColorConversion = grpPdfColorConversion.add("checkbox", undefined, undefined, {name: "cbPdfColorConversion"}); 
    cbPdfColorConversion.text = "Color Conversion"; 

    // GRPPDFDESTINATIONPROFILE
    // ========================
    var grpPdfDestinationProfile = grpPdfColorConversion.add("group", undefined, {name: "grpPdfDestinationProfile"}); 
    grpPdfDestinationProfile.orientation = "row"; 
    grpPdfDestinationProfile.alignChildren = ["left","center"]; 
    grpPdfDestinationProfile.spacing = 10; 
    grpPdfDestinationProfile.margins = 0; 

    var lblPdfDestinationProfile = grpPdfDestinationProfile.add("statictext", undefined, undefined, {name: "lblPdfDestinationProfile"}); 
    lblPdfDestinationProfile.text = "Destination"; 

    var ddPdfDestinationProfile_array = ["Japan Color 2001 Coated","Japan Color 2001 Uncoated","Japan Color 2002 Newspaper","Japan Color 2003 Web Coated","Japan Web Coated (Ad)","U.S. Sheetfed Coated v2","U.S. Sheetfed Uncoated v2","U.S. Web Coated (SWOP) v2","U.S. Web Uncoated v2","-","sRGB IEC61966-2.1","Adobe RGB (1998)","Apple RGB","ColorMatch RGBimage P3","ProPhoto RGB","Rec.601 NTSC Gamma 2.4","Rec.601 PAL Gamma 2.4","Rec.709 Gamma 2.4"]; 
    var ddPdfDestinationProfile = grpPdfDestinationProfile.add("dropdownlist", undefined, undefined, {name: "ddPdfDestinationProfile", items: ddPdfDestinationProfile_array}); 
    ddPdfDestinationProfile.selection = 0; 

    // GRPPDFDOWNSAMPLE
    // ================
    var grpPdfDownSample = tabPdf.add("group", undefined, {name: "grpPdfDownSample"}); 
    grpPdfDownSample.orientation = "row"; 
    grpPdfDownSample.alignChildren = ["left","center"]; 
    grpPdfDownSample.spacing = 10; 
    grpPdfDownSample.margins = 0; 

    var ddPdfDownSample_array = ["Do Not Downsample","Average Downsampling To","Subsampling To","Bicubic Downsampling To"]; 
    var ddPdfDownSample = grpPdfDownSample.add("dropdownlist", undefined, undefined, {name: "ddPdfDownSample", items: ddPdfDownSample_array}); 
    ddPdfDownSample.selection = 3; 

    // GRPPDFDOWNSAMPLESIZE
    // ====================
    var grpPdfDownSampleSize = grpPdfDownSample.add("group", undefined, {name: "grpPdfDownSampleSize"}); 
    grpPdfDownSampleSize.orientation = "row"; 
    grpPdfDownSampleSize.alignChildren = ["left","center"]; 
    grpPdfDownSampleSize.spacing = 10; 
    grpPdfDownSampleSize.margins = 0; 

    var txtPdfDownSampleSize = grpPdfDownSampleSize.add('edittext {properties: {name: "txtPdfDownSampleSize"}}'); 
    txtPdfDownSampleSize.text = "300"; 
    txtPdfDownSampleSize.preferredSize.width = 40; 

    var lblPdfDownSampleSize = grpPdfDownSampleSize.add("statictext", undefined, undefined, {name: "lblPdfDownSampleSize"}); 
    lblPdfDownSampleSize.text = "PPI"; 

    var lblPdfDownSampleSizeLimit = grpPdfDownSampleSize.add("statictext", undefined, undefined, {name: "lblPdfDownSampleSizeLimit"}); 
    lblPdfDownSampleSizeLimit.text = "For Images Above"; 

    var txtPdfDownSampleSizeLimit = grpPdfDownSampleSize.add('edittext {properties: {name: "txtPdfDownSampleSizeLimit"}}'); 
    txtPdfDownSampleSizeLimit.text = "450"; 
    txtPdfDownSampleSizeLimit.preferredSize.width = 40; 

    var lblPdfDownSampleSizeLimit2 = grpPdfDownSampleSize.add("statictext", undefined, undefined, {name: "lblPdfDownSampleSizeLimit2"}); 
    lblPdfDownSampleSizeLimit2.text = "PPI"; 

    // GRPPDFENCODING
    // ==============
    var grpPdfEncoding = tabPdf.add("group", undefined, {name: "grpPdfEncoding"}); 
    grpPdfEncoding.orientation = "row"; 
    grpPdfEncoding.alignChildren = ["left","center"]; 
    grpPdfEncoding.spacing = 10; 
    grpPdfEncoding.margins = 0; 

    var lblPdfEncoding = grpPdfEncoding.add("statictext", undefined, undefined, {name: "lblPdfEncoding"}); 
    lblPdfEncoding.text = "Compression"; 

    var ddPdfEncoding_array = ["None","ZIP","JPEG"]; 
    var ddPdfEncoding = grpPdfEncoding.add("dropdownlist", undefined, undefined, {name: "ddPdfEncoding", items: ddPdfEncoding_array}); 
    ddPdfEncoding.selection = 2; 

    // GRPPDFQUALITY
    // =============
    var grpPdfQuality = grpPdfEncoding.add("group", undefined, {name: "grpPdfQuality"}); 
    grpPdfQuality.orientation = "row"; 
    grpPdfQuality.alignChildren = ["left","center"]; 
    grpPdfQuality.spacing = 10; 
    grpPdfQuality.margins = 0; 

    var lblPdfQuality = grpPdfQuality.add("statictext", undefined, undefined, {name: "lblPdfQuality"}); 
    lblPdfQuality.text = "Quality"; 

    var sldrPdfQuality = grpPdfQuality.add("slider", undefined, undefined, undefined, undefined, {name: "sldrPdfQuality"}); 
    sldrPdfQuality.minvalue = 0; 
    sldrPdfQuality.maxvalue = 100; 
    sldrPdfQuality.value = 50; 
    sldrPdfQuality.preferredSize.width = 100; 

    var lblPdfQualityValue = grpPdfQuality.add("statictext", undefined, undefined, {name: "lblPdfQualityValue"}); 
    lblPdfQualityValue.text = "100"; 

    // TABPDF
    // ======
    var cbPdfWithAlpha = tabPdf.add("checkbox", undefined, undefined, {name: "cbPdfWithAlpha"}); 
    cbPdfWithAlpha.text = "With Alpha Channel"; 

    var cbPdfIcc = tabPdf.add("checkbox", undefined, undefined, {name: "cbPdfIcc"}); 
    cbPdfIcc.text = "ICC Profile"; 

    // TABTGA
    // ======
    var tabTga = tabpnlExportOptions.add("tab", undefined, undefined, {name: "tabTga"}); 
    tabTga.text = "TGA"; 
    tabTga.orientation = "column"; 
    tabTga.alignChildren = ["left","top"]; 
    tabTga.spacing = 5; 
    tabTga.margins = 10; 

    // GRPTGADEPTH
    // ===========
    var grpTgaDepth = tabTga.add("group", undefined, {name: "grpTgaDepth"}); 
    grpTgaDepth.orientation = "row"; 
    grpTgaDepth.alignChildren = ["left","center"]; 
    grpTgaDepth.spacing = 10; 
    grpTgaDepth.margins = 0; 

    var lblTgaDepth = grpTgaDepth.add("statictext", undefined, undefined, {name: "lblTgaDepth"}); 
    lblTgaDepth.text = "Depth"; 

    var ddTgaDepth_array = ["16 bit","24 bit","36 bit"]; 
    var ddTgaDepth = grpTgaDepth.add("dropdownlist", undefined, undefined, {name: "ddTgaDepth", items: ddTgaDepth_array}); 
    ddTgaDepth.selection = 0; 

    // TABTGA
    // ======
    var cbTgaWithAlpha = tabTga.add("checkbox", undefined, undefined, {name: "cbTgaWithAlpha"}); 
    cbTgaWithAlpha.text = "With Alpha Channel"; 

    var cbTgaRleCompression = tabTga.add("checkbox", undefined, undefined, {name: "cbTgaRleCompression"}); 
    cbTgaRleCompression.text = "RLE Compression"; 

    // TABBMP
    // ======
    var tabBmp = tabpnlExportOptions.add("tab", undefined, undefined, {name: "tabBmp"}); 
    tabBmp.text = "BMP"; 
    tabBmp.orientation = "column"; 
    tabBmp.alignChildren = ["left","top"]; 
    tabBmp.spacing = 5; 
    tabBmp.margins = 10; 

    // GRPBMPDEPTH
    // ===========
    var grpBmpDepth = tabBmp.add("group", undefined, {name: "grpBmpDepth"}); 
    grpBmpDepth.orientation = "row"; 
    grpBmpDepth.alignChildren = ["left","center"]; 
    grpBmpDepth.spacing = 10; 
    grpBmpDepth.margins = 0; 

    var lblBmpDepth = grpBmpDepth.add("statictext", undefined, undefined, {name: "lblBmpDepth"}); 
    lblBmpDepth.text = "Depth"; 

    var ddBmpDepth_array = ["24 bit","32 bit","RGB 565 (16 bit)","ARGB 1555 (16 bit)","ARGB 4444 (16 bit)"]; 
    var ddBmpDepth = grpBmpDepth.add("dropdownlist", undefined, undefined, {name: "ddBmpDepth", items: ddBmpDepth_array}); 
    ddBmpDepth.selection = 0; 

    // TABBMP
    // ======
    var cbBmpWithAlpha = tabBmp.add("checkbox", undefined, undefined, {name: "cbBmpWithAlpha"}); 
    cbBmpWithAlpha.text = "With Alpha Channel"; 

    var cbBmpRleCompression = tabBmp.add("checkbox", undefined, undefined, {name: "cbBmpRleCompression"}); 
    cbBmpRleCompression.text = "RLE Compression"; 

    var cbBmpFlipRowOrder = tabBmp.add("checkbox", undefined, undefined, {name: "cbBmpFlipRowOrder"}); 
    cbBmpFlipRowOrder.text = "Flip Row Order"; 

    // PSD
    // ===
    var PSD = tabpnlExportOptions.add("tab", undefined, undefined, {name: "PSD"}); 
    PSD.text = "PSD"; 
    PSD.orientation = "column"; 
    PSD.alignChildren = ["left","top"]; 
    PSD.spacing = 10; 
    PSD.margins = 10; 

    // TABPNLEXPORTOPTIONS
    // ===================
    tabpnlExportOptions.selection = tabPng24; 

    // PNLMANIFEST
    // ===========
    var _manifestParent = CSV_FOCUSED_UI ? pnlCsvExport : grpCol2;
    var pnlManifest = _manifestParent.add("panel", undefined, undefined, {name: "pnlManifest"});
    pnlManifest.text = "Manifest Export (CSV)";
    pnlManifest.orientation = "column";
    pnlManifest.alignChildren = ["fill", "top"];
    pnlManifest.spacing = 5;
    pnlManifest.margins = 10;
    pnlManifest.alignment = ["fill", "center"];

    var cbCsvEnabled;
    if (!CSV_FOCUSED_UI) {
        cbCsvEnabled = pnlManifest.add("checkbox", undefined, undefined, {name: "cbCsvEnabled"});
        cbCsvEnabled.text = "Enable CSV Manifest Override";
    } else {
        var grpCsvEnableHide = legacyCol.add("group", undefined, {name: "grpCsvEnableHide"});
        grpCsvEnableHide.visible = false;
        cbCsvEnabled = grpCsvEnableHide.add("checkbox", undefined, undefined, {name: "cbCsvEnabled"});
        cbCsvEnabled.text = "Enable CSV Manifest Override";
    }

    // GRPCSVFILE
    // ==========
    var lblCsvFile = pnlManifest.add("statictext", undefined, "CSV Manifest File:", {name: "lblCsvFile"});
    var grpCsvFile = pnlManifest.add("group", undefined, {name: "grpCsvFile"});
    grpCsvFile.orientation = "row";
    grpCsvFile.alignChildren = ["left", "center"];
    grpCsvFile.spacing = 5;
    grpCsvFile.margins = 0;

    var txtCsvPath = grpCsvFile.add('edittext {properties: {name: "txtCsvPath"}}');
    txtCsvPath.text = "";
    txtCsvPath.preferredSize.width = 180;

    var btnBrowseCsv = grpCsvFile.add("button", undefined, undefined, {name: "btnBrowseCsv"});
    btnBrowseCsv.text = "Browse...";

    var lblCsvFormat = pnlManifest.add("statictext", undefined,
        "Columns: Width,Height,Padding,Filename,Mode,Path   (optional leading \"scope:\" line)",
        {name: "lblCsvFormat"});

    var _csvDebugParent;
    if (SHOW_CSV_DEBUG_CHECKBOX) {
        _csvDebugParent = pnlManifest;
    } else {
        _csvDebugParent = pnlManifest.add("group", undefined, {name: "grpCsvDebugHide"});
        _csvDebugParent.visible = false;
        _csvDebugParent.preferredSize = [0, 0];
        _csvDebugParent.maximumSize = [0, 0];
    }
    var cbCsvManifestDebug = _csvDebugParent.add("checkbox", undefined, undefined, {name: "cbCsvManifestDebug"});
    cbCsvManifestDebug.text = "Write CSV debug log (Desktop: ExportLayersCSV-debug.log)";

    // GRPTOPOPTIONS (Visible Only + Overwrite, on one row above destination)
    // =============
    var grpTopOptions = formatActionsParent.add("group", undefined, {name: "grpTopOptions"});
    grpTopOptions.orientation = "row";
    grpTopOptions.alignChildren = ["left", "center"];
    grpTopOptions.spacing = 14;
    grpTopOptions.margins = [0, 4, 0, 0];

    if (SHOW_VISIBLE_ONLY) {
        var cbVisibleOnlyTop = grpTopOptions.add("checkbox", undefined, undefined, {name: "cbVisibleOnlyTop"});
        cbVisibleOnlyTop.helpTip = "Whether to export only visible layers";
        cbVisibleOnlyTop.text = "Visible Only";
    }

    var cbOverwriteFiles = grpTopOptions.add("checkbox", undefined, undefined, {name: "cbOverwriteFiles"});
    cbOverwriteFiles.helpTip = "If checked, will overwrite existing files if they have the same name. Otherwise it will make unique copies";
    cbOverwriteFiles.text = "Overwrite Existing Files";

    // GRPDESTPATH (moved from top of destination panel)
    // ===========
    var lblDestPath = formatActionsParent.add("statictext", undefined, "Export Location:", {name: "lblDestPath"});
    var grpDestPath = formatActionsParent.add("group", undefined, {name: "grpDestPath"});
    grpDestPath.orientation = "row";
    grpDestPath.alignChildren = ["left", "center"];
    grpDestPath.spacing = 10;
    grpDestPath.margins = 0;

    var txtDestination = grpDestPath.add('edittext {properties: {name: "txtDestination"}}');
    txtDestination.helpTip = "Where to save the files";
    txtDestination.preferredSize.width = 200;

    var btnBrowse = grpDestPath.add("button", undefined, undefined, {name: "btnBrowse"});
    btnBrowse.text = "Browse...";
    btnBrowse.justify = "left";

    // GRPACTIONS (under manifest + format tabs)
    // ==========
    var grpActions = formatActionsParent.add("group", undefined, {name: "grpActions"});
    grpActions.orientation = "column";
    grpActions.alignChildren = ["fill", "top"];
    grpActions.spacing = 5;
    grpActions.margins = [0, 4, 0, 0];
    grpActions.alignment = CSV_FOCUSED_UI ? ["fill", "top"] : ["fill", "center"];

    var btnRun = grpActions.add("button", undefined, undefined, {name: "btnRun"});
    btnRun.helpTip = "Start export using the current settings";
    btnRun.text = "Start Export";

    if (!CSV_FOCUSED_UI) {
        // GRPCLOSEBUTTONS
        // ===============
        var grpCloseButtons = grpActions.add("group", undefined, {name: "grpCloseButtons"});
        grpCloseButtons.orientation = "row";
        grpCloseButtons.alignChildren = ["center", "top"];
        grpCloseButtons.spacing = 10;
        grpCloseButtons.margins = 0;

        var btnCancel = grpCloseButtons.add("button", undefined, undefined, {name: "btnCancel"});
        btnCancel.helpTip = "Closes the dialog and does not save any changes";
        btnCancel.text = "Cancel";
        btnCancel.preferredSize.width = 111;

        var btnSaveAndCancel = grpCloseButtons.add("button", undefined, undefined, {name: "btnSaveAndCancel"});
        btnSaveAndCancel.helpTip = "Closes the dialog but saves any changes made";
        btnSaveAndCancel.text = "Save and Close";
    }

    var cbSilent = grpActions.add("checkbox", undefined, undefined, {name: "cbSilent"});
    cbSilent.helpTip = "If checked, export runs without a progress bar or success confirmation.";
    cbSilent.text = "Export silently";
    cbSilent.alignment = ["center", "top"];

    // DIALOG footer (hidden in CSV-focused mode)
    // ======
    if (!CSV_FOCUSED_UI) {
        var lblMetadata = dialog.add("statictext", undefined, undefined, {name: "lblMetadata"});
        lblMetadata.text = "This document contains {0} layer(s), {1} of them visible, {2} selected";
        lblMetadata.justify = "center";

        var lblContact = dialog.add("group");
        lblContact.orientation = "column";
        lblContact.alignChildren = ["center", "center"];
        lblContact.spacing = 0;

        lblContact.add("statictext", undefined, "To get the most recent version, or leave feedback, go to:", {name: "lblContact"});
        lblContact.add("statictext", undefined, "https://github.com/antipalindrome/Photoshop-Export-Layers-to-Files-Fast", {name: "lblContact"});
    }

    if (CSV_FOCUSED_UI && grpLegacyHidden) {
        try {
            grpLegacyHidden.preferredSize = [0, 0];
            legacyCol.preferredSize = [0, 0];
        } catch (eLegacyLayout) { }
        try {
            grpLegacyHidden.maximumSize = [10000, 1];
            legacyCol.maximumSize = [10000, 1];
        } catch (eLegacyMax) { }
    }

  return dialog;
}
