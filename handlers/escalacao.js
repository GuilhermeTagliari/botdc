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

const IMG = 'https://media.discordapp.net/attachments/1392674632544419963/1392675113262125056/Never_Pure_1920.jpg?ex=69ee0f85&is=69ecbe05&hm=3846f1cabdd4a1b55ad17216f5cc52b41d4f9805ae4a1973687884d3f04d494d&width=1535&height=863&';

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
    color      = 0x3498DB;
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

function buildSetupContainer() {
  return new ContainerBuilder()
    .setAccentColor(0x3498DB)
    .addMediaGalleryComponents(
      new MediaGalleryBuilder().addItems(
        new MediaGalleryItemBuilder().setURL(IMG),
      ),
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        '# ESCALAÇÃO — Never Pure\n\n' +
        'Selecione a ação no menu abaixo para criar uma escalação.\n\n' +
        '**1.** Selecione a categoria de ação\n' +
        '**2.** Aguarde os membros entrarem nos slots\n\n' +
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
}

async function handleEscalacaoChannel(client, guild) {
  try {
    const channel = await guild.channels.fetch(config.CANAL_CRIAR_ESCALACAO);
    if (!channel) return;

    const mensagens = await channel.messages.fetch({ limit: 50 });
    const antigaSetup = mensagens.find(
      (m) => m.author.id === client.user.id && m.flags.has(MessageFlags.IsComponentsV2),
    );
    if (antigaSetup) {
      try { await antigaSetup.delete(); } catch {}
    }

    await channel.send({ components: [buildSetupContainer()], flags: MessageFlags.IsComponentsV2 });
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

    let everyoneMessageId = null;
    try {
      const everyoneMsg = await canal.send({ content: '@everyone', allowedMentions: { parse: ['everyone'] } });
      everyoneMessageId = everyoneMsg.id;
    } catch (errEvery) {
      console.error(`[${new Date().toISOString()}] Falha ao enviar @everyone:`, errEvery.message);
    }

    const msg = await canal.send({ components: [criarContainer(esc, escId)], flags: MessageFlags.IsComponentsV2 });

    esc.messageId = msg.id;
    esc.channelId = canal.id;
    esc.everyoneMessageId = everyoneMessageId;
    escalacoes.set(escId, esc);
    salvarDados();
    await interaction.editReply({ components: [buildSetupContainer()], flags: MessageFlags.IsComponentsV2 });
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

    let everyoneMessageId = null;
    try {
      const everyoneMsg = await canal.send({ content: '@everyone', allowedMentions: { parse: ['everyone'] } });
      everyoneMessageId = everyoneMsg.id;
    } catch (errEvery) {
      console.error(`[${new Date().toISOString()}] Falha ao enviar @everyone:`, errEvery.message);
    }

    const msg = await canal.send({ components: [criarContainer(esc, escId)], flags: MessageFlags.IsComponentsV2 });

    esc.messageId  = msg.id;
    esc.channelId  = canal.id;
    esc.everyoneMessageId = everyoneMessageId;
    escalacoes.set(escId, esc);
    salvarDados();
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Erro ao publicar escalação:`, err);
    await interaction.editReply({ content: `❌ Erro ao criar escalação: \`${err.message}\`` });
    return;
  }

  await interaction.editReply({ content: `✅ Escalação **${acao}** criada — ${quantidade} vagas.` });
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
  try { await interaction.message.delete(); } catch {}

  if (esc.everyoneMessageId && esc.channelId) {
    try {
      const canal = await interaction.guild.channels.fetch(esc.channelId);
      const everyoneMsg = await canal.messages.fetch(esc.everyoneMessageId);
      await everyoneMsg.delete();
    } catch {}
  }

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
    .setAccentColor(vitoria ? 0x57F287 : 0x3498DB)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(text));

  try {
    const canalControle = await interaction.guild.channels.fetch(config.CANAL_CONTROLE);
    await canalControle.send({ components: [container], flags: MessageFlags.IsComponentsV2 });
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Erro ao enviar para canal controle:`, err);
  }

  await interaction.editReply({ content: vitoria ? '🏆 Vitória registrada!' : '💀 Derrota registrada.' });

  await atualizarRanking(interaction.guild);
}

function extrairTexto(msg) {
  const getText = (comp) => {
    if (!comp) return '';
    const type    = comp.type    ?? comp.data?.type;
    const content = comp.content ?? comp.data?.content;
    if (type === 10) return typeof content === 'string' ? content : '';
    const children = comp.components ?? comp.data?.components ?? [];
    return Array.isArray(children) ? children.map(getText).join('\n') : '';
  };
  return msg.components.map(getText).filter(Boolean).join('\n');
}

function extrairBotaoIds(msg) {
  const ids = [];
  const traverse = (comp) => {
    if (!comp) return;
    const type     = comp.type     ?? comp.data?.type;
    const customId = comp.customId ?? comp.custom_id ?? comp.data?.custom_id;
    if (type === 2 && customId) ids.push(customId);
    const children = comp.components ?? comp.data?.components ?? [];
    if (Array.isArray(children)) children.forEach(traverse);
  };
  msg.components.forEach(traverse);
  return ids;
}

async function reconstruirDeCanal(guild) {
  if (!config.CANAL_ESCALACAO) return;
  const PREFIXOS = ['esc_part_', 'esc_sair_', 'esc_remover_', 'esc_fechar_', 'esc_vitoria_', 'esc_derrota_', 'esc_reabrir_'];
  try {
    const canal = await guild.channels.fetch(config.CANAL_ESCALACAO);
    const msgs  = await canal.messages.fetch({ limit: 50 });

    for (const msg of msgs.values()) {
      if (msg.author.id !== guild.client.user.id) continue;
      if (!msg.flags.has(MessageFlags.IsComponentsV2)) continue;

      const botaoIds = extrairBotaoIds(msg);
      let escId = null;
      for (const cid of botaoIds) {
        for (const p of PREFIXOS) {
          if (cid.startsWith(p)) { escId = cid.slice(p.length); break; }
        }
        if (escId) break;
      }
      if (!escId || escalacoes.has(escId)) continue;

      const text = extrairTexto(msg);

      const acaoMatch  = text.match(/## ⚔️\s+(.+)/);
      const acao       = acaoMatch ? acaoMatch[1].trim() : '—';
      const vagasMatch = text.match(/(\d+)\/(\d+)/);
      const quantidade = vagasMatch ? parseInt(vagasMatch[2], 10) : 1;

      const slots      = Array(quantidade).fill(null);
      const partMatch  = text.match(/\*\*👥 Participantes:\*\*\n([\s\S]+?)\n\n-#/);
      if (partMatch) {
        partMatch[1].split('\n').forEach((linha, i) => {
          const m = linha.match(/<@(\d+)>/);
          if (m && i < quantidade) slots[i] = m[1];
        });
      }

      const fechada = botaoIds.some((id) =>
        id.startsWith('esc_vitoria_') || id.startsWith('esc_derrota_') || id.startsWith('esc_reabrir_'),
      );

      escalacoes.set(escId, {
        acao, quantidade, slots, fechada, resultado: null,
        messageId: msg.id, channelId: msg.channelId,
        guildId: guild.id, criadorId: null, everyoneMessageId: null,
      });
      console.log(`[${new Date().toISOString()}] Escalação ${escId} (${acao}) reconstruída do canal.`);
    }

    if (escalacoes.size > 0) salvarDados();
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Erro ao reconstruir escalações do canal:`, err);
  }
}

