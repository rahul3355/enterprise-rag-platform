import { cn } from "@/lib/utils"

export function ShimmerText({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <span className={cn("shimmer-text", className)}>
      {children}
    </span>
  )
}

export function MessageSkeleton() {
  return (
    <div className="flex items-start gap-3 animate-pulse">
      <div className="h-7 w-7 rounded-full bg-muted shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-muted rounded w-3/4" />
        <div className="h-4 bg-muted rounded w-1/2" />
        <div className="h-4 bg-muted rounded w-5/6" />
      </div>
    </div>
  )
}

export function ThinkingDots() {
  return (
    <div className="flex items-center gap-1.5 px-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-[dot-pulse_1.4s_ease-in-out_infinite]"
          style={{ animationDelay: `${i * 0.2}s` }}
        />
      ))}
    </div>
  )
}

export function SkeletonLine({ className }: { className?: string }) {
  return (
    <div className={cn("h-4 bg-muted rounded animate-pulse", className)} />
  )
}
