/**
 * Shared file download utility.
 *
 * Fetches the given URL and initiates a browser file download.
 * Falls back to window.open if the fetch fails.
 *
 * Returns a Promise that resolves (never rejects) when the download
 * is triggered or the fallback is used.
 */
export function triggerFileDownload(url: string, fileName: string): Promise<void> {
  return fetch(url, { credentials: 'include' })
    .then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      return r.blob()
    })
    .then(blob => {
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = fileName
      a.style.display = 'none'
      document.body.appendChild(a)
      a.click()
      setTimeout(() => { URL.revokeObjectURL(blobUrl); a.remove() }, 200)
    })
    .catch(() => {
      window.open(url, '_blank', 'noopener,noreferrer')
    })
}
