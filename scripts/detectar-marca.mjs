// Mede a marca d'água do fornecedor em todas as fotos que estão no R2 e grava
// as notas em data/marcas.json. O build-catalog lê esse arquivo e esconde do
// site as fotos com marca (a regra fica em scripts/lib/marca.mjs).
//
//   npm run detectar-marca            mede o que falta (retoma de onde parou)
//   npm run detectar-marca -- --tudo  mede tudo de novo
//
// Só lê do R2 (as miniaturas de 600 px); não altera nenhuma foto.
// Guarda as notas, não só o "sim/não": para mudar a regra depois, basta
// ajustar scripts/lib/marca.mjs e rodar o build-catalog, sem baixar nada.
import fs from 'node:fs/promises';
import path from 'node:path';
import pLimit from 'p-limit';
import { criarMedidor, temMarca } from './lib/marca.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const SAIDA = path.join(ROOT, 'data', 'marcas.json');
const IMAGES = path.join(ROOT, 'data', 'images.json');
const TUDO = process.argv.includes('--tudo');

const R2 = (process.env.VITE_IMAGE_BASE || '').replace(/\/$/, '');
if (!/^https?:/.test(R2)) {
  console.error('Falta VITE_IMAGE_BASE (endereço público do R2) no .env.');
  process.exit(1);
}

const medir = await criarMedidor(ROOT);
const fotosPorAlbum = JSON.parse(await fs.readFile(IMAGES, 'utf8')); // { álbum: nº de fotos no R2 }
// { álbum: [[luz, cor], ...] } — uma nota por foto, na ordem dos arquivos.
const notas = TUDO ? {} : JSON.parse(await fs.readFile(SAIDA, 'utf8').catch(() => '{}'));

const pendentes = Object.entries(fotosPorAlbum)
  .filter(([id, n]) => n > 0 && (notas[id]?.length !== n || notas[id].some((x) => x === null)));
const totalFotos = pendentes.reduce((s, [, n]) => s + n, 0);
console.log(`${pendentes.length} álbuns a medir (${totalFotos} fotos).`);

const salvar = () => fs.writeFile(SAIDA, JSON.stringify(notas));
const baixar = async (url) => {
  for (let t = 1; t <= 3; t++) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(30000) });
      if (r.ok) return Buffer.from(await r.arrayBuffer());
      if (r.status === 404) return null;
    } catch { /* tenta de novo */ }
    await new Promise((ok) => setTimeout(ok, 1000 * t));
  }
  return null;
};

const limite = pLimit(16);
let feitas = 0, falhas = 0;
const inicio = Date.now();
let ultimoSalvo = Date.now();

await Promise.all(pendentes.map(([id, n]) => limite(async () => {
  const lista = [];
  for (let i = 0; i < n; i++) {
    const buf = await baixar(`${R2}/${id}/${i}-thumb.webp`);
    if (!buf) { lista.push(null); falhas++; continue; }
    try { lista.push(await medir(buf)); } catch { lista.push(null); falhas++; }
  }
  notas[id] = lista;
  feitas += n;
  if (Date.now() - ultimoSalvo > 30000) {
    ultimoSalvo = Date.now();
    await salvar();
    const min = (Date.now() - inicio) / 60000;
    console.log(`  ${feitas}/${totalFotos} fotos · ${(feitas / min).toFixed(0)} por minuto`);
  }
})));
await salvar();

let fotos = 0, comMarca = 0;
for (const lista of Object.values(notas)) for (const x of lista) { if (!x) continue; fotos++; if (temMarca(x)) comMarca++; }
console.log(`Pronto. ${fotos} fotos medidas, ${comMarca} com marca pela regra atual${falhas ? `, ${falhas} não baixaram (rode de novo)` : ''}.`);
console.log('Próximo passo: npm run build-catalog');
