import type { Membro, MembroId } from './membro'

const AVISO_ULTIMO_ORGANIZADOR = 'Último Organizador ativo: promova outro Membro antes de rebaixar ou desativar este.'

/** Organizadores ativos da confraria — quem pode gerir Membros e Edições. */
export function organizadoresAtivos(membros: readonly Membro[]): Membro[] {
  return membros.filter((membro) => membro.papel === 'organizador' && membro.status === 'ativo')
}

/**
 * Aviso a mostrar (e razão para desabilitar Rebaixar/Desativar) quando o Membro é
 * o único Organizador ativo restante; `null` quando a ação é permitida.
 * A confraria nunca pode ficar sem Organizador ativo (SPEC.md §2).
 *
 * @example motivoParaProtegerOrganizador(membros, 'ana@exemplo.com') // null
 */
export function motivoParaProtegerOrganizador(membros: readonly Membro[], id: MembroId): string | null {
  const ativos = organizadoresAtivos(membros)
  const ehUnicoOrganizadorAtivo = ativos.length === 1 && ativos[0].id === id
  return ehUnicoOrganizadorAtivo ? AVISO_ULTIMO_ORGANIZADOR : null
}
