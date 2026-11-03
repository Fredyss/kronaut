/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Calendar_Add_ChannelInputs */
/** @typedef {{ time: NonNullable<unknown>, channel: NonNullable<unknown>, state: NonNullable<unknown>, text: NonNullable<unknown> }} Calendar_Chip_LabelInputs */
/** @typedef {{ label: NonNullable<unknown>, tags: NonNullable<unknown> }} Calendar_Chip_TagsInputs */
/** @typedef {{}} Calendar_Create_PostInputs */
/** @typedef {{}} Calendar_Day_EmptyInputs */
/** @typedef {{ when: NonNullable<unknown> }} Calendar_Draft_UpdatedInputs */
/** @typedef {{}} Calendar_DraftsInputs */
/** @typedef {{}} Calendar_Drafts_EmptyInputs */
/** @typedef {{}} Calendar_Entry_OpenInputs */
/** @typedef {{ text: NonNullable<unknown> }} Calendar_Entry_OptionsInputs */
/** @typedef {{}} Calendar_Entry_PreviewInputs */
/** @typedef {{}} Calendar_Import_ChannelsInputs */
/** @typedef {{}} Calendar_Import_Channels_HintInputs */
/** @typedef {{}} Calendar_Import_CheckingInputs */
/** @typedef {{ channel: NonNullable<unknown> }} Calendar_Import_Error_ChannelInputs */
/** @typedef {{}} Calendar_Import_Error_ChannelsInputs */
/** @typedef {{ name: NonNullable<unknown> }} Calendar_Import_Error_ColumnInputs */
/** @typedef {{ name: NonNullable<unknown> }} Calendar_Import_Error_Column_TwiceInputs */
/** @typedef {{}} Calendar_Import_Error_DateInputs */
/** @typedef {{}} Calendar_Import_Error_Date_HalfInputs */
/** @typedef {{}} Calendar_Import_Error_EmptyInputs */
/** @typedef {{}} Calendar_Import_Error_FieldsInputs */
/** @typedef {{ handle: NonNullable<unknown> }} Calendar_Import_Error_HandleInputs */
/** @typedef {{ handle: NonNullable<unknown> }} Calendar_Import_Error_Handle_TwiceInputs */
/** @typedef {{ channel: NonNullable<unknown>, status: NonNullable<unknown> }} Calendar_Import_Error_InactiveInputs */
/** @typedef {{}} Calendar_Import_Error_QuoteInputs */
/** @typedef {{}} Calendar_Import_Error_ReadInputs */
/** @typedef {{}} Calendar_Import_Error_TextInputs */
/** @typedef {{}} Calendar_Import_Error_Text_ColumnInputs */
/** @typedef {{ count: NonNullable<unknown> }} Calendar_Import_Error_Too_ManyInputs */
/** @typedef {{}} Calendar_Import_ExampleInputs */
/** @typedef {{}} Calendar_Import_Example_FirstInputs */
/** @typedef {{}} Calendar_Import_Example_QueueInputs */
/** @typedef {{}} Calendar_Import_FileInputs */
/** @typedef {{}} Calendar_Import_ImportingInputs */
/** @typedef {{}} Calendar_Import_IntroInputs */
/** @typedef {{ line: NonNullable<unknown>, problem: NonNullable<unknown> }} Calendar_Import_LineInputs */
/** @typedef {{}} Calendar_Import_No_ChannelsInputs */
/** @typedef {{}} Calendar_Import_OpenInputs */
/** @typedef {{ count: NonNullable<unknown> }} Calendar_Import_ProblemsInputs */
/** @typedef {{ count: NonNullable<unknown> }} Calendar_Import_ReadyInputs */
/** @typedef {{ count: NonNullable<unknown> }} Calendar_Import_RequestedInputs */
/** @typedef {{ count: NonNullable<unknown> }} Calendar_Import_ScheduledInputs */
/** @typedef {{}} Calendar_Import_SubmitInputs */
/** @typedef {{}} Calendar_Import_TitleInputs */
/** @typedef {{}} Calendar_LayoutInputs */
/** @typedef {{}} Calendar_Layout_GridInputs */
/** @typedef {{}} Calendar_Load_FailedInputs */
/** @typedef {{ count: NonNullable<unknown> }} Calendar_MoreInputs */
/** @typedef {{}} Calendar_Move_ApprovalInputs */
/** @typedef {{}} Calendar_Move_ChangedInputs */
/** @typedef {{}} Calendar_Move_FailedInputs */
/** @typedef {{}} Calendar_Move_HintInputs */
/** @typedef {{}} Calendar_Move_In_PastInputs */
/** @typedef {{}} Calendar_Move_ReapprovalInputs */
/** @typedef {{}} Calendar_Move_UnavailableInputs */
/** @typedef {{ when: NonNullable<unknown> }} Calendar_MovedInputs */
/** @typedef {{}} Calendar_NavigationInputs */
/** @typedef {{ when: NonNullable<unknown> }} Calendar_New_Post_AtInputs */
/** @typedef {{}} Calendar_Next_DayInputs */
/** @typedef {{}} Calendar_Next_MonthInputs */
/** @typedef {{}} Calendar_Next_WeekInputs */
/** @typedef {{ when: NonNullable<unknown>, tz: NonNullable<unknown> }} Calendar_Own_TimeInputs */
/** @typedef {{}} Calendar_Previous_DayInputs */
/** @typedef {{}} Calendar_Previous_MonthInputs */
/** @typedef {{}} Calendar_Previous_WeekInputs */
/** @typedef {{}} Calendar_Sidebar_CollapseInputs */
/** @typedef {{}} Calendar_Sidebar_ExpandInputs */
/** @typedef {{}} Calendar_Tag_CurrentInputs */
/** @typedef {{}} Calendar_Tag_FilterInputs */
/** @typedef {{}} Calendar_Tag_GoneInputs */
/** @typedef {{}} Calendar_Tags_AllInputs */
/** @typedef {{ tz: NonNullable<unknown> }} Calendar_Time_ZoneInputs */
/** @typedef {{}} Calendar_TodayInputs */
/** @typedef {{}} Calendar_TruncatedInputs */
/** @typedef {{}} Calendar_UndoInputs */
/** @typedef {{}} Calendar_View_ListInputs */
/** @typedef {{}} Calendar_View_MonthInputs */
/** @typedef {{}} Calendar_View_WeekInputs */
/** @typedef {{}} Calendar_ViewsInputs */
/** @typedef {{}} Home_Empty_BodyInputs */
/** @typedef {{}} Home_Empty_TitleInputs */
/** @typedef {{}} Nav_New_PostInputs */
/** @typedef {{ count: NonNullable<unknown> }} Posts_ScheduledInputs */
import * as registry from "../registry.js"


