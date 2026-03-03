'use strict'

// ===== UTILS =====
function fmt(v){return 'R$ '+Number(v||0).toFixed(2).replace('.',',')}
function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
function showToast(msg){const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),3000)}

// ===== NAVEGAÇÃO =====
const pageNames={dashboard:'Dashboard',novo:'Novo Atendimento',historico:'Histórico',agenda:'Agenda',clientes:'Clientes',galeria:'Galeria',estoque:'Estoque',relatorios:'Relatórios',servicos:'Tabela de Serviços',config:'Configurações'}

function abrirTela(id){
  document.querySelectorAll('.tela').forEach(t=>t.classList.remove('active'))
  const tela=document.getElementById(id)
  if(tela)tela.classList.add('active')
  document.querySelectorAll('.drawer-item').forEach(b=>b.classList.toggle('active',b.dataset.page===id))
  document.getElementById('topbar-page-name').textContent=pageNames[id]||''
  fecharDrawer()
  if(id==='dashboard')atualizarDashboard()
  if(id==='historico')atualizarHistorico()
  if(id==='agenda')atualizarAgenda()
  if(id==='clientes')atualizarClientes()
  if(id==='galeria')atualizarGaleria()
  if(id==='estoque')atualizarEstoque()
  if(id==='relatorios')atualizarRelatorios()
  if(id==='servicos')atualizarTabelaServicos()
  if(id==='config')carregarConfig()
  if(id==='equipamentos')atualizarEquipamentos()
  if(id==='prejuizo')abrirTelaPrejuizo()
}

function abrirDrawer(){document.getElementById('drawer').classList.add('open');document.getElementById('drawer-overlay').classList.add('open')}
function fecharDrawer(){document.getElementById('drawer').classList.remove('open');document.getElementById('drawer-overlay').classList.remove('open')}

// ===== DASHBOARD =====
function atualizarDashboard(){
  const atends=getAtendimentos()
  const hoje=new Date().toLocaleDateString('pt-BR')
  const mes=new Date().toLocaleDateString('pt-BR',{month:'2-digit',year:'numeric'})
  const atHoje=atends.filter(a=>a.data?.startsWith(hoje.split('/').reverse().join('/')))
  // Mês atual
  const atMes=atends.filter(a=>{
    if(!a.data)return false
    const d=new Date(a.data.split(', ')[0].split('/').reverse().join('-'))
    return d.getMonth()===new Date().getMonth()&&d.getFullYear()===new Date().getFullYear()
  })
  const fatMes=atMes.reduce((s,a)=>s+(a.valorFinal||0),0)
  const lucroMes=atMes.reduce((s,a)=>s+(a.lucroReal||0),0)
  const cfg=getConfig()

  // Retornos próximos (7 dias)
  const agenda=getAgenda()
  const hoje7=new Date(); hoje7.setDate(hoje7.getDate()+7)
  const retornos=agenda.filter(a=>{
    if(!a.dataHora)return false
    const d=new Date(a.dataHora)
    return d>=new Date()&&d<=hoje7
  })

  document.getElementById('dash-content').innerHTML=`
    <div class="dash-grid">
      <div class="dash-card destaque">
        <div class="dash-label">Atend. hoje</div>
        <div class="dash-value pink">${atHoje.length}</div>
      </div>
      <div class="dash-card destaque">
        <div class="dash-label">Atend. mês</div>
        <div class="dash-value pink">${atMes.length}</div>
      </div>
      <div class="dash-card">
        <div class="dash-label">Faturamento</div>
        <div class="dash-value" style="font-size:16px">${fmt(fatMes)}</div>
      </div>
      <div class="dash-card">
        <div class="dash-label">Lucro real</div>
        <div class="dash-value green" style="font-size:16px">${fmt(lucroMes)}</div>
      </div>
    </div>
    <div class="form-card" style="margin-bottom:16px">
      <div class="form-section-label">📊 Meta do mês</div>
      <div style="display:flex;justify-content:space-between;font-size:13px;color:var(--texto3);margin-bottom:6px">
        <span>${atMes.length} atendimentos</span><span>Meta: ${cfg.metaAtend}</span>
      </div>
      <div class="meta-bar"><div class="meta-fill" style="width:${Math.min(100,(atMes.length/cfg.metaAtend)*100)}%"></div></div>
    </div>
    ${retornos.length>0?`
    <div class="form-card" style="margin-bottom:16px;border-color:rgba(236,72,153,.3)">
      <div class="form-section-label">📅 Retornos próximos (7 dias)</div>
      ${retornos.map(r=>`
        <div class="mini-atend-card" style="margin-bottom:8px">
          <div class="mini-atend-cliente">💅 ${esc(r.cliente)}</div>
          <div class="mini-atend-info">${esc(r.servico||'')} · ${r.dataHora?new Date(r.dataHora).toLocaleDateString('pt-BR'):''}</div>
          ${r.whatsapp?`<button onclick="lembrarRetornoWpp('${r.id}')" style="margin-top:8px;background:rgba(37,211,102,.15);border:none;color:#25d366;padding:7px 14px;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer">📱 Lembrar no WhatsApp</button>`:''}
        </div>`).join('')}
    </div>`:''}
    <div class="form-card">
      <div class="form-section-label">Últimos atendimentos</div>
      ${atends.slice(0,3).map(a=>`
        <div class="mini-atend-card" onclick="abrirTela('historico')">
          <div class="mini-atend-num">Atend. #${String(a.numAtend||0).padStart(3,'0')}</div>
          <div class="mini-atend-cliente">${esc(a.cliente)}</div>
          <div class="mini-atend-info">${(a.servicos||[]).map(s=>s.nome).join(', ')}</div>
          <div class="mini-atend-valor">${fmt(a.lucroReal)} lucro</div>
        </div>`).join('')}
      ${atends.length===0?'<p style="color:var(--texto3);font-size:14px;text-align:center;padding:20px">Nenhum atendimento ainda</p>':''}
    </div>`
}

