// Dados de entrega: máscaras, validação e o endereço a partir do CEP.
import { ENTREGA_VAZIA, type Entrega } from './cart';

const digitos = (s: string) => s.replace(/\D/g, '');

export const mascaraCep = (s: string) => digitos(s).slice(0, 8).replace(/^(\d{5})(\d)/, '$1-$2');
export const mascaraCpf = (s: string) => digitos(s).slice(0, 11)
  .replace(/^(\d{3})(\d)/, '$1.$2').replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1-$2');
export const mascaraTelefone = (s: string) => {
  const d = digitos(s).slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};

/** CPF com os dois dígitos verificadores corretos. */
export function cpfValido(s: string) {
  const d = digitos(s);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  for (const n of [9, 10]) {
    let soma = 0;
    for (let i = 0; i < n; i++) soma += +d[i] * (n + 1 - i);
    if (((soma * 10) % 11) % 10 !== +d[n]) return false;
  }
  return true;
}

/** Mensagem de erro de cada campo; campo certo não aparece. */
export function validarEntrega(e: Entrega) {
  const erros: Partial<Record<keyof Entrega, string>> = {};
  const brasil = /^brasil$/i.test(e.pais.trim());
  if (e.nome.trim().split(/\s+/).length < 2) erros.nome = 'Informe o nome completo (nome e sobrenome).';
  if (!/\d/.test(e.rua) || e.rua.trim().length < 5) erros.rua = 'Informe a rua com o número.';
  if (brasil ? digitos(e.cep).length !== 8 : e.cep.trim().length < 3) erros.cep = 'CEP com 8 dígitos.';
  if (!e.bairro.trim()) erros.bairro = 'Informe o bairro.';
  if (!e.cidade.trim()) erros.cidade = 'Informe a cidade.';
  if (!e.estado.trim()) erros.estado = 'Informe o estado.';
  if (!e.pais.trim()) erros.pais = 'Informe o país.';
  if (!cpfValido(e.cpf)) erros.cpf = 'CPF inválido. Confira os números.';
  if (digitos(e.contato).length < 10) erros.contato = 'Telefone com DDD.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e.email.trim())) erros.email = 'E-mail inválido.';
  return erros;
}

/** Endereço pelo CEP (ViaCEP). null = CEP não encontrado ou sem internet. */
export async function buscarCep(cep: string) {
  const d = digitos(cep);
  if (d.length !== 8) return null;
  try {
    const r = await fetch(`https://viacep.com.br/ws/${d}/json/`, { signal: AbortSignal.timeout(6000) });
    const j = await r.json();
    if (!r.ok || j.erro) return null;
    return { rua: j.logradouro as string, bairro: j.bairro as string, cidade: j.localidade as string, estado: j.uf as string };
  } catch {
    return null;
  }
}

// O cliente que volta não precisa digitar tudo de novo. O CPF fica de fora:
// não guardamos documento no navegador.
const KEY = 'arkad-entrega';
export function carregarEntrega(): Entrega {
  try {
    const salvo = JSON.parse(localStorage.getItem(KEY) ?? '{}');
    return { ...ENTREGA_VAZIA, ...salvo, cpf: '' };
  } catch {
    return { ...ENTREGA_VAZIA };
  }
}
export function salvarEntrega(e: Entrega) {
  try { localStorage.setItem(KEY, JSON.stringify({ ...e, cpf: undefined })); } catch { /* sem armazenamento */ }
}
