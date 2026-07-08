import { unzipSync } from 'fflate'

const NOVELAI_IMAGE_BASE = 'https://image.novelai.net'

export interface NovelAIImageOptions {
  prompt: string
  apiKey: string
  model: string
  /** 负面提示词 */
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
  proxyUrl?: string
}

// 所有模型统一使用的负面提示词
const DEFAULT_NEGATIVE_PROMPT =
  'deformed fingers, extra arms, fused legs, twisted limbs, three heads six arms, dislocated joints, double-headed penis, bifurcated penis, three testicles, extra vagina, misplaced anus, melted face, collapsed eye sockets, blank eye sockets, no pupils, exposed teeth, misaligned teeth, jagged teeth, blurry, low quality, low resolution, jitter effect, pixelation, mosaic, censorship bars, holy light, blur lines, black bar covering, clothed, underwear, bra, lingerie covering, shemale features, male breasts, flat chest, androgynous, shota, loli, cartoonish, monochrome, black and white, overexposure, underexposure, too dark to see, excessive oily reflection, plastic texture, wrong anatomy, severed limbs, unrealistic blood clots, fake shit and piss, clean background, aesthetic, romantic, innocent, warm, smile, pure expression, hairless, shaved pubic hair, smooth skin, frigid atmosphere, ascetic, sacred, religious symbols, cross, nun outfit'

/** 判断是否为 V4/V4.5 模型（需要 v4_prompt 结构） */
function isV4Model(model: string): boolean {
  return model.includes('nai-diffusion-4')
}

/** 构建 V4/V4.5 的 caption 对象 */
function buildV4Caption(text: string, isTags = false) {
  return {
    base_caption: text,
    char_captions: [] as unknown[],
    base_caption_dropout: 0,
    is_nsfw: false,
    is_furry: false,
    is_photo: false,
    is_unsplash: false,
    is_tags: isTags,
    is_gel: isTags,
  }
}

/** 构建请求 parameters 对象，V3 和 V4 格式不同 */
function buildParameters(
  model: string,
  prompt: string,
  negativePrompt: string,
  width: number,
  height: number,
  nSamples: number,
  seed: number,
  sampler: string,
) {
  const common = {
    width,
    height,
    n_samples: nSamples,
    seed,
    sampler,
    cfg_rescale: 0.0,
    dynamic_thresholding: false,
    sm: false,
    sm_dyn: false,
  }

  if (isV4Model(model)) {
    // V4/V4.5：使用 v4_prompt / v4_negative_prompt 结构，推荐参数有所不同
    return {
      ...common,
      steps: 23,
      scale: 5.0,
      noise_schedule: 'karras',
      v4_prompt: {
        caption: buildV4Caption(prompt, true),
        use_coords: false,
        use_order: true,
      },
      v4_negative_prompt: {
        caption: buildV4Caption(negativePrompt, false),
        use_coords: false,
        use_order: true,
      },
    }
  }

  // V3：使用简单的 negative_prompt 字符串
  return {
    ...common,
    steps: 28,
    scale: 5.0,
    noise_schedule: 'native',
    negative_prompt: negativePrompt,
  }
}

/**
 * 解析 NovelAI 返回的 ZIP 文件，提取所有 PNG 并转为 blob URL 数组
 */
function extractImagesFromZip(buffer: ArrayBuffer): string[] {
  const uint8 = new Uint8Array(buffer)
  const files = unzipSync(uint8)

  const urls: string[] = []
  for (const [name, data] of Object.entries(files)) {
    const lower = name.toLowerCase()
    const mimeType = lower.endsWith('.jpg') || lower.endsWith('.jpeg')
      ? 'image/jpeg'
      : lower.endsWith('.webp')
        ? 'image/webp'
        : 'image/png'
    const blob = new Blob([data], { type: mimeType })
    urls.push(URL.createObjectURL(blob))
  }

  return urls
}

/** NovelAI 图片生成（返回 blob URL 数组，刷新页面后失效） */
export async function generateNovelAIImage(options: NovelAIImageOptions): Promise<string[]> {
  const {
    prompt,
    apiKey,
    model,
    width = 832,
    height = 1216,
    nSamples = 1,
    seed = 0,
    sampler = 'k_euler_ancestral',
    proxyUrl,
  } = options

  const negativePrompt = options.negativePrompt ?? DEFAULT_NEGATIVE_PROMPT

  const base = proxyUrl ? proxyUrl.replace(/\/$/, '') : NOVELAI_IMAGE_BASE
  const url = `${base}/ai/generate-image`

  const body = {
    input: prompt,
    model,
    action: 'generate',
    parameters: buildParameters(model, prompt, negativePrompt, width, height, nSamples, seed, sampler),
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
    throw new Error(`网络请求失败：${(e as Error).message}。如果是跨域问题，请填写 NovelAI 代理地址。`)
  }

  const contentType = response.headers.get('content-type') ?? ''

  if (contentType.includes('text/html')) {
    throw new Error(
      'NovelAI API 返回了网页内容，可能是跨域问题。请在设置中填写 NovelAI 代理地址后重试。',
    )
  }

  if (!response.ok) {
    let errMsg = `HTTP ${response.status}`
    try {
      const errBody = await response.json()
      errMsg = errBody?.message ?? errBody?.error ?? errMsg
    } catch { /* ignore */ }
    throw new Error(`NovelAI 错误：${errMsg}`)
  }

  const buffer = await response.arrayBuffer()
  const urls = extractImagesFromZip(buffer)

  if (urls.length === 0) {
    throw new Error('图片生成失败，响应中未找到图片数据')
  }

  return urls
}
