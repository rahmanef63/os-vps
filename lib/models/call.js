// Optional convenience caller. The core hands back a ResolvedModel descriptor; if you'd
// rather use the Vercel AI SDK / your own client, ignore this file. Two wire protocols cover
// nearly everything (openclaw's insight): openai-completions + anthropic-messages.

/**
 * @param {import('./resolve.js').ResolvedModel} resolved
 * @param {{messages:Array<{role:string,content:any}>, [k:string]:any}} body
 */
export async function chat(resolved, { messages, ...rest }) {
  if (resolved.protocol === 'anthropic') {
    const res = await fetch(`${resolved.baseUrl}/v1/messages`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': resolved.apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: resolved.model, max_tokens: rest.max_tokens ?? 1024, messages, ...rest }),
    })
    if (!res.ok) throw new Error(`anthropic HTTP ${res.status}: ${await res.text()}`)
    return res.json()
  }
  const res = await fetch(`${resolved.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${resolved.apiKey}` },
    body: JSON.stringify({ model: resolved.model, messages, ...rest }),
  })
  if (!res.ok) throw new Error(`${resolved.provider} HTTP ${res.status}: ${await res.text()}`)
  return res.json()
}
