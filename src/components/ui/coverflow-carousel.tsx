// Carrossel em "coverflow": as cartas giram em 3D em volta da carta central.
// Componente de interface puro — recebe os slides por prop.
//
// Diferenças em relação ao original: sem "use client" (aqui é Vite, não Next)
// e sem o comentário de eslint do next/image.
import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { cn } from '@/lib/utils';

const useIsoLayoutEffect =
  typeof window !== 'undefined' ? React.useLayoutEffect : React.useEffect;

export interface CoverflowSlide {
  src: string;
  alt: string;
  title?: string;
  subtitle?: string;
  href?: string;
  meta?: { label: string; value: string }[];
}

export interface CoverflowCarouselProps {
  slides: CoverflowSlide[];
  /** Graus que o primeiro vizinho inclina. */
  rotate?: number;
  /** O quanto o primeiro vizinho recua, em fração da largura da carta. */
  depth?: number;
  /** Distância do observador, em múltiplos da largura da carta. */
  perspective?: number;
  /** Expoente da distância. Abaixo de 1 a inclinação cede conforme afasta. */
  falloff?: number;
  /** Opacidade perdida a cada passo a partir do centro. */
  fade?: number;
  /** Qualquer medida CSS. Todo o resto deriva dela. */
  cardWidth?: string;
  /** Espaço entre cartas, em fração da largura. */
  gap?: number;
  loop?: boolean;
  showCaption?: boolean;
  showPagination?: boolean;
  showNavigation?: boolean;
  /** Clique na carta central. */
  onOpen?: (slide: CoverflowSlide, index: number) => void;
  /** Nomeia o carrossel para leitores de tela. */
  label?: string;
  className?: string;
  cardClassName?: string;
}

