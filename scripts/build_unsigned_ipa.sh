#!/usr/bin/env bash
set -euo pipefail
shopt -s nullglob

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "Lỗi: build iOS cần macOS có Xcode. Hãy chạy script này trên Mac hoặc GitHub Actions macOS."
  exit 2
fi

for required_command in node npm xcodebuild pod zip unzip codesign; do
  if ! command -v "$required_command" >/dev/null 2>&1; then
    echo "Lỗi: thiếu lệnh $required_command."
    exit 2
  fi
done

node -e '
  const [major, minor] = process.versions.node.split(".").map(Number);
  if (major < 22 || (major === 22 && minor < 13)) {
    console.error(`Lỗi: Expo SDK 57 cần Node.js 22.13+, hiện tại là ${process.versions.node}.`);
    process.exit(2);
  }
'

xcode_version="$(xcodebuild -version | awk 'NR == 1 { print $2 }')"
xcode_major="${xcode_version%%.*}"
xcode_minor_part="${xcode_version#*.}"
xcode_minor="${xcode_minor_part%%.*}"
if (( xcode_major < 26 || (xcode_major == 26 && xcode_minor < 4) )); then
  echo "Lỗi: Expo SDK 57 cần Xcode 26.4+, hiện tại là $xcode_version."
  exit 2
fi

if [[ -z "${EXPO_PUBLIC_SUPABASE_URL:-}" || -z "${EXPO_PUBLIC_SUPABASE_ANON_KEY:-}" ]]; then
  if [[ "${ALLOW_LOCAL_ONLY:-0}" != "1" ]]; then
    echo "Lỗi: thiếu EXPO_PUBLIC_SUPABASE_URL hoặc EXPO_PUBLIC_SUPABASE_ANON_KEY."
    echo "Đặt ALLOW_LOCAL_ONLY=1 chỉ khi chủ ý build bản không đồng bộ."
    exit 2
  fi
  echo "Cảnh báo: đang build bản local-only, hai thiết bị sẽ không đồng bộ."
fi

if [[ -n "${EXPO_PUBLIC_SUPABASE_URL:-}" && ! "$EXPO_PUBLIC_SUPABASE_URL" =~ ^https://[^/]+\.supabase\.co/?$ ]]; then
  echo "Lỗi: EXPO_PUBLIC_SUPABASE_URL không đúng dạng https://PROJECT.supabase.co."
  exit 2
fi

if [[ -z "${EXPO_PUBLIC_EAS_PROJECT_ID:-}" ]]; then
  if [[ "${ALLOW_REMOTE_PUSH_DISABLED:-0}" != "1" ]]; then
    echo "Lỗi: thiếu EXPO_PUBLIC_EAS_PROJECT_ID; Expo remote push sẽ không đăng ký được."
    echo "Đặt ALLOW_REMOTE_PUSH_DISABLED=1 chỉ khi chủ ý build bản không có remote push."
    exit 2
  fi
  echo "Cảnh báo: đang build bản không có remote push."
fi


if [[ -n "${EXPO_PUBLIC_EAS_PROJECT_ID:-}" && ! "$EXPO_PUBLIC_EAS_PROJECT_ID" =~ ^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$ ]]; then
  echo "Lỗi: EXPO_PUBLIC_EAS_PROJECT_ID phải là UUID của Expo project."
  exit 2
fi

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
project_root="$(cd "$script_dir/.." && pwd)"
output_dir="${OUTPUT_DIR:-$project_root/build/ios}"
working_root="$(mktemp -d "${TMPDIR:-/tmp}/gia-dinh-an-nam-ios.XXXXXX")"
source_root="$working_root/source"
archive_path="$working_root/GiaDinhAnNam.xcarchive"
derived_data="$working_root/DerivedData"
package_root="$working_root/package"
ipa_path="$output_dir/Gia-Dinh-An-Nam-unsigned.ipa"

cleanup() {
  if [[ "${KEEP_BUILD_DIR:-0}" == "1" ]]; then
    echo "Giữ thư mục build tạm: $working_root"
  else
    find "$working_root" -depth -delete 2>/dev/null || true
  fi
}
trap cleanup EXIT

mkdir -p "$source_root" "$output_dir" "$package_root/Payload"

for item in app assets src app.json package.json package-lock.json tsconfig.json metro.config.js; do
  cp -R "$project_root/$item" "$source_root/"
done

cd "$source_root"
npm ci
CI=1 npx expo prebuild --platform ios --clean --no-install

cd "$source_root/ios"
pod install --repo-update

workspace_candidates=("$source_root"/ios/*.xcworkspace)
scheme_candidates=("$source_root"/ios/*.xcodeproj/xcshareddata/xcschemes/*.xcscheme)
if (( ${#workspace_candidates[@]} == 0 || ${#scheme_candidates[@]} == 0 )); then
  echo "Lỗi: không tìm thấy Xcode workspace hoặc shared scheme sau prebuild."
  exit 3
fi
workspace_path="${workspace_candidates[0]}"
scheme_file="${scheme_candidates[0]}"
scheme_name="$(basename "$scheme_file" .xcscheme)"

NODE_ENV=production xcodebuild \
  -workspace "$workspace_path" \
  -scheme "$scheme_name" \
  -configuration Release \
  -sdk iphoneos \
  -destination 'generic/platform=iOS' \
  -archivePath "$archive_path" \
  -derivedDataPath "$derived_data" \
  CODE_SIGNING_ALLOWED=NO \
  CODE_SIGNING_REQUIRED=NO \
  CODE_SIGN_IDENTITY='' \
  CODE_SIGN_ENTITLEMENTS='' \
  PROVISIONING_PROFILE_SPECIFIER='' \
  DEVELOPMENT_TEAM='' \
  archive

app_candidates=("$archive_path"/Products/Applications/*.app)
if (( ${#app_candidates[@]} == 0 )); then
  echo "Lỗi: Xcode không tạo ra .app trong archive."
  exit 4
fi
app_path="${app_candidates[0]}"

if codesign --verify --deep --strict "$app_path" >/dev/null 2>&1; then
  echo "Lỗi: sản phẩm bất ngờ đã được ký; dừng để tránh phát hành nhầm artifact."
  exit 5
fi

cp -R "$app_path" "$package_root/Payload/"
cd "$package_root"
zip -qry "$ipa_path" Payload
unzip -t "$ipa_path" >/dev/null

shasum -a 256 "$ipa_path" | tee "$ipa_path.sha256"
echo "Đã tạo IPA chưa ký: $ipa_path"
echo "Hãy ký toàn bộ app/framework bằng ESign với profile đúng bundle ID vn.giadinhanam.family."
