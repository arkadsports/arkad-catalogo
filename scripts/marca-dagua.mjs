// Estima a marca d'água do fornecedor e a remove.
//
// A marca é um texto cinza semitransparente, sempre na mesma posição relativa
// (centro da imagem). Isso quer dizer que cada pixel dela é uma mistura fixa:
//
//     visto = (1 - a) * original + a * cor
//
// onde "a" (a transparência) e "cor" são os mesmos em todas as fotos. Com
// muitas fotos dá para descobrir os dois e desfazer a conta, recuperando o
// pixel original — não é borrão nem remendo, é a imagem de volta.
//
// Como se estima, sem precisar saber o fundo: onde há marca, parte do pixel é
// sempre a mesma, então a VARIÂNCIA entre fotos diferentes cai. Comparando a
// variância de cada pixel com a das linhas vizinhas (que não têm marca):
//
//     1 - a = raiz( variância do pixel / variância sem marca )
//
// Com "a" em mãos, a média revela a cor:  cor = (média - (1-a)*média_sem) / a
//
//   npm run marca -- --estimar     mede a marca e salva data/marca.json
//   npm run marca -- --calibrar    acha o ganho e a cor que zeram a sobra
//   npm run marca -- --testar      gera antes/depois em teste-marca.png
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const MAPA = path.join(ROOT, 'data', 'marca.json');
const LADO = 1080;
// Faixa onde a marca cai, com folga. Medida no agregado de 40 fotos.
export const FAIXA = { topo: 490, altura: 120 };
const MARGEM = 14; // linhas de fundo usadas acima e abaixo da faixa

const args = process.argv.slice(2);

async function amostrar(quantas) {
  const c = JSON.parse(await fs.readFile(path.join(ROOT, 'public/data/catalog.json'), 'utf8'));
  const R2 = process.env.VITE_IMAGE_BASE.replace(/\/$/, '');
  const candidatos = c.products.filter((p) => p.ph >= 6);
  const fotos = [];
  for (let i = 0; fotos.length < quantas && i < quantas * 3; i++) {
    const p = candidatos[Math.floor((i * 173) % candidatos.length)];
    const idx = (p.c + 2) % p.ph;
    const r = await fetch(`${R2}/${p.id}/${idx}-full.webp`).catch(() => null);
    if (!r?.ok) continue;
    fotos.push(Buffer.from(await r.arrayBuffer()));
  }
  return fotos;
}

/** Recorta a faixa (mais as margens) em cinza, no tamanho padrão. */
async function faixaDe(buf) {
  const topo = FAIXA.topo - MARGEM;
  const altura = FAIXA.altura + MARGEM * 2;
  return sharp(buf).resize(LADO, LADO, { fit: 'fill' }).greyscale()
    .extract({ left: 0, top: topo, width: LADO, height: altura })
    .raw().toBuffer();
}

