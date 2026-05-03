const {
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  StringSelectMenuBuilder,
  UserSelectMenuBuilder,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  MessageFlags,
} = require('discord.js');

const ACOES = {
  grande: [
    { nome: 'Niobio',        qty: 15 },
    { nome: 'Banco Central', qty: 11 },
    { nome: 'Porto',         qty: 10 },
    { nome: 'Galinheiro',    qty: 10 },
    { nome: 'Banco Paleto',  qty: 8  },
    { nome: 'Hotel Rosa',    qty: 8  },
  ],
  media: [
    { nome: 'Flecca',                 qty: 8 },
    { nome: 'Joia',                   qty: 8 },
    { nome: 'Açougue',                qty: 8 },
    { nome: 'Teatro',                 qty: 8 },
    { nome: 'Estacionamento (Marrom)',qty: 8 },
    { nome: 'Bob Cat',                qty: 8 },
    { nome: 'Automar',                qty: 8 },
    { nome: 'Aeroporto Trevor',       qty: 6 },
  ],
  pequena: [
    { nome: 'OBS',             qty: 10 },
    { nome: 'Mergulhador',     qty: 8  },
    { nome: 'Auditorio',       qty: 6  },
    { nome: 'Campo de Golf',   qty: 5  },
    { nome: 'Commedy',         qty: 5  },
    { nome: 'Estabulo',        qty: 5  },
    { nome: 'Plannet',         qty: 5  },
    { nome: 'Navio Cargueiro', qty: 4  },
    { nome: 'Yellow',          qty: 4  },
    { nome: 'Lojinha',         qty: 4  },
    { nome: 'Ammu',            qty: 3  },
    { nome: 'Bebidas',         qty: 3  },
    { nome: 'Fast Food',       qty: 3  },
    { nome: 'Hyper Mercado',   qty: 3  },
    { nome: 'Mc Donald',       qty: 3  },
  ],
};
const fs   = require('fs');
const path = require('path');
const config = require('../config');
const { temPermissao } = require('../utils/permissao');
const { atualizarRanking } = require('./ranking');

const IMG = 'https://cdn.discordapp.com/attachments/1497039765118255282/1497069523269058651/Logo_CRX_com_brilho_metalico_e_vermelho.jpg?ex=69ee2864&is=69ecd6e4&hm=27a99f4e3c95b941f73a2c4b924fd805b34d59519b976a2445c4d875f5b6c5fc&';

const ARQUIVO = path.join(__dirname, '../data/escalacoes.json');

// escId → { acao, quantidade, horario, slots: [], fechada, resultado, messageId, channelId, guildId }
const escalacoes = new Map();

function lerDados() {
  try { return JSON.parse(fs.readFileSync(ARQUIVO, 'utf8')); } catch { return {}; }
}

function salvarDados() {
  const dados = {};
  for (const [id, e] of escalacoes.entries()) {
    dados[id] = e;
  }
  fs.writeFileSync(ARQUIVO, JSON.stringify(dados, null, 2));
}

function gerarId() {
  return Date.now().toString(36);
}

function barraProgresso(preenchidos, total) {
  const largura = Math.min(total, 15);
  const cheios  = Math.round((preenchidos / total) * largura);
  return '`' + '█'.repeat(cheios) + '░'.repeat(largura - cheios) + '`';
}

function botoesAberta(escId) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`esc_part_${escId}`).setLabel('✅ Participar').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`esc_sair_${escId}`).setLabel('❌ Sair').setStyle(ButtonStyle.Danger),
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`esc_remover_${escId}`).setLabel('🗑️ Remover Membro').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`esc_fechar_${escId}`).setLabel('🔒 Fechar Ação').setStyle(ButtonStyle.Secondary),
    ),
  ];
}

function botoesResultado(escId) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`esc_vitoria_${escId}`).setLabel('🏆 Vitória').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`esc_derrota_${escId}`).setLabel('💀 Derrota').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId(`esc_reabrir_${escId}`).setLabel('🔓 Reabrir Ação').setStyle(ButtonStyle.Secondary),
    ),
  ];
}

