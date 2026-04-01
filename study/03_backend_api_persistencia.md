# Aula: Back-end do Pulse Finance, API e persistência de dados

## 1. Título da aula
Aula: Back-end do Pulse Finance, API e persistência de dados

## 2. Resumo do que foi feito
O back-end foi construído em Node.js com Express.
Ele expõe rotas para categorias, gastos, resumo, meta, conta e analytics.
Também faz validação dos lançamentos antes de gravar qualquer coisa no arquivo de dados.
A persistência é simples e direta: o conteúdo vive em `backend/data/store.json`.
O servidor também serve os arquivos do front, então o projeto roda como uma aplicação única.

## 3. Visão geral da etapa
O back-end é a parte que torna os números confiáveis.
Sem ele, a interface só mostraria dados fictícios ou locais.
Aqui estão as regras centrais do sistema: validar, calcular, salvar e responder.
Essa camada organiza a lógica do negócio e protege o armazenamento.

## 4. Explicação por partes

### `server.js`
Esse arquivo cria o servidor Express e registra todas as rotas.
Ele também serve o front-end estático.

Na prática, isso significa que o navegador pode acessar a interface e a API pelo mesmo projeto e pela mesma porta.

### `validation.js`
Esse arquivo protege a entrada de dados.
Ele confere valor, categoria, descrição, data e forma de pagamento antes de aceitar um gasto.

Isso é importante porque a API não pode confiar só no formulário do front.

### `financeService.js`
Esse arquivo concentra a lógica de negócio.
Ele calcula totais por dia, semana e mês, identifica categoria principal, monta gráficos, avalia meta e calcula saldo da conta.

Separar cálculo de rota é uma boa prática porque a rota só encaminha, e a regra de negócio fica isolada.

### `dataStore.js`
Esse arquivo trata o armazenamento em arquivo.
Ele cria o diretório, garante o arquivo inicial e lê/grava o JSON.

Essa escolha é simples e suficiente para uma aplicação local ou de demonstração. Não é banco de dados completo, mas atende bem ao objetivo atual.

## 5. Explicação dos arquivos
- [backend/src/server.js](../backend/src/server.js) -> servidor, rotas e orquestração.
- [backend/src/validation.js](../backend/src/validation.js) -> regras de validação de gasto.
- [backend/src/financeService.js](../backend/src/financeService.js) -> cálculos e insights financeiros.
- [backend/src/dataStore.js](../backend/src/dataStore.js) -> leitura e escrita do armazenamento.
- [backend/data/store.json](../backend/data/store.json) -> dados persistidos do projeto.
- [backend/package.json](../backend/package.json) -> scripts e dependências do back-end.

## 6. Explicação das funções e trechos importantes
- `ensureStore()` garante que o arquivo exista antes do servidor iniciar.
- `readStore()` lê e converte o JSON salvo em objeto JavaScript.
- `saveStore()` grava o estado atual no disco.
- `validateExpense()` impede dados incompletos ou incoerentes.
- `getSummary()` calcula totais e dados para dashboard.
- `getGoalStatus()` compara gasto do mês com a meta definida.
- `getAccountStatus()` calcula saldo atual com base no saldo inicial.
- `getInsights()` gera mensagens automáticas com base nos números.
- As rotas `GET`, `POST`, `PUT` e `DELETE` em `server.js` são o ponto de entrada da API.

## 7. Tecnologias usadas
- Node.js: executa o código do servidor.
- Express: cria rotas e responde requisições HTTP.
- `fs/promises`: lê e escreve arquivos de forma assíncrona.
- JSON: armazena os dados do projeto.
- JavaScript no servidor: aplica regras de negócio e validações.

## 8. Fluxo prático
1. O front envia uma requisição para a API.
2. A rota correspondente em `server.js` recebe os dados.
3. Se necessário, `validation.js` confere o payload.
4. `dataStore.js` lê o arquivo atual.
5. O back atualiza o objeto em memória.
6. `saveStore()` grava o novo estado no disco.
7. A API devolve JSON para o front renderizar.

## 9. Diferença entre estrutura e implementação real
O que já existe de verdade:
- API completa para gastos
- resumo financeiro
- meta mensal
- saldo da conta
- analytics com destaques
- persistência em JSON
- validação de entrada

O que está só preparado:
- integração com IA para assistente financeiro
- rota de chat
- uso de contexto de gastos para resposta inteligente

O que ainda não foi implementado:
- endpoint real da assistente
- processamento de mensagens do usuário por um modelo de linguagem

## 10. Pontos importantes para aprender
- A rota não deve acumular toda a lógica; ela só recebe e devolve.
- Validação evita que dados ruins entrem no armazenamento.
- Persistência em arquivo é simples e boa para começar.
- Funções como `getSummary()` transformam dados brutos em informação útil.
- Um mesmo conjunto de gastos pode gerar várias leituras: total, meta, conta e insights.

## 11. Erros comuns
- Esquecer de validar antes de gravar.
- Misturar leitura de arquivo, cálculo e resposta HTTP em uma única função enorme.
- Tratar `store.json` como se fosse banco de dados completo.
- Não normalizar números antes de salvar.
- Usar a interface da assistente como se já houvesse IA conectada.

## 12. Como revisar essa etapa depois
- Comece por `server.js` e observe a ordem das rotas.
- Depois leia `validation.js` para entender o que a API aceita ou rejeita.
- Em seguida, leia `financeService.js` e tente reproduzir mentalmente os cálculos.
- Por fim, leia `dataStore.js` e veja como o arquivo de dados é mantido.
- Explique para si mesmo a diferença entre "receber requisição", "processar dado" e "persistir dado".

## 13. Exercícios
1. Explique por que a API precisa validar um gasto mesmo que o front já tenha campos obrigatórios.
2. Descreva o papel de cada arquivo do back-end em uma frase simples.
3. Diga o que acontece quando o usuário cria um novo gasto.
4. Explique como a lógica de meta mensal se conecta ao resumo financeiro.
5. Identifique uma vantagem e uma limitação de usar `store.json` como persistência.

## 14. Mini desafio opcional
Pense em uma nova rota chamada `POST /api/assistant`.
Escreva em palavras o que essa rota precisaria fazer antes de responder:
ler contexto, montar resumo, validar entrada e retornar mensagem.
Depois diga o que ficaria no front e o que ficaria no back.
