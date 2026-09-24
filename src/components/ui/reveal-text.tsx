// Texto que entra letra a letra e, ao passar o mouse, troca o preenchimento
// da letra por uma imagem. Componente de interface puro.
//
// Diferenças em relação ao original: sem "use client" (aqui é Vite, não Next)
// e o tamanho da fonte vem de uma classe do projeto, não fixo em pixels.
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

interface RevealTextProps {
  text?: string;
  textColor?: string;
  overlayColor?: string;
  fontSize?: string;
  letterDelay?: number;
  overlayDelay?: number;
  overlayDuration?: number;
  springDuration?: number;
  letterImages?: string[];
  className?: string;
}

export function RevealText({
  text = 'ARKAD',
  textColor = 'text-white',
  overlayColor = 'text-sky-300',
  fontSize = 'text-[120px]',
  letterDelay = 0.08,
  overlayDelay = 0.05,
  overlayDuration = 0.4,
  springDuration = 600,
  letterImages = [],
  className = '',
}: RevealTextProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [showOverlay, setShowOverlay] = useState(false);

  useEffect(() => {
    // Espera a última letra assentar antes da passada de cor.
    const lastLetterDelay = (text.length - 1) * letterDelay;
    const totalDelay = lastLetterDelay * 1000 + springDuration;
    const timer = setTimeout(() => setShowOverlay(true), totalDelay);
    return () => clearTimeout(timer);
  }, [text.length, letterDelay, springDuration]);

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <div className="flex">
        {text.split('').map((letter, index) => {
          const imagem = letterImages.length
            ? letterImages[index % letterImages.length]
            : null;
          return (
            <motion.span
              key={index}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              className={`${fontSize} relative cursor-pointer overflow-hidden font-black tracking-tight`}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{
                delay: index * letterDelay,
                type: 'spring',
                damping: 8,
                stiffness: 200,
                mass: 0.8,
              }}
            >
              {/* Camada base */}
              <motion.span
                className={`absolute inset-0 ${textColor}`}
                animate={{ opacity: hoveredIndex === index && imagem ? 0 : 1 }}
                transition={{ duration: 0.1 }}
              >
                {letter}
              </motion.span>

              {/* Camada com a foto dentro da letra */}
              {imagem && (
                <motion.span
                  className="bg-cover bg-no-repeat bg-clip-text text-transparent"
                  animate={{
                    opacity: hoveredIndex === index ? 1 : 0,
                    backgroundPosition: hoveredIndex === index ? '10% center' : '0% center',
                  }}
                  transition={{
                    opacity: { duration: 0.1 },
                    backgroundPosition: { duration: 3, ease: 'easeInOut' },
                  }}
                  style={{
                    backgroundImage: `url('${imagem}')`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  {letter}
                </motion.span>
              )}

              {/* Passada de cor, letra a letra, depois que todas entraram */}
              {showOverlay && (
                <motion.span
                  className={`absolute inset-0 ${overlayColor} pointer-events-none`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 1, 1, 0] }}
                  transition={{
                    delay: index * overlayDelay,
                    duration: overlayDuration,
                    times: [0, 0.1, 0.7, 1],
                    ease: 'easeInOut',
                  }}
                >
                  {letter}
                </motion.span>
              )}
            </motion.span>
          );
        })}
      </div>
    </div>
  );
}
