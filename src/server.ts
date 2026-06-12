import express from 'express';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = parseInt(process.env.PORT || '3456', 10);

app.use(express.json({ limit: '10mb' }));

const WORDS = [
  'The', 'quick', 'brown', 'fox', 'jumps', 'over', 'the', 'lazy', 'dog',
  'Hello', 'world', 'this', 'is', 'a', 'simulated', 'response', 'from',
  'the', 'dummy', 'Anthropic', 'API', 'server', 'streaming', 'forever',
  'with', 'no', 'end', 'in', 'sight', 'just', 'endless', 'tokens',
];

const THINK_WORDS = [
  'Hmm', 'let', 'me', 'think', 'about', 'this', 'step', 'by', 'step',
  'First', 'I', 'need', 'to', 'consider', 'the', 'problem', 'carefully',
  'Breaking', 'this', 'down', 'into', 'smaller', 'parts', 'we', 'can',
  'analyze', 'each', 'component', 'separately', 'then', 'synthesize',
  'the', 'conclusion', 'Approaching', 'this', 'systematically',
];

function pickWords(words: string[], count: number): string {
  const result: string[] = [];
  for (let i = 0; i < count; i++) {
    result.push(words[Math.floor(Math.random() * words.length)]);
  }
  return result.join(' ') + ' ';
}

function shouldThink(): boolean {
  return Math.random() < 0.5;
}

function writeSSE(res: express.Response, event: string, data: unknown) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

app.post('/v1/messages', (req, res) => {
  const body = req.body;
  const model = body.model || 'dummy-model';
  const msgId = `msg_${uuidv4().replace(/-/g, '')}`;
  const isStream = body.stream === true;

  const usage = {
    input_tokens: body.messages ? JSON.stringify(body.messages).length >> 2 : 0,
    output_tokens: 0,
    cache_creation_input_tokens: 0,
    cache_read_input_tokens: 0,
  };

  if (!isStream) {
    const content: any[] = [];
    if (shouldThink()) {
      content.push({ type: 'thinking', thinking: pickWords(THINK_WORDS, 10) });
    }
    content.push({
      type: 'text',
      text: 'Hello! This is a simulated response from the dummy Anthropic API server.',
    });
    res.json({
      id: msgId,
      type: 'message',
      role: 'assistant',
      content,
      model,
      stop_reason: 'end_turn',
      stop_sequence: null,
      usage,
    });
    return;
  }

  // Streaming
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'x-request-id': uuidv4(),
  });

  writeSSE(res, 'message_start', {
    type: 'message_start',
    message: {
      id: msgId,
      type: 'message',
      role: 'assistant',
      content: [],
      model,
      usage,
    },
  });

  let running = true;
  let nextIndex = 0;

  function cycle() {
    if (!running) return;

    const textIndex = nextIndex++;

    writeSSE(res, 'content_block_start', {
      type: 'content_block_start',
      index: textIndex,
      content_block: { type: 'text', text: '' },
    });

    let textDone = false;
    let textElapsed = 0;
    const textDuration = 2000 + Math.random() * 5000;

    function textTick() {
      if (!running || textDone) return;
      writeSSE(res, 'content_block_delta', {
        type: 'content_block_delta',
        index: textIndex,
        delta: { type: 'text_delta', text: pickWords(WORDS, 3) },
      });
      textElapsed += 150;
      if (textElapsed >= textDuration) {
        textDone = true;
        writeSSE(res, 'content_block_stop', {
          type: 'content_block_stop',
          index: textIndex,
        });
        if (shouldThink()) {
          thinkCycle();
        } else {
          setTimeout(cycle, 300);
        }
      } else {
        setTimeout(textTick, 150);
      }
    }
    setTimeout(textTick, 150);
  }

  function thinkCycle() {
    if (!running) return;

    const thinkIndex = nextIndex++;

    writeSSE(res, 'content_block_start', {
      type: 'content_block_start',
      index: thinkIndex,
      content_block: { type: 'thinking', thinking: '' },
    });

    let thinkCount = 0;
    function thinkTick() {
      if (!running) return;
      writeSSE(res, 'content_block_delta', {
        type: 'content_block_delta',
        index: thinkIndex,
        delta: { type: 'thinking_delta', thinking: pickWords(THINK_WORDS, 2) },
      });
      thinkCount++;
      if (thinkCount >= 4 + Math.floor(Math.random() * 4)) {
        writeSSE(res, 'content_block_stop', {
          type: 'content_block_stop',
          index: thinkIndex,
        });
        setTimeout(cycle, 300);
      } else {
        setTimeout(thinkTick, 200);
      }
    }
    setTimeout(thinkTick, 200);
  }

  cycle();

  res.on('close', () => {
    running = false;
  });
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`dummy-llm-api running on http://localhost:${PORT}`);
  console.log(`POST /v1/messages (Anthropic Messages API)`);
});
