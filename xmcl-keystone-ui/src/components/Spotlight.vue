<template>
  <v-dialog
    v-model="isVisible"
    :fullscreen="false"
    :width="600"
    :persistent="false"
    class="spotlight-dialog"
    content-class="spotlight-content"
    @keydown.esc="close"
    @keydown.down="navigateDown"
    @keydown.up="navigateUp"
    @keydown.enter="selectHighlighted"
  >
    <v-card class="spotlight-card">
      <v-text-field
        ref="searchInput"
        v-model="searchQuery"
        :placeholder="t('spotlight.placeholder')"
        prepend-inner-icon="mdi-magnify"
        clearable
        hide-details
        dense
        solo
        flat
        class="spotlight-search"
        @focus="onSearchFocus"
      >
        <template #prepend-inner>
          <v-icon class="mr-2">
            mdi-magnify
          </v-icon>
        </template>
      </v-text-field>

      <v-divider />

      <v-card-text class="spotlight-results pa-0">
        <v-list v-if="searchQuery.trim()" dense class="pa-0">
          <!-- Instances Section -->
          <v-subheader v-if="filteredInstances.length > 0" class="spotlight-section-header">
            <v-icon small class="mr-2">
              mdi-folder
            </v-icon>
            {{ t('spotlight.sections.instances') }}
          </v-subheader>
          <v-list-item
            v-for="(instance, index) in filteredInstances"
            :key="'instance-' + instance.path"
            :class="{ 'highlighted': highlightedIndex === getInstanceIndex(index) }"
            class="spotlight-item"
            @click="selectInstance(instance)"
          >
            <v-list-item-avatar :size="40">
              <v-img
                v-if="instance.icon"
                :src="instance.icon"
              />
              <v-icon v-else>
                mdi-folder
              </v-icon>
            </v-list-item-avatar>
            <v-list-item-content>
              <v-list-item-title class="font-weight-medium">
                {{ instance.name }}
              </v-list-item-title>
              <v-list-item-subtitle class="spotlight-subtitle">
                {{ instance.runtime?.minecraft }} - {{ getModLoaderName(instance.runtime) }}
              </v-list-item-subtitle>
            </v-list-item-content>
          </v-list-item>

          <!-- ModPacks Section (Market) -->
          <v-subheader v-if="modpackResults.length > 0" class="spotlight-section-header">
            <v-icon small class="mr-2">
              mdi-package-variant
            </v-icon>
            {{ t('spotlight.sections.modpacks') }}
          </v-subheader>
          <v-list-item
            v-for="(pack, index) in modpackResults"
            :key="'modpack-' + pack.id"
            :class="{ 'highlighted': highlightedIndex === getModpackIndex(index) }"
            class="spotlight-item"
            @click="selectModpack(pack)"
          >
            <v-list-item-avatar :size="40">
              <v-img
                v-if="pack.iconUrl"
                :src="pack.iconUrl"
              />
              <v-icon v-else :color="getSourceColor(pack.type)">
                {{ getSourceIconName(pack.type) }}
              </v-icon>
            </v-list-item-avatar>
            <v-list-item-content>
              <v-list-item-title class="font-weight-medium">
                {{ pack.localizedTitle || pack.title }}
              </v-list-item-title>
              <v-list-item-subtitle class="spotlight-subtitle">
                {{ pack.localizedDescription || pack.description }}
              </v-list-item-subtitle>
            </v-list-item-content>
            <v-list-item-action>
              <v-chip x-small :color="getSourceColor(pack.type)">
                {{ pack.type }}
              </v-chip>
            </v-list-item-action>
          </v-list-item>

          <!-- Mods Section (Local) -->
          <v-subheader v-if="localModResults.length > 0 && currentContext === 'mods'" class="spotlight-section-header">
            <v-icon small class="mr-2">
              mdi-puzzle
            </v-icon>
            {{ t('spotlight.sections.mods') }}
          </v-subheader>
          <v-list-item
            v-for="(mod, index) in localModResults"
            :key="'mod-' + mod.id"
            :class="{ 'highlighted': highlightedIndex === getModIndex(index) }"
            class="spotlight-item"
            @click="selectMod(mod)"
          >
            <v-list-item-avatar :size="40">
              <v-img
                v-if="mod.icon"
                :src="mod.icon"
              />
              <v-icon v-else>
                mdi-puzzle
              </v-icon>
            </v-list-item-avatar>
            <v-list-item-content>
              <v-list-item-title class="font-weight-medium">
                {{ mod.title }}
              </v-list-item-title>
              <v-list-item-subtitle class="spotlight-subtitle">
                {{ mod.description }}
              </v-list-item-subtitle>
            </v-list-item-content>
          </v-list-item>

          <!-- Install Mod Suggestion -->
          <v-subheader v-if="showInstallSuggestion && currentContext === 'mods'" class="spotlight-section-header">
            <v-icon small class="mr-2">
              mdi-download
            </v-icon>
            {{ t('spotlight.sections.suggestions') }}
          </v-subheader>
          <v-list-item
            v-if="showInstallSuggestion && currentContext === 'mods'"
            :class="{ 'highlighted': highlightedIndex === getSuggestionIndex() }"
            class="spotlight-item spotlight-suggestion"
            @click="navigateToStore"
          >
            <v-list-item-avatar :size="40">
              <v-icon color="primary">
                mdi-store
              </v-icon>
            </v-list-item-avatar>
            <v-list-item-content>
              <v-list-item-title class="font-weight-medium primary--text">
                {{ t('spotlight.installMod', { modName: searchQuery }) }}
              </v-list-item-title>
              <v-list-item-subtitle class="spotlight-subtitle">
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
          <v-list-item v-if="noResults">
            <v-list-item-content>
              <v-list-item-title class="text-center grey--text">
                {{ t('spotlight.noResults') }}
              </v-list-item-title>
            </v-list-item-content>
          </v-list-item>
        </v-list>

        <v-list v-else dense class="pa-0">
          <!-- Quick Actions -->
          <v-subheader class="spotlight-section-header">
            <v-icon small class="mr-2">
              mdi-flash
            </v-icon>
            {{ t('spotlight.sections.quickActions') }}
          </v-subheader>
          <v-list-item
            v-for="(action, index) in quickActions"
            :key="'action-' + action.id"
            :class="{ 'highlighted': highlightedIndex === index }"
            class="spotlight-item"
            @click="action.action"
          >
            <v-list-item-avatar :size="40">
              <v-icon :color="action.color">
                {{ action.icon }}
              </v-icon>
            </v-list-item-avatar>
            <v-list-item-content>
              <v-list-item-title>
                {{ t(action.label) }}
              </v-list-item-title>
            </v-list-item-content>
            <v-list-item-action>
              <v-chip x-small label>
                {{ action.shortcut }}
              </v-chip>
            </v-list-item-action>
          </v-list-item>

          <!-- Recent Instances -->
          <v-subheader v-if="recentInstances.length > 0" class="spotlight-section-header">
            <v-icon small class="mr-2">
              mdi-history
            </v-icon>
            {{ t('spotlight.sections.recent') }}
          </v-subheader>
          <v-list-item
            v-for="instance in recentInstances"
            :key="'recent-' + instance.path"
            class="spotlight-item"
            @click="selectInstance(instance)"
          >
            <v-list-item-avatar :size="40">
              <v-img
                v-if="instance.icon"
                :src="instance.icon"
              />
              <v-icon v-else>
                mdi-folder
              </v-icon>
            </v-list-item-avatar>
            <v-list-item-content>
              <v-list-item-title class="font-weight-medium">
                {{ instance.name }}
              </v-list-item-title>
              <v-list-item-subtitle class="spotlight-subtitle">
                {{ instance.runtime?.minecraft }}
              </v-list-item-subtitle>
            </v-list-item-content>
          </v-list-item>
        </v-list>
      </v-card-text>

      <v-card-actions v-if="searchQuery.trim()" class="spotlight-footer">
        <v-spacer />
        <v-chip label x-small class="mr-2">
          <v-icon left x-small>
            mdi-arrow-down
          </v-icon>
          {{ t('spotlight.navigate') }}
        </v-chip>
        <v-chip label x-small>
          <v-icon left x-small>
            mdi-keyboard-return
          </v-icon>
          {{ t('spotlight.select') }}
        </v-chip>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts" setup>
