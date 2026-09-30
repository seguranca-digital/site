// Id aleatório para cards, categorias e fotos.
// randomUUID só existe em contexto seguro (https ou localhost); no celular pela rede local, usa o reserva.
export function randomId(prefix: string): string {
  const random =
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
  return `${prefix}-${random}`
}
