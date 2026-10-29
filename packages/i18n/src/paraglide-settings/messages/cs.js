/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Settings_Account_TitleInputs */
/** @typedef {{}} Settings_Allow_SelfInputs */
/** @typedef {{}} Settings_Approval_RequiredInputs */
/** @typedef {{}} Settings_Approvals_IntroInputs */
/** @typedef {{}} Settings_Approvals_TitleInputs */
/** @typedef {{ count: NonNullable<unknown> }} Settings_Brand_RequiredInputs */
/** @typedef {{}} Settings_Brands_TitleInputs */
/** @typedef {{}} Settings_ConflictInputs */
/** @typedef {{}} Settings_DefaultsInputs */
/** @typedef {{}} Settings_Display_NameInputs */
/** @typedef {{}} Settings_Email_ApprovalsInputs */
/** @typedef {{}} Settings_Email_Approvals_HintInputs */
/** @typedef {{}} Settings_Email_ChannelsInputs */
/** @typedef {{}} Settings_Email_Channels_HintInputs */
/** @typedef {{}} Settings_Email_FailedInputs */
/** @typedef {{}} Settings_Email_FailuresInputs */
/** @typedef {{}} Settings_Email_Failures_HintInputs */
/** @typedef {{}} Settings_Email_TitleInputs */
/** @typedef {{}} Settings_In_App_NoteInputs */
/** @typedef {{}} Settings_Name_FailedInputs */
/** @typedef {{}} Settings_Name_SavedInputs */
/** @typedef {{}} Settings_Nav_LabelInputs */
/** @typedef {{}} Settings_Not_RequiredInputs */
/** @typedef {{}} Settings_Not_SetInputs */
/** @typedef {{}} Settings_Password_ChangeInputs */
/** @typedef {{}} Settings_Password_ChangedInputs */
/** @typedef {{}} Settings_Password_CurrentInputs */
/** @typedef {{}} Settings_Password_FailedInputs */
/** @typedef {{}} Settings_Password_IncorrectInputs */
/** @typedef {{}} Settings_Password_RepeatInputs */
/** @typedef {{}} Settings_Password_Two_FactorInputs */
/** @typedef {{}} Settings_Policy_TitleInputs */
/** @typedef {{}} Settings_Preferences_TitleInputs */
/** @typedef {{}} Settings_Profile_TitleInputs */
/** @typedef {{}} Settings_Read_OnlyInputs */
/** @typedef {{}} Settings_Required_ApprovalsInputs */
/** @typedef {{}} Settings_SavedInputs */
/** @typedef {{}} Settings_SavingInputs */
/** @typedef {{}} Settings_System_TitleInputs */
/** @typedef {{}} Settings_ThemeInputs */
/** @typedef {{}} Settings_ToleranceInputs */
/** @typedef {{}} System_Api_CriticalInputs */
/** @typedef {{ count: NonNullable<unknown> }} System_Api_Days_LeftInputs */
/** @typedef {{}} System_Api_EndedInputs */
/** @typedef {{}} System_Api_No_SunsetInputs */
/** @typedef {{ date: NonNullable<unknown> }} System_Api_SunsetInputs */
/** @typedef {{}} System_Api_TitleInputs */
/** @typedef {{ version: NonNullable<unknown> }} System_Api_VersionInputs */
/** @typedef {{}} System_Api_WarnInputs */
/** @typedef {{ duration: NonNullable<unknown> }} System_Cron_DurationInputs */
/** @typedef {{}} System_Cron_FailedInputs */
/** @typedef {{ when: NonNullable<unknown> }} System_Cron_Last_RunInputs */
/** @typedef {{}} System_Cron_NeverInputs */
/** @typedef {{}} System_Cron_RunningInputs */
/** @typedef {{}} System_Cron_StaleInputs */
/** @typedef {{}} System_Cron_TitleInputs */
/** @typedef {{}} System_Incident_App_Credentials_InvalidInputs */
/** @typedef {{}} System_Incident_App_SuspendedInputs */
/** @typedef {{ count: NonNullable<unknown> }} System_Incident_OccurrencesInputs */
/** @typedef {{}} System_Incident_OpenInputs */
/** @typedef {{}} System_Incident_Provider_OutageInputs */
/** @typedef {{}} System_Incident_Rate_Limited_AppInputs */
/** @typedef {{ when: NonNullable<unknown> }} System_Incident_ResolvedInputs */
/** @typedef {{ first: NonNullable<unknown>, last: NonNullable<unknown> }} System_Incident_SeenInputs */
/** @typedef {{}} System_Incident_Tier_Not_EnrolledInputs */
/** @typedef {{}} System_Incidents_EmptyInputs */
/** @typedef {{}} System_Incidents_TitleInputs */
/** @typedef {{}} System_No_DataInputs */
/** @typedef {{}} System_OkInputs */
/** @typedef {{}} System_Slo_DayInputs */
/** @typedef {{}} System_Slo_DuplicatesInputs */
/** @typedef {{}} System_Slo_On_TimeInputs */
/** @typedef {{}} System_Slo_TitleInputs */
/** @typedef {{ count: NonNullable<unknown> }} System_Slo_TotalInputs */
/** @typedef {{}} System_Slo_UnconfirmedInputs */
/** @typedef {{}} System_Slo_WeekInputs */
/** @typedef {{}} System_Target_MetInputs */
/** @typedef {{}} System_Target_MissedInputs */
/** @typedef {{}} Theme_Option_DarkInputs */
/** @typedef {{}} Theme_Option_LightInputs */
/** @typedef {{}} Theme_Option_SystemInputs */
import * as registry from "../registry.js"


