const {
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ChannelType,
  PermissionFlagsBits,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  MessageFlags,
} = require('discord.js');
const fs   = require('fs');
const path = require('path');
const config = require('../config');
const { txt } = require('../textos');
const { temPermissao } = require('../utils/permissao');
const { dmEmbed } = require('../utils/dm');

const ARQUIVO = path.join(__dirname, '../data/farms.json');

const aguardandoFoto  = new Map(); // channelId → { userId, quantidade, horario, expiresAt }
const farms           = new Map(); // farmId → entry
const relatoriosMsgId = new Map(); // `${guildId}_${userId}` → { channelId, messageId }

function lerDados() {
  try { return JSON.parse(fs.readFileSync(ARQUIVO, 'utf8')); } catch { return {}; }
}

function salvarDados() {
  const dados = {};
  for (const [id, f] of farms.entries()) dados[id] = f;

  fs.writeFileSync(ARQUIVO, JSON.stringify(dados, null, 2));
}

// Extrai o texto de todas as TextDisplay de uma mensagem Components V2
function extrairTextoMsg(msg) {
  const getText = (comp) => {
    if (!comp) return '';
    const type    = comp.type    ?? comp.data?.type;
    const content = comp.content ?? comp.data?.content;
    if (type === 10) return typeof content === 'string' ? content : '';
    const children = comp.components ?? comp.data?.components ?? [];
    return Array.isArray(children) ? children.map(getText).join('\n') : '';
  };
  return msg.components.map(getText).filter(Boolean).join('\n');
}

// Busca recursiva de customId com prefixo nos componentes
function encontrarCustomId(components, prefixo) {
  for (const comp of (components ?? [])) {
    const id = comp.customId ?? comp.data?.customId ?? comp.data?.custom_id ?? '';
    if (id.startsWith(prefixo)) return id;
    const found = encontrarCustomId(comp.components ?? comp.data?.components, prefixo);
    if (found) return found;
  }
  return null;
}

async function restaurarFarms(client) {
  // Tenta carregar do JSON primeiro
  const dados = lerDados();
  for (const [id, f] of Object.entries(dados)) farms.set(id, f);

  if (farms.size > 0) {
    console.log(`[${new Date().toISOString()}] Farms carregados do JSON: ${farms.size}`);
    return;
  }

  // JSON vazio (deploy/wipe) — reconstrói a partir dos canais do Discord
  console.log(`[${new Date().toISOString()}] JSON de farms vazio — escaneando canais...`);

  for (const guild of client.guilds.cache.values()) {
    const categorias = [config.CATEGORIA_FARM, config.CATEGORIA_FARM_ADM, config.CATEGORIA_FARM_ELITE].filter(Boolean);
    if (!categorias.length) continue;

    await guild.channels.fetch().catch(() => {});
    const canais = [...guild.channels.cache.values()]
      .filter((c) => categorias.includes(c.parentId) && c.isTextBased?.());

    for (const canal of canais) {
      try {
        const msgs = await canal.messages.fetch({ limit: 100 });
        for (const msg of msgs.values()) {
          if (msg.author.id !== client.user.id) continue;
          if (!msg.flags.has(MessageFlags.IsComponentsV2)) continue;

          const texto   = extrairTextoMsg(msg);
          const aprovar = encontrarCustomId(msg.components, 'farm_aprovar_');

          if (aprovar) {
            // Farm pendente: tem botões de aprovar/reprovar
            const farmId  = aprovar.slice('farm_aprovar_'.length);
            const userId  = texto.match(/Membro:\*\* <@(\d+)>/)?.[1];
            const qtdRaw  = texto.match(/Quantidade:\*\* ([\d.]+)/)?.[1]?.replace(/\./g, '');
            const horario = texto.match(/Horário do depósito:\*\* ([^\n]+)/)?.[1]?.trim();
            const fotoUrl = texto.match(/\[Clique para ver\]\(([^)]+)\)/)?.[1] ?? null;
            if (!userId || !qtdRaw) continue;
            farms.set(farmId, {
              userId, quantidade: parseInt(qtdRaw, 10),
              horario: horario || '—', fotoUrl,
              status: 'pendente', motivo: null,
              guildId: guild.id, timestamp: msg.createdTimestamp,
              messageId: msg.id, channelId: canal.id,
            });
          } else if (texto.includes('Farm Aprovado ✅')) {
            const userId  = texto.match(/Membro:\*\* <@(\d+)>/)?.[1];
            const qtdRaw  = texto.match(/Quantidade:\*\* ([\d.]+)/)?.[1]?.replace(/\./g, '');
            const horario = texto.match(/Horário do depósito:\*\* ([^\n]+)/)?.[1]?.trim();
            if (!userId || !qtdRaw) continue;
            farms.set(`farm_rec_${msg.id}`, {
              userId, quantidade: parseInt(qtdRaw, 10),
              horario: horario || '—', status: 'aprovado',
              guildId: guild.id, timestamp: msg.createdTimestamp,
            });
          } else if (texto.includes('Farm Removido') && texto.includes('Quantidade removida')) {
            const userId = texto.match(/<@(\d+)>, uma quantidade/)?.[1];
            const qtdRaw = texto.match(/Quantidade removida:\*\* ([\d.]+)/)?.[1]?.replace(/\./g, '');
            if (!userId || !qtdRaw) continue;
            farms.set(`farm_rem_rec_${msg.id}`, {
              userId, quantidade: parseInt(qtdRaw, 10),
              status: 'removido', guildId: guild.id,
              timestamp: msg.createdTimestamp,
            });
          }
        }
      } catch (err) {
        console.error(`[${new Date().toISOString()}] Erro ao escanear ${canal.name}:`, err.message);
      }
    }
  }

  console.log(`[${new Date().toISOString()}] Farms reconstruídos dos canais: ${farms.size}`);
  if (farms.size > 0) salvarDados();
}

