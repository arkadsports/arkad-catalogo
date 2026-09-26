// Carrinho: o cliente revê as peças, vê o preço na faixa do pedido e fecha a
// compra no WhatsApp com a mensagem pronta.
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { money, productName, TIER_LABELS, useCatalog } from '../lib/catalog';
import { orderMessage, useCart, useCartSummary } from '../lib/cart';
import { Loading, Photo } from '../components/cards';
import { Promessas } from '../components/Promessas';

export default function CartPage() {
  const { ready } = useCatalog();
  const { setQty, remove, clear } = useCart();
  const summary = useCartSummary();
  const [cliente, setCliente] = useState({ nome: '', cidade: '', obs: '' });
  if (!ready) return <Loading />;

  const { lines, count, tier, subtotal, saving, pending, next } = summary;

  if (!lines.length) {
    return (
      <section className="carrinho-vazio">
        <h1 className="page-title">Seu carrinho está vazio</h1>
        <p className="lead">Escolha as camisas, adicione ao carrinho e feche o pedido pelo WhatsApp.
          Quanto mais peças, menor o preço de cada uma.</p>
        <Link className="order" to="/clubes">Ver os clubes</Link>
      </section>
    );
  }

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    window.open(orderMessage(summary, cliente), '_blank', 'noopener');
  };

  return (
    <>
      <h1 className="page-title">Carrinho</h1>
      <p className="lead">{count} {count === 1 ? 'peça' : 'peças'} · preço da faixa <strong>{TIER_LABELS[tier]}</strong></p>

      <div className="carrinho">
        <section aria-label="Peças do pedido">
          <ul className="cart-lines">
            {lines.map((l) => (
              <li key={`${l.id}|${l.size}`} className="cart-line">
                <Link to={`/produto/${l.id}`} className="cart-photo">
                  <Photo id={l.id} index={l.product.c ?? 0} alt={productName(l.product)} has={l.product.ph > 0} />
                </Link>
                <div className="cart-info">
                  <Link to={`/produto/${l.id}`} className="cart-name">
                    {l.team?.name} · {l.product.type}{l.product.s ? ` ${l.product.s}` : ''}
                  </Link>
                  {l.product.n && <span className="cart-variant">{l.product.n}</span>}
                  <span className="cart-variant">Tamanho: {l.size || 'a combinar'} · Código {l.id}</span>
                  <div className="cart-row">
                    <div className="qtd" role="group" aria-label="Quantidade">
                      <button type="button" onClick={() => setQty(l.id, l.size, l.qty - 1)} aria-label="Menos uma"><Minus size={16} /></button>
                      <output>{l.qty}</output>
                      <button type="button" onClick={() => setQty(l.id, l.size, l.qty + 1)} aria-label="Mais uma"><Plus size={16} /></button>
                    </div>
                    <button type="button" className="cart-remove" onClick={() => remove(l.id, l.size)}>
                      <Trash2 size={16} aria-hidden="true" /> Remover
                    </button>
                  </div>
                </div>
                <div className="cart-price">
                  {l.unit === undefined ? (
                    <span className="price ask">A confirmar</span>
                  ) : (
                    <>
                      <strong>{money(l.total!)}</strong>
                      <span>{l.qty} × {money(l.unit)}</span>
                      {l.single! > l.unit && <s>{money(l.single!)}</s>}
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <button type="button" className="cart-clear" onClick={() => { if (confirm('Esvaziar o carrinho?')) clear(); }}>
            Esvaziar carrinho
          </button>
        </section>

        <aside className="resumo" aria-label="Resumo do pedido">
          <h2>Resumo</h2>

          {/* A régua das faixas: mostra onde o pedido está e o que falta. */}
          <ol className="regua" aria-label="Faixas de preço por quantidade">
            {TIER_LABELS.map((rotulo, i) => (
              <li key={rotulo} data-estado={i < tier ? 'passou' : i === tier ? 'atual' : 'falta'}>
                {i === 4 ? '5+' : i + 1}
              </li>
            ))}
          </ol>
          {next ? (
            <p className="dica">Com <strong>mais 1 peça</strong> no pedido, as que você já escolheu ficam <strong>{money(next.saving)}</strong> mais baratas.</p>
          ) : count >= 5 ? (
            <p className="dica">Seu pedido está no <strong>menor preço</strong> por peça.</p>
          ) : null}

          <dl className="resumo-linhas">
            <div><dt>Peças</dt><dd>{count}</dd></div>
            {saving > 0 && <div className="economia"><dt>Desconto por quantidade</dt><dd>− {money(saving)}</dd></div>}
            <div><dt>Frete</dt><dd className="gratis">Grátis</dd></div>
            <div><dt>Imposto de importação</dt><dd>Incluso</dd></div>
            <div className="total"><dt>Total</dt><dd>{money(subtotal)}</dd></div>
          </dl>
          {pending > 0 && (
            <p className="small">+ {pending} {pending === 1 ? 'peça' : 'peças'} com preço a confirmar pelo WhatsApp.</p>
          )}

          <form className="finalizar" onSubmit={enviar}>
            <label>Seu nome
              <input required autoComplete="name" value={cliente.nome} onChange={(e) => setCliente({ ...cliente, nome: e.target.value })} />
            </label>
            <label>Cidade / UF
              <input autoComplete="address-level2" placeholder="Ex.: Natal/RN" value={cliente.cidade} onChange={(e) => setCliente({ ...cliente, cidade: e.target.value })} />
            </label>
            <label>Observações <small>(personalização, dúvidas)</small>
              <textarea rows={2} value={cliente.obs} onChange={(e) => setCliente({ ...cliente, obs: e.target.value })} />
            </label>
            <button type="submit" className="order whatsapp">Finalizar pelo WhatsApp</button>
            <p className="small">Abrimos o WhatsApp com o pedido pronto. O pagamento e o endereço de entrega são combinados na conversa.</p>
          </form>
        </aside>
      </div>

      <Promessas variante="painel" />
    </>
  );
}
