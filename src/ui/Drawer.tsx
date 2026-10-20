import { useEffect, useState } from 'react';
import { net, pose } from '../game/services';
import { DEFAULT_POSE_CFG } from '../game/pose';
import type { PoseConfig } from '../game/pose';

export type Tab = 'rules' | 'body' | 'net';

const TABS: { id: Tab; label: string }[] = [
  { id: 'rules', label: 'Jugar' },
  { id: 'body', label: 'Cámara' },
  { id: 'net', label: 'Red' },
];

function useTick(ms: number) {
  const [, set] = useState(0);
  useEffect(() => {
    const id = setInterval(() => set((n) => n + 1), ms);
    return () => clearInterval(id);
  }, [ms]);
}

const Divider = () => <div className="border-t border-white/10" />;

function Step({ code, action, hint, color }: { code: string; action: string; hint: string; color: string }) {
  return (
    <div className="min-w-0">
      <div className="font-title text-sm font-bold tracking-wide" style={{ color }}>
        {code}
      </div>
      <div className="text-base font-semibold text-[#e1ece9]">{action}</div>
      <div className="text-xs text-[#829692]">{hint}</div>
    </div>
  );
}

function RulesTab() {
  return (
    <div className="space-y-7 text-[#b8ccc8]">
      <section>
        <h3 className="font-title text-base font-bold tracking-wide text-gold">Conecta al enemigo</h3>
        <p className="mt-2 max-w-md text-sm leading-relaxed">
          Repite la secuencia sobre el mismo objetivo antes de que se vacíe su TTL. El estado aparece sobre su barra de vida.
        </p>
        <div className="mt-4 grid grid-cols-3 gap-3 border-y border-white/10 py-4">
          <Step code="SYN" action="Ataque" hint="J · clic izq." color="#4fc3ff" />
          <Step code="SYN-ACK" action="Especial" hint="K · clic der." color="#ffd24a" />
          <Step code="ACK" action="Conjuro" hint="L o Q" color="#58ff9b" />
        </div>
        <p className="mt-3 text-sm leading-relaxed text-[#d6e4e1]">
          <strong className="text-[#58ff9b]">ESTABLISHED</strong> rompe Firewall, hace daño triple y transmite una descarga. Mantén cualquier habilidad para su versión <strong className="text-gold">Omega</strong>.
        </p>
        <p className="mt-2 text-xs text-[#778d89]">Hécate te explica cada concepto con diálogos durante la partida. Avanza con E, Espacio o clic.</p>
      </section>

      <Divider />

      <section>
        <h3 className="font-title text-base font-bold tracking-wide text-gold">Controles</h3>
        <div className="mt-3 grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
          <div><span className="text-[#778d89]">Mover</span> <strong className="ml-2 text-[#e1ece9]">WASD / Flechas</strong></div>
          <div><span className="text-[#778d89]">Blink</span> <strong className="ml-2 text-[#e1ece9]">Espacio</strong></div>
          <div><span className="text-[#778d89]">Sprint</span> <strong className="ml-2 text-[#e1ece9]">Shift</strong></div>
          <div><span className="text-[#778d89]">Pausa</span> <strong className="ml-2 text-[#e1ece9]">Esc</strong></div>
          <div><span className="text-[#778d89]">Mando</span> <strong className="ml-2 text-[#e1ece9]">Sticks + X / Y / B / A</strong></div>
          <div><span className="text-[#778d89]">Cuerpo</span> <strong className="ml-2 text-[#e1ece9]">Menú Cámara</strong></div>
        </div>
      </section>

      <Divider />

      <section>
        <h3 className="font-title text-base font-bold tracking-wide text-gold">Ruta</h3>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm">
          <span><strong className="text-[#c2b6e8]">1–2 Érebo</strong> · aprendizaje</span>
          <span><strong className="text-[#7bd4be]">3–5 Océano</strong> · vapor</span>
          <span><strong className="text-[#e2a8b8]">6–8 Campos</strong> · miasma</span>
        </div>
      </section>
    </div>
  );
}

function Signal({ label, value, color }: { label: string; value: number; color: string }) {
  const width = `${Math.min(100, Math.max(0, value))}%`;
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-[#829692]"><span>{label}</span><span className="font-mono text-[#d8e5e2]">{value.toFixed(2)}</span></div>
      <div className="h-1.5 overflow-hidden bg-white/10"><div className="h-full" style={{ width, background: color }} /></div>
    </div>
  );
}

