<template>
  <v-dialog
    v-model="isVisible"
    :fullscreen="false"
    :width="650"
    :persistent="false"
    class="spotlight-dialog"
    content-class="spotlight-content"
    @keydown.esc="close"
    @keydown.down="navigateDown"
    @keydown.up="navigateUp"
    @keydown.enter="selectHighlighted"
  >
    <v-card class="spotlight-card rounded-2xl overflow-hidden">
      <!-- Search Input -->
      <div class="spotlight-search flex items-center gap-3 px-5 py-4 bg-[#1a1a1a]">
        <v-icon class="text-gray-400" size="24">
          mdi-magnify
        </v-icon>
        <v-text-field
          ref="searchInput"
          v-model="searchQuery"
          :placeholder="t('spotlight.placeholder')"
          hide-details
          dense
          solo
          flat
          class="flex-1"
          @focus="onSearchFocus"
        >
          <template #prepend-inner>
            <span></span>
          </template>
        </v-text-field>
        <div v-if="searchQuery" class="flex items-center gap-1">
          <v-chip label x-small class="bg-[#2a2a2a] text-gray-400">
            <v-icon left x-small>
              mdi-arrow-down
            </v-icon>
            {{ t('spotlight.navigate') }}
          </v-chip>
          <v-chip label x-small class="bg-[#2a2a2a] text-gray-400">
            <v-icon left x-small>
              mdi-keyboard-return
            </v-icon>
            {{ t('spotlight.select') }}
          </v-chip>
        </div>
      </div>

      <v-divider class="border-[#2a2a2a]" />

      <!-- Results -->
      <v-card-text class="spotlight-results pa-0 max-h-[450px] overflow-y-auto">
        <v-list v-if="searchQuery.trim()" dense class="pa-0 bg-transparent">
          <!-- Instances Section -->
          <v-subheader v-if="filteredInstances.length > 0" class="spotlight-section-header px-4 py-2 text-xs font-semibold uppercase tracking-wider text-gray-500 bg-[#151515]">
            <v-icon size="16" class="mr-2 text-blue-500">
              mdi-folder
            </v-icon>
            {{ t('spotlight.sections.instances') }}
          </v-subheader>
          <v-list-item
            v-for="(instance, index) in filteredInstances"
            :key="'instance-' + instance.path"
            :class="{ 'bg-[#2a2a2a]': highlightedIndex === getInstanceIndex(index) }"
            class="spotlight-item px-4 py-3 rounded-lg mx-2 my-1 cursor-pointer transition-colors duration-150 hover:bg-[#252525]"
            @click="selectInstance(instance)"
          >
            <v-list-item-avatar :size="42" class="rounded-xl min-w-[42px] h-[42px]">
              <v-img
                v-if="instance.icon"
                :src="instance.icon"
                class="rounded-xl"
              />
              <v-icon v-else color="blue" class="rounded-xl bg-blue-500/20 p-2">
                mdi-folder
              </v-icon>
            </v-list-item-avatar>
            <v-list-item-content class="ml-3">
              <v-list-item-title class="font-semibold text-white">
                {{ instance.name }}
              </v-list-item-title>
              <v-list-item-subtitle class="spotlight-subtitle text-gray-400 text-xs mt-1">
                <v-chip x-small label class="mr-2 bg-[#1a1a1a] text-gray-400">
                  {{ instance.runtime?.minecraft }}
                </v-chip>
                {{ getModLoaderName(instance.runtime) }}
              </v-list-item-subtitle>
            </v-list-item-content>
          </v-list-item>

          <!-- ModPacks Section (Market) -->
          <v-subheader v-if="modpackResults.length > 0" class="spotlight-section-header px-4 py-2 text-xs font-semibold uppercase tracking-wider text-gray-500 bg-[#151515]">
            <v-icon size="16" class="mr-2 text-green-500">
              mdi-package-variant
            </v-icon>
            {{ t('spotlight.sections.modpacks') }}
          </v-subheader>
          <v-list-item
            v-for="(pack, index) in modpackResults"
            :key="'modpack-' + pack.id"
            :class="{ 'bg-[#2a2a2a]': highlightedIndex === getModpackIndex(index) }"
            class="spotlight-item px-4 py-3 rounded-lg mx-2 my-1 cursor-pointer transition-colors duration-150 hover:bg-[#252525]"
            @click="selectModpack(pack)"
          >
            <v-list-item-avatar :size="42" class="rounded-xl min-w-[42px] h-[42px]">
              <v-img
                v-if="pack.iconUrl"
                :src="pack.iconUrl"
                class="rounded-xl"
              />
              <v-icon v-else :color="getSourceColor(pack.type)" class="rounded-xl p-2" :class="getSourceIconBgClass(pack.type)">
                {{ getSourceIconName(pack.type) }}
              </v-icon>
            </v-list-item-avatar>
            <v-list-item-content class="ml-3">
              <v-list-item-title class="font-semibold text-white">
                {{ pack.localizedTitle || pack.title }}
              </v-list-item-title>
              <v-list-item-subtitle class="spotlight-subtitle text-gray-400 text-xs mt-1 truncate">
                {{ pack.localizedDescription || pack.description }}
              </v-list-item-subtitle>
            </v-list-item-content>
            <v-list-item-action>
              <v-chip x-small :color="getSourceColor(pack.type)" class="rounded-full font-medium">
                {{ pack.type }}
              </v-chip>
            </v-list-item-action>
          </v-list-item>

          <!-- Mods Section (Local + Remote) -->
          <v-subheader v-if="localModResults.length > 0 || modpackResults.length > 0" class="spotlight-section-header px-4 py-2 text-xs font-semibold uppercase tracking-wider text-gray-500 bg-[#151515]">
            <v-icon size="16" class="mr-2 text-purple-500">
              mdi-puzzle
            </v-icon>
            {{ t('spotlight.sections.mods') }}
          </v-subheader>
          
          <!-- Local Mods -->
          <v-list-item
            v-for="(mod, index) in localModResults"
            :key="'mod-' + mod.id"
            :class="{ 'bg-[#2a2a2a]': highlightedIndex === getModIndex(index) }"
            class="spotlight-item px-4 py-3 rounded-lg mx-2 my-1 cursor-pointer transition-colors duration-150 hover:bg-[#252525]"
            @click="selectMod(mod, 'local')"
          >
            <v-list-item-avatar :size="42" class="rounded-xl min-w-[42px] h-[42px]">
              <v-img
                v-if="mod.icon"
                :src="mod.icon"
                class="rounded-xl"
              />
              <v-icon v-else color="purple" class="rounded-xl bg-purple-500/20 p-2">
                mdi-puzzle
              </v-icon>
            </v-list-item-avatar>
            <v-list-item-content class="ml-3">
              <v-list-item-title class="font-semibold text-white">
                {{ mod.title }}
              </v-list-item-title>
              <v-list-item-subtitle class="spotlight-subtitle text-gray-400 text-xs mt-1 truncate">
                {{ mod.description }}
              </v-list-item-subtitle>
            </v-list-item-content>
            <v-list-item-action v-if="mod.installed && mod.installed.length > 0">
              <v-chip x-small color="green" class="rounded-full">Installed</v-chip>
            </v-list-item-action>
          </v-list-item>
          
          <!-- Remote Mods (from Modrinth search) -->
          <v-list-item
            v-for="(pack, index) in modpackResults"
            :key="'mod-' + pack.id"
            :class="{ 'bg-[#2a2a2a]': highlightedIndex === getRemoteModIndex(index) }"
            class="spotlight-item px-4 py-3 rounded-lg mx-2 my-1 cursor-pointer transition-colors duration-150 hover:bg-[#252525]"
            @click="selectMod(pack, 'remote')"
          >
            <v-list-item-avatar :size="42" class="rounded-xl min-w-[42px] h-[42px]">
              <v-img
                v-if="pack.iconUrl"
                :src="pack.iconUrl"
                class="rounded-xl"
              />
              <v-icon v-else :color="getSourceColor(pack.type)" class="rounded-xl p-2" :class="getSourceIconBgClass(pack.type)">
                {{ getSourceIconName(pack.type) }}
              </v-icon>
            </v-list-item-avatar>
            <v-list-item-content class="ml-3">
              <v-list-item-title class="font-semibold text-white">
                {{ pack.localizedTitle || pack.title }}
              </v-list-item-title>
              <v-list-item-subtitle class="spotlight-subtitle text-gray-400 text-xs mt-1 truncate">
                {{ pack.localizedDescription || pack.description }}
              </v-list-item-subtitle>
            </v-list-item-content>
            <v-list-item-action>
              <v-chip x-small color="primary" class="rounded-full">
                <v-icon left x-small>mdi-download</v-icon>
                Install
              </v-chip>
            </v-list-item-action>
          </v-list-item>

          <!-- Install Mod Suggestion -->
          <v-subheader v-if="showInstallSuggestion" class="spotlight-section-header px-4 py-2 text-xs font-semibold uppercase tracking-wider text-gray-500 bg-[#151515]">
            <v-icon size="16" class="mr-2 text-primary">
              mdi-download
            </v-icon>
            {{ t('spotlight.sections.suggestions') }}
          </v-subheader>
          <v-list-item
            v-if="showInstallSuggestion"
            :class="{ 'bg-[#2a2a2a]': highlightedIndex === getSuggestionIndex() }"
            class="spotlight-item spotlight-suggestion px-4 py-3 rounded-lg mx-2 my-1 cursor-pointer transition-colors duration-150 hover:bg-[#252525] border-l-4 border-primary"
            @click="navigateToStore"
          >
            <v-list-item-avatar :size="42" class="rounded-xl min-w-[42px] h-[42px]">
              <v-icon color="primary" class="rounded-xl bg-primary/20 p-2">
                mdi-store
              </v-icon>
            </v-list-item-avatar>
            <v-list-item-content class="ml-3">
              <v-list-item-title class="font-semibold text-primary">
                {{ t('spotlight.installMod', { modName: searchQuery }) }}
              </v-list-item-title>
              <v-list-item-subtitle class="spotlight-subtitle text-gray-400 text-xs mt-1">
                {{ t('spotlight.installModSubtitle') }}
              </v-list-item-subtitle>
            </v-list-item-content>
            <v-list-item-action>
              <v-icon small color="primary">
                mdi-open-in-new
              </v-icon>
            </v-list-item-action>
          </v-list-item>

          <!-- No Results -->
          <v-list-item v-if="noResults" class="py-8">
            <v-list-item-content>
              <v-list-item-title class="text-center text-gray-500">
                <v-icon size="48" class="mb-2 opacity-50">
                  mdi-search-off
                </v-icon>
                <div>{{ t('spotlight.noResults') }}</div>
              </v-list-item-title>
            </v-list-item-content>
          </v-list-item>
        </v-list>

        <v-list v-else dense class="pa-0 bg-transparent">
          <!-- Quick Actions -->
          <v-subheader class="spotlight-section-header px-4 py-2 text-xs font-semibold uppercase tracking-wider text-gray-500 bg-[#151515]">
            <v-icon size="16" class="mr-2 text-yellow-500">
              mdi-flash
            </v-icon>
            {{ t('spotlight.sections.quickActions') }}
          </v-subheader>
          <v-list-item
            v-for="(action, index) in quickActions"
            :key="'action-' + action.id"
            :class="{ 'bg-[#2a2a2a]': highlightedIndex === index }"
            class="spotlight-item px-4 py-3 rounded-lg mx-2 my-1 cursor-pointer transition-colors duration-150 hover:bg-[#252525]"
            @click="action.action"
          >
            <v-list-item-avatar :size="42" class="rounded-xl min-w-[42px] h-[42px]">
              <div class="rounded-xl p-2 w-[42px] h-[42px] flex items-center justify-center" :class="getActionIconBgClass(action.color)">
                <span v-html="action.icon" :class="`text-${action.color}`" style="display: inline-flex; width: 24px; height: 24px;"></span>
              </div>
            </v-list-item-avatar>
            <v-list-item-content class="ml-3">
              <v-list-item-title class="font-semibold text-white">
                {{ t(`spotlight.${action.label}`) }}
              </v-list-item-title>
            </v-list-item-content>
          </v-list-item>

          <!-- Recent Instances -->
          <v-subheader v-if="recentInstances.length > 0" class="spotlight-section-header px-4 py-2 text-xs font-semibold uppercase tracking-wider text-gray-500 bg-[#151515]">
            <v-icon size="16" class="mr-2 text-orange-500">
              mdi-history
            </v-icon>
            {{ t('spotlight.sections.recent') }}
          </v-subheader>
          <v-list-item
            v-for="instance in recentInstances"
            :key="'recent-' + instance.path"
            class="spotlight-item px-4 py-3 rounded-lg mx-2 my-1 cursor-pointer transition-colors duration-150 hover:bg-[#252525]"
            @click="selectInstance(instance)"
          >
            <v-list-item-avatar :size="42" class="rounded-xl min-w-[42px] h-[42px]">
              <v-img
                v-if="instance.icon"
                :src="instance.icon"
                class="rounded-xl"
              />
              <v-icon v-else color="orange" class="rounded-xl bg-orange-500/20 p-2">
                mdi-folder
              </v-icon>
            </v-list-item-avatar>
            <v-list-item-content class="ml-3">
              <v-list-item-title class="font-semibold text-white">
                {{ instance.name }}
              </v-list-item-title>
              <v-list-item-subtitle class="spotlight-subtitle text-gray-400 text-xs mt-1">
                {{ instance.runtime?.minecraft }}
              </v-list-item-subtitle>
            </v-list-item-content>
          </v-list-item>
        </v-list>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script lang="ts" setup>
