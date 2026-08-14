# 📱 J Smart Services — Projeto Android Nativo (Guia de Compilação e Teste APK)

Este diretório contém o projeto **Android Nativo em Kotlin / Android Studio** da plataforma **J Smart Services Angola**.

---

## 🎯 Arquitetura e Integração Unificada:
1. **Backend Principal:** O app conecta-se diretamente ao Cloudflare Worker em `https://j-smart-services-app.jfigueiredo790.workers.dev`.
2. **Base de Dados Única:** Utiliza a mesma base de dados do Cloud Firestore (`ai-studio-jsmartservices-dd54ef3d-8456-4336-a85a-7d7350f4594e`).
3. **Contas Unificadas:** Qualquer conta criada no site (Cliente, Profissional, Administrador) faz login imediatamente no aplicativo Android com a mesma palavra-passe e permissões.
4. **Sem Duplicações:** Não há bases de dados locais ou duplicadas. Todas as fotos, conversas, orçamentos e transações de carteira sincronizam em tempo real.

---

## 🚀 Como Gerar o APK de Teste no seu Computador:

### Opção A: Usando o Android Studio (Interface Visual - Mais Fácil)
1. Abra o **Android Studio** (versão Iguana, Jellyfish, Koala ou superior).
2. Selecione **File > Open** e escolha a pasta `android` deste projeto.
3. Aguarde o Gradle sincronizar as dependências automaticamente.
4. No menu superior, clique em:
   **Build > Build Bundle(s) / APK(s) > Build APK(s)**.
5. Quando o processo terminar, aparecerá uma notificação no canto inferior direito:
   **"APK(s) generated successfully"**.
6. Clique em **"locate"** para abrir a pasta onde está o ficheiro:
   `app-debug.apk` (localizado em `android/app/build/outputs/apk/debug/app-debug.apk`).
7. Transfira o ficheiro `app-debug.apk` para o seu telefone Android via WhatsApp, cabo USB ou Google Drive e instale!

---

### Opção B: Usando a Linha de Comandos (Terminal)
No terminal, dentro da pasta `android`:
```bash
# No Linux / macOS
./gradlew assembleDebug

# No Windows PowerShell
.\gradlew.bat assembleDebug
```
O APK gerado ficará em:
`app/build/outputs/apk/debug/app-debug.apk`

---

## ✨ Recursos Nativos Incluídos no Aplicativo:
- 🚀 **Splash Screen & Carregamento:** Logótipo oficial da J Smart Services com animação de carregamento.
- 🔄 **Puxar para Atualizar (Swipe-to-Refresh):** Puxar o ecrã para baixo atualiza os dados em tempo real.
- 📡 **Tratamento de Falta de Internet:** Se o utilizador ficar sem rede móvel ou Wi-Fi, o app exibe uma tela elegante com o botão *"Tentar Novamente"* sem travar nem dar ecrã branco.
- 🔙 **Botão Voltar do Android:** Permite fechar modais/voltar páginas anteriores na WebView sem fechar o app abruptamente (com confirmação de duplo toque para sair na tela inicial).
- 📸 **Upload de Fotos & Câmara:** Suporte completo ao seletor de ficheiros do Android (tirar foto na hora ou escolher comprovativos e fotos da galeria).
- 💬 **Links Externos e WhatsApp:** Botões de contacto abrem diretamente o WhatsApp oficial sem quebrar a navegação da aplicação.
- 🔒 **Regras de Privacidade de BI:** As mesmas regras ativas no site aplicam-se no app móvel.
