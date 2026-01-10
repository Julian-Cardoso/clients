import { AutoConfirmPolicyEditComponent } from "./policy-edit-definitions/auto-confirm-policy.component";
import { PolicyRequest } from "@bitwarden/common/admin-console/models/request/policy.request";

export class AutoConfirmPolicyFacade {
  constructor(private component: AutoConfirmPolicyEditComponent) {}

  isEnabled(): boolean {
    return this.component.enabled.value;
  }

  async confirm(): Promise<boolean> {
    return this.component.confirm();
  }

  async buildRequest(): Promise<PolicyRequest> {
    return this.component.buildRequest();
  }

  setStep(step: number) {
    this.component.setStep(step);
  }

  setSingleOrgEnabled(enabled: boolean) {
    this.component.setSingleOrgEnabled(enabled);
  }
}