import { injection } from '@/util/inject'
import { kInstances } from '@/composables/instances'
import { kInstance } from '@/composables/instance'
import { Instance } from '@xmcl/instance'
import { useSpotlightSearch } from '@/composables/spotlightSearch'
import { useService } from '@/composables/service'
import { InstanceServiceKey } from '@xmcl/runtime-api'

const { t } = useI18n()
const router = useRouter()
const { instances } = injection(kInstances)
const { instance: currentInstance } = injection(kInstance)
const { editInstance } = useService(InstanceServiceKey)

// Dialog visibility
const isVisible = ref(false)
const searchQuery = ref('')
const highlightedIndex = ref(0)
const searchInput = ref<any>(null)

// Current route context
const currentRoute = ref('')

// Quick actions
const quickActions = computed(() => [
  { id: 'create', label: 'createGame', icon: createGameIcon, color: 'primary', action: () => navigateToCreate() },
  { id: 'settings', label: 'globalSettings', icon: settingsIcon, color: 'grey', action: () => navigateToSettings() },
  { id: 'mods', label: 'mods', icon: modsIcon, color: 'blue', action: () => navigateToMods() },
  { id: 'store', label: 'store', icon: storeIcon, color: 'green', action: () => navigateToStore() },
])

// SVG Icons
const createGameIcon = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>'
const settingsIcon = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>'
const modsIcon = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.5 11H19V7c0-1.1-.9-2-2-2h-4V3.5C13 2.12 11.88 1 10.5 1S8 2.12 8 3.5V5H4c-1.1 0-1.99.9-1.99 2v3.8H3.5c1.49 0 2.7 1.21 2.7 2.7s-1.21 2.7-2.7 2.7H2V20c0 1.1.9 2 2 2h3.8v-1.5c0-1.49 1.21-2.7 2.7-2.7 1.49 0 2.7 1.21 2.7 2.7V22H17c1.1 0 2-.9 2-2v-4h1.5c1.38 0 2.5-1.12 2.5-2.5S21.88 11 20.5 11z"/></svg>'
const storeIcon = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4v2h16V4zm1 10v-2l-1-5H4l-1 5v2h1v6h10v-6h4v6h2v-6h1zm-9 4H6v-4h6v4z"/></svg>'

