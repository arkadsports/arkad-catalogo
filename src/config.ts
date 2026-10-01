// Configurações da loja. Tudo que você muda com frequência fica aqui.

export const STORE = {
  name: 'Arkad Sports',
  // Número do WhatsApp com DDI + DDD, só dígitos. Ex.: '5584999999999'.
  // Vazio = o botão abre o WhatsApp e o cliente escolhe o contato.
  whatsapp: '5584998702222',
  leadTime: '20 a 30 dias',
};

// Painel de gestão da loja (ERP). O site lê de lá a tabela de preços e manda
// para lá o pedido finalizado e as visitas. Vazio = integração desligada: o
// site usa PRICE_TIERS abaixo e o pedido segue só pelo WhatsApp.
// Não é segredo: o ERP só aceita chamadas vindas do endereço do catálogo.
export const ERP_URL = (
  (import.meta.env.VITE_ERP_URL as string | undefined) ?? 'https://erp-arkad-sports.vercel.app'
).replace(/\/$/, '');

// As garantias da loja: aparecem no topo de todas as páginas e na abertura.
export const PROMESSAS = [
  { icone: 'encomenda', titulo: 'Pedido sob encomenda', texto: 'Direto do fornecedor para você' },
  { icone: 'prazo', titulo: `Entrega em ${STORE.leadTime}`, texto: 'Acompanhamento pelo WhatsApp' },
  { icone: 'frete', titulo: 'Frete grátis para todo o Brasil', texto: 'Sem custo extra na entrega' },
] as const;

// Preço de venda por tipo de produto (R$), por faixa de quantidade do pedido.
// Com o ERP ligado, quem manda é a Tabela de Preços do ERP (cada pasta ligada
// a uma destas linhas); esta tabela vale como reserva, se o ERP não responder
// ou não tiver a linha. Formato de cada linha:
//   [1 peça, 2 peças, 3 peças, 4 peças, 5 ou mais]
// A faixa vale para o PEDIDO inteiro (soma de todas as peças do carrinho, de
// qualquer tipo): o frete do fornecedor é cobrado por pedido e cai com a
// quantidade, e é isso que o desconto repassa.
// Tipo sem preço aqui aparece como "Consulte" e entra no carrinho "a confirmar".
// Fonte: aba "Preços do site" da Tabela de Precificação.xlsx (27/09/2026).
// Goleiro não tem preço próprio: vira "Goleiro torcedor" ou "Goleiro jogador"
// pelo título do álbum (veja priceKey em lib/catalog.tsx).
export const PRICE_TIERS: Record<string, readonly [number, number, number, number, number]> = {
  Torcedor: [179.9, 169.9, 159.9, 149.9, 139.9],
  Jogador: [189.9, 179.9, 169.9, 159.9, 149.9],
  'Goleiro torcedor': [179.9, 169.9, 159.9, 149.9, 139.9],
  'Goleiro jogador': [189.9, 179.9, 169.9, 159.9, 149.9],
  'Retrô': [219.9, 209.9, 199.9, 189.9, 179.9],
  'Edição especial': [219.9, 209.9, 199.9, 189.9, 179.9],
  Infantil: [209.9, 199.9, 189.9, 179.9, 169.9],
  Feminina: [179.9, 169.9, 159.9, 149.9, 139.9],
  Treino: [179.9, 169.9, 159.9, 149.9, 139.9],
  'Conjunto de treino': [259.9, 249.9, 239.9, 229.9, 219.9],
  Regata: [169.9, 159.9, 139.9, 129.9, 119.9],
  'Manga longa': [189.9, 179.9, 169.9, 159.9, 149.9],
  // Na planilha a faixa de 2 peças está em R$ 159,90, acima da de 1 peça:
  // mantido como está até a planilha ser revista.
  'Bebê': [149.9, 159.9, 139.9, 129.9, 119.9],
};

// Tamanhos grandes: o fornecedor às vezes cobra a mais por eles. O valor não é
// fixo, então o site só avisa e o acréscimo é confirmado no WhatsApp.
export const TAMANHOS_GRANDES = ['XXL', '3XL', '4XL', '5XL', '6XL', '7XL'];
export const AVISO_TAMANHO_GRANDE =
  'Tamanhos a partir do XXL podem ter um valor adicional, cobrado pelo fornecedor por causa do tamanho. Se houver, confirmamos o valor com você pelo WhatsApp antes do pagamento.';
export const AVISO_PERSONALIZACAO =
  'Nome, número e patch têm valor adicional, confirmado pelo WhatsApp antes do pagamento.';

// ---------- Personalização ----------
// Tipos de produto que aceitam nome, número e patch (camisas). Os outros —
// short, meia, jaqueta, polo, o próprio patch — não mostram o campo.
export const PERSONALIZAVEIS = new Set([
  'Torcedor', 'Jogador', 'Retrô', 'Edição especial', 'Infantil', 'Feminina',
  'Manga longa', 'Goleiro', 'Regata', 'Bebê', 'NFL, NBA e outros',
]);
export const NOME_MAX = 14; // letras do nome nas costas

// Patches da lista suspensa. O site mostra só os que combinam com o time:
// o da liga dele (vem do catálogo), o do torneio continental e o Mundial.
// Para mudar a lista, edite aqui.
const AMERICA_DO_SUL = new Set(['brasil', 'argentina', 'uruguai', 'chile', 'colombia', 'paraguai', 'equador', 'peru', 'bolivia', 'venezuela']);
const EUROPA = new Set([
  'inglaterra', 'espanha', 'alemanha', 'italia', 'franca', 'portugal', 'holanda', 'escocia', 'turquia',
  'belgica', 'austria', 'suica', 'grecia', 'dinamarca', 'suecia', 'noruega', 'russia', 'ucrania', 'croacia', 'servia',
]);
const AMERICA_DO_NORTE = new Set(['mexico', 'estados-unidos', 'canada', 'honduras', 'costa-rica', 'guatemala', 'panama']);
export function patchesDoTime(t: { kind: string; countrySlug: string; league: string }): string[] {
  if (t.kind === 'selecao') return ['Copa do Mundo 2026'];
  if (t.kind !== 'clube') return [];
  const lista: string[] = [];
  if (t.league) lista.push(t.league);
  if (AMERICA_DO_SUL.has(t.countrySlug)) lista.push('Copa Libertadores', 'Copa Sul-Americana');
  if (t.countrySlug === 'brasil') lista.push('Copa do Brasil');
  if (EUROPA.has(t.countrySlug)) lista.push('Champions League', 'Europa League');
  if (AMERICA_DO_NORTE.has(t.countrySlug)) lista.push('Concacaf Champions Cup');
  lista.push('Mundial de Clubes');
  return lista;
}

// Onde as fotos estão. O padrão é o bucket público do Cloudflare R2, que é
// endereço público mesmo — não é segredo, e deixá-lo aqui evita ter de
// cadastrar variável de ambiente na Vercel a cada projeto novo.
// Para desenvolver com as fotos da pasta public/img, ponha VITE_IMAGE_BASE=/img no .env.
const R2 = "https://pub-5d730db9d93247579dd905474ae50aba.r2.dev";
export const IMAGE_BASE = (import.meta.env.VITE_IMAGE_BASE as string | undefined)?.replace(/\/$/, '') || R2;
