require('dotenv').config();
const fs   = require('fs');
const path = require('path');

function parseIds(env) {
  return env ? env.split(',').map((s) => s.trim()).filter(Boolean) : [];
}

const ARQUIVO = path.join(__dirname, 'data/botconfig.json');

function lerArquivo() {
  try { return JSON.parse(fs.readFileSync(ARQUIVO, 'utf8')); } catch { return {}; }
}

const config = {
  CANAL_RECRUTAMENTO:    process.env.CANAL_RECRUTAMENTO,
  CANAL_APROVACAO:       process.env.CANAL_APROVACAO,
  CARGO_APROVADO:        process.env.CARGO_APROVADO,

  CANAL_ESCALACAO:         process.env.CANAL_ESCALACAO,
  CANAL_CONTROLE:          process.env.CANAL_CONTROLE,
  CANAL_CRIAR_ESCALACAO:   process.env.CANAL_CRIAR_ESCALACAO,

  CANAL_FARM_BTN:       process.env.CANAL_FARM_BTN,
  CATEGORIA_FARM:       process.env.CATEGORIA_FARM,
  CARGOS_FARM_ADM:      parseIds(process.env.CARGOS_FARM_ADM),
  CATEGORIA_FARM_ADM:   process.env.CATEGORIA_FARM_ADM,
  CARGO_FARM_APROVAR:   process.env.CARGO_FARM_APROVAR || '1497039755639128152',

  CARGO_AUSENCIA:           process.env.CARGO_AUSENCIA,
  CANAL_AUSENCIA_BTN:       process.env.CANAL_AUSENCIA_BTN,
  CANAL_AUSENCIA_APROVACAO: process.env.CANAL_AUSENCIA_APROVACAO,
  CANAL_AUSENCIA_ATIVA:     process.env.CANAL_AUSENCIA_ATIVA,

  CANAL_VENDA_BTN:       process.env.CANAL_VENDA_BTN,
  CATEGORIA_VENDA:       process.env.CATEGORIA_VENDA,

  CANAL_ARMAS_BTN:       process.env.CANAL_ARMAS_BTN,
  CANAL_ARMAS_LOG:       process.env.CANAL_ARMAS_LOG,

  CANAL_CODIGUINHO_BTN:  process.env.CANAL_CODIGUINHO_BTN,
  CANAL_CODIGUINHO_LOG:  process.env.CANAL_CODIGUINHO_LOG,
  CARGOS_CODIGUINHO_ADM: parseIds(process.env.CARGOS_CODIGUINHO_ADM),

  CANAL_RANKING:         process.env.CANAL_RANKING,

  CANAL_TICKET_BTN:    process.env.CANAL_TICKET_BTN,
  CATEGORIA_TICKET:    process.env.CATEGORIA_TICKET,

  CANAL_LOG_ENTRADA:    process.env.CANAL_LOG_ENTRADA,
  CANAL_LOG_SAIDA:      process.env.CANAL_LOG_SAIDA,
  CANAL_LOG_ATUALIZACAO: process.env.CANAL_LOG_ATUALIZACAO,
  CANAL_LOG_VOZ:        process.env.CANAL_LOG_VOZ,
  CANAL_WARNS:          process.env.CANAL_WARNS,

  CARGOS_APROVACAO:  parseIds(process.env.CARGOS_APROVACAO),
  CARGOS_ESCALACAO:  parseIds(process.env.CARGOS_ESCALACAO),

  CARGO_WARN_1: process.env.CARGO_WARN_1,
  CARGO_WARN_2: process.env.CARGO_WARN_2,
  CARGO_WARN_3: process.env.CARGO_WARN_3,
  CARGO_WARN_4: process.env.CARGO_WARN_4,

  CARGO_HIER_1:  process.env.CARGO_HIER_1,
  CARGO_HIER_2:  process.env.CARGO_HIER_2,
  CARGO_HIER_3:  process.env.CARGO_HIER_3,
  CARGO_HIER_4:  process.env.CARGO_HIER_4,
  CARGO_HIER_5:  process.env.CARGO_HIER_5,
  CARGO_HIER_6:  process.env.CARGO_HIER_6,
  CARGO_HIER_7:  process.env.CARGO_HIER_7,
  CARGO_HIER_8:  process.env.CARGO_HIER_8,
  CARGO_HIER_9:  process.env.CARGO_HIER_9,
  CARGO_HIER_10: process.env.CARGO_HIER_10,

  ACOES_PREDEFINIDAS: [],
};

function carregarConfig() {
  const saved = lerArquivo();
  for (const [k, v] of Object.entries(saved)) {
    if (v !== null && v !== undefined) config[k] = v;
  }
}

function salvarConfig(updates) {
  const saved = lerArquivo();
  const novo  = { ...saved, ...updates };
  fs.writeFileSync(ARQUIVO, JSON.stringify(novo, null, 2));
  for (const [k, v] of Object.entries(updates)) config[k] = v;
}

carregarConfig();

module.exports = config;
module.exports.salvarConfig   = salvarConfig;
module.exports.carregarConfig = carregarConfig;
