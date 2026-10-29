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
/** @typedef {{}} Channels_ReconnectInputs */
/** @typedef {{}} Channels_Server_InvalidInputs */
/** @typedef {{ name: NonNullable<unknown> }} Channels_Server_LabelInputs */
/** @typedef {{}} Channels_Server_PlaceholderInputs */
/** @typedef {{}} Channels_Server_Rate_LimitedInputs */
/** @typedef {{}} Channels_Server_RejectedInputs */
/** @typedef {{}} Channels_Server_UnreachableInputs */
/** @typedef {{}} Channels_SubtitleInputs */
/** @typedef {{}} Channels_TitleInputs */
/** @typedef {{}} Compose_Add_CommentInputs */
/** @typedef {{}} Compose_Add_ReplyInputs */
/** @typedef {{}} Compose_Ai_Generated_HintInputs */
/** @typedef {{ position: NonNullable<unknown> }} Compose_Ai_Generated_LabelInputs */
/** @typedef {{ count: NonNullable<unknown> }} Compose_Alt_Text_HintInputs */
/** @typedef {{ position: NonNullable<unknown> }} Compose_Alt_Text_LabelInputs */
/** @typedef {{ max: NonNullable<unknown> }} Compose_Channel_Image_Too_LargeInputs */
/** @typedef {{}} Compose_Channel_Image_TypeInputs */
/** @typedef {{}} Compose_Channel_Needs_ImageInputs */
/** @typedef {{ count: NonNullable<unknown> }} Compose_Channel_Too_Many_ImagesInputs */
/** @typedef {{}} Compose_Channel_UnsupportedInputs */
/** @typedef {{}} Compose_Channel_Video_UnsupportedInputs */
/** @typedef {{}} Compose_Channels_TitleInputs */
/** @typedef {{ channels: NonNullable<unknown> }} Compose_Check_ContentInputs */
/** @typedef {{}} Compose_Comment_LabelInputs */
/** @typedef {{ channel: NonNullable<unknown>, count: NonNullable<unknown>, max: NonNullable<unknown> }} Compose_Comment_Too_LongInputs */
/** @typedef {{}} Compose_Connect_ChannelInputs */
/** @typedef {{ channel: NonNullable<unknown> }} Compose_CustomizeInputs */
/** @typedef {{}} Compose_CustomizedInputs */
/** @typedef {{}} Compose_DateInputs */
/** @typedef {{ position: NonNullable<unknown> }} Compose_Error_Ai_MarkedInputs */
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
/** @typedef {{}} Compose_Issue_Comment_EmptyInputs */
/** @typedef {{ channel: NonNullable<unknown>, message: NonNullable<unknown> }} Compose_Issue_On_ChannelInputs */
/** @typedef {{ position: NonNullable<unknown> }} Compose_Issue_Reply_EmptyInputs */
/** @typedef {{ channel: NonNullable<unknown>, network: NonNullable<unknown> }} Compose_Limit_ChannelInputs */
/** @typedef {{ channel: NonNullable<unknown>, count: NonNullable<unknown>, max: NonNullable<unknown> }} Compose_Limit_Too_LongInputs */
/** @typedef {{ channel: NonNullable<unknown>, max: NonNullable<unknown> }} Compose_Limit_Too_Many_LinksInputs */
/** @typedef {{ network: NonNullable<unknown>, count: NonNullable<unknown>, max: NonNullable<unknown> }} Compose_Limit_UsageInputs */
/** @typedef {{ channel: NonNullable<unknown> }} Compose_Main_OnlyInputs */
/** @typedef {{}} Compose_Media_ExclusiveInputs */
/** @typedef {{}} Compose_No_ChannelsInputs */
/** @typedef {{}} Compose_Preview_TitleInputs */
/** @typedef {{}} Compose_Publish_NowInputs */
/** @typedef {{}} Compose_PublishingInputs */
/** @typedef {{}} Compose_Remove_CommentInputs */
/** @typedef {{ position: NonNullable<unknown> }} Compose_Remove_ReplyInputs */
/** @typedef {{ position: NonNullable<unknown> }} Compose_Reply_LabelInputs */
/** @typedef {{ position: NonNullable<unknown>, channel: NonNullable<unknown>, count: NonNullable<unknown>, max: NonNullable<unknown> }} Compose_Reply_Too_LongInputs */
/** @typedef {{ position: NonNullable<unknown>, channel: NonNullable<unknown>, max: NonNullable<unknown> }} Compose_Reply_Too_Many_LinksInputs */
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
/** @typedef {{}} Compose_Video_Ai_FailedInputs */
/** @typedef {{}} Compose_Video_Ai_LabelInputs */
/** @typedef {{}} Compose_Video_Ai_MarkedInputs */
/** @typedef {{}} Compose_Video_Ai_SavingInputs */
/** @typedef {{}} Compose_Video_Alt_LabelInputs */
/** @typedef {{ name: NonNullable<unknown> }} Compose_Video_Bad_TypeInputs */
/** @typedef {{}} Compose_Video_ErrorInputs */
/** @typedef {{ max: NonNullable<unknown> }} Compose_Video_HintInputs */
/** @typedef {{ channel: NonNullable<unknown> }} Compose_Video_Issue_AspectInputs */
/** @typedef {{ channel: NonNullable<unknown>, max: NonNullable<unknown> }} Compose_Video_Issue_Frame_RateInputs */
/** @typedef {{ channel: NonNullable<unknown> }} Compose_Video_Issue_KindInputs */
/** @typedef {{ channel: NonNullable<unknown> }} Compose_Video_Issue_MetadataInputs */
/** @typedef {{ channel: NonNullable<unknown> }} Compose_Video_Issue_MimeInputs */
/** @typedef {{ channel: NonNullable<unknown> }} Compose_Video_Issue_ResolutionInputs */
/** @typedef {{ channel: NonNullable<unknown>, max: NonNullable<unknown> }} Compose_Video_Issue_Too_LargeInputs */
/** @typedef {{ channel: NonNullable<unknown>, max: NonNullable<unknown> }} Compose_Video_Issue_Too_LongInputs */
/** @typedef {{ channel: NonNullable<unknown>, min: NonNullable<unknown> }} Compose_Video_Issue_Too_ShortInputs */
/** @typedef {{}} Compose_Video_LimitInputs */
/** @typedef {{ name: NonNullable<unknown> }} Compose_Video_PreviewInputs */
/** @typedef {{}} Compose_Video_Preview_CardInputs */
/** @typedef {{}} Compose_Video_ProcessingInputs */
/** @typedef {{}} Compose_Video_ProgressInputs */
/** @typedef {{}} Compose_Video_ReadyInputs */
/** @typedef {{ duration: NonNullable<unknown> }} Compose_Video_Ready_DurationInputs */
/** @typedef {{}} Compose_Video_Rejected_Stream_MissingInputs */
/** @typedef {{ max: NonNullable<unknown> }} Compose_Video_Rejected_Too_LargeInputs */
/** @typedef {{ max: NonNullable<unknown> }} Compose_Video_Rejected_Too_LongInputs */
/** @typedef {{ min: NonNullable<unknown> }} Compose_Video_Rejected_Too_ShortInputs */
/** @typedef {{}} Compose_Video_Rejected_UnreadableInputs */
/** @typedef {{}} Compose_Video_RetryInputs */
/** @typedef {{ name: NonNullable<unknown>, max: NonNullable<unknown> }} Compose_Video_Too_BigInputs */
/** @typedef {{ percent: NonNullable<unknown> }} Compose_Video_UploadingInputs */
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
/** @typedef {{}} Issue_Frame_Rate_Too_HighInputs */
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
/** @typedef {{}} Media_Ai_BadgeInputs */
/** @typedef {{}} Media_Ai_LockedInputs */
/** @typedef {{}} Media_Ai_RemoveInputs */
/** @typedef {{}} Media_Ai_RemovedInputs */
/** @typedef {{ count: NonNullable<unknown> }} Media_Alt_HintInputs */
/** @typedef {{}} Media_Alt_LabelInputs */
/** @typedef {{}} Media_Alt_SaveInputs */
/** @typedef {{}} Media_Alt_SavedInputs */
/** @typedef {{}} Media_DeleteInputs */
/** @typedef {{}} Media_Delete_BodyInputs */
/** @typedef {{}} Media_Delete_ConfirmInputs */
/** @typedef {{}} Media_DeletedInputs */
/** @typedef {{}} Media_DimensionsInputs */
/** @typedef {{ width: NonNullable<unknown>, height: NonNullable<unknown> }} Media_Dimensions_ValueInputs */
/** @typedef {{}} Media_DurationInputs */
/** @typedef {{}} Media_Empty_BodyInputs */
/** @typedef {{}} Media_Empty_FilteredInputs */
/** @typedef {{}} Media_Empty_TitleInputs */
/** @typedef {{}} Media_Filter_AllInputs */
/** @typedef {{}} Media_Filter_ImagesInputs */
/** @typedef {{}} Media_Filter_LabelInputs */
/** @typedef {{}} Media_Filter_VideosInputs */
/** @typedef {{ count: NonNullable<unknown> }} Media_In_UseInputs */
/** @typedef {{}} Media_In_Use_ErrorInputs */
/** @typedef {{}} Media_Kind_ImageInputs */
/** @typedef {{}} Media_Kind_VideoInputs */
/** @typedef {{}} Media_Load_MoreInputs */
/** @typedef {{ date: NonNullable<unknown> }} Media_Open_ImageInputs */
/** @typedef {{ date: NonNullable<unknown> }} Media_Open_VideoInputs */
/** @typedef {{}} Media_SizeInputs */
/** @typedef {{}} Media_State_ProcessingInputs */
/** @typedef {{}} Media_State_RejectedInputs */
/** @typedef {{}} Media_SubtitleInputs */
/** @typedef {{}} Media_TitleInputs */
/** @typedef {{}} Media_TypeInputs */
/** @typedef {{}} Media_UploadedInputs */
/** @typedef {{}} Media_Usage_NoneInputs */
/** @typedef {{ when: NonNullable<unknown> }} Media_Usage_ScheduledInputs */
/** @typedef {{}} Media_Usage_TitleInputs */
/** @typedef {{}} Media_Usage_UntitledInputs */
/** @typedef {{ count: NonNullable<unknown> }} Meta_Status_CompletedInputs */
/** @typedef {{}} Meta_Status_NoneInputs */
/** @typedef {{}} Meta_Status_ReceivedInputs */
/** @typedef {{}} Meta_Status_UnknownInputs */
/** @typedef {{}} Nav_ChannelsInputs */
/** @typedef {{}} Nav_InboxInputs */
/** @typedef {{}} Nav_LabelInputs */
/** @typedef {{}} Nav_MediaInputs */
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
/** @typedef {{}} Reason_Thread_IncompleteInputs */
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
/** @typedef {{}} Settings_System_TitleInputs */
/** @typedef {{}} Settings_ThemeInputs */
/** @typedef {{}} Settings_TitleInputs */
/** @typedef {{}} Settings_ToleranceInputs */
/** @typedef {{}} System_Api_CriticalInputs */
/** @typedef {{ count: NonNullable<unknown> }} System_Api_Days_LeftInputs */
/** @typedef {{}} System_Api_EndedInputs */
/** @typedef {{}} System_Api_No_SunsetInputs */
/** @typedef {{ date: NonNullable<unknown> }} System_Api_SunsetInputs */
/** @typedef {{}} System_Api_TitleInputs */
/** @typedef {{ version: NonNullable<unknown> }} System_Api_VersionInputs */
/** @typedef {{}} System_Api_WarnInputs */
/** @typedef {{ duration: NonNullable<unknown> }} System_Cron_DurationInputs */
/** @typedef {{}} System_Cron_FailedInputs */
/** @typedef {{ when: NonNullable<unknown> }} System_Cron_Last_RunInputs */
/** @typedef {{}} System_Cron_NeverInputs */
/** @typedef {{}} System_Cron_RunningInputs */
/** @typedef {{}} System_Cron_StaleInputs */
/** @typedef {{}} System_Cron_TitleInputs */
/** @typedef {{}} System_Incident_App_Credentials_InvalidInputs */
/** @typedef {{}} System_Incident_App_SuspendedInputs */
/** @typedef {{ count: NonNullable<unknown> }} System_Incident_OccurrencesInputs */
/** @typedef {{}} System_Incident_OpenInputs */
/** @typedef {{}} System_Incident_Provider_OutageInputs */
/** @typedef {{}} System_Incident_Rate_Limited_AppInputs */
/** @typedef {{ when: NonNullable<unknown> }} System_Incident_ResolvedInputs */
/** @typedef {{ first: NonNullable<unknown>, last: NonNullable<unknown> }} System_Incident_SeenInputs */
/** @typedef {{}} System_Incident_Tier_Not_EnrolledInputs */
/** @typedef {{}} System_Incidents_EmptyInputs */
/** @typedef {{}} System_Incidents_TitleInputs */
/** @typedef {{}} System_No_DataInputs */
/** @typedef {{}} System_OkInputs */
/** @typedef {{}} System_Slo_DayInputs */
/** @typedef {{}} System_Slo_DuplicatesInputs */
/** @typedef {{}} System_Slo_On_TimeInputs */
/** @typedef {{}} System_Slo_TitleInputs */
/** @typedef {{ count: NonNullable<unknown> }} System_Slo_TotalInputs */
/** @typedef {{}} System_Slo_UnconfirmedInputs */
/** @typedef {{}} System_Slo_WeekInputs */
/** @typedef {{}} System_Target_MetInputs */
/** @typedef {{}} System_Target_MissedInputs */
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
	return /** @type {LocalizedString} */ (`Sign out`)
};

