import fs from "node:fs";
const target = process.argv[2] || "config.js";
const config = {
  SUPABASE_URL: process.env.SUPABASE_URL || "",
  SUPABASE_PUBLISHABLE_KEY: process.env.SUPABASE_PUBLISHABLE_KEY || ""
};
fs.writeFileSync(target, `window.APP_CONFIG = ${JSON.stringify(config, null, 2)};\n`);
