// ───────────────────────────────────────────────────────────────
//  Arte procedural de personajes, enemigos, efectos e iconos
//  (estética gouache con contornos de tinta, estilo Hades II)
// ───────────────────────────────────────────────────────────────
import Phaser from 'phaser';
import { VIEW_W, VIEW_H } from './config';
import { INK, rngf, mkCanvas, reg, fillStroke, lgrad, rgrad, ell, poly } from './artutil';
import { drawBackground, drawFloor, drawWalls, drawDoors, drawProps, drawForeground, drawCanopy, BIOMES, ORIGINS } from './art_env';

const S = 2;
type Ctx = CanvasRenderingContext2D;

// ═════════════ MELINOË ═════════════
function drawMelinoe(scene: Phaser.Scene) {
  const HAIR = '#1b1727';

  // Cabeza (frontal)
  {
    const { c, ctx } = mkCanvas(48, 58, S);
    ell(ctx, 24, 30, 22, 25);
    fillStroke(ctx, HAIR, INK, 2.5);

    // Mechones laterales
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(24 + s * 20, 30);
      ctx.bezierCurveTo(24 + s * 25, 44, 24 + s * 20, 52, 24 + s * 17, 56);
      ctx.bezierCurveTo(24 + s * 14, 48, 24 + s * 14, 40, 24 + s * 14, 32);
      fillStroke(ctx, HAIR, INK, 2.2);
    }

    ctx.fillStyle = '#d9a982';
    ctx.fillRect(20, 44, 8, 10);
    ell(ctx, 24, 32, 14, 16);
    fillStroke(
      ctx,
      lgrad(ctx, 10, 20, 38, 48, [
        [0, '#ffe1c2'],
        [1, '#e0aa84'],
      ]),
      INK,
      2.2
    );

    // Rubor suave
    ell(ctx, 15.5, 38, 3.4, 2.2);
    ctx.fillStyle = 'rgba(230,110,110,0.3)';
    ctx.fill();
    ell(ctx, 32.5, 38, 3.4, 2.2);
    ctx.fill();

    // Flequillo y diadema
    ctx.beginPath();
    ctx.moveTo(4, 33);
    ctx.bezierCurveTo(1, 8, 20, -1, 30, 2);
    ctx.bezierCurveTo(43, 5, 47, 20, 44, 34);
    ctx.bezierCurveTo(42, 27, 39, 22, 35, 20);
    ctx.bezierCurveTo(31, 27, 22, 23, 17, 17);
    ctx.bezierCurveTo(14, 25, 10, 29, 4, 33);
    ctx.closePath();
    fillStroke(ctx, HAIR, INK, 2.5);

    // Laurel/pasador de luna en el cabello
    ctx.strokeStyle = '#e2c176';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(36, 12, 5, -1, 2.4);
    ctx.stroke();

    // Mechón plateado fantasmal
    ctx.beginPath();
    ctx.moveTo(8, 12);
    ctx.bezierCurveTo(15, 16, 15, 28, 7, 44);
    ctx.bezierCurveTo(8, 32, 6, 22, 8, 12);
    fillStroke(ctx, '#eef3f7', INK, 1.4);

    // Ojos con heterocromía característica de Melinoë:
    // Ojo derecho (x=18): ámbar pálido mortal
    // Ojo izquierdo (x=30): verde esmeralda de bruja
    ell(ctx, 18, 33.5, 3.4, 3.8);
    ctx.fillStyle = '#f5df9e';
    ctx.fill();

    ell(ctx, 30, 33.5, 3.4, 3.8);
    ctx.fillStyle = '#6ee7b7';
    ctx.fill();

    // Pupilas y pestañas
    for (const x of [18, 30]) {
      ell(ctx, x, 34, 1.4, 2.2);
      ctx.fillStyle = INK;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x, 33.2, 4, Math.PI * 1.1, Math.PI * 1.95);
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.8;
      ctx.stroke();
    }

    // Boca y nariz
    ctx.strokeStyle = '#7a4a3a';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(22.5, 44);
    ctx.quadraticCurveTo(24, 45.4, 25.5, 44);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(24, 38);
    ctx.lineTo(24.5, 40);
    ctx.stroke();

    reg(scene, 'mel_head_front', c);
  }

  // Cabeza (espalda)
  {
    const { c, ctx } = mkCanvas(48, 58, S);
    ctx.fillStyle = '#d9a982';
    ctx.fillRect(20, 46, 8, 10);
    ell(ctx, 24, 30, 22, 26);
    fillStroke(
      ctx,
      lgrad(ctx, 0, 0, 48, 58, [
        [0, '#2a2440'],
        [1, '#120f1b'],
      ]),
      INK,
      2.5
    );
    ell(ctx, 24, 6, 8, 7);
    fillStroke(ctx, HAIR, INK, 2.5);
    ctx.strokeStyle = '#c9a85a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(15, 11);
    ctx.lineTo(33, 11);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(24, 14);
    ctx.bezierCurveTo(30, 26, 18, 40, 24, 56);
    ctx.bezierCurveTo(20, 44, 28, 30, 24, 14);
    fillStroke(ctx, '#eef3f7', INK, 1.4);
    reg(scene, 'mel_head_back', c);
  }

  // Torso
  {
    const { c, ctx } = mkCanvas(38, 40, S);
    ctx.beginPath();
    ctx.moveTo(4, 8);
    ctx.bezierCurveTo(9, 1, 14, 0, 19, 3);
    ctx.bezierCurveTo(24, 0, 29, 1, 34, 8);
    ctx.lineTo(31, 40);
    ctx.lineTo(7, 40);
    ctx.closePath();
    fillStroke(
      ctx,
      lgrad(ctx, 4, 0, 34, 40, [
        [0, '#ffffff'],
        [1, '#a9b6c1'],
      ]),
      INK,
      2.6
    );

    // Arneses
    ctx.fillStyle = '#1d6b6b';
    poly(ctx, [
      [8, 6],
      [14, 3],
      [30, 34],
      [24, 38],
    ]);
    fillStroke(ctx, '#1d6b6b', INK, 1.8);
    poly(ctx, [
      [30, 6],
      [24, 3],
      [8, 34],
      [14, 38],
    ]);
    fillStroke(ctx, '#238080', INK, 1.8);
    ell(ctx, 19, 21, 4.2, 4.2);
    fillStroke(ctx, '#f2cf62', INK, 1.8);

    // Faja carmesí/naranja
    ctx.beginPath();
    ctx.moveTo(6, 31);
    ctx.lineTo(32, 31);
    ctx.lineTo(31, 40);
    ctx.lineTo(7, 40);
    ctx.closePath();
    fillStroke(ctx, '#e0701f', INK, 2.2);

    poly(ctx, [
      [14, 2],
      [24, 2],
      [19, 12],
    ]);
    fillStroke(ctx, '#e6b992', INK, 1.4);
    reg(scene, 'mel_torso', c);
  }

  // Falda plisada
  {
    const { c, ctx } = mkCanvas(60, 34, S);
    ctx.beginPath();
    ctx.moveTo(16, 0);
    ctx.lineTo(44, 0);
    ctx.bezierCurveTo(50, 12, 56, 20, 58, 28);
    ctx.quadraticCurveTo(52, 34, 46, 29);
    ctx.quadraticCurveTo(40, 34, 34, 29);
    ctx.quadraticCurveTo(30, 34, 26, 29);
    ctx.quadraticCurveTo(20, 34, 14, 29);
    ctx.quadraticCurveTo(8, 34, 2, 28);
    ctx.bezierCurveTo(4, 20, 10, 12, 16, 0);
    ctx.closePath();
    fillStroke(
      ctx,
      lgrad(ctx, 8, 0, 52, 34, [
        [0, '#ffb257'],
        [0.55, '#ea7a22'],
        [1, '#b24a10'],
      ]),
      INK,
      2.8
    );
    ctx.strokeStyle = 'rgba(120,40,0,0.5)';
    ctx.lineWidth = 1.6;
    for (const x of [14, 24, 36, 46]) {
      ctx.beginPath();
      ctx.moveTo(x * 0.5 + 15, 2);
      ctx.quadraticCurveTo(x, 16, x + (x - 30) * 0.1, 28);
      ctx.stroke();
    }
    reg(scene, 'mel_skirt', c);
  }

  // Pierna
  {
    const { c, ctx } = mkCanvas(18, 44, S);
    ctx.beginPath();
    ctx.moveTo(3, 0);
    ctx.lineTo(15, 0);
    ctx.lineTo(14, 28);
    ctx.lineTo(4, 28);
    ctx.closePath();
    fillStroke(
      ctx,
      lgrad(ctx, 3, 0, 15, 0, [
        [0, '#34415a'],
        [1, '#161b28'],
      ]),
      INK,
      2.4
    );
    ctx.beginPath();
    ctx.moveTo(3, 26);
    ctx.lineTo(15, 26);
    ctx.lineTo(16, 38);
    ctx.quadraticCurveTo(19, 43, 13, 43);
    ctx.lineTo(2, 43);
    ctx.quadraticCurveTo(0, 38, 3, 26);
    ctx.closePath();
    fillStroke(
      ctx,
      lgrad(ctx, 0, 26, 18, 43, [
        [0, '#ff9a45'],
        [1, '#c8591a'],
      ]),
      INK,
      2.4
    );
    ctx.fillStyle = INK;
    ctx.fillRect(1, 41, 16, 3);
    reg(scene, 'mel_leg', c);
  }

  // Brazo derecho
  {
    const { c, ctx } = mkCanvas(16, 38, S);
    ctx.beginPath();
    ctx.moveTo(3, 0);
    ctx.lineTo(13, 0);
    ctx.lineTo(12, 13);
    ctx.lineTo(4, 13);
    ctx.closePath();
    fillStroke(ctx, '#e8eef1', INK, 2.2);
    ctx.beginPath();
    ctx.moveTo(4, 12);
    ctx.lineTo(12, 12);
    ctx.lineTo(11, 27);
    ctx.lineTo(5, 27);
    ctx.closePath();
    fillStroke(ctx, '#f0c39d', INK, 2.2);
    ctx.fillStyle = '#1d6b6b';
    ctx.fillRect(3.5, 24, 9, 5);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.6;
    ctx.strokeRect(3.5, 24, 9, 5);
    ell(ctx, 8, 32, 4.4, 4.6);
    fillStroke(ctx, '#f6cfa8', INK, 2.2);
    reg(scene, 'mel_arm', c);
  }

  // Brazo izquierdo (bruja / vendajes)
  {
    const { c, ctx } = mkCanvas(16, 38, S);
    ctx.beginPath();
    ctx.moveTo(3, 0);
    ctx.lineTo(13, 0);
    ctx.lineTo(12, 13);
    ctx.lineTo(4, 13);
    ctx.closePath();
    fillStroke(ctx, '#e8eef1', INK, 2.2);
    ctx.beginPath();
    ctx.moveTo(4, 12);
    ctx.lineTo(12, 12);
    ctx.lineTo(11, 27);
    ctx.lineTo(5, 27);
    ctx.closePath();
    fillStroke(ctx, '#3f5a58', INK, 2.2);
    ctx.strokeStyle = '#d8d2c4';
    ctx.lineWidth = 2;
    for (let y = 14; y < 27; y += 4) {
      ctx.beginPath();
      ctx.moveTo(4.5, y);
      ctx.lineTo(11.5, y + 2);
      ctx.stroke();
    }
    ell(ctx, 8, 32, 4.4, 4.6);
    fillStroke(ctx, '#4a6a66', INK, 2.2);
    reg(scene, 'mel_arm_l', c);
  }

  // Bastón de la bruja (cuchilla de luna creciente)
  {
    const { c, ctx } = mkCanvas(34, 150, S);
    ctx.beginPath();
    ctx.rect(14.5, 26, 5, 120);
    fillStroke(
      ctx,
      lgrad(ctx, 14, 0, 20, 0, [
        [0, '#7a5a3a'],
        [1, '#2a1c12'],
      ]),
      INK,
      2.4
    );
    ctx.fillStyle = '#c9a85a';
    for (const y of [60, 104]) ctx.fillRect(13.5, y, 7, 4);

    // Creciente de luna
    ctx.beginPath();
    ctx.arc(17, 16, 14, 0.5 * Math.PI + 0.45, 2.5 * Math.PI - 0.45);
    ctx.arc(21, 16, 11, 2.5 * Math.PI - 0.8, 0.5 * Math.PI + 0.8, true);
    ctx.closePath();
    fillStroke(
      ctx,
      lgrad(ctx, 4, 0, 30, 30, [
        [0, '#fff3b8'],
        [1, '#c79a35'],
      ]),
      INK,
      2.4
    );

    // Cristal central
    ell(ctx, 18, 16, 4.2, 4.2);
    fillStroke(ctx, '#b7ffd6', INK, 1.6);
    reg(scene, 'mel_staff', c);
  }

  // Coleta
  {
    const { c, ctx } = mkCanvas(26, 60, S);
    ctx.beginPath();
    ctx.moveTo(12, 0);
    ctx.bezierCurveTo(24, 14, 20, 40, 14, 58);
    ctx.bezierCurveTo(6, 42, 0, 22, 12, 0);
    ctx.closePath();
    fillStroke(
      ctx,
      lgrad(ctx, 0, 0, 0, 60, [
        [0, '#1b1727'],
        [0.6, '#28223d'],
        [1, '#e8eef5'],
      ]),
      INK,
      2.4
    );
    reg(scene, 'mel_tail', c);
  }
}

