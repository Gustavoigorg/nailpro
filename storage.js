// ===== NAILPRO STORAGE =====
'use strict'

function getConfig() {
  const d = {
    nomeSalao: '', whatsappSalao: '',
    valorHora: 60, margem: 30,
    taxaCartao: 3.5, taxaDebito: 1.5,
    comissao: 0, fundo: 5,
    custoFixo: 1500, metaAtend: 30,
    insumos: 8, minimoPeca: 20
  }
  try { return { ...d, ...JSON.parse(localStorage.getItem('np_config') || '{}') } } catch { return d }
}
function salvarConfig(c) { localStorage.setItem('np_config', JSON.stringify(c)) }

function getAtendimentos() {
  try { return JSON.parse(localStorage.getItem('np_atendimentos') || '[]') } catch { return [] }
}
function getProximoNumAtend() {
  const h = getAtendimentos()
  return h.length === 0 ? 1 : Math.max(...h.map(a => a.numAtend || 0)) + 1
}
function salvarAtendimento(atend) {
  const h = getAtendimentos()
  atend.id = Date.now().toString()
  atend.data = new Date().toLocaleString('pt-BR')
  atend.status = atend.status || 'agendado'
  atend.numAtend = getProximoNumAtend()
  h.unshift(atend)
  localStorage.setItem('np_atendimentos', JSON.stringify(h))
  return { numAtend: atend.numAtend, atendId: atend.id }
}
function excluirAtendimento(id) {
  localStorage.setItem('np_atendimentos', JSON.stringify(getAtendimentos().filter(a => a.id !== id)))
}
function editarAtendimento(id, campos) {
  const h = getAtendimentos()
  const i = h.findIndex(a => a.id === id)
  if (i !== -1) { h[i] = { ...h[i], ...campos }; localStorage.setItem('np_atendimentos', JSON.stringify(h)) }
}

function getClientes() {
  try { return JSON.parse(localStorage.getItem('np_clientes') || '[]') } catch { return [] }
}
function salvarCliente(cliente) {
  const lista = getClientes()
  const existente = lista.find(c => c.nome.toLowerCase() === cliente.nome.toLowerCase())
  if (existente) {
    existente.whatsapp = cliente.whatsapp || existente.whatsapp
    existente.ultimaVisita = new Date().toLocaleString('pt-BR')
    localStorage.setItem('np_clientes', JSON.stringify(lista))
    return existente.id
  }
  cliente.id = Date.now().toString()
  cliente.dataCadastro = new Date().toLocaleString('pt-BR')
  cliente.ultimaVisita = new Date().toLocaleString('pt-BR')
  lista.unshift(cliente)
  localStorage.setItem('np_clientes', JSON.stringify(lista))
  return cliente.id
}

function getAgenda() {
  try { return JSON.parse(localStorage.getItem('np_agenda') || '[]') } catch { return [] }
}
function salvarAgendamento(ag) {
  const lista = getAgenda()
  ag.id = ag.id || Date.now().toString()
  ag.criadoEm = ag.criadoEm || new Date().toLocaleString('pt-BR')
  const idx = lista.findIndex(a => a.id === ag.id)
  if (idx !== -1) lista[idx] = ag; else lista.push(ag)
  lista.sort((a,b) => new Date(a.dataHora) - new Date(b.dataHora))
  localStorage.setItem('np_agenda', JSON.stringify(lista))
}
function excluirAgendamento(id) {
  localStorage.setItem('np_agenda', JSON.stringify(getAgenda().filter(a => a.id !== id)))
}

function getServicos() {
  try {
    const s = JSON.parse(localStorage.getItem('np_servicos') || '[]')
    if (s.length > 0) return s
  } catch {}
  return [
    { id:'1', nome:'Esmaltação simples', material:15, minutos:45, retornoDias:14 },
    { id:'2', nome:'Esmaltação em gel',  material:35, minutos:90, retornoDias:21 },
    { id:'3', nome:'Unhas acrílicas',    material:80, minutos:120,retornoDias:21 },
    { id:'4', nome:'Fibra de vidro',     material:70, minutos:110,retornoDias:21 },
    { id:'5', nome:'Blindagem',          material:45, minutos:60, retornoDias:21 },
    { id:'6', nome:'Manutenção gel',     material:25, minutos:60, retornoDias:21 },
    { id:'7', nome:'Nail art',           material:20, minutos:30, retornoDias:0  },
    { id:'8', nome:'Remoção',            material:10, minutos:30, retornoDias:0  },
  ]
}
function salvarServicos(lista) { localStorage.setItem('np_servicos', JSON.stringify(lista)) }

