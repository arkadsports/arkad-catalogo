import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Minus, Plus } from 'lucide-react';
import { fotosDe, isBigSize, money, pastaDe, priceKey, priceOf, productName, sizeList, tierIndex, tiersOf, TIER_LABELS, useCatalog } from '../lib/catalog';
import { useCart, type Personalizacao } from '../lib/cart';
import { Loading, ProductCard } from '../components/cards';
import Gallery from '../components/Gallery';
import { AVISO_PERSONALIZACAO, AVISO_TAMANHO_GRANDE, NOME_MAX, PERSONALIZAVEIS, STORE, patchesDoTime } from '../config';

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
  const [pers, setPers] = useState<Personalizacao>({});
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
  // Nome, número e patch: só nas camisas; os patches combinam com o time.
  const personalizavel = PERSONALIZAVEIS.has(p.type);
  const patches = team ? patchesDoTime(team) : [];
  const personalizado = !!(pers.nome?.trim() || pers.numero?.trim() || pers.patch);

  const colocar = (depois?: () => void) => {
    if (sizes.length && !size) { setFaltaTamanho(true); return; }
    add(p.id, size.trim(), qty, personalizavel ? pers : {});
    setQty(1);
    setPers({});
    depois?.();
  };

  return (
    <>
      <nav className="crumbs">
        <Link to="/">Início</Link> / <Link to={`/time/${p.team}`}>{team?.name}</Link> / {productName(p)}
      </nav>
      <div className="product-layout">
        <Gallery id={pastaDe(p)} fotos={fotosDe(p)} cover={p.c ?? 0} alt={alt} />

        <section className="product-detail">
          <Link to={`/time/${p.team}`} className="detail-team">{team?.name}</Link>
          <h1>{p.type}{p.s ? ` ${p.s}` : ''}</h1>
          {p.n && <p className="detail-variant">{p.n}</p>}

          {tiers ? (
            <div className="detail-precos">
              <p className="detail-price">{money(unit!)}<small> por peça</small></p>
              {count > 0 && (
                <p className="detail-apartir">
                  Preço somando {count === 1 ? 'a peça' : `as ${count} peças`} do seu carrinho ({money(tiers[0])} numa compra avulsa).
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
                    title={isBigSize(s) ? 'Tamanho grande: pode ter valor adicional' : undefined}
                    onClick={() => { setSize(s === size ? '' : s); setFaltaTamanho(false); }}>
                    {s}{isBigSize(s) && <sup aria-label="pode ter adicional">+</sup>}
                  </button>
                ))}
              </div>
              {sizes.some(isBigSize) && (
                <p className={isBigSize(size) ? 'aviso-tamanho ativo' : 'aviso-tamanho'} role={isBigSize(size) ? 'status' : undefined}>
                  <b>+</b> {AVISO_TAMANHO_GRANDE}
                </p>
              )}
            </fieldset>
          ) : (
            <label className="size-livre">
              <span>Tamanho ou idade <small>(opcional, pode combinar depois)</small></span>
              <input type="text" value={size} maxLength={20} onChange={(e) => setSize(e.target.value)} placeholder="Ex.: 8 anos" />
            </label>
          )}

          {personalizavel && (
            <fieldset className="personalizacao">
              <legend>Personalização <small>(opcional)</small></legend>
              <div className="pers-campos">
                <label className="pers-nome">Nome
                  <input type="text" value={pers.nome ?? ''} maxLength={NOME_MAX} autoComplete="off" placeholder="Ex.: GABIGOL"
                    onChange={(e) => setPers({ ...pers, nome: e.target.value.toUpperCase() })} />
                </label>
                <label className="pers-numero">Número
                  <input type="text" inputMode="numeric" value={pers.numero ?? ''} maxLength={2} autoComplete="off" placeholder="10"
                    onChange={(e) => setPers({ ...pers, numero: e.target.value.replace(/\D/g, '') })} />
                </label>
                {patches.length > 0 && (
                  <label className="pers-patch">Patch
                    <select value={pers.patch ?? ''} onChange={(e) => setPers({ ...pers, patch: e.target.value || undefined })}>
                      <option value="">Sem patch</option>
                      {patches.map((nome) => <option key={nome} value={nome}>{nome}</option>)}
                    </select>
                  </label>
                )}
              </div>
              <p className={personalizado ? 'aviso-tamanho ativo' : 'aviso-tamanho'}>
                <b>+</b> {AVISO_PERSONALIZACAO}{qty > 1 ? ` Vale para as ${qty} peças; para nomes diferentes, adicione uma de cada vez.` : ''}
              </p>
            </fieldset>
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
            <div><dt>Versão</dt><dd>{priceKey(p)}</dd></div>
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
