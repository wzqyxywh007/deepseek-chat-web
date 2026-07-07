<template>
  <Teleport to="body">
    <div class="toast-container">
      <TransitionGroup name="toast">
        <div
          v-for="t in toasts"
          :key="t.id"
          class="toast"
          :class="`toast--${t.type}`"
          @click="dismiss(t.id)"
        >
          <span class="toast__icon">{{ ICONS[t.type] }}</span>
          <div class="toast__body">
            <span class="toast__message">{{ t.message }}</span>
            <span v-if="t.detail" class="toast__detail">{{ t.detail }}</span>
          </div>
          <button class="toast__close" @click.stop="dismiss(t.id)">✕</button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { toasts, dismiss } from '@/utils/toast'
import type { ToastType } from '@/utils/toast'

const ICONS: Record<ToastType, string> = {
  error: '🚫',
  warning: '⚠️',
  success: '✅',
  info: 'ℹ️',
}
</script>

<style scoped>
.toast-container {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 2000;
  display: flex;
  flex-direction: column;
  gap: 10px;
  pointer-events: none;
  width: min(420px, calc(100vw - 32px));
}

.toast {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 13px 14px;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  pointer-events: all;
  cursor: pointer;
  border-left: 4px solid transparent;
}

.toast--error {
  background: #fff1f0;
  border-left-color: #e53935;
  color: #b71c1c;
}
.toast--warning {
  background: #fffde7;
  border-left-color: #f9a825;
  color: #795548;
}
.toast--success {
  background: #f1f8e9;
  border-left-color: #43a047;
  color: #1b5e20;
}
.toast--info {
  background: #e8f0fe;
  border-left-color: #1a6bf7;
  color: #1a237e;
}

[data-theme='dark'] .toast--error { background: #2a1515; color: #ef9a9a; }
[data-theme='dark'] .toast--warning { background: #2a2010; color: #ffcc80; }
[data-theme='dark'] .toast--success { background: #152a15; color: #a5d6a7; }
[data-theme='dark'] .toast--info { background: #151e2a; color: #90caf9; }

.toast__icon {
  font-size: 16px;
  flex-shrink: 0;
  margin-top: 1px;
}

.toast__body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.toast__message {
  font-size: 14px;
  font-weight: 600;
  line-height: 1.4;
}

.toast__detail {
  font-size: 12px;
  opacity: 0.8;
  line-height: 1.4;
}

.toast__close {
  font-size: 12px;
  opacity: 0.5;
  flex-shrink: 0;
  padding: 2px 4px;
  border-radius: 3px;
  transition: opacity var(--transition);
}
.toast__close:hover {
  opacity: 1;
}

/* 动画 */
.toast-enter-active {
  transition: all 0.28s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
.toast-leave-active {
  transition: all 0.2s ease;
}
.toast-enter-from {
  opacity: 0;
  transform: translateY(-12px) scale(0.95);
}
.toast-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
