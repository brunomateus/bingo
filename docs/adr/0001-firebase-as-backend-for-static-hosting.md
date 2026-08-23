# Firebase (Auth + Firestore) como backend, sem servidor próprio

A aplicação precisa continuar rodando como site estático no GitHub Pages, então não há servidor de backend próprio. Persistência (Edições, Membros, Entregas) e autenticação (login real de membros) são resolvidas inteiramente no cliente via Firebase Auth e Firestore, ao invés de um backend customizado. A alternativa (backend próprio) exigiria hospedagem paga e infraestrutura adicional, o que contraria o requisito de continuar no GitHub Pages.
