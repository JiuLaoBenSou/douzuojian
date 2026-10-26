// Original geometric examples by Codex, 2026-10-25. No brand mapping.
export const palette = [
  { id: 'DEMO-A', name: '珊瑚', hex: '#d77a64' },
  { id: 'DEMO-B', name: '杏黄', hex: '#e8be61' },
  { id: 'DEMO-C', name: '青绿', hex: '#49796f' },
  { id: 'DEMO-D', name: '米白', hex: '#ede7d8' },
];

const make = (id, name, note, cell) => ({
  id, name, note, width: 16, height: 16, author: 'Codex',
  source: '原创几何演示', difficulty: '待实拼评估',
  cells: Array.from({ length: 256 }, (_, i) => cell(i % 16, Math.floor(i / 16))),
});

export const patterns = [
  make('diamond', '菱形回响', '由中心向外展开的四色菱形。', (x, y) => {
    const d = Math.abs(x - 7.5) + Math.abs(y - 7.5);
    return d > 8 ? null : Math.min(3, Math.floor(d / 2));
  }),
  make('weave', '交织方块', '用交错的色带构成小小的方阵。', (x, y) =>
    x < 2 || x > 13 || y < 2 || y > 13 ? null : (Math.floor(x / 3) + Math.floor(y / 3)) % 4),
  make('steps', '阶梯节奏', '重复与留白，组成三组几何阶梯。', (x, y) =>
    x < 2 || x > 13 || y < 2 || y > 13 || (x + y) % 6 > 3 ? null : Math.floor((x + y) / 6) % 4),
];

export function countColors(pattern) {
  return palette.map((color, index) => ({ ...color, count: pattern.cells.filter(c => c === index).length }))
    .filter(color => color.count > 0);
}