// Recent instances (last 5)
const recentInstances = computed(() => {
  return instances.value.slice(0, 5)
})

// Spotlight search
const {
  modpackResults,
  localModResults,
  isSearching,
} = useSpotlightSearch(searchQuery)

// Filter instances by search query
const filteredInstances = computed(() => {
  if (!searchQuery.value.trim()) {
    return []
  }
  const query = searchQuery.value.toLowerCase()
  return instances.value.filter(instance =>
    instance.name.toLowerCase().includes(query) ||
    instance.runtime?.minecraft?.includes(query)
  )
})

// Check if we should show install suggestion
const showInstallSuggestion = computed(() => {
  return searchQuery.value.trim().length > 2 &&
    localModResults.value.length === 0 &&
    modpackResults.value.length === 0
})

// No results message
const noResults = computed(() => {
  if (!searchQuery.value.trim()) return false
  return filteredInstances.value.length === 0 &&
    modpackResults.value.length === 0 &&
    localModResults.value.length === 0 &&
    !showInstallSuggestion.value
})

// Index calculation for navigation
const getInstanceIndex = (index: number) => index
const getModpackIndex = (index: number) => filteredInstances.value.length + index
const getModIndex = (index: number) => filteredInstances.value.length + modpackResults.value.length + index
const getRemoteModIndex = (index: number) => filteredInstances.value.length + localModResults.value.length + index
const getSuggestionIndex = () => filteredInstances.value.length + modpackResults.value.length + localModResults.value.length