function criarContainer(esc, escId) {
  const { acao, quantidade, horario, slots, fechada, resultado, criadorId } = esc;
  const preenchidos = slots.filter(Boolean).length;
  const cheia       = preenchidos >= quantidade;
  const lista       = slots.map((id, i) => `\`${i + 1}.\` ${id ? `<@${id}>` : '—'}`).join('\n');

  let color      = 0x57F287;
  let statusLine = '🟢  Clique em **Participar** para entrar';

  if (cheia && !fechada) {
    color      = 0xFEE75C;
    statusLine = '🟡  Escalação completa — aguardando fechamento';
  }
  if (fechada && !resultado) {
    color      = 0x99AAB5;
    statusLine = '🔒  Ação encerrada — registre o resultado';
  } else if (resultado === 'vitoria') {
    color      = 0x57F287;
    statusLine = '🏆  Vitória registrada!';
  } else if (resultado === 'derrota') {
    color      = 0xFF0000;
    statusLine = '💀  Derrota registrada';
  }

  const criadorLine = criadorId ? `  ·  👤 Criado por <@${criadorId}>` : '';

  const text =
    `## ⚔️  ${acao}\n\n` +
    `📊 **Vagas:** **${preenchidos}/${quantidade}**  ·  📈 ${barraProgresso(preenchidos, quantidade)}\n\n` +
    `**👥 Participantes:**\n${lista || '—'}\n\n` +
    `-# ${statusLine}${criadorLine}`;

  const container = new ContainerBuilder()
    .setAccentColor(color)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(text))
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true));

  const rows = fechada ? botoesResultado(escId) : botoesAberta(escId);
  for (const row of rows) {
    container.addActionRowComponents(row);
  }

  return container;
}

async function atualizarMensagem(guild, esc, escId) {
  if (!esc.channelId || !esc.messageId) return;
  try {
    const canal = await guild.channels.fetch(esc.channelId);
    const msg   = await canal.messages.fetch(esc.messageId);
    await msg.edit({ components: [criarContainer(esc, escId)], flags: MessageFlags.IsComponentsV2 });
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Erro ao atualizar mensagem de escalação:`, err);
  }
}

async function handleEscalacaoChannel(client, guild) {
  try {
    const channel = await guild.channels.fetch(config.CANAL_CRIAR_ESCALACAO);
    if (!channel) return;

    const mensagens = await channel.messages.fetch({ limit: 50 });
    const jaExiste  = mensagens.some(
      (m) => m.author.id === client.user.id && (
        (m.embeds.length > 0 && m.components.length > 0 && m.embeds[0]?.title?.includes('Escalação')) ||
        m.flags.has(MessageFlags.IsComponentsV2)
      ),
    );

    if (jaExiste) {
      console.log(`[${new Date().toISOString()}] Mensagem de escalação já existe — nenhuma ação necessária.`);
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
          '# ESCALAÇÃO — CRX\n\n' +
          'Clique no botão abaixo para iniciar uma nova escalação de ação.\n\n' +
          '**1.** Clique em **Criar Escalação**\n' +
          '**2.** Preencha o nome da ação e o horário\n' +
          '**3.** Defina a quantidade de participantes\n' +
          '**4.** Aguarde os membros entrarem nos slots\n\n' +
          '-# Somente Soldado ou superior pode criar escalações.',
        ),
      )
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
      .addActionRowComponents(
        new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('escalar_criar').setLabel('⚔️ Criar Escalação').setStyle(ButtonStyle.Danger),
        ),
      );

    await channel.send({ components: [container], flags: MessageFlags.IsComponentsV2 });
    console.log(`[${new Date().toISOString()}] Mensagem de escalação enviada em: ${guild.name}`);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Erro ao enviar mensagem de escalação:`, err);
  }
}

function makeSelectMenu(customId, placeholder, acoes) {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(customId)
      .setPlaceholder(placeholder)
      .addOptions(acoes.map((a) => ({
        label: `${a.nome} — ${a.qty} pessoas`,
        value: `${a.nome}|${a.qty}`,
      }))),
  );
}