function temPermStaff(member) {
  return member.permissions.has(PermissionFlagsBits.ManageChannels) ||
         member.roles.cache.has(config.CARGO_FARM_APROVAR);
}

function parsearNick(member) {
  const nick  = member.nickname || member.user.username;
  const partes = nick.split(' | ');
  return partes.length >= 2 ? `${partes[0]} ${partes.slice(1).join(' ')}` : nick;
}

// ── Painel público: botão para criar sala de farm ─────────────────────────────

async function handleFarmChannel(client, guild) {
  try {
    const channel = await guild.channels.fetch(config.CANAL_FARM_BTN);
    if (!channel) return;

    const mensagens = await channel.messages.fetch({ limit: 50 });
    const jaExiste  = mensagens.some(
      (m) => m.author.id === client.user.id && (
        (m.embeds.length > 0 && m.components.length > 0) ||
        m.flags.has(MessageFlags.IsComponentsV2)
      ),
    );

    if (jaExiste) {
      console.log(`[${new Date().toISOString()}] Mensagem de farm já existe — nenhuma ação necessária.`);
      return;
    }

    const container = new ContainerBuilder()
      .setAccentColor(config.FARM_COR ?? 0x3498DB)
      .addMediaGalleryComponents(
        new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(config.getImg('FARM'))),
      )
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# ${config.FARM_TITULO}\n\n${config.FARM_DESC}`,
        ),
      )
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
      .addActionRowComponents(
        new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('farm_criar').setLabel(config.FARM_BTN).setStyle(ButtonStyle.Primary),
        ),
      );

    await channel.send({ components: [container], flags: MessageFlags.IsComponentsV2 });
    console.log(`[${new Date().toISOString()}] Mensagem de farm enviada em: ${guild.name}`);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Erro ao enviar mensagem de farm:`, err);
  }
}

// ── Cria a sala privada e posta o botão de registro ───────────────────────────

async function handleFarmBotao(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const { member, guild } = interaction;
  const nomeCanal = parsearNick(member);

  const permissoes = [
    { id: guild.id,                   deny:  [PermissionFlagsBits.ViewChannel] },
    { id: interaction.client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels] },
    { id: member.id,                  allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageMessages] },
    ...(config.CARGOS_FARM_STAFF ?? []).map((id) => ({
      id,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.SendMessages],
    })),
  ];

  const isAdm   = temPermissao(member, config.CARGOS_FARM_ADM);
  const isElite = temPermissao(member, config.CARGOS_FARM_ELITE);
  let categoria = config.CATEGORIA_FARM;
  if (isAdm && config.CATEGORIA_FARM_ADM)        categoria = config.CATEGORIA_FARM_ADM;
  else if (isElite && config.CATEGORIA_FARM_ELITE) categoria = config.CATEGORIA_FARM_ELITE;
  const options   = { name: nomeCanal, type: ChannelType.GuildText, permissionOverwrites: permissoes };
  if (categoria) options.parent = categoria;

  try {
    const canal = await guild.channels.create(options);
    await handleFarmSetupCanal(canal, member);
    await interaction.editReply({ content: `✅ Sala criada! ${canal}` });
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Erro ao criar sala de farm:`, err);
    await interaction.editReply({ content: '❌ Erro ao criar a sala. Verifique se o bot tem permissão de **Gerenciar Canais**.' });
  }
}

