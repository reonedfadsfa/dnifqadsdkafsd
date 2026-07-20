// ─────────────────────────────────────────────────────────────
//  Bot Configuration — edit all IDs here, nowhere else.
// ─────────────────────────────────────────────────────────────

// ── Roles ─────────────────────────────────────────────────────

/** Full access: can use /role add, /recruit, all setup commands */
export const PRIVILEGED_ROLE_ID = '1525747168739197098';

/** Can approve / deny /rolerequest embeds */
export const ROLE_APPROVER_ROLE_ID = '1525733468292517999';

/** Can approve / deny /tasklog embeds */
export const TASK_APPROVER_ROLE_ID = '1525744799099912265';

/** Assigned automatically when /recruit is used */
export const RECRUIT_ROLE_1_ID = '1525621977170051102';
export const RECRUIT_ROLE_2_ID = '1525735901546676335';

/** Assigned automatically when /loarequest is submitted */
export const LOA_ROLE_ID = '1528446076598751332';

// ── Categories ────────────────────────────────────────────────

/** New channels created here get the missed-promo embed */
export const MISSED_PROMO_CATEGORY_ID = '1525748687697875006';

// ── Timing ────────────────────────────────────────────────────

/** Delay (ms) before sending the missed-promo embed after a channel is created */
export const MISSED_PROMO_DELAY_MS = 2000;
