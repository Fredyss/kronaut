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
	return /** @type {LocalizedString} */ (`archív sa počas importu zmenil`)
};

export const archive_corrupt = /** @type {(inputs: Archive_CorruptInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`archív je poškodený alebo neúplný`)
};

export const archive_dump_first = /** @type {(inputs: Archive_Dump_FirstInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`db.dump musí byť prvou položkou archívu`)
};

export const archive_incomplete = /** @type {(inputs: Archive_IncompleteInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`v archíve chýba db.dump alebo manifest.json`)
};

export const archive_manifest_last = /** @type {(inputs: Archive_Manifest_LastInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`manifest.json musí byť poslednou položkou archívu`)
};

export const archive_media_mismatch = /** @type {(inputs: Archive_Media_MismatchInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`mediálne súbory v archíve nezodpovedajú manifestu`)
};

export const archive_missing_dump = /** @type {(inputs: Archive_Missing_DumpInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`v archíve chýba db.dump`)
};

export const archive_missing_manifest = /** @type {(inputs: Archive_Missing_ManifestInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`v archíve chýba manifest.json`)
};

export const archive_non_regular = /** @type {(inputs: Archive_Non_RegularInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`archív obsahuje položku, ktorá nie je bežný súbor`)
};

export const archive_not_file = /** @type {(inputs: Archive_Not_FileInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`archív nie je bežný súbor`)
};

export const archive_outside_whitelist = /** @type {(inputs: Archive_Outside_WhitelistInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`archív obsahuje nepovolenú položku`)
};

export const archive_repeats_dump = /** @type {(inputs: Archive_Repeats_DumpInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`db.dump sa v archíve opakuje`)
};

export const archive_repeats_media = /** @type {(inputs: Archive_Repeats_MediaInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`mediálny súbor sa v archíve opakuje`)
};

export const archive_undecryptable = /** @type {(inputs: Archive_UndecryptableInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`archív sa nedá dešifrovať: nesprávna identita alebo nejde o súbor age`)
};

export const archive_unopenable = /** @type {(inputs: Archive_UnopenableInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`súbor archívu sa nedá otvoriť`)
};

export const backup_mode = /** @type {(inputs: Backup_ModeInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`očakáva sa \`backup run\` alebo \`backup schedule\``)
};

export const backup_time_invalid = /** @type {(inputs: Backup_Time_InvalidInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`KRONAUT_BACKUP_TIME musí mať tvar HH:MM (24-hodinový čas)`)
};

export const bluesky_client_id = /** @type {(inputs: Bluesky_Client_IdInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`bluesky nepoužíva --client-id`)
};

export const config_error = /** @type {(inputs: Config_ErrorInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`chyba v konfigurácii`)
};

export const db_url_invalid = /** @type {(inputs: Db_Url_InvalidInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`URL databázy nie je platná adresa postgres://`)
};

export const db_url_password = /** @type {(inputs: Db_Url_PasswordInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`URL databázy obsahuje poškodené heslo`)
};

export const email_invalid = /** @type {(inputs: Email_InvalidInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`--email musí byť e-mailová adresa`)
};

export const expected_one_archive = /** @type {(inputs: Expected_One_ArchiveInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`zadajte práve jeden súbor archívu`)
};

export const expected_one_email = /** @type {(inputs: Expected_One_EmailInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`zadajte práve jeden e-mail`)
};

export const expected_one_provider = /** @type {(inputs: Expected_One_ProviderInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`zadajte práve jednu sieť`)
};

export const identity_empty = /** @type {(inputs: Identity_EmptyInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`súbor s identitou neobsahuje žiadnu identitu age`)
};

export const identity_invalid = /** @type {(inputs: Identity_InvalidInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`súbor s identitou obsahuje neplatnú identitu age`)
};

export const identity_unreadable = /** @type {(inputs: Identity_UnreadableInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`súbor s identitou sa nedá prečítať`)
};

export const import_done = /** @type {(inputs: Import_DoneInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`epocha obnovy ${i?.epoch}; uverejňovanie je pozastavené v karanténe po obnove`)
};

export const import_next = /** @type {(inputs: Import_NextInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`spustite \`kronaut migrate\`, skontrolujte príspevky v karanténe a potom spustite \`kronaut release\``)
};

export const key_active = /** @type {(inputs: Key_ActiveInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`aktívny kľúč sa nedá zmazať; najprv aktivujte kľúč v stave next`)
};

export const key_in_use = /** @type {(inputs: Key_In_UseInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`kľúč ${i?.kid} ešte podpisuje prístupové údaje pripojených kanálov; pred zmazaním kľúča ich musíte znova pripojiť alebo odpojiť`)
};

export const key_not_found = /** @type {(inputs: Key_Not_FoundInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`táto aplikácia nemá kľúč s týmto kid`)
};

export const key_not_next = /** @type {(inputs: Key_Not_NextInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`aktivovať sa dá len kľúč v stave next; tento je v stave ${i?.status}`)
};

export const key_recently_retired = /** @type {(inputs: Key_Recently_RetiredInputs) => LocalizedString} */ (i) => {
	const countPlural = registry.plural("sk", i?.count, {}, true);
	if (countPlural === "one") return /** @type {LocalizedString} */ (`kľúč ${i?.kid} bol vyradený pred menej ako ${i?.count} minútou; pripojenia kanálov začaté pred výmenou kľúča ho ešte môžu potrebovať`);
	if (countPlural === "many") return /** @type {LocalizedString} */ (`kľúč ${i?.kid} bol vyradený pred menej ako ${i?.count} minúty; pripojenia kanálov začaté pred výmenou kľúča ho ešte môžu potrebovať`);
	return /** @type {LocalizedString} */ (`kľúč ${i?.kid} bol vyradený pred menej ako ${i?.count} minútami; pripojenia kanálov začaté pred výmenou kľúča ho ešte môžu potrebovať`)
};

