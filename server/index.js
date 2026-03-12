import { PORT } from "./config.js";
import { createApp } from "./app.js";

const app = createApp();

app.listen(PORT, () => {
  console.log(`Food Story backend listening on http://localhost:${PORT}`);
});
