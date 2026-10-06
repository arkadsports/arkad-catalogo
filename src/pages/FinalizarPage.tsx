// Concluir compra: depois do carrinho, o cliente informa a entrega, a forma de
// pagamento e alguma observação. Ao concluir, o pedido entra no ERP e vai
// pronto para o WhatsApp — em texto e em imagem — com o número do pedido.
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Check, Download, ImageIcon, MessageCircle } from 'lucide-react';
import { money, pastaDe, productName, useCatalog } from '../lib/catalog';
import { CAMPOS_ENTREGA, chave, orderLink, persText, useCartSummary, type Conclusao, type Entrega } from '../lib/cart';
import { buscarCep, carregarEntrega, mascaraCep, mascaraCpf, mascaraTelefone, salvarEntrega, validarEntrega } from '../lib/entrega';
import { gerarImagemPedido } from '../lib/pedido-imagem';
import { enviarPedido } from '../lib/erp';
import { AVISO_PERSONALIZACAO, AVISO_TAMANHO_GRANDE, FORMAS_PAGAMENTO } from '../config';
import { Loading, Photo } from '../components/cards';

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

export default function FinalizarPage() {
  const { ready } = useCatalog();
  const summary = useCartSummary();
  const [entrega, setEntrega] = useState<Entrega>(carregarEntrega);
  const [conclusao, setConclusao] = useState<Conclusao>({ pagamento: '', observacao: '' });
  const [erros, setErros] = useState<Partial<Record<keyof Entrega | 'pagamento', string>>>({});
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
  const { lines, count, subtotal, saving, pending, bigSizes, personalized } = summary;

  if (!lines.length) {
    return (
      <section className="carrinho-vazio">
        <h1 className="page-title">Seu carrinho está vazio</h1>
        <p className="lead">Escolha as camisas e adicione ao carrinho para concluir a compra.</p>
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

  const concluir = async (ev: FormEvent) => {
    ev.preventDefault();
    const encontrados: typeof erros = { ...validarEntrega(entrega) };
    if (!conclusao.pagamento) encontrados.pagamento = 'Escolha a forma de pagamento.';
    setErros(encontrados);
    const primeiro = ORDEM_FORM.find((k) => encontrados[k]);
    if (primeiro) { document.getElementById(`entrega-${primeiro}`)?.focus(); return; }
    if (encontrados.pagamento) { document.getElementById('pagamento')?.scrollIntoView({ block: 'center' }); return; }
    salvarEntrega(entrega);
    setGerando(true);
    // Primeiro o pedido entra no ERP, para o número dele ir na mensagem e na
    // imagem. Se o ERP falhar, o pedido segue pelo WhatsApp sem número.
    const numero = await enviarPedido(summary, entrega, conclusao);
    setCodigo(numero);
    try {
      const blob = await gerarImagemPedido(summary, entrega, numero, conclusao);
      const arquivo = new File([blob], `pedido-arkad-sports-${Date.now()}.png`, { type: 'image/png' });
      setEnviado({ texto: false, imagem: false });
      setAviso('');
      setPronto({ url: URL.createObjectURL(blob), arquivo });
    } catch {
      setAviso('Não conseguimos gerar a imagem. Envie o pedido em texto; a imagem pode ser enviada depois.');
      window.open(orderLink(summary, entrega, numero, conclusao), '_blank', 'noopener');
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
      <Link to="/carrinho" className="voltar"><ArrowLeft size={16} aria-hidden="true" /> Voltar ao carrinho</Link>
      <h1 className="page-title">Concluir compra</h1>
      <p className="lead">Preencha os dados de entrega e a forma de pagamento. Depois é só enviar o pedido pelo WhatsApp.</p>

      <form id="concluir" className="carrinho" onSubmit={concluir} noValidate>
        <div className="carrinho-principal">
          <section className="entrega">
            <h2>1. Dados para entrega</h2>
            <p className="small">Todos os campos são obrigatórios.</p>
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
          </section>

          <fieldset id="pagamento" className="entrega pagamento"
            aria-invalid={erros.pagamento ? true : undefined} aria-describedby={erros.pagamento ? 'erro-pagamento' : undefined}>
            <legend><h2>2. Forma de pagamento</h2></legend>
            <p className="small">O pagamento é feito depois que confirmarmos o pedido com você no WhatsApp.</p>
            <div className="pagamento-opcoes">
              {FORMAS_PAGAMENTO.map((f) => (
                <label key={f.valor} className={conclusao.pagamento === f.valor ? 'escolhida' : undefined}>
                  <input type="radio" name="pagamento" value={f.valor} checked={conclusao.pagamento === f.valor}
                    onChange={() => { setConclusao((c) => ({ ...c, pagamento: f.valor })); setErros((e) => ({ ...e, pagamento: undefined })); }} />
                  <span><b>{f.valor}</b><small>{f.detalhe}</small></span>
                </label>
              ))}
            </div>
            {erros.pagamento && <span id="erro-pagamento" className="erro">{erros.pagamento}</span>}
          </fieldset>

          <section className="entrega">
            <h2>3. Observações</h2>
            <label className="observacao">
              <span className="small">Opcional: algo que devemos saber sobre o pedido ou a entrega.</span>
              <textarea rows={3} maxLength={500} value={conclusao.observacao}
                onChange={(e) => setConclusao((c) => ({ ...c, observacao: e.target.value }))}
                placeholder="Ex.: entregar em horário comercial, presente para aniversário..." />
            </label>
          </section>
        </div>

        <aside className="resumo" aria-label="Resumo do pedido">
          <h2>Seu pedido</h2>
          <ul className="resumo-itens">
            {lines.map((l) => (
              <li key={chave(l)}>
                <Photo id={pastaDe(l.product)} index={l.product.c ?? 0} alt={productName(l.product)} has={l.product.ph > 0} />
                <span>
                  {l.team?.name} · {l.product.type}{l.product.s ? ` ${l.product.s}` : ''}
                  <small>{l.qty} × tam. {l.size || 'a combinar'}{persText(l) ? ` · ${persText(l)}` : ''}</small>
                </span>
                <b>{l.total === undefined ? 'a confirmar' : money(l.total)}</b>
              </li>
            ))}
          </ul>
          <dl className="resumo-linhas">
            <div><dt>Peças</dt><dd>{count}</dd></div>
            {saving > 0 && <div className="economia"><dt>Desconto por quantidade</dt><dd>− {money(saving)}</dd></div>}
            <div><dt>Frete</dt><dd className="gratis">Grátis</dd></div>
            {conclusao.pagamento && <div><dt>Pagamento</dt><dd>{conclusao.pagamento}</dd></div>}
            <div className="total"><dt>Total</dt><dd>{money(subtotal)}</dd></div>
          </dl>
          {pending > 0 && (
            <p className="small">+ {pending} {pending === 1 ? 'peça' : 'peças'} com preço a confirmar pelo WhatsApp.</p>
          )}
          {bigSizes && <p className="aviso-tamanho ativo"><b>+</b> {AVISO_TAMANHO_GRANDE}</p>}
          {personalized && <p className="aviso-tamanho ativo"><b>+</b> {AVISO_PERSONALIZACAO}</p>}

          <button type="submit" className="order whatsapp" disabled={gerando}>
            {gerando ? 'Preparando o pedido…' : 'Concluir pedido pelo WhatsApp'}
          </button>
          {aviso && !pronto && <p className="small" role="alert">{aviso}</p>}
          <p className="small">O pedido vai para a Arkad Sports pelo WhatsApp, em texto e em imagem. Confirmamos tudo com você antes do pagamento.</p>
        </aside>
      </form>

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
                <a className="order whatsapp" href={orderLink(summary, entrega, codigo, conclusao)} target="_blank" rel="noopener"
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
            {codigo && (
              <p className="small">Depois da confirmação, acompanhe o pedido em <Link to="/acompanhar">Meu pedido</Link> com o seu telefone.</p>
            )}
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
