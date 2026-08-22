# FMS Supabase backend

本目录只维护 FMS 自己的 Edge Functions 与财务业务规则。AI 配置、供应商协议、鉴权和视觉 OCR 运行时通过主仓不可变提交的 URL 导入，避免在业务仓复制公共实现。

部署单个函数示例：

```bash
supabase functions deploy ai-invoice-ocr --project-ref ckbftoopuyophiebamwy
```

数据库租户隔离、RLS 和公共审计能力仍由 `art-supabase-pro` 的统一迁移管理。