export const calendar_add_channel = /** @type {(inputs: Calendar_Add_ChannelInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Přidat kanál`)
};

export const calendar_chip_label = /** @type {(inputs: Calendar_Chip_LabelInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`${i?.time}, ${i?.channel}, ${i?.state}: ${i?.text}`)
};

export const calendar_chip_tags = /** @type {(inputs: Calendar_Chip_TagsInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`${i?.label}. Štítky: ${i?.tags}`)
};

export const calendar_create_post = /** @type {(inputs: Calendar_Create_PostInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Vytvořit příspěvek`)
};

export const calendar_day_empty = /** @type {(inputs: Calendar_Day_EmptyInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Nic naplánováno`)
};

export const calendar_draft_updated = /** @type {(inputs: Calendar_Draft_UpdatedInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Upraveno ${i?.when}`)
};

export const calendar_drafts = /** @type {(inputs: Calendar_DraftsInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Koncepty`)
};

export const calendar_drafts_empty = /** @type {(inputs: Calendar_Drafts_EmptyInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Žádné koncepty.`)
};

export const calendar_entry_open = /** @type {(inputs: Calendar_Entry_OpenInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Otevřít`)
};

export const calendar_entry_options = /** @type {(inputs: Calendar_Entry_OptionsInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Možnosti příspěvku: ${i?.text}`)
};

export const calendar_entry_preview = /** @type {(inputs: Calendar_Entry_PreviewInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Náhled`)
};

export const calendar_import_channels = /** @type {(inputs: Calendar_Import_ChannelsInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Výchozí kanály`)
};

export const calendar_import_channels_hint = /** @type {(inputs: Calendar_Import_Channels_HintInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Pro řádky s prázdným sloupcem channels. Ve sloupci uveďte uživatelská jména kanálů oddělená čárkou nebo mezerou.`)
};

export const calendar_import_checking = /** @type {(inputs: Calendar_Import_CheckingInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Soubor se kontroluje…`)
};

export const calendar_import_error_channel = /** @type {(inputs: Calendar_Import_Error_ChannelInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Kanál ${i?.channel} nemůže zveřejnit příspěvek jen s textem.`)
};

export const calendar_import_error_channels = /** @type {(inputs: Calendar_Import_Error_ChannelsInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Vyplňte sloupec channels, nebo vyberte výchozí kanály.`)
};

export const calendar_import_error_column = /** @type {(inputs: Calendar_Import_Error_ColumnInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Neznámý sloupec „${i?.name}“. Použijte text, channels, date a time.`)
};

export const calendar_import_error_column_twice = /** @type {(inputs: Calendar_Import_Error_Column_TwiceInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Sloupec „${i?.name}“ je v souboru dvakrát.`)
};

export const calendar_import_error_date = /** @type {(inputs: Calendar_Import_Error_DateInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Zadejte datum ve tvaru 2026-12-31 a čas ve tvaru 09:30.`)
};

export const calendar_import_error_date_half = /** @type {(inputs: Calendar_Import_Error_Date_HalfInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Vyplňte datum i čas, nebo nechte obě pole prázdná.`)
};

export const calendar_import_error_empty = /** @type {(inputs: Calendar_Import_Error_EmptyInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`V souboru nejsou žádné příspěvky.`)
};

export const calendar_import_error_fields = /** @type {(inputs: Calendar_Import_Error_FieldsInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Řádek má víc polí než záhlaví.`)
};

export const calendar_import_error_handle = /** @type {(inputs: Calendar_Import_Error_HandleInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Žádný kanál nemá uživatelské jméno „${i?.handle}“.`)
};

export const calendar_import_error_handle_twice = /** @type {(inputs: Calendar_Import_Error_Handle_TwiceInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Uživatelské jméno „${i?.handle}“ má víc kanálů.`)
};

export const calendar_import_error_inactive = /** @type {(inputs: Calendar_Import_Error_InactiveInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Kanál ${i?.channel}: ${i?.status}`)
};

export const calendar_import_error_quote = /** @type {(inputs: Calendar_Import_Error_QuoteInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Pole v uvozovkách není uzavřené.`)
};

export const calendar_import_error_read = /** @type {(inputs: Calendar_Import_Error_ReadInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Soubor se nepodařilo načíst.`)
};

export const calendar_import_error_text = /** @type {(inputs: Calendar_Import_Error_TextInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Text je prázdný.`)
};

export const calendar_import_error_text_column = /** @type {(inputs: Calendar_Import_Error_Text_ColumnInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`V souboru chybí sloupec text.`)
};

export const calendar_import_error_too_many = /** @type {(inputs: Calendar_Import_Error_Too_ManyInputs) => LocalizedString} */ (i) => {
	const countPlural = registry.plural("cs", i?.count, {}, true);
	if (countPlural === "one") return /** @type {LocalizedString} */ (`Soubor má víc než ${i?.count} příspěvek. Rozdělte ho na menší soubory.`);
	if (countPlural === "few") return /** @type {LocalizedString} */ (`Soubor má víc než ${i?.count} příspěvky. Rozdělte ho na menší soubory.`);
	if (countPlural === "many") return /** @type {LocalizedString} */ (`Soubor má víc než ${i?.count} příspěvku. Rozdělte ho na menší soubory.`);
	return /** @type {LocalizedString} */ (`Soubor má víc než ${i?.count} příspěvků. Rozdělte ho na menší soubory.`)
};

