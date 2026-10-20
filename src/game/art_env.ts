// ───────────────────────────────────────────────────────────────
//  Arte procedural del entorno, por bioma (como las regiones de
//  Hades II):  Erebo (bosque de piedra) · Océano (cubierta del
//  navío) · Campos de Lamento (praderas de asfódelos y lápidas).
//  El suelo y las paredes se pintan en su propio plano y una
//  transformación afín los proyecta en isométrico 2:1.
// ───────────────────────────────────────────────────────────────
import Phaser from 'phaser';
import { K, OX, OY, WORLD, MAP_W, MAP_H, WALL_H } from './config';
import { INK, rngf, mkCanvas, reg, fillStroke, lgrad, rgrad, ell, poly } from './artutil';

export type BiomeId = 'erebus' | 'oceanus' | 'fields';

export interface Biome {
  id: BiomeId;
  name: string;
  floor: 'stone' | 'planks' | 'grass';
  wall: 'forest' | 'hull' | 'fence';
  ambient: 'motes' | 'foam' | 'petals';
  /** color de la magia/puertas del bioma (se usa con moderación) */
  magic: number;
  magicHex: string;
  sky: [string, string, string];
  edge: [string, string];
  door: { frame: [string, string, string]; veil: string; skull: string };
}

export const BIOMES: Record<BiomeId, Biome> = {
  erebus: {
    id: 'erebus',
    name: 'Erebo',
    floor: 'stone',
    wall: 'forest',
    ambient: 'motes',
    magic: 0x9c7cff,
    magicHex: '#9c7cff',
    sky: ['#05060f', '#0d1024', '#07081a'],
    edge: ['#2b2a3f', '#0b0b14'],
    door: { frame: ['#4a4660', '#2a2838', '#1a1826'], veil: 'rgba(150,120,255,', skull: '#d8d2e6' },
  },
  oceanus: {
    id: 'oceanus',
    name: 'Océano',
    floor: 'planks',
    wall: 'hull',
    ambient: 'foam',
    magic: 0x3fd9a4,
    magicHex: '#3fd9a4',
    sky: ['#02070a', '#061418', '#020608'],
    edge: ['#2f4640', '#0c1412'],
    door: { frame: ['#3b5559', '#1e3337', '#122328'], veil: 'rgba(80,235,170,', skull: '#d9f2e2' },
  },
  fields: {
    id: 'fields',
    name: 'Campos de Lamento',
    floor: 'grass',
    wall: 'fence',
    ambient: 'petals',
    magic: 0xd98aa6,
    magicHex: '#d98aa6',
    sky: ['#14151c', '#2a2b33', '#191a22'],
    edge: ['#3c3a2f', '#141310'],
    door: { frame: ['#5a5548', '#36332a', '#221f19'], veil: 'rgba(230,160,190,', skull: '#e8e2d2' },
  },
};

export const ORIGINS: Record<string, [number, number]> = {};
export const DOOR_U = 170;
export const DOOR_V = 250;
export const DOOR_W = Math.ceil(DOOR_U * K);
export const DOOR_H = DOOR_V + Math.ceil((DOOR_U * K) / 2);

// ═════════════ Fondo ═════════════
export function drawBackground(scene: Phaser.Scene, b: Biome) {
  const { c, ctx } = mkCanvas(MAP_W, MAP_H);
  const r = rngf(b.id === 'erebus' ? 3 : b.id === 'oceanus' ? 4 : 5);
  ctx.fillStyle = lgrad(ctx, 0, 0, 0, MAP_H, [
    [0, b.sky[0]],
    [0.5, b.sky[1]],
    [1, b.sky[2]],
  ]);
  ctx.fillRect(0, 0, MAP_W, MAP_H);
  if (b.id === 'erebus') {
    // luna velada y troncos lejanos
    ctx.fillStyle = rgrad(ctx, 1250, 170, 10, 260, [
      [0, 'rgba(190,180,230,0.22)'],
      [0.3, 'rgba(120,110,180,0.08)'],
      [1, 'rgba(0,0,0,0)'],
    ]);
    ctx.fillRect(900, -100, 700, 600);
    ell(ctx, 1250, 170, 46, 46);
    ctx.fillStyle = 'rgba(220,214,240,0.55)';
    ctx.fill();
    for (let i = 0; i < 70; i++) {
      const x = r() * MAP_W,
        w = 10 + r() * 28,
        h = 200 + r() * 500;
      ctx.fillStyle = `rgba(${8 + r() * 10},${8 + r() * 8},${20 + r() * 14},${0.5 + r() * 0.4})`;
      ctx.beginPath();
      ctx.moveTo(x - w / 2, MAP_H);
      ctx.lineTo(x - w / 3, MAP_H - h);
      ctx.lineTo(x + w / 3, MAP_H - h * 1.05);
      ctx.lineTo(x + w / 2, MAP_H);
      ctx.fill();
    }
    for (let i = 0; i < 30; i++) {
      const x = r() * MAP_W,
        y = r() * MAP_H,
        rad = 120 + r() * 300;
      ctx.fillStyle = rgrad(ctx, x, y, 0, rad, [
        [0, 'rgba(60,50,110,0.12)'],
        [1, 'rgba(0,0,0,0)'],
      ]);
      ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
  } else if (b.id === 'oceanus') {
    for (let i = 0; i < 46; i++) {
      const x = r() * MAP_W,
        y = r() * MAP_H,
        rad = 90 + r() * 260;
      ctx.fillStyle = rgrad(ctx, x, y, 0, rad, [
        [0, r() < 0.35 ? 'rgba(30,110,100,0.14)' : 'rgba(20,70,90,0.14)'],
        [1, 'rgba(0,0,0,0)'],
      ]);
      ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    for (let i = 0; i < 18; i++) {
      const x = r() * MAP_W,
        y = r() * MAP_H * 0.9,
        s = 60 + r() * 200;
      const a = 0.04 + r() * 0.1;
      ctx.strokeStyle = `rgba(150,215,210,${a})`;
      ctx.lineWidth = 3 + r() * 10;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.bezierCurveTo(x + s, y - s * 0.6, x + s * 1.6, y + s * 0.5, x + s * 0.7, y + s * 0.9);
      ctx.stroke();
    }
  } else {
    // cielo plomizo con bruma y colinas con siluetas de almas
    for (let i = 0; i < 6; i++) {
      const y = 420 + i * 110;
      ctx.fillStyle = `rgba(${40 + i * 6},${42 + i * 6},${50 + i * 6},0.9)`;
      ctx.beginPath();
      ctx.moveTo(0, MAP_H);
      for (let x = 0; x <= MAP_W; x += 40) ctx.lineTo(x, y + Math.sin(x * 0.004 + i) * 40 + Math.sin(x * 0.013 + i * 3) * 14);
      ctx.lineTo(MAP_W, MAP_H);
      ctx.fill();
    }
    for (let i = 0; i < 40; i++) {
      const x = r() * MAP_W,
        y = 480 + r() * 500,
        h = 14 + r() * 22;
      ctx.fillStyle = `rgba(200,200,215,${0.08 + r() * 0.14})`;
      ell(ctx, x, y - h * 0.6, h * 0.35, h * 0.6);
      ctx.fill();
    }
    for (let i = 0; i < 26; i++) {
      const x = r() * MAP_W,
        y = r() * MAP_H,
        rad = 160 + r() * 360;
      ctx.fillStyle = rgrad(ctx, x, y, 0, rad, [
        [0, 'rgba(120,118,130,0.16)'],
        [1, 'rgba(0,0,0,0)'],
      ]);
      ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
  }
  // gran estructura luminosa de fondo (landmark del bioma)
  if (b.id === 'erebus') {
    const tx = 1380,
      ty = 330;
    // halo
    ctx.fillStyle = rgrad(ctx, tx, ty, 0, 480, [
      [0, 'rgba(120,150,255,0.34)'],
      [0.4, 'rgba(90,110,230,0.16)'],
      [1, 'rgba(0,0,0,0)'],
    ]);
    ctx.fillRect(tx - 480, ty - 480, 960, 960);
    const btx = (x: number, y: number, ang: number, len: number, wd: number, d: number) => {
      if (d === 0 || len < 14) return;
      const x1 = x + Math.cos(ang) * len,
        y1 = y + Math.sin(ang) * len;
      ctx.lineCap = 'round';
      ctx.strokeStyle = `rgba(190,205,255,${0.5 + d * 0.09})`;
      ctx.lineWidth = wd;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x1, y1);
      ctx.stroke();
      btx(x1, y1, ang + (r() - 0.5) * 1.2, len * (0.62 + r() * 0.16), wd * 0.6, d - 1);
      if (r() < 0.6) btx(x1, y1, ang + (r() - 0.5) * 2.2, len * 0.45, wd * 0.45, d - 1);
    };
    btx(tx, ty + 420, -Math.PI / 2, 190, 26, 6);
    btx(tx - 190, ty + 300, -Math.PI / 2 - 0.5, 150, 16, 5);
    btx(tx + 180, ty + 320, -Math.PI / 2 + 0.45, 150, 15, 5);
    // núcleo con espiral
    ctx.strokeStyle = 'rgba(210,225,255,0.85)';
    ctx.lineWidth = 4;
    for (let a = 0; a < 5; a += 0.12) {
      const rr = 4 + a * 6.4;
      ctx.beginPath();
      ctx.moveTo(tx + Math.cos(a * 1.7) * rr, ty + Math.sin(a * 1.7) * rr);
      ctx.lineTo(tx + Math.cos(a * 1.7 + 0.12) * rr, ty + Math.sin(a * 1.7 + 0.12) * rr);
      ctx.stroke();
    }
    // motas ascendentes
    for (let i = 0; i < 40; i++) {
      const x = tx + (r() - 0.5) * 560,
        y = ty + r() * 520;
      ell(ctx, x, y, 2 + r() * 2.4, 2 + r() * 2.4);
      ctx.fillStyle = `rgba(190,205,255,${0.15 + r() * 0.35})`;
      ctx.fill();
    }
  } else if (b.id === 'oceanus') {
    const hx = 1290,
      hy = 250;
    ctx.fillStyle = rgrad(ctx, hx, hy, 0, 420, [
      [0, 'rgba(60,200,180,0.22)'],
      [1, 'rgba(0,0,0,0)'],
    ]);
    ctx.fillRect(hx - 420, hy - 420, 840, 840);
    // cabeza de leviatán dormida (silueta pálida)
    ctx.fillStyle = 'rgba(120,190,185,0.34)';
    ctx.beginPath();
    ctx.moveTo(hx - 320, hy + 190);
    ctx.bezierCurveTo(hx - 250, hy + 30, hx - 60, hy - 120, hx + 90, hy - 90);
    ctx.bezierCurveTo(hx + 240, hy - 60, hx + 300, hy + 40, hx + 330, hy + 170);
    ctx.quadraticCurveTo(hx, hy + 90, hx - 320, hy + 190);
    ctx.fill();
    // ojo
    ell(ctx, hx + 140, hy + 30, 26, 14, 0.3);
    ctx.fillStyle = 'rgba(200,255,240,0.6)';
    ctx.fill();
    // escamas / filas de barbas
    ctx.strokeStyle = 'rgba(180,240,230,0.25)';
    ctx.lineWidth = 3;
    for (let i = 0; i < 7; i++) {
      ctx.beginPath();
      ctx.arc(hx + 200, hy + 60, 60 + i * 26, -0.7, 0.5);
      ctx.stroke();
    }
    // burbujas
    for (let i = 0; i < 26; i++) {
      const x = hx - 200 + r() * 560,
        y = hy + 80 + r() * 380;
      ell(ctx, x, y, 3 + r() * 5, 3 + r() * 5);
      ctx.strokeStyle = `rgba(180,240,230,${0.12 + r() * 0.2})`;
      ctx.lineWidth = 1.6;
      ctx.stroke();
    }
  } else {
    const tx = 420,
      ty = 260;
    ctx.fillStyle = rgrad(ctx, tx, ty, 0, 460, [
      [0, 'rgba(220,220,235,0.3)'],
      [1, 'rgba(0,0,0,0)'],
    ]);
    ctx.fillRect(tx - 460, ty - 460, 920, 920);
    // árbol llorón pálido con raíces colgantes
    const btx = (x: number, y: number, ang: number, len: number, wd: number, d: number) => {
      if (d === 0 || len < 12) return;
      const x1 = x + Math.cos(ang) * len,
        y1 = y + Math.sin(ang) * len;
      ctx.lineCap = 'round';
      ctx.strokeStyle = `rgba(225,225,240,${0.4 + d * 0.08})`;
      ctx.lineWidth = wd;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x1, y1);
      ctx.stroke();
      btx(x1, y1, ang + (r() - 0.5) * 1.1, len * (0.62 + r() * 0.16), wd * 0.6, d - 1);
      if (r() < 0.6) btx(x1, y1, ang + (r() - 0.5) * 2.1, len * 0.45, wd * 0.45, d - 1);
    };
    btx(tx, ty + 400, -Math.PI / 2, 170, 22, 6);
    btx(tx - 150, ty + 300, -Math.PI / 2 - 0.45, 130, 13, 5);
    btx(tx + 160, ty + 310, -Math.PI / 2 + 0.4, 130, 13, 5);
    // raíces que cuelgan
    ctx.strokeStyle = 'rgba(230,230,245,0.4)';
    ctx.lineWidth = 2.5;
    for (let i = 0; i < 26; i++) {
      const x = tx - 240 + r() * 480;
      ctx.beginPath();
      ctx.moveTo(x, ty + 40 + r() * 160);
      ctx.quadraticCurveTo(x + (r() - 0.5) * 30, ty + 140 + r() * 120, x + (r() - 0.5) * 46, ty + 200 + r() * 220);
      ctx.stroke();
    }
  }
  ctx.fillStyle = rgrad(ctx, MAP_W / 2, MAP_H / 2, MAP_H * 0.3, MAP_W * 0.6, [
    [0, 'rgba(0,0,0,0)'],
    [1, 'rgba(0,0,0,0.55)'],
  ]);
  ctx.fillRect(0, 0, MAP_W, MAP_H);
  reg(scene, 'bg_' + b.id, c);
}

// ═════════════ Suelo ═════════════
function ring(ctx: CanvasRenderingContext2D, cx: number, cy: number, rad: number, lw: number, col: string) {
  ctx.beginPath();
  ctx.arc(cx, cy, rad, 0, Math.PI * 2);
  ctx.lineWidth = lw;
  ctx.strokeStyle = col;
  ctx.stroke();
}

/** círculo grabado en el suelo (discreto, como piedra tallada) */
function carvedCircle(ctx: CanvasRenderingContext2D, cx: number, cy: number, R: number, dark: string, light: string, big: boolean) {
  ring(ctx, cx, cy, R, 7, dark);
  ring(ctx, cx, cy, R - 2, 1.6, light);
  ring(ctx, cx, cy, R * 0.86, 4, dark);
  ring(ctx, cx, cy, R * 0.86 - 2, 1.2, light);
  const n = big ? 48 : 20;
  ctx.lineWidth = 2;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const long = i % 4 === 0;
    ctx.strokeStyle = dark;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * R * 0.88, cy + Math.sin(a) * R * 0.88);
    ctx.lineTo(cx + Math.cos(a) * R * (long ? 0.98 : 0.95), cy + Math.sin(a) * R * (long ? 0.98 : 0.95));
    ctx.stroke();
  }
  if (big) {
    ring(ctx, cx, cy, R * 0.58, 5, dark);
    ring(ctx, cx, cy, R * 0.58 - 2.5, 1.2, light);
    ctx.beginPath();
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2 - Math.PI / 2;
      const rr = i % 2 ? R * 0.26 : R * 0.56;
      ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.strokeStyle = dark;
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.strokeStyle = light;
    ctx.lineWidth = 1.2;
    ctx.stroke();
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      ctx.save();
      ctx.translate(cx + Math.cos(a) * R * 0.72, cy + Math.sin(a) * R * 0.72);
      ctx.rotate(a + Math.PI / 2);
      ctx.strokeStyle = dark;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-6, 7);
      ctx.lineTo(-6, -7);
      ctx.lineTo(6, -7);
      ctx.lineTo(6, 2);
      ctx.lineTo(0, 2);
      ctx.stroke();
      ctx.restore();
    }
  }
}

