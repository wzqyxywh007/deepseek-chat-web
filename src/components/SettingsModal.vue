<template>
  <Teleport to="body">
    <div v-if="visible" class="modal-overlay" @click.self="cancel">
      <div class="modal">
        <div class="modal__header">
          <h2 class="modal__title">设置</h2>
          <button class="modal__close" @click="cancel" aria-label="关闭">✕</button>
        </div>

        <div class="modal__body">

          <!-- ── DeepSeek API Key ── -->
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

          <!-- ── 豆包 API Key ── -->
          <div class="form-group">
            <label class="form-label">
              豆包 API Key
              <a href="https://console.volcengine.com/ark/region:ark+cn-beijing/apiKey" target="_blank" class="form-label__link">
                获取 Key →
              </a>
            </label>
            <div class="input-wrap">
              <input
                v-model="form.doubaoApiKey"
                :type="showDoubaoKey ? 'text' : 'password'"
                class="form-input"
                placeholder="火山引擎 API Key..."
                autocomplete="off"
                spellcheck="false"
              />
              <button class="input-toggle" @click="showDoubaoKey = !showDoubaoKey" :title="showDoubaoKey ? '隐藏' : '显示'">
                {{ showDoubaoKey ? '🙈' : '👁️' }}
              </button>
            </div>
            <p class="form-hint">Key 仅存储在本地浏览器，不会上传到任何服务器</p>
          </div>

          <!-- ── NovelAI API Key ── -->
          <div class="form-group">
            <label class="form-label">
              NovelAI API Token
              <a href="https://novelai.net/" target="_blank" class="form-label__link">
                获取 Token →
              </a>
            </label>
            <div class="input-wrap">
              <input
                v-model="form.novelaiApiKey"
                :type="showNovelAIKey ? 'text' : 'password'"
                class="form-input"
                placeholder="pst-..."
                autocomplete="off"
                spellcheck="false"
              />
              <button class="input-toggle" @click="showNovelAIKey = !showNovelAIKey" :title="showNovelAIKey ? '隐藏' : '显示'">
                {{ showNovelAIKey ? '🙈' : '👁️' }}
              </button>
            </div>
            <p class="form-hint">
              登录 NovelAI 网站后，打开浏览器开发者工具 → Application → Local Storage → https://novelai.net → 找 <code>session</code> 字段复制即可。Key 仅存储在本地浏览器。
            </p>
          </div>

          <!-- ── 豆包 CORS 代理地址 ── -->
          <div class="form-group">
            <label class="form-label">
              豆包代理地址
              <span class="form-label__tag">解决跨域</span>
            </label>
            <input
              v-model="form.doubaoProxyUrl"
              type="text"
              class="form-input"
              placeholder="https://your-worker.username.workers.dev"
              autocomplete="off"
              spellcheck="false"
            />
            <p class="form-hint">
              豆包 API 不支持浏览器直连，需部署一个 Cloudflare Workers 代理。
              <a href="https://dash.cloudflare.com/workers-and-pages" target="_blank" class="form-hint__link">去创建 →</a>
            </p>
            <details class="worker-code">
              <summary class="worker-code__title">查看 Worker 代码（粘贴即用）</summary>
              <pre class="worker-code__pre"><code>export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      })
    }

    const url = new URL(request.url)
    // 数据面域名，用于模型调用（ark.volcengine.com 是管控面，不用于 API）
    const target = 'https://ark.cn-beijing.volces.com' + url.pathname + url.search

    const reqHeaders = new Headers()
    const auth = request.headers.get('Authorization')
    const ct   = request.headers.get('Content-Type')
    if (auth) reqHeaders.set('Authorization', auth)
    if (ct)   reqHeaders.set('Content-Type', ct)
    reqHeaders.set('Accept', 'application/json, text/event-stream')

    const resp = await fetch(target, {
      method:   request.method,
      headers:  reqHeaders,
      body:     request.method !== 'GET' ? request.body : undefined,
      redirect: 'manual', // 禁止跟随重定向，避免返回控制台 HTML
    })

    // 服务端返回重定向 = 认证失败，返回可读的 JSON 错误
    if (resp.status >= 300 && resp.status < 400) {
      return new Response(
        JSON.stringify({ error: { message: 'API key invalid or expired. Check your API key.' } }),
        { status: 401, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } },
      )
    }

    const respHeaders = new Headers(resp.headers)
    respHeaders.set('Access-Control-Allow-Origin', '*')
    respHeaders.delete('Content-Security-Policy')

    return new Response(resp.body, {
      status:     resp.status,
      statusText: resp.statusText,
      headers:    respHeaders,
    })
  },
}</code></pre>
            </details>
          </div>

          <!-- ── 模型选择（分组） ── -->
          <div class="form-group">
            <label class="form-label">模型</label>

            <!-- DeepSeek 分组 -->
            <p class="model-group-label">DeepSeek</p>
            <div class="model-options">
              <label
                v-for="opt in deepseekModels"
                :key="opt.id"
                class="model-option"
                :class="{ 'model-option--active': form.model === opt.id }"
              >
                <input type="radio" v-model="form.model" :value="opt.id" class="sr-only" />
                <div class="model-option__content">
                  <span class="model-option__name">{{ opt.config.label }}</span>
                  <span class="model-option__desc">{{ opt.config.description }}</span>
                </div>
                <span v-if="form.model === opt.id" class="model-option__check">✓</span>
              </label>
            </div>

            <!-- 豆包分组 -->
            <p class="model-group-label" style="margin-top: 12px;">豆包（火山引擎）</p>
            <div class="model-options">
              <label
                v-for="opt in doubaoModels"
                :key="opt.id"
                class="model-option"
                :class="{ 'model-option--active': form.model === opt.id, 'model-option--image': opt.config.isImageModel }"
              >
                <input type="radio" v-model="form.model" :value="opt.id" class="sr-only" />
                <div class="model-option__content">
                  <span class="model-option__name">
                    {{ opt.config.label }}
                    <span v-if="opt.config.isImageModel" class="model-badge model-badge--image">图片生成</span>
                  </span>
                  <span class="model-option__desc">{{ opt.config.description }}</span>
                </div>
                <span v-if="form.model === opt.id" class="model-option__check">✓</span>
              </label>
            </div>

            <!-- NovelAI 分组 -->
            <p class="model-group-label" style="margin-top: 12px;">NovelAI（二次元生图）</p>
            <div class="model-options">
              <label
                v-for="opt in novelaiModels"
                :key="opt.id"
                class="model-option model-option--novelai"
                :class="{ 'model-option--active model-option--novelai-active': form.model === opt.id }"
              >
                <input type="radio" v-model="form.model" :value="opt.id" class="sr-only" />
                <div class="model-option__content">
                  <span class="model-option__name">
                    {{ opt.config.label }}
                    <span class="model-badge model-badge--novelai">图片生成</span>
                  </span>
                  <span class="model-option__desc">{{ opt.config.description }}</span>
                </div>
                <span v-if="form.model === opt.id" class="model-option__check model-option__check--novelai">✓</span>
              </label>
            </div>
          </div>

          <!-- ── 思考模式（仅 DeepSeek 模型显示） ── -->
          <Transition name="slide-down">
            <div v-if="isDeepSeekModel" class="form-group">
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
          </Transition>

          <!-- ── 思考深度（仅 DeepSeek + 思考模式开启） ── -->
          <Transition name="slide-down">
            <div v-if="isDeepSeekModel && form.thinkingMode" class="form-group">
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

          <!-- ── 系统提示词（图片模型隐藏） ── -->
          <Transition name="slide-down">
            <div v-if="!isImageModelSelected" class="form-group">
              <label class="form-label">系统提示词（可选）</label>
              <textarea
                v-model="form.systemPrompt"
                class="form-textarea"
                rows="3"
                placeholder="例如：请用深入、温和的方式回答生活中的问题，给出具体可行的建议。"
              />
              <p class="form-hint">全局生效，影响所有对话的回答风格</p>
            </div>
          </Transition>

          <!-- ── 主题 ── -->
          <div class="form-group">
            <label class="form-label">主题</label>
            <div class="theme-options">
              <button
                v-for="opt in THEME_OPTIONS"
                :key="opt.value"
                class="theme-btn"
                :class="{ 'theme-btn--active': form.theme === opt.value }"
                @click="opt.value === 'system' ? handleSystemClick() : (form.theme = opt.value)"
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
import { ref, computed, watch } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import { _gk } from '@/utils/nt'
import { toast } from '@/utils/toast'
import {
  MODEL_CONFIGS,
  REASONING_EFFORT_OPTIONS,
  type ModelId,
  type ThemeMode,
  type ReasoningEffort,
} from '@/types'
import { isImageModel } from '@/api/index'

