// Ignora un secondo tocco mentre il primo sta ancora lavorando (es. doppio tap su Avvia).
export async function esclusivo(blocco: { current: boolean }, lavoro: () => Promise<void>): Promise<void> {
  if (blocco.current) return;
  blocco.current = true;
  try {
    await lavoro();
  } finally {
    blocco.current = false;
  }
}
