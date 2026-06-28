const {
  ButtonBuilder, ButtonStyle, ActionRowBuilder,
  ModalBuilder, TextInputBuilder, TextInputStyle,
  ContainerBuilder, TextDisplayBuilder, SeparatorBuilder,
  MediaGalleryBuilder, MediaGalleryItemBuilder,
  MessageFlags,
} = require('discord.js');
const config = require('../config');
const { supabase } = require('../supabase');
const { formatarValorBR } = require('../utils/formato');

// Estado em memória: { itens: { [nomeNorm]: { nome, quantidade } }, caixa: 0 }
let estoque = { itens: {}, caixa: 0 };

async function carregarEstoque() {
  const { data, error } = await supabase
    .from('bot_estado')
    .select('valor')
    .eq('chave', 'estoque')
    .single();
  if (error && error.code !== 'PGRST116') {
    console.error('[estoque] Erro ao carregar do Supabase:', error.message);
    return;
  }
  if (data?.valor) {
    estoque = data.valor;
    if (!estoque.itens) estoque.itens = {};
    if (typeof estoque.caixa !== 'number') estoque.caixa = 0;
  }
  console.log(`[estoque] Carregado. Caixa: ${estoque.caixa} | Itens: ${Object.keys(estoque.itens).length}`);
}

function salvarEstoque() {
  supabase
    .from('bot_estado')
    .upsert({ chave: 'estoque', valor: estoque, atualizado_em: new Date().toISOString() }, { onConflict: 'chave' })
    .then(({ error }) => { if (error) console.error('[estoque] Erro ao salvar:', error.message); });
}

async function handleEstoqueChannel(client, guild) {
  if (!config.CANAL_ESTOQUE_BTN) return;
  const channel = await guild.channels.fetch(config.CANAL_ESTOQUE_BTN).catch(() => null);
  if (!channel) return;

  const container = new ContainerBuilder()
    .setAccentColor(config.ESTOQUE_COR ?? 0x57F287)
    .addMediaGalleryComponents(
      new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(config.getImg('ESTOQUE'))),
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`# ${config.ESTOQUE_TITULO ?? 'ESTOQUE'}\n\n${config.ESTOQUE_DESC ?? 'Gerencie o estoque de itens e caixa da facção.'}`),
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addActionRowComponents(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('est_entrada_item').setLabel(config.ESTOQUE_BTN_ENTRADA_ITEM ?? '📦 Entrada Item').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('est_saida_item').setLabel(config.ESTOQUE_BTN_SAIDA_ITEM ?? '📤 Saída Item').setStyle(ButtonStyle.Danger),
      ),
    )
    .addActionRowComponents(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('est_entrada_caixa').setLabel(config.ESTOQUE_BTN_ENTRADA_CAIXA ?? '💰 Entrada Caixa').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('est_saida_caixa').setLabel(config.ESTOQUE_BTN_SAIDA_CAIXA ?? '💸 Saída Caixa').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('est_ver').setLabel(config.ESTOQUE_BTN_VER ?? '📊 Ver Saldo').setStyle(ButtonStyle.Secondary),
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

// ── Botões ────────────────────────────────────────────────────────────────────

async function handleEstoqueEntradaItemBtn(interaction) {
  const modal = new ModalBuilder().setCustomId('modal_est_entrada_item').setTitle('Entrada de Item');
  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('est_nome')
        .setLabel('Nome do item')
        .setPlaceholder('Ex: Cocaína')
        .setStyle(TextInputStyle.Short)
        .setMaxLength(60)
        .setRequired(true),
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('est_quantidade')
        .setLabel('Quantidade')
        .setPlaceholder('Ex: 100')
        .setStyle(TextInputStyle.Short)
        .setMaxLength(10)
        .setRequired(true),
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('est_obs')
        .setLabel('Observação (opcional)')
        .setPlaceholder('Ex: Entrega do João')
        .setStyle(TextInputStyle.Short)
        .setMaxLength(200)
        .setRequired(false),
    ),
  );
  await interaction.showModal(modal);
}

async function handleEstoqueSaidaItemBtn(interaction) {
  const modal = new ModalBuilder().setCustomId('modal_est_saida_item').setTitle('Saída de Item');
  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('est_nome')
        .setLabel('Nome do item')
        .setPlaceholder('Ex: Cocaína')
        .setStyle(TextInputStyle.Short)
        .setMaxLength(60)
        .setRequired(true),
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('est_quantidade')
        .setLabel('Quantidade')
        .setPlaceholder('Ex: 50')
        .setStyle(TextInputStyle.Short)
        .setMaxLength(10)
        .setRequired(true),
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('est_motivo')
        .setLabel('Motivo (opcional)')
        .setPlaceholder('Ex: Distribuição para membros')
        .setStyle(TextInputStyle.Short)
        .setMaxLength(200)
        .setRequired(false),
    ),
  );
  await interaction.showModal(modal);
}

