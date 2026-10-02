// Acompanhar pedido: o cliente digita o telefone que usou no pedido e vê a
// etapa de cada compra e o rastreio que a loja cadastra no ERP (aba
// Rastreamento). O telefone fica guardado neste navegador para a próxima vez.
import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Check, PackageSearch, Truck } from 'lucide-react';
import { mascaraTelefone } from '../lib/entrega';
import { consultarPedidos, type PedidoAcompanhado } from '../lib/erp';
import { STORE } from '../config';
import { whatsappUrl } from '../lib/catalog';

const CHAVE = 'arkad-acompanhar-telefone';
const data = (iso: string, comHora = false) =>
  new Date(iso).toLocaleString('pt-BR', comHora
    ? { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { day: '2-digit', month: '2-digit', year: 'numeric' });

export default function AcompanharPage() {
  const [telefone, setTelefone] = useState(() => {
    try { return localStorage.getItem(CHAVE) ?? ''; } catch { return ''; }
  });
  const [buscando, setBuscando] = useState(false);
  const [erro, setErro] = useState('');
  const [pedidos, setPedidos] = useState<PedidoAcompanhado[] | null>(null);

  const consultar = async (ev?: FormEvent) => {
    ev?.preventDefault();
    const digitos = telefone.replace(/\D/g, '');
    if (digitos.length < 10) { setErro('Digite o telefone com DDD, o mesmo que você usou no pedido.'); return; }
    setErro('');
    setBuscando(true);
    const r = await consultarPedidos(digitos);
    setBuscando(false);
    if ('erro' in r) { setErro(r.erro); setPedidos(null); return; }
    setPedidos(r.pedidos);
    try { localStorage.setItem(CHAVE, telefone); } catch { /* navegador sem armazenamento */ }
  };

  // Quem já consultou antes vê os pedidos assim que abre a página.
  useEffect(() => {
    if (telefone.replace(/\D/g, '').length >= 10) consultar();
    // Só na abertura; depois a consulta é pelo botão.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="acompanhar">
      <h1 className="page-title">Acompanhar pedido</h1>
      <p className="lead">Digite o telefone que você usou no pedido para ver em que etapa ele está e o rastreio da entrega.</p>

      <form className="acompanhar-busca" onSubmit={consultar}>
        <label>
          Telefone
          <input type="tel" inputMode="tel" autoComplete="tel" placeholder="(84) 99999-9999"
            value={telefone} onChange={(e) => setTelefone(mascaraTelefone(e.target.value))} />
        </label>
        <button type="submit" className="order" disabled={buscando}>
          {buscando ? 'Consultando…' : 'Consultar'}
        </button>
      </form>
      {erro && <p className="erro" role="alert">{erro}</p>}

      {pedidos && pedidos.length === 0 && (
        <div className="acompanhar-vazio">
          <PackageSearch aria-hidden="true" size={36} />
          <p>Não encontramos pedidos com este telefone. Confira o número ou fale com a gente.</p>
          <a className="order whatsapp" href={whatsappUrl('Olá! Quero saber do meu pedido.')} target="_blank" rel="noopener">
            Falar no WhatsApp
          </a>
        </div>
      )}

      {pedidos?.map((p) => <CartaoPedido key={p.codigo} pedido={p} />)}

      {pedidos && pedidos.length > 0 && (
        <p className="small">Dúvidas sobre o pedido? <a href={whatsappUrl()} target="_blank" rel="noopener">Fale com a {STORE.name} no WhatsApp</a>.</p>
      )}
      <p className="small"><Link to="/">Voltar ao catálogo</Link></p>
    </section>
  );
}

function CartaoPedido({ pedido: p }: { pedido: PedidoAcompanhado }) {
  const r = p.rastreio;
  return (
    <article className="pedido-card">
      <header>
        <div>
          <h2>Pedido {p.codigo}</h2>
          <span className="small">feito em {data(p.data)}</span>
        </div>
        <span className={`pedido-situacao${p.cancelado ? ' cancelado' : ''}`}>{p.cancelado ? 'Cancelado' : p.situacao}</span>
      </header>

      {!p.cancelado && (
        <ol className="pedido-etapas" aria-label="Etapas do pedido">
          {p.etapas.map((nome, i) => (
            <li key={nome} data-estado={i < p.etapa ? 'feito' : i === p.etapa ? 'atual' : 'falta'}
              aria-current={i === p.etapa ? 'step' : undefined}>
              <span className="bolinha">{i < p.etapa ? <Check size={14} aria-hidden="true" /> : i + 1}</span>
              <span className="nome">{nome}</span>
            </li>
          ))}
        </ol>
      )}

      <ul className="pedido-itens">
        {p.itens.map((i, n) => (
          <li key={n}>
            {i.foto && <img src={i.foto} alt="" loading="lazy" width={48} height={48} />}
            <span>{i.titulo}<span className="small"> · {i.qtd} {i.qtd === 1 ? 'peça' : 'peças'}{i.tamanho ? ` · tam. ${i.tamanho}` : ''}</span></span>
          </li>
        ))}
      </ul>

      <div className="pedido-rastreio">
        <h3><Truck size={18} aria-hidden="true" /> Rastreio</h3>
        {!r ? (
          <p className="small">{p.cancelado
            ? 'Este pedido foi cancelado.'
            : 'O código de rastreio aparece aqui assim que o fornecedor despachar a encomenda.'}</p>
        ) : (
          <>
            <p className="rastreio-codigo">
              <strong>{r.codigo}</strong>{r.transportadora ? ` · ${r.transportadora}` : ''}
              <span className="rastreio-situacao">{r.situacao}</span>
            </p>
            {r.aguardandoTaxa && (
              <p className="small">A encomenda está na fiscalização dos Correios. Já estamos acompanhando e avisamos você pelo WhatsApp se precisar de algo.</p>
            )}
            {r.eventos.length > 0 ? (
              <ol className="rastreio-eventos">
                {r.eventos.map((e, n) => (
                  <li key={n}>
                    <span>{e.descricao}</span>
                    <span className="small">{data(e.data, true)}{e.local ? ` · ${e.local}` : ''}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="small">Ainda sem movimentação. Atualizado em {data(r.atualizadoEm, true)}.</p>
            )}
          </>
        )}
      </div>
    </article>
  );
}
