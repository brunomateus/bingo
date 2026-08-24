import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { CHAVE_CONTEXTO, criarContextoDoApp } from './app/contexto-do-app'
import { criarRoteador } from './router'

const contexto = criarContextoDoApp(import.meta.env)

const app = createApp(App)
app.provide(CHAVE_CONTEXTO, contexto)
app.use(criarRoteador(contexto.sessao))
app.mount('#app')
