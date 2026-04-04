# Backlog

Last updated: 2026-04-04

## Low

- [ ] `Square` type expansion in TypeDoc — the template literal type
      `` `${File}${Rank}` `` is eagerly resolved by TypeScript into a 64-member
      union, making generated docs in downstream packages (e.g. `@echecs/game`)
      hard to read. Needs a fix at the type definition (e.g. `@preventExpand`
      tag or an opaque type alias).
