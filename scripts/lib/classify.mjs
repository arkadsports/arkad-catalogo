// Regras que transformam os dados brutos do fornecedor (títulos em inglês,
// categorias do Yupoo) em algo organizado: time, país, tipo, temporada e nome em PT-BR.
// Se algum produto cair no lugar errado, é aqui que você ajusta.

export const slugify = (s) =>
  String(s)
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export const norm = (s) =>
  String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// ---------------------------------------------------------------------------
// Países das ligas (categoria "pai" no Yupoo -> país)
// ---------------------------------------------------------------------------
export const LEAGUE_COUNTRY = {
  'Brasileiro Série A': { country: 'Brasil', league: 'Brasileirão' },
  'Premier League': { country: 'Inglaterra', league: 'Premier League' },
  'La Liga': { country: 'Espanha', league: 'La Liga' },
  'Serie A': { country: 'Itália', league: 'Serie A' },
  'Bundesliga': { country: 'Alemanha', league: 'Bundesliga' },
  'Ligue 1': { country: 'França', league: 'Ligue 1' },
  'Primeira Liga': { country: 'Portugal', league: 'Primeira Liga' },
  'EREDIVISIE': { country: 'Holanda', league: 'Eredivisie' },
  'Liga Profesional': { country: 'Argentina', league: 'Liga Profesional' },
  'LIGA MX': { country: 'México', league: 'Liga MX' },
  'MLS': { country: 'Estados Unidos', league: 'MLS' },
  'Chilean League': { country: 'Chile', league: 'Primera División' },
  'Scottish League': { country: 'Escócia', league: 'Premiership' },
};

// Bandeiras (emoji) dos países que aparecem como país de clube ou seleção.
export const FLAGS = {
  Brasil: '🇧🇷', Inglaterra: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', Espanha: '🇪🇸', 'Itália': '🇮🇹', Alemanha: '🇩🇪', 'França': '🇫🇷',
  Portugal: '🇵🇹', Holanda: '🇳🇱', Argentina: '🇦🇷', 'México': '🇲🇽', 'Estados Unidos': '🇺🇸', Chile: '🇨🇱',
  'Escócia': '🏴󠁧󠁢󠁳󠁣󠁴󠁿', 'Japão': '🇯🇵', 'Arábia Saudita': '🇸🇦', Turquia: '🇹🇷', Uruguai: '🇺🇾', 'Colômbia': '🇨🇴',
  Peru: '🇵🇪', Equador: '🇪🇨', Paraguai: '🇵🇾', 'Bélgica': '🇧🇪', 'Croácia': '🇭🇷', Marrocos: '🇲🇦',
  Senegal: '🇸🇳', 'Nigéria': '🇳🇬', Gana: '🇬🇭', 'Camarões': '🇨🇲', 'Costa do Marfim': '🇨🇮', Egito: '🇪🇬',
  'Argélia': '🇩🇿', 'Tunísia': '🇹🇳', 'África do Sul': '🇿🇦', 'Canadá': '🇨🇦', 'Costa Rica': '🇨🇷', Jamaica: '🇯🇲',
  'Panamá': '🇵🇦', Honduras: '🇭🇳', Catar: '🇶🇦', 'Irã': '🇮🇷', 'Austrália': '🇦🇺', 'Nova Zelândia': '🇳🇿',
  'País de Gales': '🏴󠁧󠁢󠁷󠁬󠁳󠁿', Irlanda: '🇮🇪', 'Irlanda do Norte': '🇬🇧', Dinamarca: '🇩🇰', 'Suécia': '🇸🇪', Noruega: '🇳🇴',
  'Suíça': '🇨🇭', 'Áustria': '🇦🇹', 'Polônia': '🇵🇱', 'República Tcheca': '🇨🇿', 'Sérvia': '🇷🇸', 'Ucrânia': '🇺🇦',
  'Grécia': '🇬🇷', 'Rússia': '🇷🇺', Hungria: '🇭🇺', 'Romênia': '🇷🇴', 'Islândia': '🇮🇸', 'Finlândia': '🇫🇮',
  China: '🇨🇳', 'Coreia do Sul': '🇰🇷', Haiti: '🇭🇹', 'Curaçao': '🇨🇼', 'Uzbequistão': '🇺🇿', 'Jordânia': '🇯🇴',
  'Cabo Verde': '🇨🇻', 'Bósnia': '🇧🇦', 'Eslováquia': '🇸🇰', 'Eslovênia': '🇸🇮', 'Venezuela': '🇻🇪', 'Bolívia': '🇧🇴',
  'Iraque': '🇮🇶', 'Albânia': '🇦🇱', Congo: '🇨🇩', 'El Salvador': '🇸🇻', Guatemala: '🇬🇹', 'Trinidad e Tobago': '🇹🇹',
  'Bulgária': '🇧🇬', 'Geórgia': '🇬🇪', 'Armênia': '🇦🇲', 'Macedônia do Norte': '🇲🇰', Montenegro: '🇲🇪', Kosovo: '🇽🇰',
  Israel: '🇮🇱', 'Índia': '🇮🇳', 'Tailândia': '🇹🇭', 'Vietnã': '🇻🇳', 'Indonésia': '🇮🇩', 'Malásia': '🇲🇾', Filipinas: '🇵🇭',
  Mali: '🇲🇱', 'Burkina Faso': '🇧🇫', 'Guiné': '🇬🇳', 'Gabão': '🇬🇦', 'Zâmbia': '🇿🇲', Angola: '🇦🇴', 'Quênia': '🇰🇪',
  Palestina: '🇵🇸', 'Síria': '🇸🇾', 'Líbano': '🇱🇧', 'Emirados Árabes': '🇦🇪', 'Omã': '🇴🇲', Bahrein: '🇧🇭', Kuwait: '🇰🇼',
  Cuba: '🇨🇺', 'República Dominicana': '🇩🇴', 'Porto Rico': '🇵🇷', 'Nicarágua': '🇳🇮', Suriname: '🇸🇷', Benin: '🇧🇯', Togo: '🇹🇬',
  Outros: '🌍',
};