// ═════════════ ENEMIGOS Y ELEMENTOS DEL MUNDO ═════════════
function drawShade(scene: Phaser.Scene) {
  const { c, ctx } = mkCanvas(70, 96, S);
  const cx = 35;
  ctx.beginPath();
  ctx.moveTo(17, 30);
  ctx.bezierCurveTo(8, 52, 22, 64, 15, 90);
  ctx.bezierCurveTo(24, 82, 29, 94, 33, 84);
  ctx.bezierCurveTo(37, 94, 44, 80, 52, 90);
  ctx.bezierCurveTo(44, 64, 62, 52, 53, 30);
  ctx.bezierCurveTo(52, 8, 18, 8, 17, 30);
  ctx.closePath();
  fillStroke(
    ctx,
    lgrad(ctx, 0, 8, 0, 92, [
      [0, 'rgba(170,240,230,0.98)'],
      [0.5, 'rgba(70,160,170,0.9)'],
      [1, 'rgba(20,70,85,0.55)'],
    ]),
    INK,
    3
  );

  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(cx + s * 14, 40);
    ctx.quadraticCurveTo(cx + s * 24, 52, cx + s * 22, 66);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 7;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(120,210,210,0.95)';
    ctx.lineWidth = 3.6;
    ctx.stroke();
  }

  for (const x of [cx - 7.5, cx + 7.5]) {
    ell(ctx, x, 27, 4.4, 5.8);
    ctx.fillStyle = '#031014';
    ctx.fill();
    ell(ctx, x + 0.5, 26, 1.5, 2);
    ctx.fillStyle = '#b6fff4';
    ctx.fill();
  }
  reg(scene, 'shade', c);
}

