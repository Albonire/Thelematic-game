// ───────────────────────────────────────────────────────────────
//  Entrada unificada: teclado + gamepad + cuerpo (MediaPipe) + red
// ───────────────────────────────────────────────────────────────
import type { PoseController } from './pose';
import type { NetClient } from './net';
import { bus } from './bus';

export interface InputState {
  mx: number;
  my: number;
  atk: boolean;
  spc: boolean;
  cast: boolean;
  blink: boolean;
  sprint: boolean;
  interact: boolean;
}

export const emptyInput = (): InputState => ({
  mx: 0,
  my: 0,
  atk: false,
  spc: false,
  cast: false,
  blink: false,
  sprint: false,
  interact: false,
});

const pickAxis = (...v: number[]) => v.reduce((a, b) => (Math.abs(b) > Math.abs(a) ? b : a), 0);

export class InputManager {
  keys = new Set<string>();
  private justKeys = new Set<string>();
  /** estado final (local + remoto) */
  state: InputState = emptyInput();
  /** estado local (teclado + gamepad + cuerpo): es lo que se envía por red */
  local: InputState = emptyInput();
  edge = { atk: false, spc: false, cast: false, blink: false, interact: false, left: false, right: false, up: false, down: false };
  padAim: { x: number; y: number } | null = null;
  padConnected = false;
  activity = { kb: 0, pad: 0, pose: 0, remote: 0 };

  private prev = emptyInput();
  private prevDir = { x: 0, y: 0 };
  private prevStart = false;

  constructor(
    private pose: PoseController,
    private net: NetClient,
  ) {
    const typing = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      return !!t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName);
    };
    window.addEventListener('keydown', (e) => {
      if (typing(e)) return;
      if (!this.keys.has(e.code)) this.justKeys.add(e.code);
      this.keys.add(e.code);
      this.activity.kb = performance.now();
      const t = e.target as HTMLElement | null;
      const onButton = !!t && t.tagName === 'BUTTON';
      if (!onButton && ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());
  }

  justKey(code: string) {
    return this.justKeys.has(code);
  }

  update(now: number) {
    const k = this.keys;
    const L = emptyInput();

    // ── teclado ────────────────────────────────────────────
    let kx = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0);
    let ky = (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0) - (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0);
    if (kx && ky) {
      kx *= Math.SQRT1_2;
      ky *= Math.SQRT1_2;
    }
    const kAtk = k.has('KeyJ');
    const kSpc = k.has('KeyK');
    const kCast = k.has('KeyL') || k.has('KeyQ');
    const kBlink = k.has('Space');
    const kSprint = k.has('ShiftLeft') || k.has('ShiftRight');
    const kInter = k.has('KeyE') || k.has('Enter');

    // ── gamepad ────────────────────────────────────────────
    let gx = 0,
      gy = 0,
      gAtk = false,
      gSpc = false,
      gCast = false,
      gBlink = false,
      gSprint = false,
      gInter = false,
      gStart = false;
    this.padAim = null;
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    let pad: Gamepad | null = null;
    for (const p of pads) if (p && p.connected) pad = p;
    this.padConnected = !!pad;
    if (pad) {
      const dead = (v: number) => (Math.abs(v) < 0.22 ? 0 : v);
      gx = dead(pad.axes[0] ?? 0);
      gy = dead(pad.axes[1] ?? 0);
      const b = (i: number) => !!pad!.buttons[i]?.pressed;
      if (b(14)) gx = -1;
      if (b(15)) gx = 1;
      if (b(12)) gy = -1;
      if (b(13)) gy = 1;
      const rx = dead(pad.axes[2] ?? 0),
        ry = dead(pad.axes[3] ?? 0);
      if (rx || ry) this.padAim = { x: rx, y: ry };
      gAtk = b(2) || b(7);
      gSpc = b(3) || b(5);
      gCast = b(1) || b(6);
      gBlink = b(0);
      gSprint = b(4);
      gInter = b(0) || b(2);
      gStart = b(9);
      if (gx || gy || gAtk || gSpc || gCast || gBlink) this.activity.pad = now;
    }
    if (gStart && !this.prevStart) bus.emit('togglePause');
    this.prevStart = gStart;

    // ── cuerpo ─────────────────────────────────────────────
    const ps = this.pose.enabled && this.pose.state.present ? this.pose.state : null;
    if (ps && (ps.mx || ps.my || ps.atk || ps.spc || ps.cast || ps.blink)) this.activity.pose = now;

    L.mx = pickAxis(kx, gx, ps?.mx ?? 0);
    L.my = pickAxis(ky, gy, ps?.my ?? 0);
    const m = Math.hypot(L.mx, L.my);
    if (m > 1) {
      L.mx /= m;
      L.my /= m;
    }
    L.atk = kAtk || gAtk || !!ps?.atk;
    L.spc = kSpc || gSpc || !!ps?.spc;
    L.cast = kCast || gCast || !!ps?.cast;
    L.blink = kBlink || gBlink || !!ps?.blink;
    L.sprint = kSprint || gSprint || !!ps?.sprint;
    L.interact = kInter || gInter;
    this.local = L;

    // ── red: gestos remotos ────────────────────────────────
    this.net.tick(L, now);
    const S: InputState = { ...L };
    if (this.net.remoteActive(now)) {
      const r = this.net.remote.state!;
      this.activity.remote = now;
      S.mx = pickAxis(S.mx, r.mx);
      S.my = pickAxis(S.my, r.my);
      S.atk = S.atk || r.a;
      S.spc = S.spc || r.sp;
      S.cast = S.cast || r.c;
      S.blink = S.blink || r.b;
      S.sprint = S.sprint || r.r;
    }
    this.state = S;

    // ── flancos ────────────────────────────────────────────
    const p = this.prev;
    const dirX = Math.abs(S.mx) > 0.6 ? Math.sign(S.mx) : 0;
    const dirY = Math.abs(S.my) > 0.6 ? Math.sign(S.my) : 0;
    this.edge = {
      atk: S.atk && !p.atk,
      spc: S.spc && !p.spc,
      cast: S.cast && !p.cast,
      blink: S.blink && !p.blink,
      interact: S.interact && !p.interact,
      left: dirX < 0 && this.prevDir.x >= 0,
      right: dirX > 0 && this.prevDir.x <= 0,
      up: dirY < 0 && this.prevDir.y >= 0,
      down: dirY > 0 && this.prevDir.y <= 0,
    };
    this.prevDir = { x: dirX, y: dirY };
    this.prev = { ...S };
  }

  /** limpiar eventos de un solo fotograma */
  endFrame() {
    this.justKeys.clear();
  }

  /** fuentes de entrada activas en los últimos 2 s */
  sources(now: number) {
    return {
      kb: now - this.activity.kb < 2000,
      pad: this.padConnected,
      pose: this.pose.enabled && this.pose.status === 'ready',
      remote: this.net.remoteActive(now),
    };
  }
}
