// Tela de Ajuda (v5.4): guia para quem é novo em trade.
// Abre por cima do painel pelo Mais > Ajuda (v7.0; antes, menu ⋯) e pelos links "Ver na Ajuda" das
// abas (qualquer elemento com data-ajuda="<tópico>" abre direto no tópico).
// Os exemplos usam os componentes do próprio painel (linha de item, veredito,
// cartão de anúncio) e seguem o tema escolhido. Os números dos exemplos são
// fixos e inventados; os vereditos deles são calculados com as réguas do config.js.
// As miniaturas reais vêm pela ponte de miniaturas do avaliador (quando existe);
// sem ela, ficam as iniciais do item.
const a = require('analise');
const temas = require('temas');

// Itens de exemplo (nomes reais do catálogo; valores inventados).
const IT = {
  dc: { nome: 'Domino Crown', ini: 'DC' },
  vh: { nome: 'Valkyrie Helm', ini: 'VH' },
  sf: { nome: 'Sparkle Time Fedora', ini: 'SF' },
  ch: { nome: "Clockwork's Headphones", ini: 'CH' },
  bh: { nome: 'Bighead', ini: 'BH' },
};

const NIVEIS = [
  ['Não vale de jeito nenhum', 'nenhum'],
  ['Não vale a pena', 'neg'],
  ['Troca justa', 'justa'],
  ['Vale a pena', 'pos'],
  ['Vale muito a pena', 'muito'],
];

function esc(s) {
  const mapa = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => mapa[c]);
}

// Nível (0..4) de uma % numa régua [Não vale, Justa, Vale, Vale muito].
function nivel(p, r) {
  return p >= r[3] ? 4 : p >= r[2] ? 3 : p >= r[1] ? 2 : p >= r[0] ? 1 : 0;
}

// "5%", "3,5%" (sem ",0" no fim).
function pct(x) {
  return String(Math.round(Math.abs(x) * 10) / 10).replace('.', ',') + '%';
}
// "+5%", "−3,5%", "0%".
function pctS(x) {
  const r = Math.round(x * 10) / 10;
  return (r > 0 ? '+' : r < 0 ? '−' : '') + pct(r);
}
function num(n) {
  return a.fmtNum(n).replace('-', '−');
}

// Miniatura de exemplo: iniciais; o script troca pela imagem real quando consegue.
function mini(k) {
  return '<span class="thumb aj-mini" data-item="' + esc(IT[k].nome) + '">' + IT[k].ini + '</span>';
}

// Linha de item (igual à do Inventário/Avaliar). v = value (null = sem value), r = RAP.
function linha(k, det, v, r, extra) {
  return (
    '<div class="item">' + mini(k) +
    '<div class="item-txt"><span class="nome">' + esc(IT[k].nome) + '</span>' +
    (det ? '<span class="det">' + det + '</span>' : '') + '</div>' +
    '<div class="item-num"><span class="v">' + (extra && extra.v ? extra.v : '') + num(v) + '</span>' +
    (r != null ? '<span class="r">' + (extra && extra.r ? extra.r : '') + '<small>RAP</small>' + num(r) + '</span>' : '') +
    '</div></div>'
  );
}

// Faixa colorida de uma régua.
function regua(titulo, sub, rotulos) {
  const cores = ['nenhum', 'neg', 'justa', 'pos', 'muito'];
  const nomes = ['Nenhum', 'Não vale', 'Justa', 'Vale', 'Vale muito'];
  return (
    '<div class="aj-regua"><div class="aj-regua-t"><b>' + titulo + '</b><small>' + sub + '</small></div><div class="aj-faixas">' +
    cores.map((c, k) => '<div class="aj-fx" data-cor="' + c + '"><i></i><span>' + nomes[k] + '</span><em>' + rotulos[k] + '</em></div>').join('') +
    '</div></div>'
  );
}

// Botão interno que leva a outro tópico da própria Ajuda.
function ir(topico, texto) {
  return '<button type="button" class="aj-ir" data-ajuda="' + topico + '">' + texto + '</button>';
}
function subir() {
  return '<button type="button" class="aj-subir" data-ajuda="indice">↑ Índice</button>';
}

function capitulo1(cfg) {
  const taxa = Math.round(cfg.TAXA_ROBUX * 100);
  const fica = Math.floor(1000 * (1 - cfg.TAXA_ROBUX));
  return `<section class="aj-cap" id="aj-cap1">
  <div class="aj-cab"><span class="aj-eb">Capítulo 1</span><h2>O básico</h2></div>

  <h3>O que é um Limited</h3>
  <p>É um item do catálogo do Roblox que parou de ser vendido na loja. Como as cópias são limitadas, quem tem uma pode trocar com outros jogadores (a <b>trade</b>) ou vender. Alguns têm um <b>serial</b>: o número da cópia, como #318.</p>
  <p>Cada Limited tem dois números que você vai ver o tempo todo no app: o <b>value</b> e o <b>RAP</b>.</p>

  <span class="aj-exemplo">Exemplo · uma linha do Inventário</span>
  <div class="grupo aj-grupo">${linha('dc', '<span><span class="pos">Alta</span> · Estável · #318</span>', 45000, 41230, {
    v: '<span class="aj-bal">1</span> ',
    r: '<span class="aj-bal">2</span> ',
  })}</div>
  <ul class="aj-leg">
    <li><span class="aj-bal">1</span><span><b>Value</b>: quanto a comunidade diz que o item vale, publicado pelo Rolimon's. É o número que conta numa troca.</span></li>
    <li><span class="aj-bal">2</span><span><b>RAP</b> (preço médio recente): a média das últimas vendas, calculada pelo Roblox. Chega atrasado e dá para manipular.</span></li>
  </ul>

  <h3>Por que o app confia no value</h3>
  <p>O RAP só muda quando alguém compra o item, e um grupo pode vender caro entre si para inflar o número. O value é revisado por quem acompanha o mercado. Por isso o app faz todas as contas pelo value, e o RAP aparece só como informação.</p>
  <div class="aj-dica"><b>Value base.</b> Alguns itens ainda não têm value. Nesse caso o app usa o RAP no lugar e escreve "RAP" ao lado do número, para você saber que é uma conta menos segura.</div>

  <span class="aj-exemplo">Exemplo · item sem value no Avaliar trade</span>
  <div class="grupo aj-grupo"><div class="item"><span class="thumb aj-mini">?</span><div class="item-txt"><span class="nome">Item recém-lançado</span></div><div class="item-num"><span class="v">8.900<small class="tag sub">RAP</small></span><span class="r"><small>RAP</small>8.900</span></div></div></div>

  <h3 id="aj-robux">Robux numa trade</h3>
  <p>Dá para colocar Robux junto dos itens. Só que o Roblox fica com <b>${taxa}%</b> de quem recebe. O app já desconta isso nas contas.</p>
  <div class="aj-robux">
    <div><b>1.000</b><small>Robux oferecidos</small></div>
    <div class="aj-tx">− ${taxa}%</div>
    <div><b class="pos">${num(fica)}</b><small>o que conta para você</small></div>
  </div>
  <p class="aj-legenda">Se você dá Robux, conta o valor cheio. Se recebe, conta ${100 - taxa}%.</p>

  <h3 id="aj-regras">Quem pode trocar, e o quê</h3>
  <ul class="aj-lista">
    <li><b>Roblox Plus:</b> desde 2026, os <b>dois</b> jogadores precisam de Roblox Plus (ou do Premium antigo) e da verificação de idade para fazer trade.</li>
    <li><b>Só itens feitos pelo Roblox:</b> Limited e Limited U criados pelo próprio Roblox entram na trade. Os <b>UGC</b> (feitos por criadores da comunidade) só podem ser <b>revendidos</b> no Marketplace, não trocados.</li>
    <li><b>Até ${cfg.MAX_ITENS_POR_LADO} itens por lado</b>, mais Robux (no máximo metade do valor dos itens oferecidos).</li>
    <li><b>Hold:</b> o item que você recebe numa <b>trade</b> fica travado por <b>2 dias</b>; um item que você <b>compra no catálogo do Roblox</b> fica travado por <b>7 dias</b>.</li>
    <li><b>Validade:</b> uma proposta enviada expira em cerca de 4 dias se ninguém responder.</li>
  </ul>
  <div class="aj-dica"><b>Filtro de qualidade.</b> Nas configurações do Roblox (Privacidade → Trading) dá para esconder automaticamente as propostas muito desiguais. Lowball "quase justo" ainda passa, então confira sempre.</div>
  <p class="aj-legenda">Essas regras mudam de tempos em tempos. Na dúvida, confira na ajuda oficial do Roblox.</p>
  ${subir()}
</section>`;
}

