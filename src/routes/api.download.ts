import { createFileRoute } from '@tanstack/react-router'

function isValidUrl(urlString: string): boolean {
  try {
    new URL(urlString)
    return true
  } catch {
    return false
  }
}

// Human-readable error messages for Cobalt v10+ error codes
const COBALT_ERROR_MESSAGES: Record<string, string> = {
  'error.api.link.invalid': 'The link is invalid or not supported.',
  'error.api.link.unsupported': 'This platform or link type is not supported.',
  'error.api.fetch.fail': 'Could not fetch content from this link. It may be private or unavailable.',
  'error.api.fetch.critical': 'A critical error occurred while fetching content.',
  'error.api.fetch.empty': 'No downloadable content was found at this link.',
  'error.api.content.video.unavailable': 'This video is unavailable. It may be private, deleted, or region-locked.',
  'error.api.content.video.live': 'Live videos cannot be downloaded.',
  'error.api.content.video.age': 'This video is age-restricted and cannot be downloaded.',
  'error.api.content.post.unavailable': 'This post is unavailable or has been deleted.',
  'error.api.youtube.login': 'This YouTube video requires login to access.',
  'error.api.youtube.decipher': 'Failed to process this YouTube video.',
  'error.api.youtube.token_expired': 'YouTube session expired. Please try again.',
  'error.api.tiktok.unavailable': 'This TikTok video is unavailable.',
  'error.api.instagram.private': 'This Instagram content is from a private account.',
  'error.api.twitter.private': 'This tweet is from a private account.',
  'error.api.rate_exceeded': 'Too many requests. Please wait a moment and try again.',
  'error.api.auth.key.missing': 'This download server requires authentication.',
  'error.api.auth.turnstile.missing': 'This download server requires bot verification.',
  'error.api.auth.jwt.missing': 'This download server requires authentication.',
}

function safeErrorMessage(value: unknown, fallback: string): string {
  if (typeof value === 'string' && value.trim()) {
    // Check if it's a known Cobalt error code
    return COBALT_ERROR_MESSAGES[value] || value
  }
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>
    // Cobalt v10+ error format: { code: "error.api.xxx", context?: { service: "..." } }
    if (typeof obj.code === 'string') {
      return COBALT_ERROR_MESSAGES[obj.code] || obj.code
    }
    if (typeof obj.message === 'string') return obj.message
    try {
      return JSON.stringify(value)
    } catch {
      return fallback
    }
  }
  return fallback
}

function detectPlatform(url: string): string | null {
  try {
    const host = new URL(url).hostname.toLowerCase()
    if (host.includes('tiktok.com') || host.includes('vm.tiktok.com')) return 'tiktok'
    if (host.includes('instagram.com') || host.includes('instagr.am')) return 'instagram'
    if (host.includes('snapchat.com') || host.includes('snap.com')) return 'snapchat'
    if (host.includes('youtube.com') || host.includes('youtu.be')) return 'youtube'
    if (host.includes('twitter.com') || host.includes('x.com')) return 'twitter'
    if (host.includes('facebook.com') || host.includes('fb.watch')) return 'facebook'
    if (host.includes('pinterest.com') || host.includes('pin.it')) return 'pinterest'
    return null
  } catch {
    return null
  }
}

// Cobalt API instances — community-hosted, no-auth instances for redundancy.
// The official api.cobalt.tools requires Turnstile bot verification and is excluded.
// Updated list with more instances for better availability.
const COBALT_INSTANCES = [
  'https://cobalt-api.ayo.tf',
  'https://cobalt.api.timelessnesses.me',
  'https://cobalt-api.kwiatekmiki.com',
  'https://co.eepy.today',
  'https://cobalt-backend.canine.tools',
  'https://cobalt-api.meowing.de',
  'https://api.cobalt.best',
  'https://cobalt.dark-arcana.com',
  'https://cobalt.wukko.me',
  'https://cobalt-api.hyper.lol',
  'https://api.cobalt.tskau.team',
  'https://cobalt.lostdusty.com',
]

