/**
 * Empty State Component
 * 
 * Week 3 - Track A: Explainable Intelligence
 * Step E1.3: Global UI Polish
 * 
 * Standard empty state for lists, tables, and widgets with:
 * - Consistent styling
 * - Optional body text
 * - Optional action button
 * 
 * Usage:
 * ```tsx
 * <EmptyState
 *   title="No loans found"
 *   body="Create your first loan to get started."
 *   action={<button>Create Loan</button>}
 * />
 * ```
 */

import React from 'react';
import { AlertCircle, Inbox } from 'lucide-react';

export type EmptyStateProps = {
  title: string;
  body?: string;
  action?: React.ReactNode;
  icon?: 'inbox' | 'alert' | 'none';
};

export default function EmptyState({ 
  title, 
  body, 
  action,
  icon = 'inbox' 
}: EmptyStateProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      {icon !== 'none' && (
        <div className="flex justify-center mb-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-slate-100">
            {icon === 'inbox' && <Inbox className="w-6 h-6 text-slate-600" />}
            {icon === 'alert' && <AlertCircle className="w-6 h-6 text-slate-600" />}
          </div>
        </div>
      )}
      <div className="text-base font-semibold text-slate-900">{title}</div>
      {body && (
        <div className="mt-2 text-sm text-slate-600 max-w-md mx-auto">
          {body}
        </div>
      )}
      {action && (
        <div className="mt-4 flex justify-center">
          {action}
        </div>
      )}
    </div>
  );
}
