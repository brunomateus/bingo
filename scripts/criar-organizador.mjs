// Bootstrap do primeiro Organizador (SPEC.md §2): o app não tem tela para isso,
// porque só um Organizador cadastra Membros — alguém precisa existir antes.
// Também promove quem já está cadastrado (ex.: um Membro vindo da importação do
// Histórico, que nasce como Membro comum).
// Este script fala com o EMULADOR do Firestore; no projeto real, faça o mesmo
// cadastro pelo console (coleção `membros`, id = e-mail em minúsculas).
//
// Uso: node scripts/criar-organizador.mjs "Ana Silva" ana@exemplo.com [projeto]

const [nome, email, projeto = 'demo-bingo'] = process.argv.slice(2)
const EMULADOR = process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080'
// O emulador reconhece este token como acesso de owner, ignorando as regras.
const CABECALHOS = { 'Content-Type': 'application/json', Authorization: 'Bearer owner' }

function exigirArgumentos() {
  if (!nome || !email) {
    throw new Error(
      `Argumentos insuficientes: recebi ${JSON.stringify(process.argv.slice(2))}. ` +
        'Esperado: node scripts/criar-organizador.mjs "Nome" email@dominio.tld [projeto]'
    )
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error(`E-mail inválido: ${JSON.stringify(email)}. Esperado o formato "nome@dominio.tld".`)
  }
}

function raizDosMembros() {
  return `http://${EMULADOR}/v1/projects/${projeto}/databases/(default)/documents/membros`
}

/** Campos do papel, no formato REST — `uid` fica de fora, ele é vínculo do login. */
function camposDoOrganizador(id) {
  return {
    nome: { stringValue: nome },
    email: { stringValue: id },
    papel: { stringValue: 'organizador' },
    status: { stringValue: 'ativo' }
  }
}

async function jaCadastrado(id) {
  const resposta = await fetch(`${raizDosMembros()}/${encodeURIComponent(id)}`, { headers: CABECALHOS })
  return resposta.ok
}

async function gravar(url, metodo, corpo, id) {
  const resposta = await fetch(url, { method: metodo, headers: CABECALHOS, body: JSON.stringify(corpo) })
  if (!resposta.ok) {
    throw new Error(
      `Falha ao gravar membros/${id} em ${EMULADOR}: HTTP ${resposta.status} ${await resposta.text()}. ` +
        'Esperado 200 — o emulador está rodando (npm run emulador)?'
    )
  }
}

/**
 * Promove sem tocar no `uid`: quem já entrou no app perderia o vínculo com a
 * conta do Auth se o documento fosse reescrito inteiro.
 */
async function promover(id) {
  const mascara = ['nome', 'email', 'papel', 'status'].map((campo) => `updateMask.fieldPaths=${campo}`).join('&')
  const url = `${raizDosMembros()}/${encodeURIComponent(id)}?${mascara}`
  await gravar(url, 'PATCH', { fields: camposDoOrganizador(id) }, id)
  console.log(`Membro promovido a Organizador: membros/${id} (${nome}) no projeto ${projeto}.`)
}

async function criar(id) {
  const url = `${raizDosMembros()}?documentId=${encodeURIComponent(id)}`
  const fields = { ...camposDoOrganizador(id), uid: { nullValue: null } }
  await gravar(url, 'POST', { fields }, id)
  console.log(`Organizador criado: membros/${id} (${nome}) no projeto ${projeto}.`)
}

async function garantirOrganizador() {
  const id = email.trim().toLowerCase()
  return (await jaCadastrado(id)) ? promover(id) : criar(id)
}

exigirArgumentos()
await garantirOrganizador()
