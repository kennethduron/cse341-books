import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { MongoClient } from 'mongodb';
import app from '../app.js';
import { connectToDb } from '../src/db/connect.js';

const authors = [{ id: 'a1', name: 'George Orwell', birthYear: 1903 }];
const books = [{ id: 'b1', authorId: 'a1', title: '1984', publicationDate: '1949-06-08' }];
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
    const records = name === 'authors' ? authors : books;
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
          return { matchedCount: 0 };
        }
        Object.assign(record, update.$set);
        return { matchedCount: 1 };
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

test('author list, lookup, Swagger, and missing lookup return documented responses', async () => {
  const list = await fetch(`${baseUrl}/authors`);
  assert.equal(list.status, 200);
  assert.deepEqual(await list.json(), [authors[0]]);

  const found = await fetch(`${baseUrl}/authors/a1`);
  assert.equal(found.status, 200);
  assert.deepEqual(await found.json(), authors[0]);

  const missing = await fetch(`${baseUrl}/authors/unknown`);
  assert.equal(missing.status, 404);
  assert.deepEqual(await missing.json(), { message: 'Author not found' });

  const docs = await fetch(`${baseUrl}/api-docs/`);
  assert.equal(docs.status, 200);
  assert.match(await docs.text(), /swagger-ui/);
});

test('author creation validates body and rejects duplicate IDs', async () => {
  const invalid = await fetch(`${baseUrl}/authors`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ id: 'a2', name: ' ', birthYear: 2000 }),
  });
  assert.equal(invalid.status, 400);

  const created = await fetch(`${baseUrl}/authors`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ id: 'a2', name: 'Jane Austen', birthYear: 1775 }),
  });
  assert.equal(created.status, 201);
  assert.deepEqual(await created.json(), { id: 'a2', name: 'Jane Austen', birthYear: 1775 });

  const duplicate = await fetch(`${baseUrl}/authors`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ id: 'a2', name: 'Duplicate', birthYear: 1800 }),
  });
  assert.equal(duplicate.status, 409);
});

test('author update validates input and returns 404 for an absent author', async () => {
  const invalid = await fetch(`${baseUrl}/authors/a1`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ id: 'changed', name: 'New name', birthYear: 1904 }),
  });
  assert.equal(invalid.status, 400);

  const updated = await fetch(`${baseUrl}/authors/a1`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'George Orwell Updated', birthYear: 1903 }),
  });
  assert.equal(updated.status, 200);

  const missing = await fetch(`${baseUrl}/authors/missing`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Missing Author', birthYear: 1900 }),
  });
  assert.equal(missing.status, 404);
});

test('author deletion preserves referenced authors and deletes unreferenced authors', async () => {
  const conflict = await fetch(`${baseUrl}/authors/a1`, { method: 'DELETE' });
  assert.equal(conflict.status, 409);
  assert.equal(authors.some((author) => {return author.id === 'a1'}), true);
  assert.equal(books.some((book) => {return book.authorId === 'a1'}), true);

  const deleted = await fetch(`${baseUrl}/authors/a2`, { method: 'DELETE' });
  assert.equal(deleted.status, 204);
  assert.equal(await deleted.text(), '');

  const missing = await fetch(`${baseUrl}/authors/a2`, { method: 'DELETE' });
  assert.equal(missing.status, 404);
});

test('author route returns generic 500 without exposing database details', async (context) => {
  context.mock.method(console, 'error', () => {});
  failQueries = true;
  try {
    const response = await fetch(`${baseUrl}/authors`);
    assert.equal(response.status, 500);
    const body = await response.text();
    assert.equal(body.includes('Private database detail'), false);
    assert.deepEqual(JSON.parse(body), { message: 'Internal server error' });
  } finally {
    failQueries = false;
  }
});

test('malformed JSON receives a safe JSON 400 response', async () => {
  const response = await fetch(`${baseUrl}/authors`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{invalid',
  });
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { message: 'Invalid JSON request body' });
});
