// ───────────────────────────────────────────────────────────────
//  Cliente WebSocket: transmite los gestos entre dos portátiles
//  de la red local y mide la latencia (RTT extremo a extremo).
//
//  Protocolo (JSON sobre WebSocket / TCP):
//    → {t:'hello', room}                        al conectar
//    ← {t:'welcome', id, n}                     el relay asigna un id
//    → {t:'in', seq, ts, s:{mx,my,a,sp,c,b,r}}  gestos del emisor (30 Hz)
//    ← {t:'in', ..., from}                      llega al receptor
//    → {t:'ack', seq, ts, to}                   el receptor confirma (ACK)
//    ← {t:'ack', ...}                           el emisor calcula RTT = now − ts
//    → {t:'ping', ts}   ← {t:'pong', ts}        RTT contra el relay
// ───────────────────────────────────────────────────────────────
import type { InputState } from './input';

export interface NetConfig {
  url: string;
  room: string;
  send: boolean;
  receive: boolean;
  extraDelay: number;
}

export interface NetStats {
  rtt: number;
  avg: number;
  min: number;
  max: number;
  jitter: number;
  serverRtt: number;
  sent: number;
  acked: number;
  lost: number;
  lossPct: number;
  recv: number;
  history: number[];
}

export interface RemoteState {
  mx: number;
  my: number;
  a: boolean;
  sp: boolean;
  c: boolean;
  b: boolean;
  r: boolean;
}

const emptyStats = (): NetStats => ({
  rtt: 0,
  avg: 0,
  min: 0,
  max: 0,
  jitter: 0,
  serverRtt: 0,
  sent: 0,
  acked: 0,
  lost: 0,
  lossPct: 0,
  recv: 0,
  history: [],
});

export class NetClient {
  cfg: NetConfig = {
    url: `ws://${typeof location !== 'undefined' && location.hostname ? location.hostname : 'localhost'}:8080`,
    room: 'telematica',
    send: true,
    receive: true,
    extraDelay: 0,
  };
  status: 'off' | 'connecting' | 'open' | 'error' = 'off';
  statusText = '';
  peers = 0;
  id = '';
  stats: NetStats = emptyStats();
  samples: { t: number; seq: number; rtt: number; extra: number }[] = [];
  remote: { state: RemoteState | null; at: number } = { state: null, at: 0 };

  private ws: WebSocket | null = null;
  private seq = 0;
  private pending = new Map<number, number>();
  private lastSend = 0;
  private lastPing = 0;
  private win: number[] = [];
  private t0 = 0;

  get connected() {
    return this.status === 'open';
  }

  /** ¿hay gestos remotos recientes que aplicar al juego? */
  remoteActive(now: number) {
    return this.connected && this.cfg.receive && !!this.remote.state && now - this.remote.at < 450;
  }

  connect() {
    this.disconnect();
    this.status = 'connecting';
    this.statusText = 'Conectando…';
    this.stats = emptyStats();
    this.samples = [];
    this.win = [];
    this.pending.clear();
    this.seq = 0;
    this.t0 = performance.now();
    try {
      const ws = new WebSocket(this.cfg.url);
      this.ws = ws;
      ws.onopen = () => {
        this.status = 'open';
        this.statusText = 'Conectado';
        ws.send(JSON.stringify({ t: 'hello', room: this.cfg.room }));
      };
      ws.onmessage = (ev) => this.onMessage(ev.data);
      ws.onerror = () => {
        this.status = 'error';
        this.statusText = 'No se pudo conectar (¿está corriendo server/relay.mjs?)';
      };
      ws.onclose = () => {
        if (this.status !== 'error') {
          this.status = 'off';
          this.statusText = 'Desconectado';
        }
        this.peers = 0;
        this.remote.state = null;
      };
    } catch (e: any) {
      this.status = 'error';
      this.statusText = e?.message ?? 'URL inválida';
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
    this.status = 'off';
    this.statusText = 'Desconectado';
    this.peers = 0;
    this.remote.state = null;
  }

  private onMessage(raw: any) {
    let m: any;
    try {
      m = JSON.parse(raw);
    } catch {
      return;
    }
    const now = performance.now();
    switch (m.t) {
      case 'welcome':
        this.id = m.id;
        this.peers = m.n;
        break;
      case 'peers':
        this.peers = m.n;
        break;
      case 'pong':
        this.stats.serverRtt = now - m.ts;
        break;
      case 'in':
        if (this.cfg.receive) {
          this.remote = { state: m.s, at: now };
          this.stats.recv++;
          this.ws?.send(JSON.stringify({ t: 'ack', seq: m.seq, ts: m.ts, to: m.from }));
        }
        break;
      case 'ack':
        if (m.to === this.id && this.pending.has(m.seq)) {
          this.pending.delete(m.seq);
          this.registerRtt(now - m.ts, m.seq, now);
        }
        break;
    }
  }

  private registerRtt(rtt: number, seq: number, now: number) {
    const s = this.stats;
    s.acked++;
    const prev = s.rtt;
    s.rtt = rtt;
    this.win.push(rtt);
    if (this.win.length > 150) this.win.shift();
    s.avg = this.win.reduce((a, b) => a + b, 0) / this.win.length;
    s.min = Math.min(...this.win);
    s.max = Math.max(...this.win);
    if (prev) s.jitter += (Math.abs(rtt - prev) - s.jitter) / 16;
    s.history.push(rtt);
    if (s.history.length > 120) s.history.shift();
    this.samples.push({ t: Math.round(now - this.t0), seq, rtt: +rtt.toFixed(2), extra: this.cfg.extraDelay });
    if (this.samples.length > 20000) this.samples.shift();
  }

  /** se llama una vez por fotograma con los gestos locales */
  tick(local: InputState, now: number) {
    if (!this.ws || this.status !== 'open') return;
    // detectar paquetes perdidos (sin ACK tras 1.5 s)
    for (const [seq, ts] of this.pending) {
      if (now - ts > 1500) {
        this.pending.delete(seq);
        this.stats.lost++;
      }
    }
    const tot = this.stats.acked + this.stats.lost;
    this.stats.lossPct = tot ? (this.stats.lost / tot) * 100 : 0;

    if (now - this.lastPing > 1000) {
      this.lastPing = now;
      this.ws.send(JSON.stringify({ t: 'ping', ts: now }));
    }
    if (!this.cfg.send || now - this.lastSend < 33) return;
    this.lastSend = now;
    const seq = ++this.seq;
    const msg = JSON.stringify({
      t: 'in',
      seq,
      ts: now,
      s: {
        mx: +local.mx.toFixed(3),
        my: +local.my.toFixed(3),
        a: local.atk,
        sp: local.spc,
        c: local.cast,
        b: local.blink,
        r: local.sprint,
      },
    });
    this.stats.sent++;
    if (this.peers > 1) this.pending.set(seq, now);
    const ws = this.ws;
    const d = this.cfg.extraDelay;
    if (d > 0) setTimeout(() => ws.readyState === 1 && ws.send(msg), d);
    else ws.send(msg);
  }

  csv() {
    const rows = ['t_ms,seq,rtt_ms,oneway_est_ms,extra_delay_ms'];
    for (const s of this.samples) rows.push(`${s.t},${s.seq},${s.rtt},${(s.rtt / 2).toFixed(2)},${s.extra}`);
    return rows.join('\n');
  }
}
