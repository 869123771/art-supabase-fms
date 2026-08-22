export {}

declare global {
  declare namespace Api {
    namespace Fms {
      type ExpenseOcrStatus = 'not_started' | 'processing' | 'succeeded' | 'failed'
      type ReimbursementApprovalStatus =
        'draft' | 'pending_review' | 'approved' | 'rejected' | 'paid' | 'cancelled'

      type AccountSetStatus = 'draft' | 'active' | 'suspended' | 'archived'
      type AccountingStandard =
        | 'enterprise_2007'
        | 'enterprise_2019'
        | 'small_enterprise'
        | 'non_profit'
        | 'union'
        | 'farmer_cooperative_2023'
        | 'rural_collective_2024'
      type VatTaxpayerType = 'general' | 'small_scale' | 'other'
      type AccountingPeriodStatus = 'not_opened' | 'open' | 'closing' | 'closed'
      type SubjectCategory =
        'asset' | 'liability' | 'equity' | 'cost' | 'income' | 'expense' | 'memo'
      type BalanceDirection = 'debit' | 'credit'
      type AuxiliarySourceType =
        'manual' | 'customer' | 'carrier' | 'department' | 'employee' | 'project'
      type ExchangeRateType = 'spot' | 'average' | 'closing'
      type OpeningBalanceStatus = 'draft' | 'confirmed'
      type VoucherStatus =
        'draft' | 'pending_review' | 'approved' | 'rejected' | 'posted' | 'reversed' | 'voided'
      type VoucherType =
        'general' | 'receipt' | 'payment' | 'transfer' | 'adjustment' | 'closing' | 'reversal'
      type VoucherSourceType =
        | 'manual'
        | 'customer_statement'
        | 'carrier_statement'
        | 'customer_receipt'
        | 'carrier_payment'
        | 'invoice'
        | 'expense_reimbursement'
        | 'waybill_cost'
        | 'system'
        | 'commercial_bill'
        | 'fixed_asset'
        | 'asset_depreciation'
        | 'payroll'
        | 'tax'
        | 'period_close'
        | 'reversal'
      type VoucherAction =
        | 'create'
        | 'save'
        | 'submit'
        | 'approve'
        | 'reject'
        | 'post'
        | 'void'
        | 'reverse'
        | 'reversal_create'
      type VoucherFieldKey =
        'voucherAmounts' | 'sourceReferences' | 'voucherAttachments' | 'auditTrail'
      type VoucherFieldAccessMap = Partial<Record<VoucherFieldKey, Api.Common.FieldAccessLevel>>

      type AccountSetFieldKey = 'taxRegistration' | 'accountingPolicy' | 'administrativeAudit'
      type AccountSetFieldAccessMap = Partial<
        Record<AccountSetFieldKey, Api.Common.FieldAccessLevel>
      >
      type ProtectedAccountingStandard = AccountingStandard | '***'
      type ProtectedVatTaxpayerType = VatTaxpayerType | '***'
      type ProtectedFiscalMonth = number | '***'

      interface AccountSetRecord {
        id: string
        tenantId: string
        tenant?: Pick<Api.SystemManage.TenantListItem, 'id' | 'tenantCode' | 'tenantName'> | null
        accountSetCode: string
        accountSetName: string
        legalEntityName: string
        unifiedSocialCreditCode?: string | null
        accountingStandard?: ProtectedAccountingStandard
        vatTaxpayerType?: ProtectedVatTaxpayerType
        baseCurrencyCode?: string
        enabledOn?: string
        fiscalYearStartMonth?: ProtectedFiscalMonth
        status: AccountSetStatus
        isDefault: boolean
        remark?: string | null
        version?: number | '***'
        createBy?: string | null
        createTime?: string
        updateBy?: string | null
        updateTime?: string
        fieldAccess?: AccountSetFieldAccessMap
        isRecordOwner?: boolean
      }

      type AccountSetSearchParams = Api.Common.CommonSearchParams & {
        keyword?: string
        tenantId?: string
        status?: AccountSetStatus
      }

      interface AccountSetOverview {
        totalCount: number
        activeCount: number
        draftCount: number
        suspendedCount: number
      }

      interface AccountSetOption {
        label: string
        value: string
        status: AccountSetStatus
        tenantId: string
      }

      interface SaveAccountSetPayload {
        id?: string
        tenantId: string
        accountSetCode: string
        accountSetName: string
        legalEntityName: string
        unifiedSocialCreditCode?: string | null
        accountingStandard: AccountingStandard
        vatTaxpayerType: VatTaxpayerType
        baseCurrencyCode: string
        enabledOn: string
        fiscalYearStartMonth: number
        status?: AccountSetStatus
        isDefault: boolean
        remark?: string | null
      }

      interface AccountingPeriodRecord {
        id: string
        tenantId: string
        accountSetId: string
        fiscalYear: number
        periodNo: number
        startDate: string
        endDate: string
        status: AccountingPeriodStatus
        closedAt?: string | null
        closedBy?: string | null
        reopenedAt?: string | null
        reopenedBy?: string | null
        reopenReason?: string | null
        reopenCount: number
        createBy?: string | null
        createTime: string
        updateBy?: string | null
        updateTime: string
      }

      interface AccountingFoundationSummary {
        accountSetId: string
        subjectCount: number
        enabledSubjectCount: number
        currencyCount: number
        auxiliaryTypeCount: number
        openPeriodCount: number
        closedPeriodCount: number
        openingBalanceCount: number
      }

      interface AccountingReadiness {
        accountSetId: string
        accountSetStatus: AccountSetStatus
        subjectCount: number
        missingSubjectCodes: string[]
        postingRuleCount: number
        missingPostingRuleCodes: string[]
        statementItemCount: number
        statementMappingCount: number
        openPeriodCount: number
        fundAccountCount: number
        foundationReady: boolean
        transactionReady: boolean
        subjectsInserted?: number
        rulesInserted?: number
        statementMappingsInserted?: number
      }

      interface AccountingWorkloadSummary {
        failedPostingEventCount: number
        pendingConfigurationEventCount: number
        pendingPostingEventCount: number
        pendingVoucherReviewCount: number
        approvedVoucherCount: number
        closingPeriodCount: number
      }

      interface SubjectRecord {
        id: string
        tenantId: string
        accountSetId: string
        parentId?: string | null
        subjectCode: string
        subjectName: string
        category: SubjectCategory
        balanceDirection: BalanceDirection
        level: number
        isSystem: boolean
        isEnabled: boolean
        allowQuantity: boolean
        unitName?: string | null
        allowForeignCurrency: boolean
        allowPeriodEndRevaluation: boolean
        cashFlowRequired: boolean
        sort: number
        remark?: string | null
        createTime: string
        updateTime: string
        auxiliaryConfigs?: SubjectAuxiliaryConfigRecord[]
        children?: SubjectRecord[]
      }

      interface SubjectAuxiliaryConfigRecord {
        id?: string
        auxiliaryTypeId: string
        isRequired: boolean
        sort: number
        auxiliaryType?: Pick<
          AuxiliaryTypeRecord,
          'id' | 'typeCode' | 'typeName' | 'sourceType' | 'isEnabled'
        > | null
      }

      type SaveSubjectPayload = Omit<
        SubjectRecord,
        | 'id'
        | 'tenantId'
        | 'level'
        | 'isSystem'
        | 'createTime'
        | 'updateTime'
        | 'auxiliaryConfigs'
        | 'children'
      > & {
        id?: string
        tenantId: string
        auxiliaryConfigs: Array<
          Pick<SubjectAuxiliaryConfigRecord, 'auxiliaryTypeId' | 'isRequired' | 'sort'>
        >
      }

      interface CurrencyRecord {
        id: string
        tenantId: string
        accountSetId: string
        currencyCode: string
        currencyName: string
        symbol?: string | null
        decimalPlaces: number
        isBase: boolean
        isEnabled: boolean
        sort: number
        remark?: string | null
        createTime: string
        updateTime: string
      }

      type SaveCurrencyPayload = Omit<CurrencyRecord, 'id' | 'createTime' | 'updateTime'> & {
        id?: string
      }

      interface ExchangeRateRecord {
        id: string
        tenantId: string
        accountSetId: string
        currencyId: string
        rateDate: string
        rateType: ExchangeRateType
        directRate: number
        source?: string | null
        remark?: string | null
        createTime: string
        updateTime: string
        currency?: Pick<CurrencyRecord, 'id' | 'currencyCode' | 'currencyName'> | null
      }

      type SaveExchangeRatePayload = Omit<
        ExchangeRateRecord,
        'id' | 'createTime' | 'updateTime' | 'currency'
      > & { id?: string }

      interface AuxiliaryTypeRecord {
        id: string
        tenantId: string
        accountSetId: string
        typeCode: string
        typeName: string
        sourceType: AuxiliarySourceType
        isSystem: boolean
        isEnabled: boolean
        sort: number
        remark?: string | null
        createTime: string
        updateTime: string
      }

      type SaveAuxiliaryTypePayload = Omit<
        AuxiliaryTypeRecord,
        'id' | 'isSystem' | 'createTime' | 'updateTime'
      > & { id?: string }

      interface AuxiliaryItemRecord {
        id: string
        tenantId: string
        accountSetId: string
        auxiliaryTypeId: string
        itemCode: string
        itemName: string
        externalEntityType?: string | null
        externalEntityId?: string | null
        isEnabled: boolean
        sort: number
        remark?: string | null
        createTime: string
        updateTime: string
      }

      type SaveAuxiliaryItemPayload = Omit<
        AuxiliaryItemRecord,
        'id' | 'externalEntityType' | 'externalEntityId' | 'createTime' | 'updateTime'
      > & { id?: string }

      type OpeningBalanceFieldKey = 'balanceAmounts' | 'auxiliaryDetails' | 'controlAudit'
      type OpeningBalanceFieldAccessMap = Partial<
        Record<OpeningBalanceFieldKey, Api.Common.FieldAccessLevel>
      >
      type OpeningBalanceSensitiveNumber = number | string

      interface OpeningBalanceRecord {
        id: string
        accountSetId: string
        fiscalYear: number
        subjectId: string
        currencyId?: string | null
        auxiliaryValues?: Record<string, string>
        openingDebit?: OpeningBalanceSensitiveNumber
        openingCredit?: OpeningBalanceSensitiveNumber
        yearToDateDebit?: OpeningBalanceSensitiveNumber
        yearToDateCredit?: OpeningBalanceSensitiveNumber
        openingQuantity?: OpeningBalanceSensitiveNumber
        originalCurrencyAmount?: OpeningBalanceSensitiveNumber
        createTime?: string
        updateTime?: string
        subject?: Pick<
          SubjectRecord,
          'id' | 'subjectCode' | 'subjectName' | 'balanceDirection'
        > | null
        currency?: Pick<CurrencyRecord, 'id' | 'currencyCode' | 'currencyName'> | null
        fieldAccess?: OpeningBalanceFieldAccessMap
        isRecordOwner?: boolean
      }

      interface SaveOpeningBalancePayload {
        id?: string
        accountSetId: string
        fiscalYear: number
        subjectId: string
        currencyId?: string | null
        auxiliaryValues: Record<string, string>
        openingDebit: number
        openingCredit: number
        yearToDateDebit: number
        yearToDateCredit: number
        openingQuantity: number
        originalCurrencyAmount: number
      }

      interface OpeningBalanceControlRecord {
        id: string
        accountSetId: string
        fiscalYear: number
        status: OpeningBalanceStatus
        confirmedAt?: string | null
        confirmedBy?: string | null
        reopenedAt?: string | null
        reopenedBy?: string | null
        reopenReason?: string | null
        reopenCount?: OpeningBalanceSensitiveNumber
        createTime?: string
        updateTime?: string
        fieldAccess?: OpeningBalanceFieldAccessMap
      }

      interface OpeningBalanceSummary {
        accountSetId: string
        fiscalYear: number
        status: OpeningBalanceStatus
        entryCount: number
        openingDebit?: OpeningBalanceSensitiveNumber
        openingCredit?: OpeningBalanceSensitiveNumber
        difference?: OpeningBalanceSensitiveNumber
        isBalanced: boolean
        fieldAccess?: OpeningBalanceFieldAccessMap
        control?: OpeningBalanceControlRecord | null
      }

      interface AuxiliarySyncResult {
        insertedCount: number
        updatedCount: number
        totalCount: number
      }

      interface VoucherAttachment {
        name: string
        url: string
        fileType?: string
        fileSize?: string
      }

      interface VoucherLineRecord {
        id?: string
        tenantId?: string
        accountSetId?: string
        voucherId?: string
        lineNo: number
        summary: string
        subjectId: string
        subjectCodeSnapshot?: string
        subjectNameSnapshot?: string
        auxiliaryValues: Record<string, string>
        currencyId?: string | null
        currencyCodeSnapshot?: string | null
        exchangeRate: number
        originalAmount: number
        quantity: number
        unitNameSnapshot?: string | null
        debitAmount: number
        creditAmount: number
        entryDirection?: BalanceDirection
        sourceLineType?: string | null
        sourceLineId?: string | null
        createTime?: string
        updateTime?: string
        subject?: Pick<
          SubjectRecord,
          | 'id'
          | 'subjectCode'
          | 'subjectName'
          | 'balanceDirection'
          | 'allowQuantity'
          | 'unitName'
          | 'allowForeignCurrency'
        > | null
        currency?: Pick<CurrencyRecord, 'id' | 'currencyCode' | 'currencyName'> | null
      }

      interface VoucherActionRecord {
        id: string
        tenantId: string
        accountSetId: string
        voucherId: string
        action: VoucherAction
        fromStatus?: VoucherStatus | null
        toStatus?: VoucherStatus | null
        reason?: string | null
        actor: string
        actionTime: string
        snapshot: Record<string, unknown>
      }

      interface VoucherRecord {
        id: string
        tenantId: string
        accountSetId: string
        accountingPeriodId: string
        voucherNo: string
        voucherType: VoucherType
        voucherDate: string
        fiscalYear: number
        periodNo: number
        status: VoucherStatus
        sourceType: VoucherSourceType
        sourceId?: string | null
        sourceNo?: string | null
        summary: string
        attachments: VoucherAttachment[]
        totalDebit: number
        totalCredit: number
        lineCount: number
        submittedAt?: string | null
        submittedBy?: string | null
        reviewedAt?: string | null
        reviewedBy?: string | null
        reviewComment?: string | null
        postedAt?: string | null
        postedBy?: string | null
        voidedAt?: string | null
        voidedBy?: string | null
        voidReason?: string | null
        reversedAt?: string | null
        reversedBy?: string | null
        reversalReason?: string | null
        reversalVoucherId?: string | null
        version: number
        createBy?: string | null
        createTime: string
        updateBy?: string | null
        updateTime: string
        accountSet?: Pick<
          AccountSetRecord,
          'id' | 'accountSetCode' | 'accountSetName' | 'baseCurrencyCode'
        > | null
        lines?: VoucherLineRecord[]
        actions?: VoucherActionRecord[]
      }

      type SecureVoucherLineRecord = Omit<
        VoucherLineRecord,
        'exchangeRate' | 'originalAmount' | 'quantity' | 'debitAmount' | 'creditAmount'
      > & {
        exchangeRate?: Api.Tms.BasicData.SensitiveNumber
        originalAmount?: Api.Tms.BasicData.SensitiveNumber
        quantity?: Api.Tms.BasicData.SensitiveNumber
        debitAmount?: Api.Tms.BasicData.SensitiveNumber
        creditAmount?: Api.Tms.BasicData.SensitiveNumber
      }

      type SecureVoucherRecord = Omit<VoucherRecord, 'totalDebit' | 'totalCredit' | 'lines'> & {
        totalDebit?: Api.Tms.BasicData.SensitiveNumber
        totalCredit?: Api.Tms.BasicData.SensitiveNumber
        lines?: SecureVoucherLineRecord[]
        fieldAccess?: VoucherFieldAccessMap
        isRecordOwner?: boolean
      }

      type VoucherSearchParams = Api.Common.CommonSearchParams & {
        accountSetId?: string
        status?: VoucherStatus | ''
        voucherType?: VoucherType | ''
        sourceType?: VoucherSourceType | ''
        voucherDateRange?: string[]
        keyword?: string
      }

      interface SaveVoucherPayload {
        id?: string
        accountSetId: string
        voucherType: VoucherType
        voucherDate: string
        sourceType: VoucherSourceType
        sourceId?: string | null
        sourceNo?: string | null
        summary: string
        attachments: VoucherAttachment[]
        lines: VoucherLineRecord[]
      }

      interface VoucherSummary {
        accountSetId: string
        draftCount: number
        pendingReviewCount: number
        approvedCount: number
        postedCount: number
        reversedCount: number
        currentPeriodPostedAmount?: Api.Tms.BasicData.SensitiveNumber
        fieldAccess?: VoucherFieldAccessMap
      }

      interface VoucherTemplateLineRecord {
        id?: string
        tenantId?: string
        accountSetId?: string
        templateId?: string
        lineNo: number
        summary?: string | null
        subjectId: string
        entryDirection: BalanceDirection
        defaultAmount: number
        auxiliaryValues: Record<string, string>
        currencyId?: string | null
        exchangeRate: number
        quantity: number
        subject?: Pick<SubjectRecord, 'id' | 'subjectCode' | 'subjectName'> | null
        currency?: Pick<CurrencyRecord, 'id' | 'currencyCode' | 'currencyName'> | null
      }

      type VoucherTemplateFieldKey = 'templateNarrative' | 'templateEntries' | 'maintenanceAudit'
      type VoucherTemplateFieldAccessMap = Partial<
        Record<VoucherTemplateFieldKey, Api.Common.FieldAccessLevel>
      >

      interface VoucherTemplateRecord {
        id: string
        tenantId: string
        accountSetId: string
        templateCode: string
        templateName: string
        voucherType?: Exclude<VoucherType, 'reversal'> | '***'
        summary?: string | null
        isEnabled: boolean
        sort: number
        remark?: string | null
        version?: number | '***'
        createBy?: string | null
        createTime?: string
        updateBy?: string | null
        updateTime?: string
        lines?: VoucherTemplateLineRecord[] | '***'
        lineCount?: number
        fieldAccess?: VoucherTemplateFieldAccessMap
        isRecordOwner?: boolean
      }

      type VoucherTemplateSearchParams = Api.Common.CommonSearchParams & {
        accountSetId?: string
        voucherType?: Exclude<VoucherType, 'reversal'> | ''
        isEnabled?: boolean | ''
        keyword?: string
      }

      interface SaveVoucherTemplatePayload {
        id?: string
        accountSetId: string
        templateCode: string
        templateName: string
        voucherType?: Exclude<VoucherType, 'reversal'>
        summary?: string | null
        isEnabled: boolean
        sort: number
        remark?: string | null
        lines?: VoucherTemplateLineRecord[]
      }

      type PostingSourceType = Exclude<VoucherSourceType, 'manual' | 'reversal'>
      type PostingSubmissionMode = 'draft' | 'pending_review'
      type PostingAmountKey =
        | 'gross_amount'
        | 'net_amount'
        | 'tax_amount'
        | 'original_value'
        | 'accumulated_depreciation'
        | 'impairment_amount'
        | 'disposal_gain'
        | 'disposal_loss'
        | 'salary_gross_amount'
        | 'deduction_amount'
        | 'employer_cost_amount'
        | 'output_tax_amount'
        | 'input_tax_amount'
      type PostingEventStatus =
        | 'pending'
        | 'processing'
        | 'generated'
        | 'pending_configuration'
        | 'failed'
        | 'reversed'
        | 'ignored'

      interface PostingRuleLineRecord {
        id?: string
        tenantId?: string
        accountSetId?: string
        ruleId?: string
        lineNo: number
        direction: BalanceDirection
        amountKey: PostingAmountKey
        amountMultiplier: number
        subjectId: string
        cashFlowItemId?: string | null
        summary?: string | null
        auxiliaryBindings: Record<string, string>
        createTime?: string
        updateTime?: string
        subject?: Pick<SubjectRecord, 'id' | 'subjectCode' | 'subjectName'> | null
      }

      interface PostingRuleRecord {
        id: string
        tenantId: string
        accountSetId: string
        ruleCode: string
        ruleName: string
        sourceType: PostingSourceType
        eventCode: string
        sourceEvent?: string
        voucherType: Exclude<VoucherType, 'reversal'>
        submissionMode: PostingSubmissionMode
        matchConditions: Record<string, unknown>
        priority: number
        effectiveFrom?: string | null
        effectiveTo?: string | null
        isEnabled: boolean
        remark?: string | null
        createBy?: string | null
        createTime: string
        updateBy?: string | null
        updateTime: string
        accountSet?: Pick<AccountSetRecord, 'id' | 'accountSetCode' | 'accountSetName'> | null
        lines?: PostingRuleLineRecord[]
      }

      type PostingRuleSearchParams = Api.Common.CommonSearchParams & {
        accountSetId?: string
        sourceEvent?: string
        isEnabled?: boolean | ''
        keyword?: string
      }

      interface SavePostingRulePayload {
        id?: string
        accountSetId: string
        ruleCode: string
        ruleName: string
        sourceType: PostingSourceType
        eventCode: string
        voucherType: Exclude<VoucherType, 'reversal'>
        submissionMode: PostingSubmissionMode
        matchConditions: Record<string, unknown>
        priority: number
        effectiveFrom?: string | null
        effectiveTo?: string | null
        isEnabled: boolean
        remark?: string | null
        lines: PostingRuleLineRecord[]
      }

      interface PostingEventRecord {
        id: string
        tenantId: string
        accountSetId?: string | null
        sourceType: PostingSourceType
        eventCode: string
        sourceEvent?: string
        sourceId: string
        sourceNo?: string | null
        eventDate: string
        summary: string
        payload: Record<string, unknown>
        status: PostingEventStatus
        ruleId?: string | null
        originVoucherId?: string | null
        voucherId?: string | null
        attemptCount: number
        lastError?: string | null
        processedAt?: string | null
        createBy?: string | null
        createTime: string
        updateBy?: string | null
        updateTime: string
        accountSet?: Pick<AccountSetRecord, 'id' | 'accountSetCode' | 'accountSetName'> | null
        rule?: Pick<PostingRuleRecord, 'id' | 'ruleCode' | 'ruleName'> | null
        voucher?: Pick<VoucherRecord, 'id' | 'voucherNo' | 'status' | 'totalDebit'> | null
      }

      type PostingEventSearchParams = Api.Common.CommonSearchParams & {
        accountSetId?: string
        sourceEvent?: string
        status?: PostingEventStatus | ''
        eventDateRange?: string[]
        keyword?: string
      }

      interface PostingEventProcessResult {
        eventId: string
        status: PostingEventStatus
        voucherId?: string | null
        lastError?: string | null
      }

      type AutoPostingFieldKey =
        | 'ruleConfiguration'
        | 'eventAmounts'
        | 'eventPayloadDetails'
        | 'eventSourceReferences'
        | 'processingDiagnostics'
      type AutoPostingFieldAccessMap = Partial<
        Record<AutoPostingFieldKey, Api.Common.FieldAccessLevel>
      >

      interface SecurePostingRuleRecord extends Omit<
        PostingRuleRecord,
        'tenantId' | 'voucherType' | 'submissionMode' | 'matchConditions' | 'remark' | 'lines'
      > {
        tenantId?: string
        voucherType?: Exclude<VoucherType, 'reversal'> | '***'
        submissionMode?: PostingSubmissionMode | '***'
        matchConditions?: Record<string, unknown>
        remark?: string | null
        lines?: PostingRuleLineRecord[]
        configurationMasked?: boolean
        fieldAccess?: AutoPostingFieldAccessMap
        isRecordOwner?: boolean
      }

      interface SecurePostingEventRecord extends Omit<
        PostingEventRecord,
        | 'tenantId'
        | 'sourceId'
        | 'sourceNo'
        | 'summary'
        | 'payload'
        | 'ruleId'
        | 'originVoucherId'
        | 'voucherId'
        | 'attemptCount'
        | 'lastError'
        | 'processedAt'
        | 'createBy'
        | 'updateBy'
        | 'rule'
        | 'voucher'
      > {
        tenantId?: string
        sourceId?: string
        sourceNo?: string | null
        summary?: string | null
        payload: Record<string, unknown>
        ruleId?: string | null
        originVoucherId?: string | null
        voucherId?: string | null
        attemptCount?: Api.Tms.BasicData.SensitiveNumber
        lastError?: string | null
        processedAt?: string | null
        createBy?: string | null
        updateBy?: string | null
        rule?: { id: string; ruleCode: string; ruleName: string } | null
        voucher?: {
          id: string
          voucherNo: string
          status: VoucherStatus | '***'
          totalDebit?: Api.Tms.BasicData.SensitiveNumber
        } | null
        fieldAccess?: AutoPostingFieldAccessMap
        isRecordOwner?: boolean
      }

      type FundAccountType = 'bank' | 'cash' | 'digital_wallet'
      type FundAccountStatus = 'active' | 'frozen' | 'closed'
      type FundAccountFieldKey = 'accountDetails' | 'accountBalances'
      type FundAccountFieldAccessMap = Partial<
        Record<FundAccountFieldKey, Api.Tms.BasicData.FieldAccessLevel>
      >
      type FundLedgerDirection = 'inflow' | 'outflow'
      type FundLedgerSourceType =
        | 'customer_receipt'
        | 'carrier_payment'
        | 'expense_payment'
        | 'fund_transfer'
        | 'manual_adjustment'
        | 'opening'
        | 'commercial_bill'
        | 'fixed_asset'
        | 'payroll'
        | 'tax'
      type FundLedgerStatus = 'posted' | 'reversed'
      type FundLedgerFieldKey = 'accountDetails' | 'ledgerAmounts' | 'transactionDetails'
      type FundLedgerFieldAccessMap = Partial<
        Record<FundLedgerFieldKey, Api.Common.FieldAccessLevel>
      >

      interface FundAccountRecord {
        id: string
        tenantId: string
        accountSetId: string
        currencyId: string
        accountCode: string
        accountName: string
        accountType: FundAccountType
        bankName?: string | null
        bankBranch?: string | null
        accountNoMasked?: string
        openingBalance?: Api.Tms.BasicData.SensitiveNumber
        frozenBalance?: Api.Tms.BasicData.SensitiveNumber
        status: FundAccountStatus
        isDefault: boolean
        onlineBankingEnabled: boolean
        reconciliationEnabled: boolean
        balanceAsOf?: string | null
        remark?: string | null
        version: number
        createBy?: string | null
        createTime: string
        updateBy?: string | null
        updateTime: string
        inflowAmount?: Api.Tms.BasicData.SensitiveNumber
        outflowAmount?: Api.Tms.BasicData.SensitiveNumber
        currentBalance?: Api.Tms.BasicData.SensitiveNumber
        availableBalance?: Api.Tms.BasicData.SensitiveNumber
        ledgerEntryCount: number
        latestBalanceDate?: string | null
        accountSet?: Pick<AccountSetRecord, 'id' | 'accountSetCode' | 'accountSetName'> | null
        currency?: Pick<CurrencyRecord, 'id' | 'currencyCode' | 'currencyName' | 'symbol'> | null
        fieldAccess?: FundAccountFieldAccessMap
        isRecordOwner?: boolean
      }

      type FundAccountSearchParams = Api.Common.CommonSearchParams & {
        accountSetId?: string
        tenantId?: string
        accountType?: FundAccountType | ''
        status?: FundAccountStatus | ''
        keyword?: string
      }

      interface SaveFundAccountPayload {
        id?: string
        accountSetId: string
        currencyId: string
        accountCode: string
        accountName: string
        accountType: FundAccountType
        bankName?: string | null
        bankBranch?: string | null
        accountNo?: string | null
        openingBalance: number
        frozenBalance: number
        status: FundAccountStatus
        isDefault: boolean
        onlineBankingEnabled: boolean
        reconciliationEnabled: boolean
        balanceAsOf?: string | null
        remark?: string | null
      }

      interface FundAccountOption {
        id: string
        label: string
        value: string
        tenantId: string
        accountSetId: string
        currencyId: string
        currencyCode?: string
        accountCode: string
        accountName: string
        accountNoMasked?: string
        accountType: FundAccountType
        status: FundAccountStatus
        reconciliationEnabled: boolean
        availableBalance?: Api.Tms.BasicData.SensitiveNumber
        fieldAccess?: FundAccountFieldAccessMap
        isRecordOwner?: boolean
      }

      interface FundAccountOverview {
        accountCount: number
        activeAccountCount: number
        baseCurrencyCurrentBalance?: Api.Tms.BasicData.SensitiveNumber
        baseCurrencyAvailableBalance?: Api.Tms.BasicData.SensitiveNumber
        baseCurrencyFrozenBalance?: Api.Tms.BasicData.SensitiveNumber
        foreignCurrencyAccountCount: number
        fieldAccess?: FundAccountFieldAccessMap
      }

      interface FundLedgerRecord {
        id: string
        tenantId?: string
        accountSetId: string
        fundAccountId?: string
        entryNo: string
        entryDate: string
        direction: FundLedgerDirection
        amount?: Api.Tms.BasicData.SensitiveNumber
        sourceType: FundLedgerSourceType
        sourceId?: string | null
        sourceNo?: string | null
        summary?: string
        counterpartyName?: string | null
        bankReference?: string | null
        status: FundLedgerStatus
        reversalOfId?: string | null
        postedAt: string
        postedBy?: string | null
        createTime: string
        updateTime: string
        currencyCode?: string
        fundAccount?: Pick<
          FundAccountRecord,
          'id' | 'accountCode' | 'accountName' | 'accountNoMasked'
        > | null
        fieldAccess?: FundLedgerFieldAccessMap
        isRecordOwner?: boolean
      }

      type FundLedgerSearchParams = Api.Common.CommonSearchParams & {
        accountSetId?: string
        fundAccountId?: string
        direction?: FundLedgerDirection | ''
        sourceType?: FundLedgerSourceType | ''
        status?: FundLedgerStatus | ''
        entryDateRange?: string[]
        keyword?: string
      }

      type FundTransferStatus =
        'draft' | 'pending_review' | 'approved' | 'rejected' | 'completed' | 'reversed'
      type FundTransferAction =
        'create' | 'edit' | 'submit' | 'approve' | 'reject' | 'execute' | 'reverse'
      type FundTransferFieldKey = 'transferAccounts' | 'transferAmounts' | 'bankReference'
      type FundTransferFieldAccessMap = Partial<
        Record<FundTransferFieldKey, Api.Common.FieldAccessLevel>
      >

      interface FundTransferRecord {
        id: string
        tenantId?: string
        accountSetId: string
        transferNo: string
        sourceAccountId?: string
        targetAccountId?: string
        transferDate: string
        amount?: Api.Tms.BasicData.SensitiveNumber
        feeAmount?: Api.Tms.BasicData.SensitiveNumber
        purpose: string
        bankReference?: string | null
        status: FundTransferStatus
        submittedAt?: string | null
        submittedBy?: string | null
        reviewedAt?: string | null
        reviewedBy?: string | null
        reviewRemark?: string | null
        completedAt?: string | null
        completedBy?: string | null
        reversedAt?: string | null
        reversedBy?: string | null
        reversalReason?: string | null
        version: number
        createBy?: string | null
        createTime: string
        updateBy?: string | null
        updateTime: string
        sourceAccountCode?: string
        sourceAccountName?: string
        sourceAccountNoMasked?: string
        targetAccountCode?: string
        targetAccountName?: string
        targetAccountNoMasked?: string
        currencyCode: string
        currencyName: string
        currencySymbol?: string | null
        fieldAccess?: FundTransferFieldAccessMap
        isRecordOwner?: boolean
      }

      interface FundTransferActionRecord {
        id: string
        tenantId: string
        transferId: string
        action: FundTransferAction
        fromStatus?: FundTransferStatus | null
        toStatus: FundTransferStatus
        actionRemark?: string | null
        actionBy: string
        actionTime: string
      }

      type FundTransferSearchParams = Api.Common.CommonSearchParams & {
        accountSetId?: string
        sourceAccountId?: string
        targetAccountId?: string
        status?: FundTransferStatus | ''
        transferDateRange?: string[]
        keyword?: string
      }

      interface SaveFundTransferPayload {
        id?: string
        version?: number
        transferNo?: string | null
        sourceAccountId?: string
        targetAccountId?: string
        transferDate: string
        amount?: number
        feeAmount?: number
        purpose: string
        bankReference?: string | null
      }

      type BankReconciliationStatus = 'draft' | 'reconciling' | 'reconciled' | 'voided'
      type BankStatementLineStatus = 'unmatched' | 'partial_matched' | 'matched' | 'ignored'
      type BankMatchType = 'automatic' | 'manual'
      type BankReconciliationFieldKey = 'accountDetails' | 'statementAmounts' | 'bankReferences'
      type BankReconciliationFieldAccessMap = Partial<
        Record<BankReconciliationFieldKey, Api.Common.FieldAccessLevel>
      >

      interface BankReconciliationBatchRecord {
        id: string
        tenantId: string
        accountSetId: string
        fundAccountId: string
        batchNo: string
        statementStartDate: string
        statementEndDate: string
        openingBalance?: Api.Tms.BasicData.SensitiveNumber
        closingBalance?: Api.Tms.BasicData.SensitiveNumber
        importedFileName?: string | null
        importedAt: string
        importedBy: string
        status: BankReconciliationStatus
        completedAt?: string | null
        completedBy?: string | null
        voidedAt?: string | null
        voidedBy?: string | null
        voidReason?: string | null
        remark?: string | null
        version: number
        createTime: string
        updateTime: string
        accountCode: string
        accountName: string
        accountNoMasked?: string
        currencyCode: string
        currencySymbol?: string | null
        lineCount: number
        matchedCount: number
        partialCount: number
        ignoredCount: number
        unmatchedCount: number
        statementInflowAmount?: Api.Tms.BasicData.SensitiveNumber
        statementOutflowAmount?: Api.Tms.BasicData.SensitiveNumber
        matchedAmount?: Api.Tms.BasicData.SensitiveNumber
        calculatedClosingBalance?: Api.Tms.BasicData.SensitiveNumber
        statementBalanceDifference?: Api.Tms.BasicData.SensitiveNumber
        fieldAccess?: BankReconciliationFieldAccessMap
        isRecordOwner?: boolean
      }

      type BankReconciliationSearchParams = Api.Common.CommonSearchParams & {
        accountSetId?: string
        fundAccountId?: string
        status?: BankReconciliationStatus | ''
        statementDateRange?: string[]
        keyword?: string
      }

      interface BankStatementLineRecord {
        id: string
        tenantId: string
        accountSetId: string
        batchId: string
        fundAccountId: string
        lineNo: number
        transactionDate: string
        direction: FundLedgerDirection
        amount?: Api.Tms.BasicData.SensitiveNumber
        statementBalance?: Api.Tms.BasicData.SensitiveNumber | null
        counterpartyName?: string | null
        counterpartyAccountMasked?: string | null
        bankReference?: string | null
        bankSerialNo?: string | null
        bankMemo?: string | null
        status: BankStatementLineStatus
        ignoredReason?: string | null
        ignoredAt?: string | null
        ignoredBy?: string | null
        matchedAmount?: Api.Tms.BasicData.SensitiveNumber
        remainingAmount?: Api.Tms.BasicData.SensitiveNumber
        matchCount: number
        matchTypes?: string | null
        latestMatchedAt?: string | null
        fieldAccess?: BankReconciliationFieldAccessMap
        isRecordOwner?: boolean
      }

      interface BankStatementMatchRecord {
        id: string
        tenantId: string
        statementLineId: string
        ledgerEntryId: string
        matchedAmount?: Api.Tms.BasicData.SensitiveNumber
        matchType: BankMatchType
        confidenceScore?: number | null
        matchRemark?: string | null
        matchedBy: string
        matchedAt: string
        ledgerEntry?: FundLedgerRecord | null
        fieldAccess?: BankReconciliationFieldAccessMap
        isRecordOwner?: boolean
      }

      interface BankMatchCandidateRecord {
        id: string
        entryDate: string
        summary: string
        amount?: Api.Tms.BasicData.SensitiveNumber
        sourceNo?: string | null
        bankReference?: string | null
      }

      interface ImportBankStatementLinePayload {
        transactionDate: string
        direction: FundLedgerDirection
        amount: number
        statementBalance?: number | null
        counterpartyName?: string | null
        counterpartyAccount?: string | null
        bankReference?: string | null
        bankSerialNo?: string | null
        bankMemo?: string | null
      }

      interface ImportBankReconciliationPayload {
        fundAccountId: string
        batchNo?: string | null
        statementStartDate: string
        statementEndDate: string
        openingBalance: number
        closingBalance: number
        importedFileName?: string | null
        remark?: string | null
        lines: ImportBankStatementLinePayload[]
      }

      interface ExpenseReimbursementItem {
        id: string
        tenantId: string
        reimbursementId: string
        costId: string
        waybillId: string
        costNoSnapshot: string
        waybillNoSnapshot: string
        expenseItemNameSnapshot: string
        amountSnapshot?: Api.Tms.BasicData.SensitiveNumber
        occurredOnSnapshot: string
        createTime: string
      }

      type ExpenseReimbursementFieldKey =
        'reimbursementAmounts' | 'payeeDetails' | 'reimbursementEvidence' | 'paymentExecution'

      type ExpenseReimbursementFieldAccessMap = Partial<
        Record<ExpenseReimbursementFieldKey, Api.Tms.BasicData.FieldAccessLevel>
      >

      interface ExpenseReimbursementRecord {
        id: string
        tenantId: string
        reimbursementNo: string
        applicantUserId?: string | null
        applicantNameSnapshot: string
        payeeName?: string | null
        payeeBank?: string | null
        payeeAccount?: string | null
        plannedPaymentDate: string
        paymentMethod?: CashPaymentMethod | '***'
        totalAmount?: Api.Tms.BasicData.SensitiveNumber
        basisUrls?: string[]
        status: ReimbursementApprovalStatus
        submittedAt?: string | null
        submittedBy?: string | null
        reviewedAt?: string | null
        reviewedBy?: string | null
        reviewRemark?: string | null
        paidAt?: string | null
        paidBy?: string | null
        paymentReference?: string | null
        paymentVoucherUrls?: string[]
        remark?: string | null
        itemCount: number
        waybillCount: number
        waybillNos?: string | null
        paymentId?: string | null
        paymentNo?: string | null
        createBy?: string | null
        createTime: string
        updateBy?: string | null
        updateTime: string
        items?: ExpenseReimbursementItem[]
        fieldAccess?: ExpenseReimbursementFieldAccessMap
        isRecordOwner?: boolean
      }

      type ExpenseReimbursementSearchParams = Api.Common.CommonSearchParams & {
        keyword?: string
        status?: string
        paymentMethod?: string
        plannedPaymentDateRange?: string[]
      }

      interface CreateExpenseReimbursementPayload {
        reimbursementNo?: string | null
        costIds: string[]
        payeeName: string
        payeeBank?: string | null
        payeeAccount?: string | null
        plannedPaymentDate: string
        paymentMethod: CashPaymentMethod
        basisUrls?: string[]
        remark?: string | null
      }

      interface ExecuteExpenseReimbursementPayload {
        paymentNo?: string | null
        reimbursementId: string
        fundAccountId: string
        paymentDate: string
        bankReference?: string | null
        voucherUrls?: string[]
        remark?: string | null
      }

      interface WaybillCostOverview {
        totalCount: number
        pendingReviewCount: number
        approvedUnconvertedCount: number
        pendingPaymentAmount?: Api.Tms.BasicData.SensitiveNumber
        paidAmount?: Api.Tms.BasicData.SensitiveNumber
        fieldAccess?: WaybillCostFieldAccessMap
      }

      type WaybillExpenseOcrField =
        | 'amount'
        | 'occurredOn'
        | 'quantity'
        | 'unitPrice'
        | 'providerName'
        | 'payeeName'
        | 'paymentChannel'
        | 'invoiceNo'
        | 'meterNo'
        | 'expenseLocation'
        | 'remark'

      interface WaybillExpenseOcrDraft {
        amount: number | null
        occurredOn: string | null
        quantity: number | null
        unitPrice: number | null
        providerName: string | null
        payeeName: string | null
        paymentChannel: string | null
        invoiceNo: string | null
        meterNo: string | null
        expenseLocation: string | null
        remark: string | null
      }

      interface WaybillExpenseOcrAnalyzeResponse {
        artifactId: string
        runId: string
        generatedAt: string
        rawText: string
        summary: string
        confidence: number
        fieldConfidence: Partial<Record<WaybillExpenseOcrField, number>>
        missingFields: string[]
        warnings: string[]
        expense: WaybillExpenseOcrDraft
        reviewConfidenceThreshold: number
      }

      interface WaybillExpenseOcrRunRecord {
        id: string
        feature: string
        model: string
        status: 'pending' | 'running' | 'succeeded' | 'failed'
        latencyMs?: number | null
        errorCode?: string | null
        errorMessage?: string | null
        metadata?: Record<string, unknown>
        startedAt: string
        finishedAt?: string | null
        createBy?: string | null
      }

      type WaybillExpenseOcrRunSearchParams = Api.Common.CommonSearchParams & {
        status?: string
        keyword?: string
        createTimeRange?: string[]
      }

      type WaybillCostType =
        | 'carrier_freight'
        | 'toll'
        | 'parking'
        | 'fuel'
        | 'loading'
        | 'waiting'
        | 'driver_expense'
        | 'cargo_damage'
        | 'other'
        | 'in_transit_energy'
        | 'in_transit_charging'
        | 'in_transit_gas'
        | 'in_transit_other'

      type CostAuditStatus = 'draft' | 'pending_review' | 'approved' | 'rejected' | 'voided'
      type CostSettlementStatus = 'unsettled' | 'pending_payment' | 'paid'

      type WaybillCostFieldKey =
        'costAmounts' | 'paymentDetails' | 'driverPhone' | 'expenseLocation' | 'expenseEvidence'
      type WaybillCostFieldAccessMap = Partial<
        Record<WaybillCostFieldKey, Api.Tms.BasicData.FieldAccessLevel>
      >

      interface ExpenseItem {
        id?: string
        tenantId?: string
        tenant?: Pick<Api.SystemManage.TenantListItem, 'id' | 'tenantCode' | 'tenantName'> | null
        parentId?: string | null
        itemCode: string
        itemName: string
        businessCategory?: WaybillCostType | null
        isSelectable: boolean
        reimbursementAllowed: boolean
        isEnabled: boolean
        sort: number
        remark?: string | null
        createBy?: string | null
        createTime?: string
        updateBy?: string | null
        updateTime?: string
        children?: ExpenseItem[]
      }

      type ExpenseItemSearchParams = Api.Common.CommonSearchParams & {
        keyword?: string
        tenantId?: string
        parentId?: string | null
        isEnabled?: boolean
      }

      interface WaybillCostWaybill {
        id: string
        waybillNo: string
        status: string
        orderId?: string | null
        carrierId?: string | null
        driverId?: string | null
        originCity?: string | null
        destinationCity?: string | null
        carrier?: Pick<BasicData.CarrierOption, 'id' | 'companyName'> | null
        driver?: Pick<BasicData.DriverOption, 'id' | 'driverName' | 'phone'> | null
        order?: Pick<
          Order.OrderRecord,
          | 'id'
          | 'orderNo'
          | 'dispatchPlateNo'
          | 'dispatchDriverName'
          | 'dispatchDriverPhone'
          | 'originStation'
          | 'destinationStation'
        > | null
      }

      interface WaybillCostRecord {
        id?: string
        tenantId?: string
        costNo?: string
        waybillId: string
        expenseItemId: string
        costType: WaybillCostType | string
        amount: Api.Tms.BasicData.SensitiveNumber
        occurredOn: string
        quantity?: Api.Tms.BasicData.SensitiveNumber
        unitPrice?: Api.Tms.BasicData.SensitiveNumber
        providerName?: string | null
        payeeName?: string | null
        paymentChannel?: string | null
        invoiceNo?: string | null
        meterNo?: string | null
        expenseLocation?: string | null
        expenseRegion?: string | null
        expenseRegionAdcode?: string | null
        expenseLongitude?: number | string | null
        expenseLatitude?: number | string | null
        expenseCoordinateSystem?: string | null
        expenseCoordinateSource?: string | null
        expenseCoordinateStatus?: string | null
        expenseGeocodeProvider?: string | null
        expenseGeocodedAt?: string | null
        carrierId?: string | null
        driverId?: string | null
        remark?: string | null
        attachments?: string[]
        reporterUserId?: string | null
        reporterNameSnapshot?: string | null
        reporterDepartmentSnapshot?: string | null
        auditStatus?: CostAuditStatus
        settlementStatus?: CostSettlementStatus
        reimbursementId?: string | null
        expensePaymentId?: string | null
        paidAt?: string | null
        waybillNoSnapshot?: string | null
        orderNoSnapshot?: string | null
        plateNoSnapshot?: string | null
        driverNameSnapshot?: string | null
        driverPhoneSnapshot?: string | null
        routeSnapshot?: string | null
        latestOcrRunId?: string | null
        ocrArtifactId?: string | null
        ocrStatus?: ExpenseOcrStatus
        submittedAt?: string | null
        submittedBy?: string | null
        reviewedAt?: string | null
        reviewedBy?: string | null
        reviewRemark?: string | null
        createBy?: string | null
        createTime?: string
        updateBy?: string | null
        updateTime?: string
        expenseItem?: ExpenseItem | null
        reimbursement?: Pick<ExpenseReimbursementRecord, 'id' | 'reimbursementNo' | 'status'> | null
        expensePayment?: {
          id: string
          paymentNo: string
          paymentDate?: string | null
          bankReference?: string | null
        } | null
        waybill?: WaybillCostWaybill | null
        fieldAccess?: WaybillCostFieldAccessMap
        isRecordOwner?: boolean
      }

      type WaybillCostSearchParams = Api.Common.CommonSearchParams & {
        recordId?: string
        orderId?: string
        waybillId?: string
        carrierId?: string
        keyword?: string
        expenseItemId?: string
        costType?: string
        auditStatus?: string
        settlementStatus?: string
        occurredOnRange?: string[]
      }

      interface WaybillOption extends WaybillCostWaybill {
        completedAt?: string | null
      }

      interface WaybillOptionSearchParams extends Api.Common.CommonSearchParams {
        keyword?: string
        orderId?: string
      }

      interface CostReviewPayload {
        id: string
        auditStatus: 'approved' | 'rejected'
        reviewRemark?: string | null
      }

      type WaybillCostAuditSignalType =
        | 'amount_outlier'
        | 'cost_concentration'
        | 'duplicate_cost'
        | 'future_occurred_date'
        | 'missing_attachment'
        | 'missing_payee'
        | 'missing_remark'
        | 'negative_margin'
        | 'thin_margin'

      type WaybillCostAuditSeverity = 'critical' | 'high' | 'medium'
      type WaybillCostAuditRiskLevel = WaybillCostAuditSeverity | 'low'
      type WaybillCostAuditRecommendation =
        'block_for_verification' | 'manual_review' | 'routine_review'

      interface WaybillCostAuditSignal {
        type: WaybillCostAuditSignalType
        severity: WaybillCostAuditSeverity
        title: string
        detail: string
        evidence: string[]
      }

      interface WaybillCostAuditAssessment {
        costId: string
        waybillId: string
        waybillNo: string
        route: string
        riskLevel: WaybillCostAuditRiskLevel
        riskScore: number
        confidence: number
        recommendation: WaybillCostAuditRecommendation
        summary: string
        signals: WaybillCostAuditSignal[]
        recommendedActions: string[]
        limitations: string[]
        metrics: {
          amount: number
          benchmarkMedian: number | null
          benchmarkSampleSize: number
          duplicateCount: number
          projectedTotalCost: number
          receivableAmount: number | null
          projectedGrossMargin: number | null
          attachmentCount: number
        }
      }

      interface WaybillCostAuditResponse {
        runId: string
        ruleVersion: string
        generatedAt: string
        assessment: WaybillCostAuditAssessment
      }

      type WaybillProfitAnalysisRiskLevel = 'critical' | 'high' | 'medium' | 'low'
      type WaybillProfitAnalysisSeverity = 'critical' | 'high' | 'medium'
      type WaybillProfitAnalysisRecommendation =
        'repair_cost_baseline' | 'manual_profit_review' | 'routine_monitoring'

      interface WaybillProfitAnalysisSignal {
        type: string
        severity: WaybillProfitAnalysisSeverity
        title: string
        detail: string
        evidence: string[]
      }

      interface WaybillProfitRiskWaybill {
        id: string
        waybillId: string
        waybillNo: string
        route: string
        customerName: string
        carrierName: string
        waybillStatus: string
        receivableAmount: number
        totalCostAmount: number
        grossProfit: number
        grossMargin: number
        riskScore: number
        reasons: string[]
      }

      interface WaybillProfitAnalysisAssessment {
        riskLevel: WaybillProfitAnalysisRiskLevel
        riskScore: number
        confidence: number
        recommendation: WaybillProfitAnalysisRecommendation
        summary: string
        signals: WaybillProfitAnalysisSignal[]
        riskWaybills: WaybillProfitRiskWaybill[]
        recommendedActions: string[]
        limitations: string[]
        metrics: {
          totalWaybills: number
          finalizedWaybills: number
          receivableAmount: number
          totalCostAmount: number
          bookGrossProfit: number
          bookGrossMargin: number | null
          costCoverage: number
          finalizedCostCoverage: number
          missingCostCount: number
          negativeMarginCount: number
          carrierPayableMissingCount: number
        }
      }

      interface WaybillProfitAnalysisResponse {
        runId: string
        ruleVersion: string
        generatedAt: string
        assessment: WaybillProfitAnalysisAssessment
      }

      interface WaybillProfitRecord {
        id: string
        tenantId: string
        waybillId: string
        orderId?: string | null
        waybillNo: string
        waybillStatus: string
        orderStatus?: string | null
        customerId?: string | null
        customerName?: string | null
        carrierId?: string | null
        carrierName?: string | null
        plateNo?: string | null
        driverName?: string | null
        originStation?: string | null
        destinationStation?: string | null
        receivableAmount?: Api.Tms.BasicData.SensitiveNumber
        carrierPayableAmount?: Api.Tms.BasicData.SensitiveNumber
        otherCostAmount?: Api.Tms.BasicData.SensitiveNumber
        totalCostAmount?: Api.Tms.BasicData.SensitiveNumber
        grossProfit?: Api.Tms.BasicData.SensitiveNumber
        grossMargin?: Api.Tms.BasicData.SensitiveNumber
        completedAt?: string | null
        signedAt?: string | null
        createTime?: string
        updateTime?: string
        fieldAccess?: WaybillProfitFieldAccessMap
        isRecordOwner?: boolean
      }

      type WaybillProfitFieldKey = 'receivableAmounts' | 'costAmounts' | 'profitAmounts'
      type WaybillProfitFieldAccessMap = Partial<
        Record<WaybillProfitFieldKey, Api.Tms.BasicData.FieldAccessLevel>
      >

      type WaybillProfitSearchParams = Api.Common.CommonSearchParams & {
        keyword?: string
        waybillStatus?: string
        completedAtRange?: string[]
      }

      type CustomerStatementStatus =
        'draft' | 'pending_review' | 'confirmed' | 'partially_settled' | 'settled' | 'voided'

      type CustomerStatementFieldKey = 'statementAmounts' | 'settlementAmounts'
      type CustomerStatementFieldAccessMap = Partial<
        Record<CustomerStatementFieldKey, Api.Tms.BasicData.FieldAccessLevel>
      >

      type CarrierStatementFieldKey = 'statementAmounts' | 'settlementAmounts'
      type CarrierStatementFieldAccessMap = Partial<
        Record<CarrierStatementFieldKey, Api.Tms.BasicData.FieldAccessLevel>
      >

      interface CustomerStatementItem {
        id: string
        tenantId?: string
        statementId: string
        customerId: string
        waybillId: string
        orderId: string
        waybillNoSnapshot: string
        orderNoSnapshot: string
        originStationSnapshot?: string | null
        destinationStationSnapshot?: string | null
        completedAtSnapshot?: string | null
        receivableAmount?: Api.Tms.BasicData.SensitiveNumber
        adjustmentAmount?: Api.Tms.BasicData.SensitiveNumber
        lineAmount?: Api.Tms.BasicData.SensitiveNumber
        isActive: boolean
        remark?: string | null
        createBy?: string | null
        createTime: string
        updateBy?: string | null
        updateTime: string
      }

      interface CustomerStatementRecord {
        id: string
        tenantId?: string
        statementNo: string
        customerId: string
        customerName: string
        periodStart: string
        periodEnd: string
        status: CustomerStatementStatus
        waybillCount: number
        statementAmount?: Api.Tms.BasicData.SensitiveNumber
        settledAmount?: Api.Tms.BasicData.SensitiveNumber
        outstandingAmount?: Api.Tms.BasicData.SensitiveNumber
        submittedAt?: string | null
        submittedBy?: string | null
        reviewedAt?: string | null
        reviewedBy?: string | null
        reviewRemark?: string | null
        voidedAt?: string | null
        voidedBy?: string | null
        voidReason?: string | null
        remark?: string | null
        createBy?: string | null
        createTime: string
        updateBy?: string | null
        updateTime: string
        items?: CustomerStatementItem[]
        fieldAccess?: CustomerStatementFieldAccessMap
        isRecordOwner?: boolean
      }

      type CustomerStatementSearchParams = Api.Common.CommonSearchParams & {
        customerId?: string
        keyword?: string
        periodRange?: string[]
        recordId?: string
        status?: string
      }

      interface CustomerStatementEligibleWaybill {
        id: string
        tenantId?: string
        waybillNo: string
        waybillStatus: string
        orderId: string
        orderNo: string
        customerId: string
        customerName: string
        originStation?: string | null
        destinationStation?: string | null
        completedAt: string
        receivableAmount?: Api.Tms.BasicData.SensitiveNumber
      }

      interface CustomerStatementEligibleWaybillSearchParams extends Api.Common.CommonSearchParams {
        customerId: string
        periodStart: string
        periodEnd: string
        keyword?: string
      }

      interface CreateCustomerStatementPayload {
        statementNo?: string | null
        customerId: string
        periodStart: string
        periodEnd: string
        waybillIds: string[]
        remark?: string | null
      }

      interface CustomerStatementStatusPayload {
        id: string
        status: CustomerStatementStatus
        businessTitle?: string
        reviewRemark?: string | null
        voidReason?: string | null
      }

      interface CarrierStatementItem {
        id: string
        tenantId?: string
        statementId: string
        carrierId: string
        costId: string
        waybillId: string
        waybillNoSnapshot: string
        costTypeSnapshot: string
        occurredOnSnapshot: string
        payeeNameSnapshot?: string | null
        costAmount?: Api.Tms.BasicData.SensitiveNumber
        adjustmentAmount?: Api.Tms.BasicData.SensitiveNumber
        lineAmount?: Api.Tms.BasicData.SensitiveNumber
        isActive: boolean
        remark?: string | null
        createBy?: string | null
        createTime: string
        updateBy?: string | null
        updateTime: string
      }

      interface CarrierStatementRecord {
        id: string
        tenantId?: string
        statementNo: string
        carrierId: string
        carrierName: string
        periodStart: string
        periodEnd: string
        status: CustomerStatementStatus
        costCount: number
        waybillCount: number
        statementAmount?: Api.Tms.BasicData.SensitiveNumber
        settledAmount?: Api.Tms.BasicData.SensitiveNumber
        outstandingAmount?: Api.Tms.BasicData.SensitiveNumber
        submittedAt?: string | null
        submittedBy?: string | null
        reviewedAt?: string | null
        reviewedBy?: string | null
        reviewRemark?: string | null
        voidedAt?: string | null
        voidedBy?: string | null
        voidReason?: string | null
        remark?: string | null
        createBy?: string | null
        createTime: string
        updateBy?: string | null
        updateTime: string
        items?: CarrierStatementItem[]
        fieldAccess?: CarrierStatementFieldAccessMap
        isRecordOwner?: boolean
      }

      type CarrierStatementSearchParams = Api.Common.CommonSearchParams & {
        carrierId?: string
        keyword?: string
        periodRange?: string[]
        recordId?: string
        status?: string
      }

      interface CarrierStatementEligibleCost {
        id: string
        tenantId?: string
        carrierId: string
        carrierName: string
        waybillId: string
        waybillNo: string
        waybillStatus: string
        costType: string
        costAmount?: Api.Tms.BasicData.SensitiveNumber
        occurredOn: string
        payeeName?: string | null
        remark?: string | null
        originCity?: string | null
        destinationCity?: string | null
      }

      interface CarrierStatementEligibleCostSearchParams extends Api.Common.CommonSearchParams {
        carrierId: string
        periodStart: string
        periodEnd: string
        keyword?: string
      }

      interface CreateCarrierStatementPayload {
        statementNo?: string | null
        carrierId: string
        periodStart: string
        periodEnd: string
        costIds: string[]
        remark?: string | null
      }

      interface CarrierStatementStatusPayload {
        id: string
        status: CustomerStatementStatus
        businessTitle?: string
        reviewRemark?: string | null
        voidReason?: string | null
      }

      type CashDirection = 'receipt' | 'payment'
      type CashPaymentMethod = 'bank_transfer' | 'cash' | 'wechat' | 'alipay' | 'other'
      type CashTransactionStatus =
        'pending_allocation' | 'partially_allocated' | 'allocated' | 'voided'

      interface CashAllocationStatement {
        id: string
        statementNo: string
        customerId: string
        customerNameSnapshot: string
        periodStart: string
        periodEnd: string
        status: CustomerStatementStatus
        settledAmount?: number
      }

      interface CashAllocationRecord {
        id: string
        tenantId: string
        transactionId: string
        statementId: string
        customerId: string
        allocatedAmount?: Api.Tms.BasicData.SensitiveNumber
        isActive: boolean
        allocatedAt: string
        allocatedBy?: string | null
        reversedAt?: string | null
        reversedBy?: string | null
        reverseReason?: string | null
        remark?: string | null
        createBy?: string | null
        createTime: string
        updateBy?: string | null
        updateTime: string
        statement?: CashAllocationStatement | null
      }

      type CashTransactionFieldKey = 'transactionAmounts' | 'bankDetails' | 'voucherEvidence'
      type CashTransactionFieldAccessMap = Partial<
        Record<CashTransactionFieldKey, Api.Tms.BasicData.FieldAccessLevel>
      >

      interface CashTransactionRecord {
        id: string
        tenantId: string
        transactionNo: string
        direction: CashDirection
        customerId?: string | null
        carrierId?: string | null
        counterpartyName: string
        transactionDate: string
        amount?: Api.Tms.BasicData.SensitiveNumber
        allocatedAmount?: Api.Tms.BasicData.SensitiveNumber
        unallocatedAmount?: Api.Tms.BasicData.SensitiveNumber
        allocationCount: number
        paymentMethod: CashPaymentMethod
        bankReference?: string | null
        voucherUrls?: string[]
        status: CashTransactionStatus
        voidedAt?: string | null
        voidedBy?: string | null
        voidReason?: string | null
        remark?: string | null
        createBy?: string | null
        createTime: string
        updateBy?: string | null
        updateTime: string
        paymentApplicationId?: string | null
        fundAccountId?: string | null
        fundAccount?: Pick<
          FundAccountRecord,
          'id' | 'accountCode' | 'accountName' | 'accountNoMasked'
        > | null
        allocations?: Array<CashAllocationRecord | CarrierCashAllocationRecord>
        fieldAccess?: CashTransactionFieldAccessMap
        isRecordOwner?: boolean
      }

      type CashTransactionSearchParams = Api.Common.CommonSearchParams & {
        customerId?: string
        carrierId?: string
        direction?: string
        recordId?: string
        status?: string
        dateRange?: string[]
        keyword?: string
      }

      interface CustomerStatementAllocatable {
        id: string
        tenantId: string
        statementNo: string
        customerId: string
        customerName: string
        periodStart: string
        periodEnd: string
        waybillCount: number
        statementAmount: number
        settledAmount: number
        outstandingAmount: number
        status: CustomerStatementStatus
        createTime: string
      }

      interface CustomerStatementAllocatableSearchParams extends Api.Common.CommonSearchParams {
        customerId: string
        keyword?: string
      }

      interface CashAllocationInput {
        statementId: string
        amount: number
      }

      interface CreateCustomerReceiptPayload {
        transactionNo?: string | null
        customerId: string
        fundAccountId: string
        transactionDate: string
        amount: number
        paymentMethod: CashPaymentMethod
        bankReference?: string | null
        voucherUrls?: string[]
        remark?: string | null
        allocations: CashAllocationInput[]
      }

      interface AllocateCustomerReceiptPayload {
        transactionId: string
        allocations: CashAllocationInput[]
      }

      interface CarrierStatementAllocatable {
        id: string
        tenantId: string
        statementNo: string
        carrierId: string
        carrierName: string
        periodStart: string
        periodEnd: string
        costCount: number
        waybillCount: number
        statementAmount: number
        settledAmount: number
        outstandingAmount: number
        statementOutstandingAmount?: number
        reservedAmount?: number
        status: CustomerStatementStatus
        createTime: string
      }

      interface CarrierStatementAllocatableSearchParams extends Api.Common.CommonSearchParams {
        carrierId: string
        keyword?: string
      }

      interface CarrierCashAllocationRecord {
        id: string
        tenantId: string
        transactionId: string
        statementId: string
        carrierId: string
        allocatedAmount?: Api.Tms.BasicData.SensitiveNumber
        isActive: boolean
        allocatedAt: string
        allocatedBy?: string | null
        reversedAt?: string | null
        reversedBy?: string | null
        reverseReason?: string | null
        remark?: string | null
        createBy?: string | null
        createTime: string
        updateBy?: string | null
        updateTime: string
        statement?: CarrierStatementRecord | null
      }

      interface CreateCarrierPaymentPayload {
        transactionNo?: string | null
        carrierId: string
        fundAccountId: string
        transactionDate: string
        amount: number
        paymentMethod: CashPaymentMethod
        bankReference?: string | null
        voucherUrls?: string[]
        remark?: string | null
        allocations: CashAllocationInput[]
      }

      interface AllocateCarrierPaymentPayload {
        transactionId: string
        allocations: CashAllocationInput[]
      }

      type CarrierPaymentApplicationStatus =
        'draft' | 'pending_review' | 'approved' | 'rejected' | 'paid' | 'cancelled'

      type CarrierPaymentApplicationFieldKey = 'applicationAmounts' | 'basisEvidence'
      type CarrierPaymentApplicationFieldAccessMap = Partial<
        Record<CarrierPaymentApplicationFieldKey, Api.Tms.BasicData.FieldAccessLevel>
      >

      interface CarrierPaymentApplicationItem {
        id: string
        tenantId?: string
        applicationId: string
        statementId: string
        carrierId: string
        statementNoSnapshot: string
        statementAmountSnapshot?: Api.Tms.BasicData.SensitiveNumber
        outstandingAmountSnapshot?: Api.Tms.BasicData.SensitiveNumber
        appliedAmount?: Api.Tms.BasicData.SensitiveNumber
        remark?: string | null
        createBy?: string | null
        createTime: string
        updateBy?: string | null
        updateTime: string
      }

      interface CarrierPaymentApplicationRecord {
        id: string
        tenantId?: string
        applicationNo: string
        carrierId: string
        carrierName: string
        plannedPaymentDate: string
        amount?: Api.Tms.BasicData.SensitiveNumber
        paymentMethod: CashPaymentMethod
        basisUrls?: string[]
        status: CarrierPaymentApplicationStatus
        paidTransactionId?: string | null
        paidTransactionNo?: string | null
        statementCount: number
        statementNos: string
        submittedAt?: string | null
        submittedBy?: string | null
        reviewedAt?: string | null
        reviewedBy?: string | null
        reviewRemark?: string | null
        paidAt?: string | null
        paidBy?: string | null
        cancelledAt?: string | null
        cancelledBy?: string | null
        cancelReason?: string | null
        remark?: string | null
        createBy?: string | null
        createTime: string
        updateBy?: string | null
        updateTime: string
        fieldAccess?: CarrierPaymentApplicationFieldAccessMap
        isRecordOwner?: boolean
        items?: CarrierPaymentApplicationItem[]
      }

      type CarrierPaymentApplicationSearchParams = Api.Common.CommonSearchParams & {
        carrierId?: string
        status?: string
        plannedPaymentDateRange?: string[]
        keyword?: string
        recordId?: string
      }

      interface SaveCarrierPaymentApplicationPayload {
        applicationNo?: string | null
        id?: string
        carrierId: string
        plannedPaymentDate: string
        amount: number | null
        paymentMethod: CashPaymentMethod
        basisUrls?: string[]
        remark?: string | null
        allocations: CashAllocationInput[]
      }

      interface ExecuteCarrierPaymentApplicationPayload {
        transactionNo?: string | null
        applicationId: string
        fundAccountId: string
        transactionDate: string
        bankReference?: string | null
        voucherUrls?: string[]
      }

      type CashVoucherOcrField =
        'payerName' | 'payeeName' | 'transactionDate' | 'amount' | 'bankReference' | 'paymentMethod'

      interface CashVoucherOcrDraft {
        payerName: string | null
        payeeName: string | null
        transactionDate: string | null
        amount: number | null
        bankReference: string | null
        paymentMethod: CashPaymentMethod
      }

      interface CashVoucherStatementMatch {
        statementId: string
        statementNo: string
        counterpartyId: string
        counterpartyName: string
        periodStart: string
        periodEnd: string
        statementAmount: number
        settledAmount: number
        outstandingAmount: number
        score: number
        confidence: number
        recommendedAllocation: number
        reasons: string[]
      }

      interface CashVoucherOcrAnalyzeRequest {
        action: 'analyze'
        imageUrls: string[]
        direction: CashDirection
      }

      interface CashVoucherOcrAnalyzeResponse {
        artifactId: string
        runId: string
        generatedAt: string
        rawText: string
        summary: string
        confidence: number
        fieldConfidence: Partial<Record<CashVoucherOcrField, number>>
        missingFields: string[]
        warnings: string[]
        voucher: CashVoucherOcrDraft
        matches: CashVoucherStatementMatch[]
        evaluatedStatements: number
        reviewConfidenceThreshold: number
      }

      interface CashVoucherOcrReviewRequest {
        action: 'review'
        artifactId: string
        entityId: string
        outcome: 'applied'
        finalPayload: Record<string, unknown>
        reviewNote?: string
      }

      interface CashVoucherOcrReviewResponse {
        artifactId: string
        status: 'applied'
        acceptedFields: string[]
        correctedFields: string[]
      }

      type BankBatchRowStatus = 'ready' | 'review' | 'duplicate' | 'invalid'

      interface BankBatchMatchRow {
        rowId: string
        sourceRow: number
        status: BankBatchRowStatus
        direction: CashDirection | null
        transactionDate: string | null
        amount: number
        bankReference: string | null
        counterpartyName: string | null
        counterpartyId: string | null
        counterpartyScore: number
        paymentMethod: CashPaymentMethod
        remark: string | null
        statementMatches: CashVoucherStatementMatch[]
        allocations: CashAllocationInput[]
        issues: string[]
      }

      interface BankBatchAnalyzeResponse {
        artifactId: string
        runId: string
        generatedAt: string
        mapping: Record<string, string>
        usedAi: boolean
        confidence: number
        reviewConfidenceThreshold: number
        summary: Record<BankBatchRowStatus, number>
        rows: BankBatchMatchRow[]
      }

      interface BankBatchCommitResponse {
        artifactId: string
        committedCount: number
        transactionIds: string[]
      }

      type InvoiceDirection = 'output' | 'input'
      type InvoiceType = 'vat_special' | 'vat_ordinary' | 'electronic'
      type InvoiceStatus = 'draft' | 'pending_review' | 'issued' | 'certified' | 'voided'
      type InvoiceStatusAction = 'submit' | 'approve' | 'reject' | 'void'

      interface InvoiceStatementLinkInput {
        statementId: string
        linkedAmount: number
      }

      type InvoiceFieldKey = 'invoiceAmounts' | 'taxIdentity' | 'invoiceAttachments'
      type InvoiceFieldAccessMap = Partial<
        Record<InvoiceFieldKey, Api.Tms.BasicData.FieldAccessLevel>
      >
      type InvoiceStatementLinkFieldKey = 'statementAmounts' | 'invoiceAmounts'
      type InvoiceStatementLinkFieldAccessMap = Partial<
        Record<InvoiceStatementLinkFieldKey, Api.Tms.BasicData.FieldAccessLevel>
      >

      interface InvoiceStatementLinkRecord {
        id: string
        tenantId?: string
        invoiceId: string
        direction: InvoiceDirection
        statementId: string
        statementNo: string
        counterpartyId: string
        counterpartyName: string
        periodStart: string
        periodEnd: string
        statementAmount?: Api.Tms.BasicData.SensitiveNumber
        linkedAmount?: Api.Tms.BasicData.SensitiveNumber
        fieldAccess?: InvoiceStatementLinkFieldAccessMap
        createBy?: string | null
        createTime: string
      }

      interface InvoiceRecord {
        id: string
        tenantId: string
        invoiceRecordNo: string
        direction: InvoiceDirection
        invoiceType: InvoiceType
        customerId?: string | null
        carrierId?: string | null
        counterpartyNameSnapshot: string
        invoiceTitle?: string | null
        taxNumber?: string | null
        invoiceCode?: string | null
        invoiceNo?: string | null
        issueDate: string
        taxRate?: Api.Tms.BasicData.SensitiveNumber
        amountExcludingTax?: Api.Tms.BasicData.SensitiveNumber
        taxAmount?: Api.Tms.BasicData.SensitiveNumber
        totalAmount?: Api.Tms.BasicData.SensitiveNumber
        status: InvoiceStatus
        attachments?: Array<Record<string, unknown>>
        statementCount: number
        linkedAmount?: Api.Tms.BasicData.SensitiveNumber
        unlinkedAmount?: Api.Tms.BasicData.SensitiveNumber
        submittedAt?: string | null
        submittedBy?: string | null
        reviewedAt?: string | null
        reviewedBy?: string | null
        reviewRemark?: string | null
        voidedAt?: string | null
        voidedBy?: string | null
        voidReason?: string | null
        remark?: string | null
        createBy?: string | null
        createTime: string
        updateBy?: string | null
        updateTime: string
        statementLinks?: InvoiceStatementLinkRecord[]
        fieldAccess?: InvoiceFieldAccessMap
        isRecordOwner?: boolean
      }

      interface InvoiceDuplicateRecord {
        id: string
        invoiceRecordNo: string
        direction: InvoiceDirection
        invoiceNo: string
        status: InvoiceStatus
        counterpartyNameSnapshot: string
        issueDate: string
        totalAmount?: Api.Tms.BasicData.SensitiveNumber
      }

      type InvoiceSearchParams = Api.Common.CommonSearchParams & {
        direction?: string
        status?: string
        invoiceType?: string
        customerId?: string
        carrierId?: string
        recordId?: string
        issueDateRange?: string[]
        keyword?: string
      }

      interface InvoiceableStatement {
        direction: InvoiceDirection
        statementId: string
        tenantId?: string
        statementNo: string
        counterpartyId: string
        counterpartyName: string
        periodStart: string
        periodEnd: string
        status: CustomerStatementStatus
        statementAmount: number
        invoicedAmount: number
        uninvoicedAmount: number
        fieldAccess?: CustomerStatementFieldAccessMap | CarrierStatementFieldAccessMap
      }

      interface InvoiceableStatementSearchParams extends Api.Common.CommonSearchParams {
        direction: InvoiceDirection
        counterpartyId: string
        keyword?: string
        includeFullyInvoiced?: boolean
      }

      interface SaveInvoicePayload {
        invoiceRecordNo?: string | null
        id?: string | null
        direction: InvoiceDirection
        invoiceType: InvoiceType
        customerId?: string | null
        carrierId?: string | null
        invoiceTitle?: string | null
        taxNumber?: string | null
        invoiceCode?: string | null
        invoiceNo?: string | null
        issueDate: string
        taxRate: number
        amountExcludingTax: number
        taxAmount: number
        totalAmount: number
        attachments?: Array<Record<string, unknown>>
        remark?: string | null
        statementLinks: InvoiceStatementLinkInput[]
      }

      interface InvoiceStatusPayload {
        id: string
        action: InvoiceStatusAction
        remark?: string | null
      }

      type InvoiceComplianceSignalType =
        | 'amount_formula_mismatch'
        | 'counterparty_mismatch'
        | 'duplicate_invoice_number'
        | 'future_issue_date'
        | 'incomplete_statement_coverage'
        | 'missing_attachment'
        | 'missing_invoice_identity'
        | 'missing_tax_identity'
        | 'statement_amount_mismatch'
        | 'tax_calculation_mismatch'
      type InvoiceComplianceSeverity = 'critical' | 'high' | 'medium'
      type InvoiceComplianceRiskLevel = InvoiceComplianceSeverity | 'low'
      type InvoiceComplianceRecommendation =
        'block_for_verification' | 'manual_review' | 'routine_review'

      interface InvoiceComplianceSignal {
        type: InvoiceComplianceSignalType
        severity: InvoiceComplianceSeverity
        title: string
        detail: string
        evidence: string[]
      }

      interface InvoiceComplianceAssessment {
        invoiceId: string
        invoiceRecordNo: string
        invoiceNo: string
        counterpartyName: string
        direction: string
        riskLevel: InvoiceComplianceRiskLevel
        riskScore: number
        confidence: number
        recommendation: InvoiceComplianceRecommendation
        summary: string
        signals: InvoiceComplianceSignal[]
        recommendedActions: string[]
        limitations: string[]
        metrics: {
          totalAmount: number
          calculatedTotalAmount: number
          linkedAmount: number
          unlinkedAmount: number
          statementCount: number
          duplicateCount: number
          attachmentCount: number
          coverageRate: number
          taxRate: number
        }
      }

      interface InvoiceComplianceAuditResponse {
        runId: string
        ruleVersion: string
        generatedAt: string
        assessment: InvoiceComplianceAssessment
      }

      type InvoiceOcrField =
        | 'invoiceType'
        | 'invoiceTitle'
        | 'taxNumber'
        | 'invoiceCode'
        | 'invoiceNo'
        | 'issueDate'
        | 'taxRate'
        | 'amountExcludingTax'
        | 'taxAmount'
        | 'totalAmount'
        | 'buyerName'
        | 'buyerTaxNumber'
        | 'sellerName'
        | 'sellerTaxNumber'

      interface InvoiceOcrDraft {
        invoiceType?: InvoiceType | null
        invoiceTitle?: string | null
        taxNumber?: string | null
        invoiceCode?: string | null
        invoiceNo?: string | null
        issueDate?: string | null
        taxRate?: number | null
        amountExcludingTax?: number | null
        taxAmount?: number | null
        totalAmount?: number | null
        buyerName?: string | null
        buyerTaxNumber?: string | null
        sellerName?: string | null
        sellerTaxNumber?: string | null
      }

      interface InvoiceOcrAnalyzeRequest {
        action?: 'analyze'
        imageUrls: string[]
        direction: InvoiceDirection
      }

      interface InvoiceOcrAnalyzeResponse {
        runId: string
        artifactId: string
        generatedAt: string
        rawText: string
        summary: string
        confidence: number
        fieldConfidence: Partial<Record<InvoiceOcrField, number>>
        missingFields: string[]
        warnings: string[]
        invoice: InvoiceOcrDraft
      }

      type InvoiceCounterpartyResolutionStatus =
        'matched' | 'unmatched' | 'ambiguous' | 'conflict' | 'disabled' | 'invalid'

      interface InvoiceCounterpartyOption {
        id: string
        partyName: string
        partyCode?: string | null
        taxNo?: string | null
        enabled: boolean
      }

      interface InvoiceCounterpartyResolution {
        status: InvoiceCounterpartyResolutionStatus
        direction: InvoiceDirection
        partyKind: 'customer' | 'carrier'
        name?: string | null
        taxNo?: string | null
        confidence: number
        matchMethod?: 'tax_no' | 'name' | null
        canCreate: boolean
        requiresReview: boolean
        message: string
        party?: InvoiceCounterpartyOption | null
      }

      interface CreateInvoiceCounterpartyFromOcrPayload {
        artifactId: string
        name: string
        taxNo?: string | null
        carrierType?: string | null
      }

      interface CreateInvoiceCounterpartyFromOcrResponse {
        created: boolean
        direction: InvoiceDirection
        party: InvoiceCounterpartyOption
      }

      interface InvoiceOcrReviewRequest {
        action: 'review'
        artifactId: string
        entityId: string
        outcome: 'applied'
        finalPayload: Record<string, unknown>
        reviewNote?: string
      }

      interface InvoiceOcrReviewResponse {
        artifactId: string
        status: 'applied'
        acceptedFields: string[]
        correctedFields: string[]
      }

      type FinanceWorkbenchFieldKey =
        | 'customerSettlementAmounts'
        | 'carrierSettlementAmounts'
        | 'cashFlowAmounts'
        | 'invoiceAmounts'
        | 'paymentApplicationAmounts'
        | 'operatingAmounts'

      type FinanceWorkbenchFieldAccessMap = Partial<
        Record<FinanceWorkbenchFieldKey, Api.Tms.BasicData.FieldAccessLevel>
      >

      interface FinanceWorkbenchStats {
        customerReceivableBalance?: Api.Tms.BasicData.SensitiveNumber
        carrierPayableBalance?: Api.Tms.BasicData.SensitiveNumber
        monthReceiptAmount?: Api.Tms.BasicData.SensitiveNumber
        monthPaymentAmount?: Api.Tms.BasicData.SensitiveNumber
        monthRevenueAmount?: Api.Tms.BasicData.SensitiveNumber
        monthCostAmount?: Api.Tms.BasicData.SensitiveNumber
        monthGrossProfit?: Api.Tms.BasicData.SensitiveNumber
        receiptCompletionRate?: Api.Tms.BasicData.SensitiveNumber
        paymentCompletionRate?: Api.Tms.BasicData.SensitiveNumber
        invoiceMatchRate?: Api.Tms.BasicData.SensitiveNumber
        costApprovalRate?: Api.Tms.BasicData.SensitiveNumber
        pendingCustomerStatementCount: number
        pendingCustomerStatementAmount?: Api.Tms.BasicData.SensitiveNumber
        pendingCarrierStatementCount: number
        pendingCarrierStatementAmount?: Api.Tms.BasicData.SensitiveNumber
        pendingCostCount: number
        pendingCostAmount?: Api.Tms.BasicData.SensitiveNumber
        unallocatedReceiptCount: number
        unallocatedReceiptAmount?: Api.Tms.BasicData.SensitiveNumber
        unallocatedPaymentCount: number
        unallocatedPaymentAmount?: Api.Tms.BasicData.SensitiveNumber
        draftInvoiceCount: number
        draftInvoiceAmount?: Api.Tms.BasicData.SensitiveNumber
        pendingInvoiceCount: number
        pendingInvoiceAmount?: Api.Tms.BasicData.SensitiveNumber
        pendingPaymentApplicationCount: number
        pendingPaymentApplicationAmount?: Api.Tms.BasicData.SensitiveNumber
        approvedUnpaidPaymentCount: number
        approvedUnpaidPaymentAmount?: Api.Tms.BasicData.SensitiveNumber
        unapprovedPaymentCount: number
        unapprovedPaymentAmount?: Api.Tms.BasicData.SensitiveNumber
        overdueReceivableCount: number
        overdueReceivableAmount?: Api.Tms.BasicData.SensitiveNumber
        uninvoicedReceivableCount: number
        uninvoicedReceivableAmount?: Api.Tms.BasicData.SensitiveNumber
        fieldAccess?: FinanceWorkbenchFieldAccessMap
      }

      type ReceivablesRiskLevel = 'critical' | 'high' | 'medium' | 'low'
      type ReceivablesSignalSeverity = 'critical' | 'high' | 'medium'
      type ReceivablesRecommendation =
        'unblock_settlement' | 'complete_invoicing' | 'prioritize_collection' | 'routine_monitoring'

      interface ReceivablesRiskSignal {
        type: string
        severity: ReceivablesSignalSeverity
        title: string
        detail: string
        evidence: string[]
      }

      interface ReceivablesPriorityStatement {
        id: string
        statementNo: string
        customerId: string
        customerName: string
        periodStart: string
        periodEnd: string
        status: string
        ageDays: number
        statementAmount: number
        settledAmount: number
        outstandingAmount: number
        uninvoicedAmount: number
        riskScore: number
        reasons: string[]
      }

      interface ReceivablesRiskCustomer {
        customerId: string
        customerName: string
        statementCount: number
        outstandingAmount: number
        maxAgeDays: number
        riskScore: number
        statementNos: string[]
      }

      interface ReceivablesCollectionAssessment {
        riskLevel: ReceivablesRiskLevel
        riskScore: number
        confidence: number
        recommendation: ReceivablesRecommendation
        summary: string
        signals: ReceivablesRiskSignal[]
        priorityStatements: ReceivablesPriorityStatement[]
        riskCustomers: ReceivablesRiskCustomer[]
        recommendedActions: string[]
        limitations: string[]
        metrics: {
          totalStatementCount: number
          openStatementCount: number
          statementAmount: number
          settledAmount: number
          outstandingAmount: number
          collectionRate: number
          aging30Amount: number
          aging60Amount: number
          aging90Amount: number
          uninvoicedAmount: number
          reviewBlockedAmount: number
          atRiskAmount: number
        }
      }

      interface ReceivablesCollectionResponse {
        runId: string
        ruleVersion: string
        generatedAt: string
        assessment: ReceivablesCollectionAssessment
      }

      interface LedgerReportParams {
        accountSetId: string
        fiscalYear: number
        periodFrom?: number
        periodTo?: number
        subjectId?: string | null
      }

      interface SubjectBalanceReportParams extends LedgerReportParams {
        hideZero?: boolean
      }

      type LedgerFieldKey = 'ledgerAmounts' | 'voucherReferences' | 'auxiliaryDetails'
      type LedgerFieldAccessMap = Partial<Record<LedgerFieldKey, Api.Common.FieldAccessLevel>>
      type ProtectedBalanceDirection = BalanceDirection | '***' | null

      interface SubjectBalanceReportRecord {
        subjectId: string
        parentId?: string | null
        subjectCode: string
        subjectName: string
        category: SubjectCategory
        balanceDirection: BalanceDirection
        subjectLevel: number
        isLeaf: boolean
        openingDebit?: Api.Tms.BasicData.SensitiveNumber
        openingCredit?: Api.Tms.BasicData.SensitiveNumber
        periodDebit?: Api.Tms.BasicData.SensitiveNumber
        periodCredit?: Api.Tms.BasicData.SensitiveNumber
        yearToDateDebit?: Api.Tms.BasicData.SensitiveNumber
        yearToDateCredit?: Api.Tms.BasicData.SensitiveNumber
        endingDebit?: Api.Tms.BasicData.SensitiveNumber
        endingCredit?: Api.Tms.BasicData.SensitiveNumber
        endingDirection?: ProtectedBalanceDirection
        endingBalance?: Api.Tms.BasicData.SensitiveNumber
      }

      interface GeneralLedgerReportRecord {
        periodNo: number
        periodStart?: string | null
        periodEnd?: string | null
        openingDirection?: ProtectedBalanceDirection
        openingBalance?: Api.Tms.BasicData.SensitiveNumber
        debitAmount?: Api.Tms.BasicData.SensitiveNumber
        creditAmount?: Api.Tms.BasicData.SensitiveNumber
        yearToDateDebit?: Api.Tms.BasicData.SensitiveNumber
        yearToDateCredit?: Api.Tms.BasicData.SensitiveNumber
        endingDirection?: ProtectedBalanceDirection
        endingBalance?: Api.Tms.BasicData.SensitiveNumber
        voucherCount?: Api.Tms.BasicData.SensitiveNumber
        lineCount?: Api.Tms.BasicData.SensitiveNumber
      }

      interface SubsidiaryLedgerReportParams extends LedgerReportParams {
        subjectId: string
        auxiliaryTypeId?: string | null
        auxiliaryItemId?: string | null
      }

      interface SubsidiaryLedgerReportRecord {
        rowType: 'opening' | 'transaction'
        voucherLineId?: string | null
        voucherId?: string | null
        voucherDate?: string | null
        periodNo: number
        voucherNo?: string | null
        voucherType?: VoucherType | null
        subjectCode?: string | null
        subjectName?: string | null
        summary?: string | null
        auxiliaryDisplay?: string | null
        currencyCode?: string | null
        originalAmount?: Api.Tms.BasicData.SensitiveNumber
        quantity?: Api.Tms.BasicData.SensitiveNumber
        unitName?: string | null
        debitAmount?: Api.Tms.BasicData.SensitiveNumber
        creditAmount?: Api.Tms.BasicData.SensitiveNumber
        balanceDirection?: ProtectedBalanceDirection
        balanceAmount?: Api.Tms.BasicData.SensitiveNumber
      }

      type CommercialBillDirection = 'receivable' | 'payable'
      type CommercialBillType = 'bank_acceptance' | 'commercial_acceptance' | 'digital'
      type CommercialBillStatus =
        'draft' | 'held' | 'endorsed' | 'discounted' | 'settled' | 'cancelled'
      type CommercialBillEventType =
        'received' | 'issued' | 'endorsed' | 'discounted' | 'settled' | 'cancelled'
      type CommercialBillAction = 'receive' | 'issue' | 'endorse' | 'discount' | 'settle' | 'cancel'
      type CommercialBillFieldKey = 'billParties' | 'billAmounts' | 'billReferences'
      type CommercialBillFieldAccessMap = Partial<
        Record<CommercialBillFieldKey, Api.Common.FieldAccessLevel>
      >

      interface CommercialBillRecord {
        id: string
        tenantId: string
        accountSetId: string
        billNo: string
        externalBillNo?: string | null
        direction: CommercialBillDirection
        billType: CommercialBillType
        status: CommercialBillStatus
        drawerName?: string
        payeeName?: string
        acceptorName?: string
        counterpartyName?: string | null
        issueDate: string
        dueDate: string
        faceAmount?: Api.Tms.BasicData.SensitiveNumber
        settledAmount?: Api.Tms.BasicData.SensitiveNumber
        currencyCode: string
        transferable: boolean
        sourceType?: string | null
        sourceId?: string | null
        sourceNo?: string | null
        attachmentIds?: string[]
        remark?: string | null
        version: number
        createBy?: string | null
        createTime: string
        updateBy?: string | null
        updateTime: string
        fieldAccess?: CommercialBillFieldAccessMap
        isRecordOwner?: boolean
      }

      interface CommercialBillEventRecord {
        id: string
        tenantId: string
        accountSetId: string
        billId: string
        eventType: CommercialBillEventType
        eventDate: string
        amount?: Api.Tms.BasicData.SensitiveNumber
        counterpartyName?: string | null
        fundAccountId?: string | null
        referenceNo?: string | null
        voucherId?: string | null
        remark?: string | null
        createBy?: string | null
        createTime: string
      }

      type CommercialBillSearchParams = Api.Common.CommonSearchParams & {
        accountSetId?: string
        direction?: CommercialBillDirection | ''
        billType?: CommercialBillType | ''
        status?: CommercialBillStatus | ''
        dueDateRange?: string[]
        keyword?: string
      }

      interface SaveCommercialBillPayload {
        id?: string
        accountSetId: string
        billNo: string
        externalBillNo?: string | null
        direction: CommercialBillDirection
        billType: CommercialBillType
        drawerName?: string
        payeeName?: string
        acceptorName?: string
        counterpartyName?: string | null
        issueDate: string
        dueDate: string
        faceAmount?: number
        currencyCode: string
        transferable: boolean
        sourceType?: string | null
        sourceId?: string | null
        sourceNo?: string | null
        attachmentIds?: string[]
        remark?: string | null
      }

      interface CommercialBillSummary {
        totalCount: number
        activeCount: number
        receivableOutstanding?: Api.Tms.BasicData.SensitiveNumber | null
        payableOutstanding?: Api.Tms.BasicData.SensitiveNumber | null
        dueWithin30Days: number
        overdueCount: number
        fieldAccess?: CommercialBillFieldAccessMap
      }

      type FixedAssetStatus = 'draft' | 'active' | 'suspended' | 'disposed'
      type FixedAssetAction = 'activate' | 'suspend' | 'resume' | 'dispose'
      type DepreciationMethod = 'straight_line'
      type AssetDepreciationRunStatus = 'draft' | 'calculated' | 'posted' | 'cancelled'
      type FixedAssetFieldKey = 'assetValues' | 'assetCustody' | 'assetReferences'
      type FixedAssetFieldAccessMap = Partial<
        Record<FixedAssetFieldKey, Api.Common.FieldAccessLevel>
      >

      interface AssetCategoryRecord {
        id: string
        tenantId: string
        accountSetId: string
        categoryCode: string
        categoryName: string
        depreciationMethod: DepreciationMethod
        defaultUsefulLifeMonths: number
        defaultResidualRate: number
        assetSubjectId?: string | null
        accumulatedDepreciationSubjectId?: string | null
        depreciationExpenseSubjectId?: string | null
        disposalSubjectId?: string | null
        isEnabled: boolean
        sort: number
        remark?: string | null
        createTime: string
        updateTime: string
      }

      interface FixedAssetRecord {
        id: string
        tenantId: string
        accountSetId: string
        categoryId: string
        assetNo: string
        assetName: string
        status: FixedAssetStatus
        acquisitionDate: string
        readyForUseDate: string
        depreciationStartDate: string
        originalValue?: Api.Tms.BasicData.SensitiveNumber
        residualValue?: Api.Tms.BasicData.SensitiveNumber
        usefulLifeMonths: number
        depreciatedMonths: number
        accumulatedDepreciation?: Api.Tms.BasicData.SensitiveNumber
        impairmentAmount?: Api.Tms.BasicData.SensitiveNumber
        departmentId?: string | null
        employeeId?: string | null
        location?: string | null
        specification?: string | null
        serialNo?: string | null
        sourceType?: string | null
        sourceId?: string | null
        sourceNo?: string | null
        disposalDate?: string | null
        disposalAmount?: Api.Tms.BasicData.SensitiveNumber
        disposalReason?: string | null
        remark?: string | null
        version: number
        createTime: string
        updateTime: string
        category?: Pick<AssetCategoryRecord, 'id' | 'categoryCode' | 'categoryName'> | null
        fieldAccess?: FixedAssetFieldAccessMap
        isRecordOwner?: boolean
      }

      interface SaveAssetCategoryPayload {
        id?: string
        accountSetId: string
        categoryCode: string
        categoryName: string
        depreciationMethod: DepreciationMethod
        defaultUsefulLifeMonths: number
        defaultResidualRate: number
        assetSubjectId?: string | null
        accumulatedDepreciationSubjectId?: string | null
        depreciationExpenseSubjectId?: string | null
        disposalSubjectId?: string | null
        isEnabled: boolean
        sort: number
        remark?: string | null
      }

      interface SaveFixedAssetPayload {
        id?: string
        accountSetId: string
        categoryId: string
        assetNo: string
        assetName: string
        acquisitionDate: string
        readyForUseDate: string
        depreciationStartDate: string
        originalValue?: number
        residualValue?: number
        usefulLifeMonths: number
        departmentId?: string | null
        employeeId?: string | null
        location?: string | null
        specification?: string | null
        serialNo?: string | null
        sourceType?: string | null
        sourceId?: string | null
        sourceNo?: string | null
        remark?: string | null
      }

      type FixedAssetSearchParams = Api.Common.CommonSearchParams & {
        accountSetId?: string
        categoryId?: string
        status?: FixedAssetStatus | ''
        keyword?: string
      }

      interface AssetDepreciationRunRecord {
        id: string
        tenantId: string
        accountSetId: string
        accountingPeriodId: string
        runNo: string
        status: AssetDepreciationRunStatus
        assetCount: number
        totalAmount?: Api.Tms.BasicData.SensitiveNumber
        voucherId?: string | null
        calculatedAt?: string | null
        postedAt?: string | null
        remark?: string | null
        createTime: string
        period?: AccountingPeriodRecord | null
        fieldAccess?: FixedAssetFieldAccessMap
        isRecordOwner?: boolean
      }

      interface AssetDepreciationLineRecord {
        id: string
        runId: string
        assetId: string
        openingAccumulatedDepreciation?: Api.Tms.BasicData.SensitiveNumber
        depreciationAmount?: Api.Tms.BasicData.SensitiveNumber
        closingAccumulatedDepreciation?: Api.Tms.BasicData.SensitiveNumber
        asset?: Pick<FixedAssetRecord, 'id' | 'assetNo' | 'assetName'> | null
        fieldAccess?: FixedAssetFieldAccessMap
        isRecordOwner?: boolean
      }

      interface FixedAssetSummary {
        categoryCount: number
        assetCount: number
        activeCount: number
        originalValue?: Api.Tms.BasicData.SensitiveNumber | null
        netValue?: Api.Tms.BasicData.SensitiveNumber | null
        periodDepreciation?: Api.Tms.BasicData.SensitiveNumber | null
        fieldAccess?: FixedAssetFieldAccessMap
      }

      type PayrollRunStatus = 'draft' | 'calculated' | 'approved' | 'paid' | 'cancelled'
      type PayrollRunAction = 'approve' | 'pay' | 'cancel'
      type PayrollFieldKey = 'employeeIdentity' | 'salaryAmounts' | 'payrollReferences'
      type PayrollFieldAccessMap = Partial<Record<PayrollFieldKey, Api.Common.FieldAccessLevel>>
      type PayrollAmountItems = Record<string, number> | string | null

      interface PayrollRunRecord {
        id: string
        tenantId: string
        accountSetId: string
        accountingPeriodId: string
        runNo: string
        payrollMonth: string
        status: PayrollRunStatus
        employeeCount?: Api.Tms.BasicData.SensitiveNumber
        grossAmount?: Api.Tms.BasicData.SensitiveNumber
        deductionAmount?: Api.Tms.BasicData.SensitiveNumber
        employerCostAmount?: Api.Tms.BasicData.SensitiveNumber
        netAmount?: Api.Tms.BasicData.SensitiveNumber
        salaryExpenseSubjectId?: string | null
        salaryPayableSubjectId?: string | null
        taxPayableSubjectId?: string | null
        socialSecurityPayableSubjectId?: string | null
        voucherId?: string | null
        calculatedAt?: string | null
        approvedAt?: string | null
        approvedBy?: string | null
        paidAt?: string | null
        remark?: string | null
        createTime: string
        period?: AccountingPeriodRecord | null
        fieldAccess?: PayrollFieldAccessMap
        isRecordOwner?: boolean
      }

      interface PayrollLineRecord {
        id: string
        runId: string
        employeeId?: string
        employeeNoSnapshot?: string
        employeeNameSnapshot?: string
        departmentNameSnapshot?: string | null
        earningItems?: PayrollAmountItems
        deductionItems?: PayrollAmountItems
        employerCostItems?: PayrollAmountItems
        grossAmount?: Api.Tms.BasicData.SensitiveNumber
        deductionAmount?: Api.Tms.BasicData.SensitiveNumber
        employerCostAmount?: Api.Tms.BasicData.SensitiveNumber
        netAmount?: Api.Tms.BasicData.SensitiveNumber
        remark?: string | null
        createTime: string
        fieldAccess?: PayrollFieldAccessMap
        isRecordOwner?: boolean
      }

      interface PayrollEmployeeOption {
        id: string
        employeeNo: string
        employeeName: string
      }

      interface SavePayrollRunPayload {
        id?: string
        accountingPeriodId: string
        salaryExpenseSubjectId?: string | null
        salaryPayableSubjectId?: string | null
        taxPayableSubjectId?: string | null
        socialSecurityPayableSubjectId?: string | null
        remark?: string | null
      }

      interface SavePayrollLinePayload {
        employeeId: string
        earningItems: Record<string, number>
        deductionItems: Record<string, number>
        employerCostItems: Record<string, number>
        grossAmount: number
        deductionAmount: number
        employerCostAmount: number
        remark?: string | null
      }

      type PayrollRunSearchParams = Api.Common.CommonSearchParams & {
        accountSetId?: string
        status?: PayrollRunStatus | ''
      }

      interface PayrollSummary {
        runCount: number
        employeeCount?: Api.Tms.BasicData.SensitiveNumber | null
        grossAmount?: Api.Tms.BasicData.SensitiveNumber | null
        netAmount?: Api.Tms.BasicData.SensitiveNumber | null
        pendingCount: number
        fieldAccess?: PayrollFieldAccessMap
      }

      type TaxType = 'vat' | 'surcharge' | 'corporate_income_tax' | 'stamp_duty' | 'other'
      type TaxPeriodStatus = 'draft' | 'calculated' | 'reviewed' | 'filed' | 'paid' | 'cancelled'
      type TaxLedgerDirection = 'output' | 'input' | 'adjustment'
      type TaxPeriodAction = 'review' | 'file' | 'pay' | 'cancel'
      type TaxFieldKey = 'taxAmounts' | 'taxSources' | 'filingReferences'
      type TaxFieldAccessMap = Partial<Record<TaxFieldKey, Api.Common.FieldAccessLevel>>

      interface TaxPeriodRecord {
        id: string
        tenantId: string
        accountSetId: string
        accountingPeriodId: string
        taxType: TaxType
        status: TaxPeriodStatus
        outputTaxAmount?: Api.Tms.BasicData.SensitiveNumber
        inputTaxAmount?: Api.Tms.BasicData.SensitiveNumber
        transferableInputAmount?: Api.Tms.BasicData.SensitiveNumber
        adjustmentAmount?: Api.Tms.BasicData.SensitiveNumber
        payableAmount?: Api.Tms.BasicData.SensitiveNumber
        filingReference?: string | null
        filedAt?: string | null
        filedBy?: string | null
        paidAt?: string | null
        remark?: string | null
        createTime: string
        period?: AccountingPeriodRecord | null
        fieldAccess?: TaxFieldAccessMap
        isRecordOwner?: boolean
      }

      interface TaxLedgerLineRecord {
        id: string
        taxPeriodId: string
        sourceType?: string
        sourceId?: string | null
        sourceNo?: string | null
        occurredOn: string
        direction: TaxLedgerDirection
        taxableAmount?: Api.Tms.BasicData.SensitiveNumber
        taxRate?: Api.Tms.BasicData.SensitiveNumber | null
        taxAmount?: Api.Tms.BasicData.SensitiveNumber
        isDeductible: boolean
        remark?: string | null
        createTime: string
        fieldAccess?: TaxFieldAccessMap
        isRecordOwner?: boolean
      }

      interface SaveTaxPeriodPayload {
        id?: string
        accountingPeriodId: string
        taxType: TaxType
        transferableInputAmount?: number
        adjustmentAmount?: number
        remark?: string | null
      }

      interface SaveTaxLedgerLinePayload {
        id?: string
        sourceType: string
        sourceId?: string | null
        sourceNo?: string | null
        occurredOn: string
        direction: TaxLedgerDirection
        taxableAmount: number
        taxRate?: number | null
        taxAmount: number
        isDeductible: boolean
        remark?: string | null
      }

      type TaxPeriodSearchParams = Api.Common.CommonSearchParams & {
        accountSetId?: string
        taxType?: TaxType | ''
        status?: TaxPeriodStatus | ''
      }

      interface TaxSummary {
        periodCount: number
        outputTaxAmount?: Api.Tms.BasicData.SensitiveNumber | null
        inputTaxAmount?: Api.Tms.BasicData.SensitiveNumber | null
        payableAmount?: Api.Tms.BasicData.SensitiveNumber | null
        pendingCount: number
        fieldAccess?: TaxFieldAccessMap
      }

      type PeriodCloseRunStatus = 'checking' | 'ready' | 'closed' | 'cancelled'
      type PeriodCloseCheckStatus = 'passed' | 'warning' | 'blocked'
      type PeriodCloseAction = 'close' | 'cancel' | 'reopen'
      type PeriodCloseFieldKey = 'closeDiagnostics' | 'voucherReferences' | 'closeAudit'
      type PeriodCloseFieldAccessMap = Partial<
        Record<PeriodCloseFieldKey, Api.Common.FieldAccessLevel>
      >

      interface PeriodCloseRunRecord {
        id: string
        tenantId: string
        accountSetId: string
        accountingPeriodId: string
        runNo: string
        status: PeriodCloseRunStatus
        passedCount?: Api.Tms.BasicData.SensitiveNumber
        warningCount?: Api.Tms.BasicData.SensitiveNumber
        blockingCount?: Api.Tms.BasicData.SensitiveNumber
        profitLossVoucherId?: string | null
        yearEndVoucherId?: string | null
        completedAt?: string | null
        completedBy?: string | null
        cancelledAt?: string | null
        cancelledBy?: string | null
        cancelReason?: string | null
        createTime: string
        period?: AccountingPeriodRecord | null
        fieldAccess?: PeriodCloseFieldAccessMap
        isRecordOwner?: boolean
      }

      interface PeriodCloseCheckRecord {
        id: string
        closeRunId: string
        checkCode: string
        checkName: string
        status?: PeriodCloseCheckStatus | string
        isBlocking?: boolean | string
        issueCount?: Api.Tms.BasicData.SensitiveNumber
        summary?: string
        detail?: Record<string, unknown> | string
        checkedAt: string
        fieldAccess?: PeriodCloseFieldAccessMap
        isRecordOwner?: boolean
      }

      type PeriodCloseSearchParams = Api.Common.CommonSearchParams & {
        accountSetId?: string
        status?: PeriodCloseRunStatus | ''
      }

      interface PeriodCloseSummary {
        periodCount: number
        closedCount: number
        checkingCount?: Api.Tms.BasicData.SensitiveNumber | null
        blockingCount?: Api.Tms.BasicData.SensitiveNumber | null
        latestCompletedAt?: string | null
        fieldAccess?: PeriodCloseFieldAccessMap
      }

      type FinancialStatementType = 'balance_sheet' | 'income_statement' | 'cash_flow_statement'
      type FinancialStatementMappingDirection = 'debit' | 'credit' | 'net_debit' | 'net_credit'
      type FinancialStatementDisplayStyle = 'normal' | 'subtotal' | 'total'
      type FinancialStatementCalculationMethod = 'mapping' | 'formula' | 'label'
      type CashFlowDirection = 'receipt' | 'payment'
      type FinancialReportFieldKey = 'reportAmounts' | 'reportRules'
      type FinancialReportFieldAccessMap = Partial<
        Record<FinancialReportFieldKey, Api.Common.FieldAccessLevel>
      >

      interface FinancialStatementMappingRecord {
        id?: string
        tenantId?: string
        accountSetId?: string
        statementItemId?: string
        subjectId: string
        mappingDirection: FinancialStatementMappingDirection
        factor: number
        remark?: string | null
        createTime?: string
        updateTime?: string
        subject?: Pick<SubjectRecord, 'id' | 'subjectCode' | 'subjectName' | 'category'> | null
      }

      interface FinancialStatementFormulaRecord {
        id?: string
        tenantId?: string
        accountSetId?: string
        targetItemId?: string
        sourceItemId: string
        factor: number
        createTime?: string
        updateTime?: string
        sourceItem?: Pick<
          FinancialStatementItemRecord,
          'id' | 'itemCode' | 'itemName' | 'lineNo'
        > | null
      }

      interface FinancialStatementItemRecord {
        id: string
        tenantId?: string
        accountSetId: string
        statementType: FinancialStatementType
        parentId?: string | null
        itemCode: string
        itemName: string
        lineNo: number
        itemLevel: number
        displayStyle: FinancialStatementDisplayStyle
        calculationMethod: FinancialStatementCalculationMethod
        cashFlowDirection?: CashFlowDirection | null
        isEnabled: boolean
        remark?: string | null
        createBy?: string | null
        createTime: string
        updateBy?: string | null
        updateTime: string
        ruleCount?: Api.Tms.BasicData.SensitiveNumber
        mappings?: FinancialStatementMappingRecord[]
        formulas?: FinancialStatementFormulaRecord[]
        fieldAccess?: FinancialReportFieldAccessMap
        isRecordOwner?: boolean
      }

      interface SaveFinancialStatementItemPayload {
        id?: string
        accountSetId: string
        statementType: FinancialStatementType
        parentId?: string | null
        itemCode: string
        itemName: string
        lineNo: number
        itemLevel: number
        displayStyle: FinancialStatementDisplayStyle
        calculationMethod: FinancialStatementCalculationMethod
        cashFlowDirection?: CashFlowDirection | null
        isEnabled: boolean
        remark?: string | null
      }

      interface FinancialStatementReportParams {
        accountSetId: string
        statementType: FinancialStatementType
        fiscalYear: number
        periodFrom?: number
        periodTo?: number
      }

      interface FinancialStatementReportRecord {
        itemId: string
        parentId?: string | null
        itemCode: string
        itemName: string
        lineNo: number
        itemLevel: number
        displayStyle: FinancialStatementDisplayStyle
        calculationMethod: FinancialStatementCalculationMethod
        isLeaf: boolean
        primaryAmount?: Api.Tms.BasicData.SensitiveNumber
        secondaryAmount?: Api.Tms.BasicData.SensitiveNumber
        mappingCount?: Api.Tms.BasicData.SensitiveNumber
        fieldAccess?: FinancialReportFieldAccessMap
        isRecordOwner?: boolean
      }

      interface CashFlowAllocationRecord {
        id: string
        tenantId?: string
        accountSetId: string
        voucherLineId: string
        statementItemId: string
        flowDirection: CashFlowDirection
        amount?: Api.Tms.BasicData.SensitiveNumber
        remark?: string | null
        createTime: string
        updateTime: string
        statementItem?: Pick<
          FinancialStatementItemRecord,
          'id' | 'itemCode' | 'itemName' | 'cashFlowDirection'
        > | null
        fieldAccess?: VoucherFieldAccessMap
        isRecordOwner?: boolean
      }

      interface SaveCashFlowAllocationPayload {
        voucherLineId: string
        statementItemId: string
        amount: number
        remark?: string | null
      }

      interface VoucherCashFlowAllocationDraft {
        voucherLineNo: number
        statementItemId: string
        amount: number
        remark?: string | null
      }
    }
  }
}
