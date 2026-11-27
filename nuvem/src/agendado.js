// Tarefa agendada (cron do wrangler.toml, a cada 5 min, horário UTC).
// É a ÚNICA parte que busca o catálogo do Rolimon's no dia a dia:
// 1 consulta a cada 5 min, não importa quantas vezes o app for aberto.
// Na primeira rodada de cada hora também guarda o retrato da hora (24h).
//
// Plano grátis: 10 ms de CPU por rodada. Por isso aqui só se busca, confere e
// grava; nada de cálculo pesado (isso fica para quando o app abre).

import { URL_CATALOGO, buscarTexto, lerCatalogoTexto } from './rolimons.js';
import { gravarCatalogo } from './armazem.js';

export async function tarefaAgendada(controller, env) {
  if (!env.TH) {
    console.log('cron: KV "TH" não está ligado (confira o wrangler.toml)');
    return;
  }
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
