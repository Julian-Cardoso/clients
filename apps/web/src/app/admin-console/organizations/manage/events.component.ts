// FIXME: Update this file to be type safe and remove this and next line
// @ts-strict-ignore
import { Component, OnDestroy, OnInit } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { concatMap, firstValueFrom, lastValueFrom, map, of, switchMap, takeUntil, tap } from "rxjs";

import { OrganizationUserApiService } from "@bitwarden/admin-console/common";
import { UserNamePipe } from "@bitwarden/angular/pipes/user-name.pipe";
import { ApiService } from "@bitwarden/common/abstractions/api.service";
import { OrganizationApiServiceAbstraction } from "@bitwarden/common/admin-console/abstractions/organization/organization-api.service.abstraction";
import {
  getOrganizationById,
  OrganizationService,
} from "@bitwarden/common/admin-console/abstractions/organization/organization.service.abstraction";
import { ProviderService } from "@bitwarden/common/admin-console/abstractions/provider.service";
import { Organization } from "@bitwarden/common/admin-console/models/domain/organization";
import { AccountService } from "@bitwarden/common/auth/abstractions/account.service";
import { getUserId } from "@bitwarden/common/auth/services/account.service";
import { ProductTierType } from "@bitwarden/common/billing/enums";
import { OrganizationSubscriptionResponse } from "@bitwarden/common/billing/models/response/organization-subscription.response";
import { EventSystemUser } from "@bitwarden/common/enums";
import { EventResponse } from "@bitwarden/common/models/response/event.response";
import { EventView } from "@bitwarden/common/models/view/event.view";
import { ConfigService } from "@bitwarden/common/platform/abstractions/config/config.service";
import { FileDownloadService } from "@bitwarden/common/platform/abstractions/file-download/file-download.service";
import { I18nService } from "@bitwarden/common/platform/abstractions/i18n.service";
import { LogService } from "@bitwarden/common/platform/abstractions/log.service";
import { PlatformUtilsService } from "@bitwarden/common/platform/abstractions/platform-utils.service";
import { DialogService, ToastService } from "@bitwarden/components";

import {
  ChangePlanDialogResultType,
  openChangePlanDialog,
} from "../../../billing/organizations/change-plan-dialog.component";
import { EventService } from "../../../core";
import { HeaderModule } from "../../../layouts/header/header.module";
import { SharedModule } from "../../../shared";
import { EventExportService } from "../../../tools/event-export";
import { BaseEventsComponent } from "../../common/base.events.component";

import { placeholderEvents } from "./placeholder-events";

const EVENT_SYSTEM_USER_TO_TRANSLATION: Record<EventSystemUser, string> = {
  [EventSystemUser.SCIM]: null, // SCIM acronym not able to be translated so just display SCIM
  [EventSystemUser.DomainVerification]: "domainVerification",
  [EventSystemUser.PublicApi]: "publicApi",
};

// FIXME(https://bitwarden.atlassian.net/browse/CL-764): Migrate to OnPush
// eslint-disable-next-line @angular-eslint/prefer-on-push-component-change-detection
@Component({
  templateUrl: "events.component.html",
  imports: [SharedModule, HeaderModule],
})
export class EventsComponent extends BaseEventsComponent implements OnInit {
  constructor(
    private usersResolver: OrganizationUsersResolverService,
    private userDisplay: EventUserDisplayService,
    private planService: OrganizationPlanService,
    ...
  ) {
    super(...);
  }

  async load() {
    await this.usersResolver.loadUsers(
      this.organizationId,
      this.organization.providerId,
      this.organization.providerName,
    );

    await this.refreshEvents();
    this.loaded = true;
  }

  protected getUserName(r: EventResponse, userId: string) {
    return this.userDisplay.getDisplayName(
      r,
      (id) => this.usersResolver.getUser(id),
      this.organization.providerId,
      this.organization.providerName,
    );
  }

  async changePlan() {
    const changed = await this.planService.changePlan(
      this.organizationId,
      this.organizationSubscription,
      this.organization.productTierType,
    );

    if (changed) {
      await this.load();
    }
  }
}

