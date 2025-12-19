import GoogleProvider from "next-auth/providers/google";
import type { NextAuthOptions } from "next-auth";

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          // Minimal scopes - no extra permission screens
          scope: "openid email profile",
          access_type: "offline",
          prompt: "consent"
        }
      }
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.sub;
      }
      (session as any).accessToken = token.accessToken;
      (session as any).id_token = token.id_token;
      
      // If there's a refresh error, we should handle it
      if (token.error === "RefreshAccessTokenError") {
        (session as any).error = "RefreshAccessTokenError";
      }
      
      return session;
    },
    async jwt({ token, account, trigger }) {
      // Initial sign in
      if (account) {
        token.accessToken = account.access_token;
        token.id_token = account.id_token;
        token.refreshToken = account.refresh_token;
        // More robust expiration time calculation
        token.accessTokenExpires = account.expires_at 
          ? account.expires_at * 1000 
          : Date.now() + 3600 * 1000; // Default to 1 hour if not provided
        
        // Set ID token expiration (typically 1 hour)
        token.idTokenExpires = Date.now() + 3600 * 1000;
        
        console.log("Initial token set, expires at:", new Date(token.accessTokenExpires as number));
        console.log("ID token expires at:", new Date(token.idTokenExpires as number));
        return token;
      }

      // Check if access token has expired
      const bufferTime = 5 * 60 * 1000; // 5 minutes in milliseconds
      const accessTokenValid = Date.now() < ((token.accessTokenExpires as number) - bufferTime);
      
      if (accessTokenValid) {
        return token;
      }

      console.log("Access token expired, attempting refresh...");
      // Access token has expired, try to update it
      return refreshAccessToken(token);
    },
  },
  pages: {
    error: '/auth/error', // Optional: custom error page
  },
  // Only enable debug if explicitly set via environment variable
  // This prevents the DEBUG_ENABLED warning in development
  debug: process.env.NEXTAUTH_DEBUG === 'true',
};

async function refreshAccessToken(token: any) {
  try {
    // Check if we have a refresh token
    if (!token.refreshToken) {
      console.error("No refresh token available");
      throw new Error("No refresh token available");
    }

    console.log("Refreshing access token...");
    
    const url = "https://oauth2.googleapis.com/token";
    const response = await fetch(url, {
      headers: { 
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json"
      },
      method: "POST",
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        grant_type: "refresh_token",
        refresh_token: token.refreshToken,
      }),
    });

    const refreshedTokens = await response.json();

    if (!response.ok) {
      console.error("Failed to refresh token:", response.status, refreshedTokens);
      throw refreshedTokens;
    }

    console.log("Token refreshed successfully");

    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      accessTokenExpires: Date.now() + (refreshedTokens.expires_in * 1000),
      id_token: refreshedTokens.id_token ?? token.id_token, // Keep existing ID token if not refreshed
      idTokenExpires: refreshedTokens.id_token ? Date.now() + 3600 * 1000 : token.idTokenExpires,
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
      error: undefined, // Clear any previous errors
    };
  } catch (error) {
    console.error("Error refreshing access token:", error);

    // Return the token with error flag
    return {
      ...token,
      error: "RefreshAccessTokenError",
    };
  }
}