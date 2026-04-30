const {
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  UserSelectMenuBuilder,
} = require('discord.js');
const config = require('../config');
const { temPermissao } = require('../utils/permissao');
const { atualizarRanking } = require('./ranking');

// escId → { acao, quantidade, horario, slots: [], fechada, resultado, messageId, channelId }
const escalacoes = new Map();

function gerarId() {
  return Date.now().toString(36);
}

function barraProgresso(preenchidos, total) {
  const largura = Math.min(total, 15);
  const cheios  = Math.round((preenchidos / total) * largura);
  return '`' + '█'.repeat(cheios) + '░'.repeat(largura - cheios) + '`';
}

function criarEmbed({ acao, quantidade, horario, slots, fechada, resultado }) {
  const preenchidos = slots.filter(Boolean).length;
  const cheia       = preenchidos >= quantidade;
  const lista       = slots.map((id, i) => `\`${i + 1}.\` ${id ? `<@${id}>` : '—'}`).join('\n');

  let color  = 0x57F287;
  let footer = '🟢  Clique em Participar para entrar';

  if (cheia && !fechada) {
    color  = 0xFEE75C;
    footer = '🟡  Escalação completa — aguardando fechamento';
  }
  if (fechada && !resultado) {
    color  = 0x99AAB5;
    footer = '🔒  Ação encerrada — registre o resultado';
  } else if (resultado === 'vitoria') {
    color  = 0x57F287;
    footer = '🏆  Vitória registrada!';
  } else if (resultado === 'derrota') {
    color  = 0xFF0000;
    footer = '💀  Derrota registrada';
  }

  return new EmbedBuilder()
    .setTitle(`⚔️  ${acao}`)
    .setColor(color)
    .addFields(
      { name: '🕐 Horário',      value: horario,                                     inline: true  },
      { name: '📊 Vagas',        value: `**${preenchidos}/${quantidade}**`,           inline: true  },
      { name: '📈 Progresso',    value: barraProgresso(preenchidos, quantidade),      inline: true  },
      { name: '👥 Participantes', value: lista || '—',                               inline: false },
    )
    .setFooter({ text: footer })
    .setTimestamp();
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
    ),
  ];
}

async function atualizarMensagem(guild, esc, escId) {
  if (!esc.channelId || !esc.messageId) return;
  try {
    const canal = await guild.channels.fetch(esc.channelId);
    const msg   = await canal.messages.fetch(esc.messageId);
    await msg.edit({ embeds: [criarEmbed(esc)], components: esc.fechada ? botoesResultado(escId) : botoesAberta(escId) });
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
      (m) => m.author.id === client.user.id && m.embeds.length > 0 && m.components.length > 0
        && m.embeds[0]?.title?.includes('Escalação'),
    );

    if (jaExiste) {
      console.log(`[${new Date().toISOString()}] Mensagem de escalação já existe — nenhuma ação necessária.`);
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle('ESCALAÇÃO — CRX')
      .setDescription(
        'Clique no botão abaixo para iniciar uma nova escalação de ação.\n\n' +
        '**1.** Clique em **Criar Escalação**\n' +
        '**2.** Preencha o nome da ação e o horário\n' +
        '**3.** Defina a quantidade de participantes\n' +
        '**4.** Aguarde os membros entrarem nos slots\n\n' +
        '*Somente staff pode criar e encerrar escalações.*',
      )
      .setColor(0xFF0000)
      .setImage('https://cdn.discordapp.com/attachments/1497039765118255282/1497069523269058651/Logo_CRX_com_brilho_metalico_e_vermelho.jpg?ex=69ee2864&is=69ecd6e4&hm=27a99f4e3c95b941f73a2c4b924fd805b34d59519b976a2445c4d875f5b6c5fc&')
      .setFooter({ text: 'CRX • Escalação' });

    const botao = new ButtonBuilder()
      .setCustomId('escalar_criar')
      .setLabel('⚔️ Criar Escalação')
      .setStyle(ButtonStyle.Primary);

    await channel.send({ embeds: [embed], components: [new ActionRowBuilder().addComponents(botao)] });
    console.log(`[${new Date().toISOString()}] Mensagem de escalação enviada em: ${guild.name}`);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Erro ao enviar mensagem de escalação:`, err);
  }
}

async function handleCriarEscalacao(interaction) {
  const modal = new ModalBuilder().setCustomId('modal_escalacao').setTitle('Criar Escalação');

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('esc_acao').setLabel('Ação').setPlaceholder('Ex: Roubo de banco, Sequestro...').setStyle(TextInputStyle.Short).setMaxLength(60).setRequired(true),
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('esc_quantidade').setLabel('Quantidade de pessoas (somente números)').setPlaceholder('Ex: 5').setStyle(TextInputStyle.Short).setMaxLength(3).setRequired(true),
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('esc_horario').setLabel('Horário').setPlaceholder('Ex: 20:00 ou 20h').setStyle(TextInputStyle.Short).setMaxLength(20).setRequired(true),
    ),
  );

  await interaction.showModal(modal);
}

async function handleModalEscalacao(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const acao      = interaction.fields.getTextInputValue('esc_acao');
  const qtdRaw    = interaction.fields.getTextInputValue('esc_quantidade');
  const horario   = interaction.fields.getTextInputValue('esc_horario');
  const quantidade = parseInt(qtdRaw, 10);

  if (isNaN(quantidade) || quantidade < 1 || quantidade > 100) {
    await interaction.editReply({ content: '❌ Quantidade inválida. Use apenas números entre 1 e 100.' });
    return;
  }

  const escId = gerarId();
  const slots  = Array(quantidade).fill(null);
  const esc    = { acao, quantidade, horario, slots, fechada: false, resultado: null, messageId: null, channelId: null };

  try {
    const canal = await interaction.guild.channels.fetch(config.CANAL_ESCALACAO);
    const msg   = await canal.send({ content: '@everyone', embeds: [criarEmbed(esc)], components: botoesAberta(escId) });
    esc.messageId  = msg.id;
    esc.channelId  = canal.id;
    escalacoes.set(escId, esc);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Erro ao publicar escalação:`, err);
    await interaction.editReply({ content: '❌ Erro ao criar escalação. Verifique o canal configurado.' });
    return;
  }

  await interaction.editReply({ content: `✅ Escalação **${acao}** criada para às **${horario}** — ${quantidade} vagas.` });
}

