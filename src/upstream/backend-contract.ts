import { readFile } from "node:fs/promises";

import { getConfig } from "../config.js";
import type { BackendCheckout } from "../types.js";

let cachedCheckout: BackendCheckout | undefined;

function validateCheckout(payload: unknown): BackendCheckout {
  if (!payload || typeof payload !== "object") {
    throw new Error("O ficheiro de checkout do backend está vazio ou é inválido.");
  }

  const checkout = payload as BackendCheckout;
  if (!checkout.indices?.docs?.indexName || !checkout.indices?.entities?.indexName) {
    throw new Error(
      "O checkout do backend não contém os índices documentais e estruturados esperados."
    );
  }

  return checkout;
}

export async function tryLoadBackendCheckout(): Promise<BackendCheckout | undefined> {
  if (cachedCheckout) {
    return cachedCheckout;
  }

  const config = getConfig();

  let rawFile: string;
  try {
    rawFile = await readFile(config.backend.checkoutFile, "utf8");
  } catch {
    return undefined;
  }

  cachedCheckout = validateCheckout(JSON.parse(rawFile) as unknown);
  return cachedCheckout;
}

export async function loadBackendCheckout(): Promise<BackendCheckout> {
  const checkout = await tryLoadBackendCheckout();
  if (!checkout) {
    const config = getConfig();
    throw new Error(
      `Falta o ficheiro de checkout do backend em "${config.backend.checkoutFile}". Corre "npm run checkout:backend" primeiro.`
    );
  }
  return checkout;
}