async function handleCriarEscalacao(interaction) {
  const container = new ContainerBuilder()
    .setAccentColor(0xFF0000)
    .addMediaGalleryComponents(
      new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(IMG)),
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        '# ⚔️  CRIAR ESCALAÇÃO\n\n' +
        'Selecione a ação no menu abaixo para criar a escalação automaticamente.\n\n' +
        '1. Selecione a categoria de ação\n' +
        '2. Aguarde os membros entrarem nos slots\n\n' +
        '-# Somente Soldado ou superior pode criar escalações.',
      ),
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addActionRowComponents(makeSelectMenu('esc_select_grande',  '🔴 Ação Grande',  ACOES.grande))
    .addActionRowComponents(makeSelectMenu('esc_select_media',   '🟡 Ação Média',   ACOES.media))
    .addActionRowComponents(makeSelectMenu('esc_select_pequena', '🟢 Ação Pequena', ACOES.pequena))
    .addActionRowComponents(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('esc_custom').setLabel('✏️ Ação Personalizada').setStyle(ButtonStyle.Secondary),
      ),
    );

  await interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2, ephemeral: true });
}

function buildModal(nomePreenchido, qtyPreenchido) {
  const modal = new ModalBuilder().setCustomId('modal_escalacao').setTitle('Criar Escalação Personalizada');

  const acaoInput = new TextInputBuilder()
    .setCustomId('esc_acao')
    .setLabel('Nome da Ação')
    .setStyle(TextInputStyle.Short)
    .setMaxLength(60)
    .setRequired(true);
  if (nomePreenchido) acaoInput.setValue(nomePreenchido);

  const qtdInput = new TextInputBuilder()
    .setCustomId('esc_quantidade')
    .setLabel('Quantidade de pessoas (somente números)')
    .setPlaceholder('Ex: 5')
    .setStyle(TextInputStyle.Short)
    .setMaxLength(3)
    .setRequired(true);
  if (qtyPreenchido) qtdInput.setValue(String(qtyPreenchido));

  modal.addComponents(
    new ActionRowBuilder().addComponents(acaoInput),
    new ActionRowBuilder().addComponents(qtdInput),
  );

  return modal;
}

async function handleEscalacaoSelectAcao(interaction) {
  const value       = interaction.values[0];
  const [nome, qty] = value.split('|');
  const quantidade  = parseInt(qty, 10);

  await interaction.deferUpdate();

  const escId = gerarId();
  const slots = Array(quantidade).fill(null);
  const esc   = { acao: nome, quantidade, slots, fechada: false, resultado: null, messageId: null, channelId: null, guildId: interaction.guild.id, criadorId: interaction.user.id };

  try {
    const canal = await interaction.guild.channels.fetch(config.CANAL_ESCALACAO);
    if (!canal) throw new Error('Canal CANAL_ESCALACAO não encontrado.');

    let msg;
    try {
      msg = await canal.send({ content: '@everyone', components: [criarContainer(esc, escId)], flags: MessageFlags.IsComponentsV2, allowedMentions: { parse: ['everyone'] } });
    } catch {
      msg = await canal.send({ components: [criarContainer(esc, escId)], flags: MessageFlags.IsComponentsV2 });
    }

    esc.messageId = msg.id;
    esc.channelId = canal.id;
    escalacoes.set(escId, esc);
    salvarDados();
    await interaction.followUp({ content: `✅ Escalação **${nome}** criada — ${quantidade} vagas.`, ephemeral: true });
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Erro ao publicar escalação:`, err);
    await interaction.followUp({ content: `❌ Erro ao criar escalação: \`${err.message}\``, ephemeral: true });
  }
}

async function handleEscalacaoCustom(interaction) {
  await interaction.showModal(buildModal(null, null));
}

async function handleModalEscalacao(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const acao      = interaction.fields.getTextInputValue('esc_acao');
  const qtdRaw    = interaction.fields.getTextInputValue('esc_quantidade');
  const quantidade = parseInt(qtdRaw, 10);

  if (isNaN(quantidade) || quantidade < 1 || quantidade > 100) {
    await interaction.editReply({ content: '❌ Quantidade inválida. Use apenas números entre 1 e 100.' });
    return;
  }

  const escId = gerarId();
  const slots  = Array(quantidade).fill(null);
  const esc    = { acao, quantidade, slots, fechada: false, resultado: null, messageId: null, channelId: null, guildId: interaction.guild.id, criadorId: interaction.user.id };

  try {
    const canal = await interaction.guild.channels.fetch(config.CANAL_ESCALACAO);
    if (!canal) throw new Error('Canal CANAL_ESCALACAO não encontrado no servidor.');

    let msg;
    try {
      msg = await canal.send({ content: '@everyone', components: [criarContainer(esc, escId)], flags: MessageFlags.IsComponentsV2, allowedMentions: { parse: ['everyone'] } });
    } catch {
      msg = await canal.send({ components: [criarContainer(esc, escId)], flags: MessageFlags.IsComponentsV2 });
    }

    esc.messageId  = msg.id;
    esc.channelId  = canal.id;
    escalacoes.set(escId, esc);
    salvarDados();
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Erro ao publicar escalação:`, err);
    await interaction.editReply({ content: `❌ Erro ao criar escalação: \`${err.message}\`` });
    return;
  }

  await interaction.editReply({ content: `✅ Escalação **${acao}** criada para às **${horario}** — ${quantidade} vagas.` });
}

