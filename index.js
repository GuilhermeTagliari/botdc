require('dotenv').config();

const fs   = require('fs');
const path = require('path');
fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });

const { Client, GatewayIntentBits, Partials } = require('discord.js');
const { handleRecrutamentoChannel, handleBotao } = require('./handlers/botao');
const { handleModal }             = require('./handlers/modal');
const { handleAprovacao }         = require('./handlers/aprovacao');
const { handleSelecaoRecrutador } = require('./handlers/selecao');
const {
  handleEscalacaoChannel,
  handleCriarEscalacao,
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
} = require('./handlers/escalacao');
const { handleFarmChannel, handleFarmBotao } = require('./handlers/farm');
const {
  handleClear, handleBanir, handleKick, handleMute,
  handleWarn, handleWarns, handleRemovewarn, handleUserinfo,
  handleLock, handleUnlock, handleSlowmode,
  handleCargo, handleAvisar,
} = require('./handlers/moderacao');
const { handleRankingSetup, atualizarRanking, handleStats } = require('./handlers/ranking');
const { handleHierarquiaSetup, atualizarHierarquia, handleMemberUpdate } = require('./handlers/hierarquia');
const { handleSorteioCmd, handleSorteioBtn, restaurarSorteios } = require('./handlers/sorteio');
const { handlePollCmd, handlePollVoto } = require('./handlers/poll');
const { handleRegrasSetupCmd, handleRegrasModal } = require('./handlers/regras');
const { logEntrada, registrarSaida, handleAuditEntry, carregarConvites, handleInviteCreate, handleInviteDelete } = require('./handlers/log');
const {
  handleTicketChannel,
  handleTicketBotao,
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
  ],
  partials: [Partials.Channel],
});

