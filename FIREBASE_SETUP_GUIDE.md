# Guia de Configuração do Firebase para Resenha Chat

Este guia vai te ajudar a configurar um novo projeto Firebase para o aplicativo Resenha Chat.

## Passo 1: Criar um novo projeto Firebase

1. Acesse o [Firebase Console](https://console.firebase.google.com/)
2. Clique em "Adicionar projeto"
3. Digite um nome para o projeto (ex: "Resenha Chat")
4. Escolha se deseja ativar o Google Analytics (recomendado)
5. Clique em "Criar projeto"

## Passo 2: Configurar o Realtime Database

1. No menu lateral, clique em "Realtime Database"
2. Clique em "Criar banco de dados"
3. Escolha o modo inicial - selecione "Iniciar no modo de teste" para desenvolvimento
4. Escolha um local para o banco de dados (o mais próximo dos seus usuários)
5. Clique em "Ativar"

## Passo 3: Registrar a aplicação web

1. Na página de visão geral do projeto, clique no ícone web (</>) para adicionar um aplicativo web
2. Dê um apelido para seu aplicativo (ex: "Resenha Web App")
3. (Opcional) Marque "Também configurar o Firebase Hosting"
4. Clique em "Registrar app"
5. O Firebase irá gerar os detalhes de configuração - você precisará dessas informações

## Passo 4: Atualizar a configuração do Firebase no código

1. Localize o arquivo `public/js/firebase-config.js` no seu projeto
2. Substitua o objeto `firebaseConfig` com as informações geradas pelo Firebase:

```javascript
const firebaseConfig = {
  apiKey: "SUA_API_KEY",
  authDomain: "SEU_PROJETO_ID.firebaseapp.com",
  databaseURL: "https://SEU_PROJETO_ID-default-rtdb.firebaseio.com",
  projectId: "SEU_PROJETO_ID",
  storageBucket: "SEU_PROJETO_ID.appspot.com",
  messagingSenderId: "SEU_MESSAGING_SENDER_ID",
  appId: "SEU_APP_ID",
  measurementId: "SEU_MEASUREMENT_ID" // Opcional se você estiver usando Analytics
};
```

## Passo 5: Inicializar a estrutura do banco de dados

1. Depois de atualizar a configuração, abra a página de inicialização do banco de dados, acessando:
   http://seusite.com/initialize.html
   (ou localmente: file:///caminho/para/seu/projeto/public/initialize.html)

2. Clique no botão "Inicializar Banco de Dados"

3. A página irá criar a estrutura necessária no Firebase e configurar as senhas padrão:
   - Senha diária: `resenha123`
   - Senha mestra: `resenha@admin` (prefixo: `msm:`)

## Passo 6: Testar seu aplicativo

1. Volte para a página principal do aplicativo (index.html)
2. Verifique se a conexão com o Firebase está funcionando
3. Use a senha diária (`resenha123`) ou a senha mestra (`msm:resenha@admin`) para acessar

## Passo 7 (Opcional): Configurar regras de segurança

1. No console do Firebase, acesse "Realtime Database" > "Regras"
2. Configure regras de segurança mais robustas para seu aplicativo em produção
3. Exemplo de regras básicas:

```json
{
  "rules": {
    ".read": "auth.uid != null || true",
    ".write": "auth.uid != null || true",
    "adminSettings": {
      ".read": "auth.uid != null || true",
      ".write": "auth.uid != null || true"
    }
  }
}
```

## Solução de problemas

Se você encontrar problemas ao configurar o Firebase:

1. Verifique se os scripts do Firebase estão carregando corretamente (sem bloqueios de rede)
2. Confirme se as informações de configuração foram copiadas corretamente
3. Verifique no console do navegador se há mensagens de erro relacionadas ao Firebase
4. Certifique-se de que o Realtime Database esteja ativado no seu projeto Firebase

## Recursos adicionais

- [Documentação do Firebase](https://firebase.google.com/docs)
- [Guia de início rápido para web](https://firebase.google.com/docs/web/setup)
- [Documentação do Realtime Database](https://firebase.google.com/docs/database) 