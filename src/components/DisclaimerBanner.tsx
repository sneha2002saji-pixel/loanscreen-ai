'use client';

import { AlertTriangle } from 'lucide-react';

export default function DisclaimerBanner() {
  return (
    <div className="border-t border-amber-100 bg-amber-50 px-4 py-2">
      <div className="mx-auto flex max-w-4xl items-start gap-2">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-amber-500" />
        <p className="text-xs leading-relaxed text-amber-700">
          This is a pre-qualification estimate only and does not constitute a loan
          offer. Actual rates and approval are subject to a formal application and
          lender underwriting.
        </p>
      </div>
    </div>
  );
}
