export function MangaCardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="skeleton rounded-xl" style={{ aspectRatio: '2/3' }} />
      <div className="mt-2.5 space-y-1.5">
        <div className="skeleton h-3.5 rounded w-full" />
        <div className="skeleton h-3 rounded w-2/3" />
      </div>
    </div>
  )
}

export function GridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {Array.from({ length: count }).map((_, i) => <MangaCardSkeleton key={i} />)}
    </div>
  )
}