import { injection } from '@/util/inject'
import { kInstances } from '@/composables/instances'
import { Instance } from '@xmcl/instance'
import { useSpotlightSearch } from '@/composables/spotlightSearch'
import { useService } from '@/composables/service'
import { InstanceServiceKey } from '@xmcl/runtime-api'

const { t } = useI18n()
const router = useRouter()
const { instances } = injection(kInstances)
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
  { id: 'create', label: 'instances.add', icon: 'mdi-plus', color: 'primary', shortcut: '', action: () => navigateToCreate() },
  { id: 'settings', label: 'setting.name', icon: 'mdi-cog', color: 'grey', shortcut: '', action: () => navigateToSettings() },
  { id: 'mods', label: 'mods.name', icon: 'mdi-puzzle', color: 'blue', shortcut: '', action: () => navigateToMods() },
  { id: 'store', label: 'store.name', icon: 'mdi-store', color: 'green', shortcut: '', action: () => navigateToStore() },
])

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
    currentContext.value === 'mods' &&
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

// Current context based on route
const currentContext = computed(() => {
  if (currentRoute.value.includes('/mods')) return 'mods'
  if (currentRoute.value.includes('/resourcepacks')) return 'resourcepacks'
  if (currentRoute.value.includes('/shaderpacks')) return 'shaderpacks'
  if (currentRoute.value.includes('/save')) return 'saves'
  return 'general'
})