function capitulo2(cfg) {
  const ru = cfg.VEREDITO_UPGRADE_PCT;
  const rd = cfg.VEREDITO_DOWNGRADE_PCT;
  // v6.16: a sugestão dos Anúncios vem em degraus (abertura + teto/mínimo).
  // Padrões se o config.js for antigo.
  const def = (v, p) => (v != null ? v : p);
  const upAb = def(cfg.ANUNCIO_SEU_UPGRADE_ABERTURA_PCT, 2);
  const upTeto = def(cfg.ANUNCIO_SEU_UPGRADE_TETO_PCT, 9);
  const downAb = def(cfg.ANUNCIO_SEU_DOWNGRADE_ABERTURA_PCT, 14);
  const downMin = def(cfg.ANUNCIO_SEU_DOWNGRADE_MIN_PCT, 7);
  // A escadinha usa o meio de cada faixa (entre a abertura e o limite).
  const upAlvo = (upAb + upTeto) / 2;
  const downAlvo = (downAb + downMin) / 2;
  const max = cfg.MAX_ITENS_POR_LADO;
  // v6.6: forma da sugestão dos Anúncios (padrões se o config.js for antigo).
  const addMax = cfg.ANUNCIO_ADD_MAX_VALUE != null ? cfg.ANUNCIO_ADD_MAX_VALUE : 500;
  const addsMax = cfg.ANUNCIO_ADDS_MAX != null ? cfg.ANUNCIO_ADDS_MAX : 2;
  const minMedios = cfg.ANUNCIO_SEU_DOWNGRADE_MIN_MEDIOS != null ? cfg.ANUNCIO_SEU_DOWNGRADE_MIN_MEDIOS : 2;

  // Escadinha: alterna upgrade pagando upAlvo% e downgrade ganhando downAlvo%.
  const r10 = (n) => Math.round(n / 10) * 10;
  const e0 = 5000;
  const e1 = r10(e0 * (1 - upAlvo / 100));
  const e2 = r10(e1 * (1 + downAlvo / 100));
  const e3 = r10(e2 * (1 - upAlvo / 100));
  const e4 = r10(e3 * (1 + downAlvo / 100));
  const volta = ((1 - upAlvo / 100) * (1 + downAlvo / 100) - 1) * 100;

  // Exemplo de upgrade: dou 28.500 (3 itens), recebo 27.500 (1 item).
  const pUp = ((27500 - 28500) / 28500) * 100;
  const vUp = NIVEIS[nivel(pUp, ru)];
  const nUp = nivel(pUp, ru);
  const wflUp = nUp >= 3 ? 'W' : nUp === 2 ? 'F' : 'L';
  // Exemplo de downgrade: dou 4.700, recebo 5.200.
  const pDown = ((5200 - 4700) / 4700) * 100;
  const vDown = NIVEIS[nivel(pDown, rd)];
  const vDown3 = NIVEIS[nivel(3, rd)];

  const linhaDou = (k, dem, v) =>
    '<div class="item">' + mini(k) + '<div class="item-txt"><span class="nome">' + esc(IT[k].nome) + '</span><span class="det">' + dem +
    '</span></div><div class="item-num"><span class="v">' + num(v) + '</span></div></div>';
  const anItem = (k, dem, v) =>
    '<div class="an-i">' + mini(k) + '<span class="item-txt"><span class="nome">' + esc(IT[k].nome) + '</span><span class="det">' + dem +
    '</span></span><span class="an-val">' + num(v) + '<small>value</small></span></div>';
  const alta = '<span class="pos">Alta</span>';
  const normal = '<span>Normal</span>';

  return `<section class="aj-cap" id="aj-cap2">
  <div class="aj-cab"><span class="aj-eb">Capítulo 2</span><h2>Upgrade, downgrade e quanto pagar a mais</h2></div>

  <h3>A forma da trade</h3>
  <p>Upgrade e downgrade dizem <b>quantos itens vão para cada lado</b>, sempre do seu ponto de vista. Não dizem se você ganha ou perde. Esse é o erro mais comum de quem está começando.</p>
  <div class="aj-formas">
    <div class="aj-forma">
      <div class="aj-nomef"><b>Upgrade</b><small>dá vários, recebe 1 maior</small></div>
      <div class="aj-pilhas"><span class="aj-pilha dou"><i class="aj-q p"></i><i class="aj-q p"></i><i class="aj-q m"></i></span><span class="aj-sf">→</span><span class="aj-pilha rec"><i class="aj-q g"></i></span></div>
      <div class="aj-quem neg">Você paga um pouco a mais</div>
    </div>
    <div class="aj-forma">
      <div class="aj-nomef"><b>Downgrade</b><small>dá 1 grande, recebe vários</small></div>
      <div class="aj-pilhas"><span class="aj-pilha dou"><i class="aj-q g"></i></span><span class="aj-sf">→</span><span class="aj-pilha rec"><i class="aj-q p"></i><i class="aj-q m"></i><i class="aj-q p"></i></span></div>
      <div class="aj-quem pos">O outro te paga a mais</div>
    </div>
  </div>
  <p class="aj-legenda">Com o mesmo número de itens dos dois lados (sidegrade), o normal é ficar perto de 1 por 1. Cada lado pode ter até ${max} itens.</p>

  <h3>Por que quem sobe paga a mais</h3>
  <p>Um item grande costuma ser mais procurado e mais fácil de revender do que vários pequenos. Por isso quem junta itens para levar um maior costuma pagar um extra, o <b>overpay</b> (OP). Quem abre mão do item grande espera receber esse extra.</p>

  <h3 id="aj-escada">A escadinha: como o inventário cresce</h3>
  <p>É assim que se evolui fazendo trade: você alterna os dois tipos de troca, e cada volta deixa um pouco a mais para você.</p>
  <ol class="aj-escada">
    <li style="--d:0"><span class="aj-pas">Início</span><b>${num(e0)}</b><small>em 3 itens pequenos</small></li>
    <li style="--d:1" class="up"><span class="aj-pas">Upgrade · paga pouco OP</span><b>${num(e1)}</b><small>1 item grande (pagou ${pct(upAlvo)} a mais)</small></li>
    <li style="--d:2" class="down"><span class="aj-pas">Downgrade · pede bastante OP</span><b>${num(e2)}</b><small>em vários itens (recebeu ${pct(downAlvo)} a mais)</small></li>
    <li style="--d:3" class="up"><span class="aj-pas">Upgrade de novo</span><b>${num(e3)}</b><small>1 item ainda maior</small></li>
    <li style="--d:4" class="down"><span class="aj-pas">Downgrade de novo</span><b>${num(e4)}</b><small>e assim vai</small></li>
  </ol>
  <p>Cada volta (upgrade + downgrade) rende perto de ${pct(volta)} nesse exemplo. Parece pouco, mas soma com o tempo. Dois cuidados:</p>
  <ul class="aj-lista">
    <li><b>No upgrade, pague o menor OP que a pessoa ainda aceita.</b> E só suba para um item com demanda boa: é ele que você vai precisar revender com lucro depois.</li>
    <li><b>No downgrade, peça mais do que pagaria num upgrade,</b> mas sem pesar a mão. Proposta gananciosa demais ninguém aceita.</li>
  </ul>
  <div class="aj-dica"><b>Não é garantido.</b> A escadinha só funciona se alguém aceitar as suas propostas e se os itens não perderem valor no meio do caminho. Por isso a demanda importa tanto. ${ir('aj-calma', 'Ver o capítulo 3')}</div>

  <h3 id="aj-regua">As réguas do veredito</h3>
  <p>Por isso o app não usa uma régua só. A porcentagem é a diferença de value entre o que você recebe e o que você dá.</p>
  ${regua('Upgrade', 'você dá mais itens', [
    'abaixo de ' + pctS(ru[0]),
    pctS(ru[0]) + ' a ' + pctS(ru[1]),
    pctS(ru[1]) + ' a ' + pctS(ru[2]),
    pctS(ru[2]) + ' a ' + pctS(ru[3]),
    pctS(ru[3]) + ' ou melhor',
  ])}
  ${regua('Downgrade', 'você recebe mais itens', [
    'abaixo de ' + pctS(rd[0]),
    pctS(rd[0]) + ' a ' + pctS(rd[1]),
    pctS(rd[1]) + ' a ' + pctS(rd[2]),
    pctS(rd[2]) + ' a ' + pctS(rd[3]),
    'acima de ' + pctS(rd[3]),
  ])}
  <p>Repare: no upgrade, pagar 3% a mais é ótimo. No downgrade, ganhar só 3% fica em "${vDown3[0]}". Com o mesmo número de itens dos dois lados, o app considera justo até ${pct(cfg.FAIXA_JUSTA_PCT)} para cada lado.</p>

  <h3>Exemplo de upgrade</h3>
  <p>Você junta três itens (28.500 no total) para levar um Valkyrie Helm de 27.500. Você paga 1.000 a mais, ou ${pct(pUp)}. Num upgrade, o app diz "${vUp[0]}".</p>
  <span class="aj-exemplo">Exemplo · aba Avaliar trade (valores inventados)</span>
  <div class="aj-prop">
    <div class="aj-lado dou">
      <div class="aj-lado-topo"><h4>Dou</h4><span>3/${max}</span></div>
      <div class="grupo aj-grupo">${linhaDou('sf', alta, 12000)}${linhaDou('ch', normal, 9500)}${linhaDou('bh', normal, 7000)}</div>
      <div class="aj-tot"><span class="aj-tot-r">Total<small>value base</small></span><span class="aj-tot-v">28.500</span></div>
    </div>
    <div class="troca"><span>⇅</span></div>
    <div class="aj-lado rec">
      <div class="aj-lado-topo"><h4>Recebo</h4><span>1/${max}</span></div>
      <div class="grupo aj-grupo">${linhaDou('vh', alta + ' · <span class="pos">Subindo</span>', 27500)}</div>
      <div class="aj-tot"><span class="aj-tot-r">Total<small>value base</small></span><span class="aj-tot-v">27.500</span></div>
    </div>
  </div>
  <div class="veredito aj-veredito" data-cor="${vUp[1]}">
    <span class="selo">${vUp[0]} · ${wflUp}</span>
    <div class="ver-pct">${pctS(pUp)}</div>
    <div class="ver-sub">em value · −1.000</div>
    <ul class="motivos">
      <li>Você paga cerca de ${pct(pUp)} a mais em value (−1.000).</li>
      <li>É um upgrade (você dá mais itens e recebe menos, porém maiores): pagar um pouco a mais é normal. Pagar até ${pct(ru[3])} a mais é ótimo, até ${pct(ru[2])} ainda vale a pena, e acima de ${pct(ru[1])} não vale.</li>
      <li>O que você recebe tem demanda maior que o que você dá: fica mais fácil revender.</li>
    </ul>
  </div>
  <p class="aj-legenda">A pílula diz o veredito e a gíria dos traders (W ganhou, F justa, L perdeu); o número grande é a diferença de value; embaixo vêm os motivos.</p>

  <h3>Exemplo de downgrade</h3>
  <p>O caminho contrário: você dá um item de 4.700 e recebe três menores que somam 5.200. Você ganha ${pct(pDown)}, e o app diz "${vDown[0]}". Se ganhasse só 3%, diria "${vDown3[0]}": ficar com vários itens pequenos dá trabalho para girar, então pouco extra não compensa.</p>

  <h3 id="aj-tags">Anúncios: a tag é do outro jogador</h3>
  <p>No Rolimon's, quem cria o anúncio (Trade Ad) marca o que <b>ele</b> quer. Então a tag é o contrário do que a trade é para você:</p>
  <div class="aj-persp">
    <div class="aj-bx"><small>O anúncio pede</small><b>downgrade</b><span>Ele dá 1 item grande e quer vários</span></div>
    <div class="aj-meio">→</div>
    <div class="aj-bx"><small>Para você é</small><b class="neg">seu upgrade</b><span>Você paga um pouco a mais</span></div>
  </div>
  <div class="aj-persp">
    <div class="aj-bx"><small>O anúncio pede</small><b>upgrade</b><span>Ele dá vários e quer 1 grande</span></div>
    <div class="aj-meio">→</div>
    <div class="aj-bx"><small>Para você é</small><b class="pos">seu downgrade</b><span>Você recebe a mais</span></div>
  </div>
  <p>Por isso a etiqueta das linhas na aba Anúncios já vem traduzida: "seu upgrade", "seu downgrade" ou "sidegrade". Quando o anúncio só pede uma tag, o app monta uma sugestão (o lado Dou fica tracejado) no formato que costuma ser aceito, e pode pedir <b>só uma parte</b> do que ele oferece:</p>
  <ul class="aj-lista">
    <li><b>Seu downgrade</b> (tag upgrade): você dá <b>1 item só</b> e pede pelo menos ${minMedios} itens médios dele.</li>
    <li><b>Seu upgrade</b> (tag downgrade): você dá vários itens (de 2 a ${max}) por <b>1 item só</b> dele.</li>
    <li><b>Em degraus</b>, como fazem os traders experientes: comece pela pior oferta que ainda não faz o outro te ignorar e vá cedendo. A <b>abertura</b> é a primeira oferta que você manda: no seu upgrade, paga perto de ${pct(upAb)} a mais; no seu downgrade, pede perto de ${pct(downAb)} a mais. Se ele recusar, o 2º degrau é o seu limite: o <b>teto</b> do upgrade (até ${pct(upTeto)} a mais) ou o <b>mínimo</b> do downgrade (pelo menos ${pct(downMin)}). Cada degrau traz a própria combinação de itens.</li>
    <li>Na linha fechada aparece a faixa (por exemplo, "-2 a -8%") com o veredito do 2º degrau, o pior caso para você. "Maior ganho" também ordena por ele. Quando só uma combinação cabe na faixa, o cartão mostra essa oferta e, no 2º degrau, o limite em número: quanto você dá no máximo (upgrade) ou aceita receber no mínimo (downgrade) numa contraproposta.</li>
    <li><b>Adds</b>: itens de até ${num(addMax)} de value (ovos e itens pequenos). No seu downgrade entram no máximo ${addsMax}, e só como complemento: os itens médios sozinhos já têm que fechar a conta.</li>
    <li><b>Tag any</b> (sidegrade): o app não sugere, porque quase ninguém aceita. Um anúncio que só tem essa tag fica de fora.</li>
    <li>A sugestão nunca põe o mesmo item dos dois lados.</li>
  </ul>
  <span class="aj-exemplo">Exemplo · o mesmo upgrade, num anúncio aberto</span>
  <div class="an-grupo aj-grupo">
    <div class="an-it aberto">
      <div class="an-linha">
        <span class="an-main">
          <span class="an-l1"><b>jogador_exemplo</b><span class="an-etq">seu upgrade</span><span class="an-tempo">há 12 min</span></span>
          <span class="an-l2"><span class="an-grp rec">${mini('vh')}</span><span class="an-tr">⇄</span><span class="an-grp dou sug">${mini('sf')}${mini('ch')}${mini('bh')}</span></span>
        </span>
        <span class="an-pct" data-cor="${vUp[1]}"><b>${pctS(pUp)}</b><small>${vUp[0]}</small></span>
        <span class="an-chev">›</span>
      </div>
      <div class="an-det">
        <p class="an-nota">Ele quer downgrade, então para você é upgrade: você dá vários itens seus e pede o item dele. Só uma combinação sua cabe na faixa.</p>
        <div class="an-lado rec"><div class="an-lcab"><span>Recebo</span><span>Valor</span></div>${anItem('vh', alta, 27500)}<div class="an-tot"><span>Total</span><span class="an-val">27.500<small></small></span></div></div>
        <div class="an-lado dou"><div class="an-lcab"><span>Dou (oferta)</span><span>Valor</span></div>${anItem('sf', alta, 12000)}${anItem('ch', normal, 9500)}${anItem('bh', normal, 7000)}<div class="an-tot"><span>Total</span><span class="an-val">28.500<small></small></span></div></div>
        <div class="dg-pe"><div class="dg-caixa" data-cor="${vUp[1]}"><span class="rot">1 · Oferta</span><b>${pctS(pUp)}</b><small>−1.000 R$</small><span class="selo">${vUp[0]} · ${wflUp}</span></div><div class="dg-caixa" data-cor="justa"><span class="rot">2 · Teto</span><b>${pctS(-upTeto)}</b><small>dê no máximo ${num(Math.floor(27500 / (1 - upTeto / 100)))} de value</small></div></div>
        <p class="dg-dica">Mande a 1. Se ele fizer contraproposta, ceda só até o teto da 2.</p>
      </div>
    </div>
  </div>
  <p class="aj-legenda">Na lista, toque na linha para abrir o cartão; toque num item para ver no Rolimon's.</p>

  <h3 id="aj-plano">Aba Plano: o seu próximo degrau</h3>
  <p>A aba <b>Plano</b> olha para os seus itens fora de hold e diz o que fazer para subir na escadinha. Ela funciona mesmo sem anúncio: cada passo vem com a faixa em números e com itens do catálogo para mirar.</p>
  <ul class="aj-lista">
    <li><b>Próximo degrau:</b> o passo recomendado vem primeiro. Com 1 item, <b>Descer</b> (1 item por 2 ou 3 médios). Com 2, <b>Subir</b> (juntar os dois em 1). Com 3 ou mais, <b>downgrade em um e upgrade no resto</b>: trocar um item por 2 médios e juntar os outros (de 2 a ${max}) num item só, sem repetir item nas duas trades.</li>
    <li><b>Serve agora:</b> o melhor anúncio do momento para aquele passo, com os mesmos degraus das sugestões. Toque para abrir o cartão completo. Sem anúncio, o passo fica como <b>meta</b>: quanto pedir ou que faixa de value procurar.</li>
    <li><b>Alvos no catálogo:</b> até 4 itens do Rolimon's na faixa do passo, com value, demanda Normal ou melhor, sem projected, sem tendência caindo e sem o RAP disparando. Toque para abrir a tela do item. Confira se dá para trocar antes de mirar.</li>
    <li><b>Escadinha:</b> quanto o seu inventário pode virar em 4 voltas (1 upgrade + 1 downgrade cada) em três cenários: otimista (abrindo pela abertura), provável (o meio) e pessimista (cedendo até o limite). No pessimista você perde um pouco a cada volta: por isso vale negociar.</li>
  </ul>
  ${subir()}
</section>`;
}

