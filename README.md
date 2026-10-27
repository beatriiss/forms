# Qual o lifestyle da Geração Z?

Formulário de pesquisa acadêmica sobre hábitos e estilo de vida da Geração Z (lazer, relacionamentos, álcool, nicotina, atividade física, religião e redes sociais).

Feito em Next.js para cobrir o que o Google Forms não resolvia bem: quem é da **Geração Y (Millennials)** passa por uma tela de aviso e vê, em todas as seções, um lembrete para responder pensando em quando tinha entre 18 e 20 e poucos anos. Cada resposta registra a geração, o que facilita comparar os dois grupos.

As respostas são salvas numa planilha do Google Sheets via Google Apps Script.

## Rodando localmente

1. Instale as dependências:
   ```bash
   npm install
   ```
2. Configure a planilha seguindo as instruções no topo de [`apps-script/Code.gs`](apps-script/Code.gs).
3. Copie `.env.example` para `.env.local` e preencha:
   ```
   GOOGLE_SHEETS_WEBHOOK_URL=https://script.google.com/macros/s/SEU_ID/exec
   GOOGLE_SHEETS_SECRET=o-mesmo-valor-da-propriedade-SECRET-do-Apps-Script
   ```
4. Rode:
   ```bash
   npm run dev
   ```
   e abra [http://localhost:3000](http://localhost:3000).

## Estrutura

- [`src/lib/questions.ts`](src/lib/questions.ts): seções, perguntas e opções (edite aqui para mudar o questionário).
- [`src/components/SurveyForm.tsx`](src/components/SurveyForm.tsx): formulário em etapas, validação, ramificação por geração e aviso de saída.
- [`src/app/actions.ts`](src/app/actions.ts): Server Action que valida as respostas e envia para a planilha.
- [`apps-script/Code.gs`](apps-script/Code.gs): script que grava as respostas na aba "Respostas" da planilha.

## Publicando

Funciona na [Vercel](https://vercel.com/new): importe o repositório e cadastre as variáveis `GOOGLE_SHEETS_WEBHOOK_URL` e `GOOGLE_SHEETS_SECRET`.
