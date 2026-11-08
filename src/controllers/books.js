import {
  createBook,
  deleteBook,
  doesAuthorExist,
  getAllBooks,
  getBookById,
  updateBook,
} from '../models/books.js';
import { isValidBook } from '../validation.js';

const logFailure = (action, error) => {
  console.error(`Failed to ${action} book.`, error?.name ?? 'UnknownError');
};

const isDuplicateId = (error) => {
  return error?.code === 11000;
};

export const getBooksHandler = async (req, res) => {
  try {
    const books = await getAllBooks();
    return res.status(200).json(books);
  } catch (error) {
    logFailure('retrieve books', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const getBookByIdHandler = async (req, res) => {
  try {
    const book = await getBookById(req.params.id);

    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }

    return res.status(200).json(book);
  } catch (error) {
    logFailure('retrieve', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const createBookHandler = async (req, res) => {
  if (!isValidBook(req.body, ['id', 'authorId', 'title', 'publicationDate'])) {
    return res.status(400).json({ message: 'Invalid book. Provide a non-empty id, authorId, title, and valid publicationDate.' });
  }

  const book = {
    id: req.body.id.trim(),
    authorId: req.body.authorId.trim(),
    title: req.body.title.trim(),
    publicationDate: req.body.publicationDate,
  };

  try {
    if (!await doesAuthorExist(book.authorId)) {
      return res.status(400).json({ message: 'Author not found for authorId' });
    }

    const createdBook = await createBook(book);
    return res.status(201).json(createdBook);
  } catch (error) {
    if (isDuplicateId(error)) {
      return res.status(409).json({ message: 'Book ID already exists' });
    }

    logFailure('create', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateBookHandler = async (req, res) => {
  if (!isValidBook(req.body, ['authorId', 'title', 'publicationDate'])) {
    return res.status(400).json({ message: 'Invalid book. Provide a non-empty authorId, title, and valid publicationDate.' });
  }

  try {
    const result = await updateBook(req.params.id, {
      authorId: req.body.authorId.trim(),
      title: req.body.title.trim(),
      publicationDate: req.body.publicationDate,
    });

    if (result.status === 'not-found') {
      return res.status(404).json({ message: 'Book not found' });
    }

    if (result.status === 'invalid-author') {
      return res.status(400).json({ message: 'Author not found for authorId' });
    }

    return res.status(200).json(result.book);
  } catch (error) {
    logFailure('update', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const deleteBookHandler = async (req, res) => {
  try {
    const result = await deleteBook(req.params.id);

    if (result.status === 'not-found') {
      return res.status(404).json({ message: 'Book not found' });
    }

    return res.status(204).end();
  } catch (error) {
    logFailure('delete', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
