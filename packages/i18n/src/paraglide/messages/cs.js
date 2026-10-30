/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Account_LogoutInputs */
/** @typedef {{}} Account_MenuInputs */
/** @typedef {{ when: NonNullable<unknown> }} Analytics_As_OfInputs */
/** @typedef {{ metric: NonNullable<unknown> }} Analytics_MetricInputs */
/** @typedef {{}} Analytics_MissingInputs */
/** @typedef {{}} Analytics_Not_ReportedInputs */
/** @typedef {{}} Analytics_TitleInputs */
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
/** @typedef {{}} Approval_Void_Post_DeletedInputs */
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
/** @typedef {{ value: NonNullable<unknown> }} Channels_FollowersInputs */
/** @typedef {{ change: NonNullable<unknown> }} Channels_Followers_ChangeInputs */
/** @typedef {{}} Channels_Handle_LabelInputs */
/** @typedef {{}} Channels_Handle_PlaceholderInputs */
/** @typedef {{}} Channels_Insights_ReconnectInputs */
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
/** @typedef {{}} CloseInputs */
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
/** @typedef {{}} Compose_Save_DraftInputs */
/** @typedef {{}} Compose_Saving_DraftInputs */
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
/** @typedef {{}} Post_Action_DeleteInputs */
/** @typedef {{}} Post_Action_DuplicateInputs */
/** @typedef {{}} Post_Action_EditInputs */
/** @typedef {{}} Post_Action_StatsInputs */
/** @typedef {{}} Post_CustomizedInputs */
/** @typedef {{}} Post_Delete_BodyInputs */
/** @typedef {{}} Post_Delete_ConfirmInputs */
/** @typedef {{}} Post_Delete_ForbiddenInputs */
/** @typedef {{}} Post_Delete_KeepInputs */
/** @typedef {{}} Post_Delete_LiveInputs */
/** @typedef {{ count: NonNullable<unknown> }} Post_Delete_PublishedInputs */
/** @typedef {{}} Post_Delete_TitleInputs */
/** @typedef {{ count: NonNullable<unknown> }} Post_Delete_UnconfirmedInputs */
/** @typedef {{}} Post_DeletedInputs */
/** @typedef {{}} Post_Destinations_TitleInputs */
/** @typedef {{}} Post_Discard_BodyInputs */
/** @typedef {{}} Post_Discard_ConfirmInputs */
/** @typedef {{}} Post_Discard_KeepInputs */
/** @typedef {{}} Post_Discard_TitleInputs */
/** @typedef {{}} Post_Edit_TitleInputs */
/** @typedef {{ count: NonNullable<unknown> }} Post_ImagesInputs */
/** @typedef {{}} Post_New_TitleInputs */
/** @typedef {{}} Post_Not_FoundInputs */
/** @typedef {{}} Post_Preview_EmptyInputs */
/** @typedef {{}} Post_Preview_TitleInputs */
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
import * as registry from "../registry.js"


export const account_logout = /** @type {(inputs: Account_LogoutInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Odhlásit se`)
};

export const account_menu = /** @type {(inputs: Account_MenuInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Účet`)
};

export const analytics_as_of = /** @type {(inputs: Analytics_As_OfInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Stav k ${i?.when}`)
};

export const analytics_metric = /** @type {(inputs: Analytics_MetricInputs) => LocalizedString} */ (i) => {
	if (i?.metric === "likes") return /** @type {LocalizedString} */ (`Líbí se mi`);
	if (i?.metric === "reposts") return /** @type {LocalizedString} */ (`Reposty`);
	if (i?.metric === "replies") return /** @type {LocalizedString} */ (`Odpovědi`);
	if (i?.metric === "quotes") return /** @type {LocalizedString} */ (`Citace`);
	if (i?.metric === "comments") return /** @type {LocalizedString} */ (`Komentáře`);
	if (i?.metric === "shares") return /** @type {LocalizedString} */ (`Sdílení`);
	if (i?.metric === "reactions") return /** @type {LocalizedString} */ (`Reakce`);
	if (i?.metric === "bookmarks") return /** @type {LocalizedString} */ (`Záložky`);
	if (i?.metric === "views") return /** @type {LocalizedString} */ (`Zobrazení`);
	if (i?.metric === "reach") return /** @type {LocalizedString} */ (`Dosah`);
	return /** @type {LocalizedString} */ (`Metrika`)
};

export const analytics_missing = /** @type {(inputs: Analytics_MissingInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`—`)
};

export const analytics_not_reported = /** @type {(inputs: Analytics_Not_ReportedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`neuvedeno`)
};

export const analytics_title = /** @type {(inputs: Analytics_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Statistiky`)
};

export const app_name = /** @type {(inputs: App_NameInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Kronaut`)
};

export const approval_approve = /** @type {(inputs: Approval_ApproveInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Schválit`)
};

export const approval_bound = /** @type {(inputs: Approval_BoundInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Na ${i?.when} (${i?.tz})`)
};

export const approval_changed_after = /** @type {(inputs: Approval_Changed_AfterInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Příspěvek se po schválení změnil: požádejte o schválení znovu.`)
};

export const approval_changes_requested = /** @type {(inputs: Approval_Changes_RequestedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Vyžádány úpravy`)
};

export const approval_error_closed = /** @type {(inputs: Approval_Error_ClosedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`O žádosti už bylo rozhodnuto. Zobrazuje se aktuální stav.`)
};

export const approval_error_waiting = /** @type {(inputs: Approval_Error_WaitingInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Příspěvek už čeká na schválení.`)
};

export const approval_not_approver = /** @type {(inputs: Approval_Not_ApproverInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`V tomto pracovním prostoru nemůžete rozhodovat o schváleních.`)
};

export const approval_note_label = /** @type {(inputs: Approval_Note_LabelInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Poznámka pro schvalovatele (nepovinné)`)
};

export const approval_outside_schedule = /** @type {(inputs: Approval_Outside_ScheduleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Tento čas je mimo schválený rozsah. Vyberte schválený čas, nebo požádejte o nové schválení.`)
};

export const approval_progress = /** @type {(inputs: Approval_ProgressInputs) => LocalizedString} */ (i) => {
	const countPlural = registry.plural("cs", i?.count, {}, true);
	if (countPlural === "one") return /** @type {LocalizedString} */ (`${i?.approved} z ${i?.count} potřebného schválení`);
	if (countPlural === "few") return /** @type {LocalizedString} */ (`${i?.approved} z ${i?.count} potřebných schválení`);
	if (countPlural === "many") return /** @type {LocalizedString} */ (`${i?.approved} z ${i?.count} potřebného schválení`);
	return /** @type {LocalizedString} */ (`${i?.approved} z ${i?.count} potřebných schválení`)
};

