export type ReplyMsgKind = "regular" | "reasoning";

export interface ChatEngine {
  postMessage(input: string, file?: { data: string; type: string }): void;
  destroy(): void;
  oneTimeRun(input: string): Promise<string>;
  onPartialReply(listener: (msg: string, kind: ReplyMsgKind) => void): void;
  onReplyFinish(l: (finishedMessage: string, reasoning: string) => void): void;
  onError(l: (err: string) => void): void;
}
