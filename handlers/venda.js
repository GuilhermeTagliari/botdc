const {
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
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

const IMG = 'https://cdn.discordapp.com/attachments/1497039765118255282/1497069523269058651/Logo_CRX_com_brilho_metalico_e_vermelho.jpg?ex=69ee2864&is=69ecd6e4&hm=27a99f4e3c95b941f73a2c4b924fd805b34d59519b976a2445c4d875f5b6c5fc&';

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
      .setAccentColor(0xFF0000)
      .addMediaGalleryComponents(
        new MediaGalleryBuilder().addItems(
          new MediaGalleryItemBuilder().setURL(IMG),
        ),
      )
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          '# REGISTRO DE VENDA — CRX\n\n' +
          'Clique no botão abaixo para registrar uma venda.\n\n' +
          '**1.** Clique em **Registrar Venda**\n' +
          '**2.** Preencha os dados no formulário\n' +
          '**3.** Envie a foto como comprovante no canal criado\n\n' +
          '-# Somente você e a staff terão acesso ao canal.',
        ),
      )
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
      .addActionRowComponents(
        new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('venda_criar').setLabel('💰 Registrar Venda').setStyle(ButtonStyle.Danger),
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
        .setCustomId('venda_parceria')
        .setLabel('Foi na parceria? (Sim / Não)')
        .setPlaceholder('Sim ou Não')
        .setStyle(TextInputStyle.Short)
        .setMaxLength(10)
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
  const nomeCanal = parsearNick(member);

  const permissoes = [
    { id: guild.id,                   deny:  [PermissionFlagsBits.ViewChannel] },
    { id: interaction.client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels] },
    { id: member.id,                  allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageMessages] },
  ];

  const options = { name: `venda-${nomeCanal}`, type: ChannelType.GuildText, permissionOverwrites: permissoes };
  if (config.CATEGORIA_VENDA) options.parent = config.CATEGORIA_VENDA;

  try {
    const canal = await guild.channels.create(options);

    const timestamp = `<t:${Math.floor(Date.now() / 1000)}:f>`;
    const container = new ContainerBuilder()
      .setAccentColor(0x57F287)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `## 💰  Registro de Venda\n\n` +
          `Olá ${member}! Sua venda foi registrada abaixo.\n\n` +
          `🏢 **Facção:** \`${fac}\`\n` +
          `📦 **Produto:** \`${produto}\`\n` +
          `🤝 **Parceria:** \`${parceria}\`\n` +
          `💵 **Valor:** \`$${valor}\`\n\n` +
          `📸 **Comprovante:** *Envie a foto abaixo desta mensagem.*\n\n` +
          `-# Registrado por ${member}  ·  ${timestamp}`,
        ),
      );

    await canal.send({ components: [container], flags: MessageFlags.IsComponentsV2 });
    await interaction.editReply({ content: `✅ Venda registrada! ${canal}` });
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Erro ao criar canal de venda:`, err);
    await interaction.editReply({ content: '❌ Erro ao criar o canal. Verifique se o bot tem permissão de **Gerenciar Canais**.' });
  }
}

module.exports = { handleVendaChannel, handleVendaBotao, handleModalVenda };
