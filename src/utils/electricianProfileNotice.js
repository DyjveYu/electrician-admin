export const profileTypeText = type => ({ new_certification: '新认证', information_changed: '信息变更' }[type] || '—')
export function profileTime(value) {
  if (!value || !Number.isFinite(new Date(value).getTime())) return '—'
  return new Date(value).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
}