export const calendar_import_example = /** @type {(inputs: Calendar_Import_ExampleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Stáhnout ukázkový CSV`)
};

export const calendar_import_example_first = /** @type {(inputs: Calendar_Import_Example_FirstInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Dobrý den! Tento příspěvek vyjde v zadaném datu a čase.`)
};

export const calendar_import_example_queue = /** @type {(inputs: Calendar_Import_Example_QueueInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Tento příspěvek dostane nejbližší volné místo ve frontě.`)
};

export const calendar_import_file = /** @type {(inputs: Calendar_Import_FileInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Soubor CSV`)
};

export const calendar_import_importing = /** @type {(inputs: Calendar_Import_ImportingInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Importuje se…`)
};

export const calendar_import_intro = /** @type {(inputs: Calendar_Import_IntroInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Z každého řádku vznikne jeden příspěvek. Použijte sloupce text, channels, date a time; povinný je jen text. Řádek bez data a času se zařadí do fronty každého kanálu.`)
};

export const calendar_import_line = /** @type {(inputs: Calendar_Import_LineInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Řádek ${i?.line}: ${i?.problem}`)
};

export const calendar_import_no_channels = /** @type {(inputs: Calendar_Import_No_ChannelsInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Žádný kanál nemůže zveřejnit příspěvek jen s textem.`)
};

export const calendar_import_open = /** @type {(inputs: Calendar_Import_OpenInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Importovat CSV`)
};

export const calendar_import_problems = /** @type {(inputs: Calendar_Import_ProblemsInputs) => LocalizedString} */ (i) => {
	const countPlural = registry.plural("cs", i?.count, {}, true);
	if (countPlural === "one") return /** @type {LocalizedString} */ (`V souboru je ${i?.count} chyba. Opravte ho a vyberte znovu.`);
	if (countPlural === "few") return /** @type {LocalizedString} */ (`V souboru jsou ${i?.count} chyby. Opravte ho a vyberte znovu.`);
	if (countPlural === "many") return /** @type {LocalizedString} */ (`V souboru je ${i?.count} chyby. Opravte ho a vyberte znovu.`);
	return /** @type {LocalizedString} */ (`V souboru je ${i?.count} chyb. Opravte ho a vyberte znovu.`)
};

