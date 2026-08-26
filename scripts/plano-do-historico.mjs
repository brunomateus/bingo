// Traduz `edicoes_anteriores.json` (formato antigo da confraria: um Estilo único
// por rodada, escolhido por um responsável) para os documentos do schema atual
// descrito no SPEC.md §7. Puro: não fala com a rede, para poder ser testado.

const META_DO_FORMATO_ANTIGO = 1

// O JSON de origem grafa os meses por extenso, com acento e um typo em 2024.
const MESES = {
  janeiro: 1, fevereiro: 2, fevereio: 2, marco: 3, abril: 4, maio: 5, junho: 6,
  julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12
}

/** Remove acentos para casar "março" com a chave `marco`. */
function semAcento(texto) {
  return texto.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function numeroDoMes(nome) {
  const mes = MESES[semAcento(nome)]
  if (!mes) {
    throw new Error(`Mês desconhecido: ${JSON.stringify(nome)}. Esperado um de ${Object.keys(MESES).join(', ')}.`)
  }
  return mes
}

/**
 * Último dia do mês em `YYYY-MM-DD`. O JSON só traz mês e ano; a data exata da
 * entrega não foi registrada na época, então o fim do mês é a aproximação.
 *
 * @example ultimoDiaDoMes(2024, 2) // '2024-02-29'
 */
export function ultimoDiaDoMes(ano, mes) {
  const dia = new Date(Date.UTC(ano, mes, 0)).getUTCDate()
  return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
}

/** Achata `{ edicoes: [{ "2023": [...] }] }` numa lista com o ano em cada item. */
export function achatarEdicoes(arquivo) {
  if (!Array.isArray(arquivo?.edicoes)) {
    throw new Error(`Arquivo sem a lista "edicoes": ${JSON.stringify(arquivo)?.slice(0, 120)}. Esperado { "edicoes": [ { "2023": [...] } ] }.`)
  }
  return arquivo.edicoes.flatMap((bloco) =>
    Object.entries(bloco).flatMap(([ano, rodadas]) => rodadas.map((rodada) => ({ ano: Number(ano), ...rodada })))
  )
}

/** O id do Estilo é o primeiro token do rótulo: "21B Specialty IPA: Rye IPA" -> "21B". */
export function idDoEstilo(rotulo) {
  return String(rotulo).trim().split(/\s+/)[0]
}

/** Id determinístico da Edição, para que reexecutar a carga não crie duplicatas. */
export function idDaEdicao(ano, mes) {
  return `historico-${ano}-${String(mes).padStart(2, '0')}`
}

function normalizarEmail(email) {
  return String(email).trim().toLowerCase()
}

/**
 * Monta uma Edição concluída a partir de uma rodada do formato antigo:
 * o responsável vira a única reivindicação do Pool e quem não está em
 * `pendencias` recebe a Entrega daquele Estilo.
 */
function planejarRodada(rodada) {
  const mes = numeroDoMes(rodada.prazo)
  const data = ultimoDiaDoMes(rodada.ano, mes)
  const responsavel = normalizarEmail(rodada.responsavel)
  const participantes = participantesDaRodada(rodada, responsavel)
  const pendentes = rodada.pendencias.map(normalizarEmail)
  return {
    id: idDaEdicao(rodada.ano, mes),
    rotulo: `${rodada.ano} ${rodada.prazo}`,
    data,
    styleId: idDoEstilo(rodada.estilo),
    estilo: rodada.estilo,
    responsavel,
    participantes,
    pendentes,
    entregaram: participantes.filter((membro) => !pendentes.includes(membro))
  }
}

/** O responsável escolheu o Estilo, logo participou — mesmo quando a lista o omite. */
function participantesDaRodada(rodada, responsavel) {
  const listados = rodada.participantes.map(normalizarEmail)
  return listados.includes(responsavel) ? listados : [...listados, responsavel]
}

/** Todos os e-mails citados numa lista de rodadas planejadas. */
export function emailsCitados(rodadas) {
  return [...new Set(rodadas.flatMap((rodada) => rodada.participantes))].sort()
}

/** Rodadas em ordem cronológica, com Estilos e e-mails já validados. */
export function planejarHistorico(arquivo, catalogo, membros) {
  const rodadas = achatarEdicoes(arquivo).map(planejarRodada).sort((uma, outra) => uma.data.localeCompare(outra.data))
  for (const rodada of rodadas) {
    validarRodada(rodada, catalogo, membros)
  }
  return rodadas
}

function validarRodada(rodada, catalogo, membros) {
  if (!catalogo.some((estilo) => estilo.id === rodada.styleId)) {
    throw new Error(`Estilo fora do catálogo BJCP em ${rodada.rotulo}: ${JSON.stringify(rodada.estilo)} (id ${rodada.styleId}). Esperado um id de src/assets/data/bjcp-styles.json.`)
  }
  for (const membro of [...rodada.participantes, ...rodada.pendentes]) {
    if (!membros[membro]) {
      throw new Error(`E-mail sem cadastro no arquivo de Membros, citado em ${rodada.rotulo}: ${membro}. Esperado uma entrada { "${membro}": { "nome": "...", "status": "ativo" } }.`)
    }
  }
  const forasteiro = rodada.pendentes.find((membro) => !rodada.participantes.includes(membro))
  if (forasteiro) {
    throw new Error(`Pendência de quem não participou em ${rodada.rotulo}: ${forasteiro}. Esperado um e-mail presente em "participantes".`)
  }
}

/** Documentos de uma Edição: a Edição, o Pool, o índice de Estilos e as Entregas. */
export function documentosDaRodada(rodada) {
  return [
    { caminho: `edicoes/${rodada.id}`, campos: camposDaEdicao(rodada) },
    { caminho: `edicoes/${rodada.id}/pool/${rodada.responsavel}`, campos: { styleId: rodada.styleId } },
    { caminho: `edicoes/${rodada.id}/estilos-do-pool/${rodada.styleId}`, campos: { membroId: rodada.responsavel } },
    ...rodada.entregaram.map((membro) => documentoDeEntrega(rodada, membro))
  ]
}

function camposDaEdicao(rodada) {
  return {
    prazo: rodada.data,
    metaEntregas: META_DO_FORMATO_ANTIGO,
    status: 'concluida',
    participantes: rodada.participantes,
    fechadaEm: rodada.data
  }
}

// Sem data nem observação na origem: a Entrega fica carimbada com o fechamento
// da Edição, que é uma aproximação assumida, não um fato apurado.
function documentoDeEntrega(rodada, membro) {
  return {
    caminho: `edicoes/${rodada.id}/selecoes/${membro}`,
    campos: { entregas: [{ styleId: rodada.styleId, observation: '', deliveredAt: rodada.data }] }
  }
}

/** Documento de `membros/{id}`, sempre como Membro comum: papel é decisão do app. */
export function documentoDeMembro(email, cadastro) {
  if (typeof cadastro?.nome !== 'string' || cadastro.nome.trim() === '') {
    throw new Error(`Membro ${email} sem nome no arquivo de Membros: ${JSON.stringify(cadastro)}. Esperado { "nome": "...", "status": "ativo" | "inativo" }.`)
  }
  if (cadastro.status !== 'ativo' && cadastro.status !== 'inativo') {
    throw new Error(`Membro ${email} com status inválido: ${JSON.stringify(cadastro.status)}. Esperado "ativo" ou "inativo".`)
  }
  return {
    caminho: `membros/${email}`,
    campos: { nome: cadastro.nome.trim(), email, papel: 'membro-comum', status: cadastro.status, uid: null }
  }
}
