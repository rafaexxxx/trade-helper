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
  // Conta 2 (v5.2): itens dela reaproveitados por X min (ela só é buscada ao
  // tocar no nome dela no alternador; cache maior = menos risco de bloqueio).
  CACHE_CONTA2_MIN: 10,

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

  // ===== Avaliador de trade e Anúncios =====
  // As contas usam o "value base": o value do Rolimon's; item sem value entra
  // pelo RAP. O RAP aparece só como informação (não muda o veredito).

  // O veredito depende da FORMA da trade, sempre do seu ponto de vista
  // (pela contagem de itens de cada lado).
  // Sidegrade (mesmo número de itens): diferença (%) do value considerada "justa".
  FAIXA_JUSTA_PCT: 3,
  // Sidegrade: a partir desta diferença (%) vira "Vale muito a pena" / "Não vale de jeito nenhum".
  VEREDITO_FORTE_PCT: 10,
  // Upgrade e downgrade: cada lista tem o mínimo (%) para
  // [Não vale a pena, Troca justa, Vale a pena, Vale muito a pena].
  // Abaixo do primeiro número: "Não vale de jeito nenhum".
  // Upgrade (você dá mais itens e recebe menos, porém maiores): pagar um pouco a mais é normal.
  VEREDITO_UPGRADE_PCT: [-20, -9, -7, -5],
  // Downgrade (você recebe mais itens, porém menores): o normal é receber a mais.
  VEREDITO_DOWNGRADE_PCT: [0, 5, 7, 12],
  // Diferença de demanda média entre os lados (escala 0 terrível .. 4 incrível):
  // a partir de MOTIVO vira uma frase no veredito; a partir de REBAIXA (contra você)
  // o veredito cai um nível.
  DEMANDA_DIF_MOTIVO: 0.75,
  DEMANDA_DIF_REBAIXA: 1.5,
  // Se você dá itens com demanda conhecida e mais que esta fração do value que
  // você recebe é de itens SEM dados de demanda: aviso e o veredito cai um nível.
  DEMANDA_SEM_DADOS_FRACAO: 0.5,
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

  // ===== Anúncios (Trade Ads do Rolimon's) =====
  // Busca nova no máximo a cada X min (evita bloqueio do Rolimon's).
  ANUNCIOS_CACHE_MIN: 3,
  // Anúncios já vistos ficam guardados no iPhone por X horas (a lista cresce
  // entre as consultas). Um anúncio guardado pode já ter sido fechado.
  ANUNCIOS_GUARDAR_HORAS: 2,
  ANUNCIOS_MAX_GUARDADOS: 3000,
  // Combinações sugeridas para anúncios que pedem só tags. A tag é do ponto de
  // vista do DONO do anúncio; os nomes abaixo são do SEU ponto de vista.
  // Dono pede "downgrade" = SEU UPGRADE (você dá mais itens): você paga de 0 até
  // MAX (%) a mais, e a sugestão mira ALVO (o menor overpay que ele deve aceitar).
  ANUNCIO_SEU_UPGRADE_PAGAR_MAX_PCT: 9,
  ANUNCIO_SEU_UPGRADE_PAGAR_ALVO_PCT: 5,
  // Dono pede "upgrade" = SEU DOWNGRADE (você recebe mais itens): ganho de MIN a
  // MAX (%), mirando ALVO (lucro sem pesar a mão).
  ANUNCIO_SEU_DOWNGRADE_MIN_PCT: 5,
  ANUNCIO_SEU_DOWNGRADE_MAX_PCT: 12,
  ANUNCIO_SEU_DOWNGRADE_ALVO_PCT: 9,
  // v6.6: forma da sugestão (regra do Rafael).
  // Seu downgrade: você dá 1 item só e pede uma PARTE da oferta dele, com pelo
  // menos MIN_MEDIOS itens médios e no máximo ADDS_MAX adds (até 4 itens).
  // Seu upgrade: você pede 1 item só dele e dá de 2 a 4 itens seus.
  // Add = item de value até ADD_MAX_VALUE (ovos e itens pequenos). O núcleo
  // (só os médios) já tem que ganhar pelo menos DOWNGRADE_MIN sem os adds.
  ANUNCIO_ADD_MAX_VALUE: 500,
  ANUNCIO_ADDS_MAX: 2,
  ANUNCIO_SEU_DOWNGRADE_MIN_MEDIOS: 2,
  // Tag "any" (sidegrade): v6.6, não gera sugestão (quase ninguém aceita).
  // v6.7: vendas por dia (Roblox resale-data). Item MÉDIO que você recebe numa
  // sugestão (value acima de ANUNCIO_ADD_MAX_VALUE e até VENDAS_ATE_VALUE) só
  // entra se vender pelo menos VENDAS_MIN_DIA por dia (média dos últimos
  // VENDAS_DIAS dias). Item sem o dado ainda fica de fora. Se a busca falhar
  // para todos os itens, a regra desliga sozinha (o Diagnóstico mostra).
  ANUNCIO_VENDAS_MIN_DIA: 1,
  ANUNCIO_VENDAS_ATE_VALUE: 10000,
  ANUNCIO_VENDAS_DIAS: 30,
  // O número de cada item fica guardado por X horas.
  ANUNCIO_VENDAS_CACHE_H: 24,
  // Consultas por abertura da aba (o resto fica para a próxima) e quantas de cada vez.
  ANUNCIO_VENDAS_MAX_BUSCAS: 40,
  ANUNCIO_VENDAS_PARALELAS: 5,
  // Quantos dos seus itens entram na busca de combinações (mais = mais lento).
  ANUNCIO_COMBINACAO_MAX_ITENS: 25,
  // Quantos cartões cada bloco da aba mostra.
  ANUNCIOS_MAX_NA_LISTA: 40,

  // ===== Notificações (v6.2) =====
  // Quando o widget atualiza, manda UMA notificação-resumo (só a conta principal):
  // anúncio novo "Vale muito a pena" para você e item seu que virou projected ou
  // ficou com demanda terrível. O mesmo aviso nunca se repete.
  NOTIFICACOES_LIGADAS: true,
  // Silêncio: das X h até as Y h nada é avisado (0 e 8 = da meia-noite às 8h).
  // Anúncios desse horário são descartados; alertas de risco esperam o silêncio
  // acabar. Dois números iguais = sem silêncio.
  SILENCIO_INICIO_H: 0,
  SILENCIO_FIM_H: 8,
  // Só avisa de anúncios criados há no máximo X min (os mais velhos já devem ter fechado).
  NOTIF_ANUNCIO_IDADE_MAX_MIN: 60,
  // Tempo máximo (segundos) da análise dentro do widget. Passou disso, os
  // anúncios que faltaram ficam para a próxima atualização.
  NOTIF_TEMPO_MAX_S: 8,
};
