import { ConsoleEmailAdapter } from "./console";
import type { EmailAdapter } from "./types";

export type { EmailAdapter };

export const emailAdapter: EmailAdapter = new ConsoleEmailAdapter();
