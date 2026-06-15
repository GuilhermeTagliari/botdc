const {
  PermissionFlagsBits,
  ContainerBuilder,
  SectionBuilder,
  TextDisplayBuilder,
  ThumbnailBuilder,
  SeparatorBuilder,
  MessageFlags,
  ModalBuilder,
  ActionRowBuilder,
  TextInputBuilder,
  TextInputStyle,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const config = require('../config');
const { dmEmbed } = require('../utils/dm');
const fs   = require('fs');
const path = require('path');

const WARNS_FILE = path.join(__dirname, '../data/warns.json');

function lerWarns() {
  try { return JSON.parse(fs.readFileSync(WARNS_FILE, 'utf-8')); } catch { return {}; }
}

function salvarWarns(dados) {
  fs.writeFileSync(WARNS_FILE, JSON.stringify(dados, null, 2));
}

const TS = () => `-# <t:${Math.floor(Date.now() / 1000)}:f>`;

const TIPO_CFG = {
  verde:    { cor: 0x57F287, emoji: '🟢', label: 'Verde (Verbal)'  },
  amarela:  { cor: 0xFEE75C, emoji: '🟡', label: 'Amarela (Média)' },
  vermelha: { cor: 0x3498DB, emoji: '🔴', label: 'Vermelha (Grave)' },
};

function cargosWarnIds() {
  return [config.CARGO_WARN_1, config.CARGO_WARN_2, config.CARGO_WARN_3, config.CARGO_WARN_4].filter(Boolean);
}

function calcularCargoWarn(historico) {
  const v  = historico.filter(w => (w.tipo ?? 'verde') === 'verde').length;
  const a  = historico.filter(w => w.tipo === 'amarela').length;
  const vm = historico.filter(w => w.tipo === 'vermelha').length;
  if (vm >= 1 || a >= 2 || v >= 3) return config.CARGO_WARN_4;
  if (a >= 1  || v >= 3)           return config.CARGO_WARN_3;
  if (v >= 2)                      return config.CARGO_WARN_2;
  if (v >= 1)                      return config.CARGO_WARN_1;
  return null;
}

async function atualizarCargoWarn(member, historico) {
  const novoCargo = calcularCargoWarn(historico);
  for (const id of cargosWarnIds()) {
    if (member.roles.cache.has(id)) {
      try { await member.roles.remove(id); } catch {}
    }
  }
  if (novoCargo) {
    try { await member.roles.add(novoCargo); } catch {}
  }
}

// ─── CLEAR ───────────────────────────────────────────────────────────────────

async function handleClear(interaction) {
  if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
    await interaction.reply({ content: '❌ Apenas administradores podem usar este comando.', ephemeral: true });
    return;
  }

  const quantidade = interaction.options.getInteger('quantidade');
  await interaction.deferReply({ ephemeral: true });

  let apagadas = 0;
  let restante  = quantidade;

  try {
    while (restante > 0) {
      const lote  = Math.min(restante, 100);
      const msgs  = await interaction.channel.messages.fetch({ limit: lote });
      if (msgs.size === 0) break;

      const validas  = msgs.filter((m) => Date.now() - m.createdTimestamp < 14 * 24 * 60 * 60 * 1000);
      if (validas.size === 0) break;

      const deletadas = await interaction.channel.bulkDelete(validas, true);
      apagadas += deletadas.size;
      restante -= lote;

      if (deletadas.size < lote) break;
      if (restante > 0) await new Promise((r) => setTimeout(r, 1100));
    }
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Erro ao apagar mensagens:`, err);
  }

  await interaction.editReply({
    content: apagadas > 0
      ? `✅ **${apagadas}** mensagem(ns) apagada(s).`
      : '⚠️ Nenhuma mensagem apagada (podem ter mais de 14 dias ou o canal está vazio).',
  });
}

// ─── BANIR ───────────────────────────────────────────────────────────────────

async function handleBanir(interaction) {
  if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
    await interaction.reply({ content: '❌ Apenas administradores podem usar este comando.', ephemeral: true });
    return;
  }

  const alvo   = interaction.options.getMember('usuario');
  const motivo = interaction.options.getString('motivo');

  if (!alvo) { await interaction.reply({ content: '❌ Usuário não encontrado.', ephemeral: true }); return; }
  if (!alvo.bannable) { await interaction.reply({ content: '❌ Não consigo banir este usuário. Verifique se meu cargo está acima do dele.', ephemeral: true }); return; }

  try {
    await alvo.send(dmEmbed('🔨 Você foi Banido',
      `🏠 **Servidor:** ${interaction.guild.name}\n📋 **Motivo:** ${motivo}\n🛡️ **Moderador:** ${interaction.user.tag}`,
      0x3498DB)).catch(() => {});
    await alvo.ban({ reason: `${motivo} | Moderador: ${interaction.user.tag}` });

    const container = new ContainerBuilder()
      .setAccentColor(0x3498DB)
      .addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `## 🔨 Membro Banido\n\n` +
              `👤 **Membro:** ${alvo.user.tag} (<@${alvo.id}>)\n` +
              `🛡️ **Moderador:** <@${interaction.user.id}>\n` +
              `📋 **Motivo:** ${motivo}\n\n` +
              TS(),
            ),
          )
          .setThumbnailAccessory(new ThumbnailBuilder().setURL(alvo.user.displayAvatarURL({ dynamic: true }))),
      );

    await interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Erro ao banir:`, err);
    await interaction.reply({ content: '❌ Erro ao banir o usuário.', ephemeral: true });
  }
}

// ─── KICK ────────────────────────────────────────────────────────────────────

async function handleKick(interaction) {
  if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
    await interaction.reply({ content: '❌ Apenas administradores podem usar este comando.', ephemeral: true });
    return;
  }

  const alvo   = interaction.options.getMember('usuario');
  const motivo = interaction.options.getString('motivo');

  if (!alvo) { await interaction.reply({ content: '❌ Usuário não encontrado.', ephemeral: true }); return; }
  if (!alvo.kickable) { await interaction.reply({ content: '❌ Não consigo kickar este usuário. Verifique se meu cargo está acima do dele.', ephemeral: true }); return; }

  try {
    await alvo.send(dmEmbed('👢 Você foi Expulso',
      `🏠 **Servidor:** ${interaction.guild.name}\n📋 **Motivo:** ${motivo}\n🛡️ **Moderador:** ${interaction.user.tag}`,
      0xFEE75C)).catch(() => {});
    await alvo.kick(`${motivo} | Moderador: ${interaction.user.tag}`);

    const container = new ContainerBuilder()
      .setAccentColor(0xFEE75C)
      .addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `## 👢 Membro Kickado\n\n` +
              `👤 **Membro:** ${alvo.user.tag} (<@${alvo.id}>)\n` +
              `🛡️ **Moderador:** <@${interaction.user.id}>\n` +
              `📋 **Motivo:** ${motivo}\n\n` +
              TS(),
            ),
          )
          .setThumbnailAccessory(new ThumbnailBuilder().setURL(alvo.user.displayAvatarURL({ dynamic: true }))),
      );

    await interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Erro ao kickar:`, err);
    await interaction.reply({ content: '❌ Erro ao kickar o usuário.', ephemeral: true });
  }
}

// ─── MUTE ────────────────────────────────────────────────────────────────────

async function handleMute(interaction) {
  if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
    await interaction.reply({ content: '❌ Apenas administradores podem usar este comando.', ephemeral: true });
    return;
  }

  const alvo    = interaction.options.getMember('usuario');
  const minutos = interaction.options.getInteger('tempo');
  const motivo  = interaction.options.getString('motivo');

  if (!alvo) { await interaction.reply({ content: '❌ Usuário não encontrado.', ephemeral: true }); return; }
  if (!alvo.moderatable) { await interaction.reply({ content: '❌ Não consigo silenciar este usuário. Verifique se meu cargo está acima do dele.', ephemeral: true }); return; }

  const duracao = minutos * 60 * 1000;
  const horas   = minutos >= 60 ? `${Math.floor(minutos / 60)}h ${minutos % 60}min` : `${minutos}min`;

  try {
    await alvo.timeout(duracao, `${motivo} | Moderador: ${interaction.user.tag}`);
    await alvo.send(dmEmbed('🔇 Você foi Silenciado',
      `🏠 **Servidor:** ${interaction.guild.name}\n⏱️ **Duração:** ${horas}\n📋 **Motivo:** ${motivo}\n🛡️ **Moderador:** ${interaction.user.tag}`,
      0x5865F2)).catch(() => {});

    const container = new ContainerBuilder()
      .setAccentColor(0x5865F2)
      .addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `## 🔇 Membro Silenciado\n\n` +
              `👤 **Membro:** ${alvo.user.tag} (<@${alvo.id}>)\n` +
              `🛡️ **Moderador:** <@${interaction.user.id}>\n` +
              `⏱️ **Duração:** ${horas}\n` +
              `📋 **Motivo:** ${motivo}\n\n` +
              TS(),
            ),
          )
          .setThumbnailAccessory(new ThumbnailBuilder().setURL(alvo.user.displayAvatarURL({ dynamic: true }))),
      );

    await interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Erro ao silenciar:`, err);
    await interaction.reply({ content: '❌ Erro ao silenciar o usuário.', ephemeral: true });
  }
}

// ─── WARN ────────────────────────────────────────────────────────────────────

async function handleWarn(interaction) {
  if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
    await interaction.reply({ content: '❌ Apenas administradores podem usar este comando.', ephemeral: true });
    return;
  }

  const alvo = interaction.options.getMember('usuario');
  if (!alvo) { await interaction.reply({ content: '❌ Usuário não encontrado.', ephemeral: true }); return; }

  const container = new ContainerBuilder()
    .setAccentColor(0x5865F2)
    .addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `## ⚠️ Advertir membro\n\n👤 **Membro:** ${alvo.user.tag} (<@${alvo.id}>)\n\nSelecione o tipo da advertência:`,
          ),
        )
        .setThumbnailAccessory(new ThumbnailBuilder().setURL(alvo.user.displayAvatarURL({ dynamic: true }))),
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addActionRowComponents(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`warn_tipo_verde_${alvo.id}`).setLabel('🟢 Verde (Verbal)').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`warn_tipo_amarela_${alvo.id}`).setLabel('🟡 Amarela (Média)').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`warn_tipo_vermelha_${alvo.id}`).setLabel('🔴 Vermelha (Grave)').setStyle(ButtonStyle.Danger),
      ),
    );

  await interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
}