async function handleParticipar(interaction, escId) {
  await interaction.deferReply({ ephemeral: true });

  const esc = escalacoes.get(escId);
  if (!esc)                                    { await interaction.editReply({ content: '❌ Escalação não encontrada ou expirada.' }); return; }
  if (esc.fechada)                             { await interaction.editReply({ content: '🔒 Esta escalação já foi encerrada.' }); return; }
  if (esc.slots.includes(interaction.user.id)) { await interaction.editReply({ content: '⚠️ Você já está nesta escalação.' }); return; }

  const slotLivre = esc.slots.indexOf(null);
  if (slotLivre === -1) { await interaction.editReply({ content: '❌ Esta escalação já está cheia.' }); return; }

  esc.slots[slotLivre] = interaction.user.id;
  salvarDados();
  await atualizarMensagem(interaction.guild, esc, escId);
  await interaction.editReply({ content: `✅ Você entrou na escalação **${esc.acao}** — slot **${slotLivre + 1}** reservado!` });
}

async function handleSair(interaction, escId) {
  await interaction.deferReply({ ephemeral: true });

  const esc = escalacoes.get(escId);
  if (!esc)        { await interaction.editReply({ content: '❌ Escalação não encontrada ou expirada.' }); return; }
  if (esc.fechada) { await interaction.editReply({ content: '🔒 Esta escalação já foi encerrada.' }); return; }

  const slotIdx = esc.slots.indexOf(interaction.user.id);
  if (slotIdx === -1) { await interaction.editReply({ content: '⚠️ Você não está nesta escalação.' }); return; }

  esc.slots[slotIdx] = null;
  salvarDados();
  await atualizarMensagem(interaction.guild, esc, escId);
  await interaction.editReply({ content: `✅ Você saiu da escalação **${esc.acao}**.` });
}

async function handleRemoverBtn(interaction, escId) {
  await interaction.deferReply({ ephemeral: true });

  if (!temPermissao(interaction.member, config.CARGOS_ESCALACAO)) {
    await interaction.editReply({ content: '❌ Você não tem permissão para remover membros.' });
    return;
  }

  const esc = escalacoes.get(escId);
  if (!esc)                               { await interaction.editReply({ content: '❌ Escalação não encontrada ou expirada.' }); return; }
  if (esc.slots.every((s) => s === null)) { await interaction.editReply({ content: '⚠️ Não há participantes para remover.' }); return; }

  const select = new UserSelectMenuBuilder()
    .setCustomId(`esc_remover_select_${escId}`)
    .setPlaceholder('Selecione o membro para remover')
    .setMinValues(1).setMaxValues(1);

  await interaction.editReply({ content: '🗑️ Selecione quem deseja remover:', components: [new ActionRowBuilder().addComponents(select)] });
}

async function handleRemoverSelect(interaction, escId) {
  await interaction.deferUpdate();

  const esc = escalacoes.get(escId);
  if (!esc) { await interaction.followUp({ content: '❌ Escalação não encontrada ou expirada.', ephemeral: true }); return; }

  const alvoId  = interaction.values[0];
  const slotIdx = esc.slots.indexOf(alvoId);
  if (slotIdx === -1) { await interaction.editReply({ content: '⚠️ Este membro não está na escalação.', components: [] }); return; }

  esc.slots[slotIdx] = null;
  salvarDados();
  await atualizarMensagem(interaction.guild, esc, escId);
  await interaction.editReply({ content: `✅ <@${alvoId}> removido da escalação.`, components: [] });
}