function capitulo3(cfg) {
  const ru = cfg.VEREDITO_UPGRADE_PCT;
  return `<section class="aj-cap" id="aj-cap3">
  <div class="aj-cab"><span class="aj-eb">Capítulo 3</span><h2>Demanda e armadilhas</h2></div>

  <h3 id="aj-calma">Sem pressa: confira antes de aceitar</h3>
  <p>A pior trade é a aceita na correria. Uma proposta pode parecer ótima no número e esconder um item que ninguém quer. Antes de aceitar, olhe com calma o item que você vai <b>receber</b>:</p>
  <ol class="aj-check">
    <li><b>Demanda.</b> Aparece embaixo do nome do item. Baixa ou Terrível: cuidado, vai ser difícil passar para a frente.</li>
    <li><b>Quantas vendas ele tem.</b> Toque no item e abra "Ver no Rolimon's": veja quantas vezes ele foi vendido nos últimos dias. Item que quase não vende fica parado no seu inventário.</li>
    <li><b>Tendência e setas.</b> Caindo, ou ▼ grande em 24h? O value pode cair logo depois da troca.</li>
    <li><b>Etiquetas de alerta.</b> Projected e hyped são armadilhas comuns (explicadas abaixo).</li>
    <li><b>O veredito do app.</b> Se aparecer "Cuidado", leia o motivo antes de tudo.</li>
  </ol>
  <div class="aj-dica"><b>Na dúvida, não aceite.</b> Sempre aparece outra trade. Um item ruim, depois de aceito, não volta.</div>

  <h3>Demanda</h3>
  <p>O value diz quanto o item vale; a <b>demanda</b> diz se alguém vai querer. Dois itens de mesmo value podem girar de jeitos muito diferentes.</p>
  <div class="aj-escala"><span class="neg">Terrível</span><span class="warn">Baixa</span><span>Normal</span><span class="pos">Alta</span><span class="pos">Incrível</span></div>
  <ul class="aj-lista">
    <li><b>Alta ou Incrível:</b> vende rápido pelo value cheio. Às vezes vale pagar um pouco a mais para conseguir.</li>
    <li><b>Baixa ou Terrível:</b> pode ficar parado. Pegar um item assim pelo value "justo" pode ser uma perda escondida.</li>
    <li><b>Value alto com demanda baixa é armadilha:</b> o número impressiona, mas o item não gira.</li>
  </ul>
  <p>O app compara a demanda dos dois lados. Se o que você recebe tem demanda bem menor do que o que você dá, o veredito cai um nível. Se a maior parte do que você recebe não tem dados de demanda, também cai.</p>

  <h3>Tendência</h3>
  <p>Mostra para onde o preço anda: <span class="pos">Subindo</span>, Estável, <span class="warn">Instável</span>, <span class="warn">Oscila</span> ou <span class="neg">Caindo</span>. Prefira receber itens subindo ou estáveis; itens caindo são melhores de dar. Não pague OP de upgrade num item grande que está caindo.</p>

  <h3 id="aj-armadilhas">As armadilhas</h3>
  <span class="aj-exemplo">Exemplo · etiqueta de alerta no Inventário</span>
  <div class="grupo aj-grupo"><div class="item"><span class="thumb aj-mini">?</span><div class="item-txt"><span class="nome">Item de exemplo</span><span class="det"><span class="tags"><span class="tag neg">Projected</span></span><span><span class="warn">Baixa</span> · <span class="neg">Caindo</span></span></span></div><div class="item-num"><span class="v">3.100</span><span class="r"><small class="seta pos">▲ 22,0%</small><small>RAP</small>5.800</span></div></div></div>
  <p class="aj-legenda">A pílula só aparece para o que não está em outro lugar da linha: Projected (vermelho) e RAP longe do value (cinza). Demanda e tendência ruins ficam coloridas embaixo do nome, e a seta mostra quanto o preço mudou em 24h. Toque no item para ver tudo.</p>
  <dl class="aj-armas">
    <div><dt><span class="tag neg">Projected</span></dt><dd>O RAP foi inflado de propósito (gente vendendo caro entre si). Nunca aceite pelo RAP. Anúncios que oferecem item projected nem aparecem.</dd></div>
    <div><dt><span class="tag warn">Hyped</span></dt><dd>Subida passageira por moda. O preço pode cair quando a moda passar.</dd></div>
    <div><dt><span class="tag neg">RAP disparando</span></dt><dd>RAP subindo mais de ${pct(cfg.ALERTA_RAP_24H_PCT)} em 24h pode ser manipulação. No Avaliar, vira "Cuidado".</dd></div>
    <div><dt><span class="tag warn">Hold</span></dt><dd>Item recém-chegado fica travado e não pode ser trocado: 2 dias depois de uma trade, 7 dias depois de comprar no catálogo do Roblox. Seus itens em hold não entram nas sugestões dos Anúncios.</dd></div>
    <div><dt><span class="tag sub">Sem value</span></dt><dd>O app usa o RAP no lugar, que é uma conta menos segura. No Inventário e no widget o value aparece como "—"; no Avaliar, o número ganha o selo "RAP".</dd></div>
    <div><dt><span class="tag sub">Rare</span></dt><dd>Para o Rolimon's, item com até 100 cópias existentes. Raridade sozinha não garante valor: sem procura, um item raro também fica parado.</dd></div>
  </dl>

  <h3 id="aj-projected">Como reconhecer um projected</h3>
  <ul class="aj-lista">
    <li>O preço ficou parado por meses e de repente deu um <b>salto</b> em poucos dias, com poucas vendas grandes.</li>
    <li>Depois do salto, quase ninguém vende perto do preço novo.</li>
    <li>O value fica muito abaixo do RAP, e a demanda é baixa.</li>
    <li>As vendas vêm sempre das mesmas poucas contas.</li>
  </ul>
  <p class="aj-legenda">Um salto sozinho não prova nada: eventos e moda também sobem o preço. O app usa a marcação de projected do Rolimon's.</p>

  <h3 id="aj-liquidez">O que gira e o que trava</h3>
  <p>O que diz se um item sai rápido é o <b>volume de vendas</b>, não o tamanho do número. No mercado de Limiteds, poucos itens concentram a maior parte das vendas.</p>
  <ul class="aj-lista">
    <li><b>Gira:</b> itens com demanda Alta ou Incrível e várias vendas por semana. Esses você troca de novo sem perder.</li>
    <li><b>Trava:</b> value ou RAP alto com demanda baixa, item raro que ninguém procura, e item que acabou de virar limited (o preço ainda está se formando e é fácil de manipular).</li>
    <li><b>Hoard:</b> quando uma pessoa junta muitas cópias de um item para subir o preço. Se ela soltar tudo de uma vez, o preço despenca.</li>
    <li><b>Conta banida (termed):</b> os itens dela saem de circulação, e o item fica mais raro.</li>
    <li><b>Item sem value:</b> julgue pelo movimento. As pessoas estão trocando esse item? Se não, cuidado com o número.</li>
  </ul>

  <h3>Quando aparece "Cuidado"</h3>
  <p>O veredito vira "Cuidado" quando o que você recebe é projected, tem demanda terrível ou teve o RAP disparando, ou quando você dá um item em hold. O cartão mostra o motivo primeiro e diz qual seria o veredito sem o alerta.</p>
  <span class="aj-exemplo">Exemplo · veredito com alerta</span>
  <div class="veredito aj-veredito" data-cor="cuidado">
    <span class="selo">Cuidado</span>
    <div class="ver-pct">${pctS(-4)}</div>
    <div class="ver-sub">em value · −400</div>
    <ul class="motivos">
      <li>Item de exemplo é projected: o RAP está inflado, confie só no value.</li>
      <li>Você paga cerca de 4% a mais em value (−400). Sem esse alerta, o veredito seria "${NIVEIS[nivel(-4, ru)][0]}" (num upgrade).</li>
    </ul>
  </div>
  ${subir()}
</section>`;
}

