// ───────────────────────────────────────────────────────────────
//  GameScene · HADES.NET
//  Melinoë desciende por las salas de Océano.  Regla de Telemática:
//  el «3-way handshake» de TCP  →  SYN (Ataque) · SYN-ACK (Especial)
//  · ACK (Conjuro).  Completarlo sobre un mismo enemigo = ESTABLISHED
//  (daño ×3, rompe el Firewall y explota en cadena).
// ───────────────────────────────────────────────────────────────
import Phaser from 'phaser';
import { WORLD, K, OX, OY, WALL_H, MAP_W, MAP_H, VIEW_H, BMIN, BMAX, px, py, toWorld, screenDirToWorld, worldDirToScreen, DOORS, HEX } from '../config';
import { ORIGINS, BIOMES } from '../art_env';
import type { Biome, BiomeId } from '../art_env';
import { GODS } from '../art_chars';
import { input, sfx } from '../services';
import { bus } from '../bus';
import { run, resetRun, BOONS, RARITY } from '../state';
import type { BoonChoice, RewardKey } from '../state';
import { dialogueState } from '../dialogue';

const SQ2 = Math.SQRT2;
const TAU = Math.PI * 2;
const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const PL_R = 17;
const ADD = Phaser.BlendModes.ADD;

type Kind = 'shade' | 'wailer' | 'spear' | 'archer' | 'shellback' | 'lamia' | 'urn' | 'brute' | 'boss';
type BossVariant = 'captain' | 'phantom';

interface RoomCfg {
  name: string;
  sub: string;
  biome: BiomeId;
  layout: number;
  waves: Kind[][];
  boss?: BossVariant;
}

// Estructura de la carrera, como las regiones de Hades II: Erebo → Océano → Campos de Lamento
const ROOMS: RoomCfg[] = [
  { name: 'Claro de los Caídos', sub: 'Erebo · Sala 1', biome: 'erebus', layout: 0, waves: [['shade', 'shade', 'shade'], ['shade', 'shade', 'spear']] },
  { name: 'Senda de las Lamparillas', sub: 'Erebo · Sala 2', biome: 'erebus', layout: 1, waves: [['spear', 'shade', 'wailer', 'archer'], ['archer', 'wailer', 'shade', 'shade', 'spear']] },
  { name: 'Cubierta del Leviatán', sub: 'Océano · Sala 3', biome: 'oceanus', layout: 0, waves: [['shade', 'spear', 'archer', 'shellback'], ['brute', 'shellback', 'shade', 'urn']] },
  { name: 'Bodega Anegada', sub: 'Océano · Sala 4', biome: 'oceanus', layout: 1, waves: [['archer', 'shellback', 'spear', 'urn', 'urn'], ['brute', 'spear', 'shellback', 'shade', 'archer']] },
  { name: 'Camarote del Capitán Náufrago', sub: 'Océano · Guardián', biome: 'oceanus', layout: 2, waves: [['boss']], boss: 'captain' },
  { name: 'Pradera de los Asfódelos', sub: 'Campos de Lamento · Sala 6', biome: 'fields', layout: 0, waves: [['lamia', 'shade', 'archer', 'urn', 'urn'], ['brute', 'lamia', 'shade', 'shade', 'spear']] },
  { name: 'Cementerio de los Sin Nombre', sub: 'Campos de Lamento · Sala 7', biome: 'fields', layout: 1, waves: [['brute', 'lamia', 'archer', 'urn'], ['lamia', 'archer', 'spear', 'spear', 'shade', 'wailer', 'urn']] },
  { name: 'Altar del Lamento', sub: 'Campos de Lamento · Guardián', biome: 'fields', layout: 2, waves: [['boss']], boss: 'phantom' },
];

interface Obst {
  x: number;
  y: number;
  r: number;
  key: string;
  scale?: number;
}
interface Deco {
  key: string;
  x: number;
  y: number;
  scale?: number;
  flip?: boolean;
  lift?: number;
}
interface HazardDef {
  type: 'vent' | 'miasma';
  x: number;
  y: number;
}
interface Layout {
  obst: Obst[];
  deco: Deco[];
  hazards: HazardDef[];
}

const LAYOUTS: Record<BiomeId, Layout[]> = {
  erebus: [
    {
      obst: [
        { x: 320, y: 320, r: 40, key: 'tree' },
        { x: 690, y: 690, r: 40, key: 'tree' },
      ],
      deco: [
        { key: 'casket', x: 160, y: 40 },
        { key: 'casket', x: 40, y: 160, flip: true },
        { key: 'casket', x: 860, y: 40 },
        { key: 'shrooms', x: 250, y: 560 },
        { key: 'shrooms', x: 620, y: 240 },
        { key: 'shrooms', x: 40, y: 700 },
        { key: 'brazier', x: 940, y: 60 },
        { key: 'brazier', x: 60, y: 940 },
        { key: 'column', x: 960, y: 700 },
        { key: 'casket', x: 700, y: 960 },
        { key: 'shrooms', x: 820, y: 400 },
      ],
      hazards: [],
    },
    {
      obst: [
        { x: 500, y: 250, r: 40, key: 'tree' },
        { x: 260, y: 640, r: 40, key: 'tree' },
        { x: 740, y: 580, r: 40, key: 'tree' },
      ],
      deco: [
        { key: 'casket', x: 40, y: 480 },
        { key: 'casket', x: 40, y: 560, flip: true },
        { key: 'column', x: 940, y: 300 },
        { key: 'column', x: 300, y: 950 },
        { key: 'brazier', x: 940, y: 60 },
        { key: 'brazier', x: 60, y: 940 },
        { key: 'shrooms', x: 450, y: 800 },
        { key: 'shrooms', x: 880, y: 760 },
        { key: 'shrooms', x: 150, y: 350 },
        { key: 'casket', x: 600, y: 960 },
      ],
      hazards: [],
    },
  ],
  oceanus: [
    {
      obst: [
        { x: 330, y: 650, r: 34, key: 'pillar' },
        { x: 650, y: 330, r: 34, key: 'pillar' },
        { x: 760, y: 760, r: 34, key: 'pillar' },
      ],
      deco: [
        { key: 'gold', x: 150, y: 34, scale: 1.1 },
        { key: 'gold', x: 34, y: 130, scale: 0.95, flip: true },
        { key: 'gold', x: 900, y: 34 },
        { key: 'bag', x: 30, y: 470, flip: true },
        { key: 'bag', x: 46, y: 520, scale: 0.9 },
        { key: 'crate', x: 34, y: 590, flip: true },
        { key: 'crate', x: 34, y: 590, lift: 46 },
        { key: 'crate', x: 38, y: 650, scale: 0.95 },
        { key: 'barrel', x: 30, y: 720 },
        { key: 'barrel', x: 48, y: 780, scale: 0.95 },
        { key: 'barrel', x: 30, y: 850 },
        { key: 'barrel', x: 540, y: 28 },
        { key: 'barrel', x: 590, y: 36, scale: 0.95 },
        { key: 'bag', x: 650, y: 30 },
        { key: 'wheel', x: 780, y: 38, scale: 1.05 },
        { key: 'barrel', x: 965, y: 640 },
        { key: 'barrel', x: 975, y: 700, scale: 0.95 },
        { key: 'crate', x: 960, y: 850 },
        { key: 'barrel', x: 640, y: 968 },
        { key: 'barrel', x: 700, y: 978, scale: 0.95 },
      ],
      hazards: [
        { type: 'vent', x: 500, y: 760 },
        { type: 'vent', x: 760, y: 500 },
      ],
    },
    {
      obst: [
        { x: 500, y: 500, r: 34, key: 'pillar' },
        { x: 240, y: 760, r: 34, key: 'pillar' },
        { x: 760, y: 240, r: 34, key: 'pillar' },
      ],
      deco: [
        { key: 'crate', x: 40, y: 300 },
        { key: 'crate', x: 40, y: 300, lift: 46 },
        { key: 'crate', x: 46, y: 360, scale: 0.95 },
        { key: 'barrel', x: 150, y: 30 },
        { key: 'barrel', x: 200, y: 36, scale: 0.95 },
        { key: 'gold', x: 600, y: 34, scale: 1.1 },
        { key: 'bag', x: 700, y: 30 },
        { key: 'wheel', x: 40, y: 800 },
        { key: 'barrel', x: 965, y: 300 },
        { key: 'barrel', x: 975, y: 360, scale: 0.95 },
        { key: 'crate', x: 960, y: 900 },
        { key: 'barrel', x: 400, y: 972 },
        { key: 'bag', x: 850, y: 970 },
        { key: 'gold', x: 920, y: 600 },
      ],
      hazards: [
        { type: 'vent', x: 300, y: 300 },
        { type: 'vent', x: 700, y: 700 },
        { type: 'vent', x: 520, y: 820 },
      ],
    },
    {
      obst: [
        { x: 250, y: 250, r: 34, key: 'pillar' },
        { x: 750, y: 750, r: 34, key: 'pillar' },
      ],
      deco: [
        { key: 'gold', x: 150, y: 34, scale: 1.2 },
        { key: 'gold', x: 34, y: 150, scale: 1.1, flip: true },
        { key: 'gold', x: 880, y: 34 },
        { key: 'gold', x: 34, y: 880 },
        { key: 'wheel', x: 500, y: 36, scale: 1.1 },
        { key: 'barrel', x: 965, y: 500 },
        { key: 'barrel', x: 975, y: 560, scale: 0.95 },
        { key: 'crate', x: 500, y: 965 },
        { key: 'crate', x: 500, y: 965, lift: 46 },
        { key: 'bag', x: 960, y: 800 },
        { key: 'bag', x: 800, y: 965 },
      ],
      hazards: [
        { type: 'vent', x: 500, y: 250 },
        { type: 'vent', x: 250, y: 500 },
        { type: 'vent', x: 500, y: 750 },
        { type: 'vent', x: 750, y: 500 },
      ],
    },
  ],
  fields: [
    {
      obst: [
        { x: 330, y: 300, r: 38, key: 'thorn' },
        { x: 700, y: 680, r: 38, key: 'thorn' },
        { x: 290, y: 720, r: 38, key: 'thorn' },
      ],
      deco: [
        { key: 'grave0', x: 120, y: 40 },
        { key: 'grave1', x: 170, y: 46 },
        { key: 'grave0', x: 40, y: 600 },
        { key: 'grave1', x: 46, y: 660 },
        { key: 'deadtree', x: 900, y: 50 },
        { key: 'deadtree', x: 60, y: 900 },
        { key: 'urnprop', x: 600, y: 40 },
        { key: 'urnprop', x: 640, y: 46 },
        { key: 'grave0', x: 960, y: 400 },
        { key: 'grave1', x: 900, y: 960 },
        { key: 'column', x: 960, y: 740 },
      ],
      hazards: [
        { type: 'miasma', x: 650, y: 350 },
        { type: 'miasma', x: 400, y: 600 },
      ],
    },
    {
      obst: [
        { x: 500, y: 500, r: 30, key: 'deadtree' },
        { x: 250, y: 650, r: 38, key: 'thorn' },
        { x: 750, y: 350, r: 38, key: 'thorn' },
      ],
      deco: [
        { key: 'grave0', x: 200, y: 40 },
        { key: 'grave1', x: 260, y: 44 },
        { key: 'grave0', x: 320, y: 40 },
        { key: 'grave1', x: 40, y: 500 },
        { key: 'grave0', x: 44, y: 560 },
        { key: 'grave1', x: 40, y: 620 },
        { key: 'grave0', x: 960, y: 200 },
        { key: 'grave1', x: 960, y: 260 },
        { key: 'grave0', x: 700, y: 960 },
        { key: 'grave1', x: 760, y: 964 },
        { key: 'column', x: 940, y: 60 },
        { key: 'column', x: 60, y: 940 },
        { key: 'urnprop', x: 900, y: 900 },
        { key: 'deadtree', x: 560, y: 40 },
      ],
      hazards: [
        { type: 'miasma', x: 300, y: 300 },
        { type: 'miasma', x: 700, y: 700 },
        { type: 'miasma', x: 500, y: 820 },
      ],
    },
    {
      obst: [
        { x: 250, y: 250, r: 24, key: 'column' },
        { x: 750, y: 250, r: 24, key: 'column' },
        { x: 250, y: 750, r: 24, key: 'column' },
        { x: 750, y: 750, r: 24, key: 'column' },
      ],
      deco: [
        { key: 'deadtree', x: 60, y: 940 },
        { key: 'deadtree', x: 940, y: 60 },
        { key: 'grave0', x: 500, y: 40 },
        { key: 'grave1', x: 540, y: 44 },
        { key: 'grave0', x: 460, y: 44 },
        { key: 'grave1', x: 40, y: 500 },
        { key: 'grave0', x: 44, y: 540 },
        { key: 'urnprop', x: 960, y: 500 },
        { key: 'urnprop', x: 500, y: 960 },
        { key: 'brazier', x: 940, y: 940 },
      ],
      hazards: [
        { type: 'miasma', x: 500, y: 300 },
        { type: 'miasma', x: 300, y: 500 },
        { type: 'miasma', x: 700, y: 500 },
      ],
    },
  ],
};

const EDEF: Record<string, { tex: string; oy: number; scale: number; hp: number; r: number; speed: number; dmg: number; armor: number; top: number; shadow: number }> = {
  shade: { tex: 'shade', oy: 0.9, scale: 0.75, hp: 34, r: 16, speed: 150, dmg: 10, armor: 0, top: 84, shadow: 0.55 },
  wailer: { tex: 'wailer', oy: 0.94, scale: 0.86, hp: 62, r: 19, speed: 118, dmg: 17, armor: 0, top: 106, shadow: 0.66 },
  spear: { tex: 'spear_body', oy: 0.95, scale: 0.95, hp: 52, r: 17, speed: 110, dmg: 14, armor: 0, top: 112, shadow: 0.6 },
  archer: { tex: 'archer_body', oy: 0.95, scale: 0.95, hp: 44, r: 17, speed: 120, dmg: 9, armor: 0, top: 112, shadow: 0.6 },
  shellback: { tex: 'shellback', oy: 0.94, scale: 0.9, hp: 165, r: 28, speed: 72, dmg: 22, armor: 110, top: 102, shadow: 1.05 },
  lamia: { tex: 'lamia', oy: 0.96, scale: 0.9, hp: 68, r: 20, speed: 108, dmg: 12, armor: 0, top: 132, shadow: 0.86 },
  urn: { tex: 'urn', oy: 0.95, scale: 0.8, hp: 26, r: 15, speed: 95, dmg: 24, armor: 0, top: 86, shadow: 0.5 },
  brute: { tex: 'brute', oy: 0.97, scale: 0.8, hp: 150, r: 27, speed: 82, dmg: 24, armor: 70, top: 138, shadow: 1.1 },
  boss: { tex: 'captain', oy: 0.97, scale: 1.35, hp: 850, r: 42, speed: 68, dmg: 30, armor: 220, top: 232, shadow: 1.9 },
  phantom: { tex: 'phantom', oy: 0.97, scale: 1.25, hp: 1100, r: 40, speed: 84, dmg: 32, armor: 260, top: 250, shadow: 1.7 },
};

interface BreakPot {
  id: number;
  x: number;
  y: number;
  r: number;
  c: Phaser.GameObjects.Container;
  dead: boolean;
}

interface Enemy {
  id: number;
  kind: Kind;
  x: number;
  y: number;
  r: number;
  hp: number;
  maxHp: number;
  armor: number;
  maxArmor: number;
  speed: number;
  dmg: number;
  top: number;
  state: string;
  t: number;
  cd: number;
  kvx: number;
  kvy: number;
  dirx: number;
  diry: number;
  tx: number;
  ty: number;
  hs: 0 | 1 | 2;
  hsT: number;
  hintT: number;
  chill: number;
  chillSlow: number;
  burn: number;
  burnDps: number;
  burnTick: number;
  weak: number;
  weakMul: number;
  rooted: number;
  stun: number;
  spawnT: number;
  dead: boolean;
  flash: number;
  phase: number;
  strafe: number;
  raise: number;
  hitDone: boolean;
  boltCd: number;
  scale: number;
  c: Phaser.GameObjects.Container;
  body: Phaser.GameObjects.Image;
  wpn?: Phaser.GameObjects.Image;
  bossPat: number;
  bossT: number;
  summoned: number;
  variant: BossVariant;
}

interface Tele {
  type: 'circle' | 'line';
  x: number;
  y: number;
  x2: number;
  y2: number;
  r: number;
  w: number;
  t: number;
  dur: number;
  color: number;
  owner?: Enemy;
  track?: (t: Tele) => void;
  fire: (t: Tele) => void;
}

interface Proj {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  dmg: number;
  img: Phaser.GameObjects.Image;
  hit: Set<number>;
}

interface Part {
  img: Phaser.GameObjects.Image;
  vx: number;
  vy: number;
  ax: number;
  ay: number;
  life: number;
  max: number;
  s0: number;
  s1: number;
  a0: number;
  a1: number;
  spin: number;
  sy: number;
}

interface PartOpts {
  key?: string;
  tint?: number;
  vx?: number;
  vy?: number;
  ax?: number;
  ay?: number;
  life?: number;
  s0?: number;
  s1?: number;
  a0?: number;
  a1?: number;
  rot?: number;
  spin?: number;
  depth?: number;
  add?: boolean;
  sy?: number;
}

export class GameScene extends Phaser.Scene {
  // mundo
  private doors!: Record<'E' | 'W', { frame: Phaser.GameObjects.Image; lock: Phaser.GameObjects.Image; veil: Phaser.GameObjects.Image; glow: Phaser.GameObjects.Image; icon: Phaser.GameObjects.Image; reward: RewardKey }>;
  private glows: { img: Phaser.GameObjects.Image; base: number; ph: number }[] = [];
  private envObjs: Phaser.GameObjects.GameObject[] = [];
  private obst: Obst[] = [];
  private biome: Biome = BIOMES.erebus;
  private hazards: { type: 'vent' | 'miasma'; x: number; y: number; r: number; t: number; vx: number; vy: number; fired: boolean }[] = [];
  private gfx!: Phaser.GameObjects.Graphics;
  private hudg!: Phaser.GameObjects.Graphics;
  private camZone!: Phaser.GameObjects.Zone;
  private bg!: Phaser.GameObjects.Image;