export const calendar_import_ready = /** @type {(inputs: Calendar_Import_ReadyInputs) => LocalizedString} */ (i) => {
	const countPlural = registry.plural("cs", i?.count, {}, true);
	if (countPlural === "one") return /** @type {LocalizedString} */ (`${i?.count} příspěvek je připravený k importu.`);
	if (countPlural === "few") return /** @type {LocalizedString} */ (`${i?.count} příspěvky jsou připravené k importu.`);
	if (countPlural === "many") return /** @type {LocalizedString} */ (`${i?.count} příspěvku je připraveno k importu.`);
	return /** @type {LocalizedString} */ (`${i?.count} příspěvků je připraveno k importu.`)
};

export const calendar_import_requested = /** @type {(inputs: Calendar_Import_RequestedInputs) => LocalizedString} */ (i) => {
	const countPlural = registry.plural("cs", i?.count, {}, true);
	if (countPlural === "one") return /** @type {LocalizedString} */ (`${i?.count} příspěvek čeká na schválení.`);
	if (countPlural === "few") return /** @type {LocalizedString} */ (`${i?.count} příspěvky čekají na schválení.`);
	if (countPlural === "many") return /** @type {LocalizedString} */ (`${i?.count} příspěvku čeká na schválení.`);
	return /** @type {LocalizedString} */ (`${i?.count} příspěvků čeká na schválení.`)
};

export const calendar_import_scheduled = /** @type {(inputs: Calendar_Import_ScheduledInputs) => LocalizedString} */ (i) => {
	const countPlural = registry.plural("cs", i?.count, {}, true);
	if (countPlural === "one") return /** @type {LocalizedString} */ (`${i?.count} příspěvek je naplánovaný.`);
	if (countPlural === "few") return /** @type {LocalizedString} */ (`${i?.count} příspěvky jsou naplánované.`);
	if (countPlural === "many") return /** @type {LocalizedString} */ (`${i?.count} příspěvku je naplánováno.`);
	return /** @type {LocalizedString} */ (`${i?.count} příspěvků je naplánováno.`)
};

export const calendar_import_submit = /** @type {(inputs: Calendar_Import_SubmitInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Importovat`)
};

export const calendar_import_title = /** @type {(inputs: Calendar_Import_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Import příspěvků ze souboru CSV`)
};

export const calendar_layout = /** @type {(inputs: Calendar_LayoutInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Rozložení`)
};

export const calendar_layout_grid = /** @type {(inputs: Calendar_Layout_GridInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Mřížka`)
};

export const calendar_load_failed = /** @type {(inputs: Calendar_Load_FailedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Kalendář se nepodařilo načíst. Zkuste to znovu.`)
};

export const calendar_more = /** @type {(inputs: Calendar_MoreInputs) => LocalizedString} */ (i) => {
	const countPlural = registry.plural("cs", i?.count, {}, true);
	if (countPlural === "one") return /** @type {LocalizedString} */ (`+${i?.count} další`);
	if (countPlural === "few") return /** @type {LocalizedString} */ (`+${i?.count} další`);
	if (countPlural === "many") return /** @type {LocalizedString} */ (`+${i?.count} dalšího`);
	return /** @type {LocalizedString} */ (`+${i?.count} dalších`)
};