export const account_menu = /** @type {(inputs: Account_MenuInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Account`)
};

export const app_name = /** @type {(inputs: App_NameInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Kronaut`)
};

export const approval_approve = /** @type {(inputs: Approval_ApproveInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Approve`)
};

export const approval_bound = /** @type {(inputs: Approval_BoundInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`For ${i?.when} (${i?.tz})`)
};

export const approval_changed_after = /** @type {(inputs: Approval_Changed_AfterInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`This post changed after it was approved: request approval again.`)
};

export const approval_changes_requested = /** @type {(inputs: Approval_Changes_RequestedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Changes requested`)
};

export const approval_error_closed = /** @type {(inputs: Approval_Error_ClosedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`This request was already decided. The latest state is shown.`)
};

export const approval_error_waiting = /** @type {(inputs: Approval_Error_WaitingInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`This post is already waiting for approval.`)
};

export const approval_not_approver = /** @type {(inputs: Approval_Not_ApproverInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`You can't decide approvals in this workspace.`)
};

export const approval_note_label = /** @type {(inputs: Approval_Note_LabelInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Note for approvers (optional)`)
};

export const approval_outside_schedule = /** @type {(inputs: Approval_Outside_ScheduleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`That time is outside the approved window. Pick an approved time or request approval again.`)
};

export const approval_progress = /** @type {(inputs: Approval_ProgressInputs) => LocalizedString} */ (i) => {
	const countPlural = registry.plural("en", i?.count, {}, true);
	if (countPlural === "one") return /** @type {LocalizedString} */ (`${i?.approved} of ${i?.count} approval`);
	return /** @type {LocalizedString} */ (`${i?.approved} of ${i?.count} approvals`)
};

export const approval_reauth_body = /** @type {(inputs: Approval_Reauth_BodyInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Deciding an approval needs your password again every 12 hours.`)
};

export const approval_reauth_confirm = /** @type {(inputs: Approval_Reauth_ConfirmInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Confirm`)
};

export const approval_reauth_failed = /** @type {(inputs: Approval_Reauth_FailedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`That didn't work. Check the password: too many wrong tries sign you out.`)
};

export const approval_reauth_title = /** @type {(inputs: Approval_Reauth_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Confirm your password`)
};

export const approval_reject = /** @type {(inputs: Approval_RejectInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Reject`)
};

export const approval_request_again = /** @type {(inputs: Approval_Request_AgainInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Request approval again`)
};

export const approval_request_changes = /** @type {(inputs: Approval_Request_ChangesInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Request changes`)
};

export const approval_requested_by_key = /** @type {(inputs: Approval_Requested_By_KeyInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Requested by an API key on ${i?.when}`)
};

export const approval_requested_by_member = /** @type {(inputs: Approval_Requested_By_MemberInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Requested by another member on ${i?.when}`)
};

export const approval_requested_by_you = /** @type {(inputs: Approval_Requested_By_YouInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Requested by you on ${i?.when}`)
};

export const approval_schedule_approved = /** @type {(inputs: Approval_Schedule_ApprovedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Schedule as approved`)
};

export const approval_self = /** @type {(inputs: Approval_SelfInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`You can't decide your own approval request.`)
};

export const approval_state_approved = /** @type {(inputs: Approval_State_ApprovedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Approved`)
};

export const approval_state_open = /** @type {(inputs: Approval_State_OpenInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Waiting for approval`)
};

export const approval_state_rejected = /** @type {(inputs: Approval_State_RejectedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Rejected`)
};

export const approval_state_revoked = /** @type {(inputs: Approval_State_RevokedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Revoked`)
};

export const approval_state_voided = /** @type {(inputs: Approval_State_VoidedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`No longer valid`)
};

export const approval_state_withdrawn = /** @type {(inputs: Approval_State_WithdrawnInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Withdrawn`)
};

export const approval_title = /** @type {(inputs: Approval_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Approval`)
};

export const approval_tolerance = /** @type {(inputs: Approval_ToleranceInputs) => LocalizedString} */ (i) => {
	const countPlural = registry.plural("en", i?.count, {}, true);
	if (countPlural === "one") return /** @type {LocalizedString} */ (`± ${i?.count} minute`);
	return /** @type {LocalizedString} */ (`± ${i?.count} minutes`)
};

