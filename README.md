# Bingo

Aplicação da confraria de cervejeiros caseiros: Edições periódicas em que cada Membro
reivindica um Estilo BJCP para o Pool coletivo e depois registra suas Entregas.
Glossário canônico em [CONTEXT.md](./CONTEXT.md); decisões em
[`.scratch/bingo-spec/SPEC.md`](./.scratch/bingo-spec/SPEC.md).

Site estático (GitHub Pages) com Firebase Auth + Firestore no cliente
([ADR 0001](./docs/adr/0001-firebase-as-backend-for-static-hosting.md)).

## Desenvolvimento

```bash
npm install
npm run dev                  # usa .env.development: emulador, sem credencial real
npm test                     # unitários + integração (sobe o emulador)
npm run test:unit            # só os unitários, rápidos
```

### Emulador do Firebase

O `.env.development` versionado aponta para o projeto `demo-bingo`, que o Firebase
Emulator Suite roda 100% offline, sem credencial real:

```bash
npm run emulador                # Auth :9099, Firestore :8080, UI :4000
npm run dev                     # em outro terminal
```

O emulador começa vazio, e ninguém entra no app sem ser Membro cadastrado. Crie o
primeiro Organizador (SPEC.md §2: bootstrap fora do app) com o emulador rodando:

```bash
npm run criar-organizador "Ana Silva" ana@exemplo.com
```

Depois entre com a conta Google desse e-mail — no emulador, o popup de login deixa
inventar a conta na hora. Os dados somem quando o emulador para; refaça o comando.

### Prévia com o Histórico real, sem tocar no projeto de produção

Para ver as telas com dados de verdade (Pendências espalhadas por várias Edições,
por exemplo), carregue o Histórico no emulador — a mesma importação de produção,
só que apontada para o host local, sem chave de conta de serviço:

```bash
npm run emulador                                     # terminal 1
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 \
  npm run importar-historico -- --projeto demo-bingo --confirmar   # terminal 2
npm run dev                                          # terminal 3
```

Sem `--confirmar` o script só simula, como no projeto real. Depois entre com a
conta Google de um dos Membros importados (o popup do emulador deixa inventar a
conta na hora) para ver o app do ponto de vista dele. Nada disso chega ao
Firebase de produção: `.env.development` e `FIRESTORE_EMULATOR_HOST` mantêm tudo
no emulador, que esquece os dados quando para.

A importação cria todo mundo como Membro comum — papel é decisão do app. Para
abrir uma Edição você precisa de um Organizador; `criar-organizador` promove
quem já está cadastrado, preservando o `uid` de quem já entrou:

```bash
npm run criar-organizador "Bruno Mateus" brunomateus@gmail.com
```

No projeto real o bootstrap é manual pelo console do Firebase: coleção `membros`,
id do documento = e-mail em minúsculas, campos `nome`, `email`, `papel: organizador`,
`status: ativo`, `uid: null`.

Para falar com o projeto Firebase de verdade, copie `.env.example` para `.env.local`
(ignorado pelo git, tem precedência sobre `.env.development`), preencha com os valores
do console e deixe `VITE_FIREBASE_EMULADOR=false`.

### Regras do Firestore

`firestore.rules` é o controle de acesso de verdade (SPEC.md §7), testado em
`testes-de-integracao/` (regras de `membros` e de `edicoes`/`pool`). Publique com
`npx firebase deploy --only firestore:rules --project <seu-projeto>` — o workflow do
Pages publica só o site estático, não as regras.

### Estilos BJCP

`src/assets/data/bjcp-styles.json` é gerado, não editado à mão:

```bash
npm run estilos:build
```

O script copia apenas id, nome, categoria e faixas numéricas do guia 2021 — o texto
descritivo é copyright BJCP e não pode ser redistribuído.

## Deploy

Push na `main` publica no GitHub Pages via `.github/workflows/deploy.yml`. As variáveis
`VITE_FIREBASE_*` vêm dos secrets do repositório.
