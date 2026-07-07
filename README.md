# 💹 NeoFinance — Controle Financeiro Pessoal

Um site **moderno, responsivo e interativo** de controle financeiro pessoal, com visual premium
em tons escuros e detalhes em **verde e azul neon**, cartões com efeito *glassmorphism*, gráficos
animados e uma experiência semelhante a um aplicativo bancário profissional.

Tudo funciona **100% no navegador**, sem dependências externas e sem servidor — os dados ficam
salvos localmente (`localStorage`) e nada sai do seu dispositivo.

![tema escuro e claro](https://img.shields.io/badge/tema-claro%20%2F%20escuro-23f0a6) ![sem dependências](https://img.shields.io/badge/depend%C3%AAncias-zero-38bdf8) ![responsivo](https://img.shields.io/badge/layout-responsivo-4f8bff)

## 🚀 Como usar

Basta abrir o arquivo **`index.html`** em qualquer navegador moderno.

```bash
# opcional: servir localmente
python3 -m http.server 8000
# depois acesse http://localhost:8000
```

Na tela de login você pode **criar uma conta**, **entrar** ou usar o botão
**"Entrar sem cadastro (visitante)"**. O app começa **totalmente zerado** — é só
cadastrar seus próprios lançamentos, contas, cartões e metas.

## ✨ Funcionalidades

### Painel & lançamentos
- **Dashboard** com saldo atual, receitas, despesas, investimentos e patrimônio (contadores animados).
- **Widgets personalizáveis** — escolha o que aparece no painel.
- **Cadastro de receitas e despesas** com categorias personalizadas (ícone + cor), forma de
  pagamento, observação e **anexo de comprovante**.
- **Filtros** por período, categoria e forma de pagamento + **busca rápida global**.

### Gestão
- **Contas fixas e variáveis** com vencimentos.
- **Cartões de crédito** com limite, fatura atual, próximas faturas e **parcelas**.
- **Assinaturas mensais** (ativar/pausar, total mensal e anual).
- **Orçamento mensal por categoria** com indicadores visuais (dentro / atenção / estourado).

### Planejamento
- **Metas financeiras** com barra de progresso animada, depósitos e **recompensa visual** ao concluir.
- **Reserva de emergência** com medidor circular e cálculo de meses cobertos.
- **Planejamento mensal e anual** com detalhamento e taxa de poupança.
- **Simulador de investimentos** (juros compostos) com gráfico em tempo real.
- **Calendário financeiro** com vencimentos, lançamentos e lembretes.

### Insights & inteligência
- **IA de hábitos financeiros** — dicas de economia baseadas nos seus dados.
- **Previsão do saldo** até o fim do mês.
- **Alertas inteligentes** para contas próximas do vencimento e gastos acima da média.
- **Notificações em tempo real**.
- **Conquistas (badges)** para incentivar boas práticas financeiras.
- **Relatórios completos** com exportação para **PDF**, **Excel** e **CSV**.

### Experiência
- **Modo claro e escuro** com transição suave.
- Cartões com **glassmorphism**, microanimações em botões/menus/gráficos, confetes de celebração.
- **Gráficos animados** (pizza/rosca, barras e linhas) desenhados em SVG puro.
- **Login** com perfil do usuário e **backup automático** (exportar/importar JSON).
- **Layout totalmente responsivo** (celular, tablet e computador).

## 🧱 Estrutura

```
index.html          Shell da aplicação (splash, login, app, modais)
css/styles.css      Design system: temas, glassmorphism, animações, responsividade
js/utils.js         Formatação (BRL, datas), helpers de DOM, contadores animados
js/store.js         Camada de dados (localStorage), dados de exemplo, backup
js/charts.js        Gráficos animados em SVG (rosca, barras, linhas, sparkline)
js/auth.js          Autenticação client-side (SHA-256 no navegador)
js/ai.js            Motor de insights, previsão e simulador
js/app.js           Aplicação: rotas, telas, modais, exportações, conquistas
```

## 🎨 Gráficos & acessibilidade

Os gráficos usam uma **paleta categórica validada para daltonismo (CVD-safe)**, com marcas finas,
extremidades arredondadas, espaçamento entre séries, legenda e *tooltips* no hover — seguindo boas
práticas de visualização de dados, adaptadas aos temas claro e escuro.

## 🔒 Sobre segurança dos dados

Este é um projeto **front-end**: a autenticação e o "banco de dados" são simulados no navegador
(`localStorage`) para fins de demonstração. Para uso em produção com múltiplos usuários, conecte a
uma API/back-end real com autenticação no servidor. Faça **backups** pela tela de Configurações.

## 🌐 Compatibilidade

Chrome, Edge, Firefox e Safari recentes (desktop e mobile). Sem build, sem instalação.
