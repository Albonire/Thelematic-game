import { useCallback, useEffect, useRef, useState } from 'react';
import { createGame } from './game/createGame';
import { bus } from './game/bus';
import { flags, sfx, pose } from './game/services';
import Drawer from './ui/Drawer';
import type { Tab } from './ui/Drawer';
import CamWindow from './ui/CamWindow';

const titleBg = `${import.meta.env.BASE_URL}images/title-bg.jpg`;

export default function App() {
  const host = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(flags.ready);
  const [started, setStarted] = useState(false);
  const [title, setTitle] = useState(true);
  const [drawer, setDrawer] = useState<Tab | null>(null);
  const [muted, setMuted] = useState(false);
  const [camOn, setCamOn] = useState(false);
  const startedRef = useRef(false);
  const drawerRef = useRef<Tab | null>(null);
  startedRef.current = started;
  drawerRef.current = drawer;

  useEffect(() => {
    const off = bus.on('ready', () => setReady(true));
    const game = createGame(host.current!);
    const id = setInterval(() => setCamOn(pose.enabled), 250);
    return () => {
      off();
      clearInterval(id);
      game.destroy(true);
    };
  }, []);

  const openDrawer = useCallback((t: Tab) => {
    setDrawer(t);
    if (startedRef.current) bus.emit('pause', true);
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawer(null);
    if (startedRef.current) bus.emit('pause', false);
  }, []);

  const start = () => {
    if (!ready) return;
    sfx.init();
    bus.emit('start');
    setStarted(true);
    setTitle(false);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing = !!t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName);
      if (e.code === 'Escape' || (e.code === 'KeyP' && !typing)) {
        if (!startedRef.current && !drawerRef.current) return;
        if (drawerRef.current) closeDrawer();
        else openDrawer('rules');
      } else if (e.code === 'KeyC' && !typing && pose.enabled) {
        pose.startCalibration();
      } else if (e.code === 'KeyM' && !typing) {
        setMuted((m) => {
          sfx.setMuted(!m);
          return !m;
        });
      }
    };
    window.addEventListener('keydown', onKey);
    const off = bus.on('togglePause', () => {
      if (!startedRef.current) return;
      if (drawerRef.current) closeDrawer();
      else openDrawer('rules');
    });
    return () => {
      window.removeEventListener('keydown', onKey);
      off();
    };
  }, [openDrawer, closeDrawer]);

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#030608] font-ui select-none">
      <div ref={host} className="absolute inset-0" />

      {/* ───── Pantalla de inicio sobria y atmosférica ───── */}
      {title && (
        <div className="absolute inset-0 z-40 flex flex-col justify-between p-8 md:p-14">
          {/* Fondo ilustrado con veladuras oscuras */}
          <img
            src={titleBg}
            alt=""
            className="absolute inset-0 h-full w-full object-cover -z-10 opacity-70 filter brightness-[0.85] contrast-[1.1]"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#030608]/95 via-[#030608]/75 to-transparent -z-10" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#030608] via-transparent to-[#030608]/40 -z-10" />

          {/* Encabezado superior */}
          <div className="flex items-center justify-between text-xs tracking-[0.18em] text-[#a4b8b4]">
            <span className="font-semibold uppercase text-gold">FLA-23 · GameJam de Telemática</span>
            <span className="hidden sm:inline">Phaser 3 / MediaPipe / WebSocket</span>
          </div>

          {/* Cuerpo principal */}
          <div className="max-w-xl my-auto space-y-5">
            <div>
              <h1 className="font-title text-6xl md:text-8xl font-black tracking-wider text-gold-bright drop-shadow-md">
                HADES <span className="text-[#8997a3] font-light text-5xl md:text-7xl">II</span>
              </h1>
              <div className="font-title text-lg md:text-xl font-bold tracking-[0.18em] text-[#c9b78a] mt-1">
                PROTOCOLO DEL INFRAMUNDO
              </div>
            </div>

            <p className="max-w-md text-base md:text-lg text-[#b8ccc8] leading-relaxed font-medium">
              Tres regiones. Un protocolo. Conecta cada enemigo antes de que expire su TTL.
            </p>

            <div className="flex items-center gap-2 font-title text-sm tracking-wide">
              <span className="text-syn">SYN</span>
              <span className="text-[#697c78]">Ataque</span>
              <span className="text-[#6d756f]">→</span>
              <span className="text-synack">SYN-ACK</span>
              <span className="text-[#697c78]">Especial</span>
              <span className="text-[#6d756f]">→</span>
              <span className="text-ack">ACK</span>
              <span className="text-[#697c78]">Conjuro</span>
            </div>

            {/* Fila compacta de botones principales */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                disabled={!ready}
                onClick={start}
                className="px-8 py-3.5 bg-gradient-to-b from-[#2e2617] to-[#141008] border border-gold text-gold-bright font-title font-bold text-lg tracking-[0.15em] rounded transition hover:border-gold-bright hover:bg-[#2e2617] active:scale-[0.98] disabled:opacity-40 cursor-pointer shadow-lg shadow-black/60"
              >
                {ready ? 'COMENZAR DESCENSO' : 'CARGANDO RECURSOS…'}
              </button>

              <button
                onClick={() => openDrawer('rules')}
                className="px-4 py-3 bg-[#0a0f12]/80 border border-white/15 text-[#cfe2de] hover:border-gold/60 hover:text-gold font-title text-xs tracking-wider rounded transition cursor-pointer"
              >
                CÓMO JUGAR
              </button>

              <button
                onClick={() => openDrawer('body')}
                className="px-3 py-3 text-[#8fa3a0] hover:text-gold text-xs font-semibold transition cursor-pointer"
              >
                Configurar cámara o red
              </button>
            </div>
          </div>

          {/* Pie de controles sutil */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-[#7e9390] pt-4 border-t border-white/10 font-medium">
            <span>WASD para moverte</span>
            <span>J / K / L para el protocolo</span>
            <span>Espacio para Blink</span>
            <span>Esc para el menú</span>
          </div>
        </div>
      )}

      {/* ───── Barra flotante mínima in-game ───── */}
      {started && !drawer && (
        <div className="pointer-events-auto fixed bottom-3 right-4 z-30 flex items-center gap-2 font-ui text-xs font-semibold">
          <button
            className="rounded border border-white/15 bg-[#070b0e]/80 px-2.5 py-1 text-[#a4b8b4] hover:text-[#dce7e4] hover:border-white/30 transition cursor-pointer"
            onClick={() => {
              setMuted(!muted);
              sfx.setMuted(!muted);
            }}
          >
            {muted ? 'Audio desactivado' : 'Audio activo'}
          </button>
          <button
            className="rounded border border-gold/40 bg-[#16120b]/90 px-3 py-1 text-gold hover:border-gold transition cursor-pointer font-bold"
            onClick={() => openDrawer('rules')}
          >
            Menú (Esc)
          </button>
        </div>
      )}

      {camOn && <CamWindow />}

      {drawer && <Drawer tab={drawer} setTab={(t) => setDrawer(t)} onClose={closeDrawer} />}
    </div>
  );
}
