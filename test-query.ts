import { db } from "./src/shared/database/index.ts";
import { projects } from "./src/db/schema.ts";
import { eq } from "drizzle-orm";

async function run() {
  const allProjects = await db.select().from(projects);
  console.log(allProjects.map(p => ({ id: p.id, budget: p.budget, actualCost: p.actualCost })));
}
run();
