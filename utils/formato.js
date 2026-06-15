/**
 * Converte qualquer entrada de valor monetário para o padrão brasileiro.
 * Aceita: "2025000", "2.025.000", "2025000,00", "2.025.000,00", "R$ 2025000", "$2025000", etc.
 * Retorna: "R$ 2.025.000,00"
 */
function formatarValorBR(input) {
  if (!input) return input;

  let str = String(input).replace(/[R$\s]/g, '').trim();

  const hasDot   = str.includes('.');
  const hasComma = str.includes(',');

  if (hasDot && hasComma) {
    if (str.lastIndexOf(',') > str.lastIndexOf('.')) {
      // padrão BR: "2.025.000,00" → remove pontos, troca vírgula por ponto
      str = str.replace(/\./g, '').replace(',', '.');
    } else {
      // padrão EN: "2,025,000.00" → remove vírgulas
      str = str.replace(/,/g, '');
    }
  } else if (hasComma) {
    const partes = str.split(',');
    if (partes.length === 2 && partes[1].length <= 2) {
      // vírgula decimal: "50000,00"
      str = str.replace(',', '.');
    } else {
      // vírgula de milhar: "2,025,000"
      str = str.replace(/,/g, '');
    }
  }
  // sem separador ou só ponto (como "2025000" ou "50000.00") → parseFloat direto

  const num = parseFloat(str);
  if (isNaN(num)) return input;

  return 'R$ ' + num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

module.exports = { formatarValorBR };
