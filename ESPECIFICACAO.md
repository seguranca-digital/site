# Comunicador Alternativo (CAA) — Especificação do MVP

> Documento de referência para o desenvolvimento com o Claude Code. Coloque este arquivo na raiz do repositório.

---

## 0\. Instruções para o agente (leia primeiro)

- Implemente **uma fase por vez**, na ordem da seção 5\. Ao terminar cada fase:  
  1. rode `npm run build` e `npm run test` e corrija qualquer erro;  
  2. marque os itens concluídos no checklist da fase neste arquivo;  
  3. resuma o que foi feito e **pare**, aguardando confirmação antes de seguir.  
- **Não** adicione backend, Docker, banco de dados, autenticação, analytics nem bibliotecas de componentes de UI (Vuetify, PrimeVue, shadcn-vue etc.). O app é 100% estático.  
- Textos da interface em **pt-BR**. Nomes de variáveis/funções em inglês. Comentários em pt-BR.  
- Acessibilidade não é uma fase final: todo componente já nasce seguindo a **seção 6**.  
- Todo conteúdo (vocabulário, categorias) vem de JSON — nada de vocabulário fixo dentro de componentes, porque ele vai mudar a partir das sessões de co-design.  
- Na dúvida entre duas soluções, escolha a mais simples.

---

## 1\. Contexto

Trabalho acadêmico da disciplina de **Tecnologias Assistivas**: desenvolver um MVP digital de baixo custo, construído com **co-design**, que resolva uma demanda funcional real. Entregáveis: repositório no GitHub, código-fonte funcional e vídeo demonstrativo (máx. 5 min).

### Problema

Pessoas com comunicação oral limitada ou ausente (por exemplo: autismo não verbal, afasia após AVC, paralisia cerebral, ELA) dependem de **Comunicação Aumentativa e Alternativa (CAA)**. As pranchas de papel são limitadas e se desgastam; os apps comerciais costumam ser pagos ou exigir tablets dedicados.

### Solução

Um **comunicador por pictogramas** gratuito, que roda no navegador de qualquer celular, tablet ou computador, **funciona offline** (PWA), fala as frases em voz alta e tem **modo de varredura** para quem não consegue tocar na tela com precisão e usa um único botão (acionador).

### Usuários

- **Usuário principal:** a pessoa que se comunica usando a prancha.  
- **Parceiro de comunicação:** cuidador, familiar, professor(a) ou terapeuta, que configura as pranchas.

---

## 2\. Stack e restrições

| Item | Escolha | Motivo |
| :---- | :---- | :---- |
| Framework | Vue 3 (Composition API, `<script setup>`) \+ TypeScript | Componentização, tipagem |
| Build | Vite | Rápido, gera site estático |
| Estado | Pinia | Simples e oficial do Vue |
| Rotas | Vue Router com `createWebHashHistory` | Evita erro 404 ao recarregar no GitHub Pages |
| Persistência | `idb-keyval` (IndexedDB) | Guarda pranchas e **imagens (Blob)**; o localStorage não comporta fotos |
| Offline / instalação | `vite-plugin-pwa` | Service worker \+ manifest |
| Voz | Web Speech API (`speechSynthesis`) | Nativa do navegador, custo zero |
| Estilo | CSS próprio com custom properties (tokens) | Controle total de contraste e tamanhos |
| Testes | Vitest \+ @vue/test-utils | Nativo do ecossistema Vite |
| Hospedagem | GitHub Pages via GitHub Actions | Gratuito |

Use as versões estáveis atuais de todas as dependências e das GitHub Actions oficiais.

**Scripts do `package.json`:** `dev`, `build`, `preview`, `test`, `pictogramas`.

---

## 3\. Estrutura de pastas

.

├─ public/

│  ├─ pictogramas/              \# PNGs do ARASAAC baixados pelo script (uso offline)

│  └─ icons/                    \# ícones do PWA (192, 512, maskable)

├─ scripts/

│  └─ baixar-pictogramas.mjs    \# baixa os pictogramas do vocabulário inicial

├─ src/

│  ├─ data/

│  │  ├─ vocabulario-inicial.json

│  │  └─ pictogramas-map.json   \# gerado pelo script: { cardId: arasaacId }

│  ├─ types.ts