export const approval_reauth_body = /** @type {(inputs: Approval_Reauth_BodyInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`K rozhodnutí o schválení je potřeba každých 12 hodin znovu zadat heslo.`)
};

export const approval_reauth_confirm = /** @type {(inputs: Approval_Reauth_ConfirmInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Potvrdit`)
};

export const approval_reauth_failed = /** @type {(inputs: Approval_Reauth_FailedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Nepovedlo se. Zkontrolujte heslo: po několika chybných pokusech vás odhlásíme.`)
};

export const approval_reauth_title = /** @type {(inputs: Approval_Reauth_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Potvrďte heslo`)
};

export const approval_reject = /** @type {(inputs: Approval_RejectInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Zamítnout`)
};

export const approval_request_again = /** @type {(inputs: Approval_Request_AgainInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Znovu požádat o schválení`)
};

export const approval_request_changes = /** @type {(inputs: Approval_Request_ChangesInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Vyžádat úpravy`)
};

export const approval_requested_by_key = /** @type {(inputs: Approval_Requested_By_KeyInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Žádost od API klíče, ${i?.when}`)
};

export const approval_requested_by_member = /** @type {(inputs: Approval_Requested_By_MemberInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Žádost od jiného člena, ${i?.when}`)
};

export const approval_requested_by_you = /** @type {(inputs: Approval_Requested_By_YouInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Žádost od vás, ${i?.when}`)
};

export const approval_schedule_approved = /** @type {(inputs: Approval_Schedule_ApprovedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Naplánovat podle schválení`)
};

export const approval_self = /** @type {(inputs: Approval_SelfInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`O vlastní žádosti nemůžete rozhodnout.`)
};

export const approval_state_approved = /** @type {(inputs: Approval_State_ApprovedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Schváleno`)
};

export const approval_state_open = /** @type {(inputs: Approval_State_OpenInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Čeká na schválení`)
};

export const approval_state_rejected = /** @type {(inputs: Approval_State_RejectedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Zamítnuto`)
};

export const approval_state_revoked = /** @type {(inputs: Approval_State_RevokedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Odvoláno`)
};

export const approval_state_voided = /** @type {(inputs: Approval_State_VoidedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Už neplatí`)
};

export const approval_state_withdrawn = /** @type {(inputs: Approval_State_WithdrawnInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Staženo`)
};

export const approval_title = /** @type {(inputs: Approval_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Schválení`)
};

export const approval_tolerance = /** @type {(inputs: Approval_ToleranceInputs) => LocalizedString} */ (i) => {
	const countPlural = registry.plural("cs", i?.count, {}, true);
	if (countPlural === "one") return /** @type {LocalizedString} */ (`± ${i?.count} minuta`);
	if (countPlural === "few") return /** @type {LocalizedString} */ (`± ${i?.count} minuty`);
	if (countPlural === "many") return /** @type {LocalizedString} */ (`± ${i?.count} minuty`);
	return /** @type {LocalizedString} */ (`± ${i?.count} minut`)
};

export const approval_void_content = /** @type {(inputs: Approval_Void_ContentInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Obsah se po žádosti změnil.`)
};

export const approval_void_destinations = /** @type {(inputs: Approval_Void_DestinationsInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Kanály se po žádosti změnily.`)
};

export const approval_void_policy = /** @type {(inputs: Approval_Void_PolicyInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Pravidla schvalování se změnila.`)
};

export const approval_void_post_deleted = /** @type {(inputs: Approval_Void_Post_DeletedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Příspěvek byl smazán.`)
};

export const approval_void_schedule = /** @type {(inputs: Approval_Void_ScheduleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Čas se po žádosti změnil.`)
};

export const approval_withdraw = /** @type {(inputs: Approval_WithdrawInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Stáhnout žádost`)
};

export const calendar_title = /** @type {(inputs: Calendar_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Kalendář`)
};

export const calendar_untitled = /** @type {(inputs: Calendar_UntitledInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Bez textu`)
};

export const calendar_view_day = /** @type {(inputs: Calendar_View_DayInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Den`)
};

export const channel_status_active = /** @type {(inputs: Channel_Status_ActiveInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Aktivní`)
};

export const channel_status_disabled = /** @type {(inputs: Channel_Status_DisabledInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Vypnutý`)
};

export const channel_status_disconnected = /** @type {(inputs: Channel_Status_DisconnectedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Odpojený`)
};

export const channel_status_needs_reauth = /** @type {(inputs: Channel_Status_Needs_ReauthInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Je třeba znovu připojit`)
};

export const channels_add = /** @type {(inputs: Channels_AddInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Přidat kanál`)
};

export const channels_all_networks = /** @type {(inputs: Channels_All_NetworksInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Všechny sítě`)
};

export const channels_connect_bad_url = /** @type {(inputs: Channels_Connect_Bad_UrlInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Síť vrátila nebezpečnou přihlašovací adresu, proto se připojování zastavilo.`)
};

export const channels_connect_body = /** @type {(inputs: Channels_Connect_BodyInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Přihlásíte se v síti a pak se vrátíte sem.`)
};

export const channels_connect_button = /** @type {(inputs: Channels_Connect_ButtonInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Připojit ${i?.name}`)
};

export const channels_connect_check_handle = /** @type {(inputs: Channels_Connect_Check_HandleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Síť požadavek nepřijala. Zkontrolujte uživatelské jméno a zkuste to znovu.`)
};

export const channels_connect_none = /** @type {(inputs: Channels_Connect_NoneInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Na tomto serveru zatím není nastavená žádná síť. Požádejte správce serveru, aby ji zaregistroval.`)
};

export const channels_connect_not_set_up = /** @type {(inputs: Channels_Connect_Not_Set_UpInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Tato síť není na tomto serveru nastavená.`)
};

export const channels_connect_title = /** @type {(inputs: Channels_Connect_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Připojit kanál`)
};

export const channels_connect_unavailable = /** @type {(inputs: Channels_Connect_UnavailableInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Síť je momentálně nedostupná. Zkuste to později.`)
};

export const channels_connected = /** @type {(inputs: Channels_ConnectedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Kanál je připojený.`)
};

export const channels_connected_list = /** @type {(inputs: Channels_Connected_ListInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Připojené kanály: ${i?.names}.`)
};

export const channels_connected_named = /** @type {(inputs: Channels_Connected_NamedInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Kanál ${i?.name} je připojený.`)
};

export const channels_disconnect = /** @type {(inputs: Channels_DisconnectInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Odpojit`)
};

export const channels_disconnect_body = /** @type {(inputs: Channels_Disconnect_BodyInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Odpojit ${i?.name}? Příspěvky naplánované do tohoto kanálu se nezveřejní. Později ho můžete znovu připojit.`)
};

export const channels_disconnect_confirm = /** @type {(inputs: Channels_Disconnect_ConfirmInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Odpojit kanál`)
};

export const channels_disconnected = /** @type {(inputs: Channels_DisconnectedInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Kanál ${i?.name} byl odpojen.`)
};

export const channels_empty_body = /** @type {(inputs: Channels_Empty_BodyInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Přidejte kanál a můžete začít publikovat.`)
};

export const channels_empty_title = /** @type {(inputs: Channels_Empty_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Zatím žádné kanály`)
};

export const channels_error_app_config = /** @type {(inputs: Channels_Error_App_ConfigInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Tato síť není na serveru správně nastavená. Obraťte se na správce serveru.`)
};

export const channels_error_forbidden = /** @type {(inputs: Channels_Error_ForbiddenInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`V tomto pracovním prostoru nemůžete připojovat kanály.`)
};

export const channels_error_generic = /** @type {(inputs: Channels_Error_GenericInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Kanál se nepodařilo připojit. Zkuste to znovu.`)
};

export const channels_error_no_accounts = /** @type {(inputs: Channels_Error_No_AccountsInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Žádný účet nebyl zpřístupněn. Připojte kanál znovu a vyberte alespoň jednu stránku, na které můžete zveřejňovat příspěvky.`)
};

export const channels_error_provider_denied = /** @type {(inputs: Channels_Error_Provider_DeniedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Připojení bylo v síti zrušeno.`)
};

export const channels_error_provider_error = /** @type {(inputs: Channels_Error_Provider_ErrorInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Síť připojení nedokončila. Zkuste to znovu.`)
};

export const channels_error_server_error = /** @type {(inputs: Channels_Error_Server_ErrorInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Kanál se nepodařilo uložit. Zkuste to znovu.`)
};

export const channels_error_session_mismatch = /** @type {(inputs: Channels_Error_Session_MismatchInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Připojení se dokončilo pod jiným přihlášením. Začněte znovu.`)
};

export const channels_error_state_invalid = /** @type {(inputs: Channels_Error_State_InvalidInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Odkaz pro připojení vypršel nebo už byl použit. Začněte znovu.`)
};

export const channels_error_too_many_accounts = /** @type {(inputs: Channels_Error_Too_Many_AccountsInputs) => LocalizedString} */ (i) => {
	const maxPlural = registry.plural("cs", i?.max, {}, true);
	if (maxPlural === "one") return /** @type {LocalizedString} */ (`Zpřístupnili jste příliš mnoho účtů. Připojte kanál znovu a vyberte nejvýš ${i?.max} účet.`);
	if (maxPlural === "few") return /** @type {LocalizedString} */ (`Zpřístupnili jste příliš mnoho účtů. Připojte kanál znovu a vyberte nejvýš ${i?.max} účty.`);
	if (maxPlural === "many") return /** @type {LocalizedString} */ (`Zpřístupnili jste příliš mnoho účtů. Připojte kanál znovu a vyberte nejvýš ${i?.max} účtu.`);
	return /** @type {LocalizedString} */ (`Zpřístupnili jste příliš mnoho účtů. Připojte kanál znovu a vyberte nejvýš ${i?.max} účtů.`)
};

