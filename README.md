# Never Pure Bot

Bot Discord completo para gestão de servidor GTA RP — desenvolvido com **Discord.js v14** e hospedado na **Discloud**.

---

## Módulos

| Módulo | Descrição |
|---|---|
| 📋 **Recrutamento** | Ficha de entrada, aprovação/reprovação e DM automática |
| ⚔️ **Escalação** | Criação, inscrição, controle e registro de resultado de ações |
| 🌾 **Farm** | Criação automática de salas privadas de farm |
| 💰 **Vendas** | Registro de vendas com canal privado e aprovação da staff |
| 🔫 **Armas** | Solicitação de armas com aprovação/recusa pela staff |
| 🎟️ **Codiguinho** | Solicitação de codiguinhos com estoque gerenciado |
| 🏖️ **Ausência** | Solicitação de ausência com aprovação e cargo automático |
| 🎫 **Ticket** | Sistema de tickets com tipos configuráveis |
| 📊 **Ranking** | Registro de vitórias/derrotas com placar automático |
| 📝 **Logs** | Entrada, saída, apelido e cargos registrados automaticamente |
| ⚠️ **Advertências** | Warns por nível (verde / amarela / vermelha) com cargo automático |
| 🎲 **Sorteio** | Criar sorteios com botão de participação |
| 📢 **Enquetes** | Enquetes com múltiplas opções e votação |
| 🏷️ **Hierarquia** | Log automático de mudanças de cargo |
| 🔊 **Voz** | Registro de tempo em call por membro |

---

## Comandos

| Comando | O que faz |
|---|---|
| `/configurar` | Painel completo de configuração do bot (canais, cargos, painéis, aparência) |
| `/comandos` | Lista todos os comandos disponíveis com explicação detalhada |
| `/escalacao-setup` | Reforça o painel de escalação no canal configurado |
| `/warn` | Aplica uma advertência a um membro |
| `/warns` | Lista as advertências de um membro |
| `/sorteio` | Cria um sorteio |
| `/poll` | Cria uma enquete |
| `/ranking` | Exibe o ranking atual |
| `/entrar-call` | Registra entrada em call de voz |
| `/sair-call` | Registra saída de call de voz |

---

## Configuração — `/configurar`

Todas as configurações são feitas pelo comando `/configurar` diretamente no Discord, sem precisar editar arquivos. As alterações são salvas automaticamente.

### Seções disponíveis

| Seção | O que configura |
|---|---|
| 📋 Recrutamento | Canal, canal de aprovação, cargo aprovado, cargos aprovadores, painel |
| ⚔️ Escalação | Canais, cargos, rádio, categorias de ação, painel |
| 🌾 Farm | Canais, categorias, cargos ADM, painel |
| 💰 Vendas | Canal, categoria, painel |
| 🔫 Armas | Canal de solicitação, canal de log, painel |
| 🎟️ Codiguinho | Canais, cargos ADM, painel |
| 🏖️ Ausência | Canais, cargo, painel |
| 🎫 Ticket | Canal, categoria, painel |
| 📊 Ranking | Canal, opção de pedir valor ao registrar vitória |
| 📝 Logs | Canais de entrada, saída, atualização, voz e warns |
| ⚠️ Advertências | Cargo por nível de warn |
| 🔧 Setup | Envia as mensagens de painel nos canais configurados |
| 🎨 Aparência | Nome e avatar do bot, imagem global e imagens por módulo |

### Personalizar Painel

Cada módulo tem o botão **✏️ Personalizar Painel** que permite editar:
- Título do painel
- Descrição (suporta markdown)
- Cor de destaque (hex)
- Texto do botão principal
- Imagem do painel (URL)

### Aparência do Bot

Na seção **🎨 Aparência**:
- **✏️ Editar Bot** — muda o nome e o avatar do bot no Discord
- **🖼️ Imagem Global** — define a imagem padrão usada como fallback em todos os módulos

> Mudar nome do bot tem limite do Discord de 2 vezes por hora.

---

## Categorias de Escalação

As ações do painel de escalação são organizadas em categorias (ex: Ação Grande, Ação Média, Ação Pequena). Cada categoria tem emoji, nome e lista de ações com quantidade de vagas.

Gerencie via `/configurar → Escalação → 📋 Categorias`:
- Criar / excluir categorias
- Adicionar / remover ações dentro de cada categoria
- Até **4 categorias** exibidas no painel (cada uma como um menu separado)

---

## Fluxos principais

