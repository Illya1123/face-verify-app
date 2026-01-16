#!/usr/bin/env bash
set -e

DEVICES=$(adb devices | awk 'NR>1 && $2=="device" {print $1}')

COUNT=$(echo "$DEVICES" | wc -l)

if [ "$COUNT" -eq 0 ]; then
  echo "❌ No Android device connected"
  exit 1
fi

if [ "$COUNT" -eq 1 ]; then
  export ANDROID_DEVICE=$(echo "$DEVICES")
else
  echo "Multiple devices detected:"
  select d in $DEVICES; do
    export ANDROID_DEVICE=$d
    break
  done
fi

echo "Using device: $ANDROID_DEVICE"
