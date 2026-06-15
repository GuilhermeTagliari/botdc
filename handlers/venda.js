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
        .setLabel('Valor da venda')
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
        .setLabel('Comprovante — link da imagem (opcional)')
        .setPlaceholder('Cole o link ou deixe em branco e faça upload no canal após registrar')
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
  const fac      = interaction.fields.getTextInputValue('venda_fac');
  const produto  = interaction.fields.getTextInputValue('venda_produto');
  const parceria = interaction.fields.getTextInputValue('venda_parceria');
  const valor    = interaction.fields.getTextInputValue('venda_valor');
  const foto     = interaction.fields.getTextInputValue('venda_foto').trim();

  try {
    const canalLog  = await guild.channels.fetch(config.CANAL_VENDA_LOG);
    const timestamp = `<t:${Math.floor(Date.now() / 1000)}:f>`;
    const semFoto   = !foto;

    const texto =
      `## 💰  Registro de Venda\n\n` +
      `**Vendedor:** ${member}  ·  \`${parsearNick(member)}\`\n\n` +
      `🏢 **Facção:** \`${fac}\`\n` +
      `📦 **Produto:** \`${produto}\`\n` +
      `🤝 **Parceria:** \`${parceria}\`\n` +
      `💵 **Valor:** \`${formatarValorBR(valor)}\`\n\n` +
      (semFoto ? `📸 **Comprovante:** *Envie a foto abaixo desta mensagem.*\n\n` : '') +
      `-# Registrado em ${timestamp}`;

    const container = new ContainerBuilder().setAccentColor(config.VENDA_COR ?? 0xFF0000);

    if (foto) {
      try {
        container.addMediaGalleryComponents(
          new MediaGalleryBuilder().addItems(
            new MediaGalleryItemBuilder().setURL(foto),
          ),
        );
      } catch {}
    }

    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(texto));

    const msg = await canalLog.send({ components: [container], flags: MessageFlags.IsComponentsV2 });
    await interaction.editReply({
      content: semFoto
        ? `✅ Venda registrada! Envie o print do comprovante [aqui](${msg.url}).`
        : '✅ Venda registrada!',
    });
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Erro ao registrar venda:`, err);
    await interaction.editReply({ content: '❌ Erro ao registrar a venda. Verifique se o canal de log está configurado.' });
  }
}

module.exports = { handleVendaChannel, handleVendaBotao, handleModalVenda };
