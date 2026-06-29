import {
  hasAisleSlot,
  getVerticalCellSegmentInfo,
  shouldRenderVerticalAisleLabel,
  getVerticalAisleCellClassName,
  getVerticalAisleCellJoinClass,
  getVerticalLabelOverlayStyleForVariant,
  buildHorizontalAisleRowItems,
  isAisleCrossingCell,
  BOOKING_AISLE_ROW_STEP,
  BOOKING_AISLE_ROW_HEIGHT,
} from '../../utils/aisleLayoutUtils';

export const AISLE_LABEL = 'Lối đi';

export const isInCompleteVerticalCol = (col, completeVerticalCols) =>
  completeVerticalCols.includes(col);

export const isInCompleteHorizontalRow = (rowName, completeHorizontalRows) =>
  completeHorizontalRows.includes(rowName);

export const isCompleteAisleCell = (
  rowName,
  col,
  aisleLayout,
  completeVerticalCols,
  completeHorizontalRows,
) => {
  if (!hasAisleSlot(aisleLayout, rowName, col)) return false;
  return (
    isInCompleteVerticalCol(col, completeVerticalCols)
    || isInCompleteHorizontalRow(rowName, completeHorizontalRows)
  );
};

export const getHorizontalAisleLabelBandIndex = (items) => {
  let bestIdx = -1;
  let bestLen = 0;

  items.forEach((item, idx) => {
    if (item.kind !== 'band') return;
    if (item.seats.length > bestLen) {
      bestLen = item.seats.length;
      bestIdx = idx;
    }
  });

  return bestIdx;
};

export const renderVerticalAisleCellProps = (
  rowName,
  col,
  rowNames,
  aisleLayout,
  completeHorizontalRows,
  variant = 'admin',
) => {
  const rowIdx = rowNames.indexOf(rowName);
  if (rowIdx < 0) return null;

  const segInfo = getVerticalCellSegmentInfo(
    rowIdx,
    col,
    aisleLayout,
    rowNames,
    completeHorizontalRows,
  );
  if (!segInfo) return null;

  const showLabel = shouldRenderVerticalAisleLabel(
    rowName,
    col,
    aisleLayout,
    rowNames,
    completeHorizontalRows,
  );

  return {
    cellClass: [
      getVerticalAisleCellClassName(segInfo.role),
      getVerticalAisleCellJoinClass(segInfo.role, variant),
    ].filter(Boolean).join(' '),
    showLabel,
    labelStyle: showLabel
      ? getVerticalLabelOverlayStyleForVariant(segInfo.segment, rowIdx, variant)
      : null,
  };
};

export {
  shouldRenderVerticalAisleLabel,
  buildHorizontalAisleRowItems,
  isAisleCrossingCell,
  BOOKING_AISLE_ROW_STEP,
  BOOKING_AISLE_ROW_HEIGHT,
};
