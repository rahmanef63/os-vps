// Model CATALOG — capability + pricing metadata, sourced wholesale from models.dev
// (community DB, free). This is the auto-update mechanism: models.dev updates upstream ->
// our catalog refreshes on next read after TTL. No plugin per vendor, no hardcoded list.
//
// Refresh strategy stolen from hermes (agent/models_dev.py): lazy 4-stage hierarchy
//   1. in-mem cache < TTL          -> return
//   2. disk cache < TTL (by mtime) -> load
//   3. network GET                 -> fetch + persist
//   4. network fail -> serve ANY disk cache (stale) with a shortened retry window
// No background thread. Degrades to offline gracefully.

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join, dirname } from 'node:path'

const URL_MODELS_DEV = 'https://models.dev/api.json'
const TTL_MS = 60 * 60 * 1000 // 1h, same as hermes
const STALE_RETRY_MS = 5 * 60 * 1000
const CACHE_FILE = join(process.env.MODELS_CACHE_DIR || join(homedir(), '.models-rahmanef'), 'catalog.json')

let mem = null // { at:number, data:object }

async function readDisk() {
  try {
    const raw = JSON.parse(await readFile(CACHE_FILE, 'utf8'))
    if (raw && typeof raw.at === 'number' && raw.data) return raw
  } catch { /* no cache yet / corrupt */ }
  return null
}

async function writeDisk(entry) {
  await mkdir(dirname(CACHE_FILE), { recursive: true })
  await writeFile(CACHE_FILE, JSON.stringify(entry))
}

/**
 * @param {{force?:boolean}} [opts]
 * @returns {Promise<Record<string, {models: Record<string, any>}>>} raw models.dev blob keyed by provider id
 */
export async function getCatalog({ force = false } = {}) {
  const now = Date.now()
  if (!force && mem && now - mem.at < TTL_MS) return mem.data
  if (!force) {
    const disk = await readDisk()
    if (disk && now - disk.at < TTL_MS) { mem = disk; return disk.data }
  }
  try {
    const res = await fetch(URL_MODELS_DEV, { signal: AbortSignal.timeout(15000) })
    if (!res.ok) throw new Error(`models.dev HTTP ${res.status}`)
    const data = await res.json()
    mem = { at: now, data }
    writeDisk(mem).catch(() => {})
    return data
  } catch (err) {
    const disk = await readDisk()
    if (disk) { mem = { at: now - (TTL_MS - STALE_RETRY_MS), data: disk.data }; return disk.data } // serve stale, retry soon
    throw err
  }
}

/** Flatten catalog into `{ ref: "provider/model", provider, ...meta }[]`. */
export async function listModels(opts) {
  const cat = await getCatalog(opts)
  const out = []
  for (const [pid, p] of Object.entries(cat)) {
    for (const [mid, m] of Object.entries(p.models || {})) out.push({ ref: `${pid}/${mid}`, provider: pid, ...m })
  }
  return out
}