interface CobaltInstance {
  api: string
  protocol: string
  online: boolean
  version: string
  score: number
  services: Record<string, boolean | string>
}

// Dynamic instance discovery from instances.cobalt.best
// Returns two lists: preferred instances (platform confirmed working) and fallback instances (might work)
async function fetchDynamicInstances(platform?: string): Promise<{ preferred: string[]; fallback: string[] }> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 6000)
    const res = await fetch('https://instances.cobalt.best/api/instances.json', {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'SaveMedia/1.0',
      },
      signal: controller.signal,
    })
    clearTimeout(timeout)
    if (!res.ok) return { preferred: [], fallback: [] }
    const instances = await res.json()
    if (!Array.isArray(instances)) return { preferred: [], fallback: [] }

    // Filter to online HTTPS instances with a valid API hostname
    const onlineInstances = instances.filter((inst: CobaltInstance) => {
      if (inst.protocol !== 'https') return false
      if (inst.online !== true) return false
      if (typeof inst.api !== 'string' || !inst.api) return false
      // Skip instances known to require auth
      if (inst.api.includes('cobalt.tools') && !inst.api.includes('api.cobalt.best')) return false
      return true
    })

    // Sort all by score descending
    onlineInstances.sort((a: CobaltInstance, b: CobaltInstance) => (b.score || 0) - (a.score || 0))

    const preferred: string[] = []
    const fallback: string[] = []

    for (const inst of onlineInstances) {
      const url = `https://${inst.api}/`
      if (platform && inst.services && typeof inst.services === 'object') {
        const supported = inst.services[platform]
        if (supported === true) {
          preferred.push(url)
        } else if (supported === false) {
          // Explicitly unsupported — skip entirely
          continue
        } else {
          // Error string or unknown — might still work for some content, use as fallback
          fallback.push(url)
        }
      } else {
        // No service info — treat as potentially working
        preferred.push(url)
      }
    }

    return {
      preferred: preferred.slice(0, 12),
      fallback: fallback.slice(0, 8),
    }
  } catch {
    return { preferred: [], fallback: [] }
  }
}

interface CobaltResponse {
  status?: string
  url?: string
  filename?: string
  text?: unknown
  // v10+ uses error as { code: string, context?: object }
  error?: unknown
  picker?: Array<{ url: string; thumb?: string; type?: string }>
  audio?: string
  audioFilename?: string
}

function isAuthError(data: CobaltResponse | null): boolean {
  if (!data?.error) return false
  if (typeof data.error === 'object') {
    const code = (data.error as Record<string, unknown>).code
    if (typeof code === 'string') {
      return code.includes('auth') || code.includes('turnstile') || code.includes('jwt')
    }
  }
  if (typeof data.error === 'string') {
    return data.error.includes('auth') || data.error.includes('turnstile')
  }
  if (data.status === 'error' && typeof data.text === 'string') {
    return data.text.includes('auth') || data.text.includes('turnstile')
  }
  return false
}

// Try a single Cobalt endpoint (URL already includes path)
async function fetchCobaltEndpoint(
  endpointUrl: string,
  body: Record<string, unknown>,
  timeoutMs: number,
): Promise<{ ok: boolean; data: CobaltResponse | null; status: number; authRequired: boolean }> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)

    const res = await fetch(endpointUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })

    clearTimeout(timeout)
    const data = await res.json().catch(() => null)

    if (res.status === 401 || res.status === 403 || isAuthError(data)) {
      return { ok: false, data, status: res.status, authRequired: true }
    }

    return { ok: res.ok, data, status: res.status, authRequired: false }
  } catch {
    return { ok: false, data: null, status: 0, authRequired: false }
  }
}

