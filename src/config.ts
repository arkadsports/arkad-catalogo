// Configurações da loja. Tudo que você muda com frequência fica aqui.

export const STORE = {
  name: 'Arkad Sports',
  // Número do WhatsApp com DDI + DDD, só dígitos. Ex.: '5584999999999'.
  // Vazio = o botão abre o WhatsApp e o cliente escolhe o contato.
  whatsapp: '5584998702222',
  leadTime: '20 a 30 dias',
};

// Preço de venda por tipo de produto (R$). Tipo sem preço aparece como "Consulte".
// Mantenha alinhado com a planilha de precificação.
export const PRICES: Record<string, number> = {
  Torcedor: 149.9,
  Feminina: 149.9,
  Jogador: 189.9,
  'Retrô': 199.9,
};

// Onde as fotos estão. O padrão é o bucket público do Cloudflare R2, que é
// endereço público mesmo — não é segredo, e deixá-lo aqui evita ter de
// cadastrar variável de ambiente na Vercel a cada projeto novo.
// Para desenvolver com as fotos da pasta public/img, ponha VITE_IMAGE_BASE=/img no .env.
const R2 = "https://pub-5d730db9d93247579dd905474ae50aba.r2.dev";
export const IMAGE_BASE = (import.meta.env.VITE_IMAGE_BASE as string | undefined)?.replace(/\/$/, '') || R2;