async function handleWarnTipoBtn(interaction, tipo, targetUserId) {
  const tc = TIPO_CFG[tipo] ?? TIPO_CFG.verde;
  const modal = new ModalBuilder()
    .setCustomId(`modal_warn_${tipo}_${targetUserId}`)
    .setTitle(`Advertência ${tc.label}`);

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('warn_motivo')
        .setLabel('Motivo da advertência')
        .setStyle(TextInputStyle.Paragraph)
        .setMaxLength(500)
        .setRequired(true),
    ),
  );

  await interaction.showModal(modal);
}

async function handleWarnModal(interaction, tipo, targetUserId) {
  await interaction.deferReply({ ephemeral: true });

  const motivo = interaction.fields.getTextInputValue('warn_motivo');
  const tc     = TIPO_CFG[tipo] ?? TIPO_CFG.verde;

  let alvo;
  try { alvo = await interaction.guild.members.fetch(targetUserId); } catch {}
  if (!alvo) { await interaction.editReply({ content: '❌ Membro não encontrado no servidor.' }); return; }

  const dados = lerWarns();
  if (!dados[alvo.id]) dados[alvo.id] = [];

  dados[alvo.id].push({
    tipo,
    motivo,
    moderador: interaction.user.id,
    moderadorTag: interaction.user.tag,
    data: new Date().toISOString(),
  });
  salvarWarns(dados);

  const total = dados[alvo.id].length;

  await atualizarCargoWarn(alvo, dados[alvo.id]);

  await alvo.send(dmEmbed(`${tc.emoji} Você Recebeu uma Advertência`,
    `🏠 **Servidor:** ${interaction.guild.name}\n⚠️ **Tipo:** ${tc.label}\n📋 **Motivo:** ${motivo}\n🛡️ **Moderador:** ${interaction.user.tag}\n📊 **Total:** ${total} advertência${total !== 1 ? 's' : ''}`,
    tc.cor)).catch(() => {});

  const container = new ContainerBuilder()
    .setAccentColor(tc.cor)
    .addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `## ${tc.emoji} Advertência ${tc.label}\n\n` +
            `👤 **Membro:** ${alvo.user.tag} (<@${alvo.id}>)\n` +
            `🛡️ **Moderador:** <@${interaction.user.id}>\n` +
            `📊 **Total de warns:** **${total}**\n` +
            `📋 **Motivo:** ${motivo}\n\n` +
            TS(),
          ),
        )
        .setThumbnailAccessory(new ThumbnailBuilder().setURL(alvo.user.displayAvatarURL({ dynamic: true }))),
    );

  if (config.CANAL_WARNS) {
    try {
      const canal = await interaction.guild.channels.fetch(config.CANAL_WARNS);
      await canal.send({ components: [container], flags: MessageFlags.IsComponentsV2 });
    } catch {}
  }

  await interaction.editReply({ content: `✅ Advertência **${tc.label}** registrada para <@${alvo.id}>. (warn ${total})` });
}

