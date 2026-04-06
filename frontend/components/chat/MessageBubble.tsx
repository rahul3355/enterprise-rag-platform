import { cn } from "@/lib/utils"
import { Sparkles, User } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { ThinkingDots } from "@/components/ui/skeletons"

interface Citation {
  document_id: string
  filename: string
  chunk_text: string
  score: number
}

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  citations?: Citation[]
  timestamp: Date
}

interface MessageBubbleProps {
  message: Message
  onCitationClick: (citation: Citation) => void
  isStreaming?: boolean
}

export function MessageBubble({ message, onCitationClick, isStreaming }: MessageBubbleProps) {
  const isUser = message.role === "user"

  return (
    <div
      className={cn(
        "group/message flex gap-3 px-4 md:px-6 py-4 animate-[fade-up_0.25s_ease-out_both]",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      {!isUser && (
        <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5 ring-1 ring-border">
          <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
      )}

      <div className={cn("max-w-[85%] md:max-w-[75%] min-w-0", isUser && "order-1")}>
        <div
          className={cn(
            "text-sm leading-relaxed",
            isUser
              ? "rounded-2xl rounded-br-lg bg-secondary px-4 py-2.5 border border-border/50 shadow-sm"
              : "px-1"
          )}
        >
          {isUser ? (
            <div className="whitespace-pre-wrap break-words">{message.content}</div>
          ) : message.content ? (
            <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0 prose-headings:my-2 prose-code:text-xs prose-pre:bg-muted prose-pre:border prose-pre:border-border/50">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content}
              </ReactMarkdown>
            </div>
          ) : isStreaming ? (
            <ThinkingDots />
          ) : null}
        </div>

        {message.citations && message.citations.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {message.citations.slice(0, 4).map((citation, i) => (
              <button
                key={i}
                onClick={() => onCitationClick(citation)}
                className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-muted/80 hover:bg-muted border border-border/50 text-muted-foreground hover:text-foreground transition-colors truncate max-w-[180px]"
              >
                <span className="font-medium opacity-60">[{i + 1}]</span>
                <span className="truncate">{citation.filename}</span>
              </button>
            ))}
            {message.citations.length > 4 && (
              <span className="text-[11px] px-1.5 py-0.5 text-muted-foreground/60">
                +{message.citations.length - 4} more
              </span>
            )}
          </div>
        )}
      </div>

      {isUser && (
        <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
          <User className="h-3.5 w-3.5 text-primary" />
        </div>
      )}
    </div>
  )
}
