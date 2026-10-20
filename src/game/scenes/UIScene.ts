// ───────────────────────────────────────────────────────────────
//  UIScene · HUD minimalista, selección de bendiciones y victoria/derrota
// ───────────────────────────────────────────────────────────────
import Phaser from 'phaser';
import { VIEW_W, VIEW_H } from '../config';
import { GODS } from '../art_chars';
import { input, net, pose, sfx } from '../services';
import { bus } from '../bus';
import { run, RARITY } from '../state';
import { DIALOGUES, SPEAKER_META, dialogueState, BARKS } from '../dialogue';
import type { BarkKey } from '../dialogue';

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const FONT_T = 'Cinzel, Georgia, serif';
const FONT_N = 'Rajdhani, Arial, sans-serif';
// Raíl de habilidades (estilo Hades: columna en el borde izquierdo)
const SLOT_X = 50;
const SLOT_S = 64;
const SLOT_GAP = 16;
const SLOT_Y0 = 320;

export class UIScene extends Phaser.Scene {
  private g!: Phaser.GameObjects.Graphics;
  private hurt!: Phaser.GameObjects.Rectangle;
  private tRoom!: Phaser.GameObjects.Text;
  private tRegion!: Phaser.GameObjects.Text;
  private tBoon!: Phaser.GameObjects.Text;
  private tEst!: Phaser.GameObjects.Text;
  private tHp!: Phaser.GameObjects.Text;
  private tMag!: Phaser.GameObjects.Text;
  private tNet!: Phaser.GameObjects.Text;
  private tPose!: Phaser.GameObjects.Text;
  private tBoss!: Phaser.GameObjects.Text;
  private slotKeys: Phaser.GameObjects.Text[] = [];
  private banner!: Phaser.GameObjects.Container;
  private bTitle!: Phaser.GameObjects.Text;
  private bSub!: Phaser.GameObjects.Text;
  private boonIcons: Phaser.GameObjects.Container[] = [];
  private boonCount = -1;
  private hpTrail = 100;
  private modal: Phaser.GameObjects.Container | null = null;
  private modalAt = 0;
  private sel = 0;
  private cards: { c: Phaser.GameObjects.Container; bg: Phaser.GameObjects.Rectangle }[] = [];
  private endC: Phaser.GameObjects.Container | null = null;
  private endMode = '';
  private endAt = 0;
  private unsub: (() => void)[] = [];
  // ── diálogo estilo Hades II ──
  private dlgC: Phaser.GameObjects.Container | null = null;
  private dlgG!: Phaser.GameObjects.Graphics;
  private dlgPortrait: Phaser.GameObjects.Image | null = null;
  private dlgName: Phaser.GameObjects.Text | null = null;
  private dlgText: Phaser.GameObjects.Text | null = null;
  private dlgHint: Phaser.GameObjects.Text | null = null;
  private dlgShown = 0;
  private dlgFull = '';
  private dlgTick = 0;
  private dlgStartedAt = 0;
  // ── avisos cortos no bloqueantes ──
  private barkC: Phaser.GameObjects.Container | null = null;
  private barkQueue: { text: string; color: string }[] = [];
  private barkUntil = 0;

  constructor() {
    super('UI');
  }

  /** Wrapper de texto de Phaser con actualización controlada para evitar re-rasterizados */
  private txt(x: number, y: number, s: string, size = 18, color = '#e8f4f0', font = FONT_N, weight = '600') {
    const t = this.add.text(x, y, s, {
      fontFamily: font,
      fontStyle: weight,
      fontSize: size + 'px',
      color,
      stroke: '#04070a',
      strokeThickness: Math.max(2, size / 8),
    });
    const st = t.setText.bind(t);
    const sc = t.setColor.bind(t);
    t.setText = (v: any) => (t.text !== String(v) ? st(v) : t);
    t.setColor = (c: any) => (t.style.color !== c ? sc(c) : t);
    return t;
  }