function drawSkeleton(scene: Phaser.Scene, key: string, archer: boolean) {
  const { c, ctx } = mkCanvas(64, 104, S);
  const cx = 32;
  const bone = '#d7e9ee';
  const line = (x0: number, y0: number, x1: number, y1: number, w = 4.2) => {
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.strokeStyle = INK;
    ctx.lineWidth = w + 3;
    ctx.stroke();
    ctx.strokeStyle = bone;
    ctx.lineWidth = w;
    ctx.stroke();
  };

  line(cx - 6, 62, cx - 9, 82);
  line(cx - 9, 82, cx - 8, 98);
  line(cx + 6, 62, cx + 10, 80);
  line(cx + 10, 80, cx + 12, 98);

  // Faldón
  poly(ctx, [
    [cx - 11, 56],
    [cx + 11, 56],
    [cx + 14, 76],
    [cx + 8, 71],
    [cx + 3, 79],
    [cx - 2, 70],
    [cx - 7, 78],
    [cx - 14, 72],
  ]);
  fillStroke(
    ctx,
    lgrad(ctx, 0, 56, 0, 80, [
      [0, archer ? '#4a5e58' : '#f08a34'],
      [1, archer ? '#253833' : '#a94716'],
    ]),
    INK,
    2.4
  );

  line(cx, 30, cx, 58, 3.6);
  for (let i = 0; i < 4; i++) {
    ell(ctx, cx, 36 + i * 5.6, 12 - i * 1.4, 3.6);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 4.2;
    ctx.stroke();
    ctx.strokeStyle = bone;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  line(cx - 11, 32, cx - 20, 46);
  line(cx - 20, 46, cx - 14, 58);
  line(cx + 11, 32, cx + 20, 44);
  line(cx + 20, 44, cx + 18, 56);

  ell(ctx, cx, 17, 12.5, 13);
  fillStroke(
    ctx,
    rgrad(ctx, cx - 4, 12, 2, 18, [
      [0, '#f4ffff'],
      [1, '#b4d0d8'],
    ]),
    INK,
    2.8
  );

  for (const x of [cx - 5, cx + 5]) {
    ell(ctx, x, 17, 3.6, 4.2);
    ctx.fillStyle = '#031014';
    ctx.fill();
    ell(ctx, x, 17.5, 1.5, 1.8);
    ctx.fillStyle = '#6ffcff';
    ctx.fill();
  }

  if (archer) {
    ctx.beginPath();
    ctx.moveTo(cx - 15, 20);
    ctx.quadraticCurveTo(cx - 16, -2, cx, -2);
    ctx.quadraticCurveTo(cx + 16, -2, cx + 15, 20);
    ctx.quadraticCurveTo(cx + 10, 8, cx, 7);
    ctx.quadraticCurveTo(cx - 10, 8, cx - 15, 20);
    ctx.closePath();
    fillStroke(ctx, '#3a2a40', INK, 2.4);
  } else {
    ctx.beginPath();
    ctx.moveTo(cx - 13, 11);
    ctx.quadraticCurveTo(cx, 3, cx + 13, 11);
    ctx.lineTo(cx + 12, 16);
    ctx.quadraticCurveTo(cx, 9, cx - 12, 16);
    ctx.closePath();
    fillStroke(ctx, '#d8403c', INK, 2);
  }

  reg(scene, key, c);

  if (archer) {
    const bw = mkCanvas(60, 120, S);
    const g = bw.ctx;
    g.beginPath();
    g.moveTo(30, 4);
    g.quadraticCurveTo(58, 60, 30, 116);
    g.strokeStyle = INK;
    g.lineWidth = 9;
    g.stroke();
    g.strokeStyle = lgrad(g, 0, 0, 0, 120, [
      [0, '#f06ae0'],
      [0.5, '#a0129a'],
      [1, '#f06ae0'],
    ]);
    g.lineWidth = 5;
    g.stroke();
    g.beginPath();
    g.moveTo(30, 6);
    g.lineTo(30, 114);
    g.strokeStyle = '#e8e2d2';
    g.lineWidth = 1.6;
    g.stroke();
    reg(scene, 'bow_wpn', bw.c);

    const ar = mkCanvas(90, 16, S);
    const a = ar.ctx;
    a.fillStyle = '#6a4a2a';
    a.fillRect(4, 6, 66, 4);
    a.strokeStyle = INK;
    a.lineWidth = 1.6;
    a.strokeRect(4, 6, 66, 4);
    poly(a, [
      [68, 3],
      [86, 8],
      [68, 13],
    ]);
    fillStroke(a, '#f04fe0', INK, 1.8);
    reg(scene, 'arrow', ar.c);
  } else {
    const sp = mkCanvas(170, 28, S);
    const g = sp.ctx;
    g.beginPath();
    g.rect(0, 10, 128, 8);
    fillStroke(
      g,
      lgrad(g, 0, 10, 0, 18, [
        [0, '#a77a48'],
        [1, '#4a2f18'],
      ]),
      INK,
      2.4
    );
    poly(g, [
      [122, 14],
      [130, 4],
      [166, 14],
      [130, 24],
    ]);
    fillStroke(
      g,
      lgrad(g, 122, 0, 166, 0, [
        [0, '#a0129a'],
        [0.6, '#f04fe0'],
        [1, '#ffd2fa'],
      ]),
      INK,
      2.6
    );
    reg(scene, 'spear_wpn', sp.c);
  }
}

function drawBrute(scene: Phaser.Scene, key: string, captain: boolean) {
  const W = 140,
    H = 160;
  const { c, ctx } = mkCanvas(W, H, S);
  const cx = 70;
  const skin = captain
    ? (['#9fc4c4', '#5f8a8e', '#33585e'] as const)
    : (['#7fd6a8', '#4d9c78', '#2a5f4a'] as const);

  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(cx + s * 8, 104);
    ctx.lineTo(cx + s * 30, 104);
    ctx.lineTo(cx + s * 28, 146);
    ctx.lineTo(cx + s * 10, 146);
    ctx.closePath();
    fillStroke(
      ctx,
      lgrad(ctx, cx, 0, cx + s * 30, 0, [
        [0, captain ? '#1e2a44' : '#2d6a70'],
        [1, captain ? '#0e1424' : '#173a42'],
      ]),
      INK,
      3.2
    );
  }

  ctx.beginPath();
  ctx.moveTo(cx - 48, 52);
  ctx.bezierCurveTo(cx - 54, 76, cx - 36, 98, cx - 32, 112);
  ctx.lineTo(cx + 32, 112);
  ctx.bezierCurveTo(cx + 36, 98, cx + 54, 76, cx + 48, 52);
  ctx.bezierCurveTo(cx + 30, 38, cx - 30, 38, cx - 48, 52);
  ctx.closePath();
  fillStroke(
    ctx,
    lgrad(ctx, cx - 50, 40, cx + 50, 110, [
      [0, skin[0]],
      [0.5, skin[1]],
      [1, skin[2]],
    ]),
    INK,
    3.8
  );

  if (captain) {
    ctx.beginPath();
    ctx.moveTo(cx - 48, 52);
    ctx.bezierCurveTo(cx - 54, 76, cx - 36, 98, cx - 32, 114);
    ctx.lineTo(cx - 6, 114);
    ctx.lineTo(cx - 10, 50);
    ctx.closePath();
    fillStroke(ctx, '#1b2748', INK, 3);
    ctx.beginPath();
    ctx.moveTo(cx + 48, 52);
    ctx.bezierCurveTo(cx + 54, 76, cx + 36, 98, cx + 32, 114);
    ctx.lineTo(cx + 6, 114);
    ctx.lineTo(cx + 10, 50);
    ctx.closePath();
    fillStroke(ctx, '#223158', INK, 3);
  }

  // Cinturón
  ctx.fillStyle = '#35241a';
  ctx.fillRect(cx - 34, 104, 68, 11);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.strokeRect(cx - 34, 104, 68, 11);

  // Cabeza
  const hy = 40;
  ell(ctx, cx, hy, 21, 19);
  fillStroke(
    ctx,
    rgrad(ctx, cx - 6, hy - 6, 3, 24, [
      [0, skin[0]],
      [1, skin[1]],
    ]),
    INK,
    3.6
  );

  if (captain) {
    // Tricornio
    ctx.beginPath();
    ctx.moveTo(cx - 36, hy - 8);
    ctx.quadraticCurveTo(cx - 28, hy - 30, cx, hy - 34);
    ctx.quadraticCurveTo(cx + 28, hy - 30, cx + 36, hy - 8);
    ctx.quadraticCurveTo(cx, hy - 16, cx - 36, hy - 8);
    ctx.closePath();
    fillStroke(
      ctx,
      lgrad(ctx, 0, hy - 34, 0, hy - 6, [
        [0, '#2a2f3f'],
        [1, '#0b0d14'],
      ]),
      INK,
      3.4
    );
  }

  reg(scene, key, c);
}

