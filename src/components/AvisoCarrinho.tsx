// O aviso que sobe no canto da tela quando uma peça entra no carrinho.
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import { useCart } from '../lib/cart';
import { productName, useCatalog } from '../lib/catalog';

export function AvisoCarrinho() {
  const { last, dismiss, count } = useCart();
  const { productById } = useCatalog();

  useEffect(() => {
    if (!last) return;
    const t = setTimeout(dismiss, 5000);
    return () => clearTimeout(t);
  }, [last, dismiss]);

  const p = last && productById.get(last.id);
  if (!last || !p) return null;

  return (
    <div className="aviso-carrinho" role="status">
      <Check aria-hidden="true" size={20} />
      <p>
        <strong>Adicionado ao carrinho</strong>
        <span>{productName(p)}{last.size ? ` · ${last.size}` : ''} · {count} {count === 1 ? 'peça' : 'peças'} no pedido</span>
      </p>
      <Link to="/carrinho" onClick={dismiss}>Ver carrinho</Link>
      <button type="button" onClick={dismiss} aria-label="Fechar aviso">×</button>
    </div>
  );
}