async function estimar() {
  const N = Number(args.find((a) => a.startsWith('--fotos='))?.split('=')[1]) || 150;
  console.log(`Baixando ${N} fotos para medir a marca...`);
  const fotos = await amostrar(N);
  const largura = LADO, altura = FAIXA.altura + MARGEM * 2;
  const n = largura * altura;

  // Para cada pixel, ajusta a reta  visto = A * fundo + B  ao longo das fotos.
  // O fundo de cada foto é a média das linhas de margem NAQUELA coluna — as
  // linhas de fora da faixa, que não têm marca. Da reta saem os dois números:
  //   A = 1 - a       (quanto do original sobrevive)
  //   B = a * cor     (quanto a marca acrescenta)
  const sx = new Float64Array(n), sy = new Float64Array(n);
  const sxx = new Float64Array(n), sxy = new Float64Array(n);
  let contagem = 0;

  for (const buf of fotos) {
    const faixa = await faixaDe(buf);
    // fundo desta foto, por coluna
    const fundo = new Float64Array(largura);
    for (let x = 0; x < largura; x++) {
      let s = 0;
      for (let i = 0; i < MARGEM; i++) s += faixa[i * largura + x] + faixa[(altura - 1 - i) * largura + x];
      fundo[x] = s / (MARGEM * 2);
    }
    for (let y = 0; y < altura; y++) {
      for (let x = 0; x < largura; x++) {
        const k = y * largura + x, f = fundo[x], v = faixa[k];
        sx[k] += f; sy[k] += v; sxx[k] += f * f; sxy[k] += f * v;
      }
    }
    contagem++;
    if (contagem % 25 === 0) process.stdout.write(`\r  ${contagem}/${fotos.length}`);
  }

  const alfa = new Float32Array(n), corPixel = new Float32Array(n);
  for (let k = 0; k < n; k++) {
    const den = contagem * sxx[k] - sx[k] * sx[k];
    if (Math.abs(den) < 1e-6) { alfa[k] = 0; continue; }
    const A = (contagem * sxy[k] - sx[k] * sy[k]) / den;
    const B = (sy[k] - A * sx[k]) / contagem;
    const a = Math.min(Math.max(1 - A, 0), 0.85);
    if (a < 0.10) { alfa[k] = 0; continue; }   // abaixo disso é textura, não marca
    alfa[k] = a;
    corPixel[k] = Math.min(Math.max(B / a, 0), 255);
  }

  // A marca é de uma cor só. A cor por pixel sai ruidosa justamente onde a
  // transparência é baixa; a mediana dos pixels mais opacos dá o valor certo,
  // e um número único é bem mais estável na hora de desfazer a mistura.
  const fortesCor = [];
  for (let k = 0; k < n; k++) if (alfa[k] > 0.3) fortesCor.push(corPixel[k]);
  fortesCor.sort((a, b) => a - b);
  const corUnica = fortesCor.length ? fortesCor[Math.floor(fortesCor.length / 2)] : 255;
  const cor = new Float32Array(n).fill(corUnica);
  console.log(`\ncor da marca: ${corUnica.toFixed(0)} (cinza, de 0 a 255)`);

  let fortes = 0, maiorAlfa = 0;
  for (const v of alfa) { if (v > 0) fortes++; if (v > maiorAlfa) maiorAlfa = v; }
  await fs.writeFile(MAPA, JSON.stringify({
    lado: LADO, faixa: FAIXA, margem: MARGEM, largura, altura, fotos: contagem,
    alfa: Buffer.from(new Float32Array(alfa).buffer).toString('base64'),
    cor: Buffer.from(new Float32Array(cor).buffer).toString('base64'),
  }));
  console.log(`\nmarca medida com ${contagem} fotos · ${fortes} pixels afetados (${(fortes / n * 100).toFixed(1)}% da faixa)`);
  console.log(`transparência máxima: ${(maiorAlfa * 100).toFixed(1)}%`);
}

/** Carrega o mapa da marca. */
export async function carregarMapa() {
  const m = JSON.parse(await fs.readFile(MAPA, 'utf8'));
  return {
    ...m,
    alfa: new Float32Array(Buffer.from(m.alfa, 'base64').buffer.slice(0)),
    cor: new Float32Array(Buffer.from(m.cor, 'base64').buffer.slice(0)),
  };
}

/** Máscara binária da marca, engordada alguns pixels para pegar a borda
 *  suavizada das letras. */
export function mascaraDe(mapa, limiar = 0.18, engorda = 2) {
  const { largura, altura } = mapa;
  const m = new Uint8Array(largura * altura);
  for (let k = 0; k < m.length; k++) if (mapa.alfa[k] > limiar) m[k] = 1;
  for (let passo = 0; passo < engorda; passo++) {
    const anterior = m.slice();
    for (let y = 1; y < altura - 1; y++) {
      for (let x = 1; x < largura - 1; x++) {
        const k = y * largura + x;
        if (anterior[k]) continue;
        if (anterior[k - 1] || anterior[k + 1] || anterior[k - largura] || anterior[k + largura]) m[k] = 1;
      }
    }
  }
  return m;
}