function floorPlanks(ctx: CanvasRenderingContext2D, r: () => number) {
  const W = WORLD;
  ctx.fillStyle = '#0f1c1c';
  ctx.fillRect(0, 0, W, W);
  const pal = ['#1c3034', '#213a3c', '#182a2d', '#243d3b', '#27382f', '#1e3238', '#2b3d37', '#1a2d2a'];
  const pw = 58;
  for (let row = 0; row * pw < W; row++) {
    let x = -r() * 190;
    const y0 = row * pw;
    while (x < W) {
      const len = 150 + r() * 240;
      ctx.fillStyle = pal[Math.floor(r() * pal.length)];
      ctx.fillRect(x + 1, y0 + 1, len - 2, pw - 2);
      ctx.fillStyle = lgrad(ctx, 0, y0, 0, y0 + pw, [
        [0, 'rgba(130,215,200,0.12)'],
        [0.28, 'rgba(130,215,200,0.02)'],
        [1, 'rgba(0,0,0,0.30)'],
      ]);
      ctx.fillRect(x + 1, y0 + 1, len - 2, pw - 2);
      ctx.strokeStyle = 'rgba(0,0,0,0.24)';
      ctx.lineWidth = 1.2;
      for (let i = 0; i < 4; i++) {
        const gy = y0 + 8 + r() * (pw - 16);
        ctx.beginPath();
        ctx.moveTo(x + 4 + r() * 24, gy);
        ctx.bezierCurveTo(x + len * 0.3, gy + (r() - 0.5) * 7, x + len * 0.6, gy + (r() - 0.5) * 7, x + len - 5 - r() * 24, gy + (r() - 0.5) * 4);
        ctx.stroke();
      }
      if (r() < 0.22) {
        ell(ctx, x + 20 + r() * (len - 40), y0 + 14 + r() * (pw - 28), 6, 3.2);
        fillStroke(ctx, 'rgba(8,16,16,0.55)', 'rgba(0,0,0,0.5)', 1);
      }
      ctx.strokeStyle = '#04080a';
      ctx.lineWidth = 2.4;
      ctx.strokeRect(x + 1, y0 + 1, len - 2, pw - 2);
      for (const nx of [x + 8, x + len - 8]) {
        ctx.fillStyle = '#05090b';
        ctx.beginPath();
        ctx.arc(nx, y0 + pw / 2, 2.4, 0, Math.PI * 2);
        ctx.fill();
      }
      x += len;
    }
  }
  for (let i = 0; i < 9; i++) {
    const x = 80 + r() * 840,
      y = 80 + r() * 840;
    ctx.fillStyle = rgrad(ctx, x, y, 0, 26 + r() * 22, [
      [0, 'rgba(105,14,30,0.45)'],
      [1, 'rgba(105,14,30,0)'],
    ]);
    ctx.fillRect(x - 60, y - 60, 120, 120);
  }
  carvedCircle(ctx, 500, 500, 250, 'rgba(3,8,10,0.8)', 'rgba(130,200,190,0.28)', true);
  // charcos
  for (let i = 0; i < 7; i++) {
    const x = 120 + r() * 760,
      y = 120 + r() * 760,
      rx = 30 + r() * 60;
    ell(ctx, x, y, rx, rx * (0.4 + r() * 0.4), r() * 3);
    ctx.fillStyle = 'rgba(40,90,100,0.35)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(160,220,220,0.18)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  // musgo y percebes
  for (let i = 0; i < 150; i++) {
    let x: number, y: number;
    if (r() < 0.62) {
      const side = Math.floor(r() * 4),
        t = r() * W,
        d = r() * 150;
      x = side === 0 ? d : side === 1 ? W - d : t;
      y = side === 2 ? d : side === 3 ? W - d : t;
      if (side < 2) y = t;
    } else {
      x = r() * W;
      y = r() * W;
    }
    const rad = 22 + r() * 62;
    ctx.fillStyle = rgrad(ctx, x, y, 0, rad, [
      [0, 'rgba(100,135,44,0.45)'],
      [0.6, 'rgba(70,105,40,0.2)'],
      [1, 'rgba(70,105,40,0)'],
    ]);
    ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    if (r() < 0.5) {
      const n = 3 + Math.floor(r() * 5);
      for (let j = 0; j < n; j++) {
        const bx = x + (r() - 0.5) * rad,
          by = y + (r() - 0.5) * rad,
          s = 2.5 + r() * 4;
        ell(ctx, bx, by, s * 1.3, s);
        fillStroke(ctx, '#8d9d5c', INK, 1.4);
      }
    }
  }
}

function floorStone(ctx: CanvasRenderingContext2D, r: () => number) {
  const W = WORLD;
  ctx.fillStyle = '#121326';
  ctx.fillRect(0, 0, W, W);
  const pal = ['#2a2c45', '#242640', '#2f2f4c', '#1f2138', '#33344f', '#282a44'];
  const cell = 74;
  const jit = () => (r() - 0.5) * 22;
  const n = Math.ceil(W / cell) + 2;
  const pts: { x: number; y: number }[][] = [];
  for (let j = 0; j <= n; j++) {
    pts.push([]);
    for (let i = 0; i <= n; i++) pts[j].push({ x: (i - 1) * cell + jit(), y: (j - 1) * cell + jit() });
  }
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      if (r() < 0.06) continue; // hueco con tierra
      const a = pts[j][i],
        b = pts[j][i + 1],
        c2 = pts[j + 1][i + 1],
        d = pts[j + 1][i];
      poly(ctx, [
        [a.x + 3, a.y + 3],
        [b.x - 3, b.y + 3],
        [c2.x - 3, c2.y - 3],
        [d.x + 3, d.y - 3],
      ]);
      fillStroke(ctx, pal[Math.floor(r() * pal.length)], '#07070f', 2.6);
      ctx.fillStyle = lgrad(ctx, a.x, a.y, d.x, d.y + 10, [
        [0, 'rgba(180,170,230,0.12)'],
        [1, 'rgba(0,0,0,0.28)'],
      ]);
      ctx.fill();
      if (r() < 0.3) {
        ctx.strokeStyle = 'rgba(0,0,0,0.4)';
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.moveTo(a.x + 10 + r() * 30, a.y + 10);
        ctx.lineTo(a.x + 20 + r() * 30, a.y + 30 + r() * 20);
        ctx.lineTo(a.x + 14 + r() * 40, d.y - 8);
        ctx.stroke();
      }
    }
  }
  // musgo violeta-gris en las juntas y hojarasca
  for (let i = 0; i < 120; i++) {
    const x = r() * W,
      y = r() * W,
      rad = 20 + r() * 50;
    ctx.fillStyle = rgrad(ctx, x, y, 0, rad, [
      [0, 'rgba(70,90,70,0.35)'],
      [1, 'rgba(70,90,70,0)'],
    ]);
    ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  for (let i = 0; i < 220; i++) {
    const x = r() * W,
      y = r() * W;
    ell(ctx, x, y, 4 + r() * 3, 2 + r() * 1.5, r() * 3);
    ctx.fillStyle = r() < 0.5 ? 'rgba(90,60,50,0.7)' : 'rgba(110,80,40,0.6)';
    ctx.fill();
  }
  // floración rosada/violeta (estilo Erebo de Hades II) y setas luminosas
  const flor: [string, string] = ['rgba(226,150,220,0.85)', 'rgba(190,120,230,0.85)'];
  const flor2: [string, string] = ['rgba(160,190,235,0.8)', 'rgba(150,150,235,0.8)'];
  for (let i = 0; i < 46; i++) {
    const x = r() * W,
      y = r() * W;
    if (Math.hypot(x - 500, y - 500) < 250 && r() < 0.7) continue;
    flowerPatch(ctx, r, x, y, 26 + r() * 44, r() < 0.7 ? flor : flor2, r() < 0.7 ? 'rgba(220,130,210,0.12)' : 'rgba(150,170,230,0.1)');
  }
  for (let i = 0; i < 16; i++) {
    shroomPatch(ctx, r, r() * W, r() * W, 3 + Math.floor(r() * 4), 'rgba(150,170,230,0.3)');
  }
  // Sello de bruja (Witching Ward) tallado en el centro
  carvedCircle(ctx, 500, 500, 230, 'rgba(6,6,14,0.85)', 'rgba(170,150,230,0.26)', true);
  [
    [250, 250],
    [750, 250],
    [250, 750],
    [750, 750],
  ].forEach(([x, y]) => carvedCircle(ctx, x, y, 60, 'rgba(6,6,14,0.8)', 'rgba(170,150,230,0.2)', false));
  // raíces que cruzan el suelo
  ctx.lineCap = 'round';
  for (let i = 0; i < 14; i++) {
    const side = Math.floor(r() * 4);
    const t = r() * W;
    const x0 = side === 0 ? 0 : side === 1 ? W : t,
      y0 = side === 2 ? 0 : side === 3 ? W : t;
    const len = 120 + r() * 220;
    const ang = Math.atan2(500 - y0, 500 - x0) + (r() - 0.5) * 0.8;
    const x1 = x0 + Math.cos(ang) * len,
      y1 = y0 + Math.sin(ang) * len;
    for (const [w, col] of [
      [11, '#07070d'],
      [7, '#2b2320'],
      [2.5, 'rgba(120,100,90,0.5)'],
    ] as [number, string][]) {
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.bezierCurveTo(x0 + Math.cos(ang + 0.5) * len * 0.4, y0 + Math.sin(ang + 0.5) * len * 0.4, x1 - Math.cos(ang - 0.4) * len * 0.3, y1 - Math.sin(ang - 0.4) * len * 0.3, x1, y1);
      ctx.strokeStyle = col;
      ctx.lineWidth = w;
      ctx.stroke();
    }
  }
}