// ---------------------------------------------------------------------------
// Seleções: palavra no título (inglês) -> nome do país em português
// ---------------------------------------------------------------------------
export const NATIONAL_TEAMS = [
  ['brazil|brasil', 'Brasil'], ['argentina', 'Argentina'], ['france|french', 'França'], ['germany|german', 'Alemanha'],
  ['spain', 'Espanha'], ['italy', 'Itália'], ['england', 'Inglaterra'], ['portugal', 'Portugal'],
  ['netherlands|holland', 'Holanda'], ['belgium', 'Bélgica'], ['croatia', 'Croácia'], ['mexico', 'México'],
  ['usa|united states', 'Estados Unidos'], ['japan', 'Japão'], ['south korea|korea', 'Coreia do Sul'], ['colombia', 'Colômbia'],
  ['uruguay', 'Uruguai'], ['chile', 'Chile'], ['peru', 'Peru'], ['ecuador', 'Equador'], ['paraguay', 'Paraguai'],
  ['venezuela', 'Venezuela'], ['bolivia', 'Bolívia'], ['morocco', 'Marrocos'], ['senegal', 'Senegal'], ['nigeria', 'Nigéria'],
  ['ghana', 'Gana'], ['cameroon', 'Camarões'], ['ivory coast|cote d.?ivoire', 'Costa do Marfim'], ['egypt', 'Egito'],
  ['algeria', 'Argélia'], ['tunisia', 'Tunísia'], ['south africa', 'África do Sul'], ['canada', 'Canadá'],
  ['costa rica', 'Costa Rica'], ['jamaica', 'Jamaica'], ['panama', 'Panamá'], ['honduras', 'Honduras'],
  ['saudi arabia|saudi', 'Arábia Saudita'], ['qatar', 'Catar'], ['iran', 'Irã'], ['australia', 'Austrália'],
  ['new zealand', 'Nova Zelândia'], ['scotland', 'Escócia'], ['wales', 'País de Gales'], ['northern ireland', 'Irlanda do Norte'],
  ['ireland', 'Irlanda'], ['denmark', 'Dinamarca'], ['sweden', 'Suécia'], ['norway', 'Noruega'], ['switzerland', 'Suíça'],
  ['austria', 'Áustria'], ['poland', 'Polônia'], ['czech', 'República Tcheca'], ['serbia', 'Sérvia'], ['ukraine', 'Ucrânia'],
  ['turkey|turkiye', 'Turquia'], ['greece', 'Grécia'], ['russia', 'Rússia'], ['hungary', 'Hungria'], ['romania', 'Romênia'],
  ['iceland', 'Islândia'], ['finland', 'Finlândia'], ['china', 'China'], ['haiti', 'Haiti'], ['curacao|curaçao', 'Curaçao'],
  ['uzbekistan', 'Uzbequistão'], ['jordan(?! ?(anthem|x|brand|jumpman))', 'Jordânia'], ['cape verde', 'Cabo Verde'],
  ['bosnia', 'Bósnia'], ['slovakia', 'Eslováquia'], ['slovenia', 'Eslovênia'], ['iraq', 'Iraque'],
  ['albania', 'Albânia'], ['dr congo|congo', 'Congo'], ['el salvador', 'El Salvador'], ['guatemala', 'Guatemala'],
  ['trinidad', 'Trinidad e Tobago'], ['bulgaria', 'Bulgária'], ['georgia', 'Geórgia'], ['armenia', 'Armênia'],
  ['north macedonia|macedonia', 'Macedônia do Norte'], ['montenegro', 'Montenegro'], ['kosovo', 'Kosovo'],
  ['israel', 'Israel'], ['india', 'Índia'], ['thailand', 'Tailândia'], ['vietnam', 'Vietnã'], ['indonesia', 'Indonésia'],
  ['malaysia', 'Malásia'], ['philippines', 'Filipinas'], ['mali', 'Mali'], ['burkina faso', 'Burkina Faso'],
  ['guinea', 'Guiné'], ['gabon', 'Gabão'], ['zambia', 'Zâmbia'], ['angola', 'Angola'], ['kenya', 'Quênia'],
  ['palestine', 'Palestina'], ['syria', 'Síria'], ['lebanon', 'Líbano'], ['uae|emirates', 'Emirados Árabes'],
  ['oman', 'Omã'], ['bahrain', 'Bahrein'], ['kuwait', 'Kuwait'], ['cuba', 'Cuba'], ['dominican', 'República Dominicana'],
  ['puerto rico', 'Porto Rico'], ['nicaragua', 'Nicarágua'], ['suriname', 'Suriname'], ['benin', 'Benin'], ['togo', 'Togo'],
].map(([re, name]) => ({ re: new RegExp(`\\b(${re})\\b`, 'i'), name }));

