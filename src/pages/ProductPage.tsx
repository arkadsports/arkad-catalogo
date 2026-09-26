import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Minus, Plus } from 'lucide-react';
import { money, priceOf, productName, sizeList, tierIndex, tiersOf, TIER_LABELS, useCatalog } from '../lib/catalog';
import { useCart } from '../lib/cart';
import { Loading, ProductCard } from '../components/cards';
import Gallery from '../components/Gallery';
import { STORE } from '../config';

// A chave zera tamanho e quantidade ao trocar de produto pelos "relacionados".
export default function ProductPage() {
  const { id = '' } = useParams();
  return <Produto key={id} id={id} />;
}

function Produto({ id }: { id: string }) {
  const navigate = useNavigate();
  const { ready, productById, teamBySlug, productsByTeam } = useCatalog();
  const { add, count } = useCart();
  const [size, setSize] = useState('');
  const [qty, setQty] = useState(1);
  const [faltaTamanho, setFaltaTamanho] = useState(false);
  if (!ready) return <Loading />;

  const p = productById.get(id);
  if (!p) return <p className="empty">Produto não encontrado. <Link to="/">Voltar ao início</Link></p>;
  const team = teamBySlug.get(p.team);
  const tiers = tiersOf(p);
  const sizes = sizeList(p.sz);
  const related = (productsByTeam.get(p.team) ?? []).filter((x) => x.id !== p.id && x.type === p.type).slice(0, 4);
  const alt = `${team?.name ?? ''} ${p.type} ${p.s} ${p.n}`.trim();
  // A faixa em que este pedido cairia com estas peças somadas ao carrinho.
  const pedido = count + qty;
  const unit = priceOf(p, pedido);

  const colocar = (depois?: () => void) => {
    if (sizes.length && !size) { setFaltaTamanho(true); return; }
    add(p.id, size.trim(), qty);
    setQty(1);
    depois?.();
  };

  return (
    <>
      <nav className="crumbs">
        <Link to="/">Início</Link> / <Link to={`/time/${p.team}`}>{team?.name}</Link> / {productName(p)}
      </nav>
      <div className="product-layout">
        <Gallery id={p.id} count={p.ph} cover={p.c ?? 0} alt={alt} />

        <section className="product-detail">
          <Link to={`/time/${p.team}`} className="detail-team">{team?.name}</Link>
          <h1>{p.type}{p.s ? ` ${p.s}` : ''}</h1>
          {p.n && <p className="detail-variant">{p.n}</p>}

          {tiers ? (
            <div className="detail-precos">
              <p className="detail-price">{money(unit!)}<small> por peça</small></p>
              {count > 0 && (
                <p className="detail-apartir">
                  Preço somando as {count} {count === 1 ? 'peça' : 'peças'} do seu carrinho ({money(tiers[0])} numa compra avulsa).
                </p>
              )}
              <p className="detail-apartir">
                {pedido >= 5
                  ? 'Seu pedido já está no menor preço.'
                  : <>A partir de <strong>{money(tiers[4])}</strong> no pedido de 5 peças ou mais — pode misturar modelos e times.</>}
              </p>
            </div>
          ) : (
            <p className="detail-price ask">Preço sob consulta — adicione ao carrinho e confirmamos pelo WhatsApp.</p>
          )}

          {sizes.length > 0 ? (
            <fieldset className="sizes">
              <legend>Tamanho {faltaTamanho && <span className="erro" role="alert">— escolha um tamanho</span>}</legend>
              <div className="size-row">
                {sizes.map((s) => (
                  <button key={s} type="button" className="size" aria-pressed={size === s}
                    onClick={() => { setSize(s === size ? '' : s); setFaltaTamanho(false); }}>{s}</button>
                ))}
              </div>
            </fieldset>
          ) : (
            <label className="size-livre">
              <span>Tamanho ou idade <small>(opcional, pode combinar depois)</small></span>
              <input type="text" value={size} maxLength={20} onChange={(e) => setSize(e.target.value)} placeholder="Ex.: 8 anos" />
            </label>
          )}

          <div className="comprar">
            <div className="qtd" role="group" aria-label="Quantidade">
              <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1} aria-label="Menos uma"><Minus size={16} /></button>
              <output aria-live="polite">{qty}</output>
              <button type="button" onClick={() => setQty((q) => Math.min(20, q + 1))} aria-label="Mais uma"><Plus size={16} /></button>
            </div>
            <button type="button" className="order" onClick={() => colocar()}>Adicionar ao carrinho</button>
          </div>
          <button type="button" className="order secundario" onClick={() => colocar(() => navigate('/carrinho'))}>
            Comprar agora
          </button>

          {tiers && (
            <table className="faixas">
              <caption>Preço por peça conforme o total do pedido</caption>
              <thead><tr>{TIER_LABELS.map((l) => <th key={l} scope="col">{l}</th>)}</tr></thead>
              <tbody>
                <tr>
                  {tiers.map((v, i) => (
                    <td key={i} aria-current={i === tierIndex(pedido) ? 'true' : undefined}>{money(v)}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          )}

          <dl className="specs">
            <div><dt>Código</dt><dd>{p.id}</dd></div>
            <div><dt>Versão</dt><dd>{p.type}</dd></div>
            {p.s && <div><dt>Temporada</dt><dd>{p.s}</dd></div>}
            {p.sz && <div><dt>Tamanhos</dt><dd>{p.sz}</dd></div>}
            <div><dt>Prazo</dt><dd>{STORE.leadTime}</dd></div>
            <div><dt>Frete</dt><dd>Grátis para todo o Brasil</dd></div>
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
