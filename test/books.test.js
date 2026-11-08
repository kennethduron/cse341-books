import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { MongoClient } from 'mongodb';
import app from '../app.js';
import swaggerDocument from '../src/docs/openapi.js';
import { connectToDb } from '../src/db/connect.js';

const books = [
  { id: 'b1', authorId: 'a1', title: '1984', publicationDate: '1949-06-08' },
  { id: 'b2', authorId: 'a2', title: 'Pride and Prejudice', publicationDate: '1813-01-28' },
  { id: 'b3', authorId: 'a3', title: 'To Kill a Mockingbird', publicationDate: '1960-07-11' },
];
const authors = [
  { id: 'a1', name: 'George Orwell', birthYear: 1903 },
  { id: 'a2', name: 'Jane Austen', birthYear: 1775 },
  { id: 'a3', name: 'Harper Lee', birthYear: 1926 },
];
const originalConnect = MongoClient.prototype.connect;
const originalDb = MongoClient.prototype.db;
const originalLog = console.log;
let failQueries = false;
let server;
let baseUrl;

const matches = (document, filter) => {
  return Object.entries(filter).every(([key, value]) => {return document[key] === value});
};

const fakeDatabase = {
  command: async () => {return { ok: 1 }},
  collection: (name) => {
    const records = name === 'books' ? books : authors;
    return {
      createIndex: async () => {return 'id_1'},
      find: (filter) => {return {
        toArray: async () => {
          if (failQueries) {
            throw new Error('Private database detail');
          }
          return records.filter((record) => {return matches(record, filter)});
        },
      }},
      findOne: async (filter) => {
        if (failQueries) {
          throw new Error('Private database detail');
        }
        return records.find((record) => {return matches(record, filter)}) ?? null;
      },
      insertOne: async (document) => {
        if (records.some((record) => {return record.id === document.id})) {
          const error = new Error('duplicate key');
          error.code = 11000;
          throw error;
        }
        records.push({ ...document });
      },
      updateOne: async (filter, update) => {
        const record = records.find((item) => {return matches(item, filter)});
        if (!record) {
          return { matchedCount: 0, modifiedCount: 0 };
        }
        Object.assign(record, update.$set);
        return { matchedCount: 1, modifiedCount: 1 };
      },
      deleteOne: async (filter) => {
        const index = records.findIndex((item) => {return matches(item, filter)});
        if (index === -1) {
          return { deletedCount: 0 };
        }
        records.splice(index, 1);
        return { deletedCount: 1 };
      },
    };
  },
};

before(async () => {
  process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/cse341-test';
  process.env.MONGODB_DB_NAME = 'cse341-test';
  MongoClient.prototype.connect = async function connect() {
    return this;
  };
  MongoClient.prototype.db = () => {return fakeDatabase};
  console.log = () => {};
  await connectToDb();
  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => {return server.once('listening', resolve)});
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => {return (error ? reject(error) : resolve())});
  });
  MongoClient.prototype.connect = originalConnect;
  MongoClient.prototype.db = originalDb;
  console.log = originalLog;
});

const jsonRequest = (method, body) => {return {
  method,
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
}};

test('book reads return author references and preserve all three original books', async () => {
  const list = await fetch(`${baseUrl}/books`);
  assert.equal(list.status, 200);
  assert.deepEqual(await list.json(), books);

  const item = await fetch(`${baseUrl}/books/b1`);
  assert.equal(item.status, 200);
  assert.deepEqual(await item.json(), books[0]);

  const missing = await fetch(`${baseUrl}/books/unknown`);
  assert.equal(missing.status, 404);
  assert.deepEqual(await missing.json(), { message: 'Book not found' });
});

