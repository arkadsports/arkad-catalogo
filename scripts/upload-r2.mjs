// ETAPA 4 (quando for publicar) — Envia public/img para um bucket do Cloudflare R2.
// As fotos do catálogo completo passam de alguns GB, grande demais para a Vercel.
// O R2 tem 10 GB grátis e não cobra pelo tráfego das imagens.
//
// Configure no arquivo .env (veja .env.example):
//   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET
// Depois:
//   npm run upload-images              -> envia e mantém a cópia local
//   npm run upload-images -- --apagar  -> envia e apaga a cópia local de cada
//                                         arquivo JÁ CONFIRMADO no bucket
// E coloque a URL pública do bucket em VITE_IMAGE_BASE no .env e na Vercel.
import fs from 'node:fs/promises';
import path from 'node:path';
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import pLimit from 'p-limit';

const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET } = process.env;
if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET) {
  console.error('Faltam variáveis R2_* no .env. Veja o README, seção "Publicar as imagens".');
  process.exit(1);
}
const APAGAR = process.argv.includes('--apagar');
const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
});
const IMG = path.resolve('public/img');

async function* walk(dir) {
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p); else yield p;
  }
}

// No Windows um arquivo recém-escrito pode ficar travado por um instante
// (antivírus, indexador, OneDrive). Tenta de novo antes de desistir — o que
// sobrar travado sai na próxima passada, já que está salvo no bucket.
async function apagarComTentativas(p) {
  for (let i = 1; i <= 3; i++) {
    try { await fs.unlink(p); return true; } catch (e) {
      if (e.code === 'ENOENT') return true;
      await new Promise((r) => setTimeout(r, 200 * i));
    }
  }
  return false;
}

const files = [];
for await (const f of walk(IMG)) if (f.endsWith('.webp')) files.push(f);
console.log(`${files.length} arquivos para conferir/enviar${APAGAR ? ' (apagando o local depois)' : ''}...`);
const limit = pLimit(8);
let sent = 0, skipped = 0, apagados = 0, falhas = 0, travados = 0;

await Promise.all(files.map((f) => limit(async () => {
  const Key = path.relative(IMG, f).split(path.sep).join('/');
  let noBucket = false;
  try { await s3.send(new HeadObjectCommand({ Bucket: R2_BUCKET, Key })); noBucket = true; skipped++; } catch {}

  if (!noBucket) {
    try {
      await s3.send(new PutObjectCommand({
        Bucket: R2_BUCKET, Key, Body: await fs.readFile(f), ContentType: 'image/webp',
        CacheControl: 'public, max-age=31536000, immutable',
      }));
      // Confere que chegou mesmo antes de apagar qualquer coisa do computador.
      await s3.send(new HeadObjectCommand({ Bucket: R2_BUCKET, Key }));
      noBucket = true;
      if (++sent % 200 === 0) console.log(`  ${sent} enviados`);
    } catch (e) {
      falhas++;
      console.warn(`  falhou ${Key}: ${e.message}`);
    }
  }

  // Só apaga o que está confirmado no bucket. Falhou? O arquivo fica, e a
  // próxima rodada tenta de novo.
  if (APAGAR && noBucket) { if (await apagarComTentativas(f)) apagados++; else travados++; }
})));

// Tira as pastas de álbum que ficaram vazias depois de apagar.
if (APAGAR) {
  for (const d of await fs.readdir(IMG, { withFileTypes: true })) {
    if (!d.isDirectory()) continue;
    const dir = path.join(IMG, d.name);
    const resto = await fs.readdir(dir);
    if (!resto.length) await fs.rmdir(dir).catch(() => {});
  }
}

console.log(
  `Pronto: ${sent} enviados, ${skipped} já estavam no bucket, ${falhas} falhas` +
  (APAGAR ? `, ${apagados} apagados do computador, ${travados} travados (saem na próxima passada)` : '') + '.',
);
if (falhas) process.exitCode = 1;
