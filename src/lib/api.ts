const LEGACY_SESSION_TOKEN_KEY = 'antiauc_session_token';
const DEFAULT_REQUEST_TIMEOUT_MS = 15000;

export function scrubLegacySessionTokens(): void {
  try {
    sessionStorage.removeItem(LEGACY_SESSION_TOKEN_KEY);
    localStorage.removeItem(LEGACY_SESSION_TOKEN_KEY);
  } catch {}
}

export async function apiRequest<T = any>(
  url: string,
  options: RequestInit & { timeoutMs?: number } = {}
): Promise<T> {
  const { timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS, signal: externalSignal, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    ...(fetchOptions.headers as Record<string, string> || {})
  };
  if (fetchOptions.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort();
    } else {
      externalSignal.addEventListener('abort', () => controller.abort(), { once: true });
    }
  }

  try {
    const res = await fetch(url, {
      ...fetchOptions,
      credentials: 'include',
      signal: controller.signal,
      headers
    });

    const contentType = res.headers.get('content-type') || '';
    let data: any = null;
    if (contentType.includes('application/json')) {
      try {
        data = await res.json();
      } catch {
        data = null;
      }
    }

    if (!res.ok) {
      if (data && typeof data === 'object') {
        return { success: false, ...data } as T;
      }
      if (res.status === 405) {
        return {
          success: false,
          message: 'Service endpoint unavailable on this host (405).'
        } as T;
      }
      if (res.status === 429) {
        return {
          success: false,
          message: 'Too many attempts. Please wait a moment and try again.'
        } as T;
      }
      return { success: false, message: `Request could not be completed (${res.status}).` } as T;
    }

    return data as T;
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      return { success: false, message: 'Request timed out. Please check your connection and retry.' } as T;
    }
    return { success: false, message: 'Network unavailable. Please check your connection and try again.' } as T;
  } finally {
    clearTimeout(timeoutId);
  }
}
