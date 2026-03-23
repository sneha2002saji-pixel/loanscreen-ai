'use client';

import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import type { EligibilityResult } from '@/types/loan';
import { formatCurrency, formatPercent, cn } from '@/lib/utils';

interface SummaryCardProps {
  result: EligibilityResult;
}

const LOAN_TYPE_LABELS: Record<string, string> = {
  personal: 'Personal Loan',
  auto: 'Auto Loan',
  mortgage: 'Mortgage',
};

export default function SummaryCard({ result }: SummaryCardProps) {
  const statusConfig = result.isPrequalified
    ? {
        icon: CheckCircle,
        label: 'Pre-Qualified',
        bg: 'bg-emerald-50',
        border: 'border-emerald-200',
        iconColor: 'text-emerald-500',
        labelColor: 'text-emerald-700',
      }
    : {
        icon: XCircle,
        label: 'Not Pre-Qualified',
        bg: 'bg-red-50',
        border: 'border-red-200',
        iconColor: 'text-red-500',
        labelColor: 'text-red-700',
      };

  const riskConfig: Record<string, { color: string; label: string }> = {
    low: { color: 'text-emerald-600', label: 'Low Risk' },
    medium: { color: 'text-amber-600', label: 'Medium Risk' },
    high: { color: 'text-red-600', label: 'High Risk' },
  };

  const risk = riskConfig[result.riskLevel] ?? riskConfig.high;
  const StatusIcon = statusConfig.icon;

  return (
    <div className={cn('mt-3 rounded-xl border-2 p-4', statusConfig.bg, statusConfig.border)}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <StatusIcon className={cn('h-8 w-8', statusConfig.iconColor)} />
        <div>
          <h3 className={cn('text-lg font-bold', statusConfig.labelColor)}>
            {statusConfig.label}
          </h3>
          <p className="text-sm text-slate-500">
            {LOAN_TYPE_LABELS[result.loanType] ?? result.loanType}
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-white/70 p-3">
          <p className="text-xs font-medium text-slate-400">Estimated Rate</p>
          <p className="text-lg font-bold text-slate-800">
            {formatPercent(result.estimatedRateRange.min)} – {formatPercent(result.estimatedRateRange.max)}
          </p>
        </div>
        <div className="rounded-lg bg-white/70 p-3">
          <p className="text-xs font-medium text-slate-400">Max Loan Amount</p>
          <p className="text-lg font-bold text-slate-800">
            {result.maxLoanAmount > 0 ? formatCurrency(result.maxLoanAmount) : 'N/A'}
          </p>
        </div>
        <div className="rounded-lg bg-white/70 p-3">
          <p className="text-xs font-medium text-slate-400">DTI Ratio</p>
          <p className="text-lg font-bold text-slate-800">{result.dtiRatio.toFixed(1)}%</p>
        </div>
        <div className="rounded-lg bg-white/70 p-3">
          <p className="text-xs font-medium text-slate-400">Risk Level</p>
          <p className={cn('text-lg font-bold', risk.color)}>{risk.label}</p>
        </div>
      </div>

      {/* Reasons */}
      <div className="mt-4">
        <h4 className="text-sm font-semibold text-slate-700">Assessment</h4>
        <ul className="mt-1 space-y-1">
          {result.reasons.map((reason, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
              {reason}
            </li>
          ))}
        </ul>
      </div>

      {/* Next Steps */}
      <div className="mt-4">
        <h4 className="text-sm font-semibold text-slate-700">Next Steps</h4>
        <ol className="mt-1 space-y-1">
          {result.nextSteps.map((step, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
              <span className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-600">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </div>

      {/* Disclaimer */}
      <div className="mt-4 rounded-md bg-white/50 p-3">
        <p className="text-xs leading-relaxed text-slate-400">{result.disclaimer}</p>
      </div>
    </div>
  );
}