function capitulo4(cfg) {
  return `<section class="aj-cap" id="aj-cap4">
  <div class="aj-cab"><span class="aj-eb">Capítulo 4</span><h2>Como usar o app</h2></div>
  <div class="aj-dica"><b>O app só lê.</b> Ele não faz login, não envia trades e não mexe na sua conta. Os botões "Abrir trade" e "Ver no Rolimon's" só abrem o site.</div>

  <h3 id="aj-nav">Barra de baixo e "Mais"</h3>
  <ul class="aj-lista">
    <li><b>Barra de baixo:</b> Inventário, Avaliar, Anúncios, Plano e Mais. A tela em que você está fica marcada. Na conta 2 o Avaliar some. Com o teclado aberto (ao digitar Robux), a barra se esconde.</li>
    <li><b>Mais:</b> abre blocos grandes com o Diário de trades (e quantas perguntas esperam), a Conta 2, os Temas (com o tema de agora), a Ajuda e o Diagnóstico.</li>
  </ul>

  <h3 id="aj-inv">Inventário</h3>
  <span class="aj-exemplo">Exemplo · faixa de totais</span>
  <div class="faixa aj-faixa">
    <div class="f-tot">
      <div class="f-col"><span class="f-rot">Value</span><span class="f-num">152.300</span><span class="f-var">▲ 2,1% em 24h</span></div>
      <div class="f-col"><span class="f-rot">RAP</span><span class="f-num">147.910</span><span class="f-var">▼ 0,8% em 24h</span></div>
    </div>
  </div>
  <ul class="aj-lista">
    <li><b>Faixa de totais:</b> a soma do value e do RAP dos seus itens, lado a lado, e quanto cada um mudou em 24h.</li>
    <li><b>Vitrine:</b> um cartão por item, em duas colunas: a foto grande, o Value e o RAP lado a lado e, embaixo, a demanda, as vendas por dia e o Best. Item em hold fica com a foto apagada e a etiqueta "hold".</li>
    <li><b>Setas ▲ ▼:</b> aparecem em cima do número quando o value ou o RAP do item mudou ${pct(cfg.LIMITE_MUDANCA_PCT)} ou mais em 24h.</li>
    <li><b>Etiqueta colorida na foto:</b> só para o que não aparece em outro lugar do cartão (Projected, RAP longe do value). Queda de preço fica na seta vermelha; a demanda fica colorida na linha de baixo. Os outros alertas ficam na tela do item.</li>
    <li><b>Vendas por dia (ex.: 15/dia):</b> na linha de baixo, depois da demanda. É a média de 30 dias, colorida pela mesma escala da demanda: verde gira bem, vermelho quase não vende.</li>
    <li><b>Best:</b> na mesma linha, o menor preço à venda agora.</li>
    <li><b>De onde vêm:</b> os dois são buscados por trás, uns segundos depois de a tela abrir, um item por vez, do mais valioso para o menos valioso (nas duas contas). Ficam guardados no iPhone: as vendas por ${cfg.CARTAO_LINHA_PAGINA_H}h (página do item no Rolimon's) e o Best por ${cfg.CARTAO_LINHA_BEST_MIN} min (Roblox). Se a busca falhar, fica o último valor guardado; item que nunca teve dado fica sem eles. O Diagnóstico mostra como foi a busca.</li>
    <li><b>Ordem ▾:</b> Value, RAP ou Vendas por dia, do maior para o menor. Em Vendas, os itens ainda sem dado ficam no fim. Ao lado, quantos itens você tem e quantos estão em hold; o "!" mostra avisos gerais (dados guardados, fonte que não respondeu).</li>
    <li><b>Toque no item:</b> abre a tela do item, com os alertas (como o item é), as mudanças em 24h (o que mudou, com antes → depois) e os links para o Rolimon's e o Roblox. ${ir('aj-cartao', 'Ver a tela do item')}</li>
  </ul>

  <h3 id="aj-cartao">Tela do item</h3>
  <p>Abre ao tocar num item no Inventário, no Avaliar e nos Anúncios. O botão "‹ Voltar", fixo embaixo, fecha. Em cima ficam a foto, o nome e o value e o RAP; logo embaixo, o gráfico; depois, os números numa lista, um por linha. Os dados vêm da página do item no Rolimon's, buscada nesse toque e guardada por ${cfg.CARTAO_CACHE_MIN} min. Se a busca por trás do Inventário acabou de trazer a página, a tela abre na hora.</p>
  <ul class="aj-lista">
    <li><b>Cores:</b> laranja é o que você paga; verde é o que você ganha ou o que sobe; vermelho é o que desce ou não gira.</li>
    <li><b>Gráfico:</b> o RAP dos últimos ${cfg.CARTAO_DIAS} dias, com 1 ponto por dia. Embaixo: o maior (verde) e o menor (vermelho) RAP do período, o de hoje e quanto ele mudou.</li>
    <li><b>OP para dar:</b> quanto pagar a mais para <b>pegar</b> este item (o seu upgrade). Vai de 0 até o "Vale muito" da régua do upgrade (${pct(-cfg.VEREDITO_UPGRADE_PCT[3])}).</li>
    <li><b>OP para pedir:</b> quanto pedir a mais quando você <b>dá</b> este item (o seu downgrade). É o "Vale a pena" da régua do downgrade (${pct(cfg.VEREDITO_DOWNGRADE_PCT[2])} a ${pct(cfg.VEREDITO_DOWNGRADE_PCT[3])}).</li>
    <li><b>Ajuste pela demanda:</b> item disputado pede OP maior; item parado, menor. Terrível ×0,6, Baixa ×0,8, Normal ×1, Alta ×1,2 e Incrível ×1,4. A conta usa o value (sem value, o RAP).</li>
    <li><b>Best Price:</b> o menor preço à venda agora. <b>Depois da venda:</b> o RAP se alguém comprar por esse preço. O Roblox move o RAP 1/10 do caminho até o preço da venda; a seta mostra quanto ele sobe ou desce.</li>
    <li><b>Vendas por dia:</b> média de 30 dias. É o melhor sinal de que o item gira.</li>
    <li><b>Demanda:</b> a do Rolimon's. Item sem value não tem demanda lá; nesse caso, ela é <b>estimada pelas vendas</b>: ${String(cfg.CARTAO_DEMANDA_VENDAS[3]).replace('.', ',')} ou mais por dia = Incrível, ${String(cfg.CARTAO_DEMANDA_VENDAS[2]).replace('.', ',')} ou mais = Alta, ${String(cfg.CARTAO_DEMANDA_VENDAS[1]).replace('.', ',')} ou mais = Normal, ${String(cfg.CARTAO_DEMANDA_VENDAS[0]).replace('.', ',')} ou mais = Baixa, menos = Terrível.</li>
    <li>Se o Rolimon's não responder, o bloco mostra "sem dado". Os OP aparecem mesmo assim, porque saem das réguas do app.</li>
  </ul>

  <h3 id="aj-avaliar">Avaliar trade</h3>
  <ul class="aj-lista">
    <li><b>Duas colunas:</b> Dou à esquerda e Recebo à direita, cada uma com o total em cima, um bloco por item (até ${cfg.MAX_ITENS_POR_LADO}), "+ Adicionar" e o campo de Robux no fim.</li>
    <li><b>Dou:</b> escolha itens do seu inventário. Também dá para pegar do catálogo; aí a proposta vira uma simulação (o bloco mostra "simulação").</li>
    <li><b>Recebo:</b> busque o item pelo nome ou pela sigla.</li>
    <li><b>Value base:</b> o número grande de cada item é o value do Rolimon's; item sem value entra pelo RAP, com "RAP" ao lado do número.</li>
    <li><b>Robux:</b> digite nos dois lados. Os totais já incluem os Robux, e o que você recebe já entra com o desconto de ${Math.round(cfg.TAXA_ROBUX * 100)}% do Roblox (quem recebe fica com ${Math.round((1 - cfg.TAXA_ROBUX) * 100)}%).</li>
    <li><b>Barra do veredito:</b> fica presa embaixo, acima da barra das telas, com a % na cor do veredito, o selo e a forma da trade. Aparece quando os dois lados têm algo. ${ir('aj-regua', 'Ver as réguas')}</li>
    <li><b>Régua da forma:</b> no upgrade (você dá mais itens e recebe menos, porém maiores), pagar até ${pct(-cfg.VEREDITO_UPGRADE_PCT[3])} a mais é ótimo e acima de ${pct(-cfg.VEREDITO_UPGRADE_PCT[1])} não vale. No downgrade (você recebe mais itens, porém menores), o normal é receber a mais: abaixo de +${pct(cfg.VEREDITO_DOWNGRADE_PCT[1])} não compensa e a partir de +${pct(cfg.VEREDITO_DOWNGRADE_PCT[2])} vale a pena.</li>
    <li><b>Embaixo das colunas:</b> os motivos do veredito, logo abaixo os alertas em vermelho e laranja (sempre abertos) e a comparação linha a linha do item principal de cada lado: RAP, vendas por dia, demanda e OP. "Limpar proposta" pede dois toques.</li>
    <li><b>OP da comparação:</b> em <b>Recebo</b>, o OP para <b>dar</b> (laranja): quanto pagar a mais para pegar o item. Em <b>Dou</b>, o OP para <b>pedir</b> (verde): quanto pedir a mais por ele. São os mesmos números da tela do item, e o valor em Robux fica nela. Isso <b>não muda o veredito</b>.</li>
    <li><b>De onde vêm as vendas:</b> do que já está guardado no iPhone (a busca do Inventário guarda por ${cfg.CARTAO_LINHA_PAGINA_H}h). Ao abrir esta aba e ao adicionar um item, os que faltam são buscados por trás, um por vez e na frente da fila do Inventário; enquanto isso aparece "…/dia". Item sem demanda no Rolimon's espera as vendas para calcular o OP com a demanda estimada.</li>
    <li><b>Toque num item da proposta:</b> abre a tela do item; "Remover da proposta" fica no fim dela. ${ir('aj-cartao', 'Ver a tela do item')}</li>
  </ul>

  <h3 id="aj-anuncios">Anúncios</h3>
  <ul class="aj-lista">
    <li><b>O que aparece:</b> anúncios recentes do Rolimon's com vantagem para você. Os que pedem itens seus entram a partir de "Vale a pena". Os que só pedem uma tag ganham uma sugestão montada com os seus itens.</li>
    <li><b>O que fica de fora:</b> ofertas com item projected, com demanda terrível ou com o RAP subindo mais de ${pct(cfg.ALERTA_RAP_24H_PCT)} em 24h. Seus itens em hold não entram. Trade com o mesmo item dos dois lados só aparece se você não perder value.</li>
    <li><b>Topo:</b> na primeira linha, a forma da trade (com quantos anúncios cada uma tem). Na segunda, os chips <b>Ordem ▾</b> e <b>Meus itens ▾</b>, que abrem uma folha. Na terceira, quantos anúncios foram vistos e o botão <b>↻</b>, que busca de novo.</li>
    <li><b>Meus itens:</b> só os itens marcados entram nos anúncios: nos que pedem seus itens, nas sugestões (inclusive como add) e no Plano. Desmarque o que não quer trocar (um ovo de 200 Robux, por exemplo); marque só um para ver só os anúncios dele. A folha mostra em quantos anúncios cada item é pedido. A escolha fica salva no iPhone e vale também para as notificações da conta principal. O chip mostra <b>"2 de 3 itens"</b> enquanto houver algum desmarcado.</li>
    <li><b>Um por vez:</b> a fila em cima passa para o lado (a % e a forma de cada anúncio); toque num para abrir. Embaixo fica UM anúncio aberto: Dou e Recebo lado a lado com as fotos grandes e a % no meio, e a comparação linha a linha do item principal de cada lado (itens, RAP, vendas por dia, demanda e OP).</li>
    <li><b>Degraus:</b> quando a sugestão tem duas ofertas (abertura e teto, ou abertura e mínimo), toque numa caixa para ver a cena daquela oferta. Com uma oferta só, a segunda caixa é o limite em número.</li>
    <li><b>Todos, Seu upgrade, Seu downgrade:</b> a forma da trade do seu lado. Seu upgrade: você dá vários itens e recebe 1. Seu downgrade: você dá 1 e recebe 2 ou 3. Vale para anúncios que pedem seus itens e para as sugestões; sidegrade e "por Robux" só aparecem em Todos. Se o anúncio aceita as duas formas, cada filtro monta a sugestão daquela forma, e por isso os números podem somar mais que Todos.</li>
    <li><b>Ordem:</b> maior ganho, mais recentes ou maior value recebido.</li>
    <li><b>Toque na foto de um item:</b> abre a tela do item, com as mudanças de RAP e value em 24h no fim. O "Ver no Rolimon's" fica embaixo dela. ${ir('aj-cartao', 'Ver a tela do item')}</li>
    <li><b>↻ (atualizar):</b> os anúncios são buscados ao abrir a aba, no máximo a cada ${cfg.ANUNCIOS_CACHE_MIN} min. Os vistos ficam guardados por ${cfg.ANUNCIOS_GUARDAR_HORAS} h e podem já ter sido fechados.</li>
  </ul>

  <h3 id="aj-conta2">Conta 2</h3>
  <p>Em Mais &gt; Conta 2, "Adicionar conta 2" guarda o username de outra conta (só neste iPhone); depois, o mesmo bloco troca ou remove a conta. O chip com ⇄ embaixo do título troca entre as contas. Na conta 2 o painel muda de cor, mostra "Vendo a conta de …" e um botão Voltar. Inventário e Anúncios passam a ser os dela; o Avaliar some.</p>

  <h3 id="aj-diario">Diário de trades</h3>
  <p>Abre por Mais &gt; <b>Diário de trades</b>, numa tela própria (só na sua conta principal). A cada consulta (painel e widget), o app compara os seus itens com os da vez anterior. Quando itens saem e outros entram, ele pergunta no topo do Inventário: <b>"Você fez esta trade?"</b>.</p>
  <ul class="aj-lista">
    <li><b>A pergunta:</b> no Inventário, uma faixa curta com as miniaturas do que saiu → do que entrou e a diferença pelo value de hoje. Responda Sim ou Não foi trade. Toque na faixa para ver os itens e, se quiser, colocar os Robux que entraram ou saíram. Na tela do Diário a mesma pergunta aparece frente a frente (Saiu | Entrou), com os Robux (Recebi ou Paguei) e "Sim, fiz". Enquanto houver pergunta, o bloco do Diário no Mais mostra quantas esperam.</li>
    <li><b>Lucro até hoje:</b> o value de hoje do que entrou, menos o value de hoje do que saiu, mais os Robux. Fica no bloco de destaque e mostra se as suas trades estão dando certo com o tempo.</li>
    <li><b>Lucro acumulado:</b> o gráfico soma as trades da mais antiga até hoje. Embaixo: a melhor e a pior trade, a média e quantas deram lucro.</li>
    <li><b>Por que ele pergunta:</b> o app não vê as suas trades de verdade (não tem login). Duas trades entre uma consulta e outra aparecem juntas, e compra ou venda também podem gerar pergunta.</li>
    <li><b>Trade vista em duas vezes:</b> às vezes o Rolimon's mostra o item saindo numa consulta e o novo chegando só na seguinte (ou no widget). O app guarda a metade sem par por até ${cfg.DIARIO_JANELA_H}h e junta as duas numa pergunta só, marcada "· 2 consultas". Se a pergunta ainda está aberta e chega um item atrasado, ele entra nela. Se a outra metade nunca chegar (venda, compra, presente), nada é perguntado.</li>
    <li>Cada trade aparece frente a frente (Dei | Recebi) com a data, os Robux e o lucro. Toque numa trade para apagá-la (o segundo toque confirma).</li>
  </ul>

  <h3 id="aj-notif">Notificações</h3>
  <p>Quando o widget atualiza, o app pode mandar <b>uma notificação-resumo</b> com anúncios novos bons para você e com itens seus que viraram projected ou ficaram com demanda terrível. O mesmo aviso não se repete, e das ${cfg.SILENCIO_INICIO_H}h às ${cfg.SILENCIO_FIM_H}h fica em silêncio. Como depende do widget, o aviso pode atrasar: quem decide a hora é o iOS.</p>
  <p>Para não avisar demais, são no máximo <b>${cfg.NOTIF_MAX_DIA} notificações de anúncio por dia</b> (os alertas de risco não contam), e só entram:</p>
  <ul class="aj-lista">
    <li><b>Anúncio que pede itens seus, no seu upgrade</b> (você dá mais itens): só no "Vale muito".</li>
    <li><b>Anúncio que pede itens seus, no seu downgrade</b> (você recebe mais itens): a partir de ${cfg.NOTIF_DOWNGRADE_MIN_PCT}% de ganho.</li>
    <li><b>Sugestão do app:</b> só downgrade seu, com a abertura (a primeira oferta que você manda) a partir de ${cfg.NOTIF_SUGESTAO_MIN_PCT}%.</li>
    <li><b>Meus itens:</b> o item que você desmarcou nos Anúncios não entra em nenhum aviso de anúncio. Os alertas de risco valem para todos os seus itens.</li>
    <li><b>Mesmo número de itens dos dois lados</b> (1 por 1): não avisa.</li>
    <li><b>Só item que gira:</b> o item de maior value que você recebe precisa ter pelo menos 1 venda por dia. O widget usa as vendas que o painel já guardou; sem elas, usa a demanda do Rolimon's (Normal ou melhor). Sem nenhum dos dois, não avisa.</li>
  </ul>
  <p>A notificação mostra o que você dá → o que recebe e, embaixo, a % e o giro (ex.: "+13% · gira (4,5/dia)"). Na sugestão do app (💡), aparecem a % que você pede e o mínimo a aceitar (ex.: "peça +14% · mínimo +8% · gira (4,5/dia)").</p>

  <h3 id="aj-temas">Temas</h3>
  <p>Mais &gt; Temas. A folha fica baixa, com as miniaturas passando para o lado, separadas por grupo; o app em cima já mostra o tema tocado. O toque aplica na hora e fica salvo neste iPhone; "Pronto" fecha. Sem tema escolhido, o painel segue o claro ou escuro do iPhone.</p>
  <p>São 21 temas em quatro grupos:</p>
  <ul>
    <li><b>Clássicos:</b> Azul, Dark e OLED.</li>
    <li><b>Estéticos:</b> Galáxia, Frutiger Aero, Gen X Soft Club, Gatinhos, Dark Aero e Frutiger Metro.</li>
    <li><b>Temáticos:</b> Abissal, Noir, Obsidiana e Acid.</li>
    <li><b>Novos:</b> Angel Core, Archangel (o Angel Core em preto), Romantic Gothic, Moonlight, Barbiecore, Dreamcore, Elixir e Zen.</li>
  </ul>
  <p>Cada tema tem cores próprias, a forma e o material dos botões (com um pequeno desenho no botão principal), cartões, um fundo animado e um jeito de reagir ao toque (no Azul sai uma ondinha, nos Gatinhos aparece uma patinha). Sem tema escolhido, o painel usa o Azul ou o Dark simples, seguindo o iPhone.</p>
  <p>Na versão 6.19 saíram Rosinha, Vermelho, Chromecore, MetalHeart, Veludo e Fita Perdida (com os sustos). Quem estava num deles passa para o mais parecido: Veludo vira Romantic Gothic, Rosinha vira Barbiecore, Chromecore vira Archangel, MetalHeart vira Obsidiana, Fita Perdida vira Noir e Vermelho vira Dark. A Floresta Escura, que entrou na 6.19.0, saiu na 6.19.1 e vira Noir.</p>
  <p>Se o iPhone estiver com <b>Reduzir movimento</b> ligado (Ajustes &gt; Acessibilidade &gt; Movimento), as animações dos temas ficam paradas.</p>

  <h3 id="aj-widget">Widget</h3>
  <p>Há os tamanhos pequeno, médio e grande, com o value total e os seus maiores itens. O widget pede para atualizar a cada ${cfg.WIDGET_ATUALIZAR_MIN} min, mas quem decide a hora é o iOS. Ele usa sempre o tema OLED (fundo preto), seja qual for o tema do painel. Item em hold aparece com a etiqueta amarela <b>HOLD</b>, e a contagem mostra quantos estão travados (ex.: "3 hold"). O widget não sabe quando o hold acaba, só se o item está travado.</p>

  <h3 id="aj-diag">Diagnóstico</h3>
  <p>Em Mais &gt; Diagnóstico (com a versão do app). Se algo der errado, abra, copie o texto e mande para quem cuida do app.</p>
  ${subir()}
</section>`;
}

