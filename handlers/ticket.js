const {
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  UserSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  AttachmentBuilder,
  ChannelType,
  PermissionFlagsBits,
} = require('discord.js');
const config = require('../config');

const TIPOS = [
  { value: 'denuncia', label: 'Denúncia',  emoji: '🚨', descricao: 'Reportar um jogador ou situação' },
  { value: 'bug',      label: 'Bug',       emoji: '🐛', descricao: 'Reportar um problema técnico'   },
  { value: 'farm',     label: 'Farm',      emoji: '🌾', descricao: 'Registro de farm'               },
  { value: 'suporte',  label: 'Suporte',   emoji: '🎫', descricao: 'Ajuda geral ou dúvidas'         },
];

function parsearNick(member) {
  const nick = member.nickname || member.user.username;
  const partes = nick.split(' | ');
  if (partes.length >= 2) return `${partes[0]} ${partes.slice(1).join(' ')}`;
  return nick;
}

function temPermStaff(member) {
  return member.permissions.has(PermissionFlagsBits.ManageChannels);
}

async function fetchTodasMensagens(channel) {
  let todas = [];
  let lastId = null;

  while (true) {
    const opts = { limit: 100 };
    if (lastId) opts.before = lastId;
    const batch = await channel.messages.fetch(opts);
    if (batch.size === 0) break;
    todas = [...batch.values(), ...todas];
    lastId = batch.last().id;
    if (batch.size < 100) break;
  }

  return todas.sort((a, b) => a.createdTimestamp - b.createdTimestamp);
}

function gerarHTML(channel, mensagens) {
  const esc = (s) => s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');

  const linhas = mensagens.map((m) => {
    const hora     = m.createdAt.toLocaleString('pt-BR');
    const conteudo = esc(m.content || '');
    const cor      = m.author.bot ? '#5865f2' : '#ffffff';
    const anexos   = [...m.attachments.values()]
      .map((a) => `<div class="att">📎 <a href="${a.url}">${esc(a.name)}</a></div>`)
      .join('');
    return `<div class="msg">
      <div class="meta"><span class="autor" style="color:${cor}">${esc(m.author.username)}</span><span class="ts">${hora}</span></div>
      ${conteudo ? `<div class="txt">${conteudo}</div>` : ''}${anexos}
    </div>`;
  }).join('\n');

  return `<!DOCTYPE html><html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Ticket: ${esc(channel.name)}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',Arial,sans-serif;background:#36393f;color:#dcddde;padding:24px}
  .header{background:#2f3136;padding:20px;border-radius:8px;margin-bottom:20px;border-left:4px solid #5865f2}
  .header h1{color:#fff;font-size:1.3em;margin-bottom:4px}
  .header p{color:#72767d;font-size:.85em}
  .msg{padding:10px 0;border-bottom:1px solid #40444b}
  .msg:last-child{border-bottom:none}
  .meta{margin-bottom:4px}
  .autor{font-weight:700;font-size:.95em}
  .ts{color:#72767d;font-size:.78em;margin-left:8px}
  .txt{font-size:.95em;line-height:1.5;margin-top:2px}
  .att{margin-top:4px;font-size:.88em}
  a{color:#00aff4}
</style>
</head>
<body>
<div class="header">
  <h1>🎫 Ticket: ${esc(channel.name)}</h1>
  <p>Salvo em: ${new Date().toLocaleString('pt-BR')} · ${mensagens.length} mensagens</p>
</div>
${linhas}
</body></html>`;
}

function botoesStaff(userId) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`ticket_notif_${userId}`).setLabel('📢 Notificar Membro').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`ticket_add_${userId}`).setLabel('➕ Adicionar Membro').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`ticket_fechar_${userId}`).setLabel('🔒 Fechar Sala').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId(`ticket_salvar_${userId}`).setLabel('💾 Salvar e Fechar').setStyle(ButtonStyle.Secondary),
    ),
  ];
}

