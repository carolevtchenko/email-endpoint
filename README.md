# email-endpoint
Função para enviar e-mail via Resend a partir do Framer
## 🛠 Tecnologias utilizadas

Este projeto combina interface responsiva com envio automático de e-mails usando um endpoint customizado. Abaixo estão as tecnologias envolvidas:

### 🧩 Framer
- Interface criada com Framer.
- Uso de Code Component (`EmailReminderForm`) com `addPropertyControls` para personalização da UI via painel (textos, cores, bordas, fontes, etc.).

### ⚛️ React
- Lógica do formulário feita em React (functional component).
- Uso de `useState` para controlar os estados (`idle`, `loading`, `success`, `error-*`).
- Comportamentos como digitação, envio, foco e blur controlados com eventos nativos.

### 💻 JavaScript (ES6+)
- Validação de e-mail e mensagens condicionais.
- Fetch assíncrono para enviar dados ao backend (`/api/send-email`).
- Manipulação de foco e estados do formulário.

### 🧱 HTML & CSS (Inline via React)
- Layout baseado em `form`, `input`, `button`, `p`.
- Estilização inline com base nas `props` definidas no Framer.
- Layout com `flexbox` e responsividade controlada.

### 🚀 Vercel (Serverless API)
- Hospedagem do backend no Vercel com API Routes (`/api/send-email`).
- Execução de função serverless para envio de e-mail via Resend.

### ✉️ Resend (e-mail service)
- Serviço usado para enviar os e-mails de lembrete.
- Integração via API usando `@resend/node`.
- E-mails enviados com remetente personalizado: `reminder@carol-levtchenko.com`.

### 🧪 DevTools do Navegador
- Testes de falhas simuladas via bloqueio da requisição `send-email`.
- Verificação de estados, layout, acessibilidade e desempenho.

### 🔐 Acessibilidade (a11y)
- Navegação via `Tab` entre campos e botão.
- Submissão do formulário via `Enter`.
- Mensagens claras de erro e sucesso.
- Estilo de foco e feedback visual acessível.

### 🗂 Git & GitHub
- Versionamento com Git.
- Organização do repositório com:
  - `/api`: código da função de envio.
  - `/components`: código do formulário.
  - `README.md`: documentação.
  - `package.json`: dependências e scripts.
