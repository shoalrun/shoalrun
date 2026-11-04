import { loadConfig } from './config.js';
import { prepareAskRuntime, type AskSetup, type AskSetupInput } from './ask-runtime.js';

export { parseReaderView } from './ask-runtime.js';
export type { AskSetup, AskSetupInput } from './ask-runtime.js';

// Local authoring/evaluation accepts a source config. Hosted functions import
// ask-runtime directly and receive already-resolved settings instead.
export async function prepareAsk(input: AskSetupInput): Promise<AskSetup> {
  if (!input.settings && !input.configFile) throw new Error('prepareAsk needs a config file or settings');
  const settings = input.settings ?? (await loadConfig(input.configFile as string)).value;
  return prepareAskRuntime({ ...input, settings });
}
