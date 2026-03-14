import { useEventListener } from '@vueuse/core'
import { Ref, ref } from 'vue'

export interface UseSpotlightReturn {
  isVisible: Ref<boolean>
  open: () => void
  close: () => void
  toggle: () => void
}

/**
 * Composable to handle Spotlight keyboard shortcut
 * Default: Ctrl+K or Cmd+K (more standard for search)
 * Alternative: Ctrl+Tab or Cmd+Tab
 */
export function useSpotlight(): UseSpotlightReturn {
  const isVisible = ref(false)

  const open = () => {
    isVisible.value = true
  }

  const close = () => {
    isVisible.value = false
  }

  const toggle = () => {
    isVisible.value = !isVisible.value
  }

  // Register global keyboard shortcut
  useEventListener(document, 'keydown', (e: KeyboardEvent) => {
    // Ctrl+K or Cmd+K to toggle spotlight (standard search shortcut)
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault()
      e.stopPropagation()
      toggle()
      return
    }

    // Ctrl+Tab or Cmd+Tab as alternative
    if ((e.ctrlKey || e.metaKey) && e.key === 'Tab') {
      e.preventDefault()
      e.stopPropagation()
      toggle()
      return
    }

    // Escape to close
    if (e.key === 'Escape' && isVisible.value) {
      e.preventDefault()
      e.stopPropagation()
      close()
    }
  }, { capture: true })

  return {
    isVisible,
    open,
    close,
    toggle,
  }
}

/**
 * Composable to handle Spotlight keyboard shortcut only (without state)
 * This is useful when the Spotlight component manages its own state
 */
export function useSpotlightShortcut(onTriggered: () => void) {
  useEventListener(document, 'keydown', (e: KeyboardEvent) => {
    // Ctrl+K or Cmd+K to trigger spotlight (standard search shortcut)
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault()
      e.stopPropagation()
      onTriggered()
      return
    }

    // Ctrl+Tab or Cmd+Tab as alternative
    if ((e.ctrlKey || e.metaKey) && e.key === 'Tab') {
      e.preventDefault()
      e.stopPropagation()
      onTriggered()
      return
    }
  }, { capture: true })
} 
