// ===== Imports mantidos =====
import { CommonModule } from "@angular/common";
import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  OnInit,
  signal,
  ViewChild,
  ViewContainerRef
} from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import {
  BehaviorSubject,
  firstValueFrom,
  Subject
} from "rxjs";
import { filter, switchMap, takeUntil } from "rxjs/operators";

// ===== Tipagens auxiliares =====
interface BroadcasterMessage {
  command: string;
}

// ===== Component =====
@Component({
  selector: "app-vault",
  templateUrl: "vault-v2.component.html",
  standalone: true,
  imports: [CommonModule],
})
export class VaultV2Component<C extends CipherViewLike>
  implements OnInit, OnDestroy, CopyClickListener
{
  // ===== ViewChild sem acesso direto ao DOM =====
  @ViewChild("searchInput", { read: ElementRef })
  private searchInput?: ElementRef<HTMLInputElement>;

  @ViewChild(VaultItemsV2Component, { static: true })
  vaultItemsComponent!: VaultItemsV2Component<C>;

  @ViewChild(VaultFilterComponent, { static: true })
  vaultFilterComponent!: VaultFilterComponent;

  @ViewChild("folderAddEdit", { read: ViewContainerRef, static: true })
  folderAddEditModalRef!: ViewContainerRef;

  @ViewChild(CipherFormComponent)
  cipherFormComponent?: CipherFormComponent;

  // ===== State =====
  readonly cipher = signal<CipherView | null>(null);
  readonly userHasPremium = signal(false);

  private readonly destroy$ = new Subject<void>();
  private readonly activeFilter$ = new BehaviorSubject(new VaultFilter());

  formDisabled = false;
  action: CipherFormMode | "view" | null = null;
  cipherId: string | null = null;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly ngZone: NgZone,
    private readonly cdr: ChangeDetectorRef,
    private readonly broadcaster: BroadcasterService,
    private readonly searchBar: SearchBarService,
    private readonly dialog: DialogService,
    private readonly toast: ToastService,
    private readonly messaging: MessagingService,
    private readonly platform: PlatformUtilsService,
    private readonly totp: TotpService,
    private readonly cipherService: CipherService,
    private readonly accountService: AccountService,
    private readonly passwordReprompt: PasswordRepromptService,
    private readonly eventCollector: EventCollectionService,
    private readonly i18n: I18nService,
  ) {}

  // ===============================
  // Lifecycle
  // ===============================
  ngOnInit(): void {
    this.initPremiumAccess();
    this.initBroadcaster();
    this.initSearchBar();
  }

  ngOnDestroy(): void {
    this.broadcaster.unsubscribe("VaultComponent");
    this.destroy$.next();
    this.destroy$.complete();
    this.searchBar.setEnabled(false);
  }

  // ===============================
  // Initializers
  // ===============================
  private initPremiumAccess(): void {
    this.accountService.activeAccount$
      .pipe(
        filter(Boolean),
        switchMap(a => this.billingAccountProfileStateService.hasPremiumFromAnySource$(a.id)),
        takeUntil(this.destroy$)
      )
      .subscribe(hasPremium => this.userHasPremium.set(hasPremium));
  }

  private initSearchBar(): void {
    this.searchBar.setEnabled(true);
    this.searchBar.setPlaceholderText(this.i18n.t("searchVault"));
  }

  private initBroadcaster(): void {
    this.broadcaster.subscribe("VaultComponent", (msg: BroadcasterMessage) =>
      this.ngZone.run(() => this.handleBroadcastMessage(msg))
    );
  }

  // ===============================
  // Broadcast handler (LF + ANY removidos)
  // ===============================
  private async handleBroadcastMessage(message: BroadcasterMessage): Promise<void> {
    switch (message.command) {
      case "focusSearch":
        this.searchInput?.nativeElement.select();
        return;

      case "copyPassword":
        await this.handleCopyPassword();
        return;

      case "copyTotp":
        await this.handleCopyTotp();
        return;

      default:
        return;
    }
  }

  // ===============================
  // Copy logic isolado (LC + LF)
  // ===============================
  private async handleCopyPassword(): Promise<void> {
    const cipher = this.cipher();
    if (!cipher?.login?.password || !cipher.viewPassword) return;

    this.copyValue(cipher, cipher.login.password, "password", "Password");
    await this.eventCollector.collect(
      EventType.Cipher_ClientCopiedPassword,
      cipher.id
    );
  }

  private async handleCopyTotp(): Promise<void> {
    const cipher = this.cipher();
    if (!cipher?.login?.hasTotp) return;

    const code = await firstValueFrom(
      this.totp.getCode$(cipher.login.totp)
    ).catch(() => null);

    if (code) {
      this.copyValue(cipher, code.code, "verificationCodeTotp", "TOTP");
    }
  }

  // ===============================
  // CopyClickListener
  // ===============================
  onCopy(): void {
    this.messaging.send("minimizeOnCopy");
  }

  // ===============================
  // Clipboard (DOM removido)
  // ===============================
  private copyValue(
    cipher: CipherView,
    value: string,
    labelKey: string,
    type: string
  ): void {
    this.ngZone.run(async () => {
      if (
        cipher.reprompt !== CipherRepromptType.None &&
        !(await this.passwordReprompt.showPasswordPrompt())
      ) {
        return;
      }

      this.platform.copyToClipboard(value);
      this.toast.showToast({
        variant: "info",
        message: this.i18n.t("valueCopied", this.i18n.t(labelKey)),
      });

      this.messaging.send("minimizeOnCopy");
      this.cdr.detectChanges();
    });
  }
}
