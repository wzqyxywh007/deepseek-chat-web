import { defineStore } from 'pinia'
import { computed, watch, ref } from 'vue'
import type { ModelId, ThemeMode, ReasoningEffort, Settings } from '@/types'
import { migrateModelId, getProvider } from '@/types'
import { storageGet, storageSet, STORAGE_KEYS } from '@/utils/storage'

export const useSettingsStore = defineStore('settings', () => {
  const raw = storageGet<Partial<Settings> & { model?: string }>(STORAGE_KEYS.SETTINGS, {})

  // 迁移旧版模型 ID（deepseek-chat / deepseek-reasoner）
  const migrated = migrateModelId(raw.model ?? 'deepseek-v4-pro')

  const apiKey = ref(raw.apiKey ?? '')
  const doubaoApiKey = ref(raw.doubaoApiKey ?? '')
  const doubaoProxyUrl = ref(raw.doubaoProxyUrl ?? '')
  const novelaiApiKey = ref(raw.novelaiApiKey ?? '')
  const novelaiProxyUrl = ref(raw.novelaiProxyUrl ?? '')
  const model = ref<ModelId>(migrated.model)
  // 若 localStorage 中已有明确的 thinkingMode，优先使用；否则用迁移结果
  const thinkingMode = ref<boolean>(raw.thinkingMode ?? migrated.thinkingMode)
  const reasoningEffort = ref<ReasoningEffort>(raw.reasoningEffort ?? 'high')
  const systemPrompt = ref(raw.systemPrompt ?? '')
  const theme = ref<ThemeMode>(raw.theme ?? 'system')

  /** 根据当前模型的 Provider 判断对应 API Key 是否已填写 */
  const hasApiKey = computed(() => {
    const provider = getProvider(model.value)
    if (provider === 'doubao') return doubaoApiKey.value.trim().length > 0
    if (provider === 'novelai') return novelaiApiKey.value.trim().length > 0
    return apiKey.value.trim().length > 0
  })

  /** 获取当前模型对应的 API Key */
  const currentApiKey = computed(() => {
    const provider = getProvider(model.value)
    if (provider === 'doubao') return doubaoApiKey.value
    if (provider === 'novelai') return novelaiApiKey.value
    return apiKey.value
  })

  function save() {
    storageSet<Settings>(STORAGE_KEYS.SETTINGS, {
      apiKey: apiKey.value,
      doubaoApiKey: doubaoApiKey.value,
      doubaoProxyUrl: doubaoProxyUrl.value,
      novelaiApiKey: novelaiApiKey.value,
      novelaiProxyUrl: novelaiProxyUrl.value,
      model: model.value,
      thinkingMode: thinkingMode.value,
      reasoningEffort: reasoningEffort.value,
      systemPrompt: systemPrompt.value,
      theme: theme.value,
    })
  }

  watch([apiKey, doubaoApiKey, doubaoProxyUrl, novelaiApiKey, novelaiProxyUrl, model, thinkingMode, reasoningEffort, systemPrompt, theme], save)

  return {
    apiKey,
    doubaoApiKey,
    doubaoProxyUrl,
    novelaiApiKey,
    novelaiProxyUrl,
    model,
    thinkingMode,
    reasoningEffort,
    systemPrompt,
    theme,
    hasApiKey,
    currentApiKey,
  }
})
