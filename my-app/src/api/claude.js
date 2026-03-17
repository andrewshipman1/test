// ─── Claude Messages API Client ─────────────────────────────────────────────
// Streaming client with tool-use loop for Frank AI.

import { TOOLS } from './tools.js'
import { SYSTEM_PROMPT } from './systemPrompt.js'
import { executeTool, TOOL_LABELS } from './toolHandlers.js'
import { logConversation } from './conversationLog.js'

// In production, requests go through our Vercel serverless proxy (/api/chat)
// which keeps the API key server-side. In dev, Vite proxies /api to the same.
const API_URL = '/api/chat'
const MODEL = 'claude-sonnet-4-20250514'
const MAX_TOOL_ROUNDS = 4
const MAX_RETRIES = 2
const RETRY_DELAY_MS = 3000

/**
 * Send a message and stream the response.
 *
 * @param {Array} messages  - Full conversation history [{role, content}]
 * @param {object} callbacks
 *   onText(chunk)       — called with each text chunk as it streams
 *   onToolStart(label)  — called when a tool begins executing
 *   onToolEnd()         — called when tool execution completes
 *   onDone(fullText)    — called when the full response is complete
 *   onError(error)      — called on error
 * @returns {function} abort — call to cancel the request
 */
export function sendMessage(messages, callbacks) {
  const { onText, onToolStart, onToolEnd, onDone, onError } = callbacks
  let aborted = false
  const controller = new AbortController()

  // Fetch with retry on 429
  async function fetchWithRetry(body, attempt = 0) {
    const res = await fetch(API_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (res.status === 429 && attempt < MAX_RETRIES) {
      const delay = RETRY_DELAY_MS * (attempt + 1)
      onToolStart?.(`Rate limited, retrying in ${delay / 1000}s...`)
      await new Promise(r => setTimeout(r, delay))
      onToolEnd?.()
      return fetchWithRetry(body, attempt + 1)
    }

    return res
  }

  async function run(msgs, round = 0) {
    if (aborted || round >= MAX_TOOL_ROUNDS) {
      onDone?.('')
      return
    }

    try {
      const res = await fetchWithRetry({
        model: MODEL,
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        tools: TOOLS,
        messages: msgs,
        stream: true,
      })

      if (!res.ok) {
        const body = await res.text()
        throw new Error(`Claude API error ${res.status}: ${body}`)
      }

      // Parse SSE stream
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let fullText = ''
      let toolUseBlocks = []
      let currentToolUse = null
      let currentToolInput = ''
      let contentBlocks = []

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        if (aborted) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6).trim()
          if (data === '[DONE]') continue

          let event
          try { event = JSON.parse(data) } catch { continue }

          switch (event.type) {
            case 'content_block_start':
              if (event.content_block?.type === 'tool_use') {
                currentToolUse = {
                  id:    event.content_block.id,
                  name:  event.content_block.name,
                  input: {},
                }
                currentToolInput = ''
              }
              break

            case 'content_block_delta':
              if (event.delta?.type === 'text_delta') {
                const chunk = event.delta.text || ''
                fullText += chunk
                onText?.(chunk)
              } else if (event.delta?.type === 'input_json_delta') {
                currentToolInput += event.delta.partial_json || ''
              }
              break

            case 'content_block_stop':
              if (currentToolUse) {
                try {
                  currentToolUse.input = JSON.parse(currentToolInput || '{}')
                } catch {
                  currentToolUse.input = {}
                }
                toolUseBlocks.push(currentToolUse)
                // Also track as content block for the assistant message
                contentBlocks.push({
                  type: 'tool_use',
                  id: currentToolUse.id,
                  name: currentToolUse.name,
                  input: currentToolUse.input,
                })
                currentToolUse = null
                currentToolInput = ''
              } else if (fullText) {
                // Text block ended — track it
                contentBlocks.push({ type: 'text', text: fullText })
              }
              break

            case 'message_stop':
              break

            case 'message_delta':
              // Check stop reason
              if (event.delta?.stop_reason === 'tool_use' && toolUseBlocks.length > 0) {
                // Execute tools and continue the loop
                const assistantContent = []
                if (fullText) assistantContent.push({ type: 'text', text: fullText })
                toolUseBlocks.forEach(tu => {
                  assistantContent.push({
                    type: 'tool_use',
                    id: tu.id,
                    name: tu.name,
                    input: tu.input,
                  })
                })

                // Execute all tool calls
                const toolResults = []
                for (const tu of toolUseBlocks) {
                  const label = TOOL_LABELS[tu.name] || `Running ${tu.name}...`
                  onToolStart?.(label)

                  const result = await executeTool(tu.name, tu.input)
                  toolResults.push({
                    type: 'tool_result',
                    tool_use_id: tu.id,
                    content: JSON.stringify(result),
                  })

                  // Log each tool call
                  logConversation({
                    type: 'tool_call',
                    tool: tu.name,
                    input: tu.input,
                    output: result,
                    timestamp: Date.now(),
                  })
                }

                onToolEnd?.()

                // Continue conversation with tool results
                const nextMsgs = [
                  ...msgs,
                  { role: 'assistant', content: assistantContent },
                  { role: 'user', content: toolResults },
                ]

                // Reset for next round
                fullText = ''
                toolUseBlocks = []
                contentBlocks = []

                return run(nextMsgs, round + 1)
              }
              break
          }
        }
      }

      // Stream complete, no more tool calls
      onDone?.(fullText)

      // Log the final exchange
      logConversation({
        type: 'response',
        text: fullText,
        timestamp: Date.now(),
      })

    } catch (err) {
      if (err.name === 'AbortError') return
      onError?.(err)
    }
  }

  // Start the loop
  run(messages)

  // Return abort function
  return () => {
    aborted = true
    controller.abort()
  }
}
