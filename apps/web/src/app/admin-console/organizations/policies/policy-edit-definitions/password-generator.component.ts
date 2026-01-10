// FIXME: Update this file to be type safe and remove this and next line
// @ts-strict-ignore
import { ChangeDetectionStrategy, Component } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { UntypedFormBuilder, Validators } from "@angular/forms";
import { BehaviorSubject, map } from "rxjs";

import { PolicyType } from "@bitwarden/common/admin-console/enums";
import { I18nService } from "@bitwarden/common/platform/abstractions/i18n.service";
import { BuiltIn, Profile } from "@bitwarden/generator-core";

import { SharedModule } from "../../../../shared";
import { BasePolicyEditDefinition, BasePolicyEditComponent } from "../base-policy-edit.component";

export class PasswordGeneratorPolicy extends BasePolicyEditDefinition {
  name = "passwordGenerator";
  description = "passwordGeneratorPolicyDesc";
  type = PolicyType.PasswordGenerator;
  component = PasswordGeneratorPolicyComponent;
}

@Component({
  selector: "password-generator-policy-edit",
  templateUrl: "password-generator.component.html",
  imports: [SharedModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PasswordGeneratorPolicyComponent extends BasePolicyEditComponent {
  protected readonly constraints = PasswordPolicyConstraints.account();

  data = this.formBuilder.group({
    overridePasswordType: [null],
    minLength: [null, [Validators.min(this.constraints.length.min), Validators.max(this.constraints.length.max)]],
    useUpper: [null],
    useLower: [null],
    useNumbers: [null],
    useSpecial: [null],
    minNumbers: [null, [Validators.min(this.constraints.minNumber.min), Validators.max(this.constraints.minNumber.max)]],
    minSpecial: [null, [Validators.min(this.constraints.minSpecial.min), Validators.max(this.constraints.minSpecial.max)]],
    minNumberWords: [
      null,
      [Validators.min(this.constraints.numWords.min), Validators.max(this.constraints.numWords.max)],
    ],
    capitalize: [null],
    includeNumber: [null],
  });

  overridePasswordTypeOptions = this.buildOverrideOptions();

  private showPasswordPolicies$ = new BehaviorSubject<boolean>(true);
  private showPassphrasePolicies$ = new BehaviorSubject<boolean>(true);

  constructor(
    private formBuilder: UntypedFormBuilder,
    private i18nService: I18nService,
  ) {
    super();
    this.setupVisibilityHandlers();
  }

  private buildOverrideOptions() {
    return [
      { name: this.i18nService.t("userPreference"), value: null },
      { name: this.i18nService.t("password"), value: PASSWORD_POLICY },
      { name: this.i18nService.t("passphrase"), value: PASSPHRASE_POLICY },
    ];
  }

  private setupVisibilityHandlers(): void {
    this.data.valueChanges
      .pipe(isEnabled(PASSWORD_POLICY), takeUntilDestroyed())
      .subscribe(this.showPasswordPolicies$);

    this.data.valueChanges
      .pipe(isEnabled(PASSPHRASE_POLICY), takeUntilDestroyed())
      .subscribe(this.showPassphrasePolicies$);
  }
}

class PasswordPolicyConstraints {
  static account() {
    const profile = BuiltIn.password.profiles[Profile.account].constraints.default;
    const passphrase = BuiltIn.passphrase.profiles[Profile.account].constraints.default;

    return {
      length: profile.length,
      minNumber: profile.minNumber,
      minSpecial: profile.minSpecial,
      numWords: passphrase.numWords,
    };
  }
}
