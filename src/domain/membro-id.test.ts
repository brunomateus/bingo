import { describe, expect, it } from 'vitest'
import { membroIdDoEmail } from './membro-id'

describe('membroIdDoEmail', () => {
  it('normaliza caixa e espaços para um id estável', () => {
    expect(membroIdDoEmail('  Fulano@Exemplo.COM ')).toBe('fulano@exemplo.com')
  })

  it('preserva pontos e sinais do e-mail, sem colidir com variantes', () => {
    expect(membroIdDoEmail('a.b+bingo@exemplo.com')).toBe('a.b+bingo@exemplo.com')
    expect(membroIdDoEmail('a_b@exemplo.com')).not.toBe(membroIdDoEmail('a.b@exemplo.com'))
  })

  it.each(['', 'sem-arroba', 'dois@@exemplo.com', 'sem@dominio', 'com espaco@exemplo.com'])(
    'rejeita %j informando o valor recebido',
    (invalido) => {
      expect(() => membroIdDoEmail(invalido)).toThrow(JSON.stringify(invalido))
    }
  )
})
