// ===== NAILPRO CALC v2 =====
'use strict'

function fmt(v) { return 'R$ ' + Number(v||0).toFixed(2).replace('.',',') }
function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;') }

function calcular(params) {
  const cfg = getConfig()
  const servicos  = params.servicos  || []
  const transporte= params.transporte|| 0
  const desconto  = params.desconto  || 0
  const pagamento = params.pagamento || 'dinheiro'
  const nailArt   = params.nailArt   || 'nenhuma'

  let totalMaterial = 0, totalMaoDeObra = 0, totalMargem = 0
  servicos.forEach(function(s) {
    var mat = s.material || 0
    var mdo = (cfg.valorHora / 60) * (s.minutos || 0)
    var mg  = mat * (cfg.minimoPeca / 100)
    totalMaterial  += mat
    totalMaoDeObra += mdo
    totalMargem    += mg
  })

  // Adicional nail art
  var nailArtMap = { nenhuma: 0, simples: cfg.nailArtSimples||5, intermediaria: cfg.nailArtMedia||10, complexa: cfg.nailArtComplexa||20 }
  var nailArtValor = nailArtMap[nailArt] || 0

  // Desgaste equipamentos
  var equipamentos = (typeof getEquipamentos === 'function') ? getEquipamentos() : []
  var desgasteTotal = equipamentos.reduce(function(s, e) {
    if (!e.custo || !e.vidaUtil || e.vidaUtil === 0) return s
    return s + (e.custo / e.vidaUtil)
  }, 0)

  var insumos     = cfg.insumos * servicos.length
  var rateioFixo  = cfg.custoFixo / (cfg.metaAtend || 1)
  var subtotal    = totalMaterial + totalMargem + totalMaoDeObra + insumos + rateioFixo + transporte + desgasteTotal + nailArtValor
  var margem      = subtotal * (cfg.margem / 100)
  var comissao    = subtotal * (cfg.comissao / 100)
  var fundo       = subtotal * (cfg.fundo / 100)
  var valorFinal  = subtotal + margem + comissao + fundo - desconto
  var taxaRate    = pagamento === 'cartao' ? cfg.taxaCartao : pagamento === 'debito' ? cfg.taxaDebito : 0
  var taxa        = valorFinal * (taxaRate / 100)
  valorFinal     += taxa

  var totalCustos = totalMaterial + totalMaoDeObra + insumos + rateioFixo + transporte + taxa + comissao + fundo + desgasteTotal + nailArtValor
  var lucroReal   = valorFinal - totalCustos - desconto

  // Meta de lucro
  var lucroMeta        = cfg.lucroDesejado || 0
  var atendMes         = (cfg.diasTrabalho||22) * (cfg.atendDia||6)
  var lucroMinPorAtend = atendMes > 0 ? lucroMeta / atendMes : 0
  var precoMinimo      = totalCustos + lucroMinPorAtend
  var emPrejuizo       = lucroMeta > 0 && valorFinal > 0 && valorFinal < precoMinimo
  var prejuizoPorAtend = emPrejuizo ? (precoMinimo - valorFinal) : 0
  var simAumento       = cfg.simuladorAumento || 0
  var ganhoPotencial   = simAumento * atendMes

  return {
    servicos: servicos,
    totalMaterial: totalMaterial, totalMaoDeObra: totalMaoDeObra, totalMargem: totalMargem,
    insumos: insumos, rateioFixo: rateioFixo, transporte: transporte,
    desconto: desconto, taxa: taxa, comissao: comissao, fundo: fundo,
    valorFinal: valorFinal, lucroReal: lucroReal, pagamento: pagamento,
    minimoPeca: cfg.minimoPeca, nailArt: nailArt, nailArtValor: nailArtValor,
    desgasteTotal: desgasteTotal, precoMinimo: precoMinimo,
    lucroMinPorAtend: lucroMinPorAtend, emPrejuizo: emPrejuizo,
    prejuizoPorAtend: prejuizoPorAtend, ganhoPotencial: ganhoPotencial,
    atendMes: atendMes, lucroMeta: lucroMeta
  }
}

