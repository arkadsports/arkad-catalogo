// Abertura da página inicial: a marca em cima, o carrossel de camisas embaixo.
//
// O nome entra letra a letra e, ao passar o mouse em cada letra, o
// preenchimento vira a foto de uma camisa — a identidade sai da própria
// mercadoria. O "A" da logo fica ao lado, no mesmo tamanho das letras.
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { CoverflowCarousel, type CoverflowSlide } from './ui/coverflow-carousel';
import { RevealText } from './ui/reveal-text';
import { VITRINE } from '../vitrine';

export default function Hero({
  clubes,
  selecoes,
  modelos,
}: {
  clubes: number;
  selecoes: number;
  modelos: number;
}) {
  const navigate = useNavigate();

  const slides = useMemo<CoverflowSlide[]>(
    () =>
      VITRINE.map((c) => ({
        src: `/hero/${c.slug}.webp`,
        alt: `Camisa do ${c.time}`,
        title: c.time,
        href: `/time/${c.slug}`,
      })),
    [],
  );

  // Uma foto por letra do nome, para o preenchimento do texto.
  const letras = useMemo(() => VITRINE.map((c) => `/hero/${c.slug}.webp`), []);

  return (
    <section className="marca">
      {/* O "A" da logo fica no canto superior direito, como assinatura. */}
      <img className="marca-selo" src="/logo-a.png" alt="" width={56} height={69} />

      <div className="marca-topo">
        <RevealText
          text="ARKAD SPORTS"
          fontSize="marca-letra"
          textColor="text-white"
          overlayColor="text-[#9EC6FF]"
          letterImages={letras}
        />
      </div>

      <p className="marca-lead">
        Camisas de time do mundo inteiro, sob encomenda e direto do fornecedor.
      </p>
      <p className="marca-numeros">
        <strong>{modelos.toLocaleString('pt-BR')}</strong> modelos · <strong>{clubes}</strong>{' '}
        clubes · <strong>{selecoes}</strong> seleções
      </p>

      <CoverflowCarousel
        slides={slides}
        label="Camisas em destaque"
        showCaption
        showNavigation
        cardWidth="clamp(120px, 15vw, 190px)"
        aspect={16 / 9}
        rotate={40}
        depth={0.55}
        onOpen={(slide) => slide.href && navigate(slide.href)}
        className="marca-carrossel"
        cardClassName="bg-white"
      />
    </section>
  );
}
