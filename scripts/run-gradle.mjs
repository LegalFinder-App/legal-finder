// Cross-platform Gradle wrapper invocation for platforms/mobile/android. The previous npm
// scripts used a bash conditional (`test -f gradlew.bat && ./gradlew.bat ... || ./gradlew ...`)
// to pick the right wrapper — that's bash syntax, and npm on Windows runs scripts through
// cmd.exe by default (`npm config get script-shell` is unset here), which doesn't understand
// `test` or the && / || short-circuiting the same way. Picking the wrapper by process.platform
// instead works under any shell.
import { spawnSync } from "node:child_process";
import { platform } from "node:os";
import { join } from "node:path";

const task = process.argv[2];
if (!task) {
  console.error("Usage: node scripts/run-gradle.mjs <gradle-task>");
  process.exit(1);
}

const androidDir = join(process.cwd(), "platforms", "mobile", "android");
const wrapper = join(androidDir, platform() === "win32" ? "gradlew.bat" : "gradlew");

const result = spawnSync(wrapper, [task], {
  cwd: androidDir,
  stdio: "inherit",
  shell: true,
});

process.exit(result.status ?? 1);