async function handleTicketChannel(client, guild) {
  try {
    const channel = await guild.channels.fetch(config.CANAL_TICKET_BTN);
    if (!channel) return;

    const mensagens = await channel.messages.fetch({ limit: 50 });
    const jaExiste  = mensagens.some(
      (m) => m.author.id === client.user.id && m.embeds.length > 0 && m.components.length > 0
        && m.embeds[0]?.title?.includes('Ticket'),
    );

    if (jaExiste) {
      console.log(`[${new Date().toISOString()}] Mensagem de ticket já existe — nenhuma ação necessária.`);
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle('SUPORTE — CRX')
      .setDescription(
        'Precisa de ajuda? Abra um ticket clicando no botão abaixo.\n\n' +
        '**1.** Clique em **Abrir Ticket**\n' +
        '**2.** Selecione o tipo de atendimento\n' +
        '**3.** Descreva sua solicitação\n' +
        '**4.** Aguarde um membro da staff\n\n' +
        TIPOS.map((t) => `${t.emoji} **${t.label}** — ${t.descricao}`).join('\n'),
      )
      .setColor(0xFF0000)
      .setImage('https://cdn.discordapp.com/attachments/1497039765118255282/1497069523269058651/Logo_CRX_com_brilho_metalico_e_vermelho.jpg?ex=69ee2864&is=69ecd6e4&hm=27a99f4e3c95b941f73a2c4b924fd805b34d59519b976a2445c4d875f5b6c5fc&')
      .setFooter({ text: 'CRX • Suporte' });

    const botao = new ButtonBuilder()
      .setCustomId('ticket_abrir')
      .setLabel('🎫 Abrir Ticket')
      .setStyle(ButtonStyle.Primary);

    await channel.send({ embeds: [embed], components: [new ActionRowBuilder().addComponents(botao)] });
    console.log(`[${new Date().toISOString()}] Mensagem de ticket enviada em: ${guild.name}`);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Erro ao enviar mensagem de ticket:`, err);
  }
}

async function handleTicketBotao(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const select = new StringSelectMenuBuilder()
    .setCustomId('ticket_tipo_select')
    .setPlaceholder('Selecione o tipo de ticket...')
    .addOptions(
      TIPOS.map((t) =>
        new StringSelectMenuOptionBuilder()
          .setValue(t.value)
          .setLabel(t.label)
          .setEmoji(t.emoji)
          .setDescription(t.descricao),
      ),
    );

  await interaction.editReply({
    embeds: [new EmbedBuilder().setTitle('🎫 Abrir Ticket').setDescription('Selecione o tipo de ticket que deseja abrir.').setColor(0x5865F2)],
    components: [new ActionRowBuilder().addComponents(select)],
  });
}

async function handleTicketSelect(interaction) {
  await interaction.deferUpdate();

  const tipo      = TIPOS.find((t) => t.value === interaction.values[0]);
  const { member, guild } = interaction;
  const nomeCanal = `${parsearNick(member)} ${tipo.label}`;

  const permissoes = [
    { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
    { id: interaction.client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels] },
    { id: member.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
  ];

  const options = { name: nomeCanal, type: ChannelType.GuildText, permissionOverwrites: permissoes };
  if (config.CATEGORIA_TICKET) options.parent = config.CATEGORIA_TICKET;

  try {
    const canal = await guild.channels.create(options);

    const embedBemVindo = new EmbedBuilder()
      .setTitle(`${tipo.emoji} Ticket — ${tipo.label}`)
      .setDescription(
        `Olá ${member}! Seu ticket de **${tipo.label}** foi aberto.\n\n` +
        `Descreva sua solicitação com o máximo de detalhes possível.\n` +
        `Um membro da staff irá atendê-lo em breve.`,
      )
      .setColor(0x5865F2)
      .setTimestamp();

    await canal.send({ embeds: [embedBemVindo], components: botoesStaff(member.id) });

    await interaction.editReply({ content: `✅ Ticket aberto! ${canal}`, embeds: [], components: [] });
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Erro ao criar ticket:`, err);
    await interaction.editReply({ content: '❌ Erro ao criar o ticket. Verifique se o bot tem permissão de **Gerenciar Canais**.', embeds: [], components: [] });
  }
}

async function handleTicketNotifBtn(interaction, userId) {
  if (!temPermStaff(interaction.member)) {
    await interaction.reply({ content: '❌ Sem permissão para notificar membros.', ephemeral: true });
    return;
  }

  const modal = new ModalBuilder()
    .setCustomId(`modal_ticket_notif_${userId}`)
    .setTitle('Notificar Membro');

  const campo = new TextInputBuilder()
    .setCustomId('notif_mensagem')
    .setLabel('Mensagem para o membro')
    .setPlaceholder('Ex: Seu ticket foi recebido e está sendo analisado.')
    .setStyle(TextInputStyle.Paragraph)
    .setMaxLength(1000)
    .setRequired(true);

  modal.addComponents(new ActionRowBuilder().addComponents(campo));
  await interaction.showModal(modal);
}

