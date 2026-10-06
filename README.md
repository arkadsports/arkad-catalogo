# Arkad Sports · Catálogo

Site com o catálogo completo de camisas, organizado **por país → time → produto**, com página de produto em tela cheia e zoom, e pedido pelo WhatsApp.

Mesma base técnica do app dos bancos: **React + TypeScript + Vite**, hospedado na **Vercel**. As fotos ficam no **Cloudflare R2** quando for publicar.

---

## Como o projeto funciona (visão geral)

```
 Yupoo do fornecedor
        │  npm run sync            (1) lê categorias, álbuns e a lista de fotos
        ▼
 data/raw/                          dados brutos (JSON)
        │  npm run images          (3) baixa as fotos e converte para WebP (nítidas)
        ▼
 public/img/<álbum>/0-full.webp     fotos no seu computador
        │  npm run build-catalog   (2) organiza por país, time, tipo e temporada
        ▼
 public/data/catalog.json           o que o site lê
        │  npm run flags           (4) baixa a bandeira de cada país (uma vez)
        ▼
 public/flags/<país>.webp           bandeiras da galeria (vão para o Git)
        │  npm run dev             abre o site no navegador
        ▼
 site (React)
```

A etapa 2 roda de novo sempre que você baixar fotos novas ou mudar as regras de classificação.

## Estrutura de pastas

| Pasta / arquivo | Para que serve |
|---|---|
| `scripts/sync-yupoo.mjs` | Etapa 1: lê o catálogo do fornecedor (endereço no `.env`) e salva em `data/raw/` |
| `scripts/build-catalog.mjs` | Etapa 2: monta `public/data/catalog.json` (países, times, produtos) |
| `scripts/download-images.mjs` | Etapa 3: baixa as fotos em 2 tamanhos (600 px e 1600 px) |
| `scripts/download-flags.mjs` | Baixa as bandeiras dos países (`npm run flags`) |
| `scripts/montar-vitrine.mjs` | Monta as camisas do carrossel da abertura (`npm run vitrine`); fotos de vestiário em `data/vitrine/` (veja `data/vitrine/PROMPT.md`) |
| `scripts/lib/destaque.mjs` | A camisa que representa cada time: a mais recente, de preferência a de torcedor titular. Vira a capa do clube/seleção no `build-catalog` e a camisa do carrossel |
| `scripts/fotos-em-lotes.mjs` | Baixa tudo em lotes, subindo para o R2 e apagando o local (`npm run fotos`) |
| `scripts/detectar-marca.mjs` | Mede a marca d'água de cada foto do R2 (`npm run detectar-marca`); a regra fica em `scripts/lib/marca.mjs` |
| `scripts/testar-r2.mjs` | Confere as chaves do R2 antes de subir (`npm run testar-r2`) |
| `scripts/upload-r2.mjs` | Envia as fotos para o Cloudflare R2 |
| `scripts/lib/classify.mjs` | **Regras**: país de cada liga, apelidos dos times, seleções, tipos, tradução dos nomes |
| `src/config.ts` | **Configurações da loja**: WhatsApp, prazo, garantias do topo e a tabela de preços por quantidade |
| `src/pages/` | As páginas: início, clubes, país, seleções, time, produto, busca |
| `src/components/` | Peças reaproveitadas: cabeçalho, cartões, galeria com zoom |
| `src/components/ui/` | Componentes de interface no padrão shadcn/ui (Tailwind) |
| `src/components/CountryGallery.tsx` | A faixa de bandeiras da página inicial |
| `src/lib/catalog.tsx` | Carrega o catálogo e funções de apoio (preço por faixa, link do WhatsApp, busca) |
| `src/lib/cart.tsx` | Carrinho (guardado no navegador), resumo com desconto e a mensagem do pedido |
| `src/pages/CartPage.tsx` | Carrinho: peças, faixa de preço e resumo |
| `src/pages/FinalizarPage.tsx` | Concluir compra: entrega, pagamento, observação e envio pelo WhatsApp |
| `src/pages/AcompanharPage.tsx` | Acompanhar pedido pelo telefone (etapa e rastreio do ERP) |
| `src/styles.css` | Visual do site (cores e fontes no topo do arquivo) |