function capitulo5() {
  return `<section class="aj-cap" id="aj-cap5">
  <div class="aj-cab"><span class="aj-eb">Capítulo 5</span><h2>Segurança: golpes comuns</h2></div>
  <p>Trade de Limited atrai golpista. Quase todo golpe usa a mesma coisa: <b>pressa</b> e algo <b>fora da janela oficial de trade</b> do Roblox.</p>
  <dl class="aj-armas" id="aj-golpes">
    <div><dt><span class="tag neg">Site falso de values</span></dt><dd>Mandam um link de um "Rolimon's" copiado, com o item deles valendo muito mais. Digite você mesmo o endereço do site de values; nunca use link recebido em chat ou DM.</dd></div>
    <div><dt><span class="tag neg">"Vai você primeiro"</span></dt><dd>Pedem que você mande o seu item primeiro ou que a trade seja "em duas partes". A segunda parte nunca chega. Por isso os traders dizem <b>NGF</b> (não vou primeiro).</dd></div>
    <div><dt><span class="tag neg">Middleman falso</span></dt><dd>Alguém se passa por um intermediário conhecido, com o username com uma letra trocada, a foto copiada e prints falsos de "vouch".</dd></div>
    <div><dt><span class="tag neg">Link de "verificar inventário"</span></dt><dd>Pedem para você entrar num site para "confirmar a trade". Ele rouba a sua senha ou o acesso da conta e esvazia o inventário. O único lugar para fazer login é o roblox.com.</dd></div>
  </dl>
  <ul class="aj-lista">
    <li><b>Faça trade só pela janela oficial do Roblox.</b> Os itens só trocam de dono quando a proposta é aceita lá.</li>
    <li><b>O Roblox não devolve</b> nada perdido em acordo feito por fora.</li>
    <li><b>Este app nunca pede senha</b> nem login. Ele só lê dados públicos.</li>
  </ul>
  <div class="aj-dica"><b>Regra de ouro:</b> se alguém tem muita pressa ou a proposta é boa demais para ser verdade, pare e confira com calma.</div>
  ${subir()}
</section>`;
}

