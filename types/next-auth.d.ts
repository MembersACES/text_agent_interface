import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    canvaAccessToken?: string;
  }

  interface JWT {
    canvaAccessToken?: string;
  }

  interface User {
    canvaAccessToken?: string;
  }
}
