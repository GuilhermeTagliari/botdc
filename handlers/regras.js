const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  MessageFlags,
} = require('discord.js');
const fs   = require('fs');
const path = require('path');

const ARQUIVO  = path.join(__dirname, '../data/regras.json');
const pendentes = new Map();

const IMG = 'https://media.discordapp.net/attachments/1392674632544419963/1392675113262125056/Never_Pure_1920.jpg?ex=69ee0f85&is=69ecbe05&hm=3846f1cabdd4a1b55ad17216f5cc52b41d4f9805ae4a1973687884d3f04d494d&width=1535&height=863&';

function lerDados() {
  try { return JSON.parse(fs.readFileSync(ARQUIVO, 'utf8')); } catch { return {}; }
}

function salvarDados(dados) {
  fs.writeFileSync(ARQUIVO, JSON.stringify(dados, null, 2));
}

async function handleRegrasSetupCmd(interaction) {
  const canal = interaction.options.getChannel('canal');
  pendentes.set(interaction.user.id, canal.id);

  const modal = new ModalBuilder()
    .setCustomId('modal_regras')
    .setTitle('Painel de Regras');

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('regras_texto')
        .setLabel('Regras do servidor')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Digite as regras aqui...\nUse **negrito**, *itálico*, etc.')
        .setMaxLength(4000)
        .setRequired(true),
    ),
  );

  await interaction.showModal(modal);
}

async function handleRegrasModal(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const channelId = pendentes.get(interaction.user.id);
  if (!channelId) {
    await interaction.editReply({ content: '❌ Sessão expirada. Use /regras-setup novamente.' });
    return;
  }
  pendentes.delete(interaction.user.id);

  const texto = interaction.fields.getTextInputValue('regras_texto');
  const dados = lerDados();

  const container = new ContainerBuilder()
    .setAccentColor(0x3498DB)
    .addMediaGalleryComponents(
      new MediaGalleryBuilder().addItems(
        new MediaGalleryItemBuilder().setURL(IMG),
      ),
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`## 📜  Regras do Servidor\n\n${texto}`),
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent('-# Never Pure  ·  Leia e respeite as regras'),
    );

  try {
    const canal = await interaction.guild.channels.fetch(channelId);

    if (dados.messageId && dados.channelId === channelId) {
      try {
        const msg = await canal.messages.fetch(dados.messageId);
        await msg.edit({ components: [container], flags: MessageFlags.IsComponentsV2 });
        await interaction.editReply({ content: '✅ Regras atualizadas!' });
        return;
      } catch {}
    }

    const msg = await canal.send({ components: [container], flags: MessageFlags.IsComponentsV2 });
    salvarDados({ messageId: msg.id, channelId: canal.id });
    await interaction.editReply({ content: '✅ Painel de regras enviado!' });
  } catch {
    await interaction.editReply({ content: '❌ Não consegui enviar no canal. Verifique as permissões.' });
  }
}

module.exports = { handleRegrasSetupCmd, handleRegrasModal };
