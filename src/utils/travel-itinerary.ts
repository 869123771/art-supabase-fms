import dayjs from 'dayjs'

export interface TravelDateRange {
  startDate: string
  endDate: string
}

/** Count calendar days once even when multiple itineraries overlap. */
export function calculateDistinctTravelDays(ranges: readonly TravelDateRange[]): number {
  const validRanges = ranges
    .filter(
      ({ startDate, endDate }) =>
        dayjs(startDate).isValid() &&
        dayjs(endDate).isValid() &&
        !dayjs(endDate).isBefore(startDate)
    )
    .map(({ startDate, endDate }) => ({
      start: dayjs(startDate).startOf('day'),
      end: dayjs(endDate).startOf('day')
    }))
    .sort((left, right) => left.start.valueOf() - right.start.valueOf())

  let total = 0
  let segmentStart: dayjs.Dayjs | null = null
  let segmentEnd: dayjs.Dayjs | null = null
  for (const range of validRanges) {
    if (segmentStart && segmentEnd && range.start.isAfter(segmentEnd.add(1, 'day'))) {
      total += segmentEnd.diff(segmentStart, 'day') + 1
      segmentStart = range.start
      segmentEnd = range.end
    } else {
      segmentStart ??= range.start
      segmentEnd = segmentEnd && segmentEnd.isAfter(range.end) ? segmentEnd : range.end
    }
  }
  if (segmentStart && segmentEnd) total += segmentEnd.diff(segmentStart, 'day') + 1
  return total
}
