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