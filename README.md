# ISS Simulation

Interactive Three.js visualization of the International Space Station for rollout material, demos, and presentation assets.

This viewer is part of the visual setup around our work on a humanoid robot for inside-space-station operations. It is intended as a lightweight browser-based scene that can be shown during presentations, embedded into demo flows, or used as a visual backdrop for explaining ISS operations.

## Experience

- Full-screen black space scene with a realistic starfield.
- Centered ISS GLB model with smooth idle orbiting.
- Manual rotate and zoom with mouse, trackpad, or touch.
- Smooth return to idle orbit after interaction, preserving the current zoom level.
- ORBIT watermark and `ISS simulation` label fixed in the top-left corner.

## Project Structure

```text
public/assets/
  International Space Station (ISS).glb
  ORB_Logotype_white_RZ.svg

public/draco/
  glTF Draco decoder files required by the ISS model

src/
  main.js
  styles.css
```

## Run Locally

```sh
npm install
npm run dev
```

Open the local URL printed by Vite, usually:

```text
http://localhost:5173/
```

## Build

```sh
npm run build
npm run preview
```

`npm run build` creates a production bundle in `dist/`. The generated `dist/` and `node_modules/` directories are intentionally ignored by git.
