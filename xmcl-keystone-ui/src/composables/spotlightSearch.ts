import { CurseforgeBuiltinClassId } from './curseforge'
import { useService } from './service'
import { InstanceModsServiceKey } from '@xmcl/runtime-api'
import { ref, watch, shallowRef } from 'vue'

interface SpotlightSearchResult {
  id: string
  type: 'modrinth' | 'curseforge' | 'ftb'
  title: string
  iconUrl: string
  description: string
  author: string
  downloadCount: string
  updatedAt: string
  version: string
  gallery: string[]
  localizedTitle?: string
  localizedDescription?: string
}

interface LocalModResult {
  id: string
  title: string
  description: string
  icon: string | undefined
  files: any[]
  installed: any[]
  modrinthProjectId?: string
  curseforgeProjectId?: number
}

export function useSpotlightSearch(query: Ref<string>) {
  const modpackResults = shallowRef<SpotlightSearchResult[]>([])
  const localModResults = shallowRef<LocalModResult[]>([])
  const isSearching = ref(false)

  // Search modpacks from all sources
  watch(query, async (newQuery) => {
    if (!newQuery || newQuery.trim().length < 2) {
      modpackResults.value = []
      return
    }

    isSearching.value = true
    const searchQuery = newQuery.trim()

    try {
      // Search Modrinth
      const modrinthPromise = searchModrinthModpacks(searchQuery)

      // Search CurseForge
      const curseforgePromise = searchCurseforgeModpacks(searchQuery)

      // Search FTB
      const ftbPromise = searchFtbModpacks(searchQuery)

      const [modrinthResults, curseforgeResults, ftbResults] = await Promise.all([
        modrinthPromise,
        curseforgePromise,
        ftbPromise,
      ])

      // Merge and sort results - limit to 10 for spotlight
      modpackResults.value = [
        ...modrinthResults,
        ...curseforgeResults,
        ...ftbResults,
      ].slice(0, 10)
    } finally {
      isSearching.value = false
    }
  }, { immediate: true })

  // Search local mods
  watch(query, async (newQuery) => {
    if (!newQuery || newQuery.trim().length < 2) {
      localModResults.value = []
      return
    }

    const searchQuery = newQuery.trim().toLowerCase()

    // Search in local mod files
    const { searchInstalled } = useService(InstanceModsServiceKey)
    try {
      const results = await searchInstalled(searchQuery)
      localModResults.value = results.map((mod: any) => ({
        id: mod.modrinth?.projectId || mod.curseforge?.projectId?.toString() || mod.name,
        title: mod.name,
        description: mod.description || '',
        icon: mod.icon,
        files: [mod],
        installed: [mod],
        modrinthProjectId: mod.modrinth?.projectId,
        curseforgeProjectId: mod.curseforge?.projectId,
      }))
    } catch (e) {
      console.error('Failed to search local mods:', e)
      localModResults.value = []
    }
  }, { immediate: true })

  return {
    modpackResults,
    localModResults,
    isSearching,
  }
}

// Search Modrinth modpacks
async function searchModrinthModpacks(query: string): Promise<SpotlightSearchResult[]> {
  try {
    const url = `https://api.modrinth.com/v2/search?limit=5&index=relevance&query=${encodeURIComponent(query)}&project_type=modpack`
    const response = await fetch(url)
    if (!response.ok) return []

    const data = await response.json()
    return data.hits.map((hit: any) => ({
      id: hit.project_id,
      type: 'modrinth' as const,
      title: hit.title,
      iconUrl: hit.icon_url,
      description: hit.description,
      author: hit.author,
      downloadCount: formatNumber(hit.downloads),
      updatedAt: formatDate(hit.date_modified),
      version: hit.versions?.[0] || '',
      gallery: hit.gallery || [],
    }))
  } catch (e) {
    console.error('Failed to search Modrinth:', e)
    return []
  }
}

// Search CurseForge modpacks
async function searchCurseforgeModpacks(query: string): Promise<SpotlightSearchResult[]> {
  try {
    // Direct API call for CurseForge
    const response = await fetch(`https://api.xmcl.app/curseforge/search?classId=${CurseforgeBuiltinClassId.modpack}&searchTerm=${encodeURIComponent(query)}&pageSize=5`)
    if (!response.ok) return []

    const data = await response.json()
    return (data.data || []).map((p: any) => ({
      id: p.id.toString(),
      type: 'curseforge' as const,
      title: p.name,
      iconUrl: p.logo?.thumbnailUrl || '',
      description: p.summary,
      author: p.authors[0]?.name || '',
      downloadCount: formatNumber(p.downloadCount),
      updatedAt: formatDate(p.dateModified),
      version: p.latestFilesIndexes[0]?.gameVersion || '',
      gallery: p.screenshots.map((s: any) => s?.thumbnailUrl || ''),
    }))
  } catch (e) {
    console.error('Failed to search CurseForge:', e)
    return []
  }
}

// Search FTB modpacks
async function searchFtbModpacks(query: string): Promise<SpotlightSearchResult[]> {
  try {
    const response = await fetch(`https://api.xmcl.app/ftb/search?search=${encodeURIComponent(query)}`)
    if (!response.ok) return []

    const data = await response.json()
    return (data.packs || []).slice(0, 5).map((p: any) => ({
      id: p.toString(),
      type: 'ftb' as const,
      title: p.name || '',
      iconUrl: '',
      description: p.synopsis || '',
      author: '',
      downloadCount: '0',
      updatedAt: '',
      version: '',
      gallery: [],
    }))
  } catch (e) {
    console.error('Failed to search FTB:', e)
    return []
  }
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M'
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K'
  }
  return num.toString()
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) return 'Today'
    if (days === 1) return 'Yesterday'
    if (days < 7) return `${days} days ago`
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`
    if (days < 365) return `${Math.floor(days / 30)} months ago`
    return `${Math.floor(days / 365)} years ago`
  } catch {
    return dateStr
  }
} 
