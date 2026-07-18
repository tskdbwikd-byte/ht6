export async function getPower() {
  const res = await fetch('/api/power')
  if (!res.ok) throw new Error('Failed to load power state')
  return res.json()
}

export async function setPower(on) {
  const res = await fetch('/api/power', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ on }),
  })
  if (!res.ok) throw new Error('Failed to update power state')
  return res.json()
}

export async function getBlocklist() {
  const res = await fetch('/api/blocklist')
  if (!res.ok) throw new Error('Failed to load blocklist')
  return res.json()
}

export async function addBlockedDomain(domain, reason, source = 'manual') {
  const res = await fetch('/api/blocklist', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ domain, reason, source }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail || 'Failed to add domain')
  }
  return res.json()
}

export async function removeBlockedDomain(domain) {
  const res = await fetch(`/api/blocklist/${encodeURIComponent(domain)}`, { method: 'DELETE' })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail || 'Failed to remove domain')
  }
  return res.json()
}

export async function generateSuggestions() {
  const res = await fetch('/api/suggestions/generate', { method: 'POST' })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail || 'Failed to generate suggestions')
  }
  return res.json()
}

export async function getPresets() {
  const res = await fetch('/api/blocklist/presets')
  if (!res.ok) throw new Error('Failed to load community blocklists')
  return res.json()
}

export async function enablePreset(presetId) {
  const res = await fetch(`/api/blocklist/presets/${encodeURIComponent(presetId)}/enable`, { method: 'POST' })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail || 'Failed to enable blocklist')
  }
  return res.json()
}

export async function disablePreset(presetId) {
  const res = await fetch(`/api/blocklist/presets/${encodeURIComponent(presetId)}/disable`, { method: 'POST' })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail || 'Failed to disable blocklist')
  }
  return res.json()
}

export async function clearActivity() {
  const res = await fetch('/api/activity/reset', { method: 'POST' })
  if (!res.ok) throw new Error('Failed to clear activity')
  return res.json()
}

export async function sendChatMessage(message, history = []) {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, history }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail || 'Failed to reach the assistant')
  }
  return res.json()
}
