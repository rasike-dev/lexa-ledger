import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { exchangeCodeForTokens } from '../config/keycloak';

/**
 * OAuth2 Callback Handler
 * 
 * This page handles the redirect from Keycloak after user login.
 * It exchanges the authorization code for access tokens and completes login.
 */
export function AuthCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const completeLogin = useAuthStore((s) => s.completeLogin);
  const processedRef = useRef(false);

  useEffect(() => {
    // Prevent double invocation in React StrictMode (development)
    if (processedRef.current) return;
    processedRef.current = true;

    const handleCallback = async () => {

      // Check for error from OAuth provider
      const errorParam = searchParams.get('error');
      if (errorParam) {
        setError(searchParams.get('error_description') || errorParam);
        return;
      }

      // Get authorization code
      const code = searchParams.get('code');
      if (!code) {
        setError('No authorization code received');
        return;
      }

      try {
        // Exchange code for tokens
        const redirectUri = `${window.location.origin}/auth/callback`;
        const tokens = await exchangeCodeForTokens(code, redirectUri);

        // Complete login (this decodes JWT and populates auth state)
        completeLogin(tokens.access_token);

        // Redirect to portfolio
        navigate('/portfolio', { replace: true });
      } catch (err) {
        console.error('Login failed:', err);
        setError(err instanceof Error ? err.message : 'Login failed');
      }
    };

    handleCallback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);  // Empty deps - only run once on mount

  if (error) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          padding: 24,
          background: '#fef2f2',
        }}
      >
        <div
          style={{
            width: 420,
            maxWidth: '100%',
            background: 'white',
            borderRadius: 16,
            padding: 32,
            border: '1px solid #fecaca',
          }}
        >
          <div style={{ fontSize: 48, textAlign: 'center', marginBottom: 16 }}>⚠️</div>
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0, color: '#dc2626' }}>
            Login Failed
          </h1>
          <p style={{ margin: '12px 0', color: '#6b7280', fontSize: 14 }}>{error}</p>
          <button
            onClick={() => navigate('/login')}
            style={{
              width: '100%',
              padding: '10px 16px',
              borderRadius: 10,
              border: '1px solid #dc2626',
              background: '#dc2626',
              color: 'white',
              cursor: 'pointer',
              fontWeight: 600,
              marginTop: 16,
            }}
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  // Loading state
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: 24,
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}
    >
      <div
        style={{
          width: 420,
          maxWidth: '100%',
          background: 'white',
          borderRadius: 16,
          padding: 48,
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            border: '4px solid #e5e7eb',
            borderTopColor: '#667eea',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 24px',
          }}
        />
        <style>
          {`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}
        </style>
        <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0, color: '#111827' }}>
          Completing login...
        </h2>
        <p style={{ margin: '8px 0 0 0', color: '#6b7280', fontSize: 14 }}>
          Please wait while we verify your identity.
        </p>
      </div>
    </div>
  );
}
