import type {
  ModelAdapter,
  ModelResponseMetadata,
} from "./types";
import type { TurnInput } from "@/src/core/types";

function invalidateJsonOutput(value: unknown): unknown {
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return JSON.stringify({
          ...(parsed as Record<string, unknown>),
          __technicalShakeoutInvalid: true,
        });
      }
    } catch {
      return value;
    }
    return value;
  }
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return {
      ...(value as Record<string, unknown>),
      __technicalShakeoutInvalid: true,
    };
  }
  return { value, __technicalShakeoutInvalid: true };
}

export class TechnicalFaultInjectionAdapter implements ModelAdapter {
  readonly name: string;
  readonly modelIdentifier: string;
  readonly promptVersion: string;
  readonly modelParameters: Readonly<Record<string, unknown>>;
  generationCalls = 0;
  repairCalls = 0;

  private invalidateNext = false;
  private failNextRepairTransport = false;
  private syntheticTransportFailure = false;

  constructor(private readonly delegate: ModelAdapter) {
    this.name = delegate.name;
    this.modelIdentifier = delegate.modelIdentifier;
    this.promptVersion = delegate.promptVersion;
    this.modelParameters = delegate.modelParameters;
  }

  forceInvalidNextGeneration(): void {
    this.invalidateNext = true;
  }

  forceNextRepairTransportFailure(): void {
    this.failNextRepairTransport = true;
  }

  async generateTurn(input: TurnInput): Promise<unknown> {
    this.generationCalls += 1;
    const output = await this.delegate.generateTurn(input);
    if (!this.invalidateNext) {
      return output;
    }
    this.invalidateNext = false;
    return invalidateJsonOutput(output);
  }

  async repairTurn(
    input: TurnInput,
    invalidOutput: unknown,
    validationErrors: string[],
  ): Promise<unknown> {
    this.repairCalls += 1;
    if (this.failNextRepairTransport) {
      this.failNextRepairTransport = false;
      this.syntheticTransportFailure = true;
      throw new Error("intentional technical shakeout repair transport fault");
    }
    this.syntheticTransportFailure = false;
    if (!this.delegate.repairTurn) {
      throw new Error("The delegated adapter does not support repair.");
    }
    return this.delegate.repairTurn(input, invalidOutput, validationErrors);
  }

  getLastResponseMetadata(): ModelResponseMetadata | null {
    if (this.syntheticTransportFailure) {
      return null;
    }
    return this.delegate.getLastResponseMetadata?.() ?? null;
  }
}
