import estilosBjcp from '../assets/data/bjcp-styles.json'
import { ErroDeRegra } from '../domain/erro-de-regra'
import type { Estilo, EstiloId } from '../domain/estilo'

// Asset estático do bundle, não uma coleção do Firestore (SPEC.md §6/§7).
// Regenerado por `npm run estilos:build`.
const ESTILOS = estilosBjcp as readonly Estilo[]

const ESTILOS_POR_ID = new Map(ESTILOS.map((estilo) => [estilo.id, estilo]))

/** Todos os Estilos do guia BJCP 2021, em ordem de categoria. */
export function listarEstilos(): readonly Estilo[] {
  return ESTILOS
}

/**
 * Busca um Estilo pelo id BJCP. Retorna `undefined` para ids desconhecidos, para
 * que o Histórico consiga renderizar registros antigos se o guia mudar.
 *
 * @example encontrarEstilo('21A')?.nome // 'American IPA'
 */
export function encontrarEstilo(id: EstiloId): Estilo | undefined {
  return ESTILOS_POR_ID.get(id)
}

/**
 * Como `encontrarEstilo`, mas recusa o id desconhecido. Serve para validar escolha
 * de Estilo vinda da tela, então a recusa é `ErroDeRegra` e vai para o usuário.
 */
export function exigirEstilo(id: EstiloId): Estilo {
  const estilo = ESTILOS_POR_ID.get(id)
  if (!estilo) {
    throw new ErroDeRegra(`Estilo BJCP desconhecido: ${JSON.stringify(id)}. Esperado um id do guia 2021, ex.: "21A".`)
  }
  return estilo
}
