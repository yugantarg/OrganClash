# Organ sprites

Drop generated organ PNGs here, named by the game's OrganType key, lowercased:

    heart_cardio.png  brain_cns.png  lungs_resp.png  ...  (see the Organ Generation Kit)

A sprite is used only once its key is listed in `SPRITE_KEYS` in
`src/components/pixi/organShapes.ts`. Organs without art keep the procedural
placeholder, so the set swaps in one organ at a time.

512x512 transparent PNG, organ centred with even margin.
