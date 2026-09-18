/** @type {import("next").NextConfig} */
const partnerMode = process.env.NEXT_PUBLIC_PARTNER_MODE === "1";

const nextConfig = {
  output: 'standalone',
  async redirects() {
    const shared = [
      { source: '/base-1/robot-data', destination: '/robot-dashboard', permanent: true },
      { source: '/robot-dashboard/invoicing', destination: '/invoicing', permanent: true },
    ];
    if (partnerMode) {
      return shared;
    }
    return [
      { source: '/clients', destination: '/crm-members', permanent: true },
      { source: '/clients/:id', destination: '/crm-members/:id', permanent: true },
      ...shared,
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.sanity.io",
        port: ""
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        port: ""
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
        port: ""
      },
      {
        protocol: "https",
        hostname: "pub-b7fd9c30cdbf439183b75041f5f71b92.r2.dev",
        port: ""
      }
    ]
  }
};

export default nextConfig;
