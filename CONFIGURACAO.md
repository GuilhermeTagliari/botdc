# 🤖 Bot CRX — Guia de Configuração

---

## 📁 Estrutura de arquivos

```
bot-recrutamento/
├── index.js               ← entrada principal
├── config.js              ← lê as variáveis do .env
├── state.js               ← estado temporário (fichas pendentes)
├── .env                   ← tokens e IDs (não compartilhe!)
├── handlers/
│   ├── botao.js           ← botão e modal de recrutamento
│   ├── modal.js           ← envio da ficha de recrutamento
│   ├── selecao.js         ← seleção do recrutador
│   ├── aprovacao.js       ← aprovar/reprovar fichas
│   ├── escalacao.js       ← sistema de escalação de ações
│   ├── farm.js            ← sala de farm
│   ├── ticket.js          ← sistema de tickets
│   └── log.js             ← sistema de logs do servidor
└── utils/
    └── permissao.js       ← verificação de cargos
```

---

## ⚙️ Configuração do .env

Preencha o arquivo `.env` com os IDs do seu servidor:

```env
# ─── TOKEN DO BOT ─────────────────────────────────────────
DISCORD_TOKEN=seu_token_aqui

# ─── RECRUTAMENTO ─────────────────────────────────────────
CANAL_RECRUTAMENTO=ID     # canal com o botão "Preencher Ficha"
CANAL_APROVACAO=ID        # canal onde chegam as fichas
CARGO_APROVADO=ID         # cargo dado ao membro aprovado

# ─── ESCALAÇÃO ────────────────────────────────────────────
CANAL_CRIAR_ESCALACAO=ID  # canal com o botão "Criar Escalação"
CANAL_ESCALACAO=ID        # canal onde as escalações são publicadas
CANAL_CONTROLE=ID         # canal onde chegam os resultados

# ─── FARM ─────────────────────────────────────────────────
CANAL_FARM_BTN=ID         # canal com o botão "Criar Sala"
CATEGORIA_FARM=ID         # categoria das salas de farm
CARGOS_FARM_ADM=ID,ID     # cargos que criam sala na categoria ADM
CATEGORIA_FARM_ADM=ID     # categoria de farm para membros ADM

# ─── TICKET ───────────────────────────────────────────────
CANAL_TICKET_BTN=ID       # canal com o botão "Abrir Ticket"
CATEGORIA_TICKET=ID       # categoria onde os tickets são criados

# ─── LOG ──────────────────────────────────────────────────
CANAL_LOG_ENTRADA=ID      # logs de quem entra no servidor
CANAL_LOG_SAIDA=ID        # logs de quem sai do servidor
CANAL_LOG_ATUALIZACAO=ID  # logs de apelido e cargos alterados

# ─── PERMISSÕES (vírgula entre IDs, admins sempre têm acesso) ──
CARGOS_APROVACAO=ID,ID    # cargos que aprovam/reprovam fichas
CARGOS_ESCALACAO=ID,ID    # cargos que fecham ações e registram resultado
```

> **Como obter IDs:** Ative o Modo Desenvolvedor em Configurações → Avançado → clique com botão direito no canal/cargo → **Copiar ID**

---

## 🔐 Permissões necessárias no bot

No Discord Developer Portal → seu app → **OAuth2 → URL Generator**:
- Scopes: `bot` + `applications.commands`

| Permissão | Para que serve |
|---|---|
| Manage Nicknames | Renomear membros ao aprovar recrutamento |
| Manage Roles | Dar cargo ao aprovar recrutamento |
| Manage Channels | Criar salas de farm e ticket |
| Send Messages | Enviar mensagens nos canais |
| Embed Links | Enviar embeds |
| Read Message History | Verificar se mensagem já existe |

**Intents obrigatórios** (Developer Portal → Bot → Privileged Gateway Intents):
- ✅ Server Members Intent
- ✅ Message Content Intent

> ⚠️ O cargo do bot na hierarquia do servidor deve estar **acima** dos cargos que ele vai atribuir.

---

## 📋 Comandos disponíveis

| Comando | O que faz |
|---|---|
| `/start` | Envia a mensagem de recrutamento no canal configurado |
| `/escalacao-setup` | Envia a mensagem com botão de criar escalação |
| `/farm-setup` | Envia a mensagem de criar sala de farm |
| `/ticket-setup` | Envia a mensagem de abrir ticket |

