import { runRest } from "./rest";
import { runWS } from "./web_socket";

async function main() {
  // main express.js server for REST API
  const server = await runRest();

  // websocket server for chat communication
  await runWS(server);
}

main();
