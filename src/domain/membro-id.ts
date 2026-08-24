import type { MembroId } from './membro'

// Aceita o formato prático de e-mail: sem espaços, um @, domínio com ponto.
const FORMATO_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Deriva o id de documento de um Membro a partir do e-mail (SPEC.md §7: o id de
 * `membros/{id}` é o e-mail sanitizado, o que permite lookup direto no login).
 *
 * Normaliza para minúsculas e apara espaços; nenhum outro caractere é trocado,
 * porque todo e-mail válido já é um id de documento válido no Firestore e
 * substituir caracteres criaria colisões entre e-mails distintos.
 *
 * @example membroIdDoEmail(' Fulano@Exemplo.com ') // 'fulano@exemplo.com'
 */
export function membroIdDoEmail(email: string): MembroId {
  const normalizado = email.trim().toLowerCase()
  if (!FORMATO_EMAIL.test(normalizado)) {
    throw new Error(`E-mail inválido: ${JSON.stringify(email)}. Esperado o formato "nome@dominio.tld".`)
  }
  return normalizado
}
