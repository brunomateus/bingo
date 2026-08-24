/** Identidade devolvida pelo provedor Google após o login. */
export interface CredencialGoogle {
  uid: string
  email: string
}

/**
 * Interface própria sobre o Firebase Auth (SPEC.md §2: login só com conta Google).
 * Os casos de uso dependem dela, não do SDK, e nos testes recebem um fake.
 */
export interface AutenticadorGoogle {
  entrarComGoogle(): Promise<CredencialGoogle>
  sair(): Promise<void>
  /** Notifica a credencial atual (ou `null`) e devolve a função que cancela a inscrição. */
  observarCredencial(ouvinte: (credencial: CredencialGoogle | null) => void): () => void
}
