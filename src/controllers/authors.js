import {
  createAuthor,
  deleteAuthor,
  getAllAuthors,
  getAuthorById,
  updateAuthor,
} from '../models/authors.js';
import { isValidAuthor } from '../validation.js';

const logFailure = (action, error) => {
  console.error(`Failed to ${action} author.`, error?.name ?? 'UnknownError');
};

const isDuplicateId = (error) => {
  return error?.code === 11000;
};

export const getAuthorsHandler = async (req, res) => {
  try {
    const authors = await getAllAuthors();
    return res.status(200).json(authors);
  } catch (error) {
    logFailure('retrieve authors', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const getAuthorByIdHandler = async (req, res) => {
  try {
    const author = await getAuthorById(req.params.id);

    if (!author) {
      return res.status(404).json({ message: 'Author not found' });
    }

    return res.status(200).json(author);
  } catch (error) {
    logFailure('retrieve', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const createAuthorHandler = async (req, res) => {
  if (!isValidAuthor(req.body, ['id', 'name', 'birthYear'])) {
    return res.status(400).json({ message: 'Invalid author. Provide a non-empty id and name and an integer birthYear.' });
  }

  const author = {
    id: req.body.id.trim(),
    name: req.body.name.trim(),
    birthYear: req.body.birthYear,
  };

  try {
    const createdAuthor = await createAuthor(author);
    return res.status(201).json(createdAuthor);
  } catch (error) {
    if (isDuplicateId(error)) {
      return res.status(409).json({ message: 'Author ID already exists' });
    }

    logFailure('create', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateAuthorHandler = async (req, res) => {
  if (!isValidAuthor(req.body, ['name', 'birthYear'])) {
    return res.status(400).json({ message: 'Invalid author. Provide a non-empty name and an integer birthYear.' });
  }

  try {
    const updatedAuthor = await updateAuthor(req.params.id, {
      name: req.body.name.trim(),
      birthYear: req.body.birthYear,
    });

    if (!updatedAuthor) {
      return res.status(404).json({ message: 'Author not found' });
    }

    return res.status(200).json(updatedAuthor);
  } catch (error) {
    logFailure('update', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const deleteAuthorHandler = async (req, res) => {
  try {
    const result = await deleteAuthor(req.params.id);

    if (result.status === 'not-found') {
      return res.status(404).json({ message: 'Author not found' });
    }

    if (result.status === 'conflict') {
      return res.status(409).json({ message: 'Author has books and cannot be deleted' });
    }

    return res.status(204).end();
  } catch (error) {
    logFailure('delete', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
