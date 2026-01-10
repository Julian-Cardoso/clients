import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Inject, OnInit, Output } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { firstValueFrom, map } from "rxjs";

import { AccountService } from "@bitwarden/common/auth/abstractions/account.service";
import { UserVerificationService } from "@bitwarden/common/auth/abstractions/user-verification/user-verification.service.abstraction";
import { TwoFactorProviderType } from "@bitwarden/common/auth/enums/two-factor-provider-type";
import { TwoFactorEmailRequest } from "@bitwarden/common/auth/models/request/two-factor-email.request";
import { UpdateTwoFactorEmailRequest } from "@bitwarden/common/auth/models/request/update-two-factor-email.request";
import { TwoFactorEmailResponse } from "@bitwarden/common/auth/models/response/two-factor-email.response";
import { TwoFactorService } from "@bitwarden/common/auth/two-factor";
import { AuthResponse } from "@bitwarden/common/auth/types/auth-response";
import { I18nService } from "@bitwarden/common/platform/abstractions/i18n.service";
import { LogService } from "@bitwarden/common/platform/abstractions/log.service";
import { PlatformUtilsService } from "@bitwarden/common/platform/abstractions/platform-utils.service";
import {
  AsyncActionsModule,
  ButtonModule,
  CalloutModule,
  DIALOG_DATA,
  DialogConfig,
  DialogModule,
  DialogRef,
  DialogService,
  FormFieldModule,
  IconModule,
  InputModule,
  ToastService,
  TypographyModule,
} from "@bitwarden/components";
import { I18nPipe } from "@bitwarden/ui-common";

import { TwoFactorSetupMethodBaseComponent } from "./two-factor-setup-method-base.component";

@Component({
  selector: "app-two-factor-setup-email",
  templateUrl: "two-factor-setup-email.component.html",
  imports: [
    AsyncActionsModule,
    ButtonModule,
    CalloutModule,
    CommonModule,
    DialogModule,
    FormFieldModule,
    IconModule,
    I18nPipe,
    InputModule,
    ReactiveFormsModule,
    TypographyModule,
  ],
})
export class TwoFactorSetupEmailComponent
  extends TwoFactorSetupMethodBaseComponent
  implements OnInit
{
  @Output() onChangeStatus = new EventEmitter<boolean>();

  type = TwoFactorProviderType.Email;
  sentEmail = "";
  emailPromise?: Promise<unknown>;
  override componentName = "app-two-factor-email";

  formGroup = this.formBuilder.group({
    token: ["", Validators.required],
    email: ["", [Validators.email, Validators.required]],
  });

  constructor(
    @Inject(DIALOG_DATA) protected data: AuthResponse<TwoFactorEmailResponse>,
    twoFactorService: TwoFactorService,
    i18nService: I18nService,
    platformUtilsService: PlatformUtilsService,
    logService: LogService,
    userVerificationService: UserVerificationService,
    private accountService: AccountService,
    dialogService: DialogService,
    private formBuilder: FormBuilder,
    private dialogRef: DialogRef,
    protected toastService: ToastService,
  ) {
    super(
      twoFactorService,
      i18nService,
      platformUtilsService,
      logService,
      userVerificationService,
      dialogService,
      toastService,
    );
  }


  async ngOnInit() {
    await this.authenticateEmailTwoFactor(this.data);
  }



  get token(): string {
    return this.formGroup.get("token")?.value ?? "";
  }

  set token(value: string | null) {
    this.formGroup.get("token")?.setValue(value ?? "");
  }

  get email(): string {
    return this.formGroup.get("email")?.value ?? "";
  }

  set email(value: string | null | undefined) {
    this.formGroup.get("email")?.setValue(value ?? "");
  }



  submit = async () => {
    this.formGroup.markAllAsTouched();
    this.enabled ? await this.handleDisable() : await this.handleEnable();
  };

  sendEmail = async () => {
    const request = await this.buildEmailRequest();
    this.emailPromise = this.twoFactorService.postTwoFactorEmailSetup(request);
    await this.emailPromise;
    this.sentEmail = this.email;
  };

  onClose = () => {
    this.dialogRef.close(this.enabled);
  };


  private authenticateEmailTwoFactor(
    authResponse: AuthResponse<TwoFactorEmailResponse>,
  ) {
    super.auth(authResponse);
    return this.processEmailTwoFactorResponse(authResponse.response);
  }

  protected async enable() {
    const request = await this.buildEnableRequest();
    const response = await this.twoFactorService.putTwoFactorEmail(request);
    await this.processEmailTwoFactorResponse(response);
    this.onUpdated.emit(true);
  }

  private disableEmail() {
    return super.disableMethod();
  }

 

  private async handleDisable() {
    await this.disableEmail();
    this.onChangeStatus.emit(false);
  }

  private async handleEnable() {
    if (this.formGroup.invalid) {
      return;
    }
    await this.enable();
    this.onChangeStatus.emit(true);
  }



  private async processEmailTwoFactorResponse(
    response: TwoFactorEmailResponse,
  ) {
    this.updateComponentState(response);
    await this.fillEmailIfMissing(response);
  }

  private updateComponentState(response: TwoFactorEmailResponse) {
    this.token = null;
    this.email = response.email;
    this.enabled = response.enabled;
  }

  private async fillEmailIfMissing(response: TwoFactorEmailResponse) {
    if (!response.enabled && !response.email) {
      this.email = await this.getAccountEmail();
    }
  }

  private async getAccountEmail(): Promise<string> {
    return firstValueFrom(
      this.accountService.activeAccount$.pipe(map((a) => a?.email ?? "")),
    );
  }



  private async buildEmailRequest() {
    const request = await this.buildRequestModel(TwoFactorEmailRequest);
    request.email = this.email;
    return request;
  }

  private async buildEnableRequest() {
    const request = await this.buildRequestModel(UpdateTwoFactorEmailRequest);
    request.email = this.email;
    request.token = this.token;
    return request;
  }



  static open(
    dialogService: DialogService,
    config: DialogConfig<AuthResponse<TwoFactorEmailResponse>>,
  ) {
    return dialogService.open<boolean, AuthResponse<TwoFactorEmailResponse>>(
      TwoFactorSetupEmailComponent,
      config as DialogConfig<AuthResponse<TwoFactorEmailResponse>, DialogRef<boolean>>,
    );
  }
}
