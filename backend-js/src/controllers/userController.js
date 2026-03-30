import { getAllUsers, addUser, getUserById, updateUser, deleteUser } from '../models/user.js';
import { v4 as uuidv4 } from 'uuid';

export function listUsers(req, res) {
  res.json(getAllUsers());
}

export function createUser(req, res) {
  const { name, email } = req.body;
  if (!name || !email) return res.status(400).json({ error: 'Name and email required' });
  const user = { id: uuidv4(), name, email };
  addUser(user);
  res.status(201).json(user);
}

export function getUser(req, res) {
  const user = getUserById(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
}

export function updateUserHandler(req, res) {
  const user = updateUser(req.params.id, req.body);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
}

export function deleteUserHandler(req, res) {
  const ok = deleteUser(req.params.id);
  if (!ok) return res.status(404).json({ error: 'User not found' });
  res.status(204).send();
}
