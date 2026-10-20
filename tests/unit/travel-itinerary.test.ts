import assert from 'node:assert/strict'
import test from 'node:test'
import { calculateDistinctTravelDays } from '../../src/utils/travel-itinerary'

test('counts overlapping travel segments only once', () => {
  assert.equal(
    calculateDistinctTravelDays([
      { startDate: '2026-02-01', endDate: '2026-02-03' },
      { startDate: '2026-02-03', endDate: '2026-02-05' }
    ]),
    5
  )
})

test('counts disjoint and adjacent segments across month boundaries', () => {
  assert.equal(
    calculateDistinctTravelDays([
      { startDate: '2028-02-28', endDate: '2028-02-29' },
      { startDate: '2028-03-01', endDate: '2028-03-02' },
      { startDate: '2028-03-05', endDate: '2028-03-05' }
    ]),
    5
  )
})