  create() {
    this.g = this.add.graphics().setDepth(10);
    this.add.image(0, 0, 'vignette').setOrigin(0).setDepth(0);
    this.hurt = this.add.rectangle(0, 0, VIEW_W, VIEW_H, 0x8a101b, 0).setOrigin(0).setDepth(1);

    // ── arriba-izquierda: emblema de sala + región + bendiciones ──
    this.tRoom = this.txt(98, 28, '', 19, '#e2c176', FONT_T, '700').setDepth(20);
    this.tRegion = this.txt(98, 52, '', 13, '#8fa3a0', FONT_N, '700').setDepth(20);
    this.tBoon = this.txt(98, 74, '', 13, '#c9b78a', FONT_N, '700').setDepth(20);

    // ── centro-superior: consejo contextual / contador ESTABLISHED ──
    this.tEst = this.txt(VIEW_W / 2, 128, '', 15, '#73cfa8', FONT_N, '700').setOrigin(0.5).setDepth(20);

    // ── barras abajo-izquierda (Magia sobre Salud, estilo Hades) ──
    this.tHp = this.txt(234, 887, '', 15, '#ffffff', FONT_N, '700').setOrigin(0.5).setDepth(21);
    this.tMag = this.txt(234, 853, '', 15, '#ffffff', FONT_N, '700').setOrigin(0.5).setDepth(21);

    // ── barra de jefe ──
    this.tBoss = this.txt(VIEW_W / 2, 34, '', 22, '#f0d2dc', FONT_T, '700').setOrigin(0.5).setDepth(21);

    // ── abajo-derecha: estado de red local ──
    this.tNet = this.txt(VIEW_W - 44, 884, '', 13, '#8fa3a0', FONT_N, '600').setOrigin(1, 1).setDepth(21);

    // ── estado de postura / cámara (solo cuando hay algo que decir) ──
    this.tPose = this.txt(VIEW_W / 2, 164, '', 18, '#e2c176', FONT_N, '700').setOrigin(0.5).setDepth(21);

    // ── raíl izquierdo: ranuras de habilidad ──
    const keys = ['J', 'K', 'L', 'ESP'];
    for (let i = 0; i < 4; i++) {
      this.slotKeys.push(this.txt(SLOT_X + SLOT_S / 2, this.slotY(i) + SLOT_S + 5, keys[i], 12, '#c9b78a', FONT_N, '700').setOrigin(0.5, 0).setDepth(22));
    }

    // Banner central para cambios de sala o anuncios
    this.bTitle = this.txt(0, 0, '', 48, '#f5df9e', FONT_T, '800').setOrigin(0.5);
    this.bSub = this.txt(0, 48, '', 20, '#dce7e4', FONT_N, '600').setOrigin(0.5);
    const line = this.add.rectangle(0, 26, 440, 1.5, 0xe2c176, 0.6);
    this.banner = this.add.container(VIEW_W / 2, 240, [line, this.bTitle, this.bSub]).setDepth(40).setAlpha(0);

    this.unsub.forEach((u) => u());
    this.unsub = [
      bus.on('banner', (t: string, s: string, c: string) => this.showBanner(t, s, c)),
      bus.on('dialogue', (id: string) => this.startDialogue(id)),
      bus.on('bark', (text: string, color?: string) => this.queueBark(text, color ?? '#e2c176')),
      bus.on('barkKey', (key: BarkKey) => {
        const b = BARKS[key];
        if (b) this.queueBark(b.text, b.color);
      }),
    ];
    this.input.on('pointerdown', () => {
      if (dialogueState.active && dialogueState.modal) this.advanceDialogue();
    });
    this.events.once('shutdown', () => this.unsub.forEach((u) => u()));
  }

  private slotY(i: number) {
    return SLOT_Y0 + i * (SLOT_S + SLOT_GAP);
  }

  private showBanner(t: string, s: string, c: string) {
    this.bTitle.setText(t).setColor('#f5df9e');
    this.bSub.setText(s).setColor(c);
    this.tweens.killTweensOf(this.banner);
    this.banner.setAlpha(0).setY(225);
    this.tweens.add({ targets: this.banner, alpha: 1, y: 240, duration: 300, ease: 'Cubic.out' });
    this.tweens.add({ targets: this.banner, alpha: 0, delay: 2000, duration: 500 });
  }

  // ───────────────────────── Actualización por fotograma ─────────────────────────
  update(_t: number, dt: number) {
    const g = this.g;
    g.clear();
    const now = performance.now();

    // Destello de dolor al recibir daño
    this.hurt.setAlpha(run.hurtFlash * 0.25 + (run.hp / run.maxHp < 0.25 && run.mode === 'play' ? 0.04 + 0.03 * Math.sin(now / 200) : 0));

    this.drawBars(g, dt);
    this.drawSlots(g);
    this.drawTop();
    this.drawBoons();
    this.drawBoss(g);
    this.updateDialogue(dt);
    this.updateBarks();

    // Retícula discreta para el ratón (oculta durante diálogos modales)
    const gs = this.scene.get('Game') as any;
    const paused = this.scene.isPaused('Game');
    const dlgModal = dialogueState.active && dialogueState.modal;
    const mouseOn = !!gs && run.mode === 'play' && !paused && !dlgModal && this.time.now - (gs.mouseT ?? -99999) < 6000;
    this.input.setDefaultCursor(mouseOn ? 'none' : 'default');
    if (mouseOn) {
      const p = this.input.activePointer;
      g.lineStyle(1.5, 0xe2c176, 0.85);
      g.strokeCircle(p.x, p.y, 11);
      g.lineStyle(1.5, 0xdce7e4, 0.7);
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        g.lineBetween(p.x + dx * 6, p.y + dy * 6, p.x + dx * 16, p.y + dy * 16);
      }
    }

    // Modales de interacción
    if (run.mode === 'choose') {
      if (!this.modal) this.openModal();
      if (!paused) this.updateModal();
    } else if (this.modal) {
      this.modal.destroy();
      this.modal = null;
      this.cards = [];
    }

