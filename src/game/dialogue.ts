// ───────────────────────────────────────────────────────────────
//  Diálogos estilo Hades II · HADES.NET
//  HÉCATE actúa como oráculo de red: enseña telemática jugando.
//  MELÍNOE responde. Los guardianes interrumpen en sus salas.
//  Líneas cortas (máx ~150 caracteres) para la caja inferior.
// ───────────────────────────────────────────────────────────────

export type Speaker = 'HECATE' | 'MELINOE' | 'CAPTAIN' | 'PHANTOM' | 'HERMES';

export interface DLine {
  who: Speaker;
  text: string;
}

export interface Script {
  id: string;
  /** true = congela el combate hasta terminar; false = avisos sin pausa */
  modal: boolean;
  lines: DLine[];
}

export const SPEAKER_META: Record<Speaker, { name: string; portrait: string; color: string }> = {
  HECATE: { name: 'HÉCATE · ORÁCULO DE RED', portrait: 'portrait-hecate', color: '#b9a7e8' },
  MELINOE: { name: 'MELÍNOE', portrait: 'portrait-melinoe', color: '#f5df9e' },
  CAPTAIN: { name: 'CAPITÁN NÁUFRAGO', portrait: 'portrait-captain', color: '#7bd4be' },
  PHANTOM: { name: 'FANTASMA DEL LAMENTO', portrait: 'portrait-phantom', color: '#e2a8b8' },
  HERMES: { name: 'HERMES', portrait: 'portrait-hecate', color: '#ffd24a' },
};

export const DIALOGUES: Record<string, Script> = {
  intro: {
    id: 'intro',
    modal: true,
    lines: [
      { who: 'HECATE', text: 'Escúchame, pequeña. La red del Inframundo se ha venido abajo: los paquetes vagan corruptos por Erebo.' },
      { who: 'MELINOE', text: '¿Y mi bastón qué pinta en una red caída, maestra?' },
      { who: 'HECATE', text: 'Todo. Cada enemigo es un paquete. Ábrelo con SYN, respóndele con SYN-ACK y ciérralo con ACK.' },
      { who: 'HECATE', text: 'Si completas el saludo antes de que expire su TTL, la conexión queda ESTABLISHED… y revienta.' },
      { who: 'MELINOE', text: 'SYN, SYN-ACK, ACK. Entendido. Que tiemblen los Firewalls.' },
    ],
  },
  oceanus_enter: {
    id: 'oceanus_enter',
    modal: true,
    lines: [
      { who: 'HECATE', text: 'Océano. El navío respira vapor por las rejillas: daña a todo lo que pise encima, incluso a ellos.' },
      { who: 'MELINOE', text: 'Veo marineros con escudo azul… ¿Firewall?' },
      { who: 'HECATE', text: 'Exacto. La armadura filtra tu daño al 10%. Solo un ESTABLISHED la atraviesa de golpe.' },
    ],
  },
  captain_intro: {
    id: 'captain_intro',
    modal: true,
    lines: [
      { who: 'CAPTAIN', text: '¡¿Quién osa abordar MI barco?! ¡Aquí los paquetes se hunden, no se entregan!' },
      { who: 'MELINOE', text: 'Tu latencia es historia, Capitán. Vengo a restablecer la ruta.' },
      { who: 'HECATE', text: 'Cuidado: ancla, lluvia de lanzas y mareas. Rompe su Firewall con el handshake y castígalo aturdido.' },
    ],
  },
  captain_down: {
    id: 'captain_down',
    modal: false,
    lines: [{ who: 'HECATE', text: 'Guardián caído. La ruta a los Campos se abre. Toma su ofrenda y sigue.' }],
  },
  fields_enter: {
    id: 'fields_enter',
    modal: true,
    lines: [
      { who: 'HECATE', text: 'Campos de Lamento. La miasma gris te frena y drena Magia: no pelees dentro de ella.' },
      { who: 'MELINOE', text: '¿Y esas urnas que tiemblan?' },
      { who: 'HECATE', text: 'Almas inestables. Explotan solas… o úsalas tú: rómpelas cerca del enemigo.' },
    ],
  },
  phantom_intro: {
    id: 'phantom_intro',
    modal: true,
    lines: [
      { who: 'PHANTOM', text: 'Toda señal… se pierde… en mi niebla. Tu handshake… morirá… sin ACK…' },
      { who: 'MELINOE', text: 'Entonces transmitiré más rápido que tu lamento.' },
      { who: 'HECATE', text: 'Se teletransporta y siembra urnas. Mantén la calma, cierra cada SYN antes de que expire su TTL.' },
    ],
  },
  victory: {
    id: 'victory',
    modal: true,
    lines: [
      { who: 'HECATE', text: 'Silencio en la red. Todos los paquetes, entregados.' },
      { who: 'MELINOE', text: 'Conexión ESTABLISHED con el Inframundo. Misión cumplida.' },
    ],
  },
  death: {
    id: 'death',
    modal: true,
    lines: [
      { who: 'HECATE', text: 'Tu señal se ha perdido… pero el Desafío a la Muerte te devuelve un paquete.' },
      { who: 'MELINOE', text: 'Reintentando conexión. Esta vez no fallará el handshake.' },
    ],
  },
};

// Avisos cortos no bloqueantes durante el combate.
export const BARKS = {
  firstSyn: { text: 'SYN enlazado · ahora responde con Especial', color: '#4fc3ff' },
  firstSynAck: { text: 'SYN-ACK confirmado · cierra con Conjuro', color: '#ffd24a' },
  firstEstablished: { text: '¡ESTABLISHED! Firewall roto · daño ×3', color: '#58ff9b' },
  firstRst: { text: 'RST: lanzaste ACK demasiado pronto', color: '#ff5c6a' },
  noMagick: { text: 'Sin Magia: rompe vasijas o espera', color: '#8f9bff' },
  omegaHint: { text: 'Mantén para cargar Ω Omega', color: '#f5df9e' },
  miasma: { text: 'Miasma: drena tu Magia', color: '#b9a7e8' },
  vent: { text: '¡Vapor! Apártate de la rejilla', color: '#ffd24a' },
} as const;

export type BarkKey = keyof typeof BARKS;

/** Estado compartido: UIScene lo dibuja, GameScene congela el combate si modal. */
export const dialogueState = {
  active: false,
  modal: false,
  scriptId: '',
  lineIndex: 0,
  /** líneas ya mostradas (para no repetir intros al reintentar) */
  seen: new Set<string>(),
};
