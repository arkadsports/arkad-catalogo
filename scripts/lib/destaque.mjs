// Qual produto representa um time: a camisa mais recente, de preferência a de
// torcedor titular. Usado na capa de cada clube e seleção (build-catalog) e no
// carrossel da abertura (montar-vitrine), para o site sempre parecer em dia.

// Peças que não são camisa só viram capa se o time não tiver camisa nenhuma.
const NAO_CAMISA = new Set(['Patch', 'Meias', 'Shorts', 'Jaqueta e corta-vento', 'Moletom']);

/** Nota de destaque de um produto. Vence, nesta ordem: ser camisa, a
 *  temporada mais nova, ser de torcedor (depois jogador; infantil por último),
 *  ser o uniforme titular (depois o reserva) e, para desempatar, ter mais fotos. */
export function notaDestaque(p) {
  let n = p.y * 1000;
  if (NAO_CAMISA.has(p.type)) n -= 1e7;
  if (p.type === 'Torcedor') n += 400;
  else if (p.type === 'Jogador') n += 300;
  else if (p.type === 'Infantil' || p.type === 'Bebê') n -= 100; // adulto primeiro
  const nome = (p.n || '').toLowerCase();
  if (nome.includes('titular')) n += 200;
  else if (nome.includes('reserva')) n += 60;
  return n + Math.min(p.ph, 20);
}

/** O melhor produto da lista (só os que têm foto). */
export function destaque(produtos) {
  let melhor = null;
  for (const p of produtos) if (p.ph > 0 && (!melhor || notaDestaque(p) > notaDestaque(melhor))) melhor = p;
  return melhor;
}
