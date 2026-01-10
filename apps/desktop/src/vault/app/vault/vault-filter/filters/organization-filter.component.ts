
import { Component } from "@angular/core";

import { OrganizationFilterComponent as BaseOrganizationFilterComponent } from "@bitwarden/angular/vault/vault-filter/components/organization-filter.component";
import { DisplayMode } from "@bitwarden/angular/vault/vault-filter/models/display-mode";
import { Organization } from "@bitwarden/common/admin-console/models/domain/organization";
import { I18nService } from "@bitwarden/common/platform/abstractions/i18n.service";
import { ToastService } from "@bitwarden/components";

@Component({
  selector: "app-organization-filter",
  templateUrl: "organization-filter.component.html",
  standalone: false,
})
export class OrganizationFilterComponent extends BaseOrganizationFilterComponent {
  private readonly hiddenDisplayModes: DisplayMode[] = [
    "singleOrganizationAndOrganizatonDataOwnershipPolicies",
  ];

  constructor(
    private i18nService: I18nService,
    private toastService: ToastService,
  ) {
    super();
  }

  get show(): boolean {
    return this.canDisplayFilter();
  }

  async applyOrganizationFilter(organization: Organization) {
    if (!this.isOrganizationEnabled(organization)) {
      this.showDisabledOrganizationError();
      return;
    }

    super.applyOrganizationFilter(organization);
  }

  private canDisplayFilter(): boolean {
    return (
      !this.hide &&
      this.organizations.length > 0 &&
      !this.hiddenDisplayModes.includes(this.displayMode)
    );
  }

  private isOrganizationEnabled(organization: Organization): boolean {
    return organization.enabled;
  }

  private showDisabledOrganizationError(): void {
    this.toastService.showToast({
      variant: "error",
      title: null,
      message: this.i18nService.t("disabledOrganizationFilterError"),
    });
  }
}
