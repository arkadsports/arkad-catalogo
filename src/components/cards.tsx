// Peças visuais reaproveitadas em várias páginas.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { img, lowestPriceOf, money, priceOf, productName, useCatalog, type Product, type Team } from '../lib/catalog';

// Foto com "Foto em breve" quando ainda não foi baixada ou falhou
export function Photo({ id, index = 0, size = 'thumb', alt, has = true }: {
  id: string | null; index?: number; size?: 'thumb' | 'full'; alt: string; has?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  if (!id || !has || failed) {
    return (
      <div className="photo-empty" role="img" aria-label={`${alt} (foto em breve)`}>
        <svg viewBox="0 0 64 64" aria-hidden="true"><path d="M22 14l-10 6 4 9 5-2v23h22V27l5 2 4-9-10-6c-2 4-6 6-10 6s-8-2-10-6z" /></svg>
        <span>Foto em breve</span>
      </div>
    );
  }
  return <img src={img(id, index, size)} alt={alt} loading="lazy" decoding="async" onError={() => setFailed(true)} />;
}

export function TeamCard({ team }: { team: Team }) {
  const total = team.products + (team.locked ?? 0);
  return (
    <Link to={`/time/${team.slug}`} className="team-card">
      <div className="team-photo"><Photo id={team.cover} index={team.coverC ?? 0} alt={team.name} has={!!team.cover} /></div>
      <div className="team-info">
        <strong><Escudo slug={team.slug} />{team.flag && <Flag slug={team.countrySlug} emoji={team.flag} />}{team.name}</strong>
        <span>{total} {total === 1 ? 'modelo' : 'modelos'}</span>
      </div>
    </Link>
  );
}

export function ProductCard({ p }: { p: Product }) {
  const { teamBySlug } = useCatalog();
  const team = teamBySlug.get(p.team);
  const price = priceOf(p);
  const lowest = lowestPriceOf(p);
  return (
    <Link to={`/produto/${p.id}`} className="product-card">
      <div className="product-photo">
        <Photo id={p.id} index={p.c ?? 0} alt={`${team?.name ?? ''} ${p.type} ${p.s}`} has={p.ph > 0} />
        {p.ph > 1 && <span className="photo-count">{p.ph} fotos</span>}
      </div>
      <div className="product-info">
        <div className="tags"><span className="tag">{p.type}</span>{p.s && <span className="tag ghost">{p.s}</span>}</div>
        <strong className="product-name">{productName(p)}</strong>
        <span className="product-team">{team?.name}</span>
        <span className={price ? 'price' : 'price ask'}>{price ? money(price) : 'Consulte o preço'}</span>
        {lowest && <span className="price-from">ou {money(lowest)} cada no pedido de 5+</span>}
      </div>
    </Link>
  );
}

// Grade de produtos com "carregar mais" (evita montar milhares de cartões de uma vez)
export function ProductGrid({ products, pageSize = 48 }: { products: Product[]; pageSize?: number }) {
  const [shown, setShown] = useState(pageSize);
  if (!products.length) return <p className="empty">Nenhum modelo encontrado com esses filtros.</p>;
  return (
    <>
      <div className="product-grid">{products.slice(0, shown).map((p) => <ProductCard key={p.id} p={p} />)}</div>
      {shown < products.length && (
        <button className="more" type="button" onClick={() => setShown((s) => s + pageSize)}>
          Ver mais ({products.length - shown} restantes)
        </button>
      )}
    </>
  );
}

export function Chips({ options, value, onChange, label }: {
  options: { value: string; label: string; count?: number }[]; value: string; onChange: (v: string) => void; label: string;
}) {
  return (
    <div className="chips" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" className="chip" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}{o.count !== undefined && <small>{o.count}</small>}
        </button>
      ))}
    </div>
  );
}

export function Loading() {
  const { error } = useCatalog();
  return <p className="empty">{error ?? 'Carregando catálogo…'}</p>;
}

// Bandeira do país em imagem (public/flags/<slug>.webp).
// O emoji seria mais simples, mas o Windows não desenha bandeiras — 🇧🇷 sai
// como "BR" na tela do cliente. A imagem funciona em qualquer sistema; o emoji
// fica só como reserva se o arquivo faltar.
export function Flag({ slug, emoji, className = '', alt }: {
  slug?: string; emoji?: string; className?: string; alt?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (!slug || failed) return <span aria-hidden={!alt}>{emoji ?? '🏳️'}</span>;
  return (
    <img className={`flag-img ${className}`} src={`/flags/${slug}.webp`}
      alt={alt ?? ''} aria-hidden={!alt} loading="lazy" decoding="async" onError={() => setFailed(true)} />
  );
}

// Escudo oficial do clube (public/escudos/<slug>.webp), ao lado do nome.
// Nem todo time tem: quem não tem simplesmente não mostra nada.
export function Escudo({ slug, className = '' }: { slug: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <img className={`escudo ${className}`} src={`/escudos/${slug}.webp`} alt=""
      width={28} height={28} loading="lazy" decoding="async" onError={() => setFailed(true)} />
  );
}
