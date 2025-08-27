import dotenv from "dotenv";
dotenv.config();
import { ctJsonGet } from "../commercetools/client";

async function main() {
  try {
    const project = await ctJsonGet("");
    console.log("Project info:");
    console.dir(project, { depth: null });
  } catch (err: any) {
    console.error("Error fetching project info:", err.message);
  }
}

main();
