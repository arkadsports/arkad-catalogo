import { Link } from 'react-router-dom';
import { useCatalog } from '../lib/catalog';
import { Flag, Loading, TeamCard } from '../components/cards';
import CountryGallery from '../components/CountryGallery';
import Hero from '../components/Hero';

export default function Home() {
  const { ready, catalog } = useCatalog();
  if (!ready) return <Loading />;

  const clubs = catalog.teams.filter((t) => t.kind === 'clube');
  const nations = catalog.teams.filter((t) => t.kind === 'selecao');
  const featured = clubs.filter((t) => t.countrySlug === 'brasil').slice(0, 8);

  return (
    <>
      <Hero clubes={clubs.length} selecoes={nations.length} modelos={catalog.products.length} />

      {/* Bandeiras: escolher o país filtra os clubes logo abaixo */}
      <CountryGallery />

      <section className="block">
        <div className="block-head"><h2><Flag slug="brasil" emoji="🇧🇷" /> Brasileirão</h2><Link to="/pais/brasil">Todos os clubes do Brasil</Link></div>
        <div className="team-grid">{featured.map((t) => <TeamCard key={t.slug} team={t} />)}</div>
      </section>

      <section className="block">
        <div className="block-head"><h2>Seleções</h2><Link to="/selecoes">Ver todas</Link></div>
        <div className="team-grid">{nations.slice(0, 8).map((t) => <TeamCard key={t.slug} team={t} />)}</div>
      </section>
    </>
  );
}
