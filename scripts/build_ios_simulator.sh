#!/usr/bin/env bash
set -euo pipefail
shopt -s nullglob

if [[ "$(uname -s)" != Darwin ]]; then
  echo 'Simulator build requires macOS/Xcode; run Check iOS UI on GitHub Actions.'
  exit 2
fi
if [[ -z "${SIMULATOR_UDID:-}" ]]; then
  echo 'Set SIMULATOR_UDID to an available, booted iPhone Simulator.'
  exit 2
fi

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
native_work_root="$(mktemp -d "${RUNNER_TEMP:-${TMPDIR:-/tmp}}/an-nam-ui.XXXXXX")"
source_root="$native_work_root/source"
output_dir="$project_root/build/simulator"
mkdir -p "$source_root" "$output_dir"
# Clean prebuild only operates on a newly-created copy, never the user's ios/.
for item in app assets src tests supabase index.js app.json package.json package-lock.json tsconfig.json metro.config.js; do
  cp -R "$project_root/$item" "$source_root/"
done
cd "$source_root"
# Simulator screenshots must contain demo data, never a real family session.
export EXPO_NO_DOTENV=1
export EXPO_NO_TELEMETRY=1
export EXPO_PUBLIC_SUPABASE_URL=''
export EXPO_PUBLIC_SUPABASE_ANON_KEY=''
export EXPO_PUBLIC_EAS_PROJECT_ID=''
npm ci
npm test
npm run typecheck
CI=1 npx expo prebuild --platform ios --clean --no-install
cd ios
pod install --repo-update
workspaces=("$source_root"/ios/*.xcworkspace)
schemes=("$source_root"/ios/*.xcodeproj/xcshareddata/xcschemes/*.xcscheme)
if (( ${#workspaces[@]} != 1 || ${#schemes[@]} != 1 )); then
  echo 'Expected one generated workspace and shared scheme.'
  exit 3
fi
scheme_name="$(basename "${schemes[0]}" .xcscheme)"
NODE_ENV=production xcodebuild \
  -workspace "${workspaces[0]}" -scheme "$scheme_name" \
  -configuration Release -sdk iphonesimulator \
  -destination "id=$SIMULATOR_UDID" \
  -derivedDataPath "$native_work_root/DerivedData" \
  CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO build
apps=("$native_work_root"/DerivedData/Build/Products/Release-iphonesimulator/*.app)
if (( ${#apps[@]} != 1 )); then
  echo 'Expected one simulator application.'
  exit 4
fi
cp -R "${apps[0]}" "$output_dir/"
xcrun simctl install "$SIMULATOR_UDID" "${apps[0]}"
echo "Simulator app installed. Temporary build is $native_work_root (runner cleans it at job end)."