// Get source icon component name
function getSourceIconName(type: string) {
  switch (type) {
    case 'modrinth':
      return 'mdi-package-variant'
    case 'curseforge':
      return 'mdi-flame'
    case 'ftb':
      return 'mdi-folder-star'
    default:
      return 'mdi-package-variant'
  }
}

// Get source icon background class
function getSourceIconBgClass(type: string) {
  switch (type) {
    case 'modrinth':
      return 'bg-green-500/20'
    case 'curseforge':
      return 'bg-orange-500/20'
    case 'ftb':
      return 'bg-blue-500/20'
    default:
      return 'bg-gray-500/20'
  }
}

// Get action icon background class
function getActionIconBgClass(color: string) {
  switch (color) {
    case 'primary':
      return 'bg-primary/20'
    case 'blue':
      return 'bg-blue-500/20'
    case 'green':
      return 'bg-green-500/20'
    default:
      return 'bg-gray-500/20'
  }
}

// Get source color
function getSourceColor(type: string) {
  switch (type) {
    case 'modrinth':
      return 'green'
    case 'curseforge':
      return 'orange'
    case 'ftb':
      return 'blue'
    default:
      return 'grey'
  }
}

// Get mod loader name
function getModLoaderName(runtime: Instance['runtime']) {
  if (runtime?.fabricLoader) return 'Fabric'
  if (runtime?.forge) return 'Forge'
  if (runtime?.quiltLoader) return 'Quilt'
  if (runtime?.neoForged) return 'NeoForge'
  return 'Vanilla'
}

