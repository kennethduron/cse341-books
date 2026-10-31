import { connectToDb, disconnectFromDb, getDb } from './connect.js';

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

const seedBooks = async () => {
  await connectToDb();

  const database = getDb();
  const existingCollections = await database
    .listCollections({ name: 'books' }, { nameOnly: true })
    .toArray();

  if (existingCollections.length === 0) {
    await database.createCollection('books');
  }

  const collection = database.collection('books');
  await collection.createIndex({ id: 1 }, { unique: true });
  const result = await collection.bulkWrite(
    books.map((book) => {
      return {
        updateOne: {
          filter: { id: book.id },
          update: { $setOnInsert: book },
          upsert: true,
        },
      };
    }),
  );

  console.log(`Books seed complete. Inserted ${result.upsertedCount} new records.`);
};

try {
  await seedBooks();
} catch {
  console.error('Books seed failed because a MongoDB operation failed.');
  process.exitCode = 1;
} finally {
  try {
    await disconnectFromDb();
  } catch {
    console.error('Failed to close the MongoDB connection after seeding.');
    process.exitCode = 1;
  }
}
