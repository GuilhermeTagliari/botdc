const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');

function dmEmbed(titulo, conteudo, cor = 0x5865F2) {
  return {
    components: [
      new ContainerBuilder()
        .setAccentColor(cor)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${titulo}\n\n${conteudo}`)),
    ],
    flags: MessageFlags.IsComponentsV2,
  };
}

module.exports = { dmEmbed };
