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
/** @typedef {{}} Calendar_Add_ChannelInputs */
/** @typedef {{ time: NonNullable<unknown>, channel: NonNullable<unknown>, state: NonNullable<unknown>, text: NonNullable<unknown> }} Calendar_Chip_LabelInputs */
/** @typedef {{}} Calendar_Create_PostInputs */
/** @typedef {{}} Calendar_Day_EmptyInputs */
/** @typedef {{ when: NonNullable<unknown> }} Calendar_Draft_UpdatedInputs */
/** @typedef {{}} Calendar_DraftsInputs */
/** @typedef {{}} Calendar_Drafts_EmptyInputs */
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
/** @typedef {{}} Calendar_TitleInputs */
/** @typedef {{}} Calendar_TodayInputs */
/** @typedef {{}} Calendar_TruncatedInputs */
/** @typedef {{}} Calendar_UndoInputs */
/** @typedef {{}} Calendar_UntitledInputs */
/** @typedef {{}} Calendar_View_DayInputs */
/** @typedef {{}} Calendar_View_ListInputs */
/** @typedef {{}} Calendar_View_MonthInputs */
/** @typedef {{}} Calendar_View_WeekInputs */
/** @typedef {{}} Calendar_ViewsInputs */
/** @typedef {{}} Channel_Status_ActiveInputs */
/** @typedef {{}} Channel_Status_DisabledInputs */
/** @typedef {{}} Channel_Status_DisconnectedInputs */
/** @typedef {{}} Channel_Status_Needs_ReauthInputs */
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
/** @typedef {{}} Channels_Open_ProfileInputs */
/** @typedef {{}} Channels_ReconnectInputs */
/** @typedef {{}} Channels_Server_InvalidInputs */
/** @typedef {{ name: NonNullable<unknown> }} Channels_Server_LabelInputs */
/** @typedef {{}} Channels_Server_PlaceholderInputs */
/** @typedef {{}} Channels_Server_Rate_LimitedInputs */
/** @typedef {{}} Channels_Server_RejectedInputs */
/** @typedef {{}} Channels_Server_UnreachableInputs */
/** @typedef {{}} Channels_SubtitleInputs */
/** @typedef {{}} Channels_TitleInputs */
/** @typedef {{ count: NonNullable<unknown> }} Compose_Alt_Text_HintInputs */
/** @typedef {{ position: NonNullable<unknown> }} Compose_Alt_Text_LabelInputs */
/** @typedef {{ max: NonNullable<unknown> }} Compose_Channel_Image_Too_LargeInputs */
/** @typedef {{}} Compose_Channel_Image_TypeInputs */
/** @typedef {{}} Compose_Channel_Needs_ImageInputs */
/** @typedef {{ count: NonNullable<unknown> }} Compose_Channel_Too_Many_ImagesInputs */
/** @typedef {{}} Compose_Channel_UnsupportedInputs */
/** @typedef {{}} Compose_Channels_TitleInputs */
/** @typedef {{ channels: NonNullable<unknown> }} Compose_Check_ContentInputs */
/** @typedef {{}} Compose_Connect_ChannelInputs */
/** @typedef {{ channel: NonNullable<unknown> }} Compose_CustomizeInputs */
/** @typedef {{}} Compose_CustomizedInputs */
/** @typedef {{}} Compose_DateInputs */
/** @typedef {{}} Compose_Error_Approval_RequiredInputs */
/** @typedef {{}} Compose_Error_ConflictInputs */
/** @typedef {{}} Compose_Error_EmptyInputs */
/** @typedef {{ channel: NonNullable<unknown> }} Compose_Error_Empty_ChannelInputs */
/** @typedef {{}} Compose_Error_FixInputs */
/** @typedef {{}} Compose_Error_No_ChannelInputs */
/** @typedef {{ position: NonNullable<unknown> }} Compose_Error_UploadInputs */
/** @typedef {{ position: NonNullable<unknown>, channel: NonNullable<unknown> }} Compose_Error_Upload_ChannelInputs */
/** @typedef {{}} Compose_Error_When_MissingInputs */
/** @typedef {{ name: NonNullable<unknown> }} Compose_Image_Bad_TypeInputs */
/** @typedef {{ position: NonNullable<unknown> }} Compose_Image_Move_DownInputs */
/** @typedef {{ position: NonNullable<unknown> }} Compose_Image_Move_UpInputs */
/** @typedef {{ position: NonNullable<unknown> }} Compose_Image_PositionInputs */
/** @typedef {{ position: NonNullable<unknown> }} Compose_Image_PreviewInputs */
/** @typedef {{}} Compose_Image_RemoveInputs */
/** @typedef {{ name: NonNullable<unknown>, max: NonNullable<unknown> }} Compose_Image_Too_BigInputs */
/** @typedef {{}} Compose_Images_AddInputs */
/** @typedef {{ count: NonNullable<unknown>, max: NonNullable<unknown> }} Compose_Images_HintInputs */
/** @typedef {{ count: NonNullable<unknown> }} Compose_Images_LimitInputs */
/** @typedef {{}} Compose_Images_TitleInputs */
/** @typedef {{}} Compose_InheritsInputs */
/** @typedef {{ channel: NonNullable<unknown>, message: NonNullable<unknown> }} Compose_Issue_On_ChannelInputs */
/** @typedef {{ channel: NonNullable<unknown>, network: NonNullable<unknown> }} Compose_Limit_ChannelInputs */
/** @typedef {{ channel: NonNullable<unknown>, count: NonNullable<unknown>, max: NonNullable<unknown> }} Compose_Limit_Too_LongInputs */
/** @typedef {{ channel: NonNullable<unknown>, max: NonNullable<unknown> }} Compose_Limit_Too_Many_LinksInputs */
/** @typedef {{ network: NonNullable<unknown>, count: NonNullable<unknown>, max: NonNullable<unknown> }} Compose_Limit_UsageInputs */
/** @typedef {{}} Compose_No_ChannelsInputs */
/** @typedef {{}} Compose_Preview_TitleInputs */
/** @typedef {{}} Compose_Publish_NowInputs */
/** @typedef {{}} Compose_PublishingInputs */
/** @typedef {{}} Compose_Request_ApprovalInputs */
/** @typedef {{}} Compose_Requesting_ApprovalInputs */
/** @typedef {{}} Compose_ScheduleInputs */
/** @typedef {{}} Compose_SchedulingInputs */
/** @typedef {{}} Compose_SubtitleInputs */
/** @typedef {{}} Compose_Tab_AllInputs */
/** @typedef {{}} Compose_Tab_ProblemsInputs */
/** @typedef {{}} Compose_Tabs_LabelInputs */
/** @typedef {{}} Compose_Text_LabelInputs */
/** @typedef {{}} Compose_TimeInputs */
/** @typedef {{ tz: NonNullable<unknown> }} Compose_Time_ZoneInputs */
/** @typedef {{}} Compose_TitleInputs */
/** @typedef {{}} Compose_Use_DefaultInputs */
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
/** @typedef {{}} Home_Empty_BodyInputs */
/** @typedef {{}} Home_Empty_TitleInputs */
/** @typedef {{ count: NonNullable<unknown> }} Inbox_BadgeInputs */
/** @typedef {{ count: NonNullable<unknown> }} Inbox_Badge_OverflowInputs */
/** @typedef {{}} Inbox_CancelInputs */
/** @typedef {{}} Inbox_CanceledInputs */
/** @typedef {{}} Inbox_ChangedInputs */
/** @typedef {{}} Inbox_Confirm_BackInputs */
/** @typedef {{}} Inbox_Duplicate_AckInputs */
/** @typedef {{}} Inbox_Duplicate_BodyInputs */
/** @typedef {{}} Inbox_Duplicate_ConfirmInputs */
/** @typedef {{}} Inbox_Duplicate_TitleInputs */
/** @typedef {{}} Inbox_Empty_BodyInputs */
/** @typedef {{}} Inbox_Empty_TitleInputs */
/** @typedef {{}} Inbox_Load_FailedInputs */
/** @typedef {{}} Inbox_Mark_DoneInputs */
/** @typedef {{}} Inbox_Mark_PublishedInputs */
/** @typedef {{}} Inbox_MarkedInputs */
/** @typedef {{}} Inbox_ReconnectInputs */
/** @typedef {{}} Inbox_Send_AgainInputs */
/** @typedef {{}} Inbox_Sent_AgainInputs */
/** @typedef {{ shown: NonNullable<unknown>, total: NonNullable<unknown> }} Inbox_TruncatedInputs */
/** @typedef {{}} Issue_Alt_Text_RequiredInputs */
/** @typedef {{}} Issue_Alt_Text_Too_LongInputs */
/** @typedef {{}} Issue_Aspect_Out_Of_RangeInputs */
/** @typedef {{}} Issue_File_Too_LargeInputs */
/** @typedef {{}} Issue_GenericInputs */
/** @typedef {{}} Issue_Image_Too_NarrowInputs */
/** @typedef {{}} Issue_Image_Too_WideInputs */
/** @typedef {{}} Issue_In_PastInputs */
/** @typedef {{}} Issue_Invalid_Time_ZoneInputs */
/** @typedef {{}} Issue_Media_Not_AllowedInputs */
/** @typedef {{}} Issue_Mime_UnsupportedInputs */
/** @typedef {{}} Issue_Not_ReadyInputs */
/** @typedef {{}} Issue_Post_Type_UnavailableInputs */
/** @typedef {{}} Issue_Provider_UnavailableInputs */
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
/** @typedef {{}} Nav_ChannelsInputs */
/** @typedef {{}} Nav_InboxInputs */
/** @typedef {{}} Nav_LabelInputs */
/** @typedef {{}} Nav_New_PostInputs */
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
/** @typedef {{ count: NonNullable<unknown> }} Posts_ScheduledInputs */
/** @typedef {{}} Provider_BlueskyInputs */
/** @typedef {{}} Provider_FacebookInputs */
/** @typedef {{}} Provider_InstagramInputs */
/** @typedef {{}} Provider_LinkedinInputs */
/** @typedef {{}} Provider_MastodonInputs */
/** @typedef {{}} Provider_ThreadsInputs */
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
/** @typedef {{}} Reason_Verify_InconclusiveInputs */
/** @typedef {{}} Reason_Verify_Window_ElapsedInputs */
/** @typedef {{}} Reset_ConfirmInputs */
/** @typedef {{}} Reset_Invalid_LinkInputs */
/** @typedef {{}} Reset_MismatchInputs */
/** @typedef {{}} Reset_Missing_TokenInputs */
/** @typedef {{}} Reset_PasswordInputs */
/** @typedef {{}} Reset_SubmitInputs */
/** @typedef {{}} Reset_SubmittingInputs */
/** @typedef {{}} Reset_SubtitleInputs */
/** @typedef {{}} Reset_TitleInputs */
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
/** @typedef {{}} Settings_SaveInputs */
/** @typedef {{}} Settings_SavedInputs */
/** @typedef {{}} Settings_SavingInputs */
/** @typedef {{}} Settings_ThemeInputs */
/** @typedef {{}} Settings_TitleInputs */
/** @typedef {{}} Settings_ToleranceInputs */
/** @typedef {{}} Technical_DetailsInputs */
/** @typedef {{}} Theme_DarkInputs */
/** @typedef {{}} Theme_LightInputs */
/** @typedef {{}} Theme_Option_DarkInputs */
/** @typedef {{}} Theme_Option_LightInputs */
/** @typedef {{}} Theme_Option_SystemInputs */
/** @typedef {{}} Theme_SystemInputs */
/** @typedef {{}} Workspace_LabelInputs */
import * as registry from "../registry.js"