function Range({ label, prop, min, max, step, cfg, setCfg }: { label: string; prop: keyof PoseConfig; min: number; max: number; step: number; cfg: PoseConfig; setCfg: (k: keyof PoseConfig, v: number) => void }) {
  return (
    <label className="block">
      <span className="mb-1 flex justify-between text-xs text-[#a4b8b4]"><span>{label}</span><span className="font-mono text-gold">{cfg[prop].toFixed(2)}</span></span>
      <input type="range" min={min} max={max} step={step} value={cfg[prop]} onChange={(e) => setCfg(prop, parseFloat(e.target.value))} />
    </label>
  );
}

function BodyTab() {
  useTick(125);
  const [cfg, setCfg] = useState<PoseConfig>({ ...pose.cfg });
  const change = (key: keyof PoseConfig, value: number) => {
    pose.cfg[key] = value;
    setCfg({ ...pose.cfg });
  };
  const active = pose.enabled && pose.status === 'ready';
  const status = pose.status === 'error' ? pose.error : active ? `${pose.fps} FPS` : pose.status === 'loading' ? 'Cargando…' : 'Inactiva';
  const i = pose.info;

  return (
    <div className="space-y-6 text-[#b8ccc8]">
      <section>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-title text-base font-bold tracking-wide text-gold">Control por cuerpo</h3>
            <p className="mt-1 text-sm text-[#829692]">De frente, a 1.5–2 m. Mantén brazos abajo al calibrar.</p>
          </div>
          <span className={active ? 'text-sm text-[#73cfa8]' : 'text-sm text-[#a4b8b4]'}>{status}</span>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <button onClick={() => (pose.enabled ? pose.disable() : pose.enable())} className={`rounded border px-4 py-2 font-title text-xs font-bold tracking-wider transition ${pose.enabled ? 'border-red-400/60 text-red-300 hover:bg-red-400/10' : 'border-teal text-teal hover:bg-teal/10'}`}>
            {pose.enabled ? 'APAGAR' : 'ACTIVAR CÁMARA'}
          </button>
          <button disabled={!pose.enabled} onClick={() => pose.startCalibration()} className="rounded border border-white/20 px-3 py-2 text-xs font-semibold text-[#d8e5e2] hover:border-gold hover:text-gold disabled:opacity-30">
            Calibrar (C)
          </button>
        </div>
      </section>

      <Divider />

      <section>
        <div className="grid grid-cols-2 gap-x-7 gap-y-4">
          <Signal label="Inclinarte" value={(i.lean + 1.5) * 33} color="#3be0c8" />
          <Signal label="Brazo derecho · SYN" value={(i.raiseR + 0.5) * 50} color="#4fc3ff" />
          <Signal label="Brazo izquierdo · SYN-ACK" value={(i.raiseL + 0.5) * 50} color="#ffd24a" />
          <Signal label="Agacharse · Blink" value={(i.drop + 1) * 50} color="#58ff9b" />
        </div>
      </section>

      <details className="border-t border-white/10 pt-4">
        <summary className="cursor-pointer font-title text-sm font-bold tracking-wide text-[#d8e5e2] hover:text-gold">Ajustes avanzados</summary>
        <div className="mt-4 space-y-4">
          <Range label="Sensibilidad de inclinación" prop="range" min={0.06} max={0.25} step={0.01} cfg={cfg} setCfg={change} />
          <Range label="Manos arriba" prop="handRaise" min={0.1} max={0.7} step={0.02} cfg={cfg} setCfg={change} />
          <Range label="Suavizado de señal" prop="smooth" min={0.2} max={0.9} step={0.05} cfg={cfg} setCfg={change} />
          <button onClick={() => { Object.assign(pose.cfg, DEFAULT_POSE_CFG); setCfg({ ...pose.cfg }); }} className="text-xs text-[#829692] hover:text-gold">Restablecer valores</button>
        </div>
      </details>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div><div className="text-[10px] uppercase tracking-wide text-[#718582]">{label}</div><div className="font-mono text-base text-[#e1ece9]">{value}</div></div>;
}

function NetTab() {
  useTick(250);
  const [url, setUrl] = useState(net.cfg.url);
  const [room, setRoom] = useState(net.cfg.room);
  const [delay, setDelay] = useState(net.cfg.extraDelay);
  const on = net.status === 'open';
  const s = net.stats;

  const connect = () => {
    net.cfg.url = url.trim();
    net.cfg.room = room.trim() || 'telematica';
    net.connect();
  };

  const exportCsv = () => {
    const blob = new Blob([net.csv()], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `latencia_${net.cfg.room}_${Date.now()}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  return (
    <div className="space-y-6 text-[#b8ccc8]">
      <section>
        <h3 className="font-title text-base font-bold tracking-wide text-gold">Relay local</h3>
        <p className="mt-1 text-sm text-[#829692]">Ejecuta <code className="text-[#d8e5e2]">node server/relay.mjs</code> en un equipo y usa su IP en ambos portátiles.</p>
        <div className="mt-4 grid grid-cols-[1fr_120px] gap-2">
          <input className="min-w-0 border border-white/15 bg-black/30 px-2.5 py-2 font-mono text-xs text-white outline-none focus:border-gold" value={url} onChange={(e) => setUrl(e.target.value)} aria-label="URL del relay" />
          <input className="min-w-0 border border-white/15 bg-black/30 px-2.5 py-2 font-mono text-xs text-white outline-none focus:border-gold" value={room} onChange={(e) => setRoom(e.target.value)} aria-label="Sala" />
        </div>
        <div className="mt-3 flex items-center gap-3">
          <button onClick={on ? () => net.disconnect() : connect} className={`rounded border px-4 py-2 font-title text-xs font-bold tracking-wider ${on ? 'border-red-400/60 text-red-300' : 'border-teal text-teal'}`}>
            {on ? 'DESCONECTAR' : 'CONECTAR'}
          </button>
          <span className={on ? 'text-sm text-[#73cfa8]' : 'text-sm text-[#829692]'}>{on ? `${net.peers} en sala` : net.statusText || 'Sin conexión'}</span>
        </div>
        <div className="mt-3 flex gap-5 text-sm">
          <label className="flex cursor-pointer items-center gap-2"><input type="checkbox" checked={net.cfg.send} onChange={(e) => (net.cfg.send = e.target.checked)} /> Enviar mis gestos</label>
          <label className="flex cursor-pointer items-center gap-2"><input type="checkbox" checked={net.cfg.receive} onChange={(e) => (net.cfg.receive = e.target.checked)} /> Recibir remotos</label>
        </div>
      </section>

      <Divider />

      <section>
        <div className="grid grid-cols-4 gap-4">
          <Metric label="RTT" value={`${s.rtt.toFixed(0)} ms`} />
          <Metric label="Media" value={`${s.avg.toFixed(0)} ms`} />
          <Metric label="Jitter" value={`${s.jitter.toFixed(1)} ms`} />
          <Metric label="Pérdida" value={`${s.lossPct.toFixed(1)}%`} />
        </div>
        <div className="mt-5">
          <div className="mb-1 flex justify-between text-xs text-[#829692]"><span>Retardo artificial</span><span className="font-mono text-gold">{delay} ms</span></div>
          <input type="range" min={0} max={400} step={10} value={delay} onChange={(e) => { const v = Number(e.target.value); setDelay(v); net.cfg.extraDelay = v; }} />
        </div>
        <div className="mt-4 flex items-center justify-between text-xs">
          <button disabled={!net.samples.length} onClick={exportCsv} className="text-[#d8e5e2] hover:text-gold disabled:opacity-30">Exportar CSV ({net.samples.length})</button>
          <span className="text-[#718582]">Wireshark: <code>websocket</code></span>
        </div>
      </section>
    </div>
  );
}

export default function Drawer({ tab, setTab, onClose }: { tab: Tab; setTab: (t: Tab) => void; onClose: () => void }) {
  return (
    <div className="pointer-events-auto fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col border-l border-white/10 bg-[#070b0e]/98 shadow-2xl backdrop-blur-lg">
      <header className="flex items-center justify-between px-6 py-5">
        <div className="font-title text-base font-bold tracking-wider text-gold-bright">MENÚ</div>
        <button className="text-xs font-semibold text-[#a4b8b4] hover:text-gold" onClick={onClose}>Cerrar (Esc)</button>
      </header>
      <nav className="flex border-y border-white/10">
        {TABS.map((t) => <button key={t.id} onClick={() => setTab(t.id)} className={`flex-1 py-3 font-title text-xs font-bold tracking-wider ${tab === t.id ? 'border-b-2 border-gold bg-white/5 text-gold' : 'text-[#829692] hover:text-white'}`}>{t.label}</button>)}
      </nav>
      <main className="scroll-thin flex-1 overflow-y-auto p-6">
        {tab === 'rules' && <RulesTab />}
        {tab === 'body' && <BodyTab />}
        {tab === 'net' && <NetTab />}
      </main>
    </div>
  );
}