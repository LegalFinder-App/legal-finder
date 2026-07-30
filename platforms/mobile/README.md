# Mobile Delivery

This folder is reserved for iOS and Android release packaging.

## Intended contents

- Native wrapper configuration.
- App store metadata.
- Signing, provisioning and store release settings.
- Device capability notes for push, camera, microphone, file upload and share sheet support.

## Recommended packaging approach

- Use a native wrapper around the shared web product for the first release track.
- Keep the app store build as a thin shell over the same core UX, auth and data layer.