function glossario() {
  const termos = [
    ['Adds', 'Item extra colocado para equilibrar uma troca quase igual.'],
    ['Any', 'Tag de anúncio: o dono aceita qualquer coisa.'],
    ['Demanda', 'O quanto as pessoas procuram o item, de Terrível a Incrível.'],
    ['Downgrade', 'Você dá 1 item grande e recebe vários menores. O outro costuma pagar a mais.'],
    ['Hold', 'Item travado, que não pode ser trocado: 2 dias depois de uma trade, 7 dias depois de comprar no catálogo do Roblox.'],
    ['Hyped', 'Item na moda: o preço pode cair quando a moda passar.'],
    ['Limited', 'Item que saiu da loja do Roblox e só passa de mão em mão.'],
    ['Overpay (OP)', 'O extra que um lado paga, em value.'],
    ['Projected', 'Item com RAP inflado de propósito. Nunca aceite pelo RAP.'],
    ['RAP', 'Média das vendas recentes, calculada pelo Roblox.'],
    ['Rare', "Item com até 100 cópias existentes (critério do Rolimon's)."],
    ['Serial', 'O número da sua cópia (#318).'],
    ['Sidegrade', 'Mesmo número de itens dos dois lados.'],
    ['Tendência', 'Para onde o preço anda: subindo, estável, caindo.'],
    ['Trade Ad', "Anúncio no Rolimon's dizendo o que alguém oferece e o que quer."],
    ['Upgrade', 'Você dá vários itens e recebe menos, porém maiores. Você costuma pagar a mais.'],
    ['Value', "Quanto a comunidade diz que o item vale (Rolimon's)."],
    ['Value base', 'O número do app: o value; sem value, o RAP.'],
    ['Veredito', 'A segunda opinião do app: de "Não vale de jeito nenhum" a "Vale muito a pena", ou "Cuidado".'],
  ];
  // Gírias e siglas que aparecem nos chats, anúncios e grupos de trade.
  const girias = [
    ['W / F / L', 'Win, Fair, Loss: ganhou, justa ou perdeu. "W or L?" quer dizer "essa trade é boa?". O app mostra a letra ao lado do veredito.'],
    ['OP', 'Overpay: o extra pago acima do value, geralmente em % ("10% OP").'],
    ['Lowball', 'Oferta bem abaixo do value, esperando que você não perceba.'],
    ['Adds', 'Robux ou itens pequenos colocados para fechar a conta ("minha Valk pela sua + 5k adds").'],
    ['UG / UPG · DG', 'Upgrade e downgrade.'],
    ['LF / FT', 'Looking for (procuro) e For trade (troco), usados nos anúncios.'],
    ['NFT', 'Not for trade: o dono não troca esse item.'],
    ['A/C · A/D', 'Accept or counter (aceita ou faz contraproposta) · Accept or decline (aceita ou recusa).'],
    ['NGF', 'Not going first: "não vou primeiro". Proteção contra golpe.'],
    ['MM', 'Middleman: intermediário que segura os itens. Cuidado: há muitos falsos.'],
    ['PC', 'Price check: pedir para avaliarem quanto vale um item.'],
    ['Value item', "Item que tem value no Rolimon's (só cerca de 1 em cada 5 limiteds tem)."],
    ['RAP item', 'Item sem value, negociado pelo RAP. Conta menos segura.'],
    ['Hoard', 'Uma pessoa segurando muitas cópias para subir o preço.'],
    ['Termed', 'Conta banida; os itens dela saem de circulação.'],
    ['Sharking', 'Se aproveitar de quem não conhece os values, com lowball em iniciante.'],
    ['Sniping', 'Comprar no Marketplace logo que alguém anuncia barato.'],
    ['Sigla', "Apelido curto do item, como DC (Domino Crown) ou BV (Blackvalk). O Rolimon's tem uma para cada item; a busca do Avaliar aceita."],
  ];
  const lista = (l) => '<dl class="aj-glos">' + l.map((t) => '<div><dt>' + esc(t[0]) + '</dt><dd>' + esc(t[1]) + '</dd></div>').join('') + '</dl>';
  return `<section class="aj-cap" id="aj-glossario">
  <div class="aj-cab"><span class="aj-eb">Consulta</span><h2>Glossário</h2></div>
  ${lista(termos)}
  <h3 id="aj-girias">Gírias e siglas dos traders</h3>
  <p>Você vai ver essas palavras nos anúncios, nos chats e nos grupos de trade.</p>
  ${lista(girias)}
  ${subir()}
</section>`;
}

