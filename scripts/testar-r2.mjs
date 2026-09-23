// Confere se as chaves do R2 no .env funcionam, antes de começar a subir
// 51 mil fotos. Testa as quatro coisas que podem dar errado, uma por uma:
//   1. as chaves são aceitas       2. o bucket existe e você alcança
//   3. você tem permissão de escrita   4. a URL pública serve o arquivo
//
//   npm run testar-r2
//
// Escreve e apaga um arquivinho de teste. Não mexe em nada mais.
import { S3Client, PutObjectCommand, HeadObjectCommand, DeleteObjectCommand, HeadBucketCommand } from '@aws-sdk/client-s3';

const env = { ...process.env };

// É fácil colar o endereço da tela em vez do valor. Quando dá para entender o
// que a pessoa quis dizer, a gente entende em vez de reclamar.
const soId = (v) => (v || '').match(/[0-9a-f]{32}/i)?.[0] ?? (v || '').trim();
env.R2_ACCOUNT_ID = soId(env.R2_ACCOUNT_ID);
env.VITE_IMAGE_BASE = (env.VITE_IMAGE_BASE || '').trim().replace(/\/$/, '');

const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, VITE_IMAGE_BASE } = env;

const falta = [];
if (!R2_ACCOUNT_ID) falta.push('R2_ACCOUNT_ID');
if (!R2_ACCESS_KEY_ID) falta.push('R2_ACCESS_KEY_ID');
if (!R2_SECRET_ACCESS_KEY) falta.push('R2_SECRET_ACCESS_KEY');
if (!R2_BUCKET) falta.push('R2_BUCKET');
if (falta.length) {
  console.error(`\n✗ Falta preencher no .env: ${falta.join(', ')}\n`);
  process.exit(1);
}

// Confere o formato antes de bater no servidor: economiza um erro confuso.
// Os enganos mais comuns são colar o endereço da tela, ou pegar o id da conta
// achando que é a chave — os dois vêm de telas diferentes do painel.
const erros = [];
if (!/^[0-9a-f]{32}$/i.test(R2_ACCOUNT_ID)) {
  erros.push('R2_ACCOUNT_ID não é um id de conta (esperado 32 caracteres de a-f e números)');
}
if (/^https?:/i.test(R2_ACCESS_KEY_ID) || /^https?:/i.test(R2_SECRET_ACCESS_KEY)) {
  erros.push('R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY estão com um endereço colado, não com a chave.\n' +
    '     A chave não fica na tela do bucket: ela nasce em R2 > Manage API Tokens > Create API Token.');
}
if (R2_ACCESS_KEY_ID === R2_ACCOUNT_ID) {
  erros.push('R2_ACCESS_KEY_ID está com o id da CONTA, que é outra coisa.\n' +
    '     A chave de API vem de R2 > Manage API Tokens > Create API Token.');
}
if (R2_SECRET_ACCESS_KEY.length < 40) {
  erros.push(`R2_SECRET_ACCESS_KEY tem ${R2_SECRET_ACCESS_KEY.length} caracteres; a do R2 tem 64`);
}
if (erros.length) {
  console.error('');
  for (const e of erros) console.error(`✗ ${e}`);
  console.error('');
  process.exit(1);
}

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
});

const Key = 'teste-arkad.txt';
let ok = true;

console.log(`\nBucket: ${R2_BUCKET}`);

try {
  await s3.send(new HeadBucketCommand({ Bucket: R2_BUCKET }));
  console.log('1/4  chaves aceitas e bucket alcançado ✓');
} catch (e) {
  const m = e.message;
  const dica = /EPROTO|ENOTFOUND|EAI_AGAIN|handshake|certificate/i.test(m)
    ? `não existe conta com esse R2_ACCOUNT_ID (tentei ${R2_ACCOUNT_ID}.r2.cloudflarestorage.com) — copie o Account ID da tela Overview do R2`
    : /403|Forbidden|SignatureDoesNotMatch|InvalidAccessKeyId/i.test(m)
      ? 'as chaves não foram aceitas — confira R2_ACCESS_KEY_ID e R2_SECRET_ACCESS_KEY, e se o token é de "Object Read & Write"'
      : /404|NoSuchBucket|NotFound/i.test(m)
        ? `não existe bucket chamado "${R2_BUCKET}" nessa conta — confira o nome do bucket e o R2_ACCOUNT_ID`
        : m;
  console.error(`1/4  ✗ ${dica}`);
  process.exit(1);
}

try {
  await s3.send(new PutObjectCommand({ Bucket: R2_BUCKET, Key, Body: 'ok', ContentType: 'text/plain' }));
  await s3.send(new HeadObjectCommand({ Bucket: R2_BUCKET, Key }));
  console.log('2/4  permissão de escrita ✓');
} catch (e) {
  console.error(`2/4  ✗ sem permissão de escrita: ${e.message}`);
  console.error('     o token precisa ser "Object Read & Write", não só de leitura');
  process.exit(1);
}

if (!VITE_IMAGE_BASE) {
  console.warn('3/4  ⚠ VITE_IMAGE_BASE está vazia — sem ela o site não sabe onde buscar as fotos');
  ok = false;
} else {
  try {
    const url = `${VITE_IMAGE_BASE.replace(/\/$/, '')}/${Key}`;
    const r = await fetch(url, { signal: AbortSignal.timeout(20000) });
    if (r.ok) {
      console.log('3/4  URL pública servindo o arquivo ✓');
    } else {
      console.error(`3/4  ✗ a URL pública respondeu ${r.status} em ${url}`);
      console.error('     ligue o "Public Development URL" nas Settings do bucket');
      ok = false;
    }
  } catch (e) {
    console.error(`3/4  ✗ não consegui alcançar VITE_IMAGE_BASE: ${e.message}`);
    ok = false;
  }
}

await s3.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key })).catch(() => {});
console.log('4/4  arquivo de teste apagado ✓');

console.log(ok
  ? '\n✓ Tudo certo. Pode me avisar que eu começo a subir as fotos.\n'
  : '\n⚠ Escrita funciona, mas falta a URL pública. Veja o item 3 acima.\n');
process.exitCode = ok ? 0 : 1;
