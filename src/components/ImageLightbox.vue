<template>
  <Teleport to="body">
    <Transition name="lb-fade">
      <div v-if="lb.isOpen.value" class="lb-overlay" @click.self="lb.close()">

        <!-- 关闭按钮 -->
        <button class="lb-close" @click="lb.close()" aria-label="关闭">✕</button>

        <!-- 计数器 -->
        <div class="lb-counter">{{ lb.currentIndex.value + 1 }} / {{ lb.images.value.length }}</div>

        <!-- 左箭头 -->
        <button
          v-if="lb.images.value.length > 1"
          class="lb-arrow lb-arrow--left"
          :class="{ 'lb-arrow--disabled': lb.currentIndex.value === 0 }"
          @click="lb.prev()"
          aria-label="上一张"
        >
          ‹
        </button>

        <!-- 图片容器 -->
        <div class="lb-img-wrap" @click.stop>
          <Transition :name="slideDir" mode="out-in">
            <img
              :key="lb.currentIndex.value"
              :src="lb.images.value[lb.currentIndex.value]"
              class="lb-img"
              alt="预览图片"
              draggable="false"
            />
          </Transition>
        </div>

        <!-- 右箭头 -->
        <button
          v-if="lb.images.value.length > 1"
          class="lb-arrow lb-arrow--right"
          :class="{ 'lb-arrow--disabled': lb.currentIndex.value === lb.images.value.length - 1 }"
          @click="lb.next()"
          aria-label="下一张"
        >
          ›
        </button>

        <!-- 缩略图条（超过 1 张时显示） -->
        <div v-if="lb.images.value.length > 1" class="lb-thumbs">
          <button
            v-for="(url, i) in lb.images.value"
            :key="url"
            class="lb-thumb"
            :class="{ 'lb-thumb--active': i === lb.currentIndex.value }"
            @click.stop="lb.jumpTo(i)"
          >
            <img :src="url" :alt="`第 ${i + 1} 张`" />
          </button>
        </div>

      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useLightbox } from '@/utils/lightbox'

const lb = useLightbox()
const slideDir = ref('lb-slide-right')

// 记录上次索引，判断滑动方向
let prevIndex = lb.currentIndex.value
watch(lb.currentIndex, (newIdx) => {
  slideDir.value = newIdx > prevIndex ? 'lb-slide-left' : 'lb-slide-right'
  prevIndex = newIdx
})

watch(lb.isOpen, (open) => {
  document.body.style.overflow = open ? 'hidden' : ''
  if (open) prevIndex = lb.currentIndex.value
})

function handleKey(e: KeyboardEvent) {
  if (!lb.isOpen.value) return
  if (e.key === 'Escape') lb.close()
  if (e.key === 'ArrowLeft') lb.prev()
  if (e.key === 'ArrowRight') lb.next()
}

onMounted(() => window.addEventListener('keydown', handleKey))
onUnmounted(() => {
  window.removeEventListener('keydown', handleKey)
  document.body.style.overflow = ''
})
</script>

<style scoped>
.lb-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.92);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60px 80px 80px;
  box-sizing: border-box;
}

/* 图片容器 */
.lb-img-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  max-width: 100%;
  max-height: 100%;
  overflow: hidden;
}

.lb-img {
  max-width: 100%;
  max-height: calc(100vh - 160px);
  object-fit: contain;
  border-radius: 6px;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.6);
  display: block;
  user-select: none;
}

/* 关闭按钮 */
.lb-close {
  position: fixed;
  top: 16px;
  right: 20px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  font-size: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
  z-index: 1;
}
.lb-close:hover {
  background: rgba(255, 255, 255, 0.25);
}

/* 计数器 */
.lb-counter {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  color: rgba(255, 255, 255, 0.7);
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.04em;
  pointer-events: none;
  z-index: 1;
}

/* 左右箭头 */
.lb-arrow {
  position: fixed;
  top: 50%;
  transform: translateY(-50%);
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  font-size: 36px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s, opacity 0.2s;
  z-index: 1;
  padding-bottom: 3px;
}
.lb-arrow--left  { left: 16px; }
.lb-arrow--right { right: 16px; }
.lb-arrow:hover  { background: rgba(255, 255, 255, 0.28); }
.lb-arrow--disabled {
  opacity: 0.25;
  cursor: default;
  pointer-events: none;
}

/* 缩略图条 */
.lb-thumbs {
  position: fixed;
  bottom: 14px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 8px;
  max-width: calc(100vw - 40px);
  overflow-x: auto;
  padding: 4px 8px;
  z-index: 1;
}

.lb-thumb {
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  border-radius: 5px;
  overflow: hidden;
  opacity: 0.45;
  border: 2px solid transparent;
  transition: opacity 0.2s, border-color 0.2s;
}
.lb-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  pointer-events: none;
}
.lb-thumb:hover  { opacity: 0.75; }
.lb-thumb--active {
  opacity: 1;
  border-color: #fff;
}

/* 遮罩淡入淡出 */
.lb-fade-enter-active,
.lb-fade-leave-active { transition: opacity 0.2s ease; }
.lb-fade-enter-from,
.lb-fade-leave-to     { opacity: 0; }

/* 图片左右滑动切换 */
.lb-slide-left-enter-active,
.lb-slide-left-leave-active,
.lb-slide-right-enter-active,
.lb-slide-right-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
  position: absolute;
}
.lb-slide-left-enter-from  { opacity: 0; transform: translateX(40px); }
.lb-slide-left-leave-to    { opacity: 0; transform: translateX(-40px); }
.lb-slide-right-enter-from { opacity: 0; transform: translateX(-40px); }
.lb-slide-right-leave-to   { opacity: 0; transform: translateX(40px); }
</style>