// ─── WARNS ───────────────────────────────────────────────────────────────────

async function handleWarns(interaction) {
  if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
    await interaction.reply({ content: '❌ Apenas administradores podem usar este comando.', ephemeral: true });
    return;
  }

  const alvo = interaction.options.getMember('usuario');
  if (!alvo) { await interaction.reply({ content: '❌ Usuário não encontrado.', ephemeral: true }); return; }

  const dados = lerWarns();
  const lista  = dados[alvo.id] || [];

  if (lista.length === 0) {
    await interaction.reply({ content: `✅ <@${alvo.id}> não possui advertências.`, ephemeral: true });
    return;
  }

  const linhas = lista.map((w, i) => {
    const data = new Date(w.data).toLocaleString('pt-BR');
    const tc = TIPO_CFG[w.tipo ?? 'verde'] ?? TIPO_CFG.verde;
    return `**${i + 1}.** ${tc.emoji} **${tc.label}** — ${w.motivo}\n> por <@${w.moderador}> em ${data}`;
  }).join('\n\n');

  const container = new ContainerBuilder()
    .setAccentColor(0xFEE75C)
    .addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `## ⚠️ Advertências — ${alvo.user.tag}\n\n` +
            `${linhas}\n\n` +
            `-# Total: ${lista.length} advertência(s)`,
          ),
        )
        .setThumbnailAccessory(new ThumbnailBuilder().setURL(alvo.user.displayAvatarURL({ dynamic: true }))),
    );

  await interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2, ephemeral: true });
}

