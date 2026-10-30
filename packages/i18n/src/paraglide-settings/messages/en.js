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
/** @typedef {{ color: NonNullable<unknown> }} Settings_Tag_ColorInputs */
/** @typedef {{ name: NonNullable<unknown> }} Settings_Tag_Color_OfInputs */
/** @typedef {{ name: NonNullable<unknown> }} Settings_Tag_DeleteInputs */
/** @typedef {{ count: NonNullable<unknown> }} Settings_Tag_Delete_BodyInputs */
/** @typedef {{}} Settings_Tag_Delete_ConfirmInputs */
/** @typedef {{ name: NonNullable<unknown> }} Settings_Tag_Delete_TitleInputs */
/** @typedef {{}} Settings_Tag_DeletedInputs */
/** @typedef {{}} Settings_Tag_KeepInputs */
/** @typedef {{ name: NonNullable<unknown> }} Settings_Tag_NameInputs */
/** @typedef {{ count: NonNullable<unknown> }} Settings_Tag_PostsInputs */
/** @typedef {{}} Settings_Tag_SavedInputs */
/** @typedef {{}} Settings_Tags_EmptyInputs */
/** @typedef {{}} Settings_Tags_IntroInputs */
/** @typedef {{}} Settings_Tags_TitleInputs */
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
	return /** @type {LocalizedString} */ (`Account`)
};

export const settings_allow_self = /** @type {(inputs: Settings_Allow_SelfInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Requesters can approve their own posts`)
};

export const settings_approval_required = /** @type {(inputs: Settings_Approval_RequiredInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Posts need approval`)
};

export const settings_approvals_intro = /** @type {(inputs: Settings_Approvals_IntroInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Decide whether posts need an approval before they go out.`)
};

export const settings_approvals_title = /** @type {(inputs: Settings_Approvals_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Approvals`)
};

export const settings_brand_required = /** @type {(inputs: Settings_Brand_RequiredInputs) => LocalizedString} */ (i) => {
	const countPlural = registry.plural("en", i?.count, {}, true);
	if (countPlural === "one") return /** @type {LocalizedString} */ (`Approval required: ${i?.count} approval`);
	return /** @type {LocalizedString} */ (`Approval required: ${i?.count} approvals`)
};

export const settings_brands_title = /** @type {(inputs: Settings_Brands_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Brand overrides`)
};

export const settings_conflict = /** @type {(inputs: Settings_ConflictInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Someone else changed these settings. The latest version is shown.`)
};

export const settings_defaults = /** @type {(inputs: Settings_DefaultsInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Nothing saved yet: these are the defaults.`)
};

export const settings_display_name = /** @type {(inputs: Settings_Display_NameInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Name`)
};

export const settings_email_approvals = /** @type {(inputs: Settings_Email_ApprovalsInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Approvals`)
};

export const settings_email_approvals_hint = /** @type {(inputs: Settings_Email_Approvals_HintInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Approval requests and decisions`)
};

export const settings_email_channels = /** @type {(inputs: Settings_Email_ChannelsInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Channel problems`)
};

export const settings_email_channels_hint = /** @type {(inputs: Settings_Email_Channels_HintInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Channels that need reconnecting or are about to expire`)
};

export const settings_email_failed = /** @type {(inputs: Settings_Email_FailedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Your notification settings weren't saved. Try again.`)
};

export const settings_email_failures = /** @type {(inputs: Settings_Email_FailuresInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Failures`)
};

export const settings_email_failures_hint = /** @type {(inputs: Settings_Email_Failures_HintInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Posts that fail or need you to post manually`)
};

export const settings_email_title = /** @type {(inputs: Settings_Email_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Email notifications`)
};

export const settings_in_app_note = /** @type {(inputs: Settings_In_App_NoteInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`In-app notifications always show in the bell.`)
};

export const settings_name_failed = /** @type {(inputs: Settings_Name_FailedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Your name wasn't saved. Try again.`)
};

export const settings_name_saved = /** @type {(inputs: Settings_Name_SavedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Name saved.`)
};

export const settings_nav_label = /** @type {(inputs: Settings_Nav_LabelInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Settings sections`)
};

export const settings_not_required = /** @type {(inputs: Settings_Not_RequiredInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`No approval required`)
};

export const settings_not_set = /** @type {(inputs: Settings_Not_SetInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Not set`)
};

export const settings_password_change = /** @type {(inputs: Settings_Password_ChangeInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Change password`)
};

export const settings_password_changed = /** @type {(inputs: Settings_Password_ChangedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Password changed. Other devices were signed out.`)
};

export const settings_password_current = /** @type {(inputs: Settings_Password_CurrentInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Current password`)
};

export const settings_password_failed = /** @type {(inputs: Settings_Password_FailedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Your password wasn't changed. Try again.`)
};

export const settings_password_incorrect = /** @type {(inputs: Settings_Password_IncorrectInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`The current password is incorrect.`)
};

export const settings_password_repeat = /** @type {(inputs: Settings_Password_RepeatInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Repeat new password`)
};

export const settings_password_two_factor = /** @type {(inputs: Settings_Password_Two_FactorInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Changing the password isn't available yet for accounts with two-factor sign-in.`)
};

export const settings_policy_title = /** @type {(inputs: Settings_Policy_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Approval rules`)
};

export const settings_preferences_title = /** @type {(inputs: Settings_Preferences_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Preferences`)
};

export const settings_profile_title = /** @type {(inputs: Settings_Profile_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Profile`)
};

export const settings_read_only = /** @type {(inputs: Settings_Read_OnlyInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Only owners and admins can change these settings.`)
};

export const settings_required_approvals = /** @type {(inputs: Settings_Required_ApprovalsInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Approvals needed`)
};

export const settings_saved = /** @type {(inputs: Settings_SavedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Approval settings saved.`)
};

export const settings_saving = /** @type {(inputs: Settings_SavingInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Saving…`)
};

export const settings_system_title = /** @type {(inputs: Settings_System_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`System`)
};

export const settings_tag_color = /** @type {(inputs: Settings_Tag_ColorInputs) => LocalizedString} */ (i) => {
	if (i?.color === "slate") return /** @type {LocalizedString} */ (`Slate`);
	if (i?.color === "red") return /** @type {LocalizedString} */ (`Red`);
	if (i?.color === "orange") return /** @type {LocalizedString} */ (`Orange`);
	if (i?.color === "amber") return /** @type {LocalizedString} */ (`Amber`);
	if (i?.color === "green") return /** @type {LocalizedString} */ (`Green`);
	if (i?.color === "teal") return /** @type {LocalizedString} */ (`Teal`);
	if (i?.color === "blue") return /** @type {LocalizedString} */ (`Blue`);
	if (i?.color === "violet") return /** @type {LocalizedString} */ (`Violet`);
	return /** @type {LocalizedString} */ (`Color`)
};

