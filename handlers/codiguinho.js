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
  MessageFlags,
} = require('discord.js');
const fs   = require('fs');
const path = require('path');
const config = require('../config');
const { temPermissao } = require('../utils/permissao');

const ARQUIVO = path.join(__dirname, '../data/codiguinhos.json');

// reqId → { userId, nome, quantidade }
const pendingRequests = new Map();

function lerCodigos() {
  try { return JSON.parse(fs.readFileSync(ARQUIVO, 'utf8')); } catch { return []; }
}

function salvarCodigos(lista) {
  fs.writeFileSync(ARQUIVO, JSON.stringify(lista, null, 2));
}

// ─── Setup ────────────────────────────────────────────────────────────────────

async function handleCodiguinhoChannel(client, guild) {
  const channel = await guild.channels.fetch(config.CANAL_CODIGUINHO_BTN);
  if (!channel) return;

  const mensagens = await channel.messages.fetch({ limit: 50 });
  const jaExiste  = mensagens.some(
    (m) => m.author.id === client.user.id && m.flags.has(MessageFlags.IsComponentsV2),
  );
  if (jaExiste) return;

  const container = new ContainerBuilder()
    .setAccentColor(0xFF0000)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        '## 🎟️  Solicitação de Codiguinho\n\n' +
        'Clique no botão abaixo para solicitar um codiguinho.\n\n' +
        '**Como funciona:**\n' +
        '**1.** Clique em **Solicitar Codiguinho**\n' +
        '**2.** Informe seu nome e a quantidade desejada\n' +
        '**3.** Aguarde a aprovação da staff\n' +
        '**4.** Você receberá o(s) codiguinho(s) via DM\n\n' +
        '-# Sujeito à disponibilidade de estoque.',
      ),
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addActionRowComponents(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('cod_solicitar').setLabel('🎟️ Solicitar Codiguinho').setStyle(ButtonStyle.Primary),
      ),
    );

  await channel.send({ components: [container], flags: MessageFlags.IsComponentsV2 });
}

// ─── Usuário clica no botão ───────────────────────────────────────────────────

async function handleCodiguinhoBotao(interaction) {
  const codigos = lerCodigos();
  if (codigos.length === 0) {
    await interaction.reply({ content: '❌ Não há codiguinhos disponíveis no momento.', ephemeral: true });
    return;
  }

  const modal = new ModalBuilder().setCustomId('modal_codiguinho').setTitle('Solicitar Codiguinho 🎟️');
  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('cod_nome')
        .setLabel('Seu nome no jogo')
        .setPlaceholder('Ex: João Silva')
        .setStyle(TextInputStyle.Short)
        .setMaxLength(60)
        .setRequired(true),
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('cod_quantidade')
        .setLabel('Quantidade desejada')
        .setPlaceholder('Ex: 1')
        .setStyle(TextInputStyle.Short)
        .setMaxLength(3)
        .setRequired(true),
    ),
  );
  await interaction.showModal(modal);
}

// ─── Modal do usuário submetido ───────────────────────────────────────────────

async function handleModalCodiguinho(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const nome       = interaction.fields.getTextInputValue('cod_nome').trim();
  const qtdRaw     = interaction.fields.getTextInputValue('cod_quantidade');
  const quantidade = parseInt(qtdRaw, 10);

  if (isNaN(quantidade) || quantidade < 1 || quantidade > 50) {
    await interaction.editReply({ content: '❌ Quantidade inválida. Use um número entre 1 e 50.' });
    return;
  }

  const codigos = lerCodigos();
  if (codigos.length < quantidade) {
    await interaction.editReply({ content: `❌ Estoque insuficiente. Disponível: **${codigos.length}** codiguinho(s).` });
    return;
  }

  if (!config.CANAL_CODIGUINHO_LOG) {
    await interaction.editReply({ content: '❌ Canal de aprovação não configurado.' });
    return;
  }

  const reqId = Date.now().toString(36);
  pendingRequests.set(reqId, { userId: interaction.user.id, nome, quantidade });

  const canalLog = await interaction.guild.channels.fetch(config.CANAL_CODIGUINHO_LOG);

  const container = new ContainerBuilder()
    .setAccentColor(0xFEE75C)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `## 🎟️  Nova Solicitação de Codiguinho\n\n` +
        `👤 **Solicitante:** <@${interaction.user.id}> — \`${nome}\`\n` +
        `🔢 **Quantidade:** **${quantidade}**\n` +
        `📦 **Estoque atual:** **${codigos.length}** disponíveis\n\n` +
        `-# <t:${Math.floor(Date.now() / 1000)}:f>`,
      ),
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addActionRowComponents(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`cod_aprovar_${reqId}`).setLabel('✅ Aprovar').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`cod_recusar_${reqId}`).setLabel('❌ Recusar').setStyle(ButtonStyle.Danger),
      ),
    );

  await canalLog.send({ components: [container], flags: MessageFlags.IsComponentsV2 });
  await interaction.editReply({ content: '✅ Solicitação enviada! Aguarde a aprovação da staff.' });
}

