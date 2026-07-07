<template>
  <Teleport to="body">
    <div v-if="visible" class="modal-overlay" @click.self="cancel">
      <div class="modal">
        <div class="modal__header">
          <h2 class="modal__title">设置</h2>
          <button class="modal__close" @click="cancel" aria-label="关闭">✕</button>
        </div>

        <div class="modal__body">
          <!-- API Key -->
          <div class="form-group">
            <label class="form-label">
              DeepSeek API Key
              <a href="https://platform.deepseek.com/api_keys" target="_blank" class="form-label__link">
                获取 Key →
              </a>
            </label>
            <div class="input-wrap">
              <input
                v-model="form.apiKey"
                :type="showKey ? 'text' : 'password'"
                class="form-input"
                placeholder="sk-..."
                autocomplete="off"
                spellcheck="false"
              />
              <button class="input-toggle" @click="showKey = !showKey" :title="showKey ? '隐藏' : '显示'">
                {{ showKey ? '🙈' : '👁️' }}
              </button>
            </div>
            <p class="form-hint">Key 仅存储在本地浏览器，不会上传到任何服务器</p>
          </div>

          <!-- 模型选择 -->
          <div class="form-group">
            <label class="form-label">模型</label>
            <div class="model-options">
              <label
                v-for="opt in MODEL_OPTIONS"
                :key="opt.value"
                class="model-option"
                :class="{ 'model-option--active': form.model === opt.value }"
              >
                <input type="radio" v-model="form.model" :value="opt.value" class="sr-only" />
                <div class="model-option__content">
                  <span class="model-option__name">{{ opt.label }}</span>
                  <span class="model-option__desc">{{ opt.description }}</span>
                </div>
                <span v-if="form.model === opt.value" class="model-option__check">✓</span>
              </label>
            </div>
          </div>

          <!-- 思考模式 -->
          <div class="form-group">
            <div class="toggle-row">
              <div class="toggle-row__info">
                <span class="toggle-row__label">思考模式</span>
                <span class="toggle-row__desc">开启后 AI 会先进行深度推理再回答</span>
              </div>
              <button
                class="toggle"
                :class="{ 'toggle--on': form.thinkingMode }"
                @click="form.thinkingMode = !form.thinkingMode"
                :aria-pressed="form.thinkingMode"
                aria-label="切换思考模式"
              >
                <span class="toggle__thumb" />
              </button>
            </div>
          </div>

          <!-- 思考深度（仅思考模式开启时显示） -->
          <Transition name="slide-down">
            <div v-if="form.thinkingMode" class="form-group">
              <label class="form-label">思考深度</label>
              <div class="effort-options">
                <button
                  v-for="opt in REASONING_EFFORT_OPTIONS"
                  :key="opt.value"
                  class="effort-btn"
                  :class="{ 'effort-btn--active': form.reasoningEffort === opt.value }"
                  @click="form.reasoningEffort = opt.value"
                >
                  {{ opt.label }}
                </button>
              </div>
              <p class="form-hint">深度越高思考越慢，消耗 token 越多</p>
            </div>
          </Transition>

          <!-- 主题 -->
          <div class="form-group">
            <label class="form-label">主题</label>
            <div class="theme-options">
              <button
                v-for="opt in THEME_OPTIONS"
                :key="opt.value"
                class="theme-btn"
                :class="{ 'theme-btn--active': form.theme === opt.value }"
                @click="form.theme = opt.value"
              >
                <span class="theme-btn__icon">{{ opt.icon }}</span>
                <span>{{ opt.label }}</span>
              </button>
            </div>
          </div>
        </div>

        <div class="modal__footer">
          <button class="btn btn--secondary" @click="cancel">取消</button>
          <button class="btn btn--primary" @click="save">保存</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import { MODEL_OPTIONS, REASONING_EFFORT_OPTIONS, type ModelId, type ThemeMode, type ReasoningEffort } from '@/types'

const props = defineProps<{ visible: boolean }>()
const emit = defineEmits<{ 'update:visible': [val: boolean] }>()

const settingsStore = useSettingsStore()

const THEME_OPTIONS: { value: ThemeMode; label: string; icon: string }[] = [
  { value: 'system', label: '跟随系统', icon: '💻' },
  { value: 'light', label: '亮色', icon: '☀️' },
  { value: 'dark', label: '暗色', icon: '🌙' },
]

const showKey = ref(false)
const form = ref({
  apiKey: '',
  model: 'deepseek-v4-pro' as ModelId,
  thinkingMode: true,
  reasoningEffort: 'high' as ReasoningEffort,
  theme: 'system' as ThemeMode,
})

watch(() => props.visible, (v) => {
  if (v) {
    form.value = {
      apiKey: settingsStore.apiKey,
      model: settingsStore.model,
      thinkingMode: settingsStore.thinkingMode,
      reasoningEffort: settingsStore.reasoningEffort,
      theme: settingsStore.theme,
    }
    showKey.value = false
  }
})

