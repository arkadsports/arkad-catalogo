// Baixa o escudo de cada time do footylogos e guarda em public/escudos/.
// São arquivos pequenos (~6 KB cada) e vão para o Git, como as bandeiras.
//
//   npm run escudos              baixa o que falta
//   npm run escudos -- --force   refaz todos
//
// O cruzamento é por nome: normaliza dos dois lados (tira acento, artigo e
// sigla como FC ou SC) e procura o mesmo texto. Os que não casam assim estão
// em APELIDOS — quase todos são seleção (lá o nome é em inglês) ou clube com
// grafia diferente (PSG, Bayern, Inter).
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'public', 'escudos');
const force = process.argv.includes('--force');

// Nosso slug -> slug do footylogos, para os casos que o nome não resolve.
const APELIDOS = {
  'selecao-brasil': 'brazil-national-team',
  'selecao-argentina': 'argentina-national-team',
  'selecao-espanha': 'spain-national-team',
  'selecao-inglaterra': 'england-national-team',
  'selecao-franca': 'france-national-team',
  'selecao-alemanha': 'germany-national-team',
  'selecao-italia': 'italy-national-team',
  'selecao-portugal': 'portugal-national-team',
  'selecao-holanda': 'netherlands-national-team',
  'selecao-belgica': 'belgium-national-team',
  'selecao-uruguai': 'uruguay-national-team',
  'selecao-japao': 'japan-national-team',
  'selecao-mexico': 'mexico-national-team',
  'selecao-estados-unidos': 'united-states-national-team',
  'selecao-croacia': 'croatia-national-team',
  'selecao-colombia': 'colombia-national-team',
  'selecao-chile': 'chile-national-team',
  'selecao-marrocos': 'morocco-national-team',
  'selecao-senegal': 'senegal-national-team',
  'selecao-nigeria': 'nigeria-national-team',
  'selecao-escocia': 'scotland-national-team',
  'selecao-irlanda': 'ireland-national-team',
  'selecao-pais-de-gales': 'wales-national-team',
  'selecao-dinamarca': 'denmark-national-team',
  'selecao-suecia': 'sweden-national-team',
  'selecao-noruega': 'norway-national-team',
  'selecao-suica': 'switzerland-national-team',
  'selecao-polonia': 'poland-national-team',
  'selecao-turquia': 'turkey-national-team',
  'selecao-servia': 'serbia-national-team',
  'selecao-coreia-do-sul': 'south-korea-national-team',
  'selecao-australia': 'australia-national-team',
  'selecao-canada': 'canada-national-team',
  'selecao-arabia-saudita': 'saudi-arabia-national-team',
  'selecao-equador': 'ecuador-national-team',
  'selecao-peru': 'peru-national-team',
  'selecao-paraguai': 'paraguay-national-team',
  'selecao-costa-rica': 'costa-rica-national-team',
  'selecao-austria': 'austria-national-team',
  'selecao-grecia': 'greece-national-team',
  'selecao-republica-tcheca': 'czech-republic-national-team',
  'selecao-ucrania': 'ukraine-national-team',
  'selecao-russia': 'russia-national-team',
  'selecao-egito': 'egypt-national-team',
  'selecao-argelia': 'algeria-national-team',
  'selecao-tunisia': 'tunisia-national-team',
  'selecao-camaroes': 'cameroon-national-team',
  'selecao-gana': 'ghana-national-team',
  'selecao-costa-do-marfim': 'ivory-coast-national-team',
  psg: 'paris-saint-germain-psg',
  'bayern-de-munique': 'bayern-munich',
  'inter-de-milao': 'inter-milan',
  milan: 'ac-milan',
  benfica: 'sl-benfica',
  porto: 'fc-porto',
  sporting: 'sporting-cp',
  ajax: 'afc-ajax',
  barcelona: 'fc-barcelona',
  liverpool: 'liverpool-fc',
  'real-betis': 'real-betis-balompie',
  'olympique-de-marseille': 'olympique-marseille',
  'olympique-de-lyon': 'olympique-lyonnais',
  koln: '1-fc-koln',
  frankfurt: 'eintracht-frankfurt',
  zaragoza: 'real-zaragoza',
  'parma-calcio': 'parma-calcio-1913',
  'chivas-guadalajara': 'cd-guadalajara',
  'borussia-dortmund': 'borussia-dortmund',
  'atletico-de-madrid': 'atletico-madrid',
  napoli: 'ssc-napoli',
  roma: 'as-roma',
  lazio: 'ss-lazio',
  tottenham: 'tottenham-hotspur',
  newcastle: 'newcastle-united',
  everton: 'everton-fc',
  'west-ham': 'west-ham-united',
  'aston-villa': 'aston-villa-fc',
  celtic: 'celtic-fc',
  rangers: 'rangers-fc',
  galatasaray: 'galatasaray-sk',
  fenerbahce: 'fenerbahce-sk',
  'al-nassr': 'al-nassr-fc',
  'al-hilal': 'al-hilal-saudi-fc',
  'river-plate': 'club-atletico-river-plate',
  'boca-juniors': 'club-atletico-boca-juniors',
};