  // entidades
  private pl!: any;
  private enemies: Enemy[] = [];
  private breakPots: BreakPot[] = [];
  private tele: Tele[] = [];
  private bolts: Proj[] = [];
  private eproj: Proj[] = [];
  private parts: Part[] = [];
  private partPool: Phaser.GameObjects.Image[] = [];
  private sched: { t: number; fn: () => void }[] = [];
  private ring: { x: number; y: number; r: number; t: number; life: number; omega: boolean; pulse: number } | null = null;
  private fxRings: { x: number; y: number; r1: number; t: number; dur: number; color: number }[] = [];
  private waves: { x: number; y: number; r: number; t: number; hit: boolean }[] = [];
  private orb: { x: number; y: number; reward: RewardKey; c: Phaser.GameObjects.Container; t: number } | null = null;
  private strikes: { x: number; y: number; t: number; dmg: number }[] = [];

  // estado
  private t = 0;
  private enemyId = 1;
  private hitstop = 0;
  private slowT = 0;
  private slowF = 1;
  private roomIdx = 0;
  private roomReward: RewardKey = 'zeus';
  private nextRewards: { E: RewardKey; W: RewardKey } = { E: 'heart', W: 'hermes' };
  private waveIdx = 0;
  private waveDelay = 1.5;
  private waveActive = false;
  private cleared = false;
  private doorsOpen = false;
  private transition = false;
  private mouseT = -99999;
  private ending = 0;
  private unsub: (() => void)[] = [];
  /** avisos de combate ya mostrados (una vez por run) */
  private barked = new Set<string>();
  /** halo cálido que sigue a Melínoe */
  private plLight: Phaser.GameObjects.Image | null = null;
  /** capas de parallax de primer plano / dosel */
  private fgLayer: Phaser.GameObjects.Image | null = null;
  private canopyLayer: Phaser.GameObjects.Image | null = null;

  constructor() {
    super('Game');
  }

  // ═══════════════════════════ CREATE ═══════════════════════════
  create() {
    resetRun();
    dialogueState.active = false;
    dialogueState.modal = false;
    dialogueState.scriptId = '';
    dialogueState.lineIndex = 0;
    dialogueState.seen.clear();
    this.barked.clear();
    this.plLight = null;
    this.enemies = [];
    this.breakPots = [];
    this.tele = [];
    this.bolts = [];
    this.eproj = [];
    this.parts = [];
    this.partPool = [];
    this.sched = [];
    this.ring = null;
    this.fxRings = [];
    this.waves = [];
    this.orb = null;
    this.strikes = [];
    this.glows = [];
    this.t = 0;
    this.hitstop = 0;
    this.slowT = 0;
    this.ending = 0;
    this.transition = false;
    (window as any).__hades = this;

    const cam = this.cameras.main;
    cam.setBounds(0, 0, MAP_W, MAP_H);
    cam.setBackgroundColor('#020608');

    this.envObjs = [];
    this.hazards = [];
    this.bg = this.add.image(0, 0, 'bg_erebus').setOrigin(0).setScrollFactor(0.55).setDepth(-10);

    this.gfx = this.add.graphics().setDepth(1);
    this.hudg = this.add.graphics().setDepth(9500);
    this.camZone = this.add.zone(0, 0, 10, 10);

    this.buildDoors();
    this.buildPlayer();

    cam.startFollow(this.camZone, true, 0.07, 0.07);

    this.input.mouse?.disableContextMenu();
    this.input.on('pointermove', () => (this.mouseT = this.time.now));
    this.input.on('pointerdown', () => (this.mouseT = this.time.now));

    this.unsub.forEach((u) => u());
    this.unsub = [
      bus.on('pause', (p: boolean) => {
        if (p) this.scene.pause();
        else this.scene.resume();
      }),
      bus.on('restartRun', () => this.scene.restart()),
      bus.on('pickBoon', (i: number) => this.applyBoon(i)),
    ];
    this.events.once('shutdown', () => {
      this.unsub.forEach((u) => u());
      this.unsub = [];
    });

    if (!this.scene.isActive('UI')) this.scene.launch('UI');

    this.nextRewards = { E: 'heart', W: 'hermes' };
    this.roomReward = (['zeus', 'poseidon', 'demeter', 'aphrodite', 'hestia', 'hermes', 'artemis'] as RewardKey[])[Math.floor(Math.random() * 7)];
    this.startRoom(0);
  }

  // ═══════════════════════════ CONSTRUCCIÓN ═══════════════════════════
  private buildDoors() {
    this.doors = {} as any;
    (['E', 'W'] as const).forEach((side) => {
      const d = DOORS[side];
      const sx = px(d.x, d.y),
        sy = py(d.x, d.y);
      const [ox, oy] = ORIGINS['door' + side];
      const frame = this.add.image(sx, sy, `doorFrame${side}_erebus`).setOrigin(ox, oy).setDepth(0.6);
      const veil = this.add.image(sx, sy, `doorVeil${side}_erebus`).setOrigin(ox, oy).setDepth(0.62).setBlendMode(ADD).setAlpha(0);
      const lock = this.add.image(sx, sy, `doorLock${side}_erebus`).setOrigin(ox, oy).setDepth(0.64);
      const glow = this.add.image(sx, sy - 70, 'glow').setTint(0x3dffa0).setBlendMode(ADD).setScale(3.4, 3).setAlpha(0.05).setDepth(0.7);
      const icon = this.add.image(sx, sy - 290, 'ico_zeus').setScale(0.5).setDepth(6000).setAlpha(0);
      this.doors[side] = { frame, lock, veil, glow, icon, reward: 'heart' };
    });
  }

  private prop(key: string, x: number, y: number, scale = 1, flip = false, lift = 0) {
    const [ox, oy] = ORIGINS[key];
    const sx = px(x, y),
      sy = py(x, y);
    const img = this.add
      .image(sx, sy - lift, key)
      .setOrigin(ox, oy)
      .setScale(0.5 * scale)
      .setDepth(sy + (lift ? 0.3 : 0));
    if (flip) img.setFlipX(true);
    this.envObjs.push(img);
    return img;
  }

  private light(x: number, y: number, color: number, scale: number, alpha: number, depth = 3000) {
    const img = this.add.image(x, y, 'glow').setTint(color).setBlendMode(ADD).setScale(scale).setAlpha(alpha).setDepth(depth);
    this.glows.push({ img, base: alpha, ph: Math.random() * 6 });
    this.envObjs.push(img);
    return img;
  }

  /** Construye (o reconstruye) suelo, paredes, atrezo y peligros de la sala */
  private buildEnv(cfg: RoomCfg) {
    const b = BIOMES[cfg.biome];
    const lay = LAYOUTS[cfg.biome][cfg.layout];
    this.biome = b;
    this.envObjs.forEach((o) => o.destroy());
    this.envObjs = [];
    this.glows = [];
    this.bg.setTexture('bg_' + b.id);
    const floor = this.add.image(0, 0, 'floor_' + b.id).setOrigin(0).setDepth(0);
    const wallW = Math.ceil(WORLD * K);
    const wE = this.add.image(OX, OY - WALL_H, 'wallE_' + b.id).setOrigin(0).setDepth(0.5);
    const wW = this.add.image(OX - wallW, OY - WALL_H, 'wallW_' + b.id).setOrigin(0).setDepth(0.5);
    this.envObjs.push(floor, wE, wW);
    // capas de parallax: dosel superior y siluetas de primer plano
    this.fgLayer?.destroy();
    this.canopyLayer?.destroy();
    this.fgLayer = this.add.image(0, 0, `fg_${b.id}`).setOrigin(0).setScrollFactor(0).setDepth(9000);
    this.canopyLayer = this.add.image(0, 0, `canopy_${b.id}`).setOrigin(0).setScrollFactor(0).setDepth(8998);
    (['E', 'W'] as const).forEach((side) => {
      const d = this.doors[side];
      d.frame.setTexture(`doorFrame${side}_${b.id}`);
      d.veil.setTexture(`doorVeil${side}_${b.id}`);
      d.lock.setTexture(`doorLock${side}_${b.id}`);
      d.glow.setTint(b.magic);
    });
    // obstáculos y decoración del trazado
    this.obst = lay.obst.map((o) => ({ ...o }));
    for (const o of lay.obst) this.prop(o.key, o.x, o.y, o.scale ?? 1);
    for (const d of lay.deco) this.prop(d.key, d.x, d.y, d.scale ?? 1, d.flip, d.lift);
    // faroles junto a las puertas (Erebo y Océano); braseros en los Campos
    const lan = (x: number, y: number) => {
      const sx = px(x, y),
        sy = py(x, y) - 186;
      const img = this.add.image(sx, sy, 'lantern').setOrigin(0.5, 0).setScale(0.5).setDepth(0.7);
      this.envObjs.push(img);
      this.tweens.add({ targets: img, angle: { from: -2, to: 2 }, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      this.light(sx, sy + 38, b.id === 'erebus' ? 0xb8a6d8 : 0x7fd6b0, 2.0, 0.22);
    };
    if (b.id !== 'fields') {
      lan(180, 6);
      lan(420, 6);
      lan(6, 180);
      lan(6, 420);
    }
    for (const d of lay.deco) {
      if (d.key === 'brazier') this.light(px(d.x, d.y), py(d.x, d.y) - 40, 0xffb060, 1.8, 0.22);
    }
    // peligros ambientales
    this.hazards = lay.hazards.map((h) => ({
      type: h.type,
      x: h.x,
      y: h.y,
      r: h.type === 'vent' ? 62 : 95,
      t: Math.random() * 4,
      vx: h.type === 'miasma' ? (Math.random() < 0.5 ? 1 : -1) * 22 : 0,
      vy: h.type === 'miasma' ? (Math.random() < 0.5 ? 1 : -1) * 18 : 0,
      fired: false,
    }));
  }

  private buildPlayer() {
    const imgs: Phaser.GameObjects.Image[] = [];
    const mk = (k: string, x: number, y: number, ox = 0.5, oy = 0.5) => {
      const i = this.add.image(x, y, k).setOrigin(ox, oy).setScale(0.5);
      imgs.push(i);
      return i;
    };
    const shadow = this.add.image(0, 0, 'shadow').setScale(0.8).setAlpha(0.95);
    const body = this.add.container(0, 0);
    const tail = mk('mel_tail', -7, -120, 0.5, 0.06);
    const armLimg = mk('mel_arm_l', 0, 0, 0.5, 0.08);
    const armL = this.add.container(-17, -92, [armLimg]);
    const legL = mk('mel_leg', -7, -44, 0.5, 0);
    const legR = mk('mel_leg', 8, -44, 0.5, 0);
    const skirt = mk('mel_skirt', 0, -56, 0.5, 0);
    const torso = mk('mel_torso', 0, -52, 0.5, 1);
    const headB = mk('mel_head_back', 0, -85, 0.5, 0.93);
    const headF = mk('mel_head_front', 0, -85, 0.5, 0.93);
    const staff = mk('mel_staff', 0, 34, 0.5, 0.6);
    const staffGlow = this.add.image(0, -6, 'glow').setTint(0xb7ffd6).setBlendMode(ADD).setScale(0.55).setAlpha(0.5);
    const armRimg = mk('mel_arm', 0, 0, 0.5, 0.08);
    const armR = this.add.container(17, -92, [staffGlow, staff, armRimg]);
    body.add([tail, armL, legL, legR, skirt, torso, headB, headF, armR]);
    body.setScale(0.92);
    const familiar = this.add.image(-31, -20, 'familiar').setOrigin(0.5, 0.92).setScale(0.5);
    const c = this.add.container(0, 0, [shadow, body, familiar]);
    this.pl = {
      x: 150,
      y: 150,
      r: PL_R,
      lx: 0,
      ly: 0,
      aimx: 1,
      aimy: 1,
      fmx: 1,
      fmy: 1,
      facing: 1,
      back: false,
      invuln: 0,
      atkLock: 0,
      atkDur: 0.3,
      atkStep: 0,
      atkBlend: 0,
      combo: 0,
      comboT: 0,
      cdSpc: 0,
      cdCast: 0,
      castT: 0,
      castHold: 0,
      castActive: false,
      atkHold: 0,
      spcHold: 0,
      atkWasHeld: false,
      spcWasHeld: false,
      atkCharged: false,
      spcCharged: false,
      slowed: false,
      blinkT: 0,
      bdx: 0,
      bdy: 0,
      blinkRech: 0,
      walk: 0,
      hurtT: 0,
      dead: false,
      swingDir: 1,
      speedFrac: 0,
      c,
      body,
      shadow,
      parts: { tail, armL, armR, legL, legR, skirt, torso, headF, headB, staff, familiar },
      imgs,
    };
  }

  // ═══════════════════════════ UTILIDADES ═══════════════════════════
  private after(sec: number, fn: () => void) {
    this.sched.push({ t: sec, fn });
  }

  private part(x: number, y: number, o: PartOpts) {
    if (this.parts.length > 450) return;
    const img = this.partPool.pop() ?? this.add.image(0, 0, 'spark');
    img.setTexture(o.key ?? 'spark');
    img.setPosition(x, y);
    img.setTint(o.tint ?? 0xffffff);
    img.setBlendMode(o.add === false ? Phaser.BlendModes.NORMAL : ADD);
    img.setVisible(true).setActive(true);
    img.setDepth(o.depth ?? 8000);
    img.setRotation(o.rot ?? 0);
    const life = o.life ?? 0.5;
    this.parts.push({
      img,
      vx: o.vx ?? 0,
      vy: o.vy ?? 0,
      ax: o.ax ?? 0,
      ay: o.ay ?? 0,
      life,
      max: life,
      s0: o.s0 ?? 0.5,
      s1: o.s1 ?? 0,
      a0: o.a0 ?? 1,
      a1: o.a1 ?? 0,
      spin: o.spin ?? 0,
      sy: o.sy ?? 1,
    });
    img.setScale(o.s0 ?? 0.5, (o.s0 ?? 0.5) * (o.sy ?? 1));
    img.setAlpha(o.a0 ?? 1);
  }

  private burst(sx: number, sy: number, n: number, tint: number, speed = 220, life = 0.45, key = 'spark', size = 0.55) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU;
      const s = rnd(speed * 0.3, speed);
      this.part(sx, sy, { key, tint, vx: Math.cos(a) * s, vy: Math.sin(a) * s * 0.8, ay: 160, life: rnd(life * 0.6, life), s0: size * rnd(0.6, 1.2), s1: 0, rot: Math.random() * TAU, spin: rnd(-6, 6) });
    }
  }

