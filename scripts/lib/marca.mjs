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
// Sozinhas, essas duas notas deixam passar ~5% das fotos com marca: marca
// fraca, ou de outro tamanho, por cima de letreiro ou escudo. Por isso há uma
// terceira nota:
//
//   fundo: diferença entre a BORDA da foto e a borda da capa do mesmo álbum.
//          Foto da peça inteira (frente, costas) tem o mesmo fundo de estúdio
//          da capa: nota baixa. Close de gola, escudo ou tecido tem pano na
//          borda: nota alta. Nas amostras conferidas a olho (29/09/2026), a
//          marca só aparece nos closes; a peça inteira vem limpa.
//
// Regra do site (podeMostrar): fica a capa e as fotos da peça inteira em que o
// detector não vê marca. Todo close sai, com ou sem marca.
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

export const LIMITE_LUZ = 0.03;
export const LIMITE_COR = -0.02;
/** Até aqui a foto conta como peça inteira (closes começam acima de 30). */
export const LIMITE_FUNDO = 8;

/** [luz, cor] -> o detector vê marca? */
export const temMarca = ([luz, cor]) => Math.abs(luz) >= LIMITE_LUZ || cor <= LIMITE_COR;

/** A foto (que não é a capa) pode aparecer no site? Sem nota = não. */
export const podeMostrar = (nota) =>
  Array.isArray(nota) && nota.length >= 3 && !temMarca(nota) && nota[2] <= LIMITE_FUNDO;

// ---------- fundo: borda da foto x borda da capa ----------
const N = 48, B = 5;
/** Miniatura 48x48 em RGB, base da comparação de fundo. */
export const miniatura = async (buf) =>
  new Uint8Array(await sharp(buf).resize(N, N, { fit: 'fill' }).removeAlpha().raw().toBuffer());
/** Diferença média de cor na borda (topo e laterais; o chão tem o pedestal). */
export function diferencaDeFundo(foto, capa) {
  let soma = 0, q = 0;
  for (let y = 0; y < N * 0.8; y++) {
    for (let x = 0; x < N; x++) {
      if (!(y < B || x < B || x >= N - B)) continue;
      const k = 3 * (y * N + x);
      soma += Math.abs(foto[k] - capa[k]) + Math.abs(foto[k + 1] - capa[k + 1]) + Math.abs(foto[k + 2] - capa[k + 2]);
      q += 3;
    }
  }
  return Math.round((soma / q) * 10) / 10;
}

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
