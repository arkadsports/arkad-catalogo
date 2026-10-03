// Conversa com o painel de gestão (ERP): preços, pedidos e visitas.
//
// Nada aqui pode atrapalhar o cliente. Toda chamada tem prazo curto, nunca
// lança erro e, se o ERP estiver fora do ar ou desligado (ERP_URL vazio), o
// site segue como antes: preços do config.ts e pedido só pelo WhatsApp.
import { ERP_URL } from '../config';
import { persText, type CartSummary, type Conclusao, type Entrega } from './cart';
import { img, priceKey, productTitle } from './catalog';

export type Faixas = readonly [number, number, number, number, number];

async function comPrazo(url: string, init: RequestInit, ms: number) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

// ---------- Preços ----------

const faixasValidas = (v: unknown): v is Faixas =>
  Array.isArray(v) && v.length === 5 && v.every((n) => typeof n === 'number' && n > 0);

/** Tabela do ERP: linha → cinco faixas, ou null ("Consulte"). null = sem ERP. */
export async function carregarPrecos(): Promise<Record<string, Faixas | null> | null> {
  if (!ERP_URL) return null;
  try {
    const r = await comPrazo(`${ERP_URL}/api/publico/precos`, {}, 2500);
    if (!r.ok) return null;
    const { precos } = await r.json();
    if (!precos || typeof precos !== 'object') return null;
    const limpos: Record<string, Faixas | null> = {};
    for (const [chave, v] of Object.entries(precos)) {
      if (v === null) limpos[chave] = null;
      else if (faixasValidas(v)) limpos[chave] = v;
    }
    return limpos;
  } catch {
    return null;
  }
}

// ---------- Pedido ----------

// O mesmo carrinho com os mesmos dados, no mesmo dia, é o mesmo pedido:
// clicar de novo em "Finalizar" não cria outro no ERP.
async function referencia(corpo: unknown) {
  const dia = new Date().toISOString().slice(0, 10);
  const bytes = new TextEncoder().encode(JSON.stringify(corpo) + dia);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  const hex = [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `site-${dia}-${hex.slice(0, 24)}`;
}

/** Registra o pedido no ERP. Devolve o código (ex.: ARK-0012), ou null. */
export async function enviarPedido(summary: CartSummary, entrega: Entrega, conclusao?: Conclusao): Promise<string | null> {
  if (!ERP_URL) return null;
  try {
    const itens = summary.lines.map((l) => {
      const foto = img(l.id, l.product.c ?? 0, 'thumb');
      return {
        produto: l.id,
        chave: priceKey(l.product),
        titulo: productTitle(l.product, l.team),
        tamanho: l.size || undefined,
        qtd: l.qty,
        personalizacao: persText(l) || undefined,
        // Em desenvolvimento as fotos são locais (/img); só endereço público serve.
        foto: foto.startsWith('https://') ? foto : undefined,
      };
    });
    const cliente = Object.fromEntries(Object.entries(entrega).map(([k, v]) => [k, v.trim()]));
    const ref = await referencia({ itens, cliente });

    const r = await comPrazo(`${ERP_URL}/api/publico/pedidos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ref, cliente, itens, subtotalSite: summary.subtotal,
        pagamento: conclusao?.pagamento || undefined,
        observacao: conclusao?.observacao.trim() || undefined,
      }),
    }, 6000);
    if (!r.ok) return null;
    const { codigo } = await r.json();
    return typeof codigo === 'string' ? codigo : null;
  } catch {
    return null;
  }
}

// ---------- Visitas ----------

const CHAVE_VISITANTE = 'arkad-visitante';
const CHAVE_INTERNO = 'arkad-interno';
let primeiraDaSessao = true;

// Identificador aleatório deste navegador: conta visitantes sem saber quem são.
function visitante() {
  try {
    let id = localStorage.getItem(CHAVE_VISITANTE);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(CHAVE_VISITANTE, id);
    }
    return id;
  } catch {
    return null;
  }
}

// A loja abre o site o tempo todo para atender. Abrir uma vez com ?interno=1
// marca este navegador e as visitas dele deixam de contar (?interno=0 desfaz).
function navegadorInterno() {
  try {
    const flag = new URLSearchParams(location.search).get('interno');
    if (flag === '1') localStorage.setItem(CHAVE_INTERNO, '1');
    if (flag === '0') localStorage.removeItem(CHAVE_INTERNO);
    return localStorage.getItem(CHAVE_INTERNO) === '1';
  } catch {
    return false;
  }
}

/** Conta uma página aberta. sendBeacon: não espera resposta, não atrasa nada. */
export function registrarVisita(path: string, extra: { productRef?: string; teamSlug?: string }) {
  if (!ERP_URL || navegadorInterno() || !navigator.sendBeacon) return;
  const visitorId = visitante();
  if (!visitorId) return;

  // De onde a pessoa veio só faz sentido na primeira página: depois disso o
  // navegador continua mostrando a mesma origem em toda navegação interna.
  const externo = document.referrer && !document.referrer.startsWith(location.origin);
  const referrer = primeiraDaSessao && externo ? document.referrer : undefined;
  primeiraDaSessao = false;

  const corpo = JSON.stringify({ visitorId, path, ...extra, referrer });
  // text/plain não dispara a pergunta prévia (preflight) do navegador.
  navigator.sendBeacon(`${ERP_URL}/api/publico/visitas`, new Blob([corpo], { type: 'text/plain' }));
}

// ---------- Acompanhar pedido ----------

export type EventoRastreio = { descricao: string; local: string | null; data: string };
export type PedidoAcompanhado = {
  codigo: string;
  data: string;
  cancelado: boolean;
  situacao: string;
  etapa: number;
  etapas: string[];
  itens: { titulo: string; tamanho: string | null; qtd: number; foto: string | null }[];
  rastreio: {
    codigo: string;
    transportadora: string | null;
    situacao: string;
    aguardandoTaxa: boolean;
    atualizadoEm: string;
    eventos: EventoRastreio[];
  } | null;
};

/** Pedidos do telefone informado, com a etapa e o rastreio cadastrados no ERP. */
export async function consultarPedidos(
  telefone: string,
): Promise<{ pedidos: PedidoAcompanhado[] } | { erro: string }> {
  if (!ERP_URL) return { erro: 'O acompanhamento está fora do ar. Fale com a gente pelo WhatsApp.' };
  try {
    const r = await comPrazo(`${ERP_URL}/api/publico/acompanhar?telefone=${encodeURIComponent(telefone)}`, {}, 8000);
    const dados = await r.json().catch(() => null);
    if (!r.ok) return { erro: dados?.error ?? 'Não conseguimos consultar agora. Tente de novo em instantes.' };
    return { pedidos: Array.isArray(dados?.pedidos) ? dados.pedidos : [] };
  } catch {
    return { erro: 'Não conseguimos consultar agora. Tente de novo em instantes.' };
  }
}