// Posta a mensagem de boas-vindas + botão de registro dentro da sala
async function handleFarmSetupCanal(canal, member) {
  const container = new ContainerBuilder()
    .setAccentColor(0x57F287)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `## 🌾 Sala de Farm — ${member.displayName}\n\n` +
        `Olá ${member}! Sua sala de farm foi criada.\n\n` +
        `Para registrar seu farm, clique no botão abaixo e informe:\n` +
        `> **📦 Quantidade**\n` +
        `> **🕐 Horário**\n` +
        `> **📸 Foto como comprovante** *(enviada após preencher o formulário)*\n\n` +
        `-# A staff irá aprovar ou reprovar cada registro.`,
      ),
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addActionRowComponents(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('farm_registrar')
          .setLabel(txt('farm.btn_registrar', '🌾 Registrar Farm'))
          .setStyle(ButtonStyle.Success),
      ),
    );

  await canal.send({ components: [container], flags: MessageFlags.IsComponentsV2 });
}

// ── Botão "Registrar Farm" → abre modal ──────────────────────────────────────

async function handleFarmRegistrarBtn(interaction) {
  const modal = new ModalBuilder()
    .setCustomId('modal_farm')
    .setTitle(txt('farm.titulo', 'Registrar Farm'));

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('farm_quantidade')
        .setLabel(txt('farm.qtd', 'Quantidade de farm'))
        .setPlaceholder('Ex: 500')
        .setStyle(TextInputStyle.Short)
        .setMaxLength(10)
        .setRequired(true),
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('farm_horario')
        .setLabel(txt('farm.horario', 'Horário do depósito do farm'))
        .setPlaceholder('Ex: 14:30')
        .setStyle(TextInputStyle.Short)
        .setMaxLength(10)
        .setRequired(true),
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('farm_produto')
        .setLabel(txt('farm.produto', 'Produto farmado'))
        .setPlaceholder('Ex: Cocaína, Maconha, Metal...')
        .setStyle(TextInputStyle.Short)
        .setMaxLength(60)
        .setRequired(true),
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('farm_foto_url')
        .setLabel(txt('farm.foto', 'Link da foto (opcional)'))
        .setPlaceholder('Cole o link da imagem — ou deixe vazio para registrar sem foto')
        .setStyle(TextInputStyle.Short)
        .setMaxLength(500)
        .setRequired(false),
    ),
  );

  await interaction.showModal(modal);
}

// ── Modal submetido → aguarda foto ───────────────────────────────────────────

async function handleFarmModal(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const quantidadeRaw = interaction.fields.getTextInputValue('farm_quantidade');
  const horario       = interaction.fields.getTextInputValue('farm_horario');
  const produto       = interaction.fields.getTextInputValue('farm_produto').trim();
  const fotoUrl       = interaction.fields.getTextInputValue('farm_foto_url').trim();
  const quantidade    = parseInt(quantidadeRaw.replace(/\D/g, ''), 10);

  if (isNaN(quantidade) || quantidade <= 0) {
    await interaction.editReply({ content: '❌ Quantidade inválida. Use um número positivo.' });
    return;
  }

  // Cria o registro imediatamente (com ou sem foto)
  await criarRegistroPendente(interaction.channel, interaction.user.id, quantidade, horario, fotoUrl || null, produto);
  await interaction.editReply({ content: '✅ Registro enviado para aprovação da staff!' });
}

