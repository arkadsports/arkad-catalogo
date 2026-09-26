import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import './styles.css';
import { CatalogProvider } from './lib/catalog';
import { CartProvider } from './lib/cart';
import Layout from './components/Layout';
import Home from './pages/Home';
import { ClubsPage, CountryPage, NationsPage } from './pages/Lists';
import TeamPage from './pages/TeamPage';
import ProductPage from './pages/ProductPage';
import SearchPage from './pages/SearchPage';
import CartPage from './pages/CartPage';

// Rotas do site:
//   /                 início (países, seleções, destaques)
//   /clubes           clubes agrupados por país
//   /pais/:slug       clubes de um país
//   /selecoes         todas as seleções
//   /time/:slug       produtos de um time (filtro por tipo e temporada)
//   /produto/:id      página do produto com galeria e pedido
//   /busca?q=         busca
//   /carrinho         carrinho e fechamento do pedido pelo WhatsApp
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CatalogProvider>
      <CartProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="clubes" element={<ClubsPage />} />
              <Route path="pais/:slug" element={<CountryPage />} />
              <Route path="selecoes" element={<NationsPage />} />
              <Route path="time/:slug" element={<TeamPage />} />
              <Route path="produto/:id" element={<ProductPage />} />
              <Route path="busca" element={<SearchPage />} />
              <Route path="carrinho" element={<CartPage />} />
              <Route path="*" element={<p className="empty">Página não encontrada.</p>} />
            </Route>
          </Routes>
        </BrowserRouter>
      </CartProvider>
    </CatalogProvider>
  </StrictMode>,
);