export const settings_account_title = /** @type {(inputs: Settings_Account_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Účet`)
};

export const settings_allow_self = /** @type {(inputs: Settings_Allow_SelfInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Autor žádosti může schválit vlastní příspěvek`)
};

export const settings_approval_required = /** @type {(inputs: Settings_Approval_RequiredInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Příspěvky vyžadují schválení`)
};

export const settings_approvals_intro = /** @type {(inputs: Settings_Approvals_IntroInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Určete, zda příspěvky musí být před zveřejněním schváleny.`)
};

export const settings_approvals_title = /** @type {(inputs: Settings_Approvals_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Schvalování`)
};

export const settings_brand_required = /** @type {(inputs: Settings_Brand_RequiredInputs) => LocalizedString} */ (i) => {
	const countPlural = registry.plural("cs", i?.count, {}, true);
	if (countPlural === "one") return /** @type {LocalizedString} */ (`Vyžaduje se ${i?.count} schválení`);
	if (countPlural === "few") return /** @type {LocalizedString} */ (`Vyžadují se ${i?.count} schválení`);
	if (countPlural === "many") return /** @type {LocalizedString} */ (`Vyžaduje se ${i?.count} schválení`);
	return /** @type {LocalizedString} */ (`Vyžaduje se ${i?.count} schválení`)
};

