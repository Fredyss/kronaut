import { getLocale, experimentalStaticLocale } from "../runtime.js"

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Account_LogoutInputs */
/** @typedef {{}} Account_MenuInputs */
/** @typedef {{}} App_NameInputs */
/** @typedef {{}} Approval_ApproveInputs */
/** @typedef {{ when: NonNullable<unknown>, tz: NonNullable<unknown> }} Approval_BoundInputs */
/** @typedef {{}} Approval_Changed_AfterInputs */
/** @typedef {{}} Approval_Changes_RequestedInputs */
/** @typedef {{}} Approval_Error_ClosedInputs */
/** @typedef {{}} Approval_Error_WaitingInputs */
/** @typedef {{}} Approval_Not_ApproverInputs */
/** @typedef {{}} Approval_Note_LabelInputs */
/** @typedef {{}} Approval_Outside_ScheduleInputs */
/** @typedef {{ approved: NonNullable<unknown>, count: NonNullable<unknown> }} Approval_ProgressInputs */
/** @typedef {{}} Approval_Reauth_BodyInputs */
/** @typedef {{}} Approval_Reauth_ConfirmInputs */
/** @typedef {{}} Approval_Reauth_FailedInputs */
/** @typedef {{}} Approval_Reauth_TitleInputs */
/** @typedef {{}} Approval_RejectInputs */
/** @typedef {{}} Approval_Request_AgainInputs */
/** @typedef {{}} Approval_Request_ChangesInputs */
/** @typedef {{ when: NonNullable<unknown> }} Approval_Requested_By_KeyInputs */
/** @typedef {{ when: NonNullable<unknown> }} Approval_Requested_By_MemberInputs */
/** @typedef {{ when: NonNullable<unknown> }} Approval_Requested_By_YouInputs */
/** @typedef {{}} Approval_Schedule_ApprovedInputs */
/** @typedef {{}} Approval_SelfInputs */
/** @typedef {{}} Approval_State_ApprovedInputs */
/** @typedef {{}} Approval_State_OpenInputs */
/** @typedef {{}} Approval_State_RejectedInputs */
/** @typedef {{}} Approval_State_RevokedInputs */
/** @typedef {{}} Approval_State_VoidedInputs */
/** @typedef {{}} Approval_State_WithdrawnInputs */
/** @typedef {{}} Approval_TitleInputs */
/** @typedef {{ count: NonNullable<unknown> }} Approval_ToleranceInputs */
/** @typedef {{}} Approval_Void_ContentInputs */
/** @typedef {{}} Approval_Void_DestinationsInputs */
/** @typedef {{}} Approval_Void_PolicyInputs */
/** @typedef {{}} Approval_Void_ScheduleInputs */
/** @typedef {{}} Approval_WithdrawInputs */
/** @typedef {{}} Calendar_TitleInputs */
/** @typedef {{}} Calendar_UntitledInputs */
/** @typedef {{}} Calendar_View_DayInputs */
/** @typedef {{}} Channel_Status_ActiveInputs */
/** @typedef {{}} Channel_Status_DisabledInputs */
/** @typedef {{}} Channel_Status_DisconnectedInputs */
/** @typedef {{}} Channel_Status_Needs_ReauthInputs */
/** @typedef {{}} Channels_AddInputs */
/** @typedef {{}} Channels_All_NetworksInputs */
/** @typedef {{}} Channels_Connect_Bad_UrlInputs */
/** @typedef {{}} Channels_Connect_BodyInputs */
/** @typedef {{ name: NonNullable<unknown> }} Channels_Connect_ButtonInputs */
/** @typedef {{}} Channels_Connect_Check_HandleInputs */
/** @typedef {{}} Channels_Connect_NoneInputs */
/** @typedef {{}} Channels_Connect_Not_Set_UpInputs */
/** @typedef {{}} Channels_Connect_TitleInputs */
/** @typedef {{}} Channels_Connect_UnavailableInputs */
/** @typedef {{}} Channels_ConnectedInputs */
/** @typedef {{ names: NonNullable<unknown> }} Channels_Connected_ListInputs */
/** @typedef {{ name: NonNullable<unknown> }} Channels_Connected_NamedInputs */
/** @typedef {{}} Channels_DisconnectInputs */
/** @typedef {{ name: NonNullable<unknown> }} Channels_Disconnect_BodyInputs */
/** @typedef {{}} Channels_Disconnect_ConfirmInputs */
/** @typedef {{ name: NonNullable<unknown> }} Channels_DisconnectedInputs */
/** @typedef {{}} Channels_Empty_BodyInputs */
/** @typedef {{}} Channels_Empty_TitleInputs */
/** @typedef {{}} Channels_Error_App_ConfigInputs */
/** @typedef {{}} Channels_Error_ForbiddenInputs */
/** @typedef {{}} Channels_Error_GenericInputs */
/** @typedef {{}} Channels_Error_No_AccountsInputs */
/** @typedef {{}} Channels_Error_Provider_DeniedInputs */
/** @typedef {{}} Channels_Error_Provider_ErrorInputs */
/** @typedef {{}} Channels_Error_Server_ErrorInputs */
/** @typedef {{}} Channels_Error_Session_MismatchInputs */
/** @typedef {{}} Channels_Error_State_InvalidInputs */
/** @typedef {{ max: NonNullable<unknown> }} Channels_Error_Too_Many_AccountsInputs */
/** @typedef {{ date: NonNullable<unknown> }} Channels_ExpiresInputs */
/** @typedef {{}} Channels_Handle_LabelInputs */
/** @typedef {{}} Channels_Handle_PlaceholderInputs */
/** @typedef {{}} Channels_Not_Set_UpInputs */
/** @typedef {{}} Channels_Open_ProfileInputs */
/** @typedef {{}} Channels_QueueInputs */
/** @typedef {{}} Channels_ReconnectInputs */
/** @typedef {{}} Channels_Server_InvalidInputs */
/** @typedef {{ name: NonNullable<unknown> }} Channels_Server_LabelInputs */
/** @typedef {{}} Channels_Server_PlaceholderInputs */
/** @typedef {{}} Channels_Server_Rate_LimitedInputs */
/** @typedef {{}} Channels_Server_RejectedInputs */
/** @typedef {{}} Channels_Server_UnreachableInputs */
/** @typedef {{}} Channels_SubtitleInputs */
/** @typedef {{}} Channels_TitleInputs */
/** @typedef {{}} Compose_Add_To_QueueInputs */
/** @typedef {{ channel: NonNullable<unknown>, count: NonNullable<unknown>, max: NonNullable<unknown> }} Compose_Comment_Too_LongInputs */
/** @typedef {{}} Compose_DateInputs */
/** @typedef {{}} Compose_Error_ConflictInputs */
/** @typedef {{}} Compose_Error_When_MissingInputs */
/** @typedef {{ position: NonNullable<unknown> }} Compose_Image_PreviewInputs */
/** @typedef {{}} Compose_Image_RemoveInputs */
/** @typedef {{}} Compose_Issue_Comment_EmptyInputs */
/** @typedef {{ channel: NonNullable<unknown>, message: NonNullable<unknown> }} Compose_Issue_On_ChannelInputs */
/** @typedef {{ position: NonNullable<unknown> }} Compose_Issue_Reply_EmptyInputs */
/** @typedef {{ channel: NonNullable<unknown>, network: NonNullable<unknown> }} Compose_Limit_ChannelInputs */
/** @typedef {{ channel: NonNullable<unknown>, count: NonNullable<unknown>, max: NonNullable<unknown> }} Compose_Limit_Too_LongInputs */
/** @typedef {{ channel: NonNullable<unknown>, max: NonNullable<unknown> }} Compose_Limit_Too_Many_LinksInputs */
/** @typedef {{ network: NonNullable<unknown>, count: NonNullable<unknown>, max: NonNullable<unknown> }} Compose_Limit_UsageInputs */
/** @typedef {{}} Compose_Preview_TitleInputs */
/** @typedef {{}} Compose_Publish_NowInputs */
/** @typedef {{}} Compose_PublishingInputs */
/** @typedef {{ channel: NonNullable<unknown> }} Compose_Queue_EmptyInputs */
/** @typedef {{ channel: NonNullable<unknown>, when: NonNullable<unknown>, tz: NonNullable<unknown> }} Compose_Queue_NextInputs */
/** @typedef {{ position: NonNullable<unknown>, channel: NonNullable<unknown>, count: NonNullable<unknown>, max: NonNullable<unknown> }} Compose_Reply_Too_LongInputs */
/** @typedef {{ position: NonNullable<unknown>, channel: NonNullable<unknown>, max: NonNullable<unknown> }} Compose_Reply_Too_Many_LinksInputs */
/** @typedef {{}} Compose_Request_ApprovalInputs */
/** @typedef {{}} Compose_Requesting_ApprovalInputs */
/** @typedef {{}} Compose_ScheduleInputs */
/** @typedef {{}} Compose_SchedulingInputs */
/** @typedef {{}} Compose_TimeInputs */
/** @typedef {{ tz: NonNullable<unknown> }} Compose_Time_ZoneInputs */
/** @typedef {{}} Compose_Video_Ai_FailedInputs */
/** @typedef {{}} Compose_Video_Ai_SavingInputs */
/** @typedef {{}} Compose_Video_ErrorInputs */
/** @typedef {{ channel: NonNullable<unknown> }} Compose_Video_Issue_AspectInputs */
/** @typedef {{ channel: NonNullable<unknown>, max: NonNullable<unknown> }} Compose_Video_Issue_Frame_RateInputs */
/** @typedef {{ channel: NonNullable<unknown> }} Compose_Video_Issue_KindInputs */
/** @typedef {{ channel: NonNullable<unknown> }} Compose_Video_Issue_MetadataInputs */
/** @typedef {{ channel: NonNullable<unknown> }} Compose_Video_Issue_MimeInputs */
/** @typedef {{ channel: NonNullable<unknown> }} Compose_Video_Issue_ResolutionInputs */
/** @typedef {{ channel: NonNullable<unknown>, max: NonNullable<unknown> }} Compose_Video_Issue_Too_LargeInputs */
/** @typedef {{ channel: NonNullable<unknown>, max: NonNullable<unknown> }} Compose_Video_Issue_Too_LongInputs */
/** @typedef {{ channel: NonNullable<unknown>, min: NonNullable<unknown> }} Compose_Video_Issue_Too_ShortInputs */
/** @typedef {{}} Compose_Video_Preview_CardInputs */
/** @typedef {{}} Compose_Video_Rejected_Stream_MissingInputs */
/** @typedef {{ max: NonNullable<unknown> }} Compose_Video_Rejected_Too_LargeInputs */
/** @typedef {{ max: NonNullable<unknown> }} Compose_Video_Rejected_Too_LongInputs */
/** @typedef {{ min: NonNullable<unknown> }} Compose_Video_Rejected_Too_ShortInputs */
/** @typedef {{}} Compose_Video_Rejected_UnreadableInputs */
/** @typedef {{}} Compose_Video_WaitInputs */
/** @typedef {{}} Compose_When_TitleInputs */
/** @typedef {{}} Destination_State_Awaiting_ManualInputs */
/** @typedef {{}} Destination_State_BlockedInputs */
/** @typedef {{}} Destination_State_CanceledInputs */
/** @typedef {{}} Destination_State_DraftInputs */
/** @typedef {{}} Destination_State_FailedInputs */
/** @typedef {{}} Destination_State_PublishedInputs */
/** @typedef {{}} Destination_State_PublishingInputs */
/** @typedef {{}} Destination_State_Retry_WaitInputs */
/** @typedef {{}} Destination_State_ScheduledInputs */
/** @typedef {{}} Destination_State_UnconfirmedInputs */
/** @typedef {{}} Destination_State_VerifyingInputs */
/** @typedef {{}} Dialog_CloseInputs */
/** @typedef {{}} DismissInputs */
/** @typedef {{ workspace: NonNullable<unknown> }} Email_FooterInputs */
/** @typedef {{ url: NonNullable<unknown> }} Email_ManageInputs */
/** @typedef {{ url: NonNullable<unknown> }} Email_OpenInputs */
/** @typedef {{ excerpt: NonNullable<unknown> }} Email_PostInputs */
/** @typedef {{}} Error_ForbiddenInputs */
/** @typedef {{}} Error_GenericInputs */
/** @typedef {{}} Error_Invalid_CredentialsInputs */
/** @typedef {{}} Error_Invalid_RequestInputs */
/** @typedef {{}} Error_Logout_FailedInputs */
/** @typedef {{}} Error_Rate_LimitedInputs */
/** @typedef {{}} Error_UnavailableInputs */
/** @typedef {{}} Evergreen_CopiesInputs */
/** @typedef {{ channel: NonNullable<unknown>, when: NonNullable<unknown> }} Evergreen_CopyInputs */
/** @typedef {{}} Evergreen_LabelInputs */
/** @typedef {{ reason: NonNullable<unknown> }} Evergreen_ReasonInputs */
/** @typedef {{ count: NonNullable<unknown> }} Inbox_BadgeInputs */
/** @typedef {{ count: NonNullable<unknown> }} Inbox_Badge_OverflowInputs */
/** @typedef {{}} Inbox_CancelInputs */
/** @typedef {{}} Inbox_Confirm_BackInputs */
/** @typedef {{}} Inbox_Load_FailedInputs */
/** @typedef {{}} Issue_Alt_Text_RequiredInputs */
/** @typedef {{}} Issue_Alt_Text_Too_LongInputs */
/** @typedef {{}} Issue_Aspect_Out_Of_RangeInputs */
/** @typedef {{}} Issue_File_Too_LargeInputs */
/** @typedef {{}} Issue_Frame_Rate_Too_HighInputs */
/** @typedef {{}} Issue_GenericInputs */
/** @typedef {{}} Issue_Image_Too_NarrowInputs */
/** @typedef {{}} Issue_Image_Too_WideInputs */
/** @typedef {{}} Issue_In_PastInputs */
/** @typedef {{}} Issue_Invalid_RepeatInputs */
/** @typedef {{}} Issue_Invalid_Time_ZoneInputs */
/** @typedef {{}} Issue_Media_Not_AllowedInputs */
/** @typedef {{}} Issue_Mime_UnsupportedInputs */
/** @typedef {{}} Issue_Not_ReadyInputs */
/** @typedef {{}} Issue_Post_Type_UnavailableInputs */
/** @typedef {{}} Issue_Provider_UnavailableInputs */
/** @typedef {{}} Issue_Queue_EmptyInputs */
/** @typedef {{}} Issue_Queue_FullInputs */
/** @typedef {{}} Issue_Resolution_Too_HighInputs */
/** @typedef {{}} Issue_Text_Too_LongInputs */
/** @typedef {{}} Issue_Too_Few_MediaInputs */
/** @typedef {{}} Issue_Too_LargeInputs */
/** @typedef {{}} Issue_Too_Many_LinksInputs */
/** @typedef {{}} Issue_Too_Many_MediaInputs */
/** @typedef {{}} Issue_Unknown_Post_TypeInputs */
/** @typedef {{}} LoadingInputs */
/** @typedef {{}} Locale_CsInputs */
/** @typedef {{}} Locale_EnInputs */
/** @typedef {{}} Locale_LabelInputs */
/** @typedef {{}} Locale_Save_FailedInputs */
/** @typedef {{}} Locale_SkInputs */
/** @typedef {{}} Login_EmailInputs */
/** @typedef {{}} Login_PasswordInputs */
/** @typedef {{}} Login_Password_SetInputs */
/** @typedef {{}} Login_Session_ExpiredInputs */
/** @typedef {{}} Login_SubmitInputs */
/** @typedef {{}} Login_SubmittingInputs */
/** @typedef {{}} Login_SubtitleInputs */
/** @typedef {{}} Login_TitleInputs */
/** @typedef {{ count: NonNullable<unknown> }} Meta_Status_CompletedInputs */
/** @typedef {{}} Meta_Status_NoneInputs */
/** @typedef {{}} Meta_Status_ReceivedInputs */
/** @typedef {{}} Meta_Status_UnknownInputs */
/** @typedef {{}} Nav_ChannelsInputs */
/** @typedef {{}} Nav_InboxInputs */
/** @typedef {{}} Nav_LabelInputs */
/** @typedef {{}} Nav_MediaInputs */
/** @typedef {{}} Not_Found_BackInputs */
/** @typedef {{}} Not_Found_TitleInputs */
/** @typedef {{}} Notification_Approval_RequestedInputs */
/** @typedef {{}} Notification_ApprovedInputs */
/** @typedef {{ account: NonNullable<unknown> }} Notification_Awaiting_ManualInputs */
/** @typedef {{ account: NonNullable<unknown> }} Notification_ExpiringInputs */
/** @typedef {{ account: NonNullable<unknown> }} Notification_FailedInputs */
/** @typedef {{}} Notification_GenericInputs */
/** @typedef {{ account: NonNullable<unknown> }} Notification_Needs_ReauthInputs */
/** @typedef {{}} Notification_RejectedInputs */
/** @typedef {{ account: NonNullable<unknown> }} Notification_UnconfirmedInputs */
/** @typedef {{ count: NonNullable<unknown> }} Notifications_ButtonInputs */
/** @typedef {{}} Notifications_EmptyInputs */
/** @typedef {{}} Notifications_Mark_AllInputs */
/** @typedef {{}} Notifications_Mark_FailedInputs */
/** @typedef {{}} Notifications_OlderInputs */
/** @typedef {{}} Notifications_TitleInputs */
/** @typedef {{}} Notifications_UnreadInputs */
/** @typedef {{ count: NonNullable<unknown> }} Password_Min_LengthInputs */
/** @typedef {{}} Password_Too_LongInputs */
/** @typedef {{}} Post_CustomizedInputs */
/** @typedef {{}} Post_Destinations_TitleInputs */
/** @typedef {{ count: NonNullable<unknown> }} Post_ImagesInputs */
/** @typedef {{}} Post_Not_FoundInputs */
/** @typedef {{ when: NonNullable<unknown> }} Post_Published_AtInputs */
/** @typedef {{}} Post_Schedule_AsapInputs */
/** @typedef {{ when: NonNullable<unknown> }} Post_Schedule_AtInputs */
/** @typedef {{ when: NonNullable<unknown>, tz: NonNullable<unknown> }} Post_Schedule_At_TzInputs */
/** @typedef {{}} Post_Schedule_NoneInputs */
/** @typedef {{ when: NonNullable<unknown> }} Post_Scheduled_AtInputs */
/** @typedef {{}} Post_Summary_CanceledInputs */
/** @typedef {{}} Post_Summary_Completed_AllInputs */
/** @typedef {{}} Post_Summary_Completed_FailedInputs */
/** @typedef {{}} Post_Summary_Completed_PartialInputs */
/** @typedef {{}} Post_Summary_DraftInputs */
/** @typedef {{}} Post_Summary_In_ProgressInputs */
/** @typedef {{}} Post_Summary_In_ReviewInputs */
/** @typedef {{}} Post_Summary_Needs_ActionInputs */
/** @typedef {{}} Post_Summary_ScheduledInputs */
/** @typedef {{}} Post_TitleInputs */
/** @typedef {{}} Post_ViewInputs */
/** @typedef {{}} Provider_BlueskyInputs */
/** @typedef {{}} Provider_FacebookInputs */
/** @typedef {{}} Provider_InstagramInputs */
/** @typedef {{}} Provider_LinkedinInputs */
/** @typedef {{}} Provider_MastodonInputs */
/** @typedef {{}} Provider_ThreadsInputs */
/** @typedef {{}} Queue_AddInputs */
/** @typedef {{}} Queue_EvergreenInputs */
/** @typedef {{}} Queue_SavedInputs */
/** @typedef {{}} Queue_ZoneInputs */
/** @typedef {{}} Reason_Account_DisabledInputs */
/** @typedef {{}} Reason_Account_DisconnectedInputs */
/** @typedef {{}} Reason_Account_Needs_ReauthInputs */
/** @typedef {{}} Reason_Account_Out_Of_ScopeInputs */
/** @typedef {{}} Reason_Ambiguous_ResponseInputs */
/** @typedef {{}} Reason_App_Credentials_InvalidInputs */
/** @typedef {{}} Reason_Async_Give_UpInputs */
/** @typedef {{}} Reason_Attempts_ExhaustedInputs */
/** @typedef {{}} Reason_Entitlement_ExceededInputs */
/** @typedef {{}} Reason_GenericInputs */
/** @typedef {{}} Reason_Interrupted_After_SendInputs */
/** @typedef {{}} Reason_Late_Window_ExceededInputs */
/** @typedef {{}} Reason_Media_Processing_TimeoutInputs */
/** @typedef {{}} Reason_Permanent_ErrorInputs */
/** @typedef {{}} Reason_Policy_DeniedInputs */
/** @typedef {{}} Reason_Rate_Limit_Beyond_DeadlineInputs */
/** @typedef {{}} Reason_Refresh_Token_LostInputs */
/** @typedef {{}} Reason_Restore_QuarantineInputs */
/** @typedef {{}} Reason_Thread_IncompleteInputs */
/** @typedef {{}} Reason_Verify_InconclusiveInputs */
/** @typedef {{}} Reason_Verify_Window_ElapsedInputs */
/** @typedef {{}} Repeat_AfterInputs */
/** @typedef {{}} Repeat_DailyInputs */
/** @typedef {{}} Repeat_EndsInputs */
/** @typedef {{}} Repeat_EveryInputs */
/** @typedef {{}} Repeat_LabelInputs */
/** @typedef {{}} Repeat_MonthlyInputs */
/** @typedef {{}} Repeat_NeverInputs */
/** @typedef {{}} Repeat_OnInputs */
/** @typedef {{}} Repeat_WarningInputs */
/** @typedef {{}} Repeat_WeeklyInputs */
/** @typedef {{}} Reset_ConfirmInputs */
/** @typedef {{}} Reset_Invalid_LinkInputs */
/** @typedef {{}} Reset_MismatchInputs */
/** @typedef {{}} Reset_Missing_TokenInputs */
/** @typedef {{}} Reset_PasswordInputs */
/** @typedef {{}} Reset_SubmitInputs */
/** @typedef {{}} Reset_SubmittingInputs */
/** @typedef {{}} Reset_SubtitleInputs */
/** @typedef {{}} Reset_TitleInputs */
/** @typedef {{ count: NonNullable<unknown> }} Series_CountInputs */
/** @typedef {{ when: NonNullable<unknown>, tz: NonNullable<unknown> }} Series_NextInputs */
/** @typedef {{}} Series_ResumeInputs */
/** @typedef {{ freq: NonNullable<unknown>, count: NonNullable<unknown>, days: NonNullable<unknown>, day: NonNullable<unknown> }} Series_RuleInputs */
/** @typedef {{ state: NonNullable<unknown> }} Series_StateInputs */
/** @typedef {{}} Series_StopInputs */
/** @typedef {{}} Series_Stop_BodyInputs */
/** @typedef {{ date: NonNullable<unknown> }} Series_UntilInputs */
/** @typedef {{}} Settings_SaveInputs */
/** @typedef {{}} Settings_TitleInputs */
/** @typedef {{}} Technical_DetailsInputs */
/** @typedef {{}} Theme_DarkInputs */
/** @typedef {{}} Theme_LightInputs */
/** @typedef {{}} Theme_SystemInputs */
/** @typedef {{}} Workspace_LabelInputs */
import * as __en from "./en.js"
import * as __sk from "./sk.js"
import * as __cs from "./cs.js"
/**
* | output |
* | --- |
* | "Sign out" |
*
* @param {Account_LogoutInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const account_logout = /** @type {((inputs?: Account_LogoutInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Account_LogoutInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.account_logout(inputs)
	if (locale === "cs") return __cs.account_logout(inputs)
	return __en.account_logout(inputs)
});
/**
* | output |
* | --- |
* | "Account" |
*
* @param {Account_MenuInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const account_menu = /** @type {((inputs?: Account_MenuInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Account_MenuInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.account_menu(inputs)
	if (locale === "cs") return __cs.account_menu(inputs)
	return __en.account_menu(inputs)
});
/**
* | output |
* | --- |
* | "Kronaut" |
*
* @param {App_NameInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const app_name = /** @type {((inputs?: App_NameInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<App_NameInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.app_name(inputs)
	if (locale === "cs") return __cs.app_name(inputs)
	return __en.app_name(inputs)
});
/**
* | output |
* | --- |
* | "Approve" |
*
* @param {Approval_ApproveInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const approval_approve = /** @type {((inputs?: Approval_ApproveInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Approval_ApproveInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.approval_approve(inputs)
	if (locale === "cs") return __cs.approval_approve(inputs)
	return __en.approval_approve(inputs)
});
/**
* | output |
* | --- |
* | "For {when} ({tz})" |
*
* @param {Approval_BoundInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const approval_bound = /** @type {((inputs: Approval_BoundInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Approval_BoundInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.approval_bound(inputs)
	if (locale === "cs") return __cs.approval_bound(inputs)
	return __en.approval_bound(inputs)
});
/**
* | output |
* | --- |
* | "This post changed after it was approved: request approval again." |
*
* @param {Approval_Changed_AfterInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const approval_changed_after = /** @type {((inputs?: Approval_Changed_AfterInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Approval_Changed_AfterInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.approval_changed_after(inputs)
	if (locale === "cs") return __cs.approval_changed_after(inputs)
	return __en.approval_changed_after(inputs)
});
/**
* | output |
* | --- |
* | "Changes requested" |
*
* @param {Approval_Changes_RequestedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const approval_changes_requested = /** @type {((inputs?: Approval_Changes_RequestedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Approval_Changes_RequestedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.approval_changes_requested(inputs)
	if (locale === "cs") return __cs.approval_changes_requested(inputs)
	return __en.approval_changes_requested(inputs)
});
/**
* | output |
* | --- |
* | "This request was already decided. The latest state is shown." |
*
* @param {Approval_Error_ClosedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const approval_error_closed = /** @type {((inputs?: Approval_Error_ClosedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Approval_Error_ClosedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.approval_error_closed(inputs)
	if (locale === "cs") return __cs.approval_error_closed(inputs)
	return __en.approval_error_closed(inputs)
});
/**
* | output |
* | --- |
* | "This post is already waiting for approval." |
*
* @param {Approval_Error_WaitingInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const approval_error_waiting = /** @type {((inputs?: Approval_Error_WaitingInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Approval_Error_WaitingInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.approval_error_waiting(inputs)
	if (locale === "cs") return __cs.approval_error_waiting(inputs)
	return __en.approval_error_waiting(inputs)
});
/**
* | output |
* | --- |
* | "You can't decide approvals in this workspace." |
*
* @param {Approval_Not_ApproverInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const approval_not_approver = /** @type {((inputs?: Approval_Not_ApproverInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Approval_Not_ApproverInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.approval_not_approver(inputs)
	if (locale === "cs") return __cs.approval_not_approver(inputs)
	return __en.approval_not_approver(inputs)
});
/**
* | output |
* | --- |
* | "Note for approvers (optional)" |
*
* @param {Approval_Note_LabelInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const approval_note_label = /** @type {((inputs?: Approval_Note_LabelInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Approval_Note_LabelInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.approval_note_label(inputs)
	if (locale === "cs") return __cs.approval_note_label(inputs)
	return __en.approval_note_label(inputs)
});
/**
* | output |
* | --- |
* | "That time is outside the approved window. Pick an approved time or request approval again." |
*
* @param {Approval_Outside_ScheduleInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const approval_outside_schedule = /** @type {((inputs?: Approval_Outside_ScheduleInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Approval_Outside_ScheduleInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.approval_outside_schedule(inputs)
	if (locale === "cs") return __cs.approval_outside_schedule(inputs)
	return __en.approval_outside_schedule(inputs)
});
/**
* | countPlural | output |
* | --- | --- |
* | "one" | "{approved} of {count} approval" |
* | * | "{approved} of {count} approvals" |
*
* @param {Approval_ProgressInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const approval_progress = /** @type {((inputs: Approval_ProgressInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Approval_ProgressInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.approval_progress(inputs)
	if (locale === "cs") return __cs.approval_progress(inputs)
	return __en.approval_progress(inputs)
});
/**
* | output |
* | --- |
* | "Deciding an approval needs your password again every 12 hours." |
*
* @param {Approval_Reauth_BodyInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const approval_reauth_body = /** @type {((inputs?: Approval_Reauth_BodyInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Approval_Reauth_BodyInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.approval_reauth_body(inputs)
	if (locale === "cs") return __cs.approval_reauth_body(inputs)
	return __en.approval_reauth_body(inputs)
});
/**
* | output |
* | --- |
* | "Confirm" |
*
* @param {Approval_Reauth_ConfirmInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const approval_reauth_confirm = /** @type {((inputs?: Approval_Reauth_ConfirmInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Approval_Reauth_ConfirmInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.approval_reauth_confirm(inputs)
	if (locale === "cs") return __cs.approval_reauth_confirm(inputs)
	return __en.approval_reauth_confirm(inputs)
});
/**
* | output |
* | --- |
* | "That didn't work. Check the password: too many wrong tries sign you out." |
*
* @param {Approval_Reauth_FailedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const approval_reauth_failed = /** @type {((inputs?: Approval_Reauth_FailedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Approval_Reauth_FailedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.approval_reauth_failed(inputs)
	if (locale === "cs") return __cs.approval_reauth_failed(inputs)
	return __en.approval_reauth_failed(inputs)
});
/**
* | output |
* | --- |
* | "Confirm your password" |
*
* @param {Approval_Reauth_TitleInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const approval_reauth_title = /** @type {((inputs?: Approval_Reauth_TitleInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Approval_Reauth_TitleInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.approval_reauth_title(inputs)
	if (locale === "cs") return __cs.approval_reauth_title(inputs)
	return __en.approval_reauth_title(inputs)
});
/**
* | output |
* | --- |
* | "Reject" |
*
* @param {Approval_RejectInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const approval_reject = /** @type {((inputs?: Approval_RejectInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Approval_RejectInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.approval_reject(inputs)
	if (locale === "cs") return __cs.approval_reject(inputs)
	return __en.approval_reject(inputs)
});
/**
* | output |
* | --- |
* | "Request approval again" |
*
* @param {Approval_Request_AgainInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const approval_request_again = /** @type {((inputs?: Approval_Request_AgainInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Approval_Request_AgainInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.approval_request_again(inputs)
	if (locale === "cs") return __cs.approval_request_again(inputs)
	return __en.approval_request_again(inputs)
});
/**
* | output |
* | --- |
* | "Request changes" |
*
* @param {Approval_Request_ChangesInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const approval_request_changes = /** @type {((inputs?: Approval_Request_ChangesInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Approval_Request_ChangesInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.approval_request_changes(inputs)
	if (locale === "cs") return __cs.approval_request_changes(inputs)
	return __en.approval_request_changes(inputs)
});
/**
* | output |
* | --- |
* | "Requested by an API key on {when}" |
*
* @param {Approval_Requested_By_KeyInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const approval_requested_by_key = /** @type {((inputs: Approval_Requested_By_KeyInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Approval_Requested_By_KeyInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.approval_requested_by_key(inputs)
	if (locale === "cs") return __cs.approval_requested_by_key(inputs)
	return __en.approval_requested_by_key(inputs)
});
/**
* | output |
* | --- |
* | "Requested by another member on {when}" |
*
* @param {Approval_Requested_By_MemberInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const approval_requested_by_member = /** @type {((inputs: Approval_Requested_By_MemberInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Approval_Requested_By_MemberInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.approval_requested_by_member(inputs)
	if (locale === "cs") return __cs.approval_requested_by_member(inputs)
	return __en.approval_requested_by_member(inputs)
});
/**
* | output |
* | --- |
* | "Requested by you on {when}" |
*
* @param {Approval_Requested_By_YouInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const approval_requested_by_you = /** @type {((inputs: Approval_Requested_By_YouInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Approval_Requested_By_YouInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.approval_requested_by_you(inputs)
	if (locale === "cs") return __cs.approval_requested_by_you(inputs)
	return __en.approval_requested_by_you(inputs)
});
/**
* | output |
* | --- |
* | "Schedule as approved" |
*
* @param {Approval_Schedule_ApprovedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const approval_schedule_approved = /** @type {((inputs?: Approval_Schedule_ApprovedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Approval_Schedule_ApprovedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.approval_schedule_approved(inputs)
	if (locale === "cs") return __cs.approval_schedule_approved(inputs)
	return __en.approval_schedule_approved(inputs)
});
/**
* | output |
* | --- |
* | "You can't decide your own approval request." |
*
* @param {Approval_SelfInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const approval_self = /** @type {((inputs?: Approval_SelfInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Approval_SelfInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.approval_self(inputs)
	if (locale === "cs") return __cs.approval_self(inputs)
	return __en.approval_self(inputs)
});
/**
* | output |
* | --- |
* | "Approved" |
*
* @param {Approval_State_ApprovedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const approval_state_approved = /** @type {((inputs?: Approval_State_ApprovedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Approval_State_ApprovedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.approval_state_approved(inputs)
	if (locale === "cs") return __cs.approval_state_approved(inputs)
	return __en.approval_state_approved(inputs)
});
/**
* | output |
* | --- |
* | "Waiting for approval" |
*
* @param {Approval_State_OpenInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const approval_state_open = /** @type {((inputs?: Approval_State_OpenInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Approval_State_OpenInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.approval_state_open(inputs)
	if (locale === "cs") return __cs.approval_state_open(inputs)
	return __en.approval_state_open(inputs)
});
/**
* | output |
* | --- |
* | "Rejected" |
*
* @param {Approval_State_RejectedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const approval_state_rejected = /** @type {((inputs?: Approval_State_RejectedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Approval_State_RejectedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.approval_state_rejected(inputs)
	if (locale === "cs") return __cs.approval_state_rejected(inputs)
	return __en.approval_state_rejected(inputs)
});
/**
* | output |
* | --- |
* | "Revoked" |
*
* @param {Approval_State_RevokedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const approval_state_revoked = /** @type {((inputs?: Approval_State_RevokedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Approval_State_RevokedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.approval_state_revoked(inputs)
	if (locale === "cs") return __cs.approval_state_revoked(inputs)
	return __en.approval_state_revoked(inputs)
});
/**
* | output |
* | --- |
* | "No longer valid" |
*
* @param {Approval_State_VoidedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const approval_state_voided = /** @type {((inputs?: Approval_State_VoidedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Approval_State_VoidedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.approval_state_voided(inputs)
	if (locale === "cs") return __cs.approval_state_voided(inputs)
	return __en.approval_state_voided(inputs)
});
/**
* | output |
* | --- |
* | "Withdrawn" |
*
* @param {Approval_State_WithdrawnInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const approval_state_withdrawn = /** @type {((inputs?: Approval_State_WithdrawnInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Approval_State_WithdrawnInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.approval_state_withdrawn(inputs)
	if (locale === "cs") return __cs.approval_state_withdrawn(inputs)
	return __en.approval_state_withdrawn(inputs)
});
/**
* | output |
* | --- |
* | "Approval" |
*
* @param {Approval_TitleInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const approval_title = /** @type {((inputs?: Approval_TitleInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Approval_TitleInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.approval_title(inputs)
	if (locale === "cs") return __cs.approval_title(inputs)
	return __en.approval_title(inputs)
});
/**
* | countPlural | output |
* | --- | --- |
* | "one" | "± {count} minute" |
* | * | "± {count} minutes" |
*
* @param {Approval_ToleranceInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const approval_tolerance = /** @type {((inputs: Approval_ToleranceInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Approval_ToleranceInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.approval_tolerance(inputs)
	if (locale === "cs") return __cs.approval_tolerance(inputs)
	return __en.approval_tolerance(inputs)
});
/**
* | output |
* | --- |
* | "The content changed after the request." |
*
* @param {Approval_Void_ContentInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const approval_void_content = /** @type {((inputs?: Approval_Void_ContentInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Approval_Void_ContentInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.approval_void_content(inputs)
	if (locale === "cs") return __cs.approval_void_content(inputs)
	return __en.approval_void_content(inputs)
});
/**
* | output |
* | --- |
* | "The channels changed after the request." |
*
* @param {Approval_Void_DestinationsInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const approval_void_destinations = /** @type {((inputs?: Approval_Void_DestinationsInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Approval_Void_DestinationsInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.approval_void_destinations(inputs)
	if (locale === "cs") return __cs.approval_void_destinations(inputs)
	return __en.approval_void_destinations(inputs)
});
/**
* | output |
* | --- |
* | "The approval rules changed." |
*
* @param {Approval_Void_PolicyInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const approval_void_policy = /** @type {((inputs?: Approval_Void_PolicyInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Approval_Void_PolicyInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.approval_void_policy(inputs)
	if (locale === "cs") return __cs.approval_void_policy(inputs)
	return __en.approval_void_policy(inputs)
});
/**
* | output |
* | --- |
* | "The time changed after the request." |
*
* @param {Approval_Void_ScheduleInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const approval_void_schedule = /** @type {((inputs?: Approval_Void_ScheduleInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Approval_Void_ScheduleInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.approval_void_schedule(inputs)
	if (locale === "cs") return __cs.approval_void_schedule(inputs)
	return __en.approval_void_schedule(inputs)
});
/**
* | output |
* | --- |
* | "Withdraw" |
*
* @param {Approval_WithdrawInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const approval_withdraw = /** @type {((inputs?: Approval_WithdrawInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Approval_WithdrawInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.approval_withdraw(inputs)
	if (locale === "cs") return __cs.approval_withdraw(inputs)
	return __en.approval_withdraw(inputs)
});
/**
* | output |
* | --- |
* | "Calendar" |
*
* @param {Calendar_TitleInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const calendar_title = /** @type {((inputs?: Calendar_TitleInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Calendar_TitleInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.calendar_title(inputs)
	if (locale === "cs") return __cs.calendar_title(inputs)
	return __en.calendar_title(inputs)
});
/**
* | output |
* | --- |
* | "No text" |
*
* @param {Calendar_UntitledInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const calendar_untitled = /** @type {((inputs?: Calendar_UntitledInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Calendar_UntitledInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.calendar_untitled(inputs)
	if (locale === "cs") return __cs.calendar_untitled(inputs)
	return __en.calendar_untitled(inputs)
});
/**
* | output |
* | --- |
* | "Day" |
*
* @param {Calendar_View_DayInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const calendar_view_day = /** @type {((inputs?: Calendar_View_DayInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Calendar_View_DayInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.calendar_view_day(inputs)
	if (locale === "cs") return __cs.calendar_view_day(inputs)
	return __en.calendar_view_day(inputs)
});
/**
* | output |
* | --- |
* | "Active" |
*
* @param {Channel_Status_ActiveInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const channel_status_active = /** @type {((inputs?: Channel_Status_ActiveInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Channel_Status_ActiveInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.channel_status_active(inputs)
	if (locale === "cs") return __cs.channel_status_active(inputs)
	return __en.channel_status_active(inputs)
});
/**
* | output |
* | --- |
* | "Disabled" |
*
* @param {Channel_Status_DisabledInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const channel_status_disabled = /** @type {((inputs?: Channel_Status_DisabledInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Channel_Status_DisabledInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.channel_status_disabled(inputs)
	if (locale === "cs") return __cs.channel_status_disabled(inputs)
	return __en.channel_status_disabled(inputs)
});
/**
* | output |
* | --- |
* | "Disconnected" |
*
* @param {Channel_Status_DisconnectedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const channel_status_disconnected = /** @type {((inputs?: Channel_Status_DisconnectedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Channel_Status_DisconnectedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.channel_status_disconnected(inputs)
	if (locale === "cs") return __cs.channel_status_disconnected(inputs)
	return __en.channel_status_disconnected(inputs)
});
/**
* | output |
* | --- |
* | "Needs reconnecting" |
*
* @param {Channel_Status_Needs_ReauthInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const channel_status_needs_reauth = /** @type {((inputs?: Channel_Status_Needs_ReauthInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Channel_Status_Needs_ReauthInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.channel_status_needs_reauth(inputs)
	if (locale === "cs") return __cs.channel_status_needs_reauth(inputs)
	return __en.channel_status_needs_reauth(inputs)
});
/**
* | output |
* | --- |
* | "Add channel" |
*
* @param {Channels_AddInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const channels_add = /** @type {((inputs?: Channels_AddInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Channels_AddInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.channels_add(inputs)
	if (locale === "cs") return __cs.channels_add(inputs)
	return __en.channels_add(inputs)
});
/**
* | output |
* | --- |
* | "All networks" |
*
* @param {Channels_All_NetworksInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const channels_all_networks = /** @type {((inputs?: Channels_All_NetworksInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Channels_All_NetworksInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.channels_all_networks(inputs)
	if (locale === "cs") return __cs.channels_all_networks(inputs)
	return __en.channels_all_networks(inputs)
});
/**
* | output |
* | --- |
* | "The network returned an unsafe sign-in address, so connecting stopped." |
*
* @param {Channels_Connect_Bad_UrlInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const channels_connect_bad_url = /** @type {((inputs?: Channels_Connect_Bad_UrlInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Channels_Connect_Bad_UrlInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.channels_connect_bad_url(inputs)
	if (locale === "cs") return __cs.channels_connect_bad_url(inputs)
	return __en.channels_connect_bad_url(inputs)
});
/**
* | output |
* | --- |
* | "You'll sign in on the network, then come back here." |
*
* @param {Channels_Connect_BodyInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const channels_connect_body = /** @type {((inputs?: Channels_Connect_BodyInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Channels_Connect_BodyInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.channels_connect_body(inputs)
	if (locale === "cs") return __cs.channels_connect_body(inputs)
	return __en.channels_connect_body(inputs)
});
/**
* | output |
* | --- |
* | "Connect {name}" |
*
* @param {Channels_Connect_ButtonInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const channels_connect_button = /** @type {((inputs: Channels_Connect_ButtonInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Channels_Connect_ButtonInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.channels_connect_button(inputs)
	if (locale === "cs") return __cs.channels_connect_button(inputs)
	return __en.channels_connect_button(inputs)
});
/**
* | output |
* | --- |
* | "The network didn't accept this. Check the handle and try again." |
*
* @param {Channels_Connect_Check_HandleInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const channels_connect_check_handle = /** @type {((inputs?: Channels_Connect_Check_HandleInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Channels_Connect_Check_HandleInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.channels_connect_check_handle(inputs)
	if (locale === "cs") return __cs.channels_connect_check_handle(inputs)
	return __en.channels_connect_check_handle(inputs)
});
/**
* | output |
* | --- |
* | "No networks are set up on this server yet. Ask the server admin to register one." |
*
* @param {Channels_Connect_NoneInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const channels_connect_none = /** @type {((inputs?: Channels_Connect_NoneInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Channels_Connect_NoneInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.channels_connect_none(inputs)
	if (locale === "cs") return __cs.channels_connect_none(inputs)
	return __en.channels_connect_none(inputs)
});
/**
* | output |
* | --- |
* | "This network isn't set up on this server." |
*
* @param {Channels_Connect_Not_Set_UpInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const channels_connect_not_set_up = /** @type {((inputs?: Channels_Connect_Not_Set_UpInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Channels_Connect_Not_Set_UpInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.channels_connect_not_set_up(inputs)
	if (locale === "cs") return __cs.channels_connect_not_set_up(inputs)
	return __en.channels_connect_not_set_up(inputs)
});
/**
* | output |
* | --- |
* | "Connect a channel" |
*
* @param {Channels_Connect_TitleInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const channels_connect_title = /** @type {((inputs?: Channels_Connect_TitleInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Channels_Connect_TitleInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.channels_connect_title(inputs)
	if (locale === "cs") return __cs.channels_connect_title(inputs)
	return __en.channels_connect_title(inputs)
});
/**
* | output |
* | --- |
* | "The network can't be reached right now. Try again later." |
*
* @param {Channels_Connect_UnavailableInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const channels_connect_unavailable = /** @type {((inputs?: Channels_Connect_UnavailableInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Channels_Connect_UnavailableInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.channels_connect_unavailable(inputs)
	if (locale === "cs") return __cs.channels_connect_unavailable(inputs)
	return __en.channels_connect_unavailable(inputs)
});
/**
* | output |
* | --- |
* | "The channel is connected." |
*
* @param {Channels_ConnectedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const channels_connected = /** @type {((inputs?: Channels_ConnectedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Channels_ConnectedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.channels_connected(inputs)
	if (locale === "cs") return __cs.channels_connected(inputs)
	return __en.channels_connected(inputs)
});
/**
* | output |
* | --- |
* | "Connected: {names}." |
*
* @param {Channels_Connected_ListInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const channels_connected_list = /** @type {((inputs: Channels_Connected_ListInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Channels_Connected_ListInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.channels_connected_list(inputs)
	if (locale === "cs") return __cs.channels_connected_list(inputs)
	return __en.channels_connected_list(inputs)
});
/**
* | output |
* | --- |
* | "{name} is connected." |
*
* @param {Channels_Connected_NamedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const channels_connected_named = /** @type {((inputs: Channels_Connected_NamedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Channels_Connected_NamedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.channels_connected_named(inputs)
	if (locale === "cs") return __cs.channels_connected_named(inputs)
	return __en.channels_connected_named(inputs)
});
/**
* | output |
* | --- |
* | "Disconnect" |
*
* @param {Channels_DisconnectInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const channels_disconnect = /** @type {((inputs?: Channels_DisconnectInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Channels_DisconnectInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.channels_disconnect(inputs)
	if (locale === "cs") return __cs.channels_disconnect(inputs)
	return __en.channels_disconnect(inputs)
});
/**
* | output |
* | --- |
* | "Disconnect {name}? Scheduled posts to it won't be published. You can connect it again later." |
*
* @param {Channels_Disconnect_BodyInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const channels_disconnect_body = /** @type {((inputs: Channels_Disconnect_BodyInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Channels_Disconnect_BodyInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.channels_disconnect_body(inputs)
	if (locale === "cs") return __cs.channels_disconnect_body(inputs)
	return __en.channels_disconnect_body(inputs)
});
/**
* | output |
* | --- |
* | "Disconnect channel" |
*
* @param {Channels_Disconnect_ConfirmInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const channels_disconnect_confirm = /** @type {((inputs?: Channels_Disconnect_ConfirmInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Channels_Disconnect_ConfirmInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.channels_disconnect_confirm(inputs)
	if (locale === "cs") return __cs.channels_disconnect_confirm(inputs)
	return __en.channels_disconnect_confirm(inputs)
});
/**
* | output |
* | --- |
* | "{name} disconnected." |
*
* @param {Channels_DisconnectedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const channels_disconnected = /** @type {((inputs: Channels_DisconnectedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Channels_DisconnectedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.channels_disconnected(inputs)
	if (locale === "cs") return __cs.channels_disconnected(inputs)
	return __en.channels_disconnected(inputs)
});
/**
* | output |
* | --- |
* | "Add a channel to start publishing." |
*
* @param {Channels_Empty_BodyInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const channels_empty_body = /** @type {((inputs?: Channels_Empty_BodyInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Channels_Empty_BodyInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.channels_empty_body(inputs)
	if (locale === "cs") return __cs.channels_empty_body(inputs)
	return __en.channels_empty_body(inputs)
});
/**
* | output |
* | --- |
* | "No channels yet" |
*
* @param {Channels_Empty_TitleInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const channels_empty_title = /** @type {((inputs?: Channels_Empty_TitleInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Channels_Empty_TitleInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.channels_empty_title(inputs)
	if (locale === "cs") return __cs.channels_empty_title(inputs)
	return __en.channels_empty_title(inputs)
});
/**
* | output |
* | --- |
* | "This network isn't set up correctly on this server. Ask the server admin." |
*
* @param {Channels_Error_App_ConfigInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const channels_error_app_config = /** @type {((inputs?: Channels_Error_App_ConfigInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Channels_Error_App_ConfigInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.channels_error_app_config(inputs)
	if (locale === "cs") return __cs.channels_error_app_config(inputs)
	return __en.channels_error_app_config(inputs)
});
/**
* | output |
* | --- |
* | "You can't connect channels in this workspace." |
*
* @param {Channels_Error_ForbiddenInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const channels_error_forbidden = /** @type {((inputs?: Channels_Error_ForbiddenInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Channels_Error_ForbiddenInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.channels_error_forbidden(inputs)
	if (locale === "cs") return __cs.channels_error_forbidden(inputs)
	return __en.channels_error_forbidden(inputs)
});
/**
* | output |
* | --- |
* | "Connecting the channel didn't work. Try again." |
*
* @param {Channels_Error_GenericInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const channels_error_generic = /** @type {((inputs?: Channels_Error_GenericInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Channels_Error_GenericInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.channels_error_generic(inputs)
	if (locale === "cs") return __cs.channels_error_generic(inputs)
	return __en.channels_error_generic(inputs)
});
/**
* | output |
* | --- |
* | "No account was shared. Connect again and select at least one Page you can post to." |
*
* @param {Channels_Error_No_AccountsInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const channels_error_no_accounts = /** @type {((inputs?: Channels_Error_No_AccountsInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Channels_Error_No_AccountsInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.channels_error_no_accounts(inputs)
	if (locale === "cs") return __cs.channels_error_no_accounts(inputs)
	return __en.channels_error_no_accounts(inputs)
});
/**
* | output |
* | --- |
* | "The connection was cancelled on the network." |
*
* @param {Channels_Error_Provider_DeniedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const channels_error_provider_denied = /** @type {((inputs?: Channels_Error_Provider_DeniedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Channels_Error_Provider_DeniedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.channels_error_provider_denied(inputs)
	if (locale === "cs") return __cs.channels_error_provider_denied(inputs)
	return __en.channels_error_provider_denied(inputs)
});
/**
* | output |
* | --- |
* | "The network didn't finish the connection. Try again." |
*
* @param {Channels_Error_Provider_ErrorInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const channels_error_provider_error = /** @type {((inputs?: Channels_Error_Provider_ErrorInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Channels_Error_Provider_ErrorInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.channels_error_provider_error(inputs)
	if (locale === "cs") return __cs.channels_error_provider_error(inputs)
	return __en.channels_error_provider_error(inputs)
});
/**
* | output |
* | --- |
* | "The channel couldn't be saved. Try again." |
*
* @param {Channels_Error_Server_ErrorInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const channels_error_server_error = /** @type {((inputs?: Channels_Error_Server_ErrorInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Channels_Error_Server_ErrorInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.channels_error_server_error(inputs)
	if (locale === "cs") return __cs.channels_error_server_error(inputs)
	return __en.channels_error_server_error(inputs)
});
/**
* | output |
* | --- |
* | "The connection finished under a different sign-in. Start again." |
*
* @param {Channels_Error_Session_MismatchInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const channels_error_session_mismatch = /** @type {((inputs?: Channels_Error_Session_MismatchInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Channels_Error_Session_MismatchInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.channels_error_session_mismatch(inputs)
	if (locale === "cs") return __cs.channels_error_session_mismatch(inputs)
	return __en.channels_error_session_mismatch(inputs)
});
/**
* | output |
* | --- |
* | "The connection link expired or was already used. Start again." |
*
* @param {Channels_Error_State_InvalidInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const channels_error_state_invalid = /** @type {((inputs?: Channels_Error_State_InvalidInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Channels_Error_State_InvalidInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.channels_error_state_invalid(inputs)
	if (locale === "cs") return __cs.channels_error_state_invalid(inputs)
	return __en.channels_error_state_invalid(inputs)
});
/**
* | maxPlural | output |
* | --- | --- |
* | "one" | "Too many accounts were shared. Connect again and select at most {max} account." |
* | * | "Too many accounts were shared. Connect again and select at most {max} accounts." |
*
* @param {Channels_Error_Too_Many_AccountsInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const channels_error_too_many_accounts = /** @type {((inputs: Channels_Error_Too_Many_AccountsInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Channels_Error_Too_Many_AccountsInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.channels_error_too_many_accounts(inputs)
	if (locale === "cs") return __cs.channels_error_too_many_accounts(inputs)
	return __en.channels_error_too_many_accounts(inputs)
});
/**
* | output |
* | --- |
* | "Access expires {date}" |
*
* @param {Channels_ExpiresInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const channels_expires = /** @type {((inputs: Channels_ExpiresInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Channels_ExpiresInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.channels_expires(inputs)
	if (locale === "cs") return __cs.channels_expires(inputs)
	return __en.channels_expires(inputs)
});
/**
* | output |
* | --- |
* | "Your handle (optional)" |
*
* @param {Channels_Handle_LabelInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const channels_handle_label = /** @type {((inputs?: Channels_Handle_LabelInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Channels_Handle_LabelInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.channels_handle_label(inputs)
	if (locale === "cs") return __cs.channels_handle_label(inputs)
	return __en.channels_handle_label(inputs)
});
/**
* | output |
* | --- |
* | "yourname.bsky.social" |
*
* @param {Channels_Handle_PlaceholderInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const channels_handle_placeholder = /** @type {((inputs?: Channels_Handle_PlaceholderInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Channels_Handle_PlaceholderInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.channels_handle_placeholder(inputs)
	if (locale === "cs") return __cs.channels_handle_placeholder(inputs)
	return __en.channels_handle_placeholder(inputs)
});
/**
* | output |
* | --- |
* | "Not set up" |
*
* @param {Channels_Not_Set_UpInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const channels_not_set_up = /** @type {((inputs?: Channels_Not_Set_UpInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Channels_Not_Set_UpInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.channels_not_set_up(inputs)
	if (locale === "cs") return __cs.channels_not_set_up(inputs)
	return __en.channels_not_set_up(inputs)
});
/**
* | output |
* | --- |
* | "Open profile" |
*
* @param {Channels_Open_ProfileInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const channels_open_profile = /** @type {((inputs?: Channels_Open_ProfileInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Channels_Open_ProfileInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.channels_open_profile(inputs)
	if (locale === "cs") return __cs.channels_open_profile(inputs)
	return __en.channels_open_profile(inputs)
});
/**
* | output |
* | --- |
* | "Queue" |
*
* @param {Channels_QueueInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const channels_queue = /** @type {((inputs?: Channels_QueueInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Channels_QueueInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.channels_queue(inputs)
	if (locale === "cs") return __cs.channels_queue(inputs)
	return __en.channels_queue(inputs)
});
/**
* | output |
* | --- |
* | "Reconnect" |
*
* @param {Channels_ReconnectInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const channels_reconnect = /** @type {((inputs?: Channels_ReconnectInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Channels_ReconnectInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.channels_reconnect(inputs)
	if (locale === "cs") return __cs.channels_reconnect(inputs)
	return __en.channels_reconnect(inputs)
});
/**
* | output |
* | --- |
* | "Enter a server name like mastodon.social." |
*
* @param {Channels_Server_InvalidInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const channels_server_invalid = /** @type {((inputs?: Channels_Server_InvalidInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Channels_Server_InvalidInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.channels_server_invalid(inputs)
	if (locale === "cs") return __cs.channels_server_invalid(inputs)
	return __en.channels_server_invalid(inputs)
});
/**
* | output |
* | --- |
* | "Your {name} server" |
*
* @param {Channels_Server_LabelInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const channels_server_label = /** @type {((inputs: Channels_Server_LabelInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Channels_Server_LabelInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.channels_server_label(inputs)
	if (locale === "cs") return __cs.channels_server_label(inputs)
	return __en.channels_server_label(inputs)
});
/**
* | output |
* | --- |
* | "mastodon.social" |
*
* @param {Channels_Server_PlaceholderInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const channels_server_placeholder = /** @type {((inputs?: Channels_Server_PlaceholderInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Channels_Server_PlaceholderInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.channels_server_placeholder(inputs)
	if (locale === "cs") return __cs.channels_server_placeholder(inputs)
	return __en.channels_server_placeholder(inputs)
});
/**
* | output |
* | --- |
* | "Too many servers were set up recently. Try again in an hour." |
*
* @param {Channels_Server_Rate_LimitedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const channels_server_rate_limited = /** @type {((inputs?: Channels_Server_Rate_LimitedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Channels_Server_Rate_LimitedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.channels_server_rate_limited(inputs)
	if (locale === "cs") return __cs.channels_server_rate_limited(inputs)
	return __en.channels_server_rate_limited(inputs)
});
/**
* | output |
* | --- |
* | "That server didn't accept Kronaut. Check the name or try another server." |
*
* @param {Channels_Server_RejectedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const channels_server_rejected = /** @type {((inputs?: Channels_Server_RejectedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Channels_Server_RejectedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.channels_server_rejected(inputs)
	if (locale === "cs") return __cs.channels_server_rejected(inputs)
	return __en.channels_server_rejected(inputs)
});
/**
* | output |
* | --- |
* | "That server couldn't be reached. Try again later." |
*
* @param {Channels_Server_UnreachableInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const channels_server_unreachable = /** @type {((inputs?: Channels_Server_UnreachableInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Channels_Server_UnreachableInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.channels_server_unreachable(inputs)
	if (locale === "cs") return __cs.channels_server_unreachable(inputs)
	return __en.channels_server_unreachable(inputs)
});
/**
* | output |
* | --- |
* | "The social accounts this workspace publishes to." |
*
* @param {Channels_SubtitleInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const channels_subtitle = /** @type {((inputs?: Channels_SubtitleInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Channels_SubtitleInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.channels_subtitle(inputs)
	if (locale === "cs") return __cs.channels_subtitle(inputs)
	return __en.channels_subtitle(inputs)
});
/**
* | output |
* | --- |
* | "Channels" |
*
* @param {Channels_TitleInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const channels_title = /** @type {((inputs?: Channels_TitleInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Channels_TitleInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.channels_title(inputs)
	if (locale === "cs") return __cs.channels_title(inputs)
	return __en.channels_title(inputs)
});
/**
* | output |
* | --- |
* | "Add to queue" |
*
* @param {Compose_Add_To_QueueInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_add_to_queue = /** @type {((inputs?: Compose_Add_To_QueueInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_Add_To_QueueInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_add_to_queue(inputs)
	if (locale === "cs") return __cs.compose_add_to_queue(inputs)
	return __en.compose_add_to_queue(inputs)
});
/**
* | output |
* | --- |
* | "The first comment is too long for {channel} ({count}/{max})" |
*
* @param {Compose_Comment_Too_LongInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_comment_too_long = /** @type {((inputs: Compose_Comment_Too_LongInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_Comment_Too_LongInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_comment_too_long(inputs)
	if (locale === "cs") return __cs.compose_comment_too_long(inputs)
	return __en.compose_comment_too_long(inputs)
});
/**
* | output |
* | --- |
* | "Date" |
*
* @param {Compose_DateInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_date = /** @type {((inputs?: Compose_DateInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_DateInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_date(inputs)
	if (locale === "cs") return __cs.compose_date(inputs)
	return __en.compose_date(inputs)
});
/**
* | output |
* | --- |
* | "The post changed in the meantime. Try again." |
*
* @param {Compose_Error_ConflictInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_error_conflict = /** @type {((inputs?: Compose_Error_ConflictInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_Error_ConflictInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_error_conflict(inputs)
	if (locale === "cs") return __cs.compose_error_conflict(inputs)
	return __en.compose_error_conflict(inputs)
});
/**
* | output |
* | --- |
* | "Pick a date and a time." |
*
* @param {Compose_Error_When_MissingInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_error_when_missing = /** @type {((inputs?: Compose_Error_When_MissingInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_Error_When_MissingInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_error_when_missing(inputs)
	if (locale === "cs") return __cs.compose_error_when_missing(inputs)
	return __en.compose_error_when_missing(inputs)
});
/**
* | output |
* | --- |
* | "Preview of image {position}" |
*
* @param {Compose_Image_PreviewInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_image_preview = /** @type {((inputs: Compose_Image_PreviewInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_Image_PreviewInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_image_preview(inputs)
	if (locale === "cs") return __cs.compose_image_preview(inputs)
	return __en.compose_image_preview(inputs)
});
/**
* | output |
* | --- |
* | "Remove" |
*
* @param {Compose_Image_RemoveInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_image_remove = /** @type {((inputs?: Compose_Image_RemoveInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_Image_RemoveInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_image_remove(inputs)
	if (locale === "cs") return __cs.compose_image_remove(inputs)
	return __en.compose_image_remove(inputs)
});
/**
* | output |
* | --- |
* | "The first comment is empty." |
*
* @param {Compose_Issue_Comment_EmptyInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_issue_comment_empty = /** @type {((inputs?: Compose_Issue_Comment_EmptyInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_Issue_Comment_EmptyInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_issue_comment_empty(inputs)
	if (locale === "cs") return __cs.compose_issue_comment_empty(inputs)
	return __en.compose_issue_comment_empty(inputs)
});
/**
* | output |
* | --- |
* | "{channel}: {message}" |
*
* @param {Compose_Issue_On_ChannelInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_issue_on_channel = /** @type {((inputs: Compose_Issue_On_ChannelInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_Issue_On_ChannelInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_issue_on_channel(inputs)
	if (locale === "cs") return __cs.compose_issue_on_channel(inputs)
	return __en.compose_issue_on_channel(inputs)
});
/**
* | output |
* | --- |
* | "Reply {position} is empty." |
*
* @param {Compose_Issue_Reply_EmptyInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_issue_reply_empty = /** @type {((inputs: Compose_Issue_Reply_EmptyInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_Issue_Reply_EmptyInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_issue_reply_empty(inputs)
	if (locale === "cs") return __cs.compose_issue_reply_empty(inputs)
	return __en.compose_issue_reply_empty(inputs)
});
/**
* | output |
* | --- |
* | "{channel} ({network})" |
*
* @param {Compose_Limit_ChannelInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_limit_channel = /** @type {((inputs: Compose_Limit_ChannelInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_Limit_ChannelInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_limit_channel(inputs)
	if (locale === "cs") return __cs.compose_limit_channel(inputs)
	return __en.compose_limit_channel(inputs)
});
/**
* | output |
* | --- |
* | "Too long for {channel} ({count}/{max})" |
*
* @param {Compose_Limit_Too_LongInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_limit_too_long = /** @type {((inputs: Compose_Limit_Too_LongInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_Limit_Too_LongInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_limit_too_long(inputs)
	if (locale === "cs") return __cs.compose_limit_too_long(inputs)
	return __en.compose_limit_too_long(inputs)
});
/**
* | maxPlural | output |
* | --- | --- |
* | "one" | "{channel} allows up to {max} link" |
* | * | "{channel} allows up to {max} links" |
*
* @param {Compose_Limit_Too_Many_LinksInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_limit_too_many_links = /** @type {((inputs: Compose_Limit_Too_Many_LinksInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_Limit_Too_Many_LinksInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_limit_too_many_links(inputs)
	if (locale === "cs") return __cs.compose_limit_too_many_links(inputs)
	return __en.compose_limit_too_many_links(inputs)
});
/**
* | output |
* | --- |
* | "{network} {count}/{max}" |
*
* @param {Compose_Limit_UsageInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_limit_usage = /** @type {((inputs: Compose_Limit_UsageInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_Limit_UsageInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_limit_usage(inputs)
	if (locale === "cs") return __cs.compose_limit_usage(inputs)
	return __en.compose_limit_usage(inputs)
});
/**
* | output |
* | --- |
* | "Preview" |
*
* @param {Compose_Preview_TitleInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_preview_title = /** @type {((inputs?: Compose_Preview_TitleInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_Preview_TitleInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_preview_title(inputs)
	if (locale === "cs") return __cs.compose_preview_title(inputs)
	return __en.compose_preview_title(inputs)
});
/**
* | output |
* | --- |
* | "Publish now" |
*
* @param {Compose_Publish_NowInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_publish_now = /** @type {((inputs?: Compose_Publish_NowInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_Publish_NowInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_publish_now(inputs)
	if (locale === "cs") return __cs.compose_publish_now(inputs)
	return __en.compose_publish_now(inputs)
});
/**
* | output |
* | --- |
* | "Publishing…" |
*
* @param {Compose_PublishingInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_publishing = /** @type {((inputs?: Compose_PublishingInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_PublishingInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_publishing(inputs)
	if (locale === "cs") return __cs.compose_publishing(inputs)
	return __en.compose_publishing(inputs)
});
/**
* | output |
* | --- |
* | "{channel} has an empty queue." |
*
* @param {Compose_Queue_EmptyInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_queue_empty = /** @type {((inputs: Compose_Queue_EmptyInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_Queue_EmptyInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_queue_empty(inputs)
	if (locale === "cs") return __cs.compose_queue_empty(inputs)
	return __en.compose_queue_empty(inputs)
});
/**
* | output |
* | --- |
* | "{channel}: {when} ({tz})" |
*
* @param {Compose_Queue_NextInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_queue_next = /** @type {((inputs: Compose_Queue_NextInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_Queue_NextInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_queue_next(inputs)
	if (locale === "cs") return __cs.compose_queue_next(inputs)
	return __en.compose_queue_next(inputs)
});
/**
* | output |
* | --- |
* | "Reply {position} is too long for {channel} ({count}/{max})" |
*
* @param {Compose_Reply_Too_LongInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_reply_too_long = /** @type {((inputs: Compose_Reply_Too_LongInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_Reply_Too_LongInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_reply_too_long(inputs)
	if (locale === "cs") return __cs.compose_reply_too_long(inputs)
	return __en.compose_reply_too_long(inputs)
});
/**
* | output |
* | --- |
* | "Reply {position} has more links than {channel} allows ({max})" |
*
* @param {Compose_Reply_Too_Many_LinksInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_reply_too_many_links = /** @type {((inputs: Compose_Reply_Too_Many_LinksInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_Reply_Too_Many_LinksInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_reply_too_many_links(inputs)
	if (locale === "cs") return __cs.compose_reply_too_many_links(inputs)
	return __en.compose_reply_too_many_links(inputs)
});
/**
* | output |
* | --- |
* | "Request approval" |
*
* @param {Compose_Request_ApprovalInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_request_approval = /** @type {((inputs?: Compose_Request_ApprovalInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_Request_ApprovalInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_request_approval(inputs)
	if (locale === "cs") return __cs.compose_request_approval(inputs)
	return __en.compose_request_approval(inputs)
});
/**
* | output |
* | --- |
* | "Requesting approval…" |
*
* @param {Compose_Requesting_ApprovalInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_requesting_approval = /** @type {((inputs?: Compose_Requesting_ApprovalInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_Requesting_ApprovalInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_requesting_approval(inputs)
	if (locale === "cs") return __cs.compose_requesting_approval(inputs)
	return __en.compose_requesting_approval(inputs)
});
/**
* | output |
* | --- |
* | "Schedule" |
*
* @param {Compose_ScheduleInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_schedule = /** @type {((inputs?: Compose_ScheduleInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_ScheduleInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_schedule(inputs)
	if (locale === "cs") return __cs.compose_schedule(inputs)
	return __en.compose_schedule(inputs)
});
/**
* | output |
* | --- |
* | "Scheduling…" |
*
* @param {Compose_SchedulingInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_scheduling = /** @type {((inputs?: Compose_SchedulingInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_SchedulingInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_scheduling(inputs)
	if (locale === "cs") return __cs.compose_scheduling(inputs)
	return __en.compose_scheduling(inputs)
});
/**
* | output |
* | --- |
* | "Time" |
*
* @param {Compose_TimeInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_time = /** @type {((inputs?: Compose_TimeInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_TimeInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_time(inputs)
	if (locale === "cs") return __cs.compose_time(inputs)
	return __en.compose_time(inputs)
});
/**
* | output |
* | --- |
* | "Time zone: {tz}" |
*
* @param {Compose_Time_ZoneInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_time_zone = /** @type {((inputs: Compose_Time_ZoneInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_Time_ZoneInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_time_zone(inputs)
	if (locale === "cs") return __cs.compose_time_zone(inputs)
	return __en.compose_time_zone(inputs)
});
/**
* | output |
* | --- |
* | "The AI label couldn't be saved." |
*
* @param {Compose_Video_Ai_FailedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_video_ai_failed = /** @type {((inputs?: Compose_Video_Ai_FailedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_Video_Ai_FailedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_video_ai_failed(inputs)
	if (locale === "cs") return __cs.compose_video_ai_failed(inputs)
	return __en.compose_video_ai_failed(inputs)
});
/**
* | output |
* | --- |
* | "Saving the AI label…" |
*
* @param {Compose_Video_Ai_SavingInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_video_ai_saving = /** @type {((inputs?: Compose_Video_Ai_SavingInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_Video_Ai_SavingInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_video_ai_saving(inputs)
	if (locale === "cs") return __cs.compose_video_ai_saving(inputs)
	return __en.compose_video_ai_saving(inputs)
});
/**
* | output |
* | --- |
* | "The video couldn't be uploaded." |
*
* @param {Compose_Video_ErrorInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_video_error = /** @type {((inputs?: Compose_Video_ErrorInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_Video_ErrorInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_video_error(inputs)
	if (locale === "cs") return __cs.compose_video_error(inputs)
	return __en.compose_video_error(inputs)
});
/**
* | output |
* | --- |
* | "The video's aspect ratio doesn't fit {channel}." |
*
* @param {Compose_Video_Issue_AspectInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_video_issue_aspect = /** @type {((inputs: Compose_Video_Issue_AspectInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_Video_Issue_AspectInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_video_issue_aspect(inputs)
	if (locale === "cs") return __cs.compose_video_issue_aspect(inputs)
	return __en.compose_video_issue_aspect(inputs)
});
/**
* | output |
* | --- |
* | "The video's frame rate is higher than {channel} allows ({max} fps)." |
*
* @param {Compose_Video_Issue_Frame_RateInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_video_issue_frame_rate = /** @type {((inputs: Compose_Video_Issue_Frame_RateInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_Video_Issue_Frame_RateInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_video_issue_frame_rate(inputs)
	if (locale === "cs") return __cs.compose_video_issue_frame_rate(inputs)
	return __en.compose_video_issue_frame_rate(inputs)
});
/**
* | output |
* | --- |
* | "{channel} doesn't take a video for this kind of post." |
*
* @param {Compose_Video_Issue_KindInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_video_issue_kind = /** @type {((inputs: Compose_Video_Issue_KindInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_Video_Issue_KindInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_video_issue_kind(inputs)
	if (locale === "cs") return __cs.compose_video_issue_kind(inputs)
	return __en.compose_video_issue_kind(inputs)
});
/**
* | output |
* | --- |
* | "The video's length or size couldn't be read for {channel}." |
*
* @param {Compose_Video_Issue_MetadataInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_video_issue_metadata = /** @type {((inputs: Compose_Video_Issue_MetadataInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_Video_Issue_MetadataInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_video_issue_metadata(inputs)
	if (locale === "cs") return __cs.compose_video_issue_metadata(inputs)
	return __en.compose_video_issue_metadata(inputs)
});
/**
* | output |
* | --- |
* | "{channel} doesn't accept this video's format." |
*
* @param {Compose_Video_Issue_MimeInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_video_issue_mime = /** @type {((inputs: Compose_Video_Issue_MimeInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_Video_Issue_MimeInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_video_issue_mime(inputs)
	if (locale === "cs") return __cs.compose_video_issue_mime(inputs)
	return __en.compose_video_issue_mime(inputs)
});
/**
* | output |
* | --- |
* | "The video's resolution is higher than {channel} allows." |
*
* @param {Compose_Video_Issue_ResolutionInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_video_issue_resolution = /** @type {((inputs: Compose_Video_Issue_ResolutionInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_Video_Issue_ResolutionInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_video_issue_resolution(inputs)
	if (locale === "cs") return __cs.compose_video_issue_resolution(inputs)
	return __en.compose_video_issue_resolution(inputs)
});
/**
* | output |
* | --- |
* | "The video is larger than {channel} allows ({max})." |
*
* @param {Compose_Video_Issue_Too_LargeInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_video_issue_too_large = /** @type {((inputs: Compose_Video_Issue_Too_LargeInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_Video_Issue_Too_LargeInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_video_issue_too_large(inputs)
	if (locale === "cs") return __cs.compose_video_issue_too_large(inputs)
	return __en.compose_video_issue_too_large(inputs)
});
/**
* | output |
* | --- |
* | "The video is longer than {channel} allows ({max})." |
*
* @param {Compose_Video_Issue_Too_LongInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_video_issue_too_long = /** @type {((inputs: Compose_Video_Issue_Too_LongInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_Video_Issue_Too_LongInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_video_issue_too_long(inputs)
	if (locale === "cs") return __cs.compose_video_issue_too_long(inputs)
	return __en.compose_video_issue_too_long(inputs)
});
/**
* | output |
* | --- |
* | "The video is shorter than {channel} needs ({min})." |
*
* @param {Compose_Video_Issue_Too_ShortInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_video_issue_too_short = /** @type {((inputs: Compose_Video_Issue_Too_ShortInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_Video_Issue_Too_ShortInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_video_issue_too_short(inputs)
	if (locale === "cs") return __cs.compose_video_issue_too_short(inputs)
	return __en.compose_video_issue_too_short(inputs)
});
/**
* | output |
* | --- |
* | "Video preview" |
*
* @param {Compose_Video_Preview_CardInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_video_preview_card = /** @type {((inputs?: Compose_Video_Preview_CardInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_Video_Preview_CardInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_video_preview_card(inputs)
	if (locale === "cs") return __cs.compose_video_preview_card(inputs)
	return __en.compose_video_preview_card(inputs)
});
/**
* | output |
* | --- |
* | "The file has no video track." |
*
* @param {Compose_Video_Rejected_Stream_MissingInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_video_rejected_stream_missing = /** @type {((inputs?: Compose_Video_Rejected_Stream_MissingInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_Video_Rejected_Stream_MissingInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_video_rejected_stream_missing(inputs)
	if (locale === "cs") return __cs.compose_video_rejected_stream_missing(inputs)
	return __en.compose_video_rejected_stream_missing(inputs)
});
/**
* | output |
* | --- |
* | "The converted video would be larger than {max}." |
*
* @param {Compose_Video_Rejected_Too_LargeInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_video_rejected_too_large = /** @type {((inputs: Compose_Video_Rejected_Too_LargeInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_Video_Rejected_Too_LargeInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_video_rejected_too_large(inputs)
	if (locale === "cs") return __cs.compose_video_rejected_too_large(inputs)
	return __en.compose_video_rejected_too_large(inputs)
});
/**
* | output |
* | --- |
* | "The video is longer than {max}." |
*
* @param {Compose_Video_Rejected_Too_LongInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_video_rejected_too_long = /** @type {((inputs: Compose_Video_Rejected_Too_LongInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_Video_Rejected_Too_LongInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_video_rejected_too_long(inputs)
	if (locale === "cs") return __cs.compose_video_rejected_too_long(inputs)
	return __en.compose_video_rejected_too_long(inputs)
});
/**
* | output |
* | --- |
* | "The video is shorter than {min}." |
*
* @param {Compose_Video_Rejected_Too_ShortInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_video_rejected_too_short = /** @type {((inputs: Compose_Video_Rejected_Too_ShortInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_Video_Rejected_Too_ShortInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_video_rejected_too_short(inputs)
	if (locale === "cs") return __cs.compose_video_rejected_too_short(inputs)
	return __en.compose_video_rejected_too_short(inputs)
});
/**
* | output |
* | --- |
* | "The video couldn't be read. Try exporting it again." |
*
* @param {Compose_Video_Rejected_UnreadableInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_video_rejected_unreadable = /** @type {((inputs?: Compose_Video_Rejected_UnreadableInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_Video_Rejected_UnreadableInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_video_rejected_unreadable(inputs)
	if (locale === "cs") return __cs.compose_video_rejected_unreadable(inputs)
	return __en.compose_video_rejected_unreadable(inputs)
});
/**
* | output |
* | --- |
* | "Wait for the video to finish processing." |
*
* @param {Compose_Video_WaitInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_video_wait = /** @type {((inputs?: Compose_Video_WaitInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_Video_WaitInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_video_wait(inputs)
	if (locale === "cs") return __cs.compose_video_wait(inputs)
	return __en.compose_video_wait(inputs)
});
/**
* | output |
* | --- |
* | "When" |
*
* @param {Compose_When_TitleInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_when_title = /** @type {((inputs?: Compose_When_TitleInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_When_TitleInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_when_title(inputs)
	if (locale === "cs") return __cs.compose_when_title(inputs)
	return __en.compose_when_title(inputs)
});
/**
* | output |
* | --- |
* | "Waiting for you to post it" |
*
* @param {Destination_State_Awaiting_ManualInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const destination_state_awaiting_manual = /** @type {((inputs?: Destination_State_Awaiting_ManualInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Destination_State_Awaiting_ManualInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.destination_state_awaiting_manual(inputs)
	if (locale === "cs") return __cs.destination_state_awaiting_manual(inputs)
	return __en.destination_state_awaiting_manual(inputs)
});
/**
* | output |
* | --- |
* | "Blocked" |
*
* @param {Destination_State_BlockedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const destination_state_blocked = /** @type {((inputs?: Destination_State_BlockedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Destination_State_BlockedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.destination_state_blocked(inputs)
	if (locale === "cs") return __cs.destination_state_blocked(inputs)
	return __en.destination_state_blocked(inputs)
});
/**
* | output |
* | --- |
* | "Canceled" |
*
* @param {Destination_State_CanceledInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const destination_state_canceled = /** @type {((inputs?: Destination_State_CanceledInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Destination_State_CanceledInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.destination_state_canceled(inputs)
	if (locale === "cs") return __cs.destination_state_canceled(inputs)
	return __en.destination_state_canceled(inputs)
});
/**
* | output |
* | --- |
* | "Draft" |
*
* @param {Destination_State_DraftInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const destination_state_draft = /** @type {((inputs?: Destination_State_DraftInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Destination_State_DraftInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.destination_state_draft(inputs)
	if (locale === "cs") return __cs.destination_state_draft(inputs)
	return __en.destination_state_draft(inputs)
});
/**
* | output |
* | --- |
* | "Failed" |
*
* @param {Destination_State_FailedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const destination_state_failed = /** @type {((inputs?: Destination_State_FailedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Destination_State_FailedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.destination_state_failed(inputs)
	if (locale === "cs") return __cs.destination_state_failed(inputs)
	return __en.destination_state_failed(inputs)
});
/**
* | output |
* | --- |
* | "Published" |
*
* @param {Destination_State_PublishedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const destination_state_published = /** @type {((inputs?: Destination_State_PublishedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Destination_State_PublishedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.destination_state_published(inputs)
	if (locale === "cs") return __cs.destination_state_published(inputs)
	return __en.destination_state_published(inputs)
});
/**
* | output |
* | --- |
* | "Publishing" |
*
* @param {Destination_State_PublishingInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const destination_state_publishing = /** @type {((inputs?: Destination_State_PublishingInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Destination_State_PublishingInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.destination_state_publishing(inputs)
	if (locale === "cs") return __cs.destination_state_publishing(inputs)
	return __en.destination_state_publishing(inputs)
});
/**
* | output |
* | --- |
* | "Waiting to retry" |
*
* @param {Destination_State_Retry_WaitInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const destination_state_retry_wait = /** @type {((inputs?: Destination_State_Retry_WaitInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Destination_State_Retry_WaitInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.destination_state_retry_wait(inputs)
	if (locale === "cs") return __cs.destination_state_retry_wait(inputs)
	return __en.destination_state_retry_wait(inputs)
});
/**
* | output |
* | --- |
* | "Scheduled" |
*
* @param {Destination_State_ScheduledInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const destination_state_scheduled = /** @type {((inputs?: Destination_State_ScheduledInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Destination_State_ScheduledInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.destination_state_scheduled(inputs)
	if (locale === "cs") return __cs.destination_state_scheduled(inputs)
	return __en.destination_state_scheduled(inputs)
});
/**
* | output |
* | --- |
* | "Not confirmed" |
*
* @param {Destination_State_UnconfirmedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const destination_state_unconfirmed = /** @type {((inputs?: Destination_State_UnconfirmedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Destination_State_UnconfirmedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.destination_state_unconfirmed(inputs)
	if (locale === "cs") return __cs.destination_state_unconfirmed(inputs)
	return __en.destination_state_unconfirmed(inputs)
});
/**
* | output |
* | --- |
* | "Checking" |
*
* @param {Destination_State_VerifyingInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const destination_state_verifying = /** @type {((inputs?: Destination_State_VerifyingInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Destination_State_VerifyingInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.destination_state_verifying(inputs)
	if (locale === "cs") return __cs.destination_state_verifying(inputs)
	return __en.destination_state_verifying(inputs)
});
/**
* | output |
* | --- |
* | "Close" |
*
* @param {Dialog_CloseInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const dialog_close = /** @type {((inputs?: Dialog_CloseInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Dialog_CloseInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.dialog_close(inputs)
	if (locale === "cs") return __cs.dialog_close(inputs)
	return __en.dialog_close(inputs)
});
/**
* | output |
* | --- |
* | "Dismiss" |
*
* @param {DismissInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const dismiss = /** @type {((inputs?: DismissInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<DismissInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.dismiss(inputs)
	if (locale === "cs") return __cs.dismiss(inputs)
	return __en.dismiss(inputs)
});
/**
* | output |
* | --- |
* | "You're getting this email because you belong to the {workspace} workspace in Kronaut." |
*
* @param {Email_FooterInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const email_footer = /** @type {((inputs: Email_FooterInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Email_FooterInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.email_footer(inputs)
	if (locale === "cs") return __cs.email_footer(inputs)
	return __en.email_footer(inputs)
});
/**
* | output |
* | --- |
* | "Choose which emails you get: {url}" |
*
* @param {Email_ManageInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const email_manage = /** @type {((inputs: Email_ManageInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Email_ManageInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.email_manage(inputs)
	if (locale === "cs") return __cs.email_manage(inputs)
	return __en.email_manage(inputs)
});
/**
* | output |
* | --- |
* | "Open it in Kronaut: {url}" |
*
* @param {Email_OpenInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const email_open = /** @type {((inputs: Email_OpenInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Email_OpenInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.email_open(inputs)
	if (locale === "cs") return __cs.email_open(inputs)
	return __en.email_open(inputs)
});
/**
* | output |
* | --- |
* | "Post: {excerpt}" |
*
* @param {Email_PostInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const email_post = /** @type {((inputs: Email_PostInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Email_PostInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.email_post(inputs)
	if (locale === "cs") return __cs.email_post(inputs)
	return __en.email_post(inputs)
});
/**
* | output |
* | --- |
* | "This request was blocked. Reload the page and try again." |
*
* @param {Error_ForbiddenInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const error_forbidden = /** @type {((inputs?: Error_ForbiddenInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Error_ForbiddenInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.error_forbidden(inputs)
	if (locale === "cs") return __cs.error_forbidden(inputs)
	return __en.error_forbidden(inputs)
});
/**
* | output |
* | --- |
* | "Something went wrong. Try again." |
*
* @param {Error_GenericInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const error_generic = /** @type {((inputs?: Error_GenericInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Error_GenericInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.error_generic(inputs)
	if (locale === "cs") return __cs.error_generic(inputs)
	return __en.error_generic(inputs)
});
/**
* | output |
* | --- |
* | "The email or password is incorrect." |
*
* @param {Error_Invalid_CredentialsInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const error_invalid_credentials = /** @type {((inputs?: Error_Invalid_CredentialsInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Error_Invalid_CredentialsInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.error_invalid_credentials(inputs)
	if (locale === "cs") return __cs.error_invalid_credentials(inputs)
	return __en.error_invalid_credentials(inputs)
});
/**
* | output |
* | --- |
* | "Check the fields and try again." |
*
* @param {Error_Invalid_RequestInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const error_invalid_request = /** @type {((inputs?: Error_Invalid_RequestInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Error_Invalid_RequestInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.error_invalid_request(inputs)
	if (locale === "cs") return __cs.error_invalid_request(inputs)
	return __en.error_invalid_request(inputs)
});
/**
* | output |
* | --- |
* | "Signing out didn't work. Try again." |
*
* @param {Error_Logout_FailedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const error_logout_failed = /** @type {((inputs?: Error_Logout_FailedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Error_Logout_FailedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.error_logout_failed(inputs)
	if (locale === "cs") return __cs.error_logout_failed(inputs)
	return __en.error_logout_failed(inputs)
});
/**
* | output |
* | --- |
* | "Too many attempts. Wait a moment and try again." |
*
* @param {Error_Rate_LimitedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const error_rate_limited = /** @type {((inputs?: Error_Rate_LimitedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Error_Rate_LimitedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.error_rate_limited(inputs)
	if (locale === "cs") return __cs.error_rate_limited(inputs)
	return __en.error_rate_limited(inputs)
});
/**
* | output |
* | --- |
* | "Kronaut can't be reached right now. Try again in a moment." |
*
* @param {Error_UnavailableInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const error_unavailable = /** @type {((inputs?: Error_UnavailableInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Error_UnavailableInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.error_unavailable(inputs)
	if (locale === "cs") return __cs.error_unavailable(inputs)
	return __en.error_unavailable(inputs)
});
/**
* | output |
* | --- |
* | "Recent copies" |
*
* @param {Evergreen_CopiesInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const evergreen_copies = /** @type {((inputs?: Evergreen_CopiesInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Evergreen_CopiesInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.evergreen_copies(inputs)
	if (locale === "cs") return __cs.evergreen_copies(inputs)
	return __en.evergreen_copies(inputs)
});
/**
* | output |
* | --- |
* | "{channel}, {when}" |
*
* @param {Evergreen_CopyInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const evergreen_copy = /** @type {((inputs: Evergreen_CopyInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Evergreen_CopyInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.evergreen_copy(inputs)
	if (locale === "cs") return __cs.evergreen_copy(inputs)
	return __en.evergreen_copy(inputs)
});
/**
* | output |
* | --- |
* | "Evergreen" |
*
* @param {Evergreen_LabelInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const evergreen_label = /** @type {((inputs?: Evergreen_LabelInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Evergreen_LabelInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.evergreen_label(inputs)
	if (locale === "cs") return __cs.evergreen_label(inputs)
	return __en.evergreen_label(inputs)
});
/**
* | reason | output |
* | --- | --- |
* | "owner_lost" | "Removed: its owner can no longer schedule posts." |
* | * | "Removed: a copy couldn't be created." |
*
* @param {Evergreen_ReasonInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const evergreen_reason = /** @type {((inputs: Evergreen_ReasonInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Evergreen_ReasonInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.evergreen_reason(inputs)
	if (locale === "cs") return __cs.evergreen_reason(inputs)
	return __en.evergreen_reason(inputs)
});
/**
* | countPlural | output |
* | --- | --- |
* | "one" | "{count} item needs action" |
* | * | "{count} items need action" |
*
* @param {Inbox_BadgeInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const inbox_badge = /** @type {((inputs: Inbox_BadgeInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Inbox_BadgeInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.inbox_badge(inputs)
	if (locale === "cs") return __cs.inbox_badge(inputs)
	return __en.inbox_badge(inputs)
});
/**
* | output |
* | --- |
* | "{count}+" |
*
* @param {Inbox_Badge_OverflowInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const inbox_badge_overflow = /** @type {((inputs: Inbox_Badge_OverflowInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Inbox_Badge_OverflowInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.inbox_badge_overflow(inputs)
	if (locale === "cs") return __cs.inbox_badge_overflow(inputs)
	return __en.inbox_badge_overflow(inputs)
});
/**
* | output |
* | --- |
* | "Cancel" |
*
* @param {Inbox_CancelInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const inbox_cancel = /** @type {((inputs?: Inbox_CancelInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Inbox_CancelInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.inbox_cancel(inputs)
	if (locale === "cs") return __cs.inbox_cancel(inputs)
	return __en.inbox_cancel(inputs)
});
/**
* | output |
* | --- |
* | "Not now" |
*
* @param {Inbox_Confirm_BackInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const inbox_confirm_back = /** @type {((inputs?: Inbox_Confirm_BackInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Inbox_Confirm_BackInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.inbox_confirm_back(inputs)
	if (locale === "cs") return __cs.inbox_confirm_back(inputs)
	return __en.inbox_confirm_back(inputs)
});
/**
* | output |
* | --- |
* | "The list couldn't be loaded. Try again." |
*
* @param {Inbox_Load_FailedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const inbox_load_failed = /** @type {((inputs?: Inbox_Load_FailedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Inbox_Load_FailedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.inbox_load_failed(inputs)
	if (locale === "cs") return __cs.inbox_load_failed(inputs)
	return __en.inbox_load_failed(inputs)
});
/**
* | output |
* | --- |
* | "This network needs alt text on every image." |
*
* @param {Issue_Alt_Text_RequiredInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const issue_alt_text_required = /** @type {((inputs?: Issue_Alt_Text_RequiredInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Issue_Alt_Text_RequiredInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.issue_alt_text_required(inputs)
	if (locale === "cs") return __cs.issue_alt_text_required(inputs)
	return __en.issue_alt_text_required(inputs)
});
/**
* | output |
* | --- |
* | "An alt text is too long for this network." |
*
* @param {Issue_Alt_Text_Too_LongInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const issue_alt_text_too_long = /** @type {((inputs?: Issue_Alt_Text_Too_LongInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Issue_Alt_Text_Too_LongInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.issue_alt_text_too_long(inputs)
	if (locale === "cs") return __cs.issue_alt_text_too_long(inputs)
	return __en.issue_alt_text_too_long(inputs)
});
/**
* | output |
* | --- |
* | "An image's aspect ratio isn't allowed on this network." |
*
* @param {Issue_Aspect_Out_Of_RangeInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const issue_aspect_out_of_range = /** @type {((inputs?: Issue_Aspect_Out_Of_RangeInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Issue_Aspect_Out_Of_RangeInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.issue_aspect_out_of_range(inputs)
	if (locale === "cs") return __cs.issue_aspect_out_of_range(inputs)
	return __en.issue_aspect_out_of_range(inputs)
});
/**
* | output |
* | --- |
* | "An image file is too large." |
*
* @param {Issue_File_Too_LargeInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const issue_file_too_large = /** @type {((inputs?: Issue_File_Too_LargeInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Issue_File_Too_LargeInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.issue_file_too_large(inputs)
	if (locale === "cs") return __cs.issue_file_too_large(inputs)
	return __en.issue_file_too_large(inputs)
});
/**
* | output |
* | --- |
* | "The video's frame rate is too high for this network." |
*
* @param {Issue_Frame_Rate_Too_HighInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const issue_frame_rate_too_high = /** @type {((inputs?: Issue_Frame_Rate_Too_HighInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Issue_Frame_Rate_Too_HighInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.issue_frame_rate_too_high(inputs)
	if (locale === "cs") return __cs.issue_frame_rate_too_high(inputs)
	return __en.issue_frame_rate_too_high(inputs)
});
/**
* | output |
* | --- |
* | "Something went wrong. The technical details say more." |
*
* @param {Issue_GenericInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const issue_generic = /** @type {((inputs?: Issue_GenericInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Issue_GenericInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.issue_generic(inputs)
	if (locale === "cs") return __cs.issue_generic(inputs)
	return __en.issue_generic(inputs)
});
/**
* | output |
* | --- |
* | "An image is too narrow for this network." |
*
* @param {Issue_Image_Too_NarrowInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const issue_image_too_narrow = /** @type {((inputs?: Issue_Image_Too_NarrowInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Issue_Image_Too_NarrowInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.issue_image_too_narrow(inputs)
	if (locale === "cs") return __cs.issue_image_too_narrow(inputs)
	return __en.issue_image_too_narrow(inputs)
});
/**
* | output |
* | --- |
* | "An image is too wide for this network." |
*
* @param {Issue_Image_Too_WideInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const issue_image_too_wide = /** @type {((inputs?: Issue_Image_Too_WideInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Issue_Image_Too_WideInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.issue_image_too_wide(inputs)
	if (locale === "cs") return __cs.issue_image_too_wide(inputs)
	return __en.issue_image_too_wide(inputs)
});
/**
* | output |
* | --- |
* | "That time has already passed. Pick a later one." |
*
* @param {Issue_In_PastInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const issue_in_past = /** @type {((inputs?: Issue_In_PastInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Issue_In_PastInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.issue_in_past(inputs)
	if (locale === "cs") return __cs.issue_in_past(inputs)
	return __en.issue_in_past(inputs)
});
/**
* | output |
* | --- |
* | "These repeat settings aren't supported." |
*
* @param {Issue_Invalid_RepeatInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const issue_invalid_repeat = /** @type {((inputs?: Issue_Invalid_RepeatInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Issue_Invalid_RepeatInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.issue_invalid_repeat(inputs)
	if (locale === "cs") return __cs.issue_invalid_repeat(inputs)
	return __en.issue_invalid_repeat(inputs)
});
/**
* | output |
* | --- |
* | "The time zone isn't recognised." |
*
* @param {Issue_Invalid_Time_ZoneInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const issue_invalid_time_zone = /** @type {((inputs?: Issue_Invalid_Time_ZoneInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Issue_Invalid_Time_ZoneInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.issue_invalid_time_zone(inputs)
	if (locale === "cs") return __cs.issue_invalid_time_zone(inputs)
	return __en.issue_invalid_time_zone(inputs)
});
/**
* | output |
* | --- |
* | "This kind of post can't include images." |
*
* @param {Issue_Media_Not_AllowedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const issue_media_not_allowed = /** @type {((inputs?: Issue_Media_Not_AllowedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Issue_Media_Not_AllowedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.issue_media_not_allowed(inputs)
	if (locale === "cs") return __cs.issue_media_not_allowed(inputs)
	return __en.issue_media_not_allowed(inputs)
});
/**
* | output |
* | --- |
* | "This network doesn't accept this image format." |
*
* @param {Issue_Mime_UnsupportedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const issue_mime_unsupported = /** @type {((inputs?: Issue_Mime_UnsupportedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Issue_Mime_UnsupportedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.issue_mime_unsupported(inputs)
	if (locale === "cs") return __cs.issue_mime_unsupported(inputs)
	return __en.issue_mime_unsupported(inputs)
});
/**
* | output |
* | --- |
* | "An image is still being processed. Try again in a moment." |
*
* @param {Issue_Not_ReadyInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const issue_not_ready = /** @type {((inputs?: Issue_Not_ReadyInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Issue_Not_ReadyInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.issue_not_ready(inputs)
	if (locale === "cs") return __cs.issue_not_ready(inputs)
	return __en.issue_not_ready(inputs)
});
/**
* | output |
* | --- |
* | "This kind of post isn't available for the channel." |
*
* @param {Issue_Post_Type_UnavailableInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const issue_post_type_unavailable = /** @type {((inputs?: Issue_Post_Type_UnavailableInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Issue_Post_Type_UnavailableInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.issue_post_type_unavailable(inputs)
	if (locale === "cs") return __cs.issue_post_type_unavailable(inputs)
	return __en.issue_post_type_unavailable(inputs)
});
/**
* | output |
* | --- |
* | "This network isn't available on this server right now." |
*
* @param {Issue_Provider_UnavailableInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const issue_provider_unavailable = /** @type {((inputs?: Issue_Provider_UnavailableInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Issue_Provider_UnavailableInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.issue_provider_unavailable(inputs)
	if (locale === "cs") return __cs.issue_provider_unavailable(inputs)
	return __en.issue_provider_unavailable(inputs)
});
/**
* | output |
* | --- |
* | "The channel's queue is empty." |
*
* @param {Issue_Queue_EmptyInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const issue_queue_empty = /** @type {((inputs?: Issue_Queue_EmptyInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Issue_Queue_EmptyInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.issue_queue_empty(inputs)
	if (locale === "cs") return __cs.issue_queue_empty(inputs)
	return __en.issue_queue_empty(inputs)
});
/**
* | output |
* | --- |
* | "No free queue slot in the next 8 weeks." |
*
* @param {Issue_Queue_FullInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const issue_queue_full = /** @type {((inputs?: Issue_Queue_FullInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Issue_Queue_FullInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.issue_queue_full(inputs)
	if (locale === "cs") return __cs.issue_queue_full(inputs)
	return __en.issue_queue_full(inputs)
});
/**
* | output |
* | --- |
* | "The video's resolution is too high for this network." |
*
* @param {Issue_Resolution_Too_HighInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const issue_resolution_too_high = /** @type {((inputs?: Issue_Resolution_Too_HighInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Issue_Resolution_Too_HighInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.issue_resolution_too_high(inputs)
	if (locale === "cs") return __cs.issue_resolution_too_high(inputs)
	return __en.issue_resolution_too_high(inputs)
});
/**
* | output |
* | --- |
* | "The text is too long for this network." |
*
* @param {Issue_Text_Too_LongInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const issue_text_too_long = /** @type {((inputs?: Issue_Text_Too_LongInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Issue_Text_Too_LongInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.issue_text_too_long(inputs)
	if (locale === "cs") return __cs.issue_text_too_long(inputs)
	return __en.issue_text_too_long(inputs)
});
/**
* | output |
* | --- |
* | "This kind of post needs more images on this network." |
*
* @param {Issue_Too_Few_MediaInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const issue_too_few_media = /** @type {((inputs?: Issue_Too_Few_MediaInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Issue_Too_Few_MediaInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.issue_too_few_media(inputs)
	if (locale === "cs") return __cs.issue_too_few_media(inputs)
	return __en.issue_too_few_media(inputs)
});
/**
* | output |
* | --- |
* | "The post is too large." |
*
* @param {Issue_Too_LargeInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const issue_too_large = /** @type {((inputs?: Issue_Too_LargeInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Issue_Too_LargeInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.issue_too_large(inputs)
	if (locale === "cs") return __cs.issue_too_large(inputs)
	return __en.issue_too_large(inputs)
});
/**
* | output |
* | --- |
* | "There are too many links for this network." |
*
* @param {Issue_Too_Many_LinksInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const issue_too_many_links = /** @type {((inputs?: Issue_Too_Many_LinksInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Issue_Too_Many_LinksInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.issue_too_many_links(inputs)
	if (locale === "cs") return __cs.issue_too_many_links(inputs)
	return __en.issue_too_many_links(inputs)
});
/**
* | output |
* | --- |
* | "There are too many images for this network." |
*
* @param {Issue_Too_Many_MediaInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const issue_too_many_media = /** @type {((inputs?: Issue_Too_Many_MediaInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Issue_Too_Many_MediaInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.issue_too_many_media(inputs)
	if (locale === "cs") return __cs.issue_too_many_media(inputs)
	return __en.issue_too_many_media(inputs)
});
/**
* | output |
* | --- |
* | "The network doesn't know this kind of post." |
*
* @param {Issue_Unknown_Post_TypeInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const issue_unknown_post_type = /** @type {((inputs?: Issue_Unknown_Post_TypeInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Issue_Unknown_Post_TypeInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.issue_unknown_post_type(inputs)
	if (locale === "cs") return __cs.issue_unknown_post_type(inputs)
	return __en.issue_unknown_post_type(inputs)
});
/**
* | output |
* | --- |
* | "Loading…" |
*
* @param {LoadingInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const loading = /** @type {((inputs?: LoadingInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<LoadingInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.loading(inputs)
	if (locale === "cs") return __cs.loading(inputs)
	return __en.loading(inputs)
});
/**
* | output |
* | --- |
* | "Čeština" |
*
* @param {Locale_CsInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const locale_cs = /** @type {((inputs?: Locale_CsInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Locale_CsInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.locale_cs(inputs)
	if (locale === "cs") return __cs.locale_cs(inputs)
	return __en.locale_cs(inputs)
});
/**
* | output |
* | --- |
* | "English" |
*
* @param {Locale_EnInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const locale_en = /** @type {((inputs?: Locale_EnInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Locale_EnInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.locale_en(inputs)
	if (locale === "cs") return __cs.locale_en(inputs)
	return __en.locale_en(inputs)
});
/**
* | output |
* | --- |
* | "Language" |
*
* @param {Locale_LabelInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const locale_label = /** @type {((inputs?: Locale_LabelInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Locale_LabelInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.locale_label(inputs)
	if (locale === "cs") return __cs.locale_label(inputs)
	return __en.locale_label(inputs)
});
/**
* | output |
* | --- |
* | "Your language wasn't saved. Try again." |
*
* @param {Locale_Save_FailedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const locale_save_failed = /** @type {((inputs?: Locale_Save_FailedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Locale_Save_FailedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.locale_save_failed(inputs)
	if (locale === "cs") return __cs.locale_save_failed(inputs)
	return __en.locale_save_failed(inputs)
});
/**
* | output |
* | --- |
* | "Slovenčina" |
*
* @param {Locale_SkInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const locale_sk = /** @type {((inputs?: Locale_SkInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Locale_SkInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.locale_sk(inputs)
	if (locale === "cs") return __cs.locale_sk(inputs)
	return __en.locale_sk(inputs)
});
/**
* | output |
* | --- |
* | "Email" |
*
* @param {Login_EmailInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const login_email = /** @type {((inputs?: Login_EmailInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Login_EmailInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.login_email(inputs)
	if (locale === "cs") return __cs.login_email(inputs)
	return __en.login_email(inputs)
});
/**
* | output |
* | --- |
* | "Password" |
*
* @param {Login_PasswordInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const login_password = /** @type {((inputs?: Login_PasswordInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Login_PasswordInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.login_password(inputs)
	if (locale === "cs") return __cs.login_password(inputs)
	return __en.login_password(inputs)
});
/**
* | output |
* | --- |
* | "Your password is set. Sign in with it now." |
*
* @param {Login_Password_SetInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const login_password_set = /** @type {((inputs?: Login_Password_SetInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Login_Password_SetInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.login_password_set(inputs)
	if (locale === "cs") return __cs.login_password_set(inputs)
	return __en.login_password_set(inputs)
});
/**
* | output |
* | --- |
* | "Your session has expired. Sign in again." |
*
* @param {Login_Session_ExpiredInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const login_session_expired = /** @type {((inputs?: Login_Session_ExpiredInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Login_Session_ExpiredInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.login_session_expired(inputs)
	if (locale === "cs") return __cs.login_session_expired(inputs)
	return __en.login_session_expired(inputs)
});
/**
* | output |
* | --- |
* | "Sign in" |
*
* @param {Login_SubmitInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const login_submit = /** @type {((inputs?: Login_SubmitInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Login_SubmitInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.login_submit(inputs)
	if (locale === "cs") return __cs.login_submit(inputs)
	return __en.login_submit(inputs)
});
/**
* | output |
* | --- |
* | "Signing in…" |
*
* @param {Login_SubmittingInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const login_submitting = /** @type {((inputs?: Login_SubmittingInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Login_SubmittingInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.login_submitting(inputs)
	if (locale === "cs") return __cs.login_submitting(inputs)
	return __en.login_submitting(inputs)
});
/**
* | output |
* | --- |
* | "Plan and publish your posts from one place." |
*
* @param {Login_SubtitleInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const login_subtitle = /** @type {((inputs?: Login_SubtitleInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Login_SubtitleInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.login_subtitle(inputs)
	if (locale === "cs") return __cs.login_subtitle(inputs)
	return __en.login_subtitle(inputs)
});
/**
* | output |
* | --- |
* | "Sign in" |
*
* @param {Login_TitleInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const login_title = /** @type {((inputs?: Login_TitleInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Login_TitleInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.login_title(inputs)
	if (locale === "cs") return __cs.login_title(inputs)
	return __en.login_title(inputs)
});
/**
* | countPlural | output |
* | --- | --- |
* | "one" | "Done. Kronaut deleted the data of {count} channel." |
* | * | "Done. Kronaut deleted the data of {count} channels." |
*
* @param {Meta_Status_CompletedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const meta_status_completed = /** @type {((inputs: Meta_Status_CompletedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Meta_Status_CompletedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.meta_status_completed(inputs)
	if (locale === "cs") return __cs.meta_status_completed(inputs)
	return __en.meta_status_completed(inputs)
});
/**
* | output |
* | --- |
* | "Kronaut found no channel linked to this Meta account. A channel connected before this feature existed can't be matched: its workspace owner can disconnect it..." |
*
* @param {Meta_Status_NoneInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const meta_status_none = /** @type {((inputs?: Meta_Status_NoneInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Meta_Status_NoneInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.meta_status_none(inputs)
	if (locale === "cs") return __cs.meta_status_none(inputs)
	return __en.meta_status_none(inputs)
});
/**
* | output |
* | --- |
* | "Kronaut received your request and is deleting your data." |
*
* @param {Meta_Status_ReceivedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const meta_status_received = /** @type {((inputs?: Meta_Status_ReceivedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Meta_Status_ReceivedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.meta_status_received(inputs)
	if (locale === "cs") return __cs.meta_status_received(inputs)
	return __en.meta_status_received(inputs)
});
/**
* | output |
* | --- |
* | "Unknown confirmation code." |
*
* @param {Meta_Status_UnknownInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const meta_status_unknown = /** @type {((inputs?: Meta_Status_UnknownInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Meta_Status_UnknownInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.meta_status_unknown(inputs)
	if (locale === "cs") return __cs.meta_status_unknown(inputs)
	return __en.meta_status_unknown(inputs)
});
/**
* | output |
* | --- |
* | "Channels" |
*
* @param {Nav_ChannelsInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const nav_channels = /** @type {((inputs?: Nav_ChannelsInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Nav_ChannelsInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.nav_channels(inputs)
	if (locale === "cs") return __cs.nav_channels(inputs)
	return __en.nav_channels(inputs)
});
/**
* | output |
* | --- |
* | "Needs action" |
*
* @param {Nav_InboxInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const nav_inbox = /** @type {((inputs?: Nav_InboxInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Nav_InboxInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.nav_inbox(inputs)
	if (locale === "cs") return __cs.nav_inbox(inputs)
	return __en.nav_inbox(inputs)
});
/**
* | output |
* | --- |
* | "Main" |
*
* @param {Nav_LabelInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const nav_label = /** @type {((inputs?: Nav_LabelInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Nav_LabelInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.nav_label(inputs)
	if (locale === "cs") return __cs.nav_label(inputs)
	return __en.nav_label(inputs)
});
/**
* | output |
* | --- |
* | "Media" |
*
* @param {Nav_MediaInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const nav_media = /** @type {((inputs?: Nav_MediaInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Nav_MediaInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.nav_media(inputs)
	if (locale === "cs") return __cs.nav_media(inputs)
	return __en.nav_media(inputs)
});
/**
* | output |
* | --- |
* | "Go to the start page" |
*
* @param {Not_Found_BackInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const not_found_back = /** @type {((inputs?: Not_Found_BackInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Not_Found_BackInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.not_found_back(inputs)
	if (locale === "cs") return __cs.not_found_back(inputs)
	return __en.not_found_back(inputs)
});
/**
* | output |
* | --- |
* | "Page not found" |
*
* @param {Not_Found_TitleInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const not_found_title = /** @type {((inputs?: Not_Found_TitleInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Not_Found_TitleInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.not_found_title(inputs)
	if (locale === "cs") return __cs.not_found_title(inputs)
	return __en.not_found_title(inputs)
});
/**
* | output |
* | --- |
* | "A post is waiting for your approval" |
*
* @param {Notification_Approval_RequestedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const notification_approval_requested = /** @type {((inputs?: Notification_Approval_RequestedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Notification_Approval_RequestedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.notification_approval_requested(inputs)
	if (locale === "cs") return __cs.notification_approval_requested(inputs)
	return __en.notification_approval_requested(inputs)
});
/**
* | output |
* | --- |
* | "Your post was approved" |
*
* @param {Notification_ApprovedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const notification_approved = /** @type {((inputs?: Notification_ApprovedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Notification_ApprovedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.notification_approved(inputs)
	if (locale === "cs") return __cs.notification_approved(inputs)
	return __en.notification_approved(inputs)
});
/**
* | output |
* | --- |
* | "Ready for you to post on {account}" |
*
* @param {Notification_Awaiting_ManualInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const notification_awaiting_manual = /** @type {((inputs: Notification_Awaiting_ManualInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Notification_Awaiting_ManualInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.notification_awaiting_manual(inputs)
	if (locale === "cs") return __cs.notification_awaiting_manual(inputs)
	return __en.notification_awaiting_manual(inputs)
});
/**
* | output |
* | --- |
* | "{account} needs reconnecting soon" |
*
* @param {Notification_ExpiringInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const notification_expiring = /** @type {((inputs: Notification_ExpiringInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Notification_ExpiringInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.notification_expiring(inputs)
	if (locale === "cs") return __cs.notification_expiring(inputs)
	return __en.notification_expiring(inputs)
});
/**
* | output |
* | --- |
* | "Couldn't publish to {account}" |
*
* @param {Notification_FailedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const notification_failed = /** @type {((inputs: Notification_FailedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Notification_FailedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.notification_failed(inputs)
	if (locale === "cs") return __cs.notification_failed(inputs)
	return __en.notification_failed(inputs)
});
/**
* | output |
* | --- |
* | "Something needs your attention" |
*
* @param {Notification_GenericInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const notification_generic = /** @type {((inputs?: Notification_GenericInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Notification_GenericInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.notification_generic(inputs)
	if (locale === "cs") return __cs.notification_generic(inputs)
	return __en.notification_generic(inputs)
});
/**
* | output |
* | --- |
* | "{account} needs reconnecting" |
*
* @param {Notification_Needs_ReauthInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const notification_needs_reauth = /** @type {((inputs: Notification_Needs_ReauthInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Notification_Needs_ReauthInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.notification_needs_reauth(inputs)
	if (locale === "cs") return __cs.notification_needs_reauth(inputs)
	return __en.notification_needs_reauth(inputs)
});
/**
* | output |
* | --- |
* | "Your post was rejected" |
*
* @param {Notification_RejectedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const notification_rejected = /** @type {((inputs?: Notification_RejectedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Notification_RejectedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.notification_rejected(inputs)
	if (locale === "cs") return __cs.notification_rejected(inputs)
	return __en.notification_rejected(inputs)
});
/**
* | output |
* | --- |
* | "Not sure it was posted to {account}" |
*
* @param {Notification_UnconfirmedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const notification_unconfirmed = /** @type {((inputs: Notification_UnconfirmedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Notification_UnconfirmedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.notification_unconfirmed(inputs)
	if (locale === "cs") return __cs.notification_unconfirmed(inputs)
	return __en.notification_unconfirmed(inputs)
});
/**
* | countPlural | output |
* | --- | --- |
* | "one" | "Notifications, {count} unread" |
* | * | "Notifications, {count} unread" |
*
* @param {Notifications_ButtonInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const notifications_button = /** @type {((inputs: Notifications_ButtonInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Notifications_ButtonInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.notifications_button(inputs)
	if (locale === "cs") return __cs.notifications_button(inputs)
	return __en.notifications_button(inputs)
});
/**
* | output |
* | --- |
* | "You're all caught up" |
*
* @param {Notifications_EmptyInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const notifications_empty = /** @type {((inputs?: Notifications_EmptyInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Notifications_EmptyInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.notifications_empty(inputs)
	if (locale === "cs") return __cs.notifications_empty(inputs)
	return __en.notifications_empty(inputs)
});
/**
* | output |
* | --- |
* | "Mark all as read" |
*
* @param {Notifications_Mark_AllInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const notifications_mark_all = /** @type {((inputs?: Notifications_Mark_AllInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Notifications_Mark_AllInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.notifications_mark_all(inputs)
	if (locale === "cs") return __cs.notifications_mark_all(inputs)
	return __en.notifications_mark_all(inputs)
});
/**
* | output |
* | --- |
* | "Couldn't mark them as read. Try again." |
*
* @param {Notifications_Mark_FailedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const notifications_mark_failed = /** @type {((inputs?: Notifications_Mark_FailedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Notifications_Mark_FailedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.notifications_mark_failed(inputs)
	if (locale === "cs") return __cs.notifications_mark_failed(inputs)
	return __en.notifications_mark_failed(inputs)
});
/**
* | output |
* | --- |
* | "Older unread notifications are in Needs action." |
*
* @param {Notifications_OlderInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const notifications_older = /** @type {((inputs?: Notifications_OlderInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Notifications_OlderInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.notifications_older(inputs)
	if (locale === "cs") return __cs.notifications_older(inputs)
	return __en.notifications_older(inputs)
});
/**
* | output |
* | --- |
* | "Notifications" |
*
* @param {Notifications_TitleInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const notifications_title = /** @type {((inputs?: Notifications_TitleInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Notifications_TitleInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.notifications_title(inputs)
	if (locale === "cs") return __cs.notifications_title(inputs)
	return __en.notifications_title(inputs)
});
/**
* | output |
* | --- |
* | "Unread" |
*
* @param {Notifications_UnreadInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const notifications_unread = /** @type {((inputs?: Notifications_UnreadInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Notifications_UnreadInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.notifications_unread(inputs)
	if (locale === "cs") return __cs.notifications_unread(inputs)
	return __en.notifications_unread(inputs)
});
/**
* | countPlural | output |
* | --- | --- |
* | "one" | "Use at least {count} character." |
* | * | "Use at least {count} characters." |
*
* @param {Password_Min_LengthInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const password_min_length = /** @type {((inputs: Password_Min_LengthInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Password_Min_LengthInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.password_min_length(inputs)
	if (locale === "cs") return __cs.password_min_length(inputs)
	return __en.password_min_length(inputs)
});
/**
* | output |
* | --- |
* | "This password is too long." |
*
* @param {Password_Too_LongInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const password_too_long = /** @type {((inputs?: Password_Too_LongInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Password_Too_LongInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.password_too_long(inputs)
	if (locale === "cs") return __cs.password_too_long(inputs)
	return __en.password_too_long(inputs)
});
/**
* | output |
* | --- |
* | "Text customized for this channel" |
*
* @param {Post_CustomizedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const post_customized = /** @type {((inputs?: Post_CustomizedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Post_CustomizedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.post_customized(inputs)
	if (locale === "cs") return __cs.post_customized(inputs)
	return __en.post_customized(inputs)
});
/**
* | output |
* | --- |
* | "Channels" |
*
* @param {Post_Destinations_TitleInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const post_destinations_title = /** @type {((inputs?: Post_Destinations_TitleInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Post_Destinations_TitleInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.post_destinations_title(inputs)
	if (locale === "cs") return __cs.post_destinations_title(inputs)
	return __en.post_destinations_title(inputs)
});
/**
* | countPlural | output |
* | --- | --- |
* | "one" | "{count} image" |
* | * | "{count} images" |
*
* @param {Post_ImagesInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const post_images = /** @type {((inputs: Post_ImagesInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Post_ImagesInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.post_images(inputs)
	if (locale === "cs") return __cs.post_images(inputs)
	return __en.post_images(inputs)
});
/**
* | output |
* | --- |
* | "This post couldn't be loaded." |
*
* @param {Post_Not_FoundInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const post_not_found = /** @type {((inputs?: Post_Not_FoundInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Post_Not_FoundInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.post_not_found(inputs)
	if (locale === "cs") return __cs.post_not_found(inputs)
	return __en.post_not_found(inputs)
});
/**
* | output |
* | --- |
* | "Published {when}" |
*
* @param {Post_Published_AtInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const post_published_at = /** @type {((inputs: Post_Published_AtInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Post_Published_AtInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.post_published_at(inputs)
	if (locale === "cs") return __cs.post_published_at(inputs)
	return __en.post_published_at(inputs)
});
/**
* | output |
* | --- |
* | "As soon as possible" |
*
* @param {Post_Schedule_AsapInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const post_schedule_asap = /** @type {((inputs?: Post_Schedule_AsapInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Post_Schedule_AsapInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.post_schedule_asap(inputs)
	if (locale === "cs") return __cs.post_schedule_asap(inputs)
	return __en.post_schedule_asap(inputs)
});
/**
* | output |
* | --- |
* | "Scheduled for {when}" |
*
* @param {Post_Schedule_AtInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const post_schedule_at = /** @type {((inputs: Post_Schedule_AtInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Post_Schedule_AtInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.post_schedule_at(inputs)
	if (locale === "cs") return __cs.post_schedule_at(inputs)
	return __en.post_schedule_at(inputs)
});
/**
* | output |
* | --- |
* | "Scheduled for {when} ({tz})" |
*
* @param {Post_Schedule_At_TzInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const post_schedule_at_tz = /** @type {((inputs: Post_Schedule_At_TzInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Post_Schedule_At_TzInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.post_schedule_at_tz(inputs)
	if (locale === "cs") return __cs.post_schedule_at_tz(inputs)
	return __en.post_schedule_at_tz(inputs)
});
/**
* | output |
* | --- |
* | "Not scheduled" |
*
* @param {Post_Schedule_NoneInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const post_schedule_none = /** @type {((inputs?: Post_Schedule_NoneInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Post_Schedule_NoneInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.post_schedule_none(inputs)
	if (locale === "cs") return __cs.post_schedule_none(inputs)
	return __en.post_schedule_none(inputs)
});
/**
* | output |
* | --- |
* | "Due {when}" |
*
* @param {Post_Scheduled_AtInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const post_scheduled_at = /** @type {((inputs: Post_Scheduled_AtInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Post_Scheduled_AtInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.post_scheduled_at(inputs)
	if (locale === "cs") return __cs.post_scheduled_at(inputs)
	return __en.post_scheduled_at(inputs)
});
/**
* | output |
* | --- |
* | "Canceled" |
*
* @param {Post_Summary_CanceledInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const post_summary_canceled = /** @type {((inputs?: Post_Summary_CanceledInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Post_Summary_CanceledInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.post_summary_canceled(inputs)
	if (locale === "cs") return __cs.post_summary_canceled(inputs)
	return __en.post_summary_canceled(inputs)
});
/**
* | output |
* | --- |
* | "Published" |
*
* @param {Post_Summary_Completed_AllInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const post_summary_completed_all = /** @type {((inputs?: Post_Summary_Completed_AllInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Post_Summary_Completed_AllInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.post_summary_completed_all(inputs)
	if (locale === "cs") return __cs.post_summary_completed_all(inputs)
	return __en.post_summary_completed_all(inputs)
});
/**
* | output |
* | --- |
* | "Not published" |
*
* @param {Post_Summary_Completed_FailedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const post_summary_completed_failed = /** @type {((inputs?: Post_Summary_Completed_FailedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Post_Summary_Completed_FailedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.post_summary_completed_failed(inputs)
	if (locale === "cs") return __cs.post_summary_completed_failed(inputs)
	return __en.post_summary_completed_failed(inputs)
});
/**
* | output |
* | --- |
* | "Partly published" |
*
* @param {Post_Summary_Completed_PartialInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const post_summary_completed_partial = /** @type {((inputs?: Post_Summary_Completed_PartialInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Post_Summary_Completed_PartialInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.post_summary_completed_partial(inputs)
	if (locale === "cs") return __cs.post_summary_completed_partial(inputs)
	return __en.post_summary_completed_partial(inputs)
});
/**
* | output |
* | --- |
* | "Draft" |
*
* @param {Post_Summary_DraftInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const post_summary_draft = /** @type {((inputs?: Post_Summary_DraftInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Post_Summary_DraftInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.post_summary_draft(inputs)
	if (locale === "cs") return __cs.post_summary_draft(inputs)
	return __en.post_summary_draft(inputs)
});
/**
* | output |
* | --- |
* | "Publishing" |
*
* @param {Post_Summary_In_ProgressInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const post_summary_in_progress = /** @type {((inputs?: Post_Summary_In_ProgressInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Post_Summary_In_ProgressInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.post_summary_in_progress(inputs)
	if (locale === "cs") return __cs.post_summary_in_progress(inputs)
	return __en.post_summary_in_progress(inputs)
});
/**
* | output |
* | --- |
* | "In review" |
*
* @param {Post_Summary_In_ReviewInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const post_summary_in_review = /** @type {((inputs?: Post_Summary_In_ReviewInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Post_Summary_In_ReviewInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.post_summary_in_review(inputs)
	if (locale === "cs") return __cs.post_summary_in_review(inputs)
	return __en.post_summary_in_review(inputs)
});
/**
* | output |
* | --- |
* | "Needs action" |
*
* @param {Post_Summary_Needs_ActionInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const post_summary_needs_action = /** @type {((inputs?: Post_Summary_Needs_ActionInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Post_Summary_Needs_ActionInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.post_summary_needs_action(inputs)
	if (locale === "cs") return __cs.post_summary_needs_action(inputs)
	return __en.post_summary_needs_action(inputs)
});
/**
* | output |
* | --- |
* | "Scheduled" |
*
* @param {Post_Summary_ScheduledInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const post_summary_scheduled = /** @type {((inputs?: Post_Summary_ScheduledInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Post_Summary_ScheduledInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.post_summary_scheduled(inputs)
	if (locale === "cs") return __cs.post_summary_scheduled(inputs)
	return __en.post_summary_scheduled(inputs)
});
/**
* | output |
* | --- |
* | "Post" |
*
* @param {Post_TitleInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const post_title = /** @type {((inputs?: Post_TitleInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Post_TitleInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.post_title(inputs)
	if (locale === "cs") return __cs.post_title(inputs)
	return __en.post_title(inputs)
});
/**
* | output |
* | --- |
* | "View post" |
*
* @param {Post_ViewInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const post_view = /** @type {((inputs?: Post_ViewInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Post_ViewInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.post_view(inputs)
	if (locale === "cs") return __cs.post_view(inputs)
	return __en.post_view(inputs)
});
/**
* | output |
* | --- |
* | "Bluesky" |
*
* @param {Provider_BlueskyInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const provider_bluesky = /** @type {((inputs?: Provider_BlueskyInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Provider_BlueskyInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.provider_bluesky(inputs)
	if (locale === "cs") return __cs.provider_bluesky(inputs)
	return __en.provider_bluesky(inputs)
});
/**
* | output |
* | --- |
* | "Facebook" |
*
* @param {Provider_FacebookInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const provider_facebook = /** @type {((inputs?: Provider_FacebookInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Provider_FacebookInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.provider_facebook(inputs)
	if (locale === "cs") return __cs.provider_facebook(inputs)
	return __en.provider_facebook(inputs)
});
/**
* | output |
* | --- |
* | "Instagram" |
*
* @param {Provider_InstagramInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const provider_instagram = /** @type {((inputs?: Provider_InstagramInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Provider_InstagramInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.provider_instagram(inputs)
	if (locale === "cs") return __cs.provider_instagram(inputs)
	return __en.provider_instagram(inputs)
});
/**
* | output |
* | --- |
* | "LinkedIn" |
*
* @param {Provider_LinkedinInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const provider_linkedin = /** @type {((inputs?: Provider_LinkedinInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Provider_LinkedinInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.provider_linkedin(inputs)
	if (locale === "cs") return __cs.provider_linkedin(inputs)
	return __en.provider_linkedin(inputs)
});
/**
* | output |
* | --- |
* | "Mastodon" |
*
* @param {Provider_MastodonInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const provider_mastodon = /** @type {((inputs?: Provider_MastodonInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Provider_MastodonInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.provider_mastodon(inputs)
	if (locale === "cs") return __cs.provider_mastodon(inputs)
	return __en.provider_mastodon(inputs)
});
/**
* | output |
* | --- |
* | "Threads" |
*
* @param {Provider_ThreadsInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const provider_threads = /** @type {((inputs?: Provider_ThreadsInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Provider_ThreadsInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.provider_threads(inputs)
	if (locale === "cs") return __cs.provider_threads(inputs)
	return __en.provider_threads(inputs)
});
/**
* | output |
* | --- |
* | "Add time" |
*
* @param {Queue_AddInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const queue_add = /** @type {((inputs?: Queue_AddInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Queue_AddInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.queue_add(inputs)
	if (locale === "cs") return __cs.queue_add(inputs)
	return __en.queue_add(inputs)
});
/**
* | output |
* | --- |
* | "Free slots are filled from evergreen posts 24 h ahead." |
*
* @param {Queue_EvergreenInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const queue_evergreen = /** @type {((inputs?: Queue_EvergreenInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Queue_EvergreenInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.queue_evergreen(inputs)
	if (locale === "cs") return __cs.queue_evergreen(inputs)
	return __en.queue_evergreen(inputs)
});
/**
* | output |
* | --- |
* | "Queue saved." |
*
* @param {Queue_SavedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const queue_saved = /** @type {((inputs?: Queue_SavedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Queue_SavedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.queue_saved(inputs)
	if (locale === "cs") return __cs.queue_saved(inputs)
	return __en.queue_saved(inputs)
});
/**
* | output |
* | --- |
* | "Time zone" |
*
* @param {Queue_ZoneInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const queue_zone = /** @type {((inputs?: Queue_ZoneInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Queue_ZoneInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.queue_zone(inputs)
	if (locale === "cs") return __cs.queue_zone(inputs)
	return __en.queue_zone(inputs)
});
/**
* | output |
* | --- |
* | "The channel is disabled." |
*
* @param {Reason_Account_DisabledInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const reason_account_disabled = /** @type {((inputs?: Reason_Account_DisabledInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Reason_Account_DisabledInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.reason_account_disabled(inputs)
	if (locale === "cs") return __cs.reason_account_disabled(inputs)
	return __en.reason_account_disabled(inputs)
});
/**
* | output |
* | --- |
* | "The channel is disconnected." |
*
* @param {Reason_Account_DisconnectedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const reason_account_disconnected = /** @type {((inputs?: Reason_Account_DisconnectedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Reason_Account_DisconnectedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.reason_account_disconnected(inputs)
	if (locale === "cs") return __cs.reason_account_disconnected(inputs)
	return __en.reason_account_disconnected(inputs)
});
/**
* | output |
* | --- |
* | "The channel needs reconnecting." |
*
* @param {Reason_Account_Needs_ReauthInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const reason_account_needs_reauth = /** @type {((inputs?: Reason_Account_Needs_ReauthInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Reason_Account_Needs_ReauthInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.reason_account_needs_reauth(inputs)
	if (locale === "cs") return __cs.reason_account_needs_reauth(inputs)
	return __en.reason_account_needs_reauth(inputs)
});
/**
* | output |
* | --- |
* | "You no longer have access to this channel." |
*
* @param {Reason_Account_Out_Of_ScopeInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const reason_account_out_of_scope = /** @type {((inputs?: Reason_Account_Out_Of_ScopeInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Reason_Account_Out_Of_ScopeInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.reason_account_out_of_scope(inputs)
	if (locale === "cs") return __cs.reason_account_out_of_scope(inputs)
	return __en.reason_account_out_of_scope(inputs)
});
/**
* | output |
* | --- |
* | "The network's answer was unclear. It may be live." |
*
* @param {Reason_Ambiguous_ResponseInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const reason_ambiguous_response = /** @type {((inputs?: Reason_Ambiguous_ResponseInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Reason_Ambiguous_ResponseInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.reason_ambiguous_response(inputs)
	if (locale === "cs") return __cs.reason_ambiguous_response(inputs)
	return __en.reason_ambiguous_response(inputs)
});
/**
* | output |
* | --- |
* | "This network isn't set up correctly on this server. Ask the server admin." |
*
* @param {Reason_App_Credentials_InvalidInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const reason_app_credentials_invalid = /** @type {((inputs?: Reason_App_Credentials_InvalidInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Reason_App_Credentials_InvalidInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.reason_app_credentials_invalid(inputs)
	if (locale === "cs") return __cs.reason_app_credentials_invalid(inputs)
	return __en.reason_app_credentials_invalid(inputs)
});
/**
* | output |
* | --- |
* | "The network never finished publishing it." |
*
* @param {Reason_Async_Give_UpInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const reason_async_give_up = /** @type {((inputs?: Reason_Async_Give_UpInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Reason_Async_Give_UpInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.reason_async_give_up(inputs)
	if (locale === "cs") return __cs.reason_async_give_up(inputs)
	return __en.reason_async_give_up(inputs)
});
/**
* | output |
* | --- |
* | "It failed after several tries." |
*
* @param {Reason_Attempts_ExhaustedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const reason_attempts_exhausted = /** @type {((inputs?: Reason_Attempts_ExhaustedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Reason_Attempts_ExhaustedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.reason_attempts_exhausted(inputs)
	if (locale === "cs") return __cs.reason_attempts_exhausted(inputs)
	return __en.reason_attempts_exhausted(inputs)
});
/**
* | output |
* | --- |
* | "Your plan's limit is reached." |
*
* @param {Reason_Entitlement_ExceededInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const reason_entitlement_exceeded = /** @type {((inputs?: Reason_Entitlement_ExceededInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Reason_Entitlement_ExceededInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.reason_entitlement_exceeded(inputs)
	if (locale === "cs") return __cs.reason_entitlement_exceeded(inputs)
	return __en.reason_entitlement_exceeded(inputs)
});
/**
* | output |
* | --- |
* | "It needs your attention." |
*
* @param {Reason_GenericInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const reason_generic = /** @type {((inputs?: Reason_GenericInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Reason_GenericInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.reason_generic(inputs)
	if (locale === "cs") return __cs.reason_generic(inputs)
	return __en.reason_generic(inputs)
});
/**
* | output |
* | --- |
* | "Sending stopped after it went out. It may be live." |
*
* @param {Reason_Interrupted_After_SendInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const reason_interrupted_after_send = /** @type {((inputs?: Reason_Interrupted_After_SendInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Reason_Interrupted_After_SendInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.reason_interrupted_after_send(inputs)
	if (locale === "cs") return __cs.reason_interrupted_after_send(inputs)
	return __en.reason_interrupted_after_send(inputs)
});
/**
* | output |
* | --- |
* | "It was too late to send it." |
*
* @param {Reason_Late_Window_ExceededInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const reason_late_window_exceeded = /** @type {((inputs?: Reason_Late_Window_ExceededInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Reason_Late_Window_ExceededInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.reason_late_window_exceeded(inputs)
	if (locale === "cs") return __cs.reason_late_window_exceeded(inputs)
	return __en.reason_late_window_exceeded(inputs)
});
/**
* | output |
* | --- |
* | "The network took too long to process the media." |
*
* @param {Reason_Media_Processing_TimeoutInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const reason_media_processing_timeout = /** @type {((inputs?: Reason_Media_Processing_TimeoutInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Reason_Media_Processing_TimeoutInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.reason_media_processing_timeout(inputs)
	if (locale === "cs") return __cs.reason_media_processing_timeout(inputs)
	return __en.reason_media_processing_timeout(inputs)
});
/**
* | output |
* | --- |
* | "The network rejected it." |
*
* @param {Reason_Permanent_ErrorInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const reason_permanent_error = /** @type {((inputs?: Reason_Permanent_ErrorInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Reason_Permanent_ErrorInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.reason_permanent_error(inputs)
	if (locale === "cs") return __cs.reason_permanent_error(inputs)
	return __en.reason_permanent_error(inputs)
});
/**
* | output |
* | --- |
* | "A workspace rule doesn't allow it." |
*
* @param {Reason_Policy_DeniedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const reason_policy_denied = /** @type {((inputs?: Reason_Policy_DeniedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Reason_Policy_DeniedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.reason_policy_denied(inputs)
	if (locale === "cs") return __cs.reason_policy_denied(inputs)
	return __en.reason_policy_denied(inputs)
});
/**
* | output |
* | --- |
* | "The network's rate limit lasted past the deadline." |
*
* @param {Reason_Rate_Limit_Beyond_DeadlineInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const reason_rate_limit_beyond_deadline = /** @type {((inputs?: Reason_Rate_Limit_Beyond_DeadlineInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Reason_Rate_Limit_Beyond_DeadlineInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.reason_rate_limit_beyond_deadline(inputs)
	if (locale === "cs") return __cs.reason_rate_limit_beyond_deadline(inputs)
	return __en.reason_rate_limit_beyond_deadline(inputs)
});
/**
* | output |
* | --- |
* | "The channel's sign-in was lost. Reconnect it." |
*
* @param {Reason_Refresh_Token_LostInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const reason_refresh_token_lost = /** @type {((inputs?: Reason_Refresh_Token_LostInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Reason_Refresh_Token_LostInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.reason_refresh_token_lost(inputs)
	if (locale === "cs") return __cs.reason_refresh_token_lost(inputs)
	return __en.reason_refresh_token_lost(inputs)
});
/**
* | output |
* | --- |
* | "Held back after a restore. Check it before sending." |
*
* @param {Reason_Restore_QuarantineInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const reason_restore_quarantine = /** @type {((inputs?: Reason_Restore_QuarantineInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Reason_Restore_QuarantineInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.reason_restore_quarantine(inputs)
	if (locale === "cs") return __cs.reason_restore_quarantine(inputs)
	return __en.reason_restore_quarantine(inputs)
});
/**
* | output |
* | --- |
* | "The main post is live, but a reply or comment after it failed." |
*
* @param {Reason_Thread_IncompleteInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const reason_thread_incomplete = /** @type {((inputs?: Reason_Thread_IncompleteInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Reason_Thread_IncompleteInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.reason_thread_incomplete(inputs)
	if (locale === "cs") return __cs.reason_thread_incomplete(inputs)
	return __en.reason_thread_incomplete(inputs)
});
/**
* | output |
* | --- |
* | "It couldn't be checked whether it went live." |
*
* @param {Reason_Verify_InconclusiveInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const reason_verify_inconclusive = /** @type {((inputs?: Reason_Verify_InconclusiveInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Reason_Verify_InconclusiveInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.reason_verify_inconclusive(inputs)
	if (locale === "cs") return __cs.reason_verify_inconclusive(inputs)
	return __en.reason_verify_inconclusive(inputs)
});
/**
* | output |
* | --- |
* | "Checking took too long. It may be live." |
*
* @param {Reason_Verify_Window_ElapsedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const reason_verify_window_elapsed = /** @type {((inputs?: Reason_Verify_Window_ElapsedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Reason_Verify_Window_ElapsedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.reason_verify_window_elapsed(inputs)
	if (locale === "cs") return __cs.reason_verify_window_elapsed(inputs)
	return __en.reason_verify_window_elapsed(inputs)
});
/**
* | output |
* | --- |
* | "After a number of posts" |
*
* @param {Repeat_AfterInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const repeat_after = /** @type {((inputs?: Repeat_AfterInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Repeat_AfterInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.repeat_after(inputs)
	if (locale === "cs") return __cs.repeat_after(inputs)
	return __en.repeat_after(inputs)
});
/**
* | output |
* | --- |
* | "Daily" |
*
* @param {Repeat_DailyInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const repeat_daily = /** @type {((inputs?: Repeat_DailyInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Repeat_DailyInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.repeat_daily(inputs)
	if (locale === "cs") return __cs.repeat_daily(inputs)
	return __en.repeat_daily(inputs)
});
/**
* | output |
* | --- |
* | "Ends" |
*
* @param {Repeat_EndsInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const repeat_ends = /** @type {((inputs?: Repeat_EndsInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Repeat_EndsInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.repeat_ends(inputs)
	if (locale === "cs") return __cs.repeat_ends(inputs)
	return __en.repeat_ends(inputs)
});
/**
* | output |
* | --- |
* | "Every" |
*
* @param {Repeat_EveryInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const repeat_every = /** @type {((inputs?: Repeat_EveryInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Repeat_EveryInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.repeat_every(inputs)
	if (locale === "cs") return __cs.repeat_every(inputs)
	return __en.repeat_every(inputs)
});
/**
* | output |
* | --- |
* | "Repeat" |
*
* @param {Repeat_LabelInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const repeat_label = /** @type {((inputs?: Repeat_LabelInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Repeat_LabelInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.repeat_label(inputs)
	if (locale === "cs") return __cs.repeat_label(inputs)
	return __en.repeat_label(inputs)
});
/**
* | output |
* | --- |
* | "Monthly" |
*
* @param {Repeat_MonthlyInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const repeat_monthly = /** @type {((inputs?: Repeat_MonthlyInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Repeat_MonthlyInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.repeat_monthly(inputs)
	if (locale === "cs") return __cs.repeat_monthly(inputs)
	return __en.repeat_monthly(inputs)
});
/**
* | output |
* | --- |
* | "Never" |
*
* @param {Repeat_NeverInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const repeat_never = /** @type {((inputs?: Repeat_NeverInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Repeat_NeverInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.repeat_never(inputs)
	if (locale === "cs") return __cs.repeat_never(inputs)
	return __en.repeat_never(inputs)
});
/**
* | output |
* | --- |
* | "On a date" |
*
* @param {Repeat_OnInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const repeat_on = /** @type {((inputs?: Repeat_OnInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Repeat_OnInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.repeat_on(inputs)
	if (locale === "cs") return __cs.repeat_on(inputs)
	return __en.repeat_on(inputs)
});
/**
* | output |
* | --- |
* | "Some networks reject the same text repeated within a week. Vary the text." |
*
* @param {Repeat_WarningInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const repeat_warning = /** @type {((inputs?: Repeat_WarningInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Repeat_WarningInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.repeat_warning(inputs)
	if (locale === "cs") return __cs.repeat_warning(inputs)
	return __en.repeat_warning(inputs)
});
/**
* | output |
* | --- |
* | "Weekly" |
*
* @param {Repeat_WeeklyInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const repeat_weekly = /** @type {((inputs?: Repeat_WeeklyInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Repeat_WeeklyInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.repeat_weekly(inputs)
	if (locale === "cs") return __cs.repeat_weekly(inputs)
	return __en.repeat_weekly(inputs)
});
/**
* | output |
* | --- |
* | "Repeat the password" |
*
* @param {Reset_ConfirmInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const reset_confirm = /** @type {((inputs?: Reset_ConfirmInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Reset_ConfirmInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.reset_confirm(inputs)
	if (locale === "cs") return __cs.reset_confirm(inputs)
	return __en.reset_confirm(inputs)
});
/**
* | output |
* | --- |
* | "This link is invalid or has expired. Ask for a new one." |
*
* @param {Reset_Invalid_LinkInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const reset_invalid_link = /** @type {((inputs?: Reset_Invalid_LinkInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Reset_Invalid_LinkInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.reset_invalid_link(inputs)
	if (locale === "cs") return __cs.reset_invalid_link(inputs)
	return __en.reset_invalid_link(inputs)
});
/**
* | output |
* | --- |
* | "The passwords don't match." |
*
* @param {Reset_MismatchInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const reset_mismatch = /** @type {((inputs?: Reset_MismatchInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Reset_MismatchInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.reset_mismatch(inputs)
	if (locale === "cs") return __cs.reset_mismatch(inputs)
	return __en.reset_mismatch(inputs)
});
/**
* | output |
* | --- |
* | "Open this page from the link you received." |
*
* @param {Reset_Missing_TokenInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const reset_missing_token = /** @type {((inputs?: Reset_Missing_TokenInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Reset_Missing_TokenInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.reset_missing_token(inputs)
	if (locale === "cs") return __cs.reset_missing_token(inputs)
	return __en.reset_missing_token(inputs)
});
/**
* | output |
* | --- |
* | "New password" |
*
* @param {Reset_PasswordInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const reset_password = /** @type {((inputs?: Reset_PasswordInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Reset_PasswordInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.reset_password(inputs)
	if (locale === "cs") return __cs.reset_password(inputs)
	return __en.reset_password(inputs)
});
/**
* | output |
* | --- |
* | "Set password" |
*
* @param {Reset_SubmitInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const reset_submit = /** @type {((inputs?: Reset_SubmitInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Reset_SubmitInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.reset_submit(inputs)
	if (locale === "cs") return __cs.reset_submit(inputs)
	return __en.reset_submit(inputs)
});
/**
* | output |
* | --- |
* | "Saving…" |
*
* @param {Reset_SubmittingInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const reset_submitting = /** @type {((inputs?: Reset_SubmittingInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Reset_SubmittingInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.reset_submitting(inputs)
	if (locale === "cs") return __cs.reset_submitting(inputs)
	return __en.reset_submitting(inputs)
});
/**
* | output |
* | --- |
* | "Choose a password for your Kronaut account." |
*
* @param {Reset_SubtitleInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const reset_subtitle = /** @type {((inputs?: Reset_SubtitleInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Reset_SubtitleInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.reset_subtitle(inputs)
	if (locale === "cs") return __cs.reset_subtitle(inputs)
	return __en.reset_subtitle(inputs)
});
/**
* | output |
* | --- |
* | "Set your password" |
*
* @param {Reset_TitleInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const reset_title = /** @type {((inputs?: Reset_TitleInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Reset_TitleInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.reset_title(inputs)
	if (locale === "cs") return __cs.reset_title(inputs)
	return __en.reset_title(inputs)
});
/**
* | countPlural | output |
* | --- | --- |
* | "one" | "Ends after {count} post" |
* | * | "Ends after {count} posts" |
*
* @param {Series_CountInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const series_count = /** @type {((inputs: Series_CountInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Series_CountInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.series_count(inputs)
	if (locale === "cs") return __cs.series_count(inputs)
	return __en.series_count(inputs)
});
/**
* | output |
* | --- |
* | "Next: {when} ({tz})" |
*
* @param {Series_NextInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const series_next = /** @type {((inputs: Series_NextInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Series_NextInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.series_next(inputs)
	if (locale === "cs") return __cs.series_next(inputs)
	return __en.series_next(inputs)
});
/**
* | output |
* | --- |
* | "Resume series" |
*
* @param {Series_ResumeInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const series_resume = /** @type {((inputs?: Series_ResumeInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Series_ResumeInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.series_resume(inputs)
	if (locale === "cs") return __cs.series_resume(inputs)
	return __en.series_resume(inputs)
});
/**
* | freq | countPlural | output |
* | --- | --- | --- |
* | "daily" | "one" | "Every day" |
* | "daily" | * | "Every {count} days" |
* | "weekly" | "one" | "Every week on {days}" |
* | "weekly" | * | "Every {count} weeks on {days}" |
* | * | "one" | "Every month on day {day}" |
* | * | * | "Every {count} months on day {day}" |
*
* @param {Series_RuleInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const series_rule = /** @type {((inputs: Series_RuleInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Series_RuleInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.series_rule(inputs)
	if (locale === "cs") return __cs.series_rule(inputs)
	return __en.series_rule(inputs)
});
/**
* | state | output |
* | --- | --- |
* | "paused" | "Paused: its owner can no longer schedule posts." |
* | "ended" | "The series has ended." |
* | "failed" | "Paused: a post couldn't be scheduled." |
* | * | "The series was stopped." |
*
* @param {Series_StateInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const series_state = /** @type {((inputs: Series_StateInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Series_StateInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.series_state(inputs)
	if (locale === "cs") return __cs.series_state(inputs)
	return __en.series_state(inputs)
});
/**
* | output |
* | --- |
* | "Stop series" |
*
* @param {Series_StopInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const series_stop = /** @type {((inputs?: Series_StopInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Series_StopInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.series_stop(inputs)
	if (locale === "cs") return __cs.series_stop(inputs)
	return __en.series_stop(inputs)
});
/**
* | output |
* | --- |
* | "Stop this series? Posts already created stay as they are." |
*
* @param {Series_Stop_BodyInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const series_stop_body = /** @type {((inputs?: Series_Stop_BodyInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Series_Stop_BodyInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.series_stop_body(inputs)
	if (locale === "cs") return __cs.series_stop_body(inputs)
	return __en.series_stop_body(inputs)
});
/**
* | output |
* | --- |
* | "Ends on {date}" |
*
* @param {Series_UntilInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const series_until = /** @type {((inputs: Series_UntilInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Series_UntilInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.series_until(inputs)
	if (locale === "cs") return __cs.series_until(inputs)
	return __en.series_until(inputs)
});
/**
* | output |
* | --- |
* | "Save" |
*
* @param {Settings_SaveInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_save = /** @type {((inputs?: Settings_SaveInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_SaveInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_save(inputs)
	if (locale === "cs") return __cs.settings_save(inputs)
	return __en.settings_save(inputs)
});
/**
* | output |
* | --- |
* | "Settings" |
*
* @param {Settings_TitleInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_title = /** @type {((inputs?: Settings_TitleInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_TitleInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_title(inputs)
	if (locale === "cs") return __cs.settings_title(inputs)
	return __en.settings_title(inputs)
});
/**
* | output |
* | --- |
* | "Technical details" |
*
* @param {Technical_DetailsInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const technical_details = /** @type {((inputs?: Technical_DetailsInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Technical_DetailsInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.technical_details(inputs)
	if (locale === "cs") return __cs.technical_details(inputs)
	return __en.technical_details(inputs)
});
/**
* | output |
* | --- |
* | "Theme: dark" |
*
* @param {Theme_DarkInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const theme_dark = /** @type {((inputs?: Theme_DarkInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Theme_DarkInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.theme_dark(inputs)
	if (locale === "cs") return __cs.theme_dark(inputs)
	return __en.theme_dark(inputs)
});
/**
* | output |
* | --- |
* | "Theme: light" |
*
* @param {Theme_LightInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const theme_light = /** @type {((inputs?: Theme_LightInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Theme_LightInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.theme_light(inputs)
	if (locale === "cs") return __cs.theme_light(inputs)
	return __en.theme_light(inputs)
});
/**
* | output |
* | --- |
* | "Theme: system" |
*
* @param {Theme_SystemInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const theme_system = /** @type {((inputs?: Theme_SystemInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Theme_SystemInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.theme_system(inputs)
	if (locale === "cs") return __cs.theme_system(inputs)
	return __en.theme_system(inputs)
});
/**
* | output |
* | --- |
* | "Workspace" |
*
* @param {Workspace_LabelInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const workspace_label = /** @type {((inputs?: Workspace_LabelInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Workspace_LabelInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.workspace_label(inputs)
	if (locale === "cs") return __cs.workspace_label(inputs)
	return __en.workspace_label(inputs)
});