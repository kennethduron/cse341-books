import { connectToDb, disconnectFromDb, getDb } from './connect.js';

const authors = [
  { id: 'a1', name: 'George Orwell', birthYear: 1903 },
  { id: 'a2', name: 'Jane Austen', birthYear: 1775 },
  { id: 'a3', name: 'Harper Lee', birthYear: 1926 },
];

const seedAuthors = async () => {
  await connectToDb();
  const collection = getDb().collection('authors');
  const result = await collection.bulkWrite(
    authors.map((author) => {
      return {
        updateOne: {
          filter: { id: author.id },
          update: { $setOnInsert: author },
          upsert: true,
        },
      };
    }),
  );

  console.log(`Authors seed complete. Inserted ${result.upsertedCount} new records.`);
};

try {
  await seedAuthors();
} catch {
  console.error('Authors seed failed because a MongoDB operation failed.');
  process.exitCode = 1;
} finally {
  try {
    await disconnectFromDb();
  } catch {
    console.error('Failed to close the MongoDB connection after seeding authors.');
    process.exitCode = 1;
  }
}
