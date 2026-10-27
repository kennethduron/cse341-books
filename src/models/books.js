import { getDb } from '../db/connect.js';

export const getAllBooks = async () => {
  const books = await getDb()
    .collection('books')
    .find({}, { projection: { _id: 0 } })
    .toArray();

  return books;
};

export const getBookById = async (bookId) => {
  const book = await getDb()
    .collection('books')
    .findOne({ id: bookId }, { projection: { _id: 0 } });

  return book;
};
