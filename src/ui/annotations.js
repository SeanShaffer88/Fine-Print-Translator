// The user's own marks, notes, and corrections. They sit on top of the analysis
// and never change the rule set or the detected status.

export const MARKS = { '': 'No mark', useful: 'Useful', incorrect: 'Incorrect' };

export const keyOf = (category, match) => `${category}:${match.start}`;

/** Detected candidate values with the user's corrections applied. */
export function effectiveValues(match, ann) {
  return { ...match.values, ...(ann?.values ?? {}) };
}

/** Sets one field; removes entries that no longer hold anything. */
export function updateAnnotation(annotations, key, patch) {
  const next = { ...(annotations[key] ?? {}), ...patch };
  if (next.values && !Object.keys(next.values).length) delete next.values;
  for (const k of ['mark', 'note', 'hidden']) if (!next[k]) delete next[k];
  if (Object.keys(next).length) annotations[key] = next;
  else delete annotations[key];
  return annotations;
}

/** Records a corrected value; an edit equal to the detected value is dropped. */
export function setValue(annotations, key, match, field, value) {
  const values = { ...(annotations[key]?.values ?? {}) };
  if (value === match.values[field]) delete values[field];
  else values[field] = value;
  return updateAnnotation(annotations, key, { values });
}
