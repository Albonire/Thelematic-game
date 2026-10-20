import { useEffect, useRef, useState } from 'react';
import { pose } from '../game/services';

/** Ventana flotante de depuración de postura y cámara */
export default function CamWindow() {
  const ref = useRef<HTMLCanvasElement>(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    pose.attachPreview(ref.current);
    const id = setInterval(() => setTick((t) => t + 1), 100);
    return () => {
      pose.attachPreview(null);
      clearInterval(id);
    };
  }, []);

  const s = pose.state;
  const status =
    pose.status === 'loading'
      ? 'Cargando MediaPipe…'
      : pose.status === 'error'
        ? pose.error
        : pose.calibProgress < 1
          ? `Calibrando ${Math.round(pose.calibProgress * 100)}%`
          : s.present
            ? `${pose.fps} fps · OK`
            : 'Esperando silueta';

  const indicatorClass = (active: boolean, colorClass: string) =>
    `rounded px-1.5 py-0.5 text-center transition font-bold ${
      active ? `${colorClass} text-black font-extrabold shadow-sm` : 'bg-white/5 text-[#738582]'
    }`;

  return (
    <div className="pointer-events-auto fixed bottom-14 right-4 z-30 w-64 overflow-hidden rounded border border-white/15 bg-[#070b0e]/95 shadow-xl backdrop-blur-md">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-1.5 font-title text-[11px] tracking-wider text-gold">
        <span>CÁMARA / POSTURA</span>
        <span className="font-ui text-[11px] tracking-normal text-[#96a8a5]">{status}</span>
      </div>

      <canvas ref={ref} width={256} height={192} className="w-full bg-[#030608]" />

      <div className="grid grid-cols-4 gap-1 p-2 font-ui text-[10px]">
        <span className={indicatorClass(s.atk, 'bg-syn')}>SYN</span>
        <span className={indicatorClass(s.spc, 'bg-synack')}>SYN-ACK</span>
        <span className={indicatorClass(s.cast, 'bg-ack')}>ACK</span>
        <span className={indicatorClass(s.blink, 'bg-teal')}>BLINK</span>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-white/5 px-2 py-1.5 font-ui text-[11px]">
        <div className="relative h-1.5 flex-1 overflow-hidden rounded bg-white/10">
          <div
            className="absolute top-0 h-full w-2 -translate-x-1/2 rounded bg-gold"
            style={{ left: `${50 + s.mx * 50}%` }}
          />
          <div className="absolute left-1/2 top-0 h-full w-px bg-white/30" />
        </div>
        <button
          className="rounded border border-white/20 px-2 py-0.5 text-xs text-[#cfe2de] hover:border-gold hover:text-gold cursor-pointer"
          onClick={() => pose.startCalibration()}
          title="Recalibrar postura neutra (tecla C)"
        >
          Calibrar (C)
        </button>
        <button
          className="rounded px-1.5 py-0.5 text-xs text-[#bf7878] hover:text-[#e08989] cursor-pointer"
          onClick={() => pose.disable()}
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}
