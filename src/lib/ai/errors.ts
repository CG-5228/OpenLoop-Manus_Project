export class ExtractionError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ExtractionError";
  }
}

export function invalidInput(message: string): never {
  throw new ExtractionError("INVALID_INPUT", message, 400);
}

export function invalidOutput(): never {
  throw new ExtractionError(
    "INVALID_MODEL_OUTPUT",
    "AI returned unsupported results. Please retry the analysis.",
    502,
  );
}
