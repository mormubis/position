# AGENTS.md

Agent guidance for the `@echecs/position` package — foundational chess position
type and board utilities in the `@echecs` family of chess libraries.

**See also:** [`REFERENCES.md`](REFERENCES.md) |
[`COMPARISON.md`](COMPARISON.md)

See the root `AGENTS.md` for workspace-wide conventions.

**Backlog:** tracked in
[GitHub Issues](https://github.com/echecsjs/position/issues).

---

## Project Overview

The foundational package. Provides the `Position` type (complete chess position
value object with `Map<Square, Piece>` board) and pure query functions. Internal
0x88 board representation (`board.ts`, `moves.ts`) lives flat in `src/` and is
consumed directly by `position.ts`.

Has one runtime dependency — `@echecs/zobrist` for Zobrist hashing.

---

## Commands

```bash
pnpm build              # compile TypeScript → dist/
pnpm test               # run all tests
pnpm lint               # ESLint + tsc type-check
pnpm format             # Prettier
pnpm lint && pnpm test && pnpm build   # full pre-PR check
```

---

## Validation

Input validation is mostly provided by TypeScript's strict type system at
compile time. There is no runtime validation library — the type signatures
enforce correct usage. Do not add runtime type-checking guards (e.g. `typeof`
checks, assertion functions) unless there is an explicit trust boundary.

---

## Architecture Notes

- **ESM-only** — the package ships only ESM. Do not add a CJS build.
- All interface fields sorted alphabetically (sort-keys ESLint error).
- Use `.js` extensions on all relative imports (NodeNext resolution).
- No null — use undefined everywhere (unicorn/no-null).
- `Position` is immutable by convention — query functions return new objects.

---

## Release Protocol

Step-by-step process for releasing a new version. CI auto-publishes to npm when
`version` in `package.json` changes on `main`.

1. **Verify the package is clean:**

   ```bash
   pnpm lint && pnpm test && pnpm build
   ```

   Do not proceed if any step fails.

2. **Decide the semver level:**
   - `patch` — bug fixes, internal refactors with no API change
   - `minor` — new features, new exports, non-breaking additions
   - `major` — breaking changes to the public API

3. **Update `CHANGELOG.md`** following
   [Keep a Changelog](https://keepachangelog.com) format:

   ```markdown
   ## [x.y.z] - YYYY-MM-DD

   ### Added

   - …

   ### Changed

   - …

   ### Fixed

   - …

   ### Removed

   - …
   ```

   Include only sections that apply. Use past tense.

4. **Update `README.md`** if the release introduces new public API, changes
   usage examples, or deprecates/removes existing features.

5. **Bump the version:**

   ```bash
   npm version <major|minor|patch> --no-git-tag-version
   ```

6. **Open a release PR:**

   ```bash
   git checkout -b release/x.y.z
   git add package.json CHANGELOG.md README.md
   git commit -m "release: @echecs/position@x.y.z"
   git push -u origin release/x.y.z
   gh pr create --title "release: @echecs/position@x.y.z" --body "<description>"
   ```

   Wait for CI (format, lint, test) to pass on the PR before merging.

7. **Merge the PR:** Once CI is green, merge (squash) into `main`. The release
   workflow detects the version bump, publishes to npm, and creates a GitHub
   Release with a git tag.

Do not manually publish with `npm publish`. Do not create git tags manually —
the release workflow handles tagging.
