// Carrinho: fica no navegador do cliente (localStorage) e sobrevive a recarregar
// a página. O pedido é fechado no WhatsApp — o site só monta a mensagem.
//
// O preço de cada peça depende do TOTAL de peças do pedido (config.ts,
// PRICE_TIERS): colocar mais uma peça pode baratear todas as outras.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { isBigSize, money, priceOf, productTitle, tierIndex, useCatalog, whatsappUrl, type Product, type Team } from './catalog';

/** O que o cliente pede para estampar na camisa (tudo opcional). */
export type Personalizacao = { nome?: string; numero?: string; patch?: string };
/** `pers`: texto livre de carrinhos antigos, de antes dos campos separados. */
export type CartItem = { id: string; size: string; qty: number; pers?: string } & Personalizacao;
const KEY = 'arkad-carrinho';
const MAX_QTY = 20;

/** Identifica a linha: a mesma camisa com outro nome ou patch é outra linha. */
export const chave = (i: CartItem) => [i.id, i.size, i.nome ?? '', i.numero ?? '', i.patch ?? '', i.pers ?? ''].join('|');

/** A personalização em uma linha de texto ("" = sem personalização). */
export function persText(i: CartItem) {
  const partes = [
    i.nome?.trim() && `nome ${i.nome.trim()}`,
    i.numero?.trim() && `número ${i.numero.trim()}`,
    i.patch && `patch ${i.patch}`,
    i.pers?.trim(),
  ].filter(Boolean) as string[];
  if (!partes.length) return '';
  const texto = partes.join(' · ');
  return texto[0].toUpperCase() + texto.slice(1);
}

/** Limpa o que veio do formulário: nome em maiúsculas, número só com dígitos. */
export function limparPersonalizacao(p: Personalizacao): Personalizacao {
  const nome = (p.nome ?? '').trim().toUpperCase();
  const numero = (p.numero ?? '').replace(/\D/g, '').slice(0, 2);
  return { ...(nome && { nome }), ...(numero && { numero }), ...(p.patch && { patch: p.patch }) };
}

type CartCtx = {
  items: CartItem[];
  count: number;
  add: (id: string, size: string, qty?: number, pers?: Personalizacao) => void;
  /** Muda a quantidade da linha (pela chave); 0 remove. */
  setQty: (linha: string, qty: number) => void;
  remove: (linha: string) => void;
  clear: () => void;
  /** Último item adicionado, para o aviso "adicionado ao carrinho". */
  last: { id: string; size: string; at: number } | null;
  dismiss: () => void;
};
const Ctx = createContext<CartCtx | null>(null);

function load(): CartItem[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(raw)
      ? raw.filter((i) => typeof i?.id === 'string' && typeof i?.size === 'string' && i.qty > 0)
      : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(load);
  const [last, setLast] = useState<CartCtx['last']>(null);

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(items)); } catch { /* navegador sem armazenamento */ }
  }, [items]);

  const add = useCallback((id: string, size: string, qty = 1, pers: Personalizacao = {}) => {
    const novo: CartItem = { id, size, qty, ...limparPersonalizacao(pers) };
    setItems((list) => {
      const found = list.find((i) => chave(i) === chave(novo));
      if (found) return list.map((i) => (i === found ? { ...i, qty: Math.min(i.qty + qty, MAX_QTY) } : i));
      return [...list, novo];
    });
    setLast({ id, size, at: Date.now() });
  }, []);

  const setQty = useCallback((linha: string, qty: number) => {
    setItems((list) => (qty <= 0
      ? list.filter((i) => chave(i) !== linha)
      : list.map((i) => (chave(i) === linha ? { ...i, qty: Math.min(qty, MAX_QTY) } : i))));
  }, []);

  const value = useMemo<CartCtx>(() => ({
    items,
    count: items.reduce((n, i) => n + i.qty, 0),
    add,
    setQty,
    remove: (linha) => setQty(linha, 0),
    clear: () => setItems([]),
    last,
    dismiss: () => setLast(null),
  }), [items, add, setQty, last]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useCart precisa estar dentro de <CartProvider>');
  return ctx;
}

export type CartLine = CartItem & {
  product: Product; team?: Team;
  /** Preço da peça na faixa atual do pedido. undefined = a confirmar. */
  unit?: number;
  /** Preço da peça se fosse comprada sozinha — base da economia. */
  single?: number;
  total?: number;
  /** Tamanho que pode ter acréscimo do fornecedor. */
  big: boolean;
};