// ===== FOTOS =====
let _fotoAntes='', _fotoDepois=''

function setupFoto(inputId, previewId, varName){
  const input=document.getElementById(inputId)
  const preview=document.getElementById(previewId)
  if(!input)return
  input.addEventListener('change',e=>{
    const file=e.target.files[0]; if(!file)return
    const reader=new FileReader()
    reader.onload=ev=>{
      if(varName==='antes')_fotoAntes=ev.target.result
      else _fotoDepois=ev.target.result
      if(preview){preview.src=ev.target.result;preview.style.display='block'}
    }
    reader.readAsDataURL(file)
  })
}

// ===== SERVIÇOS NO FORM =====
let _svcCount=0

function adicionarServico(svc){
  _svcCount++
  const id=_svcCount
  const div=document.createElement('div')
  div.className='svc-item'
  div.dataset.svcId=id
  div.innerHTML=`
    <div class="svc-item-header">
      <span class="svc-item-num">Serviço ${id}</span>
      <button class="btn-remove-svc" onclick="removerServico(${id})">✕ Remover</button>
    </div>
    <div class="input-group">
      <label class="input-label">Nome do serviço</label>
      <input class="input-field svc-nome" placeholder="Ex: Esmaltação em gel" oninput="previewAtend()">
    </div>
    <div class="svc-row">
      <div class="input-group" style="margin:0">
        <label class="input-label">Material (R$)</label>
        <input class="input-field svc-material" type="number" placeholder="0,00" min="0" step="0.01" oninput="previewAtend()">
      </div>
      <div class="input-group" style="margin:0">
        <label class="input-label">Tempo (min)</label>
        <input class="input-field svc-minutos" type="number" placeholder="60" min="0" oninput="previewAtend()">
      </div>
      <div class="input-group" style="margin:0">
        <label class="input-label">Retorno (dias)</label>
        <input class="input-field svc-retorno" type="number" placeholder="21" min="0" value="${svc?.retornoDias||21}">
      </div>
    </div>`
  if(svc){
    div.querySelector('.svc-nome').value=svc.nome||''
    div.querySelector('.svc-material').value=svc.material||''
    div.querySelector('.svc-minutos').value=svc.minutos||''
  }
  document.getElementById('servicos-lista').appendChild(div)
  previewAtend()
}

function removerServico(id){
  const el=document.querySelector(`[data-svc-id="${id}"]`)
  if(el)el.remove()
  previewAtend()
}

function abrirTabelaServicos(){
  const servicos=getServicos()
  const modal=document.getElementById('modal-tabela-svc')
  const lista=document.getElementById('modal-tabela-lista')
  lista.innerHTML=servicos.map(s=>`
    <div style="background:var(--bg3);border:1px solid var(--borda);border-radius:10px;padding:12px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center">
      <div>
        <div style="font-weight:600;font-size:14px">${esc(s.nome)}</div>
        <div style="font-size:12px;color:var(--texto3)">Material: ${fmt(s.material)} · ${s.minutos}min · Retorno: ${s.retornoDias}d</div>
      </div>
      <button onclick="usarServico('${s.id}')" style="background:var(--grad);border:none;color:#fff;padding:8px 14px;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer">+ Usar</button>
    </div>`).join('')
  modal.classList.add('open')
}

function usarServico(id){
  const svc=getServicos().find(s=>s.id===id)
  if(svc)adicionarServico(svc)
  document.getElementById('modal-tabela-svc').classList.remove('open')
}

