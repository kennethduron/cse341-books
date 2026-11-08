export const isJsonObject = (value) => {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
};

export const hasExactFields = (value, fields) => {
  return isJsonObject(value) && Object.keys(value).length === fields.length &&
    fields.every((field) => {return Object.hasOwn(value, field)});
};

export const isNonEmptyString = (value) => {
  return typeof value === 'string' && value.trim().length > 0;
};

export const isValidAuthor = (body, fields) => {
  if (!hasExactFields(body, fields)) {
    return false;
  }

  const hasValidId = !fields.includes('id') || isNonEmptyString(body.id);
  const hasValidName = isNonEmptyString(body.name);
  const hasValidBirthYear = Number.isInteger(body.birthYear);

  return hasValidId && hasValidName && hasValidBirthYear;
};

const isValidDate = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000')) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

export const isValidBook = (body, fields) => {
  if (!hasExactFields(body, fields)) {
    return false;
  }

  const hasValidId = !fields.includes('id') || isNonEmptyString(body.id);
  return hasValidId && isNonEmptyString(body.authorId) && isNonEmptyString(body.title) &&
    isValidDate(body.publicationDate);
};
