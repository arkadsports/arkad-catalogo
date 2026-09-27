// A imagem do pedido: o mesmo conteúdo da mensagem, desenhado num PNG com a
// foto de frente de cada peça, para o cliente mandar junto no WhatsApp.
//
// As fotos vêm do R2, que não libera CORS: desenhadas direto, "sujariam" o
// canvas e o PNG não sairia. Por isso elas passam pelo próprio site, em
// /foto/... (repasse configurado no vercel.json e no vite.config.ts).
import { IMAGE_BASE, STORE } from '../config';
import { money, TIER_LABELS } from './catalog';
import { CAMPOS_ENTREGA, sizeText, type CartSummary, type Entrega } from './cart';

const W = 1080;
const PAD = 56;
const AZUL = '#004AAD';
const TINTA = '#0C1A2E';
const APAGADO = '#57687F';
const LINHA = '#D8E0EC';
const VERDE = '#1B8A4A';
const COND = '"Barlow Condensed", "Arial Narrow", Arial, sans-serif';
const TEXTO = 'Barlow, "Segoe UI", Arial, sans-serif';
const FOTO = 200;

/** Foto de frente da peça, pelo mesmo endereço do site. */
const fotoUrl = (id: string, index: number) =>
  /^https?:/.test(IMAGE_BASE) ? `/foto/${id}/${index}-thumb.webp` : `${IMAGE_BASE}/${id}/${index}-thumb.webp`;

function carregar(src: string) {
  return new Promise<HTMLImageElement | null>((ok) => {
    const im = new Image();
    im.onload = () => ok(im);
    im.onerror = () => ok(null);
    im.src = src;
  });
}

/** Quebra o texto em linhas que cabem na largura. */
function quebrar(ctx: CanvasRenderingContext2D, texto: string, largura: number) {
  const linhas: string[] = [];
  let atual = '';
  for (const palavra of texto.split(/\s+/)) {
    const teste = atual ? `${atual} ${palavra}` : palavra;
    if (ctx.measureText(teste).width > largura && atual) { linhas.push(atual); atual = palavra; } else atual = teste;
  }
  if (atual) linhas.push(atual);
  return linhas;
}