async function handleParticipar(interaction, escId) {
  await interaction.deferReply({ ephemeral: true });

  const esc = escalacoes.get(escId);
  if (!esc)                                { await interaction.editReply({ content: '❌ Escalação não encontrada ou expirada.' }); return; }
  if (esc.fechada)                         { await interaction.editReply({ content: '🔒 Esta escalação já foi encerrada.' }); return; }
  if (esc.slots.includes(interaction.user.id)) { await interaction.editReply({ content: '⚠️ Você já está nesta escalação.' }); return; }

  const slotLivre = esc.slots.indexOf(null);
  if (slotLivre === -1) { await interaction.editReply({ content: '❌ Esta escalação já está cheia.' }); return; }

  esc.slots[slotLivre] = interaction.user.id;
  await atualizarMensagem(interaction.guild, esc, escId);
  await interaction.editReply({ content: `✅ Você entrou na escalação **${esc.acao}** — slot **${slotLivre + 1}** reservado!` });
}

async function handleSair(interaction, escId) {
  await interaction.deferReply({ ephemeral: true });

  const esc = escalacoes.get(escId);
  if (!esc)     { await interaction.editReply({ content: '❌ Escalação não encontrada ou expirada.' }); return; }
  if (esc.fechada) { await interaction.editReply({ content: '🔒 Esta escalação já foi encerrada.' }); return; }

  const slotIdx = esc.slots.indexOf(interaction.user.id);
  if (slotIdx === -1) { await interaction.editReply({ content: '⚠️ Você não está nesta escalação.' }); return; }

  esc.slots[slotIdx] = null;
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
  if (!esc)                              { await interaction.editReply({ content: '❌ Escalação não encontrada ou expirada.' }); return; }
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
  await atualizarMensagem(interaction.guild, esc, escId);
  await interaction.editReply({ content: '🔒 Ação encerrada! Registre o resultado abaixo.' });
}

async function handleResultado(interaction, escId, vitoria) {
  await interaction.deferReply({ ephemeral: true });

  if (!temPermissao(interaction.member, config.CARGOS_ESCALACAO)) {
    await interaction.editReply({ content: '❌ Você não tem permissão para registrar o resultado.' });
    return;
  }

  const esc = escalacoes.get(escId);
  if (!esc)         { await interaction.editReply({ content: '❌ Escalação não encontrada ou expirada.' }); return; }
  if (esc.resultado) { await interaction.editReply({ content: '⚠️ O resultado desta escalação já foi registrado.' }); return; }

  esc.resultado = vitoria ? 'vitoria' : 'derrota';
  await interaction.message.delete();

  const participantes = esc.slots.filter(Boolean);
  const lista = participantes.length > 0
    ? participantes.map((id, i) => `\`${i + 1}.\` <@${id}>`).join('\n')
    : '`Nenhum`';

  const embed = new EmbedBuilder()
    .setTitle(vitoria ? '🏆  Vitória!' : '💀  Derrota')
    .setColor(vitoria ? 0x57F287 : 0xFF0000)
    .setDescription(vitoria ? 'A ação foi concluída com sucesso!' : 'A ação não saiu como planejado.')
    .addFields(
      { name: '⚔️ Ação',             value: esc.acao,                             inline: true  },
      { name: '🕐 Horário',           value: esc.horario,                          inline: true  },
      { name: '👥 Participantes',     value: `**${participantes.length}** membros`, inline: true  },
      { name: '📋 Lista',             value: lista,                                inline: false },
      { name: '📝 Registrado por',    value: `<@${interaction.user.id}>`,          inline: false },
    )
    .setTimestamp();

  try {
    const canalControle = await interaction.guild.channels.fetch(config.CANAL_CONTROLE);
    await canalControle.send({ embeds: [embed] });
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Erro ao enviar para canal controle:`, err);
  }

  await interaction.editReply({ content: vitoria ? '🏆 Vitória registrada!' : '💀 Derrota registrada.' });

  if (vitoria) await atualizarRanking(interaction.guild);
}

module.exports = {
  handleEscalacaoChannel,
  handleCriarEscalacao,
  handleModalEscalacao,
  handleParticipar,
  handleSair,
  handleRemoverBtn,
  handleRemoverSelect,
  handleFechar,
  handleResultado,
};
