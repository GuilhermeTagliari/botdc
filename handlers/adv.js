const {
  ButtonBuilder, ButtonStyle, ActionRowBuilder,
  ModalBuilder, TextInputBuilder, TextInputStyle,
  ContainerBuilder, TextDisplayBuilder, SeparatorBuilder,
  MessageFlags,
} = require('discord.js');
const config = require('../config');
const { supabase } = require('../supabase');
const { temPermissao } = require('../utils/permissao');

// advId → { userId, dias, motivo, endTime, encerrada, guildId }
const advertencias = new Map();
const timers = new Map(); // advId → timeoutId

async function carregarAdvs() {
  const { data, error } = await supabase
    .from('bot_estado')
    .select('valor')
    .eq('chave', 'advertencias_esc')
    .single();
  if (error && error.code !== 'PGRST116') {
    console.error('[adv] Erro ao carregar do Supabase:', error.message);
    return;
  }
  const dados = (data?.valor) ?? {};
  for (const [id, a] of Object.entries(dados)) {
    if (!a.encerrada) advertencias.set(id, a);
  }
  console.log(`[adv] Advertências de escalação carregadas: ${advertencias.size}`);
}

function salvarAdvs() {
  const dados = Object.fromEntries(advertencias.entries());
  supabase
    .from('bot_estado')
    .upsert({ chave: 'advertencias_esc', valor: dados, atualizado_em: new Date().toISOString() }, { onConflict: 'chave' })
    .then(({ error }) => { if (error) console.error('[adv] Erro ao salvar:', error.message); });
}

async function encerrarAdv(client, advId, adv) {
  adv.encerrada = true;
  salvarAdvs();
  timers.delete(advId);

  try {
    const guild = client.guilds.cache.get(adv.guildId);
    if (!guild) return;

    const membro = await guild.members.fetch(adv.userId).catch(() => null);
    if (membro && config.CARGO_ADV_ESC) {
      try { await membro.roles.remove(config.CARGO_ADV_ESC); } catch {}
    }

    if (config.CANAL_ADV_LOG) {
      const canalLog = await guild.channels.fetch(config.CANAL_ADV_LOG).catch(() => null);
      if (canalLog) {
        const text =
          `## ✅ Advertência Encerrada\n\n` +
          `👤 **Membro:** <@${adv.userId}>\n` +
          `📅 **Duração:** ${adv.dias} dia${adv.dias !== 1 ? 's' : ''}\n` +
          `📋 **Motivo original:** ${adv.motivo}\n\n` +
          `-# Suspensão de escalação encerrada automaticamente  ·  <t:${Math.floor(Date.now() / 1000)}:f>`;
        const container = new ContainerBuilder()
          .setAccentColor(0x57F287)
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(text));
        await canalLog.send({ components: [container], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
      }
    }
  } catch (err) {
    console.error(`[adv] Erro ao encerrar advertência ${advId}:`, err.message);
  }
}

async function restaurarAdvs(client) {
  for (const [advId, adv] of advertencias.entries()) {
    if (adv.encerrada) continue;
    const restante = adv.endTime - Date.now();
    if (restante <= 0) {
      await encerrarAdv(client, advId, adv);
    } else {
      const t = setTimeout(() => encerrarAdv(client, advId, adv), restante);
      timers.set(advId, t);
    }
  }
  console.log(`[adv] Timers de advertência restaurados: ${timers.size}`);
}

async function handleAdvChannel(client, guild) {
  if (!config.CANAL_ADV_BTN) return;
  const channel = await guild.channels.fetch(config.CANAL_ADV_BTN).catch(() => null);
  if (!channel) return;

  const container = new ContainerBuilder()
    .setAccentColor(config.ADV_COR ?? 0xFEE75C)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`# ${config.ADV_TITULO ?? 'ADVERTÊNCIAS DE ESCALAÇÃO'}\n\n${config.ADV_DESC ?? 'Registre suspensões de participação em escalações.'}`),
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addActionRowComponents(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('adv_aplicar').setLabel(config.ADV_BTN ?? '⚠️ Aplicar Advertência').setStyle(ButtonStyle.Danger),
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

async function handleAdvAplicarBtn(interaction) {
  if (!temPermissao(interaction.member, config.CARGOS_ADV_ADM)) {
    await interaction.reply({ content: '❌ Você não tem permissão para aplicar advertências de escalação.', ephemeral: true });
    return;
  }

  const modal = new ModalBuilder().setCustomId('modal_adv').setTitle('Aplicar Advertência de Escalação');
  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('adv_membro')
        .setLabel('ID ou menção do membro')
        .setPlaceholder('Ex: 123456789 ou <@123456789>')
        .setStyle(TextInputStyle.Short)
        .setMaxLength(100)
        .setRequired(true),
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('adv_dias')
        .setLabel('Dias de suspensão (1 a 90)')
        .setPlaceholder('Ex: 7')
        .setStyle(TextInputStyle.Short)
        .setMaxLength(3)
        .setRequired(true),
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('adv_motivo')
        .setLabel('Motivo da advertência')
        .setPlaceholder('Descreva o motivo')
        .setStyle(TextInputStyle.Paragraph)
        .setMaxLength(400)
        .setRequired(true),
    ),
  );
  await interaction.showModal(modal);
}

