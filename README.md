# dummy-llm-api

Dummy LLM API server. Currently supports the Anthropic Messages API format (`/v1/messages`), designed to be extended with OpenAI support in the future. Streams infinite simulated responses with random thinking blocks.

Useful for testing Claude Code integrations, UI prototyping, or load testing without burning API credits.

## Quick Start

```bash
git clone https://github.com/omeraydindev/dummy-llm-api.git
cd dummy-llm-api
npm install
npm start
```

### Claude Code CLI

Run the server, then set these env vars before launching Claude Code:

```bash
export ANTHROPIC_BASE_URL=http://127.0.0.1:3456
export ANTHROPIC_AUTH_TOKEN=unused
export CLAUDE_CODE_SKIP_AUTH_LOGIN=true
claude
```

### Claude Code VSCode Extension

Add to your VSCode `settings.json`:

```json
"claudeCode.environmentVariables": [
  {"name": "ANTHROPIC_BASE_URL", "value": "http://127.0.0.1:3456"},
  {"name": "ANTHROPIC_AUTH_TOKEN", "value": "unused"},
  {"name": "CLAUDE_CODE_SKIP_AUTH_LOGIN", "value": "true"}
]
```

## Behavior

### Anthropic Messages API (`POST /v1/messages`)

- **Non-streaming** — returns a single response, randomly includes a `thinking` block before the `text` block.
- **Streaming** (`stream: true`) — cycles through text blocks (2-7s each), with a ~50% chance of a thinking block between them, repeating forever. The stream never ends.
- **Health check** — `GET /health` returns `{"status":"ok"}`.

### Response shape

The server speaks the standard [Anthropic Messages API](https://docs.anthropic.com/en/api/messages) format.

Streaming event sequence:

```
event: message_start
event: content_block_start (text or thinking)
event: content_block_delta (text_delta or thinking_delta)
       ... repeats every 150ms ...
event: content_block_stop
event: content_block_start (next block, 300ms gap)
       ... cycles forever ...
```

No `message_delta` or `message_stop` is ever sent — the response streams indefinitely.

## Configuration

| Env var | Default | Description |
|---|---|---|
| `PORT` | `3456` | Port to listen on |

## CLI Curl Test

```bash
# Non-streaming
curl -s http://localhost:3456/v1/messages \
  -H 'Content-Type: application/json' \
  -d '{"model":"test","max_tokens":256,"messages":[{"role":"user","content":"hi"}]}'

# Streaming (infinite — Ctrl-C to stop)
curl -N http://localhost:3456/v1/messages \
  -H 'Content-Type: application/json' \
  -d '{"model":"test","max_tokens":256,"stream":true,"messages":[{"role":"user","content":"hi"}]}'
```