> Todos os comandos verificam se a mensagem já existe antes de enviar uma nova.

---

## 🔄 Fluxos do bot

### 📝 Recrutamento
1. Membro clica em **Preencher Ficha** no canal de recrutamento
2. Preenche o formulário: nome, ID numérico e telefone
3. Seleciona o membro que o recrutou
4. Ficha aparece no canal de aprovação com botões **Aprovar / Reprovar**
5. Ao aprovar: nick é renomeado para `ID | Nome`, cargo é atribuído e membro recebe DM

> Quem pode aprovar: cargos em `CARGOS_APROVACAO` ou administradores

---

### ⚔️ Escalação de Ação
1. Use `/escalacao-setup` para enviar o botão no canal de criação
2. Membro clica em **⚔️ Criar Escalação** e preenche ação, quantidade e horário
3. Mensagem é publicada no canal de escalação com os slots numerados (`1) — 2) — ...`)
4. Membros clicam em **✅ Participar** para ocupar o próximo slot livre, ou **❌ Sair** para liberar
5. Quem tiver permissão clica em **🔒 Fechar Ação** para encerrar inscrições
6. Após fechar, registre **🏆 Vitória** ou **💀 Derrota**
7. A mensagem da escalação é **excluída** e o resultado é enviado ao canal controle

> **🗑️ Remover Membro** permite que quem tem permissão retire alguém da lista  
> Quem pode fechar/remover/registrar: cargos em `CARGOS_ESCALACAO` ou administradores

---

### 🌾 Sala de Farm
1. Membro clica em **🌾 Criar Sala** no canal de farm
2. Canal de texto é criado automaticamente na categoria correta
3. Nome do canal: `id-nome` (extraído do nick do membro)
4. Canal privado — apenas o criador e admins têm acesso
5. Bot envia mensagem com os campos para preencher + aviso de comprovante

> Se o membro tiver cargo em `CARGOS_FARM_ADM`, a sala é criada em `CATEGORIA_FARM_ADM`

---

### 🎫 Ticket
1. Membro clica em **🎫 Abrir Ticket** no canal de ticket
2. Seleciona o tipo: 🚨 Denúncia | 🐛 Bug | 🌾 Farm | 🎫 Suporte
3. Canal de texto é criado na categoria de tickets
4. Bot envia mensagem de boas-vindas com botões da staff:
   - **📢 Notificar Membro** — envia uma mensagem no privado do membro
   - **🔒 Fechar Sala** — deleta o canal após 5 segundos
   - **💾 Salvar e Fechar** — gera um arquivo HTML com todo o histórico e deleta após 10 minutos

---

### 📋 Log do Servidor
Logs automáticos sem precisar configurar nenhum comando:

| Evento | Canal | O que mostra |
|---|---|---|
| Membro entrou | `CANAL_LOG_ENTRADA` | Nome, quando a conta foi criada, total de membros |
| Membro saiu | `CANAL_LOG_SAIDA` | Nome, quando entrou no servidor, cargos que tinha |
| Apelido alterado | `CANAL_LOG_ATUALIZACAO` | Nome antes → nome depois |
| Cargo alterado | `CANAL_LOG_ATUALIZACAO` | Cargos adicionados e removidos |

---

## ✏️ Personalizar tipos de ticket

Edite o array `TIPOS` no topo do arquivo `handlers/ticket.js`:

```js
const TIPOS = [
  { value: 'denuncia', label: 'Denúncia',  emoji: '🚨', descricao: 'Reportar um jogador ou situação' },
  { value: 'bug',      label: 'Bug',       emoji: '🐛', descricao: 'Reportar um problema técnico'   },
  { value: 'farm',     label: 'Farm',      emoji: '🌾', descricao: 'Registro de farm'               },
  { value: 'suporte',  label: 'Suporte',   emoji: '🎫', descricao: 'Ajuda geral ou dúvidas'         },
];
```

Adicione, remova ou renomeie as entradas conforme necessário e reinicie o bot.

---

## 🚀 Como iniciar o bot

```bash
# Instalar dependências (só na primeira vez)
npm install

# Iniciar
npm start

# Iniciar com reinício automático ao salvar (requer nodemon)
npm run dev
```

O terminal deve exibir:
```
Bot online: CRX#0000
Comandos registrados em: NomeDoServidor
```
