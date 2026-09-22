// Monta public/hero: as camisas que giram no carrossel da página inicial.
// São poucas e vão PARA O GIT de propósito — assim a abertura do site funciona
// sozinha, sem depender do R2 estar configurado.
//
//   npm run vitrine
//
// Usa a ÚLTIMA foto de cada álbum: o fornecedor põe as fotos de detalhe
// primeiro e a peça inteira no fim.
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'public', 'hero');

// Os times que mais vendem no Brasil e no mundo. O id é o do produto cuja
// capa vira a foto do carrossel; conferido com scripts/montar-vitrine.mjs.
const VITRINE = [
  { id: '212192317', time: 'Flamengo', slug: 'flamengo' },
  { id: '190502753', time: 'Real Madrid', slug: 'real-madrid' },
  { id: '211961791', time: 'Corinthians', slug: 'corinthians' },
  { id: '210879831', time: 'Barcelona', slug: 'barcelona' },
  { id: '211563080', time: 'Palmeiras', slug: 'palmeiras' },
  { id: '211961096', time: 'Manchester United', slug: 'manchester-united' },
  { id: '160609341', time: 'Brasil', slug: 'selecao-brasil' },
  { id: '206448001', time: 'PSG', slug: 'psg' },
  { id: '211961632', time: 'São Paulo', slug: 'sao-paulo' },
  { id: '211959441', time: 'Manchester City', slug: 'manchester-city' },
  { id: '197820668', time: 'Vasco da Gama', slug: 'vasco-da-gama' },
  { id: '211958340', time: 'Bayern de Munique', slug: 'bayern-de-munique' },
  { id: '210081062', time: 'Cruzeiro', slug: 'cruzeiro' },
  { id: '211961043', time: 'Arsenal', slug: 'arsenal' },
  { id: '211961909', time: 'Fluminense', slug: 'fluminense' },
  { id: '196991347', time: 'Boca Juniors', slug: 'boca-juniors' },
];

await fs.mkdir(OUT, { recursive: true });
const HEADERS = { 'User-Agent': 'Mozilla/5.0', Referer: (process.env.YUPOO_BASE || '') + '/' };
const prontos = [];
for (const item of VITRINE) {
  const lista = JSON.parse(await fs.readFile(path.join(ROOT, 'data', 'raw', 'photos', item.id + '.json'), 'utf8'));
  if (!lista.length) { console.warn(`sem lista de fotos: ${item.time}`); continue; }
  try {
    // A última foto do álbum é a peça inteira, de frente, e sem marca d'água.
    const r = await fetch(lista[lista.length - 1], { headers: HEADERS, signal: AbortSignal.timeout(30000) });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    await sharp(Buffer.from(await r.arrayBuffer())).resize(340, 340, { fit: 'inside' })
      .webp({ quality: 80 }).toFile(path.join(OUT, `${item.slug}.webp`));
    prontos.push(item);
  } catch (e) {
    console.warn(`falhou ${item.time}: ${e.message}`);
  }
}

await fs.writeFile(
  path.join(ROOT, 'src', 'vitrine.ts'),
  '// Gerado por scripts/montar-vitrine.mjs — não edite à mão.\n' +
  '// As camisas do carrossel da página inicial.\n' +
  'export const VITRINE = ' + JSON.stringify(prontos, null, 2) + ' as const;\n',
);

let bytes = 0;
for (const f of await fs.readdir(OUT)) bytes += (await fs.stat(path.join(OUT, f))).size;
console.log(`vitrine: ${prontos.length} camisas, ${(bytes / 1024).toFixed(0)} KB no total`);