export const approval_void_content = /** @type {(inputs: Approval_Void_ContentInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`The content changed after the request.`)
};

export const approval_void_destinations = /** @type {(inputs: Approval_Void_DestinationsInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`The channels changed after the request.`)
};

export const approval_void_policy = /** @type {(inputs: Approval_Void_PolicyInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`The approval rules changed.`)
};

export const approval_void_schedule = /** @type {(inputs: Approval_Void_ScheduleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`The time changed after the request.`)
};

export const approval_withdraw = /** @type {(inputs: Approval_WithdrawInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Withdraw`)
};

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

export const calendar_title = /** @type {(inputs: Calendar_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Calendar`)
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

export const calendar_untitled = /** @type {(inputs: Calendar_UntitledInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`No text`)
};

export const calendar_view_day = /** @type {(inputs: Calendar_View_DayInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Day`)
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

export const channel_status_active = /** @type {(inputs: Channel_Status_ActiveInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Active`)
};

export const channel_status_disabled = /** @type {(inputs: Channel_Status_DisabledInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Disabled`)
};

export const channel_status_disconnected = /** @type {(inputs: Channel_Status_DisconnectedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Disconnected`)
};

export const channel_status_needs_reauth = /** @type {(inputs: Channel_Status_Needs_ReauthInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Needs reconnecting`)
};

export const channels_add = /** @type {(inputs: Channels_AddInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Add channel`)
};

export const channels_all_networks = /** @type {(inputs: Channels_All_NetworksInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`All networks`)
};

export const channels_connect_bad_url = /** @type {(inputs: Channels_Connect_Bad_UrlInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`The network returned an unsafe sign-in address, so connecting stopped.`)
};

export const channels_connect_body = /** @type {(inputs: Channels_Connect_BodyInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`You'll sign in on the network, then come back here.`)
};

export const channels_connect_button = /** @type {(inputs: Channels_Connect_ButtonInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Connect ${i?.name}`)
};

export const channels_connect_check_handle = /** @type {(inputs: Channels_Connect_Check_HandleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`The network didn't accept this. Check the handle and try again.`)
};

export const channels_connect_none = /** @type {(inputs: Channels_Connect_NoneInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`No networks are set up on this server yet. Ask the server admin to register one.`)
};

export const channels_connect_not_set_up = /** @type {(inputs: Channels_Connect_Not_Set_UpInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`This network isn't set up on this server.`)
};

export const channels_connect_title = /** @type {(inputs: Channels_Connect_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Connect a channel`)
};

export const channels_connect_unavailable = /** @type {(inputs: Channels_Connect_UnavailableInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`The network can't be reached right now. Try again later.`)
};

export const channels_connected = /** @type {(inputs: Channels_ConnectedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`The channel is connected.`)
};

export const channels_connected_list = /** @type {(inputs: Channels_Connected_ListInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Connected: ${i?.names}.`)
};

export const channels_connected_named = /** @type {(inputs: Channels_Connected_NamedInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`${i?.name} is connected.`)
};

export const channels_disconnect = /** @type {(inputs: Channels_DisconnectInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Disconnect`)
};

export const channels_disconnect_body = /** @type {(inputs: Channels_Disconnect_BodyInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Disconnect ${i?.name}? Scheduled posts to it won't be published. You can connect it again later.`)
};

export const channels_disconnect_confirm = /** @type {(inputs: Channels_Disconnect_ConfirmInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Disconnect channel`)
};

export const channels_disconnected = /** @type {(inputs: Channels_DisconnectedInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`${i?.name} disconnected.`)
};

export const channels_empty_body = /** @type {(inputs: Channels_Empty_BodyInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Add a channel to start publishing.`)
};

export const channels_empty_title = /** @type {(inputs: Channels_Empty_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`No channels yet`)
};

export const channels_error_app_config = /** @type {(inputs: Channels_Error_App_ConfigInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`This network isn't set up correctly on this server. Ask the server admin.`)
};

export const channels_error_forbidden = /** @type {(inputs: Channels_Error_ForbiddenInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`You can't connect channels in this workspace.`)
};

export const channels_error_generic = /** @type {(inputs: Channels_Error_GenericInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Connecting the channel didn't work. Try again.`)
};

export const channels_error_no_accounts = /** @type {(inputs: Channels_Error_No_AccountsInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`No account was shared. Connect again and select at least one Page you can post to.`)
};

export const channels_error_provider_denied = /** @type {(inputs: Channels_Error_Provider_DeniedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`The connection was cancelled on the network.`)
};

export const channels_error_provider_error = /** @type {(inputs: Channels_Error_Provider_ErrorInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`The network didn't finish the connection. Try again.`)
};

export const channels_error_server_error = /** @type {(inputs: Channels_Error_Server_ErrorInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`The channel couldn't be saved. Try again.`)
};

export const channels_error_session_mismatch = /** @type {(inputs: Channels_Error_Session_MismatchInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`The connection finished under a different sign-in. Start again.`)
};

export const channels_error_state_invalid = /** @type {(inputs: Channels_Error_State_InvalidInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`The connection link expired or was already used. Start again.`)
};

export const channels_error_too_many_accounts = /** @type {(inputs: Channels_Error_Too_Many_AccountsInputs) => LocalizedString} */ (i) => {
	const maxPlural = registry.plural("en", i?.max, {}, true);
	if (maxPlural === "one") return /** @type {LocalizedString} */ (`Too many accounts were shared. Connect again and select at most ${i?.max} account.`);
	return /** @type {LocalizedString} */ (`Too many accounts were shared. Connect again and select at most ${i?.max} accounts.`)
};

export const channels_expires = /** @type {(inputs: Channels_ExpiresInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Access expires ${i?.date}`)
};

export const channels_handle_label = /** @type {(inputs: Channels_Handle_LabelInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Your handle (optional)`)
};

export const channels_handle_placeholder = /** @type {(inputs: Channels_Handle_PlaceholderInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`yourname.bsky.social`)
};

export const channels_not_set_up = /** @type {(inputs: Channels_Not_Set_UpInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Not set up`)
};

export const channels_open_profile = /** @type {(inputs: Channels_Open_ProfileInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Open profile`)
};

export const channels_reconnect = /** @type {(inputs: Channels_ReconnectInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Reconnect`)
};

export const channels_server_invalid = /** @type {(inputs: Channels_Server_InvalidInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Enter a server name like mastodon.social.`)
};

export const channels_server_label = /** @type {(inputs: Channels_Server_LabelInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Your ${i?.name} server`)
};

export const channels_server_placeholder = /** @type {(inputs: Channels_Server_PlaceholderInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`mastodon.social`)
};

export const channels_server_rate_limited = /** @type {(inputs: Channels_Server_Rate_LimitedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Too many servers were set up recently. Try again in an hour.`)
};

export const channels_server_rejected = /** @type {(inputs: Channels_Server_RejectedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`That server didn't accept Kronaut. Check the name or try another server.`)
};

export const channels_server_unreachable = /** @type {(inputs: Channels_Server_UnreachableInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`That server couldn't be reached. Try again later.`)
};

export const channels_subtitle = /** @type {(inputs: Channels_SubtitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`The social accounts this workspace publishes to.`)
};

export const channels_title = /** @type {(inputs: Channels_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Channels`)
};

export const compose_add_comment = /** @type {(inputs: Compose_Add_CommentInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Add first comment`)
};

export const compose_add_reply = /** @type {(inputs: Compose_Add_ReplyInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Add reply`)
};

export const compose_ai_generated_hint = /** @type {(inputs: Compose_Ai_Generated_HintInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Instagram marks it as made with AI. The other networks have no such label.`)
};

export const compose_ai_generated_label = /** @type {(inputs: Compose_Ai_Generated_LabelInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Image ${i?.position} is AI-generated`)
};

export const compose_alt_text_hint = /** @type {(inputs: Compose_Alt_Text_HintInputs) => LocalizedString} */ (i) => {
	const countPlural = registry.plural("en", i?.count, {}, true);
	if (countPlural === "one") return /** @type {LocalizedString} */ (`Describe the image for people who can't see it. Up to ${i?.count} character.`);
	return /** @type {LocalizedString} */ (`Describe the image for people who can't see it. Up to ${i?.count} characters.`)
};

export const compose_alt_text_label = /** @type {(inputs: Compose_Alt_Text_LabelInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Alt text for image ${i?.position}`)
};

export const compose_channel_image_too_large = /** @type {(inputs: Compose_Channel_Image_Too_LargeInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`An image is larger than the ${i?.max} this network accepts.`)
};

export const compose_channel_image_type = /** @type {(inputs: Compose_Channel_Image_TypeInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`This network doesn't accept the format of an attached image.`)
};

export const compose_channel_needs_image = /** @type {(inputs: Compose_Channel_Needs_ImageInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Needs an image or a video.`)
};

export const compose_channel_too_many_images = /** @type {(inputs: Compose_Channel_Too_Many_ImagesInputs) => LocalizedString} */ (i) => {
	const countPlural = registry.plural("en", i?.count, {}, true);
	if (countPlural === "one") return /** @type {LocalizedString} */ (`This network accepts at most ${i?.count} image.`);
	return /** @type {LocalizedString} */ (`This network accepts at most ${i?.count} images.`)
};

