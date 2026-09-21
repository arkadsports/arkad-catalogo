import { useMemo } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useCatalog } from '../lib/catalog';
import { Chips, Loading, ProductGrid } from '../components/cards';

export default function TeamPage() {
  const { slug = '' } = useParams();
  const { ready, teamBySlug, productsByTeam, catalog } = useCatalog();
  const [params, setParams] = useSearchParams();
  const type = params.get('tipo') ?? '';
  const season = params.get('temporada') ?? '';
  const all = productsByTeam.get(slug) ?? [];

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    setParams(next, { replace: true });
  };

  const types = useMemo(() => {
    const m = new Map<string, number>();
    all.forEach((p) => m.set(p.type, (m.get(p.type) ?? 0) + 1));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [all]);
  const seasons = useMemo(() => [...new Set(all.map((p) => p.s).filter(Boolean))]
    .sort((a, b) => (all.find((p) => p.s === b)!.y) - (all.find((p) => p.s === a)!.y)), [all]);

  if (!ready) return <Loading />;
  const team = teamBySlug.get(slug);
  if (!team) return <p className="empty">Time não encontrado. <Link to="/">Voltar ao início</Link></p>;

  const list = all.filter((p) => (!type || p.type === type) && (!season || p.s === season));
  const country = catalog.countries.find((c) => c.slug === team.countrySlug);

  return (
    <>
      <nav className="crumbs">
        <Link to="/">Início</Link> /{' '}
        {team.kind === 'selecao' ? <Link to="/selecoes">Seleções</Link>
          : team.kind === 'clube' && country ? <><Link to="/clubes">Clubes</Link> / <Link to={`/pais/${country.slug}`}>{country.name}</Link></>
          : <Link to="/clubes">Outros</Link>}
        {' '}/ {team.name}
      </nav>
      <header className="team-head">
        <h1 className="page-title">{team.flag ? `${team.flag} ` : ''}{team.name}</h1>
        <p className="lead">
          {team.kind === 'selecao' ? 'Seleção' : team.league || team.country} · {all.length} {all.length === 1 ? 'modelo' : 'modelos'}
        </p>
      </header>

      {team.locked ? (
        <p className="notice">Há mais {team.locked} modelos deste time em álbum reservado do fornecedor. Peça pelo WhatsApp.</p>
      ) : null}

      {all.length > 0 && (
        <div className="filters">
          <Chips label="Tipo de produto" value={type} onChange={(v) => setFilter('tipo', v)}
            options={[{ value: '', label: 'Todos', count: all.length }, ...types.map(([t, n]) => ({ value: t, label: t, count: n }))]} />
          {seasons.length > 1 && (
            <select id="temporada" aria-label="Temporada" value={season} onChange={(e) => setFilter('temporada', e.target.value)}>
              <option value="">Todas as temporadas</option>
              {seasons.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
        </div>
      )}
      <ProductGrid key={`${slug}-${type}-${season}`} products={list} />
    </>
  );
}
