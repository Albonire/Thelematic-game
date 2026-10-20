// ───────────────────────────────────────────────────────────────
//  Estado de la partida compartido entre GameScene y UIScene
// ───────────────────────────────────────────────────────────────
export type RewardKey = 'zeus' | 'poseidon' | 'demeter' | 'aphrodite' | 'hestia' | 'hermes' | 'artemis' | 'heart' | 'magick' | 'heal' | 'boss';

export interface Mods {
  lightning: number;
  dmg: number;
  kb: number;
  chill: number;
  weak: number;
  burn: number;
  speed: number;
  ttl: number;
  crit: number;
  spcDmg: number;
  blinkRate: number;
  ringR: number;
  castDmg: number;
  sprint: number;
  magRegen: number;
  armorShred: number;
  maxHp: number;
}

export const newMods = (): Mods => ({
  lightning: 0,
  dmg: 0,
  kb: 0,
  chill: 0,
  weak: 0,
  burn: 0,
  speed: 0,
  ttl: 0,
  crit: 0,
  spcDmg: 0,
  blinkRate: 0,
  ringR: 0,
  castDmg: 0,
  sprint: 0,
  magRegen: 0,
  armorShred: 0,
  maxHp: 0,
});

export interface BoonDef {
  id: string;
  god: string;
  title: string;
  desc: (v: number) => string;
  apply: (m: Mods, v: number) => void;
}

const r = Math.round;

export const BOONS: BoonDef[] = [
  {
    id: 'zeus_bolt',
    god: 'zeus',
    title: 'Trueno Dividido',
    desc: (v) => `Tus golpes invocan un rayo sobre el enemigo: ${r(12 * v)} de daño en área.`,
    apply: (m, v) => (m.lightning += 12 * v),
  },
  {
    id: 'zeus_volt',
    god: 'zeus',
    title: 'Voltaje Alto',
    desc: (v) => `+${r(30 * v)}% de daño del Especial (SYN-ACK).`,
    apply: (m, v) => (m.spcDmg += 0.3 * v),
  },
  {
    id: 'pos_tide',
    god: 'poseidon',
    title: 'Marea Alta',
    desc: (v) => `+${r(16 * v)}% de daño y +${r(40 * v)}% de empuje.`,
    apply: (m, v) => {
      m.dmg += 0.16 * v;
      m.kb += 0.4 * v;
    },
  },
  {
    id: 'pos_surge',
    god: 'poseidon',
    title: 'Corriente Rauda',
    desc: (v) => `Tus esquivas (Blink) se recargan ${r(35 * v)}% más rápido.`,
    apply: (m, v) => (m.blinkRate += 0.35 * v),
  },
  {
    id: 'dem_frost',
    god: 'demeter',
    title: 'Escarcha Perpetua',
    desc: (v) => `Tus golpes ralentizan ${r(22 * v)}% durante 3 s y el enemigo recibe +10% de daño.`,
    apply: (m, v) => (m.chill += 0.22 * v),
  },
  {
    id: 'dem_ring',
    god: 'demeter',
    title: 'Círculo de Invierno',
    desc: (v) => `El Círculo de Hécate (ACK) tiene +${r(20 * v)}% de radio.`,
    apply: (m, v) => (m.ringR += 0.2 * v),
  },
  {
    id: 'aph_weak',
    god: 'aphrodite',
    title: 'Corazón Débil',
    desc: (v) => `Los enemigos golpeados infligen −${r(22 * v)}% de daño durante 5 s.`,
    apply: (m, v) => (m.weak += 0.22 * v),
  },
  {
    id: 'aph_life',
    god: 'aphrodite',
    title: 'Pasión Vital',
    desc: (v) => `+${r(15 * v)} de Salud máxima y te curas esa cantidad.`,
    apply: (m, v) => (m.maxHp += 15 * v),
  },
  {
    id: 'hes_burn',
    god: 'hestia',
    title: 'Brasas Eternas',
    desc: (v) => `Tus golpes queman: ${r(4 * v)} de daño por segundo durante 3 s.`,
    apply: (m, v) => (m.burn += 4 * v),
  },
  {
    id: 'hes_cast',
    god: 'hestia',
    title: 'Hogar Ardiente',
    desc: (v) => `El Círculo hace +${r(6 * v)} de daño en cada pulso.`,
    apply: (m, v) => (m.castDmg += 6 * v),
  },
  {
    id: 'her_ttl',
    god: 'hermes',
    title: 'Paquete Prioritario',
    desc: (v) => `El TTL del handshake dura +${(1.2 * v).toFixed(1)} s y ganas +${r(6 * v)}% de velocidad.`,
    apply: (m, v) => {
      m.ttl += 1.2 * v;
      m.speed += 0.06 * v;
    },
  },
  {
    id: 'her_sprint',
    god: 'hermes',
    title: 'Pies Alados',
    desc: (v) => `Sprint +${r(12 * v)}% y +${r(2 * v)} de Magia por segundo.`,
    apply: (m, v) => {
      m.sprint += 0.12 * v;
      m.magRegen += 2 * v;
    },
  },
  {
    id: 'art_crit',
    god: 'artemis',
    title: 'Flecha Certera',
    desc: (v) => `+${r(12 * v)}% de probabilidad de crítico (×2 de daño).`,
    apply: (m, v) => (m.crit += 0.12 * v),
  },
  {
    id: 'art_mark',
    god: 'artemis',
    title: 'Marca de Cazadora',
    desc: (v) => `+${r(35 * v)}% de daño contra el Firewall (armadura) enemigo.`,
    apply: (m, v) => (m.armorShred += 0.35 * v),
  },
];

