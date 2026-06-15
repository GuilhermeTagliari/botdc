require('dotenv').config();

const fs   = require('fs');
const path = require('path');
const os   = require('os');
fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });

const BOT_START_TIME = Date.now();
const VERSAO = '2026-06-15-v2';

// ─── Single-instance lock (nova instância mata a anterior) ────
const LOCK_FILE = path.join(__dirname, 'bot.lock');
try {
  if (fs.existsSync(LOCK_FILE)) {
    const pid = parseInt(fs.readFileSync(LOCK_FILE, 'utf8').trim(), 10);
    if (!isNaN(pid) && pid !== process.pid) {
      try { process.kill(pid); console.log(`[${new Date().toISOString()}] Instância anterior (PID ${pid}) encerrada.`); } catch {}
    }
  }
} catch {}
fs.writeFileSync(LOCK_FILE, String(process.pid));
const _limparLock = () => { try { fs.unlinkSync(LOCK_FILE); } catch {} };
process.on('exit', _limparLock);
process.on('SIGINT',  () => { _limparLock(); process.exit(0); });
process.on('SIGTERM', () => { _limparLock(); process.exit(0); });

const { Client, GatewayIntentBits, Partials } = require('discord.js');
const { handleRecrutamentoChannel, handleBotao } = require('./handlers/botao');
const { handleModal }             = require('./handlers/modal');
const { handleAprovacao }         = require('./handlers/aprovacao');
const { handleSelecaoRecrutador } = require('./handlers/selecao');
const {
  handleEscalacaoChannel,
  handleEscalacaoSelectAcao,
  handleEscalacaoCustom,
  handleModalEscalacao,
  handleParticipar,
  handleSair,
  handleRemoverBtn,
  handleRemoverSelect,
  handleFechar,
  handleReabrir,
  handleResultado,
  restaurarEscalacoes,
  handleRepostarEscalacao,
  handleModalValorResultado,
} = require('./handlers/escalacao');
const {
  handleFarmChannel,
  handleFarmBotao,
  handleFarmRegistrarBtn,
  handleFarmModal,
  handleFarmFoto,
  handleFarmAprovar,
  handleFarmReprovarBtn,
  handleFarmReprovarModal,
  handleFarmRelatorio,
  handleRemoverFarm,
  restaurarFarms,
} = require('./handlers/farm');
const {
  handleClear, handleBanir, handleKick, handleMute,
  handleWarn, handleWarnTipoBtn, handleWarnModal,
  handleWarns, handleRemovewarn, handleUserinfo,
  handleLock, handleUnlock, handleSlowmode,
  handleCargo, handleAvisar,
} = require('./handlers/moderacao');
const { handleRankingSetup, atualizarRanking, handleStats, handleResetRanking } = require('./handlers/ranking');
const { handleHierarquiaSetup, atualizarHierarquia, handleMemberUpdate } = require('./handlers/hierarquia');
const { handleSorteioCmd, handleSorteioBtn, restaurarSorteios } = require('./handlers/sorteio');
const { handlePollCmd, handlePollVoto } = require('./handlers/poll');
const { handleRegrasSetupCmd, handleRegrasModal } = require('./handlers/regras');
const {
  handleAusenciaSetup,
  handleAusenciaBotao,
  handleModalAusencia,
  handleAusenciaAprovar,
  handleAusenciaReprovar,
  restaurarAusencias,
  handleAusenciaEncerrar,
} = require('./handlers/ausencia');
const { logEntrada, registrarSaida, handleAuditEntry, carregarConvites, handleInviteCreate, handleInviteDelete, handleVoiceStateUpdate } = require('./handlers/log');
const {
  handleCodiguinhoChannel,
  handleCodiguinhoBotao,
  handleModalCodiguinho,
  handleAprovar:          handleCodAprovar,
  handleRecusar:          handleCodRecusar,
  handleAdminPanel:       handleCodAdmin,
  handleAdminAdd:         handleCodAdminAdd,
  handleModalAddCodigos,
  handleAdminVer:         handleCodAdminVer,
  handleAdminLimparAll:   handleCodLimparAll,
  handleAdminLimparQtd:   handleCodLimparQtd,
  handleModalLimparQtd,
} = require('./handlers/codiguinho');
const { handleArmasChannel, handleArmasBotao, handleModalArmas, handleArmasAprovar, handleArmasRecusar } = require('./handlers/armas');
const {
  handleVendaChannel,
  handleVendaBotao,
  handleVendaSelectProduto,
  handleModalVenda,
  handleVendaConfirmar,
  handleVendaCancelar,
} = require('./handlers/venda');
const { handleEntrarVoz, handleSairVoz, atualizarSessaoVoz } = require('./handlers/voz');
const { handleRelatorioChamada } = require('./handlers/relatorio_call');
const {
  handleConfigurar,
  handleConfigBack,
  handleConfigMenu,
  handleConfigChBtn,
  handleConfigChSel,
  handleConfigRoleBtn,
  handleConfigRoleSel,
  handleConfigRolesBtn,
  handleConfigRolesAdd,
  handleConfigRolesRm,
  handleConfigRolesClr,
  handleConfigListaBtn,
  handleConfigListaAddBtn,
  handleModalConfigLista,
  handleConfigListaRm,
  handleConfigListaClr,
  handleConfigSetup,
  handleConfigPainelBtn,
  handleModalConfigPainel,
  handleConfigEscRadio,
  handleConfigRankingValor,
  handleConfigEscCats,
  handleConfigEscCatAdd,
  handleModalConfigEscCat,
  handleConfigEscCatSel,
  handleConfigEscCatDel,
  handleConfigEscCatAcaoAdd,
  handleModalConfigEscCatAcao,
  handleConfigEscCatAcaoRem,
  handleConfigBotEditar,
  handleModalConfigBotEditar,
  handleConfigBotImg,
  handleModalConfigBotImg,
} = require('./handlers/configurar');
const {
  handleTicketChannel,
  handleTicketSelect,
  handleTicketNotifBtn,
  handleTicketNotifModal,
  handleTicketAddBtn,
  handleTicketAddSelect,
  handleTicketFechar,
  handleTicketSalvar,
} = require('./handlers/ticket');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildVoiceStates,
  ],
  partials: [Partials.Channel],
});