// ===== PREVIEW EM TEMPO REAL =====
function previewAtend() {
  var servicos = coletarServicos()
  if (servicos.length === 0) {
    document.getElementById('preview-box').style.display = 'none'
    return
  }
  var res = calcular({
    servicos:    servicos,
    transporte:  Number(document.getElementById('transporte') && document.getElementById('transporte').value) || 0,
    desconto:    Number(document.getElementById('desconto') && document.getElementById('desconto').value) || 0,
    pagamento:   (document.getElementById('pagamento') && document.getElementById('pagamento').value) || 'dinheiro',
    nailArt:     (document.getElementById('nail-art') && document.getElementById('nail-art').value) || 'nenhuma'
  })
  document.getElementById('preview-box').style.display = 'block'
  document.getElementById('prev-valor').textContent = fmt(res.valorFinal)
  document.getElementById('prev-lucro').textContent = 'Lucro: ' + fmt(res.lucroReal)
  document.getElementById('prev-lucro').style.color = res.lucroReal >= 0 ? 'var(--green)' : 'var(--red)'

  var alertEl = document.getElementById('prev-alerta')
  if (alertEl) {
    if (res.emPrejuizo) {
      alertEl.innerHTML = '⚠️ Você está perdendo <strong>' + fmt(res.prejuizoPorAtend) + '</strong> neste atendimento. Preço mínimo: <strong>' + fmt(res.precoMinimo) + '</strong>'
      alertEl.style.display = 'block'
    } else {
      alertEl.style.display = 'none'
    }
  }
}

// ===== COLETAR SERVIÇOS DO FORM =====
function coletarServicos() {
  var items = document.querySelectorAll('.svc-item')
  var result = []
  items.forEach(function(el) {
    var nome     = el.querySelector('.svc-nome') && el.querySelector('.svc-nome').value.trim()
    var material = Number(el.querySelector('.svc-material') && el.querySelector('.svc-material').value) || 0
    var minutos  = Number(el.querySelector('.svc-minutos') && el.querySelector('.svc-minutos').value) || 0
    var retorno  = Number(el.querySelector('.svc-retorno') && el.querySelector('.svc-retorno').value) || 0
    if (nome) result.push({ nome: nome, material: material, minutos: minutos, retornoDias: retorno })
  })
  return result
}

// ===== SALVAR ATENDIMENTO =====
function calcularESalvar() {
  var cliente   = document.getElementById('cliente') && document.getElementById('cliente').value.trim()
  var whatsapp  = document.getElementById('whatsapp') && document.getElementById('whatsapp').value.trim()
  var obs       = document.getElementById('obs') && document.getElementById('obs').value.trim()
  var dataAgend = document.getElementById('data-atend') && document.getElementById('data-atend').value

  if (!cliente) { showToast('⚠️ Informe o nome da cliente'); return }
  var servicos = coletarServicos()
  if (servicos.length === 0) { showToast('⚠️ Adicione pelo menos um serviço'); return }

  var res = calcular({
    servicos:   servicos,
    transporte: Number(document.getElementById('transporte') && document.getElementById('transporte').value) || 0,
    desconto:   Number(document.getElementById('desconto') && document.getElementById('desconto').value) || 0,
    pagamento:  (document.getElementById('pagamento') && document.getElementById('pagamento').value) || 'dinheiro',
    nailArt:    (document.getElementById('nail-art') && document.getElementById('nail-art').value) || 'nenhuma'
  })

  // Calcula data de retorno
  var maxRetorno = 0
  servicos.forEach(function(s) { if ((s.retornoDias||0) > maxRetorno) maxRetorno = s.retornoDias })
  var dataRetorno = null
  if (maxRetorno > 0) {
    var base = dataAgend ? new Date(dataAgend) : new Date()
    base.setDate(base.getDate() + maxRetorno)
    dataRetorno = base.toLocaleDateString('pt-BR')
  }

  var saved = salvarAtendimento({
    cliente: cliente, whatsapp: whatsapp, obs: obs, dataAgend: dataAgend,
    fotoAntes: _fotoAntes || '', fotoDepois: _fotoDepois || '',
    servicos: servicos, valorFinal: res.valorFinal, lucroReal: res.lucroReal,
    pagamento: res.pagamento, detalhes: res, dataRetorno: dataRetorno, nailArt: res.nailArt
  })

  salvarCliente({ nome: cliente, whatsapp: whatsapp })

  // Agenda retorno automaticamente
  if (dataRetorno && whatsapp && dataAgend) {
    var retBase = new Date(dataAgend)
    retBase.setDate(retBase.getDate() + maxRetorno)
    salvarAgendamento({
      cliente: cliente, whatsapp: whatsapp,
      dataHora: retBase.toISOString().slice(0,16),
      servico: servicos.map(function(s){return s.nome}).join(', '),
      tipo: 'retorno', atendId: saved.atendId
    })
  }

  mostrarResultado(res, { cliente: cliente, whatsapp: whatsapp, obs: obs, numAtend: saved.numAtend, atendId: saved.atendId, dataRetorno: dataRetorno })
  limparFormAtend()
}

