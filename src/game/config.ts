// ───────────────────────────────────────────────────────────────
//  HADES.NET · configuración global y proyección isométrica 2:1
//  El mundo lógico es un plano (x, y). La pantalla lo ve en
//  isométrico:  sx = OX + (x - y)·K    sy = OY + (x + y)·K/2
// ───────────────────────────────────────────────────────────────
export const VIEW_W = 1600;
export const VIEW_H = 900;

export const WORLD = 1000; // lado del plano de la arena (unidades de mundo)
export const K = 0.72; // escala isométrica
export const OX = 880; // origen en pantalla del vértice superior de la arena
export const OY = 300;
export const WALL_H = 230;
export const MAP_W = 1760;
export const MAP_H = 1100;

export const BMIN = 62; // límites caminables
export const BMAX = WORLD - 62;

export const px = (x: number, y: number) => OX + (x - y) * K;
export const py = (x: number, y: number) => OY + (x + y) * K * 0.5;

/** pantalla → mundo (punto) */
export function toWorld(sx: number, sy: number) {
  const a = (sx - OX) / K;
  const b = (2 * (sy - OY)) / K;
  return { x: (a + b) / 2, y: (b - a) / 2 };
}

/** dirección en pantalla → dirección unitaria en el plano del mundo */
export function screenDirToWorld(dx: number, dy: number) {
  const a = dx / K;
  const b = (2 * dy) / K;
  const wx = (a + b) / 2;
  const wy = (b - a) / 2;
  const l = Math.hypot(wx, wy) || 1;
  return { x: wx / l, y: wy / l };
}

/** dirección del mundo → vector en pantalla (sin normalizar) */
export function worldDirToScreen(wx: number, wy: number) {
  return { x: (wx - wy) * K, y: (wx + wy) * K * 0.5 };
}

export const COLORS = {
  syn: 0x4fc3ff,
  synack: 0xffd24a,
  ack: 0x58ff9b,
  magenta: 0xe23ad6,
  teal: 0x3be0c8,
  red: 0xd8333f,
  mana: 0x7a8cff,
};

export const HEX = {
  syn: '#4fc3ff',
  synack: '#ffd24a',
  ack: '#58ff9b',
  magenta: '#ff4fd8',
};

export const DOORS = {
  E: { x: 300, y: 0 }, // puerta en la pared noreste
  W: { x: 0, y: 300 }, // puerta en la pared noroeste
};