/** Remove a marca reconstruindo os pixels dela a partir dos vizinhos de cima e
 *  de baixo. As letras têm poucos pixels de altura e o tecido é contínuo na
 *  vertical, então a emenda não aparece — é a técnica usual para texto fino. */
export async function limpar(buf, mapa, mascara) {
  const img = sharp(buf);
  const meta = await img.metadata();
  const { data, info } = await img.resize(LADO, LADO, { fit: 'fill' })
    .removeAlpha().raw().toBuffer({ resolveWithObject: true });

  const { largura, altura } = mapa;
  const topo = mapa.faixa.topo - mapa.margem;
  const canais = info.channels;
  const px = (y, x, ch) => data[((topo + y) * info.width + x) * canais + ch];

  // Para cada pixel da marca, mede quanto falta andar até sair dela para cada
  // lado. Reconstrói pelo eixo mais curto: nas letras, atravessar um traço de
  // lado são 4 ou 5 pixels; de cima a baixo são 20. Quanto menor o vão, menos
  // se inventa — e menos rastro fica.
  const vaoH = new Int16Array(largura * altura);
  const vaoV = new Int16Array(largura * altura);
  for (let y = 0; y < altura; y++) {
    for (let x = 0; x < largura; x++) {
      const k = y * largura + x;
      if (!mascara[k]) continue;
      let e = x; while (e > 0 && mascara[y * largura + e - 1]) e--;
      let d = x; while (d < largura - 1 && mascara[y * largura + d + 1]) d++;
      vaoH[k] = d - e + 1;
      let c = y; while (c > 0 && mascara[(c - 1) * largura + x]) c--;
      let b = y; while (b < altura - 1 && mascara[(b + 1) * largura + x]) b++;
      vaoV[k] = b - c + 1;
    }
  }

  const saida = new Uint8Array(data.length);
  saida.set(data);
  for (let y = 0; y < altura; y++) {
    for (let x = 0; x < largura; x++) {
      const k = y * largura + x;
      if (!mascara[k]) continue;
      const horizontal = vaoH[k] <= vaoV[k];
      let ini, fim, pos;
      if (horizontal) {
        ini = x; while (ini > 0 && mascara[y * largura + ini - 1]) ini--;
        fim = x; while (fim < largura - 1 && mascara[y * largura + fim + 1]) fim++;
        pos = x;
      } else {
        ini = y; while (ini > 0 && mascara[(ini - 1) * largura + x]) ini--;
        fim = y; while (fim < altura - 1 && mascara[(fim + 1) * largura + x]) fim++;
        pos = y;
      }
      const antes = ini - 1, depois = fim + 1;
      const t = (pos - antes) / (depois - antes);
      for (let ch = 0; ch < 3; ch++) {
        const a = horizontal
          ? (antes >= 0 ? px(y, antes, ch) : px(y, Math.min(depois, largura - 1), ch))
          : (antes >= 0 ? px(antes, x, ch) : px(Math.min(depois, altura - 1), x, ch));
        const b = horizontal
          ? (depois < largura ? px(y, depois, ch) : a)
          : (depois < altura ? px(depois, x, ch) : a);
        saida[((topo + y) * info.width + x) * canais + ch] = Math.min(Math.max(Math.round(a + (b - a) * t), 0), 255);
      }
    }
  }
  data.set(saida);

  // Um borrão de meio pixel só na faixa reconstruída disfarça a emenda e
  // devolve um pouco da textura do tecido.
  return sharp(data, { raw: { width: info.width, height: info.height, channels: canais } })
    .resize(meta.width, meta.height, { fit: 'fill' });
}

/** Mede quanto de marca sobra: diferença média entre os pixels da marca e o
 *  fundo da coluna. Zero = marca sumiu; positivo = ainda aparece; negativo =
 *  passou do ponto e virou sombra. */
