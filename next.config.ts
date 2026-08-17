import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  images: {
    // Default user/org avatar placeholders are hosted here (see models/user.ts
    // and models/organization.ts). Add additional hosts when real
    // user-uploaded avatars/logos are wired up to external storage.
    remotePatterns: [{ protocol: "https", hostname: "res.cloudinary.com" }],
  },
  experimental: {
    serverActions: {
      // Task attachments are capped at 15MB (see MAX_ATTACHMENT_SIZE_BYTES
      // in services/attachment.ts) - this must stay comfortably above that,
      // since the limit here applies to the whole multipart body, not just
      // the file bytes.
      bodySizeLimit: "16mb",
    },
  },
};

export default nextConfig;