export const RARITY = [
  { name: 'Común', v: 1, color: '#9fb4b8' },
  { name: 'Rara', v: 1.5, color: '#4fc3ff' },
  { name: 'Épica', v: 2, color: '#c77dff' },
];

export interface BoonChoice {
  def: BoonDef;
  rarity: number;
}

export interface RunState {
  mode: 'play' | 'choose' | 'dead' | 'won';
  /** Primeros tres pasos del tutorial contextual del handshake. */
  tutorialStep: 0 | 1 | 2 | 3;
  room: number;
  roomName: string;
  region: string;
  totalRooms: number;
  hp: number;
  maxHp: number;
  mag: number;
  maxMag: number;
  blink: number;
  maxBlink: number;
  blinkProg: number;
  cdAtk: number; // 0 = listo … 1 = recién usado
  cdSpc: number;
  cdCast: number;
  chargeCast: number;
  chargeAtk: number;
  chargeSpc: number;
  mods: Mods;
  taken: { id: string; god: string; rarity: number }[];
  defiance: number;
  stats: { established: number; kills: number; rst: number; dmgTaken: number; time: number; hits: number };
  boss: { name: string; hp: number; max: number; armor: number; maxArmor: number } | null;
  choices: BoonChoice[];
  choiceGod: string;
  hurtFlash: number;
  lastEstablished: number;
}

export const newRun = (): RunState => ({
  mode: 'play',
  tutorialStep: 0,
  room: 1,
  roomName: '',
  region: '',
  totalRooms: 8,
  hp: 100,
  maxHp: 100,
  mag: 100,
  maxMag: 100,
  blink: 2,
  maxBlink: 2,
  blinkProg: 0,
  cdAtk: 0,
  cdSpc: 0,
  cdCast: 0,
  chargeCast: 0,
  chargeAtk: 0,
  chargeSpc: 0,
  mods: newMods(),
  taken: [],
  defiance: 1,
  stats: { established: 0, kills: 0, rst: 0, dmgTaken: 0, time: 0, hits: 0 },
  boss: null,
  choices: [],
  choiceGod: '',
  hurtFlash: 0,
  lastEstablished: -99,
});

export const run: RunState = newRun();

export function resetRun() {
  Object.assign(run, newRun());
}