function drawAnchor(scene: Phaser.Scene) {
  const { c, ctx } = mkCanvas(150, 160, S);
  const cx = 75;
  ctx.beginPath();
  ctx.arc(cx, 14, 10, 0, Math.PI * 2);
  ctx.lineWidth = 10;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.lineWidth = 6;
  ctx.strokeStyle = '#e855dc';
  ctx.stroke();

  ctx.beginPath();
  ctx.rect(cx - 6, 22, 12, 112);
  fillStroke(
    ctx,
    lgrad(ctx, cx - 6, 0, cx + 6, 0, [
      [0, '#ff9ef0'],
      [0.5, '#d845cc'],
      [1, '#7a1a78'],
    ]),
    INK,
    3.6
  );

  ctx.beginPath();
  ctx.moveTo(cx - 6, 118);
  ctx.bezierCurveTo(cx - 6, 150, cx - 52, 150, cx - 60, 110);
  ctx.lineTo(cx - 70, 118);
  ctx.lineTo(cx - 56, 98);
  ctx.lineTo(cx - 44, 112);
  ctx.bezierCurveTo(cx - 40, 126, cx - 20, 128, cx - 6, 106);
  ctx.closePath();
  fillStroke(ctx, '#d845cc', INK, 3.4);

  ctx.beginPath();
  ctx.moveTo(cx + 6, 118);
  ctx.bezierCurveTo(cx + 6, 150, cx + 52, 150, cx + 60, 110);
  ctx.lineTo(cx + 70, 118);
  ctx.lineTo(cx + 56, 98);
  ctx.lineTo(cx + 44, 112);
  ctx.bezierCurveTo(cx + 40, 126, cx + 20, 128, cx + 6, 106);
  ctx.closePath();
  fillStroke(ctx, '#b934b0', INK, 3.4);

  reg(scene, 'anchor', c);
}

function drawUrn(scene: Phaser.Scene) {
  const { c, ctx } = mkCanvas(64, 90, S);
  const cx = 32;
  ctx.beginPath();
  ctx.moveTo(cx - 10, 26);
  ctx.bezierCurveTo(cx - 32, 36, cx - 28, 74, cx - 12, 84);
  ctx.lineTo(cx + 12, 84);
  ctx.bezierCurveTo(cx + 28, 74, cx + 32, 36, cx + 10, 26);
  ctx.closePath();
  fillStroke(
    ctx,
    lgrad(ctx, cx - 28, 0, cx + 28, 0, [
      [0, '#6a7a86'],
      [0.5, '#3a4650'],
      [1, '#161c22'],
    ]),
    INK,
    3
  );

  ell(ctx, cx, 26, 14, 5);
  fillStroke(ctx, '#2a3038', INK, 2.4);

  // Llama de alma
  ctx.beginPath();
  ctx.moveTo(cx - 9, 26);
  ctx.bezierCurveTo(cx - 12, 10, cx - 2, 6, cx, -2);
  ctx.bezierCurveTo(cx + 3, 8, cx + 12, 10, cx + 9, 26);
  ctx.closePath();
  fillStroke(ctx, '#bfeee4', INK, 2.2);
  reg(scene, 'urn', c);
}

