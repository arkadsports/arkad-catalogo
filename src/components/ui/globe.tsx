// Globo WebGL (biblioteca cobe). Componente de interface puro: recebe a
// configuração por prop e não sabe nada de catálogo.
//
// Diferenças em relação ao original:
//   - sem "use client" (aqui é Vite, não Next);
//   - phi e width viram refs — no original eram variáveis soltas no corpo do
//     componente, que voltavam a zero a cada render;
//   - o listener de resize é removido no cleanup;
//   - o globo é recriado quando a configuração muda.
import createGlobe, { type COBEOptions } from 'cobe';
import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

/** O cobe aceita `onRender` (é o que faz o globo girar), mas o tipo que ele
 *  publica na versão 2.0.1 não declara o campo. Estendemos aqui em vez de
 *  silenciar com `any`. */
export type GlobeConfig = COBEOptions & {
  onRender?: (state: Record<string, unknown>) => void;
};

const GLOBE_CONFIG: GlobeConfig = {
  width: 800,
  height: 800,
  onRender: () => {},
  devicePixelRatio: 2,
  phi: 0,
  theta: 0.3,
  dark: 0,
  diffuse: 0.4,
  mapSamples: 16000,
  mapBrightness: 1.2,
  baseColor: [1, 1, 1],
  markerColor: [251 / 255, 100 / 255, 21 / 255],
  glowColor: [1, 1, 1],
  markers: [],
};

export function Globe({
  className,
  config = GLOBE_CONFIG,
}: {
  className?: string;
  config?: GlobeConfig;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const phi = useRef(0);
  const width = useRef(0);
  const pointerInteracting = useRef<number | null>(null);
  const pointerInteractionMovement = useRef(0);
  const [r, setR] = useState(0);

  const updatePointerInteraction = (value: number | null) => {
    pointerInteracting.current = value;
    if (canvasRef.current) canvasRef.current.style.cursor = value ? 'grabbing' : 'grab';
  };

  const updateMovement = (clientX: number) => {
    if (pointerInteracting.current !== null) {
      const delta = clientX - pointerInteracting.current;
      pointerInteractionMovement.current = delta;
      setR(delta / 200);
    }
  };

  const onRender = useCallback(
    (state: Record<string, unknown>) => {
      if (!pointerInteracting.current) phi.current += 0.005;
      state.phi = phi.current + r;
      state.width = width.current * 2;
      state.height = width.current * 2;
    },
    [r],
  );

  useEffect(() => {
    const onResize = () => {
      if (canvasRef.current) width.current = canvasRef.current.offsetWidth;
    };
    window.addEventListener('resize', onResize);
    onResize();

    const globe = createGlobe(canvasRef.current!, {
      ...config,
      width: width.current * 2,
      height: width.current * 2,
      onRender,
    } as GlobeConfig as COBEOptions);

    const t = setTimeout(() => {
      if (canvasRef.current) canvasRef.current.style.opacity = '1';
    });
    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', onResize);
      globe.destroy();
    };
    // Recria o globo só quando a configuração muda; o giro vive no onRender.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config]);

  return (
    <div className={cn('absolute inset-0 mx-auto aspect-[1/1] w-full max-w-[600px]', className)}>
      <canvas
        className="size-full opacity-0 transition-opacity duration-500 [contain:layout_paint_size]"
        ref={canvasRef}
        onPointerDown={(e) =>
          updatePointerInteraction(e.clientX - pointerInteractionMovement.current)
        }
        onPointerUp={() => updatePointerInteraction(null)}
        onPointerOut={() => updatePointerInteraction(null)}
        onMouseMove={(e) => updateMovement(e.clientX)}
        onTouchMove={(e) => e.touches[0] && updateMovement(e.touches[0].clientX)}
      />
    </div>
  );
}
