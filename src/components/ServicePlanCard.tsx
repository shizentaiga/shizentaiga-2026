import { html } from 'hono/html'

// 修正前: (services: any[])
// 修正後: (services: readonly any[])
export const ServicePlanList = (services: readonly any[]) => html`
  <div class="space-y-4">
    ${services.map((s, index) => html`
      <div class="selection-card flex justify-between items-center p-6 bg-white rounded-sm cursor-pointer transition-all" 
           data-selected="${index === 0 ? 'true' : 'false'}">
        <div>
          <h3 class="text-sm font-bold text-gray-900">${s.name}</h3>
          <p class="text-xs text-gray-500 mt-1">${s.description}</p>
        </div>
        <div class="text-right">
          <span class="text-base font-bold text-gray-900">¥${s.price.toLocaleString()}</span>
          <span class="block text-[10px] text-gray-400 uppercase mt-1">
            ${s.duration}${s.suffix || ''}
          </span>
        </div>
      </div>
    `)}
  </div>
`