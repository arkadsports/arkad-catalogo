// Carrinho: o cliente revê as peças, vê o preço na faixa do pedido, preenche os
// dados de entrega e manda o pedido no WhatsApp — em texto e em imagem.
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Check, Download, ImageIcon, MessageCircle, Minus, Plus, Trash2 } from 'lucide-react';
import { money, productName, TIER_LABELS, useCatalog } from '../lib/catalog';
import { CAMPOS_ENTREGA, chave, orderLink, persText, useCart, useCartSummary, type Entrega } from '../lib/cart';
import { buscarCep, carregarEntrega, mascaraCep, mascaraCpf, mascaraTelefone, salvarEntrega, validarEntrega } from '../lib/entrega';
import { gerarImagemPedido } from '../lib/pedido-imagem';
import { enviarPedido } from '../lib/erp';
import { AVISO_PERSONALIZACAO, AVISO_TAMANHO_GRANDE } from '../config';
import { Loading, Photo } from '../components/cards';
import { Promessas } from '../components/Promessas';

// Como cada campo se comporta no formulário.
const CAMPO: Record<keyof Entrega, { auto?: string; tipo?: string; modo?: 'numeric' | 'tel' | 'email'; dica?: string; mascara?: (s: string) => string; largo?: boolean }> = {
  nome: { auto: 'name', largo: true },
  cep: { auto: 'postal-code', modo: 'numeric', dica: '00000-000', mascara: mascaraCep },
  rua: { auto: 'address-line1', dica: 'Ex.: Rua das Flores, 123, apto 4' },
  bairro: { auto: 'address-level3' },
  cidade: { auto: 'address-level2' },
  estado: { auto: 'address-level1', dica: 'Ex.: RN' },
  pais: { auto: 'country-name' },
  cpf: { modo: 'numeric', dica: '000.000.000-00', mascara: mascaraCpf },
  contato: { auto: 'tel', tipo: 'tel', modo: 'tel', dica: '(84) 99999-9999', mascara: mascaraTelefone },
  email: { auto: 'email', tipo: 'email', modo: 'email' },
};
// Ordem no formulário: o CEP antes do endereço, porque ele preenche o resto.
const ORDEM_FORM: (keyof Entrega)[] = ['nome', 'cep', 'rua', 'bairro', 'cidade', 'estado', 'pais', 'cpf', 'contato', 'email'];
const ROTULO = Object.fromEntries(CAMPOS_ENTREGA) as Record<keyof Entrega, string>;

