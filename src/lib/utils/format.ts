export function formatMoney(value: number, currency: string = 'ARS') {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency }).format(value);
}