export const channels_expires = /** @type {(inputs: Channels_ExpiresInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Přístup vyprší ${i?.date}`)
};

export const channels_followers = /** @type {(inputs: Channels_FollowersInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Sledující: ${i?.value}`)
};

export const channels_followers_change = /** @type {(inputs: Channels_Followers_ChangeInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`${i?.change} za 30 dní`)
};

export const channels_handle_label = /** @type {(inputs: Channels_Handle_LabelInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Vaše uživatelské jméno (nepovinné)`)
};

export const channels_handle_placeholder = /** @type {(inputs: Channels_Handle_PlaceholderInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`vasejmeno.bsky.social`)
};

export const channels_insights_reconnect = /** @type {(inputs: Channels_Insights_ReconnectInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Znovu připojte kanál a získejte podrobné statistiky`)
};

export const channels_not_set_up = /** @type {(inputs: Channels_Not_Set_UpInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Není nastaveno`)
};

export const channels_open_profile = /** @type {(inputs: Channels_Open_ProfileInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Otevřít profil`)
};

export const channels_queue = /** @type {(inputs: Channels_QueueInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Fronta`)
};

export const channels_reconnect = /** @type {(inputs: Channels_ReconnectInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Znovu připojit`)
};

export const channels_server_invalid = /** @type {(inputs: Channels_Server_InvalidInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Zadejte název serveru, například mastodon.social.`)
};

export const channels_server_label = /** @type {(inputs: Channels_Server_LabelInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Váš server ${i?.name}`)
};

export const channels_server_placeholder = /** @type {(inputs: Channels_Server_PlaceholderInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`mastodon.social`)
};

export const channels_server_rate_limited = /** @type {(inputs: Channels_Server_Rate_LimitedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`V poslední době se nastavilo příliš mnoho serverů. Zkuste to znovu za hodinu.`)
};

export const channels_server_rejected = /** @type {(inputs: Channels_Server_RejectedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Tento server Kronaut nepřijal. Zkontrolujte název nebo zkuste jiný server.`)
};

export const channels_server_unreachable = /** @type {(inputs: Channels_Server_UnreachableInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`K tomuto serveru se nepodařilo připojit. Zkuste to později.`)
};

export const channels_subtitle = /** @type {(inputs: Channels_SubtitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Sociální účty, na které tento pracovní prostor publikuje.`)
};

export const channels_title = /** @type {(inputs: Channels_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Kanály`)
};

export const close = /** @type {(inputs: CloseInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Zavřít`)
};

export const compose_add_to_queue = /** @type {(inputs: Compose_Add_To_QueueInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Přidat do fronty`)
};

export const compose_comment_too_long = /** @type {(inputs: Compose_Comment_Too_LongInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`První komentář je pro ${i?.channel} příliš dlouhý (${i?.count}/${i?.max})`)
};

export const compose_date = /** @type {(inputs: Compose_DateInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Datum`)
};

export const compose_error_conflict = /** @type {(inputs: Compose_Error_ConflictInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Příspěvek se mezitím změnil. Zkuste to znovu.`)
};

export const compose_error_when_missing = /** @type {(inputs: Compose_Error_When_MissingInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Vyberte datum a čas.`)
};

export const compose_image_preview = /** @type {(inputs: Compose_Image_PreviewInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Náhled obrázku ${i?.position}`)
};

export const compose_image_remove = /** @type {(inputs: Compose_Image_RemoveInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Odebrat`)
};

export const compose_issue_comment_empty = /** @type {(inputs: Compose_Issue_Comment_EmptyInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`První komentář je prázdný.`)
};

export const compose_issue_on_channel = /** @type {(inputs: Compose_Issue_On_ChannelInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`${i?.channel}: ${i?.message}`)
};

export const compose_issue_reply_empty = /** @type {(inputs: Compose_Issue_Reply_EmptyInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Odpověď ${i?.position} je prázdná.`)
};

export const compose_limit_channel = /** @type {(inputs: Compose_Limit_ChannelInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`${i?.channel} (${i?.network})`)
};

export const compose_limit_too_long = /** @type {(inputs: Compose_Limit_Too_LongInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Pro ${i?.channel} je text příliš dlouhý (${i?.count}/${i?.max})`)
};

export const compose_limit_too_many_links = /** @type {(inputs: Compose_Limit_Too_Many_LinksInputs) => LocalizedString} */ (i) => {
	const maxPlural = registry.plural("cs", i?.max, {}, true);
	if (maxPlural === "one") return /** @type {LocalizedString} */ (`${i?.channel} dovoluje nejvýš ${i?.max} odkaz`);
	if (maxPlural === "few") return /** @type {LocalizedString} */ (`${i?.channel} dovoluje nejvýš ${i?.max} odkazy`);
	if (maxPlural === "many") return /** @type {LocalizedString} */ (`${i?.channel} dovoluje nejvýš ${i?.max} odkazu`);
	return /** @type {LocalizedString} */ (`${i?.channel} dovoluje nejvýš ${i?.max} odkazů`)
};