function floorGrass(ctx: CanvasRenderingContext2D, r: () => number) {
  const W = WORLD;
  ctx.fillStyle = '#3b4a3a';
  ctx.fillRect(0, 0, W, W);
  for (let i = 0; i < 160; i++) {
    const x = r() * W,
      y = r() * W,
      rad = 40 + r() * 120;
    const g = r();
    ctx.fillStyle = rgrad(ctx, x, y, 0, rad, [
      [0, g < 0.4 ? 'rgba(60,80,52,0.55)' : g < 0.75 ? 'rgba(42,54,44,0.55)' : 'rgba(88,96,70,0.4)'],
      [1, 'rgba(0,0,0,0)'],
    ]);
    ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  // sendero de tierra
  const path = (x0: number, y0: number, cx: number, cy: number, x1: number, y1: number, w: number) => {
    for (const [ww, col] of [
      [w + 14, 'rgba(30,26,20,0.5)'],
      [w, '#5a4a36'],
      [w - 12, '#6a5a42'],
    ] as [number, string][]) {
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.quadraticCurveTo(cx, cy, x1, y1);
      ctx.strokeStyle = col;
      ctx.lineWidth = ww;
      ctx.lineCap = 'round';
      ctx.stroke();
    }
  };
  path(300, 0, 520, 420, 0, 300, 54);
  path(0, 300, 560, 560, 1000, 760, 50);
  path(300, 0, 520, 520, 760, 1000, 50);
  for (let i = 0; i < 90; i++) {
    const x = r() * W,
      y = r() * W;
    ell(ctx, x, y, 3 + r() * 5, 2 + r() * 3, r() * 3);
    fillStroke(ctx, '#7d7466', 'rgba(0,0,0,0.5)', 1);
  }
  // matas de hierba
  ctx.lineCap = 'round';
  for (let i = 0; i < 700; i++) {
    const x = r() * W,
      y = r() * W;
    const h = 8 + r() * 14;
    ctx.strokeStyle = r() < 0.5 ? 'rgba(90,110,70,0.8)' : 'rgba(55,70,48,0.9)';
    ctx.lineWidth = 1.6;
    for (let k = -1; k <= 1; k++) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + k * 4, y - h * 0.6, x + k * 7, y - h);
      ctx.stroke();
    }
  }
  // asfódelos (flores pálidas)
  for (let i = 0; i < 260; i++) {
    const x = r() * W,
      y = r() * W;
    if (r() < 0.5 && Math.hypot(x - 500, y - 500) < 160) continue;
    const s = 2.2 + r() * 2.2;
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2;
      ell(ctx, x + Math.cos(a) * s, y + Math.sin(a) * s, s * 0.9, s * 0.55, a);
      ctx.fillStyle = r() < 0.3 ? 'rgba(235,205,215,0.9)' : 'rgba(230,228,220,0.9)';
      ctx.fill();
    }
    ell(ctx, x, y, s * 0.6, s * 0.6);
    ctx.fillStyle = '#c9a85a';
    ctx.fill();
  }
  // floración violeta entre los asfódelos
  const florV: [string, string] = ['rgba(190,150,225,0.8)', 'rgba(160,130,215,0.85)'];
  for (let i = 0; i < 34; i++) {
    const x = r() * W,
      y = r() * W;
    if (Math.hypot(x - 500, y - 500) < 210 && r() < 0.7) continue;
    flowerPatch(ctx, r, x, y, 24 + r() * 38, florV, 'rgba(180,140,225,0.1)');
  }
  for (let i = 0; i < 12; i++) shroomPatch(ctx, r, r() * W, r() * W, 3 + Math.floor(r() * 3), 'rgba(190,150,225,0.3)');
  // zarzas (espinos) en los bordes
  ctx.lineWidth = 2;
  for (let i = 0; i < 60; i++) {
    const side = Math.floor(r() * 4),
      t = r() * W,
      d = 20 + r() * 110;
    const x = side === 0 ? d : side === 1 ? W - d : t,
      y = side === 2 ? d : side === 3 ? W - d : t;
    for (let k = 0; k < 4; k++) {
      ctx.strokeStyle = '#1a140f';
      ctx.beginPath();
      const a = r() * Math.PI * 2,
        l = 20 + r() * 40;
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + Math.cos(a + 0.6) * l * 0.5, y + Math.sin(a + 0.6) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l);
      ctx.stroke();
    }
  }
  // anillo de tierra en el centro (lugar de encuentro de los espectros)
  ring(ctx, 500, 500, 190, 26, 'rgba(60,48,34,0.75)');
  ring(ctx, 500, 500, 190, 2, 'rgba(0,0,0,0.35)');
}

/** Cúmulo de flores brillantes (estilo Hades: manchas de floración con brillo suave) */
function flowerPatch(ctx: CanvasRenderingContext2D, r: () => number, cx: number, cy: number, rad: number, petal: [string, string], glow: string) {
  ctx.fillStyle = rgrad(ctx, cx, cy, 0, rad, [
    [0, glow],
    [1, 'rgba(0,0,0,0)'],
  ]);
  ctx.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
  const n = Math.floor(rad / 2.4);
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2,
      d = Math.sqrt(r()) * rad * 0.85;
    const x = cx + Math.cos(a) * d,
      y = cy + Math.sin(a) * d * 0.62;
    const s = 1.6 + r() * 2.6;
    for (let k = 0; k < 5; k++) {
      const pa = (k / 5) * Math.PI * 2 + r();
      ell(ctx, x + Math.cos(pa) * s, y + Math.sin(pa) * s * 0.5, s * 0.62, s * 0.36, pa);
      ctx.fillStyle = r() < 0.35 ? petal[1] : petal[0];
      ctx.fill();
    }
    ell(ctx, x, y, s * 0.34, s * 0.34);
    ctx.fillStyle = r() < 0.5 ? 'rgba(255,250,235,0.9)' : petal[1];
    ctx.fill();
  }
}

/** Setas luminosas agrupadas */
function shroomPatch(ctx: CanvasRenderingContext2D, r: () => number, cx: number, cy: number, n: number, col: string) {
  ctx.fillStyle = rgrad(ctx, cx, cy, 0, 34, [
    [0, col],
    [1, 'rgba(0,0,0,0)'],
  ]);
  ctx.fillRect(cx - 34, cy - 34, 68, 68);
  for (let i = 0; i < n; i++) {
    const x = cx + (r() - 0.5) * 30,
      y = cy + (r() - 0.5) * 20,
      s = 3 + r() * 3.4;
    ctx.fillStyle = '#cfc6b6';
    ctx.fillRect(x - s * 0.22, y, s * 0.44, s * 0.8);
    ctx.beginPath();
    ctx.arc(x, y, s, Math.PI, 0);
    ctx.closePath();
    ctx.fillStyle = col.replace(/[\d.]+\)$/, '0.95)');
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }
}

function deckEdges(ctx: CanvasRenderingContext2D, b: Biome) {
  const W = WORLD;
  const Wd = W * K;
  const L = { x: OX - Wd, y: OY + Wd / 2 },
    B = { x: OX, y: OY + Wd },
    R = { x: OX + Wd, y: OY + Wd / 2 };
  const th = b.floor === 'grass' ? 30 : 38;
  const face = (a: { x: number; y: number }, bb: { x: number; y: number }, light: boolean) => {
    poly(ctx, [
      [a.x, a.y],
      [bb.x, bb.y],
      [bb.x, bb.y + th],
      [a.x, a.y + th],
    ]);
    fillStroke(
      ctx,
      lgrad(ctx, 0, a.y, 0, a.y + th + 40, [
        [0, light ? b.edge[0] : b.edge[1]],
        [1, '#050507'],
      ]),
      INK,
      3,
    );
    if (b.floor !== 'grass') {
      const n = 18;
      for (let i = 1; i < n; i++) {
        const t = i / n;
        const x = a.x + (bb.x - a.x) * t,
          y = a.y + (bb.y - a.y) * t;
        ctx.strokeStyle = 'rgba(0,0,0,0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + th);
        ctx.stroke();
      }
    } else {
      // raíces y tierra colgando
      for (let i = 0; i < 40; i++) {
        const t = (i + 0.5) / 40;
        const x = a.x + (bb.x - a.x) * t,
          y = a.y + (bb.y - a.y) * t;
        ctx.strokeStyle = 'rgba(20,16,10,0.7)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x, y + 4);
        ctx.lineTo(x + 3, y + th * 0.9);
        ctx.stroke();
      }
    }
  };
  face(L, B, true);
  face(B, R, false);
}

export function drawFloor(scene: Phaser.Scene, b: Biome) {
  const { c, ctx } = mkCanvas(MAP_W, MAP_H);
  const r = rngf(b.id === 'erebus' ? 11 : b.id === 'oceanus' ? 12 : 13);
  ctx.save();
  ctx.setTransform(K, K / 2, -K, K / 2, OX, OY);
  ctx.beginPath();
  ctx.rect(0, 0, WORLD, WORLD);
  ctx.clip();
  if (b.floor === 'planks') floorPlanks(ctx, r);
  else if (b.floor === 'stone') floorStone(ctx, r);
  else floorGrass(ctx, r);
  const W = WORLD;
  const edge = 120;
  const shade = (x0: number, y0: number, x1: number, y1: number, rx: number, ry: number, rw: number, rh: number) => {
    ctx.fillStyle = lgrad(ctx, x0, y0, x1, y1, [
      [0, 'rgba(0,0,0,0.6)'],
      [1, 'rgba(0,0,0,0)'],
    ]);
    ctx.fillRect(rx, ry, rw, rh);
  };
  shade(0, 0, edge, 0, 0, 0, edge, W);
  shade(0, 0, 0, edge, 0, 0, W, edge);
  shade(W, 0, W - 90, 0, W - 90, 0, 90, W);
  shade(0, W, 0, W - 90, 0, W - 90, W, 90);
  ctx.restore();
  deckEdges(ctx, b);
  reg(scene, 'floor_' + b.id, c);
}

// ═════════════ Paredes ═════════════
function archPath(ctx: CanvasRenderingContext2D, x: number, y0: number, w: number, h: number, archH: number) {
  ctx.beginPath();
  ctx.moveTo(x, y0);
  ctx.lineTo(x, y0 + h);
  ctx.bezierCurveTo(x, y0 + h + archH, x + w, y0 + h + archH, x + w, y0 + h);
  ctx.lineTo(x + w, y0);
  ctx.closePath();
}

