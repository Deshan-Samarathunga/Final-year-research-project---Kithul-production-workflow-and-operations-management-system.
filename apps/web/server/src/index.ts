import { env } from "./env.js";
import { createApp } from "./app.js";

const app = createApp();

app.listen(env.PORT, () => {
  console.log(`KithulFlow API listening on http://localhost:${env.PORT}`);
});
