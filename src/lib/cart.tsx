// Carrinho: fica no navegador do cliente (localStorage) e sobrevive a recarregar
// a página. O pedido é fechado no WhatsApp — o site só monta a mensagem.
//
// O preço de cada peça depende do TOTAL de peças do pedido (config.ts,
// PRICE_TIERS): colocar mais uma peça pode baratear todas as outras.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { money, priceOf, productTitle, tierIndex, useCatalog, whatsappUrl, type Product, type Team } from './catalog';

export type CartItem = { id: string; size: string; qty: number };
const KEY = 'arkad-carrinho';
const MAX_QTY = 20;

type CartCtx = {
  items: CartItem[];
  count: number;
  add: (id: string, size: string, qty?: number) => void;
  setQty: (id: string, size: string, qty: number) => void;
  remove: (id: string, size: string) => void;
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

  const same = (a: CartItem, id: string, size: string) => a.id === id && a.size === size;

  const add = useCallback((id: string, size: string, qty = 1) => {
    setItems((list) => {
      const found = list.find((i) => same(i, id, size));
      if (found) return list.map((i) => (i === found ? { ...i, qty: Math.min(i.qty + qty, MAX_QTY) } : i));
      return [...list, { id, size, qty }];
    });
    setLast({ id, size, at: Date.now() });
  }, []);

  const setQty = useCallback((id: string, size: string, qty: number) => {
    setItems((list) => (qty <= 0
      ? list.filter((i) => !same(i, id, size))
      : list.map((i) => (same(i, id, size) ? { ...i, qty: Math.min(qty, MAX_QTY) } : i))));
  }, []);

  const value = useMemo<CartCtx>(() => ({
    items,
    count: items.reduce((n, i) => n + i.qty, 0),
    add,
    setQty,
    remove: (id, size) => setQty(id, size, 0),
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
      lines.push({ ...i, product, team: teamBySlug.get(product.team), unit, single, total: unit === undefined ? undefined : unit * i.qty });
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

    return { lines, count, tier: tierIndex(count), subtotal, saving: full - subtotal, pending, next };
  }, [items, count, productById, teamBySlug]);
}

/** A mensagem do pedido que vai pronta para o WhatsApp. */
export function orderMessage(
  summary: ReturnType<typeof useCartSummary>,
  cliente: { nome: string; cidade: string; obs: string },
) {
  const linhas = summary.lines.map((l, n) => {
    const preco = l.unit === undefined ? 'preço a confirmar' : `${l.qty} × ${money(l.unit)} = ${money(l.total!)}`;
    return `${n + 1}. ${productTitle(l.product, l.team)}\n   Tamanho: ${l.size || 'a combinar'} · ${preco}\n   Código: ${l.product.id}`;
  });
  const partes = [
    'Olá! Quero fazer este pedido pelo catálogo da Arkad Sports:',
    '',
    ...linhas,
    '',
    `Total: ${summary.count} ${summary.count === 1 ? 'peça' : 'peças'} · ${money(summary.subtotal)}`
      + (summary.pending ? ` + ${summary.pending} a confirmar` : ''),
    summary.saving > 0 ? `Desconto por quantidade: ${money(summary.saving)}` : null,
    'Frete grátis · imposto de importação incluso',
    '',
    cliente.nome.trim() ? `Nome: ${cliente.nome.trim()}` : null,
    cliente.cidade.trim() ? `Cidade/UF: ${cliente.cidade.trim()}` : null,
    cliente.obs.trim() ? `Observações: ${cliente.obs.trim()}` : null,
  ];
  // null = campo não preenchido, some da mensagem.
  return whatsappUrl(partes.filter((p) => p !== null).join('\n').trim());
}
