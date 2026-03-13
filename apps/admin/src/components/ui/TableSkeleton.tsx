interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

export function TableSkeleton({ rows = 5, columns = 5 }: TableSkeletonProps) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={`skeleton-row-${i}`} className="animate-pulse">
          {Array.from({ length: columns }).map((_, j) => (
            <td key={`skeleton-cell-${i}-${j}`} className="px-4 py-3">
              <div className="h-4 bg-bg-surface-3 rounded w-full" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