export const account_logout = /** @type {(inputs: Account_LogoutInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Odhlásiť sa`)
};

export const account_menu = /** @type {(inputs: Account_MenuInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Účet`)
};

export const app_name = /** @type {(inputs: App_NameInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Kronaut`)
};

export const approval_approve = /** @type {(inputs: Approval_ApproveInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Schváliť`)
};

export const approval_bound = /** @type {(inputs: Approval_BoundInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Na ${i?.when} (${i?.tz})`)
};

export const approval_changed_after = /** @type {(inputs: Approval_Changed_AfterInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Príspevok sa po schválení zmenil: požiadajte o schválenie znova.`)
};

export const approval_changes_requested = /** @type {(inputs: Approval_Changes_RequestedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Vyžiadané úpravy`)
};

export const approval_error_closed = /** @type {(inputs: Approval_Error_ClosedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`O žiadosti už bolo rozhodnuté. Zobrazuje sa aktuálny stav.`)
};

export const approval_error_waiting = /** @type {(inputs: Approval_Error_WaitingInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Príspevok už čaká na schválenie.`)
};

export const approval_not_approver = /** @type {(inputs: Approval_Not_ApproverInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`V tomto pracovnom priestore nemôžete rozhodovať o schváleniach.`)
};

export const approval_note_label = /** @type {(inputs: Approval_Note_LabelInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Poznámka pre schvaľovateľov (nepovinné)`)
};

export const approval_outside_schedule = /** @type {(inputs: Approval_Outside_ScheduleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Tento čas je mimo schváleného rozsahu. Vyberte schválený čas alebo požiadajte o nové schválenie.`)
};

export const approval_progress = /** @type {(inputs: Approval_ProgressInputs) => LocalizedString} */ (i) => {
	const countPlural = registry.plural("sk", i?.count, {}, true);
	if (countPlural === "one") return /** @type {LocalizedString} */ (`${i?.approved} z ${i?.count} potrebného schválenia`);
	if (countPlural === "few") return /** @type {LocalizedString} */ (`${i?.approved} z ${i?.count} potrebných schválení`);
	if (countPlural === "many") return /** @type {LocalizedString} */ (`${i?.approved} z ${i?.count} potrebného schválenia`);
	return /** @type {LocalizedString} */ (`${i?.approved} z ${i?.count} potrebných schválení`)
};

export const approval_reauth_body = /** @type {(inputs: Approval_Reauth_BodyInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Na rozhodnutie o schválení treba každých 12 hodín znova zadať heslo.`)
};

export const approval_reauth_confirm = /** @type {(inputs: Approval_Reauth_ConfirmInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Potvrdiť`)
};

export const approval_reauth_failed = /** @type {(inputs: Approval_Reauth_FailedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Nepodarilo sa. Skontrolujte heslo: po viacerých chybných pokusoch vás odhlásime.`)
};

export const approval_reauth_title = /** @type {(inputs: Approval_Reauth_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Potvrďte heslo`)
};

export const approval_reject = /** @type {(inputs: Approval_RejectInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Zamietnuť`)
};

export const approval_request_again = /** @type {(inputs: Approval_Request_AgainInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Znova požiadať o schválenie`)
};

export const approval_request_changes = /** @type {(inputs: Approval_Request_ChangesInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Vyžiadať úpravy`)
};

export const approval_requested_by_key = /** @type {(inputs: Approval_Requested_By_KeyInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Žiadosť od API kľúča, ${i?.when}`)
};

export const approval_requested_by_member = /** @type {(inputs: Approval_Requested_By_MemberInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Žiadosť od iného člena, ${i?.when}`)
};

export const approval_requested_by_you = /** @type {(inputs: Approval_Requested_By_YouInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Žiadosť od vás, ${i?.when}`)
};

export const approval_schedule_approved = /** @type {(inputs: Approval_Schedule_ApprovedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Naplánovať podľa schválenia`)
};

export const approval_self = /** @type {(inputs: Approval_SelfInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`O vlastnej žiadosti nemôžete rozhodnúť.`)
};

export const approval_state_approved = /** @type {(inputs: Approval_State_ApprovedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Schválené`)
};

export const approval_state_open = /** @type {(inputs: Approval_State_OpenInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Čaká na schválenie`)
};

export const approval_state_rejected = /** @type {(inputs: Approval_State_RejectedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Zamietnuté`)
};

export const approval_state_revoked = /** @type {(inputs: Approval_State_RevokedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Odvolané`)
};

export const approval_state_voided = /** @type {(inputs: Approval_State_VoidedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Už neplatí`)
};

export const approval_state_withdrawn = /** @type {(inputs: Approval_State_WithdrawnInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Stiahnuté`)
};

export const approval_title = /** @type {(inputs: Approval_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Schválenie`)
};

export const approval_tolerance = /** @type {(inputs: Approval_ToleranceInputs) => LocalizedString} */ (i) => {
	const countPlural = registry.plural("sk", i?.count, {}, true);
	if (countPlural === "one") return /** @type {LocalizedString} */ (`± ${i?.count} minúta`);
	if (countPlural === "few") return /** @type {LocalizedString} */ (`± ${i?.count} minúty`);
	if (countPlural === "many") return /** @type {LocalizedString} */ (`± ${i?.count} minúty`);
	return /** @type {LocalizedString} */ (`± ${i?.count} minút`)
};

