const { execSync } = require("child_process");
const crypto = require("crypto");

function getBuildVersion() {
  const pkg = require("./package.json");
  const version = pkg.version || "0.0.0";
  let buildNum = "";
  try { buildNum = execSync("git rev-list --count HEAD 2>/dev/null").toString().trim(); } catch {}
  let sha = "";
  try { sha = execSync("git rev-parse --short HEAD 2>/dev/null").toString().trim(); } catch {}
  const date = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  return `v${version} \u00b7 build #${buildNum || "?"} \u00b7 ${sha ? sha + " \u00b7 " : ""}${date}`;
}

/** @type {import("next").NextConfig} */
const nextConfig = {
  serverExternalPackages: ["shared-auth", "shared-ai"],
  basePath: "/Oura",
  env: {
    NEXT_PUBLIC_BUILD_VERSION: getBuildVersion(),
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
  async headers() {
    const nonce = crypto.randomBytes(16).toString("base64");
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "X-Nonce", value: nonce },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              'script-src \'self\' \'unsafe-inline\'',
              'style-src \'self\' \'unsafe-inline\' https://fonts.googleapis.com',
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https://lh3.googleusercontent.com",
              "connect-src 'self' https://api.ouraring.com https://api.anthropic.com https://wbsapi.withings.net https://account.withings.com https://accounts.google.com https://app.pangolin.net",
              "frame-src 'self' https://accounts.google.com https://app.pangolin.net",
              "manifest-src 'self'",
              "object-src 'none'",
              "worker-src 'self'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
              "upgrade-insecure-requests",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

nextConfig.typescript={ignoreBuildErrors:true};
module.exports = nextConfig;