│  ├─ stores/                   \# boardStore.ts, sentenceStore.ts, settingsStore.ts

│  ├─ composables/              \# useSpeech.ts, useScanning.ts, useArasaac.ts, usePersistence.ts

│  ├─ components/               \# SentenceBar, QuickPhrases, CategoryTabs, CardGrid, CommCard, HoldButton...

│  ├─ views/                    \# BoardView, EditorView, SettingsView, AboutView

│  ├─ styles/                   \# tokens.css, base.css, themes.css

│  ├─ router.ts

│  ├─ App.vue

│  └─ main.ts

├─ tests/

├─ docs/

│  └─ co-design.md

├─ .github/workflows/deploy.yml

├─ ESPECIFICACAO.md

└─ README.md

---

## 4\. Modelo de dados (`src/types.ts`)

export type PictogramSource \=

  | { kind: 'arasaac'; id: number }        // imagem em /pictogramas/{id}.png ou salva no IndexedDB

  | { kind: 'custom'; blobKey: string }    // foto enviada pelo cuidador, salva no IndexedDB

  | { kind: 'none' };

// Classe gramatical \-\> cor da borda (Chave de Fitzgerald adaptada)

export type WordClass \=

  | 'pessoa' | 'acao' | 'coisa' | 'descricao'

  | 'social' | 'pergunta' | 'negacao' | 'outro';

export interface Card {

  id: string;

  label: string;            // texto exibido no botão

  speech?: string;          // texto falado, se diferente do label

                            // ex.: label "Banheiro" \-\> fala "Preciso ir ao banheiro"

  searchTerm?: string;      // termo de busca no ARASAAC, se diferente do label

  arasaacId?: number;       // força um pictograma específico (sobrepõe a busca)

  picto: PictogramSource;

  wordClass: WordClass;

  hidden?: boolean;

}

export interface Category {

  id: string;

  name: string;

  picto: PictogramSource;

  cardIds: string\[\];

}

export interface Board {

  version: 1;

  quickPhraseIds: string\[\];               // linha fixa, sempre visível

  categories: Category\[\];

  cards: Record\<string, Card\>;

}

export interface Settings {

  voiceURI: string | null;

  rate: number;              // 0.5–2 (padrão 0.9)

  pitch: number;             // 0–2 (padrão 1\)

  volume: number;            // 0–1 (padrão 1\)

  speakOnTap: boolean;       // fala a palavra ao tocar no card (padrão true)

  clearAfterSpeak: boolean;  // limpa a frase depois de falar (padrão false)

  gridColumns: number;       // 2–6 (padrão 4\)

  fontScale: number;         // 1–2 (padrão 1\)

  showLabels: boolean;       // mostra o texto sob o pictograma (padrão true)

  theme: 'claro' | 'escuro' | 'alto-contraste';

  scanning: {

    enabled: boolean;

    mode: 'automatica' | 'dois-botoes';

    intervalMs: number;          // 500–5000 (padrão 1500\)

    acceptanceMs: number;        // tempo mínimo pressionado para valer (padrão 0\)

    auditoryPreview: boolean;    // fala baixo o nome do item destacado

    loopsBeforePause: number;    // voltas sem seleção antes de pausar (padrão 3\)

  };

}

---

## 5\. Fases de implementação

### Fase 1 — Esqueleto e prancha com voz

**Objetivo:** montar uma frase tocando nos cards e ouvir a frase falada.

- Criar o projeto Vue 3 \+ TS \+ Vite com Pinia, Vue Router (hash) e Vitest, seguindo a estrutura da seção 3\.  
- Criar `vocabulario-inicial.json` com o conteúdo da **seção 7**. Nesta fase os cards mostram só texto \+ cor da classe (sem imagem).  
- **Tela principal (`BoardView`)**, de cima para baixo:  
  1. **Barra de frase (`SentenceBar`)**: mostra os cards escolhidos em sequência. Botões: **Falar** (o maior e mais destacado), **Apagar último** e **Limpar**.  
  2. **Frases rápidas (`QuickPhrases`)**: linha fixa, sempre visível em qualquer categoria.  
  3. **Abas de categoria (`CategoryTabs`)**.  
  4. **Grade de cards (`CardGrid`)** da categoria ativa, com o número de colunas definido em `settings.gridColumns`.  
