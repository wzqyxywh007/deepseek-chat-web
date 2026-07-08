import { getProvider, isImageModel, MODEL_CONFIGS } from '@/types'
import type { ModelId } from '@/types'
import { streamChat } from './deepseek'
import type { StreamChatOptions } from './deepseek'
import { streamDoubaoChat, generateDoubaoImage } from './doubao'
import { generateNovelAIImage } from './novelai'

export type { StreamChatOptions }

/**
 * 统一对话 API 路由：根据模型 ID 自动分发到对应 Provider。
 * chat.ts 只需调用此函数，不直接依赖具体 Provider 文件。
 */
export function callChatAPI(options: StreamChatOptions & { proxyUrl?: string }): Promise<void> {
  const modelId = options.model as ModelId
  const provider = getProvider(modelId)
  const apiModelName = MODEL_CONFIGS[modelId]?.apiModelName ?? options.model
  const normalized = { ...options, model: apiModelName }

  if (provider === 'doubao') {
    return streamDoubaoChat(normalized)
  }
  return streamChat(normalized)
}

export interface ImageAPIOptions {
  prompt: string
  apiKey: string
  modelId: ModelId
  proxyUrl?: string
}

/**
 * 统一图片生成入口，根据 Provider 自动分发。
 * @returns 图片 URL 数组（NovelAI 返回 blob URL，豆包返回远程 URL）
 */
export async function callImageAPI(options: ImageAPIOptions): Promise<string[]>
/** @deprecated 请使用对象参数形式 */
export async function callImageAPI(
  prompt: string,
  apiKey: string,
  modelId: ModelId,
  proxyUrl?: string,
): Promise<string[]>
export async function callImageAPI(
  promptOrOptions: string | ImageAPIOptions,
  apiKey?: string,
  modelId?: ModelId,
  proxyUrl?: string,
): Promise<string[]> {
  let opts: ImageAPIOptions
  if (typeof promptOrOptions === 'string') {
    opts = { prompt: promptOrOptions, apiKey: apiKey!, modelId: modelId!, proxyUrl }
  } else {
    opts = promptOrOptions
  }

  const apiModelName = MODEL_CONFIGS[opts.modelId]?.apiModelName ?? opts.modelId
  const provider = getProvider(opts.modelId)

  if (provider === 'novelai') {
    return generateNovelAIImage({
      prompt: opts.prompt,
      apiKey: opts.apiKey,
      model: apiModelName,
      proxyUrl: opts.proxyUrl,
    })
  }

  return generateDoubaoImage({ prompt: opts.prompt, apiKey: opts.apiKey, model: apiModelName, proxyUrl: opts.proxyUrl })
}

export { isImageModel }
