const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4000'

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string; details?: Array<{ field: string; message: string }> }
    let message = body.error ?? `Request failed: ${res.status}`
    if (body.details?.length) {
      message += ': ' + body.details.map(d => `${d.field} — ${d.message}`).join(', ')
    }
    throw new Error(message)
  }
  return res.json() as Promise<T>
}

export { BASE }
