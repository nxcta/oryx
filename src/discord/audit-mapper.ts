import { AuditLogEvent } from "discord-api-types/v10";
import { SecurityActionCategory } from "../types.js";

/** Map Discord audit log events to internal security categories. */
export function mapAuditLogAction(action: AuditLogEvent | number): SecurityActionCategory {
  switch (action) {
    case AuditLogEvent.ChannelCreate:
      return SecurityActionCategory.CHANNEL_CREATE;
    case AuditLogEvent.ChannelUpdate:
      return SecurityActionCategory.CHANNEL_UPDATE;
    case AuditLogEvent.ChannelDelete:
      return SecurityActionCategory.CHANNEL_DELETE;
    case AuditLogEvent.RoleCreate:
      return SecurityActionCategory.ROLE_CREATE;
    case AuditLogEvent.RoleUpdate:
      return SecurityActionCategory.ROLE_UPDATE;
    case AuditLogEvent.RoleDelete:
      return SecurityActionCategory.ROLE_DELETE;
    case AuditLogEvent.MemberKick:
      return SecurityActionCategory.MEMBER_KICK;
    case AuditLogEvent.MemberBanAdd:
      return SecurityActionCategory.MEMBER_BAN;
    case AuditLogEvent.MemberBanRemove:
      return SecurityActionCategory.MEMBER_UPDATE;
    case AuditLogEvent.MemberUpdate:
      return SecurityActionCategory.MEMBER_UPDATE;
    case AuditLogEvent.WebhookCreate:
      return SecurityActionCategory.WEBHOOK_CREATE;
    case AuditLogEvent.WebhookUpdate:
      return SecurityActionCategory.WEBHOOK_UPDATE;
    case AuditLogEvent.WebhookDelete:
      return SecurityActionCategory.WEBHOOK_DELETE;
    case AuditLogEvent.IntegrationUpdate:
      return SecurityActionCategory.INTEGRATION_UPDATE;
    case AuditLogEvent.BotAdd:
      return SecurityActionCategory.BOT_ADD;
    case AuditLogEvent.GuildUpdate:
      return SecurityActionCategory.GUILD_UPDATE;
    case AuditLogEvent.EmojiCreate:
    case AuditLogEvent.EmojiUpdate:
      return SecurityActionCategory.UNKNOWN;
    case AuditLogEvent.EmojiDelete:
      return SecurityActionCategory.EMOJI_DELETE;
    case AuditLogEvent.StickerCreate:
    case AuditLogEvent.StickerUpdate:
      return SecurityActionCategory.UNKNOWN;
    case AuditLogEvent.StickerDelete:
      return SecurityActionCategory.STICKER_DELETE;
    case AuditLogEvent.ThreadCreate:
      return SecurityActionCategory.THREAD_CREATE;
    case AuditLogEvent.ThreadUpdate:
      return SecurityActionCategory.UNKNOWN;
    case AuditLogEvent.ThreadDelete:
      return SecurityActionCategory.THREAD_DELETE;
    case AuditLogEvent.InviteCreate:
      return SecurityActionCategory.INVITE_CREATE;
    case AuditLogEvent.InviteDelete:
      return SecurityActionCategory.INVITE_DELETE;
    case AuditLogEvent.OverwriteCreate:
    case AuditLogEvent.OverwriteUpdate:
    case AuditLogEvent.OverwriteDelete:
      return SecurityActionCategory.OVERWRITE_UPDATE;
    default:
      return SecurityActionCategory.UNKNOWN;
  }
}