function limparFormAtend() {
  ['cliente','whatsapp','obs','transporte','desconto','data-atend'].forEach(function(id) {
    var el = document.getElementById(id); if (el) el.value = ''
  })
  document.getElementById('servicos-lista').innerHTML = ''
  _svcCount = 0
  adicionarServico()
  _fotoAntes = ''; _fotoDepois = ''
  var pa = document.getElementById('foto-antes-preview')
  var pd = document.getElementById('foto-depois-preview')
  if (pa) pa.style.display = 'none'
  if (pd) pd.style.display = 'none'
  document.getElementById('preview-box').style.display = 'none'
  var nail = document.getElementById('nail-art')
  if (nail) nail.value = 'nenhuma'
}

// ===== MOSTRAR RESULTADO =====
function mostrarResultado(res, info) {
  var pagtLabel = { dinheiro:'Dinheiro/Pix', cartao:'Cartão Crédito', debito:'Cartão Débito' }[res.pagamento] || ''
  var numStr = info.numAtend ? 'Atend. #' + String(info.numAtend).padStart(3,'0') : ''

  var svcHTML = (res.servicos||[]).map(function(s) {
    var cfg = getConfig()
    var mdo = (cfg.valorHora/60) * s.minutos
    var mg  = s.material * (cfg.minimoPeca/100)
    return '<div class="res-item"><span class="res-name">💅 ' + esc(s.nome) + '</span><span class="res-amount">' + fmt(s.material + mg + mdo) + '</span></div>'
  }).join('')

  var prejuizoHTML = ''
  if (res.emPrejuizo) {
    prejuizoHTML = '<div style="background:rgba(248,113,113,.1);border:1px solid rgba(248,113,113,.4);border-radius:10px;padding:14px 16px;margin:12px 0">' +
      '<div style="font-size:13px;font-weight:700;color:#f87171;margin-bottom:6px">⚠️ ATENÇÃO: Você está no prejuízo!</div>' +
      '<div style="font-size:13px;color:#fca5a5">Perdendo <strong>' + fmt(res.prejuizoPorAtend) + '</strong> neste atendimento.</div>' +
      '<div style="font-size:13px;color:#fca5a5;margin-top:4px">Preço mínimo para sua meta: <strong>' + fmt(res.precoMinimo) + '</strong></div>' +
      '</div>'
  }

  var retornoHTML = info.dataRetorno
    ? '<div style="background:rgba(236,72,153,.1);border:1px solid rgba(236,72,153,.3);border-radius:10px;padding:12px 16px;margin:12px 0;font-size:14px;color:#f9a8d4">📅 Retorno sugerido: <strong>' + info.dataRetorno + '</strong></div>'
    : ''

  var simuladorHTML = ''
  if (res.lucroMeta > 0 && !res.emPrejuizo && res.ganhoPotencial > 0) {
    simuladorHTML = '<div style="background:rgba(52,211,153,.08);border:1px solid rgba(52,211,153,.2);border-radius:10px;padding:14px 16px;margin:12px 0">' +
      '<div style="font-size:13px;font-weight:700;color:#34d399;margin-bottom:4px">💡 Se aumentar R$' + (getConfig().simuladorAumento||5) + ' por atendimento:</div>' +
      '<div style="font-size:13px;color:#6ee7b7">Você ganha <strong>' + fmt(res.ganhoPotencial) + ' a mais por mês</strong></div>' +
      '</div>'
  }

  var html = '<div class="resultado-header">' +
    '<div class="res-os-num">' + numStr + '</div>' +
    '<div class="res-label">Valor a cobrar da cliente</div>' +
    '<div class="res-valor">' + fmt(res.valorFinal) + '</div>' +
    '<div class="res-lucro">Lucro líquido: ' + fmt(res.lucroReal) + '</div>' +
    '</div>' +
    '<div class="resultado-body">' +
    svcHTML +
    (res.totalMargem > 0 ? '<div class="res-item"><span class="res-name">🛡️ Margem material (' + res.minimoPeca + '%)</span><span class="res-amount">' + fmt(res.totalMargem) + '</span></div>' : '') +
    '<div class="res-item"><span class="res-name">⏱️ Mão de obra</span><span class="res-amount">' + fmt(res.totalMaoDeObra) + '</span></div>' +
    '<div class="res-item"><span class="res-name">🧴 Insumos</span><span class="res-amount">' + fmt(res.insumos) + '</span></div>' +
    (res.desgasteTotal > 0 ? '<div class="res-item"><span class="res-name">🔧 Desgaste equipamentos</span><span class="res-amount">' + fmt(res.desgasteTotal) + '</span></div>' : '') +
    (res.nailArtValor > 0 ? '<div class="res-item"><span class="res-name">💅 Adicional nail art</span><span class="res-amount">' + fmt(res.nailArtValor) + '</span></div>' : '') +
    (res.transporte > 0 ? '<div class="res-item"><span class="res-name">🚗 Transporte</span><span class="res-amount">' + fmt(res.transporte) + '</span></div>' : '') +
    '<div class="res-item"><span class="res-name">🏢 Rateio fixo</span><span class="res-amount">' + fmt(res.rateioFixo) + '</span></div>' +
    (res.taxa > 0 ? '<div class="res-item"><span class="res-name">💳 Taxa ' + pagtLabel + '</span><span class="res-amount">' + fmt(res.taxa) + '</span></div>' : '') +
    (res.fundo > 0 ? '<div class="res-item"><span class="res-name">🏦 Fundo garantia</span><span class="res-amount">' + fmt(res.fundo) + '</span></div>' : '') +
    (res.desconto > 0 ? '<div class="res-item"><span class="res-name">🏷️ Desconto</span><span class="res-amount">-' + fmt(res.desconto) + '</span></div>' : '') +
    '<div class="res-item total"><span class="res-name">Total cobrado</span><span class="res-amount">' + fmt(res.valorFinal) + '</span></div>' +
    '<div class="res-item profit"><span class="res-name">✅ Lucro real</span><span class="res-amount">' + fmt(res.lucroReal) + '</span></div>' +
    '</div>' +
    retornoHTML + prejuizoHTML + simuladorHTML +
    '<div class="res-actions">' +
    (info.whatsapp ? '<button class="btn-share btn-wpp" onclick=\'compartilharWpp(' + JSON.stringify(res) + ',"' + esc(info.cliente) + '","' + esc(info.whatsapp||'') + '",' + (info.numAtend||0) + ',"' + (info.dataRetorno||'') + '")\'>📱 WhatsApp</button>' : '') +
    '<button class="btn-share btn-pdf" onclick=\'gerarPdfAtend(' + JSON.stringify(res) + ',"' + esc(info.cliente) + '","' + esc(info.whatsapp||'') + '","' + esc(info.obs||'') + '",' + (info.numAtend||0) + ',"' + (info.dataRetorno||'') + '","' + (info.atendId||'') + '")\'>📄 Comprovante</button>' +
    '</div>'

  var el = document.getElementById('resultado')
  el.innerHTML = html
  el.style.display = 'block'
  el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

// ===== PDF =====
var _pdfData = ''

function gerarPdfAtend(res, cliente, whatsapp, obs, numAtend, dataRetorno, atendId) {
  var cfg = getConfig()
  var data = new Date().toLocaleString('pt-BR')
  var numStr = numAtend ? 'Atend. #' + String(numAtend).padStart(3,'0') : 'Atendimento'
  var pagtLabel = { dinheiro:'Dinheiro / Pix', cartao:'Cartão de Crédito', debito:'Cartão de Débito' }[res.pagamento] || ''

  var fotoAntes = '', fotoDepois = ''
  if (atendId) {
    var atend = getAtendimentos().find(function(a) { return a.id === atendId })
    if (atend) { fotoAntes = atend.fotoAntes || ''; fotoDepois = atend.fotoDepois || '' }
  }

  var svcLinhas = (res.servicos||[]).map(function(s) {
    return '<tr><td>' + esc(s.nome) + '</td><td style="text-align:right">R$ ' + Number(s.material||0).toFixed(2).replace('.',',') + '</td><td style="text-align:right">' + s.minutos + 'min</td><td style="text-align:right">' + (s.retornoDias>0 ? s.retornoDias+'d' : '-') + '</td></tr>'
  }).join('')

  var fotosHTML = ''
  if (fotoAntes || fotoDepois) {
    fotosHTML = '<div style="margin:12px 0"><div style="font-weight:700;font-size:11px;text-transform:uppercase;color:#888;border-bottom:1px solid #eee;padding-bottom:4px;margin-bottom:8px">Antes & Depois</div>' +
      '<div style="display:flex;gap:10px">' +
      (fotoAntes ? '<div style="flex:1;text-align:center"><img src="' + fotoAntes + '" style="width:100%;border-radius:8px;border:1px solid #eee"><div style="font-size:10px;color:#888;margin-top:4px">Antes</div></div>' : '') +
      (fotoDepois ? '<div style="flex:1;text-align:center"><img src="' + fotoDepois + '" style="width:100%;border-radius:8px;border:1px solid #eee"><div style="font-size:10px;color:#888;margin-top:4px">Depois</div></div>' : '') +
      '</div></div>'
  }

  _pdfData = '<!DOCTYPE html><html><head><meta charset="UTF-8"><style>' +
    'body{font-family:Arial,sans-serif;font-size:13px;color:#111;max-width:420px;margin:0 auto;padding:20px}' +
    '.header{text-align:center;border-bottom:2px solid #be185d;padding-bottom:12px;margin-bottom:16px}' +
    '.logo{font-size:20px;font-weight:700;color:#be185d}' +
    '.num{font-size:22px;font-weight:700;color:#be185d;margin:4px 0}' +
    '.sec{font-weight:700;font-size:11px;text-transform:uppercase;color:#888;border-bottom:1px solid #eee;padding-bottom:4px;margin:12px 0 8px}' +
    '.row{display:flex;justify-content:space-between;padding:3px 0}' +
    '.row.total{font-weight:700;font-size:15px;border-top:2px solid #111;margin-top:6px;padding-top:6px}' +
    'table{width:100%;border-collapse:collapse;font-size:12px}' +
    'table th{background:#fdf2f8;text-align:left;padding:5px 4px;font-size:11px}' +
    'table td{padding:5px 4px;border-bottom:1px solid #f9f0f5}' +
    '.retorno{background:#fdf2f8;border:1px solid #be185d;border-radius:6px;padding:10px;text-align:center;margin:12px 0;font-size:14px;color:#be185d;font-weight:700}' +
    '.footer{text-align:center;margin-top:20px;font-size:11px;color:#999;border-top:1px solid #eee;padding-top:10px}' +
    '</style></head><body>' +
    '<div class="header"><div class="logo">💅 ' + esc(cfg.nomeSalao||'NailPRO') + '</div>' +
    (cfg.whatsappSalao ? '<div style="font-size:11px;color:#888">WhatsApp: ' + cfg.whatsappSalao + '</div>' : '') +
    '<div class="num">' + numStr + '</div>' +
    '<div style="font-size:11px;color:#888">' + data + '</div></div>' +
    '<div class="sec">Cliente</div>' +
    '<div class="row"><span>Nome</span><span><strong>' + esc(cliente) + '</strong></span></div>' +
    (whatsapp ? '<div class="row"><span>WhatsApp</span><span>' + whatsapp + '</span></div>' : '') +
    '<div class="row"><span>Pagamento</span><span>' + pagtLabel + '</span></div>' +
    (res.nailArtValor > 0 ? '<div class="row"><span>Nail Art</span><span>' + res.nailArt + ' (+' + fmt(res.nailArtValor) + ')</span></div>' : '') +
    '<div class="sec">Serviços</div>' +
    '<table><thead><tr><th>Serviço</th><th>Material</th><th>Tempo</th><th>Retorno</th></tr></thead><tbody>' + svcLinhas + '</tbody></table>' +
    (obs ? '<div class="sec">Observações</div><div style="background:#fdf2f8;border:1px solid #f3c6dc;border-radius:6px;padding:8px;font-size:12px">' + esc(obs) + '</div>' : '') +
    (dataRetorno ? '<div class="retorno">📅 Retorno: ' + dataRetorno + '</div>' : '') +
    fotosHTML +
    '<div class="sec">Resumo</div>' +
    (res.transporte > 0 ? '<div class="row"><span>Transporte</span><span>' + fmt(res.transporte) + '</span></div>' : '') +
    (res.desgasteTotal > 0 ? '<div class="row"><span>Desgaste equipamentos</span><span>' + fmt(res.desgasteTotal) + '</span></div>' : '') +
    (res.taxa > 0 ? '<div class="row"><span>Taxa ' + pagtLabel + '</span><span>' + fmt(res.taxa) + '</span></div>' : '') +
    (res.desconto > 0 ? '<div class="row"><span>Desconto</span><span>-' + fmt(res.desconto) + '</span></div>' : '') +
    '<div class="row total"><span>TOTAL</span><span>' + fmt(res.valorFinal) + '</span></div>' +
    '<div class="footer">Gerado por NailPRO · Obrigada pela preferência! 💅</div>' +
    '</body></html>'

  document.getElementById('pdf-preview-content').innerHTML = _pdfData
  document.getElementById('modal-pdf-overlay').classList.add('open')
}

function gerarPdfHistorico(id) {
  var atend = getAtendimentos().find(function(a) { return a.id === id })
  if (!atend) return
  var res = atend.detalhes || { valorFinal: atend.valorFinal, servicos: atend.servicos||[], transporte:0, desconto:0, taxa:0, pagamento: atend.pagamento||'dinheiro', nailArtValor:0, desgasteTotal:0 }
  gerarPdfAtend(res, atend.cliente, atend.whatsapp||'', atend.obs||'', atend.numAtend, atend.dataRetorno||'', atend.id)
}

function fecharModalPdf() { document.getElementById('modal-pdf-overlay').classList.remove('open') }

function imprimirPdf() {
  if (!_pdfData) return
  var w = window.open('','_blank')
  w.document.write(_pdfData); w.document.close(); w.focus()
  setTimeout(function() { w.print() }, 500)
}

// ===== WHATSAPP =====
function compartilharWpp(res, cliente, whatsapp, numAtend, dataRetorno) {
  var cfg = getConfig()
  var pagtLabel = { dinheiro:'Dinheiro/Pix', cartao:'Cartão Crédito', debito:'Cartão Débito' }[res.pagamento] || ''
  var numStr = numAtend ? 'Atend. #' + String(numAtend).padStart(3,'0') : ''
  var svcTxt = (res.servicos||[]).map(function(s){ return '💅 ' + s.nome }).join('\n')
  var loja = cfg.nomeSalao ? '*' + cfg.nomeSalao + '*\n' : ''
  var retornoTxt = dataRetorno ? '\n\n📅 *Retorno: ' + dataRetorno + '*' : ''
  var nailTxt = res.nailArtValor > 0 ? '\n🎨 Nail art: ' + res.nailArt : ''
  var txt = loja + '📋 *' + numStr + '*\n\n👤 ' + cliente + '\n\n' + svcTxt + nailTxt + '\n\n💳 ' + pagtLabel + '\n\n✅ *Total: ' + fmt(res.valorFinal) + '*' + retornoTxt
  var num = whatsapp ? 'https://wa.me/55' + whatsapp.replace(/\D/g,'') + '?text=' : 'https://wa.me/?text='
  window.open(num + encodeURIComponent(txt), '_blank')
}

function compartilharRetornoWpp(atendId) {
  var atend = getAtendimentos().find(function(a) { return a.id === atendId })
  if (!atend || !atend.whatsapp) return
  var cfg = getConfig()
  var loja = cfg.nomeSalao ? '*' + cfg.nomeSalao + '*' : 'NailPRO'
  var svcTxt = (atend.servicos||[]).map(function(s){ return s.nome }).join(', ')
  var txt = 'Olá ' + atend.cliente + '! 💅\n\n' + loja + ' aqui.\n\nSua manutenção de *' + svcTxt + '* está chegando!\n\n📅 *Retorno sugerido: ' + atend.dataRetorno + '*\n\nVamos agendar? 😊'
  window.open('https://wa.me/55' + atend.whatsapp.replace(/\D/g,'') + '?text=' + encodeURIComponent(txt), '_blank')
}
