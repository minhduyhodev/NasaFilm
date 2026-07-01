import React, { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

const DEFAULT_THRESHOLD = 12;

/**
 * Virtualized grid for large movie/catalog lists.
 * Falls back to a normal grid when item count is below the threshold.
 */
const VirtualGrid = ({
  items,
  columns = 5,
  estimateRowHeight = 320,
  threshold = DEFAULT_THRESHOLD,
  maxHeight = '70vh',
  gridClassName = 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4',
  className = '',
  getItemKey,
  renderItem,
}) => {
  const parentRef = useRef(null);
  const rowCount = Math.ceil(items.length / columns);

  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateRowHeight,
    overscan: 2,
  });

  if (!items.length) {
    return null;
  }

  if (items.length <= threshold) {
    return (
      <div className={gridClassName}>
        {items.map((item, index) => renderItem(item, index))}
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      className={`${maxHeight === 'none' ? '' : 'overflow-auto'} ${className}`}
      style={maxHeight === 'none' ? undefined : { maxHeight }}
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const startIdx = virtualRow.index * columns;
          const rowItems = items.slice(startIdx, startIdx + columns);

          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={rowVirtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
              }}
              className={gridClassName}
            >
              {rowItems.map((item, colIndex) => {
                const index = startIdx + colIndex;
                const key = getItemKey ? getItemKey(item, index) : index;
                return (
                  <React.Fragment key={key}>
                    {renderItem(item, index)}
                  </React.Fragment>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default VirtualGrid;
