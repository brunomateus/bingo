// Bootstrap do primeiro Organizador (SPEC.md §2): o app não tem tela para isso,
// porque só um Organizador cadastra Membros — alguém precisa existir antes.
// Este script fala com o EMULADOR do Firestore; no projeto real, faça o mesmo
// cadastro pelo console (coleção `membros`, id = e-mail em minúsculas).
//
// Uso: node scripts/criar-organizador.mjs "Ana Silva" ana@exemplo.com [projeto]

const [nome, email, projeto = 'demo-bingo'] = process.argv.slice(2)
const EMULADOR = process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080'

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

/** Documento no formato REST do Firestore, espelhando o schema de `membros`. */
function documentoDoOrganizador(id) {
  return {
    fields: {
      nome: { stringValue: nome },
      email: { stringValue: id },
      papel: { stringValue: 'organizador' },
      status: { stringValue: 'ativo' },
      uid: { nullValue: null }
    }
  }
}

async function criarOrganizador() {
  const id = email.trim().toLowerCase()
  const url =
    `http://${EMULADOR}/v1/projects/${projeto}/databases/(default)/documents/membros` +
    `?documentId=${encodeURIComponent(id)}`
  const resposta = await fetch(url, {
    method: 'POST',
    // O emulador reconhece este token como acesso de owner, ignorando as regras.
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' },
    body: JSON.stringify(documentoDoOrganizador(id))
  })
  if (!resposta.ok) {
    throw new Error(
      `Falha ao criar membros/${id} em ${EMULADOR}: HTTP ${resposta.status} ${await resposta.text()}. ` +
        'Esperado 200 — o emulador está rodando (npm run emulador)?'
    )
  }
  console.log(`Organizador criado: membros/${id} (${nome}) no projeto ${projeto}.`)
}

exigirArgumentos()
await criarOrganizador()
