import { Injectable } from "@angular/core";
import { firstValueFrom } from "rxjs";

import { PolicyApiServiceAbstraction } from "@bitwarden/common/admin-console/abstractions/policy/policy-api.service.abstraction";
import { PolicyType } from "@bitwarden/common/admin-console/enums";
import { PolicyRequest } from "@bitwarden/common/admin-console/models/request/policy.request";
import { AutomaticUserConfirmationService } from "@bitwarden/auto-confirm";
import { AccountService } from "@bitwarden/common/auth/abstractions/account.service";
import { getUserId } from "@bitwarden/common/auth/services/account.service";

@Injectable({ providedIn: "root" })
export class AutoConfirmPolicyWorkflowService {
  constructor(
    private policyApiService: PolicyApiServiceAbstraction,
    private autoConfirmService: AutomaticUserConfirmationService,
    private accountService: AccountService,
  ) {}

  async submitSingleOrgPolicy(organizationId: string) {
    const request: PolicyRequest = { enabled: true, data: null };

    await this.policyApiService.putPolicy(
      organizationId,
      PolicyType.SingleOrg,
      request,
    );
  }

  async submitAutoConfirmPolicy(
    organizationId: string,
    policyType: PolicyType,
    request: PolicyRequest,
  ) {
    await this.policyApiService.putPolicy(organizationId, policyType, request);

    const userId = await firstValueFrom(this.accountService.activeAccount$.pipe(getUserId));
    const currentState = await firstValueFrom(
      this.autoConfirmService.configuration$(userId),
    );

    await this.autoConfirmService.upsert(userId, {
      ...currentState,
      showSetupDialog: false,
    });
  }
}
