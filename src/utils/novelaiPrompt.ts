/**
 * NovelAI 提示词处理工具
 *
 * 职责：
 * 1. 将用户中文输入（含多轮历史）翻译并整合为英文 NovelAI 提示词
 * 2. 调用 DeepSeek API（非流式），对用户完全透明，不在 UI 中显示
 */

const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions'

const TRANSLATE_SYSTEM_PROMPT = `You are a professional NovelAI image prompt engineer.
The user will describe their desired image in Chinese across one or multiple conversation turns.
Your task:
1. Understand the full conversation context (all user messages in order).
2. Consolidate and translate everything into a single concise English NovelAI-style prompt.
3. Incorporate refinements from later turns (e.g., "change her dress to blue" updates the dress color).
4. Return ONLY the final English prompt in comma-separated tag style. No explanations, no extra text.

Example output format:
1girl, red hair, blue eyes, detailed face, wearing blue dress, forest background, masterpiece, best quality, ultra-detailed`

/**
 * 使用 DeepSeek 将中文多轮对话描述翻译整合为一条英文 NovelAI 提示词。
 *
 * @param userMessages 按时间顺序排列的用户消息（纯文本，可含中文）
 * @param apiKey       DeepSeek API Key
 * @returns            整合后的英文提示词；若 API Key 为空或请求失败，回退到原始最后一条消息
 */
export async function buildNovelAIPrompt(
  userMessages: string[],
  apiKey: string,
): Promise<string> {
  const lastMessage = userMessages[userMessages.length - 1] ?? ''

  // 没有 API Key 则直接原样发送
  if (!apiKey.trim()) return lastMessage

  // 构造多轮对话上下文：每条历史用户消息作为一个 user turn
  const conversationContent = userMessages
    .map((msg, i) => `[Turn ${i + 1}] ${msg}`)
    .join('\n')

  try {
    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        stream: false,
        max_tokens: 300,
        messages: [
          { role: 'system', content: TRANSLATE_SYSTEM_PROMPT },
          { role: 'user', content: conversationContent },
        ],
      }),
    })

    if (!response.ok) return lastMessage

    const data = await response.json()
    const translated: string = data?.choices?.[0]?.message?.content?.trim() ?? ''
    return translated || lastMessage
  } catch {
    return lastMessage
  }
}
