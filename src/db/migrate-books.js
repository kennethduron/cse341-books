import { connectToDb, disconnectFromDb, getDb } from './connect.js';

const migrateBooks = async () => {
  await connectToDb();
  const database = getDb();
  const [books, authors] = await Promise.all([
    database.collection('books').find({}).toArray(),
    database.collection('authors').find({}).toArray(),
  ]);
  const authorsById = new Map(authors.map((author) => {return [author.id, author]}));
  const authorsByName = new Map(authors.map((author) => {return [author.name, author]}));
  const migrationPlan = [];

  for (const book of books) {
    if (book.authorId) {
      const author = authorsById.get(book.authorId);
      if (!author || (book.author && book.author !== author.name)) {
        throw new Error('An existing book has an invalid author reference. No migration writes were applied.');
      }
      if (book.author) {
        migrationPlan.push({ book, author });
      }
      continue;
    }

    const author = authorsByName.get(book.author);
    if (!author) {
      throw new Error('A book author has no matching author record. No migration writes were applied.');
    }
    migrationPlan.push({ book, author });
  }

  const collection = database.collection('books');
  let migratedCount = 0;
  for (const { book, author } of migrationPlan) {
    const result = await collection.updateOne(
      { id: book.id, ...(book.author ? { author: book.author } : {}) },
      { $set: { authorId: author.id }, $unset: { author: '' } },
    );
    migratedCount += result.modifiedCount;
  }

  console.log(`Books migration complete. Updated ${migratedCount} records after validating all references.`);
};

try {
  await migrateBooks();
} catch {
  console.error('Books migration failed; no secret or database error details were displayed.');
  process.exitCode = 1;
} finally {
  try {
    await disconnectFromDb();
  } catch {
    console.error('Failed to close the MongoDB connection after migrating books.');
    process.exitCode = 1;
  }
}
