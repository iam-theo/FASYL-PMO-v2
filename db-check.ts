import { db } from "./src/shared/database/index.ts";
import { users } from "./src/db/schema.ts";

async function main() {
  try {
    const allUsers = await db.select().from(users);
    console.log("Users total:", allUsers.length);
    allUsers.forEach(u => {
      console.log(`ID: ${u.id}, Email: ${u.email}, FirstName: ${u.firstName}, Username: ${u.username}`);
    });
  } catch (err) {
    console.error("Error connecting to database:", err);
  }
  process.exit(0);
}

main();
