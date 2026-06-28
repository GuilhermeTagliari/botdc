const {
  ButtonBuilder, ButtonStyle, ActionRowBuilder,
  ModalBuilder, TextInputBuilder, TextInputStyle,
  UserSelectMenuBuilder,
  ContainerBuilder, TextDisplayBuilder, SeparatorBuilder,
  MediaGalleryBuilder, MediaGalleryItemBuilder,
  MessageFlags,
} = require('discord.js');
const config = require('../config');

// userId (registrador) → { solicitanteId: string|null, autorizadoId: string|null }
const pending = new Map();

async function handlePdChannel(client, guild) {
  if (!config.CANAL_PD_BTN) return;
  const channel = await guild.channels.fetch(config.CANAL_PD_BTN).catch(() => null);
  if (!channel) return;

  const container = new ContainerBuilder()
    .setAccentColor(config.PD_COR ?? 0xED4245)
    .addMediaGalleryComponents(
      new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(config.getImg('PD'))),
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`# ${config.PD_TITULO ?? 'PEDIDO DE DESLIGAMENTO'}\n\n${config.PD_DESC ?? 'Registre um pedido de desligamento clicando no botão abaixo.'}`),
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addActionRowComponents(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('pd_registrar').setLabel(config.PD_BTN ?? '📋 Registrar PD').setStyle(ButtonStyle.Danger),
      ),
    );

  const mensagens = await channel.messages.fetch({ limit: 50 });
  const existente = mensagens.find((m) => m.author.id === client.user.id && m.flags.has(MessageFlags.IsComponentsV2));
  if (existente) {
    await existente.edit({ components: [container], flags: MessageFlags.IsComponentsV2 });
  } else {
    await channel.send({ components: [container], flags: MessageFlags.IsComponentsV2 });
  }
}

function buildSelecaoPd(userId) {
  const p      = pending.get(userId) ?? {};
  const pronto = !!p.autorizadoId;

  const linhas = [
    `**📋 Registrar PD**\n`,
    `👤 **Solicitante:** ${p.solicitanteId ? `<@${p.solicitanteId}>` : '`opcional — não selecionado`'}`,
    `✅ **Autorizado por:** ${p.autorizadoId ? `<@${p.autorizadoId}>` : '`obrigatório — não selecionado`'}`,
  ].join('\n');

  return {
    content: linhas,
    components: [
      new ActionRowBuilder().addComponents(
        new UserSelectMenuBuilder()
          .setCustomId('pd_sel_solicitante')
          .setPlaceholder('1. Membro que solicitou (opcional)'),
      ),
      new ActionRowBuilder().addComponents(
        new UserSelectMenuBuilder()
          .setCustomId('pd_sel_autorizado')
          .setPlaceholder('2. Quem autorizou o PD (obrigatório)'),
      ),
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('pd_confirm')
          .setLabel('✅ Confirmar e preencher detalhes')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(!pronto),
      ),
    ],
    ephemeral: true,
  };
}

async function handlePdBotao(interaction) {
  pending.set(interaction.user.id, { solicitanteId: null, autorizadoId: null });
  await interaction.reply(buildSelecaoPd(interaction.user.id));
}

async function handlePdSelSolicitante(interaction) {
  const p = pending.get(interaction.user.id) ?? {};
  p.solicitanteId = interaction.values[0];
  pending.set(interaction.user.id, p);
  await interaction.update(buildSelecaoPd(interaction.user.id));
}

async function handlePdSelAutorizado(interaction) {
  const p = pending.get(interaction.user.id) ?? {};
  p.autorizadoId = interaction.values[0];
  pending.set(interaction.user.id, p);
  await interaction.update(buildSelecaoPd(interaction.user.id));
}

async function handlePdConfirm(interaction) {
  const p = pending.get(interaction.user.id);
  if (!p?.autorizadoId) {
    await interaction.reply({ content: '❌ Selecione quem autorizou o PD antes de confirmar.', ephemeral: true });
    return;
  }

  const modal = new ModalBuilder().setCustomId('modal_pd').setTitle('Registrar PD');
  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('pd_id')
        .setLabel('ID no jogo do membro')
        .setPlaceholder('Ex: 1234')
        .setStyle(TextInputStyle.Short)
        .setMaxLength(20)
        .setRequired(true),
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('pd_motivo')
        .setLabel('Motivo do PD')
        .setPlaceholder('Descreva o motivo')
        .setStyle(TextInputStyle.Paragraph)
        .setMaxLength(500)
        .setRequired(true),
    ),
  );
  await interaction.showModal(modal);
}

async function handleModalPd(interaction) {
  await interaction.deferReply({ ephemeral: true });
  const id     = interaction.fields.getTextInputValue('pd_id').trim();
  const motivo = interaction.fields.getTextInputValue('pd_motivo').trim();

  const p = pending.get(interaction.user.id);
  pending.delete(interaction.user.id);

  if (!config.CANAL_PD_LOG) {
    await interaction.editReply({ content: '❌ Canal de log de PD não configurado. Use /configurar.' });
    return;
  }

  const membroLinha = p?.solicitanteId ? `\n👤 **Solicitante:** <@${p.solicitanteId}>` : '';
  const autorizadoLinha = p?.autorizadoId ? `<@${p.autorizadoId}>` : '`não informado`';

  const text =
    `## 📋  Pedido de Desligamento\n\n` +
    `🪪 **ID no jogo:** \`${id}\`` +
    membroLinha + `\n` +
    `✅ **Autorizado por:** ${autorizadoLinha}\n` +
    `📋 **Motivo:** ${motivo}\n\n` +
    `📝 Registrado por <@${interaction.user.id}>  ·  <t:${Math.floor(Date.now() / 1000)}:f>`;

  const container = new ContainerBuilder()
    .setAccentColor(config.PD_COR ?? 0xED4245)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(text));

  try {
    const canalLog = await interaction.guild.channels.fetch(config.CANAL_PD_LOG);
    await canalLog.send({ components: [container], flags: MessageFlags.IsComponentsV2 });
  } catch (err) {
    console.error(`[pd] Erro ao enviar log:`, err.message);
    await interaction.editReply({ content: '❌ Erro ao enviar para o canal de log.' });
    return;
  }
  await interaction.editReply({ content: '✅ PD registrado com sucesso!' });
}

module.exports = { handlePdChannel, handlePdBotao, handlePdSelSolicitante, handlePdSelAutorizado, handlePdConfirm, handleModalPd };