// ── Cria a mensagem de registro pendente no canal ─────────────────────────────

async function criarRegistroPendente(canal, userId, quantidade, horario, fotoUrl, produto) {
  const farmId    = `farm_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  const timestamp = Date.now();
  const qtdFmt    = quantidade.toLocaleString('pt-BR');
  const linhaFoto = fotoUrl ? `\n**📸 Foto:** [Clique para ver](${fotoUrl})` : '';
  const linhaProduto = produto ? `**📦 Produto:** ${produto}\n` : '';

  const container = new ContainerBuilder().setAccentColor(0xFEE75C);
  if (fotoUrl) {
    container
      .addMediaGalleryComponents(new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(fotoUrl)))
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true));
  }
  container
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `## 🌾 Registro de Farm — Pendente\n\n` +
      `**👤 Membro:** <@${userId}>\n` +
      `**📦 Quantidade:** ${qtdFmt}\n` +
      linhaProduto +
      `**🕐 Horário do depósito:** ${horario}\n` +
      `**📅 Enviado:** <t:${Math.floor(timestamp / 1000)}:F>${linhaFoto}\n\n` +
      `-# ⏳ Aguardando aprovação da staff`,
    ))
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addActionRowComponents(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`farm_aprovar_${farmId}`).setLabel(txt('farm.btn_aprovar', '✅ Aprovar')).setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`farm_reprovar_${farmId}`).setLabel(txt('farm.btn_reprovar', '❌ Reprovar')).setStyle(ButtonStyle.Danger),
      ),
    );

  const entry = {
    userId,
    quantidade,
    horario,
    produto: produto ?? null,
    fotoUrl,
    status:    'pendente',
    motivo:    null,
    guildId:   canal.guild.id,
    timestamp,
    messageId: null,
    channelId: canal.id,
  };

  try {
    const msg       = await canal.send({ components: [container], flags: MessageFlags.IsComponentsV2 });
    entry.messageId = msg.id;
  } catch {}

  farms.set(farmId, entry);
  salvarDados();
}

// ── messageCreate → captura foto e cria registro pendente ────────────────────

async function handleFarmFoto(message) {
  if (message.author.bot) return;

  const pendente = aguardandoFoto.get(message.channelId);
  if (!pendente || pendente.userId !== message.author.id) return;

  if (Date.now() > pendente.expiresAt) {
    aguardandoFoto.delete(message.channelId);
    return;
  }

  const foto = message.attachments.find((a) => a.contentType?.startsWith('image/'));
  if (!foto) return;

  aguardandoFoto.delete(message.channelId);
  try { await message.delete(); } catch {}
  await criarRegistroPendente(message.channel, message.author.id, pendente.quantidade, pendente.horario, foto.url);
}

// ── Staff: Aprovar ────────────────────────────────────────────────────────────

async function handleFarmAprovar(interaction, farmId) {
  const entry = farms.get(farmId);
  if (!entry) {
    await interaction.reply({ content: '❌ Registro não encontrado.', ephemeral: true });
    return;
  }
  if (!temPermStaff(interaction.member)) {
    await interaction.reply({ content: '❌ Sem permissão para aprovar farms.', ephemeral: true });
    return;
  }

  entry.status      = 'aprovado';
  entry.aprovadoPor = interaction.user.id;
  salvarDados();

  const linhaFotoAprov = entry.fotoUrl ? `**📸 Foto:** [Clique para ver](${entry.fotoUrl})\n\n` : '\n';
  const linhaProdutoAprov = entry.produto ? `**📦 Produto:** ${entry.produto}\n` : '';
  const container = new ContainerBuilder().setAccentColor(0x57F287);
  if (entry.fotoUrl) {
    container
      .addMediaGalleryComponents(new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(entry.fotoUrl)))
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true));
  }
  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(
    `## 🌾 Farm Aprovado ✅\n\n` +
    `**👤 Membro:** <@${entry.userId}>\n` +
    `**📦 Quantidade:** ${entry.quantidade.toLocaleString('pt-BR')}\n` +
    linhaProdutoAprov +
    `**🕐 Horário do depósito:** ${entry.horario}\n` +
    `**✅ Aprovado por:** <@${interaction.user.id}>\n` +
    linhaFotoAprov +
    `-# Farm registrado com sucesso`,
  ));

  const canal = interaction.channel;
  const msgId = entry.messageId;
  await interaction.deferUpdate();
  try {
    if (msgId) {
      const msg = await canal.messages.fetch(msgId).catch(() => null);
      if (msg) await msg.delete();
    }
  } catch {}
  await canal.send({ components: [container], flags: MessageFlags.IsComponentsV2 });
}

