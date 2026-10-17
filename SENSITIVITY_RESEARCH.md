# Cross-game sensitivity: method, sources and scope

The conversion implementation is original code. The sources below were consulted for formulas and numeric facts; no third-party calculator, automation code or dependency is shipped.

## Metric and formula

For a linear mouse input profile, let `y` be degrees per mouse count at sensitivity 1, `s` be in-game sensitivity, and `d` be hardware DPI:

```
degrees/count = y × s
cm/360 = (360 × 2.54) / (y × s × d)
AimRush sensitivity = (source y × source s × source DPI) / (0.022 × destination DPI)
```

The equivalent ratio is not generally the ratio of the sliders' numeric values. eDPI (`s × DPI`) alone cannot compare different game coefficients. X and Y axes are converted separately when different values are supplied. Internal results retain full floating-point precision; displayed results are rounded only for readability.

Measured cm/360 bypasses assumptions about a particular game's slider, version or zoom scale:

```
AimRush sensitivity = (360 × 2.54) / (measured cm/360 × 0.022 × destination DPI)
```

DPI must be the actual hardware DPI. The website cannot read or change that hardware setting. Mouse acceleration and nonlinear input prevent a single constant from preserving every movement speed.

## Sources actually accessed

1. [Valve Source SDK input implementation](https://github.com/ValveSoftware/source-sdk-2013/blob/master/src/game/client/in_mouse.cpp): `m_pitch` and `m_yaw` default to `0.022`; the input path multiplies mouse motion by sensitivity and these factors. This is primary evidence for the Source reference, not a verification of every CS2 patch or custom configuration.
2. [KovaaK/SensitivityMatcher](https://github.com/KovaaK/SensitivityMatcher/tree/e77d601e81afa16aefe7f150346ef489525207f0), specifically `ReleaseAssets/bin/SensitivityMatcher.au3`: Source `0.022`, Overwatch `0.0066`, Rainbow6/Reflex `degrees(0.0001)`. Its README describes measuring mouse counts over complete revolutions and checking repeated rotations to reduce error. This informed the per-rotation metric and the measured-distance fallback.
3. [Community converter coefficients](https://github.com/antho686/mouse-sensitivity-converter/blob/283988d36bc21898dc633f8c0c0d809251cd257f/front-end/src/constants.ts): lists Call of Duty `0.0066`, Apex `0.022`, and Valorant near `0.07` (`0.06996` in that table). Other entries and conversion ratios in that project conflict with one another, so the table was not adopted wholesale or treated as publisher authority.
4. [Another community conversion table](https://github.com/JacksonLawrence1/sensitivity-converter/blob/e65c02a088465f67fe822651e5beec91da9bbb55/src/app/games.js) corroborates the approximate CS/Valorant factor `3.18` and the CS/R6 factor `3.83972336439`. It contains inconsistent reverse pairs elsewhere, so it is corroboration of those numeric ratios only.

Mouse-sensitivity.com, GamingSmart and Ubisoft documentation requests returned proxy 403. Their current content was not inspected. No implementation was verified inside the actual commercial games during this task. The browser and arithmetic tests validate the stated profiles and calculations, not publisher certification or an exhaustive current-version sensitivity database.

## Profiles shipped

| Profile | Base yaw (degrees/count/sensitivity unit) | Scope |
| --- | ---: | --- |
| CS:GO / CS2 standard | 0.022 | Standard horizontal/vertical factors, hipfire; custom factors require measured mode. |
| Valorant community profile | 0.07 | Approximate conventional hipfire profile, not exact per-version metrology. Community references vary by roughly 0.06%. |
| Rainbow Six Siege | `(0.0001 × 180/π) × (configured multiplier/0.02)` | Hipfire; specify X/Y sensitivity and actual `MouseSensitivityMultiplierUnit`. The default preset uses 0.02. |
| CoD / Warzone classic mouse scale | 0.0066 | Legacy community profile only. Not a universal profile for later releases, new scales or controller settings. |
| Apex standard | 0.022 | Community Source-style hipfire profile, no zoom multipliers. |
| Overwatch standard | 0.0066 | Sensitivity Matcher profile, no scoped hero overrides. |
| Current Warzone / other game / ADS measurement | None assumed | Enter measured X/Y cm/360 for the exact version and input state. |

The R6 multiplier field is explicit because a numeric sensitivity alone does not describe a customized configuration. Changing the multiplier from 0.02 to 0.002 divides the angular gain by ten at the same sensitivity. Different horizontal/vertical sliders preserve their axis ratio.

## FOV and screen projection

cm/360 preserves angular movement per physical distance, independent of field of view. It does not by itself preserve apparent target size or screen displacement. The UI offers applying the source FOV separately and requires its convention: horizontal reference 4:3, horizontal reference 16:9, horizontal 5:3, or vertical.

```
vertical FOV = 2 × atan(tan(horizontal FOV / 2) / reference aspect)
projection focal length = arena height / (2 × tan(vertical FOV / 2))
```

The AimRush arena has a fixed logical aspect of 5:3, so its horizontal FOV is derived from the imported vertical FOV. Preset FOV values are initial suggestions and must be checked against the player's actual game settings. Disabling FOV import retains the current AimRush FOV. This is not a monitor-distance/ADS matching system or a complete reproduction of another game's rendering and camera.

## Product behavior and validation

Mira → Jogo e sensibilidade calculates a preview first. Applying sets the actual sensitivity, vertical ratio, DPI reference, FOV and captured input mode for both training and stake rounds, while keeping the chosen crosshair appearance. Both the converter inputs and applied settings are saved locally when storage is available. Invalid input disables application and leaves the active profile untouched. Manual sensitivity, DPI, vertical-ratio or FOV edits mark the active profile as custom.

Unknown versions, modified yaw factors and ADS states can use measured distance rather than an invented automatic ratio. Touch and direct cursor mode still use absolute pointer positions; cm/360 reproduction requires relative captured mouse input. Raw input is requested when supported, and browser/OS differences remain a calibration limit.

Automated tests exercise coefficient/DPI math, axis independence, R6 multipliers, measured fallback, FOV independence, rejected inputs, precision retention and legacy settings. Browser checks exercise the actual capture path, converted movement and changed projection, saving/reloading, invalid preview handling, tabs, responsive widths and unchanged wallet data. In one browser run, the same 100 relative mouse units after importing Valorant sensitivity 1 produced a crosshair near x=551.5 with the profile FOV and x=536.5 with 90° vertical FOV; angular gain and cm/360 remained the same.
