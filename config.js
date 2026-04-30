require('dotenv').config();

function parseIds(env) {
  return env ? env.split(',').map((s) => s.trim()).filter(Boolean) : [];
}

module.exports = {
  CANAL_RECRUTAMENTO: process.env.CANAL_RECRUTAMENTO,
  CANAL_APROVACAO:    process.env.CANAL_APROVACAO,
  CARGO_APROVADO:     process.env.CARGO_APROVADO,
  CANAL_ESCALACAO:         process.env.CANAL_ESCALACAO,
  CANAL_CONTROLE:          process.env.CANAL_CONTROLE,
  CANAL_CRIAR_ESCALACAO:   process.env.CANAL_CRIAR_ESCALACAO,
  CANAL_FARM_BTN:      process.env.CANAL_FARM_BTN,
  CATEGORIA_FARM:      process.env.CATEGORIA_FARM,
  CARGOS_FARM_ADM:     parseIds(process.env.CARGOS_FARM_ADM),
  CATEGORIA_FARM_ADM:  process.env.CATEGORIA_FARM_ADM,

  CANAL_RANKING:       process.env.CANAL_RANKING,
  CANAL_TICKET_BTN:    process.env.CANAL_TICKET_BTN,
  CATEGORIA_TICKET:    process.env.CATEGORIA_TICKET,
  CANAL_LOG_ENTRADA:    process.env.CANAL_LOG_ENTRADA,
  CANAL_LOG_SAIDA:      process.env.CANAL_LOG_SAIDA,
  CANAL_LOG_ATUALIZACAO: process.env.CANAL_LOG_ATUALIZACAO,
  CANAL_WARNS:          process.env.CANAL_WARNS,

  // IDs de cargo separados por vírgula — admins sempre têm acesso independente
  CARGOS_APROVACAO:  parseIds(process.env.CARGOS_APROVACAO),
  CARGOS_ESCALACAO:  parseIds(process.env.CARGOS_ESCALACAO),
};