export const settings_brands_title = /** @type {(inputs: Settings_Brands_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Výjimky pro značky`)
};

export const settings_conflict = /** @type {(inputs: Settings_ConflictInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Nastavení mezitím změnil někdo jiný. Zobrazuje se nejnovější verze.`)
};

export const settings_defaults = /** @type {(inputs: Settings_DefaultsInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Zatím není nic uloženo: zobrazují se výchozí hodnoty.`)
};

export const settings_display_name = /** @type {(inputs: Settings_Display_NameInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Jméno`)
};

export const settings_email_approvals = /** @type {(inputs: Settings_Email_ApprovalsInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Schvalování`)
};

export const settings_email_approvals_hint = /** @type {(inputs: Settings_Email_Approvals_HintInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Žádosti o schválení a rozhodnutí o nich`)
};

export const settings_email_channels = /** @type {(inputs: Settings_Email_ChannelsInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Problémy s kanály`)
};

export const settings_email_channels_hint = /** @type {(inputs: Settings_Email_Channels_HintInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Kanály, které je potřeba znovu připojit nebo kterým brzy vyprší přístup`)
};

export const settings_email_failed = /** @type {(inputs: Settings_Email_FailedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Nastavení oznámení se neuložilo. Zkuste to znovu.`)
};

export const settings_email_failures = /** @type {(inputs: Settings_Email_FailuresInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Selhání`)
};

export const settings_email_failures_hint = /** @type {(inputs: Settings_Email_Failures_HintInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Příspěvky, které selžou nebo je musíte zveřejnit ručně`)
};

export const settings_email_title = /** @type {(inputs: Settings_Email_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Oznámení e-mailem`)
};

export const settings_in_app_note = /** @type {(inputs: Settings_In_App_NoteInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Oznámení v aplikaci se vždy zobrazí pod zvonečkem.`)
};

export const settings_name_failed = /** @type {(inputs: Settings_Name_FailedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Jméno se neuložilo. Zkuste to znovu.`)
};

export const settings_name_saved = /** @type {(inputs: Settings_Name_SavedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Jméno je uloženo.`)
};

export const settings_nav_label = /** @type {(inputs: Settings_Nav_LabelInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Sekce nastavení`)
};

export const settings_not_required = /** @type {(inputs: Settings_Not_RequiredInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Schválení se nevyžaduje`)
};

export const settings_not_set = /** @type {(inputs: Settings_Not_SetInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Nenastaveno`)
};

export const settings_password_change = /** @type {(inputs: Settings_Password_ChangeInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Změnit heslo`)
};

export const settings_password_changed = /** @type {(inputs: Settings_Password_ChangedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Heslo je změněno. Ostatní zařízení byla odhlášena.`)
};

export const settings_password_current = /** @type {(inputs: Settings_Password_CurrentInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Současné heslo`)
};

export const settings_password_failed = /** @type {(inputs: Settings_Password_FailedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Heslo se nezměnilo. Zkuste to znovu.`)
};

export const settings_password_incorrect = /** @type {(inputs: Settings_Password_IncorrectInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Současné heslo není správné.`)
};

export const settings_password_repeat = /** @type {(inputs: Settings_Password_RepeatInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Zopakujte nové heslo`)
};

export const settings_password_two_factor = /** @type {(inputs: Settings_Password_Two_FactorInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`U účtů s dvoufázovým přihlášením zatím změna hesla není dostupná.`)
};

export const settings_policy_title = /** @type {(inputs: Settings_Policy_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Pravidla schvalování`)
};

export const settings_preferences_title = /** @type {(inputs: Settings_Preferences_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Předvolby`)
};

export const settings_profile_title = /** @type {(inputs: Settings_Profile_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Profil`)
};

export const settings_read_only = /** @type {(inputs: Settings_Read_OnlyInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Tato nastavení mohou měnit jen vlastníci a správci.`)
};

export const settings_required_approvals = /** @type {(inputs: Settings_Required_ApprovalsInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Počet potřebných schválení`)
};

export const settings_saved = /** @type {(inputs: Settings_SavedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Nastavení schvalování je uloženo.`)
};

export const settings_saving = /** @type {(inputs: Settings_SavingInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Ukládá se…`)
};

export const settings_system_title = /** @type {(inputs: Settings_System_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Systém`)
};

export const settings_theme = /** @type {(inputs: Settings_ThemeInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Vzhled`)
};

export const settings_tolerance = /** @type {(inputs: Settings_ToleranceInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Povolený posun po schválení (v minutách)`)
};

export const system_api_critical = /** @type {(inputs: System_Api_CriticalInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Aktualizujte hned`)
};

export const system_api_days_left = /** @type {(inputs: System_Api_Days_LeftInputs) => LocalizedString} */ (i) => {
	const countPlural = registry.plural("cs", i?.count, {}, true);
	if (countPlural === "one") return /** @type {LocalizedString} */ (`Zbývá ${i?.count} den`);
	if (countPlural === "few") return /** @type {LocalizedString} */ (`Zbývají ${i?.count} dny`);
	if (countPlural === "many") return /** @type {LocalizedString} */ (`Zbývá ${i?.count} dne`);
	return /** @type {LocalizedString} */ (`Zbývá ${i?.count} dní`)
};