async function handleFechar(interaction, escId) {
  await interaction.deferReply({ ephemeral: true });

  if (!temPermissao(interaction.member, config.CARGOS_ESCALACAO)) {
    await interaction.editReply({ content: '❌ Você não tem permissão para fechar escalações.' });
    return;
  }

  const esc = escalacoes.get(escId);
  if (!esc)        { await interaction.editReply({ content: '❌ Escalação não encontrada ou expirada.' }); return; }
  if (esc.fechada) { await interaction.editReply({ content: '⚠️ Esta escalação já foi encerrada.' }); return; }

  esc.fechada = true;
  salvarDados();
  await atualizarMensagem(interaction.guild, esc, escId);
  await interaction.editReply({ content: '🔒 Ação encerrada! Registre o resultado abaixo.' });
}

async function handleReabrir(interaction, escId) {
  await interaction.deferReply({ ephemeral: true });

  if (!temPermissao(interaction.member, config.CARGOS_ESCALACAO)) {
    await interaction.editReply({ content: '❌ Você não tem permissão para reabrir escalações.' });
    return;
  }

  const esc = escalacoes.get(escId);
  if (!esc)          { await interaction.editReply({ content: '❌ Escalação não encontrada ou expirada.' }); return; }
  if (!esc.fechada)  { await interaction.editReply({ content: '⚠️ Esta escalação já está aberta.' }); return; }
  if (esc.resultado) { await interaction.editReply({ content: '⚠️ Não é possível reabrir uma escalação com resultado já registrado.' }); return; }

  esc.fechada = false;
  salvarDados();
  await atualizarMensagem(interaction.guild, esc, escId);
  await interaction.editReply({ content: '🔓 Escalação reaberta com sucesso!' });
}

async function handleResultado(interaction, escId, vitoria) {
  await interaction.deferReply({ ephemeral: true });

  if (!temPermissao(interaction.member, config.CARGOS_ESCALACAO)) {
    await interaction.editReply({ content: '❌ Você não tem permissão para registrar o resultado.' });
    return;
  }

  const esc = escalacoes.get(escId);
  if (!esc)          { await interaction.editReply({ content: '❌ Escalação não encontrada ou expirada.' }); return; }
  if (esc.resultado) { await interaction.editReply({ content: '⚠️ O resultado desta escalação já foi registrado.' }); return; }

  esc.resultado = vitoria ? 'vitoria' : 'derrota';
  salvarDados();
  await interaction.message.delete();

  const participantes = esc.slots.filter(Boolean);
  const lista = participantes.length > 0
    ? participantes.map((id, i) => `\`${i + 1}.\` <@${id}>`).join('\n')
    : '`Nenhum`';

  const criadorLine = esc.criadorId ? `\n👤 Criado por <@${esc.criadorId}>` : '';

  const text =
    `## ${vitoria ? '🏆  Vitória!' : '💀  Derrota'}\n` +
    `${vitoria ? 'A ação foi concluída com sucesso!' : 'A ação não saiu como planejado.'}\n\n` +
    `⚔️ **Ação:** ${esc.acao}  ·  👥 **${participantes.length} membros**\n\n` +
    `**📋 Lista de Participantes:**\n${lista}\n\n` +
    `📝 Registrado por <@${interaction.user.id}>${criadorLine}  ·  <t:${Math.floor(Date.now() / 1000)}:f>`;

  const container = new ContainerBuilder()
    .setAccentColor(vitoria ? 0x57F287 : 0xFF0000)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(text));

  try {
    const canalControle = await interaction.guild.channels.fetch(config.CANAL_CONTROLE);
    await canalControle.send({ components: [container], flags: MessageFlags.IsComponentsV2 });
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Erro ao enviar para canal controle:`, err);
  }

  await interaction.editReply({ content: vitoria ? '🏆 Vitória registrada!' : '💀 Derrota registrada.' });

  if (vitoria) await atualizarRanking(interaction.guild);
}

async function restaurarEscalacoes(client) {
  const dados = lerDados();
  for (const [id, e] of Object.entries(dados)) {
    if (e.resultado) continue;
    escalacoes.set(id, e);
  }
  console.log(`[${new Date().toISOString()}] Escalações restauradas: ${escalacoes.size}`);
}

module.exports = {
  handleEscalacaoChannel,
  handleCriarEscalacao,
  handleEscalacaoSelectAcao,
  handleEscalacaoCustom,
  handleModalEscalacao,
  handleParticipar,
  handleSair,
  handleRemoverBtn,
  handleRemoverSelect,
  handleFechar,
  handleReabrir,
  handleResultado,
  restaurarEscalacoes,
};
