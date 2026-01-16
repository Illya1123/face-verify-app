#!/usr/bin/env bash
set -e

APP_ID="com.illyachan.faceverify"

source "$(dirname "$0")/android-device.sh"

adb -s "$ANDROID_DEVICE" shell monkey \
  -p "$APP_ID" \
  -c android.intent.category.LAUNCHER 1