export const compose_channel_unsupported = /** @type {(inputs: Compose_Channel_UnsupportedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Posting to this network isn't supported yet.`)
};

export const compose_channel_video_unsupported = /** @type {(inputs: Compose_Channel_Video_UnsupportedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Video isn't supported on this network yet.`)
};

export const compose_channels_title = /** @type {(inputs: Compose_Channels_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Channels`)
};

export const compose_check_content = /** @type {(inputs: Compose_Check_ContentInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Check the content for ${i?.channels}.`)
};

export const compose_comment_label = /** @type {(inputs: Compose_Comment_LabelInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`First comment`)
};

export const compose_comment_too_long = /** @type {(inputs: Compose_Comment_Too_LongInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`The first comment is too long for ${i?.channel} (${i?.count}/${i?.max})`)
};

export const compose_connect_channel = /** @type {(inputs: Compose_Connect_ChannelInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Connect a channel`)
};

export const compose_customize = /** @type {(inputs: Compose_CustomizeInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Customize for ${i?.channel}`)
};

export const compose_customized = /** @type {(inputs: Compose_CustomizedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Customized`)
};

export const compose_date = /** @type {(inputs: Compose_DateInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Date`)
};

export const compose_error_ai_marked = /** @type {(inputs: Compose_Error_Ai_MarkedInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Image ${i?.position} is already marked as AI-generated in this workspace, and the mark can't be removed yet. Tick “Image ${i?.position} is AI-generated” to post it, or use a different image.`)
};

export const compose_error_approval_required = /** @type {(inputs: Compose_Error_Approval_RequiredInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`This post needs an approval before it can be scheduled.`)
};

export const compose_error_conflict = /** @type {(inputs: Compose_Error_ConflictInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`The post changed in the meantime. Try again.`)
};

export const compose_error_empty = /** @type {(inputs: Compose_Error_EmptyInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Write some text or add an image.`)
};

export const compose_error_empty_channel = /** @type {(inputs: Compose_Error_Empty_ChannelInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Write some text or add an image for ${i?.channel}.`)
};

export const compose_error_fix = /** @type {(inputs: Compose_Error_FixInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`The post can't go out yet. Fix the following and try again:`)
};

export const compose_error_no_channel = /** @type {(inputs: Compose_Error_No_ChannelInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Pick at least one channel.`)
};

export const compose_error_upload = /** @type {(inputs: Compose_Error_UploadInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Image ${i?.position} couldn't be uploaded.`)
};

export const compose_error_upload_channel = /** @type {(inputs: Compose_Error_Upload_ChannelInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Image ${i?.position} for ${i?.channel} couldn't be uploaded.`)
};

export const compose_error_when_missing = /** @type {(inputs: Compose_Error_When_MissingInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Pick a date and a time.`)
};

export const compose_image_bad_type = /** @type {(inputs: Compose_Image_Bad_TypeInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`${i?.name}: only JPEG, PNG and WebP images can be added.`)
};

export const compose_image_move_down = /** @type {(inputs: Compose_Image_Move_DownInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Move image ${i?.position} down`)
};

export const compose_image_move_up = /** @type {(inputs: Compose_Image_Move_UpInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Move image ${i?.position} up`)
};

export const compose_image_position = /** @type {(inputs: Compose_Image_PositionInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Image ${i?.position}`)
};

export const compose_image_preview = /** @type {(inputs: Compose_Image_PreviewInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Preview of image ${i?.position}`)
};

export const compose_image_remove = /** @type {(inputs: Compose_Image_RemoveInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Remove`)
};

export const compose_image_too_big = /** @type {(inputs: Compose_Image_Too_BigInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`${i?.name}: the file is larger than ${i?.max}.`)
};

export const compose_images_add = /** @type {(inputs: Compose_Images_AddInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Add images`)
};

export const compose_images_hint = /** @type {(inputs: Compose_Images_HintInputs) => LocalizedString} */ (i) => {
	const countPlural = registry.plural("en", i?.count, {}, true);
	if (countPlural === "one") return /** @type {LocalizedString} */ (`Up to ${i?.count} image: JPEG, PNG or WebP, at most ${i?.max} each.`);
	return /** @type {LocalizedString} */ (`Up to ${i?.count} images: JPEG, PNG or WebP, at most ${i?.max} each.`)
};

export const compose_images_limit = /** @type {(inputs: Compose_Images_LimitInputs) => LocalizedString} */ (i) => {
	const countPlural = registry.plural("en", i?.count, {}, true);
	if (countPlural === "one") return /** @type {LocalizedString} */ (`A post can have at most ${i?.count} image.`);
	return /** @type {LocalizedString} */ (`A post can have at most ${i?.count} images.`)
};

export const compose_images_title = /** @type {(inputs: Compose_Images_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Images`)
};

export const compose_inherits = /** @type {(inputs: Compose_InheritsInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Uses the content from All channels.`)
};

export const compose_issue_comment_empty = /** @type {(inputs: Compose_Issue_Comment_EmptyInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`The first comment is empty.`)
};

export const compose_issue_on_channel = /** @type {(inputs: Compose_Issue_On_ChannelInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`${i?.channel}: ${i?.message}`)
};

export const compose_issue_reply_empty = /** @type {(inputs: Compose_Issue_Reply_EmptyInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Reply ${i?.position} is empty.`)
};

export const compose_limit_channel = /** @type {(inputs: Compose_Limit_ChannelInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`${i?.channel} (${i?.network})`)
};

export const compose_limit_too_long = /** @type {(inputs: Compose_Limit_Too_LongInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Too long for ${i?.channel} (${i?.count}/${i?.max})`)
};

export const compose_limit_too_many_links = /** @type {(inputs: Compose_Limit_Too_Many_LinksInputs) => LocalizedString} */ (i) => {
	const maxPlural = registry.plural("en", i?.max, {}, true);
	if (maxPlural === "one") return /** @type {LocalizedString} */ (`${i?.channel} allows up to ${i?.max} link`);
	return /** @type {LocalizedString} */ (`${i?.channel} allows up to ${i?.max} links`)
};

export const compose_limit_usage = /** @type {(inputs: Compose_Limit_UsageInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`${i?.network} ${i?.count}/${i?.max}`)
};

export const compose_main_only = /** @type {(inputs: Compose_Main_OnlyInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`${i?.channel} will publish the main post only.`)
};

export const compose_media_exclusive = /** @type {(inputs: Compose_Media_ExclusiveInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`A post can have images or one video, not both.`)
};

export const compose_no_channels = /** @type {(inputs: Compose_No_ChannelsInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`No channels are connected yet.`)
};

export const compose_preview_title = /** @type {(inputs: Compose_Preview_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Preview`)
};

export const compose_publish_now = /** @type {(inputs: Compose_Publish_NowInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Publish now`)
};

export const compose_publishing = /** @type {(inputs: Compose_PublishingInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Publishing…`)
};

export const compose_remove_comment = /** @type {(inputs: Compose_Remove_CommentInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Remove first comment`)
};

export const compose_remove_reply = /** @type {(inputs: Compose_Remove_ReplyInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Remove reply ${i?.position}`)
};

export const compose_reply_label = /** @type {(inputs: Compose_Reply_LabelInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Reply ${i?.position}`)
};

export const compose_reply_too_long = /** @type {(inputs: Compose_Reply_Too_LongInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Reply ${i?.position} is too long for ${i?.channel} (${i?.count}/${i?.max})`)
};

export const compose_reply_too_many_links = /** @type {(inputs: Compose_Reply_Too_Many_LinksInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Reply ${i?.position} has more links than ${i?.channel} allows (${i?.max})`)
};

export const compose_request_approval = /** @type {(inputs: Compose_Request_ApprovalInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Request approval`)
};

export const compose_requesting_approval = /** @type {(inputs: Compose_Requesting_ApprovalInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Requesting approval…`)
};

export const compose_schedule = /** @type {(inputs: Compose_ScheduleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Schedule`)
};

export const compose_scheduling = /** @type {(inputs: Compose_SchedulingInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Scheduling…`)
};

export const compose_subtitle = /** @type {(inputs: Compose_SubtitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Write it once, pick the channels, then publish it now or schedule it.`)
};

export const compose_tab_all = /** @type {(inputs: Compose_Tab_AllInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`All channels`)
};

export const compose_tab_problems = /** @type {(inputs: Compose_Tab_ProblemsInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`has problems`)
};

export const compose_tabs_label = /** @type {(inputs: Compose_Tabs_LabelInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Content for each channel`)
};

export const compose_text_label = /** @type {(inputs: Compose_Text_LabelInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Text`)
};

export const compose_time = /** @type {(inputs: Compose_TimeInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Time`)
};

export const compose_time_zone = /** @type {(inputs: Compose_Time_ZoneInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Time zone: ${i?.tz}`)
};

export const compose_title = /** @type {(inputs: Compose_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`New post`)
};

export const compose_use_default = /** @type {(inputs: Compose_Use_DefaultInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Use the content from All channels`)
};

export const compose_video_ai_failed = /** @type {(inputs: Compose_Video_Ai_FailedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`The AI label couldn't be saved.`)
};

export const compose_video_ai_label = /** @type {(inputs: Compose_Video_Ai_LabelInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`The video is AI-generated`)
};

export const compose_video_ai_marked = /** @type {(inputs: Compose_Video_Ai_MarkedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`This video is marked as AI-generated in this workspace, and the label can't be removed.`)
};

export const compose_video_ai_saving = /** @type {(inputs: Compose_Video_Ai_SavingInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Saving the AI label…`)
};

export const compose_video_alt_label = /** @type {(inputs: Compose_Video_Alt_LabelInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Alt text for the video`)
};

export const compose_video_bad_type = /** @type {(inputs: Compose_Video_Bad_TypeInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`${i?.name}: only MP4, QuickTime and WebM videos can be added.`)
};

export const compose_video_error = /** @type {(inputs: Compose_Video_ErrorInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`The video couldn't be uploaded.`)
};

export const compose_video_hint = /** @type {(inputs: Compose_Video_HintInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Or one MP4, QuickTime or WebM video up to ${i?.max}.`)
};

export const compose_video_issue_aspect = /** @type {(inputs: Compose_Video_Issue_AspectInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`The video's aspect ratio doesn't fit ${i?.channel}.`)
};

export const compose_video_issue_frame_rate = /** @type {(inputs: Compose_Video_Issue_Frame_RateInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`The video's frame rate is higher than ${i?.channel} allows (${i?.max} fps).`)
};

export const compose_video_issue_kind = /** @type {(inputs: Compose_Video_Issue_KindInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`${i?.channel} doesn't take a video for this kind of post.`)
};

export const compose_video_issue_metadata = /** @type {(inputs: Compose_Video_Issue_MetadataInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`The video's length or size couldn't be read for ${i?.channel}.`)
};

export const compose_video_issue_mime = /** @type {(inputs: Compose_Video_Issue_MimeInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`${i?.channel} doesn't accept this video's format.`)
};

export const compose_video_issue_resolution = /** @type {(inputs: Compose_Video_Issue_ResolutionInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`The video's resolution is higher than ${i?.channel} allows.`)
};

export const compose_video_issue_too_large = /** @type {(inputs: Compose_Video_Issue_Too_LargeInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`The video is larger than ${i?.channel} allows (${i?.max}).`)
};

export const compose_video_issue_too_long = /** @type {(inputs: Compose_Video_Issue_Too_LongInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`The video is longer than ${i?.channel} allows (${i?.max}).`)
};

export const compose_video_issue_too_short = /** @type {(inputs: Compose_Video_Issue_Too_ShortInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`The video is shorter than ${i?.channel} needs (${i?.min}).`)
};

export const compose_video_limit = /** @type {(inputs: Compose_Video_LimitInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`A post can have only one video.`)
};

export const compose_video_preview = /** @type {(inputs: Compose_Video_PreviewInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Preview of ${i?.name}`)
};

export const compose_video_preview_card = /** @type {(inputs: Compose_Video_Preview_CardInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Video preview`)
};

export const compose_video_processing = /** @type {(inputs: Compose_Video_ProcessingInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Processing…`)
};

export const compose_video_progress = /** @type {(inputs: Compose_Video_ProgressInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Upload progress`)
};

export const compose_video_ready = /** @type {(inputs: Compose_Video_ReadyInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Ready`)
};

export const compose_video_ready_duration = /** @type {(inputs: Compose_Video_Ready_DurationInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Ready, ${i?.duration}`)
};

export const compose_video_rejected_stream_missing = /** @type {(inputs: Compose_Video_Rejected_Stream_MissingInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`The file has no video track.`)
};

export const compose_video_rejected_too_large = /** @type {(inputs: Compose_Video_Rejected_Too_LargeInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`The converted video would be larger than ${i?.max}.`)
};

export const compose_video_rejected_too_long = /** @type {(inputs: Compose_Video_Rejected_Too_LongInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`The video is longer than ${i?.max}.`)
};

export const compose_video_rejected_too_short = /** @type {(inputs: Compose_Video_Rejected_Too_ShortInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`The video is shorter than ${i?.min}.`)
};

export const compose_video_rejected_unreadable = /** @type {(inputs: Compose_Video_Rejected_UnreadableInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`The video couldn't be read. Try exporting it again.`)
};

export const compose_video_retry = /** @type {(inputs: Compose_Video_RetryInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Retry`)
};

export const compose_video_too_big = /** @type {(inputs: Compose_Video_Too_BigInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`${i?.name}: the video is larger than ${i?.max}.`)
};

export const compose_video_uploading = /** @type {(inputs: Compose_Video_UploadingInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Uploading… ${i?.percent}`)
};

export const compose_video_wait = /** @type {(inputs: Compose_Video_WaitInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Wait for the video to finish processing.`)
};

export const compose_when_title = /** @type {(inputs: Compose_When_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`When`)
};

export const destination_state_awaiting_manual = /** @type {(inputs: Destination_State_Awaiting_ManualInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Waiting for you to post it`)
};

export const destination_state_blocked = /** @type {(inputs: Destination_State_BlockedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Blocked`)
};

export const destination_state_canceled = /** @type {(inputs: Destination_State_CanceledInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Canceled`)
};

export const destination_state_draft = /** @type {(inputs: Destination_State_DraftInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Draft`)
};

export const destination_state_failed = /** @type {(inputs: Destination_State_FailedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Failed`)
};

export const destination_state_published = /** @type {(inputs: Destination_State_PublishedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Published`)
};

export const destination_state_publishing = /** @type {(inputs: Destination_State_PublishingInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Publishing`)
};

export const destination_state_retry_wait = /** @type {(inputs: Destination_State_Retry_WaitInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Waiting to retry`)
};

export const destination_state_scheduled = /** @type {(inputs: Destination_State_ScheduledInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Scheduled`)
};

export const destination_state_unconfirmed = /** @type {(inputs: Destination_State_UnconfirmedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Not confirmed`)
};

export const destination_state_verifying = /** @type {(inputs: Destination_State_VerifyingInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Checking`)
};

export const dialog_close = /** @type {(inputs: Dialog_CloseInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Close`)
};

export const dismiss = /** @type {(inputs: DismissInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Dismiss`)
};

export const email_footer = /** @type {(inputs: Email_FooterInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`You're getting this email because you belong to the ${i?.workspace} workspace in Kronaut.`)
};

export const email_manage = /** @type {(inputs: Email_ManageInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Choose which emails you get: ${i?.url}`)
};

export const email_open = /** @type {(inputs: Email_OpenInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Open it in Kronaut: ${i?.url}`)
};

export const email_post = /** @type {(inputs: Email_PostInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Post: ${i?.excerpt}`)
};

export const error_forbidden = /** @type {(inputs: Error_ForbiddenInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`This request was blocked. Reload the page and try again.`)
};

export const error_generic = /** @type {(inputs: Error_GenericInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Something went wrong. Try again.`)
};

export const error_invalid_credentials = /** @type {(inputs: Error_Invalid_CredentialsInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`The email or password is incorrect.`)
};

export const error_invalid_request = /** @type {(inputs: Error_Invalid_RequestInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Check the fields and try again.`)
};

export const error_logout_failed = /** @type {(inputs: Error_Logout_FailedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Signing out didn't work. Try again.`)
};

export const error_rate_limited = /** @type {(inputs: Error_Rate_LimitedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Too many attempts. Wait a moment and try again.`)
};

export const error_unavailable = /** @type {(inputs: Error_UnavailableInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Kronaut can't be reached right now. Try again in a moment.`)
};

export const home_empty_body = /** @type {(inputs: Home_Empty_BodyInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Posts you schedule will show up here.`)
};

export const home_empty_title = /** @type {(inputs: Home_Empty_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Nothing scheduled yet`)
};

export const inbox_badge = /** @type {(inputs: Inbox_BadgeInputs) => LocalizedString} */ (i) => {
	const countPlural = registry.plural("en", i?.count, {}, true);
	if (countPlural === "one") return /** @type {LocalizedString} */ (`${i?.count} item needs action`);
	return /** @type {LocalizedString} */ (`${i?.count} items need action`)
};

