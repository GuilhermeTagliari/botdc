const {
  AuditLogEvent,
  ContainerBuilder,
  SectionBuilder,
  TextDisplayBuilder,
  ThumbnailBuilder,
  MessageFlags,
} = require('discord.js');
const config = require('../config');

const convitesCache = new Map();
const pendingLeaves = new Map();

// ─── Utilitários ────────────────────────────────────────────

async function enviarLog(guild, canalId, container) {
  if (!canalId) return;
  try {
    const canal = await guild.channels.fetch(canalId);
    await canal.send({ components: [container], flags: MessageFlags.IsComponentsV2 });
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

  const container = new ContainerBuilder()
    .setAccentColor(0x57F287)
    .addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `## 📥  Novo Membro\n\n` +
            `${member} entrou no servidor!\n\n` +
            `👤 **Usuário:** \`${member.user.tag}\`  ·  🆔 **ID:** \`${member.user.id}\`\n` +
            `📅 **Conta criada:** <t:${Math.floor(member.user.createdTimestamp / 1000)}:R>\n` +
            `👥 **Total membros:** **${member.guild.memberCount}**\n` +
            `🔗 **Convidado por:** ${conviteInfo}\n\n` +
            `-# ID ${member.user.id}`,
          ),
        )
        .setThumbnailAccessory(new ThumbnailBuilder().setURL(member.user.displayAvatarURL({ dynamic: true }))),
    );

  await enviarLog(member.guild, config.CANAL_LOG_ENTRADA, container);
}

// ─── Saída (voluntária) ──────────────────────────────────────

async function registrarSaida(member) {
  const timer = setTimeout(async () => {
    pendingLeaves.delete(member.id);

    const cargos = member.roles.cache
      .filter((r) => r.id !== member.guild.id)
      .map((r) => r.toString())
      .join('\n') || '`Nenhum`';

    const container = new ContainerBuilder()
      .setAccentColor(0x99AAB5)
      .addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `## 📤  Membro Saiu\n\n` +
              `**${member.user.tag}** saiu do servidor.\n\n` +
              `👤 **Usuário:** \`${member.user.tag}\`  ·  🆔 **ID:** \`${member.user.id}\`\n` +
              `📅 **Entrou em:** ${member.joinedTimestamp ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : '`Desconhecido`'}\n` +
              `👥 **Total membros:** **${member.guild.memberCount}**\n` +
              `🎭 **Cargos:**\n${cargos}\n\n` +
              `-# ID ${member.user.id}`,
            ),
          )
          .setThumbnailAccessory(new ThumbnailBuilder().setURL(member.user.displayAvatarURL({ dynamic: true }))),
      );

    await enviarLog(member.guild, config.CANAL_LOG_SAIDA, container);
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

    const container = new ContainerBuilder()
      .setAccentColor(0xFEE75C)
      .addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `## 👢  Membro Kickado\n\n` +
              `**${member.user.tag}** foi expulso do servidor.\n\n` +
              `👤 **Membro:** \`${member.user.tag}\`  ·  🆔 **ID:** \`${member.user.id}\`\n` +
              `🛡️ **Expulso por:** ${executor ? `<@${executor.id}>` : '`Desconhecido`'}\n` +
              `📅 **Entrou em:** ${member.joinedTimestamp ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : '`Desconhecido`'}\n` +
              `📝 **Motivo:** ${reason ? `\`${reason}\`` : '`Nenhum informado`'}\n` +
              `🎭 **Cargos:**\n${cargos}\n\n` +
              `-# ID ${member.user.id}`,
            ),
          )
          .setThumbnailAccessory(new ThumbnailBuilder().setURL(member.user.displayAvatarURL({ dynamic: true }))),
      );

    await enviarLog(guild, config.CANAL_LOG_SAIDA, container);
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

    const nomeTag = member?.user.tag ?? target.tag ?? target.id;
    const avatarURL = member?.user.displayAvatarURL({ dynamic: true }) ?? null;

    let texto =
      `## 🔨  Membro Banido\n\n` +
      `**${nomeTag}** foi banido do servidor.\n\n` +
      `👤 **Membro:** \`${nomeTag}\`  ·  🆔 **ID:** \`${target.id}\`\n` +
      `🔨 **Banido por:** ${executor ? `<@${executor.id}>` : '`Desconhecido`'}\n` +
      `📝 **Motivo:** ${reason ? `\`${reason}\`` : '`Nenhum informado`'}`;

    if (member) {
      texto +=
        `\n📅 **Entrou em:** ${member.joinedTimestamp ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : '`Desconhecido`'}\n` +
        `🎭 **Cargos:**\n${cargos}`;
    }

    texto += `\n\n-# ID ${target.id}`;

    const section = new SectionBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(texto));

    if (avatarURL) section.setThumbnailAccessory(new ThumbnailBuilder().setURL(avatarURL));

    const container = new ContainerBuilder()
      .setAccentColor(0xED4245)
      .addSectionComponents(section);

    await enviarLog(guild, config.CANAL_LOG_SAIDA, container);
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

    const container = new ContainerBuilder()
      .setAccentColor(0xFEE75C)
      .addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `## ✏️  Apelido Alterado\n\n` +
              `O apelido de ${member} foi alterado.\n\n` +
              `👤 **Membro:** \`${member.user.tag}\`  ·  🔄 **Alterado por:** ${quem}\n` +
              `📝 **Antes:** ${antes}\n` +
              `✅ **Depois:** ${depois}\n\n` +
              `-# ID ${target.id}`,
            ),
          )
          .setThumbnailAccessory(new ThumbnailBuilder().setURL(member.user.displayAvatarURL({ dynamic: true }))),
      );

    await enviarLog(guild, config.CANAL_LOG_ATUALIZACAO, container);
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
    if (removidos.length > 0   && adicionados.length === 0) { cor = 0xED4245; title = '🔴  Cargo Removido'; }

    let texto =
      `## ${title}\n\n` +
      `Os cargos de ${member} foram alterados.\n\n` +
      `👤 **Membro:** \`${member.user.tag}\`  ·  🔄 **Alterado por:** ${executor ? `<@${executor.id}>` : '`Desconhecido`'}`;

    if (adicionados.length > 0) texto += `\n➕ **Adicionados:** ${adicionados.join(', ')}`;
    if (removidos.length > 0)   texto += `\n➖ **Removidos:** ${removidos.join(', ')}`;
    texto += `\n\n-# ID ${target.id}`;

    const container = new ContainerBuilder()
      .setAccentColor(cor)
      .addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(texto))
          .setThumbnailAccessory(new ThumbnailBuilder().setURL(member.user.displayAvatarURL({ dynamic: true }))),
      );

    await enviarLog(guild, config.CANAL_LOG_ATUALIZACAO, container);
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
