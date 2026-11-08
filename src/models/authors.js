import { getDb } from '../db/connect.js';

const publicFields = { _id: 0, id: 1, name: 1, birthYear: 1 };

export const getAllAuthors = async () => {
  return getDb().collection('authors')
    .find({}, { projection: publicFields })
    .toArray();
};

export const getAuthorById = async (authorId) => {
  return getDb().collection('authors')
    .findOne({ id: authorId }, { projection: publicFields });
};

export const createAuthor = async (author) => {
  const collection = getDb().collection('authors');
  await collection.insertOne(author);
  return getAuthorById(author.id);
};

export const updateAuthor = async (authorId, author) => {
  const collection = getDb().collection('authors');
  const result = await collection.updateOne({ id: authorId }, { $set: author });

  if (result.matchedCount === 0) {
    return null;
  }

  return getAuthorById(authorId);
};

export const deleteAuthor = async (authorId) => {
  const database = getDb();
  const authors = database.collection('authors');
  const author = await authors.findOne({ id: authorId }, { projection: { _id: 1 } });

  if (!author) {
    return { status: 'not-found' };
  }

  const relatedBook = await database.collection('books')
    .findOne({ authorId }, { projection: { _id: 1 } });

  if (relatedBook) {
    return { status: 'conflict' };
  }

  const result = await authors.deleteOne({ id: authorId });
  return result.deletedCount === 1 ? { status: 'deleted' } : { status: 'not-found' };
};
