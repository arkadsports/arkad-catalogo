// Configurações da loja. Tudo que você muda com frequência fica aqui.

export const STORE = {
  name: 'Arkad Sports',
  // Número do WhatsApp com DDI + DDD, só dígitos. Ex.: '5584999999999'.
  // Vazio = o botão abre o WhatsApp e o cliente escolhe o contato.
  whatsapp: '5584998702222',
  leadTime: '20 a 30 dias',
};

// As garantias da loja: aparecem no topo de todas as páginas e na abertura.
export const PROMESSAS = [
  { icone: 'encomenda', titulo: 'Pedido sob encomenda', texto: 'Direto do fornecedor para você' },
  { icone: 'prazo', titulo: `Entrega em ${STORE.leadTime}`, texto: 'Acompanhamento pelo WhatsApp' },
  { icone: 'imposto', titulo: 'Imposto de importação incluso', texto: 'O preço que você vê é o final' },
  { icone: 'frete', titulo: 'Frete grátis para todo o Brasil', texto: 'Sem custo extra na entrega' },
] as const;

// Preço de venda por tipo de produto (R$), por faixa de quantidade do pedido:
//   [1 peça, 2 peças, 3 peças, 4 peças, 5 ou mais]
// A faixa vale para o PEDIDO inteiro (soma de todas as peças do carrinho, de
// qualquer tipo): o frete do fornecedor é cobrado por pedido e cai com a
// quantidade, e é isso que o desconto repassa.
// Tipo sem preço aqui aparece como "Consulte" e entra no carrinho "a confirmar".
// Fonte: Tabela de Precificação.xlsx (PDF de 26/09/2026, dólar R$ 5,15).
export const PRICE_TIERS: Record<string, readonly [number, number, number, number, number]> = {
  Torcedor: [179.9, 169.9, 159.9, 149.9, 139.9],
  Jogador: [189.9, 179.9, 169.9, 159.9, 149.9],
  'Retrô': [219.9, 209.9, 199.9, 189.9, 179.9],
  'Edição especial': [219.9, 209.9, 199.9, 189.9, 179.9],
  Infantil: [209.9, 199.9, 189.9, 179.9, 169.9],
  Feminina: [179.9, 169.9, 159.9, 149.9, 139.9],
  Treino: [179.9, 169.9, 159.9, 149.9, 139.9],
  Regata: [169.9, 159.9, 139.9, 129.9, 119.9],
  'Manga longa': [189.9, 179.9, 169.9, 159.9, 149.9],
  // Na planilha a faixa de 2 peças está em R$ 159,90, acima da de 1 peça:
  // mantido como está até a planilha ser revista.
  'Bebê': [149.9, 159.9, 139.9, 129.9, 119.9],
};

// Onde as fotos estão. O padrão é o bucket público do Cloudflare R2, que é
// endereço público mesmo — não é segredo, e deixá-lo aqui evita ter de
// cadastrar variável de ambiente na Vercel a cada projeto novo.
// Para desenvolver com as fotos da pasta public/img, ponha VITE_IMAGE_BASE=/img no .env.
const R2 = "https://pub-5d730db9d93247579dd905474ae50aba.r2.dev";
export const IMAGE_BASE = (import.meta.env.VITE_IMAGE_BASE as string | undefined)?.replace(/\/$/, '') || R2;