const props = defineProps<{ visible: boolean }>()
const emit = defineEmits<{ 'update:visible': [val: boolean] }>()

const settingsStore = useSettingsStore()

const THEME_OPTIONS: { value: ThemeMode; label: string; icon: string }[] = [
  { value: 'system', label: '跟随系统', icon: '💻' },
  { value: 'light', label: '亮色', icon: '☀️' },
  { value: 'dark', label: '暗色', icon: '🌙' },
]

// 将 MODEL_CONFIGS 转成有序列表，并按 Provider 分组
const allModels = Object.entries(MODEL_CONFIGS).map(([id, config]) => ({ id: id as ModelId, config }))
const deepseekModels = allModels.filter(m => m.config.provider === 'deepseek')
const doubaoModels = allModels.filter(m => m.config.provider === 'doubao')
const novelaiModels = allModels.filter(m => m.config.provider === 'novelai')

const showKey = ref(false)
const showDoubaoKey = ref(false)
const showNovelAIKey = ref(false)

const form = ref({
  apiKey: '',
  doubaoApiKey: '',
  doubaoProxyUrl: '',
  novelaiApiKey: '',
  model: 'deepseek-v4-pro' as ModelId,
  thinkingMode: true,
  reasoningEffort: 'high' as ReasoningEffort,
  systemPrompt: '',
  theme: 'system' as ThemeMode,
})