function perguntas(cfg) {
  const ru = cfg.VEREDITO_UPGRADE_PCT;
  const taxa = Math.round(cfg.TAXA_ROBUX * 100);
  const q = [
    ['Upgrade quer dizer que eu ganho?', 'Não. Upgrade só diz que você dá mais itens e recebe menos. Quem faz upgrade costuma até pagar um pouco a mais.', 'aj-cap2', 'Ver no capítulo 2'],
    ['Como eu evoluo o meu inventário?', 'Alternando upgrade com pouco OP e downgrade pedindo mais OP, com calma e só com itens de boa demanda.', 'aj-escada', 'Ver a escadinha'],
    ['A trade parece ótima. Aceito logo?', "Antes, confira a demanda e quantas vendas o item tem no Rolimon's.", 'aj-calma', 'Ver o que conferir'],
    ['Paguei 4% a mais num upgrade. Fiz besteira?', 'Não: num upgrade, pagar até ' + pct(ru[3]) + ' a mais é ótimo, desde que o item que você recebeu tenha boa demanda.', 'aj-regua', 'Ver as réguas'],
    ['O anúncio diz "downgrade", mas o app mostra "seu upgrade". Está errado?', 'Não. A tag é do dono do anúncio; o app mostra a trade do seu lado.', 'aj-tags', 'Ver a explicação'],
    ['Por que o app ignora o RAP no veredito?', 'Porque o RAP chega atrasado e pode ser manipulado. Ele aparece como informação; quem decide é o value.', 'aj-cap1', 'Ver no capítulo 1'],
    ['Recebi 1.000 Robux, mas a conta mostra ' + num(Math.floor(1000 * (1 - cfg.TAXA_ROBUX))) + '. Por quê?', 'O Roblox fica com ' + taxa + '% dos Robux de quem recebe. O app já mostra o que sobra.', 'aj-robux', 'Ver no capítulo 1'],
    ['Por que não consigo colocar um item meu na trade?', 'Ele deve estar em hold (2 dias depois de uma trade, 7 dias depois de comprar no catálogo) ou é um UGC, que só pode ser revendido, não trocado.', 'aj-regras', 'Ver as regras'],
    ['O que quer dizer "W or L?"', 'É "essa trade é boa?". W = ganhou, F = justa, L = perdeu. O app mostra a letra ao lado do veredito.', 'aj-girias', 'Ver as gírias'],
    ['Pediram para eu mandar primeiro ou entrar num site para "verificar". E agora?', 'Não faça. Isso é golpe. Trade só pela janela oficial do Roblox, e login só no roblox.com.', 'aj-cap5', 'Ver os golpes comuns'],
    ['Item raro sempre vale a pena?', 'Não. Raridade sem procura também trava. Olhe a demanda e se as pessoas trocam esse item.', 'aj-liquidez', 'Ver o que gira e o que trava'],
    ['O app garante lucro?', 'Não. Ele dá uma segunda opinião com regras práticas da comunidade. A decisão é sempre sua.', null, null],
  ];
  return `<section class="aj-cap" id="aj-faq">
  <div class="aj-cab"><span class="aj-eb">Consulta</span><h2>Perguntas rápidas</h2></div>
  <div class="aj-faq">${q.map((x) => '<details><summary>' + esc(x[0]) + '</summary><p>' + esc(x[1]) + (x[2] ? ' ' + ir(x[2], x[3]) : '') + '</p></details>').join('')}</div>
  ${subir()}
</section>`;
}

// A tela inteira (fica escondida até abrir).
function secao(cfg) {
  const ind = [
    ['aj-cap1', '1', 'O básico', 'Limited, value, RAP e Robux'],
    ['aj-cap2', '2', 'Upgrade, downgrade e quanto pagar a mais', 'A escadinha e o veredito'],
    ['aj-cap3', '3', 'Demanda e armadilhas', 'O que conferir antes de aceitar'],
    ['aj-cap4', '4', 'Como usar o app', 'Abas, filtros, diário, conta 2, temas e widget'],
    ['aj-cap5', '5', 'Segurança: golpes comuns', 'Como não cair em golpe'],
    ['aj-glossario', 'A–Z', 'Glossário e gírias', 'Termos, gírias e siglas dos traders'],
    ['aj-faq', '?', 'Perguntas rápidas', 'Toque para abrir a resposta'],
  ];
  return `<div id="aj-tela" class="aj-tela oculto" role="dialog" aria-modal="true" aria-label="Ajuda">
${temas.ceu()}
<div class="aj-barra"><h1>Ajuda</h1><button type="button" class="aj-fechar" id="aj-fechar">Fechar</button></div>
<div class="aj-corpo">
  <p class="aj-lead" id="aj-indice">Um guia para quem nunca fez trade. Leia na ordem da primeira vez; depois use as perguntas rápidas no fim.</p>
  <div class="aj-aviso"><b>Importante:</b> os números deste guia são regras práticas da comunidade, não regras oficiais do Roblox. O app dá uma segunda opinião; ele não garante lucro e a decisão é sempre sua. Os valores dos exemplos são inventados.</div>
  <div class="aj-ind">${ind.map((x) =>
    '<button type="button" data-ajuda="' + x[0] + '"><span class="aj-n' + (x[1].length > 1 ? ' x' : '') + '">' + x[1] + '</span>' +
    '<span class="aj-t"><b>' + esc(x[2]) + '</b><small>' + esc(x[3]) + '</small></span><span class="aj-c">›</span></button>').join('')}</div>
  ${capitulo1(cfg)}
  ${capitulo2(cfg)}
  ${capitulo3(cfg)}
  ${capitulo4(cfg)}
  ${capitulo5()}
  ${glossario()}
  ${perguntas(cfg)}
</div>
</div>`;
}

// Link discreto "Ver na Ajuda" para colocar nas abas.
function link(topico, texto) {
  return '<button type="button" class="ver-ajuda" data-ajuda="' + topico + '">' + esc(texto) + ' <b>Ver na Ajuda</b></button>';
}

