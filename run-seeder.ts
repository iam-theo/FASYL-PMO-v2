import { seedNotifications } from "./src/modules/notifications/infrastructure/seeder";
seedNotifications().then(() => {
  console.log("Done");
  process.exit(0);
}).catch(console.error);
