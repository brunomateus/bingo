import { defineConfig } from 'vitest/config'

// Suíte separada da unitária: cobre as regras do Firestore e o repositório real
// contra o emulador. Roda por `npm run test:integracao`, que sobe o emulador antes.
export default defineConfig({
  test: {
    include: ['testes-de-integracao/**/*.test.ts'],
    environment: 'node',
    testTimeout: 15_000,
    fileParallelism: false
  }
})
