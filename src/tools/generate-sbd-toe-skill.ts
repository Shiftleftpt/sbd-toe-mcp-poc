/**
 * generate_sbd_toe_skill
 *
 * Returns the canonical SbD-ToE agent guide content ready to be saved as a
 * skill or instructions file for any AI client. Content is read directly from
 * assets/agent-guide.md (served as sbd://toe/agent-guide) — nothing is invented.
 *
 * The calling agent decides where to save it based on the client context.
 */

import { readFileSync } from "node:fs";
import { resolveAppPath } from "../config.js";

export function handleGenerateSbdToeSkill(): { content: string } {
  const guidePath = resolveAppPath("assets/agent-guide.md");
  let guideContent: string;
  try {
    guideContent = readFileSync(guidePath, "utf-8");
  } catch {
    throw new Error("Could not read SbD-ToE agent guide from assets/agent-guide.md.");
  }

  const content =
    `<!-- SbD-ToE skill content — source: sbd://toe/agent-guide (@shiftleftpt/sbd-toe-mcp) -->\n` +
    `<!-- Re-run generate_sbd_toe_skill to refresh. -->\n\n` +
    guideContent;

  return { content };
}
