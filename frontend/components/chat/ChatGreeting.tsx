import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import { ArrowRight, FileText, MessageSquare, Search, Zap, Shield, BarChart3 } from "lucide-react"

interface ChatGreetingProps {
  onPromptSelect: (prompt: string) => void
}

const suggestions = [
  { text: "What documents do I have?", icon: FileText },
  { text: "Summarize my latest upload", icon: Zap },
  { text: "Find all contract clauses", icon: Shield },
  { text: "Compare two documents", icon: Search },
]

export function ChatGreeting({ onPromptSelect }: ChatGreetingProps) {
  const clientName = process.env.NEXT_PUBLIC_CLIENT_NAME || "Enterprise RAG"

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className="text-center max-w-lg"
      >
        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center ring-1 ring-border">
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
        <h2 className="text-2xl font-semibold tracking-tight mb-1.5">
          What can I help with?
        </h2>
        <p className="text-sm text-muted-foreground mb-8">
          Ask {clientName} anything about your documents and knowledge base.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
        className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg"
      >
        {suggestions.map((s, i) => (
          <motion.button
            key={s.text}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1], delay: 0.15 + i * 0.05 }}
            onClick={() => onPromptSelect(s.text)}
            className={cn(
              "group flex items-center gap-3 p-3 rounded-xl border bg-card/50 hover:bg-card",
              "hover:border-border/80 hover:shadow-sm transition-all duration-200 text-left"
            )}
          >
            <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0 group-hover:bg-muted/80 transition-colors">
              <s.icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors truncate">
              {s.text}
            </span>
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 ml-auto shrink-0 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
          </motion.button>
        ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-10 grid grid-cols-3 gap-6 text-center"
      >
        {[
          { icon: BarChart3, label: "Analyze data" },
          { icon: FileText, label: "Summarize docs" },
          { icon: Shield, label: "Find clauses" },
        ].map((item) => (
          <div key={item.label} className="flex flex-col items-center gap-1.5">
            <item.icon className="h-4 w-4 text-muted-foreground/40" />
            <span className="text-[11px] text-muted-foreground/50">{item.label}</span>
          </div>
        ))}
      </motion.div>
    </div>
  )
}