// ===== HISTÓRICO =====
let _filtroAtend='tudo', _buscaAtend=''

function atualizarHistorico(){
  let lista=getAtendimentos()
  if(_buscaAtend) lista=lista.filter(a=>a.cliente?.toLowerCase().includes(_buscaAtend)||
    (a.servicos||[]).some(s=>s.nome?.toLowerCase().includes(_buscaAtend)))
  if(_filtroAtend==='hoje') lista=lista.filter(a=>a.data?.includes(new Date().toLocaleDateString('pt-BR').slice(0,8)))
  if(_filtroAtend==='semana'){const d=new Date();d.setDate(d.getDate()-7);lista=lista.filter(a=>new Date(a.data?.split(', ')[0].split('/').reverse().join('-'))>=d)}
  if(_filtroAtend==='mes'){lista=lista.filter(a=>{const d=new Date(a.data?.split(', ')[0].split('/').reverse().join('-'));return d.getMonth()===new Date().getMonth()&&d.getFullYear()===new Date().getFullYear()})}
  if(_filtroAtend==='retorno') lista=lista.filter(a=>a.dataRetorno)

  const el=document.getElementById('historico-lista')
  el.innerHTML=lista.length===0?'<p style="color:var(--texto3);text-align:center;padding:40px">Nenhum atendimento encontrado</p>':
    lista.map(a=>{
      const svcs=(a.servicos||[])
      const statusCls={'agendado':'status-agendado','andamento':'status-andamento','pronta':'status-pronta','entregue':'status-entregue'}[a.status]||'status-andamento'
      const statusLabel={'agendado':'📅 Agendado','andamento':'🔧 Andamento','pronta':'✅ Pronta','entregue':'📦 Entregue'}[a.status]||'🔧 Andamento'
      return `<div class="atend-card">
        <div class="atend-card-top">
          <div>
            <div class="atend-num-badge">Atend. #${String(a.numAtend||0).padStart(3,'0')}</div>
            <div class="atend-cliente">${esc(a.cliente)}</div>
            <div class="atend-data">${a.data||''}</div>
            <div>${svcs.map(s=>`<span class="atend-svc-pill">💅 ${esc(s.nome)}</span>`).join('')}</div>
          </div>
          <select class="status-badge ${statusCls}" onchange="mudarStatus('${a.id}',this.value)" style="border:none;background:transparent;cursor:pointer;font-weight:700;font-size:11px">
            <option value="agendado" ${a.status==='agendado'?'selected':''}>📅 Agendado</option>
            <option value="andamento" ${a.status==='andamento'?'selected':''}>🔧 Andamento</option>
            <option value="pronta" ${a.status==='pronta'?'selected':''}>✅ Pronta</option>
            <option value="entregue" ${a.status==='entregue'?'selected':''}>📦 Entregue</option>
          </select>
        </div>
        ${a.dataRetorno?`<div class="atend-retorno"><span>📅 Retorno: ${a.dataRetorno}</span>${a.whatsapp?`<button onclick="compartilharRetornoWpp('${a.id}')" style="background:none;border:none;color:var(--pink);font-size:12px;font-weight:700;cursor:pointer">📱 Lembrar</button>`:''}</div>`:''}
        <div class="atend-valores">
          <div><div class="atend-val-label">Cobrado</div><div class="atend-val-num">${fmt(a.valorFinal)}</div></div>
          <div style="text-align:right"><div class="atend-val-label">Lucro real</div><div class="atend-val-num green">${fmt(a.lucroReal)}</div></div>
        </div>
        <div class="atend-actions">
          ${a.whatsapp?`<button class="btn-action wpp" onclick="compartilharWppHistorico('${a.id}')">📱 WPP</button>`:''}
          <button class="btn-action pdf" onclick="gerarPdfHistorico('${a.id}')">📄 PDF</button>
          ${a.dataRetorno?`<button class="btn-action retorno" onclick="compartilharRetornoWpp('${a.id}')">📅 Retorno</button>`:''}
          <button class="btn-action del" onclick="deletarAtend('${a.id}')">🗑️</button>
        </div>
      </div>`}).join('')
}

function mudarStatus(id, status){
  editarAtendimento(id,{status})
  showToast('✅ Status atualizado')
  atualizarHistorico()
}

function deletarAtend(id){
  if(!confirm('Excluir este atendimento?'))return
  excluirAtendimento(id)
  atualizarHistorico()
  showToast('🗑️ Atendimento excluído')
}

function compartilharWppHistorico(id){
  const a=getAtendimentos().find(x=>x.id===id); if(!a)return
  const res=a.detalhes||{valorFinal:a.valorFinal,servicos:a.servicos||[],pagamento:a.pagamento||'dinheiro'}
  compartilharWpp(res,a.cliente,a.whatsapp||'',a.numAtend,a.dataRetorno||'')
}

