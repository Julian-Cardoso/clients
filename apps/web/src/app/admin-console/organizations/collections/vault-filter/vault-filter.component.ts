// FIXME: Update this file to be type safe and remove this and next line
// @ts-strict-ignore
import { Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges } from "@angular/core";
import { firstValueFrom, Subject } from "rxjs";

import { PolicyService } from "@bitwarden/common/admin-console/abstractions/policy/policy.service.abstraction";
import { Organization } from "@bitwarden/common/admin-console/models/domain/organization";
import { AccountService } from "@bitwarden/common/auth/abstractions/account.service";
import { BillingApiServiceAbstraction } from "@bitwarden/common/billing/abstractions/billing-api.service.abstraction";
import { I18nService } from "@bitwarden/common/platform/abstractions/i18n.service";
import { PlatformUtilsService } from "@bitwarden/common/platform/abstractions/platform-utils.service";
import { CipherArchiveService } from "@bitwarden/common/vault/abstractions/cipher-archive.service";
import { CipherService } from "@bitwarden/common/vault/abstractions/cipher.service";
import { PremiumUpgradePromptService } from "@bitwarden/common/vault/abstractions/premium-upgrade-prompt.service";
import { TreeNode } from "@bitwarden/common/vault/models/domain/tree-node";
import { RestrictedItemTypesService } from "@bitwarden/common/vault/services/restricted-item-types.service";
import { DialogService, ToastService } from "@bitwarden/components";

import { VaultFilterComponent as BaseVaultFilterComponent } from "../../../../vault/individual-vault/vault-filter/components/vault-filter.component";
import { VaultFilterService } from "../../../../vault/individual-vault/vault-filter/services/abstractions/vault-filter.service";
import {
  VaultFilterList,
  VaultFilterSection,
  VaultFilterType,
} from "../../../../vault/individual-vault/vault-filter/shared/models/vault-filter-section.type";
import { CollectionFilter } from "../../../../vault/individual-vault/vault-filter/shared/models/vault-filter.type";

// FIXME(https://bitwarden.atlassian.net/browse/CL-764): Migrate to OnPush
// eslint-disable-next-line @angular-eslint/prefer-on-push-component-change-detection
@Component({
  selector: "app-organization-vault-filter",
  templateUrl:
    "../../../../vault/individual-vault/vault-filter/components/vault-filter.component.html",
  standalone: false,
})
export class VaultFilterComponent
  extends BaseVaultFilterComponent
  implements OnInit, OnDestroy, OnChanges
{
  @Input() set organization(value: Organization) {
    this.handleOrganizationChange(value);
  }

  private _organization: Organization;
  protected destroy$ = new Subject<void>();

  constructor(
    protected vaultFilterService: VaultFilterService,
    protected policyService: PolicyService,
    protected i18nService: I18nService,
    protected platformUtilsService: PlatformUtilsService,
    protected toastService: ToastService,
    protected billingApiService: BillingApiServiceAbstraction,
    protected dialogService: DialogService,
    protected accountService: AccountService,
    protected restrictedItemTypesService: RestrictedItemTypesService,
    protected cipherService: CipherService,
    protected cipherArchiveService: CipherArchiveService,
    premiumUpgradePromptService: PremiumUpgradePromptService,
  ) {
    super(
      vaultFilterService,
      policyService,
      i18nService,
      platformUtilsService,
      toastService,
      billingApiService,
      dialogService,
      accountService,
      restrictedItemTypesService,
      cipherService,
      cipherArchiveService,
      premiumUpgradePromptService,
    );
  }

  // -------------------------
  // Lifecycle
  // -------------------------

  async ngOnInit() {
    await this.initializeFilters();
  }

  async ngOnChanges(changes: SimpleChanges) {
    if (changes.organization) {
      await this.reloadFilters();
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // -------------------------
  // Organização (LC)
  // -------------------------

  private handleOrganizationChange(value: Organization): void {
    if (value && value !== this._organization) {
      this._organization = value;
      this.vaultFilterService.setOrganizationFilter(this._organization);
    }
  }

  // -------------------------
  // Inicialização de filtros
  // -------------------------

  private async initializeFilters(): Promise<void> {
    this.filters = await this.buildAllFilters();
    this.ensureDefaultFilterSelected();
    this.isLoaded = true;
  }

  private async reloadFilters(): Promise<void> {
    this.filters = await this.buildAllFilters();
  }

  private async ensureDefaultFilterSelected(): Promise<void> {
    if (!this.activeFilter.selectedCipherTypeNode) {
      this.activeFilter.resetFilter();
      this.activeFilter.selectedCollectionNode =
        (await this.getDefaultFilter()) as TreeNode<CollectionFilter>;
    }
  }

  // -------------------------
  // Coleções
  // -------------------------

  protected async addCollectionFilter(): Promise<VaultFilterSection> {
    await this.ensureCollectionsAreExpanded();

    return {
      data$: this.vaultFilterService.buildTypeTree(
        {
          id: "AllCollections",
          name: "collections",
          type: "all",
          icon: "bwi-collection-shared",
        },
        [
          {
            id: "AllCollections",
            name: "Collections",
            type: "all",
            icon: "bwi-collection-shared",
          },
        ],
      ),
      header: {
        showHeader: false,
        isSelectable: true,
      },
      action: this.applyCollectionFilter,
    };
  }

  private async ensureCollectionsAreExpanded(): Promise<void> {
    const collapsedNodes = await firstValueFrom(this.vaultFilterService.collapsedFilterNodes$);
    collapsedNodes.delete("AllCollections");

    const userId = await firstValueFrom(this.activeUserId$);
    await this.vaultFilterService.setCollapsedFilterNodes(collapsedNodes, userId);
  }

  // -------------------------
  // Construção dos filtros
  // -------------------------

  async buildAllFilters(): Promise<VaultFilterList> {
    return {
      typeFilter: await this.addTypeFilter(["favorites"], this._organization?.id),
      collectionFilter: await this.addCollectionFilter(),
      trashFilter: await this.addTrashFilter(),
    };
  }

  async getDefaultFilter(): Promise<TreeNode<VaultFilterType>> {
    return await firstValueFrom(this.filters?.collectionFilter.data$);
  }
}
