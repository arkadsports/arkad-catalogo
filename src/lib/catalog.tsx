// Carrega public/data/catalog.json uma vez e entrega para todas as páginas.
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { IMAGE_BASE, PRICE_TIERS, STORE } from '../config';

export type Country = { slug: string; name: string; flag: string; clubs: number; products: number };
export type Team = {
  slug: string; name: string; kind: 'clube' | 'selecao' | 'outros'; country: string; countrySlug: string;
  league: string; products: number; locked?: number; cover: string | null; coverC?: number; flag?: string;
};
export type Product = {
  id: string; t: string; n: string; team: string; type: string; s: string; y: number; sz: string; ph: number;
  /** Índice da foto que o fornecedor usa como capa — a da peça inteira. */
  c?: number;
};
type Catalog = { generatedAt: string; countries: Country[]; teams: Team[]; products: Product[] };

type Ctx = {
  ready: boolean; error: string | null; catalog: Catalog;
  teamBySlug: Map<string, Team>; productById: Map<string, Product>; productsByTeam: Map<string, Product[]>;
};
const empty: Catalog = { generatedAt: '', countries: [], teams: [], products: [] };
const CatalogContext = createContext<Ctx | null>(null);

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [catalog, setCatalog] = useState<Catalog>(empty);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/data/catalog.json')
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((c: Catalog) => { setCatalog(c); setReady(true); })
      .catch(() => setError('Não foi possível carregar o catálogo. Rode "npm run build-catalog" e recarregue a página.'));
  }, []);

  const value = useMemo<Ctx>(() => {
    const productsByTeam = new Map<string, Product[]>();
    for (const p of catalog.products) {
      const list = productsByTeam.get(p.team) ?? [];
      list.push(p);
      productsByTeam.set(p.team, list);
    }
    return {
      ready, error, catalog, productsByTeam,
      teamBySlug: new Map(catalog.teams.map((t) => [t.slug, t])),
      productById: new Map(catalog.products.map((p) => [p.id, p])),
    };
  }, [catalog, ready, error]);

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog() {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error('useCatalog precisa estar dentro de <CatalogProvider>');
  return ctx;
}

// ---------- Utilidades ----------
export const img = (id: string, index: number, size: 'thumb' | 'full') => `${IMAGE_BASE}/${id}/${index}-${size}.webp`;

export const money = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// Preço por faixa: o pedido inteiro define a faixa (config.ts, PRICE_TIERS).
export const TIER_LABELS = ['1 peça', '2 peças', '3 peças', '4 peças', '5 ou mais'] as const;
/** Faixa de preço (0 a 4) para um pedido com `total` peças. */
export const tierIndex = (total: number) => Math.min(Math.max(total, 1), 5) - 1;
export const tiersOf = (p: Product) => PRICE_TIERS[p.type];
/** Preço de uma peça quando o pedido tem `total` peças. Sem preço = undefined. */
export const priceOf = (p: Product, total = 1) => PRICE_TIERS[p.type]?.[tierIndex(total)];
/** O menor preço da peça (pedido de 5 ou mais). */
export const lowestPriceOf = (p: Product) => PRICE_TIERS[p.type]?.[4];

export const productName = (p: Product) => p.n || p.type;
export const productTitle = (p: Product, team?: Team) =>
  [team?.name, p.type, p.s].filter(Boolean).join(' ') + (p.n ? ` (${p.n})` : '');

/** Conversa no WhatsApp da loja, com mensagem pronta se houver. */
export const whatsappUrl = (text = '') =>
  `https://wa.me/${STORE.whatsapp}${text ? `?text=${encodeURIComponent(text)}` : ''}`;

export const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Busca simples: todas as palavras precisam aparecer no texto do produto/time
export function searchProducts(products: Product[], teamBySlug: Map<string, Team>, q: string) {
  const words = normalize(q).split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  return products.filter((p) => {
    const t = teamBySlug.get(p.team);
    const hay = normalize([p.id, p.t, p.n, p.type, p.s, t?.name, t?.country].join(' '));
    return words.every((w) => hay.includes(w));
  });
}

// Tamanhos individuais a partir de "S–4XL"
const ORDER = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL', '5XL'];
export function sizeList(range: string) {
  if (!range) return [];
  const [a, b] = range.replace('XXXXL', '4XL').replace('XXXL', '3XL').replace('2XL', 'XXL').split('–');
  const i = ORDER.indexOf(a), j = ORDER.indexOf(b);
  return i >= 0 && j >= i ? ORDER.slice(i, j + 1) : [];
}