// ─── REMOVEWARN ──────────────────────────────────────────────────────────────

async function handleRemovewarn(interaction) {
  if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
    await interaction.reply({ content: '❌ Apenas administradores podem usar este comando.', ephemeral: true });
    return;
  }

  const alvo   = interaction.options.getMember('usuario');
  const numero = interaction.options.getInteger('numero');

  if (!alvo) { await interaction.reply({ content: '❌ Usuário não encontrado.', ephemeral: true }); return; }

  const dados = lerWarns();
  const lista  = dados[alvo.id] || [];

  if (lista.length === 0) {
    await interaction.reply({ content: `✅ <@${alvo.id}> não possui advertências.`, ephemeral: true });
    return;
  }

  if (numero < 1 || numero > lista.length) {
    await interaction.reply({ content: `❌ Número inválido. <@${alvo.id}> tem **${lista.length}** advertência(s). Use \`/warns\` para ver a lista.`, ephemeral: true });
    return;
  }

  const removida = lista.splice(numero - 1, 1)[0];
  dados[alvo.id] = lista;
  salvarWarns(dados);

  await atualizarCargoWarn(alvo, lista);

  const container = new ContainerBuilder()
    .setAccentColor(0x57F287)
    .addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `## ✅ Advertência Removida\n\n` +
            `👤 **Membro:** ${alvo.user.tag} (<@${alvo.id}>)\n` +
            `🛡️ **Moderador:** <@${interaction.user.id}>\n` +
            `📊 **Warns restantes:** **${lista.length}**\n` +
            `📋 **Warn removido:** ${removida.motivo}\n\n` +
            TS(),
          ),
        )
        .setThumbnailAccessory(new ThumbnailBuilder().setURL(alvo.user.displayAvatarURL({ dynamic: true }))),
    );

  await interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
}

// ─── USERINFO ────────────────────────────────────────────────────────────────

async function handleUserinfo(interaction) {
  const alvo = interaction.options.getMember('usuario') || interaction.member;

  const cargos = alvo.roles.cache
    .filter((r) => r.id !== interaction.guild.id)
    .sort((a, b) => b.position - a.position)
    .map((r) => `<@&${r.id}>`)
    .join(', ') || '`Nenhum`';

  const warns = (lerWarns()[alvo.id] || []).length;

  const container = new ContainerBuilder()
    .setAccentColor(alvo.displayColor || 0x5865F2)
    .addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `## 👤 ${alvo.user.tag}\n\n` +
            `🆔 **ID:** \`${alvo.id}\`  ·  🤖 **Bot:** ${alvo.user.bot ? 'Sim' : 'Não'}  ·  ⚠️ **Warns:** **${warns}**\n` +
            `📅 **Entrou no Discord:** <t:${Math.floor(alvo.user.createdTimestamp / 1000)}:D>\n` +
            `📅 **Entrou no servidor:** <t:${Math.floor(alvo.joinedTimestamp / 1000)}:D>\n\n` +
            `🎭 **Cargos:** ${cargos}`,
          ),
        )
        .setThumbnailAccessory(new ThumbnailBuilder().setURL(alvo.user.displayAvatarURL({ size: 256 }))),
    );

  await interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2, ephemeral: true });
}