export const compose_limit_usage = /** @type {(inputs: Compose_Limit_UsageInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`${i?.network} ${i?.count}/${i?.max}`)
};

export const compose_preview_title = /** @type {(inputs: Compose_Preview_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Náhled`)
};

export const compose_publish_now = /** @type {(inputs: Compose_Publish_NowInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Zveřejnit hned`)
};

export const compose_publishing = /** @type {(inputs: Compose_PublishingInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Zveřejňuje se…`)
};

export const compose_queue_empty = /** @type {(inputs: Compose_Queue_EmptyInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Kanál ${i?.channel} má prázdnou frontu.`)
};

export const compose_queue_next = /** @type {(inputs: Compose_Queue_NextInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`${i?.channel}: ${i?.when} (${i?.tz})`)
};

export const compose_reply_too_long = /** @type {(inputs: Compose_Reply_Too_LongInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Odpověď ${i?.position} je pro ${i?.channel} příliš dlouhá (${i?.count}/${i?.max})`)
};

export const compose_reply_too_many_links = /** @type {(inputs: Compose_Reply_Too_Many_LinksInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Odpověď ${i?.position} obsahuje víc odkazů, než ${i?.channel} povoluje (${i?.max})`)
};

export const compose_request_approval = /** @type {(inputs: Compose_Request_ApprovalInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Požádat o schválení`)
};

export const compose_requesting_approval = /** @type {(inputs: Compose_Requesting_ApprovalInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Odesílá se žádost…`)
};

export const compose_save_draft = /** @type {(inputs: Compose_Save_DraftInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Uložit koncept`)
};

export const compose_saving_draft = /** @type {(inputs: Compose_Saving_DraftInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Ukládá se…`)
};

export const compose_schedule = /** @type {(inputs: Compose_ScheduleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Naplánovat`)
};

export const compose_scheduling = /** @type {(inputs: Compose_SchedulingInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Plánuje se…`)
};

export const compose_time = /** @type {(inputs: Compose_TimeInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Čas`)
};

export const compose_time_zone = /** @type {(inputs: Compose_Time_ZoneInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Časové pásmo: ${i?.tz}`)
};

export const compose_video_ai_failed = /** @type {(inputs: Compose_Video_Ai_FailedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Označení AI se nepodařilo uložit.`)
};

export const compose_video_ai_saving = /** @type {(inputs: Compose_Video_Ai_SavingInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Ukládá se označení AI…`)
};

export const compose_video_error = /** @type {(inputs: Compose_Video_ErrorInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Video se nepodařilo nahrát.`)
};

export const compose_video_issue_aspect = /** @type {(inputs: Compose_Video_Issue_AspectInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Poměr stran videa nevyhovuje kanálu ${i?.channel}.`)
};

export const compose_video_issue_frame_rate = /** @type {(inputs: Compose_Video_Issue_Frame_RateInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Snímková frekvence videa je vyšší, než dovoluje ${i?.channel} (${i?.max} fps).`)
};

export const compose_video_issue_kind = /** @type {(inputs: Compose_Video_Issue_KindInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`${i?.channel} u tohoto druhu příspěvku video nepřijímá.`)
};

export const compose_video_issue_metadata = /** @type {(inputs: Compose_Video_Issue_MetadataInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Pro ${i?.channel} se nepodařilo zjistit délku ani rozměry videa.`)
};

export const compose_video_issue_mime = /** @type {(inputs: Compose_Video_Issue_MimeInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`${i?.channel} nepřijímá formát tohoto videa.`)
};

export const compose_video_issue_resolution = /** @type {(inputs: Compose_Video_Issue_ResolutionInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Rozlišení videa je vyšší, než dovoluje ${i?.channel}.`)
};

export const compose_video_issue_too_large = /** @type {(inputs: Compose_Video_Issue_Too_LargeInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Video je větší, než dovoluje ${i?.channel} (${i?.max}).`)
};

export const compose_video_issue_too_long = /** @type {(inputs: Compose_Video_Issue_Too_LongInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Video je delší, než dovoluje ${i?.channel} (${i?.max}).`)
};

export const compose_video_issue_too_short = /** @type {(inputs: Compose_Video_Issue_Too_ShortInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Video je kratší, než vyžaduje ${i?.channel} (${i?.min}).`)
};

export const compose_video_preview_card = /** @type {(inputs: Compose_Video_Preview_CardInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Náhled videa`)
};

export const compose_video_rejected_stream_missing = /** @type {(inputs: Compose_Video_Rejected_Stream_MissingInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Soubor neobsahuje obrazovou stopu.`)
};

export const compose_video_rejected_too_large = /** @type {(inputs: Compose_Video_Rejected_Too_LargeInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Po převodu by video přesáhlo ${i?.max}.`)
};

export const compose_video_rejected_too_long = /** @type {(inputs: Compose_Video_Rejected_Too_LongInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Video je delší než ${i?.max}.`)
};

export const compose_video_rejected_too_short = /** @type {(inputs: Compose_Video_Rejected_Too_ShortInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Video je kratší než ${i?.min}.`)
};

export const compose_video_rejected_unreadable = /** @type {(inputs: Compose_Video_Rejected_UnreadableInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Video se nepodařilo načíst. Zkuste ho vyexportovat znovu.`)
};

export const compose_video_wait = /** @type {(inputs: Compose_Video_WaitInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Počkejte, až se video zpracuje.`)
};

export const compose_when_title = /** @type {(inputs: Compose_When_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Kdy`)
};

export const destination_state_awaiting_manual = /** @type {(inputs: Destination_State_Awaiting_ManualInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Čeká, až ho zveřejníte vy`)
};

export const destination_state_blocked = /** @type {(inputs: Destination_State_BlockedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Zablokovaný`)
};

export const destination_state_canceled = /** @type {(inputs: Destination_State_CanceledInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Zrušený`)
};

export const destination_state_draft = /** @type {(inputs: Destination_State_DraftInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Koncept`)
};

export const destination_state_failed = /** @type {(inputs: Destination_State_FailedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Selhal`)
};

export const destination_state_published = /** @type {(inputs: Destination_State_PublishedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Zveřejněný`)
};

export const destination_state_publishing = /** @type {(inputs: Destination_State_PublishingInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Zveřejňuje se`)
};

export const destination_state_retry_wait = /** @type {(inputs: Destination_State_Retry_WaitInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Čeká na další pokus`)
};

export const destination_state_scheduled = /** @type {(inputs: Destination_State_ScheduledInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Naplánovaný`)
};

export const destination_state_unconfirmed = /** @type {(inputs: Destination_State_UnconfirmedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Nepotvrzený`)
};

export const destination_state_verifying = /** @type {(inputs: Destination_State_VerifyingInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Ověřuje se`)
};

export const dialog_close = /** @type {(inputs: Dialog_CloseInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Zavřít`)
};

export const dismiss = /** @type {(inputs: DismissInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Zavřít`)
};

export const email_footer = /** @type {(inputs: Email_FooterInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Tento e-mail vám posíláme, protože patříte do pracovního prostoru ${i?.workspace} v Kronautu.`)
};

export const email_manage = /** @type {(inputs: Email_ManageInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Vyberte si, které e-maily chcete dostávat: ${i?.url}`)
};

export const email_open = /** @type {(inputs: Email_OpenInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Otevřít v Kronautu: ${i?.url}`)
};

export const email_post = /** @type {(inputs: Email_PostInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Příspěvek: ${i?.excerpt}`)
};

export const error_forbidden = /** @type {(inputs: Error_ForbiddenInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Požadavek byl zablokován. Obnovte stránku a zkuste to znovu.`)
};

export const error_generic = /** @type {(inputs: Error_GenericInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Něco se pokazilo. Zkuste to znovu.`)
};

export const error_invalid_credentials = /** @type {(inputs: Error_Invalid_CredentialsInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`E-mail nebo heslo není správně.`)
};

export const error_invalid_request = /** @type {(inputs: Error_Invalid_RequestInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Zkontrolujte vyplněná pole a zkuste to znovu.`)
};

export const error_logout_failed = /** @type {(inputs: Error_Logout_FailedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Odhlášení se nepovedlo. Zkuste to znovu.`)
};

export const error_rate_limited = /** @type {(inputs: Error_Rate_LimitedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Příliš mnoho pokusů. Chvíli počkejte a zkuste to znovu.`)
};

export const error_unavailable = /** @type {(inputs: Error_UnavailableInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Kronaut je teď nedostupný. Zkuste to za chvíli.`)
};

export const evergreen_copies = /** @type {(inputs: Evergreen_CopiesInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Poslední kopie`)
};

export const evergreen_copy = /** @type {(inputs: Evergreen_CopyInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`${i?.channel}, ${i?.when}`)
};

export const evergreen_label = /** @type {(inputs: Evergreen_LabelInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Nadčasový příspěvek`)
};

export const evergreen_reason = /** @type {(inputs: Evergreen_ReasonInputs) => LocalizedString} */ (i) => {
	if (i?.reason === "owner_lost") return /** @type {LocalizedString} */ (`Vyřazen: jeho vlastník už nemůže plánovat příspěvky.`);
	return /** @type {LocalizedString} */ (`Vyřazen: kopii se nepodařilo vytvořit.`)
};

