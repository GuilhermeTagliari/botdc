const {
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  StringSelectMenuBuilder,
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
const { formatarValorBR } = require('../utils/formato');

// reqId → { memberId, memberTag, fac, produto, quantidade, valor, parceria }
const pendingVendas = new Map();

function parsearNick(member) {
  const nick = member.nickname || member.user.username;
  const partes = nick.split(' | ');
  return partes.length >= 2 ? `${partes[0]} ${partes.slice(1).join(' ')}` : nick;
}

function buildVendaModal(produtoPrefill = '') {
  const modal = new ModalBuilder().setCustomId('modal_venda').setTitle(txt('venda.titulo', 'Registrar Venda'));
  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('venda_fac')
        .setLabel(txt('venda.fac', 'Nome da facção'))
        .setPlaceholder('Ex: Los Santos Cartel')
        .setStyle(TextInputStyle.Short)
        .setMaxLength(60)
        .setRequired(true),
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('venda_produto')
        .setLabel(txt('venda.produto', 'O que vendeu'))
        .setPlaceholder('Ex: Cocaína, Armas, Lança...')
        .setStyle(TextInputStyle.Short)
        .setMaxLength(100)
        .setRequired(true)
        .setValue(produtoPrefill),
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('venda_quantidade')
        .setLabel(txt('venda.qtd', 'Quantidade'))
        .setPlaceholder('Ex: 5 unidades, 10 kg...')
        .setStyle(TextInputStyle.Short)
        .setMaxLength(50)
        .setRequired(true),
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('venda_valor')
        .setLabel(txt('venda.valor', 'Valor da venda'))
        .setPlaceholder('Ex: 50.000')
        .setStyle(TextInputStyle.Short)
        .setMaxLength(20)
        .setRequired(true),
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('venda_parceria')
        .setLabel(txt('venda.parceria', 'Foi na parceria? (Sim / Não)'))
        .setPlaceholder('Sim ou Não')
        .setStyle(TextInputStyle.Short)
        .setMaxLength(10)
        .setRequired(true),
    ),
  );
  return modal;
}

// ─── Setup do canal ────────────────────────────────────────────────────────────

async function handleVendaChannel(client, guild) {
  try {
    const channel = await guild.channels.fetch(config.CANAL_VENDA_BTN);
    if (!channel) return;

    const mensagens = await channel.messages.fetch({ limit: 50 });
    const jaExiste = mensagens.some(
      (m) => m.author.id === client.user.id && m.flags.has(MessageFlags.IsComponentsV2),
    );
    if (jaExiste) return;

    const container = new ContainerBuilder()
      .setAccentColor(config.VENDA_COR ?? 0xFF0000)
      .addMediaGalleryComponents(
        new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(config.getImg('VENDA'))),
      )
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`# ${config.VENDA_TITULO}\n\n${config.VENDA_DESC}`),
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

// ─── Botão: abrir select ou modal diretamente ──────────────────────────────────

async function handleVendaBotao(interaction) {
  const produtos = config.PRODUTOS_VENDA || [];

  if (produtos.length > 0) {
    const options = produtos.slice(0, 24).map((p) => ({ label: p, value: p }));
    options.push({ label: '✏️ Digitar manualmente', value: '__manual__' });

    const select = new StringSelectMenuBuilder()
      .setCustomId('venda_sel_produto')
      .setPlaceholder('Selecione o produto vendido...')
      .addOptions(options);

    await interaction.reply({
      components: [new ActionRowBuilder().addComponents(select)],
      ephemeral: true,
    });
  } else {
    await interaction.showModal(buildVendaModal());
  }
}

// ─── Select de produto → abre modal ───────────────────────────────────────────

async function handleVendaSelectProduto(interaction) {
  const valor = interaction.values[0];
  await interaction.showModal(buildVendaModal(valor === '__manual__' ? '' : valor));
}

// ─── Modal submetido → mostra prévia ─────────────────────────────────────────

