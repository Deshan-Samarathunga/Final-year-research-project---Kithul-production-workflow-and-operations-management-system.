import { env } from "./env.js";
import { createApp } from "./app.js";

const app = createApp();

app.listen(env.PORT, env.HOST, () => {
  console.log(`KithulFlow API listening on http://${env.HOST}:${env.PORT}`);
});