- Tocar em um card: adiciona à frase e, se `speakOnTap`, fala `speech ?? label`.  
- **Falar**: junta `speech ?? label` de cada card com espaço e fala. Frase vazia não faz nada.  
- **`useSpeech.ts`**:  
  - carregar as vozes considerando que `getVoices()` pode vir vazio no início (ouvir o evento `voiceschanged`);  
  - escolher a voz nesta ordem: `settings.voiceURI` → voz `pt-BR` com `localService === true` → qualquer `pt-BR` → qualquer `pt*` → padrão;  
  - chamar `speechSynthesis.cancel()` antes de cada fala, para não enfileirar;  
  - definir `utterance.lang = 'pt-BR'`;  
  - expor `speak(text)`, `stop()`, `voices`, `isSupported` e `isSpeaking`;  
  - se não houver suporte, mostrar um aviso visível e um modo de "frase em texto grande", para o parceiro ler na tela.

**Critério de aceite:** no Chrome (desktop e Android), tocar em "eu" → "quero" → "água" e depois em **Falar** produz a fala "eu quero água".

- [x] Projeto criado e estrutura de pastas  
- [x] Vocabulário inicial em JSON  
- [x] SentenceBar, QuickPhrases, CategoryTabs, CardGrid, CommCard  
- [x] useSpeech com seleção de voz e fallback  
- [x] Testes: sentenceStore (adicionar, apagar último, limpar, montar texto)

---

### Fase 2 — Pictogramas ARASAAC offline

**Objetivo:** cards com pictogramas que funcionam sem internet.

- **Script `scripts/baixar-pictogramas.mjs`** (Node, `fetch` nativo), rodado manualmente com `npm run pictogramas`. Para cada card e categoria do vocabulário inicial:  
    
  1. se houver `arasaacId`, usar esse id;  
  2. se não, buscar em `https://api.arasaac.org/v1/pictograms/br/search/{termo}` (`termo = searchTerm ?? label`, com `encodeURIComponent`) e pegar o `_id` do primeiro resultado;  
  3. baixar `https://api.arasaac.org/v1/pictograms/{id}?download=false` (retorna PNG) e salvar em `public/pictogramas/{id}.png`;  
  4. gravar `{ cardId: id }` em `src/data/pictogramas-map.json`.


- O script deve ser **idempotente** (não baixa de novo o que já existe), esperar um pouco entre as requisições (\~200 ms) e, ao final, listar os termos sem resultado.  
    
- Os PNGs baixados são **commitados no repositório**: o vocabulário inicial não depende da API em tempo de execução.  
    
- `CommCard` exibe o pictograma acima do texto. A imagem usa `alt=""`, porque o nome do botão já é o texto; assim o leitor de tela não lê a palavra duas vezes.  
    
- **Tela "Sobre" (`AboutView`)** com os créditos obrigatórios (texto exato na seção 9\) e um rodapé curto com link para essa tela.  
    
- [ ] Script de download funcionando e idempotente  
        
- [ ] Pictogramas exibidos nos cards e nas categorias  
        
- [ ] Tela Sobre com créditos ARASAAC

---

### Fase 3 — Modo de varredura (acessibilidade motora)

**Por que existe:** pessoas que não conseguem tocar com precisão usam um **acionador**, um botão adaptado que, no computador ou tablet, geralmente se comporta como tecla **Espaço/Enter** ou como um clique. Na varredura, o app destaca as opções uma de cada vez e a pessoa aperta o acionador quando a opção desejada está destacada.

**Varredura automática em dois níveis:**

- **Nível 1 (grupos):** Ações da frase → Frases rápidas → Categorias → Linha 1 da grade → Linha 2 → …  
- **Nível 2 (itens):** ao selecionar um grupo, a varredura percorre os itens dele. O último item de cada grupo é **"↩ Voltar"**. Ao selecionar um item, a ação é executada e a varredura volta ao nível 1\.  
- Depois de `loopsBeforePause` voltas sem seleção, a varredura pausa e mostra "Pressione para continuar".

**Acionador:**

