#!/usr/bin/env bash
set -e

APP_ID="com.illyachan.faceverify"

echo "▶ Building web"
npm run build

echo "▶ Sync Capacitor"
npx cap sync android

echo "▶ Installing Android app"
cd android
./gradlew installDebug
cd ..

source scripts/android-device.sh

echo "▶ Launching app"
adb -s "$ANDROID_DEVICE" shell monkey \
  -p "$APP_ID" \
  -c android.intent.category.LAUNCHER 1