function getEstoque() {
  try { return JSON.parse(localStorage.getItem('np_estoque') || '[]') } catch { return [] }
}
function salvarEstoque(lista) { localStorage.setItem('np_estoque', JSON.stringify(lista)) }
function adicionarItemEstoque(item) {
  const lista = getEstoque()
  item.id = Date.now().toString()
  item.dataEntrada = new Date().toLocaleString('pt-BR')
  lista.unshift(item)
  localStorage.setItem('np_estoque', JSON.stringify(lista))
}
function atualizarItemEstoque(id, campos) {
  const lista = getEstoque()
  const i = lista.findIndex(e => e.id === id)
  if (i !== -1) { lista[i] = { ...lista[i], ...campos }; localStorage.setItem('np_estoque', JSON.stringify(lista)) }
}

function getGaleria() {
  try { return JSON.parse(localStorage.getItem('np_galeria') || '[]') } catch { return [] }
}
function salvarFotoGaleria(foto) {
  const lista = getGaleria()
  foto.id = Date.now().toString()
  foto.data = new Date().toLocaleString('pt-BR')
  lista.unshift(foto)
  localStorage.setItem('np_galeria', JSON.stringify(lista))
}
function excluirFotoGaleria(id) {
  localStorage.setItem('np_galeria', JSON.stringify(getGaleria().filter(f => f.id !== id)))
}

function exportarDados() {
  const dados = { versao:'nailpro-v1', data:new Date().toLocaleString('pt-BR'),
    config:getConfig(), atendimentos:getAtendimentos(), clientes:getClientes(),
    agenda:getAgenda(), servicos:getServicos(), estoque:getEstoque() }
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([JSON.stringify(dados,null,2)],{type:'application/json'}))
  a.download = `nailpro-backup-${Date.now()}.json`; a.click()
}
function importarDados(input) {
  const file = input.files[0]; if (!file) return
  const reader = new FileReader()
  reader.onload = e => {
    try {
      const d = JSON.parse(e.target.result)
      if (d.config) localStorage.setItem('np_config', JSON.stringify(d.config))
      if (d.atendimentos) localStorage.setItem('np_atendimentos', JSON.stringify(d.atendimentos))
      if (d.clientes) localStorage.setItem('np_clientes', JSON.stringify(d.clientes))
      if (d.agenda) localStorage.setItem('np_agenda', JSON.stringify(d.agenda))
      if (d.servicos) localStorage.setItem('np_servicos', JSON.stringify(d.servicos))
      if (d.estoque) localStorage.setItem('np_estoque', JSON.stringify(d.estoque))
      showToast('✅ Backup importado!'); setTimeout(() => location.reload(), 1000)
    } catch { showToast('❌ Arquivo inválido') }
  }
  reader.readAsText(file)
}
function limparTodosDados() {
  if (!confirm('Apagar TODOS os dados?')) return
  ['np_config','np_atendimentos','np_clientes','np_agenda','np_servicos','np_estoque','np_galeria'].forEach(k => localStorage.removeItem(k))
  showToast('🗑️ Dados apagados'); setTimeout(() => location.reload(), 1000)
}

// ===== EQUIPAMENTOS (depreciação) =====
function getEquipamentos() {
  try { return JSON.parse(localStorage.getItem('np_equipamentos') || '[]') } catch { return [] }
}
function salvarEquipamentos(lista) { localStorage.setItem('np_equipamentos', JSON.stringify(lista)) }
function adicionarEquipamento(item) {
  const lista = getEquipamentos()
  item.id = Date.now().toString()
  lista.push(item)
  localStorage.setItem('np_equipamentos', JSON.stringify(lista))
}
function excluirEquipamento(id) {
  localStorage.setItem('np_equipamentos', JSON.stringify(getEquipamentos().filter(e => e.id !== id)))
}
