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
const config = require('../config');
const { txt } = require('../textos');
const { temPermissao } = require('../utils/permissao');
const { formatarValorBR } = require('../utils/formato');
const { atualizarRanking } = require('./ranking');
const { supabase } = require('../supabase');

// escId → { acao, quantidade, horario, slots: [], fechada, resultado, messageId, channelId, guildId }
const escalacoes = new Map();

async function carregarEscalacoes() {
  const { data, error } = await supabase
    .from('bot_estado')
    .select('valor')
    .eq('chave', 'escalacoes')
    .single();
  if (error && error.code !== 'PGRST116') {
    console.error('[escalacao] Erro ao carregar do Supabase:', error.message);
    return {};
  }
  if (data?.valor && Object.keys(data.valor).length > 0) {
    return data.valor;
  }
  // Migração única: lê JSON local se Supabase estiver vazio
  try {
    const fs   = require('fs');
    const path = require('path');
    const dados = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/escalacoes.json'), 'utf8'));
    if (Object.keys(dados).length > 0) {
      console.log(`[escalacao] Migrando ${Object.keys(dados).length} escalação(ões) do JSON para Supabase...`);
      await supabase
        .from('bot_estado')
        .upsert({ chave: 'escalacoes', valor: dados, atualizado_em: new Date().toISOString() }, { onConflict: 'chave' });
      return dados;
    }
  } catch { /* arquivo não existe */ }
  return {};
}

function salvarDados(dadosOverride) {
  const dados = dadosOverride ?? Object.fromEntries(escalacoes.entries());
  supabase
    .from('bot_estado')
    .upsert({ chave: 'escalacoes', valor: dados, atualizado_em: new Date().toISOString() }, { onConflict: 'chave' })
    .then(({ error }) => { if (error) console.error('[escalacao] Erro ao salvar no Supabase:', error.message); });
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
      new ButtonBuilder().setCustomId(`esc_part_${escId}`).setLabel(txt('esc.btn_participar', '✅ Participar')).setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`esc_sair_${escId}`).setLabel(txt('esc.btn_sair', '❌ Sair')).setStyle(ButtonStyle.Danger),
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`esc_remover_${escId}`).setLabel(txt('esc.btn_remover', '🗑️ Remover Membro')).setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`esc_fechar_${escId}`).setLabel(txt('esc.btn_fechar', '🔒 Fechar Ação')).setStyle(ButtonStyle.Secondary),
    ),
  ];
}

function botoesResultado(escId) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`esc_vitoria_${escId}`).setLabel(txt('esc.btn_vitoria', '🏆 Vitória')).setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`esc_derrota_${escId}`).setLabel(txt('esc.btn_derrota', '💀 Derrota')).setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId(`esc_reabrir_${escId}`).setLabel(txt('esc.btn_reabrir', '🔓 Reabrir Ação')).setStyle(ButtonStyle.Secondary),
    ),
  ];
}

function criarContainer(esc, escId) {
  const { acao, quantidade, horario, slots, fechada, resultado, criadorId, radio } = esc;
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
  const radioLine   = radio ? `\n📻 **Rádio:** ${radio}` : '';

  const text =
    `## ⚔️  ${acao}\n\n` +
    `📊 **Vagas:** **${preenchidos}/${quantidade}**  ·  📈 ${barraProgresso(preenchidos, quantidade)}${radioLine}\n\n` +
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
  const cats = (config.CATEGORIAS_ESCALACAO ?? []).filter((c) => c.acoes?.length > 0);

  const builder = new ContainerBuilder()
    .setAccentColor(config.ESCALACAO_COR ?? 0x3498DB)
    .addMediaGalleryComponents(
      new MediaGalleryBuilder().addItems(
        new MediaGalleryItemBuilder().setURL(config.getImg('ESCALACAO')),
      ),
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `# ${config.ESCALACAO_TITULO}\n\n${config.ESCALACAO_DESC}`,
      ),
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true));

  // Até 4 categorias (5ª linha reservada para Ação Personalizada)
  for (const [idx, cat] of cats.slice(0, 4).entries()) {
    builder.addActionRowComponents(
      new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(`esc_select_cat_${idx}`)
          .setPlaceholder(`${cat.emoji ?? '⚔️'} ${cat.nome}`)
          .addOptions(cat.acoes.slice(0, 25).map((a) => ({
            label: `${a.nome} — ${a.qty} vagas`,
            value: `${a.nome}|${a.qty}`,
          }))),
      ),
    );
  }

  builder.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('esc_custom').setLabel('✏️ Ação Personalizada').setStyle(ButtonStyle.Secondary),
    ),
  );

  return builder;
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
  const modal = new ModalBuilder().setCustomId('modal_escalacao').setTitle(txt('esc.titulo', 'Criar Escalação'));

  const acaoInput = new TextInputBuilder()
    .setCustomId('esc_acao')
    .setLabel(txt('esc.acao', 'Nome da Ação'))
    .setStyle(TextInputStyle.Short)
    .setMaxLength(60)
    .setRequired(true);
  if (nomePreenchido) acaoInput.setValue(nomePreenchido);

  const qtdInput = new TextInputBuilder()
    .setCustomId('esc_quantidade')
    .setLabel(txt('esc.qtd', 'Quantidade de pessoas (somente números)'))
    .setPlaceholder('Ex: 5')
    .setStyle(TextInputStyle.Short)
    .setMaxLength(3)
    .setRequired(true);
  if (qtyPreenchido) qtdInput.setValue(String(qtyPreenchido));

  modal.addComponents(
    new ActionRowBuilder().addComponents(acaoInput),
    new ActionRowBuilder().addComponents(qtdInput),
  );

  if (config.ESCALACAO_RADIO) {
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('esc_radio')
          .setLabel(txt('esc.radio', 'Frequência de Rádio (opcional)'))
          .setPlaceholder('Ex: 87.5 MHz')
          .setStyle(TextInputStyle.Short)
          .setMaxLength(30)
          .setRequired(false),
      ),
    );
  }

  return modal;
}

