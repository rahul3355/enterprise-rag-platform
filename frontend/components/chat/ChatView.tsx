import { useState, useRef, useEffect, useCallback } from "react"
import { useAppStore } from "@/stores/app-store"
import { MessageBubble } from "@/components/chat/MessageBubble"
import { ChatComposer, ScrollToBottomButton } from "@/components/chat/ChatComposer"
import { ChatGreeting } from "@/components/chat/ChatGreeting"
import { MessageSkeleton, ThinkingDots } from "@/components/ui/skeletons"
import { CitationsPanel } from "@/components/CitationsPanel"
import type { Citation } from "@/lib/api"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  citations?: Citation[]
  timestamp: Date
}

interface ChatViewProps {
  messages: Message[]
  loading: boolean
  streaming: boolean
  onSend: (message: string) => void
  onStop: () => void
  onCitationClick: (citation: Citation) => void
  citations: Citation[]
  selectedCitation: Citation | null
  onSelectCitation: (citation: Citation | null) => void
  historyLoading: boolean
}

export function ChatView({
  messages,
  loading,
  streaming,
  onSend,
  onStop,
  onCitationClick,
  citations,
  selectedCitation,
  onSelectCitation,
  historyLoading,
}: ChatViewProps) {
  const [input, setInput] = useState("")
  const [showScrollButton, setShowScrollButton] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { citationsPanelOpen } = useAppStore()

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [])

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = viewport
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight
      setShowScrollButton(distanceFromBottom > 200)
    }

    viewport.addEventListener("scroll", handleScroll, { passive: true })
    return () => viewport.removeEventListener("scroll", handleScroll)
  }, [])

  useEffect(() => {
    if (messages.length > 0 && !showScrollButton) {
      scrollToBottom()
    }
  }, [messages, scrollToBottom, showScrollButton])

  const handleSend = () => {
    if (!input.trim() || loading || streaming) return
    onSend(input.trim())
    setInput("")
    setTimeout(() => {
      textareaRef.current?.focus()
    }, 50)
  }

  const handlePromptSelect = (prompt: string) => {
    setInput(prompt)
    setTimeout(() => {
      textareaRef.current?.focus()
    }, 50)
  }

  const isEmpty = messages.length === 0 && !loading && !streaming

  return (
    <div className="flex h-full min-h-0">
      <div className="flex-1 flex flex-col min-w-0">
        <div
          ref={viewportRef}
          className="flex-1 overflow-y-auto scrollbar-thin relative"
        >
          <div className="max-w-3xl mx-auto w-full relative">
            <ScrollToBottomButton
              onClick={scrollToBottom}
              visible={showScrollButton}
            />

            {isEmpty ? (
              <ChatGreeting onPromptSelect={handlePromptSelect} />
            ) : (
              <div className="pb-2 pt-2">
                {historyLoading ? (
                  <div className="space-y-6 px-4 md:px-6 py-4">
                    <MessageSkeleton />
                    <MessageSkeleton />
                  </div>
                ) : (
                  messages.map((msg, i) => (
                    <MessageBubble
                      key={msg.id}
                      message={msg}
                      onCitationClick={onCitationClick}
                      isStreaming={streaming && i === messages.length - 1 && msg.role === "assistant" && !msg.content}
                    />
                  ))
                )}

                {loading && !streaming && (
                  <div className="flex items-start gap-3 px-4 md:px-6 py-4">
                    <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5 ring-1 ring-border">
                      <ThinkingDots />
                    </div>
                  </div>
                )}

                {streaming && messages.length > 0 && messages[messages.length - 1]?.content && (
                  <div className="flex items-center gap-1 px-4 md:px-6 pb-2">
                    <ThinkingDots />
                  </div>
                )}

                <div ref={messagesEndRef} className="h-2" />
              </div>
            )}
          </div>
        </div>

        <ChatComposer
          input={input}
          onInputChange={setInput}
          onSend={handleSend}
          disabled={loading}
          isStreaming={streaming}
          onStop={onStop}
          textareaRef={textareaRef}
        />
      </div>

      {citationsPanelOpen && citations.length > 0 && (
        <div className="hidden lg:block w-80 border-l shrink-0">
          <CitationsPanel
            citations={citations}
            selectedCitation={selectedCitation}
            onSelectCitation={onSelectCitation}
          />
        </div>
      )}
    </div>
  )
}
