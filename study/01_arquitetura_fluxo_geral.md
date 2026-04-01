# Aula: Arquitetura geral do Pulse Finance e fluxo entre front e back

## 1. Título da aula
Aula: Arquitetura geral do Pulse Finance e fluxo entre front e back

## 2. Resumo do que foi feito
O projeto está organizado em dois blocos principais: `frontend` e `backend`.
O front entrega a interface, os gráficos, os formulários e a navegação por abas.
O back expõe uma API HTTP com rotas para gastos, resumo, meta, conta e analytics.
Os dados ficam persistidos em `backend/data/store.json`, então o navegador pode recarregar sem perder informações.
Também existe uma área de "Assistente Financeira" no front, mas ela ainda é uma estrutura visual preparada para evoluir depois.

## 3. Visão geral da etapa
Esta etapa representa a base do produto.
Antes de pensar em automações ou IA, o sistema precisa de três coisas funcionando bem: interface, API e persistência.
O Pulse Finance faz isso com um front-end modular, um back-end em Express e um armazenamento simples em arquivo JSON.
Essa divisão é útil porque separa responsabilidades e permite evoluir cada parte sem reescrever o resto.

## 4. Explicação por partes

### Estrutura de pastas
- `frontend/` concentra tudo que o navegador executa.
- `backend/` concentra a lógica do servidor, validações e leitura/gravação de dados.
- `study/` guarda material didático separado do código do produto.

Essa organização é boa porque cada camada tem uma responsabilidade clara. O iniciante não precisa procurar lógica de servidor dentro do HTML, nem lógica de interface dentro do Express.

### Arquitetura geral
O front faz requisições para a API usando `fetch`.
O back responde com JSON, que é um formato de dados leve e fácil de transportar pela web.
O armazenamento real acontece no arquivo `store.json`, que funciona como uma pequena base local.

### Fluxo de dados
1. O usuário interage com a interface.
2. O JavaScript do front captura o evento.
3. A função da API monta a requisição HTTP.
4. O back valida a entrada, lê o arquivo e atualiza os dados.
5. A resposta volta em JSON.
6. O front atualiza a tela e os gráficos.

Esse fluxo é importante porque mostra que a interface não "adivinha" os dados. Ela depende do back para ler, calcular e persistir.

### Assistente Financeira
A aba de assistente existe no HTML e no CSS como protótipo visual.
Ela ainda não faz chamadas reais para um endpoint de IA.
Isso é um exemplo prático de diferença entre estrutura e implementação real: a interface já foi preparada, mas a funcionalidade ainda não está conectada.

## 5. Explicação dos arquivos
- [frontend/index.html](../frontend/index.html) -> define as seções da interface, os botões de navegação, os formulários e os placeholders da assistente.
- [frontend/assets/styles.css](../frontend/assets/styles.css) -> cuida do visual geral, do layout em cards, das abas, dos gráficos e do modal.
- [frontend/js/app.js](../frontend/js/app.js) -> controla o comportamento da tela, os eventos, os filtros, o carregamento inicial e a atualização da interface.
- [frontend/js/api.js](../frontend/js/api.js) -> centraliza as chamadas HTTP para a API.
- [frontend/js/state.js](../frontend/js/state.js) -> mantém o estado compartilhado do front em memória.
- [frontend/js/charts.js](../frontend/js/charts.js) -> cria e recria os gráficos do dashboard e da área analítica.
- [backend/src/server.js](../backend/src/server.js) -> define as rotas, faz a orquestração das respostas e serve o front.
- [backend/src/financeService.js](../backend/src/financeService.js) -> calcula resumo, metas, saldo da conta e insights.
- [backend/src/validation.js](../backend/src/validation.js) -> valida os dados enviados pelo front antes de salvar.
- [backend/src/dataStore.js](../backend/src/dataStore.js) -> lê e grava o arquivo JSON com os dados.

