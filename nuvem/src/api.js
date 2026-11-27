// Rotas /api/* do Mini App. Todas passam pela trava (trava.js > protegerApi)
// antes de chegar aqui: só o dono (MEU_ID), com initData válido.
//
// Para criar uma rota: escreva async function minhaRota({ env, user, url })
// que devolve um objeto, e ponha em ROTAS_API.

import { lerCatalogo } from './armazem.js';

export const ROTAS_API = {
  '/api/eu': apiEu,
};

// Esqueleto: confirma a trava e mostra a idade do catálogo no KV.
async function apiEu({ env, user }) {
  let catalogo = null;
  let erroCatalogo = null;
  try {
    const c = await lerCatalogo(env);
    catalogo = { em: c.em, n: c.n, origem: c.origem };
  } catch (e) {
    erroCatalogo = e.message;
  }
  return {
    usuario: { id: user.id, nome: user.first_name || '', username: user.username || '' },
    catalogo,
    erroCatalogo,
    agora: Date.now(),
  };
}