export const system_api_ended = /** @type {(inputs: System_Api_EndedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Podpora už skončila`)
};

export const system_api_no_sunset = /** @type {(inputs: System_Api_No_SunsetInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Konec podpory zatím není oznámen`)
};

export const system_api_sunset = /** @type {(inputs: System_Api_SunsetInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Podpora končí ${i?.date}`)
};

export const system_api_title = /** @type {(inputs: System_Api_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Verze API sítí`)
};

export const system_api_version = /** @type {(inputs: System_Api_VersionInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Verze ${i?.version}`)
};

export const system_api_warn = /** @type {(inputs: System_Api_WarnInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Brzy aktualizujte`)
};

export const system_cron_duration = /** @type {(inputs: System_Cron_DurationInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Trvala ${i?.duration}`)
};

export const system_cron_failed = /** @type {(inputs: System_Cron_FailedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Selhala`)
};

export const system_cron_last_run = /** @type {(inputs: System_Cron_Last_RunInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Naposledy spuštěna ${i?.when}`)
};

export const system_cron_never = /** @type {(inputs: System_Cron_NeverInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Ještě neběžela`)
};

export const system_cron_running = /** @type {(inputs: System_Cron_RunningInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Běží`)
};

export const system_cron_stale = /** @type {(inputs: System_Cron_StaleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Má zpoždění`)
};

export const system_cron_title = /** @type {(inputs: System_Cron_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Úlohy na pozadí`)
};

export const system_incident_app_credentials_invalid = /** @type {(inputs: System_Incident_App_Credentials_InvalidInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Síť odmítla přihlašovací údaje aplikace`)
};

export const system_incident_app_suspended = /** @type {(inputs: System_Incident_App_SuspendedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Aplikace je pozastavená`)
};

export const system_incident_occurrences = /** @type {(inputs: System_Incident_OccurrencesInputs) => LocalizedString} */ (i) => {
	const countPlural = registry.plural("cs", i?.count, {}, true);
	if (countPlural === "one") return /** @type {LocalizedString} */ (`${i?.count} výskyt`);
	if (countPlural === "few") return /** @type {LocalizedString} */ (`${i?.count} výskyty`);
	if (countPlural === "many") return /** @type {LocalizedString} */ (`${i?.count} výskytu`);
	return /** @type {LocalizedString} */ (`${i?.count} výskytů`)
};

export const system_incident_open = /** @type {(inputs: System_Incident_OpenInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Otevřený`)
};

export const system_incident_provider_outage = /** @type {(inputs: System_Incident_Provider_OutageInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Výpadek sítě`)
};

export const system_incident_rate_limited_app = /** @type {(inputs: System_Incident_Rate_Limited_AppInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Aplikace narazila na limit požadavků`)
};

export const system_incident_resolved = /** @type {(inputs: System_Incident_ResolvedInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Vyřešen ${i?.when}`)
};

export const system_incident_seen = /** @type {(inputs: System_Incident_SeenInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Poprvé ${i?.first}, naposledy ${i?.last}`)
};

export const system_incident_tier_not_enrolled = /** @type {(inputs: System_Incident_Tier_Not_EnrolledInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Chybí úroveň přístupu k API`)
};

export const system_incidents_empty = /** @type {(inputs: System_Incidents_EmptyInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Za posledních 7 dní nedošlo k žádnému incidentu.`)
};

export const system_incidents_title = /** @type {(inputs: System_Incidents_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Incidenty sítí`)
};

export const system_no_data = /** @type {(inputs: System_No_DataInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Bez údajů`)
};

export const system_ok = /** @type {(inputs: System_OkInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`V pořádku`)
};

export const system_slo_day = /** @type {(inputs: System_Slo_DayInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Posledních 24 hodin`)
};

export const system_slo_duplicates = /** @type {(inputs: System_Slo_DuplicatesInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Zveřejněno dvakrát`)
};

export const system_slo_on_time = /** @type {(inputs: System_Slo_On_TimeInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Zveřejněno včas`)
};

export const system_slo_title = /** @type {(inputs: System_Slo_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Cíle zveřejňování`)
};

export const system_slo_total = /** @type {(inputs: System_Slo_TotalInputs) => LocalizedString} */ (i) => {
	const countPlural = registry.plural("cs", i?.count, {}, true);
	if (countPlural === "one") return /** @type {LocalizedString} */ (`${i?.count} automatický příspěvek`);
	if (countPlural === "few") return /** @type {LocalizedString} */ (`${i?.count} automatické příspěvky`);
	if (countPlural === "many") return /** @type {LocalizedString} */ (`${i?.count} automatického příspěvku`);
	return /** @type {LocalizedString} */ (`${i?.count} automatických příspěvků`)
};

export const system_slo_unconfirmed = /** @type {(inputs: System_Slo_UnconfirmedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Nepotvrzené`)
};

export const system_slo_week = /** @type {(inputs: System_Slo_WeekInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Posledních 7 dní`)
};

export const system_target_met = /** @type {(inputs: System_Target_MetInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Splněno`)
};

export const system_target_missed = /** @type {(inputs: System_Target_MissedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Nesplněno`)
};

export const theme_option_dark = /** @type {(inputs: Theme_Option_DarkInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Tmavý`)
};

export const theme_option_light = /** @type {(inputs: Theme_Option_LightInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Světlý`)
};

export const theme_option_system = /** @type {(inputs: Theme_Option_SystemInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Podle systému`)
};