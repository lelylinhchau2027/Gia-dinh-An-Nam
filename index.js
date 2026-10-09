// Install local diagnostics before Router evaluates screen modules.
require("./src/lib/crashReporting").installCrashReporting();
require("expo-router/entry");