const LISTA_COMANDOS = [
      { name: 'recrutamento-setup', description: 'Envia a mensagem de recrutamento no canal configurado', defaultMemberPermissions: '8' },
      { name: 'escalacao-setup',    description: 'Envia a mensagem de escalação no canal configurado',    defaultMemberPermissions: '8' },
      { name: 'escalacao-repostar', description: 'Reposta escalações ativas (use se o bot caiu)',          defaultMemberPermissions: '8' },
      { name: 'farm-setup',        description: 'Envia a mensagem de criar sala de farm no canal configurado', defaultMemberPermissions: '8' },
      {
        name: 'remover-farm',
        description: 'Remove uma quantidade do farm de um membro',
        defaultMemberPermissions: '8',
        options: [
          { name: 'usuario',    description: 'Membro alvo',              type: 6, required: true  },
          { name: 'quantidade', description: 'Quantidade a remover',      type: 4, required: true, min_value: 1 },
          { name: 'motivo',     description: 'Motivo da remoção',         type: 3, required: true  },
        ],
      },
      {
        name: 'farm-relatorio',
        description: 'Exibe o total de farm aprovado de um membro',
        defaultMemberPermissions: '8',
        options: [
          { name: 'usuario', description: 'Membro para consultar',                                          type: 6, required: true  },
          { name: 'dias',    description: 'Período em dias (sem valor = todo o período)',                    type: 4, required: false, min_value: 1 },
        ],
      },
      { name: 'ticket-setup',      description: 'Envia a mensagem de ticket no canal configurado',        defaultMemberPermissions: '8' },
      {
        name: 'banir',
        description: 'Bane um membro do servidor (apenas admins)',
        defaultMemberPermissions: '8',
        options: [
          { name: 'usuario', description: 'Membro a ser banido',  type: 6, required: true },
          { name: 'motivo',  description: 'Motivo do ban',        type: 3, required: true },
        ],
      },
      {
        name: 'kick',
        description: 'Expulsa um membro do servidor (apenas admins)',
        defaultMemberPermissions: '8',
        options: [
          { name: 'usuario', description: 'Membro a ser kickado', type: 6, required: true },
          { name: 'motivo',  description: 'Motivo do kick',       type: 3, required: true },
        ],
      },
      {
        name: 'mute',
        description: 'Silencia um membro por X minutos (apenas admins)',
        defaultMemberPermissions: '8',
        options: [
          { name: 'usuario', description: 'Membro a ser silenciado',    type: 6, required: true },
          { name: 'tempo',   description: 'Duração em minutos (ex: 10)', type: 4, required: true, min_value: 1, max_value: 40320 },
          { name: 'motivo',  description: 'Motivo do mute',             type: 3, required: true },
        ],
      },
      {
        name: 'warn',
        description: 'Registra uma advertência para um membro (apenas admins)',
        defaultMemberPermissions: '8',
        options: [
          { name: 'usuario', description: 'Membro a ser advertido', type: 6, required: true },
        ],
      },
      {
        name: 'warns',
        description: 'Lista as advertências de um membro (apenas admins)',
        defaultMemberPermissions: '8',
        options: [
          { name: 'usuario', description: 'Membro para consultar', type: 6, required: true },
        ],
      },
      {
        name: 'removewarn',
        description: 'Remove uma advertência específica de um membro (apenas admins)',
        defaultMemberPermissions: '8',
        options: [
          { name: 'usuario', description: 'Membro alvo',                     type: 6, required: true },
          { name: 'numero',  description: 'Número da advertência (use /warns)', type: 4, required: true, min_value: 1 },
        ],
      },
      {
        name: 'userinfo',
        description: 'Exibe informações de um membro (apenas admins)',
        defaultMemberPermissions: '8',
        options: [
          { name: 'usuario', description: 'Membro a consultar (padrão: você)', type: 6, required: false },
        ],
      },
      { name: 'lock',   description: 'Tranca o canal atual (apenas admins)',   defaultMemberPermissions: '8' },
      { name: 'unlock', description: 'Destranca o canal atual (apenas admins)', defaultMemberPermissions: '8' },
      {
        name: 'slowmode',
        description: 'Define o modo lento do canal (apenas admins)',
        defaultMemberPermissions: '8',
        options: [
          { name: 'segundos', description: 'Segundos entre mensagens (0 = desativar)', type: 4, required: true, min_value: 0, max_value: 21600 },
        ],
      },
      {
        name: 'cargo',
        description: 'Adiciona ou remove um cargo de um membro (apenas admins)',
        defaultMemberPermissions: '8',
        options: [
          { name: 'usuario', description: 'Membro alvo',                type: 6, required: true },
          { name: 'cargo',   description: 'Cargo a adicionar/remover',  type: 8, required: true },
        ],
      },
      {
        name: 'avisar',
        description: 'Envia uma mensagem via DM para um membro (apenas admins)',
        defaultMemberPermissions: '8',
        options: [
          { name: 'usuario',  description: 'Membro que receberá a mensagem', type: 6, required: true },
          { name: 'mensagem', description: 'Conteúdo da mensagem',           type: 3, required: true },
        ],
      },
      {
        name: 'clear',
        description: 'Apaga mensagens do canal (apenas admins)',
        defaultMemberPermissions: '8',
        options: [{
          name: 'quantidade',
          description: 'Quantidade de mensagens para apagar (1-999)',
          type: 4,
          required: true,
          min_value: 1,
          max_value: 999,
        }],
      },
      { name: 'comandos',       description: 'Lista todos os comandos disponíveis do bot' },
      { name: 'ranking-setup',     description: 'Envia a mensagem de ranking no canal configurado',   defaultMemberPermissions: '8' },
      { name: 'ausencia-setup',    description: 'Envia a mensagem de ausência no canal configurado',   defaultMemberPermissions: '8' },
      { name: 'resetranking',      description: 'Reseta todos os dados do ranking (apenas admins)',     defaultMemberPermissions: '8' },
      { name: 'hierarquia-setup', description: 'Envia o painel de hierarquia no canal selecionado', defaultMemberPermissions: '8',
        options: [{ name: 'canal', description: 'Canal onde o painel será enviado', type: 7, required: true }] },
      {
        name: 'stats',
        description: 'Exibe vitórias, derrotas e K/D de um membro',
        options: [
          { name: 'usuario', description: 'Membro para consultar (padrão: você mesmo)', type: 6, required: false },
        ],
      },
      { name: 'status', description: 'Exibe o status e informações do bot' },
      { name: 'regras-setup',  description: 'Envia ou atualiza o painel de regras (apenas admins)', defaultMemberPermissions: '8',
        options: [{ name: 'canal', description: 'Canal das regras', type: 7, required: true }] },
      {
        name: 'sorteio',
        description: 'Cria um sorteio com botão de participação (apenas admins)',
        defaultMemberPermissions: '8',
        options: [
          { name: 'canal',  description: 'Canal onde o sorteio será enviado',  type: 7, required: true },
          { name: 'premio', description: 'Prêmio do sorteio',                  type: 3, required: true },
          { name: 'tempo',  description: 'Duração em minutos (ex: 60)',        type: 4, required: true, min_value: 1, max_value: 10080 },
        ],
      },
      {
        name: 'poll',
        description: 'Cria uma votação com botões',
        options: [
          { name: 'pergunta', description: 'Pergunta da votação', type: 3, required: true },
          { name: 'opcao1',   description: 'Opção 1',            type: 3, required: true },
          { name: 'opcao2',   description: 'Opção 2',            type: 3, required: true },
          { name: 'opcao3',   description: 'Opção 3',            type: 3, required: false },
          { name: 'opcao4',   description: 'Opção 4',            type: 3, required: false },
        ],
      },
      {
        name: 'mensagem',
        description: 'Envia uma mensagem em embed para um canal (apenas admins)',
        defaultMemberPermissions: '8',
        options: [
          { name: 'canal',   description: 'Canal onde a mensagem será enviada',             type: 7, required: true  },
          { name: 'texto',   description: 'Conteúdo da mensagem',                            type: 3, required: true  },
          { name: 'titulo',  description: 'Título (opcional)',                               type: 3, required: false },
          { name: 'imagem',  description: 'URL de imagem para substituir a logo (opcional)', type: 3, required: false },
          { name: 'link1',   description: 'URL do botão 1 (opcional)',                       type: 3, required: false },
          { name: 'label1',  description: 'Texto do botão 1 (padrão: Clique aqui)',          type: 3, required: false },
          { name: 'link2',   description: 'URL do botão 2 (opcional)',                       type: 3, required: false },
          { name: 'label2',  description: 'Texto do botão 2',                                type: 3, required: false },
          { name: 'link3',   description: 'URL do botão 3 (opcional)',                       type: 3, required: false },
          { name: 'label3',  description: 'Texto do botão 3',                                type: 3, required: false },
          { name: 'link4',   description: 'URL do botão 4 (opcional)',                       type: 3, required: false },
          { name: 'label4',  description: 'Texto do botão 4',                                type: 3, required: false },
          { name: 'link5',   description: 'URL do botão 5 (opcional)',                       type: 3, required: false },
          { name: 'label5',  description: 'Texto do botão 5',                                type: 3, required: false },
        ],
      },
      {
        name: 'embed-editar',
        description: 'Edita uma mensagem já enviada pelo bot (apenas admins)',
        defaultMemberPermissions: '8',
        options: [
          { name: 'canal',  description: 'Canal onde está a mensagem',                         type: 7, required: true  },
          { name: 'id',     description: 'ID da mensagem (clique direito → Copiar ID)',         type: 3, required: true  },
          { name: 'texto',  description: 'Novo conteúdo da mensagem',                           type: 3, required: true  },
          { name: 'titulo', description: 'Novo título (opcional — apaga o título se omitido)',  type: 3, required: false },
          { name: 'imagem', description: 'Nova URL de imagem (opcional — mantém a original)',   type: 3, required: false },
        ],
      },
      {
        name: 'mensagem-pv',
        description: 'Envia uma mensagem via DM por cargo ou para todos (apenas admins)',
        defaultMemberPermissions: '8',
        options: [
          { name: 'titulo', description: 'Título da mensagem',                         type: 3, required: true  },
          { name: 'texto',  description: 'Descrição / conteúdo da mensagem',           type: 3, required: true  },
          { name: 'todos',  description: 'Enviar para TODOS os membros do servidor?',  type: 5, required: false },
          { name: 'cargo1', description: 'Cargo 1 que receberá a mensagem',            type: 8, required: false },
          { name: 'cargo2', description: 'Cargo 2 que receberá a mensagem',            type: 8, required: false },
          { name: 'cargo3', description: 'Cargo 3 que receberá a mensagem',            type: 8, required: false },
          { name: 'canal',  description: 'Canal relacionado (opcional)',                type: 7, required: false },
        ],
      },
      {
        name: 'anuncio',
        description: 'Envia um anúncio em embed para um canal (apenas admins)',
        defaultMemberPermissions: '8',
        options: [
          { name: 'canal',        description: 'Canal onde o anúncio será enviado',         type: 7, required: true  },
          { name: 'texto',        description: 'Conteúdo do anúncio',                        type: 3, required: true  },
          { name: 'marcar_todos', description: 'Marcar @everyone no anúncio?',               type: 5, required: false },
          { name: 'titulo',       description: 'Título do embed (padrão: 📢 Anúncio)',       type: 3, required: false },
          { name: 'imagem',       description: 'URL de uma imagem para exibir no embed',     type: 3, required: false },
        ],
      },
      { name: 'codiguinho-setup', description: 'Envia o painel de codiguinho no canal configurado', defaultMemberPermissions: '8' },
      { name: 'cod-admin',        description: 'Painel de gerenciamento do estoque de codiguinhos', defaultMemberPermissions: '8' },
      { name: 'armas-setup',      description: 'Envia o painel de solicitação de armas no canal configurado', defaultMemberPermissions: '8' },
      { name: 'venda-setup',      description: 'Envia o painel de registro de vendas no canal configurado', defaultMemberPermissions: '8' },
      { name: 'configurar',   description: 'Configura o bot (canais, cargos e ações predefinidas)', defaultMemberPermissions: '8' },
      { name: 'entrar-call',  description: 'Bot entra em um canal de voz',                           defaultMemberPermissions: '8',
        options: [{ name: 'canal', description: 'Canal de voz', type: 7, required: true, channel_types: [2] }] },
      { name: 'sair-call',    description: 'Bot sai do canal de voz atual',                          defaultMemberPermissions: '8' },
      {
        name: 'relatorio-call',
        description: 'Relatório de presença em um canal de voz — filtra por dia e canal',
        defaultMemberPermissions: '8',
        options: [
          { name: 'dia',   description: 'Data — formato DD/MM ou DD/MM/AAAA (ex: 15/06 ou 15/06/2026)', type: 3, required: true },
          { name: 'canal', description: 'Canal de voz para consultar',                                    type: 7, required: true, channel_types: [2] },
        ],
      },
];