- Tecla **Espaço** ou **Enter**, **ou** clique/toque em **qualquer ponto da tela**: com a varredura ativa, uma camada transparente captura `pointerdown`, e a tela inteira vira o botão.  
- `acceptanceMs`: a tecla ou o toque só vale se ficar pressionado por pelo menos esse tempo. Isso filtra toques acidentais e tremores.  
- **Modo `dois-botoes`** (varredura manual): Espaço avança e Enter seleciona, sem timer. Serve para quem cansa com a pressão do tempo.

**Feedback:**

- Destaque visual forte: borda de pelo menos 6 px em cor de alto contraste, com leve aumento de escala. Com `prefers-reduced-motion`, sem animação.  
- O foco real (`element.focus()`) acompanha o destaque. Os containers de grupo recebem `tabindex="-1"`.  
- `auditoryPreview`: fala o nome do item destacado em volume mais baixo (varredura auditiva, para usuários com baixa visão).

**Implementação:**

- `useScanning.ts` como **máquina de estados pura**, sem acesso ao DOM, testável com timers falsos do Vitest. Ela recebe a estrutura `{ groups: { id, itemIds[] }[] }` e expõe `highlightedId`, `level`, `start()`, `stop()`, `press()` e `advance()`.  
- Os componentes marcam os elementos com `data-scan-group` e `data-scan-item`. Uma camada fina liga a máquina de estados ao DOM.  
- Um botão de ligar/desligar a varredura fica acessível na tela principal.

**Critério de aceite:** com a varredura ativa, usando **só a barra de espaço**, montar e falar "eu quero água".

- [ ] Máquina de estados \+ testes com timers falsos  
- [ ] Integração com a tela principal  
- [ ] Acionador por teclado e toque em tela inteira, com tempo de aceitação  
- [ ] Modo dois botões  
- [ ] Varredura auditiva

---

### Fase 4 — Editor de pranchas (modo do parceiro de comunicação)

- **Entrada protegida:** botão de engrenagem que precisa ser **pressionado e segurado por 2 s**, com indicador de progresso (`HoldButton`), para que o usuário principal não entre sem querer. Também deve funcionar pelo teclado, segurando Enter (tratar `keydown` repetido e `keyup`).  
    
- **Categorias:** criar, renomear, excluir e reordenar.  
    
- **Cards:** criar, editar, ocultar, excluir, mover entre categorias e reordenar. A reordenação usa **botões ↑ ↓**; arrastar e soltar é opcional, porque não é acessível por teclado.  
    
- Campos do card: texto exibido, texto falado, classe de palavra e imagem. Um botão **"Ouvir"** testa a fala.  
    
- **Imagem do card**, em três opções:  
    
  1. **Buscar no ARASAAC** (precisa de internet): `useArasaac` usa o mesmo endpoint de busca da Fase 2 e mostra os resultados em grade. O PNG escolhido é salvo como Blob no IndexedDB e depois funciona offline.  
  2. **Enviar ou tirar foto**: `<input type="file" accept="image/*" capture="environment">`. Redimensionar no cliente para \~400 px no maior lado (via canvas) antes de salvar.  
  3. **Sem imagem.**


- **Backup:** exportar um `.json` com tudo, com as imagens em base64, e importar esse arquivo. É isso que substitui um backend para levar as pranchas de um aparelho para outro. Validar a estrutura e a versão ao importar e pedir confirmação antes de sobrescrever.  
    
- **Restaurar vocabulário inicial**, com confirmação.  
    
- Salvar automaticamente no IndexedDB a cada alteração, com debounce de \~500 ms.  
    
- As confirmações usam o elemento nativo `<dialog>`, com o foco gerenciado.  
    
- [ ] Entrada protegida  
        
- [ ] CRUD de categorias e cards  
        
- [ ] Busca ARASAAC, upload de foto e redimensionamento  
        
- [ ] Exportar e importar backup, com validação  
        
- [ ] Persistência automática  
        
- [ ] Testes: validação de importação

---

### Fase 5 — Configurações

Tela `SettingsView`, protegida da mesma forma que o editor:

- **Voz:** lista das vozes em português, marcando "(offline)" nas que têm `localService === true`; controles de velocidade, tom e volume; botão **Testar voz**.  
    
- **Prancha:** colunas da grade (2–6), tamanho do texto, mostrar/ocultar rótulos, falar ao tocar, limpar a frase depois de falar.  
    
