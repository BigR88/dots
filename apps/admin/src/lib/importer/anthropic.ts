import Anthropic from '@anthropic-ai/sdk';

/**
 * Anthropic-Client für die KI-Extraktion (nur Server-Code).
 * Ohne ANTHROPIC_API_KEY bleibt `anthropic` null — die Import-Aktionen melden
 * dann verständlich, dass der Schlüssel fehlt, statt zu crashen.
 */
const apiKey = process.env.ANTHROPIC_API_KEY;

export const anthropicConfigured = Boolean(apiKey);

export const anthropic: Anthropic | null = apiKey ? new Anthropic({ apiKey }) : null;

// Text-Captions sind günstig → Sonnet; Plakate brauchen starke Vision → Opus.
// Per Env überschreibbar, falls man Kosten drücken will (z. B. Haiku für Text).
export const TEXT_MODEL = process.env.DOTS_IMPORT_TEXT_MODEL || 'claude-sonnet-4-6';
export const VISION_MODEL = process.env.DOTS_IMPORT_VISION_MODEL || 'claude-opus-4-8';
