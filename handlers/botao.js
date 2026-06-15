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

const IMG = 'https://media.discordapp.net/attachments/1392674632544419963/1392675113262125056/Never_Pure_1920.jpg?ex=69ee0f85&is=69ecbe05&hm=3846f1cabdd4a1b55ad17216f5cc52b41d4f9805ae4a1973687884d3f04d494d&width=1535&height=863&';

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
      .setAccentColor(0x3498DB)
      .addMediaGalleryComponents(
        new MediaGalleryBuilder().addItems(
          new MediaGalleryItemBuilder().setURL(IMG),
        ),
      )
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          '# RECRUTAMENTO Never Pure\n\n' +
          'Quer fazer parte do nosso time? Preencha sua ficha clicando no botão abaixo.\n\n' +
          '**1.** Clique em **Preencher Ficha**\n' +
          '**2.** Preencha seus dados no formulário\n' +
          '**3.** Selecione quem te recrutou\n' +
          '**4.** Aguarde a análise de um recrutador\n\n' +
          '-# Você será notificado via DM sobre a decisão.',
        ),
      )
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
      .addActionRowComponents(
        new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('abrir_ficha').setLabel('📝 Preencher Ficha').setStyle(ButtonStyle.Primary),
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
    .setTitle('Ficha de Recrutamento');

  const campoNome = new TextInputBuilder()
    .setCustomId('campo_nome')
    .setLabel('Nome completo')
    .setPlaceholder('Ex: João Silva')
    .setStyle(TextInputStyle.Short)
    .setMaxLength(60)
    .setRequired(true);

  const campoId = new TextInputBuilder()
    .setCustomId('campo_id')
    .setLabel('ID (somente números)')
    .setPlaceholder('Ex: 12345')
    .setStyle(TextInputStyle.Short)
    .setMaxLength(20)
    .setRequired(true);

  const campoTelefone = new TextInputBuilder()
    .setCustomId('campo_telefone')
    .setLabel('Telefone / WhatsApp')
    .setPlaceholder('Ex: (11) 99999-9999')
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
