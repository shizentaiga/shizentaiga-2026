/**
 * @file Contact.tsx
 * @description 簡易問い合わせページ。
 * 予約フローからの離脱や、個別相談を希望するユーザーへの案内。
 */

import { BUSINESS_INFO } from '../../constants/info'

export const ContactPage = () => {
  return (
    <div class="max-w-xl mx-auto py-24 px-6 text-center">
      <h1 class="text-xl font-medium tracking-[0.2em] text-gray-900 mb-8 uppercase">
        Contact
      </h1>
      
      <div class="space-y-6 text-sm text-gray-600 leading-relaxed">
        <p>
          ご相談、および業務に関するお問い合わせは、<br />
          下記メールアドレスにて承っております。
        </p>
        
        <div class="py-8">
          <a 
            href={`mailto:${BUSINESS_INFO.email}`} 
            class="text-lg font-light tracking-widest text-gray-900 border-b border-gray-200 pb-1 hover:border-gray-900 transition-colors"
          >
            {BUSINESS_INFO.email}
          </a>
        </div>

        <p class="text-[10px] opacity-60">
          ※ 通常2営業日以内にご返信を差し上げます。
        </p>
      </div>

      <div class="mt-16 pt-8 border-t border-gray-100">
        <a 
          href="/services" 
          class="inline-block px-8 py-3 bg-gray-900 text-white text-[10px] tracking-[0.2em] uppercase rounded-sm hover:bg-gray-800 transition-colors"
        >
          Back to Services
        </a>
      </div>
    </div>
  )
}