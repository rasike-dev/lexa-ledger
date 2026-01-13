/**
 * Demo Disclaimer Component
 * 
 * Week 3 - Track A: Explainable Intelligence
 * Step E1.3: Global UI Polish
 * 
 * Shows a disclaimer banner when in demo mode.
 * Only displays if `demoMode` is enabled in UIStore.
 * 
 * Usage:
 * ```tsx
 * <DemoDisclaimer />
 * ```
 */

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { useUIStore } from '../../app/store/uiStore';

export default function DemoDisclaimer() {
  const demoMode = useUIStore((s) => s.demoMode);

  if (!demoMode) return null;

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 mb-6">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          <AlertTriangle className="w-5 h-5 text-amber-600" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-medium text-amber-900">
            Demo Mode Active
          </div>
          <div className="mt-1 text-sm text-amber-800">
            This interface uses simulated data for demonstration purposes. 
            Role simulation affects UI visibility only — backend access is enforced by RBAC.
          </div>
        </div>
      </div>
    </div>
  );
}
