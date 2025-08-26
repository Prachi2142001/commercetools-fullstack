import dotenv from "dotenv";
dotenv.config();
import { ctGet } from "../ct/client";

async function main() {
  try {
    const project = await ctGet(""); // GET /{projectKey}
    console.log("✅ Project info:");
    console.dir(project, { depth: null });
  } catch (err: any) {
    console.error("❌ Error fetching project info:", err.message);
  }
}

main();
