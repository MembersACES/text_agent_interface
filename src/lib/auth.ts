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
          scope: "openid email profile https://www.googleapis.com/auth/presentations https://www.googleapis.com/auth/drive",
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
        
        console.log("Initial token set, expires at:", new Date(token.accessTokenExpires as number));
        return token;
      }

      // Return previous token if the access token has not expired yet
      // Add some buffer time (5 minutes) to refresh before actual expiration
      const bufferTime = 5 * 60 * 1000; // 5 minutes in milliseconds
      if (Date.now() < ((token.accessTokenExpires as number) - bufferTime)) {
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
  debug: process.env.NODE_ENV === 'development', // Enable debug in development
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