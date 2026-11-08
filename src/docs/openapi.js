const errorSchema = {
  type: 'object',
  required: ['message'],
  properties: { message: { type: 'string' } },
};

const authorSchema = {
  type: 'object',
  required: ['id', 'name', 'birthYear'],
  properties: {
    id: { type: 'string', example: 'a1' },
    name: { type: 'string', example: 'George Orwell' },
    birthYear: { type: 'integer', example: 1903 },
  },
};

const authorUpdateSchema = {
  type: 'object',
  required: ['name', 'birthYear'],
  properties: {
    name: { type: 'string', example: 'George Orwell' },
    birthYear: { type: 'integer', example: 1903 },
  },
};

const bookSchema = {
  type: 'object',
  required: ['id', 'author', 'title', 'publicationDate'],
  properties: {
    id: { type: 'string', example: 'b1' },
    author: { type: 'string', example: 'George Orwell' },
    title: { type: 'string', example: '1984' },
    publicationDate: { type: 'string', format: 'date', example: '1949-06-08' },
  },
};

const jsonResponse = (description, schema) => {return {
  description,
  content: { 'application/json': { schema } },
}};

const pathId = (description) => {return {
  name: 'id',
  in: 'path',
  required: true,
  description,
  schema: { type: 'string' },
}};

const requestBody = (description, schema) => {return {
  required: true,
  description,
  content: { 'application/json': { schema } },
}};

const authorNotFound = jsonResponse('Author not found', { $ref: '#/components/schemas/Error' });
const internalError = jsonResponse('Unexpected server or database error', { $ref: '#/components/schemas/Error' });

const swaggerDocument = {
  openapi: '3.0.3',
  info: {
    title: 'CSE 341 Books and Authors API',
    version: '2.0.0',
    description: 'Books reference authors through `books.authorId` → `authors.id`. Custom string IDs are used in routes.',
  },
  servers: [{ url: '/', description: 'Current application host' }],
  tags: [
    { name: 'Books', description: 'Book records' },
    { name: 'Authors', description: 'Author records and reference integrity' },
  ],
  paths: {
    '/books': {
      get: {
        tags: ['Books'],
        summary: 'List books',
        responses: {
          200: jsonResponse('Book collection', { type: 'array', items: { $ref: '#/components/schemas/Book' } }),
          500: internalError,
        },
      },
    },
    '/books/{id}': {
      get: {
        tags: ['Books'],
        summary: 'Get a book by custom ID',
        parameters: [pathId('Book custom ID, for example b1')],
        responses: {
          200: jsonResponse('Book found', { $ref: '#/components/schemas/Book' }),
          404: jsonResponse('Book not found', { $ref: '#/components/schemas/Error' }),
          500: internalError,
        },
      },
    },
    '/authors': {
      get: {
        tags: ['Authors'],
        summary: 'List authors',
        responses: {
          200: jsonResponse('Author collection', { type: 'array', items: { $ref: '#/components/schemas/Author' } }),
          500: internalError,
        },
      },
      post: {
        tags: ['Authors'],
        summary: 'Create an author',
        requestBody: requestBody('Author to create. Fields must match the schema exactly.', { $ref: '#/components/schemas/AuthorInput' }),
        responses: {
          201: jsonResponse('Author created', { $ref: '#/components/schemas/Author' }),
          400: jsonResponse('Invalid or missing author fields', { $ref: '#/components/schemas/Error' }),
          409: jsonResponse('Author ID already exists', { $ref: '#/components/schemas/Error' }),
          500: internalError,
        },
      },
    },
    '/authors/{id}': {
      parameters: [pathId('Author custom ID, for example a1')],
      get: {
        tags: ['Authors'],
        summary: 'Get an author by custom ID',
        responses: {
          200: jsonResponse('Author found', { $ref: '#/components/schemas/Author' }),
          404: authorNotFound,
          500: internalError,
        },
      },
      put: {
        tags: ['Authors'],
        summary: 'Replace an author name and birth year',
        requestBody: requestBody('The route ID is immutable and must not appear in the body.', { $ref: '#/components/schemas/AuthorUpdate' }),
        responses: {
          200: jsonResponse('Author updated', { $ref: '#/components/schemas/Author' }),
          400: jsonResponse('Invalid or missing author fields', { $ref: '#/components/schemas/Error' }),
          404: authorNotFound,
          500: internalError,
        },
      },
      delete: {
        tags: ['Authors'],
        summary: 'Delete an unreferenced author',
        description: 'Returns 409 and preserves the author and books if any book has this authorId.',
        responses: {
          204: { description: 'Author deleted; response body is empty' },
          404: authorNotFound,
          409: jsonResponse('Author has books and cannot be deleted', { $ref: '#/components/schemas/Error' }),
          500: internalError,
        },
      },
    },
  },
  components: {
    schemas: {
      Error: errorSchema,
      Author: { ...authorSchema, additionalProperties: false },
      AuthorInput: { ...authorSchema, additionalProperties: false },
      AuthorUpdate: { ...authorUpdateSchema, additionalProperties: false },
      Book: { ...bookSchema, additionalProperties: false },
    },
  },
};

export default swaggerDocument;
