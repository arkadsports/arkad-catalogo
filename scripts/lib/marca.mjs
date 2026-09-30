// Detecção da marca d'água do fornecedor numa foto. Usada por
// scripts/detectar-marca.mjs (mede) e scripts/build-catalog.mjs (aplica a regra).
//
// A marca é o texto do endereço do fornecedor, cinza e semitransparente, sempre
// na mesma faixa no meio da foto. O desenho das letras está em data/marca.json
// (medido por `npm run marca -- --estimar`). Cada foto recebe duas notas,
// ambas a correlação entre esse desenho e os detalhes finos da faixa:
//
//   luz: no brilho. A marca clareia tecido escuro e escurece tecido claro,
//        então o sinal varia; o que conta é o tamanho.
//   cor: na saturação. A marca é cinza e "desbota" as letras sobre tecido
//        colorido, mesmo quando o brilho quase não muda (cinza sobre vermelho).
//        Com marca, dá negativo.
//
// Conferido a olho em 400 fotos de detalhe e 150 capas (29/09/2026): a regra
// abaixo deixa passar ~1 em 60 fotos com marca (marca fraca sobre letreiro ou
// escudo) e esconde ~8% das fotos limpas (letreiros grandes lembram texto).
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

export const LIMITE_LUZ = 0.03;
export const LIMITE_COR = -0.02;

/** A regra: [luz, cor] -> tem marca? */
export const temMarca = ([luz, cor]) => Math.abs(luz) >= LIMITE_LUZ || cor <= LIMITE_COR;

const L = 540; // lado de trabalho: meia resolução do mapa (1080)
const R = 3;   // raio do passa-alta vertical

const passaAlta = (arr, w, h, x, y) => {
  let s = 0, q = 0;
  for (let d = -R; d <= R; d++) {
    if (!d) continue;
    const yy = y + d;
    if (yy < 0 || yy >= h) continue;
    s += arr[yy * w + x]; q++;
  }
  return arr[y * w + x] - s / q;
};

/** Prepara o medidor a partir de data/marca.json. */
export async function criarMedidor(root) {
  const m = JSON.parse(await fs.readFile(path.join(root, 'data', 'marca.json'), 'utf8'));
  const a1 = new Float32Array(Buffer.from(m.alfa, 'base64').buffer.slice(0));
  const W = m.largura / 2, H = m.altura / 2, MG = m.margem / 2, TOPO = (m.faixa.topo - m.margem) / 2;
  // o desenho das letras em meia resolução (média 2x2)
  const alfa = new Float64Array(W * H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const k = 2 * y * m.largura + 2 * x;
      alfa[y * W + x] = (a1[k] + a1[k + 1] + a1[k + m.largura] + a1[k + m.largura + 1]) / 4;
    }
  }
  const pts = [], modelo = [];
  for (let y = MG; y < H - MG; y++) for (let x = 0; x < W; x++) { pts.push([x, y]); modelo.push(passaAlta(alfa, W, H, x, y)); }
  const media = modelo.reduce((a, b) => a + b, 0) / modelo.length;
  let norma = 0;
  for (let i = 0; i < modelo.length; i++) { modelo[i] -= media; norma += modelo[i] ** 2; }
  norma = Math.sqrt(norma);

  const correlacao = (faixa) => {
    const v = new Float64Array(pts.length);
    let s = 0;
    for (let i = 0; i < pts.length; i++) { v[i] = passaAlta(faixa, W, H, pts[i][0], pts[i][1]); s += v[i]; }
    const mv = s / v.length;
    let nv = 0, c = 0;
    for (let i = 0; i < v.length; i++) { const d = v[i] - mv; nv += d * d; c += d * modelo[i]; }
    return c / (Math.sqrt(nv) * norma || 1);
  };

  /** Mede uma foto (qualquer tamanho quadrado). Devolve [luz, cor]. */
  return async function medir(buf) {
    const pixels = await sharp(buf).resize(L, L, { fit: 'fill' }).removeAlpha()
      .extract({ left: 0, top: TOPO, width: W, height: H }).raw().toBuffer();
    const luz = new Float64Array(W * H), cor = new Float64Array(W * H);
    for (let k = 0; k < W * H; k++) {
      const r = pixels[3 * k], g = pixels[3 * k + 1], b = pixels[3 * k + 2];
      luz[k] = 0.299 * r + 0.587 * g + 0.114 * b;
      cor[k] = Math.max(r, g, b) - Math.min(r, g, b);
    }
    return [Math.round(correlacao(luz) * 1000) / 1000, Math.round(correlacao(cor) * 1000) / 1000];
  };
}
