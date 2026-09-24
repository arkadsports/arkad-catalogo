// Passa por todas as fotos do R2, apaga a marca d'água do fornecedor e
// devolve a foto limpa para o mesmo lugar. Trabalha em lotes e não guarda
// nada no disco: baixa, limpa e sobe.
//
//   npm run limpar-marca                começa (ou retoma) do ponto em que parou
//   npm run limpar-marca -- --ate=50    só 50 fotos, para conferir
//
// A foto de capa de cada produto NÃO tem marca (medido: força 1,6 contra 17,1
// nas de detalhe), então ela é pulada — mexer nela só perderia qualidade.
//
// Retomar é seguro: o progresso fica em data/limpeza.json.
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import pLimit from 'p-limit';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { carregarMapa, mascaraDe, limpar } from './marca-dagua.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const PROGRESSO = path.join(ROOT, 'data', 'limpeza.json');
const args = process.argv.slice(2);
const ATE = Number(args.find((a) => a.startsWith('--ate='))?.split('=')[1]) || Infinity;

for (const v of ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET', 'VITE_IMAGE_BASE']) {
  if (!process.env[v]) { console.error(`Falta ${v} no .env.`); process.exit(1); }
}

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});
const R2 = process.env.VITE_IMAGE_BASE.replace(/\/$/, '');
const BUCKET = process.env.R2_BUCKET;

const mapa = await carregarMapa();
const mascara = mascaraDe(mapa, 0.14, 1);
const catalogo = JSON.parse(await fs.readFile(path.join(ROOT, 'public/data/catalog.json'), 'utf8'));
const feitos = new Set(JSON.parse(await fs.readFile(PROGRESSO, 'utf8').catch(() => '[]')));

// Fotos a tratar: todas menos a capa de cada produto.
const tarefas = [];
for (const p of catalogo.products) {
  for (let i = 0; i < p.ph; i++) {
    if (i === (p.c ?? 0)) continue;
    const chave = `${p.id}/${i}`;
    if (!feitos.has(chave)) tarefas.push({ id: p.id, i });
  }
}
console.log(`fotos com marca: ${(tarefas.length + feitos.size).toLocaleString('pt-BR')} · já limpas: ${feitos.size.toLocaleString('pt-BR')} · a fazer: ${Math.min(tarefas.length, ATE).toLocaleString('pt-BR')}`);

const limite = pLimit(6);
let ok = 0, falhas = 0;
const gravarProgresso = () => fs.writeFile(PROGRESSO, JSON.stringify([...feitos]));

await Promise.all(tarefas.slice(0, ATE).map((t) => limite(async () => {
  try {
    for (const [sufixo, largura, qualidade] of [['full', 1600, 84], ['thumb', 600, 76]]) {
      const r = await fetch(`${R2}/${t.id}/${t.i}-${sufixo}.webp`, { signal: AbortSignal.timeout(30000) });
      if (!r.ok) continue;
      const bruto = Buffer.from(await r.arrayBuffer());
      const corpo = await (await limpar(bruto, mapa, mascara))
        .resize({ width: largura, withoutEnlargement: true })
        .webp({ quality: qualidade }).toBuffer();
      await s3.send(new PutObjectCommand({
        Bucket: BUCKET, Key: `${t.id}/${t.i}-${sufixo}.webp`, Body: corpo,
        ContentType: 'image/webp', CacheControl: 'public, max-age=31536000, immutable',
      }));
    }
    feitos.add(`${t.id}/${t.i}`);
    if (++ok % 200 === 0) { await gravarProgresso(); console.log(`  ${ok} fotos limpas`); }
  } catch (e) {
    falhas++;
    if (falhas <= 5) console.warn(`  falhou ${t.id}/${t.i}: ${e.message}`);
  }
})));

await gravarProgresso();
console.log(`Pronto: ${ok} limpas, ${falhas} falhas.`);
console.log('As fotos no navegador do cliente podem demorar a trocar: o cache do R2 é longo.');
