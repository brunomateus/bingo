import { ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CicloDaEdicao } from '../casos-uso/ciclo-da-edicao'
import { ConsultaDaEdicaoAtual } from '../casos-uso/consulta-da-edicao-atual'
import { RegistroDeEntregas } from '../casos-uso/registro-de-entregas'
import { SorteioDoPool } from '../casos-uso/sorteio-do-pool'
import type { Membro } from '../domain/membro'
import { FakeRepositorioEdicoes } from '../repositorios/fake-repositorio-edicoes'
import { FakeRepositorioEntregas } from '../repositorios/fake-repositorio-entregas'
import { FakeRepositorioMembros } from '../repositorios/fake-repositorio-membros'
import { FakeRepositorioPool } from '../repositorios/fake-repositorio-pool'
import { usarEdicaoAtual, type EdicaoAtual } from './usar-edicao-atual'

const HOJE = new Date(2026, 7, 23)

function membro(nome: string, papel: Membro['papel']): Membro {
  const email = `${nome.toLowerCase()}@exemplo.com`
  return { id: email, nome, email, papel, status: 'ativo', uid: null }
}

const ANA = membro('Ana', 'organizador')
const CAIO = membro('Caio', 'membro-comum')

function montar(logado: Membro | null = ANA, agora: () => Date = () => HOJE) {
  const edicoes = new FakeRepositorioEdicoes()
  const pool = new FakeRepositorioPool()
  const membros = new FakeRepositorioMembros([ANA, CAIO])
  const entregas = new FakeRepositorioEntregas()
  const consulta = new ConsultaDaEdicaoAtual(edicoes, pool, membros, entregas)
  const ciclo = new CicloDaEdicao(edicoes, pool, membros, entregas, agora)
  const sorteio = new SorteioDoPool(edicoes, pool)
  const registro = new RegistroDeEntregas(edicoes, pool, entregas, agora)
  return { edicoes, pool, entregas, membros, atual: usarEdicaoAtual(consulta, ciclo, sorteio, registro, ref(logado)) }
}

