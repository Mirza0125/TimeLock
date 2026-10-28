# DigiTame UI Implementation Plan

## Objective
Rebrand app to DigiTame and implement all 18 design screens (from SVG specs) with a consistent dark violet theme, navigation, and reusable components.

## Theme tokens
- bg: #08091e / #10113a; panel: #121638; border: #292e66
- accent gradient: #5b5cf6 -> #9747ff -> #df4dff (solid #7c3aed fallback)
- text: #f9f7ff primary, #aab0d8 secondary
- radius: 22/28/32/49; spacing 4-pt

## Routes
- index: Splash
- (auth): onboarding, choose-mode, create-account, sign-in, permissions
- (tabs): home, apps, stats, family, settings
- stack: app-limit, schedules, limit-reached, focus, weekly-report, child-controls, activity-alerts

## Components
Screen, Header, Card, Button, Input, Chip, TabBar (via expo-router Tabs)

## Steps
1. Theme + components
2. Splash + onboarding flow
3. Auth screens
4. Permissions
5. Tabs (home, apps, stats, family, settings)
6. Detail screens
7. Rebrand app.json + icon
8. Lint/typecheck/test
