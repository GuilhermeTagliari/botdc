const {
  PermissionFlagsBits,
  ContainerBuilder,
  SectionBuilder,
  TextDisplayBuilder,
  ThumbnailBuilder,
  SeparatorBuilder,
  MessageFlags,
} = require('discord.js');
const config = require('../config');
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
    await alvo.send(`🔨 Você foi **banido** do servidor **${interaction.guild.name}**.\n**Motivo:** ${motivo}\n**Moderador:** ${interaction.user.tag}`).catch(() => {});
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
    await alvo.send(`👢 Você foi **kickado** do servidor **${interaction.guild.name}**.\n**Motivo:** ${motivo}\n**Moderador:** ${interaction.user.tag}`).catch(() => {});
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
    await alvo.send(`🔇 Você foi **silenciado** no servidor **${interaction.guild.name}** por **${horas}**.\n**Motivo:** ${motivo}\n**Moderador:** ${interaction.user.tag}`).catch(() => {});

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

  const alvo   = interaction.options.getMember('usuario');
  const motivo = interaction.options.getString('motivo');

  if (!alvo) { await interaction.reply({ content: '❌ Usuário não encontrado.', ephemeral: true }); return; }

  const dados = lerWarns();
  if (!dados[alvo.id]) dados[alvo.id] = [];

  dados[alvo.id].push({
    motivo,
    moderador: interaction.user.id,
    moderadorTag: interaction.user.tag,
    data: new Date().toISOString(),
  });
  salvarWarns(dados);

  const total = dados[alvo.id].length;

  await alvo.send(
    `⚠️ Você recebeu uma **advertência** no servidor **${interaction.guild.name}**.\n**Motivo:** ${motivo}\n**Moderador:** ${interaction.user.tag}\n**Total de advertências:** ${total}`,
  ).catch(() => {});

  const container = new ContainerBuilder()
    .setAccentColor(0xFEE75C)
    .addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `## ⚠️ Advertência Registrada\n\n` +
            `👤 **Membro:** ${alvo.user.tag} (<@${alvo.id}>)\n` +
            `🛡️ **Moderador:** <@${interaction.user.id}>\n` +
            `📊 **Total de warns:** **${total}**\n` +
            `📋 **Motivo:** ${motivo}\n\n` +
            TS(),
          ),
        )
        .setThumbnailAccessory(new ThumbnailBuilder().setURL(alvo.user.displayAvatarURL({ dynamic: true }))),
    );

  await interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });

  if (config.CANAL_WARNS) {
    try {
      const canal = await interaction.guild.channels.fetch(config.CANAL_WARNS);
      await canal.send({ components: [container], flags: MessageFlags.IsComponentsV2 });
    } catch {}
  }
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
    return `**${i + 1}.** ${w.motivo}\n> por <@${w.moderador}> em ${data}`;
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
    await alvo.send(`📢 **Mensagem da Staff — ${interaction.guild.name}:**\n\n${mensagem}\n\n*Enviado por: ${interaction.user.tag}*`);
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
  handleWarns,
  handleRemovewarn,
  handleUserinfo,
  handleLock,
  handleUnlock,
  handleSlowmode,
  handleCargo,
  handleAvisar,
};