## Primeira vez: rodar no seu computador

Pré-requisito: **Node.js 20 ou mais novo** (https://nodejs.org).

```bash
npm install          # instala as dependências (uma vez só)
npm run dev          # abre em http://localhost:5173
```

O projeto já vem com o catálogo montado (7.079 produtos, 310 times e seleções) e com fotos de amostra em baixa resolução só dos times brasileiros atuais. O resto aparece como "Foto em breve" até você rodar as etapas abaixo.

## Atualizar o catálogo e baixar as fotos

```bash
npm run sync                         # 1. lê o Yupoo (demora de 30 a 60 min na 1ª vez; precisa de YUPOO_BASE no .env)
npm run build-catalog                # 2. organiza

npm run images -- --team=flamengo    # 3a. teste com um time primeiro
npm run images -- --covers           # 3b. só a foto de capa de tudo (rápido)
npm run images                       # 3c. todas as fotos (várias horas, retoma se parar)

npm run detectar-marca               # 4. mede a marca d'água das fotos novas
npm run build-catalog                # 2 de novo, para o site enxergar as fotos novas
```

Para só **acrescentar o que o fornecedor lançou**, sem mexer no resto:
`npm run sync` (lista só os álbuns novos) → `npm run fotos` (baixa as fotos
deles e sobe para o R2) → `npm run detectar-marca` → `npm run build-catalog`.

Para pegar também **as fotos que o fornecedor trocou** em álbuns que já
estavam no site, troque o primeiro passo por `npm run sync -- --refresh`
(relê a lista de fotos de todos os álbuns, uns 40 minutos). Ele percebe os
álbuns refeitos e prepara cada um para baixar de novo numa **pasta nova no
R2** (`<álbum>-v2`, `-v3`...; registro em `data/versoes.json`, regra em
`scripts/lib/pasta.mjs`). Pasta nova, e não sobrescrever: as fotos têm cache
de um ano, e o navegador do cliente continuaria mostrando a foto antiga.

Tamanho estimado com todas as fotos: **5 a 8 GB**. Comece pelos times que você mais vende.

**Álbuns com senha:** alguns álbuns do fornecedor são trancados (Liverpool e Juventus, por exemplo). O `sync` conta e pula esses álbuns, e o site mostra "há mais X modelos reservados". Para liberá-los, peça a senha ao fornecedor.

## A galeria de bandeiras

A página inicial abre numa faixa com a bandeira de cada país. O painel aberto
cresce e os outros encolhem; escolher um país filtra os clubes logo abaixo,
sem trocar de página.

- **No computador:** passar o mouse abre o painel; clicar entra no país. A roda
  do mouse rola a faixa de lado. Tab e as setas também funcionam.
- **No celular:** o primeiro toque abre o painel, o segundo entra no país. A
  faixa rola só na horizontal, para não prender o dedo de quem rola a página.

O componente visual é `src/components/ui/elastic-gallery.tsx` — genérico, não
sabe o que é um país. Quem liga ele ao catálogo é
`src/components/CountryGallery.tsx`.

**Bandeiras:** ficam em `public/flags/<país>.webp`, versionadas junto com o
código, para o site não depender de servidor de terceiros. São geradas por
`npm run flags`, que descobre o código de cada país a partir do próprio emoji
já cadastrado em `scripts/lib/classify.mjs` — não existe uma segunda lista de
países para manter. Vale usar a imagem e não o emoji porque o **Windows não
desenha bandeiras**: a do Brasil aparece como "BR" na tela do cliente.

## Tailwind e componentes shadcn/ui

O visual do site é o CSS escrito à mão em `src/styles.css`. O Tailwind entrou
depois, só para os componentes de `src/components/ui/`, e convive com ele:

- o **preflight** (o reset do Tailwind) fica **de fora de propósito** — o CSS à
  mão conta com os padrões do navegador. Está comentado no topo do `styles.css`;
- `@/...` aponta para `src/` (configurado no `vite.config.ts` e no
  `tsconfig.app.json`), que é o caminho que os componentes shadcn/ui esperam;
- `components.json` na raiz deixa o CLI funcionar: `npx shadcn@latest add <nome>`
  instala direto em `src/components/ui/`;
- como as regras à mão não estão em `@layer`, elas vencem as do Tailwind quando
  disputam a mesma propriedade. Nesses casos use `!` na classe (ex.: `!m-0`).

## As fotos do fornecedor

**A capa de cada produto é a que o fornecedor escolheu.** Ele monta o álbum
com fotos de detalhe (tecido, etiqueta, gola) e a peça inteira no meio delas —
sem posição fixa: é a última em 48% dos álbuns, a primeira em 25%, do meio nos
outros 27%. Nenhuma regra de posição acerta. Mas a listagem dele mostra, em
cada cartão, a foto da peça inteira: é essa a capa, e o `sync` a guarda em
`data/raw/capas.json`. O `build-catalog` descobre qual das fotos baixadas é
ela e grava o índice no campo `c` de cada produto; o site usa esse índice no
cartão e abre a galeria nele.

Atenção ao ler o código: o `download-images.mjs` reordena o álbum para
`[última, 0, 1, ...]`, então o índice do arquivo no R2 não é a posição na
lista original. A conversão está no `indiceCapa`, dentro do `build-catalog`.

**Marca d'água:** muitas fotos de detalhe trazem o endereço do fornecedor
impresso no meio da foto; a capa é sempre limpa. Decisão de 29/09/2026:
**nenhuma foto com marca vai para o site** (elas continuam no R2).

Como parte das marcas é fraca demais para qualquer detector, o site mostra só
o que é seguro: **a capa e as fotos da peça inteira (frente, costas) em que o
detector não vê marca**. Todo close (gola, escudo, tecido) sai, com ou sem
marca — nas amostras conferidas a olho, a marca só aparece nos closes.

- `npm run detectar-marca` mede cada foto do R2 e grava três notas em
  `data/marcas.json`: brilho e cor na faixa da marca, e o "fundo" — quanto a
  borda da foto difere da borda da capa (peça inteira tem o mesmo fundo de
  estúdio da capa; close tem pano na borda). Só lê; retoma de onde parou;
  mede de novo o álbum que ganhou fotos.
- O `build-catalog` aplica a regra (`podeMostrar` em `scripts/lib/marca.mjs`)
  e grava no campo `x` de cada produto as fotos escondidas. O site mostra só as
  outras (`fotosDe` em `src/lib/catalog.tsx`). Foto ainda não medida fica
  escondida.
- Para mudar a regra, ajuste `LIMITE_LUZ`, `LIMITE_COR` e `LIMITE_FUNDO` e
  rode o `build-catalog`, sem medir de novo.
- Para trazer todas as fotos de volta, faça `podeMostrar` devolver sempre
  `true` e rode o `build-catalog`. (Apagar `data/marcas.json` faz o contrário:
  sem nota, só a capa aparece.) Remover a marca das próprias fotos é outro
  caminho: `npm run limpar-marca`, que só funciona com a marca na posição de
  costume.

## Ajustes do dia a dia

- **Preços e WhatsApp:** os preços são editados no **ERP** (Tabela de Preços), e o site os lê ao abrir — veja "Integração com o ERP" abaixo. O `PRICE_TIERS` de `src/config.ts` é a reserva, usada se o ERP não responder; ele veio da aba "Preços do site" da `Tabela de Precificação.xlsx`: um valor para 1, 2, 3, 4 e 5+ peças. A faixa vale para o pedido inteiro, somando todas as peças do carrinho. Tipo sem preço entra no carrinho "a confirmar". Goleiro não tem linha própria: vira "Goleiro jogador" (título com "Player"), "Infantil" (Kids), "Manga longa" ou "Goleiro torcedor" — veja `priceKey` em `src/lib/catalog.tsx`.
- **Tamanho grande:** do XXL em diante (`TAMANHOS_GRANDES` no `src/config.ts`) o site avisa que pode haver adicional; o valor é confirmado no WhatsApp.
- **Personalização:** na página do produto, nas camisas (`PERSONALIZAVEIS`), o cliente escolhe nome, número e patch. A lista de patches muda conforme o time (`patchesDoTime` no `src/config.ts`): o da liga dele, o continental e o Mundial; seleção tem o da Copa do Mundo 2026. O valor é confirmado no WhatsApp. No carrinho, a mesma camisa com outra personalização é outra linha.
- **Como a compra funciona:** o cliente monta o carrinho e clica em "Comprar pelo WhatsApp". Na página de concluir compra (`/finalizar`) ele preenche os dados de entrega (nome completo, rua e número, CEP, bairro, cidade, estado, país, CPF, contato e e-mail; o CEP preenche o endereço pelo ViaCEP), escolhe a forma de pagamento e, se quiser, deixa uma observação; depois clica em "Concluir pedido pelo WhatsApp". O site mostra o pedido pronto em dois passos: (1) a mensagem de texto no WhatsApp e (2) a imagem do pedido, com a foto de frente de cada peça (`src/lib/pedido-imagem.ts`). No celular a imagem vai pelo menu de compartilhar; no computador ela é copiada (Ctrl+V na conversa) e baixada.
- **Fotos na imagem do pedido:** o R2 não libera CORS, então as fotos passam pelo próprio site em `/foto/...` (repasse no `vercel.json` e no `vite.config.ts`). Se o endereço do bucket mudar, troque nos dois arquivos e no `src/config.ts`.
- **Produto no time errado:** adicione um apelido em `CLUB_ALIASES` (em `scripts/lib/classify.mjs`) e rode `npm run build-catalog`.
- **Seleção faltando:** adicione em `NATIONAL_TEAMS` no mesmo arquivo.
- **Cores e fontes:** topo de `src/styles.css`.

## Integração com o ERP

O painel de gestão (ERP, repositório `arkadsports/ERP---ARKAD`) é quem manda nos preços e quem recebe pedidos e visitas. O endereço dele (https://erp-arkad-sports.vercel.app) fica em `ERP_URL`, no `src/config.ts`; a variável `VITE_ERP_URL` o substitui, e `VITE_ERP_URL=` vazia **desliga a integração** (o site funciona como antes). Código em `src/lib/erp.ts`.

- **Preços:** ao abrir, o site busca `/api/publico/precos` junto com o catálogo. Se o ERP não responder em 2,5 s, usa o `PRICE_TIERS`.
- **Pedido:** do carrinho, "Comprar pelo WhatsApp" leva a `/finalizar`, onde o cliente informa entrega, forma de pagamento (`FORMAS_PAGAMENTO` no `src/config.ts`) e observação. Ao concluir, tudo vai para `/api/publico/pedidos`. O ERP devolve o número (ex.: ARK-0012), que entra na mensagem do WhatsApp e na imagem do pedido. Se o ERP falhar, o pedido segue pelo WhatsApp sem número.
- **Visitas:** cada página aberta manda um aviso anônimo para `/api/publico/visitas` (identificador aleatório do navegador, sem dado pessoal). Abra o site com `?interno=1` no navegador da loja para ele não contar; `?interno=0` desfaz.

O ERP só aceita chamadas vindas de `https://arkadsports.vercel.app` e `http://localhost:5173`. Com domínio próprio, cadastre-o na variável `CATALOGO_ORIGINS` do ERP.

## Publicar

1. Suba o projeto para o GitHub (as fotos ficam fora do Git, veja `.gitignore`).
2. Crie um bucket no **Cloudflare R2**, ative o acesso público e crie uma chave de API.
3. Copie `.env.example` para `.env`, preencha as variáveis `R2_*` e rode `npm run upload-images`.
4. Na **Vercel**: importe o repositório e crie a variável `VITE_IMAGE_BASE` com a URL pública do bucket.

A Vercel publica o site sozinha a cada `git push`.

O `vercel.json` manda toda rota desconhecida para o `index.html` (é o React
Router que decide a página), menos as pastas de arquivo real: `data/`, `img/`,
`flags/`, `assets/` e o favicon.

## Antes de divulgar

- Confirme **por escrito** com o fornecedor que você pode usar as fotos na revenda.
- O site não mostra links do fornecedor. O código de cada produto é o número do álbum, para você achar a peça na hora de pedir.
