// Galeria "sanfona": os painéis dividem o espaço entre si e o ativo se abre.
// Componente de interface puro — não conhece o catálogo. Quem liga os dois é
// components/CountryGallery.tsx.
//
// Diferenças em relação ao original (que era para Next.js):
//   - <Image> do next/image virou <img> comum (aqui é Vite, não Next);
//   - os itens chegam por props, em vez de ficarem escritos no arquivo;
//   - a faixa rola quando há muitos itens (19 países não cabem lado a lado);
//   - cada painel é <button>, para abrir pelo teclado também.
import {
  useCallback, useEffect, useRef, useState,
  type KeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode,
} from 'react';
import { ArrowUpRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ElasticItem {
  id: string;
  title: string;
  /** Etiqueta pequena acima do título. Ex.: "42 clubes". */
  category: string;
  src: string;
  alt: string;
  /** Selo ao lado do título (aqui: a bandeira) e reserva se a imagem falhar. */
  badge?: ReactNode;
  /** Versão pequena do selo, para o painel fechado — onde a imagem de fundo
   *  aparece cortada numa faixa estreita e sozinha não identifica o país. */
  icon?: ReactNode;
  /** Linha extra embaixo do título. Ex.: "1.225 modelos". */
  meta?: string;
  /** Texto do botão do painel aberto. */
  cta?: string;
}

interface ElasticGalleryProps {
  items: ElasticItem[];
  /** Controlado: o id do painel aberto. */
  activeId?: string | null;
  /** Não controlado: qual abre primeiro. */
  defaultActiveId?: string | null;
  onActiveChange?: (id: string) => void;
  /** Clique no painel que já está aberto (ou Enter). */
  onOpen?: (item: ElasticItem) => void;
  label: string;
  className?: string;
}

function ElasticGallery({
  items,
  activeId: controlledId,
  defaultActiveId,
  onActiveChange,
  onOpen,
  label,
  className,
}: ElasticGalleryProps) {
  const [uncontrolledId, setUncontrolledId] = useState<string | null>(
    defaultActiveId ?? items[0]?.id ?? null,
  );
  const activeId = controlledId !== undefined ? controlledId : uncontrolledId;
  // Bandeiras que não carregaram: caem para o emoji.
  const [failed, setFailed] = useState<ReadonlySet<string>>(() => new Set());

  const activate = (id: string) => {
    if (id === activeId) return;
    if (controlledId === undefined) setUncontrolledId(id);
    onActiveChange?.(id);
  };

  // Primeiro toque/clique abre o painel; o segundo abre o país.
  const click = (item: ElasticItem) => {
    if (item.id === activeId) onOpen?.(item);
    else activate(item.id);
  };

  // No mouse, passar por cima já abre o painel. No toque, não: lá o pointerenter
  // vem junto com o clique e abriria o país sem o cliente querer.
  const pointerEnter = (e: ReactPointerEvent<HTMLButtonElement>, id: string) => {
    if (e.pointerType === 'mouse') activate(id);
  };

  // Tab abre o painel em foco — mas só no foco por teclado, não no toque.
  const focus = (e: { currentTarget: HTMLButtonElement }, id: string) => {
    if (e.currentTarget.matches(':focus-visible')) activate(id);
  };

  // A faixa é mais larga que a tela, mas a roda do mouse NÃO a rola: quem
  // desce a página passando por cima dela continua descendo a página. Andar
  // de lado é só pelas setas — ou arrastando, no celular.
  const strip = useRef<HTMLDivElement>(null);
  const [podeVoltar, setPodeVoltar] = useState(false);
  const [podeAvancar, setPodeAvancar] = useState(false);

  const medirPontas = useCallback(() => {
    const el = strip.current;
    if (!el) return;
    setPodeVoltar(el.scrollLeft > 4);
    setPodeAvancar(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  useEffect(() => {
    const el = strip.current;
    if (!el) return;
    medirPontas();
    el.addEventListener('scroll', medirPontas, { passive: true });
    const obs = new ResizeObserver(medirPontas);
    obs.observe(el);
    return () => {
      el.removeEventListener('scroll', medirPontas);
      obs.disconnect();
    };
  }, [medirPontas, items.length]);

  const andar = (dir: 1 | -1) => {
    const el = strip.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.round(el.clientWidth * 0.7), behavior: 'smooth' });
  };

  const keyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1
      : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = items[(index + step + items.length) % items.length];
    activate(next.id);
    document.getElementById(`elastic-${next.id}`)?.focus();
  };

  return (
    <div className="relative">
      <div
        ref={strip}
        role="group"
        aria-label={label}
        className={cn(
          // Altura fixa: é o que mantém a animação estável enquanto os painéis
          // abrem. Rola só na horizontal, e só pelas setas ou pelo arrasto.
          'flex h-[260px] w-full flex-row gap-2 overflow-x-auto overflow-y-hidden',
          'md:h-[340px] md:gap-3',
          'snap-x scroll-px-2 md:scroll-px-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
          className,
        )}
      >
      {items.map((item, index) => {
        const active = activeId === item.id;
        const broken = failed.has(item.id);
        return (
          <button
            key={item.id}
            id={`elastic-${item.id}`}
            type="button"
            aria-pressed={active}
            onPointerEnter={(e) => pointerEnter(e, item.id)}
            onFocus={(e) => focus(e, item.id)}
            onClick={() => click(item)}
            onKeyDown={(e) => keyDown(e, index)}
            className={cn(
              'group relative m-0 shrink-0 cursor-pointer appearance-none snap-start overflow-hidden rounded-2xl p-0 text-left',
              'border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950',
              // A transição de "flex" é o que produz o efeito sanfona.
              'transition-[flex,min-width,filter] duration-700 ease-[cubic-bezier(0.25,1,0.5,1)]',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white',
              // Aberto: 4 partes do espaço. Fechado: 1 parte.
              active ? 'flex-[4]' : 'flex-[1]',
              // Largura mínima: com muitos países a faixa rola em vez de espremer.
              active ? 'min-w-[230px] md:min-w-[280px]' : 'min-w-[54px] md:min-w-[62px]',
              // Fechado escurece, mas não tanto: a bandeira precisa continuar
              // reconhecível — é por ela que o cliente escolhe.
              active ? 'brightness-100' : 'brightness-[.62] saturate-125 hover:brightness-90',
            )}
          >
            {/* Fundo: a bandeira */}
            <div className="absolute inset-0 h-full w-full">
              {broken ? (
                <div className="flex h-full w-full items-center justify-center bg-neutral-900 text-5xl">
                  <span aria-hidden="true">{item.badge ?? '🏳️'}</span>
                </div>
              ) : (
                <img
                  src={item.src}
                  alt={item.alt}
                  loading={index < 6 ? 'eager' : 'lazy'}
                  decoding="async"
                  onError={() => {
                    setFailed((antes) => (antes.has(item.id) ? antes : new Set(antes).add(item.id)));
                  }}
                  className={cn(
                    'absolute inset-0 h-full w-full object-cover transition-transform duration-1000',
                    active ? 'scale-100' : 'scale-110',
                  )}
                />
              )}
              {/* Escurecido embaixo, para o texto ficar legível */}
              <div
                className={cn(
                  'absolute inset-0 bg-linear-to-t from-black/85 via-black/30 to-transparent transition-opacity duration-500',
                  active ? 'opacity-100' : 'opacity-0',
                )}
              />
            </div>

            {/* --- Conteúdo --- */}
            <div className="absolute inset-0 flex h-full flex-col justify-end p-4 md:p-6">
              {/* Painel aberto: bandeira, nome e chamada */}
              <div
                className={cn(
                  'flex flex-col gap-2 transition-all duration-500',
                  active ? 'translate-y-0 opacity-100 delay-200' : 'translate-y-12 opacity-0',
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-white/30 bg-white/10 px-2 py-1 text-[10px] font-medium tracking-wider text-white uppercase backdrop-blur-md md:px-3 md:text-xs">
                    {item.category}
                  </span>
                </div>

                <h3 className="m-0 flex items-center gap-3 text-2xl leading-none font-black text-white uppercase md:text-4xl">
                  {item.badge}
                  <span className="[text-wrap:balance]">{item.title}</span>
                </h3>

                {item.meta && (
                  <span className="text-xs font-medium text-white/70 md:text-sm">{item.meta}</span>
                )}

                <div className="mt-1 flex items-center gap-2 text-xs font-bold tracking-widest text-white/80 uppercase md:mt-3 md:text-sm">
                  {item.cta ?? 'Ver'}
                  <ArrowUpRight className="h-3 w-3 md:h-4 md:w-4" />
                </div>
              </div>

              {/* Painel fechado: selo em cima, nome na vertical embaixo */}
              <div
                className={cn(
                  'absolute inset-x-0 top-3 bottom-6 flex flex-col items-center justify-between transition-all duration-500 md:top-4 md:bottom-8',
                  active ? 'scale-50 opacity-0' : 'opacity-100 delay-500',
                )}
              >
                <span className="drop-shadow-[0_2px_6px_rgb(0_0_0/.6)]">{item.icon}</span>
                <span className="text-base font-bold tracking-widest whitespace-nowrap text-white uppercase [writing-mode:vertical-rl] [text-shadow:0_1px_6px_rgb(0_0_0/.7)] md:text-lg">
                  {item.title}
                </span>
              </div>
            </div>
          </button>
          );
        })}
      </div>

      {/* Setas: o único jeito de andar de lado no computador. */}
      <button
        type="button"
        aria-label="Países anteriores"
        onClick={() => andar(-1)}
        disabled={!podeVoltar}
        className={cn(
          'absolute top-1/2 left-1 z-10 grid size-10 -translate-y-1/2 place-items-center rounded-full',
          'bg-white/90 text-neutral-900 shadow-lg backdrop-blur transition',
          'hover:bg-white disabled:pointer-events-none disabled:opacity-0',
        )}
      >
        <ChevronLeft className="size-5" />
      </button>
      <button
        type="button"
        aria-label="Próximos países"
        onClick={() => andar(1)}
        disabled={!podeAvancar}
        className={cn(
          'absolute top-1/2 right-1 z-10 grid size-10 -translate-y-1/2 place-items-center rounded-full',
          'bg-white/90 text-neutral-900 shadow-lg backdrop-blur transition',
          'hover:bg-white disabled:pointer-events-none disabled:opacity-0',
        )}
      >
        <ChevronRight className="size-5" />
      </button>
    </div>
  );
}

export { ElasticGallery };
