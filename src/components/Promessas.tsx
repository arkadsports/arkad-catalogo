// As quatro garantias da loja (config.ts, PROMESSAS).
//   "faixa":  a barra fina no topo de todas as páginas
//   "painel": os cartões em destaque na abertura e no carrinho
import { Clock, Package, ReceiptText, Truck, type LucideIcon } from 'lucide-react';
import { PROMESSAS } from '../config';

const ICONES: Record<(typeof PROMESSAS)[number]['icone'], LucideIcon> = {
  encomenda: Package,
  prazo: Clock,
  imposto: ReceiptText,
  frete: Truck,
};

export function Promessas({ variante }: { variante: 'faixa' | 'painel' }) {
  return (
    <ul className={`promessas promessas-${variante}`} aria-label="Como funciona a compra">
      {PROMESSAS.map((p) => {
        const Icone = ICONES[p.icone];
        return (
          <li key={p.icone}>
            <Icone aria-hidden="true" size={variante === 'faixa' ? 15 : 22} strokeWidth={2} />
            <span>
              <strong>{p.titulo}</strong>
              {variante === 'painel' && <small>{p.texto}</small>}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
