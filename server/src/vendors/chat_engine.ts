export interface ChatEngine {
  postMessage(input: string, file?: { data: string; type: string }): void;
  destroy(): void;
  oneTimeRun(input: string): Promise<string>;
  onPartialReply(listener: (msg: string) => void): void;
  onReplyFinish(l: (finishedMessage: string) => void): void;
  onError(l: (err: string) => void): void;
}
