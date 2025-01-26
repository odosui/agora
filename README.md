# Multichat AI

Chat with multiple AI models at once.

<p>
  <div>
    <img src="./img/agora.png" width="100%" alt="Multichat AI Screenshot" />
  </div>
</p>

## Features

- Chat with multiple AI models at once
- **OpenAI**, **Anthropic**, and **xAI** models supported
- Multiple profiles with different system prompts
- The OpenAI's new `o1-mini`, and `o1-preview` models are supported. But they don't allow streaming.

## Installation

Both `server` and `client` dependencies need to be installed.

```bash
cd server
npm install

cd ../client
npm install
```

## Usage

Multichat AI requires a PostgreSQL database to store chat logs. You can install it locally or use a cloud service. The database url must be provided in the configuration file.

Create a configuration file at `server/config.json` that looks like this:

```json
{
  "database_url": "postgresql://agora:<YOUR_PASSWORD>@localhost:5432/agora",
  "openai_key": "<YOUR_OPENAI_KEY>",
  "anthropic_key": "<YOUR_ANTHROPIC_KEY>",
  "xai_key": "<XAI_KEY>",
  "profiles": {
    "o1-preview": {
      "vendor": "openai",
      "model": "o1-preview"
    },
    "o1-mini": {
      "vendor": "openai",
      "model": "o1-mini"
    },
    "GPT-4o": {
      "vendor": "openai",
      "model": "gpt-4o",
      "system": "You are a helpful assistant. You reply concisely and straightforwardly."
    },
    "claude-3-5-sonnet": {
      "vendor": "anthropic",
      "model": "claude-3-5-sonnet-20240620",
      "system": "You are a helpful assistant. You reply concisely and straightforwardly."
    },
    "claude-3-5-sonnet": {
      "vendor": "anthropic",
      "model": "claude-3-5-sonnet-20240620",
      "system": "You are a helpful assistant. You reply concisely and straightforwardly."
    },
    {
      "grok": {
        "vendor": "xai",
        "model": "grok-beta",
        "system": "You are a helpful assistant. You reply concisely and straightforwardly."
      }
    }
    // Add more models here
  }
}
```

Start the server:

```bash
cd server
npm run dev
```

Start the client:

```bash
cd client
npm run dev
```