async function tryCobaltInstance(
  instanceUrl: string,
  url: string,
  videoQuality: string,
  downloadMode: string,
  audioBitrate: string,
  platform?: string,
): Promise<{ ok: boolean; data: CobaltResponse | null; status: number; authRequired: boolean }> {
  // Normalize base URL
  const baseUrl = instanceUrl.replace(/\/+$/, '')

  // Build v10+ body
  const v10Body: Record<string, unknown> = {
    url,
    videoQuality,
    downloadMode,
    filenameStyle: 'pretty',
  }
  if (downloadMode === 'audio') {
    v10Body.audioBitrate = audioBitrate
    v10Body.audioFormat = 'mp3'
  }
  if (platform === 'youtube') {
    v10Body.youtubeVideoCodec = 'h264'
  }
  if (platform === 'tiktok') {
    v10Body.tiktokFullAudio = true
  }

  // Build v7 body (different parameter names)
  const v7Body: Record<string, unknown> = {
    url,
    vQuality: videoQuality,
    filenamePattern: 'pretty',
    isAudioOnly: downloadMode === 'audio',
    aFormat: 'mp3',
    ...(downloadMode === 'audio' ? { audioBitrate } : {}),
    ...(platform === 'youtube' ? { vCodec: 'h264' } : {}),
    ...(platform === 'tiktok' ? { tiktokH265: false } : {}),
  }

  // Try v10 endpoint first (root path), then v7 (/api/json) as fallback
  const v10Result = await fetchCobaltEndpoint(`${baseUrl}/`, v10Body, 25000)

  // If v10 got a clear success or content-specific error, return it
  if (v10Result.ok && v10Result.data) return v10Result
  if (v10Result.authRequired) return v10Result
  if (v10Result.data && v10Result.data.status === 'error') {
    // Content-specific errors are authoritative — don't retry with v7
    if (typeof v10Result.data.error === 'object') {
      const code = (v10Result.data.error as Record<string, unknown>).code as string
      if (code && (code.includes('unavailable') || code.includes('private') || code.includes('age') || code.includes('login') || code.includes('live'))) {
        return v10Result
      }
    }
  }

  // If v10 returned a non-fetch-fail error with data, return it (instance works but content issue)
  if (v10Result.status >= 200 && v10Result.data && v10Result.data.status === 'error') {
    const errCode = typeof v10Result.data.error === 'object'
      ? (v10Result.data.error as Record<string, unknown>).code as string
      : ''
    // Only fall through to v7 for fetch failures or connection issues
    if (errCode && !errCode.includes('fetch.fail') && !errCode.includes('fetch.critical') && !errCode.includes('fetch.empty')) {
      return v10Result
    }
  }

  // Try v7 endpoint as fallback — many older instances only serve /api/json
  const v7Result = await fetchCobaltEndpoint(`${baseUrl}/api/json`, v7Body, 20000)

  // If v7 succeeded, return it
  if (v7Result.ok && v7Result.data && (v7Result.data.url || v7Result.data.status === 'redirect' || v7Result.data.status === 'tunnel' || v7Result.data.status === 'stream' || v7Result.data.status === 'picker')) {
    return v7Result
  }

  // Return the better result between v10 and v7
  if (v10Result.status !== 0 && v10Result.data) return v10Result
  if (v7Result.status !== 0 && v7Result.data) return v7Result
  return v10Result
}