- **Aparência:** tema claro, escuro ou alto contraste.  
    
- **Varredura:** ligar/desligar, modo, intervalo, tempo de aceitação, varredura auditiva e voltas antes de pausar.  
    
- Tudo persistido e aplicado na hora.  
    
- [ ] Tela de configurações completa  
        
- [ ] Temas via `[data-theme]` e tokens CSS  
        
- [ ] Revisão de acessibilidade de todas as telas (checklist da seção 6\)

---

### Fase 6 — PWA, offline e deploy

- **`vite-plugin-pwa`:**  
  - `registerType: 'autoUpdate'`;  
  - manifest com `name`, `short_name`, `lang: 'pt-BR'`, `display: 'standalone'`, `theme_color` e ícones 192, 512 e maskable;  
  - precache de todos os assets, **incluindo `public/pictogramas/*.png`** (ajustar `globPatterns` e, se necessário, `maximumFileSizeToCacheInBytes`);  
  - cache em tempo de execução `CacheFirst` para `api.arasaac.org`.  
- **`vite.config.ts`:** `base: process.env.BASE_PATH || '/'`, para funcionar com qualquer nome de repositório.  
- **`.github/workflows/deploy.yml`:**  
  - dispara no push na `main`;  
  - passos: checkout → setup-node (LTS) → `npm ci` → `npm run test` → `npm run build` com `BASE_PATH=/${{ github.event.repository.name }}/` → upload-pages-artifact (`dist`) → deploy-pages;  
  - permissões: `pages: write` e `id-token: write`.  
- Registrar no README o passo manual: **Settings → Pages → Source: GitHub Actions**.

**Critério de aceite:** instalar o app no celular, ativar o modo avião, abrir o app e montar e falar uma frase. Isso vale para vozes locais; algumas vozes online, como as do Chrome desktop, precisam de internet, e por isso a preferência por `localService`.

- [ ] PWA instalável e funcionando offline  
- [ ] Deploy automático no GitHub Pages

---

### Fase 7 — Qualidade e documentação

- Testes (Vitest): `useScanning`, `sentenceStore`, seleção de voz (com `speechSynthesis` mockado) e validação de backup.  
    
- Lighthouse: **Acessibilidade ≥ 95** (meta: 100\) e PWA instalável. Salvar um print do relatório em `docs/`.  
    
- Escrever o `README.md` conforme a seção 9\.  
    
- Criar `docs/co-design.md` a partir do modelo da seção 10\.  
    
- [ ] Testes passando  
        
- [ ] Lighthouse registrado  
        
- [ ] README completo  
        
- [ ] Modelo de co-design criado

---

## 6\. Requisitos de acessibilidade (valem para todas as fases)

Meta: **WCAG 2.2 nível AA**.

- `<html lang="pt-BR">`.  
- Cards, abas e ações são sempre `<button>` de verdade (nunca `<div>` clicável). O nome acessível é o texto do card. Imagens de pictograma usam `alt=""`.  
- **Área de toque mínima de 64×64 px nos cards** e espaçamento de pelo menos 8 px. É bem acima do mínimo do WCAG, porque o público pode ter dificuldade motora.  
- Navegação completa por teclado: Tab/Shift+Tab entre regiões, Enter/Espaço para ativar e **setas dentro da grade** (roving tabindex).  
- Foco sempre visível: contorno de pelo menos 3 px, com contraste mínimo de 3:1.  
- Contraste de texto de pelo menos 4,5:1 em todos os temas. O tema alto contraste é preto e amarelo ou preto e branco.  
- A cor da classe gramatical é complementar (borda ou faixa). A informação nunca depende só da cor.  
- Evitar fala duplicada: quando `speakOnTap` estiver ligado, a barra de frase **não** usa `aria-live`, porque a voz do app já dá o retorno. Quando estiver desligado, anunciar a palavra adicionada via `role="status"`.  
- Respeitar `prefers-reduced-motion`. Nada pisca.  
- Ações destrutivas (excluir, importar, restaurar) pedem confirmação. Limpar a frase não pede.  
- Usar unidades `rem`: o layout não pode quebrar com zoom de 200%.  
- Layout responsivo: celular em retrato, tablet em paisagem e desktop.  
- Testar com **NVDA** (Windows) e **TalkBack** (Android).

