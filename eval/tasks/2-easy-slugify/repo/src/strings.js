function capitalize(text) {
  return text ? text[0].toUpperCase() + text.slice(1) : text;
}

function slugify(text) {
  throw new Error('not implemented');
}

module.exports = { capitalize, slugify };
