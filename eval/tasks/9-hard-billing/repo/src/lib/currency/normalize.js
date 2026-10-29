'use strict';

// The card gateway and the CRM take lower-case ISO codes ("usd", "jpy").
function toGatewayCurrency(code) {
  return String(code).trim().toLowerCase();
}

// Codes coming back from the gateway or typed by staff.
function fromExternalCurrency(code) {
  return String(code).trim().toUpperCase();
}

module.exports = { toGatewayCurrency, fromExternalCurrency };