export const approval_void_content = /** @type {(inputs: Approval_Void_ContentInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Obsah sa po žiadosti zmenil.`)
};

export const approval_void_destinations = /** @type {(inputs: Approval_Void_DestinationsInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Kanály sa po žiadosti zmenili.`)
};

export const approval_void_policy = /** @type {(inputs: Approval_Void_PolicyInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Pravidlá schvaľovania sa zmenili.`)
};

export const approval_void_schedule = /** @type {(inputs: Approval_Void_ScheduleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Čas sa po žiadosti zmenil.`)
};

export const approval_withdraw = /** @type {(inputs: Approval_WithdrawInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Stiahnuť žiadosť`)
};

export const calendar_add_channel = /** @type {(inputs: Calendar_Add_ChannelInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Pridať kanál`)
};

export const calendar_chip_label = /** @type {(inputs: Calendar_Chip_LabelInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`${i?.time}, ${i?.channel}, ${i?.state}: ${i?.text}`)
};

export const calendar_create_post = /** @type {(inputs: Calendar_Create_PostInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Vytvoriť príspevok`)
};

export const calendar_day_empty = /** @type {(inputs: Calendar_Day_EmptyInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Nič naplánované`)
};

export const calendar_draft_updated = /** @type {(inputs: Calendar_Draft_UpdatedInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Upravené ${i?.when}`)
};

export const calendar_drafts = /** @type {(inputs: Calendar_DraftsInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Koncepty`)
};

export const calendar_drafts_empty = /** @type {(inputs: Calendar_Drafts_EmptyInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Žiadne koncepty.`)
};

export const calendar_layout = /** @type {(inputs: Calendar_LayoutInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Rozloženie`)
};

export const calendar_layout_grid = /** @type {(inputs: Calendar_Layout_GridInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Mriežka`)
};

export const calendar_load_failed = /** @type {(inputs: Calendar_Load_FailedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Kalendár sa nepodarilo načítať. Skúste to znova.`)
};

export const calendar_more = /** @type {(inputs: Calendar_MoreInputs) => LocalizedString} */ (i) => {
	const countPlural = registry.plural("sk", i?.count, {}, true);
	if (countPlural === "one") return /** @type {LocalizedString} */ (`+${i?.count} ďalší`);
	if (countPlural === "few") return /** @type {LocalizedString} */ (`+${i?.count} ďalšie`);
	if (countPlural === "many") return /** @type {LocalizedString} */ (`+${i?.count} ďalšieho`);
	return /** @type {LocalizedString} */ (`+${i?.count} ďalších`)
};

export const calendar_move_approval = /** @type {(inputs: Calendar_Move_ApprovalInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Pred presunutím musí byť príspevok schválený.`)
};

export const calendar_move_changed = /** @type {(inputs: Calendar_Move_ChangedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Príspevok medzitým zmenil niekto iný. Kalendár teraz zobrazuje jeho aktuálnu verziu.`)
};

export const calendar_move_failed = /** @type {(inputs: Calendar_Move_FailedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Príspevok sa nepodarilo presunúť. Skúste to znova.`)
};

export const calendar_move_hint = /** @type {(inputs: Calendar_Move_HintInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Príspevok posuniete o deň alebo o týždeň klávesom Shift so šípkami. Všetky jeho kanály sa presunú spolu.`)
};

export const calendar_move_in_past = /** @type {(inputs: Calendar_Move_In_PastInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Tento čas už uplynul. Vyberte neskorší deň.`)
};

export const calendar_move_reapproval = /** @type {(inputs: Calendar_Move_ReapprovalInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Tento čas je mimo schváleného rozsahu, príspevok preto treba znova schváliť.`)
};

export const calendar_move_unavailable = /** @type {(inputs: Calendar_Move_UnavailableInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Príspevok sa teraz nedá presunúť. Možno sa práve uverejňuje.`)
};

export const calendar_moved = /** @type {(inputs: Calendar_MovedInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Presunuté na ${i?.when}`)
};

export const calendar_navigation = /** @type {(inputs: Calendar_NavigationInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Pohyb v kalendári`)
};

export const calendar_new_post_at = /** @type {(inputs: Calendar_New_Post_AtInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Vytvoriť príspevok: ${i?.when}`)
};

export const calendar_next_day = /** @type {(inputs: Calendar_Next_DayInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Nasledujúci deň`)
};

export const calendar_next_month = /** @type {(inputs: Calendar_Next_MonthInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Nasledujúci mesiac`)
};

export const calendar_next_week = /** @type {(inputs: Calendar_Next_WeekInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Nasledujúci týždeň`)
};

export const calendar_own_time = /** @type {(inputs: Calendar_Own_TimeInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`${i?.when} v časovom pásme ${i?.tz}`)
};

export const calendar_previous_day = /** @type {(inputs: Calendar_Previous_DayInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Predchádzajúci deň`)
};

export const calendar_previous_month = /** @type {(inputs: Calendar_Previous_MonthInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Predchádzajúci mesiac`)
};

export const calendar_previous_week = /** @type {(inputs: Calendar_Previous_WeekInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Predchádzajúci týždeň`)
};

export const calendar_sidebar_collapse = /** @type {(inputs: Calendar_Sidebar_CollapseInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Zbaliť bočný panel`)
};

export const calendar_sidebar_expand = /** @type {(inputs: Calendar_Sidebar_ExpandInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Rozbaliť bočný panel`)
};

export const calendar_time_zone = /** @type {(inputs: Calendar_Time_ZoneInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Časy v časovom pásme ${i?.tz}`)
};

export const calendar_title = /** @type {(inputs: Calendar_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Kalendár`)
};

export const calendar_today = /** @type {(inputs: Calendar_TodayInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Dnes`)
};

export const calendar_truncated = /** @type {(inputs: Calendar_TruncatedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`V tomto období je viac príspevkov, než dokáže kalendár zobraziť, preto niektoré chýbajú. Ak ich chcete vidieť všetky, vyberte kratšie obdobie.`)
};

export const calendar_undo = /** @type {(inputs: Calendar_UndoInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Vrátiť späť`)
};

export const calendar_untitled = /** @type {(inputs: Calendar_UntitledInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Bez textu`)
};

export const calendar_view_day = /** @type {(inputs: Calendar_View_DayInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Deň`)
};

export const calendar_view_list = /** @type {(inputs: Calendar_View_ListInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Zoznam`)
};

export const calendar_view_month = /** @type {(inputs: Calendar_View_MonthInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Mesiac`)
};

export const calendar_view_week = /** @type {(inputs: Calendar_View_WeekInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Týždeň`)
};

export const calendar_views = /** @type {(inputs: Calendar_ViewsInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Zobrazenie kalendára`)
};

export const channel_status_active = /** @type {(inputs: Channel_Status_ActiveInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Aktívny`)
};

export const channel_status_disabled = /** @type {(inputs: Channel_Status_DisabledInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Vypnutý`)
};

export const channel_status_disconnected = /** @type {(inputs: Channel_Status_DisconnectedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Odpojený`)
};

export const channel_status_needs_reauth = /** @type {(inputs: Channel_Status_Needs_ReauthInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Treba znova pripojiť`)
};

export const channels_connect_bad_url = /** @type {(inputs: Channels_Connect_Bad_UrlInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Sieť vrátila nebezpečnú prihlasovaciu adresu, preto sa pripájanie zastavilo.`)
};

export const channels_connect_body = /** @type {(inputs: Channels_Connect_BodyInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Prihlásite sa v sieti a potom sa vrátite sem.`)
};

export const channels_connect_button = /** @type {(inputs: Channels_Connect_ButtonInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Pripojiť ${i?.name}`)
};

export const channels_connect_check_handle = /** @type {(inputs: Channels_Connect_Check_HandleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Sieť požiadavku neprijala. Skontrolujte používateľské meno a skúste to znova.`)
};

export const channels_connect_none = /** @type {(inputs: Channels_Connect_NoneInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Na tomto serveri zatiaľ nie je nastavená žiadna sieť. Požiadajte správcu servera, aby ju zaregistroval.`)
};

export const channels_connect_not_set_up = /** @type {(inputs: Channels_Connect_Not_Set_UpInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Táto sieť nie je na tomto serveri nastavená.`)
};

export const channels_connect_title = /** @type {(inputs: Channels_Connect_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Pripojiť kanál`)
};

export const channels_connect_unavailable = /** @type {(inputs: Channels_Connect_UnavailableInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Sieť je momentálne nedostupná. Skúste to neskôr.`)
};

export const channels_connected = /** @type {(inputs: Channels_ConnectedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Kanál je pripojený.`)
};

export const channels_connected_list = /** @type {(inputs: Channels_Connected_ListInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Pripojené kanály: ${i?.names}.`)
};

export const channels_connected_named = /** @type {(inputs: Channels_Connected_NamedInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Kanál ${i?.name} je pripojený.`)
};

export const channels_disconnect = /** @type {(inputs: Channels_DisconnectInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Odpojiť`)
};

export const channels_disconnect_body = /** @type {(inputs: Channels_Disconnect_BodyInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Odpojiť ${i?.name}? Príspevky naplánované do tohto kanála sa nezverejnia. Neskôr ho môžete znova pripojiť.`)
};

export const channels_disconnect_confirm = /** @type {(inputs: Channels_Disconnect_ConfirmInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Odpojiť kanál`)
};

export const channels_disconnected = /** @type {(inputs: Channels_DisconnectedInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Kanál ${i?.name} bol odpojený.`)
};

export const channels_empty_body = /** @type {(inputs: Channels_Empty_BodyInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Nižšie pripojte účet a môžete začať publikovať.`)
};

export const channels_empty_title = /** @type {(inputs: Channels_Empty_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Zatiaľ žiadne kanály`)
};

export const channels_error_app_config = /** @type {(inputs: Channels_Error_App_ConfigInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Táto sieť nie je na serveri správne nastavená. Obráťte sa na správcu servera.`)
};

export const channels_error_forbidden = /** @type {(inputs: Channels_Error_ForbiddenInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`V tomto pracovnom priestore nemôžete pripájať kanály.`)
};

export const channels_error_generic = /** @type {(inputs: Channels_Error_GenericInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Kanál sa nepodarilo pripojiť. Skúste to znova.`)
};

export const channels_error_no_accounts = /** @type {(inputs: Channels_Error_No_AccountsInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Žiadny účet nebol sprístupnený. Pripojte kanál znova a vyberte aspoň jednu stránku, na ktorej môžete uverejňovať príspevky.`)
};

export const channels_error_provider_denied = /** @type {(inputs: Channels_Error_Provider_DeniedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Pripojenie bolo v sieti zrušené.`)
};

export const channels_error_provider_error = /** @type {(inputs: Channels_Error_Provider_ErrorInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Sieť pripojenie nedokončila. Skúste to znova.`)
};

export const channels_error_server_error = /** @type {(inputs: Channels_Error_Server_ErrorInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Kanál sa nepodarilo uložiť. Skúste to znova.`)
};

export const channels_error_session_mismatch = /** @type {(inputs: Channels_Error_Session_MismatchInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Pripojenie sa dokončilo pod iným prihlásením. Začnite znova.`)
};

export const channels_error_state_invalid = /** @type {(inputs: Channels_Error_State_InvalidInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Odkaz na pripojenie vypršal alebo už bol použitý. Začnite znova.`)
};

export const channels_error_too_many_accounts = /** @type {(inputs: Channels_Error_Too_Many_AccountsInputs) => LocalizedString} */ (i) => {
	const maxPlural = registry.plural("sk", i?.max, {}, true);
	if (maxPlural === "one") return /** @type {LocalizedString} */ (`Sprístupnili ste priveľa účtov. Pripojte kanál znova a vyberte najviac ${i?.max} účet.`);
	if (maxPlural === "few") return /** @type {LocalizedString} */ (`Sprístupnili ste priveľa účtov. Pripojte kanál znova a vyberte najviac ${i?.max} účty.`);
	if (maxPlural === "many") return /** @type {LocalizedString} */ (`Sprístupnili ste priveľa účtov. Pripojte kanál znova a vyberte najviac ${i?.max} účtu.`);
	return /** @type {LocalizedString} */ (`Sprístupnili ste priveľa účtov. Pripojte kanál znova a vyberte najviac ${i?.max} účtov.`)
};