  private bits(sx: number, sy: number, n: number, speed = 260) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU;
      const s = rnd(speed * 0.4, speed);
      this.part(sx, sy, {
        key: Math.random() < 0.5 ? 'bit0' : 'bit1',
        tint: Math.random() < 0.5 ? 0x7dffe0 : 0xffe27a,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s * 0.8 - 80,
        ay: 240,
        life: rnd(0.7, 1.2),
        s0: 0.62,
        s1: 0.25,
        a0: 1,
        a1: 0,
        depth: 9000,
      });
    }
  }

  private ringFx(x: number, y: number, r1: number, color: number, dur = 0.45) {
    this.fxRings.push({ x, y, r1, t: 0, dur, color });
  }

  private floatAt(sx: number, sy: number, str: string, color = '#ffffff', size = 24, rise = 56, dur = 800) {
    const t = this.add
      .text(sx, sy, str, { fontFamily: 'Rajdhani, sans-serif', fontStyle: '700', fontSize: size + 'px', color, stroke: '#05090c', strokeThickness: Math.max(3, size / 5) })
      .setOrigin(0.5)
      .setDepth(9800);
    this.tweens.add({ targets: t, y: sy - rise, alpha: { from: 1, to: 0 }, duration: dur, ease: 'Cubic.out', onComplete: () => t.destroy() });
  }

  private shake(d = 90, i = 0.004) {
    this.cameras.main.shake(d, i);
  }

  private checkBreakPots(x: number, y: number, range: number) {
    for (const pot of this.breakPots) {
      if (pot.dead) continue;
      if (Math.hypot(pot.x - x, pot.y - y) - pot.r < range) {
        pot.dead = true;
        sfx.play('hit');
        const sx = px(pot.x, pot.y),
          sy = py(pot.x, pot.y);
        this.burst(sx, sy - 20, 10, 0x8c5a38, 200, 0.35, 'spark', 0.4);
        pot.c.destroy();
        const r = Math.random();
        if (r < 0.45) {
          run.mag = Math.min(run.maxMag, run.mag + 6);
          this.floatAt(sx, sy - 40, '+6 Magia', '#8f9bff', 15, 26, 600);
        } else if (r < 0.75) {
          run.hp = Math.min(run.maxHp, run.hp + 2);
          this.floatAt(sx, sy - 40, '+2 Salud', '#73cfa8', 15, 26, 600);
        } else {
          this.burst(sx, sy - 20, 6, 0xe2c176, 160, 0.3);
        }
      }
    }
  }

  private collide(o: { x: number; y: number }, r: number) {
    for (const ob of this.obst) {
      const dx = o.x - ob.x,
        dy = o.y - ob.y;
      const d = Math.hypot(dx, dy);
      const m = r + ob.r;
      if (d < m && d > 0.001) {
        o.x = ob.x + (dx / d) * m;
        o.y = ob.y + (dy / d) * m;
      }
    }
    o.x = clamp(o.x, BMIN, BMAX);
    o.y = clamp(o.y, BMIN, BMAX);
  }

  private nearestEnemy(maxD = 900, ex?: Enemy) {
    let best: Enemy | null = null;
    let bd = maxD;
    for (const e of this.enemies) {
      if (e.dead || e.state === 'spawn' || e === ex) continue;
      const d = Math.hypot(e.x - this.pl.x, e.y - this.pl.y);
      if (d < bd) {
        bd = d;
        best = e;
      }
    }
    return best;
  }

  private getAim() {
    const p = this.pl;
    const now = this.time.now;
    const ptr = this.input.activePointer;
    if (now - this.mouseT < 6000) {
      const cam = this.cameras.main;
      const w = toWorld(ptr.x + cam.scrollX, ptr.y + cam.scrollY);
      const dx = w.x - p.x,
        dy = w.y - p.y;
      const d = Math.hypot(dx, dy);
      if (d > 8) return { x: dx / d, y: dy / d };
    }
    if (input.padAim) {
      const w = screenDirToWorld(input.padAim.x, input.padAim.y);
      return w;
    }
    const e = this.nearestEnemy(760);
    if (e) {
      const dx = e.x - p.x,
        dy = e.y - p.y;
      const d = Math.hypot(dx, dy) || 1;
      return { x: dx / d, y: dy / d };
    }
    return { x: p.fmx, y: p.fmy };
  }

  // ═══════════════════════════ SALAS ═══════════════════════════
  private startRoom(idx: number, fromDoor?: 'E' | 'W') {
    this.roomIdx = idx;
    const cfg = ROOMS[idx];
    run.room = idx + 1;
    run.roomName = cfg.name;
    run.region = BIOMES[cfg.biome].name;
    run.totalRooms = ROOMS.length;
    run.boss = null;
    this.buildEnv(cfg);
    this.enemies.forEach((e) => e.c.destroy());
    this.enemies = [];
    this.breakPots.forEach((pot) => pot.c.destroy());
    this.breakPots = [];
    const potLocs = [
      { x: 180, y: 820 },
      { x: 820, y: 180 },
      { x: 820, y: 820 },
      { x: 180, y: 180 },
      { x: 500, y: 160 },
      { x: 860, y: 500 },
    ];
    potLocs.forEach((loc, i) => {
      const shadow = this.add.image(0, 0, 'shadow').setScale(0.4);
      const body = this.add.image(0, 0, 'breakpot').setOrigin(0.5, 50 / 56).setScale(0.5 * 0.85);
      const c = this.add.container(px(loc.x, loc.y), py(loc.x, loc.y), [shadow, body]).setDepth(py(loc.x, loc.y) + 0.2);
      this.breakPots.push({ id: 1000 + i, x: loc.x, y: loc.y, r: 16, c, dead: false });
    });
    this.tele = [];
    this.bolts.forEach((b) => b.img.destroy());
    this.bolts = [];
    this.eproj.forEach((b) => b.img.destroy());
    this.eproj = [];
    this.waves = [];
    this.strikes = [];
    this.ring = null;
    this.orb?.c.destroy();
    this.orb = null;
    this.cleared = false;
    this.waveIdx = 0;
    this.waveDelay = 1.8;
    this.waveActive = false;
    this.sched = [];
    const p = this.pl;
    if (fromDoor === 'E') {
      p.x = 300;
      p.y = 130;
    } else if (fromDoor === 'W') {
      p.x = 130;
      p.y = 300;
    } else {
      p.x = 170;
      p.y = 170;
    }
    p.lx = p.ly = 0;
    run.mag = run.maxMag;
    run.blink = run.maxBlink;
    this.lockDoors();
    // recompensas de la siguiente sala (vista previa en las puertas)
    if (ROOMS[idx + 1]) {
      const gods: RewardKey[] = ['zeus', 'poseidon', 'demeter', 'aphrodite', 'hestia', 'hermes', 'artemis'];
      const pickGod = (not?: RewardKey) => {
        let g: RewardKey;
        do g = gods[Math.floor(Math.random() * gods.length)];
        while (g === not);
        return g;
      };
      const roll = (): RewardKey => {
        const r = Math.random();
        return r < 0.55 ? pickGod() : r < 0.72 ? 'heart' : r < 0.86 ? 'magick' : 'heal';
      };
      const nextBoss = !!ROOMS[idx + 1]?.boss;
      const a = nextBoss ? 'boss' : roll();
      let b: RewardKey = nextBoss ? 'boss' : roll();
      if (b === a && a !== 'boss') b = a === 'heart' ? 'magick' : pickGod(a);
      this.nextRewards = { E: a, W: b };
    }
    const cam = this.cameras.main;
    cam.fadeIn(600, 2, 6, 8);
    cam.centerOn(px(p.x, p.y), py(p.x, p.y) - 40);
    bus.emit('banner', cfg.name, cfg.sub, cfg.boss ? '#ff4fd8' : '#e8dcb0');
    if (cfg.boss) sfx.play('boss');
    // ── diálogos de historia (una vez por run; congelan la oleada) ──
    const dlg = idx === 0 ? 'intro' : idx === 2 ? 'oceanus_enter' : cfg.boss === 'captain' ? 'captain_intro' : idx === 5 ? 'fields_enter' : cfg.boss === 'phantom' ? 'phantom_intro' : '';
    if (dlg && !dialogueState.seen.has(dlg)) {
      this.after(0.9, () => {
        if (!dialogueState.active && !dialogueState.seen.has(dlg)) bus.emit('dialogue', dlg);
      });
    }
  }

  private lockDoors() {
    this.doorsOpen = false;
    (['E', 'W'] as const).forEach((s) => {
      const d = this.doors[s];
      d.lock.setAlpha(1);
      d.veil.setAlpha(0);
      d.icon.setAlpha(0);
      d.glow.setTint(0xa85a70).setAlpha(0.05);
    });
  }

  private openDoors() {
    this.doorsOpen = true;
    sfx.play('door');
    (['E', 'W'] as const).forEach((s) => {
      const d = this.doors[s];
      d.reward = this.nextRewards[s];
      const key = d.reward === 'boss' ? 'ico_boss' : 'ico_' + d.reward;
      d.icon.setTexture(key).setAlpha(1);
      d.glow.setTint(this.biome.magic);
      this.tweens.add({ targets: d.lock, alpha: 0, duration: 500 });
    });
  }

  private spawnWave(i: number) {
    const cfg = ROOMS[this.roomIdx];
    const list = cfg.waves[i];
    list.forEach((k, n) => {
      let x = 500,
        y = 500;
      for (let tries = 0; tries < 30; tries++) {
        x = rnd(150, 850);
        y = rnd(150, 850);
        const okPl = Math.hypot(x - this.pl.x, y - this.pl.y) > 330;
        const okOb = this.obst.every((o) => Math.hypot(x - o.x, y - o.y) > o.r + 50);
        const okEn = this.enemies.every((e) => Math.hypot(x - e.x, y - e.y) > 90);
        if (okPl && okOb && okEn) break;
      }
      if (k === 'boss') {
        x = 600;
        y = 600;
      }
      this.spawnEnemy(k, x, y, 0.9 + n * 0.14, cfg.boss);
    });
    if (cfg.boss) bus.emit('banner', cfg.boss === 'captain' ? 'Capitán Náufrago' : 'Fantasma del Lamento', 'Rompe su Firewall con el handshake', '#ff4fd8');
  }

  private spawnEnemy(kind: Kind, x: number, y: number, delay = 1, variant: BossVariant = 'captain') {
    const d = EDEF[kind === 'boss' && variant === 'phantom' ? 'phantom' : kind];
    const shadow = this.add.image(0, 0, 'shadow').setScale(d.shadow);
    const body = this.add.image(0, 0, d.tex).setOrigin(0.5, d.oy).setScale(0.5 * d.scale);
    const children: Phaser.GameObjects.GameObject[] = [shadow, body];
    let wpn: Phaser.GameObjects.Image | undefined;
    if (kind === 'spear') {
      wpn = this.add.image(0, -48, 'spear_wpn').setOrigin(0.1, 0.5).setScale(0.5 * d.scale);
      children.push(wpn);
    } else if (kind === 'archer') {
      wpn = this.add.image(0, -48, 'bow_wpn').setOrigin(0.5, 0.5).setScale(0.5 * d.scale);
      children.push(wpn);
    } else if (kind === 'boss' && variant === 'phantom') {
      wpn = this.add.image(0, -70, 'scythe').setOrigin(0.05, 0.9).setScale(0.5 * d.scale * 0.9);
      children.push(wpn);
    } else if (kind === 'brute' || kind === 'boss') {
      wpn = this.add.image(0, -70, 'anchor').setOrigin(0.5, 0.62).setScale(0.5 * d.scale * 0.85);
      children.push(wpn);
    }
    const c = this.add.container(px(x, y), py(x, y), children).setAlpha(0);
    const e: Enemy = {
      id: this.enemyId++,
      kind,
      x,
      y,
      r: d.r,
      hp: d.hp,
      maxHp: d.hp,
      armor: d.armor,
      maxArmor: d.armor,
      speed: d.speed,
      dmg: d.dmg,
      top: d.top,
      state: 'spawn',
      t: 0,
      cd: rnd(0.6, 1.6),
      kvx: 0,
      kvy: 0,
      dirx: 1,
      diry: 0,
      tx: x,
      ty: y,
      hs: 0,
      hsT: 0,
      hintT: 0,
      chill: 0,
      chillSlow: 0,
      burn: 0,
      burnDps: 0,
      burnTick: 0,
      weak: 0,
      weakMul: 0,
      rooted: 0,
      stun: 0,
      spawnT: delay,
      dead: false,
      flash: 0,
      phase: Math.random() * 6,
      strafe: Math.random() < 0.5 ? 1 : -1,
      raise: 0,
      hitDone: false,
      boltCd: 0,
      scale: d.scale,
      c,
      body,
      wpn,
      bossPat: 0,
      bossT: 2,
      summoned: 0,
      variant,
    };
    this.enemies.push(e);
    sfx.play('spawn');
    return e;
  }

  private aliveCount() {
    return this.enemies.filter((e) => !e.dead).length;
  }

  private roomCleared() {
    this.cleared = true;
    const cfg = ROOMS[this.roomIdx];
    if (cfg.boss === 'phantom' || !ROOMS[this.roomIdx + 1]) return;
    run.mag = run.maxMag;
    bus.emit('banner', 'Sala despejada', 'Toma la ofrenda y elige una puerta', '#58ff9b');
    sfx.play('pickup');
    this.openDoors();
    this.spawnOrb(this.roomReward);
  }

  private spawnOrb(reward: RewardKey) {
    const col = GODS[reward]?.hex ?? 0xffffff;
    const sx = px(500, 500),
      sy = py(500, 500);
    const glow = this.add.image(0, 0, 'glow').setTint(col).setBlendMode(ADD).setScale(2.4).setAlpha(0.4);
    const orb = this.add.image(0, -40, 'orb').setTint(col).setBlendMode(ADD).setScale(1.1);
    const icon = this.add.image(0, -40, 'ico_' + reward).setScale(0.62);
    const c = this.add.container(sx, sy, [glow, orb, icon]).setDepth(sy + 5);
    this.orb = { x: 500, y: 500, reward, c, t: 0 };
    this.burst(sx, sy - 40, 22, col, 260, 0.7);
    this.ringFx(500, 500, 90, col, 0.6);
  }

  private collectOrb() {
    const o = this.orb;
    if (!o) return;
    const reward = o.reward;
    const col = GODS[reward]?.hex ?? 0xffffff;
    this.burst(px(o.x, o.y), py(o.x, o.y) - 40, 30, col, 320, 0.8);
    o.c.destroy();
    this.orb = null;
    sfx.play('pickup');
    if (reward === 'heart') {
      run.maxHp += 25;
      run.hp = Math.min(run.maxHp, run.hp + 25);
      this.floatAt(px(this.pl.x, this.pl.y), py(this.pl.x, this.pl.y) - 150, '+25 Salud máx.', '#ff6a78', 28, 70, 1400);
    } else if (reward === 'heal') {
      const h = Math.round(run.maxHp * 0.4);
      run.hp = Math.min(run.maxHp, run.hp + h);
      this.floatAt(px(this.pl.x, this.pl.y), py(this.pl.x, this.pl.y) - 150, '+' + h + ' Salud', '#7fd6ff', 28, 70, 1400);
    } else if (reward === 'magick') {
      run.maxMag += 20;
      run.mag = run.maxMag;
      run.mods.magRegen += 1;
      this.floatAt(px(this.pl.x, this.pl.y), py(this.pl.x, this.pl.y) - 150, '+20 Magia máx.', '#9aa6ff', 28, 70, 1400);
    } else {
      this.openChoices(reward);
    }
  }

  private openChoices(god: string) {
    const mine = BOONS.filter((b) => b.god === god);
    const others = BOONS.filter((b) => b.god !== god);
    const picks = [...mine, others[Math.floor(Math.random() * others.length)]];
    const roll = () => {
      const r = Math.random();
      return r < 0.6 ? 0 : r < 0.9 ? 1 : 2;
    };
    const ch: BoonChoice[] = picks.map((def) => ({ def, rarity: roll() }));
    run.choices = ch;
    run.choiceGod = god;
    run.mode = 'choose';
  }

  private applyBoon(i: number) {
    const ch = run.choices[i];
    if (!ch || run.mode !== 'choose') return;
    const v = RARITY[ch.rarity].v;
    const before = run.mods.maxHp;
    ch.def.apply(run.mods, v);
    const delta = run.mods.maxHp - before;
    if (delta > 0) {
      run.maxHp += delta;
      run.hp = Math.min(run.maxHp, run.hp + delta);
    }
    run.taken.push({ id: ch.def.id, god: ch.def.god, rarity: ch.rarity });
    run.mode = 'play';
    run.choices = [];
    sfx.play('pickup');
    const col = GODS[ch.def.god].hex;
    this.burst(px(this.pl.x, this.pl.y), py(this.pl.x, this.pl.y) - 60, 28, col, 340, 0.9);
    this.ringFx(this.pl.x, this.pl.y, 130, col, 0.6);
    this.floatAt(px(this.pl.x, this.pl.y), py(this.pl.x, this.pl.y) - 160, ch.def.title, GODS[ch.def.god].color, 30, 70, 1500);
  }

  private enterDoor(side: 'E' | 'W') {
    if (this.transition) return;
    this.transition = true;
    const reward = this.doors[side].reward;
    sfx.play('door');
    const cam = this.cameras.main;
    cam.fadeOut(450, 2, 6, 8);
    this.after(0.5, () => {
      this.roomReward = reward === 'boss' ? (['zeus', 'poseidon', 'demeter', 'aphrodite', 'hestia', 'hermes', 'artemis'] as RewardKey[])[Math.floor(Math.random() * 7)] : reward;
      this.transition = false;
      this.startRoom(this.roomIdx + 1, side);
    });
  }

  // ═══════════════════════════ BUCLE ═══════════════════════════
  update(_time: number, delta: number) {
    let dt = Math.min(delta / 1000, 0.05);
    const rawDt = dt;
    if (this.hitstop > 0) {
      this.hitstop -= dt;
      dt *= 0.06;
    }
    if (this.slowT > 0) {
      this.slowT -= dt;
      dt *= this.slowF;
    }
    this.t += dt;

    // planificador
    for (let i = this.sched.length - 1; i >= 0; i--) {
      this.sched[i].t -= this.slowT > 0 ? rawDt : dt;
      if (this.sched[i].t <= 0) {
        const f = this.sched[i].fn;
        this.sched.splice(i, 1);
        f();
      }
    }

    const playing = run.mode === 'play';
    // Los diálogos modales congelan el combate (pero no partículas ni render).
    const frozen = dialogueState.active && dialogueState.modal;
    if (playing && !frozen) {
      run.stats.time += dt;
      this.updatePlayer(dt);
      this.updateEnemies(dt);
      this.updateProjectiles(dt);
      this.updateRing(dt);
      this.updateTele(dt);
      this.updateWaves(dt);
      this.updateStrikes(dt);
      this.updateHazards(dt);
      this.updateRoom(dt);
    } else if (run.mode !== 'choose') {
      this.ending += dt;
    }
    this.updateParts(dt);
    this.render(dt);
  }

  // ═══════════════════════════ JUGADOR ═══════════════════════════
  private updatePlayer(dt: number) {
    const p = this.pl;
    const inp = input.state;
    const ie = input.edge;
    const m = run.mods;
    const ptr = this.input.activePointer;
    const mAtk = ptr.leftButtonDown();
    const mSpc = ptr.rightButtonDown();

    p.invuln = Math.max(0, p.invuln - dt);
    p.atkLock = Math.max(0, p.atkLock - dt);
    p.cdSpc = Math.max(0, p.cdSpc - dt);
    p.cdCast = Math.max(0, p.cdCast - dt);
    p.castT = Math.max(0, p.castT - dt);
    p.hurtT = Math.max(0, p.hurtT - dt);
    p.comboT = Math.max(0, p.comboT - dt);
    if (p.comboT <= 0 && p.atkLock <= 0) p.combo = 0;
    run.hurtFlash = Math.max(0, run.hurtFlash - dt * 2.4);
    run.mag = Math.min(run.maxMag, run.mag + (5 + m.magRegen) * dt);

    // recarga de esquivas
    if (run.blink < run.maxBlink) {
      p.blinkRech += dt * (1 + m.blinkRate);
      if (p.blinkRech >= 1.7) {
        run.blink++;
        p.blinkRech = 0;
      }
      run.blinkProg = p.blinkRech / 1.7;
    } else run.blinkProg = 0;

    const aim = this.getAim();
    p.aimx = aim.x;
    p.aimy = aim.y;

    // ── movimiento ──
    let vx = 0,
      vy = 0;
    const mag = Math.hypot(inp.mx, inp.my);
    if (p.blinkT > 0) {
      p.blinkT -= dt;
      vx = p.bdx * 1500;
      vy = p.bdy * 1500;
      const sx = px(p.x, p.y),
        sy = py(p.x, p.y);
      this.part(sx, sy - 50, { key: 'glow', tint: 0x6dffe0, s0: 0.9, s1: 0.1, life: 0.32, a0: 0.55 });
      this.part(sx, sy - 80, { key: 'glow', tint: 0xffffff, s0: 0.5, s1: 0.05, life: 0.25, a0: 0.5 });
      this.checkBreakPots(p.x, p.y, 28);
    } else if (mag > 0.05) {
      const w = screenDirToWorld(inp.mx, inp.my);
      let sp = 300 * (1 + m.speed) * Math.min(1, mag);
      if (inp.sprint) sp *= 1.32 * (1 + m.sprint);
      if (p.atkLock > 0) sp *= 0.32;
      if (p.castT > 0) sp *= 0.5;
      if (run.chargeAtk > 0 || run.chargeSpc > 0) sp *= 0.45;
      if (p.slowed) sp *= 0.55;
      vx = w.x * sp;
      vy = w.y * sp;
      p.fmx = w.x;
      p.fmy = w.y;
      p.speedFrac = clamp(sp / 300, 0, 1.5);
    } else p.speedFrac = 0;
    vx += p.lx;
    vy += p.ly;
    const dec = Math.exp(-11 * dt);
    p.lx *= dec;
    p.ly *= dec;
    p.x += vx * dt;
    p.y += vy * dt;
    this.collide(p, PL_R);

    // ── esquiva (Blink) ──
    if (ie.blink && run.blink > 0 && p.blinkT <= 0) {
      let dx: number, dy: number;
      if (mag > 0.1) {
        const w = screenDirToWorld(inp.mx, inp.my);
        dx = w.x;
        dy = w.y;
      } else {
        const ne = this.nearestEnemy(300);
        if (ne) {
          const ex = p.x - ne.x,
            ey = p.y - ne.y;
          const d = Math.hypot(ex, ey) || 1;
          dx = ex / d;
          dy = ey / d;
        } else {
          dx = p.aimx;
          dy = p.aimy;
        }
      }
      p.bdx = dx;
      p.bdy = dy;
      p.blinkT = 0.16;
      p.invuln = Math.max(p.invuln, 0.32);
      p.atkLock = 0;
      run.blink--;
      sfx.play('blink');
      const sx = px(p.x, p.y),
        sy = py(p.x, p.y);
      this.burst(sx, sy - 40, 14, 0x6dffe0, 260, 0.4, 'spark', 0.5);
      this.ringFx(p.x, p.y, 60, 0x6dffe0, 0.3);
    }

    // ── ataques ──
    const busy = p.blinkT > 0;
    const atkHeld = inp.atk || mAtk;
    const spcHeld = inp.spc || mSpc;
    const attackReady = p.atkLock <= 0 && !busy && p.castT <= 0;
    const specialReady = p.cdSpc <= 0 && p.atkLock <= 0.1 && !busy && p.castT <= 0;

    // Un toque dispara al soltar. Mantener convierte el mismo gesto en Omega,
    // sin encadenar primero un ataque normal como ocurría antes.
    if (atkHeld && attackReady && !p.atkCharged) {
      p.atkHold += dt;
      if (p.atkHold >= 0.14 && p.atkHold - dt < 0.14) sfx.play('telegraph');
      if (p.atkHold >= 0.55) {
        if (run.mag >= 15) {
          this.doOmegaAttack();
          p.atkCharged = true;
        }
      }
    }
    if (!atkHeld && p.atkWasHeld) {
      if (!p.atkCharged && p.atkHold > 0 && attackReady) this.doAttack();
      else if (!p.atkCharged && p.atkHold >= 0.55 && run.mag < 15) this.floatAt(px(p.x, p.y), py(p.x, p.y) - 150, 'Sin Magia', '#8f9bff', 20, 30, 600);
      p.atkHold = 0;
      p.atkCharged = false;
    }
    p.atkWasHeld = atkHeld;
    run.chargeAtk = p.atkHold > 0.12 && run.mag >= 15 ? clamp((p.atkHold - 0.12) / 0.43, 0, 1) : 0;

    if (spcHeld && specialReady && !p.spcCharged) {
      p.spcHold += dt;
      if (p.spcHold >= 0.14 && p.spcHold - dt < 0.14) sfx.play('telegraph');
      if (p.spcHold >= 0.55) {
        if (run.mag >= 15) {
          this.doOmegaSpecial();
          p.spcCharged = true;
        }
      }
    }
    if (!spcHeld && p.spcWasHeld) {
      if (!p.spcCharged && p.spcHold > 0 && specialReady) {
        if (run.mag >= 8) this.doSpecial();
        else this.floatAt(px(p.x, p.y), py(p.x, p.y) - 150, 'Sin Magia', '#8f9bff', 20, 30, 600);
      } else if (!p.spcCharged && p.spcHold >= 0.55 && run.mag < 15) {
        this.floatAt(px(p.x, p.y), py(p.x, p.y) - 150, 'Sin Magia', '#8f9bff', 20, 30, 600);
      }
      p.spcHold = 0;
      p.spcCharged = false;
    }
    p.spcWasHeld = spcHeld;
    run.chargeSpc = p.spcHold > 0.12 && run.mag >= 15 ? clamp((p.spcHold - 0.12) / 0.43, 0, 1) : 0;
    if (ie.cast && p.cdCast <= 0 && !busy) {
      if (run.mag >= 20) this.doCast();
      else this.floatAt(px(p.x, p.y), py(p.x, p.y) - 150, 'Sin Magia', '#8f9bff', 20, 30, 600);
    }
    // Omega: mantener el conjuro
    if (inp.cast && p.castActive) {
      p.castHold += dt;
      run.chargeCast = clamp(p.castHold / 0.6, 0, 1);
      if (p.castHold >= 0.6 && this.ring && !this.ring.omega && run.mag >= 20) this.upgradeOmega();
    } else {
      p.castHold = 0;
      p.castActive = inp.cast && p.castActive;
      run.chargeCast = 0;
      if (!inp.cast) p.castActive = false;
    }

    // HUD de recargas
    run.cdAtk = p.atkLock > 0 ? p.atkLock / p.atkDur : 0;
    run.cdSpc = p.cdSpc / 0.5;
    run.cdCast = p.cdCast / 1.3;

    // recoger ofrenda
    if (this.orb) {
      this.orb.t += dt;
      if (Math.hypot(this.orb.x - p.x, this.orb.y - p.y) < 70) this.collectOrb();
    }
    // puertas
    if (this.doorsOpen && !this.transition) {
      for (const s of ['E', 'W'] as const) {
        const d = DOORS[s];
        if (Math.hypot(d.x - p.x, d.y - p.y) < 92) this.enterDoor(s);
      }
    }
  }

  private doAttack() {
    const p = this.pl;
    const step = p.combo;
    p.combo = (p.combo + 1) % 3;
    const dur = step === 2 ? 0.46 : 0.3;
    p.atkLock = dur;
    p.atkDur = dur;
    p.comboT = 0.65;
    p.atkStep = step;
    p.atkBlend = 1;
    p.swingDir = step === 1 ? -1 : 1;
    const a = { x: p.aimx, y: p.aimy };
    const lun = step === 2 ? 460 : 320;
    p.lx = a.x * lun;
    p.ly = a.y * lun;
    sfx.play(step === 2 ? 'atk3' : 'atk');
    this.slashFx(step, a);
    this.after(0.07, () => this.meleeHit(step, a));
  }

  private slashFx(step: number, a: { x: number; y: number }) {
    const p = this.pl;
    const sv = worldDirToScreen(a.x, a.y);
    const ang = Math.atan2(sv.y, sv.x);
    const sx = px(p.x, p.y) + Math.cos(ang) * 20,
      sy = py(p.x, p.y) - 58 + Math.sin(ang) * 10;
    const mk = (rot: number, sc: number, flip: boolean) => {
      const img = this.add
        .image(sx, sy, 'slash')
        .setOrigin(0.15, 0.5)
        .setRotation(rot)
        .setScale(0.5 * sc, 0.5 * sc * 0.82)
        .setFlipY(flip)
        .setTint(0xc4f3ff)
        .setBlendMode(ADD)
        .setDepth(py(p.x, p.y) + 60);
      this.tweens.add({ targets: img, alpha: { from: 1, to: 0 }, scaleX: 0.5 * sc * 1.22, duration: 220, ease: 'Cubic.out', onComplete: () => img.destroy() });
    };
    mk(ang, step === 2 ? 1.1 : 0.88, step === 1);
    if (step === 2) {
      mk(ang + Math.PI, 1.0, false);
      this.part(sx, py(p.x, p.y), { key: 'glow', tint: 0x7fe6ff, s0: 0.5, s1: 3.2, sy: 0.5, life: 0.35, a0: 0.55, depth: 2 });
    }
  }

  private meleeHit(step: number, a: { x: number; y: number }) {
    this.checkBreakPots(this.pl.x + a.x * 50, this.pl.y + a.y * 50, step === 2 ? 160 : 130);
    const p = this.pl;
    if (p.dead || run.mode !== 'play') return;
    const full = step === 2;
    const range = full ? 168 : 142;
    const cosA = full ? -2 : 0.4;
    const dmg = full ? 26 : 15;
    const kb = full ? 560 : 280;
    let hit = false;
    for (const e of this.enemies.slice()) {
      if (e.dead || e.state === 'spawn') continue;
      const dx = e.x - p.x,
        dy = e.y - p.y;
      const d = Math.hypot(dx, dy) || 1;
      if (d - e.r > range) continue;
      const nx = dx / d,
        ny = dy / d;
      if (!full && nx * a.x + ny * a.y < cosA) continue;
      this.hitEnemy(e, dmg, 'atk', nx, ny, kb);
      hit = true;
    }
    if (hit) {
      this.hitstop = Math.max(this.hitstop, full ? 0.09 : 0.04);
      this.shake(full ? 130 : 70, full ? 0.006 : 0.0025);
    }
  }

  private doOmegaAttack() {
    const p = this.pl;
    run.mag -= 15;
    p.atkLock = 0.5;
    p.atkDur = 0.5;
    p.atkStep = 2;
    p.atkBlend = 1;
    p.swingDir = 1;
    p.combo = 0;
    sfx.play('omega');
    this.hitstop = Math.max(this.hitstop, 0.06);
    this.shake(160, 0.007);
    const R = 175;
    this.ringFx(p.x, p.y, R, 0xd8e8ff, 0.45);
    this.ringFx(p.x, p.y, R * 0.6, 0xffffff, 0.3);
    this.part(px(p.x, p.y), py(p.x, p.y), { key: 'glow', tint: 0xbfd8ff, s0: 0.6, s1: (R * K * SQ2 * 2.2) / 128, sy: 0.5, life: 0.4, a0: 0.5, depth: 2 });
    this.burst(px(p.x, p.y), py(p.x, p.y) - 50, 20, 0xd8e8ff, 360, 0.5, 'spark', 0.6);
    this.checkBreakPots(p.x, p.y, R);
    let hit = false;
    for (const e of this.enemies.slice()) {
      if (e.dead || e.state === 'spawn') continue;
      const dx = e.x - p.x,
        dy = e.y - p.y;
      const d = Math.hypot(dx, dy) || 1;
      if (d - e.r < R) {
        this.hitEnemy(e, 38, 'atk', dx / d, dy / d, 520);
        hit = true;
      }
    }
    if (hit) this.hitstop = Math.max(this.hitstop, 0.1);
  }

  private doOmegaSpecial() {
    const p = this.pl;
    run.mag -= 15;
    p.cdSpc = 0.7;
    p.atkLock = Math.max(p.atkLock, 0.3);
    p.atkDur = 0.3;
    p.atkStep = 3;
    p.atkBlend = 1;
    const a = { x: p.aimx, y: p.aimy };
    p.lx -= a.x * 160;
    p.ly -= a.y * 160;
    sfx.play('omega');
    const sx = px(p.x, p.y),
      sy = py(p.x, p.y);
    const sv = worldDirToScreen(a.x, a.y);
    const ang = Math.atan2(sv.y, sv.x);
    const img = this.add
      .image(sx, sy - 56, 'bolt')
      .setOrigin(0.8, 0.5)
      .setScale(0.5 * 1.9)
      .setRotation(ang)
      .setTint(0xfff6d0)
      .setBlendMode(ADD)
      .setDepth(9000);
    this.bolts.push({ x: p.x + a.x * 30, y: p.y + a.y * 30, vx: a.x * 640, vy: a.y * 640, life: 1.3, dmg: 46 * (1 + run.mods.spcDmg), img, hit: new Set() });
    this.ringFx(p.x, p.y, 70, 0xffe9a8, 0.3);
    this.shake(90, 0.004);
  }

  private doSpecial() {
    const p = this.pl;
    run.mag -= 8;
    p.cdSpc = 0.5;
    p.atkLock = Math.max(p.atkLock, 0.22);
    p.atkDur = 0.22;
    p.atkStep = 3;
    p.atkBlend = 1;
    p.swingDir = 1;
    const a = { x: p.aimx, y: p.aimy };
    p.lx -= a.x * 90;
    p.ly -= a.y * 90;
    sfx.play('spc');
    this.after(0.1, () => {
      if (p.dead) return;
      const sx = px(p.x, p.y),
        sy = py(p.x, p.y);
      const sv = worldDirToScreen(a.x, a.y);
      const ang = Math.atan2(sv.y, sv.x);
      const img = this.add
        .image(sx, sy - 56, 'bolt')
        .setOrigin(0.8, 0.5)
        .setScale(0.5 * 1.05)
        .setRotation(ang)
        .setTint(0xfff0a8)
        .setBlendMode(ADD)
        .setDepth(9000);
      this.bolts.push({ x: p.x + a.x * 30, y: p.y + a.y * 30, vx: a.x * 840, vy: a.y * 840, life: 0.85, dmg: 26 * (1 + run.mods.spcDmg), img, hit: new Set() });
      this.burst(sx + Math.cos(ang) * 30, sy - 56, 8, 0xffe27a, 200, 0.3);
    });
  }

  private doCast() {
    const p = this.pl;
    run.mag -= 20;
    p.cdCast = 1.3;
    p.castT = 0.3;
    p.castActive = true;
    p.castHold = 0;
    const r = 125 * (1 + run.mods.ringR);
    this.ring = { x: p.x, y: p.y, r, t: 0, life: 4.5 + (run.mods.ringR > 0 ? 1 : 0), omega: false, pulse: 0.8 };
    sfx.play('cast');
    this.ringFx(p.x, p.y, r, 0x58ff9b, 0.5);
    this.burst(px(p.x, p.y), py(p.x, p.y), 18, 0x58ff9b, 240, 0.6, 'spark', 0.6);
    this.checkBreakPots(p.x, p.y, r);
    for (const e of this.enemies.slice()) {
      if (e.dead || e.state === 'spawn') continue;
      const dx = e.x - p.x,
        dy = e.y - p.y;
      const d = Math.hypot(dx, dy) || 1;
      if (d - e.r < r) this.hitEnemy(e, 14 + run.mods.castDmg, 'cast', dx / d, dy / d, 0);
    }
    this.shake(80, 0.003);
  }

  private upgradeOmega() {
    const rg = this.ring;
    if (!rg) return;
    run.mag -= 20;
    rg.omega = true;
    rg.r *= 1.35;
    rg.life = rg.t + 3;
    sfx.play('omega');
    this.ringFx(rg.x, rg.y, rg.r, 0xffe27a, 0.6);
    this.floatAt(px(rg.x, rg.y), py(rg.x, rg.y) - 120, 'Ω OMEGA', '#ffe27a', 28, 60, 1200);
  }

  private updateRing(dt: number) {
    const rg = this.ring;
    if (!rg) return;
    rg.t += dt;
    rg.pulse -= dt;
    for (const e of this.enemies) {
      if (e.dead || e.state === 'spawn') continue;
      if (Math.hypot(e.x - rg.x, e.y - rg.y) - e.r < rg.r) e.rooted = 0.2;
    }
    if (rg.pulse <= 0) {
      rg.pulse = rg.omega ? 0.5 : 0.8;
      this.ringFx(rg.x, rg.y, rg.r, rg.omega ? 0xffe27a : 0x58ff9b, 0.5);
      for (const e of this.enemies.slice()) {
        if (e.dead || e.state === 'spawn') continue;
        if (Math.hypot(e.x - rg.x, e.y - rg.y) - e.r < rg.r) this.hitEnemy(e, 4 + run.mods.castDmg, 'other', 0, 0, 0);
      }
    }
    if (rg.t >= rg.life) {
      if (rg.omega) {
        sfx.play('slam');
        this.shake(180, 0.009);
        this.hitstop = Math.max(this.hitstop, 0.1);
        this.ringFx(rg.x, rg.y, rg.r * 1.1, 0xffffff, 0.5);
        this.burst(px(rg.x, rg.y), py(rg.x, rg.y), 40, 0xffe27a, 420, 0.8, 'spark', 0.7);
        for (const e of this.enemies.slice()) {
          if (e.dead || e.state === 'spawn') continue;
          const dx = e.x - rg.x,
            dy = e.y - rg.y;
          const d = Math.hypot(dx, dy) || 1;
          if (d - e.r < rg.r) this.hitEnemy(e, 55 + run.mods.castDmg * 3, 'cast', dx / d, dy / d, 380);
        }
      }
      this.ring = null;
    }
  }

  private hurtPlayer(dmg: number, ox?: number, oy?: number) {
    const p = this.pl;
    if (p.invuln > 0 || p.dead || run.mode !== 'play') return;
    dmg = Math.round(dmg);
    run.hp -= dmg;
    run.stats.dmgTaken += dmg;
    p.invuln = 0.9;
    p.hurtT = 0.28;
    run.hurtFlash = 1;
    sfx.play('hurt');
    this.shake(160, 0.008);
    this.hitstop = Math.max(this.hitstop, 0.07);
    if (ox !== undefined && oy !== undefined) {
      const dx = p.x - ox,
        dy = p.y - oy;
      const d = Math.hypot(dx, dy) || 1;
      p.lx += (dx / d) * 360;
      p.ly += (dy / d) * 360;
    }
    const sx = px(p.x, p.y),
      sy = py(p.x, p.y);
    this.burst(sx, sy - 60, 14, 0xff4a5a, 280, 0.5);
    this.floatAt(sx, sy - 150, '-' + dmg, '#ff5c6a', 30, 60, 900);
    if (run.hp <= 0) this.die();
  }

  private die() {
    const p = this.pl;
    if (run.defiance > 0) {
      run.defiance--;
      run.hp = Math.round(run.maxHp * 0.5);
      p.invuln = 2.5;
      sfx.play('omega');
      bus.emit('banner', 'Desafío a la Muerte', 'El Inframundo aún no te reclama', '#ffe27a');
      this.ringFx(p.x, p.y, 420, 0xffe27a, 0.7);
      this.shake(300, 0.015);
      this.burst(px(p.x, p.y), py(p.x, p.y) - 60, 50, 0xffe27a, 500, 1);
      for (const e of this.enemies) {
        if (e.dead) continue;
        const dx = e.x - p.x,
          dy = e.y - p.y;
        const d = Math.hypot(dx, dy) || 1;
        e.kvx += (dx / d) * 900;
        e.kvy += (dy / d) * 900;
        if (e.kind !== 'boss') e.stun = Math.max(e.stun, 1.2);
      }
      return;
    }
    p.dead = true;
    run.hp = 0;
    run.mode = 'dead';
    this.slowT = 1.2;
    this.slowF = 0.25;
    sfx.play('lose');
    this.shake(400, 0.012);
    this.burst(px(p.x, p.y), py(p.x, p.y) - 60, 40, 0xff4a5a, 400, 1);
  }

  // ═══════════════════════════ ENEMIGOS ═══════════════════════════
  private updateEnemies(dt: number) {
    const p = this.pl;
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (e.dead) continue;
      if (dt <= 0) continue;
      this.updateEnemy(e, dt, p);
    }
    // separación entre enemigos
    for (let i = 0; i < this.enemies.length; i++) {
      const a = this.enemies[i];
      if (a.dead || a.state === 'spawn') continue;
      for (let j = i + 1; j < this.enemies.length; j++) {
        const b = this.enemies[j];
        if (b.dead || b.state === 'spawn') continue;
        const dx = b.x - a.x,
          dy = b.y - a.y;
        const d = Math.hypot(dx, dy) || 0.01;
        const m = (a.r + b.r) * 0.9;
        if (d < m) {
          const push = ((m - d) / 2) * 0.6;
          a.x -= (dx / d) * push;
          a.y -= (dy / d) * push;
          b.x += (dx / d) * push;
          b.y += (dy / d) * push;
        }
      }
    }
    // empujón suave jugador ↔ enemigo
    if (dt > 0) {
      for (const e of this.enemies) {
        if (e.dead || e.state === 'spawn') continue;
        const dx = e.x - p.x,
          dy = e.y - p.y;
        const d = Math.hypot(dx, dy) || 0.01;
        const m = e.r + PL_R - 4;
        if (d < m && e.state !== 'dash') {
          e.x += (dx / d) * (m - d);
          e.y += (dy / d) * (m - d);
        }
      }
    }
  }

  private updateEnemy(e: Enemy, dt: number, p: any) {
    const dx = p.x - e.x,
      dy = p.y - e.y;
    const dist = Math.hypot(dx, dy) || 1;
    const nx = dx / dist,
      ny = dy / dist;

    // estados alterados
    e.flash = Math.max(0, e.flash - dt);
    e.rooted = Math.max(0, e.rooted - dt);
    e.hintT = Math.max(0, e.hintT - dt);
    if (e.chill > 0) e.chill -= dt;
    if (e.weak > 0) e.weak -= dt;
    if (e.burn > 0) {
      e.burn -= dt;
      e.burnTick -= dt;
      if (e.burnTick <= 0) {
        e.burnTick = 0.5;
        this.hitEnemy(e, e.burnDps * 0.5, 'dot', 0, 0, 0);
        if (e.dead) return;
      }
    }
    // TTL del handshake
    if (e.hs > 0) {
      e.hsT -= dt;
      if (e.hsT <= 0) {
        e.hs = 0;
        this.floatAt(px(e.x, e.y), py(e.x, e.y) - e.top - 22, 'TTL=0', '#8aa', 16, 24, 600);
        sfx.play('rst');
      }
    }
    // empuje
    e.x += e.kvx * dt;
    e.y += e.kvy * dt;
    const dec = Math.exp(-8 * dt);
    e.kvx *= dec;
    e.kvy *= dec;

    let sp = 1;
    if (e.chill > 0) sp *= 1 - Math.min(0.65, e.chillSlow);
    if (e.rooted > 0) sp *= 0.12;

    if (e.state === 'spawn') {
      e.spawnT -= dt;
      if (e.spawnT <= 0) {
        e.state = e.kind === 'spear' || e.kind === 'archer' || e.kind === 'lamia' ? 'move' : e.kind === 'boss' ? 'idle' : 'chase';
        e.c.setAlpha(1);
        const sx = px(e.x, e.y),
          sy = py(e.x, e.y);
        this.burst(sx, sy - 30, 20, e.kind === 'boss' ? 0xff4fd8 : this.biome.magic, 300, 0.6);
        this.ringFx(e.x, e.y, e.r * 2.2, this.biome.magic, 0.4);
        if (e.kind === 'boss') run.boss = { name: e.variant === 'phantom' ? 'Fantasma del Lamento' : 'Capitán Náufrago', hp: e.hp, max: e.maxHp, armor: e.armor, maxArmor: e.maxArmor };
      } else {
        e.c.setAlpha(clamp(1 - e.spawnT / 0.6, 0, 1) * 0.0);
        return;
      }
    }

    if (e.stun > 0) {
      e.stun -= dt;
      e.state = e.stun > 0 ? 'stun' : e.kind === 'spear' || e.kind === 'archer' || e.kind === 'lamia' ? 'move' : e.kind === 'boss' ? 'idle' : 'chase';
      if (e.stun <= 0 && e.kind === 'boss') {
        e.armor = e.maxArmor * 0.55;
        e.bossT = 1;
        this.floatAt(px(e.x, e.y), py(e.x, e.y) - e.top - 20, 'FIREWALL ↑', '#59e6ff', 22, 30, 900);
      }
      this.collide(e, e.r);
      return;
    }

    switch (e.kind) {
      case 'shade':
      case 'wailer':
        this.aiShade(e, dt, nx, ny, dist, sp);
        break;
      case 'spear':
        this.aiSpear(e, dt, nx, ny, dist, sp);
        break;
      case 'archer':
      case 'lamia':
        this.aiArcher(e, dt, nx, ny, dist, sp);
        break;
      case 'urn':
        this.aiUrn(e, dt, nx, ny, dist, sp);
        break;
      case 'brute':
      case 'shellback':
        this.aiBrute(e, dt, nx, ny, dist, sp);
        break;
      case 'boss':
        this.aiBoss(e, dt, nx, ny, dist, sp);
        break;
    }
    this.collide(e, e.r);
    if (e.kind === 'boss' && run.boss) {
      run.boss.hp = e.hp;
      run.boss.armor = e.armor;
    }
  }

  private weakMul(e: Enemy) {
    return e.weak > 0 ? 1 - Math.min(0.6, e.weakMul) : 1;
  }

  private aiShade(e: Enemy, dt: number, nx: number, ny: number, dist: number, sp: number) {
    switch (e.state) {
      case 'chase':
        e.x += nx * e.speed * sp * dt;
        e.y += ny * e.speed * sp * dt;
        e.cd -= dt;
        if (dist < 190 && e.cd <= 0) {
          e.state = 'wind';
          e.t = 0.5;
          e.dirx = nx;
          e.diry = ny;
          sfx.play('telegraph');
        }
        break;
      case 'wind':
        e.t -= dt;
        if (e.t > 0.15) {
          e.dirx = nx;
          e.diry = ny;
        }
        if (e.t <= 0) {
          e.state = 'dash';
          e.t = 0.26;
          e.hitDone = false;
        }
        break;
      case 'dash':
        e.t -= dt;
        e.x += e.dirx * 600 * dt;
        e.y += e.diry * 600 * dt;
        if (!e.hitDone && dist < e.r + PL_R + 8) {
          e.hitDone = true;
          this.hurtPlayer(e.dmg * this.weakMul(e), e.x, e.y);
        }
        if (e.t <= 0) {
          e.state = 'recover';
          e.t = 0.65;
          e.cd = 1 + Math.random();
        }
        break;
      case 'recover':
        e.t -= dt;
        if (e.t <= 0) e.state = 'chase';
        break;
    }
  }

  private aiSpear(e: Enemy, dt: number, nx: number, ny: number, dist: number, sp: number) {
    switch (e.state) {
      case 'move': {
        let mx = 0,
          my = 0;
        if (dist < 290) {
          mx = -nx;
          my = -ny;
        } else if (dist > 450) {
          mx = nx;
          my = ny;
        } else {
          mx = -ny * e.strafe;
          my = nx * e.strafe;
        }
        e.x += mx * e.speed * sp * dt;
        e.y += my * e.speed * sp * dt;
        if (Math.random() < dt * 0.25) e.strafe *= -1;
        e.cd -= dt;
        if (e.cd <= 0 && dist < 760) {
          e.state = 'wind';
          e.t = 0.8;
          e.dirx = nx;
          e.diry = ny;
          sfx.play('telegraph');
        }
        break;
      }
      case 'wind':
        e.t -= dt;
        if (e.t > 0.28) {
          e.dirx = nx;
          e.diry = ny;
        }
        if (e.t <= 0) {
          this.throwSpear(e.x, e.y, e.dirx, e.diry, e.dmg * this.weakMul(e));
          e.state = 'recover';
          e.t = 0.55;
          e.cd = 1.9 + Math.random() * 1.4;
        }
        break;
      case 'recover':
        e.t -= dt;
        if (e.t <= 0) e.state = 'move';
        break;
    }
  }

  private throwSpear(x: number, y: number, dx: number, dy: number, dmg: number, speed = 580, tex = 'spear_wpn') {
    const sv = worldDirToScreen(dx, dy);
    const ang = Math.atan2(sv.y, sv.x);
    const img = this.add
      .image(px(x, y), py(x, y) - 52, tex)
      .setOrigin(0.8, 0.5)
      .setScale(0.5 * 0.9)
      .setRotation(ang)
      .setDepth(9000);
    this.eproj.push({ x, y, vx: dx * speed, vy: dy * speed, life: 1.6, dmg, img, hit: new Set() });
    sfx.play('throw');
  }

  private aiArcher(e: Enemy, dt: number, nx: number, ny: number, dist: number, sp: number) {
    switch (e.state) {
      case 'move': {
        let mx = 0,
          my = 0;
        if (dist < 340) {
          mx = -nx;
          my = -ny;
        } else if (dist > 520) {
          mx = nx;
          my = ny;
        } else {
          mx = -ny * e.strafe;
          my = nx * e.strafe;
        }
        e.x += mx * e.speed * sp * dt;
        e.y += my * e.speed * sp * dt;
        if (Math.random() < dt * 0.3) e.strafe *= -1;
        e.cd -= dt;
        if (e.cd <= 0 && dist < 820) {
          e.state = 'wind';
          e.t = 0.9;
          e.dirx = nx;
          e.diry = ny;
          sfx.play('telegraph');
        }
        break;
      }
      case 'wind':
        e.t -= dt;
        if (e.t > 0.3) {
          e.dirx = nx;
          e.diry = ny;
        }
        if (e.t <= 0) {
          for (const off of [-0.2, 0, 0.2]) {
            const a = Math.atan2(e.diry, e.dirx) + off;
            this.throwSpear(e.x, e.y, Math.cos(a), Math.sin(a), e.dmg * this.weakMul(e), 540, 'arrow');
          }
          e.state = 'recover';
          e.t = 0.6;
          e.cd = 2.2 + Math.random() * 1.2;
        }
        break;
      case 'recover':
        e.t -= dt;
        if (e.t <= 0) e.state = 'move';
        break;
    }
  }

  private aiUrn(e: Enemy, dt: number, nx: number, ny: number, dist: number, sp: number) {
    switch (e.state) {
      case 'chase':
        e.x += nx * e.speed * sp * dt;
        e.y += ny * e.speed * sp * dt;
        if (dist < 78) {
          e.state = 'fuse';
          e.t = 0.75;
          sfx.play('telegraph');
        }
        break;
      case 'fuse':
        e.t -= dt;
        if (e.t <= 0) this.urnExplode(e);
        break;
    }
  }

  private urnExplode(e: Enemy) {
    if (e.dead) return;
    const p = this.pl;
    const R = 112;
    sfx.play('slam');
    this.shake(140, 0.006);
    const sx = px(e.x, e.y),
      sy = py(e.x, e.y);
    this.ringFx(e.x, e.y, R, 0xbfeee4, 0.4);
    this.burst(sx, sy - 30, 26, 0xbfeee4, 360, 0.6);
    this.part(sx, sy, { key: 'glow', tint: 0xbfeee4, s0: 0.5, s1: (R * K * SQ2 * 2.2) / 128, sy: 0.5, life: 0.35, a0: 0.55, depth: 2 });
    if (Math.hypot(p.x - e.x, p.y - e.y) < R + PL_R - 6) this.hurtPlayer(e.dmg * this.weakMul(e), e.x, e.y);
    for (const o of this.enemies.slice()) {
      if (o === e || o.dead || o.state === 'spawn') continue;
      const d = Math.hypot(o.x - e.x, o.y - e.y);
      if (d - o.r < R) this.hitEnemy(o, 30, 'other', (o.x - e.x) / (d || 1), (o.y - e.y) / (d || 1), 260);
    }
    e.hp = 0;
    this.killEnemy(e);
  }

  private aiBrute(e: Enemy, dt: number, nx: number, ny: number, dist: number, sp: number) {
    switch (e.state) {
      case 'chase':
        e.x += nx * e.speed * sp * dt;
        e.y += ny * e.speed * sp * dt;
        e.raise = lerp(e.raise, 0, 0.15);
        e.cd -= dt;
        if (dist < 215 && e.cd <= 0) {
          e.state = 'wind';
          e.t = 1;
          e.tx = this.pl.x;
          e.ty = this.pl.y;
          sfx.play('telegraph');
        }
        break;
      case 'wind':
        e.t -= dt;
        e.raise = 1 - e.t;
        if (e.t > 0.4) {
          e.tx = lerp(e.tx, this.pl.x, 0.08);
          e.ty = lerp(e.ty, this.pl.y, 0.08);
        }
        if (e.t <= 0) {
          this.slam(e.tx, e.ty, 125, e.dmg * this.weakMul(e), e);
          e.state = 'recover';
          e.t = 0.95;
          e.cd = 1.1 + Math.random() * 0.8;
          e.raise = -0.6;
        }
        break;
      case 'recover':
        e.t -= dt;
        e.raise = lerp(e.raise, 0, 0.08);
        if (e.t <= 0) e.state = 'chase';
        break;
    }
  }

  private slam(x: number, y: number, r: number, dmg: number, src?: Enemy) {
    const p = this.pl;
    sfx.play('slam');
    this.shake(170, 0.008);
    this.ringFx(x, y, r * 1.15, 0xff4fd8, 0.45);
    const sx = px(x, y),
      sy = py(x, y);
    this.burst(sx, sy - 10, 22, 0xff8cf0, 380, 0.55);
    this.part(sx, sy, { key: 'glow', tint: 0xff4fd8, s0: 0.6, s1: (r * K * SQ2 * 2.2) / 128, sy: 0.5, life: 0.35, a0: 0.6, depth: 2 });
    if (Math.hypot(p.x - x, p.y - y) < r + PL_R - 4) this.hurtPlayer(dmg, x, y);
    void src;
  }

  // ── JEFE: Capitán Náufrago ──
  private aiBoss(e: Enemy, dt: number, nx: number, ny: number, dist: number, sp: number) {
    e.raise = lerp(e.raise, e.state === 'pattern' ? e.raise : 0, 0.1);
    if (e.state === 'idle') {
      if (dist > 220) {
        e.x += nx * e.speed * sp * dt;
        e.y += ny * e.speed * sp * dt;
      }
      e.bossT -= dt;
      if (e.bossT <= 0) {
        if (e.variant === 'phantom' && Math.random() < 0.6) this.phantomBlink(e);
        this.bossPattern(e);
      }
    }
  }

  private phantomBlink(e: Enemy) {
    const p = this.pl;
    const sx = px(e.x, e.y),
      sy = py(e.x, e.y);
    this.burst(sx, sy - 80, 18, 0xc9c4d8, 240, 0.5);
    for (let tries = 0; tries < 12; tries++) {
      const a = Math.random() * TAU;
      const x = p.x + Math.cos(a) * 230,
        y = p.y + Math.sin(a) * 230;
      if (x > 120 && x < 880 && y > 120 && y < 880 && this.obst.every((o) => Math.hypot(x - o.x, y - o.y) > o.r + e.r + 10)) {
        e.x = x;
        e.y = y;
        break;
      }
    }
    this.ringFx(e.x, e.y, 90, 0xc9c4d8, 0.4);
    this.burst(px(e.x, e.y), py(e.x, e.y) - 80, 18, 0xc9c4d8, 240, 0.5);
    sfx.play('blink');
  }

  private bossPattern(e: Enemy) {
    const hpFrac = e.hp / e.maxHp;
    let pat = (e.bossPat + 1 + Math.floor(Math.random() * 2)) % 3;
    if (hpFrac < 0.65 && e.summoned < 2 && this.aliveCount() < 4 && Math.random() < 0.7) pat = 3;
    e.bossPat = pat;
    e.state = 'pattern';
    const done = (t: number) => this.after(t, () => {
      if (e.dead) return;
      if (e.state === 'pattern') {
        e.state = 'idle';
        e.bossT = hpFrac < 0.4 ? 0.9 : 1.5;
        e.raise = 0;
      }
    });
    const alive = () => !e.dead && e.state === 'pattern';
    if (pat === 0) {
      // Ancla: tres impactos sucesivos sobre el jugador
      const n = hpFrac < 0.4 ? 4 : 3;
      for (let i = 0; i < n; i++) {
        this.after(i * 0.85, () => {
          if (!alive()) return;
          e.raise = 1;
          sfx.play('telegraph');
          const p = this.pl;
          const tx = clamp(p.x + p.lx * 0.1, 80, 920),
            ty = clamp(p.y + p.ly * 0.1, 80, 920);
          this.addTele({
            type: 'circle',
            x: tx,
            y: ty,
            x2: 0,
            y2: 0,
            r: 130,
            w: 0,
            t: 0,
            dur: 0.78,
            color: 0xff4fd8,
            owner: e,
            track: (t) => {
              t.x = lerp(t.x, this.pl.x, 0.06);
              t.y = lerp(t.y, this.pl.y, 0.06);
            },
            fire: (t) => {
              e.raise = -0.6;
              this.slam(t.x, t.y, t.r, e.dmg * this.weakMul(e), e);
            },
          });
        });
      }
      done(n * 0.85 + 0.9);
    } else if (pat === 1) {
      // Lluvia de lanzas radial (2 oleadas desfasadas)
      const volley = (off: number, delay: number) => {
        const N = 14;
        for (let i = 0; i < N; i++) {
          const a = off + (i / N) * TAU;
          this.after(delay, () => {
            if (!alive()) return;
            this.addTele({
              type: 'line',
              x: e.x,
              y: e.y,
              x2: e.x + Math.cos(a) * 760,
              y2: e.y + Math.sin(a) * 760,
              r: 0,
              w: 26,
              t: 0,
              dur: 0.95,
              color: 0xff4fd8,
              owner: e,
              fire: () => this.throwSpear(e.x, e.y, Math.cos(a), Math.sin(a), e.dmg * 0.55 * this.weakMul(e), e.variant === 'phantom' ? 440 : 520, e.variant === 'phantom' ? 'arrow' : 'spear_wpn'),
            });
          });
        }
        this.after(delay, () => {
          if (alive()) {
            e.raise = 1;
            sfx.play('telegraph');
          }
        });
      };
      volley(0, 0);
      volley(TAU / 28, 1.35);
      done(3.4);
    } else if (pat === 2) {
      // Marea: anillos expansivos que hay que esquivar con Blink
      const n = hpFrac < 0.4 ? 4 : 3;
      for (let i = 0; i < n; i++) {
        this.after(0.5 + i * 1.0, () => {
          if (!alive()) return;
          e.raise = 1;
          this.after(0.18, () => (e.raise = -0.6));
          sfx.play('slam');
          this.shake(120, 0.005);
          this.waves.push({ x: e.x, y: e.y, r: 20, t: 0, hit: false });
        });
      }
      done(n * 1.0 + 1.6);
    } else {
      // invoca sombras
      e.summoned++;
      sfx.play('boss');
      bus.emit('banner', '¡Refuerzos!', 'Paquetes sombra entrantes', '#ff4fd8');
      for (let i = 0; i < 3; i++) {
        const a = Math.random() * TAU;
        const kind: Kind = e.variant === 'phantom' && i < 2 ? 'urn' : 'shade';
        this.spawnEnemy(kind, clamp(e.x + Math.cos(a) * 200, 100, 900), clamp(e.y + Math.sin(a) * 200, 100, 900), 0.8);
      }
      done(1.6);
    }
  }

  private addTele(t: Tele) {
    this.tele.push(t);
  }

  private updateTele(dt: number) {
    for (let i = this.tele.length - 1; i >= 0; i--) {
      const t = this.tele[i];
      if (t.owner && (t.owner.dead || t.owner.stun > 0)) {
        this.tele.splice(i, 1);
        continue;
      }
      t.t += dt;
      if (t.track && t.t < t.dur * 0.55) t.track(t);
      if (t.t >= t.dur) {
        this.tele.splice(i, 1);
        t.fire(t);
      }
    }
  }

  private updateWaves(dt: number) {
    const p = this.pl;
    for (let i = this.waves.length - 1; i >= 0; i--) {
      const w = this.waves[i];
      w.t += dt;
      w.r += 340 * dt;
      const d = Math.hypot(p.x - w.x, p.y - w.y);
      if (!w.hit && Math.abs(d - w.r) < 26) {
        const boss = this.enemies.find((e) => e.kind === 'boss');
        if (p.invuln <= 0) {
          w.hit = true;
          this.hurtPlayer((boss?.dmg ?? 30) * 0.8, w.x, w.y);
        }
      }
      if (w.r > 1000) this.waves.splice(i, 1);
    }
  }

  private updateHazards(dt: number) {
    const p = this.pl;
    p.slowed = false;
    for (const h of this.hazards) {
      h.t += dt;
      if (h.type === 'vent') {
        const P = 4.4;
        const ph = h.t % P;
        if (ph < 3.4) h.fired = false;
        else if (ph >= 4.0 && !h.fired) {
          h.fired = true;
          sfx.play('throw');
          const sx = px(h.x, h.y),
            sy = py(h.x, h.y);
          for (let i = 0; i < 16; i++) this.part(sx + rnd(-20, 20), sy - 10, { key: 'glow', tint: 0xcfe6e2, vx: rnd(-40, 40), vy: rnd(-260, -120), ay: 60, life: rnd(0.5, 0.9), s0: 0.5, s1: 1.4, a0: 0.5, add: false, depth: sy + 40 });
          if (Math.hypot(p.x - h.x, p.y - h.y) < h.r + PL_R - 6) this.hurtPlayer(12, h.x, h.y);
          for (const e of this.enemies.slice()) {
            if (e.dead || e.state === 'spawn') continue;
            if (Math.hypot(e.x - h.x, e.y - h.y) - e.r < h.r) this.hitEnemy(e, 14, 'other', 0, 0, 0);
          }
        }
      } else {
        h.x += h.vx * dt;
        h.y += h.vy * dt;
        if (h.x < 150 || h.x > 850) h.vx *= -1;
        if (h.y < 150 || h.y > 850) h.vy *= -1;
        h.x = clamp(h.x, 150, 850);
        h.y = clamp(h.y, 150, 850);
        if (Math.hypot(p.x - h.x, p.y - h.y) < h.r) {
          p.slowed = true;
          run.mag = Math.max(0, run.mag - 3 * dt);
        }
        if (Math.random() < 0.12) this.part(px(h.x, h.y) + rnd(-h.r, h.r) * K, py(h.x, h.y) + rnd(-h.r, h.r) * K * 0.5, { key: 'glow', tint: 0x8a7a9a, vy: -18, life: 1.6, s0: 0.5, s1: 1.1, a0: 0.22, add: false, depth: 3 });
      }
    }
  }

  private updateStrikes(dt: number) {
    for (let i = this.strikes.length - 1; i >= 0; i--) {
      const s = this.strikes[i];
      s.t -= dt;
      if (s.t <= 0) {
        this.strikes.splice(i, 1);
        const sx = px(s.x, s.y),
          sy = py(s.x, s.y);
        sfx.play('zeus');
        const img = this.add.image(sx, sy, 'glow').setOrigin(0.5, 1).setTint(0xfff27a).setBlendMode(ADD).setScale(0.7, 9).setDepth(9100);
        this.tweens.add({ targets: img, alpha: { from: 1, to: 0 }, scaleX: 1.4, duration: 260, onComplete: () => img.destroy() });
        const core = this.add.image(sx, sy, 'glow').setOrigin(0.5, 1).setTint(0xffffff).setBlendMode(ADD).setScale(0.22, 9).setDepth(9101);
        this.tweens.add({ targets: core, alpha: { from: 1, to: 0 }, duration: 180, onComplete: () => core.destroy() });
        this.burst(sx, sy, 12, 0xfff27a, 300, 0.4);
        this.ringFx(s.x, s.y, 80, 0xfff27a, 0.3);
        for (const e of this.enemies.slice()) {
          if (e.dead || e.state === 'spawn') continue;
          if (Math.hypot(e.x - s.x, e.y - s.y) - e.r < 85) this.hitEnemy(e, s.dmg, 'other', 0, 0, 0);
        }
      }
    }
  }

  private updateProjectiles(dt: number) {
    const p = this.pl;
    // proyectiles lunares (Especial = SYN-ACK)
    for (let i = this.bolts.length - 1; i >= 0; i--) {
      const b = this.bolts[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      const sx = px(b.x, b.y),
        sy = py(b.x, b.y) - 56;
      b.img.setPosition(sx, sy).setDepth(py(b.x, b.y) + 40);
      this.part(sx, sy, { key: 'glow', tint: 0xffe27a, s0: 0.5, s1: 0.05, life: 0.3, a0: 0.5 });
      let kill = b.life <= 0 || b.x < 20 || b.x > WORLD - 20 || b.y < 20 || b.y > WORLD - 20;
      for (const ob of this.obst) if (Math.hypot(b.x - ob.x, b.y - ob.y) < ob.r + 6) kill = true;
      this.checkBreakPots(b.x, b.y, 22);
      for (const e of this.enemies.slice()) {
        if (e.dead || e.state === 'spawn' || b.hit.has(e.id)) continue;
        if (Math.hypot(e.x - b.x, e.y - b.y) < e.r + 16) {
          b.hit.add(e.id);
          const d = Math.hypot(b.vx, b.vy) || 1;
          this.hitEnemy(e, b.dmg, 'spc', b.vx / d, b.vy / d, 160);
          this.hitstop = Math.max(this.hitstop, 0.03);
        }
      }
      if (kill) {
        this.burst(sx, sy, 8, 0xffe27a, 220, 0.3);
        b.img.destroy();
        this.bolts.splice(i, 1);
      }
    }
    // lanzas enemigas
    for (let i = this.eproj.length - 1; i >= 0; i--) {
      const b = this.eproj[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      const sx = px(b.x, b.y),
        sy = py(b.x, b.y) - 52;
      b.img.setPosition(sx, sy).setDepth(py(b.x, b.y) + 40);
      if (Math.random() < 0.6) this.part(sx, sy, { key: 'glow', tint: 0xff4fd8, s0: 0.35, s1: 0.05, life: 0.25, a0: 0.5 });
      let kill = b.life <= 0 || b.x < 10 || b.x > WORLD - 10 || b.y < 10 || b.y > WORLD - 10;
      for (const ob of this.obst) if (Math.hypot(b.x - ob.x, b.y - ob.y) < ob.r + 8) kill = true;
      if (!kill && Math.hypot(p.x - b.x, p.y - b.y) < PL_R + 10) {
        if (p.invuln <= 0) {
          this.hurtPlayer(b.dmg, b.x - b.vx, b.y - b.vy);
          kill = true;
        }
      }
      if (kill) {
        this.burst(sx, sy, 7, 0xff8cf0, 220, 0.3);
        b.img.destroy();
        this.eproj.splice(i, 1);
      }
    }
  }

  private updateRoom(dt: number) {
    if (this.cleared || this.transition) return;
    const cfg = ROOMS[this.roomIdx];
    if (this.waveIdx < cfg.waves.length) {
      if (!this.waveActive) {
        this.waveDelay -= dt;
        if (this.waveDelay <= 0) {
          this.spawnWave(this.waveIdx);
          this.waveActive = true;
        }
      } else if (this.aliveCount() === 0) {
        this.waveActive = false;
        this.waveIdx++;
        this.waveDelay = 1.2;
      }
    } else {
      this.roomCleared();
    }
  }

  // ═══════════════════════════ HANDSHAKE / DAÑO ═══════════════════════════
  private hitEnemy(e: Enemy, base: number, kind: 'atk' | 'spc' | 'cast' | 'other' | 'dot', dirx: number, diry: number, kb: number) {
    if (e.dead || e.state === 'spawn') return;
    const m = run.mods;
    let dmg = base * (1 + m.dmg);
    if (kind === 'spc') dmg *= 1 + m.spcDmg * 0; // el bonus ya viene en el proyectil
    if (e.chill > 0 && m.chill > 0) dmg *= 1.1;
    const crit = kind !== 'dot' && Math.random() < m.crit;
    if (crit) dmg *= 2;
    const sx = px(e.x, e.y),
      sy = py(e.x, e.y);
    const top = e.top;
    let established = false;
    const ttl = 4 + m.ttl;
    const hint = (txt: string, col: string) => {
      if (e.hintT <= 0) {
        e.hintT = 1.1;
        this.floatAt(sx, sy - top - 26, txt, col, 16, 22, 700);
      }
    };

    // ── regla de Telemática: 3-way handshake ──
    const barkOnce = (key: string) => {
      if (this.barked.has(key)) return;
      this.barked.add(key);
      bus.emit('barkKey', key);
    };
    if (kind === 'atk') {
      if (e.hs === 0) {
        e.hs = 1;
        e.hsT = ttl;
        this.hsFx(e, 'syn');
        if (run.tutorialStep === 0) run.tutorialStep = 1;
        barkOnce('firstSyn');
      } else if (e.hs === 1) e.hsT = ttl;
    } else if (kind === 'spc') {
      if (e.hs === 1) {
        e.hs = 2;
        e.hsT = ttl;
        this.hsFx(e, 'synack');
        if (run.tutorialStep === 1) run.tutorialStep = 2;
        barkOnce('firstSynAck');
      } else if (e.hs === 0) hint('SYN primero', HEX.syn);
      else e.hsT = ttl;
    } else if (kind === 'cast') {
      if (e.hs === 2) {
        established = true;
        if (run.tutorialStep === 2) run.tutorialStep = 3;
      }
      else if (e.hs === 1) {
        e.hs = 0;
        run.stats.rst++;
        sfx.play('rst');
        this.floatAt(sx, sy - top - 26, 'RST', '#ff5c6a', 20, 26, 700);
        barkOnce('firstRst');
      } else hint('¡SYN y SYN-ACK antes!', '#ffb0b8');
    }

    // knockback
    if (kb > 0 && e.kind !== 'boss') {
      const f = (kb * (1 + m.kb)) / (e.kind === 'brute' ? 2.4 : 1);
      e.kvx += dirx * f;
      e.kvy += diry * f;
    }

    // daño / Firewall (armadura)
    let hpDmg = dmg;
    let armorHit = false;
    if (established) {
      e.armor = 0;
      hpDmg = dmg * 3 + (e.kind === 'boss' ? 70 : 42);
    } else if (e.armor > 0) {
      e.armor = Math.max(0, e.armor - dmg * (1 + m.armorShred));
      hpDmg = dmg * 0.1;
      armorHit = true;
    }
    const wasArmored = e.maxArmor > 0 && e.armor <= 0 && armorHit;
    e.hp -= hpDmg;
    e.flash = 0.1;
    run.stats.hits++;

    // efectos de estado de las bendiciones
    if (kind === 'atk' || kind === 'spc') {
      if (m.chill > 0) {
        e.chill = 3;
        e.chillSlow = Math.min(0.65, m.chill);
      }
      if (m.weak > 0) {
        e.weak = 5;
        e.weakMul = m.weak;
      }
      if (m.burn > 0) {
        e.burn = 3;
        e.burnDps = m.burn;
        e.burnTick = Math.min(e.burnTick, 0.5);
      }
      if (m.lightning > 0 && Math.random() < 0.55) {
        this.strikes.push({ x: e.x, y: e.y, t: 0.38, dmg: m.lightning });
        this.ringFx(e.x, e.y, 50, 0xfff27a, 0.38);
      }
    }

    // números flotantes y chispas
    const col = armorHit ? '#59e6ff' : crit ? '#fff27a' : kind === 'spc' ? '#ffe27a' : kind === 'cast' ? '#58ff9b' : kind === 'dot' ? '#ff9a4a' : '#ffffff';
    const shown = Math.round(armorHit ? dmg : hpDmg);
    this.floatAt(sx + rnd(-14, 14), sy - top * 0.7, (crit ? '★' : '') + shown, col, crit ? 30 : kind === 'atk' ? 22 : 20, 46, 650);
    if (kind !== 'dot') {
      this.burst(sx, sy - top * 0.5, armorHit ? 8 : 6, armorHit ? 0x59e6ff : kind === 'spc' ? 0xffe27a : 0xffffff, 260, 0.3, 'spark', 0.45);
      sfx.play(armorHit ? 'hitArmor' : 'hit');
    }

    if (wasArmored) this.armorBreak(e);
    if (established) this.doEstablished(e, dirx, diry);
    if (e.hp <= 0) this.killEnemy(e);
  }

  private hsFx(e: Enemy, step: 'syn' | 'synack') {
    const sx = px(e.x, e.y),
      sy = py(e.x, e.y);
    const col = step === 'syn' ? 0x4fc3ff : 0xffd24a;
    const txt = step === 'syn' ? 'SYN' : 'SYN-ACK';
    this.floatAt(sx, sy - e.top - 28, txt, step === 'syn' ? HEX.syn : HEX.synack, 22, 28, 900);
    this.ringFx(e.x, e.y, e.r * 2.4, col, 0.4);
    this.bits(sx, sy - e.top * 0.5, 5, 180);
    sfx.play(step);
  }

  private armorBreak(e: Enemy) {
    const sx = px(e.x, e.y),
      sy = py(e.x, e.y);
    this.floatAt(sx, sy - e.top - 30, 'FIREWALL ROTO', '#59e6ff', 22, 36, 1000);
    this.burst(sx, sy - e.top * 0.5, 22, 0x59e6ff, 380, 0.6);
    this.ringFx(e.x, e.y, e.r * 3, 0x59e6ff, 0.4);
    sfx.play('hitArmor');
    e.stun = e.kind === 'boss' ? 2.6 : 0.9;
    e.state = 'stun';
    e.raise = 0;
    this.shake(120, 0.005);
  }

  private doEstablished(e: Enemy, dirx: number, diry: number) {
    const p = this.pl;
    const sx = px(e.x, e.y),
      sy = py(e.x, e.y);
    e.hs = 0;
    e.hsT = 0;
    run.stats.established++;
    run.lastEstablished = this.t;
    if (!this.barked.has('firstEstablished')) {
      this.barked.add('firstEstablished');
      bus.emit('barkKey', 'firstEstablished');
    }
    sfx.play('est');
    this.hitstop = Math.max(this.hitstop, 0.14);
    this.shake(260, 0.011);
    this.floatAt(sx, sy - e.top - 40, '¡ESTABLISHED!', HEX.ack, 34, 80, 1300);
    this.ringFx(e.x, e.y, 170, 0x58ff9b, 0.55);
    this.ringFx(e.x, e.y, 110, 0xffffff, 0.4);
    this.bits(sx, sy - e.top * 0.4, 26, 420);
    this.burst(sx, sy - e.top * 0.4, 26, 0x58ff9b, 420, 0.7, 'spark', 0.8);
    this.part(sx, sy, { key: 'glow', tint: 0x58ff9b, s0: 0.5, s1: 4, sy: 0.55, life: 0.5, a0: 0.7, depth: 2 });
    run.hp = Math.min(run.maxHp, run.hp + 4);
    run.mag = Math.min(run.maxMag, run.mag + 14);
    if (e.kind !== 'boss') {
      e.kvx += dirx * 200;
      e.kvy += diry * 200;
    }
    // explosión en cadena
    for (const o of this.enemies.slice()) {
      if (o === e || o.dead || o.state === 'spawn') continue;
      const d = Math.hypot(o.x - e.x, o.y - e.y);
      if (d - o.r < 170) {
        const ox = px(o.x, o.y),
          oy = py(o.x, o.y);
        this.drawLink(sx, sy - e.top * 0.4, ox, oy - o.top * 0.4);
        this.hitEnemy(o, 30, 'other', (o.x - e.x) / (d || 1), (o.y - e.y) / (d || 1), 300);
      }
    }
    void p;
  }

  private drawLink(x0: number, y0: number, x1: number, y1: number) {
    const n = 10;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      this.part(lerp(x0, x1, t) + rnd(-6, 6), lerp(y0, y1, t) + rnd(-6, 6), {
        key: Math.random() < 0.5 ? 'bit0' : 'bit1',
        tint: 0x7dffe0,
        s0: 0.5,
        s1: 0.2,
        life: 0.5,
        depth: 9000,
      });
    }
  }

  private killEnemy(e: Enemy) {
    if (e.dead) return;
    if (e.kind === 'urn' && e.state !== 'fuse' && e.hp > -9000) {
      // la urna estalla al romperse (con un breve aviso)
      e.state = 'fuse';
      e.t = 0.3;
      e.hp = 1;
      return;
    }
    e.dead = true;
    run.stats.kills++;
    const sx = px(e.x, e.y),
      sy = py(e.x, e.y);
    sfx.play('die');
    const big = e.kind === 'boss' || e.kind === 'brute' || e.kind === 'shellback';
    this.burst(sx, sy - e.top * 0.5, big ? 36 : 18, e.kind === 'brute' || e.kind === 'shellback' || e.kind === 'boss' ? 0x7dffb0 : 0x7dffe0, big ? 420 : 300, 0.8);
    this.bits(sx, sy - e.top * 0.5, big ? 14 : 6, 260);
    this.part(sx, sy, { key: 'glow', tint: 0x3dffa0, s0: 0.4, s1: big ? 3 : 1.6, sy: 0.5, life: 0.5, a0: 0.5, depth: 2 });
    this.tweens.add({
      targets: e.c,
      alpha: 0,
      scaleY: 0.2,
      scaleX: 1.3,
      duration: 220,
      onComplete: () => e.c.destroy(),
    });
    this.hitstop = Math.max(this.hitstop, big ? 0.12 : 0.05);
    if (e.kind === 'boss') {
      run.boss = null;
      this.slowT = 2.2;
      this.slowF = 0.2;
      this.shake(600, 0.015);
      this.tele = [];
      this.eproj.forEach((b) => b.img.destroy());
      this.eproj = [];
      this.waves = [];
      this.enemies.forEach((o) => {
        if (o !== e && !o.dead) {
          o.dead = true;
          o.c.destroy();
        }
      });
      if (e.variant === 'phantom') {
        this.after(2.2, () => {
          run.mode = 'won';
          sfx.play('win');
          this.cleared = true;
        });
      } else {
        bus.emit('banner', 'Guardián derrotado', 'Océano queda atrás', '#58ff9b');
        bus.emit('dialogue', 'captain_down');
      }
    }
  }

  // ═══════════════════════════ PARTÍCULAS ═══════════════════════════
  private updateParts(dt: number) {
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const q = this.parts[i];
      q.life -= dt;
      if (q.life <= 0) {
        q.img.setVisible(false).setActive(false);
        this.partPool.push(q.img);
        this.parts.splice(i, 1);
        continue;
      }
      const t = 1 - q.life / q.max;
      q.vx += q.ax * dt;
      q.vy += q.ay * dt;
      q.img.x += q.vx * dt;
      q.img.y += q.vy * dt;
      const s = lerp(q.s0, q.s1, t);
      q.img.setScale(s, s * q.sy);
      q.img.setAlpha(lerp(q.a0, q.a1, t));
      if (q.spin) q.img.rotation += q.spin * dt;
    }
    for (let i = this.fxRings.length - 1; i >= 0; i--) {
      this.fxRings[i].t += dt;
      if (this.fxRings[i].t >= this.fxRings[i].dur) this.fxRings.splice(i, 1);
    }
  }

  // ═══════════════════════════ RENDER ═══════════════════════════
  private ellipse(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number, fill: number, fa: number, stroke: number, sa: number, lw = 2) {
    const sx = px(x, y),
      sy = py(x, y);
    const rx = r * K * SQ2;
    if (fa > 0) {
      g.fillStyle(fill, fa);
      g.fillEllipse(sx, sy, rx * 2, rx);
    }
    if (sa > 0) {
      g.lineStyle(lw, stroke, sa);
      g.strokeEllipse(sx, sy, rx * 2, rx);
    }
  }

  private polyW(g: Phaser.GameObjects.Graphics, pts: [number, number][], fill: number, fa: number, stroke: number, sa: number) {
    const sp = pts.map(([x, y]) => ({ x: px(x, y), y: py(x, y) }));
    if (fa > 0) {
      g.fillStyle(fill, fa);
      g.fillPoints(sp, true);
    }
    if (sa > 0) {
      g.lineStyle(2, stroke, sa);
      g.strokePoints(sp, true);
    }
  }

  private drawGround() {
    const g = this.gfx;
    g.clear();
    const T = this.t;
    // anillos expansivos (efectos)
    for (const r of this.fxRings) {
      const k = r.t / r.dur;
      const rad = r.r1 * (0.25 + 0.75 * (1 - Math.pow(1 - k, 3)));
      this.ellipse(g, r.x, r.y, rad, r.color, 0, r.color, (1 - k) * 0.9, 4 * (1 - k) + 1);
    }
    // círculos de aparición
    for (const e of this.enemies) {
      if (e.dead || e.state !== 'spawn') continue;
      const k = 1 - clamp(e.spawnT / 1.1, 0, 1);
      const col = e.kind === 'boss' ? 0xff4fd8 : this.biome.magic;
      this.ellipse(g, e.x, e.y, e.r * 2 + 10, col, 0.1 + 0.2 * k, col, 0.9, 3);
      this.ellipse(g, e.x, e.y, (e.r * 2 + 10) * k, col, 0.25, col, 0.5, 1.5);
      this.runeTicks(g, e.x, e.y, e.r * 2 + 10, T * 2, col, 0.8);
    }
    // círculo de Hécate (Cast = ACK): disco rúnico luminoso
    const rg = this.ring;
    if (rg) {
      const fade = clamp((rg.life - rg.t) / 0.6, 0, 1) * clamp(rg.t / 0.15, 0, 1);
      const col = rg.omega ? 0xffe27a : 0x4fe3a4;
      const core = rg.omega ? 0xfff6d8 : 0xb9ffe2;
      // disco interior tenue
      this.ellipse(g, rg.x, rg.y, rg.r * 0.98, col, 0.07 * fade, 0, 0, 0);
      this.ellipse(g, rg.x, rg.y, rg.r * 0.5, col, 0.08 * fade, 0, 0, 0);
      // borde principal grueso + halo interior
      this.ellipse(g, rg.x, rg.y, rg.r, col, 0, col, 0.95 * fade, 3.5);
      this.ellipse(g, rg.x, rg.y, rg.r * 0.965, core, 0, core, 0.4 * fade, 1.5);
      // anillo rúnico intermedio
      this.ellipse(g, rg.x, rg.y, rg.r * 0.8, col, 0, col, 0.55 * fade, 1.5);
      this.runeTicks(g, rg.x, rg.y, rg.r * 0.96, T * (rg.omega ? 1.8 : 0.9), core, 0.9 * fade);
      this.runeTicks(g, rg.x, rg.y, rg.r * 0.8, -T * 0.6, col, 0.55 * fade);
      // estrella de ocho puntas giratoria
      const pts: [number, number][] = [];
      for (let i = 0; i < 10; i++) {
        const a = T * 0.6 + (i / 10) * TAU;
        const rr = i % 2 ? rg.r * 0.3 : rg.r * 0.68;
        pts.push([rg.x + Math.cos(a) * rr, rg.y + Math.sin(a) * rr]);
      }
      this.polyW(g, pts, col, 0, core, 0.5 * fade);
      // núcleo pulsante
      const pulse = 0.25 + 0.12 * Math.sin(T * 5);
      this.ellipse(g, rg.x, rg.y, rg.r * 0.12, core, pulse * fade, 0, 0, 0);
      if (rg.omega) {
        const k = clamp(rg.t / rg.life, 0, 1);
        this.ellipse(g, rg.x, rg.y, rg.r * k, 0xffe27a, 0.16, 0xfff6d8, 0.8, 2);
      }
    }
    // carga Omega
    if (run.chargeCast > 0.02) {
      const p = this.pl;
      this.ellipse(g, p.x, p.y, 40 + 60 * run.chargeCast, 0xffe27a, 0.08, 0xffe27a, 0.8 * run.chargeCast, 3);
    }
    if (run.chargeAtk > 0.02) {
      const p = this.pl;
      this.ellipse(g, p.x, p.y, 175 * run.chargeAtk, 0xd8e8ff, 0.05, 0xd8e8ff, 0.7 * run.chargeAtk, 2);
    }
    if (run.chargeSpc > 0.02) {
      const p = this.pl;
      this.ellipse(g, p.x, p.y, 30 + 20 * run.chargeSpc, 0xffe9a8, 0.06, 0xffe9a8, 0.7 * run.chargeSpc, 2);
    }
    // peligros ambientales
    for (const h of this.hazards) {
      if (h.type === 'vent') {
        const ph = h.t % 4.4;
        // rejilla de hierro
        this.ellipse(g, h.x, h.y, h.r * 0.75, 0x0a0f12, 0.9, 0x3a4a4e, 0.9, 3);
        g.lineStyle(2, 0x3a4a4e, 0.9);
        for (let i = -2; i <= 2; i++) {
          const o = (i * h.r * 0.75) / 3;
          g.lineBetween(px(h.x - h.r * 0.7, h.y + o), py(h.x - h.r * 0.7, h.y + o), px(h.x + h.r * 0.7, h.y + o), py(h.x + h.r * 0.7, h.y + o));
        }
        if (ph >= 3.4) {
          const k = clamp((ph - 3.4) / 0.6, 0, 1);
          this.ellipse(g, h.x, h.y, h.r, 0xe0ecf0, 0.08 + 0.1 * k, 0xe0ecf0, 0.6 + 0.3 * k, 2);
          this.ellipse(g, h.x, h.y, h.r * k, 0xffffff, 0.15, 0xffffff, 0.4, 1);
        }
      } else {
        const pulse = 1 + 0.05 * Math.sin(T * 2 + h.x);
        this.ellipse(g, h.x, h.y, h.r * pulse, 0x6a5a7a, 0.22, 0x8a7a9a, 0.35, 2);
        this.ellipse(g, h.x, h.y, h.r * 0.6 * pulse, 0x6a5a7a, 0.18, 0x8a7a9a, 0, 0);
      }
    }
    // marea del jefe
    for (const w of this.waves) {
      const a = clamp(1 - w.r / 1000, 0, 1);
      this.ellipse(g, w.x, w.y, w.r, 0xff4fd8, 0.0, 0xff4fd8, 0.9 * a, 6);
      this.ellipse(g, w.x, w.y, w.r - 10, 0xff4fd8, 0, 0xffffff, 0.5 * a, 2);
    }
    // telegrafos de enemigos normales
    for (const e of this.enemies) {
      if (e.dead) continue;
      if ((e.kind === 'shade' || e.kind === 'wailer') && e.state === 'wind') {
        const k = 1 - e.t / 0.5;
        this.lineTele(g, e.x, e.y, e.x + e.dirx * 230, e.y + e.diry * 230, e.kind === 'wailer' ? 44 : 34, k);
      } else if ((e.kind === 'spear' || e.kind === 'archer' || e.kind === 'lamia') && e.state === 'wind') {
        const k = 1 - e.t / (e.kind === 'spear' ? 0.8 : 0.9);
        this.lineTele(g, e.x, e.y, e.x + e.dirx * 800, e.y + e.diry * 800, 22, k);
      } else if ((e.kind === 'brute' || e.kind === 'shellback') && e.state === 'wind') {
        const k = 1 - e.t;
        this.ellipse(g, e.tx, e.ty, 125, 0xff4fd8, 0.1, 0xff4fd8, 0.85, 3);
        this.ellipse(g, e.tx, e.ty, 125 * k, 0xff4fd8, 0.3, 0xff8cf0, 0.5, 1);
      }
    }
    // telegrafos del jefe
    for (const t of this.tele) {
      const k = clamp(t.t / t.dur, 0, 1);
      if (t.type === 'circle') {
        this.ellipse(g, t.x, t.y, t.r, t.color, 0.1, t.color, 0.85, 3);
        this.ellipse(g, t.x, t.y, t.r * k, t.color, 0.3, 0xff8cf0, 0.5, 1);
        this.runeTicks(g, t.x, t.y, t.r * 0.92, T * 3, t.color, 0.7);
      } else this.lineTele(g, t.x, t.y, t.x2, t.y2, t.w, k);
    }
    // sombra del orbe / ofrenda
    if (this.orb) {
      const o = this.orb;
      this.ellipse(g, o.x, o.y, 46 + Math.sin(T * 3) * 4, GODS[o.reward].hex, 0.12, GODS[o.reward].hex, 0.8, 2);
      this.runeTicks(g, o.x, o.y, 46, -T, GODS[o.reward].hex, 0.8);
    }
    // marcador de puerta abierta
    if (this.doorsOpen) {
      (['E', 'W'] as const).forEach((s) => {
        const d = DOORS[s];
        const px0 = d.x === 0 ? 70 : d.x;
        const py0 = d.y === 0 ? 70 : d.y;
        this.ellipse(g, px0, py0, 46 + Math.sin(T * 4) * 3, this.biome.magic, 0.08, this.biome.magic, 0.7, 2);
      });
    }
  }

  private runeTicks(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number, rot: number, color: number, alpha: number) {
    g.lineStyle(2, color, alpha);
    const n = 20;
    for (let i = 0; i < n; i++) {
      const a = rot + (i / n) * TAU;
      const r0 = r,
        r1 = r * (i % 2 ? 0.92 : 0.86);
      const x0 = x + Math.cos(a) * r0,
        y0 = y + Math.sin(a) * r0;
      const x1 = x + Math.cos(a) * r1,
        y1 = y + Math.sin(a) * r1;
      g.lineBetween(px(x0, y0), py(x0, y0), px(x1, y1), py(x1, y1));
    }
  }

  private lineTele(g: Phaser.GameObjects.Graphics, x0: number, y0: number, x1: number, y1: number, w: number, k: number) {
    const dx = x1 - x0,
      dy = y1 - y0;
    const d = Math.hypot(dx, dy) || 1;
    const ux = dx / d,
      uy = dy / d;
    const nx = (-uy / d) * (w / 2) * d,
      ny = (ux / d) * (w / 2) * d;
    // banda exterior (contorno pálido)
    this.polyW(
      g,
      [
        [x0 + nx, y0 + ny],
        [x1 + nx, y1 + ny],
        [x1 - nx, y1 - ny],
        [x0 - nx, y0 - ny],
      ],
      0xff4fd8,
      0.07 + 0.16 * k,
      0xffd2fa,
      0.55 + 0.35 * k,
    );
    // núcleo que crece
    const L = d * k;
    const kx = x0 + ux * L,
      ky = y0 + uy * L;
    this.polyW(
      g,
      [
        [x0 + nx * 0.35, y0 + ny * 0.35],
        [kx + nx * 0.35, ky + ny * 0.35],
        [kx - nx * 0.35, ky - ny * 0.35],
        [x0 - nx * 0.35, y0 - ny * 0.35],
      ],
      0xff8cf0,
      0.32,
      0xffffff,
      0.4 * k,
    );
    // cabeza de flecha (chevrones dobles, como en Hades)
    const head = (bx: number, by: number, sc: number, alpha: number) => {
      g.lineStyle(3, 0xffffff, alpha);
      for (const off of [0, 14]) {
        const bx0 = bx - ux * off,
          by0 = by - uy * off;
        g.lineBetween(px(bx0 - ux * 18 - nx, by0 - uy * 18 - ny), py(bx0 - ux * 18 - nx, by0 - uy * 18 - ny), px(bx0, by0), py(bx0, by0));
        g.lineBetween(px(bx0 - ux * 18 + nx, by0 - uy * 18 + ny), py(bx0 - ux * 18 + nx, by0 - uy * 18 + ny), px(bx0, by0), py(bx0, by0));
      }
      void sc;
    };
    head(x1, y1, 1, 0.9);
    // chevron inicial junto al atacante
    head(x0 + ux * 26, y0 + uy * 26, 0.6, 0.5);
  }

  private drawEnemyHud() {
    const g = this.hudg;
    g.clear();
    const T = this.t;
    const ttlMax = 4 + run.mods.ttl;
    for (const e of this.enemies) {
      if (e.dead || e.state === 'spawn') continue;
      const sx = px(e.x, e.y),
        sy = py(e.x, e.y) - e.top;
      const w = e.kind === 'boss' ? 120 : e.kind === 'brute' || e.kind === 'shellback' ? 70 : 52;
      const x0 = sx - w / 2;
      // barra de armadura (Firewall)
      let y = sy;
      if (e.maxArmor > 0) {
        g.fillStyle(0x03080b, 0.85);
        g.fillRect(x0 - 2, y - 2, w + 4, 8);
        const f = e.armor / e.maxArmor;
        g.fillStyle(0x59e6ff, 1);
        g.fillRect(x0, y, w * f, 4);
        g.fillStyle(0xffffff, 0.35);
        g.fillRect(x0, y, w * f, 1.5);
        y += 9;
      }
      // barra de vida
      g.fillStyle(0x03080b, 0.85);
      g.fillRect(x0 - 2, y - 2, w + 4, 9);
      g.fillStyle(0x4a1219, 1);
      g.fillRect(x0, y, w, 5);
      g.fillStyle(0xe0384a, 1);
      g.fillRect(x0, y, w * clamp(e.hp / e.maxHp, 0, 1), 5);
      g.fillStyle(0xffffff, 0.3);
      g.fillRect(x0, y, w * clamp(e.hp / e.maxHp, 0, 1), 1.5);
      y += 16;
      // pips del handshake
      const cols = [0x4fc3ff, 0xffd24a, 0x58ff9b];
      for (let i = 0; i < 3; i++) {
        const cx = sx + (i - 1) * 15;
        const done = e.hs > i;
        const next = e.hs === i;
        const pulse = next ? 1 + 0.18 * Math.sin(T * 8) : 1;
        g.fillStyle(0x03080b, 0.9);
        g.fillCircle(cx, y, 7 * pulse);
        if (done) {
          g.fillStyle(cols[i], 1);
          g.fillCircle(cx, y, 5);
          g.fillStyle(0xffffff, 0.6);
          g.fillCircle(cx - 1.5, y - 1.5, 1.8);
        } else {
          g.lineStyle(2, cols[i], next ? 0.95 : 0.35);
          g.strokeCircle(cx, y, 5 * pulse);
        }
      }
      if (e.hs > 0) {
        const k = clamp(e.hsT / ttlMax, 0, 1);
        g.fillStyle(0x03080b, 0.85);
        g.fillRect(sx - 22, y + 9, 44, 4);
        g.fillStyle(e.hs === 2 ? 0xffd24a : 0x4fc3ff, 1);
        g.fillRect(sx - 21, y + 10, 42 * k, 2);
      }
      // estados
      let ox = 0;
      const dot = (c: number) => {
        g.fillStyle(c, 1);
        g.fillCircle(x0 + ox + 3, sy - 8, 3);
        ox += 9;
      };
      if (e.chill > 0) dot(0xa8ecff);
      if (e.burn > 0) dot(0xff8a30);
      if (e.weak > 0) dot(0xff6fb1);
    }
  }

  private render(dt: number) {
    const p = this.pl;
    const T = this.t;
    const sx = px(p.x, p.y),
      sy = py(p.x, p.y);
    p.c.setPosition(sx, sy).setDepth(sy + 2);
    if (!this.plLight) {
      this.plLight = this.add.image(sx, sy - 40, 'glow').setTint(0xffe2ae).setBlendMode(ADD).setScale(5.2, 4.2).setAlpha(0.1).setDepth(2);
    }
    this.plLight.setPosition(sx, sy - 40).setAlpha(0.09 + Math.sin(T * 2.2) * 0.015);
    this.animatePlayer(dt, T);

    // cámara
    const sv = worldDirToScreen(p.aimx, p.aimy);
    const l = Math.hypot(sv.x, sv.y) || 1;
    this.camZone.setPosition(sx + (sv.x / l) * 70, sy - 40 + (sv.y / l) * 40);

    // parallax: siluetas de primer plano (abajo) y dosel (arriba), ancladas a pantalla
    const cam = this.cameras.main;
    if (this.fgLayer) {
      this.fgLayer.setPosition(-300 + cam.scrollX * 1.12, VIEW_H + 100 - 450);
    }
    if (this.canopyLayer) {
      this.canopyLayer.setPosition(-200 + cam.scrollX * 0.9, -100);
    }

    for (const e of this.enemies) {
      if (e.dead) continue;
      this.animateEnemy(e, T);
    }
    // puertas y luces
    (['E', 'W'] as const).forEach((s) => {
      const d = this.doors[s];
      if (this.doorsOpen) {
        d.veil.setAlpha(0.7 + Math.sin(T * 2.4 + (s === 'E' ? 0 : 1.5)) * 0.12);
        d.glow.setAlpha(0.14 + Math.sin(T * 3) * 0.03);
        d.icon.y = d.frame.y - 290 + Math.sin(T * 2.2) * 6;
      } else d.glow.setAlpha(0.04 + Math.sin(T * 2) * 0.01);
    });
    for (const l2 of this.glows) l2.img.setAlpha(l2.base * (0.85 + 0.15 * Math.sin(T * 5 + l2.ph) + 0.05 * Math.sin(T * 13 + l2.ph)));
    if (this.orb) {
      const o = this.orb;
      const bob = Math.sin(o.t * 3) * 6;
      o.c.setPosition(px(o.x, o.y), py(o.x, o.y)).setDepth(py(o.x, o.y) + 5);
      (o.c.list[1] as Phaser.GameObjects.Image).y = -50 + bob;
      (o.c.list[2] as Phaser.GameObjects.Image).y = -50 + bob;
      (o.c.list[0] as Phaser.GameObjects.Image).setScale(2.2 + Math.sin(o.t * 4) * 0.15);
      if (Math.random() < 0.3) this.part(px(o.x, o.y) + rnd(-30, 30), py(o.x, o.y) - 20, { tint: GODS[o.reward].hex, vy: -60, life: 0.9, s0: 0.35, s1: 0, depth: 6000 });
    }
    // fondo vivo y partículas ambientales del bioma
    this.bg.setAlpha(0.92 + Math.sin(T * 0.7) * 0.06);
    this.ambient();
    this.drawGround();
    this.drawEnemyHud();
  }

  private ambient() {
    const cam = this.cameras.main;
    const b = this.biome;
    const rate = b.ambient === 'petals' ? 0.35 : b.ambient === 'motes' ? 0.3 : 0.22;
    if (Math.random() > rate) return;
    const x = cam.scrollX + Math.random() * cam.width,
      y = cam.scrollY + Math.random() * cam.height;
    if (b.ambient === 'motes') {
      this.part(x, y, { key: 'glow', tint: 0xb8a6d8, vx: rnd(-6, 6), vy: rnd(-16, -6), life: rnd(2, 3.5), s0: 0.12, s1: 0.05, a0: 0.5, a1: 0, depth: 7000 });
    } else if (b.ambient === 'foam') {
      this.part(x, cam.scrollY - 10, { key: 'glow', tint: 0xbfe6e2, vx: rnd(-10, 10), vy: rnd(70, 120), life: rnd(1.5, 2.5), s0: 0.08, s1: 0.1, a0: 0.45, a1: 0, depth: 7000, add: false });
    } else {
      this.part(x, cam.scrollY - 10, { key: 'spark', tint: 0xe8e0d8, vx: rnd(10, 40), vy: rnd(28, 50), life: rnd(3, 5), s0: 0.22, s1: 0.18, a0: 0.8, a1: 0, rot: Math.random() * TAU, spin: rnd(-2, 2), depth: 7000, add: false });
    }
  }

  private animatePlayer(dt: number, T: number) {
    const p = this.pl;
    const pr = p.parts;
    const sa = worldDirToScreen(p.aimx, p.aimy);
    const sl = Math.hypot(sa.x, sa.y) || 1;
    const ax = sa.x / sl,
      ay = sa.y / sl;
    const sm = worldDirToScreen(p.fmx, p.fmy);
    const ml = Math.hypot(sm.x, sm.y) || 1;
    const mxs = sm.x / ml,
      mys = sm.y / ml;
    const fighting = p.atkLock > 0 || p.castT > 0 || p.atkBlend > 0.3;
    const fx = fighting ? ax : mxs;
    const fy = fighting ? ay : mys;
    if (Math.abs(fx) > 0.12) p.facing = fx > 0 ? 1 : -1;
    p.back = fy < -0.55 && Math.abs(fx) < 0.85;
    pr.headF.setVisible(!p.back);
    pr.headB.setVisible(p.back);
    p.body.scaleX = 0.92 * p.facing;

    const moving = p.speedFrac > 0.05 && p.blinkT <= 0;
    if (moving) p.walk += dt * (7 + p.speedFrac * 6);
    const sw = moving ? Math.sin(p.walk) : 0;
    const k = moving ? clamp(p.speedFrac, 0.5, 1.4) : 0;
    pr.legL.rotation = lerp(pr.legL.rotation, sw * 0.62 * k, 0.4);
    pr.legR.rotation = lerp(pr.legR.rotation, -sw * 0.62 * k, 0.4);
    const bob = moving ? -Math.abs(Math.sin(p.walk)) * 4 : Math.sin(T * 2) * 1.2;
    pr.torso.y = -52 + bob * 0.8;
    pr.headF.y = pr.headB.y = -85 + bob * 1.1 + (p.hurtT > 0 ? 4 : 0);
    pr.skirt.y = -56 + bob * 0.8;
    pr.skirt.rotation = sw * 0.05 * k;
    pr.skirt.scaleX = 0.5 * (1 + (moving ? Math.abs(sw) * 0.06 : 0));
    pr.tail.rotation = lerp(pr.tail.rotation, -0.15 * mxs * p.facing * k + Math.sin(T * 3) * 0.06 + (moving ? sw * 0.1 : 0), 0.2);
    // El familiar acompaña a Melinoë como un pequeño ancla visual, sin tapar el combate.
    pr.familiar.x = lerp(pr.familiar.x, -31 * p.facing, 0.12);
    pr.familiar.y = -20 + Math.abs(Math.sin(T * 2.1 + p.walk)) * 2;
    pr.familiar.setFlipX(p.facing < 0);

    // inclinación del cuerpo
    const lean = p.blinkT > 0 ? mxs * 0.35 : moving ? mxs * 0.12 : 0;
    p.body.rotation = lerp(p.body.rotation, lean, 0.25);
    // squash & stretch
    let sy2 = 0.92;
    if (p.blinkT > 0) {
      sy2 = 0.7;
      p.body.scaleX = 1.25 * p.facing;
    } else if (p.atkLock > 0 && p.atkStep === 2) sy2 = 0.92 - Math.sin((p.atkLock / p.atkDur) * Math.PI) * 0.1;
    p.body.scaleY = lerp(p.body.scaleY, sy2, 0.35);

    // brazos
    p.atkBlend = Math.max(0, p.atkBlend - dt * 2.4);
    const lx = ax * p.facing;
    const theta = Math.atan2(ay, lx === 0 ? 0.001 : lx);
    const aimRot = theta - Math.PI / 2;
    let restR = 0.28 + sw * 0.2 * k;
    let restL = -0.28 - sw * 0.2 * k;
    const casting = p.castT > 0.01;
    if (casting) {
      restR = 2.5;
      restL = -2.5;
    }
    let armRot = restR;
    let staffRot = -restR + 0.12;
    if (p.atkBlend > 0.001 && !casting) {
      const prog = 1 - p.atkBlend;
      const e = 1 - Math.pow(1 - clamp(prog * 1.6, 0, 1), 3);
      const swing = lerp(-1.25, 1.1, e) * p.swingDir;
      const target = p.atkStep === 3 ? aimRot : aimRot + swing;
      const b = Math.min(1, p.atkBlend * 3);
      armRot = lerp(restR, target, b);
      staffRot = lerp(-restR + 0.12, Math.PI, b);
    }
    pr.armR.rotation = lerp(pr.armR.rotation, armRot, 0.6);
    pr.armL.rotation = lerp(pr.armL.rotation, restL, 0.4);
    pr.staff.rotation = lerp(pr.staff.rotation, staffRot, 0.6);
    // destellos en las manos solo al conjurar o cargar
    if ((casting || run.chargeAtk > 0 || run.chargeSpc > 0) && Math.random() < 0.5) {
      const x0 = px(p.x, p.y) + p.facing * 20;
      this.part(x0 + rnd(-6, 6), py(p.x, p.y) - 58 + rnd(-6, 6), { key: 'glow', tint: 0x6dffb0, vy: -45, s0: 0.2, s1: 0, life: 0.5, a0: 0.5, depth: p.c.depth + 1 });
    }
    // parpadeo de invulnerabilidad / flash
    const blinkVis = p.invuln > 0 && p.blinkT <= 0 ? (Math.floor(T * 22) % 2 ? 0.45 : 1) : 1;
    p.c.setAlpha(p.blinkT > 0 ? 0.55 : blinkVis);
    if (p.hurtT > 0) p.imgs.forEach((i: Phaser.GameObjects.Image) => i.setTintFill(0xff6a6a));
    else p.imgs.forEach((i: Phaser.GameObjects.Image) => i.clearTint());
    if (p.dead) {
      p.c.rotation = lerp(p.c.rotation, 1.4, 0.08);
      p.c.setAlpha(0.8);
    }
  }

  private animateEnemy(e: Enemy, T: number) {
    const sx = px(e.x, e.y),
      sy = py(e.x, e.y);
    e.c.setPosition(sx, sy).setDepth(sy + 1);
    if (e.state === 'spawn') return;
    const p = this.pl;
    const toP = worldDirToScreen(p.x - e.x, p.y - e.y);
    const dir = toP.x >= 0 ? 1 : -1;
    const b = e.body;
    const s0 = 0.5 * e.scale;
    b.setFlipX(dir < 0);
    // idle / caminar
    const w = Math.sin(T * (e.kind === 'brute' || e.kind === 'shellback' ? 4 : 7) + e.phase);
    let sxs = 1,
      sys = 1 + w * 0.025;
    let rot = Math.sin(T * 3 + e.phase) * 0.03;
    if (e.kind === 'shade' || e.kind === 'wailer') {
      b.y = Math.sin(T * 3 + e.phase) * 5 - 10;
      sys = 1 + w * 0.04;
      if (e.state === 'wind') {
        sxs = 1.15;
        sys = 0.85;
        b.y = 4;
      }
      if (e.state === 'dash') {
        sxs = 1.35;
        sys = 0.8;
        rot = 0.3 * dir;
        this.part(sx, sy - 30, { key: 'glow', tint: 0x7dffe0, s0: 0.7, s1: 0.1, life: 0.3, a0: 0.4 });
      }
    } else if (e.kind === 'spear' || e.kind === 'archer' || e.kind === 'lamia') {
      b.y = 0;
      if (e.state === 'wind') {
        sys = 0.94;
      }
    } else if (e.kind === 'urn') {
      b.y = Math.sin(T * 2.5 + e.phase) * 5 - 8;
      if (e.state === 'fuse') {
        const k = 1 + Math.sin(T * 40) * 0.08;
        sxs = k;
        sys = 2 - k;
      }
    } else if (e.kind === 'brute' || e.kind === 'shellback' || e.kind === 'boss') {
      b.y = 0;
      sys = 1 + w * 0.02;
      if (e.state === 'wind') sys = 0.96;
      if (e.state === 'stun') {
        rot = Math.sin(T * 30) * 0.05;
        sxs = 1.05;
      }
    }
    if (e.flash > 0) b.setTintFill(0xffffff);
    else if (e.kind === 'urn' && e.state === 'fuse') b.setTint(Math.floor(T * 14) % 2 ? 0xffb0a0 : 0xffffff);
    else if (e.state === 'stun') b.setTint(0x9fdcff);
    else if (e.chill > 0) b.setTint(0xa8ecff);
    else if (e.burn > 0) b.setTint(0xffb080);
    else b.clearTint();
    b.setScale(s0 * sxs, s0 * sys).setRotation(rot);

    // armas
    const wp = e.wpn;
    if (wp) {
      if (e.kind === 'spear') {
        const sv = worldDirToScreen(e.dirx, e.diry);
        const aimA = Math.atan2(e.state === 'wind' ? sv.y : toP.y, e.state === 'wind' ? sv.x : toP.x);
        const raise = e.state === 'wind' ? 1 - e.t / 0.8 : 0;
        const baseA = dir > 0 ? -0.5 : Math.PI + 0.5;
        const ang = lerp(baseA, aimA, raise);
        wp.setPosition(dir * 12 * e.scale, -50 * e.scale).setRotation(ang);
        wp.setVisible(e.state !== 'recover' || e.t > 0.3);
        if (e.state === 'wind') wp.x -= Math.cos(aimA) * raise * 10;
      } else if (e.kind === 'archer') {
        const sv = worldDirToScreen(e.dirx, e.diry);
        const aimA = Math.atan2(e.state === 'wind' ? sv.y : toP.y, e.state === 'wind' ? sv.x : toP.x);
        const raise = e.state === 'wind' ? clamp(1 - e.t / 0.9, 0, 1) : 0;
        wp.setPosition(dir * (10 + raise * 14) * e.scale, -52 * e.scale).setRotation(lerp(dir > 0 ? 0.2 : -0.2, aimA, raise));
        wp.setScale(0.5 * e.scale * (1 - raise * 0.15), 0.5 * e.scale);
      } else if (e.variant === 'phantom' && e.kind === 'boss') {
        const rest = dir > 0 ? -1.1 : -2.0;
        const up = dir > 0 ? -2.3 : -0.8;
        const down = dir > 0 ? 0.3 : -3.4;
        let ang = rest;
        if (e.raise >= 0) ang = lerp(rest, up, clamp(e.raise, 0, 1));
        else ang = lerp(rest, down, clamp(-e.raise / 0.6, 0, 1));
        wp.setPosition(dir * 30 * e.scale, -60 * e.scale).setRotation(ang).setFlipY(dir < 0);
        if (e.state === 'stun') wp.setRotation(rest);
      } else {
        // ancla
        const rest = dir > 0 ? 0.55 : -0.55;
        const up = dir > 0 ? -2.5 : 2.5;
        const down = dir > 0 ? 1.1 : -1.1;
        let ang = rest;
        if (e.raise >= 0) ang = lerp(rest, up, clamp(e.raise, 0, 1));
        else ang = lerp(rest, down, clamp(-e.raise / 0.6, 0, 1));
        wp.setPosition(dir * 46 * e.scale, -68 * e.scale).setRotation(ang);
        wp.setFlipX(dir < 0);
        if (e.state === 'stun') wp.setRotation(rest);
      }
    }
  }
}
