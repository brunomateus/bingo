// Gera src/assets/data/bjcp-styles.json a partir do guia BJCP 2021 publicado em
// beerjson/bjcp-json (MIT). O texto descritivo do guia (overall_impression, aroma,
// appearance, flavor, mouthfeel, comments, history, ...) é copyright BJCP e NÃO pode
// ser redistribuído no bundle — por isso este script copia apenas identificação,
// categoria e faixas numéricas. Ver .scratch/bingo-spec/research/03-fonte-dados-bjcp.md
// e SPEC.md §6. Uso: node scripts/build-bjcp-styles.mjs
import { writeFileSync } from 'node:fs'

const FONTE = 'https://raw.githubusercontent.com/beerjson/bjcp-json/main/styles/bjcp_styleguide-2021.json'
const DESTINO = new URL('../src/assets/data/bjcp-styles.json', import.meta.url)

/** Converte {minimum:{value},maximum:{value}} do beerjson em {minimo,maximo}. */
function extrairFaixa(faixaBeerjson) {
  if (!faixaBeerjson) return undefined
  return { minimo: faixaBeerjson.minimum.value, maximo: faixaBeerjson.maximum.value }
}

/** Mapeia um estilo do beerjson para o subconjunto de campos que podemos publicar. */
function extrairEstilo(estiloBeerjson) {
  return {
    id: estiloBeerjson.style_id,
    nome: estiloBeerjson.name,
    categoria: estiloBeerjson.category,
    categoriaId: estiloBeerjson.category_id,
    densidadeOriginal: extrairFaixa(estiloBeerjson.original_gravity),
    densidadeFinal: extrairFaixa(estiloBeerjson.final_gravity),
    amargor: extrairFaixa(estiloBeerjson.international_bitterness_units),
    cor: extrairFaixa(estiloBeerjson.color),
    teorAlcoolico: extrairFaixa(estiloBeerjson.alcohol_by_volume)
  }
}

async function baixarEstilosBjcp() {
  const resposta = await fetch(FONTE)
  if (!resposta.ok) {
    throw new Error(`Falha ao baixar ${FONTE}: HTTP ${resposta.status}, esperado 200`)
  }
  const guia = await resposta.json()
  return guia.beerjson.styles
}

const estilos = (await baixarEstilosBjcp()).map(extrairEstilo)
estilos.sort((a, b) => Number(a.categoriaId) - Number(b.categoriaId) || a.id.localeCompare(b.id))
writeFileSync(DESTINO, `${JSON.stringify(estilos, null, 2)}\n`)
console.log(`${estilos.length} estilos escritos em ${DESTINO.pathname}`)