// ---------------------------------------------------------------------------
// Clubes que não estão numa subcategoria do Yupoo, ou que aparecem com outro
// nome nos títulos. [expressão no título, nome do time, país]
// ---------------------------------------------------------------------------
export const CLUB_ALIASES = [
  ['m-u|man utd|manchester united', 'Manchester United', 'Inglaterra'],
  ['lfc|liverpool', 'Liverpool', 'Inglaterra'],
  ['man city|manchester city', 'Manchester City', 'Inglaterra'],
  ['spurs|tottenham', 'Tottenham Hotspur', 'Inglaterra'],
  ['juv|juventus', 'Juventus', 'Itália'],
  ['ac milan', 'AC Milan', 'Itália'], ['inter milan', 'Inter de Milão', 'Itália'],
  ['psg|paris saint.?germain', 'PSG', 'França'], ['bayern', 'Bayern de Munique', 'Alemanha'],
  ['dortmund|bvb', 'Borussia Dortmund', 'Alemanha'], ['barca|barcelona', 'Barcelona', 'Espanha'],
  ['atletico madrid|atlético madrid', 'Atlético de Madrid', 'Espanha'],
  ['flamenco|flamengo', 'Flamengo', 'Brasil'], ['sao paulo|são paulo', 'São Paulo', 'Brasil'],
  ['mineiro', 'Atlético Mineiro', 'Brasil'], ['paranaense|athletico', 'Athletico Paranaense', 'Brasil'],
  ['gremio|grêmio', 'Grêmio', 'Brasil'], ['vasco', 'Vasco da Gama', 'Brasil'], ['bragantino', 'Red Bull Bragantino', 'Brasil'],
  ['ceara|ceará', 'Ceará', 'Brasil'], ['nautico|náutico', 'Náutico', 'Brasil'], ['vitoria|vitória', 'Vitória', 'Brasil'],
  ['cuiaba|cuiabá', 'Cuiabá', 'Brasil'], ['sport recife|sport club', 'Sport Recife', 'Brasil'],
  ['club leon|leon', 'León', 'México'], ['cerro porteno|cerro porteño', 'Cerro Porteño', 'Paraguai'],
  ['olimpia', 'Olimpia', 'Honduras'], ['al.?ahli', 'Al-Ahli', 'Arábia Saudita'], ['juve', 'Juventus', 'Itália'],
  ['al.?nassr|riyadh victory', 'Al-Nassr', 'Arábia Saudita'], ['al.?hilal', 'Al-Hilal', 'Arábia Saudita'],
  ['al.?ittihad', 'Al-Ittihad', 'Arábia Saudita'], ['galatasaray', 'Galatasaray', 'Turquia'],
  ['fenerbahce|fenerbahçe', 'Fenerbahçe', 'Turquia'], ['besiktas|beşiktaş', 'Beşiktaş', 'Turquia'],
  ['penarol|peñarol', 'Peñarol', 'Uruguai'], ['nacional', 'Nacional', 'Uruguai'],
  ['atletico nacional', 'Atlético Nacional', 'Colômbia'], ['ldu|liga de quito', 'LDU Quito', 'Equador'],
  ['universitario', 'Universitario', 'Peru'], ['santos laguna', 'Santos Laguna', 'México'],
  ['club america|america', 'América', 'México'], ['chivas', 'Chivas Guadalajara', 'México'],
  ['atlas', 'Atlas', 'México'], ['pumas', 'Pumas UNAM', 'México'], ['tigres', 'Tigres UANL', 'México'],
  ['celtic', 'Celtic', 'Escócia'], ['rangers', 'Rangers', 'Escócia'],
];