export function CoverflowCarousel({
  slides,
  rotate = 44,
  depth = 0.6,
  perspective = 3,
  falloff = 0.56,
  fade = 0.1,
  cardWidth = 'clamp(148px, 22vw, 260px)',
  gap = 0.05,
  loop = true,
  showCaption = false,
  showPagination = false,
  showNavigation = false,
  onOpen,
  label = 'Carrossel',
  className,
  cardClassName,
}: CoverflowCarouselProps) {
  const count = slides.length;

  const frameRef = React.useRef<HTMLDivElement>(null);
  const cardRefs = React.useRef<(HTMLDivElement | null)[]>([]);
  /** Índice fracionário da carta no centro. É a fonte única de verdade. */
  const posRef = React.useRef(0);
  /** Para onde a acomodação atual está indo. */
  const targetRef = React.useRef(0);
  const widthRef = React.useRef(0);
  const rafRef = React.useRef<number | null>(null);
  const dragRef = React.useRef<{
    id: number;
    x: number;
    pos: number;
    v: number;
    t: number;
    moveu: boolean;
  } | null>(null);

  const [selected, setSelected] = React.useState(0);

  /** Carta inteira mais próxima, dobrada de volta em 0..count-1. */
  const indexAt = React.useCallback(
    (pos: number) => ((Math.round(pos) % count) + count) % count,
    [count],
  );

  // Pinta direto no DOM: sessenta atualizações de estado por segundo
  // re-renderizariam todas as cartas por números que o React nunca precisa ver.
  const paint = React.useCallback(() => {
    const width = widthRef.current;
    if (!width) return;
    const pitch = width * (1 + gap);
    const pos = posRef.current;

    cardRefs.current.forEach((card, index) => {
      if (!card) return;

      // Dobra a distância pelo caminho mais curto do anel. É todo o mecanismo
      // de laço — sem clonar nós nem embaralhar o DOM.
      let offset = index - pos;
      if (loop) {
        offset = ((offset % count) + count) % count;
        if (offset > count / 2) offset -= count;
      }

      const distance = Math.abs(offset);
      // A inclinação e o recuo cedem conforme a carta afasta: dobrar a
      // distância acrescenta só cerca de metade de cada um. Uma rampa linear
      // fecharia a segunda carta; assim ela continua legível.
      const ramp = Math.pow(distance, falloff);
      // Limitada antes do perfil para que a carta distante nunca vire de costas.
      const tilt = Math.min(rotate * ramp, 82) * Math.sign(offset);

      card.style.transform =
        `translateX(calc(-50% + ${offset * pitch}px)) ` +
        `translateZ(${-depth * width * ramp}px) rotateY(${-tilt}deg)`;

      // A carta é teleportada para o outro lado do anel a meia volta exata, e
      // por isso precisa ter sumido antes — senão o salto aparece.
      const edge = loop ? Math.min(1, Math.max(0, count / 2 - distance)) : 1;
      card.style.opacity = String(Math.max(0, 1 - fade * distance) * edge);
      card.style.zIndex = String(100 - Math.round(distance));
    });
  }, [count, depth, fade, falloff, gap, loop, rotate]);

  const settle = React.useCallback(
    (target: number) => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      targetRef.current = target;
      setSelected(indexAt(target));

      const step = () => {
        const remaining = target - posRef.current;
        if (Math.abs(remaining) < 0.0004) {
          posRef.current = target;
          paint();
          rafRef.current = null;
          return;
        }
        posRef.current += remaining * 0.16;
        paint();
        rafRef.current = requestAnimationFrame(step);
      };
      rafRef.current = requestAnimationFrame(step);
    },
    [indexAt, paint],
  );

  const clamp = React.useCallback(
    (pos: number) => (loop ? pos : Math.max(0, Math.min(count - 1, pos))),
    [count, loop],
  );

  const goTo = React.useCallback(
    (index: number) => {
      // Vai pelo caminho mais curto em vez de desenrolar o anel inteiro.
      const target = loop
        ? index + Math.round((targetRef.current - index) / count) * count
        : index;
      settle(clamp(target));
    },
    [clamp, count, loop, settle],
  );

  const nudge = React.useCallback(
    (by: number) => settle(clamp(Math.round(targetRef.current) + by)),
    [clamp, settle],
  );

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    targetRef.current = posRef.current;
    dragRef.current = {
      id: event.pointerId,
      x: event.clientX,
      pos: posRef.current,
      v: 0,
      t: performance.now(),
      moveu: false,
    };
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.id !== event.pointerId) return;

    const pitch = widthRef.current * (1 + gap);
    if (!pitch) return;

    if (Math.abs(event.clientX - drag.x) > 4) drag.moveu = true;
    const now = performance.now();
    const previous = posRef.current;
    posRef.current = clamp(drag.pos - (event.clientX - drag.x) / pitch);
    // Cartas por segundo, para o arremesso.
    drag.v = ((posRef.current - previous) / Math.max(now - drag.t, 1)) * 1000;
    drag.t = now;

    const index = indexAt(posRef.current);
    if (index !== selected) setSelected(index);
    paint();
  };

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.id !== event.pointerId) return;
    dragRef.current = null;
    // Deixa o arremesso correr, mas nunca mais que duas cartas.
    const carried = Math.max(-2, Math.min(2, drag.v * 0.18));
    settle(clamp(Math.round(posRef.current + carried)));
  };

  // A largura da carta comanda passo, profundidade e perspectiva: é a única
  // coisa que vale medir, e só quando a caixa muda.
  useIsoLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;

    const measure = () => {
      const card = cardRefs.current[0];
      if (!card) return;
      widthRef.current = card.offsetWidth;
      paint();
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    return () => observer.disconnect();
  }, [paint]);

  React.useEffect(
    () => () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    },
    [],
  );

  const active = slides[selected];

  return (
    <div
      className={cn('w-full', className)}
      style={{ ['--cf-card' as string]: cardWidth }}
      role="region"
      aria-roledescription="carousel"
      aria-label={label}
    >
      <div className="relative">
        <div
          ref={frameRef}
          tabIndex={0}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onKeyDown={(event) => {
            if (event.key === 'ArrowLeft') {
              event.preventDefault();
              nudge(-1);
            } else if (event.key === 'ArrowRight') {
              event.preventDefault();
              nudge(1);
            }
          }}
          // A folga vertical mantém as sombras fora do corte do overflow.
          className="ring-ring cursor-grab overflow-hidden py-10 outline-none focus-visible:ring-2 active:cursor-grabbing"
          style={{
            perspective: `calc(var(--cf-card) * ${perspective})`,
            // O arrasto horizontal é nosso; a página segue rolando na vertical.
            touchAction: 'pan-y',
          }}
        >
          <div
            className="relative select-none"
            style={{ height: 'var(--cf-card)', transformStyle: 'preserve-3d' }}
          >
            {slides.map((slide, index) => (
              <div
                key={index}
                ref={(node) => {
                  cardRefs.current[index] = node;
                }}
                role="group"
                aria-roledescription="slide"
                aria-label={`${index + 1} de ${count}`}
                onClick={() => {
                  if (dragRef.current?.moveu) return;
                  if (index === selected) onOpen?.(slide, index);
                  else goTo(index);
                }}
                className={cn(
                  'bg-muted absolute top-0 left-1/2 aspect-square overflow-hidden rounded-2xl shadow-xl will-change-transform',
                  cardClassName,
                )}
                style={{ width: 'var(--cf-card)' }}
              >
                <img
                  src={slide.src}
                  alt={slide.alt}
                  draggable={false}
                  className="h-full w-full object-cover select-none"
                />
              </div>
            ))}
          </div>
        </div>

        {showNavigation && (
          <>
            <button
              type="button"
              aria-label="Anterior"
              onClick={() => nudge(-1)}
              className="bg-background/70 text-foreground hover:bg-background absolute top-1/2 left-3 z-[200] -translate-y-1/2 rounded-full p-2 backdrop-blur transition"
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              type="button"
              aria-label="Próximo"
              onClick={() => nudge(1)}
              className="bg-background/70 text-foreground hover:bg-background absolute top-1/2 right-3 z-[200] -translate-y-1/2 rounded-full p-2 backdrop-blur transition"
            >
              <ChevronRight className="size-5" />
            </button>
          </>
        )}
      </div>

      {showCaption && active?.title && (
        <div
          key={selected}
          className="animate-in fade-in mt-2 flex flex-col items-center px-6 duration-300"
        >
          <p className="text-foreground text-[15px] font-semibold tracking-tight">{active.title}</p>
          {active.subtitle && (
            <p className="text-muted-foreground mt-1 text-[13px]">{active.subtitle}</p>
          )}
        </div>
      )}

      {showPagination && (
        <div className="mt-6 flex items-center justify-center gap-2">
          {slides.map((_, index) => (
            <button
              key={index}
              type="button"
              aria-label={`Ir para ${index + 1}`}
              aria-current={index === selected}
              onClick={() => goTo(index)}
              className={cn(
                'bg-foreground size-2 rounded-full transition-opacity',
                index === selected ? 'opacity-100' : 'opacity-30',
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