export const channels_expires = /** @type {(inputs: Channels_ExpiresInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Prístup vyprší ${i?.date}`)
};

export const channels_handle_label = /** @type {(inputs: Channels_Handle_LabelInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Vaše používateľské meno (nepovinné)`)
};

export const channels_handle_placeholder = /** @type {(inputs: Channels_Handle_PlaceholderInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`vasemeno.bsky.social`)
};

export const channels_open_profile = /** @type {(inputs: Channels_Open_ProfileInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Otvoriť profil`)
};

export const channels_reconnect = /** @type {(inputs: Channels_ReconnectInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Znova pripojiť`)
};

export const channels_server_invalid = /** @type {(inputs: Channels_Server_InvalidInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Zadajte názov servera, napríklad mastodon.social.`)
};

export const channels_server_label = /** @type {(inputs: Channels_Server_LabelInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Váš server ${i?.name}`)
};

export const channels_server_placeholder = /** @type {(inputs: Channels_Server_PlaceholderInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`mastodon.social`)
};

export const channels_server_rate_limited = /** @type {(inputs: Channels_Server_Rate_LimitedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`V poslednom čase sa nastavilo priveľa serverov. Skúste to znova o hodinu.`)
};

export const channels_server_rejected = /** @type {(inputs: Channels_Server_RejectedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Tento server Kronaut neprijal. Skontrolujte názov alebo skúste iný server.`)
};

export const channels_server_unreachable = /** @type {(inputs: Channels_Server_UnreachableInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`K tomuto serveru sa nepodarilo pripojiť. Skúste to neskôr.`)
};

export const channels_subtitle = /** @type {(inputs: Channels_SubtitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Sociálne účty, na ktoré tento pracovný priestor publikuje.`)
};

export const channels_title = /** @type {(inputs: Channels_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Kanály`)
};

export const compose_alt_text_hint = /** @type {(inputs: Compose_Alt_Text_HintInputs) => LocalizedString} */ (i) => {
	const countPlural = registry.plural("sk", i?.count, {}, true);
	if (countPlural === "one") return /** @type {LocalizedString} */ (`Opíšte obrázok pre ľudí, ktorí ho nevidia. Najviac ${i?.count} znak.`);
	if (countPlural === "few") return /** @type {LocalizedString} */ (`Opíšte obrázok pre ľudí, ktorí ho nevidia. Najviac ${i?.count} znaky.`);
	if (countPlural === "many") return /** @type {LocalizedString} */ (`Opíšte obrázok pre ľudí, ktorí ho nevidia. Najviac ${i?.count} znaku.`);
	return /** @type {LocalizedString} */ (`Opíšte obrázok pre ľudí, ktorí ho nevidia. Najviac ${i?.count} znakov.`)
};

export const compose_alt_text_label = /** @type {(inputs: Compose_Alt_Text_LabelInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Alternatívny text k obrázku ${i?.position}`)
};

export const compose_channel_image_too_large = /** @type {(inputs: Compose_Channel_Image_Too_LargeInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Obrázok je väčší ako ${i?.max}, ktoré táto sieť prijme.`)
};

export const compose_channel_image_type = /** @type {(inputs: Compose_Channel_Image_TypeInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Táto sieť neprijíma formát niektorého z priložených obrázkov.`)
};

export const compose_channel_needs_image = /** @type {(inputs: Compose_Channel_Needs_ImageInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Potrebuje aspoň jeden obrázok.`)
};

export const compose_channel_too_many_images = /** @type {(inputs: Compose_Channel_Too_Many_ImagesInputs) => LocalizedString} */ (i) => {
	const countPlural = registry.plural("sk", i?.count, {}, true);
	if (countPlural === "one") return /** @type {LocalizedString} */ (`Táto sieť prijme najviac ${i?.count} obrázok.`);
	if (countPlural === "few") return /** @type {LocalizedString} */ (`Táto sieť prijme najviac ${i?.count} obrázky.`);
	if (countPlural === "many") return /** @type {LocalizedString} */ (`Táto sieť prijme najviac ${i?.count} obrázka.`);
	return /** @type {LocalizedString} */ (`Táto sieť prijme najviac ${i?.count} obrázkov.`)
};

export const compose_channel_unsupported = /** @type {(inputs: Compose_Channel_UnsupportedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Uverejňovanie v tejto sieti zatiaľ nie je podporované.`)
};

export const compose_channels_title = /** @type {(inputs: Compose_Channels_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Kanály`)
};

export const compose_check_content = /** @type {(inputs: Compose_Check_ContentInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Skontrolujte obsah pre ${i?.channels}.`)
};

export const compose_connect_channel = /** @type {(inputs: Compose_Connect_ChannelInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Pripojiť kanál`)
};

export const compose_customize = /** @type {(inputs: Compose_CustomizeInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Prispôsobiť pre ${i?.channel}`)
};

export const compose_customized = /** @type {(inputs: Compose_CustomizedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Prispôsobené`)
};

export const compose_date = /** @type {(inputs: Compose_DateInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Dátum`)
};

export const compose_error_approval_required = /** @type {(inputs: Compose_Error_Approval_RequiredInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Príspevok treba pred naplánovaním schváliť.`)
};

export const compose_error_conflict = /** @type {(inputs: Compose_Error_ConflictInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Príspevok sa medzitým zmenil. Skúste to znova.`)
};

export const compose_error_empty = /** @type {(inputs: Compose_Error_EmptyInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Napíšte text alebo pridajte obrázok.`)
};

export const compose_error_empty_channel = /** @type {(inputs: Compose_Error_Empty_ChannelInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Pre ${i?.channel} napíšte text alebo pridajte obrázok.`)
};

export const compose_error_fix = /** @type {(inputs: Compose_Error_FixInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Príspevok zatiaľ nemožno odoslať. Opravte nasledujúce a skúste to znova:`)
};

export const compose_error_no_channel = /** @type {(inputs: Compose_Error_No_ChannelInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Vyberte aspoň jeden kanál.`)
};

export const compose_error_upload = /** @type {(inputs: Compose_Error_UploadInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Obrázok ${i?.position} sa nepodarilo nahrať.`)
};

export const compose_error_upload_channel = /** @type {(inputs: Compose_Error_Upload_ChannelInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Obrázok ${i?.position} pre ${i?.channel} sa nepodarilo nahrať.`)
};

export const compose_error_when_missing = /** @type {(inputs: Compose_Error_When_MissingInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Vyberte dátum a čas.`)
};

export const compose_image_bad_type = /** @type {(inputs: Compose_Image_Bad_TypeInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`${i?.name}: pridať môžete iba obrázky JPEG, PNG a WebP.`)
};

export const compose_image_move_down = /** @type {(inputs: Compose_Image_Move_DownInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Posunúť obrázok ${i?.position} nižšie`)
};

export const compose_image_move_up = /** @type {(inputs: Compose_Image_Move_UpInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Posunúť obrázok ${i?.position} vyššie`)
};

export const compose_image_position = /** @type {(inputs: Compose_Image_PositionInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Obrázok ${i?.position}`)
};

export const compose_image_preview = /** @type {(inputs: Compose_Image_PreviewInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Náhľad obrázka ${i?.position}`)
};

export const compose_image_remove = /** @type {(inputs: Compose_Image_RemoveInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Odstrániť`)
};

export const compose_image_too_big = /** @type {(inputs: Compose_Image_Too_BigInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`${i?.name}: súbor je väčší ako ${i?.max}.`)
};

export const compose_images_add = /** @type {(inputs: Compose_Images_AddInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Pridať obrázky`)
};

export const compose_images_hint = /** @type {(inputs: Compose_Images_HintInputs) => LocalizedString} */ (i) => {
	const countPlural = registry.plural("sk", i?.count, {}, true);
	if (countPlural === "one") return /** @type {LocalizedString} */ (`Najviac ${i?.count} obrázok vo formáte JPEG, PNG alebo WebP, každý do ${i?.max}.`);
	if (countPlural === "few") return /** @type {LocalizedString} */ (`Najviac ${i?.count} obrázky vo formáte JPEG, PNG alebo WebP, každý do ${i?.max}.`);
	if (countPlural === "many") return /** @type {LocalizedString} */ (`Najviac ${i?.count} obrázka vo formáte JPEG, PNG alebo WebP, každý do ${i?.max}.`);
	return /** @type {LocalizedString} */ (`Najviac ${i?.count} obrázkov vo formáte JPEG, PNG alebo WebP, každý do ${i?.max}.`)
};

