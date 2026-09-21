import { Link, useSearchParams } from 'react-router-dom';
import { normalize, searchProducts, useCatalog } from '../lib/catalog';
import { Loading, ProductGrid, TeamCard } from '../components/cards';

export default function SearchPage() {
  const [params] = useSearchParams();
  const q = params.get('q') ?? '';
  const { ready, catalog, teamBySlug } = useCatalog();
  if (!ready) return <Loading />;

  const teams = catalog.teams.filter((t) => normalize(t.name).includes(normalize(q))).slice(0, 8);
  const products = searchProducts(catalog.products, teamBySlug, q);

  return (
    <>
      <nav className="crumbs"><Link to="/">Início</Link> / Busca</nav>
      <h1 className="page-title">Resultados para “{q}”</h1>
      {teams.length > 0 && (
        <section className="block">
          <div className="block-head"><h2>Times</h2></div>
          <div className="team-grid compact">{teams.map((t) => <TeamCard key={t.slug} team={t} />)}</div>
        </section>
      )}
      <section className="block">
        <div className="block-head"><h2>{products.length} modelos</h2></div>
        <ProductGrid key={q} products={products} />
      </section>
    </>
  );
}
