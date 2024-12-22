# electron-kiosk

Simple electron based kiosk for dockerized progressive web applications.

## Debugging (localhost)

1. `npm run debug`
2. Navigate to `localhost:9222` in chrome from local device

## Debugging (all interfaces)

1. `npm run debug`
2. `socat TCP-LISTEN:8315,reuseaddr,fork TCP:localhost:8315`
3. Navigate to `ip:8315` in chrome from remote device
