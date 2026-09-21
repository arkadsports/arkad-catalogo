import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { money, priceOf, productName, sizeList, useCatalog, whatsappLink } from '../lib/catalog';
import { Loading, ProductCard } from '../components/cards';
import Gallery from '../components/Gallery';
import { STORE } from '../config';

export default function ProductPage() {
  const { id = '' } = useParams();
  const { ready, productById, teamBySlug, productsByTeam } = useCatalog();
  const [size, setSize] = useState('');
  if (!ready) return <Loading />;

  const p = productById.get(id);
  if (!p) return <p className="empty">Produto não encontrado. <Link to="/">Voltar ao início</Link></p>;
  const team = teamBySlug.get(p.team);
  const price = priceOf(p);
  const sizes = sizeList(p.sz);
  const related = (productsByTeam.get(p.team) ?? []).filter((x) => x.id !== p.id && x.type === p.type).slice(0, 4);
  const alt = `${team?.name ?? ''} ${p.type} ${p.s} ${p.n}`.trim();

  return (
    <>
      <nav className="crumbs">
        <Link to="/">Início</Link> / <Link to={`/time/${p.team}`}>{team?.name}</Link> / {productName(p)}
      </nav>
      <div className="product-layout">
        <Gallery id={p.id} count={p.ph} alt={alt} />

        <section className="product-detail">
          <Link to={`/time/${p.team}`} className="detail-team">{team?.flag ? `${team.flag} ` : ''}{team?.name}</Link>
          <h1>{p.type}{p.s ? ` ${p.s}` : ''}</h1>
          {p.n && <p className="detail-variant">{p.n}</p>}
          <p className={price ? 'detail-price' : 'detail-price ask'}>{price ? money(price) : 'Consulte o preço'}</p>

          {sizes.length > 0 && (
            <fieldset className="sizes">
              <legend>Tamanho</legend>
              <div className="size-row">
                {sizes.map((s) => (
                  <button key={s} type="button" className="size" aria-pressed={size === s} onClick={() => setSize(s === size ? '' : s)}>{s}</button>
                ))}
              </div>
            </fieldset>
          )}

          <a className="order" href={whatsappLink(p, team, size)} target="_blank" rel="noopener">
            Pedir pelo WhatsApp{size ? ` · ${size}` : ''}
          </a>

          <dl className="specs">
            <div><dt>Código</dt><dd>{p.id}</dd></div>
            <div><dt>Versão</dt><dd>{p.type}</dd></div>
            {p.s && <div><dt>Temporada</dt><dd>{p.s}</dd></div>}
            {p.sz && <div><dt>Tamanhos</dt><dd>{p.sz}</dd></div>}
            <div><dt>Prazo</dt><dd>{STORE.leadTime}</dd></div>
          </dl>
          <p className="small">Descrição original: {p.t}</p>
        </section>
      </div>

      {related.length > 0 && (
        <section className="block">
          <div className="block-head"><h2>Mais {p.type.toLowerCase()} do {team?.name}</h2><Link to={`/time/${p.team}`}>Ver todos</Link></div>
          <div className="product-grid">{related.map((r) => <ProductCard key={r.id} p={r} />)}</div>
        </section>
      )}
    </>
  );
}
