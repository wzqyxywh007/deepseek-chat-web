import { defineStore } from 'pinia'
import { computed, watch, ref } from 'vue'
import type { ModelId, ThemeMode, ReasoningEffort, Settings } from '@/types'
import { migrateModelId } from '@/types'
import { storageGet, storageSet, STORAGE_KEYS } from '@/utils/storage'

export const useSettingsStore = defineStore('settings', () => {
  const raw = storageGet<Partial<Settings> & { model?: string }>(STORAGE_KEYS.SETTINGS, {})

  // 迁移旧版模型 ID（deepseek-chat / deepseek-reasoner）
  const migrated = migrateModelId(raw.model ?? 'deepseek-v4-pro')

  const apiKey = ref(raw.apiKey ?? '')
  const model = ref<ModelId>(migrated.model)
  // 若 localStorage 中已有明确的 thinkingMode，优先使用；否则用迁移结果
  const thinkingMode = ref<boolean>(raw.thinkingMode ?? migrated.thinkingMode)
  const reasoningEffort = ref<ReasoningEffort>(raw.reasoningEffort ?? 'high')
  const theme = ref<ThemeMode>(raw.theme ?? 'system')

  const hasApiKey = computed(() => apiKey.value.trim().length > 0)

  function save() {
    storageSet<Settings>(STORAGE_KEYS.SETTINGS, {
      apiKey: apiKey.value,
      model: model.value,
      thinkingMode: thinkingMode.value,
      reasoningEffort: reasoningEffort.value,
      theme: theme.value,
    })
  }

  watch([apiKey, model, thinkingMode, reasoningEffort, theme], save)

  return { apiKey, model, thinkingMode, reasoningEffort, theme, hasApiKey }
})
