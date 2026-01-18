/**
 * Roseiies Tailwind config (monorepo-safe).
 *
 * Tailwind v4 works great without importing types from "tailwindcss".
 * Keeping this untyped avoids TS/VSCode resolution issues in workspaces.
 */
const config = {
  theme: {
    extend: {
      // Optional: you can extend Tailwind colors here, but your real tokens live in:
      // packages/core/styles/roseiies.css
    },
  },
};

export default config;
