export const SUPPORTED_PLATFORM_NAMES = [
  'TikTok',
  'Instagram',
  'Snapchat',
  'YouTube',
  'Twitter',
  'Facebook',
  'Pinterest',
] as const

export const SUPPORTED_PLATFORM_COPY = SUPPORTED_PLATFORM_NAMES.join(', ')

export function detectPlatform(url: string): string | null {
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