function drawBreakPot(scene: Phaser.Scene) {
  const { c, ctx } = mkCanvas(48, 56, S);
  const cx = 24;
  ell(ctx, cx, 50, 16, 5);
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx - 8, 12);
  ctx.bezierCurveTo(cx - 22, 20, cx - 20, 42, cx - 10, 50);
  ctx.lineTo(cx + 10, 50);
  ctx.bezierCurveTo(cx + 20, 42, cx + 22, 20, cx + 8, 12);
  ctx.closePath();
  fillStroke(
    ctx,
    lgrad(ctx, cx - 18, 0, cx + 18, 0, [
      [0, '#8c5a38'],
      [0.45, '#5e3820'],
      [1, '#2c180d'],
    ]),
    INK,
    2.5
  );
  ell(ctx, cx, 12, 10, 4);
  fillStroke(ctx, '#3d2415', INK, 2);
  ctx.strokeStyle = '#cda25e';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(cx - 14, 28);
  ctx.lineTo(cx + 14, 28);
  ctx.stroke();
  reg(scene, 'breakpot', c);
  ORIGINS.breakpot = [0.5, 50 / 56];
}

function drawPhantom(scene: Phaser.Scene) {
  const W = 160,
    H = 200;
  const { c, ctx } = mkCanvas(W, H, S);
  const cx = 80;

  ctx.beginPath();
  ctx.moveTo(cx - 54, 70);
  ctx.bezierCurveTo(cx - 70, 110, cx - 40, 150, cx - 56, 196);
  ctx.quadraticCurveTo(cx - 40, 176, cx - 30, 190);
  ctx.quadraticCurveTo(cx - 16, 170, cx - 4, 194);
  ctx.quadraticCurveTo(cx + 10, 172, cx + 24, 190);
  ctx.quadraticCurveTo(cx + 36, 170, cx + 54, 196);
  ctx.bezierCurveTo(cx + 40, 150, cx + 70, 110, cx + 54, 70);
  ctx.bezierCurveTo(cx + 40, 40, cx - 40, 40, cx - 54, 70);
  ctx.closePath();
  fillStroke(
    ctx,
    lgrad(ctx, 0, 40, 0, 196, [
      [0, '#3a3450'],
      [0.6, '#1c1830'],
      [1, 'rgba(14,12,26,0.4)'],
    ]),
    INK,
    3.6
  );

  // Capucha
  ctx.beginPath();
  ctx.moveTo(cx - 40, 82);
  ctx.bezierCurveTo(cx - 48, 40, cx - 30, 6, cx, 4);
  ctx.bezierCurveTo(cx + 30, 6, cx + 48, 40, cx + 40, 82);
  ctx.quadraticCurveTo(cx, 70, cx - 40, 82);
  ctx.closePath();
  fillStroke(
    ctx,
    lgrad(ctx, cx - 40, 0, cx + 40, 0, [
      [0, '#4a4262'],
      [0.5, '#2a2540'],
      [1, '#14121f'],
    ]),
    INK,
    3.6
  );

  // Ojos
  ctx.beginPath();
  ctx.moveTo(cx - 24, 70);
  ctx.bezierCurveTo(cx - 28, 36, cx - 14, 24, cx, 24);
  ctx.bezierCurveTo(cx + 14, 24, cx + 28, 36, cx + 24, 70);
  ctx.quadraticCurveTo(cx, 60, cx - 24, 70);
  ctx.closePath();
  fillStroke(ctx, '#050409', INK, 2.4);

  for (const x of [cx - 9, cx + 9]) {
    ell(ctx, x, 48, 4.5, 3.4);
    ctx.fillStyle = '#e8d8ff';
    ctx.fill();
  }

  reg(scene, 'phantom', c);

  const sc = mkCanvas(200, 110, S);
  const g = sc.ctx;
  g.beginPath();
  g.rect(0, 96, 150, 7);
  fillStroke(
    g,
    lgrad(g, 0, 96, 0, 103, [
      [0, '#5a4a60'],
      [1, '#1e1826'],
    ]),
    INK,
    2.6
  );
  g.beginPath();
  g.moveTo(140, 100);
  g.bezierCurveTo(150, 60, 190, 30, 198, 4);
  g.bezierCurveTo(186, 40, 168, 56, 158, 100);
  g.closePath();
  fillStroke(
    g,
    lgrad(g, 140, 0, 200, 0, [
      [0, '#d8d4e4'],
      [1, '#7a7490'],
    ]),
    INK,
    2.8
  );
  reg(scene, 'scythe', sc.c);
}

// ═════════════ VARIANTES DE ENEMIGOS ═════════════
// Los tres comparten IA con arquetipos existentes, pero cada región gana
// una silueta reconocible antes de que el jugador lea cualquier HUD.
function drawWailer(scene: Phaser.Scene) {
  const { c, ctx } = mkCanvas(86, 114, S);
  const cx = 43;

  // Velo deshilachado y cola de niebla.
  ctx.beginPath();
  ctx.moveTo(cx - 27, 43);
  ctx.bezierCurveTo(cx - 42, 68, cx - 24, 79, cx - 34, 108);
  ctx.quadraticCurveTo(cx - 20, 98, cx - 12, 112);
  ctx.quadraticCurveTo(cx, 96, cx + 8, 112);
  ctx.quadraticCurveTo(cx + 17, 98, cx + 32, 108);
  ctx.bezierCurveTo(cx + 22, 79, cx + 42, 68, cx + 27, 43);
  ctx.closePath();
  fillStroke(
    ctx,
    lgrad(ctx, 0, 24, 0, 112, [
      [0, '#8b748f'],
      [0.5, '#4b3c56'],
      [1, 'rgba(28,22,36,0.35)'],
    ]),
    INK,
    3
  );

  // Brazos largos dirigidos hacia el jugador.
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(cx + s * 20, 54);
    ctx.bezierCurveTo(cx + s * 44, 58, cx + s * 44, 77, cx + s * 35, 91);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 9;
    ctx.stroke();
    ctx.strokeStyle = '#7b6684';
    ctx.lineWidth = 4.5;
    ctx.stroke();
    for (let k = -1; k <= 1; k++) {
      ctx.beginPath();
      ctx.moveTo(cx + s * 35, 90);
      ctx.lineTo(cx + s * (39 + k * 3), 100);
      ctx.strokeStyle = '#d8d2df';
      ctx.lineWidth = 1.8;
      ctx.stroke();
    }
  }

  // Máscara ovalada con boca abierta: lectura inmediata de "Wailer".
  ell(ctx, cx, 39, 21, 25);
  fillStroke(
    ctx,
    rgrad(ctx, cx - 5, 31, 2, 28, [
      [0, '#efe8df'],
      [1, '#a39aaa'],
    ]),
    INK,
    3
  );
  for (const x of [cx - 8, cx + 8]) {
    ell(ctx, x, 35, 3.4, 4.4);
    ctx.fillStyle = '#251827';
    ctx.fill();
  }
  ell(ctx, cx, 52, 6.5, 8);
  fillStroke(ctx, '#251827', INK, 1.7);

  // Corona rota y mechones espectrales.
  ctx.strokeStyle = '#cbb08a';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(cx - 18, 23);
  ctx.lineTo(cx - 10, 12);
  ctx.lineTo(cx - 3, 20);
  ctx.lineTo(cx + 5, 9);
  ctx.lineTo(cx + 16, 24);
  ctx.stroke();

  reg(scene, 'wailer', c);
}

