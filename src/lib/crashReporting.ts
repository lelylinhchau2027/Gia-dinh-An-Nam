import { File, Paths } from "expo-file-system";
import { Platform } from "react-native";
import Constants from "expo-constants";

let screen = "startup";
let installed = false;
let writing = false;
export function setDiagnosticScreen(value: string) {
  screen = value;
}
export function redactReport(value: string) {
  return value
    .replace(/https?:\/\/[^\s)"']+/g, "[URL ẩn]")
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, "[token ẩn]")
    .slice(0, 16000);
}
function reportFile() {
  return new File(Paths.document, "an-nam-last-error.json");
}
export function readCrashReport(): string | null {
  try {
    return Platform.OS !== "web" && reportFile().exists
      ? reportFile().textSync()
      : null;
  } catch {
    return null;
  }
}
function saveError(error: any, fatal: boolean) {
  if (Platform.OS === "web" || writing || !fatal) return;
  writing = true;
  try {
    // Synchronous write: AsyncStorage can be interrupted by RCTFatal/SIGABRT.
    reportFile().write(
      redactReport(
        JSON.stringify(
          {
            version: Constants.expoConfig?.version,
            os: Platform.OS,
            osVersion: Platform.Version,
            at: new Date().toISOString(),
            screen,
            fatal,
            message: String(error?.message ?? error),
            stack: error?.stack,
            componentStack: error?.componentStack,
          },
          null,
          2,
        ),
      ),
    );
  } catch {
    /* Diagnostics must never replace the original error. */
  } finally {
    writing = false;
  }
}
export function installCrashReporting() {
  if (installed || Platform.OS === "web") return;
  installed = true;
  const runtime = globalThis as typeof globalThis & {
    RN$registerExceptionListener?: (listener: (e: any) => void) => void;
    ErrorUtils?: {
      getGlobalHandler: () => (e: any, fatal?: boolean) => void;
      setGlobalHandler: (handler: (e: any, fatal?: boolean) => void) => void;
    };
  };
  if (runtime.RN$registerExceptionListener) {
    // RN 0.86's C++ exception pipeline invokes this before reportFatal.
    // Never preventDefault: persisting a report is NOT fixing the exception.
    runtime.RN$registerExceptionListener((e) => saveError(e, !!e.isFatal));
  } else if (runtime.ErrorUtils) {
    const previous = runtime.ErrorUtils.getGlobalHandler();
    runtime.ErrorUtils.setGlobalHandler((e, fatal) => {
      saveError(e, !!fatal);
      previous(e, fatal);
    });
  }
}
