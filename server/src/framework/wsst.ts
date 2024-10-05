import ws from "ws";

// Both input and output messages must have a "type" field
// The "payload" field can be anything
type WsstMessage = { type: string; payload: unknown };

// I is the type of the input message
// O is the type of the output message
export function startWsServer<I extends WsstMessage>(
  options: ws.ServerOptions
) {
  const wsServer = new ws.Server(options);

  type MessageType = I["type"];
  type Payload<T extends MessageType> = Extract<I, { type: T }>["payload"];

  type Handler<T extends MessageType> = (
    payload: Payload<T>,
    context: { sendMsg: (message: WsstMessage) => void }
  ) => Promise<void>;

  type Handlers = {
    [T in MessageType]: Handler<T>;
  };

  const handlers: Handlers = {} as Handlers;

  function on<T extends MessageType>(type: T, handler: Handler<T>) {
    handlers[type] = handler;
    return chainedApi;
  }

  wsServer.on("connection", (wsSess) => {
    wsSess.on("message", async (m) => {
      const messageStr = asString(m);

      if (messageStr === null) {
        return;
      }

      const data = JSON.parse(messageStr) as I;
      const handler = handlers[data.type as MessageType];

      const apiForHandler = {
        sendMsg: (message: WsstMessage) => {
          wsSess.send(JSON.stringify(message));
        },
      };

      await handler(data.payload, apiForHandler);
    });
  });

  const chainedApi = {
    on,
  };

  return chainedApi;
}

function asString(message: ws.RawData) {
  if (message instanceof Buffer) {
    return message.toString();
  } else if (typeof message === "string") {
    return message;
  } else {
    // log("Error: Received message is not a string");
    return null;
  }
}