export const compose_images_limit = /** @type {(inputs: Compose_Images_LimitInputs) => LocalizedString} */ (i) => {
	const countPlural = registry.plural("sk", i?.count, {}, true);
	if (countPlural === "one") return /** @type {LocalizedString} */ (`Príspevok môže mať najviac ${i?.count} obrázok.`);
	if (countPlural === "few") return /** @type {LocalizedString} */ (`Príspevok môže mať najviac ${i?.count} obrázky.`);
	if (countPlural === "many") return /** @type {LocalizedString} */ (`Príspevok môže mať najviac ${i?.count} obrázka.`);
	return /** @type {LocalizedString} */ (`Príspevok môže mať najviac ${i?.count} obrázkov.`)
};

export const compose_images_title = /** @type {(inputs: Compose_Images_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Obrázky`)
};

export const compose_inherits = /** @type {(inputs: Compose_InheritsInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Používa obsah zo záložky Všetky kanály.`)
};

export const compose_issue_on_channel = /** @type {(inputs: Compose_Issue_On_ChannelInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`${i?.channel}: ${i?.message}`)
};

export const compose_limit_channel = /** @type {(inputs: Compose_Limit_ChannelInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`${i?.channel} (${i?.network})`)
};

export const compose_limit_too_long = /** @type {(inputs: Compose_Limit_Too_LongInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Pre ${i?.channel} je text príliš dlhý (${i?.count}/${i?.max})`)
};

export const compose_limit_too_many_links = /** @type {(inputs: Compose_Limit_Too_Many_LinksInputs) => LocalizedString} */ (i) => {
	const maxPlural = registry.plural("sk", i?.max, {}, true);
	if (maxPlural === "one") return /** @type {LocalizedString} */ (`${i?.channel} povoľuje najviac ${i?.max} odkaz`);
	if (maxPlural === "few") return /** @type {LocalizedString} */ (`${i?.channel} povoľuje najviac ${i?.max} odkazy`);
	if (maxPlural === "many") return /** @type {LocalizedString} */ (`${i?.channel} povoľuje najviac ${i?.max} odkazu`);
	return /** @type {LocalizedString} */ (`${i?.channel} povoľuje najviac ${i?.max} odkazov`)
};

export const compose_limit_usage = /** @type {(inputs: Compose_Limit_UsageInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`${i?.network} ${i?.count}/${i?.max}`)
};

export const compose_no_channels = /** @type {(inputs: Compose_No_ChannelsInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Zatiaľ nemáte pripojený žiadny kanál.`)
};

export const compose_preview_title = /** @type {(inputs: Compose_Preview_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Náhľad`)
};

export const compose_publish_now = /** @type {(inputs: Compose_Publish_NowInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Uverejniť hneď`)
};

export const compose_publishing = /** @type {(inputs: Compose_PublishingInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Uverejňuje sa…`)
};

export const compose_request_approval = /** @type {(inputs: Compose_Request_ApprovalInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Požiadať o schválenie`)
};

export const compose_requesting_approval = /** @type {(inputs: Compose_Requesting_ApprovalInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Odosiela sa žiadosť…`)
};

export const compose_schedule = /** @type {(inputs: Compose_ScheduleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Naplánovať`)
};

export const compose_scheduling = /** @type {(inputs: Compose_SchedulingInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Plánuje sa…`)
};

export const compose_subtitle = /** @type {(inputs: Compose_SubtitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Napíšte ho raz, vyberte kanály a potom ho uverejnite hneď alebo naplánujte.`)
};

export const compose_tab_all = /** @type {(inputs: Compose_Tab_AllInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Všetky kanály`)
};

export const compose_tab_problems = /** @type {(inputs: Compose_Tab_ProblemsInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`obsahuje chyby`)
};

export const compose_tabs_label = /** @type {(inputs: Compose_Tabs_LabelInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Obsah pre jednotlivé kanály`)
};

export const compose_text_label = /** @type {(inputs: Compose_Text_LabelInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Text`)
};

export const compose_time = /** @type {(inputs: Compose_TimeInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Čas`)
};

export const compose_time_zone = /** @type {(inputs: Compose_Time_ZoneInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Časové pásmo: ${i?.tz}`)
};

export const compose_title = /** @type {(inputs: Compose_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Nový príspevok`)
};

export const compose_use_default = /** @type {(inputs: Compose_Use_DefaultInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Použiť obsah zo záložky Všetky kanály`)
};

export const compose_when_title = /** @type {(inputs: Compose_When_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Kedy`)
};

export const destination_state_awaiting_manual = /** @type {(inputs: Destination_State_Awaiting_ManualInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Čaká, kým ho uverejníte vy`)
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
	return /** @type {LocalizedString} */ (`Zlyhal`)
};

export const destination_state_published = /** @type {(inputs: Destination_State_PublishedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Uverejnený`)
};

export const destination_state_publishing = /** @type {(inputs: Destination_State_PublishingInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Uverejňuje sa`)
};

export const destination_state_retry_wait = /** @type {(inputs: Destination_State_Retry_WaitInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Čaká na ďalší pokus`)
};

export const destination_state_scheduled = /** @type {(inputs: Destination_State_ScheduledInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Naplánovaný`)
};

export const destination_state_unconfirmed = /** @type {(inputs: Destination_State_UnconfirmedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Nepotvrdený`)
};

export const destination_state_verifying = /** @type {(inputs: Destination_State_VerifyingInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Overuje sa`)
};

export const dismiss = /** @type {(inputs: DismissInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Zavrieť`)
};

export const email_footer = /** @type {(inputs: Email_FooterInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Tento e-mail vám posielame, lebo patríte do pracovného priestoru ${i?.workspace} v Kronaute.`)
};

export const email_manage = /** @type {(inputs: Email_ManageInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Vyberte si, ktoré e-maily chcete dostávať: ${i?.url}`)
};

export const email_open = /** @type {(inputs: Email_OpenInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Otvoriť v Kronaute: ${i?.url}`)
};

export const email_post = /** @type {(inputs: Email_PostInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Príspevok: ${i?.excerpt}`)
};

export const error_forbidden = /** @type {(inputs: Error_ForbiddenInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Požiadavka bola zablokovaná. Obnovte stránku a skúste to znova.`)
};

export const error_generic = /** @type {(inputs: Error_GenericInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Niečo sa pokazilo. Skúste to znova.`)
};

export const error_invalid_credentials = /** @type {(inputs: Error_Invalid_CredentialsInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`E-mail alebo heslo nie je správne.`)
};

export const error_invalid_request = /** @type {(inputs: Error_Invalid_RequestInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Skontrolujte vyplnené polia a skúste to znova.`)
};

export const error_logout_failed = /** @type {(inputs: Error_Logout_FailedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Odhlásenie sa nepodarilo. Skúste to znova.`)
};

export const error_rate_limited = /** @type {(inputs: Error_Rate_LimitedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Príliš veľa pokusov. Chvíľu počkajte a skúste to znova.`)
};

export const error_unavailable = /** @type {(inputs: Error_UnavailableInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Kronaut je momentálne nedostupný. Skúste to o chvíľu.`)
};

export const home_empty_body = /** @type {(inputs: Home_Empty_BodyInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Tu sa zobrazia príspevky, ktoré naplánujete.`)
};

export const home_empty_title = /** @type {(inputs: Home_Empty_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Zatiaľ nemáte nič naplánované`)
};

export const inbox_badge = /** @type {(inputs: Inbox_BadgeInputs) => LocalizedString} */ (i) => {
	const countPlural = registry.plural("sk", i?.count, {}, true);
	if (countPlural === "one") return /** @type {LocalizedString} */ (`${i?.count} položka čaká na riešenie`);
	if (countPlural === "few") return /** @type {LocalizedString} */ (`${i?.count} položky čakajú na riešenie`);
	if (countPlural === "many") return /** @type {LocalizedString} */ (`${i?.count} položky čaká na riešenie`);
	return /** @type {LocalizedString} */ (`${i?.count} položiek čaká na riešenie`)
};

