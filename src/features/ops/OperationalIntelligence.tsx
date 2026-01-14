/**
 * Operational Intelligence Page
 * 
 * Week 3 - Track C: Operational Intelligence
 * Step C3: Operational Dashboard Panel
 * 
 * "Judge-friendly" operational dashboard:
 * - Proves system is monitored
 * - Proves system is self-healing
 * - Provides instant visibility into health
 * - One-click deep links to audit trail
 */

import { Link } from 'react-router-dom';
import { useOpsSummary } from './hooks';
import { 
  Activity, 
  AlertTriangle, 
  Clock, 
  DollarSign,
  RefreshCw,
  TrendingUp,
  ExternalLink,
  CheckCircle2
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import PageHeader from '../../components/layout/PageHeader';
import { DemoDisclaimer } from '../../components/common';

/**
 * Operational Intelligence Page
 * 
 * Grid layout with 4 metric cards:
 * 1. Last Refresh - When did system last run automated refresh?
 * 2. Drift (24h) - How many facts changed?
 * 3. Stale Explanations - How many are outdated?
 * 4. AI Usage (24h) - Calls + cost
 * 
 * Each card has "View in Audit" button for drill-down.
 */
export function OperationalIntelligence() {
  const { data, isLoading, error } = useOpsSummary();

  if (isLoading) {
    return (
      <div style={{ padding: '32px', minHeight: '100vh', background: 'rgb(var(--background))' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '24px',
            animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
          }}>
            <div style={{ height: '40px', width: '320px', background: 'rgb(var(--muted))', borderRadius: '8px', opacity: 0.3 }}></div>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
              gap: '24px' 
            }}>
              {[1, 2, 3, 4].map((i) => (
                <div 
                  key={i} 
                  style={{ 
                    height: '240px', 
                    background: 'rgb(var(--card))', 
                    borderRadius: '12px',
                    border: '1px solid rgb(var(--border))',
                    opacity: 0.3
                  }}
                ></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '32px', minHeight: '100vh', background: 'rgb(var(--background))' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <div style={{
            background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
            border: '1px solid #fecaca',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
          }}>
            <h2 style={{ 
              color: '#991b1b', 
              fontWeight: 600, 
              fontSize: '18px',
              marginBottom: '8px'
            }}>
              Failed to load operational summary
            </h2>
            <p style={{ color: '#dc2626', fontSize: '14px' }}>{error.message}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div style={{ 
      padding: '32px', 
      minHeight: '100vh', 
      background: 'rgb(var(--background))' 
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          <DemoDisclaimer />
          
          <PageHeader
            title="Operational Intelligence"
            subtitle="System health monitoring • Auto-refreshes every 60 seconds"
            right={
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
                color: 'rgb(var(--muted-foreground))',
                padding: '8px 16px',
                borderRadius: '8px',
                background: 'rgb(var(--card))',
                border: '1px solid rgb(var(--border))',
                fontWeight: 500
              }}>
                <RefreshCw style={{ width: '16px', height: '16px', animation: 'spin 3s linear infinite' }} />
                Live monitoring
              </div>
            }
          />

          {/* Metrics Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '24px'
          }}>
            {/* Card 1: Last Refresh */}
            <MetricCard
              icon={<Clock style={{ width: '24px', height: '24px' }} />}
              title="Last Refresh"
              value={
                data.lastRefresh
                  ? formatDistanceToNow(new Date(data.lastRefresh.completedAt), {
                      addSuffix: true,
                    })
                  : 'Never'
              }
              description={
                data.lastRefresh
                  ? `Job ID: ${data.lastRefresh.jobId.substring(0, 8)}...`
                  : 'No scheduled refresh has completed yet'
              }
              linkTo={data.links.auditOps}
              linkLabel="View OPS runs"
              statusColor="blue"
            />

            {/* Card 2: Drift Events (24h) */}
            <MetricCard
              icon={<TrendingUp style={{ width: '24px', height: '24px' }} />}
              title="Drift Events (24h)"
              value={data.drift24h.toString()}
              description={
                data.drift24h === 0
                  ? 'No facts changed in last 24h'
                  : data.drift24h === 1
                  ? '1 fact changed, explanation updated'
                  : `${data.drift24h} facts changed, explanations updated`
              }
              linkTo={data.links.auditDrift}
              linkLabel="View drift events"
              statusColor={data.drift24h > 0 ? 'green' : 'slate'}
            />

            {/* Card 3: Stale Explanations */}
            <MetricCard
              icon={data.staleNow > 0 ? <AlertTriangle style={{ width: '24px', height: '24px' }} /> : <CheckCircle2 style={{ width: '24px', height: '24px' }} />}
              title="Stale Explanations"
              value={data.staleNow.toString()}
              description={
                data.staleNow === 0
                  ? 'All explanations are up-to-date'
                  : data.staleNow === 1
                  ? '1 explanation needs recompute'
                  : `${data.staleNow} explanations need recompute`
              }
              linkTo={data.links.auditStale}
              linkLabel="View explanations"
              statusColor={data.staleNow > 0 ? 'amber' : 'green'}
            />

            {/* Card 4: AI Usage (24h) */}
            <MetricCard
              icon={<Activity style={{ width: '24px', height: '24px' }} />}
              title="AI Usage (24h)"
              value={`${data.ai24h.calls} calls`}
              description={
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <DollarSign style={{ width: '16px', height: '16px' }} />
                  <span>
                    {data.ai24h.costUsd.toFixed(4)} USD estimated cost
                  </span>
                </div>
              }
              linkTo={data.links.auditAi}
              linkLabel="View AI calls"
              statusColor="purple"
            />
          </div>

          {/* Info Banner */}
          <div style={{
            background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
            border: '1px solid #bfdbfe',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
              <div style={{
                flexShrink: 0,
                width: '48px',
                height: '48px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.3)'
              }}>
                <Activity style={{ width: '24px', height: '24px', color: 'white' }} />
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{
                  fontWeight: 600,
                  fontSize: '16px',
                  color: '#1e40af',
                  marginBottom: '8px',
                  letterSpacing: '-0.01em'
                }}>
                  Self-Healing System
                </h3>
                <p style={{
                  fontSize: '14px',
                  color: '#1e3a8a',
                  lineHeight: '1.6',
                  margin: 0
                }}>
                  This platform automatically detects changes, recomputes affected facts, and updates
                  explanations. Every operation is audited for compliance. Click "View in Audit" on
                  any card to see the complete trail.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Metric Card Component
 * 
 * Displays a single metric with:
 * - Icon + status color
 * - Title
 * - Value (large, prominent)
 * - Description (small, muted)
 * - "View in Audit" link button
 */
function MetricCard({
  icon,
  title,
  value,
  description,
  linkTo,
  linkLabel,
  statusColor,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  description: React.ReactNode;
  linkTo: string;
  linkLabel: string;
  statusColor: 'blue' | 'green' | 'amber' | 'purple' | 'slate';
}) {
  const colorConfig = {
    blue: {
      bg: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
      border: '#bfdbfe',
      iconBg: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
      iconColor: '#1d4ed8',
      valueColor: '#1e3a8a',
      linkColor: '#2563eb',
      linkHover: '#1d4ed8',
      shadow: '0 4px 6px -1px rgba(59, 130, 246, 0.1), 0 2px 4px -2px rgba(59, 130, 246, 0.1)'
    },
    green: {
      bg: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
      border: '#bbf7d0',
      iconBg: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
      iconColor: '#15803d',
      valueColor: '#166534',
      linkColor: '#16a34a',
      linkHover: '#15803d',
      shadow: '0 4px 6px -1px rgba(34, 197, 94, 0.1), 0 2px 4px -2px rgba(34, 197, 94, 0.1)'
    },
    amber: {
      bg: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
      border: '#fde68a',
      iconBg: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      iconColor: '#b45309',
      valueColor: '#92400e',
      linkColor: '#d97706',
      linkHover: '#b45309',
      shadow: '0 4px 6px -1px rgba(245, 158, 11, 0.1), 0 2px 4px -2px rgba(245, 158, 11, 0.1)'
    },
    purple: {
      bg: 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)',
      border: '#e9d5ff',
      iconBg: 'linear-gradient(135deg, #a855f7 0%, #9333ea 100%)',
      iconColor: '#7e22ce',
      valueColor: '#6b21a8',
      linkColor: '#9333ea',
      linkHover: '#7e22ce',
      shadow: '0 4px 6px -1px rgba(168, 85, 247, 0.1), 0 2px 4px -2px rgba(168, 85, 247, 0.1)'
    },
    slate: {
      bg: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
      border: '#cbd5e1',
      iconBg: 'linear-gradient(135deg, #64748b 0%, #475569 100%)',
      iconColor: '#334155',
      valueColor: '#1e293b',
      linkColor: '#475569',
      linkHover: '#334155',
      shadow: '0 4px 6px -1px rgba(100, 116, 139, 0.1), 0 2px 4px -2px rgba(100, 116, 139, 0.1)'
    },
  };

  const config = colorConfig[statusColor];

  return (
    <div
      style={{
        background: config.bg,
        border: `1px solid ${config.border}`,
        borderRadius: '16px',
        padding: '24px',
        boxShadow: config.shadow,
        transition: 'all 0.2s ease-in-out',
        position: 'relative',
        overflow: 'hidden'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = config.shadow;
      }}
    >
      {/* Decorative corner accent */}
      <div style={{
        position: 'absolute',
        top: 0,
        right: 0,
        width: '120px',
        height: '120px',
        background: `radial-gradient(circle at top right, ${config.border}20, transparent 70%)`,
        pointerEvents: 'none'
      }} />

      {/* Icon */}
      <div style={{
        width: '56px',
        height: '56px',
        borderRadius: '12px',
        background: config.iconBg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '20px',
        boxShadow: `0 4px 6px -1px ${config.iconColor}30`,
        color: 'white'
      }}>
        {icon}
      </div>

      {/* Title */}
      <h3 style={{
        fontSize: '13px',
        fontWeight: 600,
        color: 'rgb(var(--muted-foreground))',
        marginBottom: '12px',
        textTransform: 'uppercase',
        letterSpacing: '0.05em'
      }}>
        {title}
      </h3>

      {/* Value */}
      <div style={{
        fontSize: '36px',
        fontWeight: 700,
        color: config.valueColor,
        marginBottom: '12px',
        lineHeight: 1.2,
        letterSpacing: '-0.02em'
      }}>
        {value}
      </div>

      {/* Description */}
      <div style={{
        fontSize: '14px',
        color: 'rgb(var(--muted-foreground))',
        marginBottom: '20px',
        minHeight: '44px',
        lineHeight: '1.5'
      }}>
        {description}
      </div>

      {/* Link */}
      <Link
        to={linkTo}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '14px',
          fontWeight: 600,
          color: config.linkColor,
          textDecoration: 'none',
          transition: 'color 0.2s ease-in-out',
          padding: '8px 0'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = config.linkHover;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = config.linkColor;
        }}
      >
        {linkLabel}
        <ExternalLink style={{ width: '16px', height: '16px' }} />
      </Link>
    </div>
  );
}