export const settings_tag_color_of = /** @type {(inputs: Settings_Tag_Color_OfInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Color of tag ${i?.name}`)
};

export const settings_tag_delete = /** @type {(inputs: Settings_Tag_DeleteInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Delete tag ${i?.name}`)
};

export const settings_tag_delete_body = /** @type {(inputs: Settings_Tag_Delete_BodyInputs) => LocalizedString} */ (i) => {
	const countPlural = registry.plural("en", i?.count, {}, true);
	if (countPlural === "one") return /** @type {LocalizedString} */ (`It will be removed from ${i?.count} post.`);
	return /** @type {LocalizedString} */ (`It will be removed from ${i?.count} posts.`)
};

export const settings_tag_delete_confirm = /** @type {(inputs: Settings_Tag_Delete_ConfirmInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Delete tag`)
};

export const settings_tag_delete_title = /** @type {(inputs: Settings_Tag_Delete_TitleInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Delete tag “${i?.name}”?`)
};

export const settings_tag_deleted = /** @type {(inputs: Settings_Tag_DeletedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Tag deleted`)
};

export const settings_tag_keep = /** @type {(inputs: Settings_Tag_KeepInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Keep tag`)
};

export const settings_tag_name = /** @type {(inputs: Settings_Tag_NameInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Name of tag ${i?.name}`)
};

export const settings_tag_posts = /** @type {(inputs: Settings_Tag_PostsInputs) => LocalizedString} */ (i) => {
	const countPlural = registry.plural("en", i?.count, {}, true);
	if (countPlural === "one") return /** @type {LocalizedString} */ (`${i?.count} post`);
	return /** @type {LocalizedString} */ (`${i?.count} posts`)
};

export const settings_tag_saved = /** @type {(inputs: Settings_Tag_SavedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Tag saved`)
};

export const settings_tags_empty = /** @type {(inputs: Settings_Tags_EmptyInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`No tags yet. Add one in the composer or on a post.`)
};

export const settings_tags_intro = /** @type {(inputs: Settings_Tags_IntroInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Internal labels for finding and grouping posts. They are never published.`)
};

export const settings_tags_title = /** @type {(inputs: Settings_Tags_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Tags`)
};

export const settings_theme = /** @type {(inputs: Settings_ThemeInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Theme`)
};

export const settings_tolerance = /** @type {(inputs: Settings_ToleranceInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Allowed shift after approval (minutes)`)
};

export const system_api_critical = /** @type {(inputs: System_Api_CriticalInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Upgrade now`)
};

export const system_api_days_left = /** @type {(inputs: System_Api_Days_LeftInputs) => LocalizedString} */ (i) => {
	const countPlural = registry.plural("en", i?.count, {}, true);
	if (countPlural === "one") return /** @type {LocalizedString} */ (`${i?.count} day left`);
	return /** @type {LocalizedString} */ (`${i?.count} days left`)
};

