// Carga única do Histórico anterior ao app (SPEC.md §5): as 12 Edições do formato
// "Estilo único" viram Edições concluídas com meta 1, o responsável como única
// reivindicação do Pool e uma Entrega por participante que não ficou devendo.
//
// Roda em simulação por padrão; só grava com --confirmar. Nunca escreve em
// `estado/atual`, para não passar a impressão de uma Edição em curso.
//
// Uso: node scripts/importar-historico.mjs --chave <caminho.json> --projeto <id> [--confirmar]
import { readFileSync } from 'node:fs'
import { ClienteFirestoreRest, obterTokenDeAcesso } from './firestore-rest.mjs'
import { documentoDeMembro, documentosDaRodada, emailsCitados, planejarHistorico } from './plano-do-historico.mjs'

const PADROES = { arquivo: 'edicoes_anteriores.json', membros: 'historico-membros.json' }

function lerArgumentos(argumentos) {
  const opcoes = { ...PADROES, confirmar: argumentos.includes('--confirmar') }
  for (const nome of ['chave', 'projeto', 'arquivo', 'membros']) {
    const posicao = argumentos.indexOf(`--${nome}`)
    if (posicao >= 0) opcoes[nome] = argumentos[posicao + 1]
  }
  if (!opcoes.projeto) {
    throw new Error('Falta --projeto. Uso: node scripts/importar-historico.mjs --chave <caminho.json> --projeto <id> [--confirmar]')
  }
  if (opcoes.confirmar && !opcoes.chave) {
    throw new Error('Falta --chave: gravar exige a chave de conta de serviço. Uso: node scripts/importar-historico.mjs --chave <caminho.json> --projeto <id> --confirmar')
  }
  return opcoes
}

function lerJson(caminho) {
  try {
    return JSON.parse(readFileSync(caminho, 'utf8'))
  } catch (erro) {
    throw new Error(`Não consegui ler o JSON em ${JSON.stringify(caminho)}: ${erro.message}. Esperado um arquivo JSON legível.`)
  }
}

function imprimirRodada(rodada) {
  console.log(`\n  ${rodada.id}  ${rodada.estilo}`)
  console.log(`    prazo/fechamento: ${rodada.data}   Pool: ${rodada.responsavel}`)
  console.log(`    entregaram (${rodada.entregaram.length}): ${rodada.entregaram.join(', ')}`)
  console.log(`    devendo (${rodada.pendentes.length}): ${rodada.pendentes.join(', ') || '—'}`)
}

function imprimirMembros({ novos, existentes, naoCitados }) {
  console.log(`\nMembros a criar (${novos.length}):`)
  for (const { caminho, campos } of novos) console.log(`  ${caminho.replace('membros/', '')} — ${campos.nome} (${campos.status})`)
  console.log(`Já cadastrados, preservados como estão (${existentes.length}): ${existentes.join(', ') || '—'}`)
  if (naoCitados.length > 0) {
    console.log(`\nATENÇÃO — cadastrados que o Histórico nunca cita (${naoCitados.length}): ${naoCitados.join(', ')}`)
    console.log('  Confira se não é o mesmo Membro com e-mail diferente: seria um cadastro duplicado.')
  }
}

function imprimirPlano(rodadas) {
  console.log(`Edições a gravar: ${rodadas.length}`)
  rodadas.forEach(imprimirRodada)
}

/** Só cria quem ainda não existe: papel, nome e uid de quem já está cadastrado ficam intactos. */
async function separarMembros(cliente, membros, emails) {
  const cadastrados = cliente ? new Set(await cliente.listarIds('membros')) : new Set()
  const novos = emails.filter((email) => !cadastrados.has(email)).map((email) => documentoDeMembro(email, membros[email]))
  return {
    novos,
    existentes: emails.filter((email) => cadastrados.has(email)),
    // Quem está cadastrado mas nunca aparece no Histórico: candidato a e-mail
    // divergente entre o cadastro e `edicoes_anteriores.json`.
    naoCitados: [...cadastrados].filter((email) => !emails.includes(email))
  }
}

async function importar() {
  const opcoes = lerArgumentos(process.argv.slice(2))
  const catalogo = lerJson('src/assets/data/bjcp-styles.json')
  const membros = lerJson(opcoes.membros)
  const rodadas = planejarHistorico(lerJson(opcoes.arquivo), catalogo, membros)
  // A chave também é usada na simulação: sem consultar `membros`, o plano não
  // sabe quem já está cadastrado e superestima o que seria criado.
  const cliente = opcoes.chave ? new ClienteFirestoreRest(opcoes.projeto, await obterTokenDeAcesso(lerJson(opcoes.chave))) : null
  const separacao = await separarMembros(cliente, membros, emailsCitados(rodadas))
  imprimirPlano(rodadas)
  if (!cliente) console.log('\nSem --chave: não consultei `membros`, então todos aparecem como "a criar".')
  imprimirMembros(separacao)

  const documentos = [...separacao.novos, ...rodadas.flatMap(documentosDaRodada)]
  if (!opcoes.confirmar) {
    console.log(`\nSIMULAÇÃO: nada foi gravado. ${documentos.length} documentos seriam escritos em ${opcoes.projeto}.`)
    console.log('Reexecute com --confirmar para gravar de verdade.')
    return
  }
  await cliente.gravar(documentos)
  console.log(`\nGravados ${documentos.length} documentos em ${opcoes.projeto}. \`estado/atual\` não foi tocado.`)
}

await importar()