export const inbox_badge_overflow = /** @type {(inputs: Inbox_Badge_OverflowInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`${i?.count}+`)
};

export const inbox_cancel = /** @type {(inputs: Inbox_CancelInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Cancel`)
};

export const inbox_canceled = /** @type {(inputs: Inbox_CanceledInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Canceled.`)
};

export const inbox_changed = /** @type {(inputs: Inbox_ChangedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`This item changed in the meantime. The list now shows its latest state.`)
};

export const inbox_confirm_back = /** @type {(inputs: Inbox_Confirm_BackInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Not now`)
};

export const inbox_duplicate_ack = /** @type {(inputs: Inbox_Duplicate_AckInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`This may post twice`)
};

export const inbox_duplicate_body = /** @type {(inputs: Inbox_Duplicate_BodyInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`The network may have received it. Sending it again could publish it twice.`)
};

export const inbox_duplicate_confirm = /** @type {(inputs: Inbox_Duplicate_ConfirmInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Send again anyway`)
};

export const inbox_duplicate_title = /** @type {(inputs: Inbox_Duplicate_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`It may already be live`)
};

export const inbox_empty_body = /** @type {(inputs: Inbox_Empty_BodyInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Posts that fail, get blocked or wait for you show up here.`)
};

export const inbox_empty_title = /** @type {(inputs: Inbox_Empty_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Nothing needs your attention`)
};

export const inbox_load_failed = /** @type {(inputs: Inbox_Load_FailedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`The list couldn't be loaded. Try again.`)
};

export const inbox_mark_done = /** @type {(inputs: Inbox_Mark_DoneInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Mark as done`)
};

export const inbox_mark_published = /** @type {(inputs: Inbox_Mark_PublishedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Mark as published`)
};

export const inbox_marked = /** @type {(inputs: Inbox_MarkedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Marked as published.`)
};

export const inbox_reconnect = /** @type {(inputs: Inbox_ReconnectInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Reconnect channel`)
};

export const inbox_send_again = /** @type {(inputs: Inbox_Send_AgainInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Send again`)
};

export const inbox_sent_again = /** @type {(inputs: Inbox_Sent_AgainInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`It will be sent again shortly.`)
};

export const inbox_truncated = /** @type {(inputs: Inbox_TruncatedInputs) => LocalizedString} */ (i) => {
	const totalPlural = registry.plural("en", i?.total, {}, true);
	if (totalPlural === "one") return /** @type {LocalizedString} */ (`Showing only the newest ${i?.shown} of ${i?.total} item.`);
	return /** @type {LocalizedString} */ (`Showing only the newest ${i?.shown} of ${i?.total} items.`)
};

