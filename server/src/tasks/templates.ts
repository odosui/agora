import ConfigFile from "../config_file";
import { url2md } from "../url2md";
import { AnthropicChat } from "../vendors/anthropic";
import { OpenAiChat } from "../vendors/openai";
import { DEFAULT_SYSTEM } from "../web_socket";

export interface Template {
  id: string;
  name: string;
  description: string;
  flow: string;
}

const summarizeWebsites: Template = {
  id: "summarize_websites",
  name: "Summarize Websites",
  description: "Summarize a list of websites",
  flow: `|> url2md |> chat::GPT-4o::"Please summarize the following news websites. What are the main stories (around 5-7)? Please provide links to full stories. Please be super-concise. Please prioritize the most recent stories. Please use the language used in the website. So if the website is Russian, write your output in Russian. \n\n $$"`,
};

const topHackerNews: Template = {
  id: "top_hacker_news",
  name: "Top Hacker News",
  description: "Fetch top stories from Hacker News",
  flow: `|> url2md |> chat::GPT-4o::"What are the top stories from the hackernews? See below. Please output in markdown. Please include 10 stories, along with number of comments and voites. \n\n $$"`,
};

export const templates: Template[] = [summarizeWebsites, topHackerNews];

const services: Record<
  string,
  (input: string[], conf: string[]) => Promise<string[]>
> = {
  url2md: async (urls) => {
    const results: Record<string, string> = {};

    await Promise.all(
      urls.map(async (url) => {
        const md = await url2md(url);
        results[url] = md;
      })
    );

    return Object.entries(results).map(([url, md]) => `## ${url}\n${md}`);
  },
  chat: async (input, conf) => {
    const model = conf[0];
    const prompt = conf[1];

    const promtWithInput = prompt.replace("$$", input.join("\n\n"));

    const config: ConfigFile | null = await ConfigFile.readConfig();

    if (!config) {
      throw new Error("Config file not found");
    }

    const p = config.profiles[model];

    const ChatEngine = p.vendor === "openai" ? OpenAiChat : AnthropicChat;

    const chatEngine = new ChatEngine(
      p.vendor === "openai" ? config.openai_key : config.anthropic_key,
      p.model,
      p.system ?? DEFAULT_SYSTEM,
      []
    );

    const response = await chatEngine.oneTimeRun(promtWithInput);

    return [response];
  },
};

export async function runTemplate(templateName: string, input: string[]) {
  console.log("runTemplate", templateName, input);

  const template = templates.find((t) => t.id === templateName);

  if (!template) {
    throw new Error(`Template ${templateName} not registered`);
  }

  const flow = template.flow;

  const steps = flow
    .split("|>")
    .map((s) => s.trim())
    .filter((s) => s);

  console.log("steps", steps.join(" |> "));

  for await (const step of steps) {
    const [serviceName, ...conf] = step.split("::");

    const serviceFn = services[serviceName];

    if (!serviceFn) {
      throw new Error(`Service ${serviceName} not registered`);
    }

    input = await serviceFn(input, conf);
  }

  return input.join("\n\n");
}
