export const CHART_PALETTES = {
  cred: {
    name: 'Material Blue',
    swatches: ['#1976D2', '#2E7D32', '#ED6C02', '#9C27B0', '#D32F2F', '#0288D1', '#7B1FA2', '#00796B'],
    spend: '#ED6C02',
    spendStroke: '#A14000',
    credit: '#2E7D32',
    creditStroke: '#1B5E20',
    net: '#1976D2',
    netStroke: '#0D47A1',
  },
  coastal: {
    name: 'Material Teal',
    swatches: ['#00897B', '#3949AB', '#F57C00', '#8E24AA', '#C62828', '#039BE5', '#689F38', '#5E35B1'],
    spend: '#F57C00',
    spendStroke: '#E65100',
    credit: '#00897B',
    creditStroke: '#00695C',
    net: '#3949AB',
    netStroke: '#283593',
  },
  vivid: {
    name: 'Material Tonal',
    swatches: ['#6750A4', '#006A6A', '#B3261E', '#B45D00', '#386A20', '#0061A4', '#7D5260', '#4E5F7D'],
    spend: '#B45D00',
    spendStroke: '#7A3D00',
    credit: '#386A20',
    creditStroke: '#1B5E20',
    net: '#6750A4',
    netStroke: '#4F378B',
  },
  mono: {
    name: 'Material Neutral',
    swatches: ['#455A64', '#1976D2', '#388E3C', '#F57C00', '#7B1FA2', '#C2185B', '#0097A7', '#5D4037'],
    spend: '#455A64',
    spendStroke: '#263238',
    credit: '#388E3C',
    creditStroke: '#1B5E20',
    net: '#1976D2',
    netStroke: '#0D47A1',
  },
}

export const DEFAULT_CHART_PALETTE = 'cred'

export function getChartPalette(key = DEFAULT_CHART_PALETTE) {
  return CHART_PALETTES[key] || CHART_PALETTES[DEFAULT_CHART_PALETTE]
}