// Subcategorias do Yupoo com nome errado ou que não são times.
export const JUNK_SUBCATEGORIES = new Set(['Crescent', 'Leyard', 'Panamera', 'Hereja', 'Don Castello', 'Sao Paulo', 'Girondins Bordeaux', 'Hannover', 'Cádiz', 'UD Las Palmas', 'Deportivo Toluca', 'Atlasv', 'Juv', 'M-U', 'LFC', 'Hull City ']);
// Correções de nome das subcategorias (nome no Yupoo -> nome no site)
export const SUBCATEGORY_RENAME = {
  'Juv': 'Juventus', 'M-U': 'Manchester United', LFC: 'Liverpool', 'Atlasv': 'Atlas', 'Inter Milan': 'Inter de Milão',
  'Bayern Munich': 'Bayern de Munique', 'Atletico Madrid': 'Atlético de Madrid', 'America': 'América',
  'Chivas de Guadalajara': 'Chivas Guadalajara', 'Gremio': 'Grêmio', 'Vasco da Gama': 'Vasco da Gama',
  'Ceará Sporting': 'Ceará', 'Nautico': 'Náutico', 'Atlético Paranaense': 'Athletico Paranaense',
  'Girondins de Bordeaux': 'Bordeaux', 'Hannover 96': 'Hannover', 'Olympique de Marseille': 'Olympique de Marseille',
  'Deportivo Universidad Católica': 'Universidad Católica', 'Pumas unam': 'Pumas UNAM', 'Atlético Rosario Central': 'Rosario Central',
  'Celtic F.C.': 'Celtic', 'Rangers F.C.': 'Rangers', 'S.L. Benfica': 'Benfica', 'Juv ': 'Juventus',
};

