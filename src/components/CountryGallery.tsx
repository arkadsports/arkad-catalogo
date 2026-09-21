// Bandeiras dos países como filtro: escolher uma abre os clubes daquele país
// logo abaixo, sem trocar de página. Clicar de novo (ou Enter) abre a página do país.
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { normalize, useCatalog } from '../lib/catalog';
import { ElasticGallery, type ElasticItem } from './ui/elastic-gallery';
import { Flag, TeamCard } from './cards';

const PREVIEW = 12; // clubes mostrados antes do "ver todos"

export default function CountryGallery() {
  const { catalog } = useCatalog();
  const navigate = useNavigate();
  const [slug, setSlug] = useState(() => catalog.countries[0]?.slug ?? '');
  const [q, setQ] = useState('');

  const items = useMemo<ElasticItem[]>(
    () =>
      catalog.countries.map((c) => ({
        id: c.slug,
        title: c.name,
        category: `${c.clubs} ${c.clubs === 1 ? 'clube' : 'clubes'}`,
        meta: `${c.products.toLocaleString('pt-BR')} modelos`,
        src: `/flags/${c.slug}.webp`,
        alt: `Bandeira: ${c.name}`,
        badge: <Flag slug={c.slug} emoji={c.flag} className="!m-0 !h-7 !w-10 !rounded md:!h-9 md:!w-13" />,
        icon: <Flag slug={c.slug} emoji={c.flag} className="!m-0 !h-5 !w-7 !rounded-sm" />,
        cta: 'Ver clubes',
      })),
    [catalog.countries],
  );

  const country = catalog.countries.find((c) => c.slug === slug);
  const clubs = useMemo(
    () => catalog.teams.filter((t) => t.kind === 'clube' && t.countrySlug === slug),
    [catalog.teams, slug],
  );
  const nation = catalog.teams.find((t) => t.kind === 'selecao' && t.countrySlug === slug);

  const found = q ? clubs.filter((t) => normalize(t.name).includes(normalize(q))) : clubs;
  const shown = q ? found : found.slice(0, PREVIEW);

  if (!country) return null;

  return (
    <section className="block">
      <div className="block-head">
        <h2>Escolha o país</h2>
        <Link to="/clubes">Lista completa</Link>
      </div>

      <ElasticGallery
        label="Países do catálogo"
        items={items}
        activeId={slug}
        onActiveChange={(id) => {
          setSlug(id);
          setQ('');
        }}
        onOpen={(item) => navigate(`/pais/${item.id}`)}
      />

      <p className="small mt-2">
        <span className="hidden md:inline">Passe o mouse para abrir · role de lado para ver os {items.length} países · clique para abrir o país</span>
        <span className="md:hidden">Toque para abrir · deslize para ver os {items.length} países · toque de novo para entrar</span>
      </p>

      <div className="mt-6">
        <div className="block-head">
          <h2>
            <Flag slug={country.slug} emoji={country.flag} /> Clubes · {country.name}
          </h2>
          <Link to={`/pais/${country.slug}`}>Ver os {country.clubs} clubes</Link>
        </div>

        {clubs.length > PREVIEW && (
          <input
            className="filter-input"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={`Filtrar clubes de ${country.name}`}
            aria-label={`Filtrar clubes de ${country.name}`}
          />
        )}

        {shown.length ? (
          <div className="team-grid compact">
            {shown.map((t) => (
              <TeamCard key={t.slug} team={t} />
            ))}
          </div>
        ) : (
          <p className="empty">Nenhum clube com esse nome em {country.name}.</p>
        )}

        <p className="small mt-3">
          {!q && clubs.length > PREVIEW && (
            <>
              <Link to={`/pais/${country.slug}`}>
                Ver os outros {clubs.length - PREVIEW} clubes de {country.name}
              </Link>
              {' · '}
            </>
          )}
          {nation && <Link to={`/time/${nation.slug}`}>Seleção {country.name} ({nation.products} modelos)</Link>}
        </p>
      </div>
    </section>
  );
}