function lembrarRetornoWpp(agendId){
  const ag=getAgenda().find(a=>a.id===agendId); if(!ag||!ag.whatsapp)return
  const atend=ag.atendId?getAtendimentos().find(a=>a.id===ag.atendId):null
  if(atend)compartilharRetornoWpp(atend.id)
}

// ===== AGENDA =====
function atualizarAgenda(){
  const agenda=getAgenda()
  const agFutura=agenda.filter(a=>!a.dataHora||new Date(a.dataHora)>=new Date())
  const el=document.getElementById('agenda-lista')
  el.innerHTML=agFutura.length===0?'<p style="color:var(--texto3);text-align:center;padding:40px">Nenhum agendamento</p>':
    agFutura.map(a=>{
      const d=a.dataHora?new Date(a.dataHora):null
      return `<div class="agenda-card">
        <div class="agenda-data-box">
          <div class="agenda-dia">${d?d.getDate():'?'}</div>
          <div class="agenda-mes">${d?d.toLocaleString('pt-BR',{month:'short'}):''}</div>
        </div>
        <div class="agenda-info">
          <div class="agenda-cliente">💅 ${esc(a.cliente)}</div>
          <div class="agenda-svc">${esc(a.servico||'')}</div>
          ${d?`<div class="agenda-hora">🕐 ${d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</div>`:''}
          ${a.tipo==='retorno'?'<span class="agenda-tipo-retorno">📅 Retorno</span>':''}
        </div>
        <div style="display:flex;flex-direction:column;gap:6px">
          ${a.whatsapp?`<button onclick="confirmarAgendWpp('${a.id}')" style="background:rgba(37,211,102,.15);border:none;color:#25d366;padding:7px 10px;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer">📱</button>`:''}
          <button onclick="excluirAg('${a.id}')" style="background:rgba(248,113,113,.1);border:none;color:var(--red);padding:7px 10px;border-radius:8px;font-size:12px;cursor:pointer">🗑️</button>
        </div>
      </div>`}).join('')
}

function excluirAg(id){excluirAgendamento(id);atualizarAgenda();showToast('🗑️ Agendamento excluído')}

function salvarNovoAgend(){
  const cliente=document.getElementById('ag-cliente')?.value?.trim()
  const whatsapp=document.getElementById('ag-whatsapp')?.value?.trim()
  const dataHora=document.getElementById('ag-datahora')?.value
  const servico=document.getElementById('ag-servico')?.value?.trim()
  if(!cliente||!dataHora){showToast('⚠️ Preencha cliente e data/hora');return}
  salvarAgendamento({cliente,whatsapp,dataHora,servico,tipo:'novo'})
  document.getElementById('ag-cliente').value=''
  document.getElementById('ag-whatsapp').value=''
  document.getElementById('ag-datahora').value=''
  document.getElementById('ag-servico').value=''
  atualizarAgenda()
  showToast('✅ Agendamento salvo!')
}

function confirmarAgendWpp(id){
  const ag=getAgenda().find(a=>a.id===id); if(!ag||!ag.whatsapp)return
  const cfg=getConfig()
  const d=ag.dataHora?new Date(ag.dataHora):null
  const dataFmt=d?`${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}`:''
  const loja=cfg.nomeSalao?`*${cfg.nomeSalao}*`:'NailPRO'
  const txt=`Olá ${ag.cliente}! 💅\n\n${loja} aqui.\n\nConfirmando seu agendamento:\n📅 *${dataFmt}*\n💅 ${ag.servico||'Atendimento'}\n\nVocê confirma? 😊`
  window.open(`https://wa.me/55${ag.whatsapp.replace(/\D/g,'')}?text=${encodeURIComponent(txt)}`,'_blank')
}

// ===== CLIENTES =====
function atualizarClientes(){
  const clientes=getClientes()
  const busca=document.getElementById('busca-cliente')?.value?.toLowerCase()||''
  const lista=busca?clientes.filter(c=>c.nome?.toLowerCase().includes(busca)):clientes
  const el=document.getElementById('clientes-lista')
  el.innerHTML=lista.length===0?'<p style="color:var(--texto3);text-align:center;padding:40px">Nenhuma cliente cadastrada</p>':
    lista.map(c=>{
      const atends=getAtendimentos().filter(a=>a.cliente?.toLowerCase()===c.nome?.toLowerCase())
      const totalGasto=atends.reduce((s,a)=>s+(a.valorFinal||0),0)
      return `<div class="cliente-card">
        <div class="cliente-avatar">${c.nome?.charAt(0).toUpperCase()}</div>
        <div class="cliente-info">
          <div class="cliente-nome">${esc(c.nome)}</div>
          <div class="cliente-meta">${atends.length} atend. · ${fmt(totalGasto)} total · Última: ${c.ultimaVisita?.split(', ')[0]||'-'}</div>
          ${c.whatsapp?`<div class="cliente-meta" style="margin-top:2px">📱 ${c.whatsapp}</div>`:''}
        </div>
        ${c.whatsapp?`<button class="cliente-wpp" onclick="window.open('https://wa.me/55${c.whatsapp.replace(/\D/g,'')}','_blank')">📱</button>`:''}
      </div>`}).join('')
}

// ===== GALERIA =====
function atualizarGaleria(){
  const fotos=getGaleria()
  const el=document.getElementById('galeria-grid')
  el.innerHTML=fotos.length===0?'<p style="color:var(--texto3);text-align:center;padding:40px;grid-column:span 3">Nenhuma foto ainda</p>':
    fotos.map(f=>`<div class="galeria-item" onclick="verFotoGaleria('${f.id}')">
      <img src="${f.foto}" alt="${esc(f.cliente||'')}">
      <div class="galeria-item-info">${esc(f.cliente||'')}</div>
    </div>`).join('')
}

let _fotoGaleriaInput=null

function adicionarFotoGaleria(){
  const input=document.createElement('input')
  input.type='file';input.accept='image/*'
  input.onchange=e=>{
    const file=e.target.files[0]; if(!file)return
    const cliente=prompt('Nome da cliente (opcional):')||''
    const reader=new FileReader()
    reader.onload=ev=>{
      salvarFotoGaleria({foto:ev.target.result,cliente})
      atualizarGaleria()
      showToast('✅ Foto adicionada!')
    }
    reader.readAsDataURL(file)
  }
  input.click()
}

function verFotoGaleria(id){
  const f=getGaleria().find(x=>x.id===id); if(!f)return
  const overlay=document.createElement('div')
  overlay.style.cssText='position:fixed;inset:0;z-index:500;background:rgba(0,0,0,.9);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px'
  overlay.innerHTML=`<img src="${f.foto}" style="max-width:100%;max-height:70vh;border-radius:12px;object-fit:contain">
    <div style="color:#fff;margin-top:12px;font-size:14px">${esc(f.cliente||'')} · ${f.data||''}</div>
    <div style="display:flex;gap:12px;margin-top:16px">
      <button onclick="this.closest('div[style]').remove()" style="background:var(--bg3);border:1px solid var(--borda);color:#fff;padding:10px 20px;border-radius:8px;cursor:pointer">Fechar</button>
      <button onclick="excluirFotoGaleria('${id}');atualizarGaleria();this.closest('div[style]').remove();showToast('🗑️ Foto excluída')" style="background:rgba(248,113,113,.2);border:1px solid var(--red);color:var(--red);padding:10px 20px;border-radius:8px;cursor:pointer">🗑️ Excluir</button>
    </div>`
  document.body.appendChild(overlay)
}

// ===== ESTOQUE =====
function atualizarEstoque(){
  const estoque=getEstoque()
  const el=document.getElementById('estoque-lista')
  el.innerHTML=estoque.length===0?'<p style="color:var(--texto3);text-align:center;padding:40px">Estoque vazio</p>':
    estoque.map(item=>{
      const vencido=item.validade&&new Date(item.validade)<new Date()
      const baixo=item.qtdAtual<=item.qtdMinima
      const cls=vencido?'estoque-vencido':baixo?'estoque-baixo':'estoque-ok'
      const label=vencido?'⚠️ Vencido':baixo?'⚠️ Baixo':'✅ OK'
      return `<div class="estoque-item">
        <div>
          <div class="estoque-nome">${esc(item.nome)}</div>
          <div class="estoque-qtd">Qtd: ${item.qtdAtual} ${item.unidade||''} · Mín: ${item.qtdMinima||0}</div>
          ${item.validade?`<div style="font-size:11px;color:var(--texto3)">Validade: ${new Date(item.validade).toLocaleDateString('pt-BR')}</div>`:''}
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px">
          <span class="estoque-badge ${cls}">${label}</span>
          <button onclick="editarEstoqueItem('${item.id}')" style="font-size:11px;background:none;border:none;color:var(--texto3);cursor:pointer">✏️ Editar</button>
        </div>
      </div>`}).join('')
}

function salvarItemEstoque(){
  const nome=document.getElementById('est-nome')?.value?.trim()
  if(!nome){showToast('⚠️ Informe o nome do produto');return}
  adicionarItemEstoque({
    nome,
    qtdAtual: Number(document.getElementById('est-qtd')?.value)||0,
    qtdMinima: Number(document.getElementById('est-qtd-min')?.value)||0,
    unidade: document.getElementById('est-unidade')?.value?.trim()||'un',
    validade: document.getElementById('est-validade')?.value||null,
    custo: Number(document.getElementById('est-custo')?.value)||0
  })
  document.getElementById('est-nome').value=''
  document.getElementById('est-qtd').value=''
  document.getElementById('est-qtd-min').value=''
  document.getElementById('est-validade').value=''
  document.getElementById('est-custo').value=''
  atualizarEstoque()
  showToast('✅ Item adicionado!')
}

function editarEstoqueItem(id){
  const item=getEstoque().find(e=>e.id===id); if(!item)return
  const nova=prompt(`Nova quantidade para "${item.nome}":`,item.qtdAtual)
  if(nova===null)return
  atualizarItemEstoque(id,{qtdAtual:Number(nova)||0})
  atualizarEstoque()
  showToast('✅ Estoque atualizado!')
}

// ===== TABELA DE SERVIÇOS =====
function atualizarTabelaServicos(){
  const servicos=getServicos()
  const el=document.getElementById('tabela-servicos-lista')
  el.innerHTML=servicos.map(s=>`
    <div class="estoque-item">
      <div>
        <div class="estoque-nome">${esc(s.nome)}</div>
        <div class="estoque-qtd">Material: ${fmt(s.material)} · ${s.minutos}min · Retorno: ${s.retornoDias}d</div>
      </div>
      <div style="display:flex;gap:6px">
        <button onclick="editarServicoPadrao('${s.id}')" style="background:rgba(236,72,153,.1);border:none;color:var(--pink);padding:7px 12px;border-radius:8px;font-size:12px;cursor:pointer">✏️</button>
        <button onclick="excluirServicoPadrao('${s.id}')" style="background:rgba(248,113,113,.1);border:none;color:var(--red);padding:7px 12px;border-radius:8px;font-size:12px;cursor:pointer">🗑️</button>
      </div>
    </div>`).join('')
}

function salvarNovoServico(){
  const nome=document.getElementById('svc-pad-nome')?.value?.trim()
  if(!nome){showToast('⚠️ Informe o nome');return}
  const lista=getServicos()
  lista.push({
    id:Date.now().toString(),
    nome,
    material: Number(document.getElementById('svc-pad-material')?.value)||0,
    minutos:  Number(document.getElementById('svc-pad-minutos')?.value)||0,
    retornoDias: Number(document.getElementById('svc-pad-retorno')?.value)||21
  })
  salvarServicos(lista)
  document.getElementById('svc-pad-nome').value=''
  document.getElementById('svc-pad-material').value=''
  document.getElementById('svc-pad-minutos').value=''
  document.getElementById('svc-pad-retorno').value=''
  atualizarTabelaServicos()
  showToast('✅ Serviço adicionado!')
}

function excluirServicoPadrao(id){
  salvarServicos(getServicos().filter(s=>s.id!==id))
  atualizarTabelaServicos()
  showToast('🗑️ Serviço excluído')
}

function editarServicoPadrao(id){
  const s=getServicos().find(x=>x.id===id); if(!s)return
  const novo=prompt(`Novo valor de material para "${s.nome}":`,s.material)
  if(novo===null)return
  const lista=getServicos()
  const i=lista.findIndex(x=>x.id===id)
  if(i!==-1){lista[i].material=Number(novo)||0;salvarServicos(lista)}
  atualizarTabelaServicos()
  showToast('✅ Atualizado!')
}

// ===== RELATÓRIOS =====
function atualizarRelatorios(){
  const atends=getAtendimentos()
  const meses={}
  atends.forEach(a=>{
    if(!a.data)return
    const d=new Date(a.data.split(', ')[0].split('/').reverse().join('-'))
    const key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
    if(!meses[key])meses[key]={fat:0,lucro:0,qtd:0,label:d.toLocaleString('pt-BR',{month:'long',year:'numeric'})}
    meses[key].fat+=a.valorFinal||0
    meses[key].lucro+=a.lucroReal||0
    meses[key].qtd++
  })
  const el=document.getElementById('relatorios-content')
  const keys=Object.keys(meses).sort().reverse()
  el.innerHTML=keys.length===0?'<p style="color:var(--texto3);text-align:center;padding:40px">Nenhum dado ainda</p>':
    keys.map(k=>{const m=meses[k];return `
      <div class="form-card" style="margin-bottom:12px">
        <div class="form-section-label">${m.label}</div>
        <div class="dash-grid" style="margin-bottom:0">
          <div class="dash-card"><div class="dash-label">Atendimentos</div><div class="dash-value pink">${m.qtd}</div></div>
          <div class="dash-card"><div class="dash-label">Faturamento</div><div class="dash-value" style="font-size:16px">${fmt(m.fat)}</div></div>
          <div class="dash-card" style="grid-column:span 2"><div class="dash-label">Lucro real</div><div class="dash-value green" style="font-size:18px">${fmt(m.lucro)}</div></div>
        </div>
      </div>`}).join('')
}

// ===== CONFIG =====
function carregarConfig(){
  const c=getConfig()
  const ids=['nomeSalao','whatsappSalao','nailArtSimples','nailArtMedia','nailArtComplexa','valorHora','margem','taxaCartao','taxaDebito','comissao','fundo','custoFixo','metaAtend','insumos','minimoPeca']
  ids.forEach(id=>{const el=document.getElementById(id);if(el)el.value=c[id]??''})
}

function salvarConfigForm(){
  const c=getConfig()
  const ids=['nomeSalao','whatsappSalao','nailArtSimples','nailArtMedia','nailArtComplexa','valorHora','margem','taxaCartao','taxaDebito','comissao','fundo','custoFixo','metaAtend','insumos','minimoPeca']
  ids.forEach(id=>{const el=document.getElementById(id);if(el)c[id]=isNaN(Number(el.value))||id==='nomeSalao'||id==='whatsappSalao'?el.value:Number(el.value)})
  salvarConfig(c)
  showToast('✅ Configurações salvas!')
}

async function verificarAtualizacao(){
  const btn=document.getElementById('btn-update')
  const status=document.getElementById('update-status')
  if(btn){btn.textContent='⏳ Verificando...';btn.disabled=true}
  try{
    if('caches' in window){const keys=await caches.keys();await Promise.all(keys.map(k=>caches.delete(k)))}
    if(status)status.textContent='✅ Recarregando...'
    setTimeout(()=>window.location.reload(true),1000)
  }catch{setTimeout(()=>window.location.reload(true),500)}
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded',()=>{
  abrirTela('dashboard')
  setupFoto('foto-antes-input','foto-antes-preview','antes')
  setupFoto('foto-depois-input','foto-depois-preview','depois')
  adicionarServico()
  document.getElementById('busca-historico')?.addEventListener('input',e=>{_buscaAtend=e.target.value.toLowerCase();atualizarHistorico()})
  document.getElementById('busca-cliente')?.addEventListener('input',()=>atualizarClientes())
  if('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(()=>{})
})

// ===== EQUIPAMENTOS =====
function atualizarEquipamentos() {
  const lista = getEquipamentos()
  const el = document.getElementById('equipamentos-lista')
  el.innerHTML = lista.length === 0 ? '<p style="color:var(--texto3);text-align:center;padding:30px">Nenhum equipamento cadastrado</p>' :
    lista.map(e => {
      const custoPorAtend = e.vidaUtil > 0 ? (e.custo / e.vidaUtil) : 0
      return `<div class="estoque-item">
        <div>
          <div class="estoque-nome">${esc(e.nome)}</div>
          <div class="estoque-qtd">Custo: ${fmt(e.custo)} · Vida útil: ${e.vidaUtil} atend.</div>
          <div style="font-size:12px;color:var(--pink);margin-top:2px">Custo por atendimento: ${fmt(custoPorAtend)}</div>
        </div>
        <button onclick="excluirEquipamento('${e.id}');atualizarEquipamentos();previewAtend()" style="background:rgba(248,113,113,.1);border:none;color:var(--red);padding:8px 12px;border-radius:8px;font-size:13px;cursor:pointer">🗑️</button>
      </div>`
    }).join('')
}

function salvarEquipamento() {
  const nome = document.getElementById('eq-nome')?.value?.trim()
  if (!nome) { showToast('⚠️ Informe o nome'); return }
  adicionarEquipamento({
    nome,
    custo: Number(document.getElementById('eq-custo')?.value) || 0,
    vidaUtil: Number(document.getElementById('eq-vida')?.value) || 1
  })
  document.getElementById('eq-nome').value = ''
  document.getElementById('eq-custo').value = ''
  document.getElementById('eq-vida').value = ''
  document.getElementById('eq-preview').textContent = ''
  atualizarEquipamentos()
  showToast('✅ Equipamento adicionado!')
}

// Preview do custo por atendimento ao digitar
document.addEventListener('DOMContentLoaded', () => {
  const previewEq = () => {
    const custo = Number(document.getElementById('eq-custo')?.value) || 0
    const vida = Number(document.getElementById('eq-vida')?.value) || 0
    const el = document.getElementById('eq-preview')
    if (el && custo > 0 && vida > 0) {
      el.textContent = `💡 Custo por atendimento: R$ ${(custo/vida).toFixed(2).replace('.',',')}`
    } else if (el) { el.textContent = '' }
  }
  document.getElementById('eq-custo')?.addEventListener('input', previewEq)
  document.getElementById('eq-vida')?.addEventListener('input', previewEq)
})

// ===== TELA PREJUÍZO =====
function abrirTelaPrejuizo() {
  const cfg = getConfig()
  if (cfg.lucroDesejado) document.getElementById('meta-lucro').value = cfg.lucroDesejado
  if (cfg.diasTrabalho) document.getElementById('meta-dias').value = cfg.diasTrabalho
  if (cfg.atendDia) document.getElementById('meta-atend-dia').value = cfg.atendDia
  if (cfg.simuladorAumento) document.getElementById('sim-aumento').value = cfg.simuladorAumento
  calcularMeta()
  calcularSimulador()
  analisarPrejuizo()
}

function calcularMeta() {
  const lucro = Number(document.getElementById('meta-lucro')?.value) || 0
  const dias = Number(document.getElementById('meta-dias')?.value) || 22
  const atendDia = Number(document.getElementById('meta-atend-dia')?.value) || 6
  const el = document.getElementById('meta-resultado')
  if (lucro === 0) { if (el) el.style.display = 'none'; return }

  const totalAtend = dias * atendDia
  const lucroMinPorAtend = totalAtend > 0 ? lucro / totalAtend : 0

  // Custo fixo médio por atendimento
  const cfg = getConfig()
  const custoFixoPorAtend = cfg.custoFixo / (totalAtend || 1)
  const precoMinimo = custoFixoPorAtend + cfg.insumos + lucroMinPorAtend

  if (el) {
    el.style.display = 'block'
    document.getElementById('meta-preco-min').textContent = fmt(precoMinimo)
    document.getElementById('meta-breakdown').textContent =
      `${totalAtend} atendimentos/mês · Lucro mín/atend: ${fmt(lucroMinPorAtend)}`
  }
}

function salvarMeta() {
  const cfg = getConfig()
  cfg.lucroDesejado = Number(document.getElementById('meta-lucro')?.value) || 0
  cfg.diasTrabalho = Number(document.getElementById('meta-dias')?.value) || 22
  cfg.atendDia = Number(document.getElementById('meta-atend-dia')?.value) || 6
  cfg.simuladorAumento = Number(document.getElementById('sim-aumento')?.value) || 5
  salvarConfig(cfg)
  showToast('✅ Meta salva! Agora o app detecta prejuízo automaticamente.')
}

function calcularSimulador() {
  const aumento = Number(document.getElementById('sim-aumento')?.value) || 0
  const atend = Number(document.getElementById('sim-atend')?.value) || 0
  const el = document.getElementById('sim-resultado')
  if (aumento === 0 || atend === 0) { if (el) el.style.display = 'none'; return }
  const ganhoMes = aumento * atend
  const ganhoAno = ganhoMes * 12
  if (el) {
    el.style.display = 'block'
    document.getElementById('sim-ganho').textContent = fmt(ganhoMes)
    document.getElementById('sim-ano').textContent = `R$ ${ganhoAno.toFixed(2).replace('.',',')} a mais por ano`
  }
}

function analisarPrejuizo() {
  const atends = getAtendimentos().slice(0, 10)
  const cfg = getConfig()
  const el = document.getElementById('analise-prejuizo')
  if (!el) return
  if (atends.length === 0) { el.innerHTML = '<p style="color:var(--texto3);font-size:13px">Nenhum atendimento ainda</p>'; return }

  const lucroMeta = cfg.lucroDesejado || 0
  const totalAtend = (cfg.diasTrabalho||22) * (cfg.atendDia||6)
  const lucroMin = totalAtend > 0 ? lucroMeta / totalAtend : 0

  el.innerHTML = atends.map(a => {
    const lucro = a.lucroReal || 0
    const emPrejuizo = lucroMeta > 0 && lucro < lucroMin
    const diff = lucro - lucroMin
    return `<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--borda)">
      <div>
        <div style="font-size:13px;font-weight:600">${esc(a.cliente)} · Atend. #${String(a.numAtend||0).padStart(3,'0')}</div>
        <div style="font-size:11px;color:var(--texto3)">${(a.servicos||[]).map(s=>s.nome).join(', ')}</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:14px;font-weight:700;color:${emPrejuizo?'var(--red)':'var(--green)'}">${fmt(lucro)}</div>
        ${lucroMeta > 0 ? `<div style="font-size:11px;color:${emPrejuizo?'var(--red)':'var(--texto3)'}">${emPrejuizo?'⚠️ -':'✅ +'} ${fmt(Math.abs(diff))}</div>` : ''}
      </div>
    </div>`
  }).join('')
}

