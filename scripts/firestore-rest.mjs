// Cliente mínimo da API REST do Firestore, autenticado por chave de conta de
// serviço. Existe porque a carga do Histórico roda fora do app (sem SDK web,
// sem regras de segurança) e não vale acrescentar `firebase-admin` só para
// gravar ~120 documentos uma vez.
import { createSign } from 'node:crypto'

const ESCOPO = 'https://www.googleapis.com/auth/datastore'
const RAIZ_REAL = 'https://firestore.googleapis.com/v1'
// O Firestore recusa commits acima de 500 escritas.
const MAXIMO_POR_COMMIT = 400

/**
 * A raiz da API: o emulador fala o mesmo REST, só muda o host. Lida a cada
 * chamada (e não uma vez no import) para o teste conseguir alternar os dois.
 *
 * @example raizDaApi() // 'http://127.0.0.1:8080/v1' com FIRESTORE_EMULATOR_HOST setado
 */
export function raizDaApi() {
  const emulador = process.env.FIRESTORE_EMULATOR_HOST
  return emulador ? `http://${emulador}/v1` : RAIZ_REAL
}

/** Converte um valor JS na representação tipada que a API REST exige. */
export function paraValorFirestore(valor) {
  if (valor === null) return { nullValue: null }
  if (typeof valor === 'string') return { stringValue: valor }
  if (typeof valor === 'boolean') return { booleanValue: valor }
  if (Number.isInteger(valor)) return { integerValue: String(valor) }
  if (Array.isArray(valor)) return { arrayValue: { values: valor.map(paraValorFirestore) } }
  if (typeof valor === 'object') return { mapValue: { fields: paraCamposFirestore(valor) } }
  throw new Error(
    `Valor não suportado na conversão para Firestore: ${JSON.stringify(valor)}. Esperado texto, inteiro, booleano, null, lista ou objeto.`
  )
}

/** Converte um objeto plano no mapa `fields` da API REST. */
export function paraCamposFirestore(objeto) {
  return Object.fromEntries(Object.entries(objeto).map(([campo, valor]) => [campo, paraValorFirestore(valor)]))
}

function base64url(dados) {
  return Buffer.from(dados).toString('base64url')
}

/** Monta o JWT auto-assinado que o Google troca por um token de acesso. */
function assinarJwt(chave) {
  const agora = Math.floor(Date.now() / 1000)
  const cabecalho = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const corpo = base64url(
    JSON.stringify({ iss: chave.client_email, scope: ESCOPO, aud: chave.token_uri, iat: agora, exp: agora + 3600 })
  )
  const assinatura = createSign('RSA-SHA256').update(`${cabecalho}.${corpo}`).sign(chave.private_key)
  return `${cabecalho}.${corpo}.${base64url(assinatura)}`
}

/** Troca a chave de conta de serviço por um token OAuth de escopo datastore. */
export async function obterTokenDeAcesso(chave) {
  exigirChave(chave)
  const resposta = await fetch(chave.token_uri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: assinarJwt(chave)
    })
  })
  const corpo = await resposta.json()
  if (!resposta.ok) {
    throw new Error(
      `Falha ao obter token para ${chave.client_email}: HTTP ${resposta.status} ${JSON.stringify(corpo)}. Esperado 200 — a chave é válida e a conta tem acesso ao Firestore?`
    )
  }
  return corpo.access_token
}

function exigirChave(chave) {
  for (const campo of ['client_email', 'private_key', 'token_uri']) {
    if (typeof chave?.[campo] !== 'string') {
      throw new Error(
        `Chave de conta de serviço sem "${campo}". Esperado o JSON baixado em Configurações do projeto > Contas de serviço.`
      )
    }
  }
}

/**
 * Leitura e escrita de documentos por caminho relativo (`membros/ana@x.com`).
 *
 * @example await new ClienteFirestoreRest('meu-projeto', token).gravar([{ caminho: 'membros/ana@x.com', campos: { nome: 'Ana' } }])
 */
export class ClienteFirestoreRest {
  /** `token` é nulo só contra o emulador, que aceita `Bearer owner` como acesso de owner. */
  constructor(projeto, token) {
    this.projeto = projeto
    this.token = token ?? 'owner'
  }

  /** Nome absoluto do recurso, como a API exige em `name`. */
  nomeAbsoluto(caminho) {
    return `projects/${this.projeto}/databases/(default)/documents/${caminho}`
  }

  /**
   * Ids de todos os documentos de uma coleção. Só o nome vem no corpo
   * (`mask.fieldPaths=__name__`): não há motivo para trazer dados de Membros.
   */
  async listarIds(colecao) {
    const ids = []
    let pagina = ''
    do {
      const busca = `?pageSize=300&mask.fieldPaths=__name__&pageToken=${pagina}`
      const corpo = await this.buscar(`${colecao}${busca}`)
      ids.push(...(corpo.documents ?? []).map((documento) => documento.name.split('/').pop()))
      pagina = corpo.nextPageToken ?? ''
    } while (pagina)
    return ids
  }

  /** Quais dos caminhos já existem — usado para não sobrescrever Membros cadastrados. */
  async filtrarExistentes(caminhos) {
    if (caminhos.length === 0) return new Set()
    const corpo = await this.chamar('documents:batchGet', { documents: caminhos.map((c) => this.nomeAbsoluto(c)) })
    const prefixo = `${this.nomeAbsoluto('')}`
    return new Set(corpo.filter((item) => item.found).map((item) => item.found.name.slice(prefixo.length)))
  }

  /** Grava (upsert) os documentos em lotes; reexecutar com os mesmos dados não duplica nada. */
  async gravar(documentos) {
    for (let inicio = 0; inicio < documentos.length; inicio += MAXIMO_POR_COMMIT) {
      const lote = documentos.slice(inicio, inicio + MAXIMO_POR_COMMIT)
      await this.chamar('documents:commit', { writes: lote.map((documento) => this.paraEscrita(documento)) })
    }
  }

  paraEscrita({ caminho, campos }) {
    return { update: { name: this.nomeAbsoluto(caminho), fields: paraCamposFirestore(campos) } }
  }

  async buscar(caminho) {
    const resposta = await fetch(`${raizDaApi()}/${this.nomeAbsoluto(caminho)}`, {
      headers: { Authorization: `Bearer ${this.token}` }
    })
    const resultado = await resposta.json()
    if (!resposta.ok) {
      throw new Error(
        `Falha ao ler ${caminho} no projeto ${this.projeto}: HTTP ${resposta.status} ${JSON.stringify(resultado)}. Esperado 200.`
      )
    }
    return resultado
  }

  async chamar(operacao, corpo) {
    const resposta = await fetch(`${raizDaApi()}/projects/${this.projeto}/databases/(default)/${operacao}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.token}` },
      body: JSON.stringify(corpo)
    })
    const resultado = await resposta.json()
    if (!resposta.ok) {
      throw new Error(
        `Falha em ${operacao} no projeto ${this.projeto}: HTTP ${resposta.status} ${JSON.stringify(resultado)}. Esperado 200.`
      )
    }
    return resultado
  }
}
