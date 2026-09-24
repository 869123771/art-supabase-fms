import type { Ref } from 'vue'

export interface FinancePrerequisiteOverlay {
  dismiss: () => Promise<void>
  setPrerequisiteLoading: (value: boolean) => void
  finishLoading: () => void
}

interface FinanceOverlayInstance {
  handleClose: (force?: boolean) => Promise<boolean>
  setConfirmLoading: (value: boolean) => void
  setLoading: (value: boolean) => void
}

export function createFinancePrerequisiteOverlay(
  overlayRef: Readonly<Ref<FinanceOverlayInstance | undefined>>
): FinancePrerequisiteOverlay {
  let prerequisiteLoading = false
  return {
    dismiss: async () => {
      await overlayRef.value?.handleClose(true)
    },
    setPrerequisiteLoading: (value) => {
      prerequisiteLoading = value
      overlayRef.value?.setLoading(value)
      overlayRef.value?.setConfirmLoading(value)
    },
    finishLoading: () => {
      if (!prerequisiteLoading) overlayRef.value?.setLoading(false)
    }
  }
}