export const keyring_missing = /** @type {(inputs: Keyring_MissingInputs) => LocalizedString} */ (i) => {
	const countPlural = registry.plural("sk", i?.count, {}, true);
	if (countPlural === "one") return /** @type {LocalizedString} */ (`v sade kľúčov chýba verzia KEK ${i?.versions}; pred importom nastavte KRONAUT_KEK_<n>`);
	return /** @type {LocalizedString} */ (`v sade kľúčov chýbajú verzie KEK ${i?.versions}; pred importom nastavte KRONAUT_KEK_<n> pre každú z nich`)
};

export const manifest_invalid_json = /** @type {(inputs: Manifest_Invalid_JsonInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`manifest.json nie je platný JSON`)
};

export const manifest_too_large = /** @type {(inputs: Manifest_Too_LargeInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`manifest.json je príliš veľký`)
};

export const manifest_wrong_format = /** @type {(inputs: Manifest_Wrong_FormatInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`manifest.json nie je manifest formátu ${i?.format}`)
};

export const media_copy_failed = /** @type {(inputs: Media_Copy_FailedInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`databáza je obnovená a v karanténe (epocha obnovy ${i?.epoch}), ale kopírovanie médií zlyhalo: ${i?.reason}`)
};

export const never_started = /** @type {(inputs: Never_StartedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`inštancia sa ešte nikdy nespustila; spustite raz server a potom exportujte`)
};

export const no_migrations = /** @type {(inputs: No_MigrationsInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`databáza nemá žiadne migrácie`)
};

export const no_schema = /** @type {(inputs: No_SchemaInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`databáza neobsahuje schému Kronautu`)
};

export const option_empty = /** @type {(inputs: Option_EmptyInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`hodnota ${i?.option} nesmie byť prázdna`)
};

export const option_required = /** @type {(inputs: Option_RequiredInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`zadajte ${i?.option}`)
};

export const option_too_long = /** @type {(inputs: Option_Too_LongInputs) => LocalizedString} */ (i) => {
	const countPlural = registry.plural("sk", i?.count, {}, true);
	if (countPlural === "one") return /** @type {LocalizedString} */ (`hodnota ${i?.option} môže mať najviac ${i?.count} znak`);
	if (countPlural === "few") return /** @type {LocalizedString} */ (`hodnota ${i?.option} môže mať najviac ${i?.count} znaky`);
	if (countPlural === "many") return /** @type {LocalizedString} */ (`hodnota ${i?.option} môže mať najviac ${i?.count} znaku`);
	return /** @type {LocalizedString} */ (`hodnota ${i?.option} môže mať najviac ${i?.count} znakov`)
};

