// Monta public/hero: as camisas que giram no carrossel da página inicial.
// São poucas e vão PARA O GIT de propósito — assim a abertura do site funciona
// sozinha, sem depender do R2 estar configurado.
//
//   npm run vitrine
//
// Usa a CAPA que o fornecedor escolheu para o álbum (data/raw/capas.json):
// é sempre a peça inteira, de frente, e sem marca d'água.
//
// A camisa de cada clube é escolhida na hora — sempre a da temporada mais
// recente — e não fica escrita no arquivo. Rode de novo depois de cada sync
// para a vitrine acompanhar os lançamentos.
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'public', 'hero');

// Os clubes da vitrine. A CAMISA de cada um não fica escrita aqui: é
// escolhida na hora, sempre a mais recente. Assim, quando o fornecedor
// lançar a 27/28, basta rodar `npm run vitrine` de novo.
const CLUBES = [
  { slug: 'barcelona', time: 'Barcelona' },
  { slug: 'real-madrid', time: 'Real Madrid' },
  { slug: 'flamengo', time: 'Flamengo' },
  { slug: 'vasco-da-gama', time: 'Vasco da Gama' },
  { slug: 'fluminense', time: 'Fluminense' },
  { slug: 'palmeiras', time: 'Palmeiras' },
  { slug: 'chelsea', time: 'Chelsea' },
  { slug: 'arsenal', time: 'Arsenal' },
];

const catalogo = JSON.parse(await fs.readFile(path.join(ROOT, 'public/data/catalog.json'), 'utf8'));
const capas = JSON.parse(await fs.readFile(path.join(ROOT, 'data/raw/capas.json'), 'utf8'));

/** Nota de cada produto para virar propaganda do clube. Vence, nesta ordem:
 *  a temporada mais nova, ser camisa de torcedor, ser o uniforme titular e,
 *  para desempatar, ter mais fotos. */
function nota(p) {
  let n = p.y * 1000;
  if (p.type === 'Torcedor') n += 400;
  else if (p.type === 'Jogador') n += 300;
  const nome = (p.n || '').toLowerCase();
  if (nome.includes('titular')) n += 200;
  else if (nome.includes('reserva')) n += 60;
  return n + Math.min(p.ph, 20);
}

const VITRINE = [];
for (const c of CLUBES) {
  const candidatos = catalogo.products.filter((p) => p.team === c.slug && p.ph > 0);
  if (!candidatos.length) { console.warn(`sem produto com foto: ${c.time}`); continue; }
  const escolhido = candidatos.reduce((a, b) => (nota(b) > nota(a) ? b : a));
  VITRINE.push({ id: escolhido.id, time: c.time, slug: c.slug });
  console.log(`${c.time.padEnd(14)} -> ${escolhido.s.padEnd(6)} ${escolhido.type.padEnd(9)} ${escolhido.n || ''}`);
}

await fs.mkdir(OUT, { recursive: true });
const HEADERS = { 'User-Agent': 'Mozilla/5.0', Referer: (process.env.YUPOO_BASE || '') + '/' };
const prontos = [];
for (const item of VITRINE) {
  const capa = capas[item.id];
  if (!capa) { console.warn(`sem capa no fornecedor: ${item.time}`); continue; }
  try {
    const r = await fetch(capa, { headers: HEADERS, signal: AbortSignal.timeout(30000) });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    // 9:16: o formato do carrossel. O corte central pega a camisa inteira,
    // que é vertical, e descarta as bordas do fundo de estúdio.
    await sharp(Buffer.from(await r.arrayBuffer())).resize(450, 800, { fit: 'cover', position: 'centre' })
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