export const inbox_badge_overflow = /** @type {(inputs: Inbox_Badge_OverflowInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`${i?.count}+`)
};

export const inbox_cancel = /** @type {(inputs: Inbox_CancelInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Zrušiť`)
};

export const inbox_canceled = /** @type {(inputs: Inbox_CanceledInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Zrušené.`)
};

export const inbox_changed = /** @type {(inputs: Inbox_ChangedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Položka sa medzitým zmenila. Zoznam teraz ukazuje jej aktuálny stav.`)
};

export const inbox_confirm_back = /** @type {(inputs: Inbox_Confirm_BackInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Teraz nie`)
};

export const inbox_duplicate_ack = /** @type {(inputs: Inbox_Duplicate_AckInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Môže sa uverejniť dvakrát`)
};

export const inbox_duplicate_body = /** @type {(inputs: Inbox_Duplicate_BodyInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Sieť ho možno už prijala. Ak ho odošlete znova, môže sa uverejniť dvakrát.`)
};

export const inbox_duplicate_confirm = /** @type {(inputs: Inbox_Duplicate_ConfirmInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Napriek tomu odoslať`)
};

export const inbox_duplicate_title = /** @type {(inputs: Inbox_Duplicate_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Príspevok už možno je uverejnený`)
};

export const inbox_empty_body = /** @type {(inputs: Inbox_Empty_BodyInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Zobrazia sa tu príspevky, ktoré zlyhali, sú zablokované alebo čakajú na vás.`)
};

export const inbox_empty_title = /** @type {(inputs: Inbox_Empty_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Nič nevyžaduje vašu pozornosť`)
};

export const inbox_load_failed = /** @type {(inputs: Inbox_Load_FailedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Zoznam sa nepodarilo načítať. Skúste to znova.`)
};

export const inbox_mark_done = /** @type {(inputs: Inbox_Mark_DoneInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Označiť ako hotový`)
};

export const inbox_mark_published = /** @type {(inputs: Inbox_Mark_PublishedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Označiť ako uverejnený`)
};

export const inbox_marked = /** @type {(inputs: Inbox_MarkedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Označené ako uverejnené.`)
};

export const inbox_reconnect = /** @type {(inputs: Inbox_ReconnectInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Znova pripojiť kanál`)
};

export const inbox_send_again = /** @type {(inputs: Inbox_Send_AgainInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Odoslať znova`)
};

export const inbox_sent_again = /** @type {(inputs: Inbox_Sent_AgainInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Čoskoro sa odošle znova.`)
};

export const inbox_truncated = /** @type {(inputs: Inbox_TruncatedInputs) => LocalizedString} */ (i) => {
	const totalPlural = registry.plural("sk", i?.total, {}, true);
	if (totalPlural === "one") return /** @type {LocalizedString} */ (`Zobrazujú sa len najnovšie: ${i?.shown} z ${i?.total} položky.`);
	if (totalPlural === "few") return /** @type {LocalizedString} */ (`Zobrazujú sa len najnovšie: ${i?.shown} z ${i?.total} položiek.`);
	if (totalPlural === "many") return /** @type {LocalizedString} */ (`Zobrazujú sa len najnovšie: ${i?.shown} z ${i?.total} položky.`);
	return /** @type {LocalizedString} */ (`Zobrazujú sa len najnovšie: ${i?.shown} z ${i?.total} položiek.`)
};

export const issue_alt_text_required = /** @type {(inputs: Issue_Alt_Text_RequiredInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Táto sieť vyžaduje alternatívny text pri každom obrázku.`)
};

export const issue_alt_text_too_long = /** @type {(inputs: Issue_Alt_Text_Too_LongInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Alternatívny text je pre túto sieť príliš dlhý.`)
};

export const issue_aspect_out_of_range = /** @type {(inputs: Issue_Aspect_Out_Of_RangeInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Pomer strán obrázka táto sieť nepovoľuje.`)
};

export const issue_file_too_large = /** @type {(inputs: Issue_File_Too_LargeInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Súbor obrázka je príliš veľký.`)
};

export const issue_generic = /** @type {(inputs: Issue_GenericInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Niečo sa pokazilo. Viac prezradia technické podrobnosti.`)
};

export const issue_image_too_narrow = /** @type {(inputs: Issue_Image_Too_NarrowInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Obrázok je pre túto sieť príliš úzky.`)
};

export const issue_image_too_wide = /** @type {(inputs: Issue_Image_Too_WideInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Obrázok je pre túto sieť príliš široký.`)
};

export const issue_in_past = /** @type {(inputs: Issue_In_PastInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Zvolený čas už uplynul. Vyberte neskorší.`)
};

export const issue_invalid_time_zone = /** @type {(inputs: Issue_Invalid_Time_ZoneInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Časové pásmo sa nepodarilo rozpoznať.`)
};

export const issue_media_not_allowed = /** @type {(inputs: Issue_Media_Not_AllowedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Tento typ príspevku nemôže obsahovať obrázky.`)
};

export const issue_mime_unsupported = /** @type {(inputs: Issue_Mime_UnsupportedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Táto sieť neprijíma tento formát obrázka.`)
};

export const issue_not_ready = /** @type {(inputs: Issue_Not_ReadyInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Obrázok sa ešte spracúva. Skúste to o chvíľu.`)
};

export const issue_post_type_unavailable = /** @type {(inputs: Issue_Post_Type_UnavailableInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Tento typ príspevku nie je pre kanál dostupný.`)
};

export const issue_provider_unavailable = /** @type {(inputs: Issue_Provider_UnavailableInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Táto sieť nie je na tomto serveri momentálne dostupná.`)
};

export const issue_text_too_long = /** @type {(inputs: Issue_Text_Too_LongInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Text je pre túto sieť príliš dlhý.`)
};

export const issue_too_few_media = /** @type {(inputs: Issue_Too_Few_MediaInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Tento typ príspevku potrebuje v tejto sieti viac obrázkov.`)
};

export const issue_too_large = /** @type {(inputs: Issue_Too_LargeInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Príspevok je príliš veľký.`)
};

export const issue_too_many_links = /** @type {(inputs: Issue_Too_Many_LinksInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Text má na túto sieť priveľa odkazov.`)
};

export const issue_too_many_media = /** @type {(inputs: Issue_Too_Many_MediaInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Na túto sieť je obrázkov priveľa.`)
};

export const issue_unknown_post_type = /** @type {(inputs: Issue_Unknown_Post_TypeInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Tento typ príspevku sieť nepozná.`)
};

export const loading = /** @type {(inputs: LoadingInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Načítava sa…`)
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
	return /** @type {LocalizedString} */ (`Jazyk sa neuložil. Skúste to znova.`)
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
	return /** @type {LocalizedString} */ (`Heslo je nastavené. Teraz sa ním môžete prihlásiť.`)
};

