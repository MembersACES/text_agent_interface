import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    canvaAccessToken?: string;
    accessToken?: string;
    id_token?: string;
    error?: string;
  }

  interface JWT {
    canvaAccessToken?: string;
    accessToken?: string;
    id_token?: string;
    refreshToken?: string;
    accessTokenExpires?: number;
    error?: string;
  }

  interface User {
    canvaAccessToken?: string;
    accessToken?: string;
    id_token?: string;
  }
}
