# Fotos de vestiário do carrossel

Cada camisa do carrossel da página inicial aparece num vestiário do próprio clube.
As fotos são feitas numa ferramenta de IA de imagem que aceita uma foto de
referência (ChatGPT, Gemini, Adobe Firefly, Midjourney…).

## Passo a passo

1. Rode `npm run vitrine`. Ele escolhe a camisa mais recente de cada clube e
   salva a foto original em `data/vitrine/originais/<clube>.jpg`.
2. Na ferramenta de IA, envie a foto original e cole o prompt abaixo.
   Peça o formato **vertical 9:16** (é o formato das cartas do carrossel).
3. Salve o resultado em `data/vitrine/vestiario/<clube>.png`, com **o mesmo
   nome** da foto original (ex.: `flamengo.png`, `real-madrid.png`).
4. Rode `npm run vitrine` de novo: a foto de vestiário substitui a capa do
   fornecedor no carrossel.
5. Confira no site (`npm run dev`) e faça o commit de `public/hero/`.

Quando sair a camisa da temporada nova de um clube, o `npm run vitrine` troca a
original; gere a foto de vestiário de novo para ela.

Confira sempre se a IA manteve a camisa fiel (cores, patrocinador, escudo e
marca esportiva). Se ela inventou detalhe, gere de novo.

## Prompt

Formato: vertical 9:16.

Create a premium sports editorial locker room flat lay image centered around the uploaded football jersey as the absolute main subject. The scene must recreate a realistic club locker room / dressing room environment, with a clean and premium campaign look. Place the jersey naturally draped over the bench or locker seat, as if prepared for matchday, keeping it as the clear visual hero of the composition. The entire image must respect the identity of the uploaded jersey: - preserve the exact club colors - preserve the shirt design language - preserve the sponsor logic - preserve the sportswear brand identity visible on the jersey IMPORTANT RULE: All accessories in the scene must visually correspond to the same sportswear brand of the jersey. If the jersey brand is Adidas, use Adidas-style accessories. If the jersey brand is Nike, use Nike-style accessories. If the jersey brand is Puma, use Puma-style accessories. If the jersey brand is Umbro, use Umbro-style accessories. Apply this logic to any other brand as well. Accessories may include: - slides / locker room sandals - training footwear or football boots - towel - shin guards - socks - tape - water bottle - small personal locker room details All accessories must feel cohesive, premium, realistic, and brand-matched. The locker room itself must also reflect the club identity: - bench upholstery, seat color, locker panels, wall accents, and subtle details should reference the club’s color palette - the atmosphere should feel like the team’s own dressing room - use refined color harmony inspired by the club kit Style and composition: - premium sports commercial photography - top-down or slightly angled overhead composition - realistic fabric texture - sharp product detail - soft cinematic lighting - subtle shadows - clean framing - visually balanced layout - no clutter - elegant editorial presentation The mood should feel like: matchday preparation, elite football culture, club identity, premium locker room aesthetic, authentic sports campaign photography. Keep the jersey as the main focal point. The accessories must support the storytelling without overpowering the shirt. The final result should look like a high-end football lifestyle campaign image.
