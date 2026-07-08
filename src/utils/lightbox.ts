import { ref } from 'vue'

// 模块级单例，所有组件共享同一份状态
const isOpen = ref(false)
const images = ref<string[]>([])
const currentIndex = ref(0)

export function useLightbox() {
  function open(imgs: string[], idx: number) {
    images.value = imgs
    currentIndex.value = Math.max(0, Math.min(idx, imgs.length - 1))
    isOpen.value = true
  }

  function close() {
    isOpen.value = false
  }

  function prev() {
    if (currentIndex.value > 0) currentIndex.value--
  }

  function next() {
    if (currentIndex.value < images.value.length - 1) currentIndex.value++
  }

  function jumpTo(idx: number) {
    currentIndex.value = Math.max(0, Math.min(idx, images.value.length - 1))
  }

  return { isOpen, images, currentIndex, open, close, prev, next, jumpTo }
}