test('book creation validates fields, dates, references, duplicates, and success', async () => {
  const invalidDate = await fetch(`${baseUrl}/books`, jsonRequest('POST', {
    id: 'b4', authorId: 'a1', title: 'Bad date', publicationDate: '2026-02-30',
  }));
  assert.equal(invalidDate.status, 400);

  const invalidAuthor = await fetch(`${baseUrl}/books`, jsonRequest('POST', {
    id: 'b4', authorId: 'unknown', title: 'Unknown author', publicationDate: '2026-02-20',
  }));
  assert.equal(invalidAuthor.status, 400);

  const duplicate = await fetch(`${baseUrl}/books`, jsonRequest('POST', {
    id: 'b1', authorId: 'a1', title: 'Duplicate', publicationDate: '2026-02-20',
  }));
  assert.equal(duplicate.status, 409);

  const created = await fetch(`${baseUrl}/books`, jsonRequest('POST', {
    id: 'test-book-create', authorId: 'a1', title: 'Test Book', publicationDate: '2026-02-20',
  }));
  assert.equal(created.status, 201);
  assert.deepEqual(await created.json(), {
    id: 'test-book-create', authorId: 'a1', title: 'Test Book', publicationDate: '2026-02-20',
  });
});

test('book update validates references and reports missing books', async () => {
  const invalidAuthor = await fetch(`${baseUrl}/books/b1`, jsonRequest('PUT', {
    authorId: 'unknown', title: 'Updated', publicationDate: '2026-02-20',
  }));
  assert.equal(invalidAuthor.status, 400);

  const invalidDate = await fetch(`${baseUrl}/books/b1`, jsonRequest('PUT', {
    authorId: 'a1', title: 'Updated', publicationDate: '2026-13-01',
  }));
  assert.equal(invalidDate.status, 400);

  const missing = await fetch(`${baseUrl}/books/missing`, jsonRequest('PUT', {
    authorId: 'a1', title: 'Updated', publicationDate: '2026-02-20',
  }));
  assert.equal(missing.status, 404);

  const updated = await fetch(`${baseUrl}/books/b1`, jsonRequest('PUT', {
    authorId: 'a2', title: '1984 Updated', publicationDate: '1949-06-08',
  }));
  assert.equal(updated.status, 200);
  assert.deepEqual(await updated.json(), {
    id: 'b1', authorId: 'a2', title: '1984 Updated', publicationDate: '1949-06-08',
  });
});

test('book deletion removes only the temporary record and returns 404 if absent', async () => {
  const created = await fetch(`${baseUrl}/books`, jsonRequest('POST', {
    id: 'test-book-delete', authorId: 'a3', title: 'Temporary', publicationDate: '2020-01-01',
  }));
  assert.equal(created.status, 201);

  const deleted = await fetch(`${baseUrl}/books/test-book-delete`, { method: 'DELETE' });
  assert.equal(deleted.status, 204);
  assert.equal(await deleted.text(), '');

  const missing = await fetch(`${baseUrl}/books/test-book-delete`, { method: 'DELETE' });
  assert.equal(missing.status, 404);
  assert.deepEqual(books.filter((book) => {return ['b1', 'b2', 'b3'].includes(book.id)}).map((book) => {return book.id}), ['b1', 'b2', 'b3']);
});

test('book failures are safe and all CRUD routes have Swagger request bodies', async (context) => {
  context.mock.method(console, 'error', () => {});
  failQueries = true;
  try {
    const response = await fetch(`${baseUrl}/books`);
    assert.equal(response.status, 500);
    const body = await response.text();
    assert.equal(body.includes('Private database detail'), false);
    assert.deepEqual(JSON.parse(body), { message: 'Internal server error' });
  } finally {
    failQueries = false;
  }

  for (const [path, method] of [['/books', 'post'], ['/books/{id}', 'put']]) {
    assert.equal(swaggerDocument.paths[path][method].requestBody.required, true);
  }
  const docs = await fetch(`${baseUrl}/api-docs/`);
  assert.equal(docs.status, 200);
  assert.match(await docs.text(), /swagger-ui/);
});
