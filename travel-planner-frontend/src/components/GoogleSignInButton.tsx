"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";

import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

interface TokenResponse {
  access_token?: string;
  error?: string;
}

interface TokenClient {
  requestAccessToken: () => void;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: TokenResponse) => void;
          }) => TokenClient;
        };
      };
    };
  }
}

export function GoogleSignInButton({
  onSuccess,
  onError,
}: {
  onSuccess: () => void;
  onError: (message: string) => void;
}) {
  const { loginGoogle } = useAuth();
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const tokenClientRef = useRef<TokenClient | null>(null);

  useEffect(() => {
    if (!scriptLoaded || !GOOGLE_CLIENT_ID || !window.google) return;

    tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: "openid email profile",
      callback: async (response) => {
        if (!response.access_token) {
          onError("Google sign-in was cancelled.");
          return;
        }

        try {
          await loginGoogle(response.access_token);
          onSuccess();
        } catch (err) {
          onError(err instanceof ApiError ? err.message : "Google sign-in failed.");
        }
      },
    });
  }, [scriptLoaded, loginGoogle, onSuccess, onError]);

  const handleClick = () => {
    if (!GOOGLE_CLIENT_ID) {
      onError("Google sign-in is not configured yet.");
      return;
    }

    if (!tokenClientRef.current) {
      onError("Google sign-in is still loading. Try again in a moment.");
      return;
    }

    tokenClientRef.current.requestAccessToken();
  };

  return (
    <>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onReady={() => setScriptLoaded(true)}
      />
      <button
        type="button"
        onClick={handleClick}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
      >
        <svg viewBox="0 0 48 48" className="h-4 w-4" aria-hidden="true">
          <path
            fill="#FFC107"
            d="M43.6 20.5H42V20.4H24v7.2h11.3c-1.6 4.6-6 7.9-11.3 7.9-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.1-5.1C34.2 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.4-.4-3.5z"
          />
          <path
            fill="#FF3D00"
            d="M6.3 14.7l5.9 4.3C13.9 15.4 18.6 12.4 24 12.4c3.1 0 5.9 1.2 8 3.1l5.1-5.1C34.2 6.1 29.4 4 24 4c-7.5 0-14 4.2-17.7 10.7z"
          />
          <path
            fill="#4CAF50"
            d="M24 44c5.3 0 10.1-2 13.7-5.3l-6.3-5.3c-2 1.5-4.6 2.4-7.4 2.4-5.3 0-9.7-3.4-11.3-8.1l-6.2 4.8C9.9 39.7 16.4 44 24 44z"
          />
          <path
            fill="#1976D2"
            d="M43.6 20.5H42V20.4H24v7.2h11.3c-.8 2.3-2.2 4.2-4.1 5.6l6.3 5.3C41.5 35.4 44 30.1 44 24c0-1.2-.1-2.4-.4-3.5z"
          />
        </svg>
        Sign in with Google
      </button>
    </>
  );
}