async function handleEstoqueEntradaCaixaBtn(interaction) {
  const modal = new ModalBuilder().setCustomId('modal_est_entrada_caixa').setTitle('Entrada de Caixa');
  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('est_valor')
        .setLabel('Valor')
        .setPlaceholder('Ex: 50000 ou R$ 50.000')
        .setStyle(TextInputStyle.Short)
        .setMaxLength(20)
        .setRequired(true),
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('est_origem')
        .setLabel('Origem (opcional)')
        .setPlaceholder('Ex: Lucro da ação')
        .setStyle(TextInputStyle.Short)
        .setMaxLength(200)
        .setRequired(false),
    ),
  );
  await interaction.showModal(modal);
}

async function handleEstoqueSaidaCaixaBtn(interaction) {
  const modal = new ModalBuilder().setCustomId('modal_est_saida_caixa').setTitle('Saída de Caixa');
  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('est_valor')
        .setLabel('Valor')
        .setPlaceholder('Ex: 10000 ou R$ 10.000')
        .setStyle(TextInputStyle.Short)
        .setMaxLength(20)
        .setRequired(true),
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('est_destino')
        .setLabel('Destino / Motivo (opcional)')
        .setPlaceholder('Ex: Compra de armas')
        .setStyle(TextInputStyle.Short)
        .setMaxLength(200)
        .setRequired(false),
    ),
  );
  await interaction.showModal(modal);
}

async function handleEstoqueVerBtn(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const itensArr = Object.values(estoque.itens);
  const itensTexto = itensArr.length > 0
    ? itensArr.map((i) => `• **${i.nome}:** ${i.quantidade.toLocaleString('pt-BR')}`).join('\n')
    : '_Nenhum item em estoque_';

  const text =
    `## 📊 Saldo do Estoque\n\n` +
    `💰 **Caixa:** ${formatarValorBR(estoque.caixa)}\n\n` +
    `**📦 Itens:**\n${itensTexto}\n\n` +
    `-# Atualizado em <t:${Math.floor(Date.now() / 1000)}:f>`;

  const container = new ContainerBuilder()
    .setAccentColor(config.ESTOQUE_COR ?? 0x57F287)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(text));

  await interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
}

// ── Modais ────────────────────────────────────────────────────────────────────

async function handleModalEstoqueEntradaItem(interaction) {
  await interaction.deferReply({ ephemeral: true });
  const nome = interaction.fields.getTextInputValue('est_nome').trim();
  const qtdRaw = interaction.fields.getTextInputValue('est_quantidade').trim();
  const obs    = interaction.fields.getTextInputValue('est_obs').trim() || null;

  const qtd = parseInt(qtdRaw.replace(/\D/g, ''), 10);
  if (isNaN(qtd) || qtd <= 0) {
    await interaction.editReply({ content: '❌ Quantidade inválida.' });
    return;
  }

  const key = nome.toLowerCase();
  if (!estoque.itens[key]) {
    estoque.itens[key] = { nome, quantidade: 0 };
  }
  estoque.itens[key].quantidade += qtd;
  salvarEstoque();

  const obsLinha = obs ? `\n📝 **Obs:** ${obs}` : '';
  const text =
    `## 📦 Entrada de Item\n\n` +
    `🏷️ **Item:** ${nome}\n` +
    `➕ **Quantidade adicionada:** ${qtd.toLocaleString('pt-BR')}\n` +
    `📊 **Total atual:** ${estoque.itens[key].quantidade.toLocaleString('pt-BR')}` +
    obsLinha + `\n\n` +
    `📝 Registrado por <@${interaction.user.id}>  ·  <t:${Math.floor(Date.now() / 1000)}:f>`;

  await enviarLog(interaction.guild, text, 0x57F287, 'itens');
  await interaction.editReply({ content: `✅ **${qtd}** unidades de **${nome}** adicionadas ao estoque!` });
}

