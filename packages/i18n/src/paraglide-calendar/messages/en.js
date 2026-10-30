/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Calendar_Add_ChannelInputs */
/** @typedef {{ time: NonNullable<unknown>, channel: NonNullable<unknown>, state: NonNullable<unknown>, text: NonNullable<unknown> }} Calendar_Chip_LabelInputs */
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
	return /** @type {LocalizedString} */ (`Add channel`)
};

export const calendar_chip_label = /** @type {(inputs: Calendar_Chip_LabelInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`${i?.time}, ${i?.channel}, ${i?.state}: ${i?.text}`)
};

export const calendar_create_post = /** @type {(inputs: Calendar_Create_PostInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Create post`)
};

export const calendar_day_empty = /** @type {(inputs: Calendar_Day_EmptyInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Nothing planned`)
};

export const calendar_draft_updated = /** @type {(inputs: Calendar_Draft_UpdatedInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Edited ${i?.when}`)
};

export const calendar_drafts = /** @type {(inputs: Calendar_DraftsInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Drafts`)
};

export const calendar_drafts_empty = /** @type {(inputs: Calendar_Drafts_EmptyInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`No drafts.`)
};

export const calendar_entry_open = /** @type {(inputs: Calendar_Entry_OpenInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Open`)
};

export const calendar_entry_options = /** @type {(inputs: Calendar_Entry_OptionsInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Post options: ${i?.text}`)
};

export const calendar_entry_preview = /** @type {(inputs: Calendar_Entry_PreviewInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Preview`)
};

export const calendar_layout = /** @type {(inputs: Calendar_LayoutInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Layout`)
};

export const calendar_layout_grid = /** @type {(inputs: Calendar_Layout_GridInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Grid`)
};

export const calendar_load_failed = /** @type {(inputs: Calendar_Load_FailedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`The calendar couldn't be loaded. Try again.`)
};

export const calendar_more = /** @type {(inputs: Calendar_MoreInputs) => LocalizedString} */ (i) => {
	const countPlural = registry.plural("en", i?.count, {}, true);
	if (countPlural === "one") return /** @type {LocalizedString} */ (`+${i?.count} more`);
	return /** @type {LocalizedString} */ (`+${i?.count} more`)
};

export const calendar_move_approval = /** @type {(inputs: Calendar_Move_ApprovalInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`This post needs an approval before it can be moved.`)
};

export const calendar_move_changed = /** @type {(inputs: Calendar_Move_ChangedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Someone else changed this post in the meantime. The calendar now shows the latest version.`)
};

export const calendar_move_failed = /** @type {(inputs: Calendar_Move_FailedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`The post couldn't be moved. Try again.`)
};

export const calendar_move_hint = /** @type {(inputs: Calendar_Move_HintInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Shift and the arrow keys move this post by a day or a week. All of its channels move together.`)
};

export const calendar_move_in_past = /** @type {(inputs: Calendar_Move_In_PastInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`That time has already passed. Pick a later day.`)
};

export const calendar_move_reapproval = /** @type {(inputs: Calendar_Move_ReapprovalInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`That time is outside the approved window, so the post needs approval again.`)
};

export const calendar_move_unavailable = /** @type {(inputs: Calendar_Move_UnavailableInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`This post can't be moved right now. It may already be publishing.`)
};

export const calendar_moved = /** @type {(inputs: Calendar_MovedInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Moved to ${i?.when}`)
};

export const calendar_navigation = /** @type {(inputs: Calendar_NavigationInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Move through the calendar`)
};

export const calendar_new_post_at = /** @type {(inputs: Calendar_New_Post_AtInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Create post: ${i?.when}`)
};

export const calendar_next_day = /** @type {(inputs: Calendar_Next_DayInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Next day`)
};

export const calendar_next_month = /** @type {(inputs: Calendar_Next_MonthInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Next month`)
};

export const calendar_next_week = /** @type {(inputs: Calendar_Next_WeekInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Next week`)
};

export const calendar_own_time = /** @type {(inputs: Calendar_Own_TimeInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`${i?.when} in ${i?.tz}`)
};

export const calendar_previous_day = /** @type {(inputs: Calendar_Previous_DayInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Previous day`)
};

export const calendar_previous_month = /** @type {(inputs: Calendar_Previous_MonthInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Previous month`)
};

export const calendar_previous_week = /** @type {(inputs: Calendar_Previous_WeekInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Previous week`)
};

export const calendar_sidebar_collapse = /** @type {(inputs: Calendar_Sidebar_CollapseInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Collapse the sidebar`)
};

export const calendar_sidebar_expand = /** @type {(inputs: Calendar_Sidebar_ExpandInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Expand the sidebar`)
};

export const calendar_time_zone = /** @type {(inputs: Calendar_Time_ZoneInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Times in ${i?.tz}`)
};

export const calendar_today = /** @type {(inputs: Calendar_TodayInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Today`)
};

export const calendar_truncated = /** @type {(inputs: Calendar_TruncatedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`This range has more posts than the calendar can show, so some are missing. Pick a shorter range to see them all.`)
};

export const calendar_undo = /** @type {(inputs: Calendar_UndoInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Undo`)
};

export const calendar_view_list = /** @type {(inputs: Calendar_View_ListInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`List`)
};

export const calendar_view_month = /** @type {(inputs: Calendar_View_MonthInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Month`)
};

export const calendar_view_week = /** @type {(inputs: Calendar_View_WeekInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Week`)
};

export const calendar_views = /** @type {(inputs: Calendar_ViewsInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Calendar view`)
};

export const home_empty_body = /** @type {(inputs: Home_Empty_BodyInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Posts you schedule will show up here.`)
};

export const home_empty_title = /** @type {(inputs: Home_Empty_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Nothing scheduled yet`)
};

export const nav_new_post = /** @type {(inputs: Nav_New_PostInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`New post`)
};

export const posts_scheduled = /** @type {(inputs: Posts_ScheduledInputs) => LocalizedString} */ (i) => {
	const countPlural = registry.plural("en", i?.count, {}, true);
	if (countPlural === "one") return /** @type {LocalizedString} */ (`${i?.count} post scheduled`);
	return /** @type {LocalizedString} */ (`${i?.count} posts scheduled`)
};