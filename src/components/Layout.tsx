import { useEffect, useState, type FormEvent } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';
import { STORE } from '../config';
import { useCart } from '../lib/cart';
import { Promessas } from './Promessas';
import { AvisoCarrinho } from './AvisoCarrinho';

export default function Layout() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [q, setQ] = useState(params.get('q') ?? '');
  const { pathname } = useLocation();
  const { count } = useCart();

  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (q.trim()) navigate(`/busca?q=${encodeURIComponent(q.trim())}`);
  };

  return (
    <>
      {/* As garantias da loja, antes de tudo: é a primeira coisa que o cliente lê. */}
      <Promessas variante="faixa" />
      <header className="site-header">
        <div className="wrap header-row">
          <Link to="/" className="logo" aria-label={`${STORE.name} — início`}>
            <b>ARKAD</b> <span>SPORTS</span>
          </Link>
          <nav className="main-nav" aria-label="Principal">
            <NavLink to="/clubes">Clubes</NavLink>
            <NavLink to="/selecoes">Seleções</NavLink>
          </nav>
          <form className="search" role="search" onSubmit={submit}>
            <input id="busca" type="search" value={q} onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar time, seleção ou modelo" aria-label="Buscar" />
          </form>
          <Link to="/carrinho" className="cart-link"
            aria-label={count ? `Carrinho, ${count} ${count === 1 ? 'peça' : 'peças'}` : 'Carrinho vazio'}>
            <ShoppingBag aria-hidden="true" size={22} strokeWidth={2} />
            <span className="cart-label">Carrinho</span>
            {count > 0 && <span className="cart-badge">{count}</span>}
          </Link>
        </div>
      </header>
      <main className="wrap page">
        <Outlet />
      </main>
      <AvisoCarrinho />
      <footer className="site-footer">
        <div className="wrap">
          <p><b>{STORE.name}</b> · Pedido sob encomenda · Entrega em {STORE.leadTime} · Imposto de importação incluso · Frete grátis para todo o Brasil</p>
          <p>Quanto mais peças no pedido, menor o preço de cada uma. O pagamento é combinado pelo WhatsApp.</p>
          <p>Tamanhos grandes (XXL em diante) e personalização com nome e número têm acréscimo.</p>
        </div>
      </footer>
    </>
  );
}
