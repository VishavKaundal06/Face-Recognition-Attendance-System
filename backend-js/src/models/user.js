// Simple in-memory user model (replace with DB in production)
const users = [];

export function getAllUsers() {
  return users;
}

export function addUser(user) {
  users.push(user);
  return user;
}

export function getUserById(id) {
  return users.find(u => u.id === id);
}

export function updateUser(id, updates) {
  const user = users.find(u => u.id === id);
  if (user) Object.assign(user, updates);
  return user;
}

export function deleteUser(id) {
  const idx = users.findIndex(u => u.id === id);
  if (idx !== -1) users.splice(idx, 1);
  return idx !== -1;
}
