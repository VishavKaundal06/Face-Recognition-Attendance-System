// In-memory face database (replace with persistent DB in production)
// Stores: { id, name, descriptors: [Float32Array] }
const faces = [];

export function addFace({ id, name, descriptor }) {
  let person = faces.find(f => f.id === id);
  if (!person) {
    person = { id, name, descriptors: [] };
    faces.push(person);
  }
  person.descriptors.push(descriptor);
  return person;
}

export function getAllFaces() {
  return faces;
}

export function findBestMatch(descriptor, threshold = 0.5) {
  let best = null;
  let bestDist = Infinity;
  for (const person of faces) {
    for (const d of person.descriptors) {
      const dist = euclideanDistance(descriptor, d);
      if (dist < bestDist) {
        bestDist = dist;
        best = person;
      }
    }
  }
  if (best && bestDist < threshold) {
    return { match: best, distance: bestDist };
  }
  return null;
}

function euclideanDistance(a, b) {
  if (!a || !b || a.length !== b.length) return Infinity;
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += (a[i] - b[i]) ** 2;
  }
  return Math.sqrt(sum);
}
