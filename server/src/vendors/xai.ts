import { ChatEngine, ReplyMsgKind } from "./chat_engine";
import { OpenAiChat } from "./openai";

const BASE_URL = "https://api.x.ai/v1";

// since XAI is compatible with OpenAI,
// we will reuse it
export class XAiChat implements ChatEngine {
  private engine: OpenAiChat;

  constructor(
    apiKey: string,
    model: string,
    systemMsg: string,
    msgs: { role: "assistant" | "user"; content: string }[] = []
  ) {
    this.engine = new OpenAiChat(apiKey, model, systemMsg, msgs, BASE_URL);
  }

  async postMessage(input: string, file?: { data: string; type: string }) {
    return this.engine.postMessage(input, file);
  }

  async destroy() {
    this.engine.destroy();
  }

  // listeners

  onPartialReply(listener: (msg: string, kind: ReplyMsgKind) => void) {
    this.engine.onPartialReply(listener);
  }

  onReplyFinish(l: (finishedMessage: string, reasoning: string) => void) {
    this.engine.onReplyFinish(l);
  }

  onError(l: (err: string) => void) {
    this.engine.onError(l);
  }

  // for plugins
  async oneTimeRun(input: string) {
    return this.engine.oneTimeRun(input);
  }
}
