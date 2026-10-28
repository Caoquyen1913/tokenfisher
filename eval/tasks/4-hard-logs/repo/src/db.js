// Stand-in for the database layer; only its slow-query warnings show up in the log.
function slowQueryWarning(path) {
  return path.startsWith('/products') ? null : 'no query';
}

module.exports = { slowQueryWarning };
