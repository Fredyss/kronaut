import { getLocale, experimentalStaticLocale } from "../runtime.js"

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Archive_ChangedInputs */
/** @typedef {{}} Archive_CorruptInputs */
/** @typedef {{}} Archive_Dump_FirstInputs */
/** @typedef {{}} Archive_IncompleteInputs */
/** @typedef {{}} Archive_Manifest_LastInputs */
/** @typedef {{}} Archive_Media_MismatchInputs */
/** @typedef {{}} Archive_Missing_DumpInputs */
/** @typedef {{}} Archive_Missing_ManifestInputs */
/** @typedef {{}} Archive_Non_RegularInputs */
/** @typedef {{}} Archive_Not_FileInputs */
/** @typedef {{}} Archive_Outside_WhitelistInputs */
/** @typedef {{}} Archive_Repeats_DumpInputs */
/** @typedef {{}} Archive_Repeats_MediaInputs */
/** @typedef {{}} Archive_UndecryptableInputs */
/** @typedef {{}} Archive_UnopenableInputs */
/** @typedef {{}} Backup_ModeInputs */
/** @typedef {{}} Backup_Time_InvalidInputs */
/** @typedef {{}} Bluesky_Client_IdInputs */
/** @typedef {{}} Config_ErrorInputs */
/** @typedef {{}} Db_Url_InvalidInputs */
/** @typedef {{}} Db_Url_PasswordInputs */
/** @typedef {{}} Email_InvalidInputs */
/** @typedef {{}} Expected_One_ArchiveInputs */
/** @typedef {{}} Expected_One_EmailInputs */
/** @typedef {{}} Expected_One_ProviderInputs */
/** @typedef {{}} Identity_EmptyInputs */
/** @typedef {{}} Identity_InvalidInputs */
/** @typedef {{}} Identity_UnreadableInputs */
/** @typedef {{ epoch: NonNullable<unknown> }} Import_DoneInputs */
/** @typedef {{}} Import_NextInputs */
/** @typedef {{}} Key_ActiveInputs */
/** @typedef {{ kid: NonNullable<unknown> }} Key_In_UseInputs */
/** @typedef {{}} Key_Not_FoundInputs */
/** @typedef {{ status: NonNullable<unknown> }} Key_Not_NextInputs */
/** @typedef {{ count: NonNullable<unknown>, kid: NonNullable<unknown> }} Key_Recently_RetiredInputs */
/** @typedef {{ count: NonNullable<unknown>, versions: NonNullable<unknown> }} Keyring_MissingInputs */
/** @typedef {{}} Manifest_Invalid_JsonInputs */
/** @typedef {{}} Manifest_Too_LargeInputs */
/** @typedef {{ format: NonNullable<unknown> }} Manifest_Wrong_FormatInputs */
/** @typedef {{ epoch: NonNullable<unknown>, reason: NonNullable<unknown> }} Media_Copy_FailedInputs */
/** @typedef {{}} Never_StartedInputs */
/** @typedef {{}} No_MigrationsInputs */
/** @typedef {{}} No_SchemaInputs */
/** @typedef {{ option: NonNullable<unknown> }} Option_EmptyInputs */
/** @typedef {{ option: NonNullable<unknown> }} Option_RequiredInputs */
/** @typedef {{ count: NonNullable<unknown>, option: NonNullable<unknown> }} Option_Too_LongInputs */
/** @typedef {{}} Output_ExistsInputs */
/** @typedef {{}} Owner_Options_RequiredInputs */
/** @typedef {{}} Partial_ExistsInputs */
/** @typedef {{ provider: NonNullable<unknown>, id: NonNullable<unknown> }} Provider_App_ExistsInputs */
/** @typedef {{}} Provider_App_Not_FoundInputs */
/** @typedef {{}} Provider_UnsupportedInputs */
/** @typedef {{}} Restored_No_StateInputs */
/** @typedef {{}} Secret_Stdin_EmptyInputs */
/** @typedef {{}} Secret_Stdin_LinesInputs */
/** @typedef {{}} Secret_Stdin_TtyInputs */
/** @typedef {{ pattern: NonNullable<unknown> }} Slug_InvalidInputs */
/** @typedef {{}} Slug_UnderivableInputs */
/** @typedef {{}} Target_Db_Not_EmptyInputs */
/** @typedef {{}} Target_Media_Not_EmptyInputs */
/** @typedef {{ option: NonNullable<unknown> }} Timezone_InvalidInputs */
/** @typedef {{ tool: NonNullable<unknown> }} Tool_FailedInputs */
/** @typedef {{ tool: NonNullable<unknown> }} Tool_MissingInputs */
/** @typedef {{ tool: NonNullable<unknown> }} Tool_Stopped_ReadingInputs */
/** @typedef {{ tool: NonNullable<unknown>, major: NonNullable<unknown>, found: NonNullable<unknown> }} Tool_VersionInputs */
/** @typedef {{ tool: NonNullable<unknown>, major: NonNullable<unknown> }} Tool_Version_UnknownInputs */
/** @typedef {{}} Unexpected_ErrorInputs */
/** @typedef {{}} Unknown_CommandInputs */
/** @typedef {{}} Unknown_Key_CommandInputs */
/** @typedef {{}} Unknown_Provider_App_CommandInputs */
/** @typedef {{}} Unknown_User_CommandInputs */
/** @typedef {{}} Usage_App_Secret_StdinInputs */
/** @typedef {{}} Usage_Client_Secret_StdinInputs */
/** @typedef {{}} Usage_TitleInputs */
/** @typedef {{}} User_Email_TakenInputs */
/** @typedef {{}} User_Not_FoundInputs */
/** @typedef {{}} Workspace_Slug_TakenInputs */
/** @typedef {{}} Wrong_Argument_CountInputs */
import * as __en from "./en.js"
import * as __sk from "./sk.js"
import * as __cs from "./cs.js"
/**
* | output |
* | --- |
* | "the archive changed while it was being imported" |
*
* @param {Archive_ChangedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const archive_changed = /** @type {((inputs?: Archive_ChangedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Archive_ChangedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.archive_changed(inputs)
	if (locale === "cs") return __cs.archive_changed(inputs)
	return __en.archive_changed(inputs)
});
/**
* | output |
* | --- |
* | "the archive is corrupt or truncated" |
*
* @param {Archive_CorruptInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const archive_corrupt = /** @type {((inputs?: Archive_CorruptInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Archive_CorruptInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.archive_corrupt(inputs)
	if (locale === "cs") return __cs.archive_corrupt(inputs)
	return __en.archive_corrupt(inputs)
});
/**
* | output |
* | --- |
* | "db.dump must be the first entry" |
*
* @param {Archive_Dump_FirstInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const archive_dump_first = /** @type {((inputs?: Archive_Dump_FirstInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Archive_Dump_FirstInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.archive_dump_first(inputs)
	if (locale === "cs") return __cs.archive_dump_first(inputs)
	return __en.archive_dump_first(inputs)
});
/**
* | output |
* | --- |
* | "archive is missing db.dump or manifest.json" |
*
* @param {Archive_IncompleteInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const archive_incomplete = /** @type {((inputs?: Archive_IncompleteInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Archive_IncompleteInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.archive_incomplete(inputs)
	if (locale === "cs") return __cs.archive_incomplete(inputs)
	return __en.archive_incomplete(inputs)
});
/**
* | output |
* | --- |
* | "manifest.json must be the last entry" |
*
* @param {Archive_Manifest_LastInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const archive_manifest_last = /** @type {((inputs?: Archive_Manifest_LastInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Archive_Manifest_LastInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.archive_manifest_last(inputs)
	if (locale === "cs") return __cs.archive_manifest_last(inputs)
	return __en.archive_manifest_last(inputs)
});
/**
* | output |
* | --- |
* | "the media entries do not match the manifest" |
*
* @param {Archive_Media_MismatchInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const archive_media_mismatch = /** @type {((inputs?: Archive_Media_MismatchInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Archive_Media_MismatchInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.archive_media_mismatch(inputs)
	if (locale === "cs") return __cs.archive_media_mismatch(inputs)
	return __en.archive_media_mismatch(inputs)
});
/**
* | output |
* | --- |
* | "archive is missing db.dump" |
*
* @param {Archive_Missing_DumpInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const archive_missing_dump = /** @type {((inputs?: Archive_Missing_DumpInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Archive_Missing_DumpInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.archive_missing_dump(inputs)
	if (locale === "cs") return __cs.archive_missing_dump(inputs)
	return __en.archive_missing_dump(inputs)
});
/**
* | output |
* | --- |
* | "archive is missing manifest.json" |
*
* @param {Archive_Missing_ManifestInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const archive_missing_manifest = /** @type {((inputs?: Archive_Missing_ManifestInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Archive_Missing_ManifestInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.archive_missing_manifest(inputs)
	if (locale === "cs") return __cs.archive_missing_manifest(inputs)
	return __en.archive_missing_manifest(inputs)
});
/**
* | output |
* | --- |
* | "archive holds a non-regular entry" |
*
* @param {Archive_Non_RegularInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const archive_non_regular = /** @type {((inputs?: Archive_Non_RegularInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Archive_Non_RegularInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.archive_non_regular(inputs)
	if (locale === "cs") return __cs.archive_non_regular(inputs)
	return __en.archive_non_regular(inputs)
});
/**
* | output |
* | --- |
* | "the archive is not a regular file" |
*
* @param {Archive_Not_FileInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const archive_not_file = /** @type {((inputs?: Archive_Not_FileInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Archive_Not_FileInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.archive_not_file(inputs)
	if (locale === "cs") return __cs.archive_not_file(inputs)
	return __en.archive_not_file(inputs)
});
/**
* | output |
* | --- |
* | "archive holds an entry outside the whitelist" |
*
* @param {Archive_Outside_WhitelistInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const archive_outside_whitelist = /** @type {((inputs?: Archive_Outside_WhitelistInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Archive_Outside_WhitelistInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.archive_outside_whitelist(inputs)
	if (locale === "cs") return __cs.archive_outside_whitelist(inputs)
	return __en.archive_outside_whitelist(inputs)
});
/**
* | output |
* | --- |
* | "archive repeats db.dump" |
*
* @param {Archive_Repeats_DumpInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const archive_repeats_dump = /** @type {((inputs?: Archive_Repeats_DumpInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Archive_Repeats_DumpInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.archive_repeats_dump(inputs)
	if (locale === "cs") return __cs.archive_repeats_dump(inputs)
	return __en.archive_repeats_dump(inputs)
});
/**
* | output |
* | --- |
* | "archive repeats a media entry" |
*
* @param {Archive_Repeats_MediaInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const archive_repeats_media = /** @type {((inputs?: Archive_Repeats_MediaInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Archive_Repeats_MediaInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.archive_repeats_media(inputs)
	if (locale === "cs") return __cs.archive_repeats_media(inputs)
	return __en.archive_repeats_media(inputs)
});
/**
* | output |
* | --- |
* | "cannot decrypt the archive: wrong identity or not an age file" |
*
* @param {Archive_UndecryptableInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const archive_undecryptable = /** @type {((inputs?: Archive_UndecryptableInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Archive_UndecryptableInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.archive_undecryptable(inputs)
	if (locale === "cs") return __cs.archive_undecryptable(inputs)
	return __en.archive_undecryptable(inputs)
});
/**
* | output |
* | --- |
* | "cannot open the archive file" |
*
* @param {Archive_UnopenableInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const archive_unopenable = /** @type {((inputs?: Archive_UnopenableInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Archive_UnopenableInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.archive_unopenable(inputs)
	if (locale === "cs") return __cs.archive_unopenable(inputs)
	return __en.archive_unopenable(inputs)
});
/**
* | output |
* | --- |
* | "expected `backup run` or `backup schedule`" |
*
* @param {Backup_ModeInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const backup_mode = /** @type {((inputs?: Backup_ModeInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Backup_ModeInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.backup_mode(inputs)
	if (locale === "cs") return __cs.backup_mode(inputs)
	return __en.backup_mode(inputs)
});
/**
* | output |
* | --- |
* | "KRONAUT_BACKUP_TIME must be HH:MM (24-hour)" |
*
* @param {Backup_Time_InvalidInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const backup_time_invalid = /** @type {((inputs?: Backup_Time_InvalidInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Backup_Time_InvalidInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.backup_time_invalid(inputs)
	if (locale === "cs") return __cs.backup_time_invalid(inputs)
	return __en.backup_time_invalid(inputs)
});
/**
* | output |
* | --- |
* | "bluesky takes no --client-id" |
*
* @param {Bluesky_Client_IdInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const bluesky_client_id = /** @type {((inputs?: Bluesky_Client_IdInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Bluesky_Client_IdInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.bluesky_client_id(inputs)
	if (locale === "cs") return __cs.bluesky_client_id(inputs)
	return __en.bluesky_client_id(inputs)
});
/**
* | output |
* | --- |
* | "configuration error" |
*
* @param {Config_ErrorInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const config_error = /** @type {((inputs?: Config_ErrorInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Config_ErrorInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.config_error(inputs)
	if (locale === "cs") return __cs.config_error(inputs)
	return __en.config_error(inputs)
});
/**
* | output |
* | --- |
* | "the database URL is not a valid postgres:// URL" |
*
* @param {Db_Url_InvalidInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const db_url_invalid = /** @type {((inputs?: Db_Url_InvalidInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Db_Url_InvalidInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.db_url_invalid(inputs)
	if (locale === "cs") return __cs.db_url_invalid(inputs)
	return __en.db_url_invalid(inputs)
});
/**
* | output |
* | --- |
* | "the database URL has a malformed password" |
*
* @param {Db_Url_PasswordInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const db_url_password = /** @type {((inputs?: Db_Url_PasswordInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Db_Url_PasswordInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.db_url_password(inputs)
	if (locale === "cs") return __cs.db_url_password(inputs)
	return __en.db_url_password(inputs)
});
/**
* | output |
* | --- |
* | "--email must be an email address" |
*
* @param {Email_InvalidInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const email_invalid = /** @type {((inputs?: Email_InvalidInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Email_InvalidInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.email_invalid(inputs)
	if (locale === "cs") return __cs.email_invalid(inputs)
	return __en.email_invalid(inputs)
});
/**
* | output |
* | --- |
* | "expected one archive file" |
*
* @param {Expected_One_ArchiveInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const expected_one_archive = /** @type {((inputs?: Expected_One_ArchiveInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Expected_One_ArchiveInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.expected_one_archive(inputs)
	if (locale === "cs") return __cs.expected_one_archive(inputs)
	return __en.expected_one_archive(inputs)
});
/**
* | output |
* | --- |
* | "expected one email" |
*
* @param {Expected_One_EmailInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const expected_one_email = /** @type {((inputs?: Expected_One_EmailInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Expected_One_EmailInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.expected_one_email(inputs)
	if (locale === "cs") return __cs.expected_one_email(inputs)
	return __en.expected_one_email(inputs)
});
/**
* | output |
* | --- |
* | "expected one provider" |
*
* @param {Expected_One_ProviderInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const expected_one_provider = /** @type {((inputs?: Expected_One_ProviderInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Expected_One_ProviderInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.expected_one_provider(inputs)
	if (locale === "cs") return __cs.expected_one_provider(inputs)
	return __en.expected_one_provider(inputs)
});
/**
* | output |
* | --- |
* | "the identity file holds no age identity" |
*
* @param {Identity_EmptyInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const identity_empty = /** @type {((inputs?: Identity_EmptyInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Identity_EmptyInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.identity_empty(inputs)
	if (locale === "cs") return __cs.identity_empty(inputs)
	return __en.identity_empty(inputs)
});
/**
* | output |
* | --- |
* | "the identity file holds an invalid age identity" |
*
* @param {Identity_InvalidInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const identity_invalid = /** @type {((inputs?: Identity_InvalidInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Identity_InvalidInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.identity_invalid(inputs)
	if (locale === "cs") return __cs.identity_invalid(inputs)
	return __en.identity_invalid(inputs)
});
/**
* | output |
* | --- |
* | "cannot read the identity file" |
*
* @param {Identity_UnreadableInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const identity_unreadable = /** @type {((inputs?: Identity_UnreadableInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Identity_UnreadableInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.identity_unreadable(inputs)
	if (locale === "cs") return __cs.identity_unreadable(inputs)
	return __en.identity_unreadable(inputs)
});
/**
* | output |
* | --- |
* | "restore epoch {epoch}; publishing is paused in restore quarantine" |
*
* @param {Import_DoneInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const import_done = /** @type {((inputs: Import_DoneInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Import_DoneInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.import_done(inputs)
	if (locale === "cs") return __cs.import_done(inputs)
	return __en.import_done(inputs)
});
/**
* | output |
* | --- |
* | "run `kronaut migrate`, review the quarantined posts, then run `kronaut release`" |
*
* @param {Import_NextInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const import_next = /** @type {((inputs?: Import_NextInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Import_NextInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.import_next(inputs)
	if (locale === "cs") return __cs.import_next(inputs)
	return __en.import_next(inputs)
});
/**
* | output |
* | --- |
* | "an active key cannot be deleted; activate a next key first" |
*
* @param {Key_ActiveInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const key_active = /** @type {((inputs?: Key_ActiveInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Key_ActiveInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.key_active(inputs)
	if (locale === "cs") return __cs.key_active(inputs)
	return __en.key_active(inputs)
});
/**
* | output |
* | --- |
* | "key {kid} still signs for connected credentials; they must reconnect or be disconnected before it can be deleted" |
*
* @param {Key_In_UseInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const key_in_use = /** @type {((inputs: Key_In_UseInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Key_In_UseInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.key_in_use(inputs)
	if (locale === "cs") return __cs.key_in_use(inputs)
	return __en.key_in_use(inputs)
});
/**
* | output |
* | --- |
* | "no key with this kid for this app" |
*
* @param {Key_Not_FoundInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const key_not_found = /** @type {((inputs?: Key_Not_FoundInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Key_Not_FoundInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.key_not_found(inputs)
	if (locale === "cs") return __cs.key_not_found(inputs)
	return __en.key_not_found(inputs)
});
/**
* | output |
* | --- |
* | "only a next key can be activated; this one is {status}" |
*
* @param {Key_Not_NextInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const key_not_next = /** @type {((inputs: Key_Not_NextInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Key_Not_NextInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.key_not_next(inputs)
	if (locale === "cs") return __cs.key_not_next(inputs)
	return __en.key_not_next(inputs)
});
/**
* | countPlural | output |
* | --- | --- |
* | "one" | "key {kid} was retired less than {count} minute ago; connects started before the rotation may still need it" |
* | * | "key {kid} was retired less than {count} minutes ago; connects started before the rotation may still need it" |
*
* @param {Key_Recently_RetiredInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const key_recently_retired = /** @type {((inputs: Key_Recently_RetiredInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Key_Recently_RetiredInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.key_recently_retired(inputs)
	if (locale === "cs") return __cs.key_recently_retired(inputs)
	return __en.key_recently_retired(inputs)
});
/**
* | countPlural | output |
* | --- | --- |
* | "one" | "the keyring lacks KEK version {versions}; set KRONAUT_KEK_<n> before importing" |
* | * | "the keyring lacks KEK versions {versions}; set KRONAUT_KEK_<n> for each before importing" |
*
* @param {Keyring_MissingInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const keyring_missing = /** @type {((inputs: Keyring_MissingInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Keyring_MissingInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.keyring_missing(inputs)
	if (locale === "cs") return __cs.keyring_missing(inputs)
	return __en.keyring_missing(inputs)
});
/**
* | output |
* | --- |
* | "manifest.json is not valid JSON" |
*
* @param {Manifest_Invalid_JsonInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const manifest_invalid_json = /** @type {((inputs?: Manifest_Invalid_JsonInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Manifest_Invalid_JsonInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.manifest_invalid_json(inputs)
	if (locale === "cs") return __cs.manifest_invalid_json(inputs)
	return __en.manifest_invalid_json(inputs)
});
/**
* | output |
* | --- |
* | "manifest.json is too large" |
*
* @param {Manifest_Too_LargeInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const manifest_too_large = /** @type {((inputs?: Manifest_Too_LargeInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Manifest_Too_LargeInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.manifest_too_large(inputs)
	if (locale === "cs") return __cs.manifest_too_large(inputs)
	return __en.manifest_too_large(inputs)
});
/**
* | output |
* | --- |
* | "manifest.json is not a format {format} manifest" |
*
* @param {Manifest_Wrong_FormatInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const manifest_wrong_format = /** @type {((inputs: Manifest_Wrong_FormatInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Manifest_Wrong_FormatInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.manifest_wrong_format(inputs)
	if (locale === "cs") return __cs.manifest_wrong_format(inputs)
	return __en.manifest_wrong_format(inputs)
});
/**
* | output |
* | --- |
* | "the database is restored and quarantined (restore epoch {epoch}), but copying media failed: {reason}" |
*
* @param {Media_Copy_FailedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const media_copy_failed = /** @type {((inputs: Media_Copy_FailedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Media_Copy_FailedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.media_copy_failed(inputs)
	if (locale === "cs") return __cs.media_copy_failed(inputs)
	return __en.media_copy_failed(inputs)
});
/**
* | output |
* | --- |
* | "the instance has never started; start the server once, then export" |
*
* @param {Never_StartedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const never_started = /** @type {((inputs?: Never_StartedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Never_StartedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.never_started(inputs)
	if (locale === "cs") return __cs.never_started(inputs)
	return __en.never_started(inputs)
});
/**
* | output |
* | --- |
* | "the database has no migrations" |
*
* @param {No_MigrationsInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const no_migrations = /** @type {((inputs?: No_MigrationsInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<No_MigrationsInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.no_migrations(inputs)
	if (locale === "cs") return __cs.no_migrations(inputs)
	return __en.no_migrations(inputs)
});
/**
* | output |
* | --- |
* | "the database holds no Kronaut schema" |
*
* @param {No_SchemaInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const no_schema = /** @type {((inputs?: No_SchemaInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<No_SchemaInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.no_schema(inputs)
	if (locale === "cs") return __cs.no_schema(inputs)
	return __en.no_schema(inputs)
});
/**
* | output |
* | --- |
* | "{option} must not be empty" |
*
* @param {Option_EmptyInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const option_empty = /** @type {((inputs: Option_EmptyInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Option_EmptyInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.option_empty(inputs)
	if (locale === "cs") return __cs.option_empty(inputs)
	return __en.option_empty(inputs)
});
/**
* | output |
* | --- |
* | "{option} is required" |
*
* @param {Option_RequiredInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const option_required = /** @type {((inputs: Option_RequiredInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Option_RequiredInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.option_required(inputs)
	if (locale === "cs") return __cs.option_required(inputs)
	return __en.option_required(inputs)
});
/**
* | countPlural | output |
* | --- | --- |
* | "one" | "{option} must be at most {count} character" |
* | * | "{option} must be at most {count} characters" |
*
* @param {Option_Too_LongInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const option_too_long = /** @type {((inputs: Option_Too_LongInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Option_Too_LongInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.option_too_long(inputs)
	if (locale === "cs") return __cs.option_too_long(inputs)
	return __en.option_too_long(inputs)
});
/**
* | output |
* | --- |
* | "the output file already exists" |
*
* @param {Output_ExistsInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const output_exists = /** @type {((inputs?: Output_ExistsInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Output_ExistsInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.output_exists(inputs)
	if (locale === "cs") return __cs.output_exists(inputs)
	return __en.output_exists(inputs)
});
/**
* | output |
* | --- |
* | "--email, --name and --workspace are required" |
*
* @param {Owner_Options_RequiredInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const owner_options_required = /** @type {((inputs?: Owner_Options_RequiredInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Owner_Options_RequiredInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.owner_options_required(inputs)
	if (locale === "cs") return __cs.owner_options_required(inputs)
	return __en.owner_options_required(inputs)
});
/**
* | output |
* | --- |
* | "a .partial file from an earlier export exists; remove it first" |
*
* @param {Partial_ExistsInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const partial_exists = /** @type {((inputs?: Partial_ExistsInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Partial_ExistsInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.partial_exists(inputs)
	if (locale === "cs") return __cs.partial_exists(inputs)
	return __en.partial_exists(inputs)
});
/**
* | provider | output |
* | --- | --- |
* | "instagram" | "an {provider} app is already registered: {id}" |
* | * | "a {provider} app is already registered: {id}" |
*
* @param {Provider_App_ExistsInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const provider_app_exists = /** @type {((inputs: Provider_App_ExistsInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Provider_App_ExistsInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.provider_app_exists(inputs)
	if (locale === "cs") return __cs.provider_app_exists(inputs)
	return __en.provider_app_exists(inputs)
});
/**
* | output |
* | --- |
* | "no provider app has this id" |
*
* @param {Provider_App_Not_FoundInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const provider_app_not_found = /** @type {((inputs?: Provider_App_Not_FoundInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Provider_App_Not_FoundInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.provider_app_not_found(inputs)
	if (locale === "cs") return __cs.provider_app_not_found(inputs)
	return __en.provider_app_not_found(inputs)
});
/**
* | output |
* | --- |
* | "only bluesky, facebook, instagram, linkedin or threads can be registered" |
*
* @param {Provider_UnsupportedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const provider_unsupported = /** @type {((inputs?: Provider_UnsupportedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Provider_UnsupportedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.provider_unsupported(inputs)
	if (locale === "cs") return __cs.provider_unsupported(inputs)
	return __en.provider_unsupported(inputs)
});
/**
* | output |
* | --- |
* | "the restored database has no instance state" |
*
* @param {Restored_No_StateInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const restored_no_state = /** @type {((inputs?: Restored_No_StateInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Restored_No_StateInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.restored_no_state(inputs)
	if (locale === "cs") return __cs.restored_no_state(inputs)
	return __en.restored_no_state(inputs)
});
/**
* | output |
* | --- |
* | "the app secret on stdin is empty" |
*
* @param {Secret_Stdin_EmptyInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const secret_stdin_empty = /** @type {((inputs?: Secret_Stdin_EmptyInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Secret_Stdin_EmptyInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.secret_stdin_empty(inputs)
	if (locale === "cs") return __cs.secret_stdin_empty(inputs)
	return __en.secret_stdin_empty(inputs)
});
/**
* | output |
* | --- |
* | "the app secret on stdin must be one line" |
*
* @param {Secret_Stdin_LinesInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const secret_stdin_lines = /** @type {((inputs?: Secret_Stdin_LinesInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Secret_Stdin_LinesInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.secret_stdin_lines(inputs)
	if (locale === "cs") return __cs.secret_stdin_lines(inputs)
	return __en.secret_stdin_lines(inputs)
});
/**
* | output |
* | --- |
* | "pipe the app secret on stdin" |
*
* @param {Secret_Stdin_TtyInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const secret_stdin_tty = /** @type {((inputs?: Secret_Stdin_TtyInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Secret_Stdin_TtyInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.secret_stdin_tty(inputs)
	if (locale === "cs") return __cs.secret_stdin_tty(inputs)
	return __en.secret_stdin_tty(inputs)
});
/**
* | output |
* | --- |
* | "--slug must match {pattern}" |
*
* @param {Slug_InvalidInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const slug_invalid = /** @type {((inputs: Slug_InvalidInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Slug_InvalidInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.slug_invalid(inputs)
	if (locale === "cs") return __cs.slug_invalid(inputs)
	return __en.slug_invalid(inputs)
});
/**
* | output |
* | --- |
* | "cannot derive a slug from the workspace name; pass --slug" |
*
* @param {Slug_UnderivableInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const slug_underivable = /** @type {((inputs?: Slug_UnderivableInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Slug_UnderivableInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.slug_underivable(inputs)
	if (locale === "cs") return __cs.slug_underivable(inputs)
	return __en.slug_underivable(inputs)
});
/**
* | output |
* | --- |
* | "the target database is not empty" |
*
* @param {Target_Db_Not_EmptyInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const target_db_not_empty = /** @type {((inputs?: Target_Db_Not_EmptyInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Target_Db_Not_EmptyInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.target_db_not_empty(inputs)
	if (locale === "cs") return __cs.target_db_not_empty(inputs)
	return __en.target_db_not_empty(inputs)
});
/**
* | output |
* | --- |
* | "the target media directory is not empty" |
*
* @param {Target_Media_Not_EmptyInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const target_media_not_empty = /** @type {((inputs?: Target_Media_Not_EmptyInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Target_Media_Not_EmptyInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.target_media_not_empty(inputs)
	if (locale === "cs") return __cs.target_media_not_empty(inputs)
	return __en.target_media_not_empty(inputs)
});
/**
* | output |
* | --- |
* | "{option} must be an IANA time zone" |
*
* @param {Timezone_InvalidInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const timezone_invalid = /** @type {((inputs: Timezone_InvalidInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Timezone_InvalidInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.timezone_invalid(inputs)
	if (locale === "cs") return __cs.timezone_invalid(inputs)
	return __en.timezone_invalid(inputs)
});
/**
* | output |
* | --- |
* | "{tool} failed" |
*
* @param {Tool_FailedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const tool_failed = /** @type {((inputs: Tool_FailedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Tool_FailedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.tool_failed(inputs)
	if (locale === "cs") return __cs.tool_failed(inputs)
	return __en.tool_failed(inputs)
});
/**
* | output |
* | --- |
* | "{tool} was not found on PATH" |
*
* @param {Tool_MissingInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const tool_missing = /** @type {((inputs: Tool_MissingInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Tool_MissingInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.tool_missing(inputs)
	if (locale === "cs") return __cs.tool_missing(inputs)
	return __en.tool_missing(inputs)
});
/**
* | output |
* | --- |
* | "{tool} stopped reading" |
*
* @param {Tool_Stopped_ReadingInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const tool_stopped_reading = /** @type {((inputs: Tool_Stopped_ReadingInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Tool_Stopped_ReadingInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.tool_stopped_reading(inputs)
	if (locale === "cs") return __cs.tool_stopped_reading(inputs)
	return __en.tool_stopped_reading(inputs)
});
/**
* | output |
* | --- |
* | "{tool} must be PostgreSQL {major}, found {found}" |
*
* @param {Tool_VersionInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const tool_version = /** @type {((inputs: Tool_VersionInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Tool_VersionInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.tool_version(inputs)
	if (locale === "cs") return __cs.tool_version(inputs)
	return __en.tool_version(inputs)
});
/**
* | output |
* | --- |
* | "{tool} must be PostgreSQL {major}, found an unknown version" |
*
* @param {Tool_Version_UnknownInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const tool_version_unknown = /** @type {((inputs: Tool_Version_UnknownInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Tool_Version_UnknownInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.tool_version_unknown(inputs)
	if (locale === "cs") return __cs.tool_version_unknown(inputs)
	return __en.tool_version_unknown(inputs)
});
/**
* | output |
* | --- |
* | "an unexpected error" |
*
* @param {Unexpected_ErrorInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const unexpected_error = /** @type {((inputs?: Unexpected_ErrorInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Unexpected_ErrorInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.unexpected_error(inputs)
	if (locale === "cs") return __cs.unexpected_error(inputs)
	return __en.unexpected_error(inputs)
});
/**
* | output |
* | --- |
* | "unknown command" |
*
* @param {Unknown_CommandInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const unknown_command = /** @type {((inputs?: Unknown_CommandInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Unknown_CommandInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.unknown_command(inputs)
	if (locale === "cs") return __cs.unknown_command(inputs)
	return __en.unknown_command(inputs)
});
/**
* | output |
* | --- |
* | "unknown provider-app key command" |
*
* @param {Unknown_Key_CommandInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const unknown_key_command = /** @type {((inputs?: Unknown_Key_CommandInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Unknown_Key_CommandInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.unknown_key_command(inputs)
	if (locale === "cs") return __cs.unknown_key_command(inputs)
	return __en.unknown_key_command(inputs)
});
/**
* | output |
* | --- |
* | "unknown provider-app command" |
*
* @param {Unknown_Provider_App_CommandInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const unknown_provider_app_command = /** @type {((inputs?: Unknown_Provider_App_CommandInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Unknown_Provider_App_CommandInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.unknown_provider_app_command(inputs)
	if (locale === "cs") return __cs.unknown_provider_app_command(inputs)
	return __en.unknown_provider_app_command(inputs)
});
/**
* | output |
* | --- |
* | "unknown user command" |
*
* @param {Unknown_User_CommandInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const unknown_user_command = /** @type {((inputs?: Unknown_User_CommandInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Unknown_User_CommandInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.unknown_user_command(inputs)
	if (locale === "cs") return __cs.unknown_user_command(inputs)
	return __en.unknown_user_command(inputs)
});
/**
* | output |
* | --- |
* | "app secret on stdin" |
*
* @param {Usage_App_Secret_StdinInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const usage_app_secret_stdin = /** @type {((inputs?: Usage_App_Secret_StdinInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Usage_App_Secret_StdinInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.usage_app_secret_stdin(inputs)
	if (locale === "cs") return __cs.usage_app_secret_stdin(inputs)
	return __en.usage_app_secret_stdin(inputs)
});
/**
* | output |
* | --- |
* | "client secret on stdin" |
*
* @param {Usage_Client_Secret_StdinInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const usage_client_secret_stdin = /** @type {((inputs?: Usage_Client_Secret_StdinInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Usage_Client_Secret_StdinInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.usage_client_secret_stdin(inputs)
	if (locale === "cs") return __cs.usage_client_secret_stdin(inputs)
	return __en.usage_client_secret_stdin(inputs)
});
/**
* | output |
* | --- |
* | "usage:" |
*
* @param {Usage_TitleInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const usage_title = /** @type {((inputs?: Usage_TitleInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Usage_TitleInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.usage_title(inputs)
	if (locale === "cs") return __cs.usage_title(inputs)
	return __en.usage_title(inputs)
});
/**
* | output |
* | --- |
* | "a user with this email already exists" |
*
* @param {User_Email_TakenInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const user_email_taken = /** @type {((inputs?: User_Email_TakenInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<User_Email_TakenInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.user_email_taken(inputs)
	if (locale === "cs") return __cs.user_email_taken(inputs)
	return __en.user_email_taken(inputs)
});
/**
* | output |
* | --- |
* | "no active user has this email" |
*
* @param {User_Not_FoundInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const user_not_found = /** @type {((inputs?: User_Not_FoundInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<User_Not_FoundInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.user_not_found(inputs)
	if (locale === "cs") return __cs.user_not_found(inputs)
	return __en.user_not_found(inputs)
});
/**
* | output |
* | --- |
* | "a workspace with this slug already exists; pass another --slug" |
*
* @param {Workspace_Slug_TakenInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const workspace_slug_taken = /** @type {((inputs?: Workspace_Slug_TakenInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Workspace_Slug_TakenInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.workspace_slug_taken(inputs)
	if (locale === "cs") return __cs.workspace_slug_taken(inputs)
	return __en.workspace_slug_taken(inputs)
});
/**
* | output |
* | --- |
* | "wrong number of arguments" |
*
* @param {Wrong_Argument_CountInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const wrong_argument_count = /** @type {((inputs?: Wrong_Argument_CountInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Wrong_Argument_CountInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.wrong_argument_count(inputs)
	if (locale === "cs") return __cs.wrong_argument_count(inputs)
	return __en.wrong_argument_count(inputs)
});