export const login_session_expired = /** @type {(inputs: Login_Session_ExpiredInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Platnosť prihlásenia vypršala. Prihláste sa znova.`)
};

export const login_submit = /** @type {(inputs: Login_SubmitInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Prihlásiť sa`)
};

export const login_submitting = /** @type {(inputs: Login_SubmittingInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Prihlasujeme vás…`)
};

export const login_subtitle = /** @type {(inputs: Login_SubtitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Plánujte a zverejňujte príspevky z jedného miesta.`)
};

export const login_title = /** @type {(inputs: Login_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Prihlásenie`)
};

export const nav_channels = /** @type {(inputs: Nav_ChannelsInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Kanály`)
};

export const nav_inbox = /** @type {(inputs: Nav_InboxInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Na riešenie`)
};

export const nav_label = /** @type {(inputs: Nav_LabelInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Hlavná navigácia`)
};

export const nav_new_post = /** @type {(inputs: Nav_New_PostInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Nový príspevok`)
};

export const not_found_back = /** @type {(inputs: Not_Found_BackInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Prejsť na úvodnú stránku`)
};

export const not_found_title = /** @type {(inputs: Not_Found_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Stránka sa nenašla`)
};

export const notification_approval_requested = /** @type {(inputs: Notification_Approval_RequestedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Príspevok čaká na vaše schválenie`)
};

export const notification_approved = /** @type {(inputs: Notification_ApprovedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Váš príspevok bol schválený`)
};

export const notification_awaiting_manual = /** @type {(inputs: Notification_Awaiting_ManualInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Príspevok čaká, kým ho uverejníte v kanáli ${i?.account}`)
};

export const notification_expiring = /** @type {(inputs: Notification_ExpiringInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Kanál ${i?.account} bude čoskoro potrebné znova pripojiť`)
};

export const notification_failed = /** @type {(inputs: Notification_FailedInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Príspevok sa nepodarilo uverejniť v kanáli ${i?.account}`)
};

export const notification_generic = /** @type {(inputs: Notification_GenericInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Niečo si vyžaduje vašu pozornosť`)
};

export const notification_needs_reauth = /** @type {(inputs: Notification_Needs_ReauthInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Kanál ${i?.account} treba znova pripojiť`)
};

export const notification_rejected = /** @type {(inputs: Notification_RejectedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Váš príspevok bol zamietnutý`)
};

export const notification_unconfirmed = /** @type {(inputs: Notification_UnconfirmedInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Nie je isté, či sa príspevok uverejnil v kanáli ${i?.account}`)
};

export const notifications_button = /** @type {(inputs: Notifications_ButtonInputs) => LocalizedString} */ (i) => {
	const countPlural = registry.plural("sk", i?.count, {}, true);
	if (countPlural === "one") return /** @type {LocalizedString} */ (`Upozornenia, ${i?.count} neprečítané`);
	if (countPlural === "few") return /** @type {LocalizedString} */ (`Upozornenia, ${i?.count} neprečítané`);
	if (countPlural === "many") return /** @type {LocalizedString} */ (`Upozornenia, ${i?.count} neprečítaného`);
	return /** @type {LocalizedString} */ (`Upozornenia, ${i?.count} neprečítaných`)
};

export const notifications_empty = /** @type {(inputs: Notifications_EmptyInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Všetko máte vybavené`)
};

export const notifications_mark_all = /** @type {(inputs: Notifications_Mark_AllInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Označiť všetky ako prečítané`)
};

export const notifications_mark_failed = /** @type {(inputs: Notifications_Mark_FailedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Upozornenia sa nepodarilo označiť ako prečítané. Skúste to znova.`)
};

export const notifications_older = /** @type {(inputs: Notifications_OlderInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Staršie neprečítané upozornenia nájdete v sekcii Na riešenie.`)
};

export const notifications_title = /** @type {(inputs: Notifications_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Upozornenia`)
};

export const notifications_unread = /** @type {(inputs: Notifications_UnreadInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Neprečítané`)
};

export const password_min_length = /** @type {(inputs: Password_Min_LengthInputs) => LocalizedString} */ (i) => {
	const countPlural = registry.plural("sk", i?.count, {}, true);
	if (countPlural === "one") return /** @type {LocalizedString} */ (`Heslo musí mať aspoň ${i?.count} znak.`);
	if (countPlural === "few") return /** @type {LocalizedString} */ (`Heslo musí mať aspoň ${i?.count} znaky.`);
	if (countPlural === "many") return /** @type {LocalizedString} */ (`Heslo musí mať aspoň ${i?.count} znaku.`);
	return /** @type {LocalizedString} */ (`Heslo musí mať aspoň ${i?.count} znakov.`)
};

export const password_too_long = /** @type {(inputs: Password_Too_LongInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Heslo je príliš dlhé.`)
};

export const post_destinations_title = /** @type {(inputs: Post_Destinations_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Kanály`)
};

export const post_images = /** @type {(inputs: Post_ImagesInputs) => LocalizedString} */ (i) => {
	const countPlural = registry.plural("sk", i?.count, {}, true);
	if (countPlural === "one") return /** @type {LocalizedString} */ (`${i?.count} obrázok`);
	if (countPlural === "few") return /** @type {LocalizedString} */ (`${i?.count} obrázky`);
	if (countPlural === "many") return /** @type {LocalizedString} */ (`${i?.count} obrázka`);
	return /** @type {LocalizedString} */ (`${i?.count} obrázkov`)
};

export const post_not_found = /** @type {(inputs: Post_Not_FoundInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Príspevok sa nepodarilo načítať.`)
};

export const post_published_at = /** @type {(inputs: Post_Published_AtInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Uverejnené ${i?.when}`)
};

export const post_schedule_asap = /** @type {(inputs: Post_Schedule_AsapInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Čo najskôr`)
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
	return /** @type {LocalizedString} */ (`Uverejnený`)
};