// ── Staff: Reprovar (abre modal para motivo) ──────────────────────────────────

async function handleFarmReprovarBtn(interaction, farmId) {
  const entry = farms.get(farmId);
  if (!entry) {
    await interaction.reply({ content: '❌ Registro não encontrado.', ephemeral: true });
    return;
  }
  if (!temPermStaff(interaction.member)) {
    await interaction.reply({ content: '❌ Sem permissão para reprovar farms.', ephemeral: true });
    return;
  }

  const modal = new ModalBuilder()
    .setCustomId(`modal_farm_reprovar_${farmId}`)
    .setTitle('Reprovar Farm');

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('farm_motivo')
        .setLabel('Motivo da reprovação')
        .setPlaceholder('Ex: Foto sem qualidade, quantidade incorreta...')
        .setStyle(TextInputStyle.Paragraph)
        .setMaxLength(300)
        .setRequired(true),
    ),
  );

  await interaction.showModal(modal);
}

async function handleFarmReprovarModal(interaction, farmId) {
  const entry = farms.get(farmId);
  if (!entry) {
    await interaction.reply({ content: '❌ Registro não encontrado.', ephemeral: true });
    return;
  }

  const motivo       = interaction.fields.getTextInputValue('farm_motivo');
  entry.status       = 'reprovado';
  entry.motivo       = motivo;
  entry.reprovadoPor = interaction.user.id;
  salvarDados();

  const linhaFotoReprov = entry.fotoUrl ? `**📸 Foto:** [Clique para ver](${entry.fotoUrl})\n\n` : '\n';
  const linhaProdutoReprov = entry.produto ? `**📦 Produto:** ${entry.produto}\n` : '';
  const container = new ContainerBuilder().setAccentColor(0x3498DB);
  if (entry.fotoUrl) {
    container
      .addMediaGalleryComponents(new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(entry.fotoUrl)))
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true));
  }
  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(
    `## 🌾 Farm Reprovado ❌\n\n` +
    `**👤 Membro:** <@${entry.userId}>\n` +
    `**📦 Quantidade:** ${entry.quantidade.toLocaleString('pt-BR')}\n` +
    linhaProdutoReprov +
    `**🕐 Horário do depósito:** ${entry.horario}\n` +
    `**❌ Reprovado por:** <@${interaction.user.id}>\n` +
    `**📋 Motivo:** ${motivo}\n` +
    linhaFotoReprov +
    `-# Farm não contabilizado`,
  ));

  const canal = interaction.channel;
  const msgId = entry.messageId;
  await interaction.deferReply({ ephemeral: true });
  try {
    if (msgId) {
      const msg = await canal.messages.fetch(msgId).catch(() => null);
      if (msg) await msg.delete();
    }
  } catch {}
  await canal.send({ components: [container], flags: MessageFlags.IsComponentsV2 });
  await interaction.editReply({ content: '❌ Farm reprovado.' });
}

// ── /farm-relatorio ───────────────────────────────────────────────────────────