function drawShellback(scene: Phaser.Scene) {
  const { c, ctx } = mkCanvas(130, 102, S);
  const cx = 65;

  // Patas cortas bajo el caparazón.
  for (const x of [27, 47, 83, 103]) {
    ctx.beginPath();
    ctx.moveTo(x - 7, 70);
    ctx.lineTo(x + 7, 70);
    ctx.lineTo(x + 10, 92);
    ctx.lineTo(x - 9, 92);
    ctx.closePath();
    fillStroke(ctx, '#496d69', INK, 2.6);
    ctx.fillStyle = '#d9c59a';
    ctx.fillRect(x - 9, 88, 19, 5);
  }

  // Caparazón de nautilo con placas y marcas marinas.
  ell(ctx, cx, 56, 54, 35);
  fillStroke(
    ctx,
    lgrad(ctx, 15, 20, 112, 90, [
      [0, '#537a75'],
      [0.48, '#294d4e'],
      [1, '#12292e'],
    ]),
    INK,
    3.6
  );
  ell(ctx, cx, 53, 38, 25);
  ctx.strokeStyle = '#9aa87d';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(7,12,14,0.78)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * 12, 53 + Math.sin(a) * 9);
    ctx.lineTo(cx + Math.cos(a) * 36, 53 + Math.sin(a) * 24);
    ctx.stroke();
  }

  // Cabeza de tortuga infernal, verde y huesuda.
  ell(ctx, 113, 61, 19, 15);
  fillStroke(ctx, '#719a8e', INK, 3);
  for (const x of [108, 119]) {
    ell(ctx, x, 58, 3.2, 3.5);
    ctx.fillStyle = '#f6dd75';
    ctx.fill();
    ell(ctx, x, 58, 1.2, 2);
    ctx.fillStyle = INK;
    ctx.fill();
  }
  ctx.beginPath();
  ctx.moveTo(121, 69);
  ctx.lineTo(129, 72);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.2;
  ctx.stroke();

  reg(scene, 'shellback', c);
}

function drawLamia(scene: Phaser.Scene) {
  const { c, ctx } = mkCanvas(104, 140, S);
  const cx = 52;

  // Cola de serpiente en espiral: silueta clara en Campos de Lamento.
  ctx.beginPath();
  ctx.moveTo(cx - 11, 73);
  ctx.bezierCurveTo(cx - 35, 90, cx - 33, 119, cx - 9, 126);
  ctx.bezierCurveTo(cx + 26, 136, cx + 42, 112, cx + 24, 98);
  ctx.bezierCurveTo(cx + 8, 85, cx - 7, 110, cx + 6, 114);
  ctx.bezierCurveTo(cx + 16, 118, cx + 20, 111, cx + 9, 104);
  ctx.bezierCurveTo(cx - 1, 97, cx + 1, 88, cx + 12, 80);
  ctx.closePath();
  fillStroke(
    ctx,
    lgrad(ctx, 20, 70, 80, 135, [
      [0, '#67825e'],
      [0.5, '#354b3a'],
      [1, '#1e2b24'],
    ]),
    INK,
    3.2
  );
  ctx.strokeStyle = 'rgba(190,198,126,0.48)';
  ctx.lineWidth = 1.6;
  for (let i = 0; i < 7; i++) {
    ctx.beginPath();
    ctx.arc(cx + 1, 98 + i * 4, 14 - i * 0.9, 0.2, 2.9);
    ctx.stroke();
  }

  // Túnica y torso humanoide.
  ctx.beginPath();
  ctx.moveTo(cx - 20, 42);
  ctx.quadraticCurveTo(cx, 28, cx + 20, 42);
  ctx.lineTo(cx + 15, 82);
  ctx.lineTo(cx - 15, 82);
  ctx.closePath();
  fillStroke(
    ctx,
    lgrad(ctx, 30, 35, 75, 82, [
      [0, '#72506f'],
      [1, '#38283f'],
    ]),
    INK,
    3
  );
  ctx.fillStyle = '#d3b476';
  ctx.fillRect(cx - 18, 65, 36, 5);

  // Brazos y manos que canalizan un hechizo.
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(cx + s * 16, 48);
    ctx.quadraticCurveTo(cx + s * 34, 60, cx + s * 31, 76);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 8;
    ctx.stroke();
    ctx.strokeStyle = '#d5a984';
    ctx.lineWidth = 4.2;
    ctx.stroke();
  }

  // Cabeza, cabello y ojos de víbora.
  ell(ctx, cx, 28, 17, 20);
  fillStroke(ctx, '#d7aa84', INK, 2.8);
  ctx.beginPath();
  ctx.moveTo(cx - 18, 28);
  ctx.quadraticCurveTo(cx - 8, 1, cx + 14, 10);
  ctx.quadraticCurveTo(cx + 23, 21, cx + 15, 38);
  ctx.quadraticCurveTo(cx + 7, 18, cx - 17, 30);
  ctx.closePath();
  fillStroke(ctx, '#362b25', INK, 2.4);
  for (const x of [cx - 6, cx + 6]) {
    ell(ctx, x, 28, 3.6, 2.6);
    ctx.fillStyle = '#d9ed75';
    ctx.fill();
    ctx.fillStyle = INK;
    ctx.fillRect(x - 0.8, 26.4, 1.6, 3.2);
  }

  reg(scene, 'lamia', c);
}

