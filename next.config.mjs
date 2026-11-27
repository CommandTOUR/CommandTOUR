/** @type {import('next').NextConfig} */
const nextConfig = {
  // The Event Packet route reads DM Sans .woff files at runtime; make sure they ship with the serverless function
  outputFileTracingIncludes: {
    '/api/event-packet/[eventId]': ['./node_modules/@fontsource/dm-sans/files/dm-sans-latin-*-normal.woff'],
  },
};

export default nextConfig;
