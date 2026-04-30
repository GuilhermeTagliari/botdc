const { EmbedBuilder, AuditLogEvent } = require('discord.js');
const config = require('../config');

const convitesCache = new Map();
const pendingLeaves = new Map(); // userId → { member, timer }

// ─── Utilitários ────────────────────────────────────────────

async function enviarLog(guild, canalId, embed) {
  if (!canalId) return;
  try {
    const canal = await guild.channels.fetch(canalId);
    await canal.send({ embeds: [embed] });
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Erro ao enviar log:`, err);
  }
}

// ─── Convites ───────────────────────────────────────────────

async function carregarConvites(guild) {
  try {
    const convites = await guild.invites.fetch();
    convitesCache.set(guild.id, new Map(convites.map((inv) => [inv.code, inv.uses])));
  } catch {}
}

function handleInviteCreate(invite) {
  const cache = convitesCache.get(invite.guild.id) || new Map();
  cache.set(invite.code, invite.uses ?? 0);
  convitesCache.set(invite.guild.id, cache);
}

function handleInviteDelete(invite) {
  const cache = convitesCache.get(invite.guild?.id);
  if (cache) cache.delete(invite.code);
}

// ─── Entrada ────────────────────────────────────────────────

async function logEntrada(member) {
  let conviteInfo = '`Não identificado`';

  try {
    const antes = convitesCache.get(member.guild.id) || new Map();
    const agora = await member.guild.invites.fetch();

    for (const [, inv] of agora) {
      if (inv.uses > (antes.get(inv.code) ?? 0)) {
        conviteInfo = inv.inviter ? `<@${inv.inviter.id}> — \`${inv.code}\`` : `\`${inv.code}\``;
        break;
      }
    }

    convitesCache.set(member.guild.id, new Map(agora.map((inv) => [inv.code, inv.uses])));
  } catch {}

  const embed = new EmbedBuilder()
    .setTitle('📥  Novo Membro')
    .setColor(0x57F287)
    .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
    .setDescription(`${member} entrou no servidor!`)
    .addFields(
      { name: '👤 Usuário',       value: `\`${member.user.tag}\``,                                               inline: true  },
      { name: '🆔 ID',            value: `\`${member.user.id}\``,                                                inline: true  },
      { name: '📅 Conta criada',  value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`,             inline: true  },
      { name: '👥 Total membros', value: `**${member.guild.memberCount}**`,                                      inline: true  },
      { name: '🔗 Convidado por', value: conviteInfo,                                                            inline: false },
    )
    .setFooter({ text: `ID ${member.user.id}` })
    .setTimestamp();

  await enviarLog(member.guild, config.CANAL_LOG_ENTRADA, embed);
}

// ─── Saída (voluntária — timer cancelado se kick/ban chegar via audit log) ──

async function registrarSaida(member) {
  const timer = setTimeout(async () => {
    pendingLeaves.delete(member.id);

    const cargos = member.roles.cache
      .filter((r) => r.id !== member.guild.id)
      .map((r) => r.toString())
      .join('\n') || '`Nenhum`';

    const embed = new EmbedBuilder()
      .setTitle('📤  Membro Saiu')
      .setColor(0x99AAB5)
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
      .setDescription(`**${member.user.tag}** saiu do servidor.`)
      .addFields(
        { name: '👤 Usuário',       value: `\`${member.user.tag}\``,                                                                                   inline: true  },
        { name: '🆔 ID',            value: `\`${member.user.id}\``,                                                                                    inline: true  },
        { name: '📅 Entrou em',     value: member.joinedTimestamp ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : '`Desconhecido`',            inline: true  },
        { name: '👥 Total membros', value: `**${member.guild.memberCount}**`,                                                                          inline: true  },
        { name: '🎭 Cargos',        value: cargos,                                                                                                     inline: false },
      )
      .setFooter({ text: `ID ${member.user.id}` })
      .setTimestamp();

    await enviarLog(member.guild, config.CANAL_LOG_SAIDA, embed);
  }, 4000);

  pendingLeaves.set(member.id, { member, timer });
}

// ─── Audit Log em tempo real ─────────────────────────────────

