<div align="center">
  <h1>Art Supabase FMS</h1>
  <p><strong>面向运输与企业经营的一体化财务管理应用</strong></p>
  <p>把业务结算、资金收付、会计核算、票税资产与经营分析连接成可追溯的财务闭环。</p>

  <p>
    <a href="https://gitee.com/wangyanghub/art-supabase-fms">Gitee</a>
    ·
    <a href="https://github.com/869123771/art-supabase-fms">GitHub</a>
    ·
    <a href="https://gitee.com/wangyanghub/art-supabase-pro">主平台</a>
    ·
    <a href="https://869123771.github.io/art-supabase-doc/modules/fms">使用文档</a>
  </p>
</div>

## 项目定位

Art Supabase FMS 是 Art Supabase Pro 的财务管理业务应用。它不是孤立的财务页面集合，而是以运输单据和企业经营活动为来源，覆盖结算、资金、核算、报表与高风险反向操作治理。

本仓只维护 FMS 页面、业务 API、领域类型与适配代码。登录、租户、菜单、权限、布局、路由、公共组件、Store 和 Supabase 公共客户端由 [`art-supabase-pro`](https://gitee.com/wangyanghub/art-supabase-pro) 统一提供。

![运输财务工作台](screenshots/finance-workbench.png)

## 核心能力

| 领域     | 已覆盖能力                                                                 |
| -------- | -------------------------------------------------------------------------- |
| 运输财务 | 客户/承运商对账、应收账龄、收付款、发票、运单费用、利润分析                |
| 资金管理 | 资金账户、资金日记账、账户调拨、现金预测、银行对账、付款申请               |
| 会计核算 | 账套与期间、科目、辅助核算、币种汇率、期初余额、凭证、自动入账、账簿与报表 |
| 专项财务 | 费用报销、商业票据、税务、固定资产、薪资、期末结账与异常中心               |
| 智能辅助 | 发票/票据 OCR、费用识别、合规复核、回款风险建议与核算准备检查              |

## 业务闭环

```text
运输与经营单据
  → 对账 / 应收应付 / 费用
  → 收付款 / 核销 / 发票
  → 凭证草稿 / 审核 / 过账
  → 账簿 / 报表 / 期末结账
  → 经营分析与异常治理
```

OCR 与 AI 只提供可复核的录入和分析建议；付款、过账、结账、反结账等高风险动作仍由有权限的人员确认，并由服务端权限与审计边界约束。

## 独立运行

环境要求：Node.js `>= 22.0.0`、pnpm `>= 11.9.0`。

```powershell
pnpm install
pnpm dev
```

默认访问 `http://localhost:3012`。独立运行时，FMS 菜单提升为一级入口；由主平台装载时仍保留 FMS 应用分组。

```powershell
pnpm check
pnpm build
pnpm preview
```

生产构建输出到 `docs/`，默认公共路径为 `/art-supabase-fms/`，可作为 Pages 发布目录。

## 与主仓协作

FMS 业务修改在本仓提交并推送，随后在主仓更新 `modules/art-supabase-fms` 子模块指针。跨模块读取使用用途明确、字段最小化、租户隔离的 API/RPC 契约；FMS 不直接导入其他业务仓源码，也不复制主平台公共运行时。

## 安全原则

- 页面可见和按钮可用不代表后端授权，数据库 RLS 与服务端校验是最终边界。
- 制单、审核、过账、付款、核销、结账及反向操作应拆分权限并保留审计。
- 前端只使用 Supabase `anon` / publishable key，不暴露 `service_role` 或第三方服务密钥。

## 许可证

本项目采用 [MulanPSL-2.0](LICENSE) 许可证。
