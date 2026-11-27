// Tarefas agendadas (crons do wrangler.toml, horário UTC).
//
// 1) A cada 5 min (minutos 0, 5, 10...): busca o catálogo do Rolimon's.
//    É a ÚNICA parte que busca o catálogo no dia a dia: 1 consulta a cada
//    5 min, não importa quantas vezes o app for aberto. Na primeira rodada de
//    cada hora também guarda o retrato da hora (24h).
// 2) Fase 1 (minutos 2, 7, 12...): CRON_LINHAS lê a página de UM item no
//    Rolimon's para as vendas/dia e o Best da Vitrine (linhas.js).
//
// Plano grátis: 10 ms de CPU por rodada. Por isso cada rodada faz uma coisa só:
// buscar, conferir e gravar. Nada de cálculo pesado.

import { URL_CATALOGO, buscarTexto, lerCatalogoTexto } from './rolimons.js';
import { gravarCatalogo } from './armazem.js';
import { CRON_LINHAS, tarefaLinhas } from './linhas.js';

export async function tarefaAgendada(controller, env) {
  if (!env.TH) {
    console.log('cron: KV "TH" não está ligado (confira o wrangler.toml)');
    return;
  }
  if (controller && controller.cron === CRON_LINHAS) return tarefaLinhas(env);

  const quando = controller && controller.scheduledTime ? controller.scheduledTime : Date.now();
  const retrato = new Date(quando).getUTCMinutes() < 5;

  const b = await buscarTexto(URL_CATALOGO);
  if (b.status !== 200) {
    console.log('cron: catálogo HTTP ' + b.status + ' (o KV fica com o anterior)');
    return;
  }
  let n = 0;
  try {
    n = lerCatalogoTexto(b.texto).n;
  } catch (e) {
    console.log('cron: catálogo inválido: ' + e.message + ' (o KV fica com o anterior)');
    return;
  }
  await gravarCatalogo(env, b.texto, n, Date.now(), retrato);
  console.log('cron: catálogo ok · ' + n + ' itens · ' + b.ms + ' ms' + (retrato ? ' · retrato da hora' : ''));
}
