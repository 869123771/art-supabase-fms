import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  calculateReceivableLine,
  calculateReceivableReversal,
  calculateReceivableSettlementBalance,
  getRevenueCostDisplayState,
  type ReceivableCalculationInput
} from '../../src/views/accounts-receivable/modules/receivable-model'

test('实际成本区分权限隐藏、未落实与已知零成本', () => {
  assert.equal(
    getRevenueCostDisplayState({ costAmount: null, lines: [{ costAmount: null }] }),
    'hidden'
  )
  assert.equal(
    getRevenueCostDisplayState({ costAmount: 0, lines: [{ costAmount: null }] }),
    'pending'
  )
  assert.equal(getRevenueCostDisplayState({ costAmount: 0, lines: [] }), 'pending')
  assert.equal(getRevenueCostDisplayState({ costAmount: 0, lines: [{ costAmount: 0 }] }), 'ready')
  assert.equal(
    getRevenueCostDisplayState({
      costAmount: 80,
      lines: [{ costAmount: 80 }, { costAmount: null }]
    }),
    'pending'
  )
  assert.equal(
    getRevenueCostDisplayState({
      costAmount: 120,
      lines: [{ costAmount: 80 }, { costAmount: 40 }]
    }),
    'ready'
  )
})

const quantityLine: ReceivableCalculationInput = {
  basis: 'quantity',
  quantity: 100,
  priceBasis: 'untaxed',
  unitPrice: 100,
  taxInclusiveUnitPrice: 0,
  taxRate: 13,
  discountMethod: 'none',
  discountRate: 0,
  discountAmount: 0,
  gift: false
}

test('数量暂估按税率推导含税价及价税金额', () => {
  assert.deepEqual(calculateReceivableLine(quantityLine), {
    unitPrice: 100,
    taxInclusiveUnitPrice: 113,
    discountAmount: 0,
    amount: 10000,
    taxAmount: 1300,
    totalAmount: 11300
  })
})

test('数量冲回沿用暂估单价，末次分配吸收分位差', () => {
  const first = calculateReceivableReversal({
    basis: 'quantity',
    estimatedQuantity: 3,
    estimatedAmount: 100,
    reversedQuantity: 0,
    reversedAmount: 0,
    matchedQuantity: 1,
    matchedAmount: 40
  })
  assert.equal(first.amount, 33.33)
  const last = calculateReceivableReversal({
    basis: 'quantity',
    estimatedQuantity: 3,
    estimatedAmount: 100,
    reversedQuantity: 2,
    reversedAmount: 66.66,
    matchedQuantity: 1,
    matchedAmount: 40
  })
  assert.deepEqual(last, { quantity: 1, amount: 33.34, fullyReversed: true })
})

test('金额冲回拒绝超过未冲回余额', () => {
  assert.throws(
    () =>
      calculateReceivableReversal({
        basis: 'amount',
        estimatedQuantity: 0,
        estimatedAmount: 100,
        reversedQuantity: 0,
        reversedAmount: 80,
        matchedQuantity: 0,
        matchedAmount: 30
      }),
    /超过未冲回金额/
  )
})

test('收款草稿锁定额度但不减少未核销金额', () => {
  assert.deepEqual(
    calculateReceivableSettlementBalance({
      receivableAmount: 500,
      adjustedAmount: -20,
      appliedAmount: 100,
      reservedAmount: 200
    }),
    { outstandingAmount: 380, availableAmount: 180 }
  )
  assert.throws(
    () =>
      calculateReceivableSettlementBalance({
        receivableAmount: 500,
        adjustedAmount: 0,
        appliedAmount: 100,
        reservedAmount: 401
      }),
    /余额不足/
  )
})

test('含税折扣同比减少收入和销项税额', () => {
  const result = calculateReceivableLine({
    ...quantityLine,
    discountMethod: 'rate',
    discountRate: 0.1
  })
  assert.equal(result.discountAmount, 1130)
  assert.equal(result.amount, 9000)
  assert.equal(result.taxAmount, 1170)
  assert.equal(result.totalAmount, 10170)
})

test('金额暂估可不依赖数量并按价税总额拆分税额', () => {
  const result = calculateReceivableLine({
    ...quantityLine,
    basis: 'amount',
    quantity: 0,
    enteredGrossAmount: 1000
  })
  assert.equal(result.amount, 884.96)
  assert.equal(result.taxAmount, 115.04)
  assert.equal(result.totalAmount, 1000)
})

test('赠品金额归零且超过原额的折扣被拒绝', () => {
  assert.equal(calculateReceivableLine({ ...quantityLine, gift: true }).totalAmount, 0)
  assert.throws(
    () =>
      calculateReceivableLine({
        ...quantityLine,
        discountMethod: 'amount',
        discountAmount: 12000
      }),
    /折扣额无效/
  )
})
