// textos.js — textos customizáveis dos formulários (modais) e botões de ação.
// Os valores ficam em config.TEXTOS (persistido junto com o resto da config).
// Use txt('chave', 'padrão') ao montar labels/títulos/botões.
const config = require('./config');

const REGISTRO = {
  recrutamento: {
    nome: 'Recrutamento', emoji: '📋',
    grupos: [
      { id: 'recrut_form', titulo: 'Recrutamento · Formulário', itens: [
        { chave: 'recrut.titulo', label: 'Título do formulário', padrao: 'Ficha de Recrutamento' },
        { chave: 'recrut.nome',   label: 'Label: Nome',          padrao: 'Nome completo' },
        { chave: 'recrut.id',     label: 'Label: ID',            padrao: 'ID (somente números)' },
        { chave: 'recrut.ingame', label: 'Label: Número in game', padrao: 'Número in game' },
      ]},
      { id: 'recrut_btn', titulo: 'Recrutamento · Botões', itens: [
        { chave: 'recrut.btn_aprovar',  label: 'Botão Aprovar',  padrao: '✅ Aprovar' },
        { chave: 'recrut.btn_reprovar', label: 'Botão Reprovar', padrao: '❌ Reprovar' },
      ]},
    ],
  },
  escalacao: {
    nome: 'Escalação', emoji: '⚔️',
    grupos: [
      { id: 'esc_form', titulo: 'Escalação · Formulário', itens: [
        { chave: 'esc.titulo', label: 'Título do formulário', padrao: 'Criar Escalação' },
        { chave: 'esc.acao',   label: 'Label: Nome da ação',  padrao: 'Nome da Ação' },
        { chave: 'esc.qtd',    label: 'Label: Quantidade',    padrao: 'Quantidade de pessoas (somente números)' },
        { chave: 'esc.radio',  label: 'Label: Rádio',         padrao: 'Frequência de Rádio (opcional)' },
      ]},
      { id: 'esc_btn1', titulo: 'Escalação · Botões (ação)', itens: [
        { chave: 'esc.btn_participar', label: 'Botão Participar', padrao: '✅ Participar' },
        { chave: 'esc.btn_sair',       label: 'Botão Sair',       padrao: '❌ Sair' },
        { chave: 'esc.btn_remover',    label: 'Botão Remover',    padrao: '🗑️ Remover Membro' },
        { chave: 'esc.btn_fechar',     label: 'Botão Fechar',     padrao: '🔒 Fechar Ação' },
      ]},
      { id: 'esc_btn2', titulo: 'Escalação · Botões (resultado)', itens: [
        { chave: 'esc.btn_vitoria', label: 'Botão Vitória', padrao: '🏆 Vitória' },
        { chave: 'esc.btn_derrota', label: 'Botão Derrota', padrao: '💀 Derrota' },
        { chave: 'esc.btn_reabrir', label: 'Botão Reabrir', padrao: '🔓 Reabrir Ação' },
      ]},
    ],
  },
  farm: {
    nome: 'Farm', emoji: '🌾',
    grupos: [
      { id: 'farm_form', titulo: 'Farm · Formulário', itens: [
        { chave: 'farm.titulo',  label: 'Título do formulário', padrao: 'Registrar Farm' },
        { chave: 'farm.qtd',     label: 'Label: Quantidade',    padrao: 'Quantidade de farm' },
        { chave: 'farm.horario', label: 'Label: Horário',       padrao: 'Horário do depósito do farm' },
        { chave: 'farm.foto',    label: 'Label: Foto',          padrao: 'Link da foto (opcional)' },
      ]},
      { id: 'farm_btn', titulo: 'Farm · Botões', itens: [
        { chave: 'farm.btn_registrar', label: 'Botão Registrar', padrao: '🌾 Registrar Farm' },
        { chave: 'farm.btn_aprovar',   label: 'Botão Aprovar',   padrao: '✅ Aprovar' },
        { chave: 'farm.btn_reprovar',  label: 'Botão Reprovar',  padrao: '❌ Reprovar' },
      ]},
    ],
  },
  venda: {
    nome: 'Vendas', emoji: '💰',
    grupos: [
      { id: 'venda_form', titulo: 'Vendas · Formulário', itens: [
        { chave: 'venda.titulo',   label: 'Título do formulário', padrao: 'Registrar Venda' },
        { chave: 'venda.fac',      label: 'Label: Facção',        padrao: 'Nome da facção' },
        { chave: 'venda.produto',  label: 'Label: Produto',       padrao: 'O que vendeu' },
        { chave: 'venda.qtd',      label: 'Label: Quantidade',    padrao: 'Quantidade' },
        { chave: 'venda.valor',    label: 'Label: Valor',         padrao: 'Valor da venda' },
      ]},
      { id: 'venda_form2', titulo: 'Vendas · Formulário (2)', itens: [
        { chave: 'venda.parceria', label: 'Label: Parceria', padrao: 'Foi na parceria? (Sim / Não)' },
      ]},
      { id: 'venda_btn', titulo: 'Vendas · Botões', itens: [
        { chave: 'venda.btn_confirmar', label: 'Botão Confirmar', padrao: '✅ Confirmar' },
        { chave: 'venda.btn_cancelar',  label: 'Botão Cancelar',  padrao: '❌ Cancelar' },
      ]},
    ],
  },
  armas: {
    nome: 'Armas', emoji: '🔫',
    grupos: [
      { id: 'armas_form', titulo: 'Armas · Formulário', itens: [
        { chave: 'armas.titulo', label: 'Título do formulário', padrao: 'Solicitar Armas' },
        { chave: 'armas.arma',   label: 'Label: Arma',          padrao: 'Arma solicitada' },
        { chave: 'armas.muni',   label: 'Label: Munição',       padrao: 'Quantidade de munição' },
      ]},
      { id: 'armas_btn', titulo: 'Armas · Botões', itens: [
        { chave: 'armas.btn_aprovar', label: 'Botão Aprovar', padrao: '✅ Aprovar' },
        { chave: 'armas.btn_recusar', label: 'Botão Recusar', padrao: '❌ Recusar' },
      ]},
    ],
  },
  codiguinho: {
    nome: 'Codiguinho', emoji: '🎟️',
    grupos: [
      { id: 'cod_form', titulo: 'Codiguinho · Formulário', itens: [
        { chave: 'cod.titulo', label: 'Título do formulário', padrao: 'Solicitar Codiguinho 🎟️' },
        { chave: 'cod.nome',   label: 'Label: Nome no jogo',  padrao: 'Seu nome no jogo' },
        { chave: 'cod.qtd',    label: 'Label: Quantidade',    padrao: 'Quantidade desejada' },
      ]},
      { id: 'cod_btn', titulo: 'Codiguinho · Botões', itens: [
        { chave: 'cod.btn_aprovar', label: 'Botão Aprovar', padrao: '✅ Aprovar' },
        { chave: 'cod.btn_recusar', label: 'Botão Recusar', padrao: '❌ Recusar' },
      ]},
    ],
  },
  ausencia: {
    nome: 'Ausência', emoji: '🏖️',
    grupos: [
      { id: 'aus_form', titulo: 'Ausência · Formulário', itens: [
        { chave: 'aus.titulo', label: 'Título do formulário', padrao: 'Solicitar Ausência' },
        { chave: 'aus.dias',   label: 'Label: Dias',          padrao: 'Quantos dias de ausência? (1 a 60)' },
        { chave: 'aus.motivo', label: 'Label: Motivo',        padrao: 'Motivo da ausência' },
      ]},
      { id: 'aus_btn', titulo: 'Ausência · Botões', itens: [
        { chave: 'aus.btn_aprovar',  label: 'Botão Aprovar',  padrao: '✅ Aprovar' },
        { chave: 'aus.btn_reprovar', label: 'Botão Reprovar', padrao: '❌ Reprovar' },
        { chave: 'aus.btn_encerrar', label: 'Botão Encerrar', padrao: '⏹️ Encerrar Ausência' },
      ]},
    ],
  },
};

function txt(chave, padrao) {
  const t = (config && config.TEXTOS) || {};
  const v = t[chave];
  return (typeof v === 'string' && v.trim()) ? v : padrao;
}

function acharGrupo(id) {
  for (const mod of Object.values(REGISTRO)) {
    const g = mod.grupos.find((gr) => gr.id === id);
    if (g) return g;
  }
  return null;
}

module.exports = { REGISTRO, txt, acharGrupo };
