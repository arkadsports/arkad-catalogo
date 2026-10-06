// Em que pasta do R2 ficam as fotos de um álbum.
//
// Quando o fornecedor TROCA as fotos de um álbum que já está no site, as fotos
// novas vão para uma pasta nova (<álbum>-v2, -v3...) em vez de sobrescrever as
// antigas: elas são servidas com cache de um ano, e o navegador do cliente
// continuaria mostrando a foto velha. data/versoes.json guarda a versão de
// cada álbum refeito; álbum que nunca mudou usa a pasta com o próprio número.
import fs from 'node:fs/promises';
import path from 'node:path';

export const ARQUIVO_VERSOES = path.resolve(import.meta.dirname, '..', '..', 'data', 'versoes.json');

/** { álbum: versão } — só os álbuns refeitos. */
export const lerVersoes = async () => JSON.parse(await fs.readFile(ARQUIVO_VERSOES, 'utf8').catch(() => '{}'));

export const pastaDoAlbum = (id, versoes) => (versoes[id] > 1 ? `${id}-v${versoes[id]}` : id);