async function registrarComandos(guild) {
  try {
    await guild.commands.set([
      { name: 'recrutamento-setup', description: 'Envia a mensagem de recrutamento no canal configurado', defaultMemberPermissions: '8' },
      { name: 'escalacao-setup',   description: 'Envia a mensagem de escalação no canal configurado',    defaultMemberPermissions: '8' },
      { name: 'farm-setup',        description: 'Envia a mensagem de criar sala de farm no canal configurado', defaultMemberPermissions: '8' },
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
          { name: 'motivo',  description: 'Motivo da advertência',  type: 3, required: true },
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
      { name: 'ranking-setup',    description: 'Envia a mensagem de ranking no canal configurado',    defaultMemberPermissions: '8' },
      { name: 'hierarquia-setup', description: 'Envia o painel de hierarquia no canal selecionado', defaultMemberPermissions: '8',
        options: [{ name: 'canal', description: 'Canal onde o painel será enviado', type: 7, required: true }] },
      {
        name: 'stats',
        description: 'Exibe vitórias, derrotas e K/D de um membro',
        options: [
          { name: 'usuario', description: 'Membro para consultar (padrão: você mesmo)', type: 6, required: false },
        ],
      },
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
    ]);
    console.log(`[${new Date().toISOString()}] Comandos registrados em: ${guild.name}`);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Erro ao registrar comandos:`, err);
  }
}

client.once('ready', async () => {
  console.log(`[${new Date().toISOString()}] Bot online: ${client.user.tag}`);
  client.user.setPresence({
    activities: [{ name: 'Feito por zeca', type: 4 }],
    status: 'online',
  });
  for (const guild of client.guilds.cache.values()) {
    await registrarComandos(guild);
    await carregarConvites(guild);
    await atualizarRanking(guild);
    await atualizarHierarquia(guild);
  }
  await restaurarSorteios(client);
  await restaurarEscalacoes(client);
});

client.on('guildCreate', async (guild) => {
  console.log(`[${new Date().toISOString()}] Bot adicionado ao servidor: ${guild.name}`);
  await registrarComandos(guild);
  await carregarConvites(guild);
});

client.on('inviteCreate', handleInviteCreate);
client.on('inviteDelete', handleInviteDelete);

client.on('guildMemberAdd',          (member)         => logEntrada(member));
client.on('guildMemberRemove',       (member)         => registrarSaida(member));
client.on('guildAuditLogEntryCreate',(entry, guild)   => handleAuditEntry(entry, guild));
client.on('guildMemberUpdate',       (oldMember, newMember) => handleMemberUpdate(oldMember, newMember));

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
      } else if (interaction.commandName === 'farm-setup') {
        await interaction.deferReply({ ephemeral: true });
        await handleFarmChannel(client, interaction.guild);
        await interaction.editReply({ content: '✅ Mensagem de farm enviada!' });
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
        const imgPadrao = 'https://cdn.discordapp.com/attachments/1497039765118255282/1497069523269058651/Logo_CRX_com_brilho_metalico_e_vermelho.jpg?ex=69ee2864&is=69ecd6e4&hm=27a99f4e3c95b941f73a2c4b924fd805b34d59519b976a2445c4d875f5b6c5fc&';
        const conteudoTexto = (titulo ? `# ${titulo}\n\n` : '') + texto + `\n\n-# 📝 Enviado por <@${interaction.user.id}>`;
        const botoes = [];
        for (let i = 1; i <= 5; i++) {
          const url = interaction.options.getString(`link${i}`);
          if (!url) continue;
          const lbl = interaction.options.getString(`label${i}`) ?? '🔗 Clique aqui';
          botoes.push(new BB().setLabel(lbl).setStyle(BS.Link).setURL(url));
        }
        const container = new CB()
          .setAccentColor(0xFF0000)
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
      } else if (interaction.commandName === 'anuncio') {
        await interaction.deferReply({ ephemeral: true });
        const canal       = interaction.options.getChannel('canal');
        const texto       = interaction.options.getString('texto');
        const titulo      = interaction.options.getString('titulo') ?? '📢  Anúncio';
        const marcarTodos = interaction.options.getBoolean('marcar_todos') ?? false;
        const imagem      = interaction.options.getString('imagem');
        const { ContainerBuilder: CB2, TextDisplayBuilder: TDB2, SeparatorBuilder: SB2, MediaGalleryBuilder: MGB2, MediaGalleryItemBuilder: MGIB2, MessageFlags: MF2 } = require('discord.js');
        const imgPadrao2 = 'https://cdn.discordapp.com/attachments/1497039765118255282/1497069523269058651/Logo_CRX_com_brilho_metalico_e_vermelho.jpg?ex=69ee2864&is=69ecd6e4&hm=27a99f4e3c95b941f73a2c4b924fd805b34d59519b976a2445c4d875f5b6c5fc&';
        const containerAnuncio = new CB2()
          .setAccentColor(0xFF0000)
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
          '`imagem` — URL de uma imagem para substituir a logo CRX',
        ].join('\n');
        try {
          await canal.send({ content: marcarTodos ? '@everyone' : null, components: [containerAnuncio], flags: MF2.IsComponentsV2 });
          await interaction.editReply({ content: `✅ Anúncio enviado em ${canal}!\n\n${guiaAnuncio}` });
        } catch {
          await interaction.editReply({ content: `❌ Não consegui enviar no canal selecionado. Verifique as permissões do bot.\n\n${guiaAnuncio}` });
        }
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
      } else if (interaction.commandName === 'comandos') {
        const { ContainerBuilder: CBcmd, TextDisplayBuilder: TDBcmd, SeparatorBuilder: SBcmd, MediaGalleryBuilder: MGBcmd, MediaGalleryItemBuilder: MGIBcmd, MessageFlags: MFcmd } = require('discord.js');
        const imgCmds = 'https://cdn.discordapp.com/attachments/1497039765118255282/1497069523269058651/Logo_CRX_com_brilho_metalico_e_vermelho.jpg?ex=69ee2864&is=69ecd6e4&hm=27a99f4e3c95b941f73a2c4b924fd805b34d59519b976a2445c4d875f5b6c5fc&';
        const containerCmds = new CBcmd()
          .setAccentColor(0xFF0000)
          .addMediaGalleryComponents(new MGBcmd().addItems(new MGIBcmd().setURL(imgCmds)))
          .addSeparatorComponents(new SBcmd().setDivider(true))
          .addTextDisplayComponents(new TDBcmd().setContent(
            '# COMANDOS — CRX BOT\nLista de todos os comandos disponíveis.\n\n' +
            '**⚙️ Setup**\n' +
            '`/recrutamento-setup` — Painel de recrutamento\n' +
            '`/escalacao-setup` — Painel de escalação\n' +
            '`/farm-setup` — Painel de sala de farm\n' +
            '`/ticket-setup` — Painel de tickets\n' +
            '`/ranking-setup` — Ranking de vitórias\n' +
            '`/regras-setup` — Painel de regras\n' +
            '`/mensagem` — Envia mensagem customizada em um canal\n' +
            '`/anuncio` — Envia anúncio com opção de @everyone\n' +
            '`/sorteio` — Cria um sorteio com botão de participação\n' +
            '`/poll` — Cria uma votação com botões\n\n' +
            '**🛡️ Moderação**\n' +
            '`/banir <usuário> <motivo>` — Bane um membro\n' +
            '`/kick <usuário> <motivo>` — Expulsa um membro\n' +
            '`/mute <usuário> <tempo> <motivo>` — Silencia por X minutos\n' +
            '`/warn <usuário> <motivo>` — Registra uma advertência\n' +
            '`/warns <usuário>` — Lista as advertências de um membro\n' +
            '`/removewarn <usuário> <número>` — Remove uma advertência\n' +
            '`/cargo <usuário> <cargo>` — Adiciona ou remove um cargo\n' +
            '`/avisar <usuário> <mensagem>` — Envia DM para o membro\n' +
            '`/clear <quantidade>` — Apaga mensagens do canal\n\n' +
            '**🔧 Canal**\n' +
            '`/lock` — Tranca o canal atual\n' +
            '`/unlock` — Destranca o canal atual\n' +
            '`/slowmode <segundos>` — Define o modo lento (0 = desativar)\n\n' +
            '**🔍 Informações**\n' +
            '`/userinfo [usuário]` — Exibe informações de um membro\n' +
            '`/stats [usuário]` — Vitórias, derrotas e K/D de um membro\n' +
            '`/comandos` — Exibe esta lista de comandos\n\n' +
            '-# CRX  ·  Feito por zeca',
          ));
        await interaction.reply({ components: [containerCmds], flags: MFcmd.IsComponentsV2 });
      }
      return;
    }

    // Modal submits
    if (interaction.isModalSubmit()) {
      if (interaction.customId === 'modal_ficha')          await handleModal(interaction);
      else if (interaction.customId === 'modal_escalacao') await handleModalEscalacao(interaction);
      else if (interaction.customId === 'modal_regras')    await handleRegrasModal(interaction);
      else if (interaction.customId.startsWith('modal_ticket_notif_')) {
        await handleTicketNotifModal(interaction, interaction.customId.slice('modal_ticket_notif_'.length));
      }
      return;
    }

    // String select menus
    if (interaction.isStringSelectMenu()) {
      if (interaction.customId === 'ticket_tipo_select') {
        await handleTicketSelect(interaction);
      } else if (
        interaction.customId === 'esc_select_grande' ||
        interaction.customId === 'esc_select_media'  ||
        interaction.customId === 'esc_select_pequena'
      ) {
        await handleEscalacaoSelectAcao(interaction);
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

      if (customId.startsWith('sorteio_entrar_')) {
        await handleSorteioBtn(interaction, customId.slice('sorteio_entrar_'.length));
      } else if (customId.startsWith('poll_voto_')) {
        const partes = customId.slice('poll_voto_'.length).split('_');
        const opcaoIdx = partes.pop();
        const pollId   = partes.join('_');
        await handlePollVoto(interaction, pollId, opcaoIdx);
      } else if (customId === 'escalar_criar') {
        await handleCriarEscalacao(interaction);
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
