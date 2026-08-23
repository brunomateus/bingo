Part of: [Spec do Bingo (próxima fase)](../map.md)
Type: research
Status: resolved

## Question

Qual é a fonte confiável e legível por máquina (arquivo ou API, oficial ou de terceiros mantido a partir do guia oficial) para a lista completa de Estilos do guia BJCP mais recente? Quais campos essa fonte expõe (id, nome, categoria, faixas de OG/FG/IBU/SRM, etc.) e quais desses campos importam para o Bingo, dado que o app hoje só usa id e nome? Há alguma restrição de licenciamento/uso para redistribuir esses dados dentro do app?

## Answer

Achados completos em [research/03-fonte-dados-bjcp.md](../research/03-fonte-dados-bjcp.md). Resumo:

- **BJCP não publica dados estruturados para o guia 2021 vigente** (só PDF); o site oficial só linka conversões de terceiros, "não verificadas pela BJCP".
- **Fonte recomendada**: [`beerjson/bjcp-json`](https://github.com/beerjson/bjcp-json), arquivo `styles/bjcp_styleguide-2021.json` — 110 entradas do guia 2021, esquema BeerJSON, repo **MIT**. Expõe `style_id`, `name`, `category`/`category_id`, `type`, `tags`, faixas numéricas (OG/FG/IBU/SRM/ABV) e campos de texto longo (aroma/aparência/sabor/etc.).
- **Licenciamento**: o MIT do repo cobre só o empacotamento/código; o conteúdo do guia continua copyright da BJCP. A FAQ oficial da BJCP permite reuso livre de "sistema de nomenclatura e numeração, os parâmetros de estilo, e a seção de impressão geral" — ou seja, `id`, `name`, categoria e as faixas numéricas (OG/FG/IBU/SRM/ABV) estão liberados. O texto descritivo completo (aroma/aparência/sabor/mouthfeel/comentários/história/ingredientes/comparação/exemplos) **não** pode ser reproduzido no bundle do Bingo sem autorização explícita da BJCP.
- **Implicação prática**: Bingo já usa só `{id, name}` hoje — exatamente o que é permitido. Expandir para as ~110 entradas do guia 2021 usando `id`/`name`/`category` (e opcionalmente as faixas numéricas) de `bjcp_styleguide-2021.json` fica dentro da permissão da BJCP.