// ─── Aprovar ──────────────────────────────────────────────────────────────────

async function handleAprovar(interaction, reqId) {
  await interaction.deferUpdate();

  if (!temPermissao(interaction.member, config.CARGOS_CODIGUINHO_ADM)) {
    await interaction.followUp({ content: '❌ Você não tem permissão para aprovar.', ephemeral: true });
    return;
  }

  const req = pendingRequests.get(reqId);
  if (!req) {
    await interaction.followUp({ content: '⚠️ Solicitação não encontrada ou já processada.', ephemeral: true });
    return;
  }

  const codigos = lerCodigos();
  if (codigos.length < req.quantidade) {
    await interaction.followUp({ content: `❌ Estoque insuficiente. Disponível: **${codigos.length}**.`, ephemeral: true });
    return;
  }

  // Retira os códigos do estoque
  const enviados = codigos.splice(0, req.quantidade);
  salvarCodigos(codigos);
  pendingRequests.delete(reqId);

  const listaCodigos = enviados.map((c, i) => `\`${i + 1}.\` \`${c}\``).join('\n');

  // Tenta enviar via DM para o usuário
  let enviouDM = false;
  try {
    const membro = await interaction.guild.members.fetch(req.userId);
    await membro.send(
      `## 🎟️  Seus Codiguinhos\n\n` +
      `Olá, **${req.nome}**! Sua solicitação foi aprovada.\n\n` +
      `${listaCodigos}\n\n` +
      `-# Aprovado por <@${interaction.user.id}> · <t:${Math.floor(Date.now() / 1000)}:f>`,
    );
    enviouDM = true;
  } catch {}

  // Atualiza a mensagem de aprovação no canal
  const resultContainer = new ContainerBuilder()
    .setAccentColor(0x57F287)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `## ✅  Solicitação Aprovada\n\n` +
        `👤 **Solicitante:** <@${req.userId}> — \`${req.nome}\`\n` +
        `🔢 **Quantidade:** **${req.quantidade}**\n` +
        `📬 **DM:** ${enviouDM ? '✅ Enviada' : '❌ DM fechada — envie manualmente'}\n` +
        `👮 **Aprovado por:** <@${interaction.user.id}>\n` +
        (!enviouDM ? `\n**Códigos:**\n${listaCodigos}\n` : '') +
        `\n-# <t:${Math.floor(Date.now() / 1000)}:f>`,
      ),
    );

  await interaction.message.edit({ components: [resultContainer], flags: MessageFlags.IsComponentsV2 });
}

// ─── Recusar ──────────────────────────────────────────────────────────────────

async function handleRecusar(interaction, reqId) {
  await interaction.deferUpdate();

  if (!temPermissao(interaction.member, config.CARGOS_CODIGUINHO_ADM)) {
    await interaction.followUp({ content: '❌ Você não tem permissão para recusar.', ephemeral: true });
    return;
  }

  const req = pendingRequests.get(reqId);
  if (!req) {
    await interaction.followUp({ content: '⚠️ Solicitação não encontrada ou já processada.', ephemeral: true });
    return;
  }

  pendingRequests.delete(reqId);

  try {
    const membro = await interaction.guild.members.fetch(req.userId);
    await membro.send(
      `## ❌  Solicitação Recusada\n\n` +
      `Olá, **${req.nome}**! Sua solicitação de codiguinho foi recusada.\n\n` +
      `-# <t:${Math.floor(Date.now() / 1000)}:f>`,
    );
  } catch {}

  const resultContainer = new ContainerBuilder()
    .setAccentColor(0xFF0000)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `## ❌  Solicitação Recusada\n\n` +
        `👤 **Solicitante:** <@${req.userId}> — \`${req.nome}\`\n` +
        `🔢 **Quantidade:** **${req.quantidade}**\n` +
        `👮 **Recusado por:** <@${interaction.user.id}>\n\n` +
        `-# <t:${Math.floor(Date.now() / 1000)}:f>`,
      ),
    );

  await interaction.message.edit({ components: [resultContainer], flags: MessageFlags.IsComponentsV2 });
}

// ─── Painel admin ─────────────────────────────────────────────────────────────

async function handleAdminPanel(interaction) {
  if (!temPermissao(interaction.member, config.CARGOS_CODIGUINHO_ADM)) {
    await interaction.reply({ content: '❌ Você não tem permissão para gerenciar codiguinhos.', ephemeral: true });
    return;
  }

  const codigos = lerCodigos();
  await interaction.reply({
    content:
      `## 🎟️  Painel Admin — Codiguinhos\n\n` +
      `📦 **Estoque atual:** **${codigos.length}** codiguinho(s) disponíveis`,
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('cod_admin_add').setLabel('➕ Adicionar Códigos').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('cod_admin_ver').setLabel('📋 Ver Lista').setStyle(ButtonStyle.Primary),
      ),
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('cod_admin_limpar_qtd').setLabel('🗑️ Remover X').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('cod_admin_limpar_all').setLabel('🗑️ Limpar Todos').setStyle(ButtonStyle.Danger),
      ),
    ],
    ephemeral: true,
  });
}