export const inbox_badge = /** @type {(inputs: Inbox_BadgeInputs) => LocalizedString} */ (i) => {
	const countPlural = registry.plural("cs", i?.count, {}, true);
	if (countPlural === "one") return /** @type {LocalizedString} */ (`${i?.count} položka čeká na řešení`);
	if (countPlural === "few") return /** @type {LocalizedString} */ (`${i?.count} položky čekají na řešení`);
	if (countPlural === "many") return /** @type {LocalizedString} */ (`${i?.count} položky čeká na řešení`);
	return /** @type {LocalizedString} */ (`${i?.count} položek čeká na řešení`)
};

export const inbox_badge_overflow = /** @type {(inputs: Inbox_Badge_OverflowInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`${i?.count}+`)
};

export const inbox_cancel = /** @type {(inputs: Inbox_CancelInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Zrušit`)
};

export const inbox_confirm_back = /** @type {(inputs: Inbox_Confirm_BackInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Teď ne`)
};

export const inbox_load_failed = /** @type {(inputs: Inbox_Load_FailedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Seznam se nepodařilo načíst. Zkuste to znovu.`)
};

export const issue_alt_text_required = /** @type {(inputs: Issue_Alt_Text_RequiredInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Tato síť vyžaduje alternativní text u každého obrázku.`)
};

export const issue_alt_text_too_long = /** @type {(inputs: Issue_Alt_Text_Too_LongInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Alternativní text je pro tuto síť příliš dlouhý.`)
};

export const issue_aspect_out_of_range = /** @type {(inputs: Issue_Aspect_Out_Of_RangeInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Poměr stran obrázku tato síť nepovoluje.`)
};

export const issue_file_too_large = /** @type {(inputs: Issue_File_Too_LargeInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Soubor s obrázkem je příliš velký.`)
};

export const issue_frame_rate_too_high = /** @type {(inputs: Issue_Frame_Rate_Too_HighInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Snímková frekvence videa je pro tuto síť příliš vysoká.`)
};

export const issue_generic = /** @type {(inputs: Issue_GenericInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Něco se pokazilo. Víc řeknou technické podrobnosti.`)
};

export const issue_image_too_narrow = /** @type {(inputs: Issue_Image_Too_NarrowInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Obrázek je pro tuto síť příliš úzký.`)
};

export const issue_image_too_wide = /** @type {(inputs: Issue_Image_Too_WideInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Obrázek je pro tuto síť příliš široký.`)
};

export const issue_in_past = /** @type {(inputs: Issue_In_PastInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Zvolený čas už uplynul. Vyberte pozdější.`)
};

export const issue_invalid_repeat = /** @type {(inputs: Issue_Invalid_RepeatInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Toto nastavení opakování není podporováno.`)
};

export const issue_invalid_time_zone = /** @type {(inputs: Issue_Invalid_Time_ZoneInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Časové pásmo se nepodařilo rozpoznat.`)
};

export const issue_media_not_allowed = /** @type {(inputs: Issue_Media_Not_AllowedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Tento typ příspěvku nemůže obsahovat obrázky.`)
};

export const issue_mime_unsupported = /** @type {(inputs: Issue_Mime_UnsupportedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Tato síť tento formát obrázku nepřijímá.`)
};

export const issue_not_ready = /** @type {(inputs: Issue_Not_ReadyInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Obrázek se ještě zpracovává. Zkuste to za chvíli.`)
};

export const issue_post_type_unavailable = /** @type {(inputs: Issue_Post_Type_UnavailableInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Tento typ příspěvku není pro kanál k dispozici.`)
};

export const issue_provider_unavailable = /** @type {(inputs: Issue_Provider_UnavailableInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Tato síť teď na tomto serveru není k dispozici.`)
};

export const issue_queue_empty = /** @type {(inputs: Issue_Queue_EmptyInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Fronta kanálu je prázdná.`)
};

export const issue_queue_full = /** @type {(inputs: Issue_Queue_FullInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Ve frontě není v příštích 8 týdnech volný termín.`)
};

export const issue_resolution_too_high = /** @type {(inputs: Issue_Resolution_Too_HighInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Rozlišení videa je pro tuto síť příliš vysoké.`)
};

export const issue_text_too_long = /** @type {(inputs: Issue_Text_Too_LongInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Text je pro tuto síť příliš dlouhý.`)
};

export const issue_too_few_media = /** @type {(inputs: Issue_Too_Few_MediaInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Tento typ příspěvku potřebuje v této síti víc obrázků.`)
};

export const issue_too_large = /** @type {(inputs: Issue_Too_LargeInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Příspěvek je příliš velký.`)
};

export const issue_too_many_links = /** @type {(inputs: Issue_Too_Many_LinksInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Text obsahuje na tuto síť příliš mnoho odkazů.`)
};

export const issue_too_many_media = /** @type {(inputs: Issue_Too_Many_MediaInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Obrázků je na tuto síť příliš mnoho.`)
};

export const issue_unknown_post_type = /** @type {(inputs: Issue_Unknown_Post_TypeInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Tento typ příspěvku síť nezná.`)
};

export const loading = /** @type {(inputs: LoadingInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Načítá se…`)
};

export const locale_cs = /** @type {(inputs: Locale_CsInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Čeština`)
};

export const locale_en = /** @type {(inputs: Locale_EnInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`English`)
};

export const locale_label = /** @type {(inputs: Locale_LabelInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Jazyk`)
};

export const locale_save_failed = /** @type {(inputs: Locale_Save_FailedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Jazyk se neuložil. Zkuste to znovu.`)
};

export const locale_sk = /** @type {(inputs: Locale_SkInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Slovenčina`)
};

export const login_email = /** @type {(inputs: Login_EmailInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`E-mail`)
};

export const login_password = /** @type {(inputs: Login_PasswordInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Heslo`)
};

export const login_password_set = /** @type {(inputs: Login_Password_SetInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Heslo je nastavené. Teď se s ním můžete přihlásit.`)
};

export const login_session_expired = /** @type {(inputs: Login_Session_ExpiredInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Platnost přihlášení vypršela. Přihlaste se znovu.`)
};

export const login_submit = /** @type {(inputs: Login_SubmitInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Přihlásit se`)
};

export const login_submitting = /** @type {(inputs: Login_SubmittingInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Přihlašujeme vás…`)
};

export const login_subtitle = /** @type {(inputs: Login_SubtitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Plánujte a publikujte příspěvky z jednoho místa.`)
};

export const login_title = /** @type {(inputs: Login_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Přihlášení`)
};

export const meta_status_completed = /** @type {(inputs: Meta_Status_CompletedInputs) => LocalizedString} */ (i) => {
	const countPlural = registry.plural("cs", i?.count, {}, true);
	if (countPlural === "one") return /** @type {LocalizedString} */ (`Hotovo. Kronaut smazal údaje z ${i?.count} kanálu.`);
	if (countPlural === "few") return /** @type {LocalizedString} */ (`Hotovo. Kronaut smazal údaje z ${i?.count} kanálů.`);
	if (countPlural === "many") return /** @type {LocalizedString} */ (`Hotovo. Kronaut smazal údaje z ${i?.count} kanálu.`);
	return /** @type {LocalizedString} */ (`Hotovo. Kronaut smazal údaje z ${i?.count} kanálů.`)
};