async function handleAuditEntry(entry, guild) {
  const { action, target, executor, changes, reason } = entry;

  // ── Kick ──
  if (action === AuditLogEvent.MemberKick) {
    const pending = pendingLeaves.get(target.id);
    if (!pending) return;
    clearTimeout(pending.timer);
    pendingLeaves.delete(target.id);

    const { member } = pending;
    const cargos = member.roles.cache
      .filter((r) => r.id !== guild.id)
      .map((r) => r.toString())
      .join('\n') || '`Nenhum`';

    const embed = new EmbedBuilder()
      .setTitle('👢  Membro Kickado')
      .setColor(0xFEE75C)
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
      .setDescription(`**${member.user.tag}** foi expulso do servidor.`)
      .addFields(
        { name: '👤 Membro',        value: `\`${member.user.tag}\``,                                                                                   inline: true  },
        { name: '🆔 ID',            value: `\`${member.user.id}\``,                                                                                    inline: true  },
        { name: '🛡️ Expulso por',  value: executor ? `<@${executor.id}>` : '`Desconhecido`',                                                          inline: true  },
        { name: '📅 Entrou em',     value: member.joinedTimestamp ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : '`Desconhecido`',            inline: true  },
        { name: '📝 Motivo',        value: reason ? `\`${reason}\`` : '`Nenhum informado`',                                                            inline: false },
        { name: '🎭 Cargos',        value: cargos,                                                                                                     inline: false },
      )
      .setFooter({ text: `ID ${member.user.id}` })
      .setTimestamp();

    await enviarLog(guild, config.CANAL_LOG_SAIDA, embed);
    return;
  }

  // ── Ban ──
  if (action === AuditLogEvent.MemberBanAdd) {
    const pending = pendingLeaves.get(target.id);
    if (pending) { clearTimeout(pending.timer); pendingLeaves.delete(target.id); }

    const member = pending?.member;
    const cargos = member?.roles.cache
      .filter((r) => r.id !== guild.id)
      .map((r) => r.toString())
      .join('\n') || '`Nenhum`';

    const embed = new EmbedBuilder()
      .setTitle('🔨  Membro Banido')
      .setColor(0xED4245)
      .setThumbnail(member?.user.displayAvatarURL({ dynamic: true }) || null)
      .setDescription(`**${member?.user.tag ?? target.tag ?? target.id}** foi banido do servidor.`)
      .addFields(
        { name: '👤 Membro',       value: `\`${member?.user.tag ?? target.tag ?? target.id}\``,                                                                  inline: true  },
        { name: '🆔 ID',           value: `\`${target.id}\``,                                                                                                    inline: true  },
        { name: '🔨 Banido por',   value: executor ? `<@${executor.id}>` : '`Desconhecido`',                                                                     inline: true  },
        { name: '📝 Motivo',       value: reason ? `\`${reason}\`` : '`Nenhum informado`',                                                                       inline: false },
      );

    if (member) {
      embed.addFields(
        { name: '📅 Entrou em', value: member.joinedTimestamp ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : '`Desconhecido`', inline: true },
        { name: '🎭 Cargos',   value: cargos, inline: false },
      );
    }

    embed.setFooter({ text: `ID ${target.id}` }).setTimestamp();
    await enviarLog(guild, config.CANAL_LOG_SAIDA, embed);
    return;
  }

  // ── Apelido ──
  if (action === AuditLogEvent.MemberUpdate) {
    const nickChange = changes?.find((c) => c.key === 'nick');
    if (!nickChange) return;

    let member;
    try { member = await guild.members.fetch(target.id); } catch { return; }

    const antes  = nickChange.old ? `\`${nickChange.old}\`` : '`(sem apelido)`';
    const depois = nickChange.new ? `\`${nickChange.new}\`` : '`(sem apelido)`';
    const quem   = executor?.id === target.id ? '`O próprio membro`' : executor ? `<@${executor.id}>` : '`Desconhecido`';

    const embed = new EmbedBuilder()
      .setTitle('✏️  Apelido Alterado')
      .setColor(0xFEE75C)
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
      .setDescription(`O apelido de ${member} foi alterado.`)
      .addFields(
        { name: '👤 Membro',       value: `\`${member.user.tag}\``, inline: true },
        { name: '🔄 Alterado por', value: quem,                     inline: true },
        { name: '📝 Antes',        value: antes,                    inline: true },
        { name: '✅ Depois',       value: depois,                   inline: true },
      )
      .setFooter({ text: `ID ${target.id}` })
      .setTimestamp();

    await enviarLog(guild, config.CANAL_LOG_ATUALIZACAO, embed);
    return;
  }

  // ── Cargos ──
  if (action === AuditLogEvent.MemberRoleUpdate) {
    const adicionados = (changes.find((c) => c.key === '$add')?.new  ?? []).map((r) => `<@&${r.id}>`);
    const removidos   = (changes.find((c) => c.key === '$remove')?.new ?? []).map((r) => `<@&${r.id}>`);
    if (adicionados.length === 0 && removidos.length === 0) return;

    let member;
    try { member = await guild.members.fetch(target.id); } catch { return; }

    let cor   = 0x5865F2;
    let title = '🔧  Cargos Atualizados';
    if (adicionados.length > 0 && removidos.length === 0) { cor = 0x57F287; title = '🟢  Cargo Adicionado'; }
    if (removidos.length > 0   && adicionados.length === 0) { cor = 0xED4245; title = '🔴  Cargo Removido';   }

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setColor(cor)
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
      .setDescription(`Os cargos de ${member} foram alterados.`)
      .addFields(
        { name: '👤 Membro',       value: `\`${member.user.tag}\``,                              inline: true },
        { name: '🔄 Alterado por', value: executor ? `<@${executor.id}>` : '`Desconhecido`',     inline: true },
      );

    if (adicionados.length > 0) embed.addFields({ name: '➕ Adicionados', value: adicionados.join('\n'), inline: false });
    if (removidos.length > 0)   embed.addFields({ name: '➖ Removidos',   value: removidos.join('\n'),   inline: false });

    embed.setFooter({ text: `ID ${target.id}` }).setTimestamp();
    await enviarLog(guild, config.CANAL_LOG_ATUALIZACAO, embed);
    return;
  }
}

module.exports = {
  logEntrada,
  registrarSaida,
  handleAuditEntry,
  carregarConvites,
  handleInviteCreate,
  handleInviteDelete,
};