    if (run.mode === 'dead' || run.mode === 'won') {
      if (this.endMode !== run.mode) this.openEnd();
      if (!paused) this.updateEnd();
    } else if (this.endC) {
      this.endC.destroy();
      this.endC = null;
      this.endMode = '';
    }
  }

  /** Marco de contenedor sobrio con borde sutil */
  private frame(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, col: number, alpha = 0.92) {
    g.fillStyle(0x060a0d, alpha);
    g.fillRect(x, y, w, h);
    g.lineStyle(1.5, col, 0.75);
    g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  }

  /** Barra de recurso con bisel en el extremo derecho (estilo Hades) */
  private statBar(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, edge: number, frac: number, trailFrac: number, fill: number, hi: number) {
    const bevel = 12;
    // fondo
    g.fillStyle(0x05080b, 0.96);
    g.fillPoints([
      [x, y],
      [x + w - bevel, y],
      [x + w, y + h],
      [x, y + h],
    ], true);
    // fantasma de daño
    if (trailFrac > frac + 0.005) {
      const tw = Math.max(6, (w - bevel) * trailFrac);
      g.fillStyle(0xd8d3c8, 0.5);
      g.fillPoints([
        [x + 1, y + 1],
        [x + tw, y + 1],
        [x + tw + bevel * 0.8, y + h - 1],
        [x + 1, y + h - 1],
      ], true);
    }
    // relleno
    const fw = Math.max(6, (w - bevel) * frac);
    g.fillStyle(fill, 1);
    g.fillPoints([
      [x + 1, y + 1],
      [x + fw, y + 1],
      [x + fw + bevel * 0.8, y + h - 1],
      [x + 1, y + h - 1],
    ], true);
    g.fillStyle(hi, 0.4);
    g.fillRect(x + 1, y + 1, fw, 4);
    // borde
    g.lineStyle(1.5, edge, 0.9);
    g.strokePoints([
      [x + 0.5, y + 0.5],
      [x + w - bevel + 0.5, y + 0.5],
      [x + w - 0.5, y + h - 0.5],
      [x + 0.5, y + h - 0.5],
    ], true);
  }

  private drawBars(g: Phaser.GameObjects.Graphics, dt: number) {
    const x = 86,
      w = 320,
      h = 26;
    this.hpTrail += (run.hp - this.hpTrail) * Math.min(1, dt / 350);

    // Magia (arriba, turquesa)
    this.statBar(g, x, 840, w, h, 0x2f6b7a, clamp(run.mag / run.maxMag, 0, 1), 0, 0x3f88a0, 0x9fd8e8);
    this.tMag.setText(`${Math.floor(run.mag)} / ${run.maxMag}`);
    // ícono: pentágono (Magia del Inframundo)
    g.lineStyle(2, 0x7fd8e8, 0.95);
    g.strokeCircle(x - 22, 853, 13);
    g.lineStyle(1.6, 0x7fd8e8, 0.9);
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i * 4 * Math.PI) / 5;
      g.lineBetween(x - 22, 853, x - 22 + Math.cos(a) * 10, 853 + Math.sin(a) * 10);
    }

    // Salud (abajo, rojo)
    this.statBar(g, x, 874, w, h, 0x6e2028, clamp(run.hp / run.maxHp, 0, 1), clamp(this.hpTrail / run.maxHp, 0, 1), 0xb02a38, 0xff8a94);
    this.tHp.setText(`${Math.ceil(run.hp)} / ${run.maxHp}`);
    // ícono: corazón (polígono)
    g.fillStyle(0xd8333f, 1);
    g.fillPoints([
      [x - 22, 891],
      [x - 33, 880],
      [x - 30, 869],
      [x - 22, 873],
      [x - 14, 869],
      [x - 11, 880],
    ], true);
    g.lineStyle(1.2, 0x07090d, 1);

    // Desafío a la Muerte: rombo dorado junto a la barra de salud
    for (let i = 0; i < run.defiance; i++) {
      const cx = x + w + 26 + i * 20,
        cy = 887;
      g.fillStyle(0xe2c176, 1);
      g.fillPoints([
        [cx, cy - 8],
        [cx + 7, cy],
        [cx, cy + 8],
        [cx - 7, cy],
      ], true);
      g.lineStyle(1.5, 0x07090d, 1);
    }
  }

  private drawSlots(g: Phaser.GameObjects.Graphics) {
    const cols = [0x4fc3ff, 0xffd24a, 0x58ff9b, 0x3be0c8];
    const cds = [run.cdAtk, run.cdSpc, run.cdCast, 0];

    for (let i = 0; i < 4; i++) {
      const x0 = SLOT_X,
        y = this.slotY(i),
        s = SLOT_S;
      const cx = x0 + s / 2,
        cy = y + s / 2;
      const ready = i === 0 ? true : i === 1 ? run.mag >= 8 : i === 2 ? run.mag >= 20 : run.blink > 0;
      const a = ready ? 0.95 : 0.32;

      // panel con esquinas biseladas
      const b = 9;
      const panel = [
        [x0 + b, y],
        [x0 + s, y],
        [x0 + s, y + s - b],
        [x0 + s - b, y + s],
        [x0, y + s],
        [x0, y + b],
      ];
      g.fillStyle(0x070b0e, 0.96);
      g.fillPoints(panel, true);
      g.lineStyle(2, cols[i], ready ? 0.8 : 0.3);
      g.strokePoints(panel, true);
      // bisel interior
      g.lineStyle(1, 0xffffff, 0.06);
      g.strokePoints(
        [
          [x0 + b + 3, y + 3],
          [x0 + s - 3, y + 3],
          [x0 + s - 3, y + s - b - 3],
          [x0 + s - b - 3, y + s - 3],
          [x0 + 3, y + s - 3],
          [x0 + 3, y + b + 3],
        ],
        true
      );

      // icono
      g.lineStyle(3, cols[i], a);
      g.fillStyle(cols[i], a);
      if (i === 0) {
        // SYN · Ataque (creciente)
        g.beginPath();
        g.arc(cx - 4, cy, 18, -0.85, 0.85, false);
        g.strokePath();
      } else if (i === 1) {
        // SYN-ACK · Especial (dardo)
        g.fillTriangle(cx - 17, cy, cx + 7, cy - 8, cx + 7, cy + 8);
      } else if (i === 2) {
        // ACK · Conjuro (círculo rúnico)
        g.strokeCircle(cx, cy, 17);
        g.lineStyle(1.5, cols[i], a);
        g.strokeCircle(cx, cy, 9);
      } else {
        // Blink
        g.lineStyle(4, cols[i], a);
        for (const dx of [-8, 6]) {
          g.beginPath();
          g.moveTo(cx + dx - 6, cy - 11);
          g.lineTo(cx + dx + 6, cy);
          g.lineTo(cx + dx - 6, cy + 11);
          g.strokePath();
        }
      }

      // recarga
      if (cds[i] > 0.01) {
        g.fillStyle(0x000000, 0.7);
        g.fillPoints([
          [x0 + 2, y + 2],
          [x0 + s - 2, y + 2],
          [x0 + s - 2, y + 2 + (s - 4) * (1 - cds[i])],
          [x0 + 2, y + 2 + (s - 4) * (1 - cds[i])],
        ], true);
      }

      // pips de Blink
      if (i === 3) {
        for (let k = 0; k < run.maxBlink; k++) {
          const px0 = cx - ((run.maxBlink - 1) * 9) + k * 18;
          g.fillStyle(k < run.blink ? 0x3be0c8 : 0x1a262a, 1);
          g.fillCircle(px0, y + 8, 3.5);
        }
      }

      // carga Ω (arco dorado)
      const charge = i === 0 ? run.chargeAtk : i === 1 ? run.chargeSpc : i === 2 ? run.chargeCast : 0;
      if (charge > 0.02) {
        g.lineStyle(3.5, 0xf5df9e, 1);
        g.beginPath();
        g.arc(cx, cy, s * 0.68, -Math.PI / 2, -Math.PI / 2 + charge * Math.PI * 2, false);
        g.strokePath();
      }
    }
  }

  private drawTop() {
    // emblema de sala (arriba-izquierda)
    const g = this.g;
    const ex = 60,
      ey = 44;
    g.fillStyle(0x0a0e13, 0.9);
    g.fillCircle(ex, ey, 20);
    g.lineStyle(2, 0xe2c176, 0.9);
    g.strokeCircle(ex, ey, 20);
    // pips de sala alrededor del emblema
    for (let i = 0; i < run.totalRooms; i++) {
      const a = -Math.PI / 2 + (i / run.totalRooms) * Math.PI * 2;
      const on = i < run.room;
      g.fillStyle(on ? 0xe2c176 : 0x3a4148, 1);
      g.fillCircle(ex + Math.cos(a) * 27, ey + Math.sin(a) * 27, 2.4);
    }
    this.tRoom.setText(`SALA ${run.room}/${run.totalRooms}`);
    this.tRegion.setText(run.region.toUpperCase());
    this.tBoon.setText(run.taken.length > 0 ? `Bendiciones ${run.taken.length}` : '');

    // consejo contextual / contador de handshakes
    const tutorial = [
      'J o clic: abre SYN',
      'K o clic derecho: responde SYN-ACK',
      'L o Q: cierra con ACK',
      '',
    ] as const;
    const tip = tutorial[run.tutorialStep];
    this.tEst.setText(tip || (run.stats.established > 0 ? `ESTABLISHED ×${run.stats.established}` : ''));
    this.tEst.setColor(tip ? '#c9d8d5' : '#73cfa8');

    // red local (abajo-derecha)
    const st = net.stats;
    if (net.connected) {
      const rttText = net.peers > 1 ? `${st.rtt.toFixed(0)} ms` : 'esperando par';
      this.tNet.setText(`REDSYNC · ${rttText}`).setColor(net.peers > 1 ? (st.rtt < 50 ? '#73cfa8' : '#e2c176') : '#e2c176').setAlpha(1);
    } else {
      this.tNet.setText('').setAlpha(0);
    }

    // cámara
    if (pose.enabled && pose.status === 'ready' && pose.calibProgress < 1) {
      this.tPose.setText(`CALIBRANDO POSTURA NEUTRA: ${Math.round(pose.calibProgress * 100)}%`);
    } else if (pose.enabled && pose.status === 'loading') {
      this.tPose.setText('Cargando visión MediaPipe…');
    } else {
      this.tPose.setText('');
    }
  }

  private drawBoons() {
    if (this.boonCount === run.taken.length) return;
    this.boonCount = run.taken.length;
    this.boonIcons.forEach((c) => c.destroy());
    this.boonIcons = [];

    // pila de bendiciones en el borde derecho (solo emblemas)
    run.taken.slice(-7).forEach((b, i, arr) => {
      const ico = this.add.image(0, 0, 'ico_' + b.god).setScale(0.36);
      const ring = this.add.circle(0, 0, 21, 0x000000, 0).setStrokeStyle(2, Phaser.Display.Color.HexStringToColor(RARITY[b.rarity].color).color);
      const c = this.add.container(VIEW_W - 56, 190 + (i - (arr.length - 1) / 2) * 48, [ring, ico]).setDepth(20);
      this.boonIcons.push(c);
    });
  }

  private drawBoss(g: Phaser.GameObjects.Graphics) {
    const b = run.boss;
    if (!b || run.mode !== 'play') {
      this.tBoss.setText('');
      return;
    }
    const w = 680,
      x = (VIEW_W - w) / 2,
      y = 66;

    this.tBoss.setText(b.name.toUpperCase());

    // Barra de vida del jefe
    this.frame(g, x, y, w, 18, 0x9e3852);
    g.fillStyle(0xc22b3d, 1);
    g.fillRect(x + 2, y + 2, (w - 4) * clamp(b.hp / b.max, 0, 1), 14);
    g.fillStyle(0xff8a94, 0.4);
    g.fillRect(x + 2, y + 2, (w - 4) * clamp(b.hp / b.max, 0, 1), 4);

    // Escudo Firewall si aplica
    if (b.maxArmor > 0) {
      g.fillStyle(0x060a0d, 0.9);
      g.fillRect(x, y + 22, w, 8);
      g.fillStyle(0x59e6ff, 1);
      g.fillRect(x + 1, y + 23, (w - 2) * clamp(b.armor / b.maxArmor, 0, 1), 6);
      g.lineStyle(1, 0x59e6ff, 0.5);
      g.strokeRect(x + 0.5, y + 22.5, w - 1, 7);
    }
  }

  // ───────────────────────── Diálogos estilo Hades II ─────────────────────────
  private startDialogue(id: string) {
    const script = DIALOGUES[id];
    if (!script || dialogueState.active) return;
    // Guiones no modales: se muestran como avisos sin congelar el combate.
    if (!script.modal) {
      script.lines.forEach((l) => this.queueBark(l.text, SPEAKER_META[l.who].color));
      dialogueState.seen.add(id);
      bus.emit('dialogueEnd', id);
      return;
    }
    dialogueState.active = true;
    dialogueState.modal = true;
    dialogueState.scriptId = id;
    dialogueState.lineIndex = 0;
    this.dlgStartedAt = this.time.now;
    sfx.play('select');

    this.dlgC?.destroy();
    const dim = this.add.rectangle(0, 0, VIEW_W, VIEW_H, 0x010304, 0.62).setOrigin(0);
    this.dlgG = this.add.graphics();

    // ── marco del retrato (izquierda) ──
    const px0 = 64,
      py0 = 318,
      pw = 336,
      ph = 470;
    this.dlgG.fillStyle(0x05080b, 0.96);
    this.dlgG.fillRect(px0, py0, pw, ph);
    this.dlgG.lineStyle(2.5, 0xe2c176, 0.9);
    this.dlgG.strokeRect(px0 + 1, py0 + 1, pw - 2, ph - 2);
    this.dlgG.lineStyle(1, 0xe2c176, 0.35);
    this.dlgG.strokeRect(px0 + 9, py0 + 9, pw - 18, ph - 18);
    // remaches de las esquinas
    this.dlgG.fillStyle(0xe2c176, 0.85);
    for (const [rx, ry] of [
      [px0 + 5, py0 + 5],
      [px0 + pw - 5, py0 + 5],
      [px0 + 5, py0 + ph - 5],
      [px0 + pw - 5, py0 + ph - 5],
    ]) {
      this.dlgG.fillCircle(rx, ry, 3.5);
    }

    const meta0 = SPEAKER_META[script.lines[0].who];
    const tex0 = this.textures.exists(meta0.portrait) ? meta0.portrait : 'ico_hecate';
    this.dlgPortrait = this.add.image(px0 + pw / 2, py0 + ph / 2, tex0);
    this.dlgPortrait.setDisplaySize(pw - 22, ph - 22);

    // ── caja de diálogo (abajo, derecha del retrato) ──
    const bx = 440,
      by = 596,
      bw = 1096,
      bh = 244;
    this.dlgG.fillStyle(0x070b0e, 0.97);
    this.dlgG.fillRect(bx, by, bw, bh);
    this.dlgG.lineStyle(2.5, 0xe2c176, 0.85);
    this.dlgG.strokeRect(bx + 1, by + 1, bw - 2, bh - 2);
    this.dlgG.lineStyle(1, 0xffffff, 0.07);
    this.dlgG.strokeRect(bx + 8, by + 8, bw - 16, bh - 16);
    this.dlgG.fillStyle(0xe2c176, 0.85);
    for (const [rx, ry] of [
      [bx + 14, by + 14],
      [bx + bw - 14, by + 14],
      [bx + 14, by + bh - 14],
      [bx + bw - 14, by + bh - 14],
    ]) {
      this.dlgG.fillCircle(rx, ry, 3);
    }

    // ── placa con el nombre (solapa el borde superior de la caja) ──
    const nw = 380,
      nh = 52,
      nx = bx + 60,
      ny = by - nh / 2;
    this.dlgG.fillStyle(0x0b0f14, 1);
    this.dlgG.fillRect(nx, ny, nw, nh);
    this.dlgG.lineStyle(2, 0xe2c176, 0.95);
    this.dlgG.strokeRect(nx + 1, ny + 1, nw - 2, nh - 2);
    // diamante central sobre la placa
    this.dlgG.fillStyle(0xe2c176, 1);
    this.dlgG.fillTriangle(nx + nw / 2, ny - 12, nx + nw / 2 + 7, ny - 3, nx + nw / 2, ny + 6);
    this.dlgG.fillTriangle(nx + nw / 2, ny - 12, nx + nw / 2 - 7, ny - 3, nx + nw / 2, ny + 6);

    this.dlgName = this.txt(nx + nw / 2, ny + nh / 2, '', 21, '#f5df9e', FONT_T, '800').setOrigin(0.5);
    this.dlgText = this.add
      .text(bx + 44, by + 56, '', {
        fontFamily: FONT_N,
        fontStyle: '600',
        fontSize: '24px',
        color: '#e9e4d6',
        wordWrap: { width: bw - 140 },
        lineSpacing: 6,
      })
      .setOrigin(0, 0);
    this.dlgHint = this.txt(bx + bw - 30, by + bh - 18, 'E / clic ▸', 15, '#e2c176', FONT_N, '700').setOrigin(1, 1);
    this.dlgHint.setAlpha(0);

    this.dlgC = this.add
      .container(0, 0, [dim, this.dlgG, this.dlgPortrait, this.dlgName, this.dlgText, this.dlgHint])
      .setDepth(65)
      .setAlpha(0);
    this.tweens.add({ targets: this.dlgC, alpha: 1, duration: 220 });
    this.showDlgLine(0);
  }

  private showDlgLine(i: number) {
    const script = DIALOGUES[dialogueState.scriptId];
    if (!script) return;
    const line = script.lines[i];
    const meta = SPEAKER_META[line.who];
    dialogueState.lineIndex = i;
    this.dlgName?.setText(meta.name).setColor(meta.color);
    const tex = this.textures.exists(meta.portrait) ? meta.portrait : 'ico_hecate';
    if (this.dlgPortrait && this.dlgPortrait.texture.key !== tex) {
      this.tweens.killTweensOf(this.dlgPortrait);
      this.dlgPortrait.setAlpha(0.25);
      this.dlgPortrait.setTexture(tex);
      this.tweens.add({ targets: this.dlgPortrait, alpha: 1, duration: 220 });
    }
    this.dlgFull = line.text;
    this.dlgShown = 0;
    this.dlgText?.setText('');
    this.dlgHint?.setAlpha(0);
  }

  private advanceDialogue() {
    if (!dialogueState.active || !dialogueState.modal) return;
    if (this.time.now - this.dlgStartedAt < 400) return;
    const script = DIALOGUES[dialogueState.scriptId];
    if (!script) return;
    // Primera pulsación: completa la línea. Segunda: avanza.
    if (this.dlgShown < this.dlgFull.length) {
      this.dlgShown = this.dlgFull.length;
      this.dlgText?.setText(this.dlgFull);
      this.dlgHint?.setAlpha(1);
      return;
    }
    sfx.play('select');
    if (dialogueState.lineIndex + 1 >= script.lines.length) this.endDialogue();
    else this.showDlgLine(dialogueState.lineIndex + 1);
  }

  private endDialogue() {
    const id = dialogueState.scriptId;
    dialogueState.seen.add(id);
    dialogueState.active = false;
    dialogueState.modal = false;
    dialogueState.scriptId = '';
    const c = this.dlgC;
    this.dlgC = null;
    this.dlgPortrait = this.dlgName = this.dlgText = this.dlgHint = null;
    if (c) {
      this.tweens.add({ targets: c, alpha: 0, duration: 180, onComplete: () => c.destroy() });
    }
    bus.emit('dialogueEnd', id);
  }

  private updateDialogue(dt: number) {
    if (!dialogueState.active || !dialogueState.modal || !this.dlgText) return;
    // Máquina de escribir
    if (this.dlgShown < this.dlgFull.length) {
      this.dlgShown = Math.min(this.dlgFull.length, this.dlgShown + (dt / 1000) * 52);
      this.dlgText.setText(this.dlgFull.slice(0, Math.floor(this.dlgShown)));
      this.dlgTick++;
      if (this.dlgTick % 3 === 0) sfx.play('talk');
      if (this.dlgShown >= this.dlgFull.length) this.dlgHint?.setAlpha(1);
    } else {
      this.dlgHint?.setAlpha(0.55 + 0.45 * Math.sin(this.time.now / 240));
    }
    // Avanzar con teclado/mando (el clic lo gestiona pointerdown)
    if (input.edge.interact || input.edge.atk || input.edge.blink) this.advanceDialogue();
  }

  // ── avisos cortos ──
  private queueBark(text: string, color: string) {
    if (this.barkQueue.length > 2) this.barkQueue.shift();
    this.barkQueue.push({ text, color });
  }

  private updateBarks() {
    const now = this.time.now;
    if (this.barkC) {
      if (now > this.barkUntil) {
        const c = this.barkC;
        this.barkC = null;
        this.tweens.add({ targets: c, alpha: 0, y: '-=14', duration: 260, onComplete: () => c.destroy() });
      }
      return;
    }
    if (!this.barkQueue.length) return;
    // Los diálogos modales tienen prioridad: el aviso espera.
    if (dialogueState.active && dialogueState.modal) return;
    if (run.mode !== 'play') return;
    const { text, color } = this.barkQueue.shift()!;
    const t = this.txt(0, 0, text, 17, '#e9e4d6', FONT_N, '700').setOrigin(0.5);
    const w = Math.min(760, t.width + 56);
    const g = this.add.graphics();
    g.fillStyle(0x070b0e, 0.92);
    g.fillRect(-w / 2, -21, w, 42);
    g.lineStyle(1.5, 0xe2c176, 0.7);
    g.strokeRect(-w / 2 + 0.5, -20.5, w - 1, 41);
    g.fillStyle(Phaser.Display.Color.HexStringToColor(color).color, 1);
    g.fillCircle(-w / 2 + 22, 0, 6);
    this.barkC = this.add.container(VIEW_W / 2, 700, [g, t]).setDepth(45).setAlpha(0);
    this.tweens.add({ targets: this.barkC, alpha: 1, duration: 180 });
    this.barkUntil = now + 2600;
  }

  // ───────────────────────── Ofrenda de bendiciones (Modal sobrio) ─────────────────────────
  private openModal() {
    this.sel = 0;
    this.modalAt = this.time.now;
    sfx.play('select');
    const god = GODS[run.choiceGod] ?? GODS.zeus;
    const items: Phaser.GameObjects.GameObject[] = [];

    // Fondo oscuro que bloquea el juego
    items.push(this.add.rectangle(0, 0, VIEW_W, VIEW_H, 0x030608, 0.88).setOrigin(0));

    items.push(this.txt(VIEW_W / 2, 90, `OFRENDA DE ${god.name.toUpperCase()}`, 38, god.color, FONT_T, '800').setOrigin(0.5));
    items.push(this.txt(VIEW_W / 2, 134, 'Selecciona una bendición  ·  1, 2, 3 o Clic  ·  ◄ ► para navegar', 15, '#8fa3a0', FONT_N, '600').setOrigin(0.5));

    this.cards = [];
    run.choices.forEach((ch, i) => {
      const gd = GODS[ch.def.god];
      const rar = RARITY[ch.rarity];
      const cx = VIEW_W / 2 + (i - 1) * 360,
        cy = 480;

      // Carta de piedra limpia
      const bg = this.add
        .rectangle(0, 0, 320, 480, 0x090e12, 0.98)
        .setStrokeStyle(2, Phaser.Display.Color.HexStringToColor(rar.color).color);

      const ico = this.add.image(0, -130, 'ico_' + ch.def.god).setScale(0.85);
      const tg = this.txt(0, -56, gd.name.toUpperCase(), 16, gd.color, FONT_T, '700').setOrigin(0.5);
      const tr = this.txt(0, -32, rar.name.toUpperCase(), 13, rar.color, FONT_N, '700').setOrigin(0.5);
      const tt = this.txt(0, 10, ch.def.title, 22, '#f5df9e', FONT_T, '700').setOrigin(0.5).setWordWrapWidth(280).setAlign('center');

      const td = this.add
        .text(0, 52, ch.def.desc(rar.v), {
          fontFamily: FONT_N,
          fontStyle: '600',
          fontSize: '18px',
          color: '#c2d6d2',
          align: 'center',
          wordWrap: { width: 270 },
          stroke: '#04070a',
          strokeThickness: 2.5,
        })
        .setOrigin(0.5, 0);

      const tk = this.txt(0, 205, `[ ${i + 1} ]`, 18, '#e2c176', FONT_T, '700').setOrigin(0.5);

      const c = this.add.container(cx, cy, [bg, ico, tg, tr, tt, td, tk]);
      bg.setInteractive({ useHandCursor: true });
      bg.on('pointerover', () => (this.sel = i));
      bg.on('pointerdown', () => this.choose(i));

      items.push(c);
      this.cards.push({ c, bg });
    });

    this.modal = this.add.container(0, 0, items).setDepth(60);
  }

  private choose(i: number) {
    if (this.time.now - this.modalAt < 300) return;
    bus.emit('pickBoon', i);
  }

  private updateModal() {
    const e = input.edge;
    const n = run.choices.length;
    if (e.left) {
      this.sel = (this.sel + n - 1) % n;
      sfx.play('select');
    }
    if (e.right) {
      this.sel = (this.sel + 1) % n;
      sfx.play('select');
    }
    if (e.atk || e.interact) this.choose(this.sel);
    ['Digit1', 'Digit2', 'Digit3'].forEach((k, i) => {
      if (input.justKey(k) && i < n) this.choose(i);
    });

    this.cards.forEach((c, i) => {
      const on = i === this.sel;
      c.c.setScale(Phaser.Math.Linear(c.c.scaleX, on ? 1.03 : 0.98, 0.25));
      c.bg.setFillStyle(on ? 0x121b22 : 0x090e12, 0.98);
    });
  }

  // ───────────────────────── Pantallas de Fin de Partida ─────────────────────────
  private openEnd() {
    // La victoria y la derrota se narran primero con diálogo, como en Hades II.
    const endDlg = run.mode === 'won' ? 'victory' : run.mode === 'dead' ? 'death' : '';
    if (endDlg && !dialogueState.seen.has(endDlg)) {
      if (!dialogueState.active) this.startDialogue(endDlg);
      return;
    }
    this.endMode = run.mode;
    this.endAt = this.time.now;
    const won = run.mode === 'won';
    const items: Phaser.GameObjects.GameObject[] = [];

    items.push(this.add.rectangle(0, 0, VIEW_W, VIEW_H, 0x030608, 0.92).setOrigin(0));

    items.push(this.txt(VIEW_W / 2, 170, won ? 'VICTORIA' : 'HAS CAÍDO', 72, won ? '#73cfa8' : '#e25868', FONT_T, '800').setOrigin(0.5));
    items.push(
      this.txt(
        VIEW_W / 2,
        240,
        won ? 'Has derrotado a los Guardianes del Inframundo' : 'El Inframundo te reclama… por ahora',
        20,
        '#a2b5b1',
        FONT_N,
        '600'
      ).setOrigin(0.5)
    );

    const s = run.stats;
    const mm = Math.floor(s.time / 60),
      ss = Math.floor(s.time % 60);

    const rows = [
      ['Salas completadas', `${run.room} / ${run.totalRooms}`],
      ['Enemigos derrotados', `${s.kills}`],
      ['Conexiones ESTABLISHED', `${s.established}`],
      ['Handshakes reseteados (RST)', `${s.rst}`],
      ['Daño recibido', `${Math.round(s.dmgTaken)}`],
      ['Tiempo de carrera', `${mm}:${String(ss).padStart(2, '0')}`],
      ['Bendiciones adquiridas', `${run.taken.length}`],
    ];

    if (net.stats.acked > 0) {
      rows.push(['Latencia media de red', `${net.stats.avg.toFixed(1)} ms`]);
    }

    rows.forEach((r, i) => {
      items.push(this.txt(VIEW_W / 2 - 200, 310 + i * 36, r[0], 18, '#889e9a', FONT_N, '600'));
      items.push(this.txt(VIEW_W / 2 + 200, 310 + i * 36, r[1], 18, '#f5df9e', FONT_N, '700').setOrigin(1, 0));
    });

    const hint = this.txt(VIEW_W / 2, 680, '', 20, '#e2c176', FONT_T, '700').setOrigin(0.5);
    hint.setName('hint');
    items.push(hint);

    this.endC = this.add.container(0, 0, items).setDepth(70).setAlpha(0);
    this.tweens.add({ targets: this.endC, alpha: 1, duration: 600 });

    const z = this.add.zone(0, 0, VIEW_W, VIEW_H).setOrigin(0).setInteractive();
    z.on('pointerdown', () => this.retry());
    this.endC.add(z);
  }

  private retry() {
    if (this.time.now - this.endAt < 1000) return;
    bus.emit('restartRun');
  }

  private updateEnd() {
    const hint = this.endC?.getByName('hint') as Phaser.GameObjects.Text | undefined;
    if (hint) {
      hint.setText(this.time.now - this.endAt > 1000 ? 'Pulsa Espacio, E o Clic para intentar de nuevo' : '');
    }
    if (input.edge.interact || input.edge.atk || input.edge.blink) this.retry();
  }
}
