// Qual arquivo do álbum no R2 é a capa (a foto da peça inteira que o
// fornecedor mostra no cartão). Usado pelo build-catalog e pelo detectar-marca.
//
// Não tem posição fixa no álbum: é a última em 48% dos casos, a primeira em
// 25%. O download reordena o álbum para [última, 0, 1, ...], então a posição na
// lista original vira outro índice de arquivo.
import fs from 'node:fs/promises';
import path from 'node:path';

/** capas: { álbum: url da capa } (data/raw/capas.json). Sem capa conhecida = 0. */
export async function indiceCapa(raw, capas, id) {
  const url = capas[id];
  if (!url) return 0;
  const urls = JSON.parse(await fs.readFile(path.join(raw, 'photos', id + '.json'), 'utf8').catch(() => '[]'));
  const hash = url.split('/')[4];
  const i = urls.findIndex((u) => u.includes(hash));
  if (i < 0) return 0;
  return i === urls.length - 1 ? 0 : i + 1;
}
