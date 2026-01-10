import { Injectable } from "@angular/core";
import { firstValueFrom, map, of, switchMap, tap } from "rxjs";

import { OrganizationUserApiService } from "@bitwarden/admin-console/common";
import { ApiService } from "@bitwarden/common/abstractions/api.service";
import { ProviderService } from "@bitwarden/common/admin-console/abstractions/provider.service";
import { AccountService } from "@bitwarden/common/auth/abstractions/account.service";
import { getUserId } from "@bitwarden/common/auth/services/account.service";
import { UserNamePipe } from "@bitwarden/angular/pipes/user-name.pipe";
import { LogService } from "@bitwarden/common/platform/abstractions/log.service";

@Injectable({ providedIn: "root" })
export class OrganizationUsersResolverService {
  private usersMap = new Map<string, { name: string; email: string }>();

  constructor(
    private organizationUserApiService: OrganizationUserApiService,
    private providerService: ProviderService,
    private apiService: ApiService,
    private accountService: AccountService,
    private userNamePipe: UserNamePipe,
    private logService: LogService,
  ) {}

  async loadUsers(organizationId: string, providerId?: string, providerName?: string) {
    this.usersMap.clear();

    const response = await this.organizationUserApiService.getAllMiniUserDetails(
      organizationId,
    );

    response.data.forEach((u) => {
      this.usersMap.set(u.userId, {
        name: this.userNamePipe.transform(u),
        email: u.email,
      });
    });

    if (!providerId) {
      return;
    }

    try {
      await firstValueFrom(
        this.accountService.activeAccount$.pipe(
          getUserId,
          switchMap((userId) => this.providerService.get$(providerId, userId)),
          map((provider) => provider?.canManageUsers),
          switchMap((canManage) =>
            canManage ? this.apiService.getProviderUsers(providerId) : of(null),
          ),
          tap((providerUsers) => {
            providerUsers?.data.forEach((u) => {
              this.usersMap.set(u.userId, {
                name: `${this.userNamePipe.transform(u)} (${providerName})`,
                email: u.email,
              });
            });
          }),
        ),
      );
    } catch (e) {
      this.logService.warning(e);
    }
  }

  getUser(userId: string) {
    return this.usersMap.get(userId);
  }

  hasUser(userId: string) {
    return this.usersMap.has(userId);
  }
}
