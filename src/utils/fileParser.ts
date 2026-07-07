import type { MessageAttachment, ContentPart } from '@/types'

const MAX_FILE_SIZE = 20 * 1024 * 1024   // 20MB
const MAX_TEXT_CHARS = 200_000            // ~50K tokens，适合 1M 上下文模型

export const ACCEPTED_FILE_TYPES =
  '.xlsx,.xls,.csv,.txt,.md,.json,.pdf,.docx,.jpg,.jpeg,.png,.gif,.webp'

export interface ParsedFile {
  name: string
  fileType: 'file' | 'image'
  mimeType: string
  textContent?: string  // 文件提取的文本
  dataUrl?: string      // 图片 base64（不存 localStorage）
  size: number
  truncated: boolean
}

export async function parseFile(file: File): Promise<ParsedFile> {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(
      `文件过大（${(file.size / 1024 / 1024).toFixed(1)} MB），最大支持 20 MB`,
    )
  }

  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''

  if (file.type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
    return readImage(file)
  }
  if (['csv', 'txt', 'md', 'json'].includes(ext) || file.type.startsWith('text/')) {
    return readText(file)
  }
  if (['xlsx', 'xls'].includes(ext)) {
    return readExcel(file)
  }
  if (ext === 'docx') {
    return readWord(file)
  }
  if (ext === 'pdf' || file.type === 'application/pdf') {
    return readPdf(file)
  }

  throw new Error(
    `暂不支持 .${ext} 文件，支持格式：图片、Excel、Word、PDF、CSV、TXT`,
  )
}

async function readImage(file: File): Promise<ParsedFile> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) =>
      resolve({
        name: file.name,
        fileType: 'image',
        mimeType: file.type || 'image/jpeg',
        dataUrl: e.target!.result as string,
        size: file.size,
        truncated: false,
      })
    reader.onerror = () => reject(new Error('图片读取失败'))
    reader.readAsDataURL(file)
  })
}

async function readText(file: File): Promise<ParsedFile> {
  const text = await file.text()
  const truncated = text.length > MAX_TEXT_CHARS
  return {
    name: file.name,
    fileType: 'file',
    mimeType: file.type,
    textContent: truncated ? text.slice(0, MAX_TEXT_CHARS) : text,
    size: file.size,
    truncated,
  }
}

async function readExcel(file: File): Promise<ParsedFile> {
  const { read, utils } = await import('xlsx')
  const buf = await file.arrayBuffer()
  const wb = read(buf)
  let text = ''
  for (const name of wb.SheetNames) {
    const csv = utils.sheet_to_csv(wb.Sheets[name])
    text += `\n=== 工作表：${name} ===\n${csv}\n`
    if (text.length > MAX_TEXT_CHARS) break
  }
  const truncated = text.length > MAX_TEXT_CHARS
  return {
    name: file.name,
    fileType: 'file',
    mimeType: file.type,
    textContent: truncated ? text.slice(0, MAX_TEXT_CHARS) : text,
    size: file.size,
    truncated,
  }
}

async function readWord(file: File): Promise<ParsedFile> {
  const mammoth = await import('mammoth')
  const buf = await file.arrayBuffer()
  const { value } = await mammoth.extractRawText({ arrayBuffer: buf })
  const truncated = value.length > MAX_TEXT_CHARS
  return {
    name: file.name,
    fileType: 'file',
    mimeType: file.type,
    textContent: truncated ? value.slice(0, MAX_TEXT_CHARS) : value,
    size: file.size,
    truncated,
  }
}

async function readPdf(file: File): Promise<ParsedFile> {
  const pdfjsLib = await import('pdfjs-dist')
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`

  const buf = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise
  let text = ''
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const pageText = (content.items as Array<{ str?: string }>)
      .map((item) => item.str ?? '')
      .join(' ')
    text += `\n--- 第 ${i} 页 ---\n${pageText}\n`
    if (text.length > MAX_TEXT_CHARS) break
  }
  const truncated = text.length > MAX_TEXT_CHARS
  return {
    name: file.name,
    fileType: 'file',
    mimeType: file.type,
    textContent: truncated ? text.slice(0, MAX_TEXT_CHARS) : text,
    size: file.size,
    truncated,
  }
}

/** 构建发给 API 的 content（图片用 ContentPart[]，纯文本用 string） */
export function buildApiContent(
  userText: string,
  attachments: ParsedFile[],
): string | ContentPart[] {
  const fileParts = attachments
    .filter((a) => a.fileType === 'file' && a.textContent)
    .map(
      (a) =>
        `\n📎 文件「${a.name}」内容如下${a.truncated ? '（内容过长，已截取前 200K 字符）' : ''}：\n\`\`\`\n${a.textContent}\n\`\`\``,
    )
    .join('\n')

  const fullText = fileParts ? `${fileParts}\n\n用户问题：${userText}` : userText

  const images = attachments.filter((a) => a.fileType === 'image' && a.dataUrl)
  if (images.length === 0) return fullText

  const parts: ContentPart[] = images.map((img) => ({
    type: 'image_url',
    image_url: { url: img.dataUrl! },
  }))
  parts.push({ type: 'text', text: fullText })
  return parts
}

/** 提取附件元数据供 UI 展示（不含大内容） */
export function toAttachmentMeta(parsed: ParsedFile): MessageAttachment {
  return {
    name: parsed.name,
    fileType: parsed.fileType,
    mimeType: parsed.mimeType,
    previewUrl: parsed.fileType === 'image' ? parsed.dataUrl : undefined,
    truncated: parsed.truncated,
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