export const meta_status_none = /** @type {(inputs: Meta_Status_NoneInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Kronaut nenašel žádný kanál propojený s tímto účtem Meta. Kanál připojený před zavedením této funkce nelze přiřadit: vlastník pracovního prostoru ho může odpojit nebo jednou znovu připojit.`)
};

export const meta_status_received = /** @type {(inputs: Meta_Status_ReceivedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Kronaut přijal vaši žádost a maže vaše údaje.`)
};

export const meta_status_unknown = /** @type {(inputs: Meta_Status_UnknownInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Neznámý potvrzovací kód.`)
};

export const nav_channels = /** @type {(inputs: Nav_ChannelsInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Kanály`)
};

export const nav_inbox = /** @type {(inputs: Nav_InboxInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`K řešení`)
};

export const nav_label = /** @type {(inputs: Nav_LabelInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Hlavní navigace`)
};

export const nav_media = /** @type {(inputs: Nav_MediaInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Média`)
};

export const not_found_back = /** @type {(inputs: Not_Found_BackInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Přejít na úvodní stránku`)
};

export const not_found_title = /** @type {(inputs: Not_Found_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Stránka nenalezena`)
};

export const notification_approval_requested = /** @type {(inputs: Notification_Approval_RequestedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Příspěvek čeká na vaše schválení`)
};

export const notification_approved = /** @type {(inputs: Notification_ApprovedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Váš příspěvek byl schválen`)
};

export const notification_awaiting_manual = /** @type {(inputs: Notification_Awaiting_ManualInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Příspěvek čeká, až ho zveřejníte v kanálu ${i?.account}`)
};

export const notification_expiring = /** @type {(inputs: Notification_ExpiringInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Kanál ${i?.account} bude brzy potřeba znovu připojit`)
};

export const notification_failed = /** @type {(inputs: Notification_FailedInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Příspěvek se nepodařilo zveřejnit v kanálu ${i?.account}`)
};

export const notification_generic = /** @type {(inputs: Notification_GenericInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Něco vyžaduje vaši pozornost`)
};

export const notification_needs_reauth = /** @type {(inputs: Notification_Needs_ReauthInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Kanál ${i?.account} je potřeba znovu připojit`)
};

export const notification_rejected = /** @type {(inputs: Notification_RejectedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Váš příspěvek byl zamítnut`)
};

export const notification_unconfirmed = /** @type {(inputs: Notification_UnconfirmedInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Není jisté, zda se příspěvek zveřejnil v kanálu ${i?.account}`)
};

export const notifications_button = /** @type {(inputs: Notifications_ButtonInputs) => LocalizedString} */ (i) => {
	const countPlural = registry.plural("cs", i?.count, {}, true);
	if (countPlural === "one") return /** @type {LocalizedString} */ (`Oznámení, ${i?.count} nepřečtené`);
	if (countPlural === "few") return /** @type {LocalizedString} */ (`Oznámení, ${i?.count} nepřečtená`);
	if (countPlural === "many") return /** @type {LocalizedString} */ (`Oznámení, ${i?.count} nepřečteného`);
	return /** @type {LocalizedString} */ (`Oznámení, ${i?.count} nepřečtených`)
};

export const notifications_empty = /** @type {(inputs: Notifications_EmptyInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Máte vše vyřízeno`)
};

export const notifications_mark_all = /** @type {(inputs: Notifications_Mark_AllInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Označit vše jako přečtené`)
};

export const notifications_mark_failed = /** @type {(inputs: Notifications_Mark_FailedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Oznámení se nepodařilo označit jako přečtená. Zkuste to znovu.`)
};

export const notifications_older = /** @type {(inputs: Notifications_OlderInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Starší nepřečtená oznámení najdete v sekci K řešení.`)
};

export const notifications_title = /** @type {(inputs: Notifications_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Oznámení`)
};

export const notifications_unread = /** @type {(inputs: Notifications_UnreadInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Nepřečtené`)
};

export const password_min_length = /** @type {(inputs: Password_Min_LengthInputs) => LocalizedString} */ (i) => {
	const countPlural = registry.plural("cs", i?.count, {}, true);
	if (countPlural === "one") return /** @type {LocalizedString} */ (`Heslo musí mít alespoň ${i?.count} znak.`);
	if (countPlural === "few") return /** @type {LocalizedString} */ (`Heslo musí mít alespoň ${i?.count} znaky.`);
	if (countPlural === "many") return /** @type {LocalizedString} */ (`Heslo musí mít alespoň ${i?.count} znaku.`);
	return /** @type {LocalizedString} */ (`Heslo musí mít alespoň ${i?.count} znaků.`)
};

export const password_too_long = /** @type {(inputs: Password_Too_LongInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Heslo je příliš dlouhé.`)
};

export const post_action_delete = /** @type {(inputs: Post_Action_DeleteInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Smazat`)
};

export const post_action_duplicate = /** @type {(inputs: Post_Action_DuplicateInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Duplikovat`)
};

export const post_action_edit = /** @type {(inputs: Post_Action_EditInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Upravit`)
};

export const post_action_stats = /** @type {(inputs: Post_Action_StatsInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Statistiky`)
};

export const post_customized = /** @type {(inputs: Post_CustomizedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Text upravený pro tento kanál`)
};

export const post_delete_body = /** @type {(inputs: Post_Delete_BodyInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Zmizí z kalendáře i ze všech seznamů. Naplánované kanály se zruší.`)
};

export const post_delete_confirm = /** @type {(inputs: Post_Delete_ConfirmInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Smazat příspěvek`)
};

export const post_delete_forbidden = /** @type {(inputs: Post_Delete_ForbiddenInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Vaše role nemůže zrušit čekající kanály tohoto příspěvku, takže ho nemůžete smazat. Požádejte editora nebo administrátora.`)
};

export const post_delete_keep = /** @type {(inputs: Post_Delete_KeepInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Ponechat`)
};

export const post_delete_live = /** @type {(inputs: Post_Delete_LiveInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Příspěvek se právě zveřejňuje. Zkuste to znovu, až se dokončí.`)
};

export const post_delete_published = /** @type {(inputs: Post_Delete_PublishedInputs) => LocalizedString} */ (i) => {
	const countPlural = registry.plural("cs", i?.count, {}, true);
	if (countPlural === "one") return /** @type {LocalizedString} */ (`Na síti zůstává zveřejněný (${i?.count} kanál). Smazáním zmizí jen z Kronautu, ne ze sítě.`);
	if (countPlural === "few") return /** @type {LocalizedString} */ (`Na síti zůstává zveřejněný (${i?.count} kanály). Smazáním zmizí jen z Kronautu, ne ze sítě.`);
	if (countPlural === "many") return /** @type {LocalizedString} */ (`Na síti zůstává zveřejněný (${i?.count} kanálu). Smazáním zmizí jen z Kronautu, ne ze sítě.`);
	return /** @type {LocalizedString} */ (`Na síti zůstává zveřejněný (${i?.count} kanálů). Smazáním zmizí jen z Kronautu, ne ze sítě.`)
};

