// Galeria da página do produto: foto grande, miniaturas e tela cheia com zoom.
import { useCallback, useEffect, useState } from 'react';
import { Photo } from './cards';
import { img } from '../lib/catalog';

export default function Gallery({ id, count, alt, cover = 0 }: { id: string; count: number; alt: string; cover?: number }) {
  // Abre na capa — a foto da peça inteira — e não na primeira do álbum, que
  // no fornecedor costuma ser um detalhe de tecido.
  const [index, setIndex] = useState(cover);
  const [open, setOpen] = useState(false);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const total = Math.max(count, 1);

  const go = useCallback((d: number) => { setZoom(null); setIndex((i) => (i + d + total) % total); }, [total]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [open, go]);

  if (count === 0) return <div className="gallery-main"><Photo id={id} alt={alt} has={false} /></div>;

  return (
    <div className="gallery">
      <button type="button" className="gallery-main" onClick={() => setOpen(true)} aria-label="Abrir foto em tela cheia">
        <Photo id={id} index={index} size="full" alt={`${alt} — foto ${index + 1} de ${total}`} />
        <span className="gallery-hint">Toque para ampliar</span>
      </button>
      {total > 1 && (
        <div className="thumbs" role="list">
          {Array.from({ length: total }, (_, i) => (
            <button key={i} type="button" role="listitem" className="thumb" aria-current={i === index}
              aria-label={`Foto ${i + 1}`} onClick={() => setIndex(i)}>
              <img src={img(id, i, 'thumb')} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      )}

      {open && (
        <div className="lightbox" role="dialog" aria-modal="true" aria-label="Foto em tela cheia">
          <button type="button" className="lb-close" onClick={() => setOpen(false)} aria-label="Fechar">×</button>
          {total > 1 && <button type="button" className="lb-nav prev" onClick={() => go(-1)} aria-label="Foto anterior">‹</button>}
          <div
            className={zoom ? 'lb-stage zoomed' : 'lb-stage'}
            onClick={(e) => {
              if (zoom) return setZoom(null);
              const r = e.currentTarget.getBoundingClientRect();
              setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
            }}
            onMouseMove={(e) => {
              if (!zoom) return;
              const r = e.currentTarget.getBoundingClientRect();
              setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
            }}
          >
            <img src={img(id, index, 'full')} alt={`${alt} — foto ${index + 1}`}
              style={zoom ? { transform: 'scale(2.2)', transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined} />
          </div>
          {total > 1 && <button type="button" className="lb-nav next" onClick={() => go(1)} aria-label="Próxima foto">›</button>}
          <span className="lb-count">{index + 1} / {total} · {zoom ? 'toque para reduzir' : 'toque na foto para dar zoom'}</span>
        </div>
      )}
    </div>
  );
}