/** O carrinho já com preços: linhas, subtotal, economia e a próxima faixa. */
export function useCartSummary() {
  const { items, count } = useCart();
  const { productById, teamBySlug } = useCatalog();

  return useMemo(() => {
    const lines: CartLine[] = [];
    for (const i of items) {
      const product = productById.get(i.id);
      if (!product) continue; // produto saiu do catálogo
      const unit = priceOf(product, count);
      const single = priceOf(product, 1);
      lines.push({
        ...i, product, team: teamBySlug.get(product.team), unit, single,
        total: unit === undefined ? undefined : unit * i.qty, big: isBigSize(i.size),
      });
    }
    const priced = lines.filter((l) => l.unit !== undefined);
    const subtotal = priced.reduce((s, l) => s + l.total!, 0);
    const full = priced.reduce((s, l) => s + l.single! * l.qty, 0);
    const pending = lines.filter((l) => l.unit === undefined).reduce((n, l) => n + l.qty, 0);

    // Quanto as peças que já estão no carrinho baixariam com UMA peça a mais.
    let next: { missing: number; saving: number } | null = null;
    if (count > 0 && count < 5) {
      const saving = priced.reduce((s, l) => s + (l.unit! - priceOf(l.product, count + 1)!) * l.qty, 0);
      if (saving > 0) next = { missing: 1, saving };
    }

    return {
      lines, count, tier: tierIndex(count), subtotal, saving: full - subtotal, pending, next,
      bigSizes: lines.some((l) => l.big),
      personalized: lines.some((l) => persText(l) !== ''),
    };
  }, [items, count, productById, teamBySlug]);
}
export type CartSummary = ReturnType<typeof useCartSummary>;

// ---------- Dados de entrega ----------
export type Entrega = {
  nome: string; rua: string; cep: string; bairro: string; cidade: string;
  estado: string; pais: string; cpf: string; contato: string; email: string;
};
export const ENTREGA_VAZIA: Entrega = {
  nome: '', rua: '', cep: '', bairro: '', cidade: '', estado: '', pais: 'Brasil', cpf: '', contato: '', email: '',
};
/** Os campos na ordem em que aparecem na mensagem e na imagem. */
export const CAMPOS_ENTREGA: [keyof Entrega, string][] = [
  ['nome', 'Nome completo'], ['rua', 'Rua e número'], ['cep', 'CEP'], ['bairro', 'Bairro'],
  ['cidade', 'Cidade'], ['estado', 'Estado'], ['pais', 'País'], ['cpf', 'CPF'],
  ['contato', 'Contato'], ['email', 'E-mail'],
];

/** Texto do tamanho, com o aviso de acréscimo quando é tamanho grande. */
export const sizeText = (l: CartLine) =>
  (l.size || 'a combinar') + (l.big ? ' (tamanho grande: acréscimo a confirmar)' : '');

/** A mensagem do pedido que vai pronta para o WhatsApp. `codigo` é o número
 *  que o ERP deu ao pedido, para a loja achá-lo no painel. */
export function orderText(summary: CartSummary, entrega: Entrega, codigo?: string | null) {
  const linhas = summary.lines.map((l, n) => {
    const preco = l.unit === undefined ? 'preço a confirmar' : `${l.qty} × ${money(l.unit)} = ${money(l.total!)}`;
    const pers = persText(l) ? `\n   Personalização: ${persText(l)} (valor a confirmar)` : '';
    return `${n + 1}. ${productTitle(l.product, l.team)}\n   Tamanho: ${sizeText(l)} · ${preco}${pers}\n   Código: ${l.product.id}`;
  });
  const partes = [
    'Olá! Quero fazer este pedido pelo catálogo da Arkad Sports:',
    codigo ? `*Pedido ${codigo}*` : null,
    '',
    ...linhas,
    '',
    `Total: ${summary.count} ${summary.count === 1 ? 'peça' : 'peças'} · ${money(summary.subtotal)}`
      + (summary.pending ? ` + ${summary.pending} a confirmar` : ''),
    summary.saving > 0 ? `Desconto por quantidade: ${money(summary.saving)}` : null,
    'Frete grátis para todo o Brasil',
    '',
    '*Dados para entrega*',
    ...CAMPOS_ENTREGA.map(([k, rotulo]) => `${rotulo}: ${entrega[k].trim()}`),
  ];
  // null = linha que não se aplica a este pedido.
  return partes.filter((p) => p !== null).join('\n').trim();
}

export const orderLink = (summary: CartSummary, entrega: Entrega, codigo?: string | null) =>
  whatsappUrl(orderText(summary, entrega, codigo));
