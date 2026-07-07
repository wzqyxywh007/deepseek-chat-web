import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js'
import katex from 'katex'

const md = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: false,
  highlight(code: string, lang: string): string {
    let highlighted = ''
    if (lang && hljs.getLanguage(lang)) {
      try {
        highlighted = hljs.highlight(code, { language: lang, ignoreIllegals: true }).value
      } catch { /* ignore */ }
    }
    if (!highlighted) {
      highlighted = md.utils.escapeHtml(code)
    }
    const escapedLang: string = lang ? md.utils.escapeHtml(lang) : 'text'
    return (
      `<div class="code-block">` +
      `<div class="code-block__header">` +
      `<span class="code-block__lang">${escapedLang}</span>` +
      `<button class="code-block__copy" data-code="${encodeURIComponent(code)}">复制</button>` +
      `</div>` +
      `<pre><code class="hljs language-${escapedLang}">${highlighted}</code></pre>` +
      `</div>`
    )
  },
})

function renderKatex(tex: string, displayMode: boolean): string {
  try {
    return katex.renderToString(tex, { throwOnError: false, displayMode })
  } catch {
    return `<span class="math-error">${md.utils.escapeHtml(tex)}</span>`
  }
}

function preprocessMath(content: string): string {
  // 块级公式 $$...$$
  content = content.replace(/\$\$([\s\S]+?)\$\$/g, (_match, tex: string) => {
    return `<div class="math-block">${renderKatex(tex.trim(), true)}</div>`
  })
  // 行内公式 $...$（不跨行）
  content = content.replace(/\$([^\n$]+?)\$/g, (_match, tex: string) => {
    return renderKatex(tex.trim(), false)
  })
  return content
}

export function renderMarkdown(content: string): string {
  const withMath = preprocessMath(content)
  // 允许 html 以便 katex 渲染结果直接嵌入
  const tempMd = new MarkdownIt({
    html: true,
    linkify: true,
    typographer: false,
    highlight: md.options.highlight ?? undefined,
  })
  return tempMd.render(withMath)
}

export function bindCopyButtons(container: HTMLElement): void {
  container.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest('.code-block__copy') as HTMLButtonElement | null
    if (!btn) return
    const code = decodeURIComponent(btn.dataset.code ?? '')
    navigator.clipboard.writeText(code).then(() => {
      const prev = btn.textContent
      btn.textContent = '已复制!'
      setTimeout(() => {
        btn.textContent = prev
      }, 1500)
    }).catch(() => { /* ignore */ })
  })
}
