// ETAPA 4 (quando for publicar) — Envia public/img para um bucket do Cloudflare R2.
// As fotos do catálogo completo passam de alguns GB, grande demais para a Vercel.
// O R2 tem 10 GB grátis e não cobra pelo tráfego das imagens.
//
// Configure no arquivo .env (veja .env.example):
//   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET
// Depois:
//   npm run upload-images
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

const files = [];
for await (const f of walk(IMG)) if (f.endsWith('.webp')) files.push(f);
console.log(`${files.length} arquivos para conferir/enviar...`);
const limit = pLimit(8);
let sent = 0, skipped = 0;
await Promise.all(files.map((f) => limit(async () => {
  const Key = path.relative(IMG, f).split(path.sep).join('/');
  try { await s3.send(new HeadObjectCommand({ Bucket: R2_BUCKET, Key })); skipped++; return; } catch {}
  await s3.send(new PutObjectCommand({
    Bucket: R2_BUCKET, Key, Body: await fs.readFile(f), ContentType: 'image/webp',
    CacheControl: 'public, max-age=31536000, immutable',
  }));
  if (++sent % 200 === 0) console.log(`  ${sent} enviados`);
})));
console.log(`Pronto: ${sent} enviados, ${skipped} já estavam no bucket.`);