export const post_delete_title = /** @type {(inputs: Post_Delete_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Smazat tento příspěvek?`)
};

export const post_delete_unconfirmed = /** @type {(inputs: Post_Delete_UnconfirmedInputs) => LocalizedString} */ (i) => {
	const countPlural = registry.plural("cs", i?.count, {}, true);
	if (countPlural === "one") return /** @type {LocalizedString} */ (`Na síti už může být zveřejněný (${i?.count} kanál), Kronaut to nedokázal ověřit. Smazání ho ze sítě neodstraní.`);
	if (countPlural === "few") return /** @type {LocalizedString} */ (`Na síti už může být zveřejněný (${i?.count} kanály), Kronaut to nedokázal ověřit. Smazání ho ze sítě neodstraní.`);
	if (countPlural === "many") return /** @type {LocalizedString} */ (`Na síti už může být zveřejněný (${i?.count} kanálu), Kronaut to nedokázal ověřit. Smazání ho ze sítě neodstraní.`);
	return /** @type {LocalizedString} */ (`Na síti už může být zveřejněný (${i?.count} kanálů), Kronaut to nedokázal ověřit. Smazání ho ze sítě neodstraní.`)
};

export const post_deleted = /** @type {(inputs: Post_DeletedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Příspěvek je smazaný.`)
};

export const post_destinations_title = /** @type {(inputs: Post_Destinations_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Kanály`)
};

export const post_discard_body = /** @type {(inputs: Post_Discard_BodyInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`To, co jste zatím napsali, se neuloží.`)
};

export const post_discard_confirm = /** @type {(inputs: Post_Discard_ConfirmInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Zahodit`)
};

export const post_discard_keep = /** @type {(inputs: Post_Discard_KeepInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Pokračovat v úpravách`)
};

export const post_discard_title = /** @type {(inputs: Post_Discard_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Zahodit tento příspěvek?`)
};

export const post_edit_title = /** @type {(inputs: Post_Edit_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Úprava příspěvku`)
};

export const post_images = /** @type {(inputs: Post_ImagesInputs) => LocalizedString} */ (i) => {
	const countPlural = registry.plural("cs", i?.count, {}, true);
	if (countPlural === "one") return /** @type {LocalizedString} */ (`${i?.count} obrázek`);
	if (countPlural === "few") return /** @type {LocalizedString} */ (`${i?.count} obrázky`);
	if (countPlural === "many") return /** @type {LocalizedString} */ (`${i?.count} obrázku`);
	return /** @type {LocalizedString} */ (`${i?.count} obrázků`)
};

export const post_new_title = /** @type {(inputs: Post_New_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Nový příspěvek`)
};

export const post_not_found = /** @type {(inputs: Post_Not_FoundInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Příspěvek se nepodařilo načíst.`)
};

export const post_preview_empty = /** @type {(inputs: Post_Preview_EmptyInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Pro tyto kanály není náhled k dispozici.`)
};

export const post_preview_title = /** @type {(inputs: Post_Preview_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Náhled příspěvku`)
};

export const post_published_at = /** @type {(inputs: Post_Published_AtInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Zveřejněno ${i?.when}`)
};

export const post_schedule_asap = /** @type {(inputs: Post_Schedule_AsapInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Co nejdřív`)
};

export const post_schedule_at = /** @type {(inputs: Post_Schedule_AtInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Naplánovaný na ${i?.when}`)
};

export const post_schedule_at_tz = /** @type {(inputs: Post_Schedule_At_TzInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Naplánovaný na ${i?.when} (${i?.tz})`)
};

export const post_schedule_none = /** @type {(inputs: Post_Schedule_NoneInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Nenaplánovaný`)
};

export const post_scheduled_at = /** @type {(inputs: Post_Scheduled_AtInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Termín: ${i?.when}`)
};

export const post_summary_canceled = /** @type {(inputs: Post_Summary_CanceledInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Zrušený`)
};

export const post_summary_completed_all = /** @type {(inputs: Post_Summary_Completed_AllInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Zveřejněný`)
};

export const post_summary_completed_failed = /** @type {(inputs: Post_Summary_Completed_FailedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Nezveřejněný`)
};

export const post_summary_completed_partial = /** @type {(inputs: Post_Summary_Completed_PartialInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Částečně zveřejněný`)
};

export const post_summary_draft = /** @type {(inputs: Post_Summary_DraftInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Koncept`)
};

export const post_summary_in_progress = /** @type {(inputs: Post_Summary_In_ProgressInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Zveřejňuje se`)
};

export const post_summary_in_review = /** @type {(inputs: Post_Summary_In_ReviewInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Čeká na schválení`)
};

export const post_summary_needs_action = /** @type {(inputs: Post_Summary_Needs_ActionInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Vyžaduje zásah`)
};

export const post_summary_scheduled = /** @type {(inputs: Post_Summary_ScheduledInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Naplánovaný`)
};

export const post_title = /** @type {(inputs: Post_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Příspěvek`)
};

export const post_view = /** @type {(inputs: Post_ViewInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Zobrazit příspěvek`)
};

export const provider_bluesky = /** @type {(inputs: Provider_BlueskyInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Bluesky`)
};

export const provider_facebook = /** @type {(inputs: Provider_FacebookInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Facebook`)
};

export const provider_instagram = /** @type {(inputs: Provider_InstagramInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Instagram`)
};

export const provider_linkedin = /** @type {(inputs: Provider_LinkedinInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`LinkedIn`)
};

export const provider_mastodon = /** @type {(inputs: Provider_MastodonInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Mastodon`)
};

export const provider_threads = /** @type {(inputs: Provider_ThreadsInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Threads`)
};

export const queue_add = /** @type {(inputs: Queue_AddInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Přidat čas`)
};

export const queue_evergreen = /** @type {(inputs: Queue_EvergreenInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Volné termíny se 24 h předem doplní nadčasovými příspěvky.`)
};

export const queue_saved = /** @type {(inputs: Queue_SavedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Fronta byla uložena.`)
};

export const queue_zone = /** @type {(inputs: Queue_ZoneInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Časové pásmo`)
};

export const reason_account_disabled = /** @type {(inputs: Reason_Account_DisabledInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Kanál je vypnutý.`)
};

export const reason_account_disconnected = /** @type {(inputs: Reason_Account_DisconnectedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Kanál je odpojený.`)
};

export const reason_account_needs_reauth = /** @type {(inputs: Reason_Account_Needs_ReauthInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Kanál je potřeba znovu připojit.`)
};

export const reason_account_out_of_scope = /** @type {(inputs: Reason_Account_Out_Of_ScopeInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`K tomuto kanálu už nemáte přístup.`)
};

export const reason_ambiguous_response = /** @type {(inputs: Reason_Ambiguous_ResponseInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Odpověď sítě nebyla jasná. Příspěvek už možná je zveřejněný.`)
};

export const reason_app_credentials_invalid = /** @type {(inputs: Reason_App_Credentials_InvalidInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Tato síť není na tomto serveru správně nastavená. Obraťte se na správce serveru.`)
};

export const reason_async_give_up = /** @type {(inputs: Reason_Async_Give_UpInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Síť zveřejňování nedokončila.`)
};

export const reason_attempts_exhausted = /** @type {(inputs: Reason_Attempts_ExhaustedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Nepovedlo se to ani po několika pokusech.`)
};

export const reason_entitlement_exceeded = /** @type {(inputs: Reason_Entitlement_ExceededInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Dosáhli jste limitu svého tarifu.`)
};

export const reason_generic = /** @type {(inputs: Reason_GenericInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Vyžaduje to vaši pozornost.`)
};

export const reason_interrupted_after_send = /** @type {(inputs: Reason_Interrupted_After_SendInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Odesílání se přerušilo, když už příspěvek odešel. Možná je zveřejněný.`)
};

export const reason_late_window_exceeded = /** @type {(inputs: Reason_Late_Window_ExceededInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Na odeslání už bylo pozdě.`)
};

export const reason_media_processing_timeout = /** @type {(inputs: Reason_Media_Processing_TimeoutInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Síť zpracovávala obrázky příliš dlouho.`)
};

export const reason_permanent_error = /** @type {(inputs: Reason_Permanent_ErrorInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Síť příspěvek odmítla.`)
};

export const reason_policy_denied = /** @type {(inputs: Reason_Policy_DeniedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Pravidla pracovního prostoru to nedovolují.`)
};

export const reason_rate_limit_beyond_deadline = /** @type {(inputs: Reason_Rate_Limit_Beyond_DeadlineInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Omezení sítě trvalo déle, než se dalo čekat.`)
};

export const reason_refresh_token_lost = /** @type {(inputs: Reason_Refresh_Token_LostInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Přihlášení kanálu se ztratilo. Připojte ho znovu.`)
};

export const reason_restore_quarantine = /** @type {(inputs: Reason_Restore_QuarantineInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Po obnovení ze zálohy byl pozdržen. Před odesláním ho zkontrolujte.`)
};

export const reason_thread_incomplete = /** @type {(inputs: Reason_Thread_IncompleteInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Hlavní příspěvek je zveřejněný, jenže navazující odpověď nebo komentář se nepodařilo odeslat.`)
};

export const reason_verify_inconclusive = /** @type {(inputs: Reason_Verify_InconclusiveInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Nepodařilo se ověřit, jestli je příspěvek zveřejněný.`)
};

export const reason_verify_window_elapsed = /** @type {(inputs: Reason_Verify_Window_ElapsedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Ověřování trvalo příliš dlouho. Příspěvek už možná je zveřejněný.`)
};

export const repeat_after = /** @type {(inputs: Repeat_AfterInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Po počtu příspěvků`)
};

export const repeat_daily = /** @type {(inputs: Repeat_DailyInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Každý den`)
};

export const repeat_ends = /** @type {(inputs: Repeat_EndsInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Konec`)
};

export const repeat_every = /** @type {(inputs: Repeat_EveryInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Interval`)
};

export const repeat_label = /** @type {(inputs: Repeat_LabelInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Opakování`)
};

export const repeat_monthly = /** @type {(inputs: Repeat_MonthlyInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Každý měsíc`)
};

export const repeat_never = /** @type {(inputs: Repeat_NeverInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Nikdy`)
};

export const repeat_on = /** @type {(inputs: Repeat_OnInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`K datu`)
};

export const repeat_warning = /** @type {(inputs: Repeat_WarningInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Některé sítě odmítnou stejný text opakovaný do týdne. Text obměňujte.`)
};

export const repeat_weekly = /** @type {(inputs: Repeat_WeeklyInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Každý týden`)
};

export const reset_confirm = /** @type {(inputs: Reset_ConfirmInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Zopakujte heslo`)
};

export const reset_invalid_link = /** @type {(inputs: Reset_Invalid_LinkInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Odkaz je neplatný nebo mu vypršela platnost. Požádejte o nový.`)
};

export const reset_mismatch = /** @type {(inputs: Reset_MismatchInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Hesla se neshodují.`)
};

export const reset_missing_token = /** @type {(inputs: Reset_Missing_TokenInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Otevřete tuto stránku přes odkaz, který jste dostali.`)
};

export const reset_password = /** @type {(inputs: Reset_PasswordInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Nové heslo`)
};

export const reset_submit = /** @type {(inputs: Reset_SubmitInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Nastavit heslo`)
};

export const reset_submitting = /** @type {(inputs: Reset_SubmittingInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Ukládá se…`)
};

export const reset_subtitle = /** @type {(inputs: Reset_SubtitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Zvolte si heslo k účtu v Kronautu.`)
};

export const reset_title = /** @type {(inputs: Reset_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Nastavte si heslo`)
};

export const series_count = /** @type {(inputs: Series_CountInputs) => LocalizedString} */ (i) => {
	const countPlural = registry.plural("cs", i?.count, {}, true);
	if (countPlural === "one") return /** @type {LocalizedString} */ (`Končí po ${i?.count} příspěvku`);
	return /** @type {LocalizedString} */ (`Končí po ${i?.count} příspěvcích`)
};

