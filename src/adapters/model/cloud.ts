import { DEFAULT_MODEL_PARAMETERS, PROMPT_VERSION } from "@/src/core/constants";
import {
  renderRepairPrompt,
  renderResidentPrompt,
  RESIDENT_SYSTEM_PROMPT,
} from "@/src/core/prompt";
import type { TurnInput } from "@/src/core/types";
import type {
  ModelAdapter,
  ModelResponseMetadata,
} from "./types";

type OpenAICompatibleResponse = {
  choices?: Array<{
    message?: {
      content?: unknown;
    };
    finish_reason?: string | null;
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
  };
  model?: string;
  error?: {
    message?: string;
  };
};

function redactCredential(message: string, credential: string): string {
  return credential.length > 0 ? message.split(credential).join("[REDACTED]") : message;
}

export type CloudModelOptions = {
  endpoint: string;
  apiKey: string;
  modelIdentifier: string;
  temperature?: number;
  maxOutputTokens?: number;
  fetchImpl?: typeof fetch;
};

export class CloudModelAdapter implements ModelAdapter {
  readonly name = "openai-compatible";
  readonly modelIdentifier: string;
  readonly promptVersion = PROMPT_VERSION;
  readonly modelParameters: Readonly<Record<string, unknown>>;
  private readonly endpoint: string;
  private readonly apiKey: string;
  private readonly temperature: number;
  private readonly maxOutputTokens: number;
  private readonly fetchImpl: typeof fetch;
  private lastResponseMetadata: ModelResponseMetadata | null = null;

  constructor(options: CloudModelOptions) {
    this.endpoint = options.endpoint;
    this.apiKey = options.apiKey;
    this.modelIdentifier = options.modelIdentifier;
    this.temperature =
      options.temperature ?? DEFAULT_MODEL_PARAMETERS.temperature;
    this.maxOutputTokens =
      options.maxOutputTokens ?? DEFAULT_MODEL_PARAMETERS.maxOutputTokens;
    this.modelParameters = {
      temperature: this.temperature,
      maxOutputTokens: this.maxOutputTokens,
      responseFormat: "json_object",
    };
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async generateTurn(input: TurnInput): Promise<unknown> {
    return this.request(renderResidentPrompt(input));
  }

  async repairTurn(
    input: TurnInput,
    invalidOutput: unknown,
    validationErrors: string[],
  ): Promise<unknown> {
    return this.request(
      renderRepairPrompt(input, invalidOutput, validationErrors),
    );
  }

  private async request(userPrompt: string): Promise<unknown> {
    const response = await this.fetchImpl(this.endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer " + this.apiKey,
      },
      body: JSON.stringify({
        model: this.modelIdentifier,
        messages: [
          { role: "system", content: RESIDENT_SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: this.temperature,
        max_tokens: this.maxOutputTokens,
        response_format: { type: "json_object" },
      }),
    });

    const payload = (await response.json()) as OpenAICompatibleResponse;
    if (!response.ok) {
      throw new Error(
        redactCredential(
          "Cloud model request failed: " +
            (payload.error?.message ?? response.statusText),
          this.apiKey,
        ),
      );
    }
    const content = payload.choices?.[0]?.message?.content;
    if (content === undefined) {
      throw new Error("Cloud model returned no message content.");
    }
    this.lastResponseMetadata = {
      providerModel: payload.model ?? this.modelIdentifier,
      inputTokens: payload.usage?.prompt_tokens ?? null,
      outputTokens: payload.usage?.completion_tokens ?? null,
      finishReason: payload.choices?.[0]?.finish_reason ?? null,
    };
    return content;
  }

  getLastResponseMetadata(): ModelResponseMetadata | null {
    return this.lastResponseMetadata;
  }
}