// Navigation functions
function navigateDown() {
  const maxIndex = getMaxIndex()
  highlightedIndex.value = Math.min(highlightedIndex.value + 1, maxIndex)
}

function navigateUp() {
  highlightedIndex.value = Math.max(highlightedIndex.value - 1, 0)
}

function getMaxIndex() {
  if (!searchQuery.value.trim()) {
    return quickActions.value.length + recentInstances.value.length - 1
  }
  
  let max = filteredInstances.value.length + localModResults.value.length + modpackResults.value.length - 1
  
  if (showInstallSuggestion.value) max++
  return Math.max(max, 0)
}

function selectHighlighted() {
  if (!searchQuery.value.trim()) {
    if (highlightedIndex.value < quickActions.value.length) {
      quickActions.value[highlightedIndex.value].action()
    }
    return
  }

  if (highlightedIndex.value < filteredInstances.value.length) {
    selectInstance(filteredInstances.value[highlightedIndex.value])
  } else if (highlightedIndex.value < filteredInstances.value.length + localModResults.value.length) {
    const idx = highlightedIndex.value - filteredInstances.value.length
    selectMod(localModResults.value[idx], 'local')
  } else if (highlightedIndex.value < filteredInstances.value.length + localModResults.value.length + modpackResults.value.length) {
    const idx = highlightedIndex.value - filteredInstances.value.length - localModResults.value.length
    selectMod(modpackResults.value[idx], 'remote')
  } else if (showInstallSuggestion.value) {
    navigateToStore()
  }
}

// Selection handlers
function selectInstance(instance: Instance) {
  close()
  editInstance({ instancePath: instance.path })
}

function selectModpack(pack: any) {
  close()
  router.push({ path: `/store/${pack.type}/${pack.id}` })
}

