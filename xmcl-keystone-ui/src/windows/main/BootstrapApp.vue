<template>
  <v-app class="h-full max-h-screen overflow-auto overflow-x-hidden" :class="{ 'dark': isDark }">
    <AppSystemBar no-user no-task />
    <div class="relative flex h-full overflow-auto">
      <Setup @ready="onReady" />
    </div>
    <AppFeedbackDialog />
  </v-app>
</template>

<script lang="ts" setup>
import { kTheme, getDefaultTheme, BackgroundType } from '@/composables/theme'
import { kSettingsState, useSettingsState } from '@/composables/setting'
import { kEnvironment, useEnvironment } from '@/composables/environment'
import { useI18nSync } from '@/composables/i18n'
import { vuetify } from '@/vuetify'
import { usePreferredDark } from '@vueuse/core'
import AppSystemBar from '@/views/AppSystemBar.vue'
import AppFeedbackDialog from '@/views/AppFeedbackDialog.vue'
import Setup from '@/views/Setup.vue'

// Minimal settings state — BaseService reads from appDataPath, always available
const settings = useSettingsState()
provide(kSettingsState, settings)

// Environment info
provide(kEnvironment, useEnvironment())

// Minimal theme — does NOT call ThemeService (game data path not ready yet)
const currentTheme = ref(getDefaultTheme())
const preferred = usePreferredDark()
const isDark = computed(() =>
  currentTheme.value.dark === 'system' ? preferred.value : (currentTheme.value.dark as boolean),
)

provide(kTheme, {
  currentTheme,
  isDark,
  dark: computed(() => currentTheme.value.dark),
  backgroundType: computed(() => currentTheme.value.backgroundType ?? BackgroundType.NONE),
  blur: computed(() => currentTheme.value.blur?.background ?? 0),
  blurCard: computed(() => currentTheme.value.blur?.card ?? 22),
  blurSidebar: computed(() => currentTheme.value.blur?.sideBar ?? 4),
  blurAppBar: computed(() => currentTheme.value.blur?.appBar ?? 4),
  appBarColor: computed(() =>
    isDark.value
      ? currentTheme.value.colors.darkAppBarColor
      : currentTheme.value.colors.lightAppBarColor,
  ),
  sideBarColor: computed(() =>
    isDark.value
      ? currentTheme.value.colors.darkSideBarColor
      : currentTheme.value.colors.lightSideBarColor,
  ),
  primaryColor: computed(() =>
    isDark.value
      ? currentTheme.value.colors.darkPrimaryColor
      : currentTheme.value.colors.lightPrimaryColor,
  ),
  backgroundColor: computed(() =>
    isDark.value
      ? currentTheme.value.colors.darkBackground
      : currentTheme.value.colors.lightBackground,
  ),
  backgroundImage: computed(() => undefined),
  backgroundColorOverlay: computed(() => false),
  backgroundMusic: computed(() => []),
  backgroundImageFit: computed(() => 'cover' as const),
  backgroundType: computed(() => currentTheme.value.backgroundType ?? BackgroundType.NONE),
  volume: computed(() => 1),
  font: computed(() => undefined),
  fontSize: computed(() => 16),
  particleMode: computed(() => 'push' as any),
  infoColor: computed(() => isDark.value ? currentTheme.value.colors.darkInfoColor : currentTheme.value.colors.lightInfoColor),
  errorColor: computed(() => isDark.value ? currentTheme.value.colors.darkErrorColor : currentTheme.value.colors.lightErrorColor),
  warningColor: computed(() => isDark.value ? currentTheme.value.colors.darkWarningColor : currentTheme.value.colors.lightWarningColor),
  successColor: computed(() => isDark.value ? currentTheme.value.colors.darkSuccessColor : currentTheme.value.colors.lightSuccessColor),
  accentColor: computed(() => isDark.value ? currentTheme.value.colors.darkAccentColor : currentTheme.value.colors.lightAccentColor),
  cardColor: computed(() => isDark.value ? currentTheme.value.colors.darkCardColor : currentTheme.value.colors.lightCardColor),
  colors: computed(() => currentTheme.value.colors),
  storedThemes: computed(() => []),
  suppressed: ref(false),
  // write stubs (not needed during setup)
  saveCurrentTheme: async () => {},
  saveToStore: async () => {},
  loadFromStore: async () => {},
  deleteFromStore: async () => {},
  refreshStoredThemes: async () => {},
})

// Sync i18n with settings locale
useI18nSync(vuetify.framework, settings.state)

// After bootstrap completes, save theme preference then reload without ?bootstrap
// so normal app initializes with game data path already set
async function onReady(data: any) {
  if (settings.state.value && data?.theme) {
    settings.state.value.themeSet?.(data.theme)
  }
  const url = new URL(window.location.href)
  url.searchParams.delete('bootstrap')
  window.location.replace(url.toString())
}
</script>
