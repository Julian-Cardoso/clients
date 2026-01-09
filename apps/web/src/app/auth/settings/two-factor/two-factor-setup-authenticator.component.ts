import { CommonModule } from "@angular/common";
import {
  Component,
  ElementRef,
  EventEmitter,
  Inject,
  OnDestroy,
  OnInit,
  Output,
  Renderer2,
  ViewChild,
} from "@angular/core";
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from "@angular/forms";
import { firstValueFrom, map } from "rxjs";

import { JslibModule } from "@bitwarden/angular/jslib.module";
import { AccountService } from "@bitwarden/common/auth/abstractions/account.service";
import { UserVerificationService } from "@bitwarden/common/auth/abstractions/user-verification/user-verification.service.abstraction";
import { TwoFactorProviderType } from "@bitwarden/common/auth/enums/two-factor-provider-type";
import { TwoFactorAuthenticatorResponse } from "@bitwarden/common/auth/models/response/two-factor-authenticator.response";
import { TwoFactorService } from "@bitwarden/common/auth/two-factor";
import { AuthResponse } from "@bitwarden/common/auth/types/auth-response";
import { ConfigService } from "@bitwarden/common/platform/abstractions/config/config.service";
import { I18nService } from "@bitwarden/common/platform/abstractions/i18n.service";
import { LogService } from "@bitwarden/common/platform/abstractions/log.service";
import { PlatformUtilsService } from "@bitwarden/common/platform/abstractions/platform-utils.service";
import { Utils } from "@bitwarden/common/platform/misc/utils";
import {
  AsyncActionsModule,
  ButtonModule,
  CalloutModule,
  DIALOG_DATA,
  DialogModule,
  DialogRef,
  DialogService,
  FormFieldModule,
  IconModule,
  InputModule,
  LinkModule,
  ToastService,
  TypographyModule
} from "@bitwarden/components";
import { I18nPipe } from "@bitwarden/ui-common";

import { TwoFactorSetupMethodBaseComponent } from "./two-factor-setup-method-base.component";

declare global {
  interface Window {
    QRious: new (options: { element: HTMLElement; value: string; size: number }) => unknown;
  }
}

@Component({
  selector: "app-two-factor-setup-authenticator",
  templateUrl: "two-factor-setup-authenticator.component.html",
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DialogModule,
    FormFieldModule,
    InputModule,
    LinkModule,
    TypographyModule,
    CalloutModule,
    ButtonModule,
    IconModule,
    I18nPipe,
    AsyncActionsModule,
    JslibModule,
  ],
})
export class TwoFactorSetupAuthenticatorComponent
  extends TwoFactorSetupMethodBaseComponent
  implements OnInit, OnDestroy
{
  @Output() onChangeStatus = new EventEmitter<boolean>();

  @ViewChild("qr", { static: false }) qrElement!: ElementRef<HTMLElement>;

  type = TwoFactorProviderType.Authenticator;
  key!: string;
  private userVerificationToken!: string;

  qrScriptError = false;
  private qrScript!: HTMLScriptElement;

  formGroup = this.formBuilder.group({
    token: new FormControl<string | null>(null, {
      validators: [Validators.required, Validators.minLength(6)],
    }),
  });

  constructor(
    @Inject(DIALOG_DATA) protected data: AuthResponse<TwoFactorAuthenticatorResponse>,
    private dialogRef: DialogRef,
    twoFactorService: TwoFactorService,
    i18nService: I18nService,
    userVerificationService: UserVerificationService,
    private formBuilder: FormBuilder,
    platformUtilsService: PlatformUtilsService,
    logService: LogService,
    private accountService: AccountService,
    dialogService: DialogService,
    private configService: ConfigService,
    protected toastService: ToastService,
    private renderer: Renderer2,
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
    this.loadQrScript();
    await this.auth(this.data);
  }

  ngOnDestroy() {
    if (this.qrScript) {
      this.renderer.removeChild(document.body, this.qrScript);
    }
  }

  private loadQrScript() {
    this.qrScript = this.renderer.createElement("script");
    this.qrScript.src = "scripts/qrious.min.js";
    this.qrScript.async = true;
    this.renderer.appendChild(document.body, this.qrScript);
  }

  async auth(authResponse: AuthResponse<TwoFactorAuthenticatorResponse>) {
    super.auth(authResponse);
    await this.handleAuthenticatorResponse(authResponse.response);
  }

  private async handleAuthenticatorResponse(response: TwoFactorAuthenticatorResponse) {
    this.resetForm();
    this.updateState(response);
    await this.ensureQrLoaded();
    await this.renderQrCode();
  }

  private resetForm() {
    this.formGroup.reset();
  }

  private updateState(response: TwoFactorAuthenticatorResponse) {
    this.enabled = response.enabled;
    this.key = response.key;
    this.userVerificationToken = response.userVerificationToken;
  }

  private async ensureQrLoaded() {
    if (window.QRious || this.qrScriptError) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      this.qrScript.onload = () => resolve();
      this.qrScript.onerror = () => {
        this.qrScriptError = true;
        reject(new Error(this.i18nService.t("twoStepAuthenticatorQRCanvasError")));
      };
    });
  }

  private async renderQrCode() {
    if (this.qrScriptError || !this.qrElement) {
      return;
    }

    const email = await this.getUserEmail();
    new window.QRious({
      element: this.qrElement.nativeElement,
      value: this.buildOtpAuthUrl(email),
      size: 160,
    });
  }

  private async getUserEmail(): Promise<string> {
    return (
      (await firstValueFrom(
        this.accountService.activeAccount$.pipe(map((a) => a?.email)),
      )) ?? ""
    );
  }

  private buildOtpAuthUrl(email: string): string {
    return `otpauth://totp/Bitwarden:${Utils.encodeRFC3986URIComponent(
      email,
    )}?secret=${encodeURIComponent(this.key)}&issuer=Bitwarden`;
  }
}
