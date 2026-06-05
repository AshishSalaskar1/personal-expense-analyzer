export const LONG_IDENTIFIER_RE = /\b(?:[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}|[A-Za-z]{2,8}[A-Fa-f0-9]{14,}|[A-Fa-f0-9]{18,})\b/g

export function compactIdentifier(token) {
  const compact = token.replaceAll('-', '')
  return `*${compact.slice(0, 6)}…${compact.slice(-4)}`
}

export function compactLongIdentifiers(value) {
  return String(value || '—').replace(LONG_IDENTIFIER_RE, (token) => compactIdentifier(token))
}