export const issue_alt_text_required = /** @type {(inputs: Issue_Alt_Text_RequiredInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`This network needs alt text on every image.`)
};

export const issue_alt_text_too_long = /** @type {(inputs: Issue_Alt_Text_Too_LongInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`An alt text is too long for this network.`)
};

export const issue_aspect_out_of_range = /** @type {(inputs: Issue_Aspect_Out_Of_RangeInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`An image's aspect ratio isn't allowed on this network.`)
};

export const issue_file_too_large = /** @type {(inputs: Issue_File_Too_LargeInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`An image file is too large.`)
};

export const issue_frame_rate_too_high = /** @type {(inputs: Issue_Frame_Rate_Too_HighInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`The video's frame rate is too high for this network.`)
};

export const issue_generic = /** @type {(inputs: Issue_GenericInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Something went wrong. The technical details say more.`)
};

export const issue_image_too_narrow = /** @type {(inputs: Issue_Image_Too_NarrowInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`An image is too narrow for this network.`)
};

export const issue_image_too_wide = /** @type {(inputs: Issue_Image_Too_WideInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`An image is too wide for this network.`)
};

export const issue_in_past = /** @type {(inputs: Issue_In_PastInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`That time has already passed. Pick a later one.`)
};

export const issue_invalid_time_zone = /** @type {(inputs: Issue_Invalid_Time_ZoneInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`The time zone isn't recognised.`)
};

export const issue_media_not_allowed = /** @type {(inputs: Issue_Media_Not_AllowedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`This kind of post can't include images.`)
};

export const issue_mime_unsupported = /** @type {(inputs: Issue_Mime_UnsupportedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`This network doesn't accept this image format.`)
};

export const issue_not_ready = /** @type {(inputs: Issue_Not_ReadyInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`An image is still being processed. Try again in a moment.`)
};

export const issue_post_type_unavailable = /** @type {(inputs: Issue_Post_Type_UnavailableInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`This kind of post isn't available for the channel.`)
};

export const issue_provider_unavailable = /** @type {(inputs: Issue_Provider_UnavailableInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`This network isn't available on this server right now.`)
};

export const issue_resolution_too_high = /** @type {(inputs: Issue_Resolution_Too_HighInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`The video's resolution is too high for this network.`)
};

export const issue_text_too_long = /** @type {(inputs: Issue_Text_Too_LongInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`The text is too long for this network.`)
};

export const issue_too_few_media = /** @type {(inputs: Issue_Too_Few_MediaInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`This kind of post needs more images on this network.`)
};

export const issue_too_large = /** @type {(inputs: Issue_Too_LargeInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`The post is too large.`)
};

export const issue_too_many_links = /** @type {(inputs: Issue_Too_Many_LinksInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`There are too many links for this network.`)
};

export const issue_too_many_media = /** @type {(inputs: Issue_Too_Many_MediaInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`There are too many images for this network.`)
};

export const issue_unknown_post_type = /** @type {(inputs: Issue_Unknown_Post_TypeInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`The network doesn't know this kind of post.`)
};

export const loading = /** @type {(inputs: LoadingInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Loading…`)
};

export const locale_cs = /** @type {(inputs: Locale_CsInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Čeština`)
};

export const locale_en = /** @type {(inputs: Locale_EnInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`English`)
};

export const locale_label = /** @type {(inputs: Locale_LabelInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Language`)
};

export const locale_save_failed = /** @type {(inputs: Locale_Save_FailedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Your language wasn't saved. Try again.`)
};

export const locale_sk = /** @type {(inputs: Locale_SkInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Slovenčina`)
};

export const login_email = /** @type {(inputs: Login_EmailInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Email`)
};

export const login_password = /** @type {(inputs: Login_PasswordInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Password`)
};

export const login_password_set = /** @type {(inputs: Login_Password_SetInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Your password is set. Sign in with it now.`)
};

export const login_session_expired = /** @type {(inputs: Login_Session_ExpiredInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Your session has expired. Sign in again.`)
};

export const login_submit = /** @type {(inputs: Login_SubmitInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Sign in`)
};

export const login_submitting = /** @type {(inputs: Login_SubmittingInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Signing in…`)
};

export const login_subtitle = /** @type {(inputs: Login_SubtitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Plan and publish your posts from one place.`)
};

export const login_title = /** @type {(inputs: Login_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Sign in`)
};

export const media_ai_badge = /** @type {(inputs: Media_Ai_BadgeInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`AI-generated`)
};

export const media_ai_locked = /** @type {(inputs: Media_Ai_LockedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`The label stays: an API key or agent uploaded or labelled this file.`)
};

export const media_ai_remove = /** @type {(inputs: Media_Ai_RemoveInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Remove AI label`)
};

export const media_ai_removed = /** @type {(inputs: Media_Ai_RemovedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`AI label removed.`)
};

export const media_alt_hint = /** @type {(inputs: Media_Alt_HintInputs) => LocalizedString} */ (i) => {
	const countPlural = registry.plural("en", i?.count, {}, true);
	if (countPlural === "one") return /** @type {LocalizedString} */ (`New posts start with this description. Posts that already use the file keep their own. Up to ${i?.count} character.`);
	return /** @type {LocalizedString} */ (`New posts start with this description. Posts that already use the file keep their own. Up to ${i?.count} characters.`)
};

export const media_alt_label = /** @type {(inputs: Media_Alt_LabelInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Alt text`)
};

export const media_alt_save = /** @type {(inputs: Media_Alt_SaveInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Save alt text`)
};

export const media_alt_saved = /** @type {(inputs: Media_Alt_SavedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Alt text saved.`)
};

export const media_delete = /** @type {(inputs: Media_DeleteInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Delete`)
};

export const media_delete_body = /** @type {(inputs: Media_Delete_BodyInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Delete this file? It leaves the library now, and its data is erased after 30 days.`)
};

export const media_delete_confirm = /** @type {(inputs: Media_Delete_ConfirmInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Delete file`)
};

export const media_deleted = /** @type {(inputs: Media_DeletedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`File deleted.`)
};

export const media_dimensions = /** @type {(inputs: Media_DimensionsInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Dimensions`)
};

export const media_dimensions_value = /** @type {(inputs: Media_Dimensions_ValueInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`${i?.width} × ${i?.height} px`)
};

export const media_duration = /** @type {(inputs: Media_DurationInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Duration`)
};

export const media_empty_body = /** @type {(inputs: Media_Empty_BodyInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Images and videos you add to posts appear here.`)
};

export const media_empty_filtered = /** @type {(inputs: Media_Empty_FilteredInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Nothing of this kind yet.`)
};

export const media_empty_title = /** @type {(inputs: Media_Empty_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`No media yet`)
};

export const media_filter_all = /** @type {(inputs: Media_Filter_AllInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`All`)
};

export const media_filter_images = /** @type {(inputs: Media_Filter_ImagesInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Images`)
};

export const media_filter_label = /** @type {(inputs: Media_Filter_LabelInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Show`)
};

export const media_filter_videos = /** @type {(inputs: Media_Filter_VideosInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Videos`)
};

export const media_in_use = /** @type {(inputs: Media_In_UseInputs) => LocalizedString} */ (i) => {
	const countPlural = registry.plural("en", i?.count, {}, true);
	if (countPlural === "one") return /** @type {LocalizedString} */ (`Used in ${i?.count} post`);
	return /** @type {LocalizedString} */ (`Used in ${i?.count} posts`)
};

export const media_in_use_error = /** @type {(inputs: Media_In_Use_ErrorInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`A post still uses this file, so it can't be deleted.`)
};

export const media_kind_image = /** @type {(inputs: Media_Kind_ImageInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Image`)
};

export const media_kind_video = /** @type {(inputs: Media_Kind_VideoInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Video`)
};

export const media_load_more = /** @type {(inputs: Media_Load_MoreInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Load more`)
};

export const media_open_image = /** @type {(inputs: Media_Open_ImageInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Image uploaded ${i?.date}`)
};

export const media_open_video = /** @type {(inputs: Media_Open_VideoInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Video uploaded ${i?.date}`)
};

export const media_size = /** @type {(inputs: Media_SizeInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Size`)
};

export const media_state_processing = /** @type {(inputs: Media_State_ProcessingInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Processing`)
};

export const media_state_rejected = /** @type {(inputs: Media_State_RejectedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Rejected`)
};

export const media_subtitle = /** @type {(inputs: Media_SubtitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Images and videos uploaded to this workspace.`)
};

export const media_title = /** @type {(inputs: Media_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Media library`)
};

export const media_type = /** @type {(inputs: Media_TypeInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Type`)
};

export const media_uploaded = /** @type {(inputs: Media_UploadedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Uploaded`)
};

export const media_usage_none = /** @type {(inputs: Media_Usage_NoneInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`No post uses this file.`)
};

export const media_usage_scheduled = /** @type {(inputs: Media_Usage_ScheduledInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Scheduled for ${i?.when}`)
};

export const media_usage_title = /** @type {(inputs: Media_Usage_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Used in`)
};

export const media_usage_untitled = /** @type {(inputs: Media_Usage_UntitledInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Untitled post`)
};

export const meta_status_completed = /** @type {(inputs: Meta_Status_CompletedInputs) => LocalizedString} */ (i) => {
	const countPlural = registry.plural("en", i?.count, {}, true);
	if (countPlural === "one") return /** @type {LocalizedString} */ (`Done. Kronaut deleted the data of ${i?.count} channel.`);
	return /** @type {LocalizedString} */ (`Done. Kronaut deleted the data of ${i?.count} channels.`)
};

export const meta_status_none = /** @type {(inputs: Meta_Status_NoneInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Kronaut holds no data for this Meta account. If you still see a channel, its workspace owner can disconnect it, or reconnect it once so it can be matched.`)
};

export const meta_status_received = /** @type {(inputs: Meta_Status_ReceivedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Kronaut received your request and is deleting your data.`)
};

export const meta_status_unknown = /** @type {(inputs: Meta_Status_UnknownInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Unknown confirmation code.`)
};

export const nav_channels = /** @type {(inputs: Nav_ChannelsInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Channels`)
};

export const nav_inbox = /** @type {(inputs: Nav_InboxInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Needs action`)
};

export const nav_label = /** @type {(inputs: Nav_LabelInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Main`)
};

export const nav_media = /** @type {(inputs: Nav_MediaInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Media`)
};

export const nav_new_post = /** @type {(inputs: Nav_New_PostInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`New post`)
};

export const not_found_back = /** @type {(inputs: Not_Found_BackInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Go to the start page`)
};

export const not_found_title = /** @type {(inputs: Not_Found_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Page not found`)
};

export const notification_approval_requested = /** @type {(inputs: Notification_Approval_RequestedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`A post is waiting for your approval`)
};

export const notification_approved = /** @type {(inputs: Notification_ApprovedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Your post was approved`)
};

export const notification_awaiting_manual = /** @type {(inputs: Notification_Awaiting_ManualInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Ready for you to post on ${i?.account}`)
};

export const notification_expiring = /** @type {(inputs: Notification_ExpiringInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`${i?.account} needs reconnecting soon`)
};

export const notification_failed = /** @type {(inputs: Notification_FailedInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Couldn't publish to ${i?.account}`)
};

export const notification_generic = /** @type {(inputs: Notification_GenericInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Something needs your attention`)
};

export const notification_needs_reauth = /** @type {(inputs: Notification_Needs_ReauthInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`${i?.account} needs reconnecting`)
};

export const notification_rejected = /** @type {(inputs: Notification_RejectedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Your post was rejected`)
};

export const notification_unconfirmed = /** @type {(inputs: Notification_UnconfirmedInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Not sure it was posted to ${i?.account}`)
};

export const notifications_button = /** @type {(inputs: Notifications_ButtonInputs) => LocalizedString} */ (i) => {
	const countPlural = registry.plural("en", i?.count, {}, true);
	if (countPlural === "one") return /** @type {LocalizedString} */ (`Notifications, ${i?.count} unread`);
	return /** @type {LocalizedString} */ (`Notifications, ${i?.count} unread`)
};