function css() {
  return `
.ver-ajuda{align-self:flex-start;padding:2px 0;border:0;background:none;color:var(--sub);font-size:14px;text-align:left;-webkit-tap-highlight-color:transparent}
.ver-ajuda b{color:var(--acc-t);font-weight:600}
.aj-tela{position:fixed;top:0;left:0;right:0;bottom:0;z-index:50;overflow-y:auto;-webkit-overflow-scrolling:touch;background:var(--bg);color:var(--fg)}
.aj-barra{position:sticky;top:0;z-index:2;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:max(12px,env(safe-area-inset-top)) max(16px,env(safe-area-inset-right)) 10px max(16px,env(safe-area-inset-left));background:var(--bg);border-bottom:1px solid var(--borda)}
.aj-barra h1{font-size:28px}
.aj-fechar{border:0;background:none;padding:4px 0;font-size:16px;font-weight:600;color:var(--acc-t)}
.aj-corpo{max-width:560px;margin:0 auto;display:flex;flex-direction:column;gap:24px;padding:18px max(16px,env(safe-area-inset-right)) max(48px,env(safe-area-inset-bottom)) max(16px,env(safe-area-inset-left))}
.aj-lead{margin:0;font-size:15px;color:var(--sub);scroll-margin-top:80px}
.aj-aviso{padding:12px 14px;border-radius:14px;background:var(--warn-bg);font-size:14px;line-height:1.45}
.aj-aviso b{color:var(--warn)}
.aj-ind{display:flex;flex-direction:column;border-radius:16px;background:var(--card);border:1px solid var(--card-borda);box-shadow:var(--sombra);overflow:hidden}
.aj-ind button{display:flex;align-items:center;gap:12px;width:100%;padding:13px 16px;border:0;background:none;text-align:left;-webkit-tap-highlight-color:transparent}
.aj-ind button+button{border-top:1px solid var(--borda)}
.aj-ind button:active{background:var(--card2)}
.aj-n{flex:none;width:28px;height:28px;border-radius:50%;display:grid;place-items:center;font-size:13px;font-weight:700;background:var(--acc-fundo);color:var(--on-acc)}
.aj-n.x{background:var(--card2);color:var(--sub);font-size:11px}
.aj-t{flex:1;min-width:0;display:flex;flex-direction:column;gap:1px}
.aj-t b{font-size:16px;font-weight:600}
.aj-t small{font-size:13px;color:var(--sub)}
.aj-c{color:var(--sub);font-size:22px;line-height:1}

.aj-cap{display:flex;flex-direction:column;gap:14px;scroll-margin-top:80px}
.aj-cab{display:flex;flex-direction:column;gap:4px;padding-top:8px}
.aj-eb{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--acc-t)}
.aj-cab h2{margin:0;font-family:var(--f-titulo);font-style:var(--t-estilo);font-weight:var(--t-peso);font-size:23px;line-height:1.2;letter-spacing:-.01em}
.aj-cap h3{margin:10px 0 0;font-size:18px;font-weight:700;line-height:1.25;scroll-margin-top:80px}
.aj-cap p{margin:0;font-size:16px;line-height:1.45}
.aj-lista,.aj-check{margin:0;padding-left:22px;display:flex;flex-direction:column;gap:8px;font-size:16px;line-height:1.45}
.aj-legenda{margin-top:-4px!important;font-size:13px!important;color:var(--sub);text-align:center}
.aj-exemplo{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--sub)}
.aj-dica{padding:12px 14px;border-radius:14px;background:var(--card2);font-size:15px;line-height:1.45}
.aj-dica b{color:var(--acc-t)}
.aj-ir{display:inline;padding:0;border:0;background:none;color:var(--acc-t);font-size:inherit;font-weight:600;text-decoration:underline;text-align:left}
.aj-subir{align-self:flex-start;padding:0;border:0;background:none;color:var(--acc-t);font-size:14px;font-weight:600}
.aj-destaque{animation:aj-pisca 1.8s ease-out 1}
@keyframes aj-pisca{0%{background:transparent}25%{background:var(--card2)}100%{background:transparent}}
@media (prefers-reduced-motion:reduce){.aj-destaque{animation:none}}

/* Componentes do app usados como exemplo */
.aj-grupo,.aj-veredito,.aj-prop,.aj-regua,.aj-forma,.aj-bx,.aj-robux,.aj-escada li,.aj-armas,.aj-glos,.aj-faq,.aj-ind{-webkit-backdrop-filter:var(--vidro);backdrop-filter:var(--vidro)}
.aj-grupo>.item+.item{border-top:1px solid var(--borda)}
.aj-tela .item:active{background:none}
span.thumb.aj-mini{display:grid;place-items:center;font-size:13px;font-weight:700;color:var(--sub);background-color:var(--card2);background-size:cover;background-position:center}
.an-grp span.thumb.aj-mini{font-size:8px}
.an-i span.thumb.aj-mini{font-size:10px}
.aj-tela .an-linha{cursor:default}
.aj-veredito{border:1px solid var(--card-borda)}
.aj-veredito .motivos{margin-bottom:0}
.aj-veredito .motivos li:last-child{border-bottom:0}
.aj-bal{display:inline-grid;place-items:center;width:20px;height:20px;border-radius:50%;background:var(--warn);color:var(--on-status);font-size:11px;font-weight:700;vertical-align:middle}
.aj-leg{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:8px;font-size:15px}
.aj-leg li{display:flex;gap:10px;align-items:flex-start}
.aj-leg .aj-bal{flex:none;margin-top:1px}

.aj-prop{border-radius:20px;background:var(--card);border:1px solid var(--card-borda);box-shadow:var(--sombra);overflow:hidden}
.aj-lado{display:flex;flex-direction:column;gap:10px;padding:14px}
.aj-lado.dou{background:var(--dou-bg)}
.aj-lado.rec{background:var(--rec-bg)}
.aj-lado-topo{display:flex;justify-content:space-between;align-items:center}
.aj-lado-topo h4{margin:0;font-size:17px;font-weight:700}
.aj-lado-topo span{font-size:13px;font-weight:600;color:var(--sub)}
.aj-lado.dou h4,.aj-lado.dou .aj-tot-v{color:var(--acc-t)}
.aj-lado.rec h4,.aj-lado.rec .aj-tot-v{color:var(--pos)}
.aj-lado .grupo{box-shadow:none;border-radius:14px}
.aj-lado .item{padding:10px 12px}
.aj-lado .thumb{width:40px;height:40px;border-radius:10px}
.aj-tot{display:flex;justify-content:space-between;align-items:flex-end}
.aj-tot-r{font-size:14px;font-weight:600;color:var(--sub)}
.aj-tot-r small{display:block;font-size:13px;font-weight:400}
.aj-tot-v{font-size:26px;font-weight:700;line-height:1}

.aj-formas{display:flex;flex-direction:column;gap:10px}
.aj-forma{display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:16px;background:var(--card);border:1px solid var(--card-borda);box-shadow:var(--sombra)}
.aj-nomef{flex:none;width:92px;display:flex;flex-direction:column;gap:2px}
.aj-nomef b{font-size:15px}
.aj-nomef small{font-size:12px;color:var(--sub);line-height:1.3}
.aj-pilhas{flex:1;min-width:0;display:flex;align-items:center;justify-content:center;gap:8px}
.aj-pilha{display:flex;align-items:center;gap:3px;padding:5px;border-radius:10px}
.aj-pilha.dou{background:var(--dou-bg)}
.aj-pilha.rec{background:var(--rec-bg)}
.aj-q{display:block;border-radius:6px;background:var(--acc-t);opacity:.8}
.aj-pilha.rec .aj-q{background:var(--pos)}
.aj-q.p{width:16px;height:16px}.aj-q.m{width:22px;height:22px}.aj-q.g{width:30px;height:30px}
.aj-sf{color:var(--sub);font-size:15px}
.aj-quem{flex:none;width:84px;text-align:right;font-size:12px;font-weight:700;line-height:1.3}

.aj-escada{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:6px}
.aj-escada li{display:flex;flex-direction:column;gap:1px;width:calc(100% - var(--d) * 9%);margin-left:calc(var(--d) * 9%);padding:10px 14px;border-radius:14px;background:var(--card);border:1px solid var(--card-borda);box-shadow:var(--sombra)}
.aj-escada li.up{background:var(--dou-bg)}
.aj-escada li.down{background:var(--rec-bg)}
.aj-pas{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--sub)}
.aj-escada li.up .aj-pas{color:var(--acc-t)}
.aj-escada li.down .aj-pas{color:var(--pos)}
.aj-escada b{font-size:22px;line-height:1.15}
.aj-escada small{font-size:13px;color:var(--sub)}

.aj-regua{display:flex;flex-direction:column;gap:8px;padding:14px;border-radius:16px;background:var(--card);border:1px solid var(--card-borda);box-shadow:var(--sombra)}
.aj-regua-t{display:flex;justify-content:space-between;align-items:baseline;gap:8px}
.aj-regua-t b{font-size:15px}
.aj-regua-t small{font-size:12px;color:var(--sub)}
.aj-faixas{display:grid;grid-template-columns:repeat(5,1fr);gap:3px}
.aj-fx{display:flex;flex-direction:column;gap:4px;min-width:0}
.aj-fx i{display:block;height:12px;border-radius:4px;background:var(--sf)}
.aj-fx[data-cor=justa] i{background:var(--acc-t);opacity:.45}
.aj-fx[data-cor=pos] i{background:var(--pos);opacity:.5}
.aj-fx[data-cor=neg] i{background:var(--neg);opacity:.5}
.aj-fx span{font-size:11px;font-weight:700;line-height:1.2;color:var(--c)}
.aj-fx em{font-style:normal;font-size:11px;color:var(--sub);line-height:1.2}

.aj-persp{display:grid;grid-template-columns:1fr auto 1fr;align-items:stretch;gap:8px}
.aj-bx{display:flex;flex-direction:column;gap:4px;min-width:0;padding:12px;border-radius:14px;background:var(--card);border:1px solid var(--card-borda);box-shadow:var(--sombra)}
.aj-bx small{font-size:12px;font-weight:600;color:var(--sub)}
.aj-bx b{font-size:16px}
.aj-bx span{font-size:13px;color:var(--sub);line-height:1.35}
.aj-meio{display:grid;place-items:center;color:var(--sub);font-size:18px}

.aj-robux{display:grid;grid-template-columns:1fr auto 1fr;gap:8px;align-items:center;padding:14px;border-radius:16px;background:var(--card);border:1px solid var(--card-borda);box-shadow:var(--sombra);text-align:center}
.aj-robux b{display:block;font-size:24px;line-height:1.1}
.aj-robux small{font-size:12px;color:var(--sub)}
.aj-tx{font-size:13px;font-weight:700;color:var(--neg)}

.aj-escala{display:grid;grid-template-columns:repeat(5,1fr);gap:4px}
.aj-escala span{padding:8px 2px;border-radius:10px;text-align:center;font-size:12px;font-weight:700;background:var(--card2);color:var(--sub)}
.aj-escala .neg{background:var(--neg-bg);color:var(--neg)}
.aj-escala .warn{background:var(--warn-bg);color:var(--warn)}
.aj-escala .pos{background:var(--pos-bg);color:var(--pos)}
.aj-armas{margin:0;border-radius:16px;background:var(--card);border:1px solid var(--card-borda);box-shadow:var(--sombra);overflow:hidden}
.aj-armas div{display:flex;flex-direction:column;gap:6px;padding:12px 14px}
.aj-armas div+div{border-top:1px solid var(--borda)}
.aj-armas dt{margin:0}
.aj-armas dd{margin:0;font-size:15px;line-height:1.45}
.aj-faixa .f-pe{border-top-color:var(--heroi-linha)}

.aj-glos{margin:0;border-radius:16px;background:var(--card);border:1px solid var(--card-borda);box-shadow:var(--sombra);overflow:hidden}
.aj-glos div{display:grid;grid-template-columns:100px 1fr;gap:10px;padding:11px 14px;font-size:14px;line-height:1.4}
.aj-glos div+div{border-top:1px solid var(--borda)}
.aj-glos dt{font-weight:700;overflow-wrap:anywhere}
.aj-glos dd{margin:0}
.aj-faq{border-radius:16px;background:var(--card);border:1px solid var(--card-borda);box-shadow:var(--sombra);overflow:hidden}
.aj-faq details+details{border-top:1px solid var(--borda)}
.aj-faq summary{list-style:none;display:flex;justify-content:space-between;gap:10px;padding:14px 16px;font-size:15px;font-weight:600;-webkit-tap-highlight-color:transparent}
.aj-faq summary::-webkit-details-marker{display:none}
.aj-faq summary::after{content:"\\203A";flex:none;font-size:22px;line-height:1;color:var(--sub);transition:transform .15s}
.aj-faq details[open] summary::after{transform:rotate(90deg)}
.aj-faq details p{margin:0;padding:0 16px 14px;font-size:15px;line-height:1.45}
`;
}

// <script> da Ajuda: abrir/fechar, ir ao tópico e miniaturas reais.
// Vem depois dos outros scripts; usa TH_D (catálogo e miniaturas) só se existir.
function script() {
  return `<script>
(function(){
  var tela = document.getElementById('aj-tela');
  if (!tela) return;
  var idPorNome = null;
  var pediu = false;

  // Miniaturas reais: acha o id do item pelo nome no catálogo do avaliador e
  // usa a mesma ponte de miniaturas; sem catálogo, ficam as iniciais.
  function miniaturas(){
    if (typeof TH_D === 'undefined' || !TH_D || !TH_D.catalogo) return;
    var C = TH_D.catalogo;
    var T = TH_D.miniaturas || {};
    if (!idPorNome) {
      idPorNome = {};
      for (var id in C) {
        var n = C[id] && C[id][0];
        if (n) idPorNome[String(n).toLowerCase()] = id;
      }
    }
    var els = tela.querySelectorAll('.aj-mini[data-item]');
    var faltam = [];
    for (var k = 0; k < els.length; k++) {
      var el = els[k];
      var id2 = idPorNome[el.getAttribute('data-item').toLowerCase()];
      if (!id2) continue;
      if (T[id2]) {
        if (!el.getAttribute('data-ok')) {
          el.style.backgroundImage = 'url("' + String(T[id2]).replace(/"/g, '%22') + '")';
          el.textContent = '';
          el.setAttribute('data-ok', '1');
        }
      } else if (faltam.indexOf(id2) < 0) {
        faltam.push(id2);
      }
    }
    if (faltam.length && !pediu && window.thPedirMiniaturas) {
      pediu = true;
      try { window.thPedirMiniaturas(faltam); } catch (e) {}
    }
  }
  window.thAjudaMiniaturas = function(){
    if (!tela.classList.contains('oculto')) miniaturas();
  };

  function irPara(topico){
    var el = document.getElementById(topico === 'indice' ? 'aj-indice' : topico);
    if (!el) { tela.scrollTop = 0; return; }
    var barra = tela.querySelector('.aj-barra');
    var y = el.getBoundingClientRect().top - tela.getBoundingClientRect().top + tela.scrollTop - (barra ? barra.offsetHeight : 0) - 12;
    tela.scrollTop = Math.max(0, y);
    el.classList.remove('aj-destaque');
    void el.offsetWidth;
    el.classList.add('aj-destaque');
  }
  function abrir(topico){
    tela.classList.remove('oculto');
    document.documentElement.style.overflow = 'hidden';
    miniaturas();
    if (topico) irPara(topico);
    else tela.scrollTop = 0;
  }
  function fechar(){
    tela.classList.add('oculto');
    document.documentElement.style.overflow = '';
  }
  window.thAbrirAjuda = abrir;
  document.getElementById('aj-fechar').addEventListener('click', fechar);

  // Qualquer elemento com data-ajuda (links das abas e botões internos) abre no tópico.
  document.addEventListener('click', function(ev){
    var b = ev.target.closest ? ev.target.closest('[data-ajuda]') : null;
    if (!b) return;
    ev.preventDefault();
    var t = b.getAttribute('data-ajuda');
    if (tela.classList.contains('oculto')) abrir(t);
    else irPara(t);
  });
})();
</script>`;
}

module.exports = { secao, css, script, link };
