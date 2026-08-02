// ─────────────────────────────────────────────────────────────
//  Bot Configuration
//  Values are loaded from data/bot-config.json at startup.
//  Edit them via the web dashboard — changes take effect on
//  the next bot restart.
// ─────────────────────────────────────────────────────────────

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_FILE = path.resolve(__dirname, '../data/bot-config.json');

const DEFAULTS = {
  privilegedRoleId:     '1525747168739197098',
  roleApproverRoleId:   '1525733468292517999',
  taskApproverRoleId:   '1525744799099912265',
  recruitRole1Id:       '1525621977170051102',
  recruitRole2Id:       '1525735901546676335',
  loaRoleId:            '1528446076598751332',
  missedPromoCategoryId:'1525748687697875006',
  missedPromoDelayMs:   2000,
  // Empty array = allow all guilds. Add guild IDs to restrict.
  allowedGuildIds:      [],
};

function loadConfig() {
  try {
    const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    console.warn('[config] Could not read bot-config.json, using defaults.');
    return { ...DEFAULTS };
  }
}

const cfg = loadConfig();

export const PRIVILEGED_ROLE_ID      = cfg.privilegedRoleId;
export const ROLE_APPROVER_ROLE_ID   = cfg.roleApproverRoleId;
export const TASK_APPROVER_ROLE_ID   = cfg.taskApproverRoleId;
export const RECRUIT_ROLE_1_ID       = cfg.recruitRole1Id;
export const RECRUIT_ROLE_2_ID       = cfg.recruitRole2Id;
export const LOA_ROLE_ID             = cfg.loaRoleId;
export const MISSED_PROMO_CATEGORY_ID= cfg.missedPromoCategoryId;
export const MISSED_PROMO_DELAY_MS   = cfg.missedPromoDelayMs;
export const ALLOWED_GUILD_IDS       = cfg.allowedGuildIds; // string[]