export const calendar_move_approval = /** @type {(inputs: Calendar_Move_ApprovalInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Než příspěvek přesunete, musí být schválený.`)
};

export const calendar_move_changed = /** @type {(inputs: Calendar_Move_ChangedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Příspěvek mezitím upravil někdo jiný. Kalendář teď ukazuje jeho aktuální verzi.`)
};

export const calendar_move_failed = /** @type {(inputs: Calendar_Move_FailedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Příspěvek se nepodařilo přesunout. Zkuste to znovu.`)
};

export const calendar_move_hint = /** @type {(inputs: Calendar_Move_HintInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Klávesou Shift se šipkami posunete příspěvek o den nebo o týden. Všechny jeho kanály se přesunou společně.`)
};

export const calendar_move_in_past = /** @type {(inputs: Calendar_Move_In_PastInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Tento čas už uplynul. Vyberte pozdější den.`)
};

export const calendar_move_reapproval = /** @type {(inputs: Calendar_Move_ReapprovalInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Tento čas je mimo schválený rozsah, příspěvek proto musí být znovu schválen.`)
};

export const calendar_move_unavailable = /** @type {(inputs: Calendar_Move_UnavailableInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Příspěvek teď nejde přesunout. Možná se právě zveřejňuje.`)
};

export const calendar_moved = /** @type {(inputs: Calendar_MovedInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Přesunuto na ${i?.when}`)
};

export const calendar_navigation = /** @type {(inputs: Calendar_NavigationInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Pohyb v kalendáři`)
};

export const calendar_new_post_at = /** @type {(inputs: Calendar_New_Post_AtInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Vytvořit příspěvek: ${i?.when}`)
};

export const calendar_next_day = /** @type {(inputs: Calendar_Next_DayInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Následující den`)
};

export const calendar_next_month = /** @type {(inputs: Calendar_Next_MonthInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Další měsíc`)
};

export const calendar_next_week = /** @type {(inputs: Calendar_Next_WeekInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Další týden`)
};

export const calendar_own_time = /** @type {(inputs: Calendar_Own_TimeInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`${i?.when} v časovém pásmu ${i?.tz}`)
};

export const calendar_previous_day = /** @type {(inputs: Calendar_Previous_DayInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Předchozí den`)
};

export const calendar_previous_month = /** @type {(inputs: Calendar_Previous_MonthInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Předchozí měsíc`)
};

export const calendar_previous_week = /** @type {(inputs: Calendar_Previous_WeekInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Předchozí týden`)
};

export const calendar_sidebar_collapse = /** @type {(inputs: Calendar_Sidebar_CollapseInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Sbalit postranní panel`)
};

export const calendar_sidebar_expand = /** @type {(inputs: Calendar_Sidebar_ExpandInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Rozbalit postranní panel`)
};

export const calendar_tag_current = /** @type {(inputs: Calendar_Tag_CurrentInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Vybraný štítek`)
};

export const calendar_tag_filter = /** @type {(inputs: Calendar_Tag_FilterInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Filtrovat podle štítku`)
};

export const calendar_tag_gone = /** @type {(inputs: Calendar_Tag_GoneInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Smazaný štítek`)
};

export const calendar_tags_all = /** @type {(inputs: Calendar_Tags_AllInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Všechny štítky`)
};

export const calendar_time_zone = /** @type {(inputs: Calendar_Time_ZoneInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Časy v časovém pásmu ${i?.tz}`)
};

export const calendar_today = /** @type {(inputs: Calendar_TodayInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Dnes`)
};

export const calendar_truncated = /** @type {(inputs: Calendar_TruncatedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`V tomto období je víc příspěvků, než kalendář dokáže zobrazit, takže některé chybí. Pokud je chcete vidět všechny, vyberte kratší období.`)
};

export const calendar_undo = /** @type {(inputs: Calendar_UndoInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Vrátit zpět`)
};

export const calendar_view_list = /** @type {(inputs: Calendar_View_ListInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Seznam`)
};

export const calendar_view_month = /** @type {(inputs: Calendar_View_MonthInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Měsíc`)
};

export const calendar_view_week = /** @type {(inputs: Calendar_View_WeekInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Týden`)
};

export const calendar_views = /** @type {(inputs: Calendar_ViewsInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Zobrazení kalendáře`)
};

export const home_empty_body = /** @type {(inputs: Home_Empty_BodyInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Tady se zobrazí příspěvky, které naplánujete.`)
};

export const home_empty_title = /** @type {(inputs: Home_Empty_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Zatím nemáte nic naplánováno`)
};

export const nav_new_post = /** @type {(inputs: Nav_New_PostInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Nový příspěvek`)
};

export const posts_scheduled = /** @type {(inputs: Posts_ScheduledInputs) => LocalizedString} */ (i) => {
	const countPlural = registry.plural("cs", i?.count, {}, true);
	if (countPlural === "one") return /** @type {LocalizedString} */ (`${i?.count} naplánovaný příspěvek`);
	if (countPlural === "few") return /** @type {LocalizedString} */ (`${i?.count} naplánované příspěvky`);
	if (countPlural === "many") return /** @type {LocalizedString} */ (`${i?.count} naplánovaného příspěvku`);
	return /** @type {LocalizedString} */ (`${i?.count} naplánovaných příspěvků`)
};