export const notifications_empty = /** @type {(inputs: Notifications_EmptyInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`You're all caught up`)
};

export const notifications_mark_all = /** @type {(inputs: Notifications_Mark_AllInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Mark all as read`)
};

export const notifications_mark_failed = /** @type {(inputs: Notifications_Mark_FailedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Couldn't mark them as read. Try again.`)
};

export const notifications_older = /** @type {(inputs: Notifications_OlderInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Older unread notifications are in Needs action.`)
};

export const notifications_title = /** @type {(inputs: Notifications_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Notifications`)
};

export const notifications_unread = /** @type {(inputs: Notifications_UnreadInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Unread`)
};

export const password_min_length = /** @type {(inputs: Password_Min_LengthInputs) => LocalizedString} */ (i) => {
	const countPlural = registry.plural("en", i?.count, {}, true);
	if (countPlural === "one") return /** @type {LocalizedString} */ (`Use at least ${i?.count} character.`);
	return /** @type {LocalizedString} */ (`Use at least ${i?.count} characters.`)
};

export const password_too_long = /** @type {(inputs: Password_Too_LongInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`This password is too long.`)
};

export const post_customized = /** @type {(inputs: Post_CustomizedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Text customized for this channel`)
};

export const post_destinations_title = /** @type {(inputs: Post_Destinations_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Channels`)
};

export const post_images = /** @type {(inputs: Post_ImagesInputs) => LocalizedString} */ (i) => {
	const countPlural = registry.plural("en", i?.count, {}, true);
	if (countPlural === "one") return /** @type {LocalizedString} */ (`${i?.count} image`);
	return /** @type {LocalizedString} */ (`${i?.count} images`)
};

export const post_not_found = /** @type {(inputs: Post_Not_FoundInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`This post couldn't be loaded.`)
};

export const post_published_at = /** @type {(inputs: Post_Published_AtInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Published ${i?.when}`)
};

export const post_schedule_asap = /** @type {(inputs: Post_Schedule_AsapInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`As soon as possible`)
};

export const post_schedule_at = /** @type {(inputs: Post_Schedule_AtInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Scheduled for ${i?.when}`)
};

export const post_schedule_at_tz = /** @type {(inputs: Post_Schedule_At_TzInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Scheduled for ${i?.when} (${i?.tz})`)
};

export const post_schedule_none = /** @type {(inputs: Post_Schedule_NoneInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Not scheduled`)
};

export const post_scheduled_at = /** @type {(inputs: Post_Scheduled_AtInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Due ${i?.when}`)
};

export const post_summary_canceled = /** @type {(inputs: Post_Summary_CanceledInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Canceled`)
};

export const post_summary_completed_all = /** @type {(inputs: Post_Summary_Completed_AllInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Published`)
};

export const post_summary_completed_failed = /** @type {(inputs: Post_Summary_Completed_FailedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Not published`)
};

export const post_summary_completed_partial = /** @type {(inputs: Post_Summary_Completed_PartialInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Partly published`)
};

export const post_summary_draft = /** @type {(inputs: Post_Summary_DraftInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Draft`)
};

export const post_summary_in_progress = /** @type {(inputs: Post_Summary_In_ProgressInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Publishing`)
};

export const post_summary_in_review = /** @type {(inputs: Post_Summary_In_ReviewInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`In review`)
};

export const post_summary_needs_action = /** @type {(inputs: Post_Summary_Needs_ActionInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Needs action`)
};

export const post_summary_scheduled = /** @type {(inputs: Post_Summary_ScheduledInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Scheduled`)
};

export const post_title = /** @type {(inputs: Post_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Post`)
};

export const post_view = /** @type {(inputs: Post_ViewInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`View post`)
};

export const posts_scheduled = /** @type {(inputs: Posts_ScheduledInputs) => LocalizedString} */ (i) => {
	const countPlural = registry.plural("en", i?.count, {}, true);
	if (countPlural === "one") return /** @type {LocalizedString} */ (`${i?.count} post scheduled`);
	return /** @type {LocalizedString} */ (`${i?.count} posts scheduled`)
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
	return /** @type {LocalizedString} */ (`The channel is disabled.`)
};

export const reason_account_disconnected = /** @type {(inputs: Reason_Account_DisconnectedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`The channel is disconnected.`)
};

export const reason_account_needs_reauth = /** @type {(inputs: Reason_Account_Needs_ReauthInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`The channel needs reconnecting.`)
};

export const reason_account_out_of_scope = /** @type {(inputs: Reason_Account_Out_Of_ScopeInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`You no longer have access to this channel.`)
};

export const reason_ambiguous_response = /** @type {(inputs: Reason_Ambiguous_ResponseInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`The network's answer was unclear. It may be live.`)
};

export const reason_app_credentials_invalid = /** @type {(inputs: Reason_App_Credentials_InvalidInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`This network isn't set up correctly on this server. Ask the server admin.`)
};

export const reason_async_give_up = /** @type {(inputs: Reason_Async_Give_UpInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`The network never finished publishing it.`)
};

export const reason_attempts_exhausted = /** @type {(inputs: Reason_Attempts_ExhaustedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`It failed after several tries.`)
};

export const reason_entitlement_exceeded = /** @type {(inputs: Reason_Entitlement_ExceededInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Your plan's limit is reached.`)
};

export const reason_generic = /** @type {(inputs: Reason_GenericInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`It needs your attention.`)
};

export const reason_interrupted_after_send = /** @type {(inputs: Reason_Interrupted_After_SendInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Sending stopped after it went out. It may be live.`)
};

export const reason_late_window_exceeded = /** @type {(inputs: Reason_Late_Window_ExceededInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`It was too late to send it.`)
};

export const reason_media_processing_timeout = /** @type {(inputs: Reason_Media_Processing_TimeoutInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`The network took too long to process the media.`)
};

export const reason_permanent_error = /** @type {(inputs: Reason_Permanent_ErrorInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`The network rejected it.`)
};

export const reason_policy_denied = /** @type {(inputs: Reason_Policy_DeniedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`A workspace rule doesn't allow it.`)
};

export const reason_rate_limit_beyond_deadline = /** @type {(inputs: Reason_Rate_Limit_Beyond_DeadlineInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`The network's rate limit lasted past the deadline.`)
};

export const reason_refresh_token_lost = /** @type {(inputs: Reason_Refresh_Token_LostInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`The channel's sign-in was lost. Reconnect it.`)
};

export const reason_restore_quarantine = /** @type {(inputs: Reason_Restore_QuarantineInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Held back after a restore. Check it before sending.`)
};

export const reason_thread_incomplete = /** @type {(inputs: Reason_Thread_IncompleteInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`The main post is live, but a reply or comment after it failed.`)
};

export const reason_verify_inconclusive = /** @type {(inputs: Reason_Verify_InconclusiveInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`It couldn't be checked whether it went live.`)
};

export const reason_verify_window_elapsed = /** @type {(inputs: Reason_Verify_Window_ElapsedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Checking took too long. It may be live.`)
};

export const reset_confirm = /** @type {(inputs: Reset_ConfirmInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Repeat the password`)
};

export const reset_invalid_link = /** @type {(inputs: Reset_Invalid_LinkInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`This link is invalid or has expired. Ask for a new one.`)
};

export const reset_mismatch = /** @type {(inputs: Reset_MismatchInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`The passwords don't match.`)
};

export const reset_missing_token = /** @type {(inputs: Reset_Missing_TokenInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Open this page from the link you received.`)
};

export const reset_password = /** @type {(inputs: Reset_PasswordInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`New password`)
};

export const reset_submit = /** @type {(inputs: Reset_SubmitInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Set password`)
};

export const reset_submitting = /** @type {(inputs: Reset_SubmittingInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Saving…`)
};

export const reset_subtitle = /** @type {(inputs: Reset_SubtitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Choose a password for your Kronaut account.`)
};

export const reset_title = /** @type {(inputs: Reset_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Set your password`)
};

export const settings_account_title = /** @type {(inputs: Settings_Account_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Account`)
};

export const settings_allow_self = /** @type {(inputs: Settings_Allow_SelfInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Requesters can approve their own posts`)
};

export const settings_approval_required = /** @type {(inputs: Settings_Approval_RequiredInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Posts need approval`)
};

export const settings_approvals_intro = /** @type {(inputs: Settings_Approvals_IntroInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Decide whether posts need an approval before they go out.`)
};

export const settings_approvals_title = /** @type {(inputs: Settings_Approvals_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Approvals`)
};

export const settings_brand_required = /** @type {(inputs: Settings_Brand_RequiredInputs) => LocalizedString} */ (i) => {
	const countPlural = registry.plural("en", i?.count, {}, true);
	if (countPlural === "one") return /** @type {LocalizedString} */ (`Approval required: ${i?.count} approval`);
	return /** @type {LocalizedString} */ (`Approval required: ${i?.count} approvals`)
};