describe('usarEdicaoAtual', () => {
  let atual: EdicaoAtual

  beforeEach(async () => {
    atual = montar().atual
    await atual.recarregar()
  })

  it('começa sem Edição em curso', () => {
    expect(atual.edicao.value).toBeNull()
    expect(atual.fase.value).toBeNull()
  })

  it('limita a meta ao número de Membros ativos, o tamanho que o Pool terá', async () => {
    expect(atual.maximoDeEntregas.value).toBe(2)
  })

  it('recusa meta acima do teto, sem criar Edição', async () => {
    await atual.abrir('2026-09-30', 3)
    expect(atual.erro.value).toMatch(/com 2 participantes o Pool terá 2 Estilos/)
    expect(atual.edicao.value).toBeNull()
  })

  it('não conta Membro inativo no teto', async () => {
    const montagem = montar()
    await montagem.membros.definirStatus('caio@exemplo.com', 'inativo')
    await montagem.atual.recarregar()
    expect(montagem.atual.maximoDeEntregas.value).toBe(1)
  })

  it('abre a Edição com todos os participantes pendentes na Fase 1', async () => {
    await atual.abrir('2026-09-30', 2)
    expect(atual.fase.value).toBe('pool')
    expect(atual.pendentes.value).toEqual(['ana@exemplo.com', 'caio@exemplo.com'])
  })

  it('mostra a recusa de abrir com prazo no passado, sem criar Edição', async () => {
    await atual.abrir('2026-01-01', 2)
    expect(atual.erro.value).toMatch(/já passou/)
    expect(atual.edicao.value).toBeNull()
  })

  it('reivindica pelo Membro logado e tira o Estilo dos livres', async () => {
    await atual.abrir('2026-09-30', 2)
    await atual.reivindicar('21A')
    expect(atual.estiloDe('ana@exemplo.com')).toBe('21A')
    expect(atual.estilosLivres.value.some((estilo) => estilo.id === '21A')).toBe(false)
    expect(atual.souPendente.value).toBe(false)
  })

  it('avança para Entregas quando o forçar avanço completa o Pool', async () => {
    await atual.abrir('2026-09-30', 2)
    await atual.reivindicar('21A')
    expect(atual.fase.value).toBe('pool')
    await atual.forcarAvanco({ 'caio@exemplo.com': '13C' })
    expect(atual.fase.value).toBe('entregas')
    expect(atual.estiloDe('caio@exemplo.com')).toBe('13C')
  })

  it('mantém a Edição fechada na tela, como passo de Fechamento', async () => {
    await atual.abrir('2026-09-30', 2)
    await atual.reivindicar('21A')
    await atual.fechar()
    expect(atual.edicao.value).toMatchObject({ status: 'concluida' })
    expect(atual.fase.value).toBe('fechamento')
  })

  it('cancela ao fechar sem nenhuma atividade', async () => {
    await atual.abrir('2026-09-30', 2)
    await atual.fechar()
    expect(atual.edicao.value).toMatchObject({ status: 'cancelada' })
  })

  it('abre a próxima Edição direto do estado de Fechamento', async () => {
    await atual.abrir('2026-09-30', 2)
    await atual.fechar()
    await atual.abrir('2026-10-31', 1)
    expect(atual.edicao.value).toMatchObject({ status: 'aberta', metaEntregas: 1, prazo: '2026-10-31' })
    expect(atual.pendentes.value).toHaveLength(2)
  })

  it('estende o prazo e recusa encurtá-lo', async () => {
    await atual.abrir('2026-09-30', 2)
    await atual.estenderPrazo('2026-10-31')
    expect(atual.edicao.value).toMatchObject({ prazo: '2026-10-31' })
    await atual.estenderPrazo('2026-10-01')
    expect(atual.erro.value).toMatch(/só pode ser estendido/)
    expect(atual.edicao.value).toMatchObject({ prazo: '2026-10-31' })
  })

  it('resolve o nome do participante e cai no id quando não conhece', async () => {
    await atual.abrir('2026-09-30', 2)
    expect(atual.nomeDe('ana@exemplo.com')).toBe('Ana')
    expect(atual.nomeDe('sumido@exemplo.com')).toBe('sumido@exemplo.com')
  })

  describe('quem está logado', () => {
    it('não marca como pendente quem não é participante', async () => {
      const organizadora = montar()
      await organizadora.atual.recarregar()
      await organizadora.atual.abrir('2026-09-30', 2)
      const visitante = montar(membro('Zeca', 'membro-comum'))
      await visitante.atual.recarregar()
      expect(visitante.atual.souPendente.value).toBe(false)
    })

    it('recusa reivindicar sem sessão', async () => {
      const organizadora = montar()
      await organizadora.atual.recarregar()
      await organizadora.atual.abrir('2026-09-30', 2)
      const anonimo = montar(null)
      await anonimo.atual.recarregar()
      await anonimo.atual.reivindicar('21A')
      expect(anonimo.atual.erro.value).toMatch(/Entre com sua conta/)
    })
  })

  describe('Entregas', () => {
    async function edicaoNaFase2(meta = 2) {
      const montagem = montar()
      await montagem.atual.recarregar()
      await montagem.atual.abrir('2026-09-30', meta)
      await montagem.atual.reivindicar('21A')
      await montagem.atual.forcarAvanco({ 'caio@exemplo.com': '13C' })
      return montagem
    }

    it('registra a Entrega do Membro logado e atualiza a Pendência', async () => {
      const { atual } = await edicaoNaFase2()
      expect(atual.minhaPendencia.value).toBe(2)
      await atual.registrarEntrega('21A', 'no bar do Zé')
      expect(atual.minhaPendencia.value).toBe(1)
      expect(atual.entregasFeitasPor('ana@exemplo.com')).toBe(1)
    })

    it('oferece só Estilos do Pool que o Membro ainda não entregou', async () => {
      const { atual } = await edicaoNaFase2()
      expect(atual.meusEstilosEntregaveis.value.map((estilo) => estilo.id)).toEqual(['13C', '21A'])
      await atual.registrarEntrega('21A', '')
      expect(atual.meusEstilosEntregaveis.value.map((estilo) => estilo.id)).toEqual(['13C'])
    })

    it('mostra a recusa de repetir Estilo sem gravar nada', async () => {
      const { atual } = await edicaoNaFase2()
      await atual.registrarEntrega('21A', '')
      await atual.registrarEntrega('21A', '')
      expect(atual.erro.value).toMatch(/já entregou o Estilo 21A/)
      expect(atual.entregasFeitasPor('ana@exemplo.com')).toBe(1)
    })

    it('conta a Pendência de cada participante separadamente', async () => {
      const { atual } = await edicaoNaFase2()
      await atual.registrarEntrega('21A', '')
      expect(atual.pendenciaDe('ana@exemplo.com')).toBe(1)
      expect(atual.pendenciaDe('caio@exemplo.com')).toBe(2)
    })

    it('fecha a Edição sozinha quando a última Entrega cumpre todas as metas', async () => {
      const montagem = await edicaoNaFase2(1)
      await montagem.entregas.registrar('edicao-1', 'caio@exemplo.com', {
        styleId: '13C',
        observation: '',
        deliveredAt: HOJE.toISOString()
      })
      await montagem.atual.registrarEntrega('21A', '')
      expect(montagem.atual.edicao.value).toMatchObject({ status: 'concluida' })
      expect(montagem.atual.fase.value).toBe('fechamento')
    })

    it('não fecha enquanto outro participante ainda deve', async () => {
      const montagem = await edicaoNaFase2(1)
      await montagem.atual.registrarEntrega('21A', '')
      expect(montagem.atual.edicao.value).toMatchObject({ status: 'aberta' })
    })
  })

  describe('fechamento automático por prazo', () => {
    it('fecha ao carregar quando o prazo venceu e quem olha é Organizador', async () => {
      const organizadora = montar(ANA)
      await organizadora.atual.recarregar()
      await organizadora.atual.abrir('2026-08-23', 2)
      await organizadora.atual.reivindicar('21A')

      const depois = usarEdicaoAtualCompartilhado(organizadora, ANA, () => new Date(2026, 7, 24))
      await depois.recarregar()
      expect(depois.edicao.value).toMatchObject({ status: 'concluida' })
    })

    it('não fecha quando quem abre a tela é Membro comum', async () => {
      const organizadora = montar(ANA)
      await organizadora.atual.recarregar()
      await organizadora.atual.abrir('2026-08-23', 2)

      const comum = usarEdicaoAtualCompartilhado(organizadora, CAIO, () => new Date(2026, 7, 24))
      await comum.recarregar()
      expect(comum.edicao.value).toMatchObject({ status: 'aberta' })
    })
  })
})