const limpar = (s) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\b(fc|cf|sc|ac|afc|cd|ud|sk|ss|as|rc|club|clube|de|do|da|the|futebol|football|team|national)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ').trim();

const catalogo = JSON.parse(await fs.readFile(path.join(ROOT, 'public/data/catalog.json'), 'utf8'));
const slugsFooty = JSON.parse(await fs.readFile(path.join(ROOT, 'data/raw/footylogos.json'), 'utf8'));

const conhecidos = new Set(slugsFooty);
const porLimpo = new Map();
for (const s of slugsFooty) {
  if (s.endsWith('-monochrome')) continue;
  const k = limpar(s);
  if (!porLimpo.has(k)) porLimpo.set(k, s);
}

await fs.mkdir(OUT, { recursive: true });
const times = catalogo.teams.filter((t) => t.kind === 'clube' || t.kind === 'selecao');
let baixados = 0, pulados = 0;
const semEscudo = [];

for (const t of times) {
  const dest = path.join(OUT, `${t.slug}.webp`);
  if (!force && await fs.access(dest).then(() => true, () => false)) { pulados++; continue; }

  // O apelido só vale se existir mesmo na lista do footylogos; senão cai no
  // cruzamento por nome, que é quem acerta de verdade.
  let alvo = conhecidos.has(APELIDOS[t.slug]) ? APELIDOS[t.slug] : null;
  if (!alvo) {
    const nome = t.kind === 'selecao' ? `${t.name} national team` : t.name;
    alvo = porLimpo.get(limpar(nome)) || porLimpo.get(limpar(t.name)) || porLimpo.get(limpar(t.name) + ' fc');
  }
  // Último recurso: procura o slug que contém o nome do time (ou o contrário)
  // e fica com o mais curto — "napoli" acha "ssc-napoli" sem tabela de apelidos.
  if (!alvo) {
    const nome = limpar(t.name);
    if (nome.length >= 4) {
      const cands = [...porLimpo.entries()]
        .filter(([k]) => k === nome || k.endsWith(' ' + nome) || k.startsWith(nome + ' '))
        .sort((a, b) => a[0].length - b[0].length);
      if (cands.length) alvo = cands[0][1];
    }
  }
  if (!alvo) { semEscudo.push(t.name); continue; }

  try {
    const url = `https://assets.footylogos.com/previews/${alvo}/${alvo}-logo-footylogos-320.webp`;
    const r = await fetch(url, { signal: AbortSignal.timeout(25000) });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    // 96 px basta ao lado do nome, e mantém o repositório leve.
    await sharp(Buffer.from(await r.arrayBuffer()))
      .resize(96, 96, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .webp({ quality: 88 }).toFile(dest);
    baixados++;
    if (baixados % 25 === 0) process.stdout.write(`\r  ${baixados} escudos…`);
  } catch {
    semEscudo.push(t.name);
  }
}

let bytes = 0;
for (const f of await fs.readdir(OUT)) bytes += (await fs.stat(path.join(OUT, f))).size;
console.log(`\nescudos: ${baixados} baixados, ${pulados} já existiam · ${(bytes / 1024).toFixed(0)} KB no total`);
console.log(`sem escudo: ${semEscudo.length} de ${times.length} times`);
if (semEscudo.length) console.log(`  ${semEscudo.slice(0, 20).join(', ')}${semEscudo.length > 20 ? '…' : ''}`);
