export type Phase1ModelConfig = {
  anchor: string;
  pestel: string;
  segments: string;
  resources: string;
  competitors: string;
  synthesis: string;
  repair: string;
  consistency: string;
};

export function modelForModule(
  config: Phase1ModelConfig,
  module:
    | "anchor"
    | "pestel"
    | "segments"
    | "resources"
    | "competitors"
    | "synthesis"
    | "repair"
    | "consistency"
): string {
  return config[module];
}