/** Reusa os mesmos repositórios de outra montagem, trocando quem está logado e o relógio. */
function usarEdicaoAtualCompartilhado(
  montagem: ReturnType<typeof montar>,
  logado: Membro,
  agora: () => Date
): EdicaoAtual {
  const membros = new FakeRepositorioMembros([ANA, CAIO])
  const consulta = new ConsultaDaEdicaoAtual(montagem.edicoes, montagem.pool, membros, montagem.entregas)
  const ciclo = new CicloDaEdicao(montagem.edicoes, montagem.pool, membros, montagem.entregas, agora)
  const registro = new RegistroDeEntregas(montagem.edicoes, montagem.pool, montagem.entregas, agora)
  return usarEdicaoAtual(
    consulta,
    ciclo,
    new SorteioDoPool(montagem.edicoes, montagem.pool),
    registro,
    ref(logado)
  )
}

describe('falha técnica', () => {
  it('vira mensagem genérica na tela', async () => {
    const consoleErro = vi.spyOn(console, 'error').mockImplementation(() => {})
    const quebrado = { abrir: () => Promise.reject(new Error('offline')) } as unknown as CicloDaEdicao
    const consulta = new ConsultaDaEdicaoAtual(
      new FakeRepositorioEdicoes(),
      new FakeRepositorioPool(),
      new FakeRepositorioMembros(),
      new FakeRepositorioEntregas()
    )
    const atual = usarEdicaoAtual(consulta, quebrado, {} as SorteioDoPool, {} as RegistroDeEntregas, ref(ANA))
    await atual.abrir('2026-09-30', 2)
    expect(atual.erro.value).toMatch(/Verifique sua conexão/)
    consoleErro.mockRestore()
  })
})
