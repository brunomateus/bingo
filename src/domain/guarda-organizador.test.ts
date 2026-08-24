import { describe, expect, it } from 'vitest'
import { motivoParaProtegerOrganizador, organizadoresAtivos } from './guarda-organizador'
import type { Membro } from './membro'

function membro(id: string, papel: Membro['papel'], status: Membro['status'] = 'ativo'): Membro {
  return { id, nome: id, email: id, papel, status, uid: null }
}

describe('organizadoresAtivos', () => {
  it('ignora organizadores inativos e membros comuns', () => {
    const membros = [
      membro('ana@x.com', 'organizador'),
      membro('bia@x.com', 'organizador', 'inativo'),
      membro('caio@x.com', 'membro-comum')
    ]
    expect(organizadoresAtivos(membros).map((m) => m.id)).toEqual(['ana@x.com'])
  })
})

describe('motivoParaProtegerOrganizador', () => {
  it('protege o único Organizador ativo', () => {
    const membros = [membro('ana@x.com', 'organizador'), membro('caio@x.com', 'membro-comum')]
    expect(motivoParaProtegerOrganizador(membros, 'ana@x.com')).toMatch(/Último Organizador ativo/)
  })

  it('libera quando há outro Organizador ativo', () => {
    const membros = [membro('ana@x.com', 'organizador'), membro('bia@x.com', 'organizador')]
    expect(motivoParaProtegerOrganizador(membros, 'ana@x.com')).toBeNull()
  })

  it('não conta organizador inativo como reserva', () => {
    const membros = [membro('ana@x.com', 'organizador'), membro('bia@x.com', 'organizador', 'inativo')]
    expect(motivoParaProtegerOrganizador(membros, 'ana@x.com')).not.toBeNull()
  })

  it('não protege membro comum nem organizador que não é o último', () => {
    const membros = [membro('ana@x.com', 'organizador'), membro('caio@x.com', 'membro-comum')]
    expect(motivoParaProtegerOrganizador(membros, 'caio@x.com')).toBeNull()
  })
})