export const system_api_ended = /** @type {(inputs: System_Api_EndedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Support has ended`)
};

export const system_api_no_sunset = /** @type {(inputs: System_Api_No_SunsetInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`No end date announced`)
};

export const system_api_sunset = /** @type {(inputs: System_Api_SunsetInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Support ends ${i?.date}`)
};

export const system_api_title = /** @type {(inputs: System_Api_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Network API versions`)
};

export const system_api_version = /** @type {(inputs: System_Api_VersionInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Version ${i?.version}`)
};

export const system_api_warn = /** @type {(inputs: System_Api_WarnInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Upgrade soon`)
};

export const system_cron_duration = /** @type {(inputs: System_Cron_DurationInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Took ${i?.duration}`)
};

export const system_cron_failed = /** @type {(inputs: System_Cron_FailedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Failed`)
};

export const system_cron_last_run = /** @type {(inputs: System_Cron_Last_RunInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Last started ${i?.when}`)
};

export const system_cron_never = /** @type {(inputs: System_Cron_NeverInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Never ran`)
};

export const system_cron_running = /** @type {(inputs: System_Cron_RunningInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Running`)
};

export const system_cron_stale = /** @type {(inputs: System_Cron_StaleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Overdue`)
};

export const system_cron_title = /** @type {(inputs: System_Cron_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Background jobs`)
};

export const system_incident_app_credentials_invalid = /** @type {(inputs: System_Incident_App_Credentials_InvalidInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`App credentials rejected`)
};

export const system_incident_app_suspended = /** @type {(inputs: System_Incident_App_SuspendedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`App suspended`)
};

export const system_incident_occurrences = /** @type {(inputs: System_Incident_OccurrencesInputs) => LocalizedString} */ (i) => {
	const countPlural = registry.plural("en", i?.count, {}, true);
	if (countPlural === "one") return /** @type {LocalizedString} */ (`${i?.count} occurrence`);
	return /** @type {LocalizedString} */ (`${i?.count} occurrences`)
};

export const system_incident_open = /** @type {(inputs: System_Incident_OpenInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Open`)
};

export const system_incident_provider_outage = /** @type {(inputs: System_Incident_Provider_OutageInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Network outage`)
};

export const system_incident_rate_limited_app = /** @type {(inputs: System_Incident_Rate_Limited_AppInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`App hit its rate limit`)
};

export const system_incident_resolved = /** @type {(inputs: System_Incident_ResolvedInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Resolved ${i?.when}`)
};

export const system_incident_seen = /** @type {(inputs: System_Incident_SeenInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`First seen ${i?.first}, last seen ${i?.last}`)
};

export const system_incident_tier_not_enrolled = /** @type {(inputs: System_Incident_Tier_Not_EnrolledInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`API access level missing`)
};

export const system_incidents_empty = /** @type {(inputs: System_Incidents_EmptyInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`No incidents in the last 7 days.`)
};

export const system_incidents_title = /** @type {(inputs: System_Incidents_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Network incidents`)
};

export const system_no_data = /** @type {(inputs: System_No_DataInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`No data`)
};

export const system_ok = /** @type {(inputs: System_OkInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`OK`)
};

export const system_slo_day = /** @type {(inputs: System_Slo_DayInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Last 24 hours`)
};

export const system_slo_duplicates = /** @type {(inputs: System_Slo_DuplicatesInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Published twice`)
};

export const system_slo_on_time = /** @type {(inputs: System_Slo_On_TimeInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Published on time`)
};

export const system_slo_title = /** @type {(inputs: System_Slo_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Publishing goals`)
};

export const system_slo_total = /** @type {(inputs: System_Slo_TotalInputs) => LocalizedString} */ (i) => {
	const countPlural = registry.plural("en", i?.count, {}, true);
	if (countPlural === "one") return /** @type {LocalizedString} */ (`${i?.count} automatic post`);
	return /** @type {LocalizedString} */ (`${i?.count} automatic posts`)
};

export const system_slo_unconfirmed = /** @type {(inputs: System_Slo_UnconfirmedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Unconfirmed`)
};

export const system_slo_week = /** @type {(inputs: System_Slo_WeekInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Last 7 days`)
};

export const system_target_met = /** @type {(inputs: System_Target_MetInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`On target`)
};

export const system_target_missed = /** @type {(inputs: System_Target_MissedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Missed`)
};

export const theme_option_dark = /** @type {(inputs: Theme_Option_DarkInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Dark`)
};

export const theme_option_light = /** @type {(inputs: Theme_Option_LightInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Light`)
};

export const theme_option_system = /** @type {(inputs: Theme_Option_SystemInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`System`)
};