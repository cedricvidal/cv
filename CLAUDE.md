# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Cédric Vidal's interactive online resume, published at http://cv.vidal.biz via GitHub Pages (the `gh-pages` branch is the deployed site — pushing to it publishes). It is a static site with no build step for HTML/JS; only the CSS is compiled from Stylus.

## Commands

```bash
npm install            # install dev dependencies (grunt, http-server)
npm run serve          # serve the site locally with caching disabled (http-server -c-1 .)
grunt                  # compile index.styl -> index.css (stylus:compile)
grunt watch            # recompile CSS on .styl changes, with livereload
```

There are no tests. `index.css` is a generated file — edit `index.styl` and recompile with grunt; do not hand-edit `index.css` (but do commit the regenerated output, since the site is served statically).

## Architecture

The site is rendered client-side by the MIT Simile **Exhibit 3** framework (vendored in `lib/exhibit3`). `index.html` is both the data manifest and the presentation layer:

- **Data**: resume content lives in YAML files under `data/` (experiences, company, education, skills, talks, publications, projects, expertise), each declared in `index.html` via `<link rel="exhibit/data" type="application/yaml">`. Each file has an `items:` list where every item has a `label` (its identity — other files reference items by label, e.g. an experience's `employer: ArgoAI` points at a Company item) and a `type` matching one of the Exhibit types.
- **Schema**: `cv.json` declares the Exhibit types and typed properties (`start`/`end`/`date` are dates; `responsibilities` is markdown, rendered via marked.js).
- **Presentation**: rendering is driven by declarative `data-ex-*` attributes in `index.html` — `data-ex-role="lens"` templates define how each item type displays, `data-ex-role="view"` blocks bind lenses to collections with ordering, and `data-ex-role="facet"` blocks provide the interactive filters (by tech, company, industry, text).
- **Extensions**: `src/exhibit-yaml-importer.js` registers the `application/yaml` importer with Exhibit (it natively supports only JSON), using the vendored yamljs. `cv-exhibit-ext.js` holds a legacy geocoding helper.

Most content changes only require editing the YAML in `data/`. Logos for companies go in `logos/`, referenced by the `logo` field in `data/company.yaml`.

The CSS includes print-specific styling (`.noprint`, `.print-left-border`) — the page doubles as a printable resume, so check print layout when changing styles.
