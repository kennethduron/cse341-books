import { getDb } from '../db/connect.js';

const publicFields = { _id: 0, id: 1, authorId: 1, title: 1, publicationDate: 1 };

export const getAllBooks = async () => {
  const books = await getDb()
    .collection('books')
    .find({}, { projection: publicFields })
    .toArray();

  return books;
};

export const getBookById = async (bookId) => {
  const book = await getDb()
    .collection('books')
    .findOne({ id: bookId }, { projection: publicFields });

  return book;
};

export const doesAuthorExist = async (authorId) => {
  const author = await getDb().collection('authors')
    .findOne({ id: authorId }, { projection: { _id: 1 } });

  return Boolean(author);
};

export const createBook = async (book) => {
  const collection = getDb().collection('books');
  await collection.insertOne(book);
  return getBookById(book.id);
};

export const updateBook = async (bookId, book) => {
  const database = getDb();
  const books = database.collection('books');
  const existingBook = await books.findOne({ id: bookId }, { projection: { _id: 1 } });

  if (!existingBook) {
    return { status: 'not-found' };
  }

  const authorExists = await doesAuthorExist(book.authorId);
  if (!authorExists) {
    return { status: 'invalid-author' };
  }

  const result = await books.updateOne({ id: bookId }, { $set: book });
  if (result.matchedCount === 0) {
    return { status: 'not-found' };
  }

  return { status: 'updated', book: await getBookById(bookId) };
};

export const deleteBook = async (bookId) => {
  const result = await getDb().collection('books').deleteOne({ id: bookId });
  return result.deletedCount === 1 ? { status: 'deleted' } : { status: 'not-found' };
};