async function registrarComandos(client) {
  try {
    await client.application.commands.set(LISTA_COMANDOS);
    console.log(`[${new Date().toISOString()}] Comandos globais registrados`);
    for (const guild of client.guilds.cache.values()) {
      try { await guild.commands.set([]); } catch {}
    }
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Erro ao registrar comandos globais:`, err);
  }
}

client.once('ready', async () => {
  console.log(`[${new Date().toISOString()}] Bot online: ${client.user.tag} — versão ${VERSAO}`);
  const { salvarConfig } = require('./config');
  salvarConfig({ BOT_NOME_DISPLAY: client.user.username });
  client.user.setPresence({
    activities: [{ name: 'Quer o bot no seu servidor? Entre em contato com o _zecaa.', type: 3 }],
    status: 'online',
  });
  await registrarComandos(client);
  for (const guild of client.guilds.cache.values()) {
    await carregarConvites(guild);
    await atualizarRanking(guild);
  }
  await restaurarFarms(client);
  await restaurarSorteios(client);
  await restaurarEscalacoes(client);
  await restaurarAusencias(client);
});

client.on('guildCreate', async (guild) => {
  console.log(`[${new Date().toISOString()}] Bot adicionado ao servidor: ${guild.name}`);
  try { await guild.commands.set([]); } catch {}
  await carregarConvites(guild);
});

client.on('inviteCreate', handleInviteCreate);
client.on('inviteDelete', handleInviteDelete);
client.on('voiceStateUpdate', (oldState, newState) => {
  handleVoiceStateUpdate(oldState, newState);
  atualizarSessaoVoz(oldState, newState);
});

client.on('guildMemberAdd',          (member)         => logEntrada(member));
client.on('guildMemberRemove',       (member)         => registrarSaida(member));
client.on('guildAuditLogEntryCreate',(entry, guild)   => handleAuditEntry(entry, guild));
client.on('guildMemberUpdate',       (oldMember, newMember) => handleMemberUpdate(oldMember, newMember));

client.on('messageCreate', async (message) => {
  try { await handleFarmFoto(message); } catch {}
});

client.on('interactionCreate', async (interaction) => {
  try {
    // Slash commands
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === 'recrutamento-setup') {
        await interaction.deferReply({ ephemeral: true });
        await handleRecrutamentoChannel(client, interaction.guild);
        await interaction.editReply({ content: '✅ Mensagem de recrutamento enviada!' });
      } else if (interaction.commandName === 'escalacao-setup') {
        await interaction.deferReply({ ephemeral: true });
        await handleEscalacaoChannel(client, interaction.guild);
        await interaction.editReply({ content: '✅ Mensagem de escalação enviada!' });
      } else if (interaction.commandName === 'escalacao-repostar') {
        await handleRepostarEscalacao(interaction);
      } else if (interaction.commandName === 'farm-setup') {
        await interaction.deferReply({ ephemeral: true });
        await handleFarmChannel(client, interaction.guild);
        await interaction.editReply({ content: '✅ Mensagem de farm enviada!' });
      } else if (interaction.commandName === 'remover-farm') {
        await handleRemoverFarm(interaction);
      } else if (interaction.commandName === 'farm-relatorio') {
        await handleFarmRelatorio(interaction);
      } else if (interaction.commandName === 'ticket-setup') {
        await interaction.deferReply({ ephemeral: true });
        await handleTicketChannel(client, interaction.guild);
        await interaction.editReply({ content: '✅ Mensagem de ticket enviada!' });
      } else if (interaction.commandName === 'clear') {
        await handleClear(interaction);
      } else if (interaction.commandName === 'banir') {
        await handleBanir(interaction);
      } else if (interaction.commandName === 'kick') {
        await handleKick(interaction);
      } else if (interaction.commandName === 'mute') {
        await handleMute(interaction);
      } else if (interaction.commandName === 'warn') {
        await handleWarn(interaction);
      } else if (interaction.commandName === 'warns') {
        await handleWarns(interaction);
      } else if (interaction.commandName === 'removewarn') {
        await handleRemovewarn(interaction);
      } else if (interaction.commandName === 'userinfo') {
        await handleUserinfo(interaction);
      } else if (interaction.commandName === 'lock') {
        await handleLock(interaction);
      } else if (interaction.commandName === 'unlock') {
        await handleUnlock(interaction);
      } else if (interaction.commandName === 'slowmode') {
        await handleSlowmode(interaction);
      } else if (interaction.commandName === 'cargo') {
        await handleCargo(interaction);
      } else if (interaction.commandName === 'avisar') {
        await handleAvisar(interaction);
      } else if (interaction.commandName === 'stats') {
        await handleStats(interaction);
      } else if (interaction.commandName === 'hierarquia-setup') {
        await handleHierarquiaSetup(interaction);
      } else if (interaction.commandName === 'mensagem') {
        await interaction.deferReply({ ephemeral: true });
        const canal  = interaction.options.getChannel('canal');
        const texto  = interaction.options.getString('texto').replace(/\\n/g, '\n');
        const titulo = interaction.options.getString('titulo');
        const imagem = interaction.options.getString('imagem');
        const { ContainerBuilder: CB, TextDisplayBuilder: TDB, SeparatorBuilder: SB, MediaGalleryBuilder: MGB, MediaGalleryItemBuilder: MGIB, ButtonBuilder: BB, ButtonStyle: BS, ActionRowBuilder: AR, MessageFlags: MF } = require('discord.js');
        const imgPadrao = 'https://media.discordapp.net/attachments/1392674632544419963/1392675113262125056/Never_Pure_1920.jpg?ex=69ee0f85&is=69ecbe05&hm=3846f1cabdd4a1b55ad17216f5cc52b41d4f9805ae4a1973687884d3f04d494d&width=1535&height=863&';
        const conteudoTexto = (titulo ? `# ${titulo}\n\n` : '') + texto + `\n\n-# 📝 Enviado por <@${interaction.user.id}>`;
        const botoes = [];
        for (let i = 1; i <= 5; i++) {
          const url = interaction.options.getString(`link${i}`);
          if (!url) continue;
          const lbl = interaction.options.getString(`label${i}`) ?? '🔗 Clique aqui';
          botoes.push(new BB().setLabel(lbl).setStyle(BS.Link).setURL(url));
        }
        const container = new CB()
          .setAccentColor(0x3498DB)
          .addMediaGalleryComponents(new MGB().addItems(new MGIB().setURL(imagem ?? imgPadrao)))
          .addSeparatorComponents(new SB().setDivider(true))
          .addTextDisplayComponents(new TDB().setContent(conteudoTexto));
        if (botoes.length > 0) {
          container
            .addSeparatorComponents(new SB().setDivider(true))
            .addActionRowComponents(new AR().addComponents(...botoes));
        }
        try {
          await canal.send({ components: [container], flags: MF.IsComponentsV2 });
          await interaction.editReply({ content: `✅ Mensagem enviada em ${canal}!` });
        } catch {
          await interaction.editReply({ content: '❌ Não consegui enviar no canal selecionado. Verifique as permissões do bot.' });
        }
      } else if (interaction.commandName === 'embed-editar') {
        await interaction.deferReply({ ephemeral: true });
        const canal  = interaction.options.getChannel('canal');
        const msgId  = interaction.options.getString('id');
        const texto  = interaction.options.getString('texto').replace(/\\n/g, '\n');
        const titulo = interaction.options.getString('titulo');
        const imagem = interaction.options.getString('imagem');
        const { ContainerBuilder: CBe, TextDisplayBuilder: TDBe, SeparatorBuilder: SBe, MediaGalleryBuilder: MGBe, MediaGalleryItemBuilder: MGIBe, MessageFlags: MFe } = require('discord.js');
        const imgPadraoE = 'https://media.discordapp.net/attachments/1392674632544419963/1392675113262125056/Never_Pure_1920.jpg?ex=69ee0f85&is=69ecbe05&hm=3846f1cabdd4a1b55ad17216f5cc52b41d4f9805ae4a1973687884d3f04d494d&width=1535&height=863&';
        try {
          const msg = await canal.messages.fetch(msgId);
          if (msg.author.id !== client.user.id) {
            await interaction.editReply({ content: '❌ Só posso editar mensagens enviadas pelo bot.' });
            return;
          }
          // Tenta preservar a imagem original se não foi fornecida
          let imgUrl = imagem;
          if (!imgUrl) {
            const findImg = (comp) => {
              const type  = comp.type  ?? comp.data?.type;
              const items = comp.items ?? comp.data?.items ?? [];
              if (type === 22 && items.length > 0) return items[0]?.media?.url ?? items[0]?.data?.media?.url ?? null;
              const children = comp.components ?? comp.data?.components ?? [];
              if (Array.isArray(children)) { for (const c of children) { const r = findImg(c); if (r) return r; } }
              return null;
            };
            for (const c of msg.components) { imgUrl = findImg(c); if (imgUrl) break; }
          }
          const conteudo = (titulo ? `# ${titulo}\n\n` : '') + texto;
          const container = new CBe()
            .setAccentColor(0x3498DB)
            .addMediaGalleryComponents(new MGBe().addItems(new MGIBe().setURL(imgUrl ?? imgPadraoE)))
            .addSeparatorComponents(new SBe().setDivider(true))
            .addTextDisplayComponents(new TDBe().setContent(conteudo));
          await msg.edit({ components: [container], flags: MFe.IsComponentsV2 });
          await interaction.editReply({ content: `✅ Mensagem editada em ${canal}!` });
        } catch (err) {
          const msg = err.code === 10008 ? '❌ Mensagem não encontrada. Verifique o ID e o canal.' : `❌ Erro ao editar: \`${err.message}\``;
          await interaction.editReply({ content: msg });
        }
      } else if (interaction.commandName === 'mensagem-pv') {
        await interaction.deferReply({ ephemeral: true });
        const pvTitulo = interaction.options.getString('titulo');
        const pvTexto  = interaction.options.getString('texto').replace(/\\n/g, '\n');
        const pvTodos  = interaction.options.getBoolean('todos') ?? false;
        const pvCanal  = interaction.options.getChannel('canal');
        const pvCargos = [
          interaction.options.getRole('cargo1'),
          interaction.options.getRole('cargo2'),
          interaction.options.getRole('cargo3'),
        ].filter(Boolean);

        if (!pvTodos && pvCargos.length === 0) {
          await interaction.editReply({ content: '❌ Selecione pelo menos um cargo ou marque a opção **todos**.' });
          return;
        }

        await interaction.guild.members.fetch();
        let alvos = [...interaction.guild.members.cache.values()].filter((m) => !m.user.bot);
        if (!pvTodos) {
          const ids = new Set(pvCargos.map((c) => c.id));
          alvos = alvos.filter((m) => m.roles.cache.some((r) => ids.has(r.id)));
        }

        const { ContainerBuilder: CBpv, TextDisplayBuilder: TDBpv, SeparatorBuilder: SBpv, MessageFlags: MFpv } = require('discord.js');
        const ts = `<t:${Math.floor(Date.now() / 1000)}:F>`;
        const canalLinha = pvCanal ? `\n**Canal:** ${pvCanal}` : '';
        const conteudoPV =
          `## 📢 Novo Anúncio Registrado\n\n` +
          `**Título:** ${pvTitulo}\n` +
          `**Descrição:** ${pvTexto}\n\n` +
          `**Usuário:** <@${interaction.user.id}>${canalLinha}\n\n` +
          `-# ${ts}`;
        const containerPV = new CBpv()
          .setAccentColor(0x3498DB)
          .addTextDisplayComponents(new TDBpv().setContent(conteudoPV));
        const dmPayload = { components: [containerPV], flags: MFpv.IsComponentsV2 };

        let enviados = 0;
        let falhas   = 0;
        for (const membro of alvos) {
          try {
            await membro.send(dmPayload);
            enviados++;
          } catch { falhas++; }
          await new Promise((r) => setTimeout(r, 150));
        }

        const alvoTexto = pvTodos ? 'todos os membros' : pvCargos.map((c) => `<@&${c.id}>`).join(', ');
        await interaction.editReply({
          content:
            `✅ **DMs enviadas!**\n\n` +
            `**📤 Enviadas:** ${enviados}\n` +
            `**❌ Falhas:** ${falhas} *(DMs fechadas pelo usuário)*\n` +
            `**👥 Destinatários:** ${alvoTexto}`,
        });
      } else if (interaction.commandName === 'anuncio') {
        await interaction.deferReply({ ephemeral: true });
        const canal       = interaction.options.getChannel('canal');
        const texto       = interaction.options.getString('texto');
        const titulo      = interaction.options.getString('titulo') ?? '📢  Anúncio';
        const marcarTodos = interaction.options.getBoolean('marcar_todos') ?? false;
        const imagem      = interaction.options.getString('imagem');
        const { ContainerBuilder: CB2, TextDisplayBuilder: TDB2, SeparatorBuilder: SB2, MediaGalleryBuilder: MGB2, MediaGalleryItemBuilder: MGIB2, MessageFlags: MF2 } = require('discord.js');
        const imgPadrao2 = 'https://media.discordapp.net/attachments/1392674632544419963/1392675113262125056/Never_Pure_1920.jpg?ex=69ee0f85&is=69ecbe05&hm=3846f1cabdd4a1b55ad17216f5cc52b41d4f9805ae4a1973687884d3f04d494d&width=1535&height=863&';
        const containerAnuncio = new CB2()
          .setAccentColor(0x3498DB)
          .addMediaGalleryComponents(new MGB2().addItems(new MGIB2().setURL(imagem ?? imgPadrao2)))
          .addSeparatorComponents(new SB2().setDivider(true))
          .addTextDisplayComponents(new TDB2().setContent(
            `# ${titulo}\n\n` + texto + `\n\n-# 📝 Enviado por <@${interaction.user.id}>`,
          ));
        const guiaAnuncio = [
          '## 📢 Como usar /anuncio',
          '> Só você está vendo esta mensagem.\n',
          '**Campos obrigatórios:**',
          '`canal` — canal onde o anúncio será enviado',
          '`texto` — conteúdo do anúncio\n',
          '**Campos opcionais:**',
          '`marcar_todos` — marca @everyone no anúncio *(sim/não)*',
          '`titulo` — título *(padrão: 📢 Anúncio)*',
          '`imagem` — URL de uma imagem para substituir a logo Never Pure',
        ].join('\n');
        try {
          await canal.send({ content: marcarTodos ? '@everyone' : null, components: [containerAnuncio], flags: MF2.IsComponentsV2 });
          await interaction.editReply({ content: `✅ Anúncio enviado em ${canal}!\n\n${guiaAnuncio}` });
        } catch {
          await interaction.editReply({ content: `❌ Não consegui enviar no canal selecionado. Verifique as permissões do bot.\n\n${guiaAnuncio}` });
        }
      } else if (interaction.commandName === 'status') {
        const uptimeSeg = Math.floor((Date.now() - BOT_START_TIME) / 1000);
        const dias  = Math.floor(uptimeSeg / 86400);
        const horas = Math.floor((uptimeSeg % 86400) / 3600);
        const min   = Math.floor((uptimeSeg % 3600) / 60);
        const seg   = uptimeSeg % 60;
        const uptimeStr = dias > 0
          ? `${dias}d ${horas}h ${min}m`
          : horas > 0 ? `${horas}h ${min}m ${seg}s` : `${min}m ${seg}s`;

        const isDiscloud = fs.existsSync('/.dockerenv') || process.env.HOSTING === 'discloud';
        const hospedagem = isDiscloud
          ? `☁️ Discloud  ·  \`${os.hostname()}\``
          : `🖥️ Local  ·  \`${os.hostname()}\``;

        const memMB  = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
        const ping   = client.ws.ping;
        const guilds = client.guilds.cache.size;

        const { ContainerBuilder: CBs, TextDisplayBuilder: TDBs, SeparatorBuilder: SBs, MediaGalleryBuilder: MGBs, MediaGalleryItemBuilder: MGIBs, MessageFlags: MFs } = require('discord.js');
        const imgStatus = 'https://media.discordapp.net/attachments/1392674632544419963/1392675113262125056/Never_Pure_1920.jpg?ex=69ee0f85&is=69ecbe05&hm=3846f1cabdd4a1b55ad17216f5cc52b41d4f9805ae4a1973687884d3f04d494d&width=1535&height=863&';
        const containerStatus = new CBs()
          .setAccentColor(0x57F287)
          .addMediaGalleryComponents(new MGBs().addItems(new MGIBs().setURL(imgStatus)))
          .addSeparatorComponents(new SBs().setDivider(true))
          .addTextDisplayComponents(new TDBs().setContent(
            `## 🤖  Status do Bot\n\n` +
            `🟢 **Online** — Never Pure Bot\n\n` +
            `⏱️ **Uptime:** \`${uptimeStr}\`\n` +
            `📡 **Hospedagem:** ${hospedagem}\n` +
            `🏓 **Ping:** \`${ping}ms\`\n` +
            `💾 **Memória:** \`${memMB} MB\`\n` +
            `🌐 **Servidores:** \`${guilds}\`\n\n` +
            `-# PID ${process.pid}  ·  <t:${Math.floor(BOT_START_TIME / 1000)}:R>  ·  \`${(() => { try { return require('child_process').execSync('git rev-parse --short HEAD').toString().trim(); } catch { return 'N/A'; } })()} \``,
          ));
        await interaction.reply({ components: [containerStatus], flags: MFs.IsComponentsV2, ephemeral: true });
      } else if (interaction.commandName === 'sorteio') {
        await handleSorteioCmd(interaction);
      } else if (interaction.commandName === 'poll') {
        await handlePollCmd(interaction);
      } else if (interaction.commandName === 'regras-setup') {
        await handleRegrasSetupCmd(interaction);
      } else if (interaction.commandName === 'ranking-setup') {
        await interaction.deferReply({ ephemeral: true });
        await handleRankingSetup(client, interaction.guild);
        await interaction.editReply({ content: '✅ Mensagem de ranking enviada!' });
      } else if (interaction.commandName === 'resetranking') {
        await handleResetRanking(interaction);
      } else if (interaction.commandName === 'ausencia-setup') {
        await interaction.deferReply({ ephemeral: true });
        await handleAusenciaSetup(client, interaction.guild);
        await interaction.editReply({ content: '✅ Mensagem de ausência enviada!' });
      } else if (interaction.commandName === 'comandos') {
        await interaction.deferReply({ ephemeral: true });
        const { ContainerBuilder: CBcmd, TextDisplayBuilder: TDBcmd, SeparatorBuilder: SBcmd, MediaGalleryBuilder: MGBcmd, MediaGalleryItemBuilder: MGIBcmd, MessageFlags: MFcmd } = require('discord.js');
        const cfgCmd = require('./config');
        const containerCmds = new CBcmd()
          .setAccentColor(0x3498DB)
          .addMediaGalleryComponents(new MGBcmd().addItems(new MGIBcmd().setURL(cfgCmd.IMG_PADRAO)))
          .addSeparatorComponents(new SBcmd().setDivider(true))
          .addTextDisplayComponents(new TDBcmd().setContent(
            '# COMANDOS — Never Pure BOT\nLista de todos os comandos disponíveis.\n\n' +
            '**⚙️ Setup**\n' +
            '`/recrutamento-setup` — Painel de recrutamento\n' +
            '`/escalacao-setup` — Painel de escalação\n' +
            '`/escalacao-repostar` — Reposta escalações ativas (use se o bot caiu)\n' +
            '`/farm-setup` — Painel de sala de farm\n' +
            '`/farm-relatorio <usuario> [dias]` — Total de farm aprovado de um membro\n' +
            '`/remover-farm <usuario> <quantidade> <motivo>` — Remove farm de um membro\n' +
            '`/ticket-setup` — Painel de tickets\n' +
            '`/ranking-setup` — Ranking de vitórias\n' +
            '`/ausencia-setup` — Painel de solicitação de ausência\n' +
            '`/hierarquia-setup <canal>` — Painel de hierarquia\n' +
            '`/regras-setup <canal>` — Painel de regras\n' +
            '`/mensagem <canal> <texto>` — Envia mensagem customizada em um canal\n' +
            '`/mensagem-pv <texto> [cargo1] [cargo2] [cargo3] [todos]` — Envia DM por cargo ou para todos\n' +
            '`/embed-editar <canal> <id> <texto>` — Edita uma mensagem já enviada pelo bot\n' +
            '`/anuncio <canal> <texto>` — Envia anúncio com opção de @everyone\n' +
            '`/sorteio <canal> <prêmio> <tempo>` — Cria um sorteio com botão de participação\n' +
            '`/poll <pergunta> <opção1> <opção2>` — Cria uma votação com botões\n' +
            '`/codiguinho-setup` — Painel de codiguinho\n' +
            '`/cod-admin` — Gerenciar estoque de codiguinhos\n' +
            '`/armas-setup` — Painel de solicitação de armas\n' +
            '`/venda-setup` — Painel de registro de vendas\n' +
            '`/configurar` — Configura o bot (canais, cargos, ações, painel)\n' +
            '`/entrar-call <canal>` — Bot entra em um canal de voz\n' +
            '`/sair-call` — Bot sai do canal de voz atual\n' +
            '`/relatorio-call <dia> <canal-voz>` — Relatório de quem esteve em um canal de voz num dia específico\n\n' +
            '**🛡️ Moderação**\n' +
            '`/banir <usuário> <motivo>` — Bane um membro\n' +
            '`/kick <usuário> <motivo>` — Expulsa um membro\n' +
            '`/mute <usuário> <tempo> <motivo>` — Silencia por X minutos\n' +
            '`/warn <usuário> <motivo> <tipo>` — Registra uma advertência (🟢 Verde / 🟡 Amarela / 🔴 Vermelha)\n' +
            '`/warns <usuário>` — Lista as advertências de um membro\n' +
            '`/removewarn <usuário> <número>` — Remove uma advertência específica\n' +
            '`/cargo <usuário> <cargo>` — Adiciona ou remove um cargo de um membro\n' +
            '`/avisar <usuário> <mensagem>` — Envia DM ao membro via bot\n' +
            '`/clear <quantidade>` — Apaga mensagens do canal\n' +
            '`/resetranking` — Reseta todos os dados do ranking\n\n' +
            '**🔧 Canal**\n' +
            '`/lock` — Tranca o canal atual\n' +
            '`/unlock` — Destranca o canal atual\n' +
            '`/slowmode <segundos>` — Define o modo lento (0 = desativar)\n\n' +
            '**🔍 Informações**\n' +
            '`/userinfo [usuário]` — Exibe informações de um membro\n' +
            '`/stats [usuário]` — Vitórias, derrotas e V/D de um membro\n' +
            '`/status` — Status e informações do bot\n' +
            '`/comandos` — Exibe esta lista de comandos',
          ))
          .addSeparatorComponents(new SBcmd().setDivider(true))
          .addTextDisplayComponents(new TDBcmd().setContent(
            '## ⚙️ Como funciona o /configurar\n\n' +
            'Use `/configurar` para configurar todos os aspectos do bot sem editar nenhum arquivo. Requer **Administrador**.\n\n' +
            '**📋 Seções disponíveis:**\n' +
            '`Recrutamento` — Canal de envio, canal de aprovação e cargo dado no aceite\n' +
            '`Escalação` — Canais, cargos, rádio, categorias de ação e painel\n' +
            '`Farm` — Canal de farm, categoria de salas (normal e ADM)\n' +
            '`Ausência` — Canal de solicitação, de aprovação, de ausências ativas e cargo de ausente\n' +
            '`Vendas` — Canal de registro e categoria de logs de venda\n' +
            '`Armas` — Canal de solicitação e canal de log\n' +
            '`Codiguinho` — Canal de solicitação, canal de log e cargos admin\n' +
            '`Ticket` — Canal de abertura e categoria onde ficam os tickets\n' +
            '`Ranking` — Canal do ranking · toggle **💰 Pedir Valor** ao registrar vitória\n' +
            '`Logs` — Canais de log: entrada, saída, atualização de cargo, voz e advertências\n' +
            '`Advertências` — Cargo atribuído por nível de warn (nível 1, 2, 3 e 4)\n' +
            '`Setup` — Reenvia os painéis de cada módulo nos canais configurados\n' +
            '`Aparência` — Nome e avatar do bot · imagem global e imagens por módulo\n\n' +
            '**✏️ Personalizar Painel** *(botão presente em cada módulo)*\n' +
            'Abre um modal com 5 campos:\n' +
            '> **Título** — Cabeçalho exibido no painel\n' +
            '> **Descrição** — Corpo do painel (suporta **negrito**, *itálico*, etc.)\n' +
            '> **Cor** — Hex sem `#` — ex: `3498DB` = azul · `FF0000` = vermelho · `57F287` = verde\n' +
            '> **Botão** — Texto do botão principal de interação\n' +
            '> **Imagem** — URL do banner exclusivo deste módulo\n\n' +
            '**📋 Categorias de Escalação** *(Escalação → 📋 Categorias)*\n' +
            'Crie categorias (ex: Ação Grande, Ação Média) com emoji e adicione ações com nome e quantidade de vagas.\n' +
            'Até **4 categorias** aparecem como menus separados no painel de escalação.\n' +
            'Gerencie tudo pelo bot: criar categoria · adicionar/remover ações · excluir categoria.\n\n' +
            '**📻 Rádio** *(Escalação)*\n' +
            'Toggle que ativa um campo de frequência de rádio ao criar escalações.\n' +
            'Quando ativo, o card publicado exibe `📻 Rádio: [frequência informada]`.\n\n' +
            '**💰 Pedir Valor** *(Ranking)*\n' +
            'Quando ativo, ao clicar em 🏆 Vitória o bot pede o valor da ação antes de registrar.\n' +
            'O valor aparece no card de resultado como `💰 Valor: R$ 50.000`.\n\n' +
            '**🎨 Aparência do Bot**\n' +
            '`✏️ Editar Bot` — Altera o nome e o avatar do bot no Discord (limite: 2x por hora para nome)\n' +
            '`🖼️ Imagem Global` — Define a imagem padrão usada nos módulos sem imagem própria\n\n' +
            '**🔧 Setup → Enviar Mensagens**\n' +
            'Reenvia o painel do módulo no canal configurado. Use após personalizar, trocar o canal ou reiniciar o bot.\n\n' +
            '-# Never Pure  ·  Feito por zeca',
          ));
        await interaction.editReply({ components: [containerCmds], flags: MFcmd.IsComponentsV2 });
      } else if (interaction.commandName === 'codiguinho-setup') {
        await interaction.deferReply({ ephemeral: true });
        await handleCodiguinhoChannel(client, interaction.guild);
        await interaction.editReply({ content: '✅ Painel de codiguinho enviado!' });
      } else if (interaction.commandName === 'cod-admin') {
        await handleCodAdmin(interaction);
      } else if (interaction.commandName === 'armas-setup') {
        await interaction.deferReply({ ephemeral: true });
        await handleArmasChannel(client, interaction.guild);
        await interaction.editReply({ content: '✅ Painel de armas enviado!' });
      } else if (interaction.commandName === 'venda-setup') {
        await interaction.deferReply({ ephemeral: true });
        await handleVendaChannel(client, interaction.guild);
        await interaction.editReply({ content: '✅ Painel de vendas enviado!' });
      } else if (interaction.commandName === 'configurar') {
        await handleConfigurar(interaction);
      } else if (interaction.commandName === 'entrar-call') {
        await handleEntrarVoz(interaction);
      } else if (interaction.commandName === 'sair-call') {
        await handleSairVoz(interaction);
      } else if (interaction.commandName === 'relatorio-call') {
        await handleRelatorioChamada(interaction);
      }
      return;
    }

    // Modal submits
    if (interaction.isModalSubmit()) {
      const warnModalMatch = interaction.customId.match(/^modal_warn_(verde|amarela|vermelha)_(\d+)$/);
      if (warnModalMatch) {
        await handleWarnModal(interaction, warnModalMatch[1], warnModalMatch[2]);
        return;
      }
      if (interaction.customId === 'modal_ficha')          await handleModal(interaction);
      else if (interaction.customId === 'modal_escalacao') await handleModalEscalacao(interaction);
      else if (interaction.customId === 'modal_ausencia')  await handleModalAusencia(interaction);
      else if (interaction.customId === 'modal_regras')    await handleRegrasModal(interaction);
      else if (interaction.customId === 'modal_farm')      await handleFarmModal(interaction);
      else if (interaction.customId.startsWith('modal_farm_reprovar_')) {
        await handleFarmReprovarModal(interaction, interaction.customId.slice('modal_farm_reprovar_'.length));
      } else if (interaction.customId.startsWith('modal_ticket_notif_')) {
        await handleTicketNotifModal(interaction, interaction.customId.slice('modal_ticket_notif_'.length));
      } else if (interaction.customId === 'modal_codiguinho')    await handleModalCodiguinho(interaction);
      else if (interaction.customId === 'modal_cod_add')         await handleModalAddCodigos(interaction);
      else if (interaction.customId === 'modal_cod_limpar_qtd')  await handleModalLimparQtd(interaction);
      else if (interaction.customId === 'modal_armas')           await handleModalArmas(interaction);
      else if (interaction.customId === 'modal_venda')           await handleModalVenda(interaction);
      else if (interaction.customId.startsWith('modal_esc_valor_')) {
        await handleModalValorResultado(interaction, interaction.customId.slice('modal_esc_valor_'.length));
      } else if (interaction.customId === 'modal_cfg_esc_cat') {
        await handleModalConfigEscCat(interaction);
      } else if (interaction.customId === 'modal_cfg_bot_editar') {
        await handleModalConfigBotEditar(interaction);
      } else if (interaction.customId === 'modal_cfg_bot_img') {
        await handleModalConfigBotImg(interaction);
      } else if (interaction.customId.startsWith('modal_cfg_esc_cat_acao_')) {
        await handleModalConfigEscCatAcao(interaction, parseInt(interaction.customId.slice('modal_cfg_esc_cat_acao_'.length), 10));
      } else if (interaction.customId.startsWith('modal_cfg_lista_')) {
        await handleModalConfigLista(interaction, interaction.customId.slice('modal_cfg_lista_'.length));
      } else if (interaction.customId.startsWith('modal_cfg_painel_')) {
        await handleModalConfigPainel(interaction, interaction.customId.slice('modal_cfg_painel_'.length));
      }
      return;
    }

    // String select menus
    if (interaction.isStringSelectMenu()) {
      if (interaction.customId === 'venda_sel_produto') {
        await handleVendaSelectProduto(interaction);
      } else if (interaction.customId === 'ticket_tipo_select') {
        await handleTicketSelect(interaction);
      } else if (interaction.customId.startsWith('esc_select_')) {
        await handleEscalacaoSelectAcao(interaction);
      } else if (interaction.customId === 'cfg_menu') {
        await handleConfigMenu(interaction);
      } else if (interaction.customId.startsWith('cfg_lista_rm_')) {
        await handleConfigListaRm(interaction, interaction.customId.slice('cfg_lista_rm_'.length));
      } else if (interaction.customId === 'cfg_esc_cat_sel') {
        await handleConfigEscCatSel(interaction);
      } else if (interaction.customId.startsWith('cfg_esc_cat_acao_rem_')) {
        await handleConfigEscCatAcaoRem(interaction, parseInt(interaction.customId.slice('cfg_esc_cat_acao_rem_'.length), 10));
      }
      return;
    }

    // Channel select menus
    if (interaction.isChannelSelectMenu()) {
      if (interaction.customId.startsWith('cfg_ch_sel_')) {
        await handleConfigChSel(interaction, interaction.customId.slice('cfg_ch_sel_'.length));
      }
      return;
    }

    // Role select menus
    if (interaction.isRoleSelectMenu()) {
      if (interaction.customId.startsWith('cfg_role_sel_')) {
        await handleConfigRoleSel(interaction, interaction.customId.slice('cfg_role_sel_'.length));
      } else if (interaction.customId.startsWith('cfg_roles_add_')) {
        await handleConfigRolesAdd(interaction, interaction.customId.slice('cfg_roles_add_'.length));
      } else if (interaction.customId.startsWith('cfg_roles_rm_')) {
        await handleConfigRolesRm(interaction, interaction.customId.slice('cfg_roles_rm_'.length));
      }
      return;
    }

    // User select menus
    if (interaction.isUserSelectMenu()) {
      if (interaction.customId === 'selecionar_recrutador') {
        await handleSelecaoRecrutador(interaction);
      } else if (interaction.customId.startsWith('esc_remover_select_')) {
        await handleRemoverSelect(interaction, interaction.customId.slice('esc_remover_select_'.length));
      } else if (interaction.customId.startsWith('ticket_add_select_')) {
        await handleTicketAddSelect(interaction, interaction.customId.slice('ticket_add_select_'.length));
      }
      return;
    }

    // Buttons
    if (interaction.isButton()) {
      const { customId } = interaction;

      const warnTipoMatch = customId.match(/^warn_tipo_(verde|amarela|vermelha)_(\d+)$/);
      if (warnTipoMatch) {
        await handleWarnTipoBtn(interaction, warnTipoMatch[1], warnTipoMatch[2]);
      } else if (customId === 'aus_solicitar') {
        await handleAusenciaBotao(interaction);
      } else if (customId.startsWith('aus_aprovar_')) {
        const parts = customId.slice('aus_aprovar_'.length).split('_');
        await handleAusenciaAprovar(interaction, parts[0], parseInt(parts[1], 10));
      } else if (customId.startsWith('aus_reprovar_')) {
        await handleAusenciaReprovar(interaction, customId.slice('aus_reprovar_'.length));
      } else if (customId.startsWith('aus_encerrar_')) {
        await handleAusenciaEncerrar(interaction, customId.slice('aus_encerrar_'.length));
      } else if (customId.startsWith('sorteio_entrar_')) {
        await handleSorteioBtn(interaction, customId.slice('sorteio_entrar_'.length));
      } else if (customId.startsWith('poll_voto_')) {
        const partes = customId.slice('poll_voto_'.length).split('_');
        const opcaoIdx = partes.pop();
        const pollId   = partes.join('_');
        await handlePollVoto(interaction, pollId, opcaoIdx);
      } else if (customId === 'esc_custom') {
        await handleEscalacaoCustom(interaction);
      } else if (customId === 'abrir_ficha') {
        await handleBotao(interaction);
      } else if (customId.startsWith('aprovar_') || customId.startsWith('reprovar_')) {
        await handleAprovacao(interaction);
      } else if (customId.startsWith('esc_part_')) {
        await handleParticipar(interaction, customId.slice('esc_part_'.length));
      } else if (customId.startsWith('esc_sair_')) {
        await handleSair(interaction, customId.slice('esc_sair_'.length));
      } else if (customId.startsWith('esc_remover_')) {
        await handleRemoverBtn(interaction, customId.slice('esc_remover_'.length));
      } else if (customId.startsWith('esc_fechar_')) {
        await handleFechar(interaction, customId.slice('esc_fechar_'.length));
      } else if (customId.startsWith('esc_reabrir_')) {
        await handleReabrir(interaction, customId.slice('esc_reabrir_'.length));
      } else if (customId.startsWith('esc_vitoria_')) {
        await handleResultado(interaction, customId.slice('esc_vitoria_'.length), true);
      } else if (customId.startsWith('esc_derrota_')) {
        await handleResultado(interaction, customId.slice('esc_derrota_'.length), false);
      } else if (customId === 'farm_registrar') {
        await handleFarmRegistrarBtn(interaction);
      } else if (customId.startsWith('farm_aprovar_')) {
        await handleFarmAprovar(interaction, customId.slice('farm_aprovar_'.length));
      } else if (customId.startsWith('farm_reprovar_')) {
        await handleFarmReprovarBtn(interaction, customId.slice('farm_reprovar_'.length));
      } else if (customId === 'farm_criar') {
        await handleFarmBotao(interaction);
      } else if (customId.startsWith('ticket_notif_')) {
        await handleTicketNotifBtn(interaction, customId.slice('ticket_notif_'.length));
      } else if (customId.startsWith('ticket_add_')) {
        await handleTicketAddBtn(interaction, customId.slice('ticket_add_'.length));
      } else if (customId.startsWith('ticket_fechar_')) {
        await handleTicketFechar(interaction, customId.slice('ticket_fechar_'.length));
      } else if (customId.startsWith('ticket_salvar_')) {
        await handleTicketSalvar(interaction, customId.slice('ticket_salvar_'.length));
      } else if (customId === 'cod_solicitar') {
        await handleCodiguinhoBotao(interaction);
      } else if (customId.startsWith('cod_aprovar_')) {
        await handleCodAprovar(interaction, customId.slice('cod_aprovar_'.length));
      } else if (customId.startsWith('cod_recusar_')) {
        await handleCodRecusar(interaction, customId.slice('cod_recusar_'.length));
      } else if (customId === 'cod_admin_add') {
        await handleCodAdminAdd(interaction);
      } else if (customId === 'cod_admin_ver') {
        await handleCodAdminVer(interaction);
      } else if (customId === 'cod_admin_limpar_all') {
        await handleCodLimparAll(interaction);
      } else if (customId === 'cod_admin_limpar_qtd') {
        await handleCodLimparQtd(interaction);
      } else if (customId === 'armas_solicitar') {
        await handleArmasBotao(interaction);
      } else if (customId.startsWith('armas_aprovar_')) {
        await handleArmasAprovar(interaction, customId.slice('armas_aprovar_'.length));
      } else if (customId.startsWith('armas_recusar_')) {
        await handleArmasRecusar(interaction, customId.slice('armas_recusar_'.length));
      } else if (customId === 'venda_criar') {
        await handleVendaBotao(interaction);
      } else if (customId.startsWith('venda_confirmar_')) {
        await handleVendaConfirmar(interaction, customId.slice('venda_confirmar_'.length));
      } else if (customId.startsWith('venda_cancelar_')) {
        await handleVendaCancelar(interaction, customId.slice('venda_cancelar_'.length));
      } else if (customId === 'cfg_ranking_valor') {
        await handleConfigRankingValor(interaction);
      } else if (customId === 'cfg_esc_cats') {
        await handleConfigEscCats(interaction);
      } else if (customId === 'cfg_esc_cat_add') {
        await handleConfigEscCatAdd(interaction);
      } else if (customId === 'cfg_esc_cats_back') {
        await handleConfigMenu(interaction, 'escalacao');
      } else if (customId.startsWith('cfg_esc_cat_del_')) {
        await handleConfigEscCatDel(interaction, parseInt(customId.slice('cfg_esc_cat_del_'.length), 10));
      } else if (customId.startsWith('cfg_esc_cat_acao_add_')) {
        await handleConfigEscCatAcaoAdd(interaction, parseInt(customId.slice('cfg_esc_cat_acao_add_'.length), 10));
      } else if (customId === 'cfg_bot_editar') {
        await handleConfigBotEditar(interaction);
      } else if (customId === 'cfg_bot_img') {
        await handleConfigBotImg(interaction);
      } else if (customId === 'cfg_back') {
        await handleConfigBack(interaction);
      } else if (customId === 'cfg_escradio') {
        await handleConfigEscRadio(interaction);
      } else if (customId.startsWith('cfg_setup_')) {
        await handleConfigSetup(interaction, customId.slice('cfg_setup_'.length), client);
      } else if (customId.startsWith('cfg_painel_')) {
        await handleConfigPainelBtn(interaction, customId.slice('cfg_painel_'.length));
      } else if (customId.startsWith('cfg_lista_add_')) {
        await handleConfigListaAddBtn(interaction, customId.slice('cfg_lista_add_'.length));
      } else if (customId.startsWith('cfg_lista_clr_')) {
        await handleConfigListaClr(interaction, customId.slice('cfg_lista_clr_'.length));
      } else if (customId.startsWith('cfg_lista_')) {
        await handleConfigListaBtn(interaction, customId.slice('cfg_lista_'.length));
      } else if (customId.startsWith('cfg_roles_clr_')) {
        await handleConfigRolesClr(interaction, customId.slice('cfg_roles_clr_'.length));
      } else if (customId.startsWith('cfg_roles_')) {
        await handleConfigRolesBtn(interaction, customId.slice('cfg_roles_'.length));
      } else if (customId.startsWith('cfg_role_')) {
        await handleConfigRoleBtn(interaction, customId.slice('cfg_role_'.length));
      } else if (customId.startsWith('cfg_ch_')) {
        await handleConfigChBtn(interaction, customId.slice('cfg_ch_'.length));
      }
      return;
    }
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Erro inesperado na interação:`, err);
  }
});

client.login(process.env.DISCORD_TOKEN);

const http = require('http');
const PORT = process.env.PORT || 3000;
http.createServer((_, res) => { res.writeHead(200); res.end('ok'); }).listen(PORT);