### Recrutamento
1. Membro clica em **Preencher Ficha**
2. Preenche nome, ID e telefone no formulário
3. Seleciona o recrutador
4. Ficha vai para o canal de aprovação
5. Staff aprova ou reprova → membro recebe DM + cargo (se aprovado) e nick renomeado (`ID | Nome`)

### Escalação
1. Membro cria escalação selecionando a ação no menu e preenchendo horário
2. Card publicado no canal de escalação com botões de participação
3. Membros entram/saem com **✅ Participar** / **❌ Sair**
4. Staff fecha a ação com **🔒 Fechar Ação**
5. Registra **🏆 Vitória** ou **💀 Derrota** (com valor opcional se configurado)
6. Resultado enviado ao canal de controle com placar e lista de participantes

### Vendas
1. Membro clica em **💰 Registrar Venda**
2. Preenche: facção, produto, valor, parceria e link do comprovante (ou envia depois)
3. Canal privado criado automaticamente com o card de registro
4. Staff aprova ou recusa diretamente no canal → membro recebe DM

### Armas
1. Membro clica em **🔫 Solicitar Armas**
2. Preenche arma e quantidade de munição
3. Solicitação enviada ao canal de log com botões de aprovação
4. Staff aprova ou recusa → membro recebe DM

---

## Instalação

### Pré-requisitos
- Node.js 18+
- Bot criado no [Discord Developer Portal](https://discord.com/developers/applications)
- Intents habilitados: **Server Members Intent** e **Message Content Intent**

### Variáveis de ambiente (`.env`)

```env
DISCORD_TOKEN=seu_token_aqui

# Canais e cargos (todos opcionais — configure pelo /configurar)
CANAL_RECRUTAMENTO=ID
CANAL_APROVACAO=ID
CARGO_APROVADO=ID
CARGOS_APROVACAO=ID,ID

CANAL_CRIAR_ESCALACAO=ID
CANAL_ESCALACAO=ID
CANAL_CONTROLE=ID
CARGOS_ESCALACAO=ID,ID

CANAL_FARM_BTN=ID
CATEGORIA_FARM=ID
CARGOS_FARM_ADM=ID,ID
CATEGORIA_FARM_ADM=ID

CANAL_VENDA_BTN=ID
CATEGORIA_VENDA=ID

CANAL_ARMAS_BTN=ID
CANAL_ARMAS_LOG=ID

CANAL_CODIGUINHO_BTN=ID
CANAL_CODIGUINHO_LOG=ID
CARGOS_CODIGUINHO_ADM=ID,ID

CANAL_AUSENCIA_BTN=ID
CANAL_AUSENCIA_APROVACAO=ID
CANAL_AUSENCIA_ATIVA=ID
CARGO_AUSENCIA=ID

CANAL_TICKET_BTN=ID
CATEGORIA_TICKET=ID

CANAL_RANKING=ID

CANAL_LOG_ENTRADA=ID
CANAL_LOG_SAIDA=ID
CANAL_LOG_ATUALIZACAO=ID
CANAL_LOG_VOZ=ID
CANAL_WARNS=ID

CARGO_WARN_1=ID
CARGO_WARN_2=ID
CARGO_WARN_3=ID
CARGO_WARN_4=ID
```

> **Dica:** Configure os canais pelo `.env` na primeira vez ou deixe tudo em branco e configure tudo pelo `/configurar` após iniciar o bot.

### Iniciar

```bash
npm install
npm start
```

### Permissões necessárias no bot

| Permissão | Para que serve |
|---|---|
| Manage Nicknames | Renomear membros ao aprovar recrutamento |
| Manage Roles | Atribuir cargos automaticamente |
| Manage Channels | Criar canais de farm, ticket e venda |
| Send Messages | Enviar mensagens nos canais |
| Embed Links | Enviar containers ComponentsV2 |
| Read Message History | Verificar se painel já existe |

---

## Hospedagem — Discloud

O bot está configurado para hospedagem na [Discloud](https://discloud.com). O arquivo `discloud.config` já está pronto.

Suba o projeto compactado (.zip, sem `node_modules` e sem `.env`) pela plataforma Discloud.

---

## Tecnologias

- [Discord.js v14](https://discord.js.org) — ComponentsV2 (ContainerBuilder, TextDisplayBuilder, MediaGalleryBuilder)
- [@discordjs/voice](https://github.com/discordjs/voice) — integração de voz
- [dotenv](https://github.com/motdotla/dotenv) — variáveis de ambiente
- [libsodium-wrappers](https://github.com/jedisct1/libsodium.js) — criptografia para voz
