/**
 * TECHNICAL SETTINGS
 */

// Address of the n8n webhook. Leave EMPTY ("") for demo mode:
// the form then only logs the data to the console and shows a success message.
const WEBHOOK_URL = "";

// Minimum pause between two submissions from one browser (milliseconds).
const MIN_SUBMIT_INTERVAL_MS = 60 * 1000;

// Change this number to RESTART all "hotHours" countdown timers for every visitor.
// (e.g. start a new 24h promotion: 1 -> 2)
const HOT_VERSION = 1;

// Keep timer and form code reading the same values.
window.CONFIG = { WEBHOOK_URL, MIN_SUBMIT_INTERVAL_MS, HOT_VERSION };
