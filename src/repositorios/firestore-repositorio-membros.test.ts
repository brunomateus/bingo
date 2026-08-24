import { describe, expect, it } from 'vitest'
import { paraMembro } from './firestore-repositorio-membros'

const DOCUMENTO_VALIDO = {
  nome: 'Ana',
  email: 'ana@exemplo.com',
  papel: 'organizador',
  status: 'ativo',
  uid: 'uid-ana'
}

describe('paraMembro', () => {
  it('usa o id do documento como id do Membro', () => {
    expect(paraMembro('ana@exemplo.com', DOCUMENTO_VALIDO)).toEqual({ id: 'ana@exemplo.com', ...DOCUMENTO_VALIDO })
  })

  it('trata uid ausente como não vinculado', () => {
    expect(paraMembro('ana@exemplo.com', { ...DOCUMENTO_VALIDO, uid: undefined }).uid).toBeNull()
  })

  it('recusa papel fora do domínio, dizendo o que era esperado', () => {
    expect(() => paraMembro('ana@exemplo.com', { ...DOCUMENTO_VALIDO, papel: 'admin' })).toThrow(
      'papel inválido: "admin". Esperado um de organizador | membro-comum'
    )
  })

  it('recusa status fora do domínio', () => {
    expect(() => paraMembro('ana@exemplo.com', { ...DOCUMENTO_VALIDO, status: 'suspenso' })).toThrow('"suspenso"')
  })

  it('recusa nome vazio, apontando o documento', () => {
    expect(() => paraMembro('ana@exemplo.com', { ...DOCUMENTO_VALIDO, nome: '  ' })).toThrow(
      'membros/ana@exemplo.com tem nome inválido'
    )
  })
})
