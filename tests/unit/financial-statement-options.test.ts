import assert from 'node:assert/strict'
import test from 'node:test'
import {
  statementOptionLabel,
  statementOptionsWithFallback
} from '../../src/views/modules/financial-statement-options'

test('cash flow direction remains selectable and readable without tenant dictionary rows', () => {
  assert.deepEqual(statementOptionsWithFallback('fmsCashFlowDirection'), [
    { value: 'receipt', label: '流入' },
    { value: 'payment', label: '流出' }
  ])
  assert.equal(statementOptionLabel('fmsCashFlowDirection', 'receipt', []), '流入')
  assert.equal(statementOptionLabel('fmsStatementDisplayStyle', 'subtotal', []), '小计行')
})

test('tenant dictionary labels take precedence when configured', () => {
  const configured: Api.DataCenter.DictListItem[] = [
    { code: 'receipt', name: '收款', label: '现金流入', value: 'receipt', status: 'active' }
  ]
  assert.equal(statementOptionLabel('fmsCashFlowDirection', 'receipt', configured), '现金流入')
})
