/**
 * Page Header Component
 * 
 * Week 3 - Track A: Explainable Intelligence
 * Step E1.3: Global UI Polish
 * 
 * Standard header for all major pages with:
 * - Consistent title styling
 * - Optional subtitle
 * - Optional right-side actions
 * 
 * Usage:
 * ```tsx
 * <PageHeader
 *   title="Trading Readiness"
 *   subtitle="Facts-first scoring • audit-safe • tenant-isolated"
 *   right={<button>Refresh</button>}
 * />
 * ```
 */

import React from 'react';

export type PageHeaderProps = {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
};

export default function PageHeader({ title, subtitle, right }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div className="flex-1 min-w-0">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>
      {right && <div className="flex-shrink-0">{right}</div>}
    </div>
  );
}
