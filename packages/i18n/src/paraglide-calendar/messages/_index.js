import { getLocale, experimentalStaticLocale } from "../runtime.js"

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
/** @typedef {{ channel: NonNullable<unknown> }} Calendar_Import_Error_Channel_MediaInputs */
/** @typedef {{}} Calendar_Import_Error_ChannelsInputs */
/** @typedef {{ name: NonNullable<unknown> }} Calendar_Import_Error_ColumnInputs */
/** @typedef {{ name: NonNullable<unknown> }} Calendar_Import_Error_Column_TwiceInputs */
/** @typedef {{}} Calendar_Import_Error_DateInputs */
/** @typedef {{}} Calendar_Import_Error_Date_HalfInputs */
/** @typedef {{}} Calendar_Import_Error_EmptyInputs */
/** @typedef {{}} Calendar_Import_Error_EncodingInputs */
/** @typedef {{}} Calendar_Import_Error_FieldsInputs */
/** @typedef {{ handle: NonNullable<unknown> }} Calendar_Import_Error_HandleInputs */
/** @typedef {{ handle: NonNullable<unknown> }} Calendar_Import_Error_Handle_TwiceInputs */
/** @typedef {{ channel: NonNullable<unknown>, status: NonNullable<unknown> }} Calendar_Import_Error_InactiveInputs */
/** @typedef {{ host: NonNullable<unknown> }} Calendar_Import_Error_Media_FailedInputs */
/** @typedef {{ count: NonNullable<unknown> }} Calendar_Import_Error_Media_File_Too_ManyInputs */
/** @typedef {{}} Calendar_Import_Error_Media_LinkInputs */
/** @typedef {{}} Calendar_Import_Error_Media_MixInputs */
/** @typedef {{}} Calendar_Import_Error_Media_Rate_LimitedInputs */
/** @typedef {{ host: NonNullable<unknown> }} Calendar_Import_Error_Media_RejectedInputs */
/** @typedef {{ count: NonNullable<unknown> }} Calendar_Import_Error_Media_Too_ManyInputs */
/** @typedef {{}} Calendar_Import_Error_QuoteInputs */
/** @typedef {{}} Calendar_Import_Error_ReadInputs */
/** @typedef {{}} Calendar_Import_Error_TextInputs */
/** @typedef {{}} Calendar_Import_Error_Text_ColumnInputs */
/** @typedef {{}} Calendar_Import_Error_Too_LargeInputs */
/** @typedef {{ count: NonNullable<unknown> }} Calendar_Import_Error_Too_ManyInputs */
/** @typedef {{}} Calendar_Import_ExampleInputs */
/** @typedef {{}} Calendar_Import_Example_FirstInputs */
/** @typedef {{}} Calendar_Import_Example_MediaInputs */
/** @typedef {{}} Calendar_Import_Example_QueueInputs */
/** @typedef {{}} Calendar_Import_Fetch_StopInputs */
/** @typedef {{}} Calendar_Import_Fetch_StoppedInputs */
/** @typedef {{ current: NonNullable<unknown>, total: NonNullable<unknown> }} Calendar_Import_FetchingInputs */
/** @typedef {{}} Calendar_Import_FileInputs */
/** @typedef {{}} Calendar_Import_ImportingInputs */
/** @typedef {{}} Calendar_Import_IntroInputs */
/** @typedef {{ channel: NonNullable<unknown>, problem: NonNullable<unknown> }} Calendar_Import_Issue_ChannelInputs */
/** @typedef {{}} Calendar_Import_Issue_Not_FoundInputs */
/** @typedef {{}} Calendar_Import_Issue_Out_Of_ScopeInputs */
/** @typedef {{}} Calendar_Import_Issue_Scope_MissingInputs */
/** @typedef {{ line: NonNullable<unknown>, problem: NonNullable<unknown> }} Calendar_Import_LineInputs */
/** @typedef {{ count: NonNullable<unknown> }} Calendar_Import_Media_HintInputs */
/** @typedef {{}} Calendar_Import_No_ChannelsInputs */
/** @typedef {{}} Calendar_Import_OpenInputs */
/** @typedef {{ count: NonNullable<unknown> }} Calendar_Import_ProblemsInputs */
/** @typedef {{ count: NonNullable<unknown> }} Calendar_Import_ReadyInputs */
/** @typedef {{ count: NonNullable<unknown> }} Calendar_Import_RequestedInputs */
/** @typedef {{}} Calendar_Import_Requested_QueueInputs */
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
import * as __en from "./en.js"
import * as __sk from "./sk.js"
import * as __cs from "./cs.js"
/**
* | output |
* | --- |
* | "Add channel" |
*
* @param {Calendar_Add_ChannelInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const calendar_add_channel = /** @type {((inputs?: Calendar_Add_ChannelInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Calendar_Add_ChannelInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.calendar_add_channel(inputs)
	if (locale === "cs") return __cs.calendar_add_channel(inputs)
	return __en.calendar_add_channel(inputs)
});
/**
* | output |
* | --- |
* | "{time}, {channel}, {state}: {text}" |
*
* @param {Calendar_Chip_LabelInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const calendar_chip_label = /** @type {((inputs: Calendar_Chip_LabelInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Calendar_Chip_LabelInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.calendar_chip_label(inputs)
	if (locale === "cs") return __cs.calendar_chip_label(inputs)
	return __en.calendar_chip_label(inputs)
});
/**
* | output |
* | --- |
* | "{label}. Tags: {tags}" |
*
* @param {Calendar_Chip_TagsInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const calendar_chip_tags = /** @type {((inputs: Calendar_Chip_TagsInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Calendar_Chip_TagsInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.calendar_chip_tags(inputs)
	if (locale === "cs") return __cs.calendar_chip_tags(inputs)
	return __en.calendar_chip_tags(inputs)
});
/**
* | output |
* | --- |
* | "Create post" |
*
* @param {Calendar_Create_PostInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const calendar_create_post = /** @type {((inputs?: Calendar_Create_PostInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Calendar_Create_PostInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.calendar_create_post(inputs)
	if (locale === "cs") return __cs.calendar_create_post(inputs)
	return __en.calendar_create_post(inputs)
});
/**
* | output |
* | --- |
* | "Nothing planned" |
*
* @param {Calendar_Day_EmptyInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const calendar_day_empty = /** @type {((inputs?: Calendar_Day_EmptyInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Calendar_Day_EmptyInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.calendar_day_empty(inputs)
	if (locale === "cs") return __cs.calendar_day_empty(inputs)
	return __en.calendar_day_empty(inputs)
});
/**
* | output |
* | --- |
* | "Edited {when}" |
*
* @param {Calendar_Draft_UpdatedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const calendar_draft_updated = /** @type {((inputs: Calendar_Draft_UpdatedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Calendar_Draft_UpdatedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.calendar_draft_updated(inputs)
	if (locale === "cs") return __cs.calendar_draft_updated(inputs)
	return __en.calendar_draft_updated(inputs)
});
/**
* | output |
* | --- |
* | "Drafts" |
*
* @param {Calendar_DraftsInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const calendar_drafts = /** @type {((inputs?: Calendar_DraftsInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Calendar_DraftsInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.calendar_drafts(inputs)
	if (locale === "cs") return __cs.calendar_drafts(inputs)
	return __en.calendar_drafts(inputs)
});
/**
* | output |
* | --- |
* | "No drafts." |
*
* @param {Calendar_Drafts_EmptyInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const calendar_drafts_empty = /** @type {((inputs?: Calendar_Drafts_EmptyInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Calendar_Drafts_EmptyInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.calendar_drafts_empty(inputs)
	if (locale === "cs") return __cs.calendar_drafts_empty(inputs)
	return __en.calendar_drafts_empty(inputs)
});
/**
* | output |
* | --- |
* | "Open" |
*
* @param {Calendar_Entry_OpenInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const calendar_entry_open = /** @type {((inputs?: Calendar_Entry_OpenInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Calendar_Entry_OpenInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.calendar_entry_open(inputs)
	if (locale === "cs") return __cs.calendar_entry_open(inputs)
	return __en.calendar_entry_open(inputs)
});
/**
* | output |
* | --- |
* | "Post options: {text}" |
*
* @param {Calendar_Entry_OptionsInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const calendar_entry_options = /** @type {((inputs: Calendar_Entry_OptionsInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Calendar_Entry_OptionsInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.calendar_entry_options(inputs)
	if (locale === "cs") return __cs.calendar_entry_options(inputs)
	return __en.calendar_entry_options(inputs)
});
/**
* | output |
* | --- |
* | "Preview" |
*
* @param {Calendar_Entry_PreviewInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const calendar_entry_preview = /** @type {((inputs?: Calendar_Entry_PreviewInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Calendar_Entry_PreviewInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.calendar_entry_preview(inputs)
	if (locale === "cs") return __cs.calendar_entry_preview(inputs)
	return __en.calendar_entry_preview(inputs)
});
/**
* | output |
* | --- |
* | "Default channels" |
*
* @param {Calendar_Import_ChannelsInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const calendar_import_channels = /** @type {((inputs?: Calendar_Import_ChannelsInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Calendar_Import_ChannelsInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.calendar_import_channels(inputs)
	if (locale === "cs") return __cs.calendar_import_channels(inputs)
	return __en.calendar_import_channels(inputs)
});
/**
* | output |
* | --- |
* | "For rows whose channels column is empty. In the column, list channel handles separated by commas or spaces." |
*
* @param {Calendar_Import_Channels_HintInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const calendar_import_channels_hint = /** @type {((inputs?: Calendar_Import_Channels_HintInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Calendar_Import_Channels_HintInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.calendar_import_channels_hint(inputs)
	if (locale === "cs") return __cs.calendar_import_channels_hint(inputs)
	return __en.calendar_import_channels_hint(inputs)
});
/**
* | output |
* | --- |
* | "Checking the file…" |
*
* @param {Calendar_Import_CheckingInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const calendar_import_checking = /** @type {((inputs?: Calendar_Import_CheckingInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Calendar_Import_CheckingInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.calendar_import_checking(inputs)
	if (locale === "cs") return __cs.calendar_import_checking(inputs)
	return __en.calendar_import_checking(inputs)
});
/**
* | output |
* | --- |
* | "{channel} can't publish a text-only post." |
*
* @param {Calendar_Import_Error_ChannelInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const calendar_import_error_channel = /** @type {((inputs: Calendar_Import_Error_ChannelInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Calendar_Import_Error_ChannelInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.calendar_import_error_channel(inputs)
	if (locale === "cs") return __cs.calendar_import_error_channel(inputs)
	return __en.calendar_import_error_channel(inputs)
});
/**
* | output |
* | --- |
* | "{channel} can't publish this media." |
*
* @param {Calendar_Import_Error_Channel_MediaInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const calendar_import_error_channel_media = /** @type {((inputs: Calendar_Import_Error_Channel_MediaInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Calendar_Import_Error_Channel_MediaInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.calendar_import_error_channel_media(inputs)
	if (locale === "cs") return __cs.calendar_import_error_channel_media(inputs)
	return __en.calendar_import_error_channel_media(inputs)
});
/**
* | output |
* | --- |
* | "Fill in the channels column or pick default channels." |
*
* @param {Calendar_Import_Error_ChannelsInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const calendar_import_error_channels = /** @type {((inputs?: Calendar_Import_Error_ChannelsInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Calendar_Import_Error_ChannelsInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.calendar_import_error_channels(inputs)
	if (locale === "cs") return __cs.calendar_import_error_channels(inputs)
	return __en.calendar_import_error_channels(inputs)
});
/**
* | output |
* | --- |
* | "Unknown column “{name}”. Use text, channels, date, time and media." |
*
* @param {Calendar_Import_Error_ColumnInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const calendar_import_error_column = /** @type {((inputs: Calendar_Import_Error_ColumnInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Calendar_Import_Error_ColumnInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.calendar_import_error_column(inputs)
	if (locale === "cs") return __cs.calendar_import_error_column(inputs)
	return __en.calendar_import_error_column(inputs)
});
/**
* | output |
* | --- |
* | "The column “{name}” appears twice." |
*
* @param {Calendar_Import_Error_Column_TwiceInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const calendar_import_error_column_twice = /** @type {((inputs: Calendar_Import_Error_Column_TwiceInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Calendar_Import_Error_Column_TwiceInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.calendar_import_error_column_twice(inputs)
	if (locale === "cs") return __cs.calendar_import_error_column_twice(inputs)
	return __en.calendar_import_error_column_twice(inputs)
});
/**
* | output |
* | --- |
* | "Write the date as 2026-12-31 or 31.12.2026 and the time as 9:30, 09:30 or 09:30:00." |
*
* @param {Calendar_Import_Error_DateInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const calendar_import_error_date = /** @type {((inputs?: Calendar_Import_Error_DateInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Calendar_Import_Error_DateInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.calendar_import_error_date(inputs)
	if (locale === "cs") return __cs.calendar_import_error_date(inputs)
	return __en.calendar_import_error_date(inputs)
});
/**
* | output |
* | --- |
* | "Fill in both the date and the time, or leave both empty." |
*
* @param {Calendar_Import_Error_Date_HalfInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const calendar_import_error_date_half = /** @type {((inputs?: Calendar_Import_Error_Date_HalfInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Calendar_Import_Error_Date_HalfInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.calendar_import_error_date_half(inputs)
	if (locale === "cs") return __cs.calendar_import_error_date_half(inputs)
	return __en.calendar_import_error_date_half(inputs)
});
/**
* | output |
* | --- |
* | "The file has no posts." |
*
* @param {Calendar_Import_Error_EmptyInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const calendar_import_error_empty = /** @type {((inputs?: Calendar_Import_Error_EmptyInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Calendar_Import_Error_EmptyInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.calendar_import_error_empty(inputs)
	if (locale === "cs") return __cs.calendar_import_error_empty(inputs)
	return __en.calendar_import_error_empty(inputs)
});
/**
* | output |
* | --- |
* | "The file isn't saved as UTF-8. In Excel, use Save As and pick the type “CSV UTF-8”." |
*
* @param {Calendar_Import_Error_EncodingInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const calendar_import_error_encoding = /** @type {((inputs?: Calendar_Import_Error_EncodingInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Calendar_Import_Error_EncodingInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.calendar_import_error_encoding(inputs)
	if (locale === "cs") return __cs.calendar_import_error_encoding(inputs)
	return __en.calendar_import_error_encoding(inputs)
});
/**
* | output |
* | --- |
* | "This row has more fields than the header." |
*
* @param {Calendar_Import_Error_FieldsInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const calendar_import_error_fields = /** @type {((inputs?: Calendar_Import_Error_FieldsInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Calendar_Import_Error_FieldsInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.calendar_import_error_fields(inputs)
	if (locale === "cs") return __cs.calendar_import_error_fields(inputs)
	return __en.calendar_import_error_fields(inputs)
});
/**
* | output |
* | --- |
* | "No channel has the handle “{handle}”." |
*
* @param {Calendar_Import_Error_HandleInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const calendar_import_error_handle = /** @type {((inputs: Calendar_Import_Error_HandleInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Calendar_Import_Error_HandleInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.calendar_import_error_handle(inputs)
	if (locale === "cs") return __cs.calendar_import_error_handle(inputs)
	return __en.calendar_import_error_handle(inputs)
});
/**
* | output |
* | --- |
* | "More than one channel has the handle “{handle}”." |
*
* @param {Calendar_Import_Error_Handle_TwiceInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const calendar_import_error_handle_twice = /** @type {((inputs: Calendar_Import_Error_Handle_TwiceInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Calendar_Import_Error_Handle_TwiceInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.calendar_import_error_handle_twice(inputs)
	if (locale === "cs") return __cs.calendar_import_error_handle_twice(inputs)
	return __en.calendar_import_error_handle_twice(inputs)
});
/**
* | output |
* | --- |
* | "{channel}: {status}" |
*
* @param {Calendar_Import_Error_InactiveInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const calendar_import_error_inactive = /** @type {((inputs: Calendar_Import_Error_InactiveInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Calendar_Import_Error_InactiveInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.calendar_import_error_inactive(inputs)
	if (locale === "cs") return __cs.calendar_import_error_inactive(inputs)
	return __en.calendar_import_error_inactive(inputs)
});
/**
* | output |
* | --- |
* | "The media link on {host} couldn't be fetched." |
*
* @param {Calendar_Import_Error_Media_FailedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const calendar_import_error_media_failed = /** @type {((inputs: Calendar_Import_Error_Media_FailedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Calendar_Import_Error_Media_FailedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.calendar_import_error_media_failed(inputs)
	if (locale === "cs") return __cs.calendar_import_error_media_failed(inputs)
	return __en.calendar_import_error_media_failed(inputs)
});
/**
* | countPlural | output |
* | --- | --- |
* | "one" | "The file has more than {count} media link. Split it into smaller files." |
* | * | "The file has more than {count} media links. Split it into smaller files." |
*
* @param {Calendar_Import_Error_Media_File_Too_ManyInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const calendar_import_error_media_file_too_many = /** @type {((inputs: Calendar_Import_Error_Media_File_Too_ManyInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Calendar_Import_Error_Media_File_Too_ManyInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.calendar_import_error_media_file_too_many(inputs)
	if (locale === "cs") return __cs.calendar_import_error_media_file_too_many(inputs)
	return __en.calendar_import_error_media_file_too_many(inputs)
});
/**
* | output |
* | --- |
* | "Media links must be https links, such as https://example.com/photo.jpg." |
*
* @param {Calendar_Import_Error_Media_LinkInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const calendar_import_error_media_link = /** @type {((inputs?: Calendar_Import_Error_Media_LinkInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Calendar_Import_Error_Media_LinkInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.calendar_import_error_media_link(inputs)
	if (locale === "cs") return __cs.calendar_import_error_media_link(inputs)
	return __en.calendar_import_error_media_link(inputs)
});
/**
* | output |
* | --- |
* | "A post can have images or one video, not both." |
*
* @param {Calendar_Import_Error_Media_MixInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const calendar_import_error_media_mix = /** @type {((inputs?: Calendar_Import_Error_Media_MixInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Calendar_Import_Error_Media_MixInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.calendar_import_error_media_mix(inputs)
	if (locale === "cs") return __cs.calendar_import_error_media_mix(inputs)
	return __en.calendar_import_error_media_mix(inputs)
});
/**
* | output |
* | --- |
* | "Too many media links are being imported right now. Pick the file again later to continue." |
*
* @param {Calendar_Import_Error_Media_Rate_LimitedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const calendar_import_error_media_rate_limited = /** @type {((inputs?: Calendar_Import_Error_Media_Rate_LimitedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Calendar_Import_Error_Media_Rate_LimitedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.calendar_import_error_media_rate_limited(inputs)
	if (locale === "cs") return __cs.calendar_import_error_media_rate_limited(inputs)
	return __en.calendar_import_error_media_rate_limited(inputs)
});
/**
* | output |
* | --- |
* | "The media from {host} can't be used." |
*
* @param {Calendar_Import_Error_Media_RejectedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const calendar_import_error_media_rejected = /** @type {((inputs: Calendar_Import_Error_Media_RejectedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Calendar_Import_Error_Media_RejectedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.calendar_import_error_media_rejected(inputs)
	if (locale === "cs") return __cs.calendar_import_error_media_rejected(inputs)
	return __en.calendar_import_error_media_rejected(inputs)
});
/**
* | countPlural | output |
* | --- | --- |
* | "one" | "A row can have at most {count} media link." |
* | * | "A row can have at most {count} media links." |
*
* @param {Calendar_Import_Error_Media_Too_ManyInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const calendar_import_error_media_too_many = /** @type {((inputs: Calendar_Import_Error_Media_Too_ManyInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Calendar_Import_Error_Media_Too_ManyInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.calendar_import_error_media_too_many(inputs)
	if (locale === "cs") return __cs.calendar_import_error_media_too_many(inputs)
	return __en.calendar_import_error_media_too_many(inputs)
});
/**
* | output |
* | --- |
* | "A quoted field isn't closed." |
*
* @param {Calendar_Import_Error_QuoteInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const calendar_import_error_quote = /** @type {((inputs?: Calendar_Import_Error_QuoteInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Calendar_Import_Error_QuoteInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.calendar_import_error_quote(inputs)
	if (locale === "cs") return __cs.calendar_import_error_quote(inputs)
	return __en.calendar_import_error_quote(inputs)
});
/**
* | output |
* | --- |
* | "The file couldn't be read." |
*
* @param {Calendar_Import_Error_ReadInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const calendar_import_error_read = /** @type {((inputs?: Calendar_Import_Error_ReadInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Calendar_Import_Error_ReadInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.calendar_import_error_read(inputs)
	if (locale === "cs") return __cs.calendar_import_error_read(inputs)
	return __en.calendar_import_error_read(inputs)
});
/**
* | output |
* | --- |
* | "The text is empty." |
*
* @param {Calendar_Import_Error_TextInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const calendar_import_error_text = /** @type {((inputs?: Calendar_Import_Error_TextInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Calendar_Import_Error_TextInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.calendar_import_error_text(inputs)
	if (locale === "cs") return __cs.calendar_import_error_text(inputs)
	return __en.calendar_import_error_text(inputs)
});
/**
* | output |
* | --- |
* | "The file needs a text column." |
*
* @param {Calendar_Import_Error_Text_ColumnInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const calendar_import_error_text_column = /** @type {((inputs?: Calendar_Import_Error_Text_ColumnInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Calendar_Import_Error_Text_ColumnInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.calendar_import_error_text_column(inputs)
	if (locale === "cs") return __cs.calendar_import_error_text_column(inputs)
	return __en.calendar_import_error_text_column(inputs)
});
/**
* | output |
* | --- |
* | "The file is too large to import at once. Split it into smaller files and import them one by one." |
*
* @param {Calendar_Import_Error_Too_LargeInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const calendar_import_error_too_large = /** @type {((inputs?: Calendar_Import_Error_Too_LargeInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Calendar_Import_Error_Too_LargeInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.calendar_import_error_too_large(inputs)
	if (locale === "cs") return __cs.calendar_import_error_too_large(inputs)
	return __en.calendar_import_error_too_large(inputs)
});
/**
* | countPlural | output |
* | --- | --- |
* | "one" | "The file has more than {count} post. Split it into smaller files." |
* | * | "The file has more than {count} posts. Split it into smaller files." |
*
* @param {Calendar_Import_Error_Too_ManyInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const calendar_import_error_too_many = /** @type {((inputs: Calendar_Import_Error_Too_ManyInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Calendar_Import_Error_Too_ManyInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.calendar_import_error_too_many(inputs)
	if (locale === "cs") return __cs.calendar_import_error_too_many(inputs)
	return __en.calendar_import_error_too_many(inputs)
});
/**
* | output |
* | --- |
* | "Download example CSV" |
*
* @param {Calendar_Import_ExampleInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const calendar_import_example = /** @type {((inputs?: Calendar_Import_ExampleInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Calendar_Import_ExampleInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.calendar_import_example(inputs)
	if (locale === "cs") return __cs.calendar_import_example(inputs)
	return __en.calendar_import_example(inputs)
});
/**
* | output |
* | --- |
* | "Hello! This post goes out at the date and time given." |
*
* @param {Calendar_Import_Example_FirstInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const calendar_import_example_first = /** @type {((inputs?: Calendar_Import_Example_FirstInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Calendar_Import_Example_FirstInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.calendar_import_example_first(inputs)
	if (locale === "cs") return __cs.calendar_import_example_first(inputs)
	return __en.calendar_import_example_first(inputs)
});
/**
* | output |
* | --- |
* | "The media link in the example is a placeholder and won't fetch. Put in your own link or leave the column empty." |
*
* @param {Calendar_Import_Example_MediaInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const calendar_import_example_media = /** @type {((inputs?: Calendar_Import_Example_MediaInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Calendar_Import_Example_MediaInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.calendar_import_example_media(inputs)
	if (locale === "cs") return __cs.calendar_import_example_media(inputs)
	return __en.calendar_import_example_media(inputs)
});
/**
* | output |
* | --- |
* | "This post takes the next free slot in the queue." |
*
* @param {Calendar_Import_Example_QueueInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const calendar_import_example_queue = /** @type {((inputs?: Calendar_Import_Example_QueueInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Calendar_Import_Example_QueueInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.calendar_import_example_queue(inputs)
	if (locale === "cs") return __cs.calendar_import_example_queue(inputs)
	return __en.calendar_import_example_queue(inputs)
});
/**
* | output |
* | --- |
* | "Stop fetching" |
*
* @param {Calendar_Import_Fetch_StopInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const calendar_import_fetch_stop = /** @type {((inputs?: Calendar_Import_Fetch_StopInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Calendar_Import_Fetch_StopInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.calendar_import_fetch_stop(inputs)
	if (locale === "cs") return __cs.calendar_import_fetch_stop(inputs)
	return __en.calendar_import_fetch_stop(inputs)
});
/**
* | output |
* | --- |
* | "Fetching stopped. Links that were already sent still finish in the media library. Pick the file again to continue." |
*
* @param {Calendar_Import_Fetch_StoppedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const calendar_import_fetch_stopped = /** @type {((inputs?: Calendar_Import_Fetch_StoppedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Calendar_Import_Fetch_StoppedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.calendar_import_fetch_stopped(inputs)
	if (locale === "cs") return __cs.calendar_import_fetch_stopped(inputs)
	return __en.calendar_import_fetch_stopped(inputs)
});
/**
* | totalPlural | output |
* | --- | --- |
* | "one" | "Fetching media: link {current} of {total}…" |
* | * | "Fetching media: link {current} of {total}…" |
*
* @param {Calendar_Import_FetchingInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const calendar_import_fetching = /** @type {((inputs: Calendar_Import_FetchingInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Calendar_Import_FetchingInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.calendar_import_fetching(inputs)
	if (locale === "cs") return __cs.calendar_import_fetching(inputs)
	return __en.calendar_import_fetching(inputs)
});
/**
* | output |
* | --- |
* | "CSV file" |
*
* @param {Calendar_Import_FileInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const calendar_import_file = /** @type {((inputs?: Calendar_Import_FileInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Calendar_Import_FileInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.calendar_import_file(inputs)
	if (locale === "cs") return __cs.calendar_import_file(inputs)
	return __en.calendar_import_file(inputs)
});
/**
* | output |
* | --- |
* | "Importing…" |
*
* @param {Calendar_Import_ImportingInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const calendar_import_importing = /** @type {((inputs?: Calendar_Import_ImportingInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Calendar_Import_ImportingInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.calendar_import_importing(inputs)
	if (locale === "cs") return __cs.calendar_import_importing(inputs)
	return __en.calendar_import_importing(inputs)
});
/**
* | output |
* | --- |
* | "Each row becomes one post. Use the columns text, channels, date, time and media; only text is required. A row without a date and time goes to each channel's ..." |
*
* @param {Calendar_Import_IntroInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const calendar_import_intro = /** @type {((inputs?: Calendar_Import_IntroInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Calendar_Import_IntroInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.calendar_import_intro(inputs)
	if (locale === "cs") return __cs.calendar_import_intro(inputs)
	return __en.calendar_import_intro(inputs)
});
/**
* | output |
* | --- |
* | "{channel}: {problem}" |
*
* @param {Calendar_Import_Issue_ChannelInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const calendar_import_issue_channel = /** @type {((inputs: Calendar_Import_Issue_ChannelInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Calendar_Import_Issue_ChannelInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.calendar_import_issue_channel(inputs)
	if (locale === "cs") return __cs.calendar_import_issue_channel(inputs)
	return __en.calendar_import_issue_channel(inputs)
});
/**
* | output |
* | --- |
* | "The channel wasn't found. It may have been removed." |
*
* @param {Calendar_Import_Issue_Not_FoundInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const calendar_import_issue_not_found = /** @type {((inputs?: Calendar_Import_Issue_Not_FoundInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Calendar_Import_Issue_Not_FoundInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.calendar_import_issue_not_found(inputs)
	if (locale === "cs") return __cs.calendar_import_issue_not_found(inputs)
	return __en.calendar_import_issue_not_found(inputs)
});
/**
* | output |
* | --- |
* | "You don't have access to this channel." |
*
* @param {Calendar_Import_Issue_Out_Of_ScopeInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const calendar_import_issue_out_of_scope = /** @type {((inputs?: Calendar_Import_Issue_Out_Of_ScopeInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Calendar_Import_Issue_Out_Of_ScopeInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.calendar_import_issue_out_of_scope(inputs)
	if (locale === "cs") return __cs.calendar_import_issue_out_of_scope(inputs)
	return __en.calendar_import_issue_out_of_scope(inputs)
});
/**
* | output |
* | --- |
* | "Your access doesn't allow posting here." |
*
* @param {Calendar_Import_Issue_Scope_MissingInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const calendar_import_issue_scope_missing = /** @type {((inputs?: Calendar_Import_Issue_Scope_MissingInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Calendar_Import_Issue_Scope_MissingInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.calendar_import_issue_scope_missing(inputs)
	if (locale === "cs") return __cs.calendar_import_issue_scope_missing(inputs)
	return __en.calendar_import_issue_scope_missing(inputs)
});
/**
* | output |
* | --- |
* | "Line {line}: {problem}" |
*
* @param {Calendar_Import_LineInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const calendar_import_line = /** @type {((inputs: Calendar_Import_LineInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Calendar_Import_LineInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.calendar_import_line(inputs)
	if (locale === "cs") return __cs.calendar_import_line(inputs)
	return __en.calendar_import_line(inputs)
});
/**
* | countPlural | output |
* | --- | --- |
* | "one" | "In the media column, list up to {count} https link, separated by spaces or \|. Links are fetched into the media library before the file is checked." |
* | * | "In the media column, list up to {count} https links, separated by spaces or \|. Links are fetched into the media library before the file is checked." |
*
* @param {Calendar_Import_Media_HintInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const calendar_import_media_hint = /** @type {((inputs: Calendar_Import_Media_HintInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Calendar_Import_Media_HintInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.calendar_import_media_hint(inputs)
	if (locale === "cs") return __cs.calendar_import_media_hint(inputs)
	return __en.calendar_import_media_hint(inputs)
});
/**
* | output |
* | --- |
* | "No channel can publish a text-only post." |
*
* @param {Calendar_Import_No_ChannelsInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const calendar_import_no_channels = /** @type {((inputs?: Calendar_Import_No_ChannelsInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Calendar_Import_No_ChannelsInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.calendar_import_no_channels(inputs)
	if (locale === "cs") return __cs.calendar_import_no_channels(inputs)
	return __en.calendar_import_no_channels(inputs)
});
/**
* | output |
* | --- |
* | "Import CSV" |
*
* @param {Calendar_Import_OpenInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const calendar_import_open = /** @type {((inputs?: Calendar_Import_OpenInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Calendar_Import_OpenInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.calendar_import_open(inputs)
	if (locale === "cs") return __cs.calendar_import_open(inputs)
	return __en.calendar_import_open(inputs)
});
/**
* | countPlural | output |
* | --- | --- |
* | "one" | "{count} problem to fix. Fix the file and pick it again." |
* | * | "{count} problems to fix. Fix the file and pick it again." |
*
* @param {Calendar_Import_ProblemsInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const calendar_import_problems = /** @type {((inputs: Calendar_Import_ProblemsInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Calendar_Import_ProblemsInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.calendar_import_problems(inputs)
	if (locale === "cs") return __cs.calendar_import_problems(inputs)
	return __en.calendar_import_problems(inputs)
});
/**
* | countPlural | output |
* | --- | --- |
* | "one" | "{count} post is ready to import." |
* | * | "{count} posts are ready to import." |
*
* @param {Calendar_Import_ReadyInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const calendar_import_ready = /** @type {((inputs: Calendar_Import_ReadyInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Calendar_Import_ReadyInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.calendar_import_ready(inputs)
	if (locale === "cs") return __cs.calendar_import_ready(inputs)
	return __en.calendar_import_ready(inputs)
});
/**
* | countPlural | output |
* | --- | --- |
* | "one" | "{count} post sent for approval." |
* | * | "{count} posts sent for approval." |
*
* @param {Calendar_Import_RequestedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const calendar_import_requested = /** @type {((inputs: Calendar_Import_RequestedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Calendar_Import_RequestedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.calendar_import_requested(inputs)
	if (locale === "cs") return __cs.calendar_import_requested(inputs)
	return __en.calendar_import_requested(inputs)
});
/**
* | output |
* | --- |
* | "Posts without a date and time get no slot while they wait. Schedule them once they're approved." |
*
* @param {Calendar_Import_Requested_QueueInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const calendar_import_requested_queue = /** @type {((inputs?: Calendar_Import_Requested_QueueInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Calendar_Import_Requested_QueueInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.calendar_import_requested_queue(inputs)
	if (locale === "cs") return __cs.calendar_import_requested_queue(inputs)
	return __en.calendar_import_requested_queue(inputs)
});
/**
* | countPlural | output |
* | --- | --- |
* | "one" | "{count} post scheduled." |
* | * | "{count} posts scheduled." |
*
* @param {Calendar_Import_ScheduledInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const calendar_import_scheduled = /** @type {((inputs: Calendar_Import_ScheduledInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Calendar_Import_ScheduledInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.calendar_import_scheduled(inputs)
	if (locale === "cs") return __cs.calendar_import_scheduled(inputs)
	return __en.calendar_import_scheduled(inputs)
});
/**
* | output |
* | --- |
* | "Import" |
*
* @param {Calendar_Import_SubmitInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const calendar_import_submit = /** @type {((inputs?: Calendar_Import_SubmitInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Calendar_Import_SubmitInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.calendar_import_submit(inputs)
	if (locale === "cs") return __cs.calendar_import_submit(inputs)
	return __en.calendar_import_submit(inputs)
});
/**
* | output |
* | --- |
* | "Import posts from a CSV file" |
*
* @param {Calendar_Import_TitleInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const calendar_import_title = /** @type {((inputs?: Calendar_Import_TitleInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Calendar_Import_TitleInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.calendar_import_title(inputs)
	if (locale === "cs") return __cs.calendar_import_title(inputs)
	return __en.calendar_import_title(inputs)
});
/**
* | output |
* | --- |
* | "Layout" |
*
* @param {Calendar_LayoutInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const calendar_layout = /** @type {((inputs?: Calendar_LayoutInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Calendar_LayoutInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.calendar_layout(inputs)
	if (locale === "cs") return __cs.calendar_layout(inputs)
	return __en.calendar_layout(inputs)
});
/**
* | output |
* | --- |
* | "Grid" |
*
* @param {Calendar_Layout_GridInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const calendar_layout_grid = /** @type {((inputs?: Calendar_Layout_GridInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Calendar_Layout_GridInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.calendar_layout_grid(inputs)
	if (locale === "cs") return __cs.calendar_layout_grid(inputs)
	return __en.calendar_layout_grid(inputs)
});
/**
* | output |
* | --- |
* | "The calendar couldn't be loaded. Try again." |
*
* @param {Calendar_Load_FailedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const calendar_load_failed = /** @type {((inputs?: Calendar_Load_FailedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Calendar_Load_FailedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.calendar_load_failed(inputs)
	if (locale === "cs") return __cs.calendar_load_failed(inputs)
	return __en.calendar_load_failed(inputs)
});
/**
* | countPlural | output |
* | --- | --- |
* | "one" | "+{count} more" |
* | * | "+{count} more" |
*
* @param {Calendar_MoreInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const calendar_more = /** @type {((inputs: Calendar_MoreInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Calendar_MoreInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.calendar_more(inputs)
	if (locale === "cs") return __cs.calendar_more(inputs)
	return __en.calendar_more(inputs)
});
/**
* | output |
* | --- |
* | "This post needs an approval before it can be moved." |
*
* @param {Calendar_Move_ApprovalInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const calendar_move_approval = /** @type {((inputs?: Calendar_Move_ApprovalInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Calendar_Move_ApprovalInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.calendar_move_approval(inputs)
	if (locale === "cs") return __cs.calendar_move_approval(inputs)
	return __en.calendar_move_approval(inputs)
});
/**
* | output |
* | --- |
* | "Someone else changed this post in the meantime. The calendar now shows the latest version." |
*
* @param {Calendar_Move_ChangedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const calendar_move_changed = /** @type {((inputs?: Calendar_Move_ChangedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Calendar_Move_ChangedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.calendar_move_changed(inputs)
	if (locale === "cs") return __cs.calendar_move_changed(inputs)
	return __en.calendar_move_changed(inputs)
});
/**
* | output |
* | --- |
* | "The post couldn't be moved. Try again." |
*
* @param {Calendar_Move_FailedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const calendar_move_failed = /** @type {((inputs?: Calendar_Move_FailedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Calendar_Move_FailedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.calendar_move_failed(inputs)
	if (locale === "cs") return __cs.calendar_move_failed(inputs)
	return __en.calendar_move_failed(inputs)
});
/**
* | output |
* | --- |
* | "Shift and the arrow keys move this post by a day or a week. All of its channels move together." |
*
* @param {Calendar_Move_HintInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const calendar_move_hint = /** @type {((inputs?: Calendar_Move_HintInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Calendar_Move_HintInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.calendar_move_hint(inputs)
	if (locale === "cs") return __cs.calendar_move_hint(inputs)
	return __en.calendar_move_hint(inputs)
});
/**
* | output |
* | --- |
* | "That time has already passed. Pick a later day." |
*
* @param {Calendar_Move_In_PastInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const calendar_move_in_past = /** @type {((inputs?: Calendar_Move_In_PastInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Calendar_Move_In_PastInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.calendar_move_in_past(inputs)
	if (locale === "cs") return __cs.calendar_move_in_past(inputs)
	return __en.calendar_move_in_past(inputs)
});
/**
* | output |
* | --- |
* | "That time is outside the approved window, so the post needs approval again." |
*
* @param {Calendar_Move_ReapprovalInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const calendar_move_reapproval = /** @type {((inputs?: Calendar_Move_ReapprovalInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Calendar_Move_ReapprovalInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.calendar_move_reapproval(inputs)
	if (locale === "cs") return __cs.calendar_move_reapproval(inputs)
	return __en.calendar_move_reapproval(inputs)
});
/**
* | output |
* | --- |
* | "This post can't be moved right now. It may already be publishing." |
*
* @param {Calendar_Move_UnavailableInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const calendar_move_unavailable = /** @type {((inputs?: Calendar_Move_UnavailableInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Calendar_Move_UnavailableInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.calendar_move_unavailable(inputs)
	if (locale === "cs") return __cs.calendar_move_unavailable(inputs)
	return __en.calendar_move_unavailable(inputs)
});
/**
* | output |
* | --- |
* | "Moved to {when}" |
*
* @param {Calendar_MovedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const calendar_moved = /** @type {((inputs: Calendar_MovedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Calendar_MovedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.calendar_moved(inputs)
	if (locale === "cs") return __cs.calendar_moved(inputs)
	return __en.calendar_moved(inputs)
});
/**
* | output |
* | --- |
* | "Move through the calendar" |
*
* @param {Calendar_NavigationInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const calendar_navigation = /** @type {((inputs?: Calendar_NavigationInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Calendar_NavigationInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.calendar_navigation(inputs)
	if (locale === "cs") return __cs.calendar_navigation(inputs)
	return __en.calendar_navigation(inputs)
});
/**
* | output |
* | --- |
* | "Create post: {when}" |
*
* @param {Calendar_New_Post_AtInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const calendar_new_post_at = /** @type {((inputs: Calendar_New_Post_AtInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Calendar_New_Post_AtInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.calendar_new_post_at(inputs)
	if (locale === "cs") return __cs.calendar_new_post_at(inputs)
	return __en.calendar_new_post_at(inputs)
});
/**
* | output |
* | --- |
* | "Next day" |
*
* @param {Calendar_Next_DayInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const calendar_next_day = /** @type {((inputs?: Calendar_Next_DayInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Calendar_Next_DayInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.calendar_next_day(inputs)
	if (locale === "cs") return __cs.calendar_next_day(inputs)
	return __en.calendar_next_day(inputs)
});
/**
* | output |
* | --- |
* | "Next month" |
*
* @param {Calendar_Next_MonthInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const calendar_next_month = /** @type {((inputs?: Calendar_Next_MonthInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Calendar_Next_MonthInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.calendar_next_month(inputs)
	if (locale === "cs") return __cs.calendar_next_month(inputs)
	return __en.calendar_next_month(inputs)
});
/**
* | output |
* | --- |
* | "Next week" |
*
* @param {Calendar_Next_WeekInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const calendar_next_week = /** @type {((inputs?: Calendar_Next_WeekInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Calendar_Next_WeekInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.calendar_next_week(inputs)
	if (locale === "cs") return __cs.calendar_next_week(inputs)
	return __en.calendar_next_week(inputs)
});
/**
* | output |
* | --- |
* | "{when} in {tz}" |
*
* @param {Calendar_Own_TimeInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const calendar_own_time = /** @type {((inputs: Calendar_Own_TimeInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Calendar_Own_TimeInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.calendar_own_time(inputs)
	if (locale === "cs") return __cs.calendar_own_time(inputs)
	return __en.calendar_own_time(inputs)
});
/**
* | output |
* | --- |
* | "Previous day" |
*
* @param {Calendar_Previous_DayInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const calendar_previous_day = /** @type {((inputs?: Calendar_Previous_DayInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Calendar_Previous_DayInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.calendar_previous_day(inputs)
	if (locale === "cs") return __cs.calendar_previous_day(inputs)
	return __en.calendar_previous_day(inputs)
});
/**
* | output |
* | --- |
* | "Previous month" |
*
* @param {Calendar_Previous_MonthInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const calendar_previous_month = /** @type {((inputs?: Calendar_Previous_MonthInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Calendar_Previous_MonthInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.calendar_previous_month(inputs)
	if (locale === "cs") return __cs.calendar_previous_month(inputs)
	return __en.calendar_previous_month(inputs)
});
/**
* | output |
* | --- |
* | "Previous week" |
*
* @param {Calendar_Previous_WeekInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const calendar_previous_week = /** @type {((inputs?: Calendar_Previous_WeekInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Calendar_Previous_WeekInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.calendar_previous_week(inputs)
	if (locale === "cs") return __cs.calendar_previous_week(inputs)
	return __en.calendar_previous_week(inputs)
});
/**
* | output |
* | --- |
* | "Collapse the sidebar" |
*
* @param {Calendar_Sidebar_CollapseInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const calendar_sidebar_collapse = /** @type {((inputs?: Calendar_Sidebar_CollapseInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Calendar_Sidebar_CollapseInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.calendar_sidebar_collapse(inputs)
	if (locale === "cs") return __cs.calendar_sidebar_collapse(inputs)
	return __en.calendar_sidebar_collapse(inputs)
});
/**
* | output |
* | --- |
* | "Expand the sidebar" |
*
* @param {Calendar_Sidebar_ExpandInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const calendar_sidebar_expand = /** @type {((inputs?: Calendar_Sidebar_ExpandInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Calendar_Sidebar_ExpandInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.calendar_sidebar_expand(inputs)
	if (locale === "cs") return __cs.calendar_sidebar_expand(inputs)
	return __en.calendar_sidebar_expand(inputs)
});
/**
* | output |
* | --- |
* | "Selected tag" |
*
* @param {Calendar_Tag_CurrentInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const calendar_tag_current = /** @type {((inputs?: Calendar_Tag_CurrentInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Calendar_Tag_CurrentInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.calendar_tag_current(inputs)
	if (locale === "cs") return __cs.calendar_tag_current(inputs)
	return __en.calendar_tag_current(inputs)
});
/**
* | output |
* | --- |
* | "Filter by tag" |
*
* @param {Calendar_Tag_FilterInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const calendar_tag_filter = /** @type {((inputs?: Calendar_Tag_FilterInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Calendar_Tag_FilterInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.calendar_tag_filter(inputs)
	if (locale === "cs") return __cs.calendar_tag_filter(inputs)
	return __en.calendar_tag_filter(inputs)
});
/**
* | output |
* | --- |
* | "Deleted tag" |
*
* @param {Calendar_Tag_GoneInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const calendar_tag_gone = /** @type {((inputs?: Calendar_Tag_GoneInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Calendar_Tag_GoneInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.calendar_tag_gone(inputs)
	if (locale === "cs") return __cs.calendar_tag_gone(inputs)
	return __en.calendar_tag_gone(inputs)
});
/**
* | output |
* | --- |
* | "All tags" |
*
* @param {Calendar_Tags_AllInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const calendar_tags_all = /** @type {((inputs?: Calendar_Tags_AllInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Calendar_Tags_AllInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.calendar_tags_all(inputs)
	if (locale === "cs") return __cs.calendar_tags_all(inputs)
	return __en.calendar_tags_all(inputs)
});
/**
* | output |
* | --- |
* | "Times in {tz}" |
*
* @param {Calendar_Time_ZoneInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const calendar_time_zone = /** @type {((inputs: Calendar_Time_ZoneInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Calendar_Time_ZoneInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.calendar_time_zone(inputs)
	if (locale === "cs") return __cs.calendar_time_zone(inputs)
	return __en.calendar_time_zone(inputs)
});
/**
* | output |
* | --- |
* | "Today" |
*
* @param {Calendar_TodayInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const calendar_today = /** @type {((inputs?: Calendar_TodayInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Calendar_TodayInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.calendar_today(inputs)
	if (locale === "cs") return __cs.calendar_today(inputs)
	return __en.calendar_today(inputs)
});
/**
* | output |
* | --- |
* | "This range has more posts than the calendar can show, so some are missing. Pick a shorter range to see them all." |
*
* @param {Calendar_TruncatedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const calendar_truncated = /** @type {((inputs?: Calendar_TruncatedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Calendar_TruncatedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.calendar_truncated(inputs)
	if (locale === "cs") return __cs.calendar_truncated(inputs)
	return __en.calendar_truncated(inputs)
});
/**
* | output |
* | --- |
* | "Undo" |
*
* @param {Calendar_UndoInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const calendar_undo = /** @type {((inputs?: Calendar_UndoInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Calendar_UndoInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.calendar_undo(inputs)
	if (locale === "cs") return __cs.calendar_undo(inputs)
	return __en.calendar_undo(inputs)
});
/**
* | output |
* | --- |
* | "List" |
*
* @param {Calendar_View_ListInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const calendar_view_list = /** @type {((inputs?: Calendar_View_ListInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Calendar_View_ListInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.calendar_view_list(inputs)
	if (locale === "cs") return __cs.calendar_view_list(inputs)
	return __en.calendar_view_list(inputs)
});
/**
* | output |
* | --- |
* | "Month" |
*
* @param {Calendar_View_MonthInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const calendar_view_month = /** @type {((inputs?: Calendar_View_MonthInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Calendar_View_MonthInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.calendar_view_month(inputs)
	if (locale === "cs") return __cs.calendar_view_month(inputs)
	return __en.calendar_view_month(inputs)
});
/**
* | output |
* | --- |
* | "Week" |
*
* @param {Calendar_View_WeekInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const calendar_view_week = /** @type {((inputs?: Calendar_View_WeekInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Calendar_View_WeekInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.calendar_view_week(inputs)
	if (locale === "cs") return __cs.calendar_view_week(inputs)
	return __en.calendar_view_week(inputs)
});
/**
* | output |
* | --- |
* | "Calendar view" |
*
* @param {Calendar_ViewsInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const calendar_views = /** @type {((inputs?: Calendar_ViewsInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Calendar_ViewsInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.calendar_views(inputs)
	if (locale === "cs") return __cs.calendar_views(inputs)
	return __en.calendar_views(inputs)
});
/**
* | output |
* | --- |
* | "Posts you schedule will show up here." |
*
* @param {Home_Empty_BodyInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const home_empty_body = /** @type {((inputs?: Home_Empty_BodyInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Home_Empty_BodyInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.home_empty_body(inputs)
	if (locale === "cs") return __cs.home_empty_body(inputs)
	return __en.home_empty_body(inputs)
});
/**
* | output |
* | --- |
* | "Nothing scheduled yet" |
*
* @param {Home_Empty_TitleInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const home_empty_title = /** @type {((inputs?: Home_Empty_TitleInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Home_Empty_TitleInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.home_empty_title(inputs)
	if (locale === "cs") return __cs.home_empty_title(inputs)
	return __en.home_empty_title(inputs)
});
/**
* | output |
* | --- |
* | "New post" |
*
* @param {Nav_New_PostInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const nav_new_post = /** @type {((inputs?: Nav_New_PostInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Nav_New_PostInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.nav_new_post(inputs)
	if (locale === "cs") return __cs.nav_new_post(inputs)
	return __en.nav_new_post(inputs)
});
/**
* | countPlural | output |
* | --- | --- |
* | "one" | "{count} post scheduled" |
* | * | "{count} posts scheduled" |
*
* @param {Posts_ScheduledInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const posts_scheduled = /** @type {((inputs: Posts_ScheduledInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Posts_ScheduledInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.posts_scheduled(inputs)
	if (locale === "cs") return __cs.posts_scheduled(inputs)
	return __en.posts_scheduled(inputs)
});