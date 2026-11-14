/**
 * Lighthouse CI. Runs against the production build served by `vite preview`.
 *
 * Only the public pages are audited here because the app pages sit behind a login and CI has
 * no backend. Authenticated pages are audited manually; see perf/README.md.
 */
module.exports = {
  ci: {
    collect: {
      startServerCommand: "npm run preview -- --port 4173 --strictPort",
      startServerReadyPattern: "Local",
      url: ["http://localhost:4173/login", "http://localhost:4173/signup"],
      numberOfRuns: 3,
    },
    assert: {
      assertions: {
        "categories:performance": ["error", { minScore: 0.9 }],
        "categories:accessibility": ["error", { minScore: 0.9 }],
        "categories:best-practices": ["error", { minScore: 0.9 }],
        "categories:seo": ["error", { minScore: 0.9 }],
      },
    },
    upload: { target: "temporary-public-storage" },
  },
};