export const output_exists = /** @type {(inputs: Output_ExistsInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`výstupný súbor už existuje`)
};

export const owner_options_required = /** @type {(inputs: Owner_Options_RequiredInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`zadajte --email, --name aj --workspace`)
};

export const partial_exists = /** @type {(inputs: Partial_ExistsInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`existuje súbor .partial z predchádzajúceho exportu; najprv ho odstráňte`)
};

export const provider_app_exists = /** @type {(inputs: Provider_App_ExistsInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`aplikácia pre ${i?.provider} je už zaregistrovaná: ${i?.id}`)
};

export const provider_app_not_found = /** @type {(inputs: Provider_App_Not_FoundInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`žiadna aplikácia siete nemá toto id`)
};

export const provider_unsupported = /** @type {(inputs: Provider_UnsupportedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`zaregistrovať sa dá len bluesky, facebook, instagram, linkedin alebo threads`)
};

export const restored_no_state = /** @type {(inputs: Restored_No_StateInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`obnovená databáza nemá stav inštancie`)
};

export const secret_stdin_empty = /** @type {(inputs: Secret_Stdin_EmptyInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`tajný kľúč aplikácie na stdin je prázdny`)
};

export const secret_stdin_lines = /** @type {(inputs: Secret_Stdin_LinesInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`tajný kľúč aplikácie na stdin musí byť na jednom riadku`)
};

export const secret_stdin_tty = /** @type {(inputs: Secret_Stdin_TtyInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`pošlite tajný kľúč aplikácie rúrou na stdin`)
};

export const slug_invalid = /** @type {(inputs: Slug_InvalidInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`--slug musí zodpovedať vzoru ${i?.pattern}`)
};

export const slug_underivable = /** @type {(inputs: Slug_UnderivableInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`z názvu pracovného priestoru sa nedá odvodiť slug; zadajte --slug`)
};

export const target_db_not_empty = /** @type {(inputs: Target_Db_Not_EmptyInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`cieľová databáza nie je prázdna`)
};

export const target_media_not_empty = /** @type {(inputs: Target_Media_Not_EmptyInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`cieľový priečinok médií nie je prázdny`)
};

export const timezone_invalid = /** @type {(inputs: Timezone_InvalidInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`${i?.option} musí byť časové pásmo IANA`)
};

export const tool_failed = /** @type {(inputs: Tool_FailedInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`${i?.tool} zlyhal`)
};

export const tool_missing = /** @type {(inputs: Tool_MissingInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`${i?.tool} sa v PATH nenašiel`)
};

export const tool_stopped_reading = /** @type {(inputs: Tool_Stopped_ReadingInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`${i?.tool} prestal čítať vstup`)
};

export const tool_version = /** @type {(inputs: Tool_VersionInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`${i?.tool} musí byť PostgreSQL ${i?.major}, nájdená verzia je ${i?.found}`)
};

export const tool_version_unknown = /** @type {(inputs: Tool_Version_UnknownInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`${i?.tool} musí byť PostgreSQL ${i?.major}, verziu sa nepodarilo zistiť`)
};

export const unexpected_error = /** @type {(inputs: Unexpected_ErrorInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`neočakávaná chyba`)
};

export const unknown_command = /** @type {(inputs: Unknown_CommandInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`neznámy príkaz`)
};

export const unknown_key_command = /** @type {(inputs: Unknown_Key_CommandInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`neznámy podpríkaz príkazu provider-app key`)
};

export const unknown_provider_app_command = /** @type {(inputs: Unknown_Provider_App_CommandInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`neznámy podpríkaz príkazu provider-app`)
};

export const unknown_user_command = /** @type {(inputs: Unknown_User_CommandInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`neznámy podpríkaz príkazu user`)
};

export const usage_app_secret_stdin = /** @type {(inputs: Usage_App_Secret_StdinInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`tajný kľúč aplikácie na stdin`)
};

export const usage_client_secret_stdin = /** @type {(inputs: Usage_Client_Secret_StdinInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`tajný kľúč klienta na stdin`)
};

export const usage_title = /** @type {(inputs: Usage_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`použitie:`)
};

export const user_email_taken = /** @type {(inputs: User_Email_TakenInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`používateľ s týmto e-mailom už existuje`)
};

export const user_not_found = /** @type {(inputs: User_Not_FoundInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`žiadny aktívny používateľ nemá tento e-mail`)
};

export const workspace_slug_taken = /** @type {(inputs: Workspace_Slug_TakenInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`pracovný priestor s týmto slugom už existuje; zadajte iný --slug`)
};

export const wrong_argument_count = /** @type {(inputs: Wrong_Argument_CountInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`nesprávny počet argumentov`)
};