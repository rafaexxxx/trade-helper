// Configurações do Trade Helper.
// Mude os números aqui, faça o push e o iPhone baixa sozinho na próxima abertura.

module.exports = {
  // Variação mínima (%) para algo aparecer em "Mudanças relevantes"
  // e para queda de value/RAP virar alerta de risco.
  LIMITE_MUDANCA_PCT: 5,

  // Diferença mínima (%) entre RAP e value para virar alerta de risco.
  // Obs.: o RAP oscila bastante; se aparecer alerta demais, aumente (ex.: 15).
  LIMITE_RAP_VALUE_PCT: 5,

  // Por quantos minutos reaproveitar os dados já baixados (evita rate limit).
  CACHE_ROLIMONS_MIN: 5,
  CACHE_INVENTARIO_MIN: 1,

  // De quanto em quanto tempo o widget PEDE para atualizar (o iOS decide no fim).
  WIDGET_ATUALIZAR_MIN: 30,

  // Tentativas em caso de erro temporário (429 / 5xx / rede).
  TENTATIVAS: 3,

  // Histórico para a comparação de 24h: 1 retrato a cada X min, guardado por Y horas.
  HISTORICO_INTERVALO_MIN: 60,
  HISTORICO_HORAS: 48,

  // Por quantas horas reaproveitar o endereço das miniaturas.
  MINIATURAS_CACHE_HORAS: 24,

  // Quantos itens o widget grande lista.
  WIDGET_MAX_ITENS_GRANDE: 6,

  // ===== Avaliador de trade =====
  // "Value ajustado" = value (ou RAP, se não tiver value) x multiplicadores abaixo.
  // 1 = neutro; abaixo de 1 desconta, acima de 1 dá bônus.
  // Demanda: -1 sem dados, 0 terrível, 1 baixa, 2 normal, 3 alta, 4 incrível.
  PESO_DEMANDA: { '-1': 0.95, 0: 0.8, 1: 0.9, 2: 1.0, 3: 1.03, 4: 1.05 },
  // Tendência: -1 sem dados, 0 caindo, 1 instável, 2 estável, 3 subindo, 4 oscilando.
  PESO_TENDENCIA: { '-1': 1.0, 0: 0.95, 1: 0.98, 2: 1.0, 3: 1.03, 4: 0.98 },
  PESO_HYPED: 0.95,
  // Item sem value no Rolimon's: usa o RAP com este desconto.
  PESO_SEM_VALUE: 0.95,
  // Item projected sem value: o RAP está inflado; usa só esta fração dele.
  PESO_PROJECTED_SEM_VALUE: 0.5,

  // Diferença (%) do value ajustado considerada "justa" (amarelo).
  FAIXA_JUSTA_PCT: 3,
  // Alerta quando o RAP de um item recebido sobe mais que isto (%) em 24h.
  ALERTA_RAP_24H_PCT: 15,
  // Taxa do Roblox sobre Robux recebidos numa trade (quem recebe fica com 70%).
  TAXA_ROBUX: 0.3,
  // Limite de itens por lado (regra do Roblox).
  MAX_ITENS_POR_LADO: 4,
  // Quantos resultados a busca no catálogo mostra.
  BUSCA_MAX_RESULTADOS: 30,

  // Retrato do catálogo (RAP e value de todos os itens) para a variação de 24h
  // dos itens que você não tem: 1 arquivo a cada X min, guardado por Y horas.
  RETRATO_CATALOGO_INTERVALO_MIN: 60,
  RETRATO_CATALOGO_HORAS: 30,
};
