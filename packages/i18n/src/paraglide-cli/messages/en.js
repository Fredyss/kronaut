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
import * as registry from "../registry.js"


export const archive_changed = /** @type {(inputs: Archive_ChangedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`the archive changed while it was being imported`)
};

export const archive_corrupt = /** @type {(inputs: Archive_CorruptInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`the archive is corrupt or truncated`)
};

export const archive_dump_first = /** @type {(inputs: Archive_Dump_FirstInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`db.dump must be the first entry`)
};

export const archive_incomplete = /** @type {(inputs: Archive_IncompleteInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`archive is missing db.dump or manifest.json`)
};

export const archive_manifest_last = /** @type {(inputs: Archive_Manifest_LastInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`manifest.json must be the last entry`)
};

export const archive_media_mismatch = /** @type {(inputs: Archive_Media_MismatchInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`the media entries do not match the manifest`)
};

export const archive_missing_dump = /** @type {(inputs: Archive_Missing_DumpInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`archive is missing db.dump`)
};

export const archive_missing_manifest = /** @type {(inputs: Archive_Missing_ManifestInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`archive is missing manifest.json`)
};

export const archive_non_regular = /** @type {(inputs: Archive_Non_RegularInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`archive holds a non-regular entry`)
};

export const archive_not_file = /** @type {(inputs: Archive_Not_FileInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`the archive is not a regular file`)
};

export const archive_outside_whitelist = /** @type {(inputs: Archive_Outside_WhitelistInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`archive holds an entry outside the whitelist`)
};

export const archive_repeats_dump = /** @type {(inputs: Archive_Repeats_DumpInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`archive repeats db.dump`)
};

export const archive_repeats_media = /** @type {(inputs: Archive_Repeats_MediaInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`archive repeats a media entry`)
};

export const archive_undecryptable = /** @type {(inputs: Archive_UndecryptableInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`cannot decrypt the archive: wrong identity or not an age file`)
};

export const archive_unopenable = /** @type {(inputs: Archive_UnopenableInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`cannot open the archive file`)
};

export const backup_mode = /** @type {(inputs: Backup_ModeInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`expected \`backup run\` or \`backup schedule\``)
};

export const backup_time_invalid = /** @type {(inputs: Backup_Time_InvalidInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`KRONAUT_BACKUP_TIME must be HH:MM (24-hour)`)
};

export const bluesky_client_id = /** @type {(inputs: Bluesky_Client_IdInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`bluesky takes no --client-id`)
};

export const config_error = /** @type {(inputs: Config_ErrorInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`configuration error`)
};

export const db_url_invalid = /** @type {(inputs: Db_Url_InvalidInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`the database URL is not a valid postgres:// URL`)
};

export const db_url_password = /** @type {(inputs: Db_Url_PasswordInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`the database URL has a malformed password`)
};

export const email_invalid = /** @type {(inputs: Email_InvalidInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`--email must be an email address`)
};

export const expected_one_archive = /** @type {(inputs: Expected_One_ArchiveInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`expected one archive file`)
};

export const expected_one_email = /** @type {(inputs: Expected_One_EmailInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`expected one email`)
};

export const expected_one_provider = /** @type {(inputs: Expected_One_ProviderInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`expected one provider`)
};

export const identity_empty = /** @type {(inputs: Identity_EmptyInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`the identity file holds no age identity`)
};

export const identity_invalid = /** @type {(inputs: Identity_InvalidInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`the identity file holds an invalid age identity`)
};

export const identity_unreadable = /** @type {(inputs: Identity_UnreadableInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`cannot read the identity file`)
};

export const import_done = /** @type {(inputs: Import_DoneInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`restore epoch ${i?.epoch}; publishing is paused in restore quarantine`)
};

export const import_next = /** @type {(inputs: Import_NextInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`run \`kronaut migrate\`, review the quarantined posts, then run \`kronaut release\``)
};

export const key_active = /** @type {(inputs: Key_ActiveInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`an active key cannot be deleted; activate a next key first`)
};

export const key_in_use = /** @type {(inputs: Key_In_UseInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`key ${i?.kid} still signs for connected credentials; they must reconnect or be disconnected before it can be deleted`)
};

export const key_not_found = /** @type {(inputs: Key_Not_FoundInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`no key with this kid for this app`)
};

export const key_not_next = /** @type {(inputs: Key_Not_NextInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`only a next key can be activated; this one is ${i?.status}`)
};

export const key_recently_retired = /** @type {(inputs: Key_Recently_RetiredInputs) => LocalizedString} */ (i) => {
	const countPlural = registry.plural("en", i?.count, {}, true);
	if (countPlural === "one") return /** @type {LocalizedString} */ (`key ${i?.kid} was retired less than ${i?.count} minute ago; connects started before the rotation may still need it`);
	return /** @type {LocalizedString} */ (`key ${i?.kid} was retired less than ${i?.count} minutes ago; connects started before the rotation may still need it`)
};

export const keyring_missing = /** @type {(inputs: Keyring_MissingInputs) => LocalizedString} */ (i) => {
	const countPlural = registry.plural("en", i?.count, {}, true);
	if (countPlural === "one") return /** @type {LocalizedString} */ (`the keyring lacks KEK version ${i?.versions}; set KRONAUT_KEK_<n> before importing`);
	return /** @type {LocalizedString} */ (`the keyring lacks KEK versions ${i?.versions}; set KRONAUT_KEK_<n> for each before importing`)
};

