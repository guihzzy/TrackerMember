<div align="center">

# 🛰️ TrackerMember

**Sistema de Monitoramento Discord em Tempo Real com Discord Components V2**

[![Node.js](https://img.shields.io/badge/Node.js-18.x%20%7C%2020.x%20%7C%2022.x-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Discord.js](https://img.shields.io/badge/Discord.js-v14.27.0-5865F2?style=flat-square&logo=discord&logoColor=white)](https://discord.js.org/)
[![Selfbot-v13](https://img.shields.io/badge/Discord.js--Selfbot-v13.7.1-eb459e?style=flat-square&logo=discord&logoColor=white)](https://github.com/aiko-chan-ai/discord.js-selfbot-v13)
[![License](https://img.shields.io/badge/License-ISC-blue?style=flat-square)](LICENSE)

</div>

---

## 📖 Visão Geral

O **TrackerMember** é uma solução híbrida e robusta em Node.js projetada para monitorar continuamente as atividades de um usuário específico no Discord.

O sistema opera combinando duas camadas complementares:
1. **Selfbot Gateway (`discord.js-selfbot-v13`)**: Conecta-se via WebSocket para interceptar pacotes de baixo nível em tempo real (mudanças de canais de voz, atualizações imediatas de avatar e eventos de presença).
2. **Bot Oficial (`discord.js v14`)**: Responsável por receber os eventos processados e despachar notificações ricas e modernas utilizando os novos **Discord Components V2 (`ContainerBuilder`)**.

---

## ✨ Funcionalidades

| Evento | Origem | Descrição |
| :--- | :--- | :--- |
| 🟢 **Entrou em Chamada** | WebSocket | Detecta quando o membro entra em um canal de voz, listando canal e participantes presentes. |
| 🔴 **Saiu da Chamada** | WebSocket | Detecta quando o membro sai de um canal de voz e detalha os membros remanescentes. |
| 🟡 **Trocou de Canal** | WebSocket | Identifica a transição imediata do canal de origem para o canal de destino. |
| 🟠 **Alteração de Avatar** | WebSocket / Raw | Detecta alteração de avatar, faz o download em alta resolução (PNG/GIF) e envia via `MediaGalleryBuilder`. |
| 🟢 **Ficou Online** | Presence / WebSocket | Notifica quando o usuário fica online e identifica os dispositivos ativos (Desktop, Celular, Web). |
| 🟤 **Dispositivo Conectou/Desconectou** | Presence Intent | Detecta conexões ou desconexões parciais entre múltiplos dispositivos. |
| 🔴 **Ficou Offline** | Presence Intent | Alerta quando todas as sessões do usuário são encerradas. |

---

## 🛠️ Tecnologias e Arquitetura

- **Discord Components V2**: Design moderno com cartões estilizados (`ContainerBuilder`, `SectionBuilder`, `ThumbnailBuilder`, `MediaGalleryBuilder`, `SeparatorBuilder`).
- **Sistema Anti-Duplicação**: Fingerprint inteligente de estado para evitar spam e eventos duplicados de múltiplos servidores mútuos.
- **Gerenciamento Automático de Mídia**: Download de avatares com exclusão imediata dos arquivos temporários após o envio.
- **Polyfills Integrados**: Compatibilidade garantida com Node.js 18+ para APIs ES2023 (`toReversed`, `toSorted`, `toSpliced`, `with`, `Object.groupBy`, `String.isWellFormed`, etc.).

---

## 📂 Estrutura do Projeto

```text
TrackerMember/
├── src/
│   ├── builders/
│   │   └── containers.js    # Construtores visuais dos Containers V2
│   ├── clients/
│   │   ├── bot.js          # Cliente Discord Bot Oficial (envio de logs & presença)
│   │   └── selfbot.js      # Cliente Selfbot (captura de eventos de WebSocket)
│   ├── utils/
│   │   ├── date.js         # Formatador de datas no fuso horário do Brasil
│   │   └── image.js        # Download e limpeza de imagens temporárias
│   ├── config.js           # Gerenciamento e validação de variáveis de ambiente
│   ├── index.js            # Ponto de entrada do sistema
│   └── polyfills.js        # Polyfills de compatibilidade
├── test/
│   └── test_all_containers.js  # Testes unitários dos 8 layouts de Containers V2
├── .env.example            # Exemplo de configuração de variáveis
├── .gitignore              # Proteção contra commit de credenciais e dependências
├── package.json
└── README.md
```

---

## 🚀 Como Instalar e Executar

### 1. Pré-requisitos
- [Node.js](https://nodejs.org/) versão **18.0.0** ou superior.
- Uma aplicação criada no [Discord Developer Portal](https://discord.com/developers/applications) com um Bot adicionado ao seu servidor de logs.
- Um token de conta de usuário do Discord para captura de eventos via WebSocket.

### 2. Configurar Intents do Bot no Discord Developer Portal
Acesse o [Discord Developer Portal](https://discord.com/developers/applications) > Selecione sua Aplicação > **Bot** > Ative as seguintes opções em **Privileged Gateway Intents**:
- [x] **Presence Intent**
- [x] **Server Members Intent**

### 3. Instalação
Clone o repositório e instale as dependências:

```bash
# Clonar o repositório
git clone https://github.com/seu-usuario/TrackerMember.git
cd TrackerMember

# Instalar pacotes
npm install
```

### 4. Configurar as Variáveis de Ambiente
Copie o arquivo `.env.example` para `.env`:

```bash
cp .env.example .env
```

Abra o arquivo `.env` e preencha com seus dados:

```env
# Token da conta de usuário (Selfbot) para escutar eventos via WebSocket
TOKEN=seu_user_token_aqui

# Token do Bot Oficial (Discord Developer Portal) para rastrear presença e enviar logs
STATUS_BOT_TOKEN=seu_bot_token_aqui

# ID do usuário a ser monitorado
TARGET_USER_ID=000000000000000000

# ID do canal de texto onde os logs dos containers serão enviados
LOG_CHANNEL_ID=000000000000000000
```

### 5. Testar os Containers V2
Antes de iniciar, você pode validar a estrutura de todos os containers executando:

```bash
npm test
```

### 6. Iniciar a Aplicação

```bash
npm start
```

---

## 🔒 Segurança e Boas Práticas

> [!CAUTION]
> **Nunca compartilhe seus tokens ou commite o arquivo `.env`!**
> Certifique-se de que o arquivo `.env` está presente no `.gitignore` antes de enviar qualquer alteração para o GitHub.

> [!WARNING]
> O uso de bibliotecas de automação em contas de usuário (selfbots) pode violar os [Termos de Serviço do Discord](https://discord.com/terms). Utilize este projeto exclusivamente para fins educacionais e de pesquisa.

---

## 📄 Licença

Este projeto está sob a licença [ISC](LICENSE).

---

<p align="center">Feito com ❤️ por <b>Guih</b></p>