// ---------------------------------------------------------------------------
// Tipo de produto (a ordem importa: a primeira regra que bater vence)
// ---------------------------------------------------------------------------
export const TYPES = [
  ['Tabela de medidas', /size chart|size table|size\s*$|^(kids kit shirt|retro shirt|woman shirt|player version|polo shirt|baby jersey|sports socks|shorts|training suit kit|long-sleeve shirt|windbreaker\/training top|football boots logo|sports shoes|panties|nba|nfl-nhl|f1)$/i],
  ['Patch', /\bpatch(es)?\b/i],
  ['Goleiro', /goalkeeper|\bgk\b/i],
  ['Bebê', /baby|infant/i],
  ['Infantil', /\bkids?\b|children|child/i],
  ['Feminina', /women|woman|female|lady|ladies/i],
  ['Meias', /sock/i],
  ['Shorts', /\bshorts?\b/i],
  ['Polo', /polo/i],
  ['Regata', /\bvest\b|tank top|singlet/i],
  ['Conjunto de treino', /training suit|tracksuit|track suit|training kit|training uniform|training set|pre-?match suit|\bsuit\b/i],
  ['Jaqueta e corta-vento', /windbreaker|jacket|anthem|coat/i],
  ['Moletom', /sweatshirt|hoodie|sweat top|pullover|drill top/i],
  ['Manga longa', /long.?sleeve/i],
  ['Jogador', /player/i],
  ['Retrô', /retro|vintage|\b(19[5-9]\d|200\d|201\d)\b|\b(0\d|1\d|9\d|8\d|7\d)[/-](0\d|1\d|9\d|8\d|7\d|00)\b/i],
  ['Edição especial', /special|concept|commemorative|edition|anniversary|limited|\bx\s|classic|pre.?match|warm.?up|co-?branded/i],
  ['Treino', /training|train/i],
  ['Fórmula 1', /\bf1\b|formula one|racing suit/i],
  ['NFL, NBA e outros', /\bnfl\b|\bnba\b|\bnrl\b|rugby|basketball/i],
];
export function productType(title) {
  for (const [name, re] of TYPES) if (re.test(title)) return name;
  return 'Torcedor';
}

// Temporada: "25/26", "2026", "1998" ...
export function season(title) {
  let m = title.match(/\b(19\d\d|20\d\d)\s*[/-]\s*(\d{2,4})\b/);
  if (m) return `${m[1].slice(2)}/${m[2].slice(-2)}`;
  m = title.match(/\b(\d{2})\s*[/-]\s*(\d{2})\b/);
  if (m) return `${m[1]}/${m[2]}`;
  m = title.match(/\b(\d{2})(\d{2})\b(?=.*(jersey|home|away|player|version|kit))/i);
  if (m && +m[2] === +m[1] + 1) return `${m[1]}/${m[2]}`;
  m = title.match(/\b(19[5-9]\d|20[0-3]\d)\b/);
  return m ? m[1] : '';
}
// Ano de referência para ordenar (mais recente primeiro)
export function seasonYear(s) {
  if (!s) return 0;
  if (/^\d{4}$/.test(s)) return +s;
  const a = +s.slice(0, 2);
  return a > 50 ? 1900 + a : 2000 + a;
}

export function sizes(title) {
  const m = title.match(/\b(XS|S|M)\s*[-–~]\s*(\d?X{1,4}L|[2-5]XL)\b/i);
  return m ? `${m[1]}–${m[2]}`.toUpperCase() : '';
}

// Nome curto em português a partir do título em inglês
const VARIANTS = [
  [/fourth/i, '4º uniforme'], [/third/i, '3º uniforme'], [/away/i, 'Reserva'], [/home/i, 'Titular'],
  [/pre-?match/i, 'Pré-jogo'], [/goalkeeper/i, 'Goleiro'], [/training|train/i, 'Treino'],
  [/special|commemorative|edition|anniversary|concept/i, 'Edição especial'],
];
const COLORS = [
  ['black', 'preta'], ['white', 'branca'], ['red', 'vermelha'], ['blue', 'azul'], ['navy', 'marinho'], ['green', 'verde'],
  ['yellow', 'amarela'], ['gr[ae]y', 'cinza'], ['pink', 'rosa'], ['gold', 'dourada'], ['beige', 'bege'], ['purple', 'roxa'],
  ['orange', 'laranja'], ['brown', 'marrom'],
];
export function shortName(title, type) {
  const v = VARIANTS.find(([re]) => re.test(title))?.[1] || '';
  const colors = COLORS.filter(([en]) => new RegExp(`\\b${en}\\b`, 'i').test(title)).map(([, pt]) => pt);
  const parts = [];
  if (v && v !== type) parts.push(v);
  if (colors.length) parts.push(colors.slice(0, 2).join(' e '));
  if (/all sponsor/i.test(title)) parts.push('com patrocínios');
  if (/long.?sleeve/i.test(title) && type !== 'Manga longa') parts.push('manga longa');
  const s = parts.join(' · ');
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}
