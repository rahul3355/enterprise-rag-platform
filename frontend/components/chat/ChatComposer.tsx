import { cn } from "@/lib/utils"
import { ArrowDown, FileText } from "lucide-react"

interface ChatComposerProps {
  input: string
  onInputChange: (value: string) => void
  onSend: () => void
  disabled: boolean
  isStreaming: boolean
  onStop: () => void
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
}

export function ChatComposer({
  input,
  onInputChange,
  onSend,
  disabled,
  isStreaming,
  onStop,
  textareaRef,
}: ChatComposerProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      if (input.trim() && !disabled) {
        onSend()
      }
    }
  }

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onInputChange(e.target.value)
    const target = e.target
    target.style.height = "auto"
    target.style.height = Math.min(target.scrollHeight, 192) + "px"
  }

  return (
    <div className="border-t bg-background/80 backdrop-blur-sm p-3 md:p-4">
      <div className="max-w-3xl mx-auto">
        <div
          className={cn(
            "relative rounded-2xl border bg-card/70 transition-shadow duration-300",
            "shadow-[var(--shadow-composer)]",
            "focus-within:shadow-[var(--shadow-composer-focus)]",
            "focus-within:border-border/70"
          )}
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question about your documents..."
            rows={1}
            className="w-full resize-none bg-transparent px-4 pt-3 pb-2 text-sm placeholder:text-muted-foreground/60 focus:outline-none min-h-[44px] max-h-[192px] field-sizing-content leading-relaxed"
            disabled={disabled && !isStreaming}
          />

          <div className="flex items-center justify-between px-3 pb-2.5">
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                title="Attach file"
              >
                <FileText className="h-4 w-4" />
              </button>
            </div>

            <div className="flex items-center gap-1">
              {isStreaming ? (
                <button
                  onClick={onStop}
                  className="p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95 transition-all"
                  title="Stop generating"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                  >
                    <rect x="6" y="6" width="12" height="12" rx="1" />
                  </svg>
                </button>
              ) : (
                <button
                  onClick={onSend}
                  disabled={!input.trim() || disabled}
                  className="p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:pointer-events-none active:scale-95 transition-all"
                  title="Send message"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M5 12h14" />
                    <path d="m12 5 7 7-7 7" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground/50 text-center mt-2">
          Enterprise RAG may produce inaccurate information. Verify important details.
        </p>
      </div>
    </div>
  )
}

export function ScrollToBottomButton({ onClick, visible }: { onClick: () => void; visible: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "absolute -top-12 left-1/2 -translate-x-1/2 z-10 p-1.5 rounded-full border bg-card shadow-sm transition-all duration-200",
        visible ? "opacity-100 scale-100" : "opacity-0 scale-90 pointer-events-none"
      )}
    >
      <ArrowDown className="h-4 w-4 text-muted-foreground" />
    </button>
  )
}
