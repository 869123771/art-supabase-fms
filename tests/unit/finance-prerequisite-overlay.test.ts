import assert from 'node:assert/strict'
import test from 'node:test'
import { ref } from 'vue'
import { createFinancePrerequisiteOverlay } from '../../src/views/modules/finance-prerequisite-overlay'

test('finance prerequisite keeps the open dialog loading until readiness finishes', () => {
  const loading: boolean[] = []
  const confirmation: boolean[] = []
  const overlay = createFinancePrerequisiteOverlay(
    ref({
      handleClose: async () => true,
      setLoading: (value: boolean) => loading.push(value),
      setConfirmLoading: (value: boolean) => confirmation.push(value)
    })
  )

  overlay.setPrerequisiteLoading(true)
  overlay.finishLoading()
  assert.deepEqual(loading, [true])
  assert.deepEqual(confirmation, [true])

  overlay.setPrerequisiteLoading(false)
  assert.deepEqual(loading, [true, false])
  assert.deepEqual(confirmation, [true, false])

  overlay.finishLoading()
  assert.deepEqual(loading, [true, false, false])
})
