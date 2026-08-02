import fs from 'fs';
import path from 'path';

const DATA_DIR    = path.join(process.cwd(), 'data');
const CONFIG_PATH = path.join(DATA_DIR, 'config.json');

function loadConfig() {
  if (!fs.existsSync(DATA_DIR))    fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(CONFIG_PATH)) fs.writeFileSync(CONFIG_PATH, JSON.stringify({ guilds: {} }, null, 2));
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
}

function saveConfig(config) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

export function getGuildConfig(guildId) {
  return loadConfig().guilds[guildId] ?? {};
}

export function setGuildConfig(guildId, updates) {
  const config = loadConfig();
  config.guilds[guildId] = { ...config.guilds[guildId], ...updates };
  saveConfig(config);
}

export function allowRoleForRequest(guildId, roleId) {
  const config     = loadConfig();
  const guild      = config.guilds[guildId] ?? {};
  const allowed    = new Set(guild.allowedRolesForRequest    ?? []);
  const disallowed = new Set(guild.disallowedRolesForRequest ?? []);
  allowed.add(roleId);
  disallowed.delete(roleId);
  config.guilds[guildId] = { ...guild, allowedRolesForRequest: [...allowed], disallowedRolesForRequest: [...disallowed] };
  saveConfig(config);
}

export function disallowRoleForRequest(guildId, roleId) {
  const config     = loadConfig();
  const guild      = config.guilds[guildId] ?? {};
  const allowed    = new Set(guild.allowedRolesForRequest    ?? []);
  const disallowed = new Set(guild.disallowedRolesForRequest ?? []);
  disallowed.add(roleId);
  allowed.delete(roleId);
  config.guilds[guildId] = { ...guild, allowedRolesForRequest: [...allowed], disallowedRolesForRequest: [...disallowed] };
  saveConfig(config);
}

export function isRoleAllowedForRequest(guildId, roleId) {
  const guild      = getGuildConfig(guildId);
  const disallowed = guild.disallowedRolesForRequest ?? [];
  if (disallowed.includes(roleId)) return false;
  const allowed = guild.allowedRolesForRequest ?? [];
  if (allowed.length > 0) return allowed.includes(roleId);
  return true;
}

// Task logs are stored per rank: taskLogs[rank][userId] = count
export function incrementTaskLog(guildId, userId, rank) {
  const config     = loadConfig();
  const guild      = config.guilds[guildId] ?? {};
  const taskLogs   = guild.taskLogs ?? {};
  const rankLogs   = taskLogs[rank] ?? {};
  rankLogs[userId] = (rankLogs[userId] ?? 0) + 1;
  config.guilds[guildId] = { ...guild, taskLogs: { ...taskLogs, [rank]: rankLogs } };
  saveConfig(config);
}

export function resetTaskLogs(guildId, rank) {
  const config   = loadConfig();
  const guild    = config.guilds[guildId] ?? {};
  const taskLogs = guild.taskLogs ?? {};
  config.guilds[guildId] = { ...guild, taskLogs: { ...taskLogs, [rank]: {} } };
  saveConfig(config);
}

export function getTaskLogs(guildId, rank) {
  return (getGuildConfig(guildId).taskLogs ?? {})[rank] ?? {};
}
