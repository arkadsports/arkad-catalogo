// Etapa opcional: baixa a bandeira de cada país do catálogo em imagem.
// As bandeiras ficam em public/flags/<slug>.webp e VÃO PARA O GIT (são leves,
// ~10 KB cada), para o site não depender de nenhum servidor de terceiros.
//
//   npm run flags            baixa o que estiver faltando
//   npm run flags -- --force refaz todas
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { flagCode } from './lib/flag-code.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const CATALOG = path.join(ROOT, 'public', 'data', 'catalog.json');
const OUT = path.join(ROOT, 'public', 'flags');
const force = process.argv.includes('--force');

const catalog = JSON.parse(await fs.readFile(CATALOG, 'utf8'));

// Países com clubes + países das seleções: os dois aparecem na galeria.
const wanted = new Map();
for (const c of catalog.countries) wanted.set(c.slug, c.flag);
for (const t of catalog.teams) if (t.kind === 'selecao' && t.flag) wanted.set(t.countrySlug, t.flag);

await fs.mkdir(OUT, { recursive: true });
let baixadas = 0, pulos = 0;
const semCodigo = [];

for (const [slug, emoji] of wanted) {
  const code = flagCode(emoji);
  if (!code) { semCodigo.push(`${slug} ${emoji}`); continue; }

  const dest = path.join(OUT, `${slug}.webp`);
  if (!force && await fs.access(dest).then(() => true, () => false)) { pulos++; continue; }

  try {
    const res = await fetch(`https://flagcdn.com/w1280/${code}.png`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const png = Buffer.from(await res.arrayBuffer());
    // 900x600: a galeria corta a imagem (object-cover), então vale ter altura.
    await sharp(png).resize(900, 600, { fit: 'cover', position: 'center' }).webp({ quality: 82 }).toFile(dest);
    baixadas++;
    process.stdout.write(`\r${baixadas} bandeiras…`);
  } catch (e) {
    console.warn(`\nFalhou ${slug} (${code}): ${e.message}`);
  }
}

console.log(`\nBandeiras: ${baixadas} baixadas, ${pulos} já existiam, ${wanted.size} países no total.`);
if (semCodigo.length) console.log(`Sem código (usam só o emoji no site): ${semCodigo.join(', ')}`);
