import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const CONFIG_PATH = path.join(DATA_DIR, 'config.json');

interface GuildConfig {
  roleChannel?: string;
  roleRequestChannel?: string;
  recruitLogChannel?: string;
  loaChannel?: string;
  allowedRolesForRequest?: string[];   // roles explicitly allowed for /rolerequest
  disallowedRolesForRequest?: string[]; // roles explicitly disallowed for /rolerequest
  taskLogs?: Record<string, number>;   // userId -> approved task count (current cycle)
}

interface Config {
  guilds: Record<string, GuildConfig>;
}

function loadConfig(): Config {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(CONFIG_PATH)) {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify({ guilds: {} }, null, 2));
  }
  const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
  return JSON.parse(raw) as Config;
}

function saveConfig(config: Config): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

export function getGuildConfig(guildId: string): GuildConfig {
  const config = loadConfig();
  return config.guilds[guildId] ?? {};
}

export function setGuildConfig(guildId: string, updates: Partial<GuildConfig>): void {
  const config = loadConfig();
  config.guilds[guildId] = { ...config.guilds[guildId], ...updates };
  saveConfig(config);
}

export function allowRoleForRequest(guildId: string, roleId: string): void {
  const config = loadConfig();
  const guild = config.guilds[guildId] ?? {};
  const allowed = new Set(guild.allowedRolesForRequest ?? []);
  const disallowed = new Set(guild.disallowedRolesForRequest ?? []);
  allowed.add(roleId);
  disallowed.delete(roleId);
  config.guilds[guildId] = {
    ...guild,
    allowedRolesForRequest: [...allowed],
    disallowedRolesForRequest: [...disallowed],
  };
  saveConfig(config);
}

export function disallowRoleForRequest(guildId: string, roleId: string): void {
  const config = loadConfig();
  const guild = config.guilds[guildId] ?? {};
  const allowed = new Set(guild.allowedRolesForRequest ?? []);
  const disallowed = new Set(guild.disallowedRolesForRequest ?? []);
  disallowed.add(roleId);
  allowed.delete(roleId);
  config.guilds[guildId] = {
    ...guild,
    allowedRolesForRequest: [...allowed],
    disallowedRolesForRequest: [...disallowed],
  };
  saveConfig(config);
}

export function isRoleAllowedForRequest(guildId: string, roleId: string): boolean {
  const guild = getGuildConfig(guildId);
  const disallowed = guild.disallowedRolesForRequest ?? [];
  if (disallowed.includes(roleId)) return false;
  const allowed = guild.allowedRolesForRequest ?? [];
  // If an allowlist exists, role must be in it. If no allowlist, all non-disallowed roles are allowed.
  if (allowed.length > 0) return allowed.includes(roleId);
  return true;
}

export function incrementTaskLog(guildId: string, userId: string): void {
  const config = loadConfig();
  const guild = config.guilds[guildId] ?? {};
  const logs = guild.taskLogs ?? {};
  logs[userId] = (logs[userId] ?? 0) + 1;
  config.guilds[guildId] = { ...guild, taskLogs: logs };
  saveConfig(config);
}

export function resetTaskLogs(guildId: string): void {
  const config = loadConfig();
  const guild = config.guilds[guildId] ?? {};
  config.guilds[guildId] = { ...guild, taskLogs: {} };
  saveConfig(config);
}

export function getTaskLogs(guildId: string): Record<string, number> {
  return getGuildConfig(guildId).taskLogs ?? {};
}
