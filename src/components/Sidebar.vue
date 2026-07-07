<template>
  <!-- 移动端遮罩 -->
  <Transition name="fade">
    <div v-if="isMobile && modelValue" class="sidebar-overlay" @click="emit('update:modelValue', false)" />
  </Transition>

  <!-- 侧边栏主体 -->
  <Transition name="slide">
    <aside v-show="!isMobile || modelValue" class="sidebar" :class="{ 'sidebar--mobile': isMobile }">
      <div class="sidebar__top">
        <button class="new-chat-btn" @click="handleNewChat">
          <span class="new-chat-btn__icon">✏️</span>
          <span>新建对话</span>
        </button>
      </div>

      <nav class="sidebar__list">
        <div
          v-for="session in chatStore.sessions"
          :key="session.id"
          class="session-item"
          :class="{ 'session-item--active': session.id === chatStore.currentSessionId }"
          @click="handleSwitch(session.id)"
        >
          <template v-if="editingId === session.id">
            <input
              ref="editInput"
              v-model="editTitle"
              class="session-item__edit"
              @blur="commitRename(session.id)"
              @keyup.enter="commitRename(session.id)"
              @keyup.escape="cancelRename"
              @click.stop
            />
          </template>
          <template v-else>
            <span class="session-item__title">{{ session.title }}</span>
            <div class="session-item__actions" @click.stop>
              <button
                class="action-btn"
                title="重命名"
                @click="startRename(session.id, session.title)"
              >✏</button>
              <button
                class="action-btn action-btn--danger"
                title="删除"
                @click="handleDelete(session.id)"
              >🗑</button>
            </div>
          </template>
        </div>
      </nav>
    </aside>
  </Transition>
</template>

<script setup lang="ts">
import { ref, nextTick, onMounted, onUnmounted } from 'vue'
import { useChatStore } from '@/stores/chat'

defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [val: boolean] }>()

const chatStore = useChatStore()
const isMobile = ref(false)
const editingId = ref<string | null>(null)
const editTitle = ref('')
const editInput = ref<HTMLInputElement | null>(null)

function checkMobile() {
  isMobile.value = window.innerWidth < 768
}

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
})
onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})

function handleNewChat() {
  chatStore.createSession()
  if (isMobile.value) emit('update:modelValue', false)
}

function handleSwitch(id: string) {
  chatStore.switchSession(id)
  if (isMobile.value) emit('update:modelValue', false)
}

function handleDelete(id: string) {
  if (chatStore.sessions.length === 1) {
    chatStore.deleteSession(id)
    return
  }
  if (confirm('确认删除该对话？')) {
    chatStore.deleteSession(id)
  }
}

function startRename(id: string, title: string) {
  editingId.value = id
  editTitle.value = title
  nextTick(() => editInput.value?.focus())
}

function commitRename(id: string) {
  if (editingId.value) {
    chatStore.renameSession(id, editTitle.value)
    editingId.value = null
  }
}

function cancelRename() {
  editingId.value = null
}
</script>

<style scoped>
.sidebar-overlay {
  position: fixed;
  inset: 0;
  background: var(--bg-overlay);
  z-index: 99;
}

.sidebar {
  width: var(--sidebar-width);
  height: 100%;
  background: var(--bg-sidebar);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  transition: background var(--transition);
}

.sidebar--mobile {
  position: fixed;
  left: 0;
  top: 0;
  z-index: 100;
  box-shadow: var(--shadow-lg);
}

.sidebar__top {
  padding: 16px 12px 8px;
}

.new-chat-btn {
  width: 100%;
  padding: 10px 14px;
  border-radius: var(--radius-md);
  border: 1.5px dashed var(--border-color);
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--text-secondary);
  transition: background var(--transition), border-color var(--transition);
}
.new-chat-btn:hover {
  background: var(--bg-hover);
  border-color: var(--accent);
  color: var(--accent);
}

.new-chat-btn__icon {
  font-size: 16px;
}

.sidebar__list {
  flex: 1;
  overflow-y: auto;
  padding: 4px 8px 16px;
}

.session-item {
  display: flex;
  align-items: center;
  padding: 9px 10px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background var(--transition);
  gap: 8px;
  min-height: 38px;
}
.session-item:hover {
  background: var(--bg-hover);
}
.session-item--active {
  background: var(--bg-active);
  color: var(--accent);
}

.session-item__title {
  flex: 1;
  font-size: 13.5px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.session-item__actions {
  display: none;
  gap: 2px;
  flex-shrink: 0;
}
.session-item:hover .session-item__actions,
.session-item--active .session-item__actions {
  display: flex;
}

.action-btn {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.6;
  transition: background var(--transition), opacity var(--transition);
}
.action-btn:hover {
  background: var(--bg-hover);
  opacity: 1;
}
.action-btn--danger:hover {
  background: rgba(229, 57, 53, 0.1);
  color: var(--danger);
}

.session-item__edit {
  flex: 1;
  border: 1px solid var(--accent);
  border-radius: 4px;
  padding: 2px 6px;
  font-size: 13.5px;
  background: var(--bg-input);
}

/* Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-enter-active,
.slide-leave-active {
  transition: transform 0.25s ease;
}
.slide-enter-from,
.slide-leave-to {
  transform: translateX(-100%);
}
</style>