export const series_next = /** @type {(inputs: Series_NextInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Další: ${i?.when} (${i?.tz})`)
};

export const series_resume = /** @type {(inputs: Series_ResumeInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Obnovit sérii`)
};

export const series_rule = /** @type {(inputs: Series_RuleInputs) => LocalizedString} */ (i) => {
	const countPlural = registry.plural("cs", i?.count, {}, true);
	if (i?.freq === "daily" && countPlural === "one") return /** @type {LocalizedString} */ (`Každý den`);
	if (i?.freq === "daily" && countPlural === "few") return /** @type {LocalizedString} */ (`Každé ${i?.count} dny`);
	if (i?.freq === "weekly" && countPlural === "one") return /** @type {LocalizedString} */ (`Každý týden: ${i?.days}`);
	if (i?.freq === "weekly" && countPlural === "few") return /** @type {LocalizedString} */ (`Každé ${i?.count} týdny: ${i?.days}`);
	if (i?.freq === "daily") return /** @type {LocalizedString} */ (`Každých ${i?.count} dní`);
	if (i?.freq === "weekly") return /** @type {LocalizedString} */ (`Každých ${i?.count} týdnů: ${i?.days}`);
	if (countPlural === "one") return /** @type {LocalizedString} */ (`Každý měsíc, ${i?.day}. den`);
	if (countPlural === "few") return /** @type {LocalizedString} */ (`Každé ${i?.count} měsíce, ${i?.day}. den`);
	return /** @type {LocalizedString} */ (`Každých ${i?.count} měsíců, ${i?.day}. den`)
};

export const series_state = /** @type {(inputs: Series_StateInputs) => LocalizedString} */ (i) => {
	if (i?.state === "paused") return /** @type {LocalizedString} */ (`Pozastaveno: vlastník série už nemůže plánovat.`);
	if (i?.state === "ended") return /** @type {LocalizedString} */ (`Série skončila.`);
	if (i?.state === "failed") return /** @type {LocalizedString} */ (`Pozastaveno: příspěvek se nepodařilo naplánovat.`);
	return /** @type {LocalizedString} */ (`Série byla zastavena.`)
};

export const series_stop = /** @type {(inputs: Series_StopInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Zastavit sérii`)
};

export const series_stop_body = /** @type {(inputs: Series_Stop_BodyInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Zastavit tuto sérii? Již vytvořené příspěvky zůstanou, jak jsou.`)
};

export const series_until = /** @type {(inputs: Series_UntilInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Končí ${i?.date}`)
};

export const settings_save = /** @type {(inputs: Settings_SaveInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Uložit`)
};

export const settings_title = /** @type {(inputs: Settings_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Nastavení`)
};

export const technical_details = /** @type {(inputs: Technical_DetailsInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Technické podrobnosti`)
};

export const theme_dark = /** @type {(inputs: Theme_DarkInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Vzhled: tmavý`)
};

export const theme_light = /** @type {(inputs: Theme_LightInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Vzhled: světlý`)
};

export const theme_system = /** @type {(inputs: Theme_SystemInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Vzhled: podle systému`)
};

export const workspace_label = /** @type {(inputs: Workspace_LabelInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Pracovní prostor`)
};