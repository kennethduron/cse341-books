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
