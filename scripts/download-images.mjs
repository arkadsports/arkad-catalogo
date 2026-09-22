// ETAPA 3 — Baixa as fotos dos álbuns, converte para WebP e salva em public/img/<álbum>/.
// Para cada foto gera 2 arquivos:
//   <n>-thumb.webp  (600 px, para a vitrine)
//   <n>-full.webp   (1600 px, nítida, para a página do produto e o zoom)
//
//   npm run images                        -> todos os álbuns (pode levar horas; retoma de onde parou)
//   npm run images -- --covers            -> só a 1ª foto de cada álbum (rápido, bom para começar)
//   npm run images -- --team=flamengo     -> só um time (use o "slug" do time, como aparece na URL do site)
//   npm run images -- --limit=50          -> só os 50 primeiros álbuns (para testar)
//   npm run images -- --albums=lote.json  -> só os álbuns listados no arquivo (uso interno)
//
// Depois de baixar, rode de novo: npm run build-catalog
//
// IMPORTANTE: as fotos são do fornecedor. Confirme com ele que você pode usá-las
// na revenda antes de publicar o site.
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import pLimit from 'p-limit';

// O endereço do fornecedor vem do .env (repositório público). Aqui ele serve
// só de Referer: as fotos moram em outro host, listado em data/raw/photos.
const BASE = (process.env.YUPOO_BASE || '').replace(/\/$/, '');
const RAW = path.resolve('data/raw');
const IMG = path.resolve('public/img');
const MANIFEST = path.resolve('data/images.json');
const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')).map(([k, v]) => [k, v ?? true]));
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36',
  Referer: BASE + '/',
};
const SIZES = { thumb: { width: 600, quality: 76 }, full: { width: 1600, quality: 84 } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const exists = (f) => fs.access(f).then(() => true, () => false);

async function download(url, tries = 3) {
  for (let i = 1; i <= tries; i++) {
    try {
      const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(30000) });
      if (res.ok) return Buffer.from(await res.arrayBuffer());
      if (res.status === 404) return null;
    } catch {}
    await sleep(1500 * i);
  }
  return null;
}

async function main() {
  const albums = JSON.parse(await fs.readFile(path.join(RAW, 'albums.json'), 'utf8'));
  const manifest = JSON.parse(await fs.readFile(MANIFEST, 'utf8').catch(() => '{}'));
  let ids = Object.keys(albums).filter((id) => !albums[id].locked);

  // Lista de álbuns vinda de um arquivo (usada pelo fotos-em-lotes.mjs).
  if (args.albums) {
    const lista = new Set(JSON.parse(await fs.readFile(args.albums, 'utf8')));
    ids = ids.filter((id) => lista.has(id));
  }
  if (args.team) {
    const catalog = JSON.parse(await fs.readFile('public/data/catalog.json', 'utf8').catch(() => '{"products":[]}'));
    const set = new Set(catalog.products.filter((p) => p.team === args.team).map((p) => p.id));
    if (!set.size) throw new Error(`Nenhum produto do time "${args.team}". Rode npm run build-catalog e confira o slug.`);
    ids = ids.filter((id) => set.has(id));
  }
  if (args.limit) ids = ids.slice(0, Number(args.limit));
  console.log(`Baixando fotos de ${ids.length} álbuns${args.covers ? ' (só capas)' : ''}...`);

  const limit = pLimit(4);
  let done = 0, photos = 0, failed = 0;
  const save = async () => fs.writeFile(MANIFEST, JSON.stringify(manifest));

  await Promise.all(ids.map((id) => limit(async () => {
    let urls = JSON.parse(await fs.readFile(path.join(RAW, 'photos', `${id}.json`), 'utf8').catch(() => '[]'));
    if (!urls.length && albums[id].cover) urls = [albums[id].cover.replace(/\/(small|medium)\./, '/big.')];
    if (args.covers) urls = urls.slice(0, 1);
    const dir = path.join(IMG, id);
    await fs.mkdir(dir, { recursive: true });

    let ok = 0;
    for (let n = 0; n < urls.length; n++) {
      const full = path.join(dir, `${ok}-full.webp`);
      if (await exists(full)) { ok++; continue; } // já baixada
      const buf = await download(urls[n]);
      if (!buf) { failed++; continue; }
      try {
        for (const [name, s] of Object.entries(SIZES)) {
          await sharp(buf).rotate().resize({ width: s.width, withoutEnlargement: true }).webp({ quality: s.quality })
            .toFile(path.join(dir, `${ok}-${name}.webp`));
        }
        ok++; photos++;
      } catch { failed++; }
      await sleep(150);
    }
    manifest[id] = Math.max(manifest[id] || 0, ok);
    if (++done % 50 === 0) { await save(); console.log(`  ${done}/${ids.length} álbuns · ${photos} fotos novas`); }
  })));

  await save();
  console.log(`Pronto: ${photos} fotos novas, ${failed} falhas. Agora rode: npm run build-catalog`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
