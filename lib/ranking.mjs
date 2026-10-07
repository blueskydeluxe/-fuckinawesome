import {blockedContentLink} from './content-domains.mjs';
export function score(up, down) { const total = up + down; return total ? Math.round(up / total * 100) : null; }
export function trending(up, down, created, now = Date.now()) { return (up - down) / Math.pow(Math.max(0, (now - Date.parse(created)) / 3600000) + 2, 1.5); }
export function safeLink(value) { if(blockedContentLink(value))return null;try { const u = new URL(value); return ['http:', 'https:'].includes(u.protocol) && !u.username && !u.password ? u.href : null; } catch { return null; } }