// ─── Admin: modal para adicionar ─────────────────────────────────────────────

async function handleAdminAdd(interaction) {
  const modal = new ModalBuilder().setCustomId('modal_cod_add').setTitle('Adicionar Codiguinhos');
  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('cod_lista')
        .setLabel('Cole os códigos (um por linha)')
        .setPlaceholder('ABC123\nDEF456\nGHI789')
        .setStyle(TextInputStyle.Paragraph)
        .setMaxLength(4000)
        .setRequired(true),
    ),
  );
  await interaction.showModal(modal);
}

// ─── Admin: modal de adição submetido ────────────────────────────────────────

async function handleModalAddCodigos(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const texto = interaction.fields.getTextInputValue('cod_lista');
  const novos = texto
    .split(/[\n,;]+/)
    .map((c) => c.trim())
    .filter(Boolean);

  if (novos.length === 0) {
    await interaction.editReply({ content: '❌ Nenhum código válido encontrado.' });
    return;
  }

  const existentes = lerCodigos();
  const antesQtd  = existentes.length;
  const set        = new Set(existentes);
  let duplicados   = 0;

  for (const c of novos) {
    if (set.has(c)) duplicados++;
    else            set.add(c);
  }

  const lista = Array.from(set);
  salvarCodigos(lista);

  const adicionados = novos.length - duplicados;
  await interaction.editReply({
    content:
      `✅ **${adicionados}** código(s) adicionado(s)!\n\n` +
      `📦 **Estoque:** ${antesQtd} → **${lista.length}** codiguinhos` +
      (duplicados > 0 ? `\n⚠️ **${duplicados}** duplicado(s) ignorado(s)` : ''),
  });
}

// ─── Admin: ver lista ─────────────────────────────────────────────────────────

async function handleAdminVer(interaction) {
  const codigos = lerCodigos();

  if (codigos.length === 0) {
    await interaction.reply({ content: '📦 Estoque vazio — nenhum codiguinho disponível.', ephemeral: true });
    return;
  }

  const preview = codigos.slice(0, 50).map((c, i) => `\`${i + 1}.\` \`${c}\``).join('\n');
  const extra   = codigos.length > 50 ? `\n\n-# ... e mais ${codigos.length - 50} não exibidos` : '';

  await interaction.reply({
    content: `## 📦  Estoque de Codiguinhos\n\n**Total:** ${codigos.length}\n\n${preview}${extra}`,
    ephemeral: true,
  });
}

// ─── Admin: limpar todos ──────────────────────────────────────────────────────

async function handleAdminLimparAll(interaction) {
  if (!temPermissao(interaction.member, config.CARGOS_CODIGUINHO_ADM)) {
    await interaction.reply({ content: '❌ Sem permissão.', ephemeral: true });
    return;
  }
  salvarCodigos([]);
  await interaction.reply({ content: '✅ Todos os codiguinhos foram removidos do estoque.', ephemeral: true });
}

// ─── Admin: remover X → abre modal ───────────────────────────────────────────

async function handleAdminLimparQtd(interaction) {
  const modal = new ModalBuilder().setCustomId('modal_cod_limpar_qtd').setTitle('Remover X Codiguinhos');
  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('cod_qtd_remover')
        .setLabel('Quantidade a remover (dos mais antigos)')
        .setPlaceholder('Ex: 10')
        .setStyle(TextInputStyle.Short)
        .setMaxLength(10)
        .setRequired(true),
    ),
  );
  await interaction.showModal(modal);
}

// ─── Admin: modal de remoção X submetido ─────────────────────────────────────

async function handleModalLimparQtd(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const qtdRaw = interaction.fields.getTextInputValue('cod_qtd_remover');
  const qtd    = parseInt(qtdRaw, 10);

  if (isNaN(qtd) || qtd < 1) {
    await interaction.editReply({ content: '❌ Quantidade inválida.' });
    return;
  }

  const codigos   = lerCodigos();
  const removidos = Math.min(qtd, codigos.length);
  const restantes = codigos.slice(removidos);
  salvarCodigos(restantes);

  await interaction.editReply({
    content:
      `✅ **${removidos}** codiguinho(s) removido(s).\n` +
      `📦 **Estoque restante:** **${restantes.length}**`,
  });
}

module.exports = {
  handleCodiguinhoChannel,
  handleCodiguinhoBotao,
  handleModalCodiguinho,
  handleAprovar,
  handleRecusar,
  handleAdminPanel,
  handleAdminAdd,
  handleModalAddCodigos,
  handleAdminVer,
  handleAdminLimparAll,
  handleAdminLimparQtd,
  handleModalLimparQtd,
};
