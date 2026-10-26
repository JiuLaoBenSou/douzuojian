// Derived from Zippland/perler-beads @2efee730f73dd4eb472ebde443a022d11f98bc21
// Original authors: Zippland and contributors. AGPL-3.0, see /LICENSE.
// Modified by Codex, 2026-10-25: TS→browser JS, .js imports, remove debug logs.
export const TRANSPARENT_KEY = 'ERASE';
export const transparentColorData = {
    key: TRANSPARENT_KEY,
    color: '#FFFFFF',
    isExternal: true
};
export function floodFillErase(pixelData, gridDimensions, startRow, startCol, targetKey) {
    const { N, M } = gridDimensions;
    const newPixelData = pixelData.map((row)=>row.map((cell)=>({
                ...cell
            })));
    const visited = Array(M).fill(null).map(()=>Array(N).fill(false));
    const stack = [
        {
            row: startRow,
            col: startCol
        }
    ];
    while(stack.length > 0){
        const { row, col } = stack.pop();
        if (row < 0 || row >= M || col < 0 || col >= N || visited[row][col]) {
            continue;
        }
        const currentCell = newPixelData[row][col];
        if (!currentCell || currentCell.isExternal || currentCell.key !== targetKey) {
            continue;
        }
        visited[row][col] = true;
        newPixelData[row][col] = {
            ...transparentColorData
        };
        stack.push({
            row: row - 1,
            col
        }, {
            row: row + 1,
            col
        }, {
            row,
            col: col - 1
        }, {
            row,
            col: col + 1
        });
    }
    return newPixelData;
}
export function replaceColor(pixelData, gridDimensions, sourceColor, targetColor) {
    const { N, M } = gridDimensions;
    const newPixelData = pixelData.map((row)=>row.map((cell)=>({
                ...cell
            })));
    let replaceCount = 0;
    for(let j = 0; j < M; j++){
        for(let i = 0; i < N; i++){
            const currentCell = newPixelData[j][i];
            if (currentCell && !currentCell.isExternal && currentCell.color.toUpperCase() === sourceColor.color.toUpperCase()) {
                newPixelData[j][i] = {
                    key: targetColor.key,
                    color: targetColor.color,
                    isExternal: false
                };
                replaceCount++;
            }
        }
    }
    return {
        newPixelData,
        replaceCount
    };
}
export function paintSinglePixel(pixelData, row, col, newColor) {
    const newPixelData = pixelData.map((row)=>row.map((cell)=>({
                ...cell
            })));
    const currentCell = newPixelData[row]?.[col];
    if (!currentCell) {
        return {
            newPixelData: pixelData,
            previousCell: null,
            hasChange: false
        };
    }
    const previousKey = currentCell.key;
    const wasExternal = currentCell.isExternal;
    let newCellData;
    if (newColor.key === TRANSPARENT_KEY) {
        newCellData = {
            ...transparentColorData
        };
    } else {
        newCellData = {
            ...newColor,
            isExternal: false
        };
    }
    const hasChange = newCellData.key !== previousKey || newCellData.isExternal !== wasExternal;
    if (hasChange) {
        newPixelData[row][col] = newCellData;
    }
    return {
        newPixelData: hasChange ? newPixelData : pixelData,
        previousCell: currentCell,
        hasChange
    };
}
export function recalculateColorStats(pixelData) {
    const colorCounts = {};
    let totalCount = 0;
    pixelData.flat().forEach((cell)=>{
        if (cell && !cell.isExternal && cell.key !== TRANSPARENT_KEY) {
            const cellHex = cell.color.toUpperCase();
            if (!colorCounts[cellHex]) {
                colorCounts[cellHex] = {
                    count: 0,
                    color: cellHex
                };
            }
            colorCounts[cellHex].count++;
            totalCount++;
        }
    });
    return {
        colorCounts,
        totalCount
    };
}
