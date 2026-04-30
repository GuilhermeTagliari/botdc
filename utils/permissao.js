const { PermissionFlagsBits } = require('discord.js');

function temPermissao(member, cargosPermitidos = []) {
  if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;
  return member.roles.cache.some((r) => cargosPermitidos.includes(r.id));
}

module.exports = { temPermissao };
