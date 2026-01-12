/**
 * DesktopLoginWaitingPage
 * 
 * Shown while user completes authentication in system browser
 * Handles deep link callback and completes login flow
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDeepLink } from '../hooks/useDeepLink';
import { useAuthStore } from '../store/authStore';
import { exchangeCodeForTokens } from '../config/keycloak';
import { tokenVault } from '../../auth/tokenVault';

const DESKTOP_REDIRECT_URI = 'lexa-ledger://auth/callback';
const TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

type Status = 'waiting' | 'processing' | 'error' | 'timeout';

export function DesktopLoginWaitingPage() {
  const navigate = useNavigate();
  const completeLogin = useAuthStore((s) => s.completeLogin);
  
  const [status, setStatus] = useState<Status>('waiting');
  const [error, setError] = useState<string | null>(null);

  // Timeout handler
  useEffect(() => {
    const timer = setTimeout(() => {
      if (status === 'waiting') {
        setStatus('timeout');
        setError('Login timed out. Please try again.');
      }
    }, TIMEOUT_MS);

    return () => clearTimeout(timer);
  }, [status]);

  // Deep link callback handler
  const handleDeepLink = useCallback(async (url: string) => {
    if (status !== 'waiting') {
      console.log('[DesktopLoginWaiting] Ignoring deep link, not in waiting state:', status);
      return;
    }

    console.log('[DesktopLoginWaiting] Processing deep link:', url);
    setStatus('processing');

    try {
      // Extract code from URL (lexa-ledger://auth/callback?code=XXX&state=YYY)
      const urlObj = new URL(url);
      const code = urlObj.searchParams.get('code');
      
      if (!code) {
        throw new Error('No authorization code in callback URL');
      }

      console.log('[DesktopLoginWaiting] Exchanging code for tokens');
      
      // Exchange code for tokens
      const tokens = await exchangeCodeForTokens(code, DESKTOP_REDIRECT_URI);
      
      // Store refresh token in Stronghold (desktop only)
      if (tokens.refresh_token) {
        console.log('[DesktopLoginWaiting] Storing refresh token in vault');
        await tokenVault.setRefreshToken(tokens.refresh_token);
      }

      // Update auth store with access token
      console.log('[DesktopLoginWaiting] Completing login');
      completeLogin(tokens.access_token);

      // Navigate to portfolio
      console.log('[DesktopLoginWaiting] Login successful, navigating to portfolio');
      navigate('/portfolio', { replace: true });
    } catch (err: any) {
      console.error('[DesktopLoginWaiting] Login failed:', err);
      setStatus('error');
      setError(err.message || 'Login failed. Please try again.');
    }
  }, [status, completeLogin, navigate]);

  // Register deep link listener
  useDeepLink(handleDeepLink);

  const handleRetry = () => {
    // Re-trigger login flow
    useAuthStore.getState().beginDesktopLogin();
    // Reset state
    setStatus('waiting');
    setError(null);
  };

  const handleCancel = () => {
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
      <div className="w-[420px] max-w-full rounded-2xl border border-slate-200 bg-white p-8 shadow-lg">
        {/* Waiting State */}
        {status === 'waiting' && (
          <>
            <div className="flex justify-center mb-6">
              <div className="w-12 h-12 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
            </div>
            
            <h1 className="text-xl font-semibold text-center mb-2">
              Signing you in...
            </h1>
            
            <p className="text-sm text-slate-600 text-center mb-6">
              Complete the login process in your browser to continue.
            </p>

            <button
              onClick={handleCancel}
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
          </>
        )}

        {/* Processing State */}
        {status === 'processing' && (
          <>
            <div className="flex justify-center mb-6">
              <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
            </div>
            
            <h1 className="text-xl font-semibold text-center mb-2">
              Completing login...
            </h1>
            
            <p className="text-sm text-slate-600 text-center">
              Just a moment, we're setting up your session.
            </p>
          </>
        )}

        {/* Error State */}
        {(status === 'error' || status === 'timeout') && (
          <>
            <div className="flex justify-center mb-6">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            </div>
            
            <h1 className="text-xl font-semibold text-center mb-2 text-red-900">
              {status === 'timeout' ? 'Login Timed Out' : 'Login Failed'}
            </h1>
            
            <p className="text-sm text-slate-600 text-center mb-6">
              {error || 'Something went wrong during login. Please try again.'}
            </p>

            <div className="space-y-3">
              <button
                onClick={handleRetry}
                className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Retry Login
              </button>
              
              <button
                onClick={handleCancel}
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Back to Login
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
