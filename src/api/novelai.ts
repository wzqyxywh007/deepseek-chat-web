import { unzipSync } from 'fflate'

const NOVELAI_IMAGE_BASE = 'https://image.novelai.net'

export interface NovelAIImageOptions {
  prompt: string
  apiKey: string
  model: string
  /** 负面提示词，默认使用 NovelAI 推荐的通用负面词 */
  negativePrompt?: string
  /** 图片宽度，默认 832 */
  width?: number
  /** 图片高度，默认 1216 */
  height?: number
  /** 生成数量，默认 1 */
  nSamples?: number
  /** 随机种子，0 表示随机，默认 0 */
  seed?: number
  /** 采样器，默认 k_euler_ancestral */
  sampler?: string
  /** 步数，默认 28 */
  steps?: number
  /** CFG 引导强度，默认 5.0 */
  scale?: number
  proxyUrl?: string
}

const DEFAULT_NEGATIVE_PROMPT =
  'lowres, {bad}, error, fewer, extra, missing, worst quality, jpeg artifacts, bad quality, watermark, unfinished, displeasing, chromatic aberration, signature, extra digits, artistic error, username, scan, [abstract]'

/**
 * 解析 NovelAI 返回的 ZIP 文件，提取所有 PNG 并转为 blob URL 数组
 */
function extractImagesFromZip(buffer: ArrayBuffer): string[] {
  const uint8 = new Uint8Array(buffer)
  const files = unzipSync(uint8)

  const urls: string[] = []
  for (const [name, data] of Object.entries(files)) {
    if (name.endsWith('.png') || name.endsWith('.jpg') || name.endsWith('.webp')) {
      const mimeType = name.endsWith('.png') ? 'image/png' : name.endsWith('.jpg') ? 'image/jpeg' : 'image/webp'
      const blob = new Blob([data], { type: mimeType })
      urls.push(URL.createObjectURL(blob))
    }
  }

  // 如果没有找到图片文件，尝试将所有文件都当作 PNG 处理
  if (urls.length === 0 && Object.keys(files).length > 0) {
    for (const data of Object.values(files)) {
      const blob = new Blob([data], { type: 'image/png' })
      urls.push(URL.createObjectURL(blob))
    }
  }

  return urls
}

/** NovelAI 图片生成（返回 blob URL 数组，用完后应调用 URL.revokeObjectURL 释放） */
export async function generateNovelAIImage(options: NovelAIImageOptions): Promise<string[]> {
  const {
    prompt,
    apiKey,
    model,
    negativePrompt = DEFAULT_NEGATIVE_PROMPT,
    width = 832,
    height = 1216,
    nSamples = 1,
    seed = 0,
    sampler = 'k_euler_ancestral',
    steps = 28,
    scale = 5.0,
    proxyUrl,
  } = options

  const base = proxyUrl ? proxyUrl.replace(/\/$/, '') : NOVELAI_IMAGE_BASE
  const url = `${base}/ai/generate-image`

  const body = {
    input: prompt,
    model,
    action: 'generate',
    parameters: {
      width,
      height,
      n_samples: nSamples,
      seed,
      sampler,
      steps,
      scale,
      negative_prompt: negativePrompt,
      sm: false,
      sm_dyn: false,
      noise_schedule: 'native',
    },
  }

  let response: Response
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/zip, */*',
      },
      body: JSON.stringify(body),
    })
  } catch (e) {
    throw new Error(`网络请求失败：${(e as Error).message}`)
  }

  const contentType = response.headers.get('content-type') ?? ''

  if (contentType.includes('text/html')) {
    throw new Error(
      'NovelAI API 返回了网页内容，可能是跨域问题。请配置代理地址后重试。',
    )
  }

  if (!response.ok) {
    let errMsg = `HTTP ${response.status}`
    try {
      if (contentType.includes('application/json')) {
        const errBody = await response.json()
        errMsg = errBody?.message ?? errBody?.error ?? errMsg
      } else {
        const text = await response.text()
        if (text) errMsg = `${errMsg}：${text.slice(0, 200)}`
      }
    } catch { /* ignore */ }
    throw new Error(errMsg)
  }

  const buffer = await response.arrayBuffer()
  const urls = extractImagesFromZip(buffer)

  if (urls.length === 0) {
    throw new Error('图片生成失败，响应中未找到图片数据')
  }

  return urls
}
