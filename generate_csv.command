#!/bin/bash
# Image-to-CSV generator
# Double-click this file, OR run it from Terminal.
# Drop it into a folder of images; it writes layers.csv next to itself.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR" || exit 1

python3 - <<'PYEOF'
import os
import csv
import struct
from pathlib import Path

IMAGE_EXTENSIONS = {'.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp'}


def get_image_size(path):
    """Return (width, height) for common image formats, or None if unknown."""
    with open(path, 'rb') as f:
        head = f.read(30)

    # PNG
    if head[:8] == b'\x89PNG\r\n\x1a\n':
        w, h = struct.unpack('>II', head[16:24])
        return w, h

    # GIF
    if head[:6] in (b'GIF87a', b'GIF89a'):
        w, h = struct.unpack('<HH', head[6:10])
        return w, h

    # BMP
    if head[:2] == b'BM':
        w, h = struct.unpack('<ii', head[18:26])
        return w, abs(h)

    # JPEG — walk markers to find the SOFn frame
    if head[:2] == b'\xff\xd8':
        sof_markers = {0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7,
                       0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF}
        with open(path, 'rb') as f:
            f.seek(2)
            while True:
                b = f.read(1)
                if not b:
                    return None
                if b != b'\xff':
                    continue
                # skip fill bytes
                while b == b'\xff':
                    b = f.read(1)
                    if not b:
                        return None
                marker = b[0]
                if marker in sof_markers:
                    f.read(3)  # length(2) + precision(1)
                    h, w = struct.unpack('>HH', f.read(4))
                    return w, h
                size_bytes = f.read(2)
                if len(size_bytes) < 2:
                    return None
                size = struct.unpack('>H', size_bytes)[0]
                f.read(size - 2)

    # WebP
    if head[:4] == b'RIFF' and head[8:12] == b'WEBP':
        with open(path, 'rb') as f:
            f.seek(12)
            chunk = f.read(4)
            if chunk == b'VP8 ':
                f.seek(26)
                w = struct.unpack('<H', f.read(2))[0] & 0x3FFF
                h = struct.unpack('<H', f.read(2))[0] & 0x3FFF
                return w, h
            if chunk == b'VP8L':
                f.seek(21)
                b = f.read(4)
                w = (((b[1] & 0x3F) << 8) | b[0]) + 1
                h = (((b[3] & 0x0F) << 10) | (b[2] << 2) | ((b[1] & 0xC0) >> 6)) + 1
                return w, h
            if chunk == b'VP8X':
                f.seek(24)
                w = int.from_bytes(f.read(3), 'little') + 1
                h = int.from_bytes(f.read(3), 'little') + 1
                return w, h

    return None


def main():
    folder = Path.cwd()
    files = sorted(
        p for p in folder.iterdir()
        if p.is_file() and p.suffix.lower() in IMAGE_EXTENSIONS
    )

    output_path = folder / 'layers.csv'

    with open(output_path, 'w', newline='') as f:
        # Notes / column reference
        f.write('# Column,Required,Description\n')
        f.write('# Width,Yes,Output canvas width in pixels\n')
        f.write('# Height,Yes,Output canvas height in pixels\n')
        f.write('# Padding,Yes,Padding in pixels applied around the layer content\n')
        f.write('# Filename,Yes,Output filename without extension\n')
        f.write('# Mode,No,fit (default) or canvas - see Mode Values below\n')
        f.write('# Mode Values:\n')
        f.write('#   fit    - Scales the layer to fit inside the canvas minus padding\n')
        f.write('#   canvas - Resizes the canvas to Width x Height without scaling the layer\n')
        f.write('\n')

        writer = csv.writer(f)
        writer.writerow(['Width', 'Height', 'Padding', 'Filename', 'Mode'])

        written = 0
        for path in files:
            size = get_image_size(path)
            if size is None:
                print(f'  skipped (unreadable): {path.name}')
                continue
            w, h = size
            writer.writerow([w, h, 0, path.stem, 'fit'])
            written += 1

    print(f'\nWrote {written} rows to {output_path}')

main()
PYEOF

status=$?
echo ""
# Pause so users who double-click can see the output before the window closes.
if [ -t 1 ]; then
    read -n 1 -s -r -p "Press any key to close..."
    echo ""
fi
exit $status
