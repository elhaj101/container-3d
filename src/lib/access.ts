// Shared access key gate. One key, any number of people.
//
// Only a salted SHA-256 of the key lives here, never the key itself, because this repo is
// public. This keeps casual visitors out; it is NOT real security. The site is static on
// GitHub Pages, so a determined person can still read the bundle or skip the check.
// Anything that must stay private needs a server-side check instead.
//
// To rotate the key: hash SALT + newKey with SHA-256, replace ACCESS_HASH, and push.
// Everyone who unlocked with the old key is signed out automatically, because the stored
// token no longer matches.

const SALT = 'eea6a0931fe106fb9c759de051b9ace8'
const ACCESS_HASH = '79984d98869f45bbfa77c8da6ca602b04202732cac32fe4b46adf2bb7e65f623'
const STORAGE_KEY = 'c3d-access'

async function sha256Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}

/** Normalise what people actually type: stray spaces, lowercase, missing dashes. */
export function normaliseKey(raw: string): string {
  const compact = raw.toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (compact.length !== 19 || !compact.startsWith('EHI')) return raw.trim().toUpperCase()
  const body = compact.slice(3)
  return `EHI-${body.slice(0, 4)}-${body.slice(4, 8)}-${body.slice(8, 12)}-${body.slice(12, 16)}`
}

export async function checkKey(raw: string): Promise<boolean> {
  return (await sha256Hex(SALT + normaliseKey(raw))) === ACCESS_HASH
}

function stores(): Storage[] {
  const out: Storage[] = []
  try { out.push(localStorage) } catch { /* blocked */ }
  try { out.push(sessionStorage) } catch { /* blocked */ }
  return out
}

export function hasAccess(): boolean {
  return stores().some((s) => {
    try { return s.getItem(STORAGE_KEY) === ACCESS_HASH } catch { return false }
  })
}

export function grantAccess(remember: boolean) {
  for (const s of stores()) {
    try { s.removeItem(STORAGE_KEY) } catch { /* ignore */ }
  }
  try {
    ;(remember ? localStorage : sessionStorage).setItem(STORAGE_KEY, ACCESS_HASH)
  } catch { /* storage blocked: access lasts for this page load only */ }
}

export function revokeAccess() {
  for (const s of stores()) {
    try { s.removeItem(STORAGE_KEY) } catch { /* ignore */ }
  }
}