function selectMod(mod: any, type: 'local' | 'remote') {
  close()
  
  // If local mod, just navigate to mods page
  if (type === 'local') {
    router.push({ path: '/mods' })
    return
  }
  
  // If remote mod and we have a current instance, install directly
  if (currentInstance.value && currentInstance.value.path) {
    const instanceVersion = currentInstance.value.runtime?.minecraft
    const modLoader = currentInstance.value.runtime?.fabricLoader 
      ? 'fabric' 
      : currentInstance.value.runtime?.forge 
        ? 'forge' 
        : currentInstance.value.runtime?.quiltLoader 
          ? 'quilt' 
          : currentInstance.value.runtime?.neoForged 
            ? 'neoforge' 
            : undefined
    
    // Install mod directly using MarketService
    installModDirectly(mod, currentInstance.value.path, instanceVersion, modLoader)
  } else {
    // No current instance, just navigate to mod page
    router.push({ path: `/store/${mod.type}/${mod.id}` })
  }
}

async function installModDirectly(mod: any, instancePath: string, gameVersion: string, modLoader?: string) {
  try {
    // Get the latest version for this game version and mod loader
    const latestVersion = await getLatestModVersion(mod.id, mod.type, gameVersion, modLoader)
    
    if (latestVersion) {
      // Navigate to store with auto-install flag
      router.push({
        path: `/store/${mod.type}/${mod.id}`,
        query: {
          install: '1',
          instance: instancePath,
          version: latestVersion.id,
        },
      })
    }
  } catch (e: any) {
    console.error('Failed to install mod:', e)
  }
}

async function getLatestModVersion(projectId: string, type: string, gameVersion: string, modLoader?: string) {
  try {
    if (type === 'modrinth') {
      const loaderParam = modLoader ? `&loader=${encodeURIComponent(modLoader)}` : ''
      const response = await fetch(`https://api.modrinth.com/v2/project/${projectId}/version?game_version=${encodeURIComponent(gameVersion)}${loaderParam}`)
      if (!response.ok) return null
      
      const versions = await response.json()
      return versions[0] || null
    }
    return null
  } catch (e) {
    console.error('Failed to get mod version:', e)
    return null
  }
}

// Navigation actions
function navigateToCreate() {
  close()
}

function navigateToSettings() {
  close()
  router.push({ path: '/setting' })
}

function navigateToMods() {
  close()
  router.push({ path: '/mods' })
}

function navigateToStore() {
  close()
  router.push({ path: '/store' })
}

// Search focus handler
function onSearchFocus() {
  highlightedIndex.value = 0
}

// Open/close functions
function open() {
  isVisible.value = true
  searchQuery.value = ''
  highlightedIndex.value = 0
  currentRoute.value = (router.currentRoute as any)?.path || window.location.hash.slice(1) || '/'
  nextTick(() => {
    searchInput.value?.focus()
  })
}

function close() {
  isVisible.value = false
  searchQuery.value = ''
}

// Watch for route changes
watch(() => router.currentRoute?.path, (newPath) => {
  currentRoute.value = newPath || ''
})

// Expose open method for parent
defineExpose({ open, close })
</script>

<style>
.spotlight-dialog .v-card {
  background: #1e1e1e;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}

.spotlight-dialog .spotlight-search input {
  background: transparent;
  color: #fff;
  font-size: 16px;
}

.spotlight-dialog .spotlight-search input::placeholder {
  color: #6b7280;
}

.spotlight-dialog .spotlight-results {
  scrollbar-width: thin;
  scrollbar-color: #3a3a3a transparent;
}

.spotlight-dialog .spotlight-results::-webkit-scrollbar {
  width: 6px;
}

.spotlight-dialog .spotlight-results::-webkit-scrollbar-track {
  background: transparent;
}

.spotlight-dialog .spotlight-results::-webkit-scrollbar-thumb {
  background: #3a3a3a;
  border-radius: 3px;
}

.spotlight-dialog .spotlight-results::-webkit-scrollbar-thumb:hover {
  background: #4a4a4a;
}

.spotlight-dialog .v-list-item__avatar {
  margin: 0;
}

.spotlight-dialog .v-chip {
  font-size: 11px;
  height: 20px;
}

/* SVG Icon colors */
.spotlight-dialog .text-primary svg {
  color: rgb(var(--v-theme-primary));
}

.spotlight-dialog .text-blue svg {
  color: rgb(59, 130, 246);
}

.spotlight-dialog .text-green svg {
  color: rgb(34, 197, 94);
}

.spotlight-dialog .text-grey svg {
  color: rgb(156, 163, 175);
}
</style> 
