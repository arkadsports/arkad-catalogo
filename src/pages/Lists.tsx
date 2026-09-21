// Listas de times: todos os clubes (por país), clubes de um país e seleções.
import { Link, useParams } from 'react-router-dom';
import { normalize, useCatalog, type Team } from '../lib/catalog';
import { Flag, Loading, TeamCard } from '../components/cards';
import { useState } from 'react';

function Filterable({ teams, placeholder }: { teams: Team[]; placeholder: string }) {
  const [q, setQ] = useState('');
  const list = q ? teams.filter((t) => normalize(t.name).includes(normalize(q))) : teams;
  return (
    <>
      <input className="filter-input" id="filtro-times" type="search" placeholder={placeholder} value={q} onChange={(e) => setQ(e.target.value)} />
      {list.length ? <div className="team-grid">{list.map((t) => <TeamCard key={t.slug} team={t} />)}</div>
        : <p className="empty">Nenhum time com esse nome.</p>}
    </>
  );
}

export function ClubsPage() {
  const { ready, catalog } = useCatalog();
  if (!ready) return <Loading />;
  const others = catalog.teams.filter((t) => t.kind === 'outros');
  return (
    <>
      <nav className="crumbs"><Link to="/">Início</Link> / Clubes</nav>
      <h1 className="page-title">Clubes por país</h1>
      {catalog.countries.map((c) => {
        const teams = catalog.teams.filter((t) => t.kind === 'clube' && t.countrySlug === c.slug);
        return (
          <section key={c.slug} className="block">
            <div className="block-head"><h2><Flag slug={c.slug} emoji={c.flag} /> {c.name}</h2><Link to={`/pais/${c.slug}`}>{teams.length} clubes</Link></div>
            <div className="team-grid compact">{teams.slice(0, 6).map((t) => <TeamCard key={t.slug} team={t} />)}</div>
          </section>
        );
      })}
      {others.length > 0 && (
        <section className="block">
          <div className="block-head"><h2>🌍 Outros</h2></div>
          <div className="team-grid compact">{others.map((t) => <TeamCard key={t.slug} team={t} />)}</div>
        </section>
      )}
    </>
  );
}

export function CountryPage() {
  const { slug } = useParams();
  const { ready, catalog } = useCatalog();
  if (!ready) return <Loading />;
  const country = catalog.countries.find((c) => c.slug === slug);
  if (!country) return <p className="empty">País não encontrado. <Link to="/clubes">Ver todos os países</Link></p>;
  const teams = catalog.teams.filter((t) => t.kind === 'clube' && t.countrySlug === slug);
  const nation = catalog.teams.find((t) => t.kind === 'selecao' && t.countrySlug === slug);
  return (
    <>
      <nav className="crumbs"><Link to="/">Início</Link> / <Link to="/clubes">Clubes</Link> / {country.name}</nav>
      <h1 className="page-title"><Flag slug={country.slug} emoji={country.flag} /> {country.name}</h1>
      <p className="lead">{teams.length} clubes · {country.products} modelos
        {nation && <> · <Link to={`/time/${nation.slug}`}>Ver a seleção ({nation.products})</Link></>}</p>
      <Filterable teams={teams} placeholder={`Filtrar clubes de ${country.name}`} />
    </>
  );
}

export function NationsPage() {
  const { ready, catalog } = useCatalog();
  if (!ready) return <Loading />;
  const nations = catalog.teams.filter((t) => t.kind === 'selecao');
  return (
    <>
      <nav className="crumbs"><Link to="/">Início</Link> / Seleções</nav>
      <h1 className="page-title">Seleções</h1>
      <p className="lead">{nations.length} países · Copa do Mundo 2026, retrôs e treino</p>
      <Filterable teams={nations} placeholder="Filtrar seleções" />
    </>
  );
}