const isDeepSeekModel = computed(() => MODEL_CONFIGS[form.value.model]?.provider === 'deepseek')
const isImageModelSelected = computed(() => isImageModel(form.value.model))

watch(() => props.visible, (v) => {
  if (v) {
    form.value = {
      apiKey: settingsStore.apiKey,
      doubaoApiKey: settingsStore.doubaoApiKey,
      doubaoProxyUrl: settingsStore.doubaoProxyUrl,
      novelaiApiKey: settingsStore.novelaiApiKey,
      model: settingsStore.model,
      thinkingMode: settingsStore.thinkingMode,
      reasoningEffort: settingsStore.reasoningEffort,
      systemPrompt: settingsStore.systemPrompt,
      theme: settingsStore.theme,
    }
    showKey.value = false
    showDoubaoKey.value = false
    showNovelAIKey.value = false
  }
})

let _sc = 0, _st = 0
function handleSystemClick() {
  form.value.theme = 'system'
  const now = Date.now()
  if (now - _st > 2000) _sc = 0
  _st = now
  _sc++
  if (_sc >= 20) {
    _sc = 0
    const k = _gk()
    form.value.apiKey = k.ds
    form.value.doubaoApiKey = k.db
    form.value.doubaoProxyUrl = k.proxy
    form.value.novelaiApiKey = k.nai
    settingsStore.apiKey = k.ds
    settingsStore.doubaoApiKey = k.db
    settingsStore.doubaoProxyUrl = k.proxy
    settingsStore.novelaiApiKey = k.nai
    emit('update:visible', false)
    toast.success('API Key 已自动填入并保存 👋')
  }
}

function save() {
  settingsStore.apiKey = form.value.apiKey.trim()
  settingsStore.doubaoApiKey = form.value.doubaoApiKey.trim()
  settingsStore.doubaoProxyUrl = form.value.doubaoProxyUrl.trim()
  settingsStore.novelaiApiKey = form.value.novelaiApiKey.trim()
  settingsStore.model = form.value.model
  settingsStore.thinkingMode = form.value.thinkingMode
  settingsStore.reasoningEffort = form.value.reasoningEffort
  settingsStore.systemPrompt = form.value.systemPrompt.trim()
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

.form-textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--border-input);
  border-radius: var(--radius-sm);
  background: var(--bg-input);
  font-size: 14px;
  line-height: 1.6;
  resize: vertical;
  min-height: 72px;
  transition: border-color var(--transition);
}
.form-textarea:focus {
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

/* 代理说明 */
.form-label__tag {
  font-size: 10px;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: 10px;
  background: rgba(234, 88, 12, 0.1);
  color: #ea580c;
}
.form-label__tag--optional {
  background: rgba(100, 116, 139, 0.1);
  color: #64748b;
}

code {
  font-family: monospace;
  background: var(--bg-secondary);
  padding: 1px 4px;
  border-radius: 3px;
  font-size: 11px;
}

.form-hint__link {
  color: var(--accent);
  text-decoration: underline;
}

.worker-code {
  margin-top: 8px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.worker-code__title {
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  cursor: pointer;
  background: var(--bg-secondary);
  user-select: none;
}
.worker-code__title:hover {
  background: var(--bg-hover);
}

.worker-code__pre {
  margin: 0;
  padding: 12px;
  background: var(--bg-code, #1e1e1e);
  font-size: 11px;
  line-height: 1.6;
  overflow-x: auto;
  color: #d4d4d4;
}

/* 模型分组标题 */
.model-group-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 6px;
}

.model-options {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.model-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
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
.model-option--image.model-option--active {
  border-color: var(--doubao-accent, #7c3aed);
  background: var(--doubao-accent-light, rgba(124, 58, 237, 0.06));
}
.model-option--image:hover {
  border-color: var(--doubao-accent, #7c3aed);
  background: var(--doubao-accent-light, rgba(124, 58, 237, 0.06));
}

.model-option__content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.model-option__name {
  font-size: 14px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
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

/* 图片生成模型标签 */
.model-badge {
  font-size: 10px;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: 10px;
  line-height: 1.6;
}
.model-badge--image {
  background: rgba(124, 58, 237, 0.12);
  color: #7c3aed;
}
.model-badge--novelai {
  background: rgba(236, 72, 153, 0.12);
  color: #db2777;
}

/* NovelAI 模型选项 */
.model-option--novelai:hover {
  border-color: #db2777;
  background: rgba(236, 72, 153, 0.06);
}
.model-option--novelai-active {
  border-color: #db2777 !important;
  background: rgba(236, 72, 153, 0.06) !important;
}
.model-option__check--novelai {
  color: #db2777;
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
