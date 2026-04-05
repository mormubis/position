// @ts-check
import { Converter, ReferenceType, ReflectionKind } from 'typedoc';

/**
 * Each entry describes a type alias whose expanded union should be
 * collapsed back into a reference.
 */
const COLLAPSIBLE_TYPES = [
  { count: 64, name: 'Square', pattern: /^[a-h][1-8]$/ },
  { count: 16, name: 'EnPassantSquare', pattern: /^[a-h][36]$/ },
];

/**
 * Returns the collapsible type definition if the given members match one,
 * or undefined if no match.
 */
function matchCollapsible(members) {
  for (const definition of COLLAPSIBLE_TYPES) {
    if (members.length !== definition.count) continue;
    if (
      members.every(
        (t) =>
          t.type === 'literal' &&
          typeof t.value === 'string' &&
          definition.pattern.test(t.value),
      )
    ) {
      return definition;
    }
  }
  return;
}

/**
 * If a union is exactly an expanded type alias, replace it entirely.
 */
function isExactExpansion(type) {
  if (type?.type !== 'union') return;
  return matchCollapsible(type.types);
}

/**
 * If a union contains all members of a collapsible type (possibly mixed with
 * other types like `undefined`), replace those members with a single reference
 * and keep the rest.
 */
function collapseUnionMembers(type, makeReference) {
  if (type?.type !== 'union') return;

  for (const definition of COLLAPSIBLE_TYPES) {
    const matching = type.types.filter(
      (t) =>
        t.type === 'literal' &&
        typeof t.value === 'string' &&
        definition.pattern.test(t.value),
    );

    if (matching.length !== definition.count) continue;

    const rest = type.types.filter(
      (t) =>
        !(
          t.type === 'literal' &&
          typeof t.value === 'string' &&
          definition.pattern.test(t.value)
        ),
    );

    type.types = [makeReference(definition.name), ...rest];
    return;
  }
}

/**
 * Recursively replaces expanded unions with references.
 */
function collapse(type, makeReference) {
  if (!type) return type;

  const exact = isExactExpansion(type);
  if (exact) {
    return makeReference(exact.name);
  }

  if (type.type === 'union') {
    collapseUnionMembers(type, makeReference);
    type.types = type.types.map((t) => collapse(t, makeReference));
  }
  if (type.type === 'intersection') {
    type.types = type.types.map((t) => collapse(t, makeReference));
  }
  if (type.type === 'array') {
    type.elementType = collapse(type.elementType, makeReference);
  }
  if (type.type === 'tuple') {
    type.elements = type.elements?.map((t) => collapse(t, makeReference));
  }
  if (type.type === 'reference' && type.typeArguments) {
    type.typeArguments = type.typeArguments.map((t) =>
      collapse(t, makeReference),
    );
  }
  if (type.type === 'mapped') {
    type.templateType = collapse(type.templateType, makeReference);
  }

  return type;
}

/** @param {import('typedoc').Application} app */
export function load(app) {
  app.converter.on(Converter.EVENT_RESOLVE_END, (context) => {
    const project = context.project;

    // Build a lookup of type alias reflections by name
    const typeAliases = new Map();
    for (const definition of COLLAPSIBLE_TYPES) {
      const reflection = project
        .getReflectionsByKind(ReflectionKind.TypeAlias)
        .find((r) => r.name === definition.name);
      if (reflection) {
        typeAliases.set(definition.name, reflection);
      }
    }

    if (typeAliases.size === 0) return;

    // Factory that creates a ReferenceType for the given type alias name
    const makeReference = (name) => {
      const reflection = typeAliases.get(name);
      return ReferenceType.createResolvedReference(name, reflection, project);
    };

    // Walk all reflections and replace expanded unions
    for (const reflection of Object.values(project.reflections)) {
      /** @type {any} */
      const r = reflection;

      if (r.type) {
        r.type = collapse(r.type, makeReference);
      }

      const signatures = [
        ...(r.signatures ?? []),
        ...(r.getSignature ? [r.getSignature] : []),
        ...(r.setSignature ? [r.setSignature] : []),
      ];

      for (const sig of signatures) {
        if (sig.type) {
          sig.type = collapse(sig.type, makeReference);
        }
        for (const parameter of sig.parameters ?? []) {
          if (parameter.type) {
            parameter.type = collapse(parameter.type, makeReference);
          }
        }
      }
    }
  });
}
