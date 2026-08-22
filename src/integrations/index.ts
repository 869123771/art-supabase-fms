import { defineAsyncComponent } from 'vue'
import { registerRecognitionRunner } from '@/integrations/recognition-runner'

export function registerFmsRecognitionIntegration(): void {
  registerRecognitionRunner(
    ['invoice_ocr', 'cash_voucher_ocr'],
    defineAsyncComponent(() => import('./recognition-runner.vue'))
  )
}