function save() {
  settingsStore.apiKey = form.value.apiKey.trim()
  settingsStore.model = form.value.model
  settingsStore.thinkingMode = form.value.thinkingMode
  settingsStore.reasoningEffort = form.value.reasoningEffort
  settingsStore.theme = form.value.theme
  emit('update:visible', false)
}

function cancel() {
  emit('update:visible', false)
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: var(--bg-overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 16px;
}

.modal {
  background: var(--bg-primary);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  width: 100%;
  max-width: 480px;
  display: flex;
  flex-direction: column;
  max-height: 90vh;
  overflow: hidden;
}

.modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 16px;
  border-bottom: 1px solid var(--border-color);
}

.modal__title {
  font-size: 18px;
  font-weight: 600;
}

.modal__close {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  font-size: 14px;
  transition: background var(--transition);
}
.modal__close:hover {
  background: var(--bg-hover);
}

.modal__body {
  padding: 20px 24px;
  overflow-y: auto;
  flex: 1;
}

.modal__footer {
  padding: 16px 24px;
  border-top: 1px solid var(--border-color);
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.form-group {
  margin-bottom: 22px;
}

.form-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.form-label__link {
  font-size: 12px;
  color: var(--accent);
}

.input-wrap {
  position: relative;
}

.form-input {
  width: 100%;
  padding: 10px 40px 10px 12px;
  border: 1px solid var(--border-input);
  border-radius: var(--radius-sm);
  background: var(--bg-input);
  font-size: 14px;
  transition: border-color var(--transition);
}
.form-input:focus {
  border-color: var(--accent);
}

.input-toggle {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 16px;
  line-height: 1;
  opacity: 0.7;
}
.input-toggle:hover {
  opacity: 1;
}

.form-hint {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 6px;
}

.model-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.model-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border: 1.5px solid var(--border-color);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: border-color var(--transition), background var(--transition);
}
.model-option:hover {
  border-color: var(--accent);
  background: var(--accent-light);
}
.model-option--active {
  border-color: var(--accent);
  background: var(--accent-light);
}

.model-option__content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.model-option__name {
  font-size: 14px;
  font-weight: 500;
}

.model-option__desc {
  font-size: 12px;
  color: var(--text-secondary);
}

.model-option__check {
  color: var(--accent);
  font-weight: 600;
  font-size: 16px;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
}

.theme-options {
  display: flex;
  gap: 8px;
}

.theme-btn {
  flex: 1;
  padding: 10px 8px;
  border: 1.5px solid var(--border-color);
  border-radius: var(--radius-md);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  transition: border-color var(--transition), background var(--transition);
}
.theme-btn:hover {
  border-color: var(--accent);
  background: var(--accent-light);
}
.theme-btn--active {
  border-color: var(--accent);
  background: var(--accent-light);
  color: var(--accent);
  font-weight: 500;
}

.theme-btn__icon {
  font-size: 20px;
}

.btn {
  padding: 9px 20px;
  border-radius: var(--radius-sm);
  font-size: 14px;
  font-weight: 500;
  transition: background var(--transition), opacity var(--transition);
}
.btn--primary {
  background: var(--accent);
  color: #fff;
}
.btn--primary:hover {
  background: var(--accent-hover);
}
.btn--secondary {
  background: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}
.btn--secondary:hover {
  background: var(--bg-hover);
}

/* 思考模式 toggle */
.toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.toggle-row__info {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.toggle-row__label {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.toggle-row__desc {
  font-size: 12px;
  color: var(--text-muted);
}

.toggle {
  position: relative;
  width: 44px;
  height: 24px;
  border-radius: 12px;
  background: var(--border-color);
  flex-shrink: 0;
  transition: background 0.2s ease;
}
.toggle--on {
  background: var(--accent);
}

.toggle__thumb {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
  transition: transform 0.2s ease;
}
.toggle--on .toggle__thumb {
  transform: translateX(20px);
}

/* 思考深度 */
.effort-options {
  display: flex;
  gap: 8px;
}

.effort-btn {
  flex: 1;
  padding: 8px 4px;
  border: 1.5px solid var(--border-color);
  border-radius: var(--radius-sm);
  font-size: 13px;
  transition: border-color var(--transition), background var(--transition), color var(--transition);
}
.effort-btn:hover {
  border-color: var(--accent);
  background: var(--accent-light);
}
.effort-btn--active {
  border-color: var(--accent);
  background: var(--accent-light);
  color: var(--accent);
  font-weight: 600;
}

/* 折叠动画 */
.slide-down-enter-active,
.slide-down-leave-active {
  transition: max-height 0.25s ease, opacity 0.2s ease;
  max-height: 120px;
  overflow: hidden;
}
.slide-down-enter-from,
.slide-down-leave-to {
  max-height: 0;
  opacity: 0;
}
</style>