// ─── LOCK / UNLOCK ───────────────────────────────────────────────────────────

async function handleLock(interaction) {
  if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
    await interaction.reply({ content: '❌ Apenas administradores podem usar este comando.', ephemeral: true });
    return;
  }
  try {
    await interaction.channel.permissionOverwrites.edit(interaction.guild.id, { SendMessages: false });
    await interaction.reply({ content: '🔒 Canal **trancado**. Membros não podem mais enviar mensagens.' });
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Erro ao trancar canal:`, err);
    await interaction.reply({ content: '❌ Erro ao trancar o canal.', ephemeral: true });
  }
}

async function handleUnlock(interaction) {
  if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
    await interaction.reply({ content: '❌ Apenas administradores podem usar este comando.', ephemeral: true });
    return;
  }
  try {
    await interaction.channel.permissionOverwrites.edit(interaction.guild.id, { SendMessages: null });
    await interaction.reply({ content: '🔓 Canal **destrancado**. Membros podem enviar mensagens novamente.' });
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Erro ao destrancar canal:`, err);
    await interaction.reply({ content: '❌ Erro ao destrancar o canal.', ephemeral: true });
  }
}

// ─── SLOWMODE ────────────────────────────────────────────────────────────────

async function handleSlowmode(interaction) {
  if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
    await interaction.reply({ content: '❌ Apenas administradores podem usar este comando.', ephemeral: true });
    return;
  }
  const segundos = interaction.options.getInteger('segundos');
  try {
    await interaction.channel.setRateLimitPerUser(segundos);
    const msg = segundos === 0 ? '✅ Modo lento **desativado**.' : `✅ Modo lento definido para **${segundos} segundo(s)**.`;
    await interaction.reply({ content: msg });
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Erro ao definir slowmode:`, err);
    await interaction.reply({ content: '❌ Erro ao definir o modo lento.', ephemeral: true });
  }
}

// ─── CARGO ───────────────────────────────────────────────────────────────────

async function handleCargo(interaction) {
  if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
    await interaction.reply({ content: '❌ Apenas administradores podem usar este comando.', ephemeral: true });
    return;
  }
  const alvo  = interaction.options.getMember('usuario');
  const cargo = interaction.options.getRole('cargo');
  if (!alvo) { await interaction.reply({ content: '❌ Usuário não encontrado.', ephemeral: true }); return; }
  if (cargo.managed || cargo.id === interaction.guild.id) { await interaction.reply({ content: '❌ Este cargo não pode ser gerenciado pelo bot.', ephemeral: true }); return; }
  try {
    const temCargo = alvo.roles.cache.has(cargo.id);
    if (temCargo) {
      await alvo.roles.remove(cargo);
      await interaction.reply({ content: `✅ Cargo <@&${cargo.id}> **removido** de <@${alvo.id}>.` });
    } else {
      await alvo.roles.add(cargo);
      await interaction.reply({ content: `✅ Cargo <@&${cargo.id}> **adicionado** a <@${alvo.id}>.` });
    }
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Erro ao gerenciar cargo:`, err);
    await interaction.reply({ content: '❌ Erro ao gerenciar o cargo. Verifique se meu cargo está acima do cargo selecionado.', ephemeral: true });
  }
}

// ─── AVISAR ──────────────────────────────────────────────────────────────────

async function handleAvisar(interaction) {
  if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
    await interaction.reply({ content: '❌ Apenas administradores podem usar este comando.', ephemeral: true });
    return;
  }
  const alvo     = interaction.options.getMember('usuario');
  const mensagem = interaction.options.getString('mensagem');
  if (!alvo) { await interaction.reply({ content: '❌ Usuário não encontrado.', ephemeral: true }); return; }
  try {
    await alvo.send(dmEmbed('📢 Mensagem da Staff',
      `🏠 **Servidor:** ${interaction.guild.name}\n\n${mensagem}\n\n-# Enviado por ${interaction.user.tag}`,
      0x3498DB));
    await interaction.reply({ content: `✅ Mensagem enviada para <@${alvo.id}> via DM.`, ephemeral: true });
  } catch {
    await interaction.reply({ content: '❌ Não foi possível enviar a DM. O membro pode ter as DMs fechadas.', ephemeral: true });
  }
}

module.exports = {
  handleClear,
  handleBanir,
  handleKick,
  handleMute,
  handleWarn,
  handleWarnTipoBtn,
  handleWarnModal,
  handleWarns,
  handleRemovewarn,
  handleUserinfo,
  handleLock,
  handleUnlock,
  handleSlowmode,
  handleCargo,
  handleAvisar,
};
