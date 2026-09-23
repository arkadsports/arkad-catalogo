// ETAPA 1 — Lê o catálogo do fornecedor no Yupoo e salva os dados brutos em data/raw/.
//
//   npm run sync               -> categorias, álbuns e lista de fotos (retoma de onde parou)
//   npm run sync -- --refresh  -> busca de novo a lista de fotos de todos os álbuns
//
// Não baixa imagens (isso é a etapa 3). Roda devagar de propósito (poucas requisições
// por vez) para não sobrecarregar o site do fornecedor.
import fs from 'node:fs/promises';
import path from 'node:path';
import * as cheerio from 'cheerio';
import pLimit from 'p-limit';

// O endereço do fornecedor fica no .env, nunca no código: este repositório é
// público e o fornecedor é informação do negócio, não do projeto.
const BASE = (process.env.YUPOO_BASE || '').replace(/\/$/, '');
if (!BASE) {
  console.error(
    'Falta YUPOO_BASE. Copie .env.example para .env, preencha o endereço do' +
    ' fornecedor e rode: node --env-file=.env scripts/sync-yupoo.mjs'
  );
  process.exit(1);
}
const RAW = path.resolve('data/raw');
const PHOTOS = path.join(RAW, 'photos');
const REFRESH = process.argv.includes('--refresh');
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36',
  'Accept-Language': 'pt-BR,pt;q=0.9',
  Referer: BASE + '/',
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(url, tries = 4) {
  for (let i = 1; i <= tries; i++) {
    try {
      const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(20000) });
      if (res.ok) return await res.text();
      console.warn(`  ${res.status} em ${url} (tentativa ${i})`);
    } catch (e) {
      console.warn(`  erro de rede em ${url} (tentativa ${i}): ${e.message}`);
    }
    await sleep(1500 * i);
  }
  throw new Error(`Falhou: ${url}`);
}

// Lê a árvore de categorias do menu do site
async function readCategories() {
  const $ = cheerio.load(await get(`${BASE}/categories`));
  const cats = [];
  $('li.showheader__category_item').each((_, li) => {
    const a = $(li).find('a.showheader__link').first();
    const id = (a.attr('href') || '').match(/categories\/(\d+)/)?.[1];
    if (!id) return;
    cats.push({ id, name: a.text().trim(), parentId: null });
    $(li).find('ul.showheader__category_child a.showheader__child_link').each((_, c) => {
      const cid = ($(c).attr('href') || '').match(/categories\/(\d+)/)?.[1];
      if (cid) cats.push({ id: cid, name: $(c).text().trim(), parentId: id });
    });
  });
  return cats;
}

// Percorre todas as páginas de uma categoria e devolve os álbuns
async function readCategoryAlbums(cat) {
  const albums = [];
  const seen = new Set();
  const sub = cat.parentId ? 'true' : 'false';
  for (let page = 1; page < 200; page++) {
    const $ = cheerio.load(await get(`${BASE}/categories/${cat.id}?isSubCate=${sub}&page=${page}`));
    let added = 0;
    $('a.album__main').each((_, a) => {
      // Álbum com senha ("加密相册"): o link fica em data-href e o título é escondido
      const locked = !$(a).attr('href');
      const id = ($(a).attr('href') || $(a).attr('data-href') || '').match(/albums\/(\d+)/)?.[1];
      if (!id || seen.has(id)) return;
      seen.add(id);
      added++;
      // A capa vem em data-src: a listagem carrega as imagens sob demanda e
      // o src fica com um espaço reservado. Ela é a foto da peça inteira que
      // o fornecedor escolheu para o cartão — o site usa a mesma.
      const capaImg = $(a).find('img').first();
      const capa = capaImg.attr('data-src') || capaImg.attr('data-origin-src') || capaImg.attr('src') || '';
      albums.push({
        id,
        locked,
        title: locked ? '' : ($(a).attr('title') || '').trim(),
        cover: locked || capa.startsWith('data:') ? '' : (capa.startsWith('//') ? 'https:' + capa : capa),
      });
    });
    if (added === 0 || $('a.album__main').length < 100) break; // página vazia ou última página
    await sleep(300);
  }
  return albums;
}

// Lista as fotos de um álbum (URLs em tamanho grande)
async function readAlbumPhotos(id) {
  const $ = cheerio.load(await get(`${BASE}/albums/${id}?uid=1`));
  const urls = [];
  $('img.image__img').each((_, img) => {
    const u = $(img).attr('data-src') || $(img).attr('data-origin-src') || $(img).attr('src');
    if (u && !urls.includes(u)) urls.push(u.startsWith('//') ? 'https:' + u : u);
  });
  return urls;
}

async function main() {
  await fs.mkdir(PHOTOS, { recursive: true });

  console.log('1/3 Lendo categorias...');
  const cats = await readCategories();
  await fs.writeFile(path.join(RAW, 'categories.json'), JSON.stringify(cats, null, 2));
  console.log(`   ${cats.length} categorias (${cats.filter((c) => c.parentId).length} são times/subcategorias)`);

  console.log('2/3 Lendo álbuns de cada categoria...');
  const albums = {};
  const limit = pLimit(2);
  let done = 0;
  await Promise.all(cats.map((cat) => limit(async () => {
    const list = await readCategoryAlbums(cat);
    for (const a of list) {
      albums[a.id] ??= { id: a.id, title: a.title, cover: a.cover, locked: a.locked, categories: [] };
      albums[a.id].categories.push(cat.id);
    }
    done++;
    if (done % 20 === 0) console.log(`   ${done}/${cats.length} categorias lidas`);
  })));
  await fs.writeFile(path.join(RAW, 'albums.json'), JSON.stringify(albums));
  console.log(`   ${Object.keys(albums).length} álbuns únicos`);

  console.log('3/3 Lendo a lista de fotos de cada álbum...');
  const ids = Object.keys(albums).filter((id) => !albums[id].locked);
  const lockedCount = Object.keys(albums).length - ids.length;
  if (lockedCount) console.log(`   ${lockedCount} álbuns têm senha no Yupoo e foram pulados (peça a senha ao fornecedor)`);
  const photoLimit = pLimit(3);
  let n = 0, skipped = 0, failed = 0;
  await Promise.all(ids.map((id) => photoLimit(async () => {
    const file = path.join(PHOTOS, `${id}.json`);
    if (!REFRESH) {
      try { await fs.access(file); skipped++; return; } catch {}
    }
    try {
      const urls = await readAlbumPhotos(id);
      await fs.writeFile(file, JSON.stringify(urls));
    } catch (e) {
      failed++;
      console.warn(`   álbum ${id}: ${e.message}`);
    }
    n++;
    if (n % 100 === 0) console.log(`   ${n + skipped}/${ids.length} álbuns`);
    await sleep(250);
  })));
  console.log(`Pronto. Novos: ${n}, já existiam: ${skipped}, falhas: ${failed}.`);
  console.log('Próximo passo: npm run build-catalog');
}

main().catch((e) => { console.error(e); process.exit(1); });
