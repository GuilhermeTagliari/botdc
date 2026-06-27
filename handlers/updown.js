const {
  ButtonBuilder, ButtonStyle, ActionRowBuilder,
  ModalBuilder, TextInputBuilder, TextInputStyle,
  ContainerBuilder, TextDisplayBuilder, SeparatorBuilder,
  MessageFlags,
} = require('discord.js');
const config = require('../config');

async function handleUpDownChannel(client, guild) {
  if (!config.CANAL_UPDOWN_BTN) return;
  const channel = await guild.channels.fetch(config.CANAL_UPDOWN_BTN).catch(() => null);
  if (!channel) return;

  const container = new ContainerBuilder()
    .setAccentColor(config.UPDOWN_COR ?? 0x3498DB)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`# ${config.UPDOWN_TITULO ?? 'UP / REBAIXAMENTO'}\n\n${config.UPDOWN_DESC ?? 'Registre promoções e rebaixamentos clicando nos botões abaixo.'}`),
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addActionRowComponents(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('updown_up').setLabel('⬆️ Registrar Up').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('updown_down').setLabel('⬇️ Registrar Rebaixamento').setStyle(ButtonStyle.Danger),
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

function buildModalUpDown(tipo) {
  const isUp = tipo === 'up';
  const modal = new ModalBuilder()
    .setCustomId(`modal_updown_${tipo}`)
    .setTitle(isUp ? 'Registrar Promoção (Up)' : 'Registrar Rebaixamento');
  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('ud_membro')
        .setLabel('Membro (mencione ou escreva o nome)')
        .setPlaceholder('Ex: @João ou João#1234')
        .setStyle(TextInputStyle.Short)
        .setMaxLength(100)
        .setRequired(true),
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('ud_cargo_antes')
        .setLabel('Cargo anterior')
        .setPlaceholder('Ex: Soldado Teste')
        .setStyle(TextInputStyle.Short)
        .setMaxLength(60)
        .setRequired(true),
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('ud_cargo_novo')
        .setLabel('Novo cargo')
        .setPlaceholder('Ex: Soldado')
        .setStyle(TextInputStyle.Short)
        .setMaxLength(60)
        .setRequired(true),
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('ud_motivo')
        .setLabel('Motivo / Observação')
        .setPlaceholder('Descreva o motivo')
        .setStyle(TextInputStyle.Paragraph)
        .setMaxLength(400)
        .setRequired(true),
    ),
  );
  return modal;
}

async function handleUpBtn(interaction)   { await interaction.showModal(buildModalUpDown('up')); }
async function handleDownBtn(interaction) { await interaction.showModal(buildModalUpDown('down')); }

async function handleModalUpDown(interaction, tipo) {
  await interaction.deferReply({ ephemeral: true });
  const membro     = interaction.fields.getTextInputValue('ud_membro').trim();
  const cargoAntes = interaction.fields.getTextInputValue('ud_cargo_antes').trim();
  const cargoNovo  = interaction.fields.getTextInputValue('ud_cargo_novo').trim();
  const motivo     = interaction.fields.getTextInputValue('ud_motivo').trim();

  const isUp = tipo === 'up';
  const cor  = isUp ? 0x57F287 : 0xED4245;
  const titulo = isUp ? '⬆️  Promoção Registrada' : '⬇️  Rebaixamento Registrado';

  const text =
    `## ${titulo}\n\n` +
    `👤 **Membro:** ${membro}\n` +
    `📌 **Cargo anterior:** ${cargoAntes}\n` +
    `${isUp ? '⬆️' : '⬇️'} **Novo cargo:** ${cargoNovo}\n` +
    `📋 **Motivo:** ${motivo}\n\n` +
    `📝 Registrado por <@${interaction.user.id}>  ·  <t:${Math.floor(Date.now() / 1000)}:f>`;

  const container = new ContainerBuilder()
    .setAccentColor(cor)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(text));

  if (config.CANAL_UPDOWN_LOG) {
    try {
      const canalLog = await interaction.guild.channels.fetch(config.CANAL_UPDOWN_LOG);
      await canalLog.send({ components: [container], flags: MessageFlags.IsComponentsV2 });
    } catch (err) {
      console.error(`[updown] Erro ao enviar log:`, err.message);
    }
  }
  await interaction.editReply({ content: `${isUp ? '⬆️' : '⬇️'} Registro enviado com sucesso!` });
}

module.exports = { handleUpDownChannel, handleUpBtn, handleDownBtn, handleModalUpDown };
