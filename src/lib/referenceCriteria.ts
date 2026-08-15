/** Extract source field names referenced as {{this.field__v}} in relationship_criteria. */
export function relationshipCriteriaSourceFields(criteria: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const match of criteria.matchAll(/\{\{this\.([\w]+)\}\}/g)) {
    const name = match[1]?.trim();
    if (!name || seen.has(name)) {
      continue;
    }
    seen.add(name);
    out.push(name);
  }
  return out;
}

type CriteriaClause = {
  field: string;
  literal?: string;
  sourceField?: string;
};

function escapeVqlString(value: string): string {
  return value.replace(/'/g, "\\'");
}

/** Parse simple equality / AND relationship_criteria (no subqueries). */
export function parseReferenceCriteriaClauses(criteria: string): CriteriaClause[] | null {
  let text = criteria.trim();
  if (!text) {
    return null;
  }
  if (text.startsWith("[") && text.endsWith("]")) {
    text = text.slice(1, -1).trim();
  }
  if (!text || /SELECT\s+/i.test(text) || /\bIN\s*\(/i.test(text)) {
    return null;
  }
  const parts = text.split(/\s+AND\s+/i).map((part) => part.trim()).filter(Boolean);
  if (parts.length === 0) {
    return null;
  }
  const clauses: CriteriaClause[] = [];
  for (const part of parts) {
    const literalMatch = part.match(/^([\w]+)\s*=\s*'([^']*)'$/);
    if (literalMatch) {
      clauses.push({ field: literalMatch[1], literal: literalMatch[2] });
      continue;
    }
    const sourceMatch = part.match(/^([\w]+)\s*=\s*\{\{this\.([\w]+)\}\}$/);
    if (sourceMatch) {
      clauses.push({ field: sourceMatch[1], sourceField: sourceMatch[2] });
      continue;
    }
    return null;
  }
  return clauses;
}

/**
 * Append WHERE filters derived from relationship_criteria to a base VQL query.
 * Returns null when a required source field value is missing.
 * Preserves trailing ORDER BY / LIMIT (WHERE must precede them).
 */
export function appendReferenceCriteriaToVql(
  baseQuery: string,
  criteria: string,
  sourceValues: Record<string, unknown>,
): string | null {
  const clauses = parseReferenceCriteriaClauses(criteria);
  if (!clauses || clauses.length === 0) {
    return baseQuery;
  }

  const whereParts: string[] = [];
  const extraFields = new Set<string>();
  for (const clause of clauses) {
    extraFields.add(clause.field);
    if (clause.literal !== undefined) {
      whereParts.push(`${clause.field} = '${escapeVqlString(clause.literal)}'`);
      continue;
    }
    if (clause.sourceField) {
      const sourceValue = String(sourceValues[clause.sourceField] ?? "").trim();
      if (!sourceValue) {
        return null;
      }
      whereParts.push(`${clause.field} = '${escapeVqlString(sourceValue)}'`);
      continue;
    }
    return baseQuery;
  }

  const { body, orderBy, limit } = splitVqlTail(baseQuery);
  let query = body;
  for (const field of extraFields) {
    const selectMatch = query.match(/^SELECT\s+(.+?)\s+FROM\s+/i);
    if (selectMatch && !selectMatch[1].includes(field)) {
      query = query.replace(/^SELECT\s+/i, `SELECT ${field}, `);
    }
  }
  if (whereParts.length > 0) {
    if (/\sWHERE\s/i.test(query)) {
      query = `${query} AND ${whereParts.join(" AND ")}`;
    } else {
      query = `${query} WHERE ${whereParts.join(" AND ")}`;
    }
  }
  const suffix = [orderBy, limit || "LIMIT 50"].filter(Boolean).join(" ");
  return suffix ? `${query} ${suffix}` : query;
}

/** Peel trailing ORDER BY / LIMIT so WHERE can be inserted ahead of them. */
function splitVqlTail(baseQuery: string): { body: string; orderBy: string; limit: string } {
  let query = baseQuery.trim();
  let limit = "";
  let orderBy = "";
  const limitMatch = query.match(/\s+LIMIT\s+\d+\s*$/i);
  if (limitMatch) {
    limit = limitMatch[0].trim();
    query = query.slice(0, -limitMatch[0].length).trim();
  }
  const orderMatch = query.match(/\s+ORDER\s+BY\s+.+$/i);
  if (orderMatch) {
    orderBy = orderMatch[0].trim();
    query = query.slice(0, -orderMatch[0].length).trim();
  }
  return { body: query, orderBy, limit };
}

export function pickSourceValuesForCriteria(
  criteria: string,
  sourceValues: Record<string, unknown>,
): Record<string, unknown> {
  const picked: Record<string, unknown> = {};
  for (const field of relationshipCriteriaSourceFields(criteria)) {
    picked[field] = sourceValues[field];
  }
  return picked;
}

/** One target-field default derived from relationship_criteria for inline create. */
export type InlineCriteriaFixedField = {
  field: string;
  value: string;
  sourceField?: string;
};

/**
 * Map simple equality relationship_criteria onto create-form field defaults.
 * Veeva create_object_inline fixes these on the new record (e.g. Study from parent).
 * Source bindings without a value are skipped; unparseable / subquery criteria yield [].
 */
export function fixedFieldsFromRelationshipCriteria(
  criteria: string,
  sourceValues: Record<string, unknown>,
): InlineCriteriaFixedField[] {
  const clauses = parseReferenceCriteriaClauses(criteria);
  if (!clauses || clauses.length === 0) {
    return [];
  }
  const out: InlineCriteriaFixedField[] = [];
  for (const clause of clauses) {
    if (clause.literal !== undefined) {
      out.push({ field: clause.field, value: clause.literal });
      continue;
    }
    if (!clause.sourceField) {
      continue;
    }
    const value = String(sourceValues[clause.sourceField] ?? "").trim();
    if (!value) {
      continue;
    }
    out.push({ field: clause.field, value, sourceField: clause.sourceField });
  }
  return out;
}
