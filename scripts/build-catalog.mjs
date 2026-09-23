// ETAPA 2 — Organiza os dados brutos (data/raw) no catálogo que o site usa:
// public/data/catalog.json  (países, times e produtos)
//
//   npm run build-catalog
//
// Não acessa a internet. Pode rodar quantas vezes quiser depois de ajustar
// as regras em scripts/lib/classify.mjs.
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  slugify, norm, LEAGUE_COUNTRY, FLAGS, NATIONAL_TEAMS, CLUB_ALIASES, JUNK_SUBCATEGORIES,
  SUBCATEGORY_RENAME, productType, season, seasonYear, sizes, shortName,
} from './lib/classify.mjs';

const RAW = path.resolve('data/raw');
const OUT = path.resolve('public/data');
const IMAGES_MANIFEST = path.resolve('data/images.json');

const readJson = async (f, fallback) => {
  try { return JSON.parse(await fs.readFile(f, 'utf8')); } catch { return fallback; }
};
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

async function main() {
  const categories = await readJson(path.join(RAW, 'categories.json'), null);
  const albums = await readJson(path.join(RAW, 'albums.json'), null);
  if (!categories || !albums) throw new Error('Rode antes: npm run sync (faltam data/raw/categories.json e albums.json)');
  const images = await readJson(IMAGES_MANIFEST, {}); // { albumId: nº de fotos baixadas }
  const capas = await readJson(path.join(RAW, 'capas.json'), {}); // { albumId: url da capa }

  // Qual das fotos do álbum é a capa. O fornecedor escolhe uma — sempre a
  // peça inteira — e é ela que aparece no cartão do site dele. Não tem
  // posição fixa: é a última em 48% dos álbuns, a primeira em 25%.
  // O download reordena o álbum para [última, 0, 1, ...], então a posição na
  // lista original vira outro índice de arquivo.
  const indiceCapa = async (id) => {
    const url = capas[id];
    if (!url) return 0;
    const urls = await readJson(path.join(RAW, 'photos', id + '.json'), []);
    const hash = url.split('/')[4];
    const i = urls.findIndex((u) => u.includes(hash));
    if (i < 0) return 0;
    return i === urls.length - 1 ? 0 : i + 1;
  };

  const catById = Object.fromEntries(categories.map((c) => [c.id, c]));

  // 1) Times vindos das subcategorias do Yupoo (liga -> país)
  const teams = new Map(); // slug -> time
  const addTeam = (name, country, kind, league = '') => {
    const slug = kind === 'selecao' ? `selecao-${slugify(country)}` : slugify(name);
    if (!teams.has(slug)) {
      teams.set(slug, { slug, name, kind, country, countrySlug: slugify(country), league, products: 0, cover: null });
    }
    return slug;
  };
  const subTeam = {}; // subcategoria -> slug do time
  for (const c of categories) {
    if (!c.parentId || JUNK_SUBCATEGORIES.has(c.name)) continue;
    const parent = catById[c.parentId];
    const lc = LEAGUE_COUNTRY[parent?.name];
    if (!lc) continue;
    subTeam[c.id] = addTeam(SUBCATEGORY_RENAME[c.name] || c.name, lc.country, 'clube', lc.league);
  }

  // 2) Dicionário para achar o time pelo título (nomes mais longos primeiro)
  const dict = [];
  const strip = (s) => s.replace(/^(fc|cf|sc|afc|ssc|ud|rc|cd|as|sl)\s+|\s+(fc|cf|sc|f\.c\.)$/i, '').trim();
  for (const t of teams.values()) {
    for (const v of new Set([t.name, strip(t.name)])) {
      const n = norm(v);
      if (n.length >= 4) dict.push({ re: new RegExp(`\\b${esc(n)}\\b`), len: n.length, slug: t.slug });
    }
  }
  for (const [pattern, name, country] of CLUB_ALIASES) {
    const slug = addTeam(name, country, 'clube', teams.get(slugify(name))?.league || '');
    dict.push({ re: new RegExp(`\\b(${norm(pattern)})\\b`), len: pattern.split('|')[0].length + 1, slug });
  }
  dict.sort((a, b) => b.len - a.len);

  // 3) Classifica cada álbum
  const products = [];
  let byTitle = 0, bySub = 0, byNation = 0, other = 0;
  for (const a of Object.values(albums)) {
    if (a.locked) { // álbum com senha no Yupoo: conta no time, mas não vira produto
      const sub = a.categories.find((c) => subTeam[c]);
      if (sub) teams.get(subTeam[sub]).locked = (teams.get(subTeam[sub]).locked || 0) + 1;
      continue;
    }
    const title = a.title.replace(/\s+/g, ' ').trim();
    const type = productType(title);
    if (type === 'Tabela de medidas') continue; // álbuns de tabela de medidas/menus não são produtos
    const t = norm(title);

    let team = dict.find((d) => d.re.test(t))?.slug;
    if (team) byTitle++;
    if (!team) {
      const sub = a.categories.find((c) => subTeam[c]);
      if (sub) { team = subTeam[sub]; bySub++; }
    }
    if (!team) {
      const nat = NATIONAL_TEAMS.find((n) => n.re.test(title));
      if (nat) { team = addTeam(nat.name, nat.name, 'selecao'); byNation++; }
    }
    if (!team) {
      if (type === 'Fórmula 1') team = addTeam('Fórmula 1', 'Outros', 'outros');
      else if (type === 'NFL, NBA e outros') team = addTeam('NFL, NBA e outros', 'Outros', 'outros');
      else team = addTeam('Outros clubes e modelos', 'Outros', 'outros');
      other++;
    }

    const s = season(title);
    products.push({
      id: a.id,
      t: title,                        // título original do fornecedor
      n: shortName(title, type),       // nome curto em PT-BR
      team,
      type,
      s,                               // temporada
      y: seasonYear(s),                // ano para ordenar
      sz: sizes(title),
      ph: images[a.id] || 0,           // fotos baixadas (0 = ainda sem imagem)
      c: await indiceCapa(a.id),       // qual dessas fotos é a capa
    });
  }

  // 4) Contagens, capa de cada time e países
  products.sort((a, b) => b.y - a.y || a.t.localeCompare(b.t));
  for (const p of products) {
    const tm = teams.get(p.team);
    tm.products++;
    if (!tm.cover && p.ph) { tm.cover = p.id; tm.coverC = p.c; }
  }
  const usedTeams = [...teams.values()].filter((t) => t.products > 0 || t.locked > 0)
    .sort((a, b) => b.products - a.products || a.name.localeCompare(b.name));

  const countries = new Map();
  for (const t of usedTeams) {
    if (t.kind !== 'clube') continue;
    const c = countries.get(t.countrySlug) || { slug: t.countrySlug, name: t.country, flag: FLAGS[t.country] || '🏳️', clubs: 0, products: 0 };
    c.clubs++; c.products += t.products;
    countries.set(t.countrySlug, c);
  }
  for (const t of usedTeams) if (t.kind === 'selecao') t.flag = FLAGS[t.country] || '🏳️';

  const catalog = {
    generatedAt: new Date().toISOString(),
    countries: [...countries.values()].sort((a, b) => b.products - a.products),
    teams: usedTeams,
    products,
  };
  await fs.mkdir(OUT, { recursive: true });
  await fs.writeFile(path.join(OUT, 'catalog.json'), JSON.stringify(catalog));

  const withPhotos = products.filter((p) => p.ph).length;
  console.log(`Catálogo: ${products.length} produtos, ${usedTeams.length} times/seleções, ${catalog.countries.length} países com clubes.`);
  console.log(`Time encontrado pelo título: ${byTitle} | pela subcategoria: ${bySub} | seleção: ${byNation} | sem time: ${other}`);
  console.log(`Produtos com foto baixada: ${withPhotos}. ${withPhotos < products.length ? 'Para baixar as fotos: npm run images' : ''}`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