export const settings_brands_title = /** @type {(inputs: Settings_Brands_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Brand overrides`)
};

export const settings_conflict = /** @type {(inputs: Settings_ConflictInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Someone else changed these settings. The latest version is shown.`)
};

export const settings_defaults = /** @type {(inputs: Settings_DefaultsInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Nothing saved yet: these are the defaults.`)
};

export const settings_display_name = /** @type {(inputs: Settings_Display_NameInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Name`)
};

export const settings_email_approvals = /** @type {(inputs: Settings_Email_ApprovalsInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Approvals`)
};

export const settings_email_approvals_hint = /** @type {(inputs: Settings_Email_Approvals_HintInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Approval requests and decisions`)
};

export const settings_email_channels = /** @type {(inputs: Settings_Email_ChannelsInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Channel problems`)
};

export const settings_email_channels_hint = /** @type {(inputs: Settings_Email_Channels_HintInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Channels that need reconnecting or are about to expire`)
};

export const settings_email_failed = /** @type {(inputs: Settings_Email_FailedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Your notification settings weren't saved. Try again.`)
};

export const settings_email_failures = /** @type {(inputs: Settings_Email_FailuresInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Failures`)
};

export const settings_email_failures_hint = /** @type {(inputs: Settings_Email_Failures_HintInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Posts that fail or need you to post manually`)
};

export const settings_email_title = /** @type {(inputs: Settings_Email_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Email notifications`)
};

export const settings_in_app_note = /** @type {(inputs: Settings_In_App_NoteInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`In-app notifications always show in the bell.`)
};

export const settings_name_failed = /** @type {(inputs: Settings_Name_FailedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Your name wasn't saved. Try again.`)
};

export const settings_name_saved = /** @type {(inputs: Settings_Name_SavedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Name saved.`)
};

export const settings_nav_label = /** @type {(inputs: Settings_Nav_LabelInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Settings sections`)
};

export const settings_not_required = /** @type {(inputs: Settings_Not_RequiredInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`No approval required`)
};

export const settings_not_set = /** @type {(inputs: Settings_Not_SetInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Not set`)
};

export const settings_password_change = /** @type {(inputs: Settings_Password_ChangeInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Change password`)
};

export const settings_password_changed = /** @type {(inputs: Settings_Password_ChangedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Password changed. Other devices were signed out.`)
};

export const settings_password_current = /** @type {(inputs: Settings_Password_CurrentInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Current password`)
};

export const settings_password_failed = /** @type {(inputs: Settings_Password_FailedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Your password wasn't changed. Try again.`)
};

export const settings_password_incorrect = /** @type {(inputs: Settings_Password_IncorrectInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`The current password is incorrect.`)
};

export const settings_password_repeat = /** @type {(inputs: Settings_Password_RepeatInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Repeat new password`)
};

export const settings_password_two_factor = /** @type {(inputs: Settings_Password_Two_FactorInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Changing the password isn't available yet for accounts with two-factor sign-in.`)
};

export const settings_policy_title = /** @type {(inputs: Settings_Policy_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Approval rules`)
};

export const settings_preferences_title = /** @type {(inputs: Settings_Preferences_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Preferences`)
};

export const settings_profile_title = /** @type {(inputs: Settings_Profile_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Profile`)
};

export const settings_read_only = /** @type {(inputs: Settings_Read_OnlyInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Only owners and admins can change these settings.`)
};

export const settings_required_approvals = /** @type {(inputs: Settings_Required_ApprovalsInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Approvals needed`)
};

export const settings_save = /** @type {(inputs: Settings_SaveInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Save`)
};

export const settings_saved = /** @type {(inputs: Settings_SavedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Approval settings saved.`)
};

export const settings_saving = /** @type {(inputs: Settings_SavingInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Saving…`)
};

export const settings_system_title = /** @type {(inputs: Settings_System_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`System`)
};

export const settings_theme = /** @type {(inputs: Settings_ThemeInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Theme`)
};

export const settings_title = /** @type {(inputs: Settings_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Settings`)
};

export const settings_tolerance = /** @type {(inputs: Settings_ToleranceInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Allowed shift after approval (minutes)`)
};

export const system_api_critical = /** @type {(inputs: System_Api_CriticalInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Upgrade now`)
};

export const system_api_days_left = /** @type {(inputs: System_Api_Days_LeftInputs) => LocalizedString} */ (i) => {
	const countPlural = registry.plural("en", i?.count, {}, true);
	if (countPlural === "one") return /** @type {LocalizedString} */ (`${i?.count} day left`);
	return /** @type {LocalizedString} */ (`${i?.count} days left`)
};

export const system_api_ended = /** @type {(inputs: System_Api_EndedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Support has ended`)
};

export const system_api_no_sunset = /** @type {(inputs: System_Api_No_SunsetInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`No end date announced`)
};

export const system_api_sunset = /** @type {(inputs: System_Api_SunsetInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Support ends ${i?.date}`)
};

export const system_api_title = /** @type {(inputs: System_Api_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Network API versions`)
};

export const system_api_version = /** @type {(inputs: System_Api_VersionInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Version ${i?.version}`)
};

export const system_api_warn = /** @type {(inputs: System_Api_WarnInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Upgrade soon`)
};

export const system_cron_duration = /** @type {(inputs: System_Cron_DurationInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Took ${i?.duration}`)
};

export const system_cron_failed = /** @type {(inputs: System_Cron_FailedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Failed`)
};

export const system_cron_last_run = /** @type {(inputs: System_Cron_Last_RunInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Last started ${i?.when}`)
};

export const system_cron_never = /** @type {(inputs: System_Cron_NeverInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Never ran`)
};

export const system_cron_running = /** @type {(inputs: System_Cron_RunningInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Running`)
};

export const system_cron_stale = /** @type {(inputs: System_Cron_StaleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Overdue`)
};

export const system_cron_title = /** @type {(inputs: System_Cron_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Background jobs`)
};

export const system_incident_app_credentials_invalid = /** @type {(inputs: System_Incident_App_Credentials_InvalidInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`App credentials rejected`)
};

export const system_incident_app_suspended = /** @type {(inputs: System_Incident_App_SuspendedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`App suspended`)
};

export const system_incident_occurrences = /** @type {(inputs: System_Incident_OccurrencesInputs) => LocalizedString} */ (i) => {
	const countPlural = registry.plural("en", i?.count, {}, true);
	if (countPlural === "one") return /** @type {LocalizedString} */ (`${i?.count} occurrence`);
	return /** @type {LocalizedString} */ (`${i?.count} occurrences`)
};

export const system_incident_open = /** @type {(inputs: System_Incident_OpenInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Open`)
};

export const system_incident_provider_outage = /** @type {(inputs: System_Incident_Provider_OutageInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Network outage`)
};

export const system_incident_rate_limited_app = /** @type {(inputs: System_Incident_Rate_Limited_AppInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`App hit its rate limit`)
};

export const system_incident_resolved = /** @type {(inputs: System_Incident_ResolvedInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Resolved ${i?.when}`)
};

export const system_incident_seen = /** @type {(inputs: System_Incident_SeenInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`First seen ${i?.first}, last seen ${i?.last}`)
};

export const system_incident_tier_not_enrolled = /** @type {(inputs: System_Incident_Tier_Not_EnrolledInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`API access level missing`)
};

export const system_incidents_empty = /** @type {(inputs: System_Incidents_EmptyInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`No incidents in the last 7 days.`)
};

export const system_incidents_title = /** @type {(inputs: System_Incidents_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Network incidents`)
};

export const system_no_data = /** @type {(inputs: System_No_DataInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`No data`)
};

export const system_ok = /** @type {(inputs: System_OkInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`OK`)
};

export const system_slo_day = /** @type {(inputs: System_Slo_DayInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Last 24 hours`)
};

export const system_slo_duplicates = /** @type {(inputs: System_Slo_DuplicatesInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Published twice`)
};

export const system_slo_on_time = /** @type {(inputs: System_Slo_On_TimeInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Published on time`)
};

export const system_slo_title = /** @type {(inputs: System_Slo_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Publishing goals`)
};

export const system_slo_total = /** @type {(inputs: System_Slo_TotalInputs) => LocalizedString} */ (i) => {
	const countPlural = registry.plural("en", i?.count, {}, true);
	if (countPlural === "one") return /** @type {LocalizedString} */ (`${i?.count} automatic post`);
	return /** @type {LocalizedString} */ (`${i?.count} automatic posts`)
};

export const system_slo_unconfirmed = /** @type {(inputs: System_Slo_UnconfirmedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Unconfirmed`)
};

export const system_slo_week = /** @type {(inputs: System_Slo_WeekInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Last 7 days`)
};

export const system_target_met = /** @type {(inputs: System_Target_MetInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`On target`)
};

export const system_target_missed = /** @type {(inputs: System_Target_MissedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Missed`)
};

export const technical_details = /** @type {(inputs: Technical_DetailsInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Technical details`)
};

export const theme_dark = /** @type {(inputs: Theme_DarkInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Theme: dark`)
};

export const theme_light = /** @type {(inputs: Theme_LightInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Theme: light`)
};

export const theme_option_dark = /** @type {(inputs: Theme_Option_DarkInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Dark`)
};

export const theme_option_light = /** @type {(inputs: Theme_Option_LightInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Light`)
};

export const theme_option_system = /** @type {(inputs: Theme_Option_SystemInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`System`)
};

export const theme_system = /** @type {(inputs: Theme_SystemInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Theme: system`)
};

export const workspace_label = /** @type {(inputs: Workspace_LabelInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Workspace`)
};