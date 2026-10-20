// ───────────────────────────────────────────────────────────────
//  MediaPipe Pose Landmarker → controles de juego
//  Landmarks usados: nariz 0, hombros 11/12, muñecas 15/16,
//  codos 13/14, caderas 23/24.  Coordenadas x,y normalizadas 0‒1.
//  Se traducen con: espejo, suavizado exponencial, calibración,
//  umbrales con histéresis y zona muerta.
// ───────────────────────────────────────────────────────────────
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';

export interface PoseInput {
  present: boolean;
  mx: number;
  my: number;
  atk: boolean;
  spc: boolean;
  cast: boolean;
  blink: boolean;
  sprint: boolean;
}

export interface PoseConfig {
  range: number; // inclinación lateral para velocidad máxima (fracción de imagen)
  dead: number; // zona muerta 0‒0.6
  depth: number; // cambio relativo del ancho de hombros para velocidad máxima
  handRaise: number; // muñeca sobre el hombro (en anchos de hombro)
  swing: number; // velocidad de "golpe" (anchos de hombro / s)
  squat: number; // caída de la cabeza para esquivar (anchos de hombro)
  smooth: number; // 0.15 (muy suave) ‒ 1 (sin suavizado)
}

export const DEFAULT_POSE_CFG: PoseConfig = {
  range: 0.11,
  dead: 0.22,
  depth: 0.28,
  handRaise: 0.3,
  swing: 3.4,
  squat: 0.6,
  smooth: 0.55,
};

type LM = { x: number; y: number; z: number; visibility: number };

const BASE = (import.meta as any).env?.BASE_URL ?? '/';
const MP_VERSION = '1.1.1';
const SOURCES = [
  {
    wasm: `${BASE}mediapipe/wasm`,
    model: `${BASE}models/pose_landmarker_lite.task`,
  },
  {
    wasm: `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VERSION}/wasm`,
    model: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
  },
];

const CONNECTIONS: [number, number][] = [
  [11, 12],
  [11, 13],
  [13, 15],
  [12, 14],
  [14, 16],
  [11, 23],
  [12, 24],
  [23, 24],
  [23, 25],
  [24, 26],
];

