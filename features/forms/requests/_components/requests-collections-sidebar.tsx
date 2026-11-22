// ---------------------------------------------------------------------------
// requests-collections-sidebar.tsx — Card-based collections filter + create CTA
// ---------------------------------------------------------------------------

import { Folder, Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface Collection {
  id: string | null
  name: string
  count?: number
}

interface RequestsCollectionsSidebarProps {
  collections: Collection[]
  selectedId: string | null
  onSelect: (id: string | null) => void
  isLoading?: boolean
  onCreateRequest?: () => void
}

export function RequestsCollectionsSidebar({
  collections,
  selectedId,
  onSelect,
  isLoading,
  onCreateRequest,
}: RequestsCollectionsSidebarProps) {
  return (
    <Card className="flex h-full w-full flex-col overflow-hidden rounded-none border-0 border-r">
      <CardHeader className="shrink-0 px-3 pt-3 pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">Collections</CardTitle>
          {onCreateRequest ? (
            <Button
              size="sm"
              variant="default"
              className="h-7 px-2 text-xs gap-1"
              onClick={onCreateRequest}
            >
              <Plus className="h-3.5 w-3.5" />
              New
            </Button>
          ) : null}
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col overflow-hidden p-0">
        <ScrollArea className="flex-1 px-3">
          {isLoading ? (
            <div className="space-y-1.5 py-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full rounded" />
              ))}
            </div>
          ) : (
            <div className="space-y-1 py-1">
              {/* All Collections */}
              <button
                onClick={() => onSelect(null)}
                className={cn(
                  'w-full flex items-center justify-between rounded-md px-2 py-1.5 text-xs font-medium transition-colors',
                  selectedId === null
                    ? 'bg-primary/10 border border-primary/20 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                <span className="flex items-center gap-2">
                  <Folder className="h-3.5 w-3.5 shrink-0" />
                  All Collections
                </span>
              </button>

              {/* Individual collections */}
              {collections.map((col) => (
                <button
                  key={col.id ?? '__null__'}
                  onClick={() => onSelect(col.id)}
                  className={cn(
                    'w-full flex items-center justify-between rounded-md px-2 py-1.5 text-xs font-medium transition-colors',
                    selectedId === col.id
                      ? 'bg-primary/10 border border-primary/20 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                >
                  <span className="flex items-center gap-2 truncate pr-2">
                    <Folder className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{col.name}</span>
                  </span>
                  {col.count != null && (
                    <span className="ml-auto shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] tabular-nums">
                      {col.count}
                    </span>
                  )}
                </button>
              ))}

              {collections.length === 0 && (
                <p className="py-4 text-center text-xs text-muted-foreground">
                  No collections found
                </p>
              )}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
