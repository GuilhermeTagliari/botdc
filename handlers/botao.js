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
const { txt } = require('../textos');

async function handleRecrutamentoChannel(client, guild) {
  try {
    const channel = await guild.channels.fetch(config.CANAL_RECRUTAMENTO);
    if (!channel) return;

    const mensagens = await channel.messages.fetch({ limit: 50 });
    const jaExiste = mensagens.some(
      (m) => m.author.id === client.user.id && (
        (m.embeds.length > 0 && m.components.length > 0) ||
        m.flags.has(MessageFlags.IsComponentsV2)
      ),
    );

    if (jaExiste) {
      console.log(`[${new Date().toISOString()}] Mensagem de recrutamento já existe — nenhuma ação necessária.`);
      return;
    }

    const container = new ContainerBuilder()
      .setAccentColor(config.RECRUTAMENTO_COR ?? 0x3498DB)
      .addMediaGalleryComponents(
        new MediaGalleryBuilder().addItems(
          new MediaGalleryItemBuilder().setURL(config.getImg('RECRUTAMENTO')),
        ),
      )
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# ${config.RECRUTAMENTO_TITULO}\n\n${config.RECRUTAMENTO_DESC}`,
        ),
      )
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
      .addActionRowComponents(
        new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('abrir_ficha').setLabel(config.RECRUTAMENTO_BTN).setStyle(ButtonStyle.Primary),
        ),
      );

    await channel.send({ components: [container], flags: MessageFlags.IsComponentsV2 });
    console.log(`[${new Date().toISOString()}] Mensagem de recrutamento enviada em: ${guild.name}`);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Erro ao inicializar canal de recrutamento:`, err);
  }
}

async function handleBotao(interaction) {
  const modal = new ModalBuilder()
    .setCustomId('modal_ficha')
    .setTitle(txt('recrut.titulo', 'Ficha de Recrutamento'));

  const campoNome = new TextInputBuilder()
    .setCustomId('campo_nome')
    .setLabel(txt('recrut.nome', 'Nome completo'))
    .setPlaceholder('Ex: João Silva')
    .setStyle(TextInputStyle.Short)
    .setMaxLength(60)
    .setRequired(true);

  const campoId = new TextInputBuilder()
    .setCustomId('campo_id')
    .setLabel(txt('recrut.id', 'ID (somente números)'))
    .setPlaceholder('Ex: 12345')
    .setStyle(TextInputStyle.Short)
    .setMaxLength(20)
    .setRequired(true);

  const campoTelefone = new TextInputBuilder()
    .setCustomId('campo_telefone')
    .setLabel(txt('recrut.ingame', 'Número in game'))
    .setPlaceholder('Ex: 1234')
    .setStyle(TextInputStyle.Short)
    .setMaxLength(20)
    .setRequired(true);

  modal.addComponents(
    new ActionRowBuilder().addComponents(campoNome),
    new ActionRowBuilder().addComponents(campoId),
    new ActionRowBuilder().addComponents(campoTelefone),
  );

  await interaction.showModal(modal);
}

module.exports = { handleRecrutamentoChannel, handleBotao };
