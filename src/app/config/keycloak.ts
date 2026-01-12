/**
 * Keycloak OIDC Configuration
 * 
 * Week 2.5: SSO Login/Logout flow
 */

export const keycloakConfig = {
  url: import.meta.env.VITE_KEYCLOAK_URL || 'http://localhost:8088',
  realm: import.meta.env.VITE_KEYCLOAK_REALM || 'lexa-ledger',
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'lexa-ledger-web',
} as const;

/**
 * Build Keycloak authorization URL for OIDC Authorization Code Flow
 * 
 * Supports both web and desktop (deep link) redirect URIs:
 * - Web: http://localhost:5173/auth/callback
 * - Desktop: lexa-ledger://auth/callback
 */
export function buildKeycloakLoginUrl(redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: keycloakConfig.clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid profile email',
  });

  return `${keycloakConfig.url}/realms/${keycloakConfig.realm}/protocol/openid-connect/auth?${params.toString()}`;
}

/**
 * Build Keycloak logout URL (front-channel logout)
 */
export function buildKeycloakLogoutUrl(redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: keycloakConfig.clientId,
    post_logout_redirect_uri: redirectUri,
  });

  return `${keycloakConfig.url}/realms/${keycloakConfig.realm}/protocol/openid-connect/logout?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(code: string, redirectUri: string): Promise<{
  access_token: string;
  refresh_token?: string;
  id_token?: string;
}> {
  const response = await fetch(
    `${keycloakConfig.url}/realms/${keycloakConfig.realm}/protocol/openid-connect/token`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: keycloakConfig.clientId,
        code,
        redirect_uri: redirectUri,
      }),
    }
  );

  if (!response.ok) {
    // Try to get error details from Keycloak
    let errorMessage = response.statusText;
    try {
      const errorData = await response.json();
      if (errorData.error_description) {
        errorMessage = errorData.error_description;
      } else if (errorData.error) {
        errorMessage = errorData.error;
      }
    } catch {
      // If we can't parse the error, use status text
    }
    
    console.error('Keycloak token exchange failed:', {
      status: response.status,
      message: errorMessage,
      redirectUri,
    });
    
    throw new Error(`Token exchange failed: ${errorMessage}`);
  }

  return response.json();
}

/**
 * Decode JWT token payload (base64url decode)
 */
export function decodeJwt(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format');
    }

    const payload = parts[1];
    // Base64url decode
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );

    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Failed to decode JWT:', error);
    return null;
  }
}