## 6. Explicação das funções e trechos importantes
- `init()` em `frontend/js/app.js` carrega categorias, busca os dados e renderiza a interface inicial.
- `refreshData()` busca resumo, gastos, meta, conta e analytics em paralelo com `Promise.all`.
- `request()` em `frontend/js/api.js` padroniza as requisições e transforma erros da API em exceções legíveis.
- `ensureStore()` em `backend/src/dataStore.js` garante que o arquivo de dados exista antes do servidor subir.
- `getSummary()` em `backend/src/financeService.js` calcula totais por período, gráfico por categoria, gastos recentes e totais gerais.
- `validateExpense()` em `backend/src/validation.js` impede salvar lançamentos com valor, data ou categoria inválidos.
- As rotas em `backend/src/server.js` recebem a requisição, validam, chamam a lógica de negócio e devolvem JSON.

## 7. Tecnologias usadas
- HTML: estrutura as telas e os campos.
- CSS: define o visual, o layout em grid, as cores e o comportamento responsivo.
- JavaScript no navegador: cuida de eventos, renderização e chamadas à API.
- Node.js: executa o back-end.
- Express: simplifica a criação das rotas HTTP.
- JSON: armazena dados e trafega entre front e back.
- Chart.js: desenha os gráficos do dashboard e da análise.

## 8. Fluxo prático
1. O navegador carrega `index.html`.
2. O CSS aplica o tema visual.
3. O `app.js` inicializa a aplicação.
4. O front busca categorias e dados consolidados na API.
5. O back lê o `store.json`, calcula os números e responde.
6. O front monta cards, tabelas e gráficos.
7. Quando o usuário cria, edita ou exclui um gasto, o ciclo se repete.

## 9. Diferença entre estrutura e implementação real
O que já existe de verdade:
- interface principal com abas
- formulário de gastos
- histórico com filtros
- meta mensal e saldo da conta
- gráficos reais alimentados pela API
- persistência em arquivo JSON

O que está só preparado:
- aba de Assistente Financeira
- texto de conversa e campo de entrada desabilitado
- pontos de integração futura com IA

O que ainda será implementado em uma evolução futura:
- endpoint do assistente
- chat funcional
- envio de contexto financeiro para um modelo de IA

Essa separação evita uma armadilha comum: parecer pronto sem estar pronto.

## 10. Pontos importantes para aprender
- Separar front, back e armazenamento deixa o código mais fácil de entender.
- `Promise.all` reduz tempo de carregamento ao buscar vários dados ao mesmo tempo.
- O back não confia cegamente no front; ele valida antes de salvar.
- Gráficos precisam ser recriados com cuidado para não acumular instâncias antigas.
- A interface preparada para IA não deve ser confundida com uma IA realmente conectada.

## 11. Erros comuns
- Confundir protótipo visual com funcionalidade pronta.
- Colocar regra de negócio pesada dentro do front.
- Esquecer de validar dados no back e confiar apenas no formulário.
- Misturar responsabilidades em um único arquivo grande.
- Não diferenciar "dados carregados" de "dados persistidos".

## 12. Como revisar essa etapa depois
- Releia primeiro `README.md` para entender a intenção do projeto.
- Depois leia `frontend/index.html` para mapear as telas.
- Em seguida leia `frontend/js/app.js` para entender o fluxo real.
- Por último leia `backend/src/server.js` e `backend/src/financeService.js` para ver de onde vêm os números.
- Tente explicar com suas palavras onde cada dado nasce, onde ele é processado e onde ele aparece na tela.

## 13. Exercícios
1. Explique a diferença entre interface preparada e funcionalidade implementada usando a aba de assistente como exemplo.
2. Descreva o caminho completo de um gasto desde o formulário até o `store.json`.
3. Identifique qual arquivo concentra renderização e qual arquivo concentra dados.
4. Diga por que validar no back é importante mesmo quando o front já impede erros.
5. Explique em linguagem simples o que `fetch`, `JSON` e `endpoint` significam neste projeto.

## 14. Mini desafio opcional
Desenhe no papel ou em texto um novo fluxo para o assistente financeiro.
Inclua: entrada do usuário, chamada da API, processamento no back e resposta na tela.
No final, marque quais partes já existem e quais ainda precisam ser criadas.
