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
};