async function handleFarmRelatorio(interaction) {
  await interaction.deferReply();

  const usuario = interaction.options.getUser('usuario');
  const dias    = interaction.options.getInteger('dias');
  const agora   = Date.now();
  const limite  = dias ? agora - dias * 24 * 60 * 60 * 1000 : null;

  let total     = 0;
  let entradas  = 0;
  let removidos = 0;

  for (const entry of farms.values()) {
    if (entry.userId  !== usuario.id)          continue;
    if (entry.guildId !== interaction.guild.id) continue;
    if (limite && entry.timestamp < limite)     continue;
    if (entry.status === 'aprovado')  { total += entry.quantidade; entradas++; }
    if (entry.status === 'removido')  { total -= entry.quantidade; removidos++; }
  }
  if (total < 0) total = 0;

  const periodoTexto = dias ? `Últimos ${dias} dia${dias !== 1 ? 's' : ''}` : 'Todo o período';
  const linhaRemovidos = removidos > 0 ? `\n**🗑️ Remoções:** ${removidos}` : '';

  const container = new ContainerBuilder()
    .setAccentColor(0x57F287)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `## 🌾 Relatório de Farm\n\n` +
      `**👤 Membro:** <@${usuario.id}>\n` +
      `**📦 Total aprovado:** ${total.toLocaleString('pt-BR')}\n` +
      `**✅ Registros:** ${entradas}${linhaRemovidos}\n` +
      `**📅 Período:** ${periodoTexto}\n\n` +
      `-# Atualizado em <t:${Math.floor(agora / 1000)}:F>`,
    ));

  // Remove relatório anterior do mesmo membro
  const key      = `${interaction.guild.id}_${usuario.id}`;
  const anterior = relatoriosMsgId.get(key);
  if (anterior) {
    try {
      const canal = await interaction.guild.channels.fetch(anterior.channelId).catch(() => null);
      if (canal) {
        const msgAnterior = await canal.messages.fetch(anterior.messageId).catch(() => null);
        if (msgAnterior) await msgAnterior.delete();
      }
    } catch {}
  }

  await interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
  const msg = await interaction.fetchReply();
  relatoriosMsgId.set(key, { channelId: interaction.channelId, messageId: msg.id });
}

// Localiza a sala de farm de um membro pela permissão no canal
async function encontrarSalaFarm(guild, userId) {
  const categorias = [config.CATEGORIA_FARM, config.CATEGORIA_FARM_ADM, config.CATEGORIA_FARM_ELITE].filter(Boolean);
  if (categorias.length === 0) return null;
  await guild.channels.fetch();
  for (const canal of guild.channels.cache.values()) {
    if (!categorias.includes(canal.parentId)) continue;
    const ow = canal.permissionOverwrites.cache.get(userId);
    if (ow && ow.allow.has(PermissionFlagsBits.ViewChannel)) return canal;
  }
  return null;
}

// ── /remover-farm ─────────────────────────────────────────────────────────────

async function handleRemoverFarm(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const usuario    = interaction.options.getUser('usuario');
  const quantidade = interaction.options.getInteger('quantidade');
  const motivo     = interaction.options.getString('motivo');

  const totalAtual = [...farms.values()]
    .filter((e) => e.userId === usuario.id && e.guildId === interaction.guild.id && e.status === 'aprovado')
    .reduce((sum, e) => sum + e.quantidade, 0);

  if (totalAtual <= 0) {
    await interaction.editReply({ content: `❌ <@${usuario.id}> não tem farm aprovado registrado.` });
    return;
  }

  const removeId = `farm_rem_${Date.now().toString(36)}`;
  farms.set(removeId, {
    userId:      usuario.id,
    quantidade,
    motivo,
    removidoPor: interaction.user.id,
    status:      'removido',
    guildId:     interaction.guild.id,
    timestamp:   Date.now(),
  });
  salvarDados();

  // Aviso na sala de farm do membro (se existir)
  try {
    const sala = await encontrarSalaFarm(interaction.guild, usuario.id);
    if (sala) {
      await sala.send({ components: [
        new ContainerBuilder()
          .setAccentColor(0x3498DB)
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            `## ⚠️ Farm Removido\n\n` +
            `<@${usuario.id}>, uma quantidade do seu farm foi removida.\n\n` +
            `**📦 Quantidade removida:** ${quantidade.toLocaleString('pt-BR')}\n` +
            `**📋 Motivo:** ${motivo}\n` +
            `**🔧 Removido por:** <@${interaction.user.id}>\n\n` +
            `-# <t:${Math.floor(Date.now() / 1000)}:F>`,
          )),
      ], flags: MessageFlags.IsComponentsV2 });
    }
  } catch {}

  await interaction.editReply({ content: `✅ **${quantidade}** de farm removido de <@${usuario.id}>.` });
}

module.exports = {
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
};
