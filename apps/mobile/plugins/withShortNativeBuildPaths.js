// Windows-only fix for native (CMake/ninja) builds failing with
//   ninja: error: manifest 'build.ninja' still dirty after 100 tries
// Ninja records CMake inputs as un-normalised paths such as
//   <module>/.cxx/RelWithDebInfo/<hash>/armeabi-v7a/../prefab/…/hermes-engineConfigVersion.cmake
// and, with the repo under C:\Users\…\Desktop\…, those strings pass the 260-char MAX_PATH. The ninja
// bundled with the Android SDK's CMake can't open long paths (even with LongPathsEnabled), reports
// the file as missing, and regenerates forever. Moving every module's .cxx staging folder to a
// short per-user location keeps those paths well under the limit. No effect on macOS/Linux/EAS.
const { withProjectBuildGradle } = require("expo/config-plugins");

const MARKER = "// legalfinder-short-native-build-paths";

const BLOCK = `${MARKER}
if (System.getProperty("os.name").toLowerCase().contains("windows")) {
  def lfCxxRoot = new File(System.getProperty("user.home"), ".cxx-lf")
  subprojects { sub ->
    ["com.android.library", "com.android.application"].each { pluginId ->
      sub.plugins.withId(pluginId) {
        sub.android.externalNativeBuild.cmake.buildStagingDirectory = new File(lfCxxRoot, sub.name)
      }
    }
  }
}
`;

module.exports = function withShortNativeBuildPaths(config) {
  return withProjectBuildGradle(config, (mod) => {
    const gradle = mod.modResults.contents;
    if (gradle.includes(MARKER)) return mod;
    // Must run before the React Native root plugin, which evaluates :app (and its native deps)
    // immediately — a hook registered after it would be too late to change their DSL.
    const anchor = /^apply plugin: "expo-root-project"/m;
    mod.modResults.contents = anchor.test(gradle)
      ? gradle.replace(anchor, `${BLOCK}\napply plugin: "expo-root-project"`)
      : gradle.replace(/^apply plugin:/m, `${BLOCK}\napply plugin:`);
    return mod;
  });
};