async function handleModalAdv(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const membroRaw = interaction.fields.getTextInputValue('adv_membro').trim();
  const diasRaw   = interaction.fields.getTextInputValue('adv_dias').trim();
  const motivo    = interaction.fields.getTextInputValue('adv_motivo').trim();

  const userId = membroRaw.replace(/[<@!>]/g, '');
  const dias   = parseInt(diasRaw, 10);

  if (isNaN(dias) || dias < 1 || dias > 90) {
    await interaction.editReply({ content: '❌ Número de dias inválido. Use um valor entre 1 e 90.' });
    return;
  }

  let membro;
  try {
    membro = await interaction.guild.members.fetch(userId);
  } catch {
    await interaction.editReply({ content: '❌ Membro não encontrado. Verifique o ID ou a menção.' });
    return;
  }

  if (config.CARGO_ADV_ESC) {
    try { await membro.roles.add(config.CARGO_ADV_ESC); } catch (err) {
      console.error(`[adv] Erro ao adicionar cargo:`, err.message);
    }
  }

  const endTime = Date.now() + dias * 24 * 60 * 60 * 1000;
  const advId   = `adv_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`;
  const adv     = {
    userId: membro.id,
    dias,
    motivo,
    endTime,
    encerrada: false,
    guildId: interaction.guild.id,
  };

  advertencias.set(advId, adv);
  salvarAdvs();

  const t = setTimeout(() => encerrarAdv(interaction.client, advId, adv), dias * 24 * 60 * 60 * 1000);
  timers.set(advId, t);

  if (config.CANAL_ADV_LOG) {
    try {
      const canalLog = await interaction.guild.channels.fetch(config.CANAL_ADV_LOG);
      const text =
        `## ⚠️ Advertência de Escalação Aplicada\n\n` +
        `👤 **Membro:** <@${membro.id}>\n` +
        `📅 **Duração:** ${dias} dia${dias !== 1 ? 's' : ''}\n` +
        `⏰ **Encerra em:** <t:${Math.floor(endTime / 1000)}:F>\n` +
        `📋 **Motivo:** ${motivo}\n\n` +
        `📝 Aplicado por <@${interaction.user.id}>  ·  <t:${Math.floor(Date.now() / 1000)}:f>`;
      const container = new ContainerBuilder()
        .setAccentColor(config.ADV_COR ?? 0xFEE75C)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(text));
      await canalLog.send({ components: [container], flags: MessageFlags.IsComponentsV2 });
    } catch (err) {
      console.error(`[adv] Erro ao enviar log:`, err.message);
    }
  }

  await interaction.editReply({
    content: `⚠️ Advertência aplicada a <@${membro.id}> por **${dias} dia${dias !== 1 ? 's' : ''}**.\n📋 Motivo: ${motivo}`,
  });
}

function getAdvAtiva(userId) {
  for (const adv of advertencias.values()) {
    if (adv.userId === userId && !adv.encerrada && adv.endTime > Date.now()) return adv;
  }
  return null;
}

module.exports = { carregarAdvs, restaurarAdvs, handleAdvChannel, handleAdvAplicarBtn, handleModalAdv, getAdvAtiva };
