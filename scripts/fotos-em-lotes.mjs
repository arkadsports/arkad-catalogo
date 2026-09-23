// Baixa TODAS as fotos sem encher o disco: trabalha em lotes e, a cada lote,
// envia para o R2 e apaga a cópia local. O computador nunca guarda mais que
// um lote de cada vez (~300 MB), mesmo que o catálogo inteiro passe de 10 GB.
//
//   npm run fotos                    -> começa (ou retoma) do ponto em que parou
//   npm run fotos -- --lote=100      -> lotes menores (padrão: 200 álbuns)
//   npm run fotos -- --ate=5         -> só 5 lotes e para (bom para testar)
//
// Retomar é seguro: o que já foi enviado está registrado em data/images.json e
// confirmado no bucket. Pode interromper com Ctrl+C a qualquer momento.
//
// Precisa das variáveis R2_* no .env (veja .env.example).
import fs from 'node:fs/promises';
import { statfsSync } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const ROOT = path.resolve(import.meta.dirname, '..');
const RAW = path.join(ROOT, 'data', 'raw');
const MANIFEST = path.join(ROOT, 'data', 'images.json');
const IMG = path.join(ROOT, 'public', 'img');
const LOTE_TMP = path.join(ROOT, 'data', '.lote.json');

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')).map(([k, v]) => [k, v ?? true]),
);
const TAMANHO = Number(args.lote) || 200;
const MAX_LOTES = Number(args.ate) || Infinity;
const ESPACO_MINIMO_GB = 2;

for (const v of ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET']) {
  if (!process.env[v]) {
    console.error(`Falta ${v} no .env. Sem o bucket do R2 não dá para apagar o local com segurança.`);
    process.exit(1);
  }
}

const rodar = (script, ...extras) =>
  new Promise((ok, erro) => {
    const p = spawn(process.execPath, [path.join(ROOT, 'scripts', script), ...extras], {
      cwd: ROOT, stdio: 'inherit', env: process.env,
    });
    p.on('close', (code) => (code === 0 ? ok() : erro(new Error(`${script} saiu com código ${code}`))));
  });

const livreGB = () => {
  const s = statfsSync(ROOT);
  return (s.bavail * s.bsize) / 1024 ** 3;
};

const tamanhoLocalMB = async () => {
  let bytes = 0;
  for (const d of await fs.readdir(IMG, { withFileTypes: true }).catch(() => [])) {
    if (!d.isDirectory()) continue;
    for (const f of await fs.readdir(path.join(IMG, d.name)).catch(() => [])) {
      bytes += await fs.stat(path.join(IMG, d.name, f)).then((s) => s.size, () => 0);
    }
  }
  return bytes / 1024 ** 2;
};

const albums = JSON.parse(await fs.readFile(path.join(RAW, 'albums.json'), 'utf8'));
const todos = Object.keys(albums).filter((id) => !albums[id].locked);

// Quantas fotos cada álbum tem. Um álbum que já passou por aqui só de capa
// aparece no manifesto com 1 foto — mas ainda deve as outras, então não pode
// contar como pronto.
const esperado = new Map();
for (const id of todos) {
  const n = await fs.readFile(path.join(RAW, 'photos', `${id}.json`), 'utf8')
    .then((t) => JSON.parse(t).length, () => 0);
  esperado.set(id, n);
}

// Álbuns já tentados nesta rodada. Foto que dá 404 no fornecedor nunca chega à
// contagem esperada; sem esta lista, o laço a tentaria para sempre.
const tentados = new Set();

// Primeiro, esvazia o que tiver sobrado de uma interrupção anterior.
if (await tamanhoLocalMB() > 1) {
  console.log('Sobrou foto de uma rodada anterior. Enviando antes de continuar...');
  await rodar('upload-r2.mjs', '--apagar');
}

let lote = 0;
while (lote < MAX_LOTES) {
  const manifest = JSON.parse(await fs.readFile(MANIFEST, 'utf8').catch(() => '{}'));
  const pendentes = todos.filter(
    (id) => !tentados.has(id) && (manifest[id] ?? 0) < esperado.get(id),
  );
  if (!pendentes.length) {
    console.log('\nTodos os álbuns já foram baixados e enviados.');
    break;
  }

  const livre = livreGB();
  if (livre < ESPACO_MINIMO_GB) {
    console.error(`\nParando: só ${livre.toFixed(1)} GB livres no disco (mínimo ${ESPACO_MINIMO_GB} GB).`);
    process.exitCode = 1;
    break;
  }

  lote++;
  const atual = pendentes.slice(0, TAMANHO);
  const feitos = todos.length - pendentes.length;
  console.log(`\n=== Lote ${lote} · ${atual.length} álbuns · ${feitos}/${todos.length} prontos · ${livre.toFixed(1)} GB livres ===`);

  for (const id of atual) tentados.add(id);
  await fs.writeFile(LOTE_TMP, JSON.stringify(atual));
  await rodar('download-images.mjs', `--albums=${LOTE_TMP}`);
  console.log(`   baixados ${(await tamanhoLocalMB()).toFixed(0)} MB — enviando para o R2...`);
  await rodar('upload-r2.mjs', '--apagar');
}

await fs.unlink(LOTE_TMP).catch(() => {});
console.log('\nAgora rode: npm run build-catalog   (para o site enxergar as fotos novas)');
