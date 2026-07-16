import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

const DEFAULT_THRESHOLD = 25;

/**
 * Virtualized table body — renders only visible rows for large admin tables.
 */
const VirtualTableBody = ({
  items,
  estimateRowHeight = 64,
  threshold = DEFAULT_THRESHOLD,
  maxHeight = '65vh',
  className = '',
  getRowKey,
  renderRow,
}) => {
  const parentRef = useRef(null);

  const rowVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateRowHeight,
    overscan: 8,
  });

  if (!items.length) {
    return null;
  }

  if (items.length <= threshold) {
    return (
      <>
        {items.map((item, index) => renderRow(item, index))}
      </>
    );
  }

  return (
    <div
      ref={parentRef}
      className={`overflow-auto ${className}`}
      style={{ maxHeight }}
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const item = items[virtualRow.index];
          const key = getRowKey ? getRowKey(item, virtualRow.index) : virtualRow.key;

          return (
            <div
              key={key}
              data-index={virtualRow.index}
              ref={rowVirtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              {renderRow(item, virtualRow.index)}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default VirtualTableBody;
