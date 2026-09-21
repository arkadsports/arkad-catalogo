// Converte a bandeira em emoji para o código que o flagcdn.com usa.
//   '🇧🇷'  -> 'br'      (dois "indicadores regionais": B + R)
//   '🏴󠁧󠁢󠁥󠁮󠁧󠁿' -> 'gb-eng'  (bandeira preta + etiquetas g,b,e,n,g)
// Assim não existe uma segunda tabela de países para manter: a de emojis
// (FLAGS, em classify.mjs) continua sendo a única.
export function flagCode(emoji) {
  if (!emoji) return null;
  const cps = [...emoji].map((ch) => ch.codePointAt(0));

  const regional = cps.filter((c) => c >= 0x1f1e6 && c <= 0x1f1ff);
  if (regional.length === 2) return regional.map((c) => String.fromCharCode(c - 0x1f1e6 + 97)).join('');

  const tags = cps.filter((c) => c >= 0xe0061 && c <= 0xe007a);
  if (tags.length >= 4) {
    const letters = tags.map((c) => String.fromCodePoint(c - 0xe0000)).join('');
    // 'gbeng' -> 'gb-eng' (Inglaterra, Escócia, País de Gales, Irlanda do Norte)
    return letters.length > 2 ? `${letters.slice(0, 2)}-${letters.slice(2)}` : letters;
  }
  return null;
}
