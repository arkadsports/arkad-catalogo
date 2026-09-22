import { useEffect, useState, type FormEvent } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { STORE } from '../config';

export default function Layout() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [q, setQ] = useState(params.get('q') ?? '');
  const { pathname } = useLocation();

  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (q.trim()) navigate(`/busca?q=${encodeURIComponent(q.trim())}`);
  };

  return (
    <>
      <header className="site-header">
        <div className="wrap header-row">
          <Link to="/" className="logo" aria-label={`${STORE.name} — início`}>
            <img src="/logo-a.png" alt="" width={22} height={27} />
            ARKAD <span>SPORTS</span>
          </Link>
          <nav className="main-nav" aria-label="Principal">
            <NavLink to="/clubes">Clubes</NavLink>
            <NavLink to="/selecoes">Seleções</NavLink>
          </nav>
          <form className="search" role="search" onSubmit={submit}>
            <input id="busca" type="search" value={q} onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar time, seleção ou modelo" aria-label="Buscar" />
          </form>
        </div>
      </header>
      <main className="wrap page">
        <Outlet />
      </main>
      <footer className="site-footer">
        <div className="wrap">
          <p><b>{STORE.name}</b> · Sob encomenda, entrega em {STORE.leadTime} · Impostos inclusos no preço · Frete nacional à parte</p>
          <p>Tamanhos grandes (XXL em diante) e personalização com nome e número têm acréscimo.</p>
        </div>
      </footer>
    </>
  );
}
