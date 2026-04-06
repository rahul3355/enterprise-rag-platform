import { cn } from "@/lib/utils"
import { FileText, Calendar, Hash, Layers } from "lucide-react"
import type { Citation } from "@/lib/api"

interface CitationsPanelProps {
  citations: Citation[]
  selectedCitation: Citation | null
  onSelectCitation: (citation: Citation | null) => void
}

export function CitationsPanel({
  citations,
  selectedCitation,
  onSelectCitation,
}: CitationsPanelProps) {
  if (citations.length === 0 && !selectedCitation) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground p-4">
        <div className="text-center">
          <FileText className="mx-auto h-8 w-8 mb-2 opacity-30" />
          <p className="text-xs">Sources will appear here</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-3 border-b border-border/50">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Sources</h3>
          <span className="text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {citations.length}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-1.5">
        {citations.map((citation, index) => {
          const isSelected = selectedCitation === citation
          return (
            <button
              key={`${citation.document_id}-${index}`}
              onClick={() =>
                onSelectCitation(isSelected ? null : citation)
              }
              className={cn(
                "w-full text-left p-2.5 rounded-lg border transition-all text-left",
                isSelected
                  ? "border-border bg-muted/50"
                  : "border-transparent hover:border-border/50 hover:bg-muted/30"
              )}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <div className="h-5 w-5 rounded bg-muted flex items-center justify-center shrink-0">
                  <Hash className="h-2.5 w-2.5 text-muted-foreground" />
                </div>
                <span className="text-xs font-medium truncate">
                  {citation.filename}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                {citation.chunk_text}
              </p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-[10px] text-muted-foreground/60 flex items-center gap-0.5">
                  <Layers className="h-2.5 w-2.5" />
                  Score: {(citation.score * 100).toFixed(0)}%
                </span>
              </div>
            </button>
          )
        })}
      </div>

      {selectedCitation && (
        <div className="border-t border-border/50 p-3 bg-muted/20">
          <div className="flex items-center gap-1.5 mb-2">
            <Calendar className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs font-medium">{selectedCitation.filename}</span>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {selectedCitation.chunk_text}
          </p>
        </div>
      )}
    </div>
  )
}
