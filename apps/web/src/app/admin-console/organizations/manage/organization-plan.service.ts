import { Injectable } from "@angular/core";
import { lastValueFrom } from "rxjs";

import { DialogService } from "@bitwarden/components";
import {
  ChangePlanDialogResultType,
  openChangePlanDialog,
} from "../../../billing/organizations/change-plan-dialog.component";
import { OrganizationSubscriptionResponse } from "@bitwarden/common/billing/models/response/organization-subscription.response";

@Injectable({ providedIn: "root" })
export class OrganizationPlanService {
  constructor(private dialogService: DialogService) {}

  async changePlan(
    organizationId: string,
    subscription: OrganizationSubscriptionResponse,
    productTierType: any,
  ): Promise<boolean> {
    const ref = openChangePlanDialog(this.dialogService, {
      data: { organizationId, subscription, productTierType },
    });

    const result = await lastValueFrom(ref.closed);
    return result !== ChangePlanDialogResultType.Closed;
  }
}
