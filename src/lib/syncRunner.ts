// Keep one trailing sync when a write arrives during an in-flight sync.
// Previously that request was discarded until the next 60-second timer.
export function coalescedTask(work: () => Promise<void>) {
  let running: Promise<void> | null = null;
  let requested = false;
  return () => {
    requested = true;
    if (!running) {
      // Defer work until `running` is assigned; clear it in the same turn as
      // the final queue check, without a separate .finally() microtask gap.
      running = Promise.resolve().then(async () => {
        try {
          while (requested) {
            requested = false;
            await work();
          }
        } finally {
          running = null;
        }
      });
    }
    return running;
  };
}
