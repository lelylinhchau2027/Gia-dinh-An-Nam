#!/usr/bin/env python3
"""Extract only the selected UI images from a user-provided legacy IPA.

No executable code, credentials, or user data are copied. Original artwork
remains the property of its authors; this is not a redistribution license.
"""
import argparse
import hashlib
import zipfile
from pathlib import Path

ICONS = [
    "ic_activity_milk", "ic_activity_sleep", "ic_activity_wake_up",
    "ic_activity_breast_pump", "ic_activity_diaper", "ic_activity_weaning",
    "ic_activity_activity", "ic_activity_felling", "ic_activity_temperature",
    "ic_activity_medicine", "ic_activity_doctor", "ic_activity_condition",
    "ic_activity_spit_up", "ic_needle", "ic_easy_routine", "ic_medal.or8",
    "emoji_1", "ic_footprint", "ic_baby", "ic_fetus_red", "ic_mom_weight_scale",
    "ic_medal_hand.or8", "ic_medal_eye.or8", "ic_medal_crawling.or8",
    "ic_medal_talk.or8", "ic_medal_interactive.or8",
]
IMAGES = ["scale@2x", "scale@3x", "cute_tooth", "bg_cover_overlay@2x", "avatar_male"] + [f"bg_child_{i:02d}" for i in range(1, 9)]

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("ipa", type=Path)
    args = parser.parse_args()
    dest = Path(__file__).resolve().parents[1] / "assets" / "legacy"
    dest.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(args.ipa) as archive:
        for group, names in [("icons", ICONS), ("images", IMAGES)]:
            for name in names:
                source = f"Payload/becuame.app/assets/src/shared/assets/{group}/{name}.png"
                data = archive.read(source)
                if not data.startswith(b"\x89PNG\r\n\x1a\n"):
                    raise ValueError(f"Not a standard PNG: {source}")
                target = dest / f"{name.replace('@', '-')}.png"
                if target.exists() and target.read_bytes() != data:
                    raise ValueError(f"Refusing to replace modified asset: {target}")
                target.write_bytes(data)
                print(f"{target.name}: {hashlib.sha256(data).hexdigest()}")
        for name in ['Quicksand-Medium.ttf', 'Quicksand-SemiBold.ttf', 'Quicksand-Bold.ttf']:
            data = archive.read(f'Payload/becuame.app/{name}')
            target = dest / name
            if target.exists() and target.read_bytes() != data:
                raise ValueError(f'Refusing to replace modified font: {target}')
            target.write_bytes(data)
            print(f'{name}: {hashlib.sha256(data).hexdigest()}')

if __name__ == "__main__":
    main()