export default function CartPage() {
  const { ready } = useCatalog();
  const { setQty, remove, clear } = useCart();
  const summary = useCartSummary();
  const [entrega, setEntrega] = useState<Entrega>(carregarEntrega);
  const [erros, setErros] = useState<Partial<Record<keyof Entrega, string>>>({});
  const [gerando, setGerando] = useState(false);
  const [pronto, setPronto] = useState<{ url: string; arquivo: File } | null>(null);
  const [enviado, setEnviado] = useState({ texto: false, imagem: false });
  const [aviso, setAviso] = useState('');
  // Número do pedido no ERP; null se o ERP estiver desligado ou não respondeu.
  const [codigo, setCodigo] = useState<string | null>(null);
  const dialogo = useRef<HTMLDialogElement>(null);

  useEffect(() => { if (pronto) dialogo.current?.showModal(); }, [pronto]);
  useEffect(() => () => { if (pronto) URL.revokeObjectURL(pronto.url); }, [pronto]);

  if (!ready) return <Loading />;
  const { lines, count, tier, subtotal, saving, pending, next, bigSizes, personalized } = summary;

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

  const mudar = (k: keyof Entrega, v: string) => {
    const valor = CAMPO[k].mascara ? CAMPO[k].mascara!(v) : v;
    setEntrega((e) => ({ ...e, [k]: valor }));
    if (erros[k]) setErros((e) => ({ ...e, [k]: undefined }));
    // CEP completo no Brasil: preenche rua, bairro, cidade e estado.
    if (k === 'cep' && valor.length === 9 && /^brasil$/i.test(entrega.pais.trim())) {
      buscarCep(valor).then((end) => {
        if (!end) return;
        setEntrega((e) => ({
          ...e,
          rua: e.rua.trim() ? e.rua : end.rua ? `${end.rua}, ` : '',
          bairro: e.bairro.trim() ? e.bairro : end.bairro,
          cidade: end.cidade, estado: end.estado,
        }));
      });
    }
  };

  const finalizar = async (ev: FormEvent) => {
    ev.preventDefault();
    const encontrados = validarEntrega(entrega);
    setErros(encontrados);
    const primeiro = ORDEM_FORM.find((k) => encontrados[k]);
    if (primeiro) { document.getElementById(`entrega-${primeiro}`)?.focus(); return; }
    salvarEntrega(entrega);
    setGerando(true);
    // Primeiro o pedido entra no ERP, para o número dele ir na mensagem e na
    // imagem. Se o ERP falhar, o pedido segue pelo WhatsApp sem número.
    const numero = await enviarPedido(summary, entrega);
    setCodigo(numero);
    try {
      const blob = await gerarImagemPedido(summary, entrega, numero);
      const arquivo = new File([blob], `pedido-arkad-sports-${Date.now()}.png`, { type: 'image/png' });
      setEnviado({ texto: false, imagem: false });
      setAviso('');
      setPronto({ url: URL.createObjectURL(blob), arquivo });
    } catch {
      setAviso('Não conseguimos gerar a imagem. Envie o pedido em texto; a imagem pode ser enviada depois.');
      window.open(orderLink(summary, entrega, numero), '_blank', 'noopener');
    } finally {
      setGerando(false);
    }
  };

  // No celular, o menu de compartilhar manda a imagem direto para o WhatsApp.
  // No computador, a imagem é copiada (Ctrl+V na conversa) e baixada.
  const enviarImagem = async () => {
    if (!pronto) return;
    const { arquivo } = pronto;
    const celular = matchMedia('(pointer: coarse)').matches;
    if (celular && navigator.canShare?.({ files: [arquivo] })) {
      try {
        await navigator.share({ files: [arquivo], title: 'Pedido Arkad Sports' });
        setEnviado((e) => ({ ...e, imagem: true }));
        setAviso('');
      } catch { /* o cliente fechou o menu de compartilhar */ }
      return;
    }
    let copiou = false;
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': arquivo })]);
      copiou = true;
    } catch { /* navegador sem permissão para copiar imagem */ }
    const a = document.createElement('a');
    a.href = pronto.url;
    a.download = arquivo.name;
    a.click();
    setEnviado((e) => ({ ...e, imagem: true }));
    setAviso(copiou
      ? 'Imagem copiada e baixada. Na conversa do WhatsApp, cole com Ctrl+V (ou anexe o arquivo baixado).'
      : 'Imagem baixada. Na conversa do WhatsApp, anexe o arquivo que acabou de ser salvo.');
  };

  return (
    <>
      <h1 className="page-title">Carrinho</h1>
      <p className="lead">{count} {count === 1 ? 'peça' : 'peças'} · preço da faixa <strong>{TIER_LABELS[tier]}</strong></p>

      <div className="carrinho">
        <div className="carrinho-principal">
          <section aria-label="Peças do pedido">
            <ul className="cart-lines">
              {lines.map((l) => (
                <li key={chave(l)} className="cart-line">
                  <Link to={`/produto/${l.id}`} className="cart-photo">
                    <Photo id={l.id} index={l.product.c ?? 0} alt={productName(l.product)} has={l.product.ph > 0} />
                  </Link>
                  <div className="cart-info">
                    <Link to={`/produto/${l.id}`} className="cart-name">
                      {l.team?.name} · {l.product.type}{l.product.s ? ` ${l.product.s}` : ''}
                    </Link>
                    {l.product.n && <span className="cart-variant">{l.product.n}</span>}
                    <span className="cart-variant">Tamanho: {l.size || 'a combinar'} · Código {l.id}</span>
                    {l.big && <span className="cart-grande"><b>+</b> Tamanho grande: pode ter valor adicional</span>}
                    {persText(l) && (
                      <span className="cart-pers"><b>Personalização:</b> {persText(l)} <small>(valor a confirmar)</small></span>
                    )}
                    <div className="cart-row">
                      <div className="qtd" role="group" aria-label="Quantidade">
                        <button type="button" onClick={() => setQty(chave(l), l.qty - 1)} aria-label="Menos uma"><Minus size={16} /></button>
                        <output>{l.qty}</output>
                        <button type="button" onClick={() => setQty(chave(l), l.qty + 1)} aria-label="Mais uma"><Plus size={16} /></button>
                      </div>
                      <button type="button" className="cart-remove" onClick={() => remove(chave(l))}>
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

          <form id="pedido" className="entrega" onSubmit={finalizar} noValidate>
            <h2>Dados para entrega</h2>
            <p className="small">Preencha para enviarmos o pedido. Todos os campos são obrigatórios.</p>
            <div className="entrega-campos">
              {ORDEM_FORM.map((k) => {
                const c = CAMPO[k];
                return (
                  <label key={k} className={c.largo ? 'largo' : undefined}>
                    {ROTULO[k]}
                    <input id={`entrega-${k}`} name={k} value={entrega[k]} type={c.tipo ?? 'text'} inputMode={c.modo}
                      autoComplete={c.auto} placeholder={c.dica} required
                      aria-invalid={erros[k] ? true : undefined} aria-describedby={erros[k] ? `erro-${k}` : undefined}
                      onChange={(e) => mudar(k, e.target.value)} />
                    {erros[k] && <span id={`erro-${k}`} className="erro">{erros[k]}</span>}
                  </label>
                );
              })}
            </div>
            <p className="small">O CPF é pedido para o desembaraço da importação. Não guardamos seu CPF neste navegador; seus dados vão só para a Arkad Sports, para entregar este pedido.</p>
          </form>
        </div>

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
            <div className="total"><dt>Total</dt><dd>{money(subtotal)}</dd></div>
          </dl>
          {pending > 0 && (
            <p className="small">+ {pending} {pending === 1 ? 'peça' : 'peças'} com preço a confirmar pelo WhatsApp.</p>
          )}
          {bigSizes && <p className="aviso-tamanho ativo"><b>+</b> {AVISO_TAMANHO_GRANDE}</p>}
          {personalized && <p className="aviso-tamanho ativo"><b>+</b> {AVISO_PERSONALIZACAO}</p>}

          <button type="submit" form="pedido" className="order whatsapp" disabled={gerando}>
            {gerando ? 'Preparando o pedido…' : 'Finalizar pedido'}
          </button>
          {aviso && !pronto && <p className="small" role="alert">{aviso}</p>}
          <p className="small">Você revisa o pedido e envia pelo WhatsApp, em texto e em imagem. O pagamento é combinado na conversa.</p>
        </aside>
      </div>

      <Promessas variante="painel" />

      <dialog ref={dialogo} className="pedido-pronto" aria-labelledby="pedido-pronto-titulo"
        onClose={() => setPronto(null)}>
        {pronto && (
          <>
            <div className="pp-cabeca">
              <h2 id="pedido-pronto-titulo">{codigo ? `Pedido ${codigo} pronto` : 'Pedido pronto'}</h2>
              <button type="button" onClick={() => dialogo.current?.close()} aria-label="Fechar">×</button>
            </div>
            <p className="small">Envie os dois para a Arkad Sports: primeiro o texto, depois a imagem.</p>
            <ol className="pp-passos">
              <li>
                <a className="order whatsapp" href={orderLink(summary, entrega, codigo)} target="_blank" rel="noopener"
                  onClick={() => setEnviado((e) => ({ ...e, texto: true }))}>
                  {enviado.texto ? <Check size={18} aria-hidden="true" /> : <MessageCircle size={18} aria-hidden="true" />}
                  1. Enviar o pedido no WhatsApp
                </a>
              </li>
              <li>
                <button type="button" className="order" onClick={enviarImagem}>
                  {enviado.imagem ? <Check size={18} aria-hidden="true" /> : <ImageIcon size={18} aria-hidden="true" />}
                  2. Enviar a imagem do pedido
                </button>
              </li>
            </ol>
            {aviso && <p className="pp-aviso" role="status">{aviso}</p>}
            <img className="pp-imagem" src={pronto.url} alt="Imagem do pedido com as peças, o total e os dados de entrega" />
            <a className="pp-baixar" href={pronto.url} download={pronto.arquivo.name}>
              <Download size={16} aria-hidden="true" /> Baixar a imagem
            </a>
          </>
        )}
      </dialog>
    </>
  );
}