async function residuo(buf, mapa, ganho, corMarca) {
  const faixa = await faixaDe(buf);
  const { largura, altura } = mapa;
  const fundo = new Float64Array(largura);
  for (let x = 0; x < largura; x++) {
    let s = 0;
    for (let i = 0; i < MARGEM; i++) s += faixa[i * largura + x] + faixa[(altura - 1 - i) * largura + x];
    fundo[x] = s / (MARGEM * 2);
  }
  let somaMarca = 0, qMarca = 0, somaFora = 0, qFora = 0;
  for (let y = MARGEM; y < altura - MARGEM; y++) {
    for (let x = 0; x < largura; x++) {
      const k = y * largura + x;
      const a = Math.min(mapa.alfa[k] * ganho, 0.85);
      const visto = faixa[k];
      const corrigido = a ? (visto - a * corMarca) / (1 - a) : visto;
      const d = corrigido - fundo[x];
      if (mapa.alfa[k] > 0.25) { somaMarca += d; qMarca++; } else if (!mapa.alfa[k]) { somaFora += d; qFora++; }
    }
  }
  return (qMarca ? somaMarca / qMarca : 0) - (qFora ? somaFora / qFora : 0);
}

async function calibrar() {
  const mapa = await carregarMapa();
  console.log('Baixando fotos de conferência...');
  const fotos = await amostrar(30);
  console.log('\nganho  cor   sobra da marca');
  let melhor = null;
  for (const corMarca of [255, 235, 215, 195]) {
    for (const ganho of [0.25, 0.35, 0.45, 0.55, 0.7, 0.85, 1.0]) {
      let s = 0;
      for (const b of fotos) s += await residuo(b, mapa, ganho, corMarca);
      const m = s / fotos.length;
      if (!melhor || Math.abs(m) < Math.abs(melhor.m)) melhor = { ganho, corMarca, m };
      console.log(`${ganho.toFixed(2)}   ${String(corMarca).padStart(3)}   ${m.toFixed(2)}`);
    }
  }
  console.log(`\nmelhor: ganho ${melhor.ganho}, cor ${melhor.corMarca} (sobra ${melhor.m.toFixed(2)})`);
  const m = JSON.parse(await fs.readFile(MAPA, 'utf8'));
  m.ganho = melhor.ganho; m.corMarca = melhor.corMarca;
  await fs.writeFile(MAPA, JSON.stringify(m));
  console.log('gravado em data/marca.json');
}

async function testar() {
  const mapa = await carregarMapa();
  const limiar = Number(args.find((a) => a.startsWith('--limiar='))?.split('=')[1] ?? 0.18);
  const engorda = Number(args.find((a) => a.startsWith('--engorda='))?.split('=')[1] ?? 2);
  const mascara = mascaraDe(mapa, limiar, engorda);
  console.log(`limiar ${limiar} · engorda ${engorda}`);
  let n = 0; for (const v of mascara) if (v) n++;
  console.log(`máscara: ${n} pixels (${(n / mascara.length * 100).toFixed(1)}% da faixa)`);
  const fotos = await amostrar(4);
  const partes = [];
  for (const buf of fotos) {
    const recorte = { left: 140, top: FAIXA.topo - 10, width: 800, height: 140 };
    const antes = await sharp(buf).resize(LADO, LADO, { fit: 'fill' })
      .extract(recorte).png().toBuffer();
    const depois = await (await limpar(buf, mapa, mascara)).extract(recorte).png().toBuffer();
    partes.push(antes, depois);
  }
  await sharp({ create: { width: 800, height: partes.length * 140, channels: 3, background: '#fff' } })
    .composite(partes.map((input, i) => ({ input, left: 0, top: i * 140 })))
    .png().toFile(path.join(ROOT, 'teste-marca.png'));
  console.log('teste-marca.png: linhas alternadas — antes, depois, antes, depois...');
}

// Só roda os comandos quando chamado direto; importado, só exporta funções.
if (process.argv[1]?.endsWith('marca-dagua.mjs')) {
  if (args.includes('--estimar')) await estimar();
  else if (args.includes('--calibrar')) await calibrar();
  else if (args.includes('--testar')) await testar();
  else console.log('use: npm run marca -- --estimar | --calibrar | --testar');
}