async function handleModalVenda(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const { member } = interaction;
  const fac        = interaction.fields.getTextInputValue('venda_fac');
  const produto    = interaction.fields.getTextInputValue('venda_produto');
  const quantidade = interaction.fields.getTextInputValue('venda_quantidade');
  const valor      = interaction.fields.getTextInputValue('venda_valor');
  const parceria   = interaction.fields.getTextInputValue('venda_parceria');

  const reqId = `${member.id}_${Date.now().toString(36)}`;
  pendingVendas.set(reqId, {
    memberId: member.id,
    memberTag: parsearNick(member),
    fac, produto, quantidade, valor, parceria,
  });
  setTimeout(() => pendingVendas.delete(reqId), 10 * 60 * 1000);

  const preview =
    `## 💰  Prévia — Registro de Venda\n\n` +
    `**Vendedor:** ${member}  ·  \`${parsearNick(member)}\`\n\n` +
    `🏢 **Facção:** \`${fac}\`\n` +
    `📦 **Produto:** \`${produto}\`\n` +
    `🔢 **Quantidade:** \`${quantidade}\`\n` +
    `🤝 **Parceria:** \`${parceria}\`\n` +
    `💵 **Valor:** \`${formatarValorBR(valor)}\`\n\n` +
    `-# Confira os dados e confirme para registrar`;

  const container = new ContainerBuilder()
    .setAccentColor(0xFEE75C)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(preview))
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addActionRowComponents(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`venda_confirmar_${reqId}`).setLabel(txt('venda.btn_confirmar', '✅ Confirmar')).setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`venda_cancelar_${reqId}`).setLabel(txt('venda.btn_cancelar', '❌ Cancelar')).setStyle(ButtonStyle.Danger),
      ),
    );

  await interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
}

// ─── Confirmar ────────────────────────────────────────────────────────────────

async function handleVendaConfirmar(interaction, reqId) {
  const pending = pendingVendas.get(reqId);
  if (!pending) {
    await interaction.reply({ content: '⚠️ Essa confirmação expirou. Use o botão novamente.', ephemeral: true });
    return;
  }
  pendingVendas.delete(reqId);
  await interaction.deferUpdate();

  try {
    const canalLog  = await interaction.guild.channels.fetch(config.CANAL_VENDA_LOG);
    const timestamp = `<t:${Math.floor(Date.now() / 1000)}:f>`;

    const texto =
      `## 💰  Registro de Venda\n\n` +
      `**Vendedor:** <@${pending.memberId}>  ·  \`${pending.memberTag}\`\n\n` +
      `🏢 **Facção:** \`${pending.fac}\`\n` +
      `📦 **Produto:** \`${pending.produto}\`\n` +
      `🔢 **Quantidade:** \`${pending.quantidade}\`\n` +
      `🤝 **Parceria:** \`${pending.parceria}\`\n` +
      `💵 **Valor:** \`${formatarValorBR(pending.valor)}\`\n\n` +
      `📸 **Comprovante:** *Envie a foto abaixo desta mensagem.*\n\n` +
      `-# Registrado em ${timestamp}`;

    const card = new ContainerBuilder()
      .setAccentColor(config.VENDA_COR ?? 0xFF0000)
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(texto));

    const msg = await canalLog.send({ components: [card], flags: MessageFlags.IsComponentsV2 });

    await interaction.editReply({
      components: [
        new ContainerBuilder()
          .setAccentColor(0x57F287)
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            `✅ **Venda registrada!**\n\nEnvie o print do comprovante [aqui](${msg.url}).`,
          )),
      ],
      flags: MessageFlags.IsComponentsV2,
    });
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Erro ao confirmar venda:`, err);
    await interaction.editReply({
      components: [
        new ContainerBuilder()
          .setAccentColor(0xFF0000)
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            `❌ Erro ao registrar a venda: \`${err.message}\``,
          )),
      ],
      flags: MessageFlags.IsComponentsV2,
    });
  }
}

// ─── Cancelar ────────────────────────────────────────────────────────────────

async function handleVendaCancelar(interaction, reqId) {
  pendingVendas.delete(reqId);
  await interaction.update({
    components: [
      new ContainerBuilder()
        .setAccentColor(0x99AAB5)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent('❌ Registro cancelado.')),
    ],
    flags: MessageFlags.IsComponentsV2,
  });
}

module.exports = {
  handleVendaChannel,
  handleVendaBotao,
  handleVendaSelectProduto,
  handleModalVenda,
  handleVendaConfirmar,
  handleVendaCancelar,
};
