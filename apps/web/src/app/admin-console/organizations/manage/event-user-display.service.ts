import { Injectable } from "@angular/core";
import { I18nService } from "@bitwarden/common/platform/abstractions/i18n.service";
import { EventResponse } from "@bitwarden/common/models/response/event.response";
import { EventSystemUser } from "@bitwarden/common/enums";

const EVENT_SYSTEM_USER_TO_TRANSLATION: Record<EventSystemUser, string> = {
  [EventSystemUser.SCIM]: null,
  [EventSystemUser.DomainVerification]: "domainVerification",
  [EventSystemUser.PublicApi]: "publicApi",
};

@Injectable({ providedIn: "root" })
export class EventUserDisplayService {
  constructor(private i18nService: I18nService) {}

  getDisplayName(
    event: EventResponse,
    userLookup: (userId: string) => { name: string } | null,
    providerId?: string,
    providerName?: string,
  ) {
    if (event.installationId) {
      return { name: `Installation: ${event.installationId}` };
    }

    if (event.userId) {
      const user = userLookup(event.userId);
      if (user) {
        return user;
      }

      if (event.providerId && event.providerId === providerId) {
        return { name: providerName };
      }
    }

    if (event.systemUser != null) {
      const key = EVENT_SYSTEM_USER_TO_TRANSLATION[event.systemUser];
      return {
        name: key ? this.i18nService.t(key) : EventSystemUser[event.systemUser],
      };
    }

    if (event.serviceAccountId) {
      return {
        name: `${this.i18nService.t("machineAccount")} ${this.shortId(
          event.serviceAccountId,
        )}`,
      };
    }

    return null;
  }

  private shortId(id: string) {
    return id.substring(0, 8);
  }
}