export const post_summary_completed_failed = /** @type {(inputs: Post_Summary_Completed_FailedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Neuverejnený`)
};

export const post_summary_completed_partial = /** @type {(inputs: Post_Summary_Completed_PartialInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Čiastočne uverejnený`)
};

export const post_summary_draft = /** @type {(inputs: Post_Summary_DraftInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Koncept`)
};

export const post_summary_in_progress = /** @type {(inputs: Post_Summary_In_ProgressInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Uverejňuje sa`)
};

export const post_summary_in_review = /** @type {(inputs: Post_Summary_In_ReviewInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Čaká na schválenie`)
};

export const post_summary_needs_action = /** @type {(inputs: Post_Summary_Needs_ActionInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Vyžaduje zásah`)
};

export const post_summary_scheduled = /** @type {(inputs: Post_Summary_ScheduledInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Naplánovaný`)
};

export const post_title = /** @type {(inputs: Post_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Príspevok`)
};

export const post_view = /** @type {(inputs: Post_ViewInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Zobraziť príspevok`)
};

export const posts_scheduled = /** @type {(inputs: Posts_ScheduledInputs) => LocalizedString} */ (i) => {
	const countPlural = registry.plural("sk", i?.count, {}, true);
	if (countPlural === "one") return /** @type {LocalizedString} */ (`${i?.count} naplánovaný príspevok`);
	if (countPlural === "few") return /** @type {LocalizedString} */ (`${i?.count} naplánované príspevky`);
	if (countPlural === "many") return /** @type {LocalizedString} */ (`${i?.count} naplánovaného príspevku`);
	return /** @type {LocalizedString} */ (`${i?.count} naplánovaných príspevkov`)
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

export const reason_account_disabled = /** @type {(inputs: Reason_Account_DisabledInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Kanál je vypnutý.`)
};

export const reason_account_disconnected = /** @type {(inputs: Reason_Account_DisconnectedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Kanál je odpojený.`)
};

export const reason_account_needs_reauth = /** @type {(inputs: Reason_Account_Needs_ReauthInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Kanál treba znova pripojiť.`)
};

export const reason_account_out_of_scope = /** @type {(inputs: Reason_Account_Out_Of_ScopeInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`K tomuto kanálu už nemáte prístup.`)
};

export const reason_ambiguous_response = /** @type {(inputs: Reason_Ambiguous_ResponseInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Odpoveď siete bola nejasná. Príspevok už možno je uverejnený.`)
};

export const reason_app_credentials_invalid = /** @type {(inputs: Reason_App_Credentials_InvalidInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Táto sieť nie je na tomto serveri správne nastavená. Obráťte sa na správcu servera.`)
};

export const reason_async_give_up = /** @type {(inputs: Reason_Async_Give_UpInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Sieť uverejňovanie nedokončila.`)
};

export const reason_attempts_exhausted = /** @type {(inputs: Reason_Attempts_ExhaustedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Nevyšlo to ani po niekoľkých pokusoch.`)
};

export const reason_entitlement_exceeded = /** @type {(inputs: Reason_Entitlement_ExceededInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Dosiahli ste limit svojho plánu.`)
};

export const reason_generic = /** @type {(inputs: Reason_GenericInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Vyžaduje si to vašu pozornosť.`)
};

export const reason_interrupted_after_send = /** @type {(inputs: Reason_Interrupted_After_SendInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Odosielanie sa prerušilo, keď už príspevok odišiel. Možno je uverejnený.`)
};

export const reason_late_window_exceeded = /** @type {(inputs: Reason_Late_Window_ExceededInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Na odoslanie už bolo neskoro.`)
};

export const reason_media_processing_timeout = /** @type {(inputs: Reason_Media_Processing_TimeoutInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Sieť spracúvala obrázky príliš dlho.`)
};

export const reason_permanent_error = /** @type {(inputs: Reason_Permanent_ErrorInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Sieť príspevok odmietla.`)
};

export const reason_policy_denied = /** @type {(inputs: Reason_Policy_DeniedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Pravidlá pracovného priestoru to nedovoľujú.`)
};

export const reason_rate_limit_beyond_deadline = /** @type {(inputs: Reason_Rate_Limit_Beyond_DeadlineInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Obmedzenie siete trvalo dlhšie, než sa dalo čakať.`)
};

export const reason_refresh_token_lost = /** @type {(inputs: Reason_Refresh_Token_LostInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Prihlásenie kanála sa stratilo. Pripojte ho znova.`)
};

export const reason_restore_quarantine = /** @type {(inputs: Reason_Restore_QuarantineInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Po obnovení zo zálohy bol zadržaný. Pred odoslaním ho skontrolujte.`)
};

export const reason_verify_inconclusive = /** @type {(inputs: Reason_Verify_InconclusiveInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Nepodarilo sa overiť, či je príspevok uverejnený.`)
};

export const reason_verify_window_elapsed = /** @type {(inputs: Reason_Verify_Window_ElapsedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Overovanie trvalo príliš dlho. Príspevok už možno je uverejnený.`)
};

export const reset_confirm = /** @type {(inputs: Reset_ConfirmInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Zopakujte heslo`)
};

export const reset_invalid_link = /** @type {(inputs: Reset_Invalid_LinkInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Odkaz je neplatný alebo mu vypršala platnosť. Požiadajte o nový.`)
};

export const reset_mismatch = /** @type {(inputs: Reset_MismatchInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Heslá sa nezhodujú.`)
};

export const reset_missing_token = /** @type {(inputs: Reset_Missing_TokenInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Otvorte túto stránku cez odkaz, ktorý ste dostali.`)
};

export const reset_password = /** @type {(inputs: Reset_PasswordInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Nové heslo`)
};

export const reset_submit = /** @type {(inputs: Reset_SubmitInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Nastaviť heslo`)
};

export const reset_submitting = /** @type {(inputs: Reset_SubmittingInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Ukladá sa…`)
};

export const reset_subtitle = /** @type {(inputs: Reset_SubtitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Zvoľte si heslo k účtu v Kronaute.`)
};

export const reset_title = /** @type {(inputs: Reset_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Nastavte si heslo`)
};

export const settings_account_title = /** @type {(inputs: Settings_Account_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Účet`)
};

export const settings_allow_self = /** @type {(inputs: Settings_Allow_SelfInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Autor žiadosti môže schváliť vlastný príspevok`)
};

export const settings_approval_required = /** @type {(inputs: Settings_Approval_RequiredInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Príspevky vyžadujú schválenie`)
};

export const settings_approvals_intro = /** @type {(inputs: Settings_Approvals_IntroInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Určite, či príspevky musia byť pred zverejnením schválené.`)
};

export const settings_approvals_title = /** @type {(inputs: Settings_Approvals_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Schvaľovanie`)
};

export const settings_brand_required = /** @type {(inputs: Settings_Brand_RequiredInputs) => LocalizedString} */ (i) => {
	const countPlural = registry.plural("sk", i?.count, {}, true);
	if (countPlural === "one") return /** @type {LocalizedString} */ (`Vyžaduje sa ${i?.count} schválenie`);
	if (countPlural === "few") return /** @type {LocalizedString} */ (`Vyžadujú sa ${i?.count} schválenia`);
	if (countPlural === "many") return /** @type {LocalizedString} */ (`Vyžaduje sa ${i?.count} schválenia`);
	return /** @type {LocalizedString} */ (`Vyžaduje sa ${i?.count} schválení`)
};

export const settings_brands_title = /** @type {(inputs: Settings_Brands_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Výnimky pre značky`)
};

export const settings_conflict = /** @type {(inputs: Settings_ConflictInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Nastavenia medzitým zmenil niekto iný. Zobrazuje sa najnovšia verzia.`)
};

export const settings_defaults = /** @type {(inputs: Settings_DefaultsInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Zatiaľ nič nie je uložené: zobrazujú sa predvolené hodnoty.`)
};

export const settings_display_name = /** @type {(inputs: Settings_Display_NameInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Meno`)
};

export const settings_email_approvals = /** @type {(inputs: Settings_Email_ApprovalsInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Schvaľovanie`)
};

export const settings_email_approvals_hint = /** @type {(inputs: Settings_Email_Approvals_HintInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Žiadosti o schválenie a rozhodnutia o nich`)
};

export const settings_email_channels = /** @type {(inputs: Settings_Email_ChannelsInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Problémy s kanálmi`)
};

export const settings_email_channels_hint = /** @type {(inputs: Settings_Email_Channels_HintInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Kanály, ktoré treba znova pripojiť alebo ktorým čoskoro vyprší prístup`)
};

export const settings_email_failed = /** @type {(inputs: Settings_Email_FailedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Nastavenia upozornení sa neuložili. Skúste to znova.`)
};

export const settings_email_failures = /** @type {(inputs: Settings_Email_FailuresInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Zlyhania`)
};

export const settings_email_failures_hint = /** @type {(inputs: Settings_Email_Failures_HintInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Príspevky, ktoré zlyhajú alebo ich musíte uverejniť ručne`)
};

export const settings_email_title = /** @type {(inputs: Settings_Email_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Upozornenia e-mailom`)
};

export const settings_in_app_note = /** @type {(inputs: Settings_In_App_NoteInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Upozornenia v aplikácii sa vždy zobrazia pod zvončekom.`)
};

export const settings_name_failed = /** @type {(inputs: Settings_Name_FailedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Meno sa neuložilo. Skúste to znova.`)
};

export const settings_name_saved = /** @type {(inputs: Settings_Name_SavedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Meno je uložené.`)
};

export const settings_nav_label = /** @type {(inputs: Settings_Nav_LabelInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Sekcie nastavení`)
};

export const settings_not_required = /** @type {(inputs: Settings_Not_RequiredInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Schválenie sa nevyžaduje`)
};

export const settings_not_set = /** @type {(inputs: Settings_Not_SetInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Nenastavené`)
};

export const settings_password_change = /** @type {(inputs: Settings_Password_ChangeInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Zmeniť heslo`)
};

export const settings_password_changed = /** @type {(inputs: Settings_Password_ChangedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Heslo je zmenené. Ostatné zariadenia boli odhlásené.`)
};

export const settings_password_current = /** @type {(inputs: Settings_Password_CurrentInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Súčasné heslo`)
};

export const settings_password_failed = /** @type {(inputs: Settings_Password_FailedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Heslo sa nezmenilo. Skúste to znova.`)
};

export const settings_password_incorrect = /** @type {(inputs: Settings_Password_IncorrectInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Súčasné heslo nie je správne.`)
};

export const settings_password_repeat = /** @type {(inputs: Settings_Password_RepeatInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Zopakujte nové heslo`)
};

export const settings_password_two_factor = /** @type {(inputs: Settings_Password_Two_FactorInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Pri účtoch s dvojstupňovým prihlásením zatiaľ nie je zmena hesla dostupná.`)
};

export const settings_policy_title = /** @type {(inputs: Settings_Policy_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Pravidlá schvaľovania`)
};

export const settings_preferences_title = /** @type {(inputs: Settings_Preferences_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Predvoľby`)
};

export const settings_profile_title = /** @type {(inputs: Settings_Profile_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Profil`)
};

export const settings_read_only = /** @type {(inputs: Settings_Read_OnlyInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Tieto nastavenia môžu meniť iba vlastníci a správcovia.`)
};

export const settings_required_approvals = /** @type {(inputs: Settings_Required_ApprovalsInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Počet potrebných schválení`)
};

export const settings_save = /** @type {(inputs: Settings_SaveInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Uložiť`)
};

export const settings_saved = /** @type {(inputs: Settings_SavedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Nastavenia schvaľovania sú uložené.`)
};

export const settings_saving = /** @type {(inputs: Settings_SavingInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Ukladá sa…`)
};

export const settings_theme = /** @type {(inputs: Settings_ThemeInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Vzhľad`)
};

export const settings_title = /** @type {(inputs: Settings_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Nastavenia`)
};

export const settings_tolerance = /** @type {(inputs: Settings_ToleranceInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Povolený posun po schválení (v minútach)`)
};

export const technical_details = /** @type {(inputs: Technical_DetailsInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Technické podrobnosti`)
};

export const theme_dark = /** @type {(inputs: Theme_DarkInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Vzhľad: tmavý`)
};

export const theme_light = /** @type {(inputs: Theme_LightInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Vzhľad: svetlý`)
};

export const theme_option_dark = /** @type {(inputs: Theme_Option_DarkInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Tmavý`)
};

export const theme_option_light = /** @type {(inputs: Theme_Option_LightInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Svetlý`)
};

export const theme_option_system = /** @type {(inputs: Theme_Option_SystemInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Podľa systému`)
};

export const theme_system = /** @type {(inputs: Theme_SystemInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Vzhľad: podľa systému`)
};

export const workspace_label = /** @type {(inputs: Workspace_LabelInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Pracovný priestor`)
};