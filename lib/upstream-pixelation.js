// Derived from Zippland/perler-beads @2efee730f73dd4eb472ebde443a022d11f98bc21
// Original authors: Zippland and contributors. AGPL-3.0, see /LICENSE.
// Modified by Codex, 2026-10-25: TS→browser JS, .js imports, remove debug logs.
import { transparentColorData } from './upstream-editing.js?v=0b44566f26038ed7';
export var PixelationMode = /*#__PURE__*/ function(PixelationMode) {
    PixelationMode["Dominant"] = "dominant";
    PixelationMode["Average"] = "average";
    return PixelationMode;
}({});
export function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}
function srgbChannelToLinear(channel) {
    const normalized = channel / 255;
    return normalized <= 0.04045 ? normalized / 12.92 : Math.pow((normalized + 0.055) / 1.055, 2.4);
}
function rgbToOklab(rgb) {
    const r = srgbChannelToLinear(rgb.r);
    const g = srgbChannelToLinear(rgb.g);
    const b = srgbChannelToLinear(rgb.b);
    const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
    const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
    const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;
    const lRoot = Math.cbrt(l);
    const mRoot = Math.cbrt(m);
    const sRoot = Math.cbrt(s);
    return {
        l: 0.2104542553 * lRoot + 0.7936177850 * mRoot - 0.0040720468 * sRoot,
        a: 1.9779984951 * lRoot - 2.4285922050 * mRoot + 0.4505937099 * sRoot,
        b: 0.0259040371 * lRoot + 0.7827717662 * mRoot - 0.8086757660 * sRoot
    };
}
const oklabCache = new Map();
function getOklabColor(rgb) {
    const cacheKey = `${rgb.r},${rgb.g},${rgb.b}`;
    const cached = oklabCache.get(cacheKey);
    if (cached) {
        return cached;
    }
    const oklab = rgbToOklab(rgb);
    oklabCache.set(cacheKey, oklab);
    return oklab;
}
export function colorDistance(rgb1, rgb2) {
    const oklab1 = getOklabColor(rgb1);
    const oklab2 = getOklabColor(rgb2);
    const dl = oklab1.l - oklab2.l;
    const da = oklab1.a - oklab2.a;
    const db = oklab1.b - oklab2.b;
    return Math.sqrt(dl * dl + da * da + db * db) * 100;
}
export function findClosestPaletteColor(targetRgb, palette) {
    if (!palette || palette.length === 0) {
        console.error("findClosestPaletteColor: Palette is empty or invalid!");
        return {
            key: 'ERR',
            hex: '#000000',
            rgb: {
                r: 0,
                g: 0,
                b: 0
            }
        };
    }
    let minDistance = Infinity;
    let closestColor = palette[0];
    for (const paletteColor of palette){
        const distance = colorDistance(targetRgb, paletteColor.rgb);
        if (distance < minDistance) {
            minDistance = distance;
            closestColor = paletteColor;
        }
        if (distance === 0) break;
    }
    return closestColor;
}
function calculateCellRepresentativeColor(imageData, startX, startY, width, height, mode) {
    const data = imageData.data;
    const imgWidth = imageData.width;
    let rSum = 0, gSum = 0, bSum = 0;
    let pixelCount = 0;
    const colorCountsInCell = {};
    let dominantColorRgb = null;
    let maxCount = 0;
    const endX = startX + width;
    const endY = startY + height;
    for(let y = startY; y < endY; y++){
        for(let x = startX; x < endX; x++){
            const index = (y * imgWidth + x) * 4;
            if (data[index + 3] < 128) continue;
            const r = data[index];
            const g = data[index + 1];
            const b = data[index + 2];
            pixelCount++;
            if (mode === "average") {
                rSum += r;
                gSum += g;
                bSum += b;
            } else {
                const colorKey = `${r},${g},${b}`;
                colorCountsInCell[colorKey] = (colorCountsInCell[colorKey] || 0) + 1;
                if (colorCountsInCell[colorKey] > maxCount) {
                    maxCount = colorCountsInCell[colorKey];
                    dominantColorRgb = {
                        r,
                        g,
                        b
                    };
                }
            }
        }
    }
    if (pixelCount === 0) {
        return null;
    }
    if (mode === "average") {
        return {
            r: Math.round(rSum / pixelCount),
            g: Math.round(gSum / pixelCount),
            b: Math.round(bSum / pixelCount)
        };
    } else {
        return dominantColorRgb;
    }
}
export function calculatePixelGrid(originalCtx, imgWidth, imgHeight, N, M, palette, mode, t1FallbackColor) {

    const mappedData = Array(M).fill(null).map(()=>Array(N).fill({
            key: t1FallbackColor.key,
            color: t1FallbackColor.hex
        }));
    const cellWidthOriginal = imgWidth / N;
    const cellHeightOriginal = imgHeight / M;
    let fullImageData = null;
    try {
        fullImageData = originalCtx.getImageData(0, 0, imgWidth, imgHeight);
    } catch (e) {
        console.error("Failed to get full image data:", e);
        return mappedData;
    }
    for(let j = 0; j < M; j++){
        for(let i = 0; i < N; i++){
            const startXOriginal = Math.floor(i * cellWidthOriginal);
            const startYOriginal = Math.floor(j * cellHeightOriginal);
            const endXOriginal = Math.min(imgWidth, Math.ceil((i + 1) * cellWidthOriginal));
            const endYOriginal = Math.min(imgHeight, Math.ceil((j + 1) * cellHeightOriginal));
            const currentCellWidth = Math.max(1, endXOriginal - startXOriginal);
            const currentCellHeight = Math.max(1, endYOriginal - startYOriginal);
            const representativeRgb = calculateCellRepresentativeColor(fullImageData, startXOriginal, startYOriginal, currentCellWidth, currentCellHeight, mode);
            let finalCellColorData;
            if (representativeRgb) {
                const closestBead = findClosestPaletteColor(representativeRgb, palette);
                finalCellColorData = {
                    key: closestBead.key,
                    color: closestBead.hex
                };
            } else {
                finalCellColorData = {
                    ...transparentColorData
                };
            }
            mappedData[j][i] = finalCellColorData;
        }
    }

    return mappedData;
}
