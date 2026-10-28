// Returns the integers from start to end, both inclusive, counting by step (> 0).
function range(start, end, step = 1) {
  const out = [];
  for (let i = start; i <= end; i += step) out.push(i);
  return out;
}

module.exports = { range };