async function handleModalEstoqueSaidaItem(interaction) {
  await interaction.deferReply({ ephemeral: true });
  const nome   = interaction.fields.getTextInputValue('est_nome').trim();
  const qtdRaw = interaction.fields.getTextInputValue('est_quantidade').trim();
  const motivo = interaction.fields.getTextInputValue('est_motivo').trim() || null;

  const qtd = parseInt(qtdRaw.replace(/\D/g, ''), 10);
  if (isNaN(qtd) || qtd <= 0) {
    await interaction.editReply({ content: '❌ Quantidade inválida.' });
    return;
  }

  const key = nome.toLowerCase();
  const atual = estoque.itens[key]?.quantidade ?? 0;
  if (atual <= 0) {
    await interaction.editReply({ content: `❌ **${nome}** não está no estoque.` });
    return;
  }

  estoque.itens[key].quantidade = Math.max(0, atual - qtd);
  if (estoque.itens[key].quantidade === 0) delete estoque.itens[key];
  salvarEstoque();

  const motivoLinha = motivo ? `\n📋 **Motivo:** ${motivo}` : '';
  const novoTotal = estoque.itens[key]?.quantidade ?? 0;
  const text =
    `## 📤 Saída de Item\n\n` +
    `🏷️ **Item:** ${nome}\n` +
    `➖ **Quantidade removida:** ${qtd.toLocaleString('pt-BR')}\n` +
    `📊 **Total atual:** ${novoTotal.toLocaleString('pt-BR')}` +
    motivoLinha + `\n\n` +
    `📝 Registrado por <@${interaction.user.id}>  ·  <t:${Math.floor(Date.now() / 1000)}:f>`;

  await enviarLog(interaction.guild, text, 0xED4245, 'itens');
  await interaction.editReply({ content: `✅ **${qtd}** unidades de **${nome}** removidas do estoque!` });
}

async function handleModalEstoqueEntradaCaixa(interaction) {
  await interaction.deferReply({ ephemeral: true });
  const valorRaw = interaction.fields.getTextInputValue('est_valor').trim();
  const origem   = interaction.fields.getTextInputValue('est_origem').trim() || null;

  const valor = parseInt(valorRaw.replace(/\D/g, ''), 10);
  if (isNaN(valor) || valor <= 0) {
    await interaction.editReply({ content: '❌ Valor inválido.' });
    return;
  }

  estoque.caixa += valor;
  salvarEstoque();

  const origemLinha = origem ? `\n📌 **Origem:** ${origem}` : '';
  const text =
    `## 💰 Entrada de Caixa\n\n` +
    `➕ **Valor adicionado:** ${formatarValorBR(valor)}\n` +
    `💰 **Caixa atual:** ${formatarValorBR(estoque.caixa)}` +
    origemLinha + `\n\n` +
    `📝 Registrado por <@${interaction.user.id}>  ·  <t:${Math.floor(Date.now() / 1000)}:f>`;

  await enviarLog(interaction.guild, text, 0x57F287, 'caixa');
  await interaction.editReply({ content: `✅ **${formatarValorBR(valor)}** adicionados ao caixa!` });
}

async function handleModalEstoqueSaidaCaixa(interaction) {
  await interaction.deferReply({ ephemeral: true });
  const valorRaw = interaction.fields.getTextInputValue('est_valor').trim();
  const destino  = interaction.fields.getTextInputValue('est_destino').trim() || null;

  const valor = parseInt(valorRaw.replace(/\D/g, ''), 10);
  if (isNaN(valor) || valor <= 0) {
    await interaction.editReply({ content: '❌ Valor inválido.' });
    return;
  }

  estoque.caixa = Math.max(0, estoque.caixa - valor);
  salvarEstoque();

  const destinoLinha = destino ? `\n📋 **Destino/Motivo:** ${destino}` : '';
  const text =
    `## 💸 Saída de Caixa\n\n` +
    `➖ **Valor retirado:** ${formatarValorBR(valor)}\n` +
    `💰 **Caixa atual:** ${formatarValorBR(estoque.caixa)}` +
    destinoLinha + `\n\n` +
    `📝 Registrado por <@${interaction.user.id}>  ·  <t:${Math.floor(Date.now() / 1000)}:f>`;

  await enviarLog(interaction.guild, text, 0xED4245, 'caixa');
  await interaction.editReply({ content: `✅ **${formatarValorBR(valor)}** retirados do caixa!` });
}

// ── Log helper ────────────────────────────────────────────────────────────────

async function enviarLog(guild, text, cor, tipo) {
  const canalId = tipo === 'caixa' ? config.CANAL_ESTOQUE_LOG_CAIXA : config.CANAL_ESTOQUE_LOG_ITENS;
  if (!canalId) return;
  try {
    const canal = await guild.channels.fetch(canalId);
    const container = new ContainerBuilder()
      .setAccentColor(cor)
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(text));
    await canal.send({ components: [container], flags: MessageFlags.IsComponentsV2 });
  } catch (err) {
    console.error(`[estoque] Erro ao enviar log:`, err.message);
  }
}

module.exports = {
  carregarEstoque,
  handleEstoqueChannel,
  handleEstoqueEntradaItemBtn,
  handleEstoqueSaidaItemBtn,
  handleEstoqueEntradaCaixaBtn,
  handleEstoqueSaidaCaixaBtn,
  handleEstoqueVerBtn,
  handleModalEstoqueEntradaItem,
  handleModalEstoqueSaidaItem,
  handleModalEstoqueEntradaCaixa,
  handleModalEstoqueSaidaCaixa,
};