function wallHull(ctx: CanvasRenderingContext2D, side: 'E' | 'W') {
  const r = rngf(side === 'E' ? 21 : 33);
  const U = WORLD,
    V = WALL_H;
  ctx.fillStyle = lgrad(ctx, 0, 0, 0, V, [
    [0, '#07100f'],
    [0.5, '#122528'],
    [1, '#1f383b'],
  ]);
  ctx.fillRect(0, 0, U, V);
  if (side === 'E') {
    for (let row = 0; row < 5; row++) {
      let x = -r() * 60;
      while (x < U) {
        const w = 90 + r() * 90;
        ctx.fillStyle = `rgba(${40 + r() * 30},${70 + r() * 40},${70 + r() * 30},0.22)`;
        ctx.fillRect(x, row * 46, w, 46);
        ctx.strokeStyle = 'rgba(2,6,8,0.8)';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, row * 46, w, 46);
        x += w;
      }
    }
    for (let i = 0; i < 6; i++) {
      const x = 28 + i * 165,
        w = 122;
      archPath(ctx, x - 6, 18, w + 12, 138, 52);
      fillStroke(ctx, '#0b1618', INK, 3);
      archPath(ctx, x, 24, w, 134, 48);
      fillStroke(
        ctx,
        lgrad(ctx, 0, 24, 0, 200, [
          [0, '#030708'],
          [1, '#0c1e21'],
        ]),
        INK,
        3,
      );
      const cx = x + w / 2,
        cy = 98;
      ctx.strokeStyle = 'rgba(120,170,160,0.35)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, 24, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      for (let a = 0; a < 5.2; a += 0.15) {
        const rr = 3 + a * 3.6;
        ctx.lineTo(cx + Math.cos(a * 1.9) * rr, cy + Math.sin(a * 1.9) * rr);
      }
      ctx.stroke();
    }
    [590, 700].forEach((cx, i) => {
      const cy = 104,
        R = 56;
      ell(ctx, cx, cy, R, R);
      fillStroke(
        ctx,
        rgrad(ctx, cx - 14, cy + 14, 4, R, [
          [0, '#32403f'],
          [0.5, '#161e20'],
          [1, '#0a0f11'],
        ]),
        INK,
        4,
      );
      ell(ctx, cx, cy, R - 7, R - 7);
      ctx.strokeStyle = 'rgba(120,170,160,0.45)';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      poly(ctx, [
        [cx - 14, cy - 24],
        [cx + 20, cy - 4 + i * 2],
        [cx - 10, cy + 26],
      ]);
      fillStroke(ctx, '#05080a', '#2f403f', 2);
    });
  } else {
    let x = 0;
    while (x < U) {
      const w = 52 + r() * 24;
      ctx.fillStyle = `rgb(${24 + r() * 14},${34 + r() * 16},${34 + r() * 10})`;
      ctx.fillRect(x, 0, w, V);
      ctx.fillStyle = lgrad(ctx, x, 0, x + w, 0, [
        [0, 'rgba(120,200,190,0.12)'],
        [0.2, 'rgba(0,0,0,0)'],
        [1, 'rgba(0,0,0,0.35)'],
      ]);
      ctx.fillRect(x, 0, w, V);
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.6;
      ctx.strokeRect(x, 0, w, V);
      x += w;
    }
    [58, 172].forEach((v) => {
      ctx.fillStyle = lgrad(ctx, 0, v - 9, 0, v + 9, [
        [0, '#7d6a34'],
        [0.5, '#3d3417'],
        [1, '#1e1a0b'],
      ]);
      ctx.fillRect(0, v - 9, U, 18);
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.5;
      ctx.strokeRect(0, v - 9, U, 18);
      for (let rx = 20; rx < U; rx += 44) {
        ctx.fillStyle = '#c9ad5a';
        ctx.beginPath();
        ctx.arc(rx, v, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    [150, 420, 760].forEach((cx) => {
      const cy = 114;
      ell(ctx, cx, cy, 38, 38);
      fillStroke(
        ctx,
        lgrad(ctx, cx - 30, cy + 30, cx + 30, cy - 30, [
          [0, '#8a7438'],
          [1, '#2c2410'],
        ]),
        INK,
        4,
      );
      ell(ctx, cx, cy, 28, 28);
      fillStroke(
        ctx,
        rgrad(ctx, cx, cy, 2, 28, [
          [0, 'rgba(70,150,130,0.9)'],
          [0.6, 'rgba(20,70,70,0.95)'],
          [1, '#04100d'],
        ]),
        INK,
        3,
      );
    });
  }
  // friso dorado con meandro
  ctx.fillStyle = '#071013';
  ctx.fillRect(0, 190, U, 40);
  ctx.fillStyle = lgrad(ctx, 0, 186, 0, 194, [
    [0, '#d9ba5c'],
    [1, '#6e5418'],
  ]);
  ctx.fillRect(0, 187, U, 6);
  for (let x = 0; x < U; x += 30) {
    ctx.beginPath();
    ctx.moveTo(x, 197);
    ctx.lineTo(x, 221);
    ctx.lineTo(x + 24, 221);
    ctx.lineTo(x + 24, 205);
    ctx.lineTo(x + 10, 205);
    ctx.lineTo(x + 10, 213);
    ctx.strokeStyle = '#8f7a3a';
    ctx.lineWidth = 2.4;
    ctx.stroke();
  }
  ctx.fillStyle = lgrad(ctx, 0, 0, 0, 24, [
    [0, '#030607'],
    [1, '#16282b'],
  ]);
  ctx.fillRect(0, 0, U, 22);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.strokeRect(0, 0, U, 22);
  for (let i = 0; i < 12; i++) {
    const x = r() * U,
      len = 16 + r() * 50,
      w = 4 + r() * 5;
    ctx.fillStyle = 'rgba(80,160,110,0.5)';
    ctx.beginPath();
    ctx.moveTo(x - w, 187);
    ctx.lineTo(x - w * 0.5, 187 - len);
    ctx.arc(x, 187 - len, w * 0.55, Math.PI, 0, true);
    ctx.lineTo(x + w, 187);
    ctx.closePath();
    ctx.fill();
  }
}

function wallForest(ctx: CanvasRenderingContext2D, side: 'E' | 'W') {
  const r = rngf(side === 'E' ? 41 : 43);
  const U = WORLD,
    V = WALL_H;
  ctx.fillStyle = lgrad(ctx, 0, 0, 0, V, [
    [0, '#0a0a16'],
    [1, '#13122a'],
  ]);
  ctx.fillRect(0, 0, U, V);
  // niebla de fondo
  for (let i = 0; i < 20; i++) {
    const x = r() * U,
      y = 80 + r() * 150,
      rad = 60 + r() * 120;
    ctx.fillStyle = rgrad(ctx, x, y, 0, rad, [
      [0, 'rgba(90,80,140,0.16)'],
      [1, 'rgba(0,0,0,0)'],
    ]);
    ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  // troncos lejanos
  for (let i = 0; i < 28; i++) {
    const x = r() * U,
      w = 14 + r() * 22;
    ctx.fillStyle = `rgba(${14 + r() * 10},${12 + r() * 8},${26 + r() * 14},1)`;
    ctx.beginPath();
    ctx.moveTo(x - w / 2, 30);
    ctx.lineTo(x - w / 3, V);
    ctx.lineTo(x + w / 3, V);
    ctx.lineTo(x + w / 2, 30);
    ctx.fill();
  }
  // troncos cercanos con raíces y corteza
  for (let i = 0; i < 9; i++) {
    const x = 50 + i * 112 + (r() - 0.5) * 40,
      w = 38 + r() * 18;
    ctx.beginPath();
    ctx.moveTo(x - w * 0.9, 34);
    ctx.quadraticCurveTo(x - w * 0.55, 60, x - w / 2, 120);
    ctx.lineTo(x - w / 2, V);
    ctx.lineTo(x + w / 2, V);
    ctx.lineTo(x + w / 2, 120);
    ctx.quadraticCurveTo(x + w * 0.55, 60, x + w * 0.9, 34);
    ctx.closePath();
    fillStroke(
      ctx,
      lgrad(ctx, x - w, 0, x + w, 0, [
        [0, '#3a3046'],
        [0.4, '#1d1826'],
        [1, '#0c0a12'],
      ]),
      INK,
      3.2,
    );
    ctx.strokeStyle = 'rgba(0,0,0,0.45)';
    ctx.lineWidth = 1.6;
    for (let k = 0; k < 5; k++) {
      const gx = x - w / 2 + 6 + r() * (w - 12);
      ctx.beginPath();
      ctx.moveTo(gx, 60 + r() * 60);
      ctx.quadraticCurveTo(gx + 4, 150, gx - 2, V);
      ctx.stroke();
    }
    // raíces hacia abajo (hacia el suelo)
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(x + (s * w) / 2, 60);
      ctx.quadraticCurveTo(x + s * w * 0.9, 30, x + s * w * 1.4, 6);
      ctx.lineTo(x + s * w * 1.2, 0);
      ctx.lineTo(x + (s * w) / 2, 30);
      ctx.closePath();
      fillStroke(ctx, '#1d1826', INK, 2.6);
    }
    // ojos de lechuza / setas luminosas tenues
    if (r() < 0.4) {
      const my = 20 + r() * 20;
      for (let k = 0; k < 3; k++) {
        const mx = x - w / 2 + 2;
        ell(ctx, mx, my + k * 7, 5, 2.5);
        fillStroke(ctx, '#b8a6d8', INK, 1.2);
      }
    }
  }
  // murete de piedra al pie (0‒36)
  ctx.fillStyle = '#1a1a2c';
  ctx.fillRect(0, 0, U, 36);
  let x = 0;
  while (x < U) {
    const w = 40 + r() * 50;
    ctx.fillStyle = `rgb(${44 + r() * 14},${44 + r() * 12},${70 + r() * 18})`;
    ctx.fillRect(x + 1, 2, w - 2, 32);
    ctx.strokeStyle = '#07070f';
    ctx.lineWidth = 2.4;
    ctx.strokeRect(x + 1, 2, w - 2, 32);
    x += w;
  }
  ctx.fillStyle = 'rgba(60,90,60,0.45)';
  for (let i = 0; i < 40; i++) ctx.fillRect(r() * U, 2 + r() * 10, 14 + r() * 30, 4);
  // guirnaldas de hiedra colgando sobre el murete
  ctx.strokeStyle = '#2a3a2a';
  ctx.lineWidth = 2;
  for (let i = 0; i < 60; i++) {
    const gx = r() * U;
    ctx.beginPath();
    ctx.moveTo(gx, 36);
    ctx.quadraticCurveTo(gx + 4, 50, gx - 2, 56 + r() * 30);
    ctx.stroke();
  }
}

function wallFence(ctx: CanvasRenderingContext2D, side: 'E' | 'W') {
  const r = rngf(side === 'E' ? 51 : 53);
  const U = WORLD,
    V = WALL_H;
  // cielo plomizo
  ctx.fillStyle = lgrad(ctx, 0, 0, 0, V, [
    [0, '#45474f'],
    [0.45, '#2e3038'],
    [1, '#1c1d25'],
  ]);
  ctx.fillRect(0, 0, U, V);
  // colinas con hierba gris
  for (let i = 0; i < 3; i++) {
    const y = 70 + i * 36;
    ctx.fillStyle = `rgb(${46 - i * 8},${56 - i * 8},${46 - i * 6})`;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    for (let x = 0; x <= U; x += 25) ctx.lineTo(x, y + Math.sin(x * 0.01 + i * 2) * 14 + Math.sin(x * 0.027 + i) * 6);
    ctx.lineTo(U, 0);
    ctx.fill();
  }
  // lápidas y árboles muertos a lo lejos
  for (let i = 0; i < 26; i++) {
    const x = r() * U,
      y = 70 + r() * 50,
      h = 10 + r() * 16;
    ctx.fillStyle = `rgba(${90 + r() * 30},${92 + r() * 30},${100 + r() * 30},0.9)`;
    ctx.beginPath();
    ctx.moveTo(x - h * 0.35, y);
    ctx.lineTo(x - h * 0.35, y + h * 0.7);
    ctx.arc(x, y + h * 0.7, h * 0.35, Math.PI, 0);
    ctx.lineTo(x + h * 0.35, y);
    ctx.fill();
  }
  for (let i = 0; i < 7; i++) {
    const x = 60 + r() * (U - 120),
      h = 90 + r() * 90;
    ctx.strokeStyle = '#111014';
    ctx.lineCap = 'round';
    const branch = (x0: number, y0: number, a: number, l: number, w: number, d: number) => {
      if (d === 0 || l < 6) return;
      const x1 = x0 + Math.cos(a) * l,
        y1 = y0 + Math.sin(a) * l;
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
      branch(x1, y1, a + 0.35 + r() * 0.3, l * 0.68, w * 0.65, d - 1);
      branch(x1, y1, a - 0.35 - r() * 0.3, l * 0.68, w * 0.65, d - 1);
    };
    branch(x, 70, Math.PI / 2, h * 0.45, 9, 5);
  }
  // almas errantes a lo lejos
  for (let i = 0; i < 12; i++) {
    const x = r() * U,
      y = 72 + r() * 40;
    ctx.fillStyle = 'rgba(210,210,225,0.22)';
    ell(ctx, x, y + 10, 5, 11);
    ctx.fill();
  }
  // bruma baja
  ctx.fillStyle = lgrad(ctx, 0, 40, 0, 90, [
    [0, 'rgba(150,150,165,0.45)'],
    [1, 'rgba(150,150,165,0)'],
  ]);
  ctx.fillRect(0, 40, U, 50);
  // murete de piedra seca con tramos caídos (0‒58)
  const fence = (x0: number, x1: number, h: number) => {
    for (let row = 0; row * 14 < h; row++) {
      let x = x0 - r() * 30;
      while (x < x1) {
        const w = 24 + r() * 34;
        const xa = Math.max(x0, x),
          xb = Math.min(x1, x + w);
        if (xb > xa) {
          ctx.fillStyle = `rgb(${86 + r() * 26},${82 + r() * 22},${74 + r() * 20})`;
          ctx.fillRect(xa, row * 14, xb - xa, 13);
          ctx.strokeStyle = '#141210';
          ctx.lineWidth = 2;
          ctx.strokeRect(xa, row * 14, xb - xa, 13);
        }
        x += w;
      }
    }
    ctx.fillStyle = 'rgba(60,80,55,0.5)';
    for (let i = 0; i < (x1 - x0) / 20; i++) ctx.fillRect(x0 + r() * (x1 - x0), r() * h, 10 + r() * 20, 3);
  };
  let x = 0;
  while (x < U) {
    const w = 120 + r() * 160;
    const h = r() < 0.25 ? 22 + r() * 16 : 52 + r() * 8;
    fence(x, Math.min(U, x + w), h);
    x += w + (r() < 0.3 ? 30 + r() * 40 : 0);
  }
  // zarzas sobre el murete
  ctx.strokeStyle = '#1a140f';
  ctx.lineWidth = 2;
  for (let i = 0; i < 90; i++) {
    const gx = r() * U,
      gy = 40 + r() * 20;
    for (let k = 0; k < 3; k++) {
      const a = r() * Math.PI,
        l = 14 + r() * 26;
      ctx.beginPath();
      ctx.moveTo(gx, gy);
      ctx.quadraticCurveTo(gx + Math.cos(a + 0.5) * l * 0.5, gy + Math.sin(a + 0.5) * l * 0.5, gx + Math.cos(a) * l, gy + Math.sin(a) * l);
      ctx.stroke();
    }
  }
}

export function drawWalls(scene: Phaser.Scene, b: Biome) {
  const w = Math.ceil(WORLD * K),
    h = Math.ceil((WORLD * K) / 2 + WALL_H);
  (['E', 'W'] as const).forEach((side) => {
    const { c, ctx } = mkCanvas(w, h);
    ctx.save();
    if (side === 'E') ctx.setTransform(K, K / 2, 0, -1, 0, WALL_H);
    else ctx.setTransform(-K, K / 2, 0, -1, w, WALL_H);
    if (b.wall === 'hull') wallHull(ctx, side);
    else if (b.wall === 'forest') wallForest(ctx, side);
    else wallFence(ctx, side);
    // sombra al pie de la pared
    ctx.fillStyle = lgrad(ctx, 0, 0, 0, 60, [
      [0, 'rgba(0,0,0,0.5)'],
      [1, 'rgba(0,0,0,0)'],
    ]);
    ctx.fillRect(0, 0, WORLD, 60);
    ctx.restore();
    reg(scene, `wall${side}_${b.id}`, c);
  });
}

// ═════════════ Puertas ═════════════
function door(scene: Phaser.Scene, b: Biome, side: 'E' | 'W', part: 'frame' | 'veil' | 'lock') {
  const { c, ctx } = mkCanvas(DOOR_W, DOOR_H);
  if (side === 'E') ctx.setTransform(K, K / 2, 0, -1, 0, DOOR_V);
  else ctx.setTransform(-K, K / 2, 0, -1, DOOR_W, DOOR_V);
  const inner = () => archPath(ctx, 20, 0, 130, 166, 50);
  const d = b.door;
  if (part === 'frame') {
    archPath(ctx, 0, 0, 170, 172, 62);
    fillStroke(
      ctx,
      lgrad(ctx, 0, 0, 170, 0, [
        [0, d.frame[0]],
        [0.5, d.frame[1]],
        [1, d.frame[2]],
      ]),
      INK,
      4.5,
    );
    // sillares del arco
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 9; i++) {
      const t = i / 8;
      const ax = 10 + t * 150,
        ay = 160 + Math.sin(t * Math.PI) * 50;
      ctx.beginPath();
      ctx.moveTo(ax, ay + 8);
      ctx.lineTo(ax * 0.88 + 85 * 0.12, ay - 16);
      ctx.stroke();
    }
    for (const x of [4, 156]) {
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(x, 6, 10, 150);
      for (let v = 20; v < 150; v += 24) {
        ctx.strokeStyle = 'rgba(255,255,255,0.12)';
        ctx.lineWidth = 1.6;
        ctx.strokeRect(x + 2, v, 6, 10);
      }
    }
    inner();
    fillStroke(
      ctx,
      lgrad(ctx, 0, 0, 0, 210, [
        [0, '#010203'],
        [1, '#0a0a12'],
      ]),
      INK,
      4,
    );
    // calavera-clave del arco
    const cx = 85,
      cy = 226;
    ell(ctx, cx, cy, 19, 17);
    fillStroke(
      ctx,
      rgrad(ctx, cx - 5, cy + 5, 2, 20, [
        [0, '#ffffff'],
        [1, d.skull],
      ]),
      INK,
      3,
    );
    ell(ctx, cx - 8, cy + 1, 5, 6);
    ctx.fillStyle = INK;
    ctx.fill();
    ell(ctx, cx + 8, cy + 1, 5, 6);
    ctx.fill();
    poly(ctx, [
      [cx - 2, cy - 5],
      [cx + 2, cy - 5],
      [cx, cy - 10],
    ]);
    ctx.fill();
    ctx.fillStyle = d.skull;
    ctx.fillRect(cx - 9, cy - 18, 18, 7);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.4;
    for (let i = -8; i <= 8; i += 4) {
      ctx.beginPath();
      ctx.moveTo(cx + i, cy - 18);
      ctx.lineTo(cx + i, cy - 11);
      ctx.stroke();
    }
    // volutas de piedra
    ctx.strokeStyle = d.frame[0];
    ctx.lineWidth = 4;
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(cx + s * 18, cy - 2);
      ctx.bezierCurveTo(cx + s * 50, cy + 8, cx + s * 58, cy - 26, cx + s * 40, cy - 20);
      ctx.stroke();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.strokeStyle = d.frame[0];
      ctx.lineWidth = 4;
    }
  } else if (part === 'veil') {
    ctx.save();
    inner();
    ctx.clip();
    ctx.fillStyle = lgrad(ctx, 0, 0, 0, 215, [
      [0, d.veil + '0.18)'],
      [0.6, d.veil + '0.42)'],
      [1, d.veil + '0.7)'],
    ]);
    ctx.fillRect(0, 0, 170, 230);
    for (let i = 0; i < 11; i++) {
      const x = 26 + i * 12.5;
      ctx.strokeStyle = `rgba(255,255,255,${0.12 + (i % 3) * 0.08})`;
      ctx.lineWidth = 2.2 + (i % 4);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      for (let v = 0; v <= 220; v += 10) ctx.lineTo(x + Math.sin(v * 0.07 + i) * 5, v);
      ctx.stroke();
    }
    ctx.restore();
  } else {
    ctx.save();
    inner();
    ctx.clip();
    ctx.fillStyle = 'rgba(8,4,12,0.8)';
    ctx.fillRect(0, 0, 170, 230);
    for (const dir of [1, -1]) {
      const x0 = dir > 0 ? 20 : 150,
        x1 = dir > 0 ? 150 : 20;
      for (let i = 0; i <= 14; i++) {
        const t = i / 14;
        const x = x0 + (x1 - x0) * t,
          v = 10 + 160 * t;
        ctx.save();
        ctx.translate(x, v);
        ctx.rotate(dir > 0 ? 0.9 : -0.9);
        ell(ctx, 0, 0, i % 2 ? 4.5 : 8, i % 2 ? 8 : 4.5);
        ctx.strokeStyle = INK;
        ctx.lineWidth = 5;
        ctx.stroke();
        ctx.strokeStyle = '#8a98a0';
        ctx.lineWidth = 2.4;
        ctx.stroke();
        ctx.restore();
      }
    }
    ctx.restore();
    ell(ctx, 85, 92, 26, 26);
    fillStroke(ctx, '#2a1c20', '#a85a70', 4);
    ctx.strokeStyle = '#c98a9a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(85, 80);
    ctx.lineTo(85, 98);
    ctx.moveTo(74, 92);
    ctx.lineTo(96, 92);
    ctx.stroke();
  }
  reg(scene, `door${part[0].toUpperCase() + part.slice(1)}${side}_${b.id}`, c);
  ORIGINS[`door${side}`] = [side === 'E' ? (85 * K) / DOOR_W : (DOOR_W - 85 * K) / DOOR_W, (DOOR_V + (K / 2) * 85) / DOOR_H];
}

export function drawDoors(scene: Phaser.Scene, b: Biome) {
  (['E', 'W'] as const).forEach((s) => {
    door(scene, b, s, 'frame');
    door(scene, b, s, 'veil');
    door(scene, b, s, 'lock');
  });
}

// ═════════════ Atrezo (billboards) ═════════════
// ═════════════ Capas de parallax de primer plano (estilo Hades) ═════════════
/** Franja de vegetación en silueta negra que se superpone al final del mundo. */
export function drawForeground(scene: Phaser.Scene, b: Biome) {
  const W = 2600,
    H = 360;
  const { c, ctx } = mkCanvas(W, H, 1.25);
  const r = rngf(b.id === 'erebus' ? 61 : b.id === 'oceanus' ? 62 : 63);
  ctx.fillStyle = '#010203';
  ctx.fillRect(0, H - 26, W, 26);

  const twig = (x: number, y: number, ang: number, len: number, wd: number, d: number, hook: number) => {
    if (d === 0 || len < 7) return;
    const x1 = x + Math.cos(ang) * len,
      y1 = y + Math.sin(ang) * len;
    ctx.strokeStyle = '#010203';
    ctx.lineWidth = wd;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x1, y1);
    ctx.stroke();
    if (hook > 0 && d > 1) {
      // ganchos/espuelas como las ramas del Erebo
      const ha = ang + (r() < 0.5 ? 1.9 : -1.9);
      ctx.lineWidth = wd * 0.55;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.quadraticCurveTo(x1 + Math.cos(ha) * 10, y1 + Math.sin(ha) * 10 - 4, x1 + Math.cos(ha) * 15, y1 + Math.sin(ha) * 15 - 9);
      ctx.stroke();
    }
    twig(x1, y1, ang + (r() - 0.5) * 1.15, len * (0.62 + r() * 0.2), wd * 0.62, d - 1, hook);
    if (r() < 0.55) twig(x1, y1, ang + (r() - 0.5) * 2.1, len * 0.5, wd * 0.5, d - 1, hook);
  };

  if (b.id === 'erebus') {
    // árboles muertos retorcidos en silueta
    for (let i = 0; i < 7; i++) {
      const x = 120 + r() * (W - 240);
      twig(x, H + 10, -Math.PI / 2 + (r() - 0.5) * 0.5, 70 + r() * 60, 15 + r() * 9, 5, 1);
    }
    // zarzas espinosas a ras de suelo
    for (let i = 0; i < 34; i++) {
      const x = r() * W;
      twig(x, H + 6, -Math.PI / 2 + (r() - 0.5) * 1.2, 26 + r() * 40, 5 + r() * 4, 4, r() < 0.5 ? 1 : 0);
    }
  } else if (b.id === 'oceanus') {
    // enredaderas de corales, cuerdas y percebes colgando
    for (let i = 0; i < 40; i++) {
      const x = r() * W;
      ctx.strokeStyle = '#010203';
      ctx.lineWidth = 3 + r() * 5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x, H + 6);
      ctx.quadraticCurveTo(x + (r() - 0.5) * 30, H - 20 - r() * 60, x + (r() - 0.5) * 44, H - 40 - r() * 110);
      ctx.stroke();
    }
    for (let i = 0; i < 12; i++) {
      // cuerdas anudadas
      const x = 100 + r() * (W - 200);
      ctx.strokeStyle = '#010203';
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(x, H + 4);
      ctx.quadraticCurveTo(x + 8, H - 60, x - 6, H - 110 - r() * 60);
      ctx.stroke();
      ctx.lineWidth = 3;
      for (let k = 1; k <= 3; k++) {
        const y = H - k * (30 + r() * 14);
        ctx.beginPath();
        ctx.ellipse(x - 4, y, 9, 5, 0.3, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  } else {
    // ramos de asfódelo y matas altas
    for (let i = 0; i < 26; i++) {
      const x = r() * W;
      twig(x, H + 8, -Math.PI / 2 + (r() - 0.5) * 0.9, 34 + r() * 46, 4 + r() * 4, 4, 0);
    }
    for (let i = 0; i < 16; i++) {
      const x = 140 + r() * (W - 280);
      twig(x, H + 10, -Math.PI / 2 + (r() - 0.5) * 0.4, 60 + r() * 50, 11 + r() * 7, 4, r() < 0.4 ? 1 : 0);
    }
    // cabezuelas de flores marchitas en silueta
    for (let i = 0; i < 24; i++) {
      const x = r() * W,
        y = H - 30 - r() * 90;
      for (let k = 0; k < 4; k++) {
        ell(ctx, x + (r() - 0.5) * 16, y + (r() - 0.5) * 10, 4 + r() * 4, 5 + r() * 5, r());
        ctx.fillStyle = '#010203';
        ctx.fill();
      }
    }
  }

  // bruma inferior para fundir la franja con el suelo
  ctx.fillStyle = lgrad(ctx, 0, H - 90, 0, H, [
    [0, 'rgba(1,2,3,0)'],
    [1, 'rgba(1,2,3,0.9)'],
  ]);
  ctx.fillRect(0, H - 90, W, 90);

  reg(scene, `fg_${b.id}`, c);
}

/** Dosel de ramas y raíces colgantes que enmarca la parte superior. */
export function drawCanopy(scene: Phaser.Scene, b: Biome) {
  const W = 2600,
    H = 240;
  const { c, ctx } = mkCanvas(W, H, 1.25);
  const r = rngf(b.id === 'erebus' ? 71 : b.id === 'oceanus' ? 72 : 73);
  ctx.fillStyle = '#010203';
  ctx.fillRect(0, 0, W, 22);

  const twig = (x: number, y: number, ang: number, len: number, wd: number, d: number) => {
    if (d === 0 || len < 7) return;
    const x1 = x + Math.cos(ang) * len,
      y1 = y + Math.sin(ang) * len;
    ctx.strokeStyle = '#010203';
    ctx.lineWidth = wd;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x1, y1);
    ctx.stroke();
    twig(x1, y1, ang + (r() - 0.5) * 1.1, len * (0.6 + r() * 0.2), wd * 0.6, d - 1);
    if (r() < 0.5) twig(x1, y1, ang + (r() - 0.5) * 2, len * 0.45, wd * 0.5, d - 1);
  };

  for (let i = 0; i < 30; i++) {
    const x = r() * W;
    twig(x, -6, Math.PI / 2 + (r() - 0.5) * 1.1, 40 + r() * 70, 9 + r() * 10, 4);
  }
  if (b.id !== 'oceanus') {
    // racimos de flores colgando
    for (let i = 0; i < 20; i++) {
      const x = r() * W,
        y = 40 + r() * 110;
      for (let k = 0; k < 3; k++) {
        ell(ctx, x + (r() - 0.5) * 14, y + (r() - 0.5) * 12, 3.5 + r() * 3.5, 4.5 + r() * 4, r());
        ctx.fillStyle = '#010203';
        ctx.fill();
      }
    }
  } else {
    // cadenas y cuerdas del navío
    for (let i = 0; i < 10; i++) {
      const x = 120 + r() * (W - 240);
      for (let k = 0; k < 5; k++) {
        ell(ctx, x, 30 + k * 26, 7, 11);
        ctx.strokeStyle = '#010203';
        ctx.lineWidth = 4;
        ctx.stroke();
      }
    }
  }
  reg(scene, `canopy_${b.id}`, c);
}

export function drawProps(scene: Phaser.Scene) {
  const S = 2;
  const shadowEll = (ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number) => {
    ell(ctx, x, y, rx, ry);
    ctx.fillStyle = 'rgba(0,0,0,0.42)';
    ctx.fill();
  };

  // ── Pilar con tentáculo (Océano) ──
  {
    const w = 120,
      h = 360;
    const { c, ctx } = mkCanvas(w, h, S);
    const cx = 60,
      base = 330,
      top = 52,
      R = 36;
    shadowEll(ctx, cx, base + 6, 58, 25);
    ell(ctx, cx, base - 6, 52, 23);
    fillStroke(ctx, '#0d171a', INK, 3);
    ctx.beginPath();
    ctx.moveTo(cx - 52, base - 22);
    ctx.lineTo(cx - 52, base - 6);
    ctx.ellipse(cx, base - 6, 52, 23, 0, Math.PI, 0, true);
    ctx.lineTo(cx + 52, base - 22);
    ctx.ellipse(cx, base - 22, 52, 23, 0, 0, Math.PI, false);
    ctx.closePath();
    fillStroke(
      ctx,
      lgrad(ctx, cx - 52, 0, cx + 52, 0, [
        [0, '#38565a'],
        [0.35, '#16262a'],
        [1, '#070d10'],
      ]),
      INK,
      3,
    );
    ell(ctx, cx, base - 22, 52, 23);
    fillStroke(ctx, '#2a4146', INK, 3);
    const colTop = top,
      colBot = base - 22;
    ctx.beginPath();
    ctx.moveTo(cx - R, colTop);
    ctx.lineTo(cx - R, colBot);
    ctx.ellipse(cx, colBot, R, R / 2.2, 0, Math.PI, 0, true);
    ctx.lineTo(cx + R, colTop);
    ctx.ellipse(cx, colTop, R, R / 2.2, 0, 0, Math.PI, false);
    ctx.closePath();
    fillStroke(
      ctx,
      lgrad(ctx, cx - R, 0, cx + R, 0, [
        [0, '#315055'],
        [0.16, '#14252b'],
        [0.65, '#0a1317'],
        [1, '#04080a'],
      ]),
      INK,
      3.5,
    );
    ctx.save();
    ctx.clip();
    const pitch = 66;
    for (let k = -1; k < 6; k++) {
      ctx.beginPath();
      for (let t = -Math.PI / 2; t <= Math.PI / 2 + 0.001; t += 0.12) {
        const x = cx + Math.sin(t) * (R + 4);
        const y = colTop + 20 + k * pitch + (t + Math.PI / 2) * (pitch / (2 * Math.PI)) * 1.1 + Math.cos(t) * 8;
        t === -Math.PI / 2 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.lineWidth = 24 - k * 0.6;
      ctx.strokeStyle = INK;
      ctx.stroke();
      ctx.lineWidth = 18 - k * 0.6;
      ctx.strokeStyle = lgrad(ctx, cx - R, 0, cx + R, 0, [
        [0, '#b02a3d'],
        [0.3, '#6d1423'],
        [1, '#2b0710'],
      ]);
      ctx.stroke();
    }
    ctx.restore();
    ell(ctx, cx, colTop, R + 4, (R + 4) / 2.2);
    fillStroke(ctx, '#34505a', INK, 3.5);
    ell(ctx, cx, colTop, R - 8, (R - 8) / 2.2);
    fillStroke(ctx, '#0a1519', INK, 2);
    reg(scene, 'pillar', c);
    ORIGINS.pillar = [0.5, (base - 8) / h];
  }

  // ── Barril ──
  {
    const w = 70,
      h = 92;
    const { c, ctx } = mkCanvas(w, h, S);
    const cx = 35;
    shadowEll(ctx, cx, 84, 30, 9);
    ctx.beginPath();
    ctx.moveTo(cx - 25, 22);
    ctx.bezierCurveTo(cx - 33, 40, cx - 33, 66, cx - 25, 80);
    ctx.ellipse(cx, 80, 25, 8, 0, Math.PI, 0, true);
    ctx.bezierCurveTo(cx + 33, 66, cx + 33, 40, cx + 25, 22);
    ctx.closePath();
    fillStroke(
      ctx,
      lgrad(ctx, cx - 30, 0, cx + 30, 0, [
        [0, '#8c4a3a'],
        [0.4, '#5a2a24'],
        [1, '#261012'],
      ]),
      INK,
      3,
    );
    ctx.save();
    ctx.clip();
    ctx.strokeStyle = 'rgba(0,0,0,0.45)';
    ctx.lineWidth = 1.6;
    for (let x = -22; x <= 22; x += 9) {
      ctx.beginPath();
      ctx.moveTo(cx + x, 15);
      ctx.lineTo(cx + x * 1.15, 86);
      ctx.stroke();
    }
    for (const y of [34, 66]) {
      ctx.fillStyle = '#2a3639';
      ctx.fillRect(cx - 36, y - 4, 72, 8);
      ctx.strokeStyle = INK;
      ctx.strokeRect(cx - 36, y - 4, 72, 8);
    }
    ctx.restore();
    ell(ctx, cx, 22, 25, 8.5);
    fillStroke(ctx, '#4d2022', INK, 3);
    ell(ctx, cx, 22, 20, 6);
    fillStroke(ctx, '#17080a', INK, 2);
    ctx.fillStyle = '#5a9a6a';
    [
      [-18, 24, 20],
      [-6, 22, 34],
      [10, 24, 26],
    ].forEach(([dx, y0, len]) => {
      ctx.beginPath();
      ctx.moveTo(cx + dx - 4, y0);
      ctx.lineTo(cx + dx - 3, y0 + len);
      ctx.arc(cx + dx, y0 + len, 3.2, Math.PI, 0, true);
      ctx.lineTo(cx + dx + 4, y0);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.4;
      ctx.stroke();
    });
    reg(scene, 'barrel', c);
    ORIGINS.barrel = [0.5, 84 / h];
  }

  // ── Caja ──
  {
    const w = 84,
      h = 96;
    const { c, ctx } = mkCanvas(w, h, S);
    const cx = 42;
    shadowEll(ctx, cx, 86, 38, 10);
    poly(ctx, [
      [cx - 36, 40],
      [cx, 58],
      [cx, 90],
      [cx - 36, 72],
    ]);
    fillStroke(
      ctx,
      lgrad(ctx, 0, 40, 0, 90, [
        [0, '#2b3539'],
        [1, '#161c20'],
      ]),
      INK,
      3,
    );
    poly(ctx, [
      [cx, 58],
      [cx + 36, 40],
      [cx + 36, 72],
      [cx, 90],
    ]);
    fillStroke(ctx, '#0f1418', INK, 3);
    poly(ctx, [
      [cx, 22],
      [cx + 36, 40],
      [cx, 58],
      [cx - 36, 40],
    ]);
    fillStroke(ctx, '#3d4a50', INK, 3);
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 1.6;
    for (let i = 1; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(cx - 36, 40 + i * 8);
      ctx.lineTo(cx, 58 + i * 8);
      ctx.moveTo(cx + 36, 40 + i * 8);
      ctx.lineTo(cx, 58 + i * 8);
      ctx.stroke();
    }
    ctx.fillStyle = '#9a7a3a';
    ctx.fillRect(cx - 2, 60, 4, 8);
    reg(scene, 'crate', c);
    ORIGINS.crate = [0.5, 88 / h];
  }

  // ── Saco ──
  {
    const w = 64,
      h = 70;
    const { c, ctx } = mkCanvas(w, h, S);
    const cx = 32;
    shadowEll(ctx, cx, 62, 28, 8);
    ctx.beginPath();
    ctx.moveTo(cx - 12, 12);
    ctx.bezierCurveTo(cx - 34, 30, cx - 34, 60, cx - 16, 62);
    ctx.lineTo(cx + 16, 62);
    ctx.bezierCurveTo(cx + 34, 60, cx + 34, 30, cx + 12, 12);
    ctx.closePath();
    fillStroke(
      ctx,
      lgrad(ctx, cx - 30, 0, cx + 30, 0, [
        [0, '#5a584c'],
        [0.5, '#34332c'],
        [1, '#15150f'],
      ]),
      INK,
      3,
    );
    ctx.strokeStyle = '#a8864a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx - 12, 14);
    ctx.quadraticCurveTo(cx, 20, cx + 12, 14);
    ctx.stroke();
    ell(ctx, cx, 40, 8, 8);
    ctx.fillStyle = '#c9c9b0';
    ctx.fill();
    ell(ctx, cx - 3, 39, 2, 2.4);
    ell(ctx, cx + 3, 39, 2, 2.4);
    ctx.fillStyle = INK;
    ctx.fill();
    reg(scene, 'bag', c);
    ORIGINS.bag = [0.5, 62 / h];
  }

  // ── Montón de oro ──
  {
    const w = 170,
      h = 100;
    const { c, ctx } = mkCanvas(w, h, S);
    const r = rngf(5);
    shadowEll(ctx, 85, 86, 78, 14);
    const mound = () => {
      ctx.beginPath();
      ctx.moveTo(8, 84);
      ctx.bezierCurveTo(14, 50, 52, 18, 85, 14);
      ctx.bezierCurveTo(120, 18, 156, 50, 162, 84);
      ctx.closePath();
    };
    mound();
    fillStroke(ctx, '#6a4c12', INK, 3);
    ctx.save();
    mound();
    ctx.clip();
    const cols = ['#e2bd4a', '#c9981f', '#f0d06e', '#a8781a', '#d9a832'];
    for (let i = 0; i < 260; i++) {
      const x = 8 + r() * 154;
      const y = 14 + Math.pow(r(), 0.7) * 72;
      ell(ctx, x, y, 7.5, 3.8, (r() - 0.5) * 0.6);
      ctx.fillStyle = cols[Math.floor(r() * cols.length)];
      ctx.fill();
      ctx.strokeStyle = 'rgba(40,24,0,0.85)';
      ctx.lineWidth = 1.1;
      ctx.stroke();
    }
    ctx.fillStyle = lgrad(ctx, 0, 14, 0, 90, [
      [0, 'rgba(255,240,150,0.1)'],
      [1, 'rgba(0,0,0,0.5)'],
    ]);
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
    mound();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    ctx.stroke();
    reg(scene, 'gold', c);
    ORIGINS.gold = [0.5, 84 / h];
  }

  // ── Timón ──
  {
    const w = 150,
      h = 170;
    const { c, ctx } = mkCanvas(w, h, S);
    const cx = 75,
      cy = 72;
    shadowEll(ctx, cx, 158, 36, 9);
    poly(ctx, [
      [cx - 9, cy],
      [cx + 9, cy],
      [cx + 14, 156],
      [cx - 14, 156],
    ]);
    fillStroke(ctx, '#2a2418', INK, 3);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + 0.2;
      const x1 = cx + Math.cos(a) * 62,
        y1 = cy + Math.sin(a) * 62;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(x1, y1);
      ctx.strokeStyle = INK;
      ctx.lineWidth = 11;
      ctx.stroke();
      ctx.strokeStyle = '#b8902a';
      ctx.lineWidth = 6;
      ctx.stroke();
      ell(ctx, x1, y1, 6, 6);
      fillStroke(ctx, '#d4ad48', INK, 2.5);
    }
    ell(ctx, cx, cy, 44, 44);
    ctx.lineWidth = 15;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.lineWidth = 9;
    ctx.strokeStyle = lgrad(ctx, cx - 40, cy - 40, cx + 40, cy + 40, [
      [0, '#e8cc7a'],
      [1, '#8a6318'],
    ]);
    ctx.stroke();
    ell(ctx, cx, cy, 13, 13);
    fillStroke(ctx, '#d4b45a', INK, 3);
    reg(scene, 'wheel', c);
    ORIGINS.wheel = [0.5, 156 / h];
  }

  // ── Farol de calavera (llama tenue) ──
  {
    const w = 60,
      h = 110;
    const { c, ctx } = mkCanvas(w, h, S);
    const cx = 30;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(cx, 0);
    ctx.lineTo(cx, 28);
    ctx.stroke();
    ctx.strokeStyle = '#6b7a7e';
    ctx.lineWidth = 1.8;
    ctx.stroke();
    poly(ctx, [
      [cx - 10, 30],
      [cx + 10, 30],
      [cx + 16, 44],
      [cx + 12, 78],
      [cx - 12, 78],
      [cx - 16, 44],
    ]);
    fillStroke(
      ctx,
      rgrad(ctx, cx, 56, 2, 30, [
        [0, 'rgba(230,240,220,0.9)'],
        [0.5, 'rgba(120,180,140,0.8)'],
        [1, 'rgba(20,50,40,0.9)'],
      ]),
      INK,
      3.5,
    );
    ctx.beginPath();
    ctx.moveTo(cx, 36);
    ctx.bezierCurveTo(cx + 12, 50, cx + 10, 68, cx, 72);
    ctx.bezierCurveTo(cx - 10, 68, cx - 12, 50, cx, 36);
    ctx.fillStyle = '#f2fff7';
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    for (const x of [cx - 11, cx, cx + 11]) {
      ctx.beginPath();
      ctx.moveTo(x, 32);
      ctx.lineTo(x * 0.98 + cx * 0.02, 78);
      ctx.stroke();
    }
    ctx.fillStyle = '#26363a';
    ctx.fillRect(cx - 14, 78, 28, 7);
    ctx.strokeRect(cx - 14, 78, 28, 7);
    ell(ctx, cx, 96, 10, 9);
    fillStroke(ctx, '#d9efe2', INK, 2.5);
    ell(ctx, cx - 4, 96, 2.6, 3.2);
    ctx.fillStyle = INK;
    ctx.fill();
    ell(ctx, cx + 4, 96, 2.6, 3.2);
    ctx.fill();
    reg(scene, 'lantern', c);
    ORIGINS.lantern = [0.5, 0];
  }

  // ── Árbol de Erebo (obstáculo) ──
  {
    const w = 220,
      h = 400;
    const { c, ctx } = mkCanvas(w, h, S);
    const r = rngf(7);
    const cx = 110,
      base = 372;
    shadowEll(ctx, cx, base + 4, 70, 26);
    // raíces
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.3;
      const rx = cx + Math.cos(a) * 54,
        ry = base - 4 + Math.sin(a) * 18;
      ctx.beginPath();
      ctx.moveTo(cx - 10, base - 40);
      ctx.quadraticCurveTo(cx + Math.cos(a) * 30, base - 10, rx, ry);
      ctx.lineTo(rx + 6, ry + 2);
      ctx.quadraticCurveTo(cx + Math.cos(a) * 32, base - 2, cx + 10, base - 36);
      ctx.closePath();
      fillStroke(ctx, '#211a28', INK, 2.6);
    }
    // tronco
    ctx.beginPath();
    ctx.moveTo(cx - 34, base - 20);
    ctx.bezierCurveTo(cx - 24, base - 120, cx - 28, base - 220, cx - 14, 130);
    ctx.lineTo(cx + 16, 130);
    ctx.bezierCurveTo(cx + 30, base - 220, cx + 26, base - 120, cx + 34, base - 20);
    ctx.closePath();
    fillStroke(
      ctx,
      lgrad(ctx, cx - 34, 0, cx + 34, 0, [
        [0, '#3e3450'],
        [0.45, '#221c2c'],
        [1, '#0e0b14'],
      ]),
      INK,
      3.4,
    );
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 1.8;
    for (let i = 0; i < 7; i++) {
      const gx = cx - 24 + r() * 44;
      ctx.beginPath();
      ctx.moveTo(gx, base - 30);
      ctx.bezierCurveTo(gx + 6, base - 120, gx - 6, base - 200, gx + 2, 150);
      ctx.stroke();
    }
    // ramas
    for (const [sx, y, a] of [
      [-1, 180, 2.6],
      [1, 160, 0.5],
      [-1, 120, 2.3],
      [1, 110, 0.8],
    ] as [number, number, number][]) {
      ctx.beginPath();
      ctx.moveTo(cx + sx * 10, y + 10);
      ctx.quadraticCurveTo(cx + sx * 50, y - 10, cx + Math.cos(a) * 90, y - 40 + Math.sin(a) * -20);
      ctx.strokeStyle = INK;
      ctx.lineWidth = 12;
      ctx.stroke();
      ctx.strokeStyle = '#2a2236';
      ctx.lineWidth = 8;
      ctx.stroke();
    }
    // copa: masas de follaje oscuro con borde
    const blobs: [number, number, number][] = [
      [cx, 90, 78],
      [cx - 60, 120, 56],
      [cx + 62, 118, 58],
      [cx - 30, 60, 50],
      [cx + 34, 58, 52],
      [cx, 140, 60],
    ];
    for (const [bx, by, br] of blobs) {
      ell(ctx, bx, by, br, br * 0.82);
      fillStroke(ctx, '#17132a', INK, 3);
    }
    for (const [bx, by, br] of blobs) {
      ell(ctx, bx - br * 0.15, by - br * 0.2, br * 0.72, br * 0.55);
      ctx.fillStyle = 'rgba(70,58,110,0.35)';
      ctx.fill();
    }
    // hojas sueltas
    for (let i = 0; i < 40; i++) {
      const bx = cx - 100 + r() * 200,
        by = 30 + r() * 150;
      if (Math.hypot(bx - cx, (by - 100) * 1.3) > 110) continue;
      ell(ctx, bx, by, 4, 2.2, r() * 3);
      ctx.fillStyle = 'rgba(120,100,170,0.5)';
      ctx.fill();
    }
    reg(scene, 'tree', c);
    ORIGINS.tree = [0.5, base / h];
  }

  // ── Sarcófago de piedra (Erebo) ──
  {
    const w = 120,
      h = 90;
    const { c, ctx } = mkCanvas(w, h, S);
    const cx = 60;
    shadowEll(ctx, cx, 80, 54, 14);
    poly(ctx, [
      [cx - 50, 44],
      [cx, 68],
      [cx, 84],
      [cx - 50, 60],
    ]);
    fillStroke(ctx, '#2e2d44', INK, 3);
    poly(ctx, [
      [cx, 68],
      [cx + 50, 44],
      [cx + 50, 60],
      [cx, 84],
    ]);
    fillStroke(ctx, '#1b1a2c', INK, 3);
    poly(ctx, [
      [cx, 20],
      [cx + 50, 44],
      [cx, 68],
      [cx - 50, 44],
    ]);
    fillStroke(ctx, '#45445e', INK, 3);
    poly(ctx, [
      [cx, 28],
      [cx + 38, 44],
      [cx, 60],
      [cx - 38, 44],
    ]);
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();
    // relieve: figura yacente
    ell(ctx, cx - 12, 40, 6, 5);
    fillStroke(ctx, '#55546e', INK, 1.6);
    poly(ctx, [
      [cx - 6, 42],
      [cx + 22, 50],
      [cx + 16, 56],
      [cx - 8, 48],
    ]);
    fillStroke(ctx, '#55546e', INK, 1.6);
    reg(scene, 'casket', c);
    ORIGINS.casket = [0.5, 76 / h];
  }

  // ── Setas (Erebo) ──
  {
    const w = 60,
      h = 44;
    const { c, ctx } = mkCanvas(w, h, S);
    const caps: [number, number, number, string][] = [
      [18, 28, 10, '#8a6ea8'],
      [36, 32, 13, '#6b5a94'],
      [50, 26, 8, '#a88fc4'],
    ];
    for (const [x, y, rr, col] of caps) {
      ctx.fillStyle = '#d8d0c0';
      ctx.fillRect(x - rr * 0.3, y, rr * 0.6, 12);
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2;
      ctx.strokeRect(x - rr * 0.3, y, rr * 0.6, 12);
      ctx.beginPath();
      ctx.ellipse(x, y, rr, rr * 0.7, 0, Math.PI, 0);
      ctx.closePath();
      fillStroke(ctx, col, INK, 2.2);
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ell(ctx, x - rr * 0.3, y - rr * 0.35, rr * 0.2, rr * 0.14);
      ctx.fill();
    }
    reg(scene, 'shrooms', c);
    ORIGINS.shrooms = [0.5, 42 / h];
  }

  // ── Lápidas (Campos) ──
  for (const v of [0, 1]) {
    const w = 70,
      h = 100;
    const { c, ctx } = mkCanvas(w, h, S);
    const cx = 35;
    shadowEll(ctx, cx, 92, 26, 8);
    ctx.save();
    ctx.translate(cx, 0);
    ctx.rotate(v ? -0.12 : 0.05);
    ctx.translate(-cx, 0);
    if (v === 0) {
      ctx.beginPath();
      ctx.moveTo(cx - 22, 92);
      ctx.lineTo(cx - 22, 36);
      ctx.arc(cx, 36, 22, Math.PI, 0);
      ctx.lineTo(cx + 22, 92);
      ctx.closePath();
    } else {
      // cruz griega / estela
      poly(ctx, [
        [cx - 16, 92],
        [cx - 16, 30],
        [cx - 26, 30],
        [cx - 26, 18],
        [cx - 8, 18],
        [cx - 8, 6],
        [cx + 8, 6],
        [cx + 8, 18],
        [cx + 26, 18],
        [cx + 26, 30],
        [cx + 16, 30],
        [cx + 16, 92],
      ]);
    }
    fillStroke(
      ctx,
      lgrad(ctx, cx - 22, 0, cx + 22, 0, [
        [0, '#8e8a80'],
        [0.5, '#6a665c'],
        [1, '#403d36'],
      ]),
      INK,
      3,
    );
    ctx.strokeStyle = 'rgba(0,0,0,0.45)';
    ctx.lineWidth = 1.6;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(cx - 10, 44 + i * 10);
      ctx.lineTo(cx + 10, 44 + i * 10);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(cx + 4, 20);
    ctx.lineTo(cx + 12, 40);
    ctx.lineTo(cx + 8, 56);
    ctx.stroke();
    ctx.fillStyle = 'rgba(70,95,60,0.6)';
    ctx.fillRect(cx - 20, 78, 14, 10);
    ctx.fillRect(cx + 6, 84, 16, 8);
    ctx.restore();
    reg(scene, 'grave' + v, c);
    ORIGINS['grave' + v] = [0.5, 92 / h];
  }

  // ── Espino (obstáculo, Campos) ──
  {
    const w = 130,
      h = 100;
    const { c, ctx } = mkCanvas(w, h, S);
    const r = rngf(9);
    const cx = 65;
    shadowEll(ctx, cx, 90, 58, 16);
    ell(ctx, cx, 60, 54, 30);
    fillStroke(ctx, '#1d1711', INK, 3);
    ctx.lineCap = 'round';
    for (let i = 0; i < 70; i++) {
      const a = r() * Math.PI * 2,
        l = 20 + r() * 40;
      const x0 = cx + (r() - 0.5) * 70,
        y0 = 50 + (r() - 0.5) * 36;
      ctx.strokeStyle = r() < 0.5 ? '#3a2c20' : '#241a12';
      ctx.lineWidth = 2 + r() * 2;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.quadraticCurveTo(x0 + Math.cos(a + 0.5) * l * 0.5, y0 + Math.sin(a + 0.5) * l * 0.5, x0 + Math.cos(a) * l, y0 + Math.sin(a) * l * 0.6);
      ctx.stroke();
      // espinas
      ctx.strokeStyle = '#8a7a66';
      ctx.lineWidth = 1.4;
      const tx = x0 + Math.cos(a) * l * 0.5,
        ty = y0 + Math.sin(a) * l * 0.3;
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(tx + Math.cos(a + 1.5) * 5, ty + Math.sin(a + 1.5) * 5);
      ctx.stroke();
    }
    // bayas rojas oscuras
    for (let i = 0; i < 8; i++) {
      ell(ctx, cx + (r() - 0.5) * 80, 50 + (r() - 0.5) * 40, 2.5, 2.5);
      fillStroke(ctx, '#6a1a22', INK, 1);
    }
    reg(scene, 'thorn', c);
    ORIGINS.thorn = [0.5, 86 / h];
  }

  // ── Árbol muerto (Campos) ──
  {
    const w = 200,
      h = 330;
    const { c, ctx } = mkCanvas(w, h, S);
    let r = rngf(17);
    const cx = 100,
      base = 310;
    shadowEll(ctx, cx, base + 2, 44, 16);
    ctx.lineCap = 'round';
    const branch = (x0: number, y0: number, a: number, l: number, wd: number, d: number) => {
      if (d === 0 || l < 8) return;
      const x1 = x0 + Math.cos(a) * l,
        y1 = y0 + Math.sin(a) * l;
      ctx.lineWidth = wd + 4;
      ctx.strokeStyle = INK;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
      branch(x1, y1, a + 0.4 + r() * 0.3, l * 0.7, wd * 0.62, d - 1);
      branch(x1, y1, a - 0.4 - r() * 0.3, l * 0.7, wd * 0.62, d - 1);
      if (r() < 0.3) branch(x1, y1, a + (r() - 0.5) * 0.4, l * 0.6, wd * 0.5, d - 1);
    };
    const fill = (x0: number, y0: number, a: number, l: number, wd: number, d: number) => {
      if (d === 0 || l < 8) return;
      const x1 = x0 + Math.cos(a) * l,
        y1 = y0 + Math.sin(a) * l;
      ctx.lineWidth = wd;
      ctx.strokeStyle = d > 3 ? '#3a3028' : '#2a2420';
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
      fill(x1, y1, a + 0.4 + r() * 0.3, l * 0.7, wd * 0.62, d - 1);
      fill(x1, y1, a - 0.4 - r() * 0.3, l * 0.7, wd * 0.62, d - 1);
      if (r() < 0.3) fill(x1, y1, a + (r() - 0.5) * 0.4, l * 0.6, wd * 0.5, d - 1);
    };
    r = rngf(17);
    branch(cx, base - 10, -Math.PI / 2, 90, 22, 6);
    r = rngf(17);
    fill(cx, base - 10, -Math.PI / 2, 90, 22, 6);
    // base del tronco
    ctx.beginPath();
    ctx.moveTo(cx - 24, base);
    ctx.quadraticCurveTo(cx - 14, base - 30, cx - 11, base - 60);
    ctx.lineTo(cx + 11, base - 60);
    ctx.quadraticCurveTo(cx + 14, base - 30, cx + 24, base);
    ctx.closePath();
    fillStroke(ctx, '#3a3028', INK, 3);
    reg(scene, 'deadtree', c);
    ORIGINS.deadtree = [0.5, base / h];
  }

  // ── Urna funeraria ──
  {
    const w = 56,
      h = 80;
    const { c, ctx } = mkCanvas(w, h, S);
    const cx = 28;
    shadowEll(ctx, cx, 74, 20, 7);
    ctx.beginPath();
    ctx.moveTo(cx - 10, 14);
    ctx.bezierCurveTo(cx - 30, 24, cx - 26, 58, cx - 12, 72);
    ctx.lineTo(cx + 12, 72);
    ctx.bezierCurveTo(cx + 26, 58, cx + 30, 24, cx + 10, 14);
    ctx.closePath();
    fillStroke(
      ctx,
      lgrad(ctx, cx - 26, 0, cx + 26, 0, [
        [0, '#b07a4a'],
        [0.5, '#7a4e2c'],
        [1, '#3a2214'],
      ]),
      INK,
      3,
    );
    ell(ctx, cx, 14, 13, 5);
    fillStroke(ctx, '#5a3a22', INK, 2.4);
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 20, 38);
    ctx.quadraticCurveTo(cx, 44, cx + 20, 38);
    ctx.stroke();
    ctx.strokeStyle = '#e0c088';
    ctx.lineWidth = 1.6;
    for (let x = -14; x <= 14; x += 7) {
      ctx.beginPath();
      ctx.moveTo(cx + x, 46);
      ctx.lineTo(cx + x, 54);
      ctx.lineTo(cx + x + 4, 54);
      ctx.stroke();
    }
    // asas
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(cx + s * 22, 30, 8, s > 0 ? -1.2 : 1.9, s > 0 ? 1.2 : 4.3);
      ctx.strokeStyle = INK;
      ctx.lineWidth = 5;
      ctx.stroke();
      ctx.strokeStyle = '#8a5a34';
      ctx.lineWidth = 2.4;
      ctx.stroke();
    }
    reg(scene, 'urnprop', c);
    ORIGINS.urnprop = [0.5, 72 / h];
  }

  // ── Columna rota ──
  {
    const w = 80,
      h = 150;
    const { c, ctx } = mkCanvas(w, h, S);
    const cx = 40;
    shadowEll(ctx, cx, 142, 36, 12);
    ell(ctx, cx, 132, 34, 13);
    fillStroke(ctx, '#2c2a2a', INK, 3);
    ctx.beginPath();
    ctx.moveTo(cx - 22, 132);
    ctx.lineTo(cx - 22, 40);
    ctx.lineTo(cx - 10, 26);
    ctx.lineTo(cx + 4, 44);
    ctx.lineTo(cx + 14, 22);
    ctx.lineTo(cx + 22, 50);
    ctx.lineTo(cx + 22, 132);
    ctx.ellipse(cx, 132, 22, 9, 0, 0, Math.PI);
    ctx.closePath();
    fillStroke(
      ctx,
      lgrad(ctx, cx - 22, 0, cx + 22, 0, [
        [0, '#8a8478'],
        [0.5, '#5c5850'],
        [1, '#2e2c28'],
      ]),
      INK,
      3,
    );
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 2;
    for (let x = -14; x <= 14; x += 7) {
      ctx.beginPath();
      ctx.moveTo(cx + x, 50);
      ctx.lineTo(cx + x, 128);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(70,95,60,0.55)';
    ctx.fillRect(cx - 22, 110, 12, 20);
    reg(scene, 'column', c);
    ORIGINS.column = [0.5, 138 / h];
  }

  // ── Brasero de piedra ──
  {
    const w = 80,
      h = 110;
    const { c, ctx } = mkCanvas(w, h, S);
    const cx = 40;
    shadowEll(ctx, cx, 102, 30, 10);
    poly(ctx, [
      [cx - 14, 100],
      [cx + 14, 100],
      [cx + 8, 60],
      [cx - 8, 60],
    ]);
    fillStroke(ctx, '#3a3a44', INK, 3);
    ctx.beginPath();
    ctx.moveTo(cx - 30, 40);
    ctx.quadraticCurveTo(cx - 26, 66, cx, 66);
    ctx.quadraticCurveTo(cx + 26, 66, cx + 30, 40);
    ctx.closePath();
    fillStroke(
      ctx,
      lgrad(ctx, cx - 30, 0, cx + 30, 0, [
        [0, '#6a6a78'],
        [1, '#26262e'],
      ]),
      INK,
      3,
    );
    ell(ctx, cx, 40, 30, 9);
    fillStroke(ctx, '#1a1418', INK, 3);
    // brasas y llama baja
    ell(ctx, cx, 40, 22, 6);
    ctx.fillStyle = '#7a3a1a';
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx - 14, 40);
    ctx.bezierCurveTo(cx - 16, 26, cx - 4, 22, cx - 2, 10);
    ctx.bezierCurveTo(cx + 4, 20, cx + 14, 24, cx + 14, 40);
    ctx.closePath();
    fillStroke(ctx, '#d8742a', INK, 2.2);
    ctx.beginPath();
    ctx.moveTo(cx - 7, 40);
    ctx.bezierCurveTo(cx - 8, 30, cx - 1, 28, cx, 20);
    ctx.bezierCurveTo(cx + 2, 28, cx + 7, 30, cx + 7, 40);
    ctx.fillStyle = '#f6d27a';
    ctx.fill();
    reg(scene, 'brazier', c);
    ORIGINS.brazier = [0.5, 100 / h];
  }
}