function drawFamiliar(scene: Phaser.Scene) {
  const { c, ctx } = mkCanvas(54, 60, S);
  const cx = 27;

  // Cola curvada del familiar de bruja.
  ctx.beginPath();
  ctx.moveTo(39, 44);
  ctx.bezierCurveTo(58, 42, 54, 18, 43, 24);
  ctx.bezierCurveTo(38, 27, 43, 34, 47, 30);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 9;
  ctx.stroke();
  ctx.strokeStyle = '#17151d';
  ctx.lineWidth = 5;
  ctx.stroke();

  // Cuerpo, pecho y patas.
  ell(ctx, cx, 40, 15, 17);
  fillStroke(
    ctx,
    lgrad(ctx, 10, 26, 43, 56, [
      [0, '#34303d'],
      [1, '#111015'],
    ]),
    INK,
    2.5
  );
  ctx.fillStyle = '#8a8278';
  ctx.beginPath();
  ctx.ellipse(cx, 45, 5, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  for (const x of [20, 32]) {
    ctx.fillStyle = '#17151d';
    ctx.fillRect(x - 3, 51, 6, 7);
  }

  // Cabeza triangular y orejas.
  ctx.beginPath();
  ctx.moveTo(13, 30);
  ctx.lineTo(15, 9);
  ctx.lineTo(23, 17);
  ctx.quadraticCurveTo(27, 13, 31, 17);
  ctx.lineTo(40, 8);
  ctx.lineTo(42, 31);
  ctx.quadraticCurveTo(27, 40, 13, 30);
  ctx.closePath();
  fillStroke(ctx, '#24212d', INK, 2.7);
  ctx.fillStyle = '#b57580';
  poly(ctx, [[16, 14], [18, 24], [22, 18]]);
  ctx.fill();
  poly(ctx, [[35, 18], [39, 13], [38, 25]]);
  ctx.fill();

  // Ojos ámbar: contraste puntual, no neón.
  for (const x of [21, 34]) {
    ell(ctx, x, 27, 3.4, 3);
    ctx.fillStyle = '#e2c176';
    ctx.fill();
    ctx.fillStyle = INK;
    ctx.fillRect(x - 0.8, 25.6, 1.6, 3);
  }
  ctx.strokeStyle = '#cab99f';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(25, 32);
  ctx.lineTo(29, 32);
  ctx.stroke();
  reg(scene, 'familiar', c);
}

// ═════════════ EFECTOS ═════════════
function drawFx(scene: Phaser.Scene) {
  {
    const { c, ctx } = mkCanvas(128, 128);
    ctx.fillStyle = rgrad(ctx, 64, 64, 0, 64, [
      [0, 'rgba(255,255,255,0.9)'],
      [0.25, 'rgba(255,255,255,0.4)'],
      [0.6, 'rgba(255,255,255,0.08)'],
      [1, 'rgba(255,255,255,0)'],
    ]);
    ctx.fillRect(0, 0, 128, 128);
    reg(scene, 'glow', c);
  }

  {
    const { c, ctx } = mkCanvas(48, 48);
    ctx.beginPath();
    ctx.moveTo(24, 0);
    ctx.quadraticCurveTo(26, 22, 48, 24);
    ctx.quadraticCurveTo(26, 26, 24, 48);
    ctx.quadraticCurveTo(22, 26, 0, 24);
    ctx.quadraticCurveTo(22, 22, 24, 0);
    ctx.fillStyle = '#fff';
    ctx.fill();
    reg(scene, 'spark', c);
  }

  {
    const { c, ctx } = mkCanvas(200, 240, S);
    const cy = 120,
      cx0 = 30,
      R = 150;
    ctx.beginPath();
    ctx.arc(cx0, cy, R, -0.92, 0.92);
    ctx.quadraticCurveTo(cx0 + 130, cy, cx0 + R * Math.cos(-0.92), cy + R * Math.sin(-0.92));
    ctx.closePath();
    ctx.fillStyle = lgrad(ctx, cx0, 0, cx0 + R, 0, [
      [0, 'rgba(255,255,255,0)'],
      [0.55, 'rgba(210,255,252,0.55)'],
      [0.92, 'rgba(255,255,255,0.95)'],
      [1, 'rgba(255,255,255,1)'],
    ]);
    ctx.fill();
    reg(scene, 'slash', c);
  }

  {
    const { c, ctx } = mkCanvas(130, 60, S);
    ctx.beginPath();
    ctx.arc(92, 30, 22, 0.5 * Math.PI + 0.1, 2.5 * Math.PI - 0.1);
    ctx.arc(80, 30, 17, 2.5 * Math.PI - 0.6, 0.5 * Math.PI + 0.6, true);
    ctx.closePath();
    fillStroke(
      ctx,
      lgrad(ctx, 70, 8, 114, 52, [
        [0, '#ffffff'],
        [1, '#ffe27a'],
      ]),
      '#fff8d0',
      2
    );
    reg(scene, 'bolt', c);
  }

  {
    const { c, ctx } = mkCanvas(100, 50);
    ctx.save();
    ctx.translate(50, 25);
    ctx.scale(1, 0.5);
    ctx.fillStyle = rgrad(ctx, 0, 0, 0, 50, [
      [0, 'rgba(0,0,0,0.65)'],
      [0.6, 'rgba(0,0,0,0.35)'],
      [1, 'rgba(0,0,0,0)'],
    ]);
    ctx.beginPath();
    ctx.arc(0, 0, 50, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    reg(scene, 'shadow', c);
  }

  ['0', '1'].forEach((d) => {
    const { c, ctx } = mkCanvas(24, 30, S);
    ctx.font = 'bold 22px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#d8fff6';
    ctx.fillText(d, 12, 16);
    reg(scene, 'bit' + d, c);
  });

  {
    const { c, ctx } = mkCanvas(128, 128);
    ctx.fillStyle = rgrad(ctx, 64, 64, 0, 60, [
      [0, 'rgba(255,255,255,0.95)'],
      [0.2, 'rgba(255,255,255,0.85)'],
      [0.4, 'rgba(255,255,255,0.2)'],
      [1, 'rgba(255,255,255,0)'],
    ]);
    ctx.fillRect(0, 0, 128, 128);
    reg(scene, 'orb', c);
  }

  {
    const { c, ctx } = mkCanvas(VIEW_W, VIEW_H);
    ctx.fillStyle = rgrad(ctx, VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.35, VIEW_W * 0.62, [
      [0, 'rgba(2,6,8,0)'],
      [0.7, 'rgba(2,6,8,0.35)'],
      [1, 'rgba(1,3,4,0.78)'],
    ]);
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    reg(scene, 'vignette', c);
  }
}

// ═════════════ ICONOS DE DIOSES / RECOMPENSAS ═════════════
export const GODS: Record<string, { name: string; color: string; hex: number }> = {
  zeus: { name: 'Zeus', color: '#ffe94a', hex: 0xffe94a },
  poseidon: { name: 'Poseidón', color: '#4fc3ff', hex: 0x4fc3ff },
  demeter: { name: 'Deméter', color: '#a8ecff', hex: 0xa8ecff },
  aphrodite: { name: 'Afrodita', color: '#ff7fa8', hex: 0xff7fa8 },
  hestia: { name: 'Hestia', color: '#ff8a30', hex: 0xff8a30 },
  hermes: { name: 'Hermes', color: '#ffd24a', hex: 0xffd24a },
  artemis: { name: 'Artemisa', color: '#6dff9a', hex: 0x6dff9a },
  heart: { name: 'Corazón de Centauro', color: '#ff5c6a', hex: 0xff5c6a },
  magick: { name: 'Cristal de Magia', color: '#8f9bff', hex: 0x8f9bff },
  boss: { name: 'Guardián', color: '#d98aa6', hex: 0xd98aa6 },
  heal: { name: 'Fuente del Olvido', color: '#7fd6ff', hex: 0x7fd6ff },
};

function strokeBoth(ctx: Ctx, col: string, w: number, fn: () => void) {
  fn();
  ctx.strokeStyle = INK;
  ctx.lineWidth = w + 3;
  ctx.stroke();
  fn();
  ctx.strokeStyle = col;
  ctx.lineWidth = w;
  ctx.stroke();
}

function drawIcons(scene: Phaser.Scene) {
  const glyphs: Record<string, (ctx: Ctx, col: string) => void> = {
    zeus: (ctx) => {
      poly(ctx, [
        [37, 7],
        [17, 35],
        [29, 35],
        [22, 58],
        [48, 26],
        [35, 26],
        [44, 7],
      ]);
      fillStroke(ctx, '#fff6a8', INK, 2.6);
    },
    poseidon: (ctx, col) => {
      strokeBoth(ctx, col, 3.6, () => {
        ctx.beginPath();
        ctx.moveTo(32, 56);
        ctx.lineTo(32, 14);
      });
      strokeBoth(ctx, col, 3.6, () => {
        ctx.beginPath();
        ctx.moveTo(19, 14);
        ctx.lineTo(19, 28);
        ctx.quadraticCurveTo(19, 40, 32, 40);
        ctx.quadraticCurveTo(45, 40, 45, 28);
        ctx.lineTo(45, 14);
      });
    },
    demeter: (ctx, col) => {
      for (let i = 0; i < 3; i++) {
        const a = (i * Math.PI) / 3;
        strokeBoth(ctx, col, 3, () => {
          ctx.beginPath();
          ctx.moveTo(32 + Math.cos(a) * 20, 32 + Math.sin(a) * 20);
          ctx.lineTo(32 - Math.cos(a) * 20, 32 - Math.sin(a) * 20);
        });
      }
    },
    aphrodite: (ctx) => {
      ctx.beginPath();
      ctx.moveTo(32, 54);
      ctx.bezierCurveTo(6, 36, 10, 10, 26, 14);
      ctx.bezierCurveTo(30, 15, 32, 19, 32, 22);
      ctx.bezierCurveTo(32, 19, 34, 15, 38, 14);
      ctx.bezierCurveTo(54, 10, 58, 36, 32, 54);
      fillStroke(
        ctx,
        lgrad(ctx, 10, 10, 54, 54, [
          [0, '#ffc2de'],
          [1, '#ff4f9c'],
        ]),
        INK,
        2.8
      );
    },
    hestia: (ctx) => {
      ctx.beginPath();
      ctx.moveTo(32, 6);
      ctx.bezierCurveTo(36, 22, 54, 26, 50, 42);
      ctx.bezierCurveTo(48, 54, 38, 58, 32, 58);
      ctx.bezierCurveTo(24, 58, 14, 54, 14, 42);
      ctx.bezierCurveTo(14, 32, 22, 30, 24, 20);
      ctx.bezierCurveTo(28, 24, 28, 28, 30, 30);
      ctx.bezierCurveTo(30, 20, 30, 12, 32, 6);
      fillStroke(
        ctx,
        lgrad(ctx, 0, 6, 0, 58, [
          [0, '#ffd45a'],
          [1, '#ff4a1a'],
        ]),
        INK,
        2.8
      );
    },
    hermes: (ctx) => {
      for (let i = 0; i < 4; i++) {
        ctx.save();
        ctx.translate(20, 46);
        ctx.rotate(-0.25 - i * 0.32);
        ell(ctx, 18, 0, 20 - i * 1.5, 5.4);
        fillStroke(ctx, i % 2 ? '#fff0b8' : '#ffffff', INK, 2.2);
        ctx.restore();
      }
    },
    artemis: (ctx, col) => {
      strokeBoth(ctx, col, 3.4, () => {
        ctx.beginPath();
        ctx.arc(42, 32, 22, 1.58, 4.7);
      });
      strokeBoth(ctx, '#ffffff', 2.2, () => {
        ctx.beginPath();
        ctx.moveTo(8, 32);
        ctx.lineTo(50, 32);
      });
    },
    heart: (ctx) => {
      ctx.beginPath();
      ctx.moveTo(32, 54);
      ctx.bezierCurveTo(4, 34, 10, 8, 26, 14);
      ctx.bezierCurveTo(30, 16, 32, 19, 32, 22);
      ctx.bezierCurveTo(32, 19, 34, 16, 38, 14);
      ctx.bezierCurveTo(54, 8, 60, 34, 32, 54);
      fillStroke(
        ctx,
        lgrad(ctx, 8, 8, 56, 56, [
          [0, '#ff8c96'],
          [1, '#c91a30'],
        ]),
        INK,
        3
      );
    },
    magick: (ctx) => {
      poly(ctx, [
        [32, 6],
        [50, 26],
        [32, 58],
        [14, 26],
      ]);
      fillStroke(
        ctx,
        lgrad(ctx, 14, 6, 50, 58, [
          [0, '#d6dcff'],
          [1, '#5a64e8'],
        ]),
        INK,
        3
      );
    },
    heal: (ctx) => {
      ctx.beginPath();
      ctx.moveTo(14, 18);
      ctx.quadraticCurveTo(16, 44, 32, 44);
      ctx.quadraticCurveTo(48, 44, 50, 18);
      ctx.closePath();
      fillStroke(ctx, '#3a6a86', INK, 2.6);
      ell(ctx, 32, 18, 18, 6);
      fillStroke(ctx, '#bfe9ff', INK, 2.2);
    },
    boss: (ctx) => {
      ell(ctx, 32, 28, 15, 14);
      fillStroke(ctx, '#f4f0dc', INK, 2.6);
      ell(ctx, 26, 29, 4, 5);
      ctx.fillStyle = INK;
      ctx.fill();
      ell(ctx, 38, 29, 4, 5);
      ctx.fill();
    },
  };

  for (const key of Object.keys(glyphs)) {
    const col = GODS[key].color;
    const { c, ctx } = mkCanvas(64, 64, S);
    ell(ctx, 32, 32, 28, 28);
    fillStroke(
      ctx,
      rgrad(ctx, 32, 28, 2, 30, [
        [0, '#1c242a'],
        [1, '#070b0e'],
      ]),
      col,
      2.5
    );
    ctx.save();
    ctx.beginPath();
    ctx.arc(32, 32, 24, 0, Math.PI * 2);
    ctx.clip();
    glyphs[key](ctx, col);
    ctx.restore();
    reg(scene, 'ico_' + key, c);
  }
}

export function buildAllTextures(scene: Phaser.Scene) {
  for (const b of Object.values(BIOMES)) {
    drawBackground(scene, b);
    drawFloor(scene, b);
    drawWalls(scene, b);
    drawDoors(scene, b);
    drawForeground(scene, b);
    drawCanopy(scene, b);
  }
  drawProps(scene);
  drawBreakPot(scene);
  drawMelinoe(scene);
  drawShade(scene);
  drawWailer(scene);
  drawSkeleton(scene, 'spear_body', false);
  drawSkeleton(scene, 'archer_body', true);
  drawBrute(scene, 'brute', false);
  drawBrute(scene, 'captain', true);
  drawShellback(scene);
  drawLamia(scene);
  drawFamiliar(scene);
  drawAnchor(scene);
  drawUrn(scene);
  drawPhantom(scene);
  drawFx(scene);
  drawIcons(scene);
}

void rngf;