function retanguloRedondo(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

export async function gerarImagemPedido(summary: CartSummary, entrega: Entrega, codigo?: string | null): Promise<Blob> {
  await Promise.all([
    document.fonts.load(`800 40px ${COND}`), document.fonts.load(`700 40px ${COND}`),
    document.fonts.load(`500 20px ${TEXTO}`), document.fonts.load(`600 20px ${TEXTO}`),
  ]).catch(() => {});
  const fotos = await Promise.all(summary.lines.map((l) => carregar(fotoUrl(l.id, l.product.c ?? 0))));

  // Duas passadas: a primeira só mede a altura, a segunda desenha.
  const desenhar = (ctx: CanvasRenderingContext2D, medir: boolean) => {
    const pinta = (fn: () => void) => { if (!medir) fn(); };
    const texto = (t: string, x: number, y: number, fonte: string, cor = TINTA, alinhar: CanvasTextAlign = 'left') => {
      ctx.font = fonte;
      pinta(() => { ctx.fillStyle = cor; ctx.textAlign = alinhar; ctx.fillText(t, x, y); });
    };

    // Cabeçalho da marca
    pinta(() => { ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, W, 99999); ctx.fillStyle = AZUL; ctx.fillRect(0, 0, W, 180); });
    ctx.textBaseline = 'alphabetic';
    texto('ARKAD', PAD, 100, `800 72px ${COND}`, '#FFFFFF');
    ctx.font = `800 72px ${COND}`;
    const larguraArkad = ctx.measureText('ARKAD ').width;
    texto('SPORTS', PAD + larguraArkad, 100, `700 72px ${COND}`, '#9EC6FF');
    texto('Pedido pelo catálogo', PAD, 142, `500 24px ${TEXTO}`, '#DCE9FB');
    const data = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    // Com o número do ERP, o cabeçalho diz qual pedido é (ex.: ARK-0012).
    texto(codigo ?? 'PEDIDO', W - PAD, 90, `800 44px ${COND}`, '#FFFFFF', 'right');
    texto(data, W - PAD, 132, `500 24px ${TEXTO}`, '#DCE9FB', 'right');

    let y = 180 + 44;

    // Peças
    const xTexto = PAD + FOTO + 28;
    const largTexto = W - PAD - xTexto;
    summary.lines.forEach((l, i) => {
      const topo = y;
      let ty = topo + 40;
      ctx.font = `700 34px ${COND}`;
      const titulo = `${l.team?.name ?? ''} · ${l.product.type}${l.product.s ? ` ${l.product.s}` : ''}`.toUpperCase();
      for (const linha of quebrar(ctx, titulo, largTexto)) { texto(linha, xTexto, ty, `700 34px ${COND}`); ty += 38; }
      if (l.product.n) { texto(l.product.n, xTexto, ty, `500 22px ${TEXTO}`, APAGADO); ty += 32; }
      ctx.font = `600 22px ${TEXTO}`;
      for (const linha of quebrar(ctx, `Tamanho: ${sizeText(l)}`, largTexto)) { texto(linha, xTexto, ty, `600 22px ${TEXTO}`, l.big ? '#B45309' : TINTA); ty += 30; }
      if (l.pers?.trim()) {
        ctx.font = `600 22px ${TEXTO}`;
        for (const linha of quebrar(ctx, `Personalização: ${l.pers.trim()}`, largTexto)) { texto(linha, xTexto, ty, `600 22px ${TEXTO}`, AZUL); ty += 30; }
      }
      texto(`Código ${l.product.id}`, xTexto, ty, `500 20px ${TEXTO}`, APAGADO); ty += 38;
      const preco = l.unit === undefined ? 'Preço a confirmar' : `${l.qty} × ${money(l.unit)}`;
      texto(preco, xTexto, ty, `500 22px ${TEXTO}`, APAGADO);
      if (l.total !== undefined) texto(money(l.total), W - PAD, ty, `800 34px ${COND}`, TINTA, 'right');
      ty += 16;

      const altura = Math.max(FOTO, ty - topo);
      const foto = fotos[i];
      pinta(() => {
        retanguloRedondo(ctx, PAD, topo, FOTO, FOTO, 16);
        ctx.fillStyle = '#F4F6FA'; ctx.fill();
        if (foto) {
          ctx.save(); ctx.clip();
          const escala = Math.min(FOTO / foto.width, FOTO / foto.height);
          const fw = foto.width * escala, fh = foto.height * escala;
          ctx.drawImage(foto, PAD + (FOTO - fw) / 2, topo + (FOTO - fh) / 2, fw, fh);
          ctx.restore();
        }
      });
      y = topo + altura + 26;
      if (i < summary.lines.length - 1) pinta(() => { ctx.fillStyle = LINHA; ctx.fillRect(PAD, y - 13, W - PAD * 2, 2); });
    });

    // Resumo
    y += 10;
    const caixa = y;
    const linhasResumo: [string, string, string?][] = [
      ['Peças', `${summary.count} (preço da faixa ${TIER_LABELS[summary.tier]})`],
      ...(summary.saving > 0 ? [['Desconto por quantidade', `− ${money(summary.saving)}`, VERDE] as [string, string, string]] : []),
      ['Frete', 'Grátis', VERDE],
      ['Imposto de importação', 'Incluso'],
    ];
    y += 48;
    for (const [rotulo, valor, cor] of linhasResumo) {
      texto(rotulo, PAD + 28, y, `500 24px ${TEXTO}`, APAGADO);
      texto(valor, W - PAD - 28, y, `600 24px ${TEXTO}`, cor ?? TINTA, 'right');
      y += 40;
    }
    y += 16;
    texto('TOTAL', PAD + 28, y, `800 38px ${COND}`);
    texto(money(summary.subtotal), W - PAD - 28, y, `800 52px ${COND}`, AZUL, 'right');
    y += 22;
    const avisos = [
      summary.pending ? `+ ${summary.pending} ${summary.pending === 1 ? 'peça' : 'peças'} com preço a confirmar` : '',
      summary.bigSizes ? 'Tamanho grande: acréscimo a confirmar' : '',
      summary.personalized ? 'Personalização: valor a confirmar' : '',
    ].filter(Boolean);
    for (const a of avisos) { y += 32; texto(a, PAD + 28, y, `500 21px ${TEXTO}`, '#B45309'); }
    y += 30;
    pinta(() => { retanguloRedondo(ctx, PAD, caixa, W - PAD * 2, y - caixa, 18); ctx.strokeStyle = LINHA; ctx.lineWidth = 2; ctx.stroke(); });

    // Entrega
    y += 62;
    texto('DADOS PARA ENTREGA', PAD, y, `800 36px ${COND}`, AZUL);
    y += 20;
    for (const [k, rotulo] of CAMPOS_ENTREGA) {
      y += 38;
      texto(rotulo, PAD, y, `500 22px ${TEXTO}`, APAGADO);
      ctx.font = `600 23px ${TEXTO}`;
      const linhas = quebrar(ctx, entrega[k].trim(), W - PAD - 300);
      linhas.forEach((linha, n) => texto(linha, 300, y + n * 32, `600 23px ${TEXTO}`));
      y += (linhas.length - 1) * 32;
    }

    // Rodapé
    y += 56;
    pinta(() => { ctx.fillStyle = '#021733'; ctx.fillRect(0, y, W, 96); });
    texto(`Sob encomenda · entrega em ${STORE.leadTime} · imposto incluso · frete grátis`, W / 2, y + 58, `600 22px ${TEXTO}`, '#DCE9FB', 'center');
    return y + 96;
  };

  const medida = document.createElement('canvas').getContext('2d')!;
  const altura = Math.ceil(desenhar(medida, true));
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = altura;
  desenhar(canvas.getContext('2d')!, false);
  return new Promise((ok, falha) => canvas.toBlob((b) => (b ? ok(b) : falha(new Error('PNG não gerado'))), 'image/png'));
}
