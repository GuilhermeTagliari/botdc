const {
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  MessageFlags,
} = require('discord.js');
const config = require('../config');
const { formatarValorBR } = require('../utils/formato');

function parsearNick(member) {
  const nick = member.nickname || member.user.username;
  const partes = nick.split(' | ');
  return partes.length >= 2 ? `${partes[0]} ${partes.slice(1).join(' ')}` : nick;
}

async function handleVendaChannel(client, guild) {
  try {
    const channel = await guild.channels.fetch(config.CANAL_VENDA_BTN);
    if (!channel) return;

    const mensagens = await channel.messages.fetch({ limit: 50 });
    const jaExiste = mensagens.some(
      (m) => m.author.id === client.user.id && m.flags.has(MessageFlags.IsComponentsV2),
    );

    if (jaExiste) {
      console.log(`[${new Date().toISOString()}] Mensagem de venda já existe — nenhuma ação necessária.`);
      return;
    }

    const container = new ContainerBuilder()
      .setAccentColor(config.VENDA_COR ?? 0xFF0000)
      .addMediaGalleryComponents(
        new MediaGalleryBuilder().addItems(
          new MediaGalleryItemBuilder().setURL(config.getImg('VENDA')),
        ),
      )
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# ${config.VENDA_TITULO}\n\n${config.VENDA_DESC}`,
        ),
      )
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
      .addActionRowComponents(
        new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('venda_criar').setLabel(config.VENDA_BTN).setStyle(ButtonStyle.Danger),
        ),
      );

    await channel.send({ components: [container], flags: MessageFlags.IsComponentsV2 });
    console.log(`[${new Date().toISOString()}] Mensagem de venda enviada em: ${guild.name}`);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Erro ao enviar mensagem de venda:`, err);
  }
}

async function handleVendaBotao(interaction) {
  const modal = new ModalBuilder().setCustomId('modal_venda').setTitle('Registrar Venda');

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('venda_fac')
        .setLabel('Nome da facção')
        .setPlaceholder('Ex: Los Santos Cartel')
        .setStyle(TextInputStyle.Short)
        .setMaxLength(60)
        .setRequired(true),
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('venda_produto')
        .setLabel('O que vendeu')
        .setPlaceholder('Ex: Cocaína, Armas...')
        .setStyle(TextInputStyle.Short)
        .setMaxLength(100)
        .setRequired(true),
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('venda_valor')
        .setLabel('Valor da venda ($)')
        .setPlaceholder('Ex: 50.000')
        .setStyle(TextInputStyle.Short)
        .setMaxLength(20)
        .setRequired(true),
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('venda_parceria')
        .setLabel('Foi na parceria? (Sim / Não)')
        .setPlaceholder('Sim ou Não')
        .setStyle(TextInputStyle.Short)
        .setMaxLength(10)
        .setRequired(true),
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('venda_foto')
        .setLabel('Link do comprovante (print/foto)')
        .setPlaceholder('Cole o link da imagem ou deixe em branco para enviar depois')
        .setStyle(TextInputStyle.Short)
        .setMaxLength(500)
        .setRequired(false),
    ),
  );

  await interaction.showModal(modal);
}

async function handleModalVenda(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const { member, guild } = interaction;
  const fac     = interaction.fields.getTextInputValue('venda_fac');
  const produto = interaction.fields.getTextInputValue('venda_produto');
  const parceria = interaction.fields.getTextInputValue('venda_parceria');
  const valor   = interaction.fields.getTextInputValue('venda_valor');
  const foto    = interaction.fields.getTextInputValue('venda_foto').trim();

  try {
    const canalLog = await guild.channels.fetch(config.CANAL_VENDA_LOG);
    const timestamp = `<t:${Math.floor(Date.now() / 1000)}:f>`;
    const semFoto   = !foto;

    const texto =
      `## 💰  Registro de Venda\n\n` +
      `**Vendedor:** ${member}  ·  \`${member.nickname || member.user.username}\`\n\n` +
      `🏢 **Facção:** \`${fac}\`\n` +
      `📦 **Produto:** \`${produto}\`\n` +
      `🤝 **Parceria:** \`${parceria}\`\n` +
      `💵 **Valor:** \`${formatarValorBR(valor)}\`\n\n` +
      (semFoto ? `📸 **Comprovante:** *Envie a foto abaixo desta mensagem.*\n\n` : '') +
      `-# Registrado em ${timestamp}`;

    const container = new ContainerBuilder().setAccentColor(0xFEE75C);

    if (foto) {
      try {
        container.addMediaGalleryComponents(
          new MediaGalleryBuilder().addItems(
            new MediaGalleryItemBuilder().setURL(foto),
          ),
        );
      } catch {}
    }

    container
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(texto))
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
      .addActionRowComponents(
        new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`venda_aprovar_${member.id}`).setLabel('✅ Aprovar').setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId(`venda_recusar_${member.id}`).setLabel('❌ Recusar').setStyle(ButtonStyle.Danger),
        ),
      );

    await canalLog.send({ components: [container], flags: MessageFlags.IsComponentsV2 });
    await interaction.editReply({ content: '✅ Venda registrada! Aguarde a aprovação da staff.' });
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Erro ao registrar venda:`, err);
    await interaction.editReply({ content: '❌ Erro ao registrar a venda. Verifique se o canal de log está configurado.' });
  }
}

function extrairTexto(msg) {
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

async function handleVendaAprovar(interaction, userId) {
  await interaction.deferUpdate();
  const texto = extrairTexto(interaction.message);
  const container = new ContainerBuilder()
    .setAccentColor(0x57F287)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`${texto}\n\n✅ **Aprovado por** <@${interaction.user.id}>`),
    );
  await interaction.message.edit({ components: [container], flags: MessageFlags.IsComponentsV2 });

  try {
    const membro = await interaction.guild.members.fetch(userId);
    await membro.send(`✅ Sua venda foi **aprovada** no servidor **${interaction.guild.name}**!`);
  } catch {}
}

async function handleVendaRecusar(interaction, userId) {
  await interaction.deferUpdate();
  const texto = extrairTexto(interaction.message);
  const container = new ContainerBuilder()
    .setAccentColor(0xED4245)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`${texto}\n\n❌ **Recusado por** <@${interaction.user.id}>`),
    );
  await interaction.message.edit({ components: [container], flags: MessageFlags.IsComponentsV2 });

  try {
    const membro = await interaction.guild.members.fetch(userId);
    await membro.send(`❌ Sua venda foi **recusada** no servidor **${interaction.guild.name}**.`);
  } catch {}
}

module.exports = { handleVendaChannel, handleVendaBotao, handleModalVenda, handleVendaAprovar, handleVendaRecusar };