async function restaurarEscalacoes(client) {
  const dados = lerDados();
  for (const [id, e] of Object.entries(dados)) {
    if (e.resultado) continue;
    escalacoes.set(id, e);
  }

  // JSON apagado (Discloud reiniciou) — escaneia o canal para reconstruir
  if (escalacoes.size === 0) {
    for (const guild of client.guilds.cache.values()) {
      await reconstruirDeCanal(guild);
    }
  }

  console.log(`[${new Date().toISOString()}] Escalações restauradas: ${escalacoes.size}`);

  // Reativa botões das mensagens existentes
  for (const [escId, esc] of escalacoes.entries()) {
    if (!esc.channelId || !esc.messageId) continue;
    try {
      const guild = client.guilds.cache.get(esc.guildId);
      if (!guild) continue;
      const canal = await guild.channels.fetch(esc.channelId);
      const msg   = await canal.messages.fetch(esc.messageId);
      await msg.edit({ components: [criarContainer(esc, escId)], flags: MessageFlags.IsComponentsV2 });
      console.log(`[${new Date().toISOString()}] Escalação ${escId} reativada.`);
    } catch {
      console.warn(`[${new Date().toISOString()}] Escalação ${escId} — mensagem não encontrada no canal.`);
    }
  }
}

async function handleRepostarEscalacao(interaction) {
  await interaction.deferReply({ ephemeral: true });

  // Se o JSON foi apagado (Discloud reiniciou), reconstrói do canal antes
  if (escalacoes.size === 0) {
    await reconstruirDeCanal(interaction.guild);
  }

  const ativas = [...escalacoes.entries()].filter(([, e]) => !e.resultado);
  if (ativas.length === 0) {
    await interaction.editReply({ content: '⚠️ Não há escalações ativas para repostar.' });
    return;
  }

  let repostadas = 0;
  let erros = 0;

  for (const [escId, esc] of ativas) {
    try {
      const canal = await interaction.guild.channels.fetch(config.CANAL_ESCALACAO);

      // Tenta apagar a mensagem antiga
      if (esc.messageId) {
        try {
          const msgAntiga = await canal.messages.fetch(esc.messageId);
          await msgAntiga.delete();
        } catch {}
      }
      if (esc.everyoneMessageId) {
        try {
          const msgEvery = await canal.messages.fetch(esc.everyoneMessageId);
          await msgEvery.delete();
        } catch {}
      }

      const msg = await canal.send({ components: [criarContainer(esc, escId)], flags: MessageFlags.IsComponentsV2 });
      esc.messageId = msg.id;
      esc.everyoneMessageId = null;
      repostadas++;
    } catch {
      erros++;
    }
  }

  salvarDados();
  await interaction.editReply({
    content: `✅ **${repostadas}** escalação(ões) repostada(s)${erros > 0 ? ` · ⚠️ ${erros} erro(s)` : ''}.`,
  });
}

module.exports = {
  handleEscalacaoChannel,
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
  handleRepostarEscalacao,
};
