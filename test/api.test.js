import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { MongoClient } from 'mongodb';
import app from '../app.js';
import { connectToDb } from '../src/db/connect.js';

const books = [
  {
    id: 'b1',
    author: 'George Orwell',
    title: '1984',
    publicationDate: '1949-06-08',
  },
  {
    id: 'b2',
    author: 'Jane Austen',
    title: 'Pride and Prejudice',
    publicationDate: '1813-01-28',
  },
  {
    id: 'b3',
    author: 'Harper Lee',
    title: 'To Kill a Mockingbird',
    publicationDate: '1960-07-11',
  },
];

const originalConnect = MongoClient.prototype.connect;
const originalDb = MongoClient.prototype.db;
const originalLog = console.log;
let failBookQueries = false;
let server;
let baseUrl;

const fakeDatabase = {
  command: async () => {
    return { ok: 1 };
  },
  collection: () => {
    return {
      find: () => {
        return {
          toArray: async () => {
            if (failBookQueries) {
              throw new Error('Simulated database failure');
            }

            return books;
          },
        };
      },
      findOne: async ({ id }) => {
        if (failBookQueries) {
          throw new Error('Simulated database failure');
        }

        return books.find((book) => {
          return book.id === id;
        }) ?? null;
      },
    };
  },
};

before(async () => {
  process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/cse341-test';
  process.env.MONGODB_DB_NAME = 'cse341-books-db';

  MongoClient.prototype.connect = async function connect() {
    return this;
  };
  MongoClient.prototype.db = () => {
    return fakeDatabase;
  };
  console.log = () => {};

  await connectToDb();
  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => {
    server.once('listening', resolve);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
  MongoClient.prototype.connect = originalConnect;
  MongoClient.prototype.db = originalDb;
  console.log = originalLog;
});

test('GET / returns the service health response as JSON', async () => {
  const response = await fetch(`${baseUrl}/`);

  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /application\/json/);
  assert.deepEqual(await response.json(), { message: 'Server is running' });
});

test('GET /books returns all books as a JSON array', async () => {
  const response = await fetch(`${baseUrl}/books`);

  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /application\/json/);
  assert.deepEqual(await response.json(), books);
});

test('GET /books/:id returns a matching book', async () => {
  const response = await fetch(`${baseUrl}/books/b1`);

  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /application\/json/);
  assert.deepEqual(await response.json(), books[0]);
});

test('GET /books/:id returns 404 when the book is absent', async () => {
  const response = await fetch(`${baseUrl}/books/does-not-exist`);

  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { message: 'Book not found' });
});

test('book routes return a generic 500 response for unexpected errors', async (context) => {
  context.mock.method(console, 'error', () => {});
  failBookQueries = true;

  try {
    for (const path of ['/books', '/books/b1']) {
      const response = await fetch(`${baseUrl}${path}`);

      assert.equal(response.status, 500);
      assert.match(response.headers.get('content-type'), /application\/json/);
      assert.deepEqual(await response.json(), {
        message: 'Internal server error',
      });
    }
  } finally {
    failBookQueries = false;
  }
});

test('MongoDB connection errors propagate and close the failed client', async () => {
  const originalClose = MongoClient.prototype.close;
  const connectionFailure = new Error('Simulated TLS negotiation failure');
  let clientClosed = false;

  MongoClient.prototype.connect = async () => {
    throw connectionFailure;
  };
  MongoClient.prototype.close = async () => {
    clientClosed = true;
  };

  try {
    await assert.rejects(connectToDb(), (error) => {
      return error === connectionFailure;
    });
    assert.equal(clientClosed, true);
  } finally {
    MongoClient.prototype.connect = async function connect() {
      return this;
    };
    MongoClient.prototype.close = originalClose;
  }
});
