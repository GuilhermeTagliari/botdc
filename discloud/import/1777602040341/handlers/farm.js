const {
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ChannelType,
  PermissionFlagsBits,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  MessageFlags,
} = require('discord.js');
const config = require('../config');
const { temPermissao } = require('../utils/permissao');

const IMG = 'https://cdn.discordapp.com/attachments/1497039765118255282/1497069523269058651/Logo_CRX_com_brilho_metalico_e_vermelho.jpg?ex=69ee2864&is=69ecd6e4&hm=27a99f4e3c95b941f73a2c4b924fd805b34d59519b976a2445c4d875f5b6c5fc&';

function parsearNick(member) {
  const nick  = member.nickname || member.user.username;
  const partes = nick.split(' | ');
  return partes.length >= 2 ? `${partes[0]} ${partes.slice(1).join(' ')}` : nick;
}

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
      .setAccentColor(0xFF0000)
      .addMediaGalleryComponents(
        new MediaGalleryBuilder().addItems(
          new MediaGalleryItemBuilder().setURL(IMG),
        ),
      )
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          '# SALA DE FARM — CRX\n\n' +
          'Clique no botão abaixo para criar sua sala de farm privada.\n\n' +
          '**1.** Clique em **Criar Sala**\n' +
          '**2.** Uma sala privada será criada com seu nome\n' +
          '**3.** Preencha os dados e envie o comprovante\n\n' +
          '-# Somente você e a staff terão acesso à sua sala.',
        ),
      )
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
      .addActionRowComponents(
        new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('farm_criar').setLabel('🌾 Criar Sala').setStyle(ButtonStyle.Danger),
        ),
      );

    await channel.send({ components: [container], flags: MessageFlags.IsComponentsV2 });
    console.log(`[${new Date().toISOString()}] Mensagem de farm enviada em: ${guild.name}`);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Erro ao enviar mensagem de farm:`, err);
  }
}

async function handleFarmBotao(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const { member, guild } = interaction;
  const nomeCanal = parsearNick(member);

  const permissoes = [
    { id: guild.id,                   deny:  [PermissionFlagsBits.ViewChannel] },
    { id: interaction.client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels] },
    { id: member.id,                  allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageMessages] },
  ];

  const isAdm    = temPermissao(member, config.CARGOS_FARM_ADM);
  const categoria = isAdm && config.CATEGORIA_FARM_ADM ? config.CATEGORIA_FARM_ADM : config.CATEGORIA_FARM;
  const options   = { name: nomeCanal, type: ChannelType.GuildText, permissionOverwrites: permissoes };
  if (categoria) options.parent = categoria;

  try {
    const canal = await guild.channels.create(options);

    const timestamp = `<t:${Math.floor(Date.now() / 1000)}:f>`;
    const container = new ContainerBuilder()
      .setAccentColor(0x57F287)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `## 📋  Registro de Farm\n\n` +
          `Olá ${member}! Preencha os campos abaixo e envie a foto como comprovante.\n\n` +
          `📅 **Data:** \`                    \`\n` +
          `🕐 **Hora:** \`                    \`\n` +
          `📦 **Quantidade:** \`                    \`\n` +
          `👔 **Gerente:** \`Entregue para algum GERENTE? Se sim, qual?\`\n\n` +
          `📸 **Comprovante:** *Envie a foto abaixo desta mensagem.*\n\n` +
          `-# Preencha todos os campos antes de enviar o comprovante  ·  ${timestamp}`,
        ),
      );

    await canal.send({ components: [container], flags: MessageFlags.IsComponentsV2 });
    await interaction.editReply({ content: `✅ Sala criada! ${canal}` });
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Erro ao criar sala de farm:`, err);
    await interaction.editReply({ content: '❌ Erro ao criar a sala. Verifique se o bot tem permissão de **Gerenciar Canais**.' });
  }
}

module.exports = { handleFarmChannel, handleFarmBotao };