export const manifest_invalid_json = /** @type {(inputs: Manifest_Invalid_JsonInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`manifest.json is not valid JSON`)
};

export const manifest_too_large = /** @type {(inputs: Manifest_Too_LargeInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`manifest.json is too large`)
};

export const manifest_wrong_format = /** @type {(inputs: Manifest_Wrong_FormatInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`manifest.json is not a format ${i?.format} manifest`)
};

export const media_copy_failed = /** @type {(inputs: Media_Copy_FailedInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`the database is restored and quarantined (restore epoch ${i?.epoch}), but copying media failed: ${i?.reason}`)
};

export const never_started = /** @type {(inputs: Never_StartedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`the instance has never started; start the server once, then export`)
};

export const no_migrations = /** @type {(inputs: No_MigrationsInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`the database has no migrations`)
};

export const no_schema = /** @type {(inputs: No_SchemaInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`the database holds no Kronaut schema`)
};

export const option_empty = /** @type {(inputs: Option_EmptyInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`${i?.option} must not be empty`)
};

export const option_required = /** @type {(inputs: Option_RequiredInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`${i?.option} is required`)
};

export const option_too_long = /** @type {(inputs: Option_Too_LongInputs) => LocalizedString} */ (i) => {
	const countPlural = registry.plural("en", i?.count, {}, true);
	if (countPlural === "one") return /** @type {LocalizedString} */ (`${i?.option} must be at most ${i?.count} character`);
	return /** @type {LocalizedString} */ (`${i?.option} must be at most ${i?.count} characters`)
};

export const output_exists = /** @type {(inputs: Output_ExistsInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`the output file already exists`)
};

export const owner_options_required = /** @type {(inputs: Owner_Options_RequiredInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`--email, --name and --workspace are required`)
};

export const partial_exists = /** @type {(inputs: Partial_ExistsInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`a .partial file from an earlier export exists; remove it first`)
};

export const provider_app_exists = /** @type {(inputs: Provider_App_ExistsInputs) => LocalizedString} */ (i) => {
	if (i?.provider === "instagram") return /** @type {LocalizedString} */ (`an ${i?.provider} app is already registered: ${i?.id}`);
	return /** @type {LocalizedString} */ (`a ${i?.provider} app is already registered: ${i?.id}`)
};

export const provider_app_not_found = /** @type {(inputs: Provider_App_Not_FoundInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`no provider app has this id`)
};

export const provider_unsupported = /** @type {(inputs: Provider_UnsupportedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`only bluesky, facebook, instagram, linkedin or threads can be registered`)
};

export const restored_no_state = /** @type {(inputs: Restored_No_StateInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`the restored database has no instance state`)
};

export const secret_stdin_empty = /** @type {(inputs: Secret_Stdin_EmptyInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`the app secret on stdin is empty`)
};

export const secret_stdin_lines = /** @type {(inputs: Secret_Stdin_LinesInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`the app secret on stdin must be one line`)
};

export const secret_stdin_tty = /** @type {(inputs: Secret_Stdin_TtyInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`pipe the app secret on stdin`)
};

export const slug_invalid = /** @type {(inputs: Slug_InvalidInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`--slug must match ${i?.pattern}`)
};

export const slug_underivable = /** @type {(inputs: Slug_UnderivableInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`cannot derive a slug from the workspace name; pass --slug`)
};

export const target_db_not_empty = /** @type {(inputs: Target_Db_Not_EmptyInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`the target database is not empty`)
};

export const target_media_not_empty = /** @type {(inputs: Target_Media_Not_EmptyInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`the target media directory is not empty`)
};

export const timezone_invalid = /** @type {(inputs: Timezone_InvalidInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`${i?.option} must be an IANA time zone`)
};

export const tool_failed = /** @type {(inputs: Tool_FailedInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`${i?.tool} failed`)
};

export const tool_missing = /** @type {(inputs: Tool_MissingInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`${i?.tool} was not found on PATH`)
};

export const tool_stopped_reading = /** @type {(inputs: Tool_Stopped_ReadingInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`${i?.tool} stopped reading`)
};

export const tool_version = /** @type {(inputs: Tool_VersionInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`${i?.tool} must be PostgreSQL ${i?.major}, found ${i?.found}`)
};

export const tool_version_unknown = /** @type {(inputs: Tool_Version_UnknownInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`${i?.tool} must be PostgreSQL ${i?.major}, found an unknown version`)
};

export const unexpected_error = /** @type {(inputs: Unexpected_ErrorInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`an unexpected error`)
};

export const unknown_command = /** @type {(inputs: Unknown_CommandInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`unknown command`)
};

export const unknown_key_command = /** @type {(inputs: Unknown_Key_CommandInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`unknown provider-app key command`)
};

export const unknown_provider_app_command = /** @type {(inputs: Unknown_Provider_App_CommandInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`unknown provider-app command`)
};

export const unknown_user_command = /** @type {(inputs: Unknown_User_CommandInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`unknown user command`)
};

export const usage_app_secret_stdin = /** @type {(inputs: Usage_App_Secret_StdinInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`app secret on stdin`)
};

export const usage_client_secret_stdin = /** @type {(inputs: Usage_Client_Secret_StdinInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`client secret on stdin`)
};

export const usage_title = /** @type {(inputs: Usage_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`usage:`)
};

export const user_email_taken = /** @type {(inputs: User_Email_TakenInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`a user with this email already exists`)
};

export const user_not_found = /** @type {(inputs: User_Not_FoundInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`no active user has this email`)
};

export const workspace_slug_taken = /** @type {(inputs: Workspace_Slug_TakenInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`a workspace with this slug already exists; pass another --slug`)
};

export const wrong_argument_count = /** @type {(inputs: Wrong_Argument_CountInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`wrong number of arguments`)
};