---

## 7\. Vocabulário inicial

> Ponto de partida. Será ajustado nas sessões de co-design.

**Frases rápidas** (linha fixa):

| Label | Fala | Classe |
| :---- | :---- | :---- |
| Sim | sim | social |
| Não | não | negacao |
| Ajuda | preciso de ajuda | social |
| Parar | para, por favor | negacao |
| Mais | mais | outro |
| Banheiro | preciso ir ao banheiro | coisa |
| Dor | estou com dor | descricao |

**Categorias:**

| Categoria | Cards | Classe |
| :---- | :---- | :---- |
| Pessoas | eu, você, mãe, pai, irmão, irmã, professor, professora, amigo, amiga | pessoa |
| Ações | quero, comer, beber, ir, brincar, dormir, ver, ouvir música, ajudar, ir embora | acao |
| Ações (negação) | não quero, não gosto | negacao |
| Comida e bebida | água, suco, leite, café, pão, fruta, biscoito, arroz e feijão, sorvete | coisa |
| Sentimentos | feliz, triste, bravo, cansado, com medo, com fome, com sede, com frio, com calor | descricao |
| Lugares | casa, escola, banheiro, quarto, parque, hospital, rua | coisa |
| Social | oi, tchau, por favor, obrigado, desculpa, tudo bem? | social |
| Perguntas | o quê?, onde?, quando?, quem?, por quê? | pergunta |

Os cards "não quero" e "não gosto" ficam **dentro da categoria Ações**, com a classe `negacao`.

**Cores por classe (Chave de Fitzgerald adaptada):**

| Classe | Cor |
| :---- | :---- |
| pessoa | amarelo |
| acao | verde |
| coisa | laranja |
| descricao | azul |
| social | rosa |
| pergunta | roxo |
| negacao | vermelho |
| outro | cinza |

As cores são aplicadas como borda ou faixa. O texto fica sempre em preto ou branco, com contraste adequado.

---

## 8\. Fora do escopo do MVP (evolução futura)

- Backend, contas de usuário e sincronização entre aparelhos  
- Conjugação verbal e concordância automáticas  
- Teclado com predição de palavras  
- Rastreamento ocular ou de cabeça via webcam  
- Múltiplos perfis de usuário no mesmo aparelho  
- Integração com Libras

---

## 9\. README (estrutura para o trabalho)

1. Nome do projeto, link do app publicado e link do vídeo  
2. Problema e público-alvo  
3. Processo de co-design (resumo \+ link para `docs/co-design.md`)  
4. Funcionalidades (com prints ou GIFs)  
5. Acessibilidade: requisitos atendidos e resultado do Lighthouse  
6. Tecnologias e por que o custo é zero (sem servidor, hospedagem gratuita, APIs nativas)  
7. Como rodar localmente (`npm install`, `npm run dev`, `npm run pictogramas`)  
8. Deploy  
9. Limitações conhecidas (as vozes variam por aparelho; no iOS a primeira fala precisa de um toque; a busca no ARASAAC exige internet)  
10. Créditos e licenças:  
    - Código: MIT.  
    - Pictogramas — texto obrigatório, exatamente assim:  
        
      > Os símbolos pictográficos utilizados são propriedade do Governo de Aragão e foram criados por Sergio Palao para a ARASAAC ([https://arasaac.org](https://arasaac.org)), que os distribui sob uma licença Creative Commons (BY-NC-SA).

      
11. Equipe

---

## 10\. Modelo para `docs/co-design.md`

\# Registro de Co-design

\> Participantes identificados apenas por papel/código (ex.: "Participante A — usuário",

\> "Participante B — fonoaudióloga"). Não registrar nomes nem dados de saúde sem

\> consentimento por escrito.

\#\# Sessão N — AAAA-MM-DD

\- \*\*Participantes:\*\*

\- \*\*Versão testada:\*\* (commit ou tag)

\- \*\*Tarefas propostas:\*\* (ex.: "pedir água usando a prancha")

\- \*\*O que funcionou:\*\*

\- \*\*Dificuldades observadas:\*\*

\- \*\*Pedidos e sugestões:\*\*

\- \*\*Decisões tomadas → mudanças implementadas:\*\* (link para commits ou issues)