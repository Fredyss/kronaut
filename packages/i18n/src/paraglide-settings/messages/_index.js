import { getLocale, experimentalStaticLocale } from "../runtime.js"

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
import * as __en from "./en.js"
import * as __sk from "./sk.js"
import * as __cs from "./cs.js"
/**
* | output |
* | --- |
* | "Account" |
*
* @param {Settings_Account_TitleInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_account_title = /** @type {((inputs?: Settings_Account_TitleInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Account_TitleInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_account_title(inputs)
	if (locale === "cs") return __cs.settings_account_title(inputs)
	return __en.settings_account_title(inputs)
});
/**
* | output |
* | --- |
* | "Requesters can approve their own posts" |
*
* @param {Settings_Allow_SelfInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_allow_self = /** @type {((inputs?: Settings_Allow_SelfInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Allow_SelfInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_allow_self(inputs)
	if (locale === "cs") return __cs.settings_allow_self(inputs)
	return __en.settings_allow_self(inputs)
});
/**
* | output |
* | --- |
* | "Posts need approval" |
*
* @param {Settings_Approval_RequiredInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_approval_required = /** @type {((inputs?: Settings_Approval_RequiredInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Approval_RequiredInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_approval_required(inputs)
	if (locale === "cs") return __cs.settings_approval_required(inputs)
	return __en.settings_approval_required(inputs)
});
/**
* | output |
* | --- |
* | "Decide whether posts need an approval before they go out." |
*
* @param {Settings_Approvals_IntroInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_approvals_intro = /** @type {((inputs?: Settings_Approvals_IntroInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Approvals_IntroInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_approvals_intro(inputs)
	if (locale === "cs") return __cs.settings_approvals_intro(inputs)
	return __en.settings_approvals_intro(inputs)
});
/**
* | output |
* | --- |
* | "Approvals" |
*
* @param {Settings_Approvals_TitleInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_approvals_title = /** @type {((inputs?: Settings_Approvals_TitleInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Approvals_TitleInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_approvals_title(inputs)
	if (locale === "cs") return __cs.settings_approvals_title(inputs)
	return __en.settings_approvals_title(inputs)
});
/**
* | countPlural | output |
* | --- | --- |
* | "one" | "Approval required: {count} approval" |
* | * | "Approval required: {count} approvals" |
*
* @param {Settings_Brand_RequiredInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_brand_required = /** @type {((inputs: Settings_Brand_RequiredInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Brand_RequiredInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_brand_required(inputs)
	if (locale === "cs") return __cs.settings_brand_required(inputs)
	return __en.settings_brand_required(inputs)
});
/**
* | output |
* | --- |
* | "Brand overrides" |
*
* @param {Settings_Brands_TitleInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_brands_title = /** @type {((inputs?: Settings_Brands_TitleInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Brands_TitleInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_brands_title(inputs)
	if (locale === "cs") return __cs.settings_brands_title(inputs)
	return __en.settings_brands_title(inputs)
});
/**
* | output |
* | --- |
* | "Someone else changed these settings. The latest version is shown." |
*
* @param {Settings_ConflictInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_conflict = /** @type {((inputs?: Settings_ConflictInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_ConflictInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_conflict(inputs)
	if (locale === "cs") return __cs.settings_conflict(inputs)
	return __en.settings_conflict(inputs)
});
/**
* | output |
* | --- |
* | "Nothing saved yet: these are the defaults." |
*
* @param {Settings_DefaultsInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_defaults = /** @type {((inputs?: Settings_DefaultsInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_DefaultsInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_defaults(inputs)
	if (locale === "cs") return __cs.settings_defaults(inputs)
	return __en.settings_defaults(inputs)
});
/**
* | output |
* | --- |
* | "Name" |
*
* @param {Settings_Display_NameInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_display_name = /** @type {((inputs?: Settings_Display_NameInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Display_NameInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_display_name(inputs)
	if (locale === "cs") return __cs.settings_display_name(inputs)
	return __en.settings_display_name(inputs)
});
/**
* | output |
* | --- |
* | "Approvals" |
*
* @param {Settings_Email_ApprovalsInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_email_approvals = /** @type {((inputs?: Settings_Email_ApprovalsInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Email_ApprovalsInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_email_approvals(inputs)
	if (locale === "cs") return __cs.settings_email_approvals(inputs)
	return __en.settings_email_approvals(inputs)
});
/**
* | output |
* | --- |
* | "Approval requests and decisions" |
*
* @param {Settings_Email_Approvals_HintInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_email_approvals_hint = /** @type {((inputs?: Settings_Email_Approvals_HintInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Email_Approvals_HintInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_email_approvals_hint(inputs)
	if (locale === "cs") return __cs.settings_email_approvals_hint(inputs)
	return __en.settings_email_approvals_hint(inputs)
});
/**
* | output |
* | --- |
* | "Channel problems" |
*
* @param {Settings_Email_ChannelsInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_email_channels = /** @type {((inputs?: Settings_Email_ChannelsInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Email_ChannelsInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_email_channels(inputs)
	if (locale === "cs") return __cs.settings_email_channels(inputs)
	return __en.settings_email_channels(inputs)
});
/**
* | output |
* | --- |
* | "Channels that need reconnecting or are about to expire" |
*
* @param {Settings_Email_Channels_HintInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_email_channels_hint = /** @type {((inputs?: Settings_Email_Channels_HintInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Email_Channels_HintInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_email_channels_hint(inputs)
	if (locale === "cs") return __cs.settings_email_channels_hint(inputs)
	return __en.settings_email_channels_hint(inputs)
});
/**
* | output |
* | --- |
* | "Your notification settings weren't saved. Try again." |
*
* @param {Settings_Email_FailedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_email_failed = /** @type {((inputs?: Settings_Email_FailedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Email_FailedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_email_failed(inputs)
	if (locale === "cs") return __cs.settings_email_failed(inputs)
	return __en.settings_email_failed(inputs)
});
/**
* | output |
* | --- |
* | "Failures" |
*
* @param {Settings_Email_FailuresInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_email_failures = /** @type {((inputs?: Settings_Email_FailuresInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Email_FailuresInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_email_failures(inputs)
	if (locale === "cs") return __cs.settings_email_failures(inputs)
	return __en.settings_email_failures(inputs)
});
/**
* | output |
* | --- |
* | "Posts that fail or need you to post manually" |
*
* @param {Settings_Email_Failures_HintInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_email_failures_hint = /** @type {((inputs?: Settings_Email_Failures_HintInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Email_Failures_HintInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_email_failures_hint(inputs)
	if (locale === "cs") return __cs.settings_email_failures_hint(inputs)
	return __en.settings_email_failures_hint(inputs)
});
/**
* | output |
* | --- |
* | "Email notifications" |
*
* @param {Settings_Email_TitleInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_email_title = /** @type {((inputs?: Settings_Email_TitleInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Email_TitleInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_email_title(inputs)
	if (locale === "cs") return __cs.settings_email_title(inputs)
	return __en.settings_email_title(inputs)
});
/**
* | output |
* | --- |
* | "In-app notifications always show in the bell." |
*
* @param {Settings_In_App_NoteInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_in_app_note = /** @type {((inputs?: Settings_In_App_NoteInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_In_App_NoteInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_in_app_note(inputs)
	if (locale === "cs") return __cs.settings_in_app_note(inputs)
	return __en.settings_in_app_note(inputs)
});
/**
* | output |
* | --- |
* | "Your name wasn't saved. Try again." |
*
* @param {Settings_Name_FailedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_name_failed = /** @type {((inputs?: Settings_Name_FailedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Name_FailedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_name_failed(inputs)
	if (locale === "cs") return __cs.settings_name_failed(inputs)
	return __en.settings_name_failed(inputs)
});
/**
* | output |
* | --- |
* | "Name saved." |
*
* @param {Settings_Name_SavedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_name_saved = /** @type {((inputs?: Settings_Name_SavedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Name_SavedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_name_saved(inputs)
	if (locale === "cs") return __cs.settings_name_saved(inputs)
	return __en.settings_name_saved(inputs)
});
/**
* | output |
* | --- |
* | "Settings sections" |
*
* @param {Settings_Nav_LabelInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_nav_label = /** @type {((inputs?: Settings_Nav_LabelInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Nav_LabelInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_nav_label(inputs)
	if (locale === "cs") return __cs.settings_nav_label(inputs)
	return __en.settings_nav_label(inputs)
});
/**
* | output |
* | --- |
* | "No approval required" |
*
* @param {Settings_Not_RequiredInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_not_required = /** @type {((inputs?: Settings_Not_RequiredInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Not_RequiredInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_not_required(inputs)
	if (locale === "cs") return __cs.settings_not_required(inputs)
	return __en.settings_not_required(inputs)
});
/**
* | output |
* | --- |
* | "Not set" |
*
* @param {Settings_Not_SetInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_not_set = /** @type {((inputs?: Settings_Not_SetInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Not_SetInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_not_set(inputs)
	if (locale === "cs") return __cs.settings_not_set(inputs)
	return __en.settings_not_set(inputs)
});
/**
* | output |
* | --- |
* | "Change password" |
*
* @param {Settings_Password_ChangeInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_password_change = /** @type {((inputs?: Settings_Password_ChangeInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Password_ChangeInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_password_change(inputs)
	if (locale === "cs") return __cs.settings_password_change(inputs)
	return __en.settings_password_change(inputs)
});
/**
* | output |
* | --- |
* | "Password changed. Other devices were signed out." |
*
* @param {Settings_Password_ChangedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_password_changed = /** @type {((inputs?: Settings_Password_ChangedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Password_ChangedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_password_changed(inputs)
	if (locale === "cs") return __cs.settings_password_changed(inputs)
	return __en.settings_password_changed(inputs)
});
/**
* | output |
* | --- |
* | "Current password" |
*
* @param {Settings_Password_CurrentInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_password_current = /** @type {((inputs?: Settings_Password_CurrentInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Password_CurrentInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_password_current(inputs)
	if (locale === "cs") return __cs.settings_password_current(inputs)
	return __en.settings_password_current(inputs)
});
/**
* | output |
* | --- |
* | "Your password wasn't changed. Try again." |
*
* @param {Settings_Password_FailedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_password_failed = /** @type {((inputs?: Settings_Password_FailedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Password_FailedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_password_failed(inputs)
	if (locale === "cs") return __cs.settings_password_failed(inputs)
	return __en.settings_password_failed(inputs)
});
/**
* | output |
* | --- |
* | "The current password is incorrect." |
*
* @param {Settings_Password_IncorrectInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_password_incorrect = /** @type {((inputs?: Settings_Password_IncorrectInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Password_IncorrectInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_password_incorrect(inputs)
	if (locale === "cs") return __cs.settings_password_incorrect(inputs)
	return __en.settings_password_incorrect(inputs)
});
/**
* | output |
* | --- |
* | "Repeat new password" |
*
* @param {Settings_Password_RepeatInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_password_repeat = /** @type {((inputs?: Settings_Password_RepeatInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Password_RepeatInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_password_repeat(inputs)
	if (locale === "cs") return __cs.settings_password_repeat(inputs)
	return __en.settings_password_repeat(inputs)
});
/**
* | output |
* | --- |
* | "Changing the password isn't available yet for accounts with two-factor sign-in." |
*
* @param {Settings_Password_Two_FactorInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_password_two_factor = /** @type {((inputs?: Settings_Password_Two_FactorInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Password_Two_FactorInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_password_two_factor(inputs)
	if (locale === "cs") return __cs.settings_password_two_factor(inputs)
	return __en.settings_password_two_factor(inputs)
});
/**
* | output |
* | --- |
* | "Approval rules" |
*
* @param {Settings_Policy_TitleInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_policy_title = /** @type {((inputs?: Settings_Policy_TitleInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Policy_TitleInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_policy_title(inputs)
	if (locale === "cs") return __cs.settings_policy_title(inputs)
	return __en.settings_policy_title(inputs)
});
/**
* | output |
* | --- |
* | "Preferences" |
*
* @param {Settings_Preferences_TitleInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_preferences_title = /** @type {((inputs?: Settings_Preferences_TitleInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Preferences_TitleInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_preferences_title(inputs)
	if (locale === "cs") return __cs.settings_preferences_title(inputs)
	return __en.settings_preferences_title(inputs)
});
/**
* | output |
* | --- |
* | "Profile" |
*
* @param {Settings_Profile_TitleInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_profile_title = /** @type {((inputs?: Settings_Profile_TitleInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Profile_TitleInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_profile_title(inputs)
	if (locale === "cs") return __cs.settings_profile_title(inputs)
	return __en.settings_profile_title(inputs)
});
/**
* | output |
* | --- |
* | "Only owners and admins can change these settings." |
*
* @param {Settings_Read_OnlyInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_read_only = /** @type {((inputs?: Settings_Read_OnlyInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Read_OnlyInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_read_only(inputs)
	if (locale === "cs") return __cs.settings_read_only(inputs)
	return __en.settings_read_only(inputs)
});
/**
* | output |
* | --- |
* | "Approvals needed" |
*
* @param {Settings_Required_ApprovalsInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_required_approvals = /** @type {((inputs?: Settings_Required_ApprovalsInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Required_ApprovalsInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_required_approvals(inputs)
	if (locale === "cs") return __cs.settings_required_approvals(inputs)
	return __en.settings_required_approvals(inputs)
});
/**
* | output |
* | --- |
* | "Approval settings saved." |
*
* @param {Settings_SavedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_saved = /** @type {((inputs?: Settings_SavedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_SavedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_saved(inputs)
	if (locale === "cs") return __cs.settings_saved(inputs)
	return __en.settings_saved(inputs)
});
/**
* | output |
* | --- |
* | "Saving…" |
*
* @param {Settings_SavingInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_saving = /** @type {((inputs?: Settings_SavingInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_SavingInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_saving(inputs)
	if (locale === "cs") return __cs.settings_saving(inputs)
	return __en.settings_saving(inputs)
});
/**
* | output |
* | --- |
* | "System" |
*
* @param {Settings_System_TitleInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_system_title = /** @type {((inputs?: Settings_System_TitleInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_System_TitleInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_system_title(inputs)
	if (locale === "cs") return __cs.settings_system_title(inputs)
	return __en.settings_system_title(inputs)
});
/**
* | color | output |
* | --- | --- |
* | "slate" | "Slate" |
* | "red" | "Red" |
* | "orange" | "Orange" |
* | "amber" | "Amber" |
* | "green" | "Green" |
* | "teal" | "Teal" |
* | "blue" | "Blue" |
* | "violet" | "Violet" |
* | * | "Color" |
*
* @param {Settings_Tag_ColorInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_tag_color = /** @type {((inputs: Settings_Tag_ColorInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Tag_ColorInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_tag_color(inputs)
	if (locale === "cs") return __cs.settings_tag_color(inputs)
	return __en.settings_tag_color(inputs)
});
/**
* | output |
* | --- |
* | "Color of tag {name}" |
*
* @param {Settings_Tag_Color_OfInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_tag_color_of = /** @type {((inputs: Settings_Tag_Color_OfInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Tag_Color_OfInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_tag_color_of(inputs)
	if (locale === "cs") return __cs.settings_tag_color_of(inputs)
	return __en.settings_tag_color_of(inputs)
});
/**
* | output |
* | --- |
* | "Delete tag {name}" |
*
* @param {Settings_Tag_DeleteInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_tag_delete = /** @type {((inputs: Settings_Tag_DeleteInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Tag_DeleteInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_tag_delete(inputs)
	if (locale === "cs") return __cs.settings_tag_delete(inputs)
	return __en.settings_tag_delete(inputs)
});
/**
* | countPlural | output |
* | --- | --- |
* | "one" | "It will be removed from {count} post." |
* | * | "It will be removed from {count} posts." |
*
* @param {Settings_Tag_Delete_BodyInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_tag_delete_body = /** @type {((inputs: Settings_Tag_Delete_BodyInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Tag_Delete_BodyInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_tag_delete_body(inputs)
	if (locale === "cs") return __cs.settings_tag_delete_body(inputs)
	return __en.settings_tag_delete_body(inputs)
});
/**
* | output |
* | --- |
* | "Delete tag" |
*
* @param {Settings_Tag_Delete_ConfirmInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_tag_delete_confirm = /** @type {((inputs?: Settings_Tag_Delete_ConfirmInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Tag_Delete_ConfirmInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_tag_delete_confirm(inputs)
	if (locale === "cs") return __cs.settings_tag_delete_confirm(inputs)
	return __en.settings_tag_delete_confirm(inputs)
});
/**
* | output |
* | --- |
* | "Delete tag “{name}”?" |
*
* @param {Settings_Tag_Delete_TitleInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_tag_delete_title = /** @type {((inputs: Settings_Tag_Delete_TitleInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Tag_Delete_TitleInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_tag_delete_title(inputs)
	if (locale === "cs") return __cs.settings_tag_delete_title(inputs)
	return __en.settings_tag_delete_title(inputs)
});
/**
* | output |
* | --- |
* | "Tag deleted" |
*
* @param {Settings_Tag_DeletedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_tag_deleted = /** @type {((inputs?: Settings_Tag_DeletedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Tag_DeletedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_tag_deleted(inputs)
	if (locale === "cs") return __cs.settings_tag_deleted(inputs)
	return __en.settings_tag_deleted(inputs)
});
/**
* | output |
* | --- |
* | "Keep tag" |
*
* @param {Settings_Tag_KeepInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_tag_keep = /** @type {((inputs?: Settings_Tag_KeepInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Tag_KeepInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_tag_keep(inputs)
	if (locale === "cs") return __cs.settings_tag_keep(inputs)
	return __en.settings_tag_keep(inputs)
});
/**
* | output |
* | --- |
* | "Name of tag {name}" |
*
* @param {Settings_Tag_NameInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_tag_name = /** @type {((inputs: Settings_Tag_NameInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Tag_NameInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_tag_name(inputs)
	if (locale === "cs") return __cs.settings_tag_name(inputs)
	return __en.settings_tag_name(inputs)
});
/**
* | countPlural | output |
* | --- | --- |
* | "one" | "{count} post" |
* | * | "{count} posts" |
*
* @param {Settings_Tag_PostsInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_tag_posts = /** @type {((inputs: Settings_Tag_PostsInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Tag_PostsInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_tag_posts(inputs)
	if (locale === "cs") return __cs.settings_tag_posts(inputs)
	return __en.settings_tag_posts(inputs)
});
/**
* | output |
* | --- |
* | "Tag saved" |
*
* @param {Settings_Tag_SavedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_tag_saved = /** @type {((inputs?: Settings_Tag_SavedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Tag_SavedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_tag_saved(inputs)
	if (locale === "cs") return __cs.settings_tag_saved(inputs)
	return __en.settings_tag_saved(inputs)
});
/**
* | output |
* | --- |
* | "No tags yet. Add one in the composer or on a post." |
*
* @param {Settings_Tags_EmptyInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_tags_empty = /** @type {((inputs?: Settings_Tags_EmptyInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Tags_EmptyInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_tags_empty(inputs)
	if (locale === "cs") return __cs.settings_tags_empty(inputs)
	return __en.settings_tags_empty(inputs)
});
/**
* | output |
* | --- |
* | "Internal labels for finding and grouping posts. They are never published." |
*
* @param {Settings_Tags_IntroInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_tags_intro = /** @type {((inputs?: Settings_Tags_IntroInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Tags_IntroInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_tags_intro(inputs)
	if (locale === "cs") return __cs.settings_tags_intro(inputs)
	return __en.settings_tags_intro(inputs)
});
/**
* | output |
* | --- |
* | "Tags" |
*
* @param {Settings_Tags_TitleInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_tags_title = /** @type {((inputs?: Settings_Tags_TitleInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Tags_TitleInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_tags_title(inputs)
	if (locale === "cs") return __cs.settings_tags_title(inputs)
	return __en.settings_tags_title(inputs)
});
/**
* | output |
* | --- |
* | "Theme" |
*
* @param {Settings_ThemeInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_theme = /** @type {((inputs?: Settings_ThemeInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_ThemeInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_theme(inputs)
	if (locale === "cs") return __cs.settings_theme(inputs)
	return __en.settings_theme(inputs)
});
/**
* | output |
* | --- |
* | "Allowed shift after approval (minutes)" |
*
* @param {Settings_ToleranceInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_tolerance = /** @type {((inputs?: Settings_ToleranceInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_ToleranceInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_tolerance(inputs)
	if (locale === "cs") return __cs.settings_tolerance(inputs)
	return __en.settings_tolerance(inputs)
});
/**
* | output |
* | --- |
* | "Upgrade now" |
*
* @param {System_Api_CriticalInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const system_api_critical = /** @type {((inputs?: System_Api_CriticalInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<System_Api_CriticalInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.system_api_critical(inputs)
	if (locale === "cs") return __cs.system_api_critical(inputs)
	return __en.system_api_critical(inputs)
});
/**
* | countPlural | output |
* | --- | --- |
* | "one" | "{count} day left" |
* | * | "{count} days left" |
*
* @param {System_Api_Days_LeftInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const system_api_days_left = /** @type {((inputs: System_Api_Days_LeftInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<System_Api_Days_LeftInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.system_api_days_left(inputs)
	if (locale === "cs") return __cs.system_api_days_left(inputs)
	return __en.system_api_days_left(inputs)
});
/**
* | output |
* | --- |
* | "Support has ended" |
*
* @param {System_Api_EndedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const system_api_ended = /** @type {((inputs?: System_Api_EndedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<System_Api_EndedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.system_api_ended(inputs)
	if (locale === "cs") return __cs.system_api_ended(inputs)
	return __en.system_api_ended(inputs)
});
/**
* | output |
* | --- |
* | "No end date announced" |
*
* @param {System_Api_No_SunsetInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const system_api_no_sunset = /** @type {((inputs?: System_Api_No_SunsetInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<System_Api_No_SunsetInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.system_api_no_sunset(inputs)
	if (locale === "cs") return __cs.system_api_no_sunset(inputs)
	return __en.system_api_no_sunset(inputs)
});
/**
* | output |
* | --- |
* | "Support ends {date}" |
*
* @param {System_Api_SunsetInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const system_api_sunset = /** @type {((inputs: System_Api_SunsetInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<System_Api_SunsetInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.system_api_sunset(inputs)
	if (locale === "cs") return __cs.system_api_sunset(inputs)
	return __en.system_api_sunset(inputs)
});
/**
* | output |
* | --- |
* | "Network API versions" |
*
* @param {System_Api_TitleInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const system_api_title = /** @type {((inputs?: System_Api_TitleInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<System_Api_TitleInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.system_api_title(inputs)
	if (locale === "cs") return __cs.system_api_title(inputs)
	return __en.system_api_title(inputs)
});
/**
* | output |
* | --- |
* | "Version {version}" |
*
* @param {System_Api_VersionInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const system_api_version = /** @type {((inputs: System_Api_VersionInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<System_Api_VersionInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.system_api_version(inputs)
	if (locale === "cs") return __cs.system_api_version(inputs)
	return __en.system_api_version(inputs)
});
/**
* | output |
* | --- |
* | "Upgrade soon" |
*
* @param {System_Api_WarnInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const system_api_warn = /** @type {((inputs?: System_Api_WarnInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<System_Api_WarnInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.system_api_warn(inputs)
	if (locale === "cs") return __cs.system_api_warn(inputs)
	return __en.system_api_warn(inputs)
});
/**
* | output |
* | --- |
* | "Took {duration}" |
*
* @param {System_Cron_DurationInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const system_cron_duration = /** @type {((inputs: System_Cron_DurationInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<System_Cron_DurationInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.system_cron_duration(inputs)
	if (locale === "cs") return __cs.system_cron_duration(inputs)
	return __en.system_cron_duration(inputs)
});
/**
* | output |
* | --- |
* | "Failed" |
*
* @param {System_Cron_FailedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const system_cron_failed = /** @type {((inputs?: System_Cron_FailedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<System_Cron_FailedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.system_cron_failed(inputs)
	if (locale === "cs") return __cs.system_cron_failed(inputs)
	return __en.system_cron_failed(inputs)
});
/**
* | output |
* | --- |
* | "Last started {when}" |
*
* @param {System_Cron_Last_RunInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const system_cron_last_run = /** @type {((inputs: System_Cron_Last_RunInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<System_Cron_Last_RunInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.system_cron_last_run(inputs)
	if (locale === "cs") return __cs.system_cron_last_run(inputs)
	return __en.system_cron_last_run(inputs)
});
/**
* | output |
* | --- |
* | "Never ran" |
*
* @param {System_Cron_NeverInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const system_cron_never = /** @type {((inputs?: System_Cron_NeverInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<System_Cron_NeverInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.system_cron_never(inputs)
	if (locale === "cs") return __cs.system_cron_never(inputs)
	return __en.system_cron_never(inputs)
});
/**
* | output |
* | --- |
* | "Running" |
*
* @param {System_Cron_RunningInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const system_cron_running = /** @type {((inputs?: System_Cron_RunningInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<System_Cron_RunningInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.system_cron_running(inputs)
	if (locale === "cs") return __cs.system_cron_running(inputs)
	return __en.system_cron_running(inputs)
});
/**
* | output |
* | --- |
* | "Overdue" |
*
* @param {System_Cron_StaleInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const system_cron_stale = /** @type {((inputs?: System_Cron_StaleInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<System_Cron_StaleInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.system_cron_stale(inputs)
	if (locale === "cs") return __cs.system_cron_stale(inputs)
	return __en.system_cron_stale(inputs)
});
/**
* | output |
* | --- |
* | "Background jobs" |
*
* @param {System_Cron_TitleInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const system_cron_title = /** @type {((inputs?: System_Cron_TitleInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<System_Cron_TitleInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.system_cron_title(inputs)
	if (locale === "cs") return __cs.system_cron_title(inputs)
	return __en.system_cron_title(inputs)
});
/**
* | output |
* | --- |
* | "App credentials rejected" |
*
* @param {System_Incident_App_Credentials_InvalidInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const system_incident_app_credentials_invalid = /** @type {((inputs?: System_Incident_App_Credentials_InvalidInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<System_Incident_App_Credentials_InvalidInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.system_incident_app_credentials_invalid(inputs)
	if (locale === "cs") return __cs.system_incident_app_credentials_invalid(inputs)
	return __en.system_incident_app_credentials_invalid(inputs)
});
/**
* | output |
* | --- |
* | "App suspended" |
*
* @param {System_Incident_App_SuspendedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const system_incident_app_suspended = /** @type {((inputs?: System_Incident_App_SuspendedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<System_Incident_App_SuspendedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.system_incident_app_suspended(inputs)
	if (locale === "cs") return __cs.system_incident_app_suspended(inputs)
	return __en.system_incident_app_suspended(inputs)
});
/**
* | countPlural | output |
* | --- | --- |
* | "one" | "{count} occurrence" |
* | * | "{count} occurrences" |
*
* @param {System_Incident_OccurrencesInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const system_incident_occurrences = /** @type {((inputs: System_Incident_OccurrencesInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<System_Incident_OccurrencesInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.system_incident_occurrences(inputs)
	if (locale === "cs") return __cs.system_incident_occurrences(inputs)
	return __en.system_incident_occurrences(inputs)
});
/**
* | output |
* | --- |
* | "Open" |
*
* @param {System_Incident_OpenInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const system_incident_open = /** @type {((inputs?: System_Incident_OpenInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<System_Incident_OpenInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.system_incident_open(inputs)
	if (locale === "cs") return __cs.system_incident_open(inputs)
	return __en.system_incident_open(inputs)
});
/**
* | output |
* | --- |
* | "Network outage" |
*
* @param {System_Incident_Provider_OutageInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const system_incident_provider_outage = /** @type {((inputs?: System_Incident_Provider_OutageInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<System_Incident_Provider_OutageInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.system_incident_provider_outage(inputs)
	if (locale === "cs") return __cs.system_incident_provider_outage(inputs)
	return __en.system_incident_provider_outage(inputs)
});
/**
* | output |
* | --- |
* | "App hit its rate limit" |
*
* @param {System_Incident_Rate_Limited_AppInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const system_incident_rate_limited_app = /** @type {((inputs?: System_Incident_Rate_Limited_AppInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<System_Incident_Rate_Limited_AppInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.system_incident_rate_limited_app(inputs)
	if (locale === "cs") return __cs.system_incident_rate_limited_app(inputs)
	return __en.system_incident_rate_limited_app(inputs)
});
/**
* | output |
* | --- |
* | "Resolved {when}" |
*
* @param {System_Incident_ResolvedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const system_incident_resolved = /** @type {((inputs: System_Incident_ResolvedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<System_Incident_ResolvedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.system_incident_resolved(inputs)
	if (locale === "cs") return __cs.system_incident_resolved(inputs)
	return __en.system_incident_resolved(inputs)
});
/**
* | output |
* | --- |
* | "First seen {first}, last seen {last}" |
*
* @param {System_Incident_SeenInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const system_incident_seen = /** @type {((inputs: System_Incident_SeenInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<System_Incident_SeenInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.system_incident_seen(inputs)
	if (locale === "cs") return __cs.system_incident_seen(inputs)
	return __en.system_incident_seen(inputs)
});
/**
* | output |
* | --- |
* | "API access level missing" |
*
* @param {System_Incident_Tier_Not_EnrolledInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const system_incident_tier_not_enrolled = /** @type {((inputs?: System_Incident_Tier_Not_EnrolledInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<System_Incident_Tier_Not_EnrolledInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.system_incident_tier_not_enrolled(inputs)
	if (locale === "cs") return __cs.system_incident_tier_not_enrolled(inputs)
	return __en.system_incident_tier_not_enrolled(inputs)
});
/**
* | output |
* | --- |
* | "No incidents in the last 7 days." |
*
* @param {System_Incidents_EmptyInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const system_incidents_empty = /** @type {((inputs?: System_Incidents_EmptyInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<System_Incidents_EmptyInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.system_incidents_empty(inputs)
	if (locale === "cs") return __cs.system_incidents_empty(inputs)
	return __en.system_incidents_empty(inputs)
});
/**
* | output |
* | --- |
* | "Network incidents" |
*
* @param {System_Incidents_TitleInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const system_incidents_title = /** @type {((inputs?: System_Incidents_TitleInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<System_Incidents_TitleInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.system_incidents_title(inputs)
	if (locale === "cs") return __cs.system_incidents_title(inputs)
	return __en.system_incidents_title(inputs)
});
/**
* | output |
* | --- |
* | "No data" |
*
* @param {System_No_DataInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const system_no_data = /** @type {((inputs?: System_No_DataInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<System_No_DataInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.system_no_data(inputs)
	if (locale === "cs") return __cs.system_no_data(inputs)
	return __en.system_no_data(inputs)
});
/**
* | output |
* | --- |
* | "OK" |
*
* @param {System_OkInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const system_ok = /** @type {((inputs?: System_OkInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<System_OkInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.system_ok(inputs)
	if (locale === "cs") return __cs.system_ok(inputs)
	return __en.system_ok(inputs)
});
/**
* | output |
* | --- |
* | "Last 24 hours" |
*
* @param {System_Slo_DayInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const system_slo_day = /** @type {((inputs?: System_Slo_DayInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<System_Slo_DayInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.system_slo_day(inputs)
	if (locale === "cs") return __cs.system_slo_day(inputs)
	return __en.system_slo_day(inputs)
});
/**
* | output |
* | --- |
* | "Published twice" |
*
* @param {System_Slo_DuplicatesInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const system_slo_duplicates = /** @type {((inputs?: System_Slo_DuplicatesInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<System_Slo_DuplicatesInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.system_slo_duplicates(inputs)
	if (locale === "cs") return __cs.system_slo_duplicates(inputs)
	return __en.system_slo_duplicates(inputs)
});
/**
* | output |
* | --- |
* | "Published on time" |
*
* @param {System_Slo_On_TimeInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const system_slo_on_time = /** @type {((inputs?: System_Slo_On_TimeInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<System_Slo_On_TimeInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.system_slo_on_time(inputs)
	if (locale === "cs") return __cs.system_slo_on_time(inputs)
	return __en.system_slo_on_time(inputs)
});
/**
* | output |
* | --- |
* | "Publishing goals" |
*
* @param {System_Slo_TitleInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const system_slo_title = /** @type {((inputs?: System_Slo_TitleInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<System_Slo_TitleInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.system_slo_title(inputs)
	if (locale === "cs") return __cs.system_slo_title(inputs)
	return __en.system_slo_title(inputs)
});
/**
* | countPlural | output |
* | --- | --- |
* | "one" | "{count} automatic post" |
* | * | "{count} automatic posts" |
*
* @param {System_Slo_TotalInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const system_slo_total = /** @type {((inputs: System_Slo_TotalInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<System_Slo_TotalInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.system_slo_total(inputs)
	if (locale === "cs") return __cs.system_slo_total(inputs)
	return __en.system_slo_total(inputs)
});
/**
* | output |
* | --- |
* | "Unconfirmed" |
*
* @param {System_Slo_UnconfirmedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const system_slo_unconfirmed = /** @type {((inputs?: System_Slo_UnconfirmedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<System_Slo_UnconfirmedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.system_slo_unconfirmed(inputs)
	if (locale === "cs") return __cs.system_slo_unconfirmed(inputs)
	return __en.system_slo_unconfirmed(inputs)
});
/**
* | output |
* | --- |
* | "Last 7 days" |
*
* @param {System_Slo_WeekInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const system_slo_week = /** @type {((inputs?: System_Slo_WeekInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<System_Slo_WeekInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.system_slo_week(inputs)
	if (locale === "cs") return __cs.system_slo_week(inputs)
	return __en.system_slo_week(inputs)
});
/**
* | output |
* | --- |
* | "On target" |
*
* @param {System_Target_MetInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const system_target_met = /** @type {((inputs?: System_Target_MetInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<System_Target_MetInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.system_target_met(inputs)
	if (locale === "cs") return __cs.system_target_met(inputs)
	return __en.system_target_met(inputs)
});
/**
* | output |
* | --- |
* | "Missed" |
*
* @param {System_Target_MissedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const system_target_missed = /** @type {((inputs?: System_Target_MissedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<System_Target_MissedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.system_target_missed(inputs)
	if (locale === "cs") return __cs.system_target_missed(inputs)
	return __en.system_target_missed(inputs)
});
/**
* | output |
* | --- |
* | "Dark" |
*
* @param {Theme_Option_DarkInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const theme_option_dark = /** @type {((inputs?: Theme_Option_DarkInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Theme_Option_DarkInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.theme_option_dark(inputs)
	if (locale === "cs") return __cs.theme_option_dark(inputs)
	return __en.theme_option_dark(inputs)
});
/**
* | output |
* | --- |
* | "Light" |
*
* @param {Theme_Option_LightInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const theme_option_light = /** @type {((inputs?: Theme_Option_LightInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Theme_Option_LightInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.theme_option_light(inputs)
	if (locale === "cs") return __cs.theme_option_light(inputs)
	return __en.theme_option_light(inputs)
});
/**
* | output |
* | --- |
* | "System" |
*
* @param {Theme_Option_SystemInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const theme_option_system = /** @type {((inputs?: Theme_Option_SystemInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Theme_Option_SystemInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.theme_option_system(inputs)
	if (locale === "cs") return __cs.theme_option_system(inputs)
	return __en.theme_option_system(inputs)
});