async function handleEscalacaoSelectAcao(interaction) {
  if (!temPermissao(interaction.member, config.CARGOS_ESCALACAO)) {
    await interaction.reply({ content: '❌ Você não tem cargo para criar escalações.', ephemeral: true });
    return;
  }
  const value       = interaction.values[0];
  const [nome, qty] = value.split('|');
  const quantidade  = parseInt(qty, 10);

  if (config.ESCALACAO_RADIO) {
    await interaction.showModal(buildModal(nome, quantidade));
    return;
  }

  await interaction.deferUpdate();

  const escId = gerarId();
  const slots = Array(quantidade).fill(null);
  const esc   = { acao: nome, quantidade, radio: null, slots, fechada: false, resultado: null, messageId: null, channelId: null, guildId: interaction.guild.id, criadorId: interaction.user.id };

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
  if (!temPermissao(interaction.member, config.CARGOS_ESCALACAO)) {
    await interaction.reply({ content: '❌ Você não tem cargo para criar escalações.', ephemeral: true });
    return;
  }
  await interaction.showModal(buildModal(null, null));
}

async function handleModalEscalacao(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const acao      = interaction.fields.getTextInputValue('esc_acao');
  const qtdRaw    = interaction.fields.getTextInputValue('esc_quantidade');
  const quantidade = parseInt(qtdRaw, 10);
  let radio = null;
  try { radio = config.ESCALACAO_RADIO ? (interaction.fields.getTextInputValue('esc_radio')?.trim() || null) : null; } catch {}

  if (isNaN(quantidade) || quantidade < 1 || quantidade > 100) {
    await interaction.editReply({ content: '❌ Quantidade inválida. Use apenas números entre 1 e 100.' });
    return;
  }

  const escId = gerarId();
  const slots  = Array(quantidade).fill(null);
  const esc    = { acao, quantidade, radio, slots, fechada: false, resultado: null, messageId: null, channelId: null, guildId: interaction.guild.id, criadorId: interaction.user.id };

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

  if (config.CARGO_ADV_ESC && interaction.member.roles.cache.has(config.CARGO_ADV_ESC)) {
    await interaction.editReply({ content: '⛔ Você está suspenso de participar de escalações no momento.' });
    return;
  }

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

async function registrarResultado(interaction, escId, vitoria, valor) {
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
  const valorLine   = valor ? `\n💰 **Valor:** ${formatarValorBR(valor)}` : '';

  const text =
    `## ${vitoria ? '🏆  Vitória!' : '💀  Derrota'}\n` +
    `${vitoria ? 'A ação foi concluída com sucesso!' : 'A ação não saiu como planejado.'}\n\n` +
    `⚔️ **Ação:** ${esc.acao}  ·  👥 **${participantes.length} membros**${valorLine}\n\n` +
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

async function handleResultado(interaction, escId, vitoria) {
  if (!temPermissao(interaction.member, config.CARGOS_ESCALACAO)) {
    await interaction.reply({ content: '❌ Você não tem permissão para registrar o resultado.', ephemeral: true });
    return;
  }

  const esc = escalacoes.get(escId);
  if (!esc)          { await interaction.reply({ content: '❌ Escalação não encontrada ou expirada.', ephemeral: true }); return; }
  if (esc.resultado) { await interaction.reply({ content: '⚠️ O resultado desta escalação já foi registrado.', ephemeral: true }); return; }

  if (vitoria) {
    const modal = new ModalBuilder()
      .setCustomId(`modal_esc_valor_${escId}`)
      .setTitle('Registrar Vitória');
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('esc_valor')
          .setLabel('Quanto dinheiro a ação rendeu?')
          .setStyle(TextInputStyle.Short)
          .setMaxLength(60)
          .setRequired(true)
          .setPlaceholder('Ex: R$ 50.000'),
      ),
    );
    await interaction.showModal(modal);
    return;
  }

  await interaction.deferReply({ ephemeral: true });
  await registrarResultado(interaction, escId, vitoria, null);
}

async function handleModalValorResultado(interaction, escId) {
  await interaction.deferReply({ ephemeral: true });
  const valor = interaction.fields.getTextInputValue('esc_valor').trim() || null;
  await registrarResultado(interaction, escId, true, valor);
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
  const dados = await carregarEscalacoes();
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
  handleModalValorResultado,
  restaurarEscalacoes,
  handleRepostarEscalacao,
};
