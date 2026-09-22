const fs = require("fs");
const path = require("path");

function getEnvVar(name) {
  if (process.env[name]) return process.env[name];
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf8");
    const match = envContent.match(new RegExp(`${name}=(.*)`));
    if (match) return match[1].trim();
  }
  return null;
}

async function purgeCloudflareCache() {
  const zoneId = getEnvVar("CLOUDFLARE_ZONE_ID");
  const apiToken = getEnvVar("CLOUDFLARE_API_TOKEN");

  if (!zoneId || !apiToken) {
    console.log("---------------------------------------------------------------");
    console.log("⚡ [Cloudflare Cache Purge Note]");
    console.log("CLOUDFLARE_ZONE_ID or CLOUDFLARE_API_TOKEN not set in environment.");
    console.log("To automate Cloudflare purging during deploy:");
    console.log("1. Create an API Token in Cloudflare with Zone.Cache Purge permissions.");
    console.log("2. Set CLOUDFLARE_ZONE_ID and CLOUDFLARE_API_TOKEN in .env.local.");
    console.log("---------------------------------------------------------------");
    return;
  }

  console.log("⚡ Purging Cloudflare Cache for zone:", zoneId);
  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ purge_everything: true }),
      },
    );

    const data = await response.json();
    if (data.success) {
      console.log("✅ Cloudflare Cache Purged Successfully!");
    } else {
      console.error("❌ Cloudflare Purge Failed:", data.errors);
    }
  } catch (err) {
    console.error("❌ Error purging Cloudflare cache:", err.message);
  }
}

purgeCloudflareCache();