export const Route = createFileRoute('/api/download')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json()
          const { url, quality } = body as {
            url?: string
            quality?: string
          }

          if (!url) {
            return Response.json({ error: 'URL is required' }, { status: 400 })
          }

          if (!isValidUrl(url)) {
            return Response.json({ error: 'Please provide a valid URL' }, { status: 400 })
          }

          const platform = detectPlatform(url)
          if (!platform) {
            return Response.json(
              { error: 'Unsupported platform. Supported: TikTok, Instagram, Snapchat, YouTube, Twitter, Facebook, Pinterest' },
              { status: 400 },
            )
          }

          // Cobalt v10+ quality format
          const videoQuality = quality === 'audio' ? '1080' : (quality || '1080')
          const downloadMode = quality === 'audio' ? 'audio' : 'auto'
          const audioBitrate = '320'

          // Build instance list: preferred (platform confirmed), then fallback (might work), then static
          let preferredInstances: string[] = []
          let fallbackInstances: string[] = []
          try {
            const dynamic = await fetchDynamicInstances(platform)
            preferredInstances = dynamic.preferred
            fallbackInstances = dynamic.fallback
          } catch {
            // Dynamic discovery failed
          }
          // Add static instances as fallbacks (if not already included)
          const allKnown = new Set([...preferredInstances, ...fallbackInstances].map(s => s.replace(/\/+$/, '')))
          for (const inst of COBALT_INSTANCES) {
            const normalized = inst.replace(/\/+$/, '')
            if (!allKnown.has(normalized)) {
              fallbackInstances.push(normalized.endsWith('/') ? normalized : `${normalized}/`)
            }
          }

          // Combine: preferred first, then fallback
          const allInstances = [...preferredInstances, ...fallbackInstances]

          // Helper to process a successful Cobalt result into a Response
          function processResult(
            result: { ok: boolean; data: CobaltResponse | null; status: number; authRequired: boolean },
          ): { response?: Response; error?: string; contentSpecific?: boolean; skip?: boolean } {
            if (result.status === 0) return { skip: true }
            if (result.authRequired) return { skip: true }
            // Non-JSON response (data is null but status is non-zero)
            if (!result.data && result.status !== 0) return { skip: true }

            if (result.ok && result.data) {
              const data = result.data

              if (data.status === 'error') {
                const errorMsg = safeErrorMessage(data.error, '') || safeErrorMessage(data.text, 'Could not extract media from this link.')
                // Content-specific errors are authoritative
                if (typeof data.error === 'object') {
                  const code = (data.error as Record<string, unknown>).code as string
                  if (code && (code.includes('unavailable') || code.includes('private') || code.includes('age') || code.includes('login') || code.includes('live'))) {
                    return {
                      response: Response.json(
                        { error: errorMsg, platform, hint: 'The content itself is not accessible for download. Make sure it is public and not a livestream.' },
                        { status: 422 },
                      ),
                    }
                  }
                }
                // For fetch.fail errors, don't treat as authoritative — another instance might succeed
                if (typeof data.error === 'object') {
                  const code = (data.error as Record<string, unknown>).code as string
                  if (code && (code.includes('fetch.fail') || code.includes('fetch.critical') || code.includes('fetch.empty'))) {
                    return { error: errorMsg, contentSpecific: false }
                  }
                }
                return { error: errorMsg, contentSpecific: true }
              }

              // Handle redirect/tunnel/stream response
              if (data.status === 'redirect' || data.status === 'tunnel' || data.status === 'stream') {
                if (data.url) {
                  return {
                    response: Response.json({
                      success: true, platform, downloadUrl: data.url,
                      filename: data.filename || `${platform}-media`,
                      type: quality === 'audio' ? 'audio' : 'video',
                    }),
                  }
                }
              }

              // Handle picker (multiple items like carousels)
              if (data.status === 'picker' && Array.isArray(data.picker)) {
                const items = data.picker.map((item, i) => ({
                  url: item.url, thumb: item.thumb,
                  type: item.type || 'video', filename: `${platform}-media-${i + 1}`,
                }))
                return {
                  response: Response.json({
                    success: true, platform, multiple: true, items,
                    audio: data.audio, audioFilename: data.audioFilename,
                  }),
                }
              }

              // Generic success with URL (handles cases where status field might differ)
              if (data.url) {
                return {
                  response: Response.json({
                    success: true, platform, downloadUrl: data.url,
                    filename: data.filename || `${platform}-media`,
                    type: quality === 'audio' ? 'audio' : 'video',
                  }),
                }
              }

              // Handle picker without status field
              if (Array.isArray(data.picker) && data.picker.length > 0) {
                const items = data.picker.map((item, i) => ({
                  url: item.url, thumb: item.thumb,
                  type: item.type || 'video', filename: `${platform}-media-${i + 1}`,
                }))
                return {
                  response: Response.json({
                    success: true, platform, multiple: true, items,
                    audio: data.audio, audioFilename: data.audioFilename,
                  }),
                }
              }
            } else if (result.data) {
              const errData = result.data
              const errorMsg = safeErrorMessage(errData.error, '') || safeErrorMessage(errData.text, 'Failed to process this link.')
              // For non-OK responses, check if it's a fetch error (might work on another instance)
              if (typeof errData.error === 'object') {
                const code = (errData.error as Record<string, unknown>).code as string
                if (code && (code.includes('fetch.fail') || code.includes('fetch.critical') || code.includes('fetch.empty'))) {
                  return { error: errorMsg, contentSpecific: false }
                }
              }
              return {
                error: errorMsg,
                contentSpecific: true,
              }
            }

            return { skip: true }
          }

          // Try instances: race in parallel batches for speed, with retry logic
          let lastError = 'All download servers are currently unavailable. Please try again later.'
          let lastErrorIsContentSpecific = false
          let instancesReachable = 0
          let contentSpecificErrorSeen = false

          // Phase 1: Try preferred instances (first 8 in parallel for speed)
          const parallelBatch = allInstances.slice(0, 8)
          const remainingInstances = allInstances.slice(8)

          if (parallelBatch.length > 0) {
            // Use Promise.allSettled + first-success pattern for better speed
            const results = await Promise.all(
              parallelBatch.map((inst) => tryCobaltInstance(inst, url, videoQuality, downloadMode, audioBitrate, platform)),
            )

            for (const result of results) {
              if (result.status !== 0 && !result.authRequired) instancesReachable++
              const processed = processResult(result)
              if (processed.response) return processed.response
              if (processed.error) {
                lastError = processed.error
                lastErrorIsContentSpecific = processed.contentSpecific || false
                if (processed.contentSpecific) contentSpecificErrorSeen = true
              }
            }
          }

          // If we got a content-specific error (private, deleted, etc.), don't bother trying more instances
          if (contentSpecificErrorSeen && lastErrorIsContentSpecific) {
            return Response.json(
              { error: lastError, platform, hint: 'Make sure the link points to a specific public post or video, not a profile page. Some content may be region-locked or age-restricted.' },
              { status: 422 },
            )
          }

          // Phase 2: Try remaining instances sequentially (these are lower-ranked)
          for (const instance of remainingInstances) {
            const result = await tryCobaltInstance(instance, url, videoQuality, downloadMode, audioBitrate, platform)
            if (result.status !== 0 && !result.authRequired) instancesReachable++
            const processed = processResult(result)
            if (processed.response) return processed.response
            if (processed.error) {
              lastError = processed.error
              lastErrorIsContentSpecific = processed.contentSpecific || false
              if (processed.contentSpecific) contentSpecificErrorSeen = true
            }
          }

          // All instances tried — determine the best error message
          const allUnreachable = instancesReachable === 0

          let errorMessage: string
          let hint: string

          if (allUnreachable) {
            errorMessage = 'Download servers are temporarily unavailable. Please try again in a few minutes.'
            hint = 'All download servers are currently unreachable or require authentication. This is usually temporary — please try again shortly.'
          } else if (lastErrorIsContentSpecific) {
            errorMessage = lastError
            hint = 'Make sure the link points to a specific public post or video, not a profile page. Some content may be region-locked or age-restricted.'
          } else {
            // fetch.fail across all instances — likely a platform-side issue
            errorMessage = 'Could not fetch content from this link. The download servers were unable to access it.'
            hint = 'This usually means the platform is temporarily blocking download requests. Try again in a minute, or try a different quality setting. If the content is from a private account, it cannot be downloaded.'
          }

          return Response.json(
            { error: errorMessage, platform, hint },
            { status: 422 },
          )
        } catch (err) {
          console.error('Download API error:', err)
          return Response.json(
            { error: 'Failed to process request. Please try again.' },
            { status: 500 },
          )
        }
      },
    },
  },
})