async function handleTicketNotifModal(interaction, userId) {
  await interaction.deferReply({ ephemeral: true });

  const mensagem = interaction.fields.getTextInputValue('notif_mensagem');

  try {
    const membro = await interaction.guild.members.fetch(userId);
    await membro.send(
      `📢 **Mensagem da Staff — Ticket \`${interaction.channel.name}\`:**\n\n${mensagem}`,
    );
    await interaction.editReply({ content: `✅ Mensagem enviada para <@${userId}> via DM.` });
  } catch {
    await interaction.editReply({ content: '❌ Não foi possível enviar a DM. O membro pode ter as DMs fechadas.' });
  }
}

async function handleTicketAddBtn(interaction, userId) {
  if (!temPermStaff(interaction.member)) {
    await interaction.reply({ content: '❌ Sem permissão para adicionar membros.', ephemeral: true });
    return;
  }

  const select = new UserSelectMenuBuilder()
    .setCustomId(`ticket_add_select_${userId}`)
    .setPlaceholder('Selecione o membro para adicionar...')
    .setMinValues(1)
    .setMaxValues(1);

  await interaction.reply({
    content: '➕ Selecione o membro que deseja adicionar ao ticket:',
    components: [new ActionRowBuilder().addComponents(select)],
    ephemeral: true,
  });
}

async function handleTicketAddSelect(interaction, userId) {
  await interaction.deferUpdate();

  const membroId = interaction.values[0];

  try {
    await interaction.channel.permissionOverwrites.create(membroId, {
      ViewChannel: true,
      SendMessages: true,
      ReadMessageHistory: true,
    });

    await interaction.channel.send(`✅ <@${membroId}> foi adicionado ao ticket por ${interaction.user}.`);
    await interaction.editReply({ content: `✅ <@${membroId}> adicionado!`, components: [] });
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Erro ao adicionar membro ao ticket:`, err);
    await interaction.editReply({ content: '❌ Erro ao adicionar o membro.', components: [] });
  }
}

async function handleTicketFechar(interaction, userId) {
  if (!temPermStaff(interaction.member)) {
    await interaction.reply({ content: '❌ Sem permissão para fechar tickets.', ephemeral: true });
    return;
  }

  await interaction.reply({
    content: `🔒 Ticket fechado por ${interaction.user}. O canal será deletado em **5 segundos**...`,
  });

  try {
    const mensagens = await fetchTodasMensagens(interaction.channel);
    const html      = gerarHTML(interaction.channel, mensagens);
    const buffer    = Buffer.from(html, 'utf-8');
    const arquivo   = new AttachmentBuilder(buffer, { name: `${interaction.channel.name}.html` });

    const criador = await interaction.guild.members.fetch(userId).catch(() => null);
    if (criador) {
      await criador.send({
        content: `🔒 Seu ticket **\`${interaction.channel.name}\`** foi fechado por **${interaction.user.tag}**.\nSegue o transcript:`,
        files: [arquivo],
      }).catch(() => {});
    }
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Erro ao enviar transcript por DM:`, err);
  }

  setTimeout(async () => {
    try { await interaction.channel.delete(); } catch {}
  }, 5000);
}

async function handleTicketSalvar(interaction, userId) {
  if (!temPermStaff(interaction.member)) {
    await interaction.reply({ content: '❌ Sem permissão para salvar tickets.', ephemeral: true });
    return;
  }

  await interaction.deferReply();

  try {
    const mensagens = await fetchTodasMensagens(interaction.channel);
    const html      = gerarHTML(interaction.channel, mensagens);
    const buffer    = Buffer.from(html, 'utf-8');
    const arquivo   = new AttachmentBuilder(buffer, { name: `${interaction.channel.name}.html` });

    await interaction.editReply({
      content: `💾 Transcript salvo por ${interaction.user}! O canal será fechado em **10 minutos**.`,
      files: [arquivo],
    });

    const criador = await interaction.guild.members.fetch(userId).catch(() => null);
    if (criador) {
      const arquivoDM = new AttachmentBuilder(Buffer.from(html, 'utf-8'), { name: `${interaction.channel.name}.html` });
      await criador.send({
        content: `💾 Seu ticket **\`${interaction.channel.name}\`** foi salvo e fechado por **${interaction.user.tag}**.\nSegue o transcript:`,
        files: [arquivoDM],
      }).catch(() => {});
    }

    setTimeout(async () => {
      try { await interaction.channel.delete(); } catch {}
    }, 10 * 60 * 1000);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Erro ao salvar transcript:`, err);
    await interaction.editReply({ content: '❌ Erro ao gerar o transcript.' });
  }
}

module.exports = {
  handleTicketChannel,
  handleTicketBotao,
  handleTicketSelect,
  handleTicketNotifBtn,
  handleTicketNotifModal,
  handleTicketAddBtn,
  handleTicketAddSelect,
  handleTicketFechar,
  handleTicketSalvar,
};
