"use client"

import { useState } from "react"
import type { Citation } from "@/lib/api"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  citations?: Citation[]
  timestamp: Date
}

interface ChatWindowProps {
  messages: Message[]
  loading: boolean
  streaming: boolean
  onSend: (message: string) => void
  onCitationClick: (citation: Citation) => void
}

export function ChatWindow({
  messages,
  loading,
  streaming,
  onSend,
  onCitationClick,
}: ChatWindowProps) {
  const [input, setInput] = useState("")

  const handleSend = () => {
    if (!input.trim() || loading || streaming) return
    onSend(input.trim())
    setInput("")
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && !loading && (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <p className="text-lg font-medium mb-1">Start a conversation</p>
              <p className="text-sm">
                Ask a question about your documents
              </p>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-3 text-sm ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground"
              }`}
            >
              <div className="whitespace-pre-wrap break-words">{msg.content}</div>
              {msg.citations && msg.citations.length > 0 && (
                <div className="mt-2 pt-2 border-t border-border/50">
                  <p className="text-xs font-medium mb-1 opacity-70">
                    {msg.citations.length} citation{msg.citations.length > 1 ? "s" : ""}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {msg.citations.map((c, i) => (
                      <button
                        key={i}
                        onClick={() => onCitationClick(c)}
                        className="text-xs px-2 py-0.5 rounded-full bg-background/20 hover:bg-background/30 transition-colors"
                      >
                        [{i + 1}] {c.filename}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-lg px-4 py-3 bg-muted text-sm">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
                <span className="text-muted-foreground">Thinking...</span>
              </div>
            </div>
          </div>
        )}

        {streaming && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-lg px-4 py-3 bg-muted text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                <span className="text-muted-foreground">Streaming response...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="border-t p-4">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            rows={1}
            className="flex-1 resize-none rounded-lg border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 min-h-[40px] max-h-[120px]"
            disabled={loading || streaming}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading || streaming}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:pointer-events-none transition-colors"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}