const zero = (): PoseInput => ({ present: false, mx: 0, my: 0, atk: false, spc: false, cast: false, blink: false, sprint: false });
const dz = (v: number, d: number) => (Math.abs(v) < d ? 0 : Math.sign(v) * ((Math.abs(v) - d) / (1 - d)));
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export class PoseController {
  status: 'off' | 'loading' | 'ready' | 'error' = 'off';
  error = '';
  enabled = false;
  state: PoseInput = zero();
  cfg: PoseConfig = { ...DEFAULT_POSE_CFG };
  calibrated = false;
  calibProgress = 0; // 0‒1 mientras se calibra
  fps = 0;
  /** valores en vivo para mostrar en la interfaz */
  info = { lean: 0, depth: 0, raiseL: 0, raiseR: 0, drop: 0, swingL: 0, swingR: 0 };

  private landmarker: PoseLandmarker | null = null;
  private video: HTMLVideoElement;
  private stream: MediaStream | null = null;
  private raf = 0;
  private smoothLm: LM[] | null = null;
  private calib = { cx: 0.5, noseY: 0.3, sw: 0.25 };
  private acc: { until: number; n: number; cx: number; noseY: number; sw: number } | null = null;
  private preview: HTMLCanvasElement | null = null;
  private lastVideoTime = -1;
  private lUp = false;
  private rUp = false;
  private singleSince = 0;
  private blinkUntil = 0;
  private blinkCool = 0;
  private swingUntilL = 0;
  private swingUntilR = 0;
  private prevRel: { lx: number; ly: number; rx: number; ry: number; t: number } | null = null;
  private lastFpsT = 0;
  private frames = 0;
  private lastLandmarks: LM[] | null = null;

  constructor() {
    this.video = document.createElement('video');
    this.video.playsInline = true;
    this.video.muted = true;
  }

  attachPreview(c: HTMLCanvasElement | null) {
    this.preview = c;
  }

  async enable() {
    if (this.enabled) return;
    this.enabled = true;
    this.status = 'loading';
    this.error = '';
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false,
      });
      this.video.srcObject = this.stream;
      await this.video.play();
      if (!this.landmarker) this.landmarker = await this.createLandmarker();
      if (!this.enabled) return;
      this.status = 'ready';
      this.startCalibration();
      this.loop();
    } catch (e: any) {
      this.status = 'error';
      this.error =
        e?.name === 'NotAllowedError'
          ? 'Permiso de cámara denegado'
          : e?.name === 'NotFoundError'
            ? 'No se encontró ninguna cámara'
            : (e?.message ?? String(e));
      this.teardownStream();
      this.enabled = false;
    }
  }

  disable() {
    this.enabled = false;
    this.status = 'off';
    cancelAnimationFrame(this.raf);
    this.teardownStream();
    this.state = zero();
    this.smoothLm = null;
    this.lastLandmarks = null;
    this.clearPreview();
  }

  private teardownStream() {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.video.srcObject = null;
  }

  private async createLandmarker() {
    let lastErr: unknown = null;
    for (const src of SOURCES) {
      for (const delegate of ['GPU', 'CPU'] as const) {
        try {
          const vision = await FilesetResolver.forVisionTasks(src.wasm);
          return await PoseLandmarker.createFromOptions(vision, {
            baseOptions: { modelAssetPath: src.model, delegate },
            runningMode: 'VIDEO',
            numPoses: 1,
            minPoseDetectionConfidence: 0.5,
            minPosePresenceConfidence: 0.5,
            minTrackingConfidence: 0.5,
          });
        } catch (e) {
          lastErr = e;
        }
      }
    }
    throw new Error('No se pudo cargar MediaPipe: ' + ((lastErr as Error)?.message ?? lastErr));
  }

  /** Calibración: promedia la postura neutra (brazos abajo, de frente) ~1.6 s */
  startCalibration() {
    this.acc = { until: performance.now() + 1600, n: 0, cx: 0, noseY: 0, sw: 0 };
    this.calibProgress = 0;
  }

  private loop = () => {
    if (!this.enabled) return;
    this.raf = requestAnimationFrame(this.loop);
    const v = this.video;
    if (!this.landmarker || v.readyState < 2 || v.currentTime === this.lastVideoTime) return;
    this.lastVideoTime = v.currentTime;
    const now = performance.now();
    try {
      const res = this.landmarker.detectForVideo(v, now);
      const lm = res.landmarks?.[0] as LM[] | undefined;
      this.process(lm ?? null, now);
    } catch {
      /* frame fallido: ignorar */
    }
    this.frames++;
    if (now - this.lastFpsT > 1000) {
      this.fps = this.frames;
      this.frames = 0;
      this.lastFpsT = now;
    }
    this.drawPreview();
  };

  private process(raw: LM[] | null, now: number) {
    if (!raw) {
      this.state = zero();
      this.lastLandmarks = null;
      return;
    }
    const a = this.cfg.smooth;
    if (!this.smoothLm) this.smoothLm = raw.map((p) => ({ ...p }));
    else
      raw.forEach((p, i) => {
        const s = this.smoothLm![i];
        s.x += (p.x - s.x) * a;
        s.y += (p.y - s.y) * a;
        s.z += (p.z - s.z) * a;
        s.visibility = p.visibility;
      });
    const L = this.smoothLm;
    this.lastLandmarks = L;

    const ls = L[11],
      rs = L[12],
      nose = L[0],
      lw = L[15],
      rw = L[16];
    if (Math.min(ls.visibility, rs.visibility) < 0.4) {
      this.state = zero();
      return;
    }
    const mir = (p: LM) => 1 - p.x;
    const sw = Math.max(0.05, Math.abs(ls.x - rs.x));
    const cx = (mir(nose) + (mir(ls) + mir(rs)) / 2) / 2;

    // calibración
    if (this.acc) {
      const ac = this.acc;
      ac.n++;
      ac.cx += cx;
      ac.noseY += nose.y;
      ac.sw += sw;
      this.calibProgress = clamp(1 - (ac.until - now) / 1600, 0, 1);
      if (now >= ac.until && ac.n > 5) {
        this.calib = { cx: ac.cx / ac.n, noseY: ac.noseY / ac.n, sw: ac.sw / ac.n };
        this.acc = null;
        this.calibrated = true;
        this.calibProgress = 1;
      }
    }
    const cal = this.calib;
    const cfg = this.cfg;

    // movimiento
    const lean = (cx - cal.cx) / cfg.range;
    const depth = (sw / cal.sw - 1) / cfg.depth;
    const rawMx = dz(lean, cfg.dead);
    const rawMy = -dz(depth, cfg.dead);
    const mag = Math.hypot(rawMx, rawMy);
    const mx = this.acc ? 0 : clamp(rawMx, -1, 1);
    const my = this.acc ? 0 : clamp(rawMy, -1, 1);
    const sprint = mag > 1.35;

    // manos
    const raiseR = (rs.y - rw.y) / sw;
    const raiseL = (ls.y - lw.y) / sw;
    const th = cfg.handRaise;
    const rvis = rw.visibility > 0.3;
    const lvis = lw.visibility > 0.3;
    this.rUp = rvis && (this.rUp ? raiseR > th * 0.55 : raiseR > th);
    this.lUp = lvis && (this.lUp ? raiseL > th * 0.55 : raiseL > th);

    // golpe de brazo (velocidad de la muñeca relativa al hombro)
    let swingL = 0,
      swingR = 0;
    const rel = { lx: (lw.x - ls.x) / sw, ly: (lw.y - ls.y) / sw, rx: (rw.x - rs.x) / sw, ry: (rw.y - rs.y) / sw, t: now };
    if (this.prevRel) {
      const dt = Math.max(0.016, (now - this.prevRel.t) / 1000);
      swingL = Math.hypot(rel.lx - this.prevRel.lx, rel.ly - this.prevRel.ly) / dt;
      swingR = Math.hypot(rel.rx - this.prevRel.rx, rel.ry - this.prevRel.ry) / dt;
      if (rvis && swingR > cfg.swing && !this.acc) this.swingUntilR = now + 220;
      if (lvis && swingL > cfg.swing && !this.acc) this.swingUntilL = now + 220;
    }
    this.prevRel = rel;

    const both = this.rUp && this.lUp;
    const single = this.rUp !== this.lUp;
    if (single) {
      if (!this.singleSince) this.singleSince = now;
    } else this.singleSince = 0;
    const singleOk = single && now - this.singleSince > 110;

    let atk = (singleOk && this.rUp) || now < this.swingUntilR;
    let spc = (singleOk && this.lUp) || now < this.swingUntilL;
    const cast = both && !this.acc;
    if (cast) {
      atk = false;
      spc = false;
    }
    if (this.acc) {
      atk = false;
      spc = false;
    }

    // esquiva: agacharse o saltar (cabeza se desplaza verticalmente)
    const drop = (nose.y - cal.noseY) / sw;
    if (!this.acc && now > this.blinkCool && (drop > cfg.squat || drop < -cfg.squat * 0.85)) {
      this.blinkUntil = now + 160;
      this.blinkCool = now + 750;
    }
    const blink = now < this.blinkUntil;

    this.info = { lean, depth, raiseL, raiseR, drop, swingL, swingR };
    this.state = { present: true, mx, my, atk, spc, cast, blink, sprint };
  }

  private clearPreview() {
    const c = this.preview;
    if (!c) return;
    const g = c.getContext('2d');
    g?.clearRect(0, 0, c.width, c.height);
  }

  drawPreview() {
    const c = this.preview;
    if (!c) return;
    const g = c.getContext('2d');
    if (!g) return;
    const w = c.width,
      h = c.height;
    g.save();
    g.translate(w, 0);
    g.scale(-1, 1);
    if (this.video.readyState >= 2) g.drawImage(this.video, 0, 0, w, h);
    g.restore();
    g.fillStyle = 'rgba(2,10,12,0.35)';
    g.fillRect(0, 0, w, h);
    const L = this.lastLandmarks;
    // zona neutra
    const cxPx = this.calib.cx * w;
    const band = this.cfg.range * this.cfg.dead * w;
    g.fillStyle = 'rgba(80,255,200,0.12)';
    g.fillRect(cxPx - band, 0, band * 2, h);
    g.strokeStyle = 'rgba(80,255,200,0.55)';
    g.setLineDash([6, 6]);
    g.beginPath();
    g.moveTo(cxPx, 0);
    g.lineTo(cxPx, h);
    g.stroke();
    g.setLineDash([]);
    if (!L) return;
    const P = (i: number) => ({ x: (1 - L[i].x) * w, y: L[i].y * h });
    // líneas de umbral de manos (a la altura del hombro)
    const shY = ((L[11].y + L[12].y) / 2) * h;
    g.strokeStyle = 'rgba(255,210,74,0.6)';
    g.beginPath();
    g.moveTo(0, shY);
    g.lineTo(w, shY);
    g.stroke();
    g.lineWidth = 3;
    g.strokeStyle = this.state.cast ? '#58ff9b' : '#9be8ff';
    CONNECTIONS.forEach(([a, b]) => {
      if (L[a].visibility < 0.3 || L[b].visibility < 0.3) return;
      const A = P(a),
        B = P(b);
      g.beginPath();
      g.moveTo(A.x, A.y);
      g.lineTo(B.x, B.y);
      g.stroke();
    });
    [0, 11, 12, 13, 14, 15, 16, 23, 24].forEach((i) => {
      const p = P(i);
      g.beginPath();
      g.arc(p.x, p.y, i === 15 || i === 16 ? 7 : 4, 0, Math.PI * 2);
      g.fillStyle = i === 16 ? (this.state.atk ? '#4fc3ff' : '#ffffff') : i === 15 ? (this.state.spc ? '#ffd24a' : '#ffffff') : '#58ff9b';
      g.fill();
    });
    g.lineWidth = 1;
  }
}