// Index calculation for navigation
const getInstanceIndex = (index: number) => index
const getModpackIndex = (index: number) => filteredInstances.value.length + index
const getModIndex = (index: number) => filteredInstances.value.length + modpackResults.value.length + index
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
  let max = filteredInstances.value.length + modpackResults.value.length + localModResults.value.length - 1
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
  } else if (highlightedIndex.value < filteredInstances.value.length + modpackResults.value.length) {
    const idx = highlightedIndex.value - filteredInstances.value.length
    selectModpack(modpackResults.value[idx])
  } else if (highlightedIndex.value < filteredInstances.value.length + modpackResults.value.length + localModResults.value.length) {
    const idx = highlightedIndex.value - filteredInstances.value.length - modpackResults.value.length
    selectMod(localModResults.value[idx])
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

function selectMod(mod: any) {
  close()
  console.log('Select mod:', mod)
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
  currentRoute.value = router.currentRoute?.path || ''
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
.spotlight-dialog .spotlight-content {
  border-radius: 12px;
  overflow: hidden;
}

.spotlight-dialog .spotlight-card {
  border-radius: 12px;
}

.spotlight-dialog .spotlight-search .v-input__control {
  min-height: 64px;
}

.spotlight-dialog .spotlight-search .v-input__prepend-inner {
  align-self: center;
}

.spotlight-dialog .spotlight-search input {
  font-size: 18px;
  padding: 12px;
}

.spotlight-dialog .spotlight-results {
  max-height: 400px;
  overflow-y: auto;
}

.spotlight-dialog .spotlight-results::-webkit-scrollbar {
  width: 8px;
}

.spotlight-dialog .spotlight-results::-webkit-scrollbar-track {
  background: transparent;
}

.spotlight-dialog .spotlight-results::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
}

.spotlight-dialog .spotlight-section-header {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: rgba(0, 0, 0, 0.6);
  background: rgba(0, 0, 0, 0.02);
  height: 32px;
}

.spotlight-dialog .spotlight-item {
  cursor: pointer;
  transition: background-color 0.2s;
}

.spotlight-dialog .spotlight-item:hover {
  background-color: rgba(0, 0, 0, 0.04);
}

.spotlight-dialog .spotlight-item.highlighted {
  background-color: rgba(0, 0, 0, 0.08);
}

.spotlight-dialog .spotlight-item.spotlight-suggestion {
  border-left: 3px solid;
  border-color: var(--v-primary-base);
}

.spotlight-dialog .spotlight-subtitle {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 400px;
}

.spotlight-dialog .spotlight-footer {
  padding: 8px 16px;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
}
</style> 
