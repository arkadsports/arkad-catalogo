// Abertura da página inicial: a marca, o globo e as camisas girando em volta.
//
// O cobe desenha o globo com pontos, não aceita textura — não dá para "colar"
// foto de camisa na esfera. Então o globo é a Terra, nas cores da marca, com um
// marcador em cada cidade dos times da vitrine, e as camisas giram em volta num
// carrossel 3D (CSS puro, que o navegador anima sem custo de JavaScript).
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Globe, type GlobeConfig } from './ui/globe';

import { VITRINE } from '../vitrine';

// Cidades dos times da vitrine. Dão os pontos brancos do globo.
const CIDADES: [number, number][] = [
  [-22.9068, -43.1729], // Rio de Janeiro — Flamengo, Fluminense
  [-23.5505, -46.6333], // São Paulo — Corinthians, Palmeiras, São Paulo
  [-19.9167, -43.9345], // Belo Horizonte — Cruzeiro
  [40.4168, -3.7038], // Madri — Real Madrid
  [41.3874, 2.1686], // Barcelona
  [53.4808, -2.2426], // Manchester — United, City
  [51.5074, -0.1278], // Londres — Arsenal
  [48.8566, 2.3522], // Paris — PSG
  [48.1351, 11.582], // Munique — Bayern
  [45.4642, 9.19], // Milão — Inter
  [-34.6037, -58.3816], // Buenos Aires — Boca
];

export default function Hero({ clubes, selecoes, modelos }: { clubes: number; selecoes: number; modelos: number }) {
  const config = useMemo<GlobeConfig>(
    () => ({
      width: 800,
      height: 800,
      onRender: () => {},
      devicePixelRatio: 2,
      phi: 0,
      theta: 0.18,
      dark: 0.4,
      diffuse: 1.4,
      mapSamples: 16000,
      mapBrightness: 14,
      // Azul da marca na esfera e no brilho; os países em azul claro.
      baseColor: [0.22, 0.47, 0.85],
      markerColor: [1, 1, 1],
      glowColor: [0.13, 0.42, 0.85],
      markers: CIDADES.map((location) => ({ location, size: 0.05 })),
    }),
    [],
  );

  const passo = 360 / VITRINE.length;

  return (
    <section className="marca">
      <div className="marca-topo">
        <img src="/logo-a.png" alt="" width={56} height={69} />
        <h1>
          Arkad <span>Sports</span>
        </h1>
      </div>
      <p className="marca-lead">
        Camisas de time do mundo inteiro, sob encomenda e direto do fornecedor.
      </p>
      <p className="marca-numeros">
        <strong>{modelos.toLocaleString('pt-BR')}</strong> modelos · <strong>{clubes}</strong> clubes ·{' '}
        <strong>{selecoes}</strong> seleções
      </p>

      <div className="palco">
        <Globe className="globo" config={config} />
        <div className="anel">
          {VITRINE.map((c, i) => (
            <Link
              key={c.slug}
              to={`/time/${c.slug}`}
              className="camisa"
              style={{ '--i': i, '--giro': `${i * passo}deg` } as React.CSSProperties}
              title={`Ver camisas do ${c.time}`}
            >
              <img src={`/hero/${c.slug}.webp`} alt={`Camisa do ${c.time}`} loading="lazy" decoding="async" />
              <span>{c.time}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
