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
const { temPermissao } = require('../utils/permissao');
const { dmEmbed } = require('../utils/dm');

async function handleArmasChannel(client, guild) {
  try {
    const channel = await guild.channels.fetch(config.CANAL_ARMAS_BTN);
    if (!channel) return;

    const mensagens = await channel.messages.fetch({ limit: 50 });
    const jaExiste = mensagens.some(
      (m) => m.author.id === client.user.id && m.flags.has(MessageFlags.IsComponentsV2),
    );

    if (jaExiste) {
      console.log(`[${new Date().toISOString()}] Mensagem de armas já existe — nenhuma ação necessária.`);
      return;
    }

    const container = new ContainerBuilder()
      .setAccentColor(config.ARMAS_COR ?? 0xFF0000)
      .addMediaGalleryComponents(
        new MediaGalleryBuilder().addItems(
          new MediaGalleryItemBuilder().setURL(config.getImg('ARMAS')),
        ),
      )
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# ${config.ARMAS_TITULO}\n\n${config.ARMAS_DESC}`,
        ),
      )
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
      .addActionRowComponents(
        new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('armas_solicitar').setLabel(config.ARMAS_BTN).setStyle(ButtonStyle.Danger),
        ),
      );

    await channel.send({ components: [container], flags: MessageFlags.IsComponentsV2 });
    console.log(`[${new Date().toISOString()}] Mensagem de armas enviada em: ${guild.name}`);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Erro ao enviar mensagem de armas:`, err);
  }
}

async function handleArmasBotao(interaction) {
  const modal = new ModalBuilder().setCustomId('modal_armas').setTitle('Solicitar Armas');

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('armas_arma')
        .setLabel('Arma solicitada')
        .setPlaceholder('Ex: Pistola, Fuzil, Escopeta...')
        .setStyle(TextInputStyle.Short)
        .setMaxLength(100)
        .setRequired(true),
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('armas_muni')
        .setLabel('Quantidade de munição')
        .setPlaceholder('Ex: 200')
        .setStyle(TextInputStyle.Short)
        .setMaxLength(10)
        .setRequired(true),
    ),
  );

  await interaction.showModal(modal);
}

async function handleModalArmas(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const { member } = interaction;
  const arma = interaction.fields.getTextInputValue('armas_arma');
  const muni = interaction.fields.getTextInputValue('armas_muni');

  try {
    const canalLog = await interaction.guild.channels.fetch(config.CANAL_ARMAS_LOG);
    const timestamp = `<t:${Math.floor(Date.now() / 1000)}:f>`;

    const container = new ContainerBuilder()
      .setAccentColor(0xFEE75C)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `## 🔫  Solicitação de Armas\n\n` +
          `**Solicitante:** ${member}  ·  \`${member.nickname || member.user.username}\`\n\n` +
          `🔫 **Arma:** \`${arma}\`\n` +
          `🔶 **Munição:** \`${muni} balas\`\n\n` +
          `-# Solicitado em ${timestamp}`,
        ),
      )
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
      .addActionRowComponents(
        new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`armas_aprovar_${member.id}`).setLabel('✅ Aprovar').setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId(`armas_recusar_${member.id}`).setLabel('❌ Recusar').setStyle(ButtonStyle.Danger),
        ),
      );

    await canalLog.send({ components: [container], flags: MessageFlags.IsComponentsV2 });
    await interaction.editReply({ content: '✅ Solicitação enviada! Aguarde a aprovação da staff.' });
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Erro ao enviar solicitação de armas:`, err);
    await interaction.editReply({ content: '❌ Erro ao enviar a solicitação. Tente novamente mais tarde.' });
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

async function handleArmasAprovar(interaction, userId) {
  if (!temPermissao(interaction.member, config.CARGOS_ARMAS_ADM)) {
    await interaction.reply({ content: '❌ Você não tem permissão para aprovar solicitações de armas.', ephemeral: true });
    return;
  }
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
    await membro.send(dmEmbed('✅ Solicitação Aprovada',
      `Sua solicitação de armas foi **aprovada** no servidor **${interaction.guild.name}**!\n\n-# Aprovado por <@${interaction.user.id}>`,
      0x57F287));
  } catch {}
}

async function handleArmasRecusar(interaction, userId) {
  if (!temPermissao(interaction.member, config.CARGOS_ARMAS_ADM)) {
    await interaction.reply({ content: '❌ Você não tem permissão para recusar solicitações de armas.', ephemeral: true });
    return;
  }
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
    await membro.send(dmEmbed('❌ Solicitação Recusada',
      `Sua solicitação de armas foi **recusada** no servidor **${interaction.guild.name}**.\n\n-# Recusado por <@${interaction.user.id}>`,
      0xED4245));
  } catch {}
}

module.exports = { handleArmasChannel, handleArmasBotao, handleModalArmas, handleArmasAprovar, handleArmasRecusar };
