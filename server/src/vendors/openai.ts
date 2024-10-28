import OpenAI from "openai";
import { ChatEngine } from "./chat_engine";

type ChatCompletionMessageParam =
  OpenAI.Chat.Completions.ChatCompletionMessageParam;

const STREAMING_NOT_SUPPORTED_MODELS = ["o1-preview", "o1-mini"];

const isStreamingNotSupported = (model: string) =>
  STREAMING_NOT_SUPPORTED_MODELS.some((m) => model.startsWith(m));

export class OpenAiChat implements ChatEngine {
  private model: string;

  private client: OpenAI;
  private messages: ChatCompletionMessageParam[] = [];

  private listeners: ((msg: string) => void)[] = [];
  private finishListeners: ((finishedMessage: string) => void)[] = [];

  constructor(
    apiKey: string,
    model: string,
    systemMsg: string,
    msgs: { role: "assistant" | "user"; content: string }[] = [],
    baseURL?: string
  ) {
    this.model = model;
    if (systemMsg && !isStreamingNotSupported(model)) {
      this.messages.push(system(systemMsg));
    }
    this.messages.push(...msgs);

    const params = baseURL ? { baseURL, apiKey } : { apiKey };
    this.client = new OpenAI(params);
  }

  async postMessage(input: string, _file?: { data: string; type: string }) {
    this.messages.push(user(input));

    // models like o1-preview and o1-mini do not support streaming
    if (isStreamingNotSupported(this.model)) {
      const result = await this.client.chat.completions.create({
        model: this.model,
        messages: this.messages,
      });

      const msg = result.choices[0]?.message?.content || "";
      this.messages.push(assistant(msg));

      // notify listeners
      this.listeners.forEach((l) => l(msg));
      this.finishListeners.forEach((l) => l(msg));
    } else {
      const stream = await this.client.chat.completions.create({
        model: this.model,
        messages: this.messages,
        stream: true,
      });

      let msg = "";

      for await (const part of stream) {
        // collect regular message
        const p = part.choices[0]?.delta?.content || "";
        if (p) {
          // notify listeners
          this.listeners.forEach((listener) => listener(p));
          msg += p;
        }
      }

      stream.controller.abort();
      this.messages.push(assistant(msg));

      // notify listeners
      this.finishListeners.forEach((l) => l(msg));
    }
  }

  async destroy() {
    this.messages = [];
    this.listeners = [];
    this.finishListeners = [];
  }

  // listeners

  onPartialReply(listener: (msg: string) => void) {
    this.listeners.push(listener);
  }

  onReplyFinish(l: (finishedMessage: string) => void) {
    this.finishListeners.push(l);
  }

  onError(l: (err: string) => void) {
    // TODO: implement error handling
  }

  // for plugins
  async oneTimeRun(input: string) {
    const result = await this.client.chat.completions.create({
      model: this.model,
      messages: [user(input)],
    });

    const msg = result.choices[0]?.message?.content || "";
    return msg;
  }
}

// helpers

function system(
  content: string
): OpenAI.Chat.Completions.ChatCompletionSystemMessageParam {
  return { role: "system", content };
}

function user(
  content: string
): OpenAI.Chat.Completions.ChatCompletionUserMessageParam {
  return { role: "user", content };
}

function assistant(
  content: string
): OpenAI.Chat.Completions.ChatCompletionAssistantMessageParam {
  return { role: "assistant", content };
}
