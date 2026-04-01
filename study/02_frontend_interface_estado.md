# Aula: Front-end do Pulse Finance, estado e interações

## 1. Título da aula
Aula: Front-end do Pulse Finance, estado e interações

## 2. Resumo do que foi feito
O front-end foi dividido em arquivos menores para separar comportamento, estado, API e gráficos.
O HTML descreve as abas, os cards, os formulários e o modal de edição.
O `app.js` controla eventos como cliques, submissões e filtros.
O `state.js` guarda os dados carregados em memória para evitar repetir consultas desnecessárias.
O `charts.js` desenha e recria os gráficos com base nos dados retornados pelo back.

## 3. Visão geral da etapa
Esta camada é a parte que o usuário enxerga e usa diretamente.
Ela não calcula tudo sozinha: recebe dados da API, organiza a tela e reage às ações do usuário.
Uma boa interface aqui não é só bonita; ela também precisa deixar claro o que está acontecendo, evitar confusão e responder rápido.

## 4. Explicação por partes

### `index.html`
O HTML define a estrutura da página.
Ele organiza a navegação por abas, o topo, os painéis do dashboard, o formulário de lançamento rápido, o histórico, as metas, a área analítica e a assistente.

Isso é importante porque o HTML oferece a "espinha dorsal" da aplicação. Sem ele, o JavaScript não teria onde encaixar os dados nem onde ouvir os eventos.

### `styles.css`
O CSS cria a identidade visual.
Ele usa variáveis de cor, cards translúcidos, sombras, gradientes, grids responsivos e estados visuais para botões e alertas.

Essa abordagem faz sentido porque o projeto quer parecer moderno sem perder legibilidade.

### `state.js`
Esse arquivo guarda o estado compartilhado.
Estado, aqui, significa o conjunto de dados que a interface precisa conhecer para renderizar a tela: categorias, gastos, resumo, meta, conta e analytics.

Usar um estado central simplifica o raciocínio. Em vez de cada função buscar dados do zero, elas consultam uma fonte única em memória.

### `api.js`
Esse arquivo centraliza as requisições HTTP.
Ele evita repetir `fetch` espalhado pelo código e padroniza o tratamento de erro.

Isso deixa o front mais limpo e mais fácil de manter.

### `app.js`
Este é o cérebro da interface.
Ele faz a inicialização, alterna abas, prepara os eventos, renderiza listas, atualiza cards, abre o modal, envia formulários e recarrega dados depois de ações importantes.

### `charts.js`
Esse arquivo integra Chart.js ao projeto.
Ele cria gráficos de rosca, linha, pizza e barras.
Também destrói gráficos antigos antes de criar novos, o que evita duplicação visual e vazamento de memória.

## 5. Explicação dos arquivos
- [frontend/index.html](../frontend/index.html) -> estrutura principal da interface.
- [frontend/assets/styles.css](../frontend/assets/styles.css) -> aparência visual e responsividade.
- [frontend/js/state.js](../frontend/js/state.js) -> estado global do front.
- [frontend/js/api.js](../frontend/js/api.js) -> comunicação com a API.
- [frontend/js/app.js](../frontend/js/app.js) -> lógica de interação e renderização.
- [frontend/js/charts.js](../frontend/js/charts.js) -> construção dos gráficos.

## 6. Explicação das funções e trechos importantes
- `showTab(tabId)` alterna a aba ativa e controla qual seção fica visível.
- `renderCategories()` popula selects com as categorias recebidas da API.
- `renderCategoryChips()` cria botões de atalho para lançamento rápido.
- `renderDashboard()` escreve os totais e os gastos recentes no HTML.
- `getFilteredExpenses()` filtra e ordena o histórico conforme os controles de busca.
- `renderHistory()` desenha a tabela com base nos filtros ativos.
- `renderGoal()` atualiza a barra de progresso e os alertas da meta.
- `renderAnalytics()` mostra os destaques e chama os gráficos analíticos.
- `bindForms()` conecta formulários ao fluxo de criação, edição de meta e atualização de saldo.
- `openEditModal()` preenche o modal com os dados do gasto escolhido.
- `refreshData()` busca novamente os dados principais depois de mudanças importantes.

## 7. Tecnologias usadas
- JavaScript ES Modules: organiza o front em arquivos importáveis.
- DOM: é a árvore de elementos da página que o JavaScript lê e altera.
- Fetch API: faz requisições HTTP.
- Chart.js: desenha os gráficos.
- CSS Grid e Flexbox: montam layouts mais adaptáveis.
- `Intl.NumberFormat`: formata valores monetários no padrão desejado.

## 8. Fluxo prático
1. A página carrega e o `init()` roda.
2. O front busca categorias.
3. O estado é preenchido com os dados recebidos.
4. A interface renderiza dashboard, histórico, metas e analytics.
5. O usuário clica em uma aba, preenche um formulário ou filtra a lista.
6. O JavaScript reage ao evento, atualiza a tela ou chama a API.
7. Se a operação altera dados, o front busca tudo de novo para manter a tela sincronizada.

## 9. Diferença entre estrutura e implementação real
O que já existe de verdade:
- navegação por abas funcionando
- formulários reais para cadastrar e editar gastos
- filtros de histórico
- modal de edição
- atualização visual de meta e conta
- gráficos ligados aos dados da API

O que está só preparado:
- aba da assistente com mensagens de exemplo
- campo de chat desabilitado

O que ainda não está implementado:
- conversa funcional com IA
- envio de mensagens do usuário para uma API de assistente

## 10. Pontos importantes para aprender
- Dividir o front em arquivos pequenos melhora a manutenção.
- Estado central evita cópias confusas de informação.
- Renderização e requisição são coisas diferentes: uma mostra dados, a outra busca dados.
- Eventos de `submit`, `click`, `input` e `blur` são a base das interações.
- Recarregar dados após salvar evita tela desatualizada.

## 11. Erros comuns
- Misturar captura de dados, validação e renderização na mesma função sem necessidade.
- Atualizar só um pedaço da tela e esquecer o restante.
- Não destruir gráficos antigos antes de recriar novos.
- Usar valores do formulário sem normalizar formato monetário.
- Tratar a interface de assistente como algo já funcional quando ela é só um protótipo.

## 12. Como revisar essa etapa depois
- Comece por `index.html` para enxergar a estrutura da página.
- Depois leia `app.js` de cima para baixo e marque quais funções lidam com evento, renderização e API.
- Em seguida observe `state.js` para entender quais dados a interface precisa guardar.
- Por fim, confira `charts.js` para ver como os números viram gráficos.
- Tente refazer mentalmente o fluxo de um gasto novo desde o clique até o refresh da interface.

## 13. Exercícios
1. Explique com suas palavras o que é estado no front-end deste projeto.
2. Aponte quais funções em `app.js` renderizam dados e quais apenas preparam eventos.
3. Descreva por que `refreshData()` é chamado depois de criar ou excluir um gasto.
4. Explique o papel de `charts.js` sem usar a palavra "gráfico" no começo da resposta.
5. Imagine que o modal de edição parou de abrir. Onde você começaria a investigar?

## 14. Mini desafio opcional
Adicione mentalmente uma nova aba chamada "Comparativo".
Liste quais partes do front você precisaria alterar: HTML, CSS, estado, renderização e busca de dados.
Depois explique o que seria visual e o que seria lógica.
