import { getLocale, experimentalStaticLocale } from "../runtime.js"

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Settings_Account_TitleInputs */
/** @typedef {{}} Settings_Allow_SelfInputs */
/** @typedef {{}} Settings_Api_Keys_AccessInputs */
/** @typedef {{}} Settings_Api_Keys_Access_BrandsInputs */
/** @typedef {{}} Settings_Api_Keys_Access_ChannelsInputs */
/** @typedef {{}} Settings_Api_Keys_Access_EmptyInputs */
/** @typedef {{}} Settings_Api_Keys_Access_InvalidInputs */
/** @typedef {{}} Settings_Api_Keys_Access_No_BrandsInputs */
/** @typedef {{}} Settings_Api_Keys_Access_No_ChannelsInputs */
/** @typedef {{}} Settings_Api_Keys_Access_Not_RestrictedInputs */
/** @typedef {{}} Settings_Api_Keys_Access_RestrictedInputs */
/** @typedef {{}} Settings_Api_Keys_Access_WorkspaceInputs */
/** @typedef {{}} Settings_Api_Keys_AddInputs */
/** @typedef {{ count: NonNullable<unknown> }} Settings_Api_Keys_Brand_CountInputs */
/** @typedef {{}} Settings_Api_Keys_CancelInputs */
/** @typedef {{ count: NonNullable<unknown> }} Settings_Api_Keys_Channel_CountInputs */
/** @typedef {{}} Settings_Api_Keys_CopiedInputs */
/** @typedef {{}} Settings_Api_Keys_CopyInputs */
/** @typedef {{}} Settings_Api_Keys_Copy_FailedInputs */
/** @typedef {{}} Settings_Api_Keys_CreateInputs */
/** @typedef {{}} Settings_Api_Keys_CreatedInputs */
/** @typedef {{ time: NonNullable<unknown> }} Settings_Api_Keys_Created_AtInputs */
/** @typedef {{}} Settings_Api_Keys_DoneInputs */
/** @typedef {{}} Settings_Api_Keys_EmptyInputs */
/** @typedef {{ time: NonNullable<unknown> }} Settings_Api_Keys_Expired_AtInputs */
/** @typedef {{ time: NonNullable<unknown> }} Settings_Api_Keys_ExpiresInputs */
/** @typedef {{}} Settings_Api_Keys_ExpiryInputs */
/** @typedef {{}} Settings_Api_Keys_Expiry_HintInputs */
/** @typedef {{}} Settings_Api_Keys_Expiry_In_PastInputs */
/** @typedef {{}} Settings_Api_Keys_IntroInputs */
/** @typedef {{}} Settings_Api_Keys_KeepInputs */
/** @typedef {{}} Settings_Api_Keys_MoreInputs */
/** @typedef {{}} Settings_Api_Keys_NameInputs */
/** @typedef {{}} Settings_Api_Keys_Name_HintInputs */
/** @typedef {{ max: NonNullable<unknown> }} Settings_Api_Keys_Name_InvalidInputs */
/** @typedef {{}} Settings_Api_Keys_NavInputs */
/** @typedef {{}} Settings_Api_Keys_Never_ExpiresInputs */
/** @typedef {{ prefix: NonNullable<unknown> }} Settings_Api_Keys_PrefixInputs */
/** @typedef {{ count: NonNullable<unknown> }} Settings_Api_Keys_RateInputs */
/** @typedef {{ count: NonNullable<unknown> }} Settings_Api_Keys_Rate_DefaultInputs */
/** @typedef {{}} Settings_Api_Keys_Rate_LimitInputs */
/** @typedef {{ max: NonNullable<unknown>, count: NonNullable<unknown> }} Settings_Api_Keys_Rate_Limit_HintInputs */
/** @typedef {{ max: NonNullable<unknown> }} Settings_Api_Keys_Rate_Limit_InvalidInputs */
/** @typedef {{ reach: NonNullable<unknown> }} Settings_Api_Keys_RestrictedInputs */
/** @typedef {{}} Settings_Api_Keys_Restricted_NothingInputs */
/** @typedef {{}} Settings_Api_Keys_RevokeInputs */
/** @typedef {{}} Settings_Api_Keys_Revoke_BodyInputs */
/** @typedef {{ name: NonNullable<unknown> }} Settings_Api_Keys_Revoke_NamedInputs */
/** @typedef {{}} Settings_Api_Keys_Revoke_TitleInputs */
/** @typedef {{}} Settings_Api_Keys_RevokedInputs */
/** @typedef {{ time: NonNullable<unknown> }} Settings_Api_Keys_Revoked_AtInputs */
/** @typedef {{}} Settings_Api_Keys_Scope_Ai_GenerateInputs */
/** @typedef {{}} Settings_Api_Keys_Scope_Analytics_ReadInputs */
/** @typedef {{}} Settings_Api_Keys_Scope_Audit_ReadInputs */
/** @typedef {{}} Settings_Api_Keys_Scope_Brands_ReadInputs */
/** @typedef {{}} Settings_Api_Keys_Scope_Channels_ReadInputs */
/** @typedef {{}} Settings_Api_Keys_Scope_Comments_ReadInputs */
/** @typedef {{}} Settings_Api_Keys_Scope_Comments_WriteInputs */
/** @typedef {{}} Settings_Api_Keys_Scope_Groups_ReadInputs */
/** @typedef {{}} Settings_Api_Keys_Scope_Media_ReadInputs */
/** @typedef {{}} Settings_Api_Keys_Scope_Media_WriteInputs */
/** @typedef {{}} Settings_Api_Keys_Scope_Posts_CancelInputs */
/** @typedef {{}} Settings_Api_Keys_Scope_Posts_DraftInputs */
/** @typedef {{}} Settings_Api_Keys_Scope_Posts_ReadInputs */
/** @typedef {{}} Settings_Api_Keys_Scope_Posts_ScheduleInputs */
/** @typedef {{}} Settings_Api_Keys_Scope_Posts_SubmitInputs */
/** @typedef {{}} Settings_Api_Keys_ScopesInputs */
/** @typedef {{}} Settings_Api_Keys_Scopes_HintInputs */
/** @typedef {{}} Settings_Api_Keys_Scopes_InvalidInputs */
/** @typedef {{}} Settings_Api_Keys_Status_ActiveInputs */
/** @typedef {{}} Settings_Api_Keys_Status_ExpiredInputs */
/** @typedef {{}} Settings_Api_Keys_Status_RevokedInputs */
/** @typedef {{}} Settings_Api_Keys_TitleInputs */
/** @typedef {{}} Settings_Api_Keys_Token_OnceInputs */
/** @typedef {{}} Settings_Api_Keys_Token_TitleInputs */
/** @typedef {{}} Settings_Api_Keys_Token_UseInputs */
/** @typedef {{}} Settings_Api_Keys_Whole_WorkspaceInputs */
/** @typedef {{}} Settings_Approval_RequiredInputs */
/** @typedef {{}} Settings_Approvals_IntroInputs */
/** @typedef {{}} Settings_Approvals_TitleInputs */
/** @typedef {{}} Settings_Brand_AddInputs */
/** @typedef {{}} Settings_Brand_ArchiveInputs */
/** @typedef {{ name: NonNullable<unknown> }} Settings_Brand_Archive_OfInputs */
/** @typedef {{}} Settings_Brand_ArchivedInputs */
/** @typedef {{}} Settings_Brand_Archived_DoneInputs */
/** @typedef {{ count: NonNullable<unknown> }} Settings_Brand_ChannelsInputs */
/** @typedef {{ name: NonNullable<unknown> }} Settings_Brand_CreatedInputs */
/** @typedef {{}} Settings_Brand_In_UseInputs */
/** @typedef {{}} Settings_Brand_List_IntroInputs */
/** @typedef {{}} Settings_Brand_List_TitleInputs */
/** @typedef {{ name: NonNullable<unknown> }} Settings_Brand_NameInputs */
/** @typedef {{}} Settings_Brand_Name_InvalidInputs */
/** @typedef {{}} Settings_Brand_Name_TakenInputs */
/** @typedef {{}} Settings_Brand_NewInputs */
/** @typedef {{}} Settings_Brand_OverrideInputs */
/** @typedef {{ name: NonNullable<unknown> }} Settings_Brand_Override_OfInputs */
/** @typedef {{}} Settings_Brand_Override_RemovedInputs */
/** @typedef {{ name: NonNullable<unknown> }} Settings_Brand_Policy_TitleInputs */
/** @typedef {{ count: NonNullable<unknown> }} Settings_Brand_RequiredInputs */
/** @typedef {{}} Settings_Brand_SavedInputs */
/** @typedef {{}} Settings_Brand_StrictestInputs */
/** @typedef {{}} Settings_Brand_UnarchiveInputs */
/** @typedef {{ name: NonNullable<unknown> }} Settings_Brand_Unarchive_OfInputs */
/** @typedef {{}} Settings_Brand_Unarchived_DoneInputs */
/** @typedef {{}} Settings_Brand_Uses_WorkspaceInputs */
/** @typedef {{}} Settings_Brands_EmptyInputs */
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
/** @typedef {{}} Settings_Feed_ActiveInputs */
/** @typedef {{}} Settings_Feed_AddInputs */
/** @typedef {{}} Settings_Feed_CancelInputs */
/** @typedef {{}} Settings_Feed_Channel_GoneInputs */
/** @typedef {{ channel: NonNullable<unknown> }} Settings_Feed_Channel_Manual_OnlyInputs */
/** @typedef {{ channel: NonNullable<unknown> }} Settings_Feed_Channel_QueueInputs */
/** @typedef {{ channel: NonNullable<unknown> }} Settings_Feed_Channel_UnsupportedInputs */
/** @typedef {{}} Settings_Feed_ChannelsInputs */
/** @typedef {{}} Settings_Feed_Channels_HintInputs */
/** @typedef {{}} Settings_Feed_Channels_Image_HintInputs */
/** @typedef {{}} Settings_Feed_CheckingInputs */
/** @typedef {{ name: NonNullable<unknown> }} Settings_Feed_DeleteInputs */
/** @typedef {{}} Settings_Feed_Delete_BodyInputs */
/** @typedef {{}} Settings_Feed_Delete_ConfirmInputs */
/** @typedef {{ name: NonNullable<unknown> }} Settings_Feed_Delete_TitleInputs */
/** @typedef {{}} Settings_Feed_DeletedInputs */
/** @typedef {{ channels: NonNullable<unknown>, network: NonNullable<unknown> }} Settings_Feed_Duplicate_TextInputs */
/** @typedef {{}} Settings_Feed_EditInputs */
/** @typedef {{ name: NonNullable<unknown> }} Settings_Feed_Edit_NamedInputs */
/** @typedef {{}} Settings_Feed_Edit_TitleInputs */
/** @typedef {{}} Settings_Feed_InvalidInputs */
/** @typedef {{}} Settings_Feed_KeepInputs */
/** @typedef {{ time: NonNullable<unknown> }} Settings_Feed_Last_CheckInputs */
/** @typedef {{ kind: NonNullable<unknown> }} Settings_Feed_Last_ErrorInputs */
/** @typedef {{}} Settings_Feed_LimitInputs */
/** @typedef {{}} Settings_Feed_ModeInputs */
/** @typedef {{}} Settings_Feed_Mode_DraftInputs */
/** @typedef {{}} Settings_Feed_Mode_QueueInputs */
/** @typedef {{}} Settings_Feed_NameInputs */
/** @typedef {{}} Settings_Feed_Name_InvalidInputs */
/** @typedef {{}} Settings_Feed_Never_CheckedInputs */
/** @typedef {{}} Settings_Feed_No_ChannelsInputs */
/** @typedef {{}} Settings_Feed_PauseInputs */
/** @typedef {{ name: NonNullable<unknown> }} Settings_Feed_Pause_NamedInputs */
/** @typedef {{ reason: NonNullable<unknown> }} Settings_Feed_PausedInputs */
/** @typedef {{}} Settings_Feed_Paused_ToastInputs */
/** @typedef {{}} Settings_Feed_Placeholder_LinkInputs */
/** @typedef {{}} Settings_Feed_Placeholder_SummaryInputs */
/** @typedef {{}} Settings_Feed_Placeholder_TitleInputs */
/** @typedef {{}} Settings_Feed_PlaceholdersInputs */
/** @typedef {{}} Settings_Feed_ResumeInputs */
/** @typedef {{ name: NonNullable<unknown> }} Settings_Feed_Resume_NamedInputs */
/** @typedef {{}} Settings_Feed_ResumedInputs */
/** @typedef {{}} Settings_Feed_SavedInputs */
/** @typedef {{}} Settings_Feed_TemplateInputs */
/** @typedef {{}} Settings_Feed_Template_InvalidInputs */
/** @typedef {{}} Settings_Feed_UnreachableInputs */
/** @typedef {{}} Settings_Feed_UrlInputs */
/** @typedef {{}} Settings_Feed_Url_InvalidInputs */
/** @typedef {{}} Settings_Feeds_EmptyInputs */
/** @typedef {{}} Settings_Feeds_IntroInputs */
/** @typedef {{}} Settings_Feeds_TitleInputs */
/** @typedef {{}} Settings_Group_AddInputs */
/** @typedef {{}} Settings_Group_CancelInputs */
/** @typedef {{ count: NonNullable<unknown> }} Settings_Group_ChannelsInputs */
/** @typedef {{ name: NonNullable<unknown> }} Settings_Group_CreatedInputs */
/** @typedef {{ name: NonNullable<unknown> }} Settings_Group_DeleteInputs */
/** @typedef {{}} Settings_Group_Delete_BodyInputs */
/** @typedef {{}} Settings_Group_Delete_ConfirmInputs */
/** @typedef {{ name: NonNullable<unknown> }} Settings_Group_Delete_TitleInputs */
/** @typedef {{}} Settings_Group_DeletedInputs */
/** @typedef {{}} Settings_Group_DoneInputs */
/** @typedef {{}} Settings_Group_KeepInputs */
/** @typedef {{}} Settings_Group_MembersInputs */
/** @typedef {{ name: NonNullable<unknown> }} Settings_Group_Members_OfInputs */
/** @typedef {{ name: NonNullable<unknown> }} Settings_Group_NameInputs */
/** @typedef {{}} Settings_Group_Name_InvalidInputs */
/** @typedef {{}} Settings_Group_Name_LabelInputs */
/** @typedef {{}} Settings_Group_Name_TakenInputs */
/** @typedef {{}} Settings_Group_NewInputs */
/** @typedef {{}} Settings_Group_No_ChannelsInputs */
/** @typedef {{}} Settings_Group_SavedInputs */
/** @typedef {{}} Settings_Groups_EmptyInputs */
/** @typedef {{}} Settings_Groups_IntroInputs */
/** @typedef {{}} Settings_Groups_TitleInputs */
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
/** @typedef {{}} Settings_SavedInputs */
/** @typedef {{}} Settings_Saved_Text_AddInputs */
/** @typedef {{}} Settings_Saved_Text_CancelInputs */
/** @typedef {{ name: NonNullable<unknown> }} Settings_Saved_Text_DeleteInputs */
/** @typedef {{}} Settings_Saved_Text_Delete_BodyInputs */
/** @typedef {{ count: NonNullable<unknown> }} Settings_Saved_Text_Delete_ChannelsInputs */
/** @typedef {{}} Settings_Saved_Text_Delete_ConfirmInputs */
/** @typedef {{ name: NonNullable<unknown> }} Settings_Saved_Text_Delete_TitleInputs */
/** @typedef {{}} Settings_Saved_Text_DeletedInputs */
/** @typedef {{}} Settings_Saved_Text_EditInputs */
/** @typedef {{ name: NonNullable<unknown> }} Settings_Saved_Text_Edit_NamedInputs */
/** @typedef {{}} Settings_Saved_Text_ExistsInputs */
/** @typedef {{}} Settings_Saved_Text_InvalidInputs */
/** @typedef {{}} Settings_Saved_Text_KeepInputs */
/** @typedef {{}} Settings_Saved_Text_LimitInputs */
/** @typedef {{}} Settings_Saved_Text_NameInputs */
/** @typedef {{}} Settings_Saved_Text_Name_InvalidInputs */
/** @typedef {{}} Settings_Saved_Text_SavedInputs */
/** @typedef {{}} Settings_Saved_Text_TextInputs */
/** @typedef {{}} Settings_Saved_Texts_EmptyInputs */
/** @typedef {{}} Settings_Saved_Texts_IntroInputs */
/** @typedef {{}} Settings_Saved_Texts_TitleInputs */
/** @typedef {{}} Settings_SavingInputs */
/** @typedef {{}} Settings_Short_Links_Api_KeyInputs */
/** @typedef {{}} Settings_Short_Links_Api_Key_InvalidInputs */
/** @typedef {{}} Settings_Short_Links_Api_Key_KeepInputs */
/** @typedef {{}} Settings_Short_Links_Api_Key_MissingInputs */
/** @typedef {{}} Settings_Short_Links_Api_Key_SetInputs */
/** @typedef {{}} Settings_Short_Links_Base_UrlInputs */
/** @typedef {{}} Settings_Short_Links_Base_Url_HintInputs */
/** @typedef {{}} Settings_Short_Links_Base_Url_InvalidInputs */
/** @typedef {{}} Settings_Short_Links_CancelInputs */
/** @typedef {{}} Settings_Short_Links_CheckingInputs */
/** @typedef {{}} Settings_Short_Links_ConflictInputs */
/** @typedef {{}} Settings_Short_Links_ConnectInputs */
/** @typedef {{}} Settings_Short_Links_Connect_TitleInputs */
/** @typedef {{}} Settings_Short_Links_ConnectedInputs */
/** @typedef {{}} Settings_Short_Links_Connected_TitleInputs */
/** @typedef {{}} Settings_Short_Links_DomainInputs */
/** @typedef {{}} Settings_Short_Links_Domain_InvalidInputs */
/** @typedef {{}} Settings_Short_Links_Domain_NoneInputs */
/** @typedef {{}} Settings_Short_Links_EditInputs */
/** @typedef {{}} Settings_Short_Links_Edit_TitleInputs */
/** @typedef {{}} Settings_Short_Links_IntroInputs */
/** @typedef {{}} Settings_Short_Links_KeepInputs */
/** @typedef {{}} Settings_Short_Links_ProviderInputs */
/** @typedef {{ provider: NonNullable<unknown> }} Settings_Short_Links_Provider_NameInputs */
/** @typedef {{}} Settings_Short_Links_RemoveInputs */
/** @typedef {{}} Settings_Short_Links_Remove_BodyInputs */
/** @typedef {{}} Settings_Short_Links_Remove_TitleInputs */
/** @typedef {{}} Settings_Short_Links_RemovedInputs */
/** @typedef {{}} Settings_Short_Links_SavedInputs */
/** @typedef {{}} Settings_Short_Links_TitleInputs */
/** @typedef {{}} Settings_Short_Links_UnauthorizedInputs */
/** @typedef {{}} Settings_Short_Links_UnreachableInputs */
/** @typedef {{}} Settings_System_TitleInputs */
/** @typedef {{ color: NonNullable<unknown> }} Settings_Tag_ColorInputs */
/** @typedef {{ name: NonNullable<unknown> }} Settings_Tag_Color_OfInputs */
/** @typedef {{ name: NonNullable<unknown> }} Settings_Tag_DeleteInputs */
/** @typedef {{ count: NonNullable<unknown> }} Settings_Tag_Delete_BodyInputs */
/** @typedef {{}} Settings_Tag_Delete_ConfirmInputs */
/** @typedef {{ name: NonNullable<unknown> }} Settings_Tag_Delete_TitleInputs */
/** @typedef {{}} Settings_Tag_DeletedInputs */
/** @typedef {{}} Settings_Tag_KeepInputs */
/** @typedef {{ name: NonNullable<unknown> }} Settings_Tag_NameInputs */
/** @typedef {{ count: NonNullable<unknown> }} Settings_Tag_PostsInputs */
/** @typedef {{}} Settings_Tag_SavedInputs */
/** @typedef {{}} Settings_Tags_EmptyInputs */
/** @typedef {{}} Settings_Tags_IntroInputs */
/** @typedef {{}} Settings_Tags_TitleInputs */
/** @typedef {{}} Settings_ThemeInputs */
/** @typedef {{}} Settings_ToleranceInputs */
/** @typedef {{}} Settings_Webhooks_AddInputs */
/** @typedef {{ count: NonNullable<unknown> }} Settings_Webhooks_AttemptsInputs */
/** @typedef {{}} Settings_Webhooks_CancelInputs */
/** @typedef {{}} Settings_Webhooks_CloseInputs */
/** @typedef {{}} Settings_Webhooks_CopiedInputs */
/** @typedef {{}} Settings_Webhooks_CopyInputs */
/** @typedef {{}} Settings_Webhooks_Copy_FailedInputs */
/** @typedef {{}} Settings_Webhooks_DeleteInputs */
/** @typedef {{}} Settings_Webhooks_Delete_BodyInputs */
/** @typedef {{ host: NonNullable<unknown> }} Settings_Webhooks_Delete_NamedInputs */
/** @typedef {{}} Settings_Webhooks_Delete_TitleInputs */
/** @typedef {{}} Settings_Webhooks_DeletedInputs */
/** @typedef {{}} Settings_Webhooks_DeliveriesInputs */
/** @typedef {{}} Settings_Webhooks_Deliveries_EmptyInputs */
/** @typedef {{}} Settings_Webhooks_Deliveries_MoreInputs */
/** @typedef {{ host: NonNullable<unknown> }} Settings_Webhooks_Deliveries_NamedInputs */
/** @typedef {{}} Settings_Webhooks_DoneInputs */
/** @typedef {{}} Settings_Webhooks_EditInputs */
/** @typedef {{ host: NonNullable<unknown> }} Settings_Webhooks_Edit_NamedInputs */
/** @typedef {{}} Settings_Webhooks_Edit_TitleInputs */
/** @typedef {{}} Settings_Webhooks_EmptyInputs */
/** @typedef {{ host: NonNullable<unknown> }} Settings_Webhooks_Enabled_NamedInputs */
/** @typedef {{ code: NonNullable<unknown> }} Settings_Webhooks_Error_CodeInputs */
/** @typedef {{}} Settings_Webhooks_Event_Channel_ExpiringInputs */
/** @typedef {{}} Settings_Webhooks_Event_Channel_Needs_ReauthInputs */
/** @typedef {{}} Settings_Webhooks_Event_Channel_ReconnectedInputs */
/** @typedef {{}} Settings_Webhooks_Event_Destination_Awaiting_ManualInputs */
/** @typedef {{}} Settings_Webhooks_Event_Destination_BlockedInputs */
/** @typedef {{}} Settings_Webhooks_Event_Destination_FailedInputs */
/** @typedef {{}} Settings_Webhooks_Event_Destination_PublishedInputs */
/** @typedef {{}} Settings_Webhooks_Event_Destination_UnconfirmedInputs */
/** @typedef {{}} Settings_Webhooks_Event_Post_Approval_RequestedInputs */
/** @typedef {{}} Settings_Webhooks_Event_Post_ApprovedInputs */
/** @typedef {{}} Settings_Webhooks_Event_Post_CompletedInputs */
/** @typedef {{}} Settings_Webhooks_Event_Post_RejectedInputs */
/** @typedef {{}} Settings_Webhooks_Event_Provider_App_MisconfiguredInputs */
/** @typedef {{}} Settings_Webhooks_Event_Webhook_TestInputs */
/** @typedef {{}} Settings_Webhooks_EventsInputs */
/** @typedef {{}} Settings_Webhooks_FailingInputs */
/** @typedef {{ time: NonNullable<unknown> }} Settings_Webhooks_Failing_SinceInputs */
/** @typedef {{ status: NonNullable<unknown> }} Settings_Webhooks_Http_StatusInputs */
/** @typedef {{}} Settings_Webhooks_IntroInputs */
/** @typedef {{}} Settings_Webhooks_Keep_EndpointInputs */
/** @typedef {{}} Settings_Webhooks_Keep_SecretInputs */
/** @typedef {{}} Settings_Webhooks_LimitInputs */
/** @typedef {{}} Settings_Webhooks_NavInputs */
/** @typedef {{ time: NonNullable<unknown> }} Settings_Webhooks_Next_AttemptInputs */
/** @typedef {{}} Settings_Webhooks_OffInputs */
/** @typedef {{}} Settings_Webhooks_OnInputs */
/** @typedef {{}} Settings_Webhooks_RotateInputs */
/** @typedef {{ count: NonNullable<unknown> }} Settings_Webhooks_Rotate_BodyInputs */
/** @typedef {{}} Settings_Webhooks_Rotate_ConfirmInputs */
/** @typedef {{ host: NonNullable<unknown> }} Settings_Webhooks_Rotate_NamedInputs */
/** @typedef {{}} Settings_Webhooks_Rotate_TitleInputs */
/** @typedef {{}} Settings_Webhooks_SavedInputs */
/** @typedef {{}} Settings_Webhooks_Secret_OnceInputs */
/** @typedef {{ time: NonNullable<unknown> }} Settings_Webhooks_Secret_PreviousInputs */
/** @typedef {{}} Settings_Webhooks_Secret_TitleInputs */
/** @typedef {{}} Settings_Webhooks_Secret_UseInputs */
/** @typedef {{}} Settings_Webhooks_State_DeadInputs */
/** @typedef {{}} Settings_Webhooks_State_DeliveredInputs */
/** @typedef {{}} Settings_Webhooks_State_DeliveringInputs */
/** @typedef {{}} Settings_Webhooks_State_PendingInputs */
/** @typedef {{}} Settings_Webhooks_State_Retry_WaitInputs */
/** @typedef {{}} Settings_Webhooks_TestInputs */
/** @typedef {{}} Settings_Webhooks_Test_DisabledInputs */
/** @typedef {{}} Settings_Webhooks_Test_LimitInputs */
/** @typedef {{ host: NonNullable<unknown> }} Settings_Webhooks_Test_NamedInputs */
/** @typedef {{}} Settings_Webhooks_Test_SentInputs */
/** @typedef {{}} Settings_Webhooks_TitleInputs */
/** @typedef {{}} Settings_Webhooks_Turned_OffInputs */
/** @typedef {{}} Settings_Webhooks_Turned_OnInputs */
/** @typedef {{}} Settings_Webhooks_UrlInputs */
/** @typedef {{}} Settings_Webhooks_Url_HintInputs */
/** @typedef {{}} Settings_Webhooks_Url_InvalidInputs */
/** @typedef {{ provider: NonNullable<unknown> }} Settings_Workspace_Apps_Active_NoteInputs */
/** @typedef {{}} Settings_Workspace_Apps_CallbackInputs */
/** @typedef {{ provider: NonNullable<unknown> }} Settings_Workspace_Apps_Callback_HintInputs */
/** @typedef {{}} Settings_Workspace_Apps_CancelInputs */
/** @typedef {{}} Settings_Workspace_Apps_Client_IdInputs */
/** @typedef {{}} Settings_Workspace_Apps_Client_Id_InvalidInputs */
/** @typedef {{}} Settings_Workspace_Apps_Client_Id_TakenInputs */
/** @typedef {{}} Settings_Workspace_Apps_Client_SecretInputs */
/** @typedef {{}} Settings_Workspace_Apps_Client_Secret_InvalidInputs */
/** @typedef {{}} Settings_Workspace_Apps_DisableInputs */
/** @typedef {{ provider: NonNullable<unknown> }} Settings_Workspace_Apps_Disable_BodyInputs */
/** @typedef {{}} Settings_Workspace_Apps_Disable_TitleInputs */
/** @typedef {{}} Settings_Workspace_Apps_DisabledInputs */
/** @typedef {{}} Settings_Workspace_Apps_ExistsInputs */
/** @typedef {{ provider: NonNullable<unknown> }} Settings_Workspace_Apps_InstanceInputs */
/** @typedef {{}} Settings_Workspace_Apps_IntroInputs */
/** @typedef {{}} Settings_Workspace_Apps_KeepInputs */
/** @typedef {{ provider: NonNullable<unknown> }} Settings_Workspace_Apps_MisconfiguredInputs */
/** @typedef {{}} Settings_Workspace_Apps_NavInputs */
/** @typedef {{}} Settings_Workspace_Apps_New_SecretInputs */
/** @typedef {{}} Settings_Workspace_Apps_NoneInputs */
/** @typedef {{}} Settings_Workspace_Apps_Not_SupportedInputs */
/** @typedef {{ provider: NonNullable<unknown> }} Settings_Workspace_Apps_Own_HintInputs */
/** @typedef {{}} Settings_Workspace_Apps_RegisterInputs */
/** @typedef {{}} Settings_Workspace_Apps_RegisteredInputs */
/** @typedef {{}} Settings_Workspace_Apps_ReplaceInputs */
/** @typedef {{}} Settings_Workspace_Apps_Save_SecretInputs */
/** @typedef {{}} Settings_Workspace_Apps_Secret_ReplacedInputs */
/** @typedef {{}} Settings_Workspace_Apps_StatusInputs */
/** @typedef {{}} Settings_Workspace_Apps_Status_ActiveInputs */
/** @typedef {{}} Settings_Workspace_Apps_Status_MisconfiguredInputs */
/** @typedef {{}} Settings_Workspace_Apps_TitleInputs */
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
/** @typedef {{}} Theme_Option_DarkInputs */
/** @typedef {{}} Theme_Option_LightInputs */
/** @typedef {{}} Theme_Option_SystemInputs */
import * as __en from "./en.js"
import * as __sk from "./sk.js"
import * as __cs from "./cs.js"
/**
* | output |
* | --- |
* | "Account" |
*
* @param {Settings_Account_TitleInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_account_title = /** @type {((inputs?: Settings_Account_TitleInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Account_TitleInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_account_title(inputs)
	if (locale === "cs") return __cs.settings_account_title(inputs)
	return __en.settings_account_title(inputs)
});
/**
* | output |
* | --- |
* | "Requesters can approve their own posts" |
*
* @param {Settings_Allow_SelfInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_allow_self = /** @type {((inputs?: Settings_Allow_SelfInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Allow_SelfInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_allow_self(inputs)
	if (locale === "cs") return __cs.settings_allow_self(inputs)
	return __en.settings_allow_self(inputs)
});
/**
* | output |
* | --- |
* | "Access" |
*
* @param {Settings_Api_Keys_AccessInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_api_keys_access = /** @type {((inputs?: Settings_Api_Keys_AccessInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Api_Keys_AccessInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_api_keys_access(inputs)
	if (locale === "cs") return __cs.settings_api_keys_access(inputs)
	return __en.settings_api_keys_access(inputs)
});
/**
* | output |
* | --- |
* | "Brands" |
*
* @param {Settings_Api_Keys_Access_BrandsInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_api_keys_access_brands = /** @type {((inputs?: Settings_Api_Keys_Access_BrandsInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Api_Keys_Access_BrandsInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_api_keys_access_brands(inputs)
	if (locale === "cs") return __cs.settings_api_keys_access_brands(inputs)
	return __en.settings_api_keys_access_brands(inputs)
});
/**
* | output |
* | --- |
* | "Channels" |
*
* @param {Settings_Api_Keys_Access_ChannelsInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_api_keys_access_channels = /** @type {((inputs?: Settings_Api_Keys_Access_ChannelsInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Api_Keys_Access_ChannelsInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_api_keys_access_channels(inputs)
	if (locale === "cs") return __cs.settings_api_keys_access_channels(inputs)
	return __en.settings_api_keys_access_channels(inputs)
});
/**
* | output |
* | --- |
* | "Nothing is chosen yet, so this key would reach no brand and no channel." |
*
* @param {Settings_Api_Keys_Access_EmptyInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_api_keys_access_empty = /** @type {((inputs?: Settings_Api_Keys_Access_EmptyInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Api_Keys_Access_EmptyInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_api_keys_access_empty(inputs)
	if (locale === "cs") return __cs.settings_api_keys_access_empty(inputs)
	return __en.settings_api_keys_access_empty(inputs)
});
/**
* | output |
* | --- |
* | "One of the chosen brands or channels no longer exists. Reload the page and choose again." |
*
* @param {Settings_Api_Keys_Access_InvalidInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_api_keys_access_invalid = /** @type {((inputs?: Settings_Api_Keys_Access_InvalidInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Api_Keys_Access_InvalidInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_api_keys_access_invalid(inputs)
	if (locale === "cs") return __cs.settings_api_keys_access_invalid(inputs)
	return __en.settings_api_keys_access_invalid(inputs)
});
/**
* | output |
* | --- |
* | "This workspace has no brands." |
*
* @param {Settings_Api_Keys_Access_No_BrandsInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_api_keys_access_no_brands = /** @type {((inputs?: Settings_Api_Keys_Access_No_BrandsInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Api_Keys_Access_No_BrandsInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_api_keys_access_no_brands(inputs)
	if (locale === "cs") return __cs.settings_api_keys_access_no_brands(inputs)
	return __en.settings_api_keys_access_no_brands(inputs)
});
/**
* | output |
* | --- |
* | "This workspace has no channels." |
*
* @param {Settings_Api_Keys_Access_No_ChannelsInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_api_keys_access_no_channels = /** @type {((inputs?: Settings_Api_Keys_Access_No_ChannelsInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Api_Keys_Access_No_ChannelsInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_api_keys_access_no_channels(inputs)
	if (locale === "cs") return __cs.settings_api_keys_access_no_channels(inputs)
	return __en.settings_api_keys_access_no_channels(inputs)
});
/**
* | output |
* | --- |
* | "Brands and channels apply only to a key with restricted access." |
*
* @param {Settings_Api_Keys_Access_Not_RestrictedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_api_keys_access_not_restricted = /** @type {((inputs?: Settings_Api_Keys_Access_Not_RestrictedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Api_Keys_Access_Not_RestrictedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_api_keys_access_not_restricted(inputs)
	if (locale === "cs") return __cs.settings_api_keys_access_not_restricted(inputs)
	return __en.settings_api_keys_access_not_restricted(inputs)
});
/**
* | output |
* | --- |
* | "Only the brands and channels I choose" |
*
* @param {Settings_Api_Keys_Access_RestrictedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_api_keys_access_restricted = /** @type {((inputs?: Settings_Api_Keys_Access_RestrictedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Api_Keys_Access_RestrictedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_api_keys_access_restricted(inputs)
	if (locale === "cs") return __cs.settings_api_keys_access_restricted(inputs)
	return __en.settings_api_keys_access_restricted(inputs)
});
/**
* | output |
* | --- |
* | "The whole workspace" |
*
* @param {Settings_Api_Keys_Access_WorkspaceInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_api_keys_access_workspace = /** @type {((inputs?: Settings_Api_Keys_Access_WorkspaceInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Api_Keys_Access_WorkspaceInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_api_keys_access_workspace(inputs)
	if (locale === "cs") return __cs.settings_api_keys_access_workspace(inputs)
	return __en.settings_api_keys_access_workspace(inputs)
});
/**
* | output |
* | --- |
* | "Create API key" |
*
* @param {Settings_Api_Keys_AddInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_api_keys_add = /** @type {((inputs?: Settings_Api_Keys_AddInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Api_Keys_AddInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_api_keys_add(inputs)
	if (locale === "cs") return __cs.settings_api_keys_add(inputs)
	return __en.settings_api_keys_add(inputs)
});
/**
* | countPlural | output |
* | --- | --- |
* | "one" | "{count} brand" |
* | * | "{count} brands" |
*
* @param {Settings_Api_Keys_Brand_CountInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_api_keys_brand_count = /** @type {((inputs: Settings_Api_Keys_Brand_CountInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Api_Keys_Brand_CountInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_api_keys_brand_count(inputs)
	if (locale === "cs") return __cs.settings_api_keys_brand_count(inputs)
	return __en.settings_api_keys_brand_count(inputs)
});
/**
* | output |
* | --- |
* | "Cancel" |
*
* @param {Settings_Api_Keys_CancelInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_api_keys_cancel = /** @type {((inputs?: Settings_Api_Keys_CancelInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Api_Keys_CancelInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_api_keys_cancel(inputs)
	if (locale === "cs") return __cs.settings_api_keys_cancel(inputs)
	return __en.settings_api_keys_cancel(inputs)
});
/**
* | countPlural | output |
* | --- | --- |
* | "one" | "{count} channel" |
* | * | "{count} channels" |
*
* @param {Settings_Api_Keys_Channel_CountInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_api_keys_channel_count = /** @type {((inputs: Settings_Api_Keys_Channel_CountInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Api_Keys_Channel_CountInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_api_keys_channel_count(inputs)
	if (locale === "cs") return __cs.settings_api_keys_channel_count(inputs)
	return __en.settings_api_keys_channel_count(inputs)
});
/**
* | output |
* | --- |
* | "Key copied" |
*
* @param {Settings_Api_Keys_CopiedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_api_keys_copied = /** @type {((inputs?: Settings_Api_Keys_CopiedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Api_Keys_CopiedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_api_keys_copied(inputs)
	if (locale === "cs") return __cs.settings_api_keys_copied(inputs)
	return __en.settings_api_keys_copied(inputs)
});
/**
* | output |
* | --- |
* | "Copy key" |
*
* @param {Settings_Api_Keys_CopyInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_api_keys_copy = /** @type {((inputs?: Settings_Api_Keys_CopyInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Api_Keys_CopyInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_api_keys_copy(inputs)
	if (locale === "cs") return __cs.settings_api_keys_copy(inputs)
	return __en.settings_api_keys_copy(inputs)
});
/**
* | output |
* | --- |
* | "Couldn't copy. Select the key and copy it yourself." |
*
* @param {Settings_Api_Keys_Copy_FailedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_api_keys_copy_failed = /** @type {((inputs?: Settings_Api_Keys_Copy_FailedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Api_Keys_Copy_FailedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_api_keys_copy_failed(inputs)
	if (locale === "cs") return __cs.settings_api_keys_copy_failed(inputs)
	return __en.settings_api_keys_copy_failed(inputs)
});
/**
* | output |
* | --- |
* | "Create key" |
*
* @param {Settings_Api_Keys_CreateInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_api_keys_create = /** @type {((inputs?: Settings_Api_Keys_CreateInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Api_Keys_CreateInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_api_keys_create(inputs)
	if (locale === "cs") return __cs.settings_api_keys_create(inputs)
	return __en.settings_api_keys_create(inputs)
});
/**
* | output |
* | --- |
* | "API key created" |
*
* @param {Settings_Api_Keys_CreatedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_api_keys_created = /** @type {((inputs?: Settings_Api_Keys_CreatedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Api_Keys_CreatedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_api_keys_created(inputs)
	if (locale === "cs") return __cs.settings_api_keys_created(inputs)
	return __en.settings_api_keys_created(inputs)
});
/**
* | output |
* | --- |
* | "Created {time}" |
*
* @param {Settings_Api_Keys_Created_AtInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_api_keys_created_at = /** @type {((inputs: Settings_Api_Keys_Created_AtInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Api_Keys_Created_AtInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_api_keys_created_at(inputs)
	if (locale === "cs") return __cs.settings_api_keys_created_at(inputs)
	return __en.settings_api_keys_created_at(inputs)
});
/**
* | output |
* | --- |
* | "Done" |
*
* @param {Settings_Api_Keys_DoneInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_api_keys_done = /** @type {((inputs?: Settings_Api_Keys_DoneInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Api_Keys_DoneInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_api_keys_done(inputs)
	if (locale === "cs") return __cs.settings_api_keys_done(inputs)
	return __en.settings_api_keys_done(inputs)
});
/**
* | output |
* | --- |
* | "No API keys yet." |
*
* @param {Settings_Api_Keys_EmptyInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_api_keys_empty = /** @type {((inputs?: Settings_Api_Keys_EmptyInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Api_Keys_EmptyInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_api_keys_empty(inputs)
	if (locale === "cs") return __cs.settings_api_keys_empty(inputs)
	return __en.settings_api_keys_empty(inputs)
});
/**
* | output |
* | --- |
* | "Expired {time}" |
*
* @param {Settings_Api_Keys_Expired_AtInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_api_keys_expired_at = /** @type {((inputs: Settings_Api_Keys_Expired_AtInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Api_Keys_Expired_AtInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_api_keys_expired_at(inputs)
	if (locale === "cs") return __cs.settings_api_keys_expired_at(inputs)
	return __en.settings_api_keys_expired_at(inputs)
});
/**
* | output |
* | --- |
* | "Expires {time}" |
*
* @param {Settings_Api_Keys_ExpiresInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_api_keys_expires = /** @type {((inputs: Settings_Api_Keys_ExpiresInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Api_Keys_ExpiresInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_api_keys_expires(inputs)
	if (locale === "cs") return __cs.settings_api_keys_expires(inputs)
	return __en.settings_api_keys_expires(inputs)
});
/**
* | output |
* | --- |
* | "Valid until (optional)" |
*
* @param {Settings_Api_Keys_ExpiryInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_api_keys_expiry = /** @type {((inputs?: Settings_Api_Keys_ExpiryInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Api_Keys_ExpiryInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_api_keys_expiry(inputs)
	if (locale === "cs") return __cs.settings_api_keys_expiry(inputs)
	return __en.settings_api_keys_expiry(inputs)
});
/**
* | output |
* | --- |
* | "The key stops working at the end of this day in your time zone. Leave it empty for a key that doesn't expire." |
*
* @param {Settings_Api_Keys_Expiry_HintInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_api_keys_expiry_hint = /** @type {((inputs?: Settings_Api_Keys_Expiry_HintInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Api_Keys_Expiry_HintInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_api_keys_expiry_hint(inputs)
	if (locale === "cs") return __cs.settings_api_keys_expiry_hint(inputs)
	return __en.settings_api_keys_expiry_hint(inputs)
});
/**
* | output |
* | --- |
* | "Choose a day in the future." |
*
* @param {Settings_Api_Keys_Expiry_In_PastInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_api_keys_expiry_in_past = /** @type {((inputs?: Settings_Api_Keys_Expiry_In_PastInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Api_Keys_Expiry_In_PastInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_api_keys_expiry_in_past(inputs)
	if (locale === "cs") return __cs.settings_api_keys_expiry_in_past(inputs)
	return __en.settings_api_keys_expiry_in_past(inputs)
});
/**
* | output |
* | --- |
* | "API keys let your own scripts and tools use the Kronaut API for this workspace. A key can never approve posts, connect channels or change settings." |
*
* @param {Settings_Api_Keys_IntroInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_api_keys_intro = /** @type {((inputs?: Settings_Api_Keys_IntroInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Api_Keys_IntroInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_api_keys_intro(inputs)
	if (locale === "cs") return __cs.settings_api_keys_intro(inputs)
	return __en.settings_api_keys_intro(inputs)
});
/**
* | output |
* | --- |
* | "Keep key" |
*
* @param {Settings_Api_Keys_KeepInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_api_keys_keep = /** @type {((inputs?: Settings_Api_Keys_KeepInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Api_Keys_KeepInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_api_keys_keep(inputs)
	if (locale === "cs") return __cs.settings_api_keys_keep(inputs)
	return __en.settings_api_keys_keep(inputs)
});
/**
* | output |
* | --- |
* | "Load more" |
*
* @param {Settings_Api_Keys_MoreInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_api_keys_more = /** @type {((inputs?: Settings_Api_Keys_MoreInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Api_Keys_MoreInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_api_keys_more(inputs)
	if (locale === "cs") return __cs.settings_api_keys_more(inputs)
	return __en.settings_api_keys_more(inputs)
});
/**
* | output |
* | --- |
* | "Name" |
*
* @param {Settings_Api_Keys_NameInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_api_keys_name = /** @type {((inputs?: Settings_Api_Keys_NameInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Api_Keys_NameInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_api_keys_name(inputs)
	if (locale === "cs") return __cs.settings_api_keys_name(inputs)
	return __en.settings_api_keys_name(inputs)
});
/**
* | output |
* | --- |
* | "So you can tell your keys apart, for example the name of the tool that uses it." |
*
* @param {Settings_Api_Keys_Name_HintInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_api_keys_name_hint = /** @type {((inputs?: Settings_Api_Keys_Name_HintInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Api_Keys_Name_HintInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_api_keys_name_hint(inputs)
	if (locale === "cs") return __cs.settings_api_keys_name_hint(inputs)
	return __en.settings_api_keys_name_hint(inputs)
});
/**
* | output |
* | --- |
* | "Give the key a name of 1 to {max} characters." |
*
* @param {Settings_Api_Keys_Name_InvalidInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_api_keys_name_invalid = /** @type {((inputs: Settings_Api_Keys_Name_InvalidInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Api_Keys_Name_InvalidInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_api_keys_name_invalid(inputs)
	if (locale === "cs") return __cs.settings_api_keys_name_invalid(inputs)
	return __en.settings_api_keys_name_invalid(inputs)
});
/**
* | output |
* | --- |
* | "API keys" |
*
* @param {Settings_Api_Keys_NavInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_api_keys_nav = /** @type {((inputs?: Settings_Api_Keys_NavInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Api_Keys_NavInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_api_keys_nav(inputs)
	if (locale === "cs") return __cs.settings_api_keys_nav(inputs)
	return __en.settings_api_keys_nav(inputs)
});
/**
* | output |
* | --- |
* | "Doesn't expire" |
*
* @param {Settings_Api_Keys_Never_ExpiresInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_api_keys_never_expires = /** @type {((inputs?: Settings_Api_Keys_Never_ExpiresInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Api_Keys_Never_ExpiresInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_api_keys_never_expires(inputs)
	if (locale === "cs") return __cs.settings_api_keys_never_expires(inputs)
	return __en.settings_api_keys_never_expires(inputs)
});
/**
* | output |
* | --- |
* | "Starts with {prefix}" |
*
* @param {Settings_Api_Keys_PrefixInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_api_keys_prefix = /** @type {((inputs: Settings_Api_Keys_PrefixInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Api_Keys_PrefixInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_api_keys_prefix(inputs)
	if (locale === "cs") return __cs.settings_api_keys_prefix(inputs)
	return __en.settings_api_keys_prefix(inputs)
});
/**
* | countPlural | output |
* | --- | --- |
* | "one" | "{count} request a minute" |
* | * | "{count} requests a minute" |
*
* @param {Settings_Api_Keys_RateInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_api_keys_rate = /** @type {((inputs: Settings_Api_Keys_RateInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Api_Keys_RateInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_api_keys_rate(inputs)
	if (locale === "cs") return __cs.settings_api_keys_rate(inputs)
	return __en.settings_api_keys_rate(inputs)
});
/**
* | countPlural | output |
* | --- | --- |
* | "one" | "{count} request a minute (default)" |
* | * | "{count} requests a minute (default)" |
*
* @param {Settings_Api_Keys_Rate_DefaultInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_api_keys_rate_default = /** @type {((inputs: Settings_Api_Keys_Rate_DefaultInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Api_Keys_Rate_DefaultInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_api_keys_rate_default(inputs)
	if (locale === "cs") return __cs.settings_api_keys_rate_default(inputs)
	return __en.settings_api_keys_rate_default(inputs)
});
/**
* | output |
* | --- |
* | "Requests a minute (optional)" |
*
* @param {Settings_Api_Keys_Rate_LimitInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_api_keys_rate_limit = /** @type {((inputs?: Settings_Api_Keys_Rate_LimitInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Api_Keys_Rate_LimitInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_api_keys_rate_limit(inputs)
	if (locale === "cs") return __cs.settings_api_keys_rate_limit(inputs)
	return __en.settings_api_keys_rate_limit(inputs)
});
/**
* | output |
* | --- |
* | "From 1 to {max}. Leave it empty for the default of {count}." |
*
* @param {Settings_Api_Keys_Rate_Limit_HintInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_api_keys_rate_limit_hint = /** @type {((inputs: Settings_Api_Keys_Rate_Limit_HintInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Api_Keys_Rate_Limit_HintInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_api_keys_rate_limit_hint(inputs)
	if (locale === "cs") return __cs.settings_api_keys_rate_limit_hint(inputs)
	return __en.settings_api_keys_rate_limit_hint(inputs)
});
/**
* | output |
* | --- |
* | "Enter a whole number from 1 to {max}." |
*
* @param {Settings_Api_Keys_Rate_Limit_InvalidInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_api_keys_rate_limit_invalid = /** @type {((inputs: Settings_Api_Keys_Rate_Limit_InvalidInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Api_Keys_Rate_Limit_InvalidInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_api_keys_rate_limit_invalid(inputs)
	if (locale === "cs") return __cs.settings_api_keys_rate_limit_invalid(inputs)
	return __en.settings_api_keys_rate_limit_invalid(inputs)
});
/**
* | output |
* | --- |
* | "Restricted to {reach}" |
*
* @param {Settings_Api_Keys_RestrictedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_api_keys_restricted = /** @type {((inputs: Settings_Api_Keys_RestrictedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Api_Keys_RestrictedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_api_keys_restricted(inputs)
	if (locale === "cs") return __cs.settings_api_keys_restricted(inputs)
	return __en.settings_api_keys_restricted(inputs)
});
/**
* | output |
* | --- |
* | "Restricted, reaches nothing" |
*
* @param {Settings_Api_Keys_Restricted_NothingInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_api_keys_restricted_nothing = /** @type {((inputs?: Settings_Api_Keys_Restricted_NothingInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Api_Keys_Restricted_NothingInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_api_keys_restricted_nothing(inputs)
	if (locale === "cs") return __cs.settings_api_keys_restricted_nothing(inputs)
	return __en.settings_api_keys_restricted_nothing(inputs)
});
/**
* | output |
* | --- |
* | "Revoke" |
*
* @param {Settings_Api_Keys_RevokeInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_api_keys_revoke = /** @type {((inputs?: Settings_Api_Keys_RevokeInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Api_Keys_RevokeInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_api_keys_revoke(inputs)
	if (locale === "cs") return __cs.settings_api_keys_revoke(inputs)
	return __en.settings_api_keys_revoke(inputs)
});
/**
* | output |
* | --- |
* | "Tools that use it stop working with their next request. This can't be undone." |
*
* @param {Settings_Api_Keys_Revoke_BodyInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_api_keys_revoke_body = /** @type {((inputs?: Settings_Api_Keys_Revoke_BodyInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Api_Keys_Revoke_BodyInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_api_keys_revoke_body(inputs)
	if (locale === "cs") return __cs.settings_api_keys_revoke_body(inputs)
	return __en.settings_api_keys_revoke_body(inputs)
});
/**
* | output |
* | --- |
* | "Revoke {name}" |
*
* @param {Settings_Api_Keys_Revoke_NamedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_api_keys_revoke_named = /** @type {((inputs: Settings_Api_Keys_Revoke_NamedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Api_Keys_Revoke_NamedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_api_keys_revoke_named(inputs)
	if (locale === "cs") return __cs.settings_api_keys_revoke_named(inputs)
	return __en.settings_api_keys_revoke_named(inputs)
});
/**
* | output |
* | --- |
* | "Revoke this API key?" |
*
* @param {Settings_Api_Keys_Revoke_TitleInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_api_keys_revoke_title = /** @type {((inputs?: Settings_Api_Keys_Revoke_TitleInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Api_Keys_Revoke_TitleInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_api_keys_revoke_title(inputs)
	if (locale === "cs") return __cs.settings_api_keys_revoke_title(inputs)
	return __en.settings_api_keys_revoke_title(inputs)
});
/**
* | output |
* | --- |
* | "API key revoked" |
*
* @param {Settings_Api_Keys_RevokedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_api_keys_revoked = /** @type {((inputs?: Settings_Api_Keys_RevokedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Api_Keys_RevokedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_api_keys_revoked(inputs)
	if (locale === "cs") return __cs.settings_api_keys_revoked(inputs)
	return __en.settings_api_keys_revoked(inputs)
});
/**
* | output |
* | --- |
* | "Revoked {time}" |
*
* @param {Settings_Api_Keys_Revoked_AtInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_api_keys_revoked_at = /** @type {((inputs: Settings_Api_Keys_Revoked_AtInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Api_Keys_Revoked_AtInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_api_keys_revoked_at(inputs)
	if (locale === "cs") return __cs.settings_api_keys_revoked_at(inputs)
	return __en.settings_api_keys_revoked_at(inputs)
});
/**
* | output |
* | --- |
* | "Write text with AI" |
*
* @param {Settings_Api_Keys_Scope_Ai_GenerateInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_api_keys_scope_ai_generate = /** @type {((inputs?: Settings_Api_Keys_Scope_Ai_GenerateInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Api_Keys_Scope_Ai_GenerateInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_api_keys_scope_ai_generate(inputs)
	if (locale === "cs") return __cs.settings_api_keys_scope_ai_generate(inputs)
	return __en.settings_api_keys_scope_ai_generate(inputs)
});
/**
* | output |
* | --- |
* | "See analytics" |
*
* @param {Settings_Api_Keys_Scope_Analytics_ReadInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_api_keys_scope_analytics_read = /** @type {((inputs?: Settings_Api_Keys_Scope_Analytics_ReadInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Api_Keys_Scope_Analytics_ReadInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_api_keys_scope_analytics_read(inputs)
	if (locale === "cs") return __cs.settings_api_keys_scope_analytics_read(inputs)
	return __en.settings_api_keys_scope_analytics_read(inputs)
});
/**
* | output |
* | --- |
* | "See the audit log" |
*
* @param {Settings_Api_Keys_Scope_Audit_ReadInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_api_keys_scope_audit_read = /** @type {((inputs?: Settings_Api_Keys_Scope_Audit_ReadInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Api_Keys_Scope_Audit_ReadInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_api_keys_scope_audit_read(inputs)
	if (locale === "cs") return __cs.settings_api_keys_scope_audit_read(inputs)
	return __en.settings_api_keys_scope_audit_read(inputs)
});
/**
* | output |
* | --- |
* | "See brands" |
*
* @param {Settings_Api_Keys_Scope_Brands_ReadInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_api_keys_scope_brands_read = /** @type {((inputs?: Settings_Api_Keys_Scope_Brands_ReadInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Api_Keys_Scope_Brands_ReadInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_api_keys_scope_brands_read(inputs)
	if (locale === "cs") return __cs.settings_api_keys_scope_brands_read(inputs)
	return __en.settings_api_keys_scope_brands_read(inputs)
});
/**
* | output |
* | --- |
* | "See channels" |
*
* @param {Settings_Api_Keys_Scope_Channels_ReadInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_api_keys_scope_channels_read = /** @type {((inputs?: Settings_Api_Keys_Scope_Channels_ReadInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Api_Keys_Scope_Channels_ReadInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_api_keys_scope_channels_read(inputs)
	if (locale === "cs") return __cs.settings_api_keys_scope_channels_read(inputs)
	return __en.settings_api_keys_scope_channels_read(inputs)
});
/**
* | output |
* | --- |
* | "See comments" |
*
* @param {Settings_Api_Keys_Scope_Comments_ReadInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_api_keys_scope_comments_read = /** @type {((inputs?: Settings_Api_Keys_Scope_Comments_ReadInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Api_Keys_Scope_Comments_ReadInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_api_keys_scope_comments_read(inputs)
	if (locale === "cs") return __cs.settings_api_keys_scope_comments_read(inputs)
	return __en.settings_api_keys_scope_comments_read(inputs)
});
/**
* | output |
* | --- |
* | "Write comments" |
*
* @param {Settings_Api_Keys_Scope_Comments_WriteInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_api_keys_scope_comments_write = /** @type {((inputs?: Settings_Api_Keys_Scope_Comments_WriteInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Api_Keys_Scope_Comments_WriteInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_api_keys_scope_comments_write(inputs)
	if (locale === "cs") return __cs.settings_api_keys_scope_comments_write(inputs)
	return __en.settings_api_keys_scope_comments_write(inputs)
});
/**
* | output |
* | --- |
* | "See groups" |
*
* @param {Settings_Api_Keys_Scope_Groups_ReadInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_api_keys_scope_groups_read = /** @type {((inputs?: Settings_Api_Keys_Scope_Groups_ReadInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Api_Keys_Scope_Groups_ReadInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_api_keys_scope_groups_read(inputs)
	if (locale === "cs") return __cs.settings_api_keys_scope_groups_read(inputs)
	return __en.settings_api_keys_scope_groups_read(inputs)
});
/**
* | output |
* | --- |
* | "See media" |
*
* @param {Settings_Api_Keys_Scope_Media_ReadInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_api_keys_scope_media_read = /** @type {((inputs?: Settings_Api_Keys_Scope_Media_ReadInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Api_Keys_Scope_Media_ReadInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_api_keys_scope_media_read(inputs)
	if (locale === "cs") return __cs.settings_api_keys_scope_media_read(inputs)
	return __en.settings_api_keys_scope_media_read(inputs)
});
/**
* | output |
* | --- |
* | "Upload media" |
*
* @param {Settings_Api_Keys_Scope_Media_WriteInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_api_keys_scope_media_write = /** @type {((inputs?: Settings_Api_Keys_Scope_Media_WriteInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Api_Keys_Scope_Media_WriteInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_api_keys_scope_media_write(inputs)
	if (locale === "cs") return __cs.settings_api_keys_scope_media_write(inputs)
	return __en.settings_api_keys_scope_media_write(inputs)
});
/**
* | output |
* | --- |
* | "Cancel scheduled posts" |
*
* @param {Settings_Api_Keys_Scope_Posts_CancelInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_api_keys_scope_posts_cancel = /** @type {((inputs?: Settings_Api_Keys_Scope_Posts_CancelInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Api_Keys_Scope_Posts_CancelInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_api_keys_scope_posts_cancel(inputs)
	if (locale === "cs") return __cs.settings_api_keys_scope_posts_cancel(inputs)
	return __en.settings_api_keys_scope_posts_cancel(inputs)
});
/**
* | output |
* | --- |
* | "Create and edit drafts" |
*
* @param {Settings_Api_Keys_Scope_Posts_DraftInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_api_keys_scope_posts_draft = /** @type {((inputs?: Settings_Api_Keys_Scope_Posts_DraftInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Api_Keys_Scope_Posts_DraftInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_api_keys_scope_posts_draft(inputs)
	if (locale === "cs") return __cs.settings_api_keys_scope_posts_draft(inputs)
	return __en.settings_api_keys_scope_posts_draft(inputs)
});
/**
* | output |
* | --- |
* | "See posts" |
*
* @param {Settings_Api_Keys_Scope_Posts_ReadInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_api_keys_scope_posts_read = /** @type {((inputs?: Settings_Api_Keys_Scope_Posts_ReadInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Api_Keys_Scope_Posts_ReadInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_api_keys_scope_posts_read(inputs)
	if (locale === "cs") return __cs.settings_api_keys_scope_posts_read(inputs)
	return __en.settings_api_keys_scope_posts_read(inputs)
});
/**
* | output |
* | --- |
* | "Schedule posts" |
*
* @param {Settings_Api_Keys_Scope_Posts_ScheduleInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_api_keys_scope_posts_schedule = /** @type {((inputs?: Settings_Api_Keys_Scope_Posts_ScheduleInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Api_Keys_Scope_Posts_ScheduleInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_api_keys_scope_posts_schedule(inputs)
	if (locale === "cs") return __cs.settings_api_keys_scope_posts_schedule(inputs)
	return __en.settings_api_keys_scope_posts_schedule(inputs)
});
/**
* | output |
* | --- |
* | "Submit posts for approval" |
*
* @param {Settings_Api_Keys_Scope_Posts_SubmitInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_api_keys_scope_posts_submit = /** @type {((inputs?: Settings_Api_Keys_Scope_Posts_SubmitInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Api_Keys_Scope_Posts_SubmitInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_api_keys_scope_posts_submit(inputs)
	if (locale === "cs") return __cs.settings_api_keys_scope_posts_submit(inputs)
	return __en.settings_api_keys_scope_posts_submit(inputs)
});
/**
* | output |
* | --- |
* | "What the key may do" |
*
* @param {Settings_Api_Keys_ScopesInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_api_keys_scopes = /** @type {((inputs?: Settings_Api_Keys_ScopesInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Api_Keys_ScopesInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_api_keys_scopes(inputs)
	if (locale === "cs") return __cs.settings_api_keys_scopes(inputs)
	return __en.settings_api_keys_scopes(inputs)
});
/**
* | output |
* | --- |
* | "A key never gets more than your own role allows." |
*
* @param {Settings_Api_Keys_Scopes_HintInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_api_keys_scopes_hint = /** @type {((inputs?: Settings_Api_Keys_Scopes_HintInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Api_Keys_Scopes_HintInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_api_keys_scopes_hint(inputs)
	if (locale === "cs") return __cs.settings_api_keys_scopes_hint(inputs)
	return __en.settings_api_keys_scopes_hint(inputs)
});
/**
* | output |
* | --- |
* | "One of the chosen permissions can't be given to an API key. Reload the page and choose again." |
*
* @param {Settings_Api_Keys_Scopes_InvalidInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_api_keys_scopes_invalid = /** @type {((inputs?: Settings_Api_Keys_Scopes_InvalidInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Api_Keys_Scopes_InvalidInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_api_keys_scopes_invalid(inputs)
	if (locale === "cs") return __cs.settings_api_keys_scopes_invalid(inputs)
	return __en.settings_api_keys_scopes_invalid(inputs)
});
/**
* | output |
* | --- |
* | "Active" |
*
* @param {Settings_Api_Keys_Status_ActiveInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_api_keys_status_active = /** @type {((inputs?: Settings_Api_Keys_Status_ActiveInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Api_Keys_Status_ActiveInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_api_keys_status_active(inputs)
	if (locale === "cs") return __cs.settings_api_keys_status_active(inputs)
	return __en.settings_api_keys_status_active(inputs)
});
/**
* | output |
* | --- |
* | "Expired" |
*
* @param {Settings_Api_Keys_Status_ExpiredInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_api_keys_status_expired = /** @type {((inputs?: Settings_Api_Keys_Status_ExpiredInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Api_Keys_Status_ExpiredInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_api_keys_status_expired(inputs)
	if (locale === "cs") return __cs.settings_api_keys_status_expired(inputs)
	return __en.settings_api_keys_status_expired(inputs)
});
/**
* | output |
* | --- |
* | "Revoked" |
*
* @param {Settings_Api_Keys_Status_RevokedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_api_keys_status_revoked = /** @type {((inputs?: Settings_Api_Keys_Status_RevokedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Api_Keys_Status_RevokedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_api_keys_status_revoked(inputs)
	if (locale === "cs") return __cs.settings_api_keys_status_revoked(inputs)
	return __en.settings_api_keys_status_revoked(inputs)
});
/**
* | output |
* | --- |
* | "API keys" |
*
* @param {Settings_Api_Keys_TitleInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_api_keys_title = /** @type {((inputs?: Settings_Api_Keys_TitleInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Api_Keys_TitleInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_api_keys_title(inputs)
	if (locale === "cs") return __cs.settings_api_keys_title(inputs)
	return __en.settings_api_keys_title(inputs)
});
/**
* | output |
* | --- |
* | "Copy this key now. You won't see it again." |
*
* @param {Settings_Api_Keys_Token_OnceInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_api_keys_token_once = /** @type {((inputs?: Settings_Api_Keys_Token_OnceInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Api_Keys_Token_OnceInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_api_keys_token_once(inputs)
	if (locale === "cs") return __cs.settings_api_keys_token_once(inputs)
	return __en.settings_api_keys_token_once(inputs)
});
/**
* | output |
* | --- |
* | "API key" |
*
* @param {Settings_Api_Keys_Token_TitleInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_api_keys_token_title = /** @type {((inputs?: Settings_Api_Keys_Token_TitleInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Api_Keys_Token_TitleInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_api_keys_token_title(inputs)
	if (locale === "cs") return __cs.settings_api_keys_token_title(inputs)
	return __en.settings_api_keys_token_title(inputs)
});
/**
* | output |
* | --- |
* | "Send it with every request in this header:" |
*
* @param {Settings_Api_Keys_Token_UseInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_api_keys_token_use = /** @type {((inputs?: Settings_Api_Keys_Token_UseInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Api_Keys_Token_UseInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_api_keys_token_use(inputs)
	if (locale === "cs") return __cs.settings_api_keys_token_use(inputs)
	return __en.settings_api_keys_token_use(inputs)
});
/**
* | output |
* | --- |
* | "Whole workspace" |
*
* @param {Settings_Api_Keys_Whole_WorkspaceInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_api_keys_whole_workspace = /** @type {((inputs?: Settings_Api_Keys_Whole_WorkspaceInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Api_Keys_Whole_WorkspaceInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_api_keys_whole_workspace(inputs)
	if (locale === "cs") return __cs.settings_api_keys_whole_workspace(inputs)
	return __en.settings_api_keys_whole_workspace(inputs)
});
/**
* | output |
* | --- |
* | "Posts need approval" |
*
* @param {Settings_Approval_RequiredInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_approval_required = /** @type {((inputs?: Settings_Approval_RequiredInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Approval_RequiredInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_approval_required(inputs)
	if (locale === "cs") return __cs.settings_approval_required(inputs)
	return __en.settings_approval_required(inputs)
});
/**
* | output |
* | --- |
* | "Decide whether posts need an approval before they go out." |
*
* @param {Settings_Approvals_IntroInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_approvals_intro = /** @type {((inputs?: Settings_Approvals_IntroInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Approvals_IntroInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_approvals_intro(inputs)
	if (locale === "cs") return __cs.settings_approvals_intro(inputs)
	return __en.settings_approvals_intro(inputs)
});
/**
* | output |
* | --- |
* | "Approvals" |
*
* @param {Settings_Approvals_TitleInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_approvals_title = /** @type {((inputs?: Settings_Approvals_TitleInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Approvals_TitleInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_approvals_title(inputs)
	if (locale === "cs") return __cs.settings_approvals_title(inputs)
	return __en.settings_approvals_title(inputs)
});
/**
* | output |
* | --- |
* | "Add brand" |
*
* @param {Settings_Brand_AddInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_brand_add = /** @type {((inputs?: Settings_Brand_AddInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Brand_AddInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_brand_add(inputs)
	if (locale === "cs") return __cs.settings_brand_add(inputs)
	return __en.settings_brand_add(inputs)
});
/**
* | output |
* | --- |
* | "Archive" |
*
* @param {Settings_Brand_ArchiveInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_brand_archive = /** @type {((inputs?: Settings_Brand_ArchiveInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Brand_ArchiveInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_brand_archive(inputs)
	if (locale === "cs") return __cs.settings_brand_archive(inputs)
	return __en.settings_brand_archive(inputs)
});
/**
* | output |
* | --- |
* | "Archive brand {name}" |
*
* @param {Settings_Brand_Archive_OfInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_brand_archive_of = /** @type {((inputs: Settings_Brand_Archive_OfInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Brand_Archive_OfInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_brand_archive_of(inputs)
	if (locale === "cs") return __cs.settings_brand_archive_of(inputs)
	return __en.settings_brand_archive_of(inputs)
});
/**
* | output |
* | --- |
* | "Archived" |
*
* @param {Settings_Brand_ArchivedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_brand_archived = /** @type {((inputs?: Settings_Brand_ArchivedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Brand_ArchivedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_brand_archived(inputs)
	if (locale === "cs") return __cs.settings_brand_archived(inputs)
	return __en.settings_brand_archived(inputs)
});
/**
* | output |
* | --- |
* | "Brand archived" |
*
* @param {Settings_Brand_Archived_DoneInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_brand_archived_done = /** @type {((inputs?: Settings_Brand_Archived_DoneInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Brand_Archived_DoneInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_brand_archived_done(inputs)
	if (locale === "cs") return __cs.settings_brand_archived_done(inputs)
	return __en.settings_brand_archived_done(inputs)
});
/**
* | countPlural | output |
* | --- | --- |
* | "one" | "{count} channel" |
* | * | "{count} channels" |
*
* @param {Settings_Brand_ChannelsInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_brand_channels = /** @type {((inputs: Settings_Brand_ChannelsInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Brand_ChannelsInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_brand_channels(inputs)
	if (locale === "cs") return __cs.settings_brand_channels(inputs)
	return __en.settings_brand_channels(inputs)
});
/**
* | output |
* | --- |
* | "Brand {name} added" |
*
* @param {Settings_Brand_CreatedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_brand_created = /** @type {((inputs: Settings_Brand_CreatedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Brand_CreatedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_brand_created(inputs)
	if (locale === "cs") return __cs.settings_brand_created(inputs)
	return __en.settings_brand_created(inputs)
});
/**
* | output |
* | --- |
* | "This brand still has channels. Move its channels first." |
*
* @param {Settings_Brand_In_UseInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_brand_in_use = /** @type {((inputs?: Settings_Brand_In_UseInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Brand_In_UseInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_brand_in_use(inputs)
	if (locale === "cs") return __cs.settings_brand_in_use(inputs)
	return __en.settings_brand_in_use(inputs)
});
/**
* | output |
* | --- |
* | "Group channels by client or brand. Each brand can have its own approval rules." |
*
* @param {Settings_Brand_List_IntroInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_brand_list_intro = /** @type {((inputs?: Settings_Brand_List_IntroInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Brand_List_IntroInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_brand_list_intro(inputs)
	if (locale === "cs") return __cs.settings_brand_list_intro(inputs)
	return __en.settings_brand_list_intro(inputs)
});
/**
* | output |
* | --- |
* | "Brands" |
*
* @param {Settings_Brand_List_TitleInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_brand_list_title = /** @type {((inputs?: Settings_Brand_List_TitleInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Brand_List_TitleInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_brand_list_title(inputs)
	if (locale === "cs") return __cs.settings_brand_list_title(inputs)
	return __en.settings_brand_list_title(inputs)
});
/**
* | output |
* | --- |
* | "Name of brand {name}" |
*
* @param {Settings_Brand_NameInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_brand_name = /** @type {((inputs: Settings_Brand_NameInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Brand_NameInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_brand_name(inputs)
	if (locale === "cs") return __cs.settings_brand_name(inputs)
	return __en.settings_brand_name(inputs)
});
/**
* | output |
* | --- |
* | "Enter a name of 1 to 120 characters." |
*
* @param {Settings_Brand_Name_InvalidInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_brand_name_invalid = /** @type {((inputs?: Settings_Brand_Name_InvalidInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Brand_Name_InvalidInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_brand_name_invalid(inputs)
	if (locale === "cs") return __cs.settings_brand_name_invalid(inputs)
	return __en.settings_brand_name_invalid(inputs)
});
/**
* | output |
* | --- |
* | "A brand with this name already exists." |
*
* @param {Settings_Brand_Name_TakenInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_brand_name_taken = /** @type {((inputs?: Settings_Brand_Name_TakenInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Brand_Name_TakenInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_brand_name_taken(inputs)
	if (locale === "cs") return __cs.settings_brand_name_taken(inputs)
	return __en.settings_brand_name_taken(inputs)
});
/**
* | output |
* | --- |
* | "New brand name" |
*
* @param {Settings_Brand_NewInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_brand_new = /** @type {((inputs?: Settings_Brand_NewInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Brand_NewInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_brand_new(inputs)
	if (locale === "cs") return __cs.settings_brand_new(inputs)
	return __en.settings_brand_new(inputs)
});
/**
* | output |
* | --- |
* | "Override workspace policy" |
*
* @param {Settings_Brand_OverrideInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_brand_override = /** @type {((inputs?: Settings_Brand_OverrideInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Brand_OverrideInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_brand_override(inputs)
	if (locale === "cs") return __cs.settings_brand_override(inputs)
	return __en.settings_brand_override(inputs)
});
/**
* | output |
* | --- |
* | "Override workspace policy for {name}" |
*
* @param {Settings_Brand_Override_OfInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_brand_override_of = /** @type {((inputs: Settings_Brand_Override_OfInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Brand_Override_OfInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_brand_override_of(inputs)
	if (locale === "cs") return __cs.settings_brand_override_of(inputs)
	return __en.settings_brand_override_of(inputs)
});
/**
* | output |
* | --- |
* | "The brand follows the workspace rules again." |
*
* @param {Settings_Brand_Override_RemovedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_brand_override_removed = /** @type {((inputs?: Settings_Brand_Override_RemovedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Brand_Override_RemovedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_brand_override_removed(inputs)
	if (locale === "cs") return __cs.settings_brand_override_removed(inputs)
	return __en.settings_brand_override_removed(inputs)
});
/**
* | output |
* | --- |
* | "Approval rules for {name}" |
*
* @param {Settings_Brand_Policy_TitleInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_brand_policy_title = /** @type {((inputs: Settings_Brand_Policy_TitleInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Brand_Policy_TitleInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_brand_policy_title(inputs)
	if (locale === "cs") return __cs.settings_brand_policy_title(inputs)
	return __en.settings_brand_policy_title(inputs)
});
/**
* | countPlural | output |
* | --- | --- |
* | "one" | "Approval required: {count} approval" |
* | * | "Approval required: {count} approvals" |
*
* @param {Settings_Brand_RequiredInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_brand_required = /** @type {((inputs: Settings_Brand_RequiredInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Brand_RequiredInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_brand_required(inputs)
	if (locale === "cs") return __cs.settings_brand_required(inputs)
	return __en.settings_brand_required(inputs)
});
/**
* | output |
* | --- |
* | "Brand saved" |
*
* @param {Settings_Brand_SavedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_brand_saved = /** @type {((inputs?: Settings_Brand_SavedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Brand_SavedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_brand_saved(inputs)
	if (locale === "cs") return __cs.settings_brand_saved(inputs)
	return __en.settings_brand_saved(inputs)
});
/**
* | output |
* | --- |
* | "A post that goes to channels of several brands follows the strictest rules among its channels." |
*
* @param {Settings_Brand_StrictestInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_brand_strictest = /** @type {((inputs?: Settings_Brand_StrictestInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Brand_StrictestInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_brand_strictest(inputs)
	if (locale === "cs") return __cs.settings_brand_strictest(inputs)
	return __en.settings_brand_strictest(inputs)
});
/**
* | output |
* | --- |
* | "Restore" |
*
* @param {Settings_Brand_UnarchiveInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_brand_unarchive = /** @type {((inputs?: Settings_Brand_UnarchiveInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Brand_UnarchiveInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_brand_unarchive(inputs)
	if (locale === "cs") return __cs.settings_brand_unarchive(inputs)
	return __en.settings_brand_unarchive(inputs)
});
/**
* | output |
* | --- |
* | "Restore brand {name}" |
*
* @param {Settings_Brand_Unarchive_OfInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_brand_unarchive_of = /** @type {((inputs: Settings_Brand_Unarchive_OfInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Brand_Unarchive_OfInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_brand_unarchive_of(inputs)
	if (locale === "cs") return __cs.settings_brand_unarchive_of(inputs)
	return __en.settings_brand_unarchive_of(inputs)
});
/**
* | output |
* | --- |
* | "Brand restored" |
*
* @param {Settings_Brand_Unarchived_DoneInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_brand_unarchived_done = /** @type {((inputs?: Settings_Brand_Unarchived_DoneInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Brand_Unarchived_DoneInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_brand_unarchived_done(inputs)
	if (locale === "cs") return __cs.settings_brand_unarchived_done(inputs)
	return __en.settings_brand_unarchived_done(inputs)
});
/**
* | output |
* | --- |
* | "Follows the workspace rules" |
*
* @param {Settings_Brand_Uses_WorkspaceInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_brand_uses_workspace = /** @type {((inputs?: Settings_Brand_Uses_WorkspaceInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Brand_Uses_WorkspaceInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_brand_uses_workspace(inputs)
	if (locale === "cs") return __cs.settings_brand_uses_workspace(inputs)
	return __en.settings_brand_uses_workspace(inputs)
});
/**
* | output |
* | --- |
* | "No brands yet." |
*
* @param {Settings_Brands_EmptyInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_brands_empty = /** @type {((inputs?: Settings_Brands_EmptyInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Brands_EmptyInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_brands_empty(inputs)
	if (locale === "cs") return __cs.settings_brands_empty(inputs)
	return __en.settings_brands_empty(inputs)
});
/**
* | output |
* | --- |
* | "Brand overrides" |
*
* @param {Settings_Brands_TitleInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_brands_title = /** @type {((inputs?: Settings_Brands_TitleInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Brands_TitleInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_brands_title(inputs)
	if (locale === "cs") return __cs.settings_brands_title(inputs)
	return __en.settings_brands_title(inputs)
});
/**
* | output |
* | --- |
* | "Someone else changed these settings. The latest version is shown." |
*
* @param {Settings_ConflictInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_conflict = /** @type {((inputs?: Settings_ConflictInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_ConflictInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_conflict(inputs)
	if (locale === "cs") return __cs.settings_conflict(inputs)
	return __en.settings_conflict(inputs)
});
/**
* | output |
* | --- |
* | "Nothing saved yet: these are the defaults." |
*
* @param {Settings_DefaultsInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_defaults = /** @type {((inputs?: Settings_DefaultsInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_DefaultsInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_defaults(inputs)
	if (locale === "cs") return __cs.settings_defaults(inputs)
	return __en.settings_defaults(inputs)
});
/**
* | output |
* | --- |
* | "Name" |
*
* @param {Settings_Display_NameInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_display_name = /** @type {((inputs?: Settings_Display_NameInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Display_NameInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_display_name(inputs)
	if (locale === "cs") return __cs.settings_display_name(inputs)
	return __en.settings_display_name(inputs)
});
/**
* | output |
* | --- |
* | "Approvals" |
*
* @param {Settings_Email_ApprovalsInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_email_approvals = /** @type {((inputs?: Settings_Email_ApprovalsInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Email_ApprovalsInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_email_approvals(inputs)
	if (locale === "cs") return __cs.settings_email_approvals(inputs)
	return __en.settings_email_approvals(inputs)
});
/**
* | output |
* | --- |
* | "Approval requests and decisions" |
*
* @param {Settings_Email_Approvals_HintInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_email_approvals_hint = /** @type {((inputs?: Settings_Email_Approvals_HintInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Email_Approvals_HintInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_email_approvals_hint(inputs)
	if (locale === "cs") return __cs.settings_email_approvals_hint(inputs)
	return __en.settings_email_approvals_hint(inputs)
});
/**
* | output |
* | --- |
* | "Channel problems" |
*
* @param {Settings_Email_ChannelsInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_email_channels = /** @type {((inputs?: Settings_Email_ChannelsInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Email_ChannelsInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_email_channels(inputs)
	if (locale === "cs") return __cs.settings_email_channels(inputs)
	return __en.settings_email_channels(inputs)
});
/**
* | output |
* | --- |
* | "Channels that need reconnecting or are about to expire" |
*
* @param {Settings_Email_Channels_HintInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_email_channels_hint = /** @type {((inputs?: Settings_Email_Channels_HintInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Email_Channels_HintInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_email_channels_hint(inputs)
	if (locale === "cs") return __cs.settings_email_channels_hint(inputs)
	return __en.settings_email_channels_hint(inputs)
});
/**
* | output |
* | --- |
* | "Your notification settings weren't saved. Try again." |
*
* @param {Settings_Email_FailedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_email_failed = /** @type {((inputs?: Settings_Email_FailedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Email_FailedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_email_failed(inputs)
	if (locale === "cs") return __cs.settings_email_failed(inputs)
	return __en.settings_email_failed(inputs)
});
/**
* | output |
* | --- |
* | "Failures" |
*
* @param {Settings_Email_FailuresInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_email_failures = /** @type {((inputs?: Settings_Email_FailuresInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Email_FailuresInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_email_failures(inputs)
	if (locale === "cs") return __cs.settings_email_failures(inputs)
	return __en.settings_email_failures(inputs)
});
/**
* | output |
* | --- |
* | "Posts that fail or need you to post manually" |
*
* @param {Settings_Email_Failures_HintInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_email_failures_hint = /** @type {((inputs?: Settings_Email_Failures_HintInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Email_Failures_HintInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_email_failures_hint(inputs)
	if (locale === "cs") return __cs.settings_email_failures_hint(inputs)
	return __en.settings_email_failures_hint(inputs)
});
/**
* | output |
* | --- |
* | "Email notifications" |
*
* @param {Settings_Email_TitleInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_email_title = /** @type {((inputs?: Settings_Email_TitleInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Email_TitleInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_email_title(inputs)
	if (locale === "cs") return __cs.settings_email_title(inputs)
	return __en.settings_email_title(inputs)
});
/**
* | output |
* | --- |
* | "Active" |
*
* @param {Settings_Feed_ActiveInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_feed_active = /** @type {((inputs?: Settings_Feed_ActiveInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Feed_ActiveInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_feed_active(inputs)
	if (locale === "cs") return __cs.settings_feed_active(inputs)
	return __en.settings_feed_active(inputs)
});
/**
* | output |
* | --- |
* | "Add feed" |
*
* @param {Settings_Feed_AddInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_feed_add = /** @type {((inputs?: Settings_Feed_AddInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Feed_AddInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_feed_add(inputs)
	if (locale === "cs") return __cs.settings_feed_add(inputs)
	return __en.settings_feed_add(inputs)
});
/**
* | output |
* | --- |
* | "Cancel" |
*
* @param {Settings_Feed_CancelInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_feed_cancel = /** @type {((inputs?: Settings_Feed_CancelInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Feed_CancelInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_feed_cancel(inputs)
	if (locale === "cs") return __cs.settings_feed_cancel(inputs)
	return __en.settings_feed_cancel(inputs)
});
/**
* | output |
* | --- |
* | "One of the channels no longer exists." |
*
* @param {Settings_Feed_Channel_GoneInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_feed_channel_gone = /** @type {((inputs?: Settings_Feed_Channel_GoneInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Feed_Channel_GoneInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_feed_channel_gone(inputs)
	if (locale === "cs") return __cs.settings_feed_channel_gone(inputs)
	return __en.settings_feed_channel_gone(inputs)
});
/**
* | output |
* | --- |
* | "{channel} needs each post chosen by a person. Use draft mode for this feed or remove the channel." |
*
* @param {Settings_Feed_Channel_Manual_OnlyInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_feed_channel_manual_only = /** @type {((inputs: Settings_Feed_Channel_Manual_OnlyInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Feed_Channel_Manual_OnlyInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_feed_channel_manual_only(inputs)
	if (locale === "cs") return __cs.settings_feed_channel_manual_only(inputs)
	return __en.settings_feed_channel_manual_only(inputs)
});
/**
* | output |
* | --- |
* | "{channel} has no queue times. Add some on the Channels page, or save new items as drafts." |
*
* @param {Settings_Feed_Channel_QueueInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_feed_channel_queue = /** @type {((inputs: Settings_Feed_Channel_QueueInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Feed_Channel_QueueInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_feed_channel_queue(inputs)
	if (locale === "cs") return __cs.settings_feed_channel_queue(inputs)
	return __en.settings_feed_channel_queue(inputs)
});
/**
* | output |
* | --- |
* | "{channel} can post neither text alone nor text with one image." |
*
* @param {Settings_Feed_Channel_UnsupportedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_feed_channel_unsupported = /** @type {((inputs: Settings_Feed_Channel_UnsupportedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Feed_Channel_UnsupportedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_feed_channel_unsupported(inputs)
	if (locale === "cs") return __cs.settings_feed_channel_unsupported(inputs)
	return __en.settings_feed_channel_unsupported(inputs)
});
/**
* | output |
* | --- |
* | "Channels" |
*
* @param {Settings_Feed_ChannelsInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_feed_channels = /** @type {((inputs?: Settings_Feed_ChannelsInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Feed_ChannelsInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_feed_channels(inputs)
	if (locale === "cs") return __cs.settings_feed_channels(inputs)
	return __en.settings_feed_channels(inputs)
});
/**
* | output |
* | --- |
* | "Only channels that can post text alone or text with one image are listed." |
*
* @param {Settings_Feed_Channels_HintInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_feed_channels_hint = /** @type {((inputs?: Settings_Feed_Channels_HintInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Feed_Channels_HintInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_feed_channels_hint(inputs)
	if (locale === "cs") return __cs.settings_feed_channels_hint(inputs)
	return __en.settings_feed_channels_hint(inputs)
});
/**
* | output |
* | --- |
* | "Channels that need an image, such as Instagram, get only the items that have one." |
*
* @param {Settings_Feed_Channels_Image_HintInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_feed_channels_image_hint = /** @type {((inputs?: Settings_Feed_Channels_Image_HintInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Feed_Channels_Image_HintInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_feed_channels_image_hint(inputs)
	if (locale === "cs") return __cs.settings_feed_channels_image_hint(inputs)
	return __en.settings_feed_channels_image_hint(inputs)
});
/**
* | output |
* | --- |
* | "Checking feed…" |
*
* @param {Settings_Feed_CheckingInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_feed_checking = /** @type {((inputs?: Settings_Feed_CheckingInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Feed_CheckingInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_feed_checking(inputs)
	if (locale === "cs") return __cs.settings_feed_checking(inputs)
	return __en.settings_feed_checking(inputs)
});
/**
* | output |
* | --- |
* | "Delete feed {name}" |
*
* @param {Settings_Feed_DeleteInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_feed_delete = /** @type {((inputs: Settings_Feed_DeleteInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Feed_DeleteInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_feed_delete(inputs)
	if (locale === "cs") return __cs.settings_feed_delete(inputs)
	return __en.settings_feed_delete(inputs)
});
/**
* | output |
* | --- |
* | "Posts it has already made stay as they are." |
*
* @param {Settings_Feed_Delete_BodyInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_feed_delete_body = /** @type {((inputs?: Settings_Feed_Delete_BodyInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Feed_Delete_BodyInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_feed_delete_body(inputs)
	if (locale === "cs") return __cs.settings_feed_delete_body(inputs)
	return __en.settings_feed_delete_body(inputs)
});
/**
* | output |
* | --- |
* | "Delete feed" |
*
* @param {Settings_Feed_Delete_ConfirmInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_feed_delete_confirm = /** @type {((inputs?: Settings_Feed_Delete_ConfirmInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Feed_Delete_ConfirmInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_feed_delete_confirm(inputs)
	if (locale === "cs") return __cs.settings_feed_delete_confirm(inputs)
	return __en.settings_feed_delete_confirm(inputs)
});
/**
* | output |
* | --- |
* | "Delete feed “{name}”?" |
*
* @param {Settings_Feed_Delete_TitleInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_feed_delete_title = /** @type {((inputs: Settings_Feed_Delete_TitleInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Feed_Delete_TitleInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_feed_delete_title(inputs)
	if (locale === "cs") return __cs.settings_feed_delete_title(inputs)
	return __en.settings_feed_delete_title(inputs)
});
/**
* | output |
* | --- |
* | "Feed deleted" |
*
* @param {Settings_Feed_DeletedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_feed_deleted = /** @type {((inputs?: Settings_Feed_DeletedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Feed_DeletedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_feed_deleted(inputs)
	if (locale === "cs") return __cs.settings_feed_deleted(inputs)
	return __en.settings_feed_deleted(inputs)
});
/**
* | output |
* | --- |
* | "{channels} would each post every item with the same text. {network} forbids identical posts across several accounts, so consider keeping only one of them in ..." |
*
* @param {Settings_Feed_Duplicate_TextInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_feed_duplicate_text = /** @type {((inputs: Settings_Feed_Duplicate_TextInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Feed_Duplicate_TextInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_feed_duplicate_text(inputs)
	if (locale === "cs") return __cs.settings_feed_duplicate_text(inputs)
	return __en.settings_feed_duplicate_text(inputs)
});
/**
* | output |
* | --- |
* | "Edit" |
*
* @param {Settings_Feed_EditInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_feed_edit = /** @type {((inputs?: Settings_Feed_EditInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Feed_EditInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_feed_edit(inputs)
	if (locale === "cs") return __cs.settings_feed_edit(inputs)
	return __en.settings_feed_edit(inputs)
});
/**
* | output |
* | --- |
* | "Edit feed {name}" |
*
* @param {Settings_Feed_Edit_NamedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_feed_edit_named = /** @type {((inputs: Settings_Feed_Edit_NamedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Feed_Edit_NamedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_feed_edit_named(inputs)
	if (locale === "cs") return __cs.settings_feed_edit_named(inputs)
	return __en.settings_feed_edit_named(inputs)
});
/**
* | output |
* | --- |
* | "Edit feed" |
*
* @param {Settings_Feed_Edit_TitleInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_feed_edit_title = /** @type {((inputs?: Settings_Feed_Edit_TitleInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Feed_Edit_TitleInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_feed_edit_title(inputs)
	if (locale === "cs") return __cs.settings_feed_edit_title(inputs)
	return __en.settings_feed_edit_title(inputs)
});
/**
* | output |
* | --- |
* | "This link isn't an RSS or Atom feed." |
*
* @param {Settings_Feed_InvalidInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_feed_invalid = /** @type {((inputs?: Settings_Feed_InvalidInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Feed_InvalidInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_feed_invalid(inputs)
	if (locale === "cs") return __cs.settings_feed_invalid(inputs)
	return __en.settings_feed_invalid(inputs)
});
/**
* | output |
* | --- |
* | "Keep feed" |
*
* @param {Settings_Feed_KeepInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_feed_keep = /** @type {((inputs?: Settings_Feed_KeepInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Feed_KeepInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_feed_keep(inputs)
	if (locale === "cs") return __cs.settings_feed_keep(inputs)
	return __en.settings_feed_keep(inputs)
});
/**
* | output |
* | --- |
* | "Last checked {time}" |
*
* @param {Settings_Feed_Last_CheckInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_feed_last_check = /** @type {((inputs: Settings_Feed_Last_CheckInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Feed_Last_CheckInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_feed_last_check(inputs)
	if (locale === "cs") return __cs.settings_feed_last_check(inputs)
	return __en.settings_feed_last_check(inputs)
});
/**
* | kind | output |
* | --- | --- |
* | "url_blocked" | "Last check failed: this address isn't allowed." |
* | "fetch_failed" | "Last check failed: the feed couldn't be fetched." |
* | "timed_out" | "Last check failed: the feed took too long to answer." |
* | "too_large" | "Last check failed: the feed is too large." |
* | "feed_invalid" | "Last check failed: the link isn't an RSS or Atom feed." |
* | * | "Last check failed." |
*
* @param {Settings_Feed_Last_ErrorInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_feed_last_error = /** @type {((inputs: Settings_Feed_Last_ErrorInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Feed_Last_ErrorInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_feed_last_error(inputs)
	if (locale === "cs") return __cs.settings_feed_last_error(inputs)
	return __en.settings_feed_last_error(inputs)
});
/**
* | output |
* | --- |
* | "This workspace has reached its limit of feeds. Delete one first." |
*
* @param {Settings_Feed_LimitInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_feed_limit = /** @type {((inputs?: Settings_Feed_LimitInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Feed_LimitInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_feed_limit(inputs)
	if (locale === "cs") return __cs.settings_feed_limit(inputs)
	return __en.settings_feed_limit(inputs)
});
/**
* | output |
* | --- |
* | "New items" |
*
* @param {Settings_Feed_ModeInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_feed_mode = /** @type {((inputs?: Settings_Feed_ModeInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Feed_ModeInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_feed_mode(inputs)
	if (locale === "cs") return __cs.settings_feed_mode(inputs)
	return __en.settings_feed_mode(inputs)
});
/**
* | output |
* | --- |
* | "Save as draft" |
*
* @param {Settings_Feed_Mode_DraftInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_feed_mode_draft = /** @type {((inputs?: Settings_Feed_Mode_DraftInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Feed_Mode_DraftInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_feed_mode_draft(inputs)
	if (locale === "cs") return __cs.settings_feed_mode_draft(inputs)
	return __en.settings_feed_mode_draft(inputs)
});
/**
* | output |
* | --- |
* | "Add to queue" |
*
* @param {Settings_Feed_Mode_QueueInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_feed_mode_queue = /** @type {((inputs?: Settings_Feed_Mode_QueueInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Feed_Mode_QueueInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_feed_mode_queue(inputs)
	if (locale === "cs") return __cs.settings_feed_mode_queue(inputs)
	return __en.settings_feed_mode_queue(inputs)
});
/**
* | output |
* | --- |
* | "Name" |
*
* @param {Settings_Feed_NameInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_feed_name = /** @type {((inputs?: Settings_Feed_NameInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Feed_NameInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_feed_name(inputs)
	if (locale === "cs") return __cs.settings_feed_name(inputs)
	return __en.settings_feed_name(inputs)
});
/**
* | output |
* | --- |
* | "The name is empty or too long." |
*
* @param {Settings_Feed_Name_InvalidInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_feed_name_invalid = /** @type {((inputs?: Settings_Feed_Name_InvalidInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Feed_Name_InvalidInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_feed_name_invalid(inputs)
	if (locale === "cs") return __cs.settings_feed_name_invalid(inputs)
	return __en.settings_feed_name_invalid(inputs)
});
/**
* | output |
* | --- |
* | "Not checked yet" |
*
* @param {Settings_Feed_Never_CheckedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_feed_never_checked = /** @type {((inputs?: Settings_Feed_Never_CheckedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Feed_Never_CheckedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_feed_never_checked(inputs)
	if (locale === "cs") return __cs.settings_feed_never_checked(inputs)
	return __en.settings_feed_never_checked(inputs)
});
/**
* | output |
* | --- |
* | "No channel can post text alone or text with one image yet. Connect one first." |
*
* @param {Settings_Feed_No_ChannelsInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_feed_no_channels = /** @type {((inputs?: Settings_Feed_No_ChannelsInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Feed_No_ChannelsInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_feed_no_channels(inputs)
	if (locale === "cs") return __cs.settings_feed_no_channels(inputs)
	return __en.settings_feed_no_channels(inputs)
});
/**
* | output |
* | --- |
* | "Pause" |
*
* @param {Settings_Feed_PauseInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_feed_pause = /** @type {((inputs?: Settings_Feed_PauseInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Feed_PauseInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_feed_pause(inputs)
	if (locale === "cs") return __cs.settings_feed_pause(inputs)
	return __en.settings_feed_pause(inputs)
});
/**
* | output |
* | --- |
* | "Pause feed {name}" |
*
* @param {Settings_Feed_Pause_NamedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_feed_pause_named = /** @type {((inputs: Settings_Feed_Pause_NamedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Feed_Pause_NamedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_feed_pause_named(inputs)
	if (locale === "cs") return __cs.settings_feed_pause_named(inputs)
	return __en.settings_feed_pause_named(inputs)
});
/**
* | reason | output |
* | --- | --- |
* | "manual" | "Paused" |
* | "owner_lost" | "Paused: whoever saved it last can no longer schedule posts" |
* | "fetch_failing" | "Paused: the feed has failed for 24 hours" |
* | * | "Paused" |
*
* @param {Settings_Feed_PausedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_feed_paused = /** @type {((inputs: Settings_Feed_PausedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Feed_PausedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_feed_paused(inputs)
	if (locale === "cs") return __cs.settings_feed_paused(inputs)
	return __en.settings_feed_paused(inputs)
});
/**
* | output |
* | --- |
* | "Feed paused" |
*
* @param {Settings_Feed_Paused_ToastInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_feed_paused_toast = /** @type {((inputs?: Settings_Feed_Paused_ToastInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Feed_Paused_ToastInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_feed_paused_toast(inputs)
	if (locale === "cs") return __cs.settings_feed_paused_toast(inputs)
	return __en.settings_feed_paused_toast(inputs)
});
/**
* | output |
* | --- |
* | "the link to the item" |
*
* @param {Settings_Feed_Placeholder_LinkInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_feed_placeholder_link = /** @type {((inputs?: Settings_Feed_Placeholder_LinkInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Feed_Placeholder_LinkInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_feed_placeholder_link(inputs)
	if (locale === "cs") return __cs.settings_feed_placeholder_link(inputs)
	return __en.settings_feed_placeholder_link(inputs)
});
/**
* | output |
* | --- |
* | "a short summary of the item, up to 500 characters" |
*
* @param {Settings_Feed_Placeholder_SummaryInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_feed_placeholder_summary = /** @type {((inputs?: Settings_Feed_Placeholder_SummaryInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Feed_Placeholder_SummaryInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_feed_placeholder_summary(inputs)
	if (locale === "cs") return __cs.settings_feed_placeholder_summary(inputs)
	return __en.settings_feed_placeholder_summary(inputs)
});
/**
* | output |
* | --- |
* | "the item's title" |
*
* @param {Settings_Feed_Placeholder_TitleInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_feed_placeholder_title = /** @type {((inputs?: Settings_Feed_Placeholder_TitleInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Feed_Placeholder_TitleInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_feed_placeholder_title(inputs)
	if (locale === "cs") return __cs.settings_feed_placeholder_title(inputs)
	return __en.settings_feed_placeholder_title(inputs)
});
/**
* | output |
* | --- |
* | "You can use:" |
*
* @param {Settings_Feed_PlaceholdersInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_feed_placeholders = /** @type {((inputs?: Settings_Feed_PlaceholdersInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Feed_PlaceholdersInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_feed_placeholders(inputs)
	if (locale === "cs") return __cs.settings_feed_placeholders(inputs)
	return __en.settings_feed_placeholders(inputs)
});
/**
* | output |
* | --- |
* | "Resume" |
*
* @param {Settings_Feed_ResumeInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_feed_resume = /** @type {((inputs?: Settings_Feed_ResumeInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Feed_ResumeInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_feed_resume(inputs)
	if (locale === "cs") return __cs.settings_feed_resume(inputs)
	return __en.settings_feed_resume(inputs)
});
/**
* | output |
* | --- |
* | "Resume feed {name}" |
*
* @param {Settings_Feed_Resume_NamedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_feed_resume_named = /** @type {((inputs: Settings_Feed_Resume_NamedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Feed_Resume_NamedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_feed_resume_named(inputs)
	if (locale === "cs") return __cs.settings_feed_resume_named(inputs)
	return __en.settings_feed_resume_named(inputs)
});
/**
* | output |
* | --- |
* | "Feed resumed" |
*
* @param {Settings_Feed_ResumedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_feed_resumed = /** @type {((inputs?: Settings_Feed_ResumedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Feed_ResumedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_feed_resumed(inputs)
	if (locale === "cs") return __cs.settings_feed_resumed(inputs)
	return __en.settings_feed_resumed(inputs)
});
/**
* | output |
* | --- |
* | "Feed saved" |
*
* @param {Settings_Feed_SavedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_feed_saved = /** @type {((inputs?: Settings_Feed_SavedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Feed_SavedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_feed_saved(inputs)
	if (locale === "cs") return __cs.settings_feed_saved(inputs)
	return __en.settings_feed_saved(inputs)
});
/**
* | output |
* | --- |
* | "Post text" |
*
* @param {Settings_Feed_TemplateInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_feed_template = /** @type {((inputs?: Settings_Feed_TemplateInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Feed_TemplateInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_feed_template(inputs)
	if (locale === "cs") return __cs.settings_feed_template(inputs)
	return __en.settings_feed_template(inputs)
});
/**
* | output |
* | --- |
* | "The post text is empty or too long." |
*
* @param {Settings_Feed_Template_InvalidInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_feed_template_invalid = /** @type {((inputs?: Settings_Feed_Template_InvalidInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Feed_Template_InvalidInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_feed_template_invalid(inputs)
	if (locale === "cs") return __cs.settings_feed_template_invalid(inputs)
	return __en.settings_feed_template_invalid(inputs)
});
/**
* | output |
* | --- |
* | "The feed couldn't be fetched. Check the link and try again." |
*
* @param {Settings_Feed_UnreachableInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_feed_unreachable = /** @type {((inputs?: Settings_Feed_UnreachableInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Feed_UnreachableInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_feed_unreachable(inputs)
	if (locale === "cs") return __cs.settings_feed_unreachable(inputs)
	return __en.settings_feed_unreachable(inputs)
});
/**
* | output |
* | --- |
* | "Feed URL" |
*
* @param {Settings_Feed_UrlInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_feed_url = /** @type {((inputs?: Settings_Feed_UrlInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Feed_UrlInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_feed_url(inputs)
	if (locale === "cs") return __cs.settings_feed_url(inputs)
	return __en.settings_feed_url(inputs)
});
/**
* | output |
* | --- |
* | "Enter an https link without a user name or password." |
*
* @param {Settings_Feed_Url_InvalidInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_feed_url_invalid = /** @type {((inputs?: Settings_Feed_Url_InvalidInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Feed_Url_InvalidInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_feed_url_invalid(inputs)
	if (locale === "cs") return __cs.settings_feed_url_invalid(inputs)
	return __en.settings_feed_url_invalid(inputs)
});
/**
* | output |
* | --- |
* | "No feeds yet." |
*
* @param {Settings_Feeds_EmptyInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_feeds_empty = /** @type {((inputs?: Settings_Feeds_EmptyInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Feeds_EmptyInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_feeds_empty(inputs)
	if (locale === "cs") return __cs.settings_feeds_empty(inputs)
	return __en.settings_feeds_empty(inputs)
});
/**
* | output |
* | --- |
* | "Turn each new item of an RSS or Atom feed, such as a blog or a newsletter, into a post on your channels." |
*
* @param {Settings_Feeds_IntroInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_feeds_intro = /** @type {((inputs?: Settings_Feeds_IntroInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Feeds_IntroInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_feeds_intro(inputs)
	if (locale === "cs") return __cs.settings_feeds_intro(inputs)
	return __en.settings_feeds_intro(inputs)
});
/**
* | output |
* | --- |
* | "Feeds" |
*
* @param {Settings_Feeds_TitleInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_feeds_title = /** @type {((inputs?: Settings_Feeds_TitleInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Feeds_TitleInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_feeds_title(inputs)
	if (locale === "cs") return __cs.settings_feeds_title(inputs)
	return __en.settings_feeds_title(inputs)
});
/**
* | output |
* | --- |
* | "Add group" |
*
* @param {Settings_Group_AddInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_group_add = /** @type {((inputs?: Settings_Group_AddInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Group_AddInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_group_add(inputs)
	if (locale === "cs") return __cs.settings_group_add(inputs)
	return __en.settings_group_add(inputs)
});
/**
* | output |
* | --- |
* | "Cancel" |
*
* @param {Settings_Group_CancelInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_group_cancel = /** @type {((inputs?: Settings_Group_CancelInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Group_CancelInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_group_cancel(inputs)
	if (locale === "cs") return __cs.settings_group_cancel(inputs)
	return __en.settings_group_cancel(inputs)
});
/**
* | countPlural | output |
* | --- | --- |
* | "one" | "{count} channel" |
* | * | "{count} channels" |
*
* @param {Settings_Group_ChannelsInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_group_channels = /** @type {((inputs: Settings_Group_ChannelsInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Group_ChannelsInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_group_channels(inputs)
	if (locale === "cs") return __cs.settings_group_channels(inputs)
	return __en.settings_group_channels(inputs)
});
/**
* | output |
* | --- |
* | "Group {name} added" |
*
* @param {Settings_Group_CreatedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_group_created = /** @type {((inputs: Settings_Group_CreatedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Group_CreatedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_group_created(inputs)
	if (locale === "cs") return __cs.settings_group_created(inputs)
	return __en.settings_group_created(inputs)
});
/**
* | output |
* | --- |
* | "Delete group {name}" |
*
* @param {Settings_Group_DeleteInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_group_delete = /** @type {((inputs: Settings_Group_DeleteInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Group_DeleteInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_group_delete(inputs)
	if (locale === "cs") return __cs.settings_group_delete(inputs)
	return __en.settings_group_delete(inputs)
});
/**
* | output |
* | --- |
* | "Posts keep their channels. Only the group goes away." |
*
* @param {Settings_Group_Delete_BodyInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_group_delete_body = /** @type {((inputs?: Settings_Group_Delete_BodyInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Group_Delete_BodyInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_group_delete_body(inputs)
	if (locale === "cs") return __cs.settings_group_delete_body(inputs)
	return __en.settings_group_delete_body(inputs)
});
/**
* | output |
* | --- |
* | "Delete group" |
*
* @param {Settings_Group_Delete_ConfirmInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_group_delete_confirm = /** @type {((inputs?: Settings_Group_Delete_ConfirmInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Group_Delete_ConfirmInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_group_delete_confirm(inputs)
	if (locale === "cs") return __cs.settings_group_delete_confirm(inputs)
	return __en.settings_group_delete_confirm(inputs)
});
/**
* | output |
* | --- |
* | "Delete group “{name}”?" |
*
* @param {Settings_Group_Delete_TitleInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_group_delete_title = /** @type {((inputs: Settings_Group_Delete_TitleInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Group_Delete_TitleInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_group_delete_title(inputs)
	if (locale === "cs") return __cs.settings_group_delete_title(inputs)
	return __en.settings_group_delete_title(inputs)
});
/**
* | output |
* | --- |
* | "Group deleted" |
*
* @param {Settings_Group_DeletedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_group_deleted = /** @type {((inputs?: Settings_Group_DeletedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Group_DeletedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_group_deleted(inputs)
	if (locale === "cs") return __cs.settings_group_deleted(inputs)
	return __en.settings_group_deleted(inputs)
});
/**
* | output |
* | --- |
* | "Done" |
*
* @param {Settings_Group_DoneInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_group_done = /** @type {((inputs?: Settings_Group_DoneInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Group_DoneInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_group_done(inputs)
	if (locale === "cs") return __cs.settings_group_done(inputs)
	return __en.settings_group_done(inputs)
});
/**
* | output |
* | --- |
* | "Keep group" |
*
* @param {Settings_Group_KeepInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_group_keep = /** @type {((inputs?: Settings_Group_KeepInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Group_KeepInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_group_keep(inputs)
	if (locale === "cs") return __cs.settings_group_keep(inputs)
	return __en.settings_group_keep(inputs)
});
/**
* | output |
* | --- |
* | "Channels" |
*
* @param {Settings_Group_MembersInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_group_members = /** @type {((inputs?: Settings_Group_MembersInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Group_MembersInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_group_members(inputs)
	if (locale === "cs") return __cs.settings_group_members(inputs)
	return __en.settings_group_members(inputs)
});
/**
* | output |
* | --- |
* | "Channels of group {name}" |
*
* @param {Settings_Group_Members_OfInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_group_members_of = /** @type {((inputs: Settings_Group_Members_OfInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Group_Members_OfInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_group_members_of(inputs)
	if (locale === "cs") return __cs.settings_group_members_of(inputs)
	return __en.settings_group_members_of(inputs)
});
/**
* | output |
* | --- |
* | "Name of group {name}" |
*
* @param {Settings_Group_NameInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_group_name = /** @type {((inputs: Settings_Group_NameInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Group_NameInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_group_name(inputs)
	if (locale === "cs") return __cs.settings_group_name(inputs)
	return __en.settings_group_name(inputs)
});
/**
* | output |
* | --- |
* | "Enter a name of 1 to 120 characters." |
*
* @param {Settings_Group_Name_InvalidInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_group_name_invalid = /** @type {((inputs?: Settings_Group_Name_InvalidInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Group_Name_InvalidInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_group_name_invalid(inputs)
	if (locale === "cs") return __cs.settings_group_name_invalid(inputs)
	return __en.settings_group_name_invalid(inputs)
});
/**
* | output |
* | --- |
* | "Group name" |
*
* @param {Settings_Group_Name_LabelInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_group_name_label = /** @type {((inputs?: Settings_Group_Name_LabelInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Group_Name_LabelInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_group_name_label(inputs)
	if (locale === "cs") return __cs.settings_group_name_label(inputs)
	return __en.settings_group_name_label(inputs)
});
/**
* | output |
* | --- |
* | "A group with this name already exists." |
*
* @param {Settings_Group_Name_TakenInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_group_name_taken = /** @type {((inputs?: Settings_Group_Name_TakenInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Group_Name_TakenInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_group_name_taken(inputs)
	if (locale === "cs") return __cs.settings_group_name_taken(inputs)
	return __en.settings_group_name_taken(inputs)
});
/**
* | output |
* | --- |
* | "New group" |
*
* @param {Settings_Group_NewInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_group_new = /** @type {((inputs?: Settings_Group_NewInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Group_NewInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_group_new(inputs)
	if (locale === "cs") return __cs.settings_group_new(inputs)
	return __en.settings_group_new(inputs)
});
/**
* | output |
* | --- |
* | "Connect a channel first." |
*
* @param {Settings_Group_No_ChannelsInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_group_no_channels = /** @type {((inputs?: Settings_Group_No_ChannelsInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Group_No_ChannelsInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_group_no_channels(inputs)
	if (locale === "cs") return __cs.settings_group_no_channels(inputs)
	return __en.settings_group_no_channels(inputs)
});
/**
* | output |
* | --- |
* | "Group saved" |
*
* @param {Settings_Group_SavedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_group_saved = /** @type {((inputs?: Settings_Group_SavedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Group_SavedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_group_saved(inputs)
	if (locale === "cs") return __cs.settings_group_saved(inputs)
	return __en.settings_group_saved(inputs)
});
/**
* | output |
* | --- |
* | "No groups yet." |
*
* @param {Settings_Groups_EmptyInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_groups_empty = /** @type {((inputs?: Settings_Groups_EmptyInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Groups_EmptyInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_groups_empty(inputs)
	if (locale === "cs") return __cs.settings_groups_empty(inputs)
	return __en.settings_groups_empty(inputs)
});
/**
* | output |
* | --- |
* | "Save channels you often post to together as a group. In the composer, a group adds all its channels at once. Groups never change who can see or do what." |
*
* @param {Settings_Groups_IntroInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_groups_intro = /** @type {((inputs?: Settings_Groups_IntroInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Groups_IntroInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_groups_intro(inputs)
	if (locale === "cs") return __cs.settings_groups_intro(inputs)
	return __en.settings_groups_intro(inputs)
});
/**
* | output |
* | --- |
* | "Groups" |
*
* @param {Settings_Groups_TitleInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_groups_title = /** @type {((inputs?: Settings_Groups_TitleInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Groups_TitleInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_groups_title(inputs)
	if (locale === "cs") return __cs.settings_groups_title(inputs)
	return __en.settings_groups_title(inputs)
});
/**
* | output |
* | --- |
* | "In-app notifications always show in the bell." |
*
* @param {Settings_In_App_NoteInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_in_app_note = /** @type {((inputs?: Settings_In_App_NoteInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_In_App_NoteInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_in_app_note(inputs)
	if (locale === "cs") return __cs.settings_in_app_note(inputs)
	return __en.settings_in_app_note(inputs)
});
/**
* | output |
* | --- |
* | "Your name wasn't saved. Try again." |
*
* @param {Settings_Name_FailedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_name_failed = /** @type {((inputs?: Settings_Name_FailedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Name_FailedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_name_failed(inputs)
	if (locale === "cs") return __cs.settings_name_failed(inputs)
	return __en.settings_name_failed(inputs)
});
/**
* | output |
* | --- |
* | "Name saved." |
*
* @param {Settings_Name_SavedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_name_saved = /** @type {((inputs?: Settings_Name_SavedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Name_SavedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_name_saved(inputs)
	if (locale === "cs") return __cs.settings_name_saved(inputs)
	return __en.settings_name_saved(inputs)
});
/**
* | output |
* | --- |
* | "Settings sections" |
*
* @param {Settings_Nav_LabelInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_nav_label = /** @type {((inputs?: Settings_Nav_LabelInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Nav_LabelInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_nav_label(inputs)
	if (locale === "cs") return __cs.settings_nav_label(inputs)
	return __en.settings_nav_label(inputs)
});
/**
* | output |
* | --- |
* | "No approval required" |
*
* @param {Settings_Not_RequiredInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_not_required = /** @type {((inputs?: Settings_Not_RequiredInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Not_RequiredInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_not_required(inputs)
	if (locale === "cs") return __cs.settings_not_required(inputs)
	return __en.settings_not_required(inputs)
});
/**
* | output |
* | --- |
* | "Not set" |
*
* @param {Settings_Not_SetInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_not_set = /** @type {((inputs?: Settings_Not_SetInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Not_SetInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_not_set(inputs)
	if (locale === "cs") return __cs.settings_not_set(inputs)
	return __en.settings_not_set(inputs)
});
/**
* | output |
* | --- |
* | "Change password" |
*
* @param {Settings_Password_ChangeInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_password_change = /** @type {((inputs?: Settings_Password_ChangeInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Password_ChangeInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_password_change(inputs)
	if (locale === "cs") return __cs.settings_password_change(inputs)
	return __en.settings_password_change(inputs)
});
/**
* | output |
* | --- |
* | "Password changed. Other devices were signed out." |
*
* @param {Settings_Password_ChangedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_password_changed = /** @type {((inputs?: Settings_Password_ChangedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Password_ChangedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_password_changed(inputs)
	if (locale === "cs") return __cs.settings_password_changed(inputs)
	return __en.settings_password_changed(inputs)
});
/**
* | output |
* | --- |
* | "Current password" |
*
* @param {Settings_Password_CurrentInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_password_current = /** @type {((inputs?: Settings_Password_CurrentInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Password_CurrentInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_password_current(inputs)
	if (locale === "cs") return __cs.settings_password_current(inputs)
	return __en.settings_password_current(inputs)
});
/**
* | output |
* | --- |
* | "Your password wasn't changed. Try again." |
*
* @param {Settings_Password_FailedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_password_failed = /** @type {((inputs?: Settings_Password_FailedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Password_FailedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_password_failed(inputs)
	if (locale === "cs") return __cs.settings_password_failed(inputs)
	return __en.settings_password_failed(inputs)
});
/**
* | output |
* | --- |
* | "The current password is incorrect." |
*
* @param {Settings_Password_IncorrectInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_password_incorrect = /** @type {((inputs?: Settings_Password_IncorrectInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Password_IncorrectInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_password_incorrect(inputs)
	if (locale === "cs") return __cs.settings_password_incorrect(inputs)
	return __en.settings_password_incorrect(inputs)
});
/**
* | output |
* | --- |
* | "Repeat new password" |
*
* @param {Settings_Password_RepeatInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_password_repeat = /** @type {((inputs?: Settings_Password_RepeatInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Password_RepeatInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_password_repeat(inputs)
	if (locale === "cs") return __cs.settings_password_repeat(inputs)
	return __en.settings_password_repeat(inputs)
});
/**
* | output |
* | --- |
* | "Changing the password isn't available yet for accounts with two-factor sign-in." |
*
* @param {Settings_Password_Two_FactorInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_password_two_factor = /** @type {((inputs?: Settings_Password_Two_FactorInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Password_Two_FactorInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_password_two_factor(inputs)
	if (locale === "cs") return __cs.settings_password_two_factor(inputs)
	return __en.settings_password_two_factor(inputs)
});
/**
* | output |
* | --- |
* | "Approval rules" |
*
* @param {Settings_Policy_TitleInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_policy_title = /** @type {((inputs?: Settings_Policy_TitleInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Policy_TitleInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_policy_title(inputs)
	if (locale === "cs") return __cs.settings_policy_title(inputs)
	return __en.settings_policy_title(inputs)
});
/**
* | output |
* | --- |
* | "Preferences" |
*
* @param {Settings_Preferences_TitleInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_preferences_title = /** @type {((inputs?: Settings_Preferences_TitleInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Preferences_TitleInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_preferences_title(inputs)
	if (locale === "cs") return __cs.settings_preferences_title(inputs)
	return __en.settings_preferences_title(inputs)
});
/**
* | output |
* | --- |
* | "Profile" |
*
* @param {Settings_Profile_TitleInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_profile_title = /** @type {((inputs?: Settings_Profile_TitleInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Profile_TitleInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_profile_title(inputs)
	if (locale === "cs") return __cs.settings_profile_title(inputs)
	return __en.settings_profile_title(inputs)
});
/**
* | output |
* | --- |
* | "Only owners and admins can change these settings." |
*
* @param {Settings_Read_OnlyInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_read_only = /** @type {((inputs?: Settings_Read_OnlyInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Read_OnlyInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_read_only(inputs)
	if (locale === "cs") return __cs.settings_read_only(inputs)
	return __en.settings_read_only(inputs)
});
/**
* | output |
* | --- |
* | "Approvals needed" |
*
* @param {Settings_Required_ApprovalsInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_required_approvals = /** @type {((inputs?: Settings_Required_ApprovalsInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Required_ApprovalsInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_required_approvals(inputs)
	if (locale === "cs") return __cs.settings_required_approvals(inputs)
	return __en.settings_required_approvals(inputs)
});
/**
* | output |
* | --- |
* | "Approval settings saved." |
*
* @param {Settings_SavedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_saved = /** @type {((inputs?: Settings_SavedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_SavedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_saved(inputs)
	if (locale === "cs") return __cs.settings_saved(inputs)
	return __en.settings_saved(inputs)
});
/**
* | output |
* | --- |
* | "Add saved text" |
*
* @param {Settings_Saved_Text_AddInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_saved_text_add = /** @type {((inputs?: Settings_Saved_Text_AddInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Saved_Text_AddInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_saved_text_add(inputs)
	if (locale === "cs") return __cs.settings_saved_text_add(inputs)
	return __en.settings_saved_text_add(inputs)
});
/**
* | output |
* | --- |
* | "Cancel" |
*
* @param {Settings_Saved_Text_CancelInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_saved_text_cancel = /** @type {((inputs?: Settings_Saved_Text_CancelInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Saved_Text_CancelInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_saved_text_cancel(inputs)
	if (locale === "cs") return __cs.settings_saved_text_cancel(inputs)
	return __en.settings_saved_text_cancel(inputs)
});
/**
* | output |
* | --- |
* | "Delete saved text {name}" |
*
* @param {Settings_Saved_Text_DeleteInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_saved_text_delete = /** @type {((inputs: Settings_Saved_Text_DeleteInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Saved_Text_DeleteInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_saved_text_delete(inputs)
	if (locale === "cs") return __cs.settings_saved_text_delete(inputs)
	return __en.settings_saved_text_delete(inputs)
});
/**
* | output |
* | --- |
* | "Posts that already used it keep their text." |
*
* @param {Settings_Saved_Text_Delete_BodyInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_saved_text_delete_body = /** @type {((inputs?: Settings_Saved_Text_Delete_BodyInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Saved_Text_Delete_BodyInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_saved_text_delete_body(inputs)
	if (locale === "cs") return __cs.settings_saved_text_delete_body(inputs)
	return __en.settings_saved_text_delete_body(inputs)
});
/**
* | countPlural | output |
* | --- | --- |
* | "one" | "{count} channel loses it as its signature." |
* | * | "{count} channels lose it as their signature." |
*
* @param {Settings_Saved_Text_Delete_ChannelsInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_saved_text_delete_channels = /** @type {((inputs: Settings_Saved_Text_Delete_ChannelsInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Saved_Text_Delete_ChannelsInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_saved_text_delete_channels(inputs)
	if (locale === "cs") return __cs.settings_saved_text_delete_channels(inputs)
	return __en.settings_saved_text_delete_channels(inputs)
});
/**
* | output |
* | --- |
* | "Delete saved text" |
*
* @param {Settings_Saved_Text_Delete_ConfirmInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_saved_text_delete_confirm = /** @type {((inputs?: Settings_Saved_Text_Delete_ConfirmInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Saved_Text_Delete_ConfirmInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_saved_text_delete_confirm(inputs)
	if (locale === "cs") return __cs.settings_saved_text_delete_confirm(inputs)
	return __en.settings_saved_text_delete_confirm(inputs)
});
/**
* | output |
* | --- |
* | "Delete saved text “{name}”?" |
*
* @param {Settings_Saved_Text_Delete_TitleInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_saved_text_delete_title = /** @type {((inputs: Settings_Saved_Text_Delete_TitleInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Saved_Text_Delete_TitleInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_saved_text_delete_title(inputs)
	if (locale === "cs") return __cs.settings_saved_text_delete_title(inputs)
	return __en.settings_saved_text_delete_title(inputs)
});
/**
* | output |
* | --- |
* | "Text deleted" |
*
* @param {Settings_Saved_Text_DeletedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_saved_text_deleted = /** @type {((inputs?: Settings_Saved_Text_DeletedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Saved_Text_DeletedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_saved_text_deleted(inputs)
	if (locale === "cs") return __cs.settings_saved_text_deleted(inputs)
	return __en.settings_saved_text_deleted(inputs)
});
/**
* | output |
* | --- |
* | "Edit" |
*
* @param {Settings_Saved_Text_EditInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_saved_text_edit = /** @type {((inputs?: Settings_Saved_Text_EditInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Saved_Text_EditInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_saved_text_edit(inputs)
	if (locale === "cs") return __cs.settings_saved_text_edit(inputs)
	return __en.settings_saved_text_edit(inputs)
});
/**
* | output |
* | --- |
* | "Edit saved text {name}" |
*
* @param {Settings_Saved_Text_Edit_NamedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_saved_text_edit_named = /** @type {((inputs: Settings_Saved_Text_Edit_NamedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Saved_Text_Edit_NamedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_saved_text_edit_named(inputs)
	if (locale === "cs") return __cs.settings_saved_text_edit_named(inputs)
	return __en.settings_saved_text_edit_named(inputs)
});
/**
* | output |
* | --- |
* | "A saved text with this name already exists." |
*
* @param {Settings_Saved_Text_ExistsInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_saved_text_exists = /** @type {((inputs?: Settings_Saved_Text_ExistsInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Saved_Text_ExistsInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_saved_text_exists(inputs)
	if (locale === "cs") return __cs.settings_saved_text_exists(inputs)
	return __en.settings_saved_text_exists(inputs)
});
/**
* | output |
* | --- |
* | "This text is empty or too long." |
*
* @param {Settings_Saved_Text_InvalidInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_saved_text_invalid = /** @type {((inputs?: Settings_Saved_Text_InvalidInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Saved_Text_InvalidInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_saved_text_invalid(inputs)
	if (locale === "cs") return __cs.settings_saved_text_invalid(inputs)
	return __en.settings_saved_text_invalid(inputs)
});
/**
* | output |
* | --- |
* | "Keep saved text" |
*
* @param {Settings_Saved_Text_KeepInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_saved_text_keep = /** @type {((inputs?: Settings_Saved_Text_KeepInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Saved_Text_KeepInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_saved_text_keep(inputs)
	if (locale === "cs") return __cs.settings_saved_text_keep(inputs)
	return __en.settings_saved_text_keep(inputs)
});
/**
* | output |
* | --- |
* | "This workspace has reached its limit of saved texts. Delete one first." |
*
* @param {Settings_Saved_Text_LimitInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_saved_text_limit = /** @type {((inputs?: Settings_Saved_Text_LimitInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Saved_Text_LimitInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_saved_text_limit(inputs)
	if (locale === "cs") return __cs.settings_saved_text_limit(inputs)
	return __en.settings_saved_text_limit(inputs)
});
/**
* | output |
* | --- |
* | "Name" |
*
* @param {Settings_Saved_Text_NameInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_saved_text_name = /** @type {((inputs?: Settings_Saved_Text_NameInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Saved_Text_NameInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_saved_text_name(inputs)
	if (locale === "cs") return __cs.settings_saved_text_name(inputs)
	return __en.settings_saved_text_name(inputs)
});
/**
* | output |
* | --- |
* | "This name is empty or too long." |
*
* @param {Settings_Saved_Text_Name_InvalidInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_saved_text_name_invalid = /** @type {((inputs?: Settings_Saved_Text_Name_InvalidInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Saved_Text_Name_InvalidInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_saved_text_name_invalid(inputs)
	if (locale === "cs") return __cs.settings_saved_text_name_invalid(inputs)
	return __en.settings_saved_text_name_invalid(inputs)
});
/**
* | output |
* | --- |
* | "Text saved" |
*
* @param {Settings_Saved_Text_SavedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_saved_text_saved = /** @type {((inputs?: Settings_Saved_Text_SavedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Saved_Text_SavedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_saved_text_saved(inputs)
	if (locale === "cs") return __cs.settings_saved_text_saved(inputs)
	return __en.settings_saved_text_saved(inputs)
});
/**
* | output |
* | --- |
* | "Text" |
*
* @param {Settings_Saved_Text_TextInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_saved_text_text = /** @type {((inputs?: Settings_Saved_Text_TextInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Saved_Text_TextInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_saved_text_text(inputs)
	if (locale === "cs") return __cs.settings_saved_text_text(inputs)
	return __en.settings_saved_text_text(inputs)
});
/**
* | output |
* | --- |
* | "No saved texts yet." |
*
* @param {Settings_Saved_Texts_EmptyInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_saved_texts_empty = /** @type {((inputs?: Settings_Saved_Texts_EmptyInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Saved_Texts_EmptyInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_saved_texts_empty(inputs)
	if (locale === "cs") return __cs.settings_saved_texts_empty(inputs)
	return __en.settings_saved_texts_empty(inputs)
});
/**
* | output |
* | --- |
* | "Reusable text for the whole workspace, such as a signature or a template. Insert it while writing a post." |
*
* @param {Settings_Saved_Texts_IntroInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_saved_texts_intro = /** @type {((inputs?: Settings_Saved_Texts_IntroInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Saved_Texts_IntroInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_saved_texts_intro(inputs)
	if (locale === "cs") return __cs.settings_saved_texts_intro(inputs)
	return __en.settings_saved_texts_intro(inputs)
});
/**
* | output |
* | --- |
* | "Saved texts" |
*
* @param {Settings_Saved_Texts_TitleInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_saved_texts_title = /** @type {((inputs?: Settings_Saved_Texts_TitleInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Saved_Texts_TitleInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_saved_texts_title(inputs)
	if (locale === "cs") return __cs.settings_saved_texts_title(inputs)
	return __en.settings_saved_texts_title(inputs)
});
/**
* | output |
* | --- |
* | "Saving…" |
*
* @param {Settings_SavingInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_saving = /** @type {((inputs?: Settings_SavingInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_SavingInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_saving(inputs)
	if (locale === "cs") return __cs.settings_saving(inputs)
	return __en.settings_saving(inputs)
});
/**
* | output |
* | --- |
* | "API key" |
*
* @param {Settings_Short_Links_Api_KeyInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_short_links_api_key = /** @type {((inputs?: Settings_Short_Links_Api_KeyInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Short_Links_Api_KeyInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_short_links_api_key(inputs)
	if (locale === "cs") return __cs.settings_short_links_api_key(inputs)
	return __en.settings_short_links_api_key(inputs)
});
/**
* | output |
* | --- |
* | "The API key is too long or has characters that aren't allowed." |
*
* @param {Settings_Short_Links_Api_Key_InvalidInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_short_links_api_key_invalid = /** @type {((inputs?: Settings_Short_Links_Api_Key_InvalidInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Short_Links_Api_Key_InvalidInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_short_links_api_key_invalid(inputs)
	if (locale === "cs") return __cs.settings_short_links_api_key_invalid(inputs)
	return __en.settings_short_links_api_key_invalid(inputs)
});
/**
* | output |
* | --- |
* | "Leave empty to keep the current key." |
*
* @param {Settings_Short_Links_Api_Key_KeepInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_short_links_api_key_keep = /** @type {((inputs?: Settings_Short_Links_Api_Key_KeepInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Short_Links_Api_Key_KeepInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_short_links_api_key_keep(inputs)
	if (locale === "cs") return __cs.settings_short_links_api_key_keep(inputs)
	return __en.settings_short_links_api_key_keep(inputs)
});
/**
* | output |
* | --- |
* | "No API key" |
*
* @param {Settings_Short_Links_Api_Key_MissingInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_short_links_api_key_missing = /** @type {((inputs?: Settings_Short_Links_Api_Key_MissingInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Short_Links_Api_Key_MissingInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_short_links_api_key_missing(inputs)
	if (locale === "cs") return __cs.settings_short_links_api_key_missing(inputs)
	return __en.settings_short_links_api_key_missing(inputs)
});
/**
* | output |
* | --- |
* | "API key set" |
*
* @param {Settings_Short_Links_Api_Key_SetInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_short_links_api_key_set = /** @type {((inputs?: Settings_Short_Links_Api_Key_SetInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Short_Links_Api_Key_SetInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_short_links_api_key_set(inputs)
	if (locale === "cs") return __cs.settings_short_links_api_key_set(inputs)
	return __en.settings_short_links_api_key_set(inputs)
});
/**
* | output |
* | --- |
* | "Base URL" |
*
* @param {Settings_Short_Links_Base_UrlInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_short_links_base_url = /** @type {((inputs?: Settings_Short_Links_Base_UrlInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Short_Links_Base_UrlInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_short_links_base_url(inputs)
	if (locale === "cs") return __cs.settings_short_links_base_url(inputs)
	return __en.settings_short_links_base_url(inputs)
});
/**
* | output |
* | --- |
* | "https://kutt.to or your own instance" |
*
* @param {Settings_Short_Links_Base_Url_HintInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_short_links_base_url_hint = /** @type {((inputs?: Settings_Short_Links_Base_Url_HintInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Short_Links_Base_Url_HintInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_short_links_base_url_hint(inputs)
	if (locale === "cs") return __cs.settings_short_links_base_url_hint(inputs)
	return __en.settings_short_links_base_url_hint(inputs)
});
/**
* | output |
* | --- |
* | "Enter an https link, such as https://kutt.to or your own instance, without a user name, password or query. kutt.it isn't supported." |
*
* @param {Settings_Short_Links_Base_Url_InvalidInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_short_links_base_url_invalid = /** @type {((inputs?: Settings_Short_Links_Base_Url_InvalidInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Short_Links_Base_Url_InvalidInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_short_links_base_url_invalid(inputs)
	if (locale === "cs") return __cs.settings_short_links_base_url_invalid(inputs)
	return __en.settings_short_links_base_url_invalid(inputs)
});
/**
* | output |
* | --- |
* | "Cancel" |
*
* @param {Settings_Short_Links_CancelInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_short_links_cancel = /** @type {((inputs?: Settings_Short_Links_CancelInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Short_Links_CancelInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_short_links_cancel(inputs)
	if (locale === "cs") return __cs.settings_short_links_cancel(inputs)
	return __en.settings_short_links_cancel(inputs)
});
/**
* | output |
* | --- |
* | "Checking key…" |
*
* @param {Settings_Short_Links_CheckingInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_short_links_checking = /** @type {((inputs?: Settings_Short_Links_CheckingInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Short_Links_CheckingInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_short_links_checking(inputs)
	if (locale === "cs") return __cs.settings_short_links_checking(inputs)
	return __en.settings_short_links_checking(inputs)
});
/**
* | output |
* | --- |
* | "The shortener was changed in the meantime. Reload the page and try again." |
*
* @param {Settings_Short_Links_ConflictInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_short_links_conflict = /** @type {((inputs?: Settings_Short_Links_ConflictInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Short_Links_ConflictInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_short_links_conflict(inputs)
	if (locale === "cs") return __cs.settings_short_links_conflict(inputs)
	return __en.settings_short_links_conflict(inputs)
});
/**
* | output |
* | --- |
* | "Connect" |
*
* @param {Settings_Short_Links_ConnectInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_short_links_connect = /** @type {((inputs?: Settings_Short_Links_ConnectInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Short_Links_ConnectInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_short_links_connect(inputs)
	if (locale === "cs") return __cs.settings_short_links_connect(inputs)
	return __en.settings_short_links_connect(inputs)
});
/**
* | output |
* | --- |
* | "Connect a shortener" |
*
* @param {Settings_Short_Links_Connect_TitleInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_short_links_connect_title = /** @type {((inputs?: Settings_Short_Links_Connect_TitleInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Short_Links_Connect_TitleInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_short_links_connect_title(inputs)
	if (locale === "cs") return __cs.settings_short_links_connect_title(inputs)
	return __en.settings_short_links_connect_title(inputs)
});
/**
* | output |
* | --- |
* | "Shortener connected" |
*
* @param {Settings_Short_Links_ConnectedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_short_links_connected = /** @type {((inputs?: Settings_Short_Links_ConnectedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Short_Links_ConnectedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_short_links_connected(inputs)
	if (locale === "cs") return __cs.settings_short_links_connected(inputs)
	return __en.settings_short_links_connected(inputs)
});
/**
* | output |
* | --- |
* | "Shortener" |
*
* @param {Settings_Short_Links_Connected_TitleInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_short_links_connected_title = /** @type {((inputs?: Settings_Short_Links_Connected_TitleInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Short_Links_Connected_TitleInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_short_links_connected_title(inputs)
	if (locale === "cs") return __cs.settings_short_links_connected_title(inputs)
	return __en.settings_short_links_connected_title(inputs)
});
/**
* | output |
* | --- |
* | "Custom domain (optional)" |
*
* @param {Settings_Short_Links_DomainInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_short_links_domain = /** @type {((inputs?: Settings_Short_Links_DomainInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Short_Links_DomainInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_short_links_domain(inputs)
	if (locale === "cs") return __cs.settings_short_links_domain(inputs)
	return __en.settings_short_links_domain(inputs)
});
/**
* | output |
* | --- |
* | "Enter a host name such as go.example.com, without https:// or a path." |
*
* @param {Settings_Short_Links_Domain_InvalidInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_short_links_domain_invalid = /** @type {((inputs?: Settings_Short_Links_Domain_InvalidInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Short_Links_Domain_InvalidInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_short_links_domain_invalid(inputs)
	if (locale === "cs") return __cs.settings_short_links_domain_invalid(inputs)
	return __en.settings_short_links_domain_invalid(inputs)
});
/**
* | output |
* | --- |
* | "The service's default" |
*
* @param {Settings_Short_Links_Domain_NoneInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_short_links_domain_none = /** @type {((inputs?: Settings_Short_Links_Domain_NoneInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Short_Links_Domain_NoneInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_short_links_domain_none(inputs)
	if (locale === "cs") return __cs.settings_short_links_domain_none(inputs)
	return __en.settings_short_links_domain_none(inputs)
});
/**
* | output |
* | --- |
* | "Edit" |
*
* @param {Settings_Short_Links_EditInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_short_links_edit = /** @type {((inputs?: Settings_Short_Links_EditInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Short_Links_EditInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_short_links_edit(inputs)
	if (locale === "cs") return __cs.settings_short_links_edit(inputs)
	return __en.settings_short_links_edit(inputs)
});
/**
* | output |
* | --- |
* | "Edit shortener" |
*
* @param {Settings_Short_Links_Edit_TitleInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_short_links_edit_title = /** @type {((inputs?: Settings_Short_Links_Edit_TitleInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Short_Links_Edit_TitleInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_short_links_edit_title(inputs)
	if (locale === "cs") return __cs.settings_short_links_edit_title(inputs)
	return __en.settings_short_links_edit_title(inputs)
});
/**
* | output |
* | --- |
* | "Shorten the links in scheduled posts through Dub or Kutt, with one short link per channel and UTM tags added. If the shortener can't be reached, a link is pu..." |
*
* @param {Settings_Short_Links_IntroInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_short_links_intro = /** @type {((inputs?: Settings_Short_Links_IntroInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Short_Links_IntroInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_short_links_intro(inputs)
	if (locale === "cs") return __cs.settings_short_links_intro(inputs)
	return __en.settings_short_links_intro(inputs)
});
/**
* | output |
* | --- |
* | "Keep shortener" |
*
* @param {Settings_Short_Links_KeepInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_short_links_keep = /** @type {((inputs?: Settings_Short_Links_KeepInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Short_Links_KeepInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_short_links_keep(inputs)
	if (locale === "cs") return __cs.settings_short_links_keep(inputs)
	return __en.settings_short_links_keep(inputs)
});
/**
* | output |
* | --- |
* | "Service" |
*
* @param {Settings_Short_Links_ProviderInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_short_links_provider = /** @type {((inputs?: Settings_Short_Links_ProviderInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Short_Links_ProviderInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_short_links_provider(inputs)
	if (locale === "cs") return __cs.settings_short_links_provider(inputs)
	return __en.settings_short_links_provider(inputs)
});
/**
* | provider | output |
* | --- | --- |
* | "dub" | "Dub" |
* | "kutt" | "Kutt" |
* | * | "Other" |
*
* @param {Settings_Short_Links_Provider_NameInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_short_links_provider_name = /** @type {((inputs: Settings_Short_Links_Provider_NameInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Short_Links_Provider_NameInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_short_links_provider_name(inputs)
	if (locale === "cs") return __cs.settings_short_links_provider_name(inputs)
	return __en.settings_short_links_provider_name(inputs)
});
/**
* | output |
* | --- |
* | "Remove" |
*
* @param {Settings_Short_Links_RemoveInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_short_links_remove = /** @type {((inputs?: Settings_Short_Links_RemoveInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Short_Links_RemoveInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_short_links_remove(inputs)
	if (locale === "cs") return __cs.settings_short_links_remove(inputs)
	return __en.settings_short_links_remove(inputs)
});
/**
* | output |
* | --- |
* | "Posts scheduled from now on keep their long links. Short links that already exist keep working." |
*
* @param {Settings_Short_Links_Remove_BodyInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_short_links_remove_body = /** @type {((inputs?: Settings_Short_Links_Remove_BodyInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Short_Links_Remove_BodyInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_short_links_remove_body(inputs)
	if (locale === "cs") return __cs.settings_short_links_remove_body(inputs)
	return __en.settings_short_links_remove_body(inputs)
});
/**
* | output |
* | --- |
* | "Remove the shortener?" |
*
* @param {Settings_Short_Links_Remove_TitleInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_short_links_remove_title = /** @type {((inputs?: Settings_Short_Links_Remove_TitleInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Short_Links_Remove_TitleInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_short_links_remove_title(inputs)
	if (locale === "cs") return __cs.settings_short_links_remove_title(inputs)
	return __en.settings_short_links_remove_title(inputs)
});
/**
* | output |
* | --- |
* | "Shortener removed" |
*
* @param {Settings_Short_Links_RemovedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_short_links_removed = /** @type {((inputs?: Settings_Short_Links_RemovedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Short_Links_RemovedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_short_links_removed(inputs)
	if (locale === "cs") return __cs.settings_short_links_removed(inputs)
	return __en.settings_short_links_removed(inputs)
});
/**
* | output |
* | --- |
* | "Shortener saved" |
*
* @param {Settings_Short_Links_SavedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_short_links_saved = /** @type {((inputs?: Settings_Short_Links_SavedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Short_Links_SavedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_short_links_saved(inputs)
	if (locale === "cs") return __cs.settings_short_links_saved(inputs)
	return __en.settings_short_links_saved(inputs)
});
/**
* | output |
* | --- |
* | "Short links" |
*
* @param {Settings_Short_Links_TitleInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_short_links_title = /** @type {((inputs?: Settings_Short_Links_TitleInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Short_Links_TitleInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_short_links_title(inputs)
	if (locale === "cs") return __cs.settings_short_links_title(inputs)
	return __en.settings_short_links_title(inputs)
});
/**
* | output |
* | --- |
* | "The service refused this API key." |
*
* @param {Settings_Short_Links_UnauthorizedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_short_links_unauthorized = /** @type {((inputs?: Settings_Short_Links_UnauthorizedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Short_Links_UnauthorizedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_short_links_unauthorized(inputs)
	if (locale === "cs") return __cs.settings_short_links_unauthorized(inputs)
	return __en.settings_short_links_unauthorized(inputs)
});
/**
* | output |
* | --- |
* | "The service couldn't be reached. Check the address and try again." |
*
* @param {Settings_Short_Links_UnreachableInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_short_links_unreachable = /** @type {((inputs?: Settings_Short_Links_UnreachableInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Short_Links_UnreachableInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_short_links_unreachable(inputs)
	if (locale === "cs") return __cs.settings_short_links_unreachable(inputs)
	return __en.settings_short_links_unreachable(inputs)
});
/**
* | output |
* | --- |
* | "System" |
*
* @param {Settings_System_TitleInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_system_title = /** @type {((inputs?: Settings_System_TitleInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_System_TitleInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_system_title(inputs)
	if (locale === "cs") return __cs.settings_system_title(inputs)
	return __en.settings_system_title(inputs)
});
/**
* | color | output |
* | --- | --- |
* | "slate" | "Slate" |
* | "red" | "Red" |
* | "orange" | "Orange" |
* | "amber" | "Amber" |
* | "green" | "Green" |
* | "teal" | "Teal" |
* | "blue" | "Blue" |
* | "violet" | "Violet" |
* | * | "Color" |
*
* @param {Settings_Tag_ColorInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_tag_color = /** @type {((inputs: Settings_Tag_ColorInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Tag_ColorInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_tag_color(inputs)
	if (locale === "cs") return __cs.settings_tag_color(inputs)
	return __en.settings_tag_color(inputs)
});
/**
* | output |
* | --- |
* | "Color of tag {name}" |
*
* @param {Settings_Tag_Color_OfInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_tag_color_of = /** @type {((inputs: Settings_Tag_Color_OfInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Tag_Color_OfInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_tag_color_of(inputs)
	if (locale === "cs") return __cs.settings_tag_color_of(inputs)
	return __en.settings_tag_color_of(inputs)
});
/**
* | output |
* | --- |
* | "Delete tag {name}" |
*
* @param {Settings_Tag_DeleteInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_tag_delete = /** @type {((inputs: Settings_Tag_DeleteInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Tag_DeleteInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_tag_delete(inputs)
	if (locale === "cs") return __cs.settings_tag_delete(inputs)
	return __en.settings_tag_delete(inputs)
});
/**
* | countPlural | output |
* | --- | --- |
* | "one" | "It will be removed from {count} post." |
* | * | "It will be removed from {count} posts." |
*
* @param {Settings_Tag_Delete_BodyInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_tag_delete_body = /** @type {((inputs: Settings_Tag_Delete_BodyInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Tag_Delete_BodyInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_tag_delete_body(inputs)
	if (locale === "cs") return __cs.settings_tag_delete_body(inputs)
	return __en.settings_tag_delete_body(inputs)
});
/**
* | output |
* | --- |
* | "Delete tag" |
*
* @param {Settings_Tag_Delete_ConfirmInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_tag_delete_confirm = /** @type {((inputs?: Settings_Tag_Delete_ConfirmInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Tag_Delete_ConfirmInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_tag_delete_confirm(inputs)
	if (locale === "cs") return __cs.settings_tag_delete_confirm(inputs)
	return __en.settings_tag_delete_confirm(inputs)
});
/**
* | output |
* | --- |
* | "Delete tag “{name}”?" |
*
* @param {Settings_Tag_Delete_TitleInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_tag_delete_title = /** @type {((inputs: Settings_Tag_Delete_TitleInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Tag_Delete_TitleInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_tag_delete_title(inputs)
	if (locale === "cs") return __cs.settings_tag_delete_title(inputs)
	return __en.settings_tag_delete_title(inputs)
});
/**
* | output |
* | --- |
* | "Tag deleted" |
*
* @param {Settings_Tag_DeletedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_tag_deleted = /** @type {((inputs?: Settings_Tag_DeletedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Tag_DeletedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_tag_deleted(inputs)
	if (locale === "cs") return __cs.settings_tag_deleted(inputs)
	return __en.settings_tag_deleted(inputs)
});
/**
* | output |
* | --- |
* | "Keep tag" |
*
* @param {Settings_Tag_KeepInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_tag_keep = /** @type {((inputs?: Settings_Tag_KeepInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Tag_KeepInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_tag_keep(inputs)
	if (locale === "cs") return __cs.settings_tag_keep(inputs)
	return __en.settings_tag_keep(inputs)
});
/**
* | output |
* | --- |
* | "Name of tag {name}" |
*
* @param {Settings_Tag_NameInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_tag_name = /** @type {((inputs: Settings_Tag_NameInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Tag_NameInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_tag_name(inputs)
	if (locale === "cs") return __cs.settings_tag_name(inputs)
	return __en.settings_tag_name(inputs)
});
/**
* | countPlural | output |
* | --- | --- |
* | "one" | "{count} post" |
* | * | "{count} posts" |
*
* @param {Settings_Tag_PostsInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_tag_posts = /** @type {((inputs: Settings_Tag_PostsInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Tag_PostsInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_tag_posts(inputs)
	if (locale === "cs") return __cs.settings_tag_posts(inputs)
	return __en.settings_tag_posts(inputs)
});
/**
* | output |
* | --- |
* | "Tag saved" |
*
* @param {Settings_Tag_SavedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_tag_saved = /** @type {((inputs?: Settings_Tag_SavedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Tag_SavedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_tag_saved(inputs)
	if (locale === "cs") return __cs.settings_tag_saved(inputs)
	return __en.settings_tag_saved(inputs)
});
/**
* | output |
* | --- |
* | "No tags yet. Add one in the composer or on a post." |
*
* @param {Settings_Tags_EmptyInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_tags_empty = /** @type {((inputs?: Settings_Tags_EmptyInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Tags_EmptyInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_tags_empty(inputs)
	if (locale === "cs") return __cs.settings_tags_empty(inputs)
	return __en.settings_tags_empty(inputs)
});
/**
* | output |
* | --- |
* | "Internal labels for finding and grouping posts. They are never published." |
*
* @param {Settings_Tags_IntroInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_tags_intro = /** @type {((inputs?: Settings_Tags_IntroInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Tags_IntroInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_tags_intro(inputs)
	if (locale === "cs") return __cs.settings_tags_intro(inputs)
	return __en.settings_tags_intro(inputs)
});
/**
* | output |
* | --- |
* | "Tags" |
*
* @param {Settings_Tags_TitleInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_tags_title = /** @type {((inputs?: Settings_Tags_TitleInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Tags_TitleInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_tags_title(inputs)
	if (locale === "cs") return __cs.settings_tags_title(inputs)
	return __en.settings_tags_title(inputs)
});
/**
* | output |
* | --- |
* | "Theme" |
*
* @param {Settings_ThemeInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_theme = /** @type {((inputs?: Settings_ThemeInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_ThemeInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_theme(inputs)
	if (locale === "cs") return __cs.settings_theme(inputs)
	return __en.settings_theme(inputs)
});
/**
* | output |
* | --- |
* | "Allowed shift after approval (minutes)" |
*
* @param {Settings_ToleranceInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_tolerance = /** @type {((inputs?: Settings_ToleranceInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_ToleranceInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_tolerance(inputs)
	if (locale === "cs") return __cs.settings_tolerance(inputs)
	return __en.settings_tolerance(inputs)
});
/**
* | output |
* | --- |
* | "Add endpoint" |
*
* @param {Settings_Webhooks_AddInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_webhooks_add = /** @type {((inputs?: Settings_Webhooks_AddInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Webhooks_AddInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_webhooks_add(inputs)
	if (locale === "cs") return __cs.settings_webhooks_add(inputs)
	return __en.settings_webhooks_add(inputs)
});
/**
* | countPlural | output |
* | --- | --- |
* | "one" | "{count} attempt" |
* | * | "{count} attempts" |
*
* @param {Settings_Webhooks_AttemptsInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_webhooks_attempts = /** @type {((inputs: Settings_Webhooks_AttemptsInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Webhooks_AttemptsInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_webhooks_attempts(inputs)
	if (locale === "cs") return __cs.settings_webhooks_attempts(inputs)
	return __en.settings_webhooks_attempts(inputs)
});
/**
* | output |
* | --- |
* | "Cancel" |
*
* @param {Settings_Webhooks_CancelInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_webhooks_cancel = /** @type {((inputs?: Settings_Webhooks_CancelInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Webhooks_CancelInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_webhooks_cancel(inputs)
	if (locale === "cs") return __cs.settings_webhooks_cancel(inputs)
	return __en.settings_webhooks_cancel(inputs)
});
/**
* | output |
* | --- |
* | "Close" |
*
* @param {Settings_Webhooks_CloseInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_webhooks_close = /** @type {((inputs?: Settings_Webhooks_CloseInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Webhooks_CloseInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_webhooks_close(inputs)
	if (locale === "cs") return __cs.settings_webhooks_close(inputs)
	return __en.settings_webhooks_close(inputs)
});
/**
* | output |
* | --- |
* | "Secret copied" |
*
* @param {Settings_Webhooks_CopiedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_webhooks_copied = /** @type {((inputs?: Settings_Webhooks_CopiedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Webhooks_CopiedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_webhooks_copied(inputs)
	if (locale === "cs") return __cs.settings_webhooks_copied(inputs)
	return __en.settings_webhooks_copied(inputs)
});
/**
* | output |
* | --- |
* | "Copy secret" |
*
* @param {Settings_Webhooks_CopyInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_webhooks_copy = /** @type {((inputs?: Settings_Webhooks_CopyInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Webhooks_CopyInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_webhooks_copy(inputs)
	if (locale === "cs") return __cs.settings_webhooks_copy(inputs)
	return __en.settings_webhooks_copy(inputs)
});
/**
* | output |
* | --- |
* | "Couldn't copy. Select the secret and copy it yourself." |
*
* @param {Settings_Webhooks_Copy_FailedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_webhooks_copy_failed = /** @type {((inputs?: Settings_Webhooks_Copy_FailedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Webhooks_Copy_FailedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_webhooks_copy_failed(inputs)
	if (locale === "cs") return __cs.settings_webhooks_copy_failed(inputs)
	return __en.settings_webhooks_copy_failed(inputs)
});
/**
* | output |
* | --- |
* | "Delete" |
*
* @param {Settings_Webhooks_DeleteInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_webhooks_delete = /** @type {((inputs?: Settings_Webhooks_DeleteInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Webhooks_DeleteInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_webhooks_delete(inputs)
	if (locale === "cs") return __cs.settings_webhooks_delete(inputs)
	return __en.settings_webhooks_delete(inputs)
});
/**
* | output |
* | --- |
* | "Deliveries still waiting for it are dropped. This can't be undone." |
*
* @param {Settings_Webhooks_Delete_BodyInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_webhooks_delete_body = /** @type {((inputs?: Settings_Webhooks_Delete_BodyInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Webhooks_Delete_BodyInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_webhooks_delete_body(inputs)
	if (locale === "cs") return __cs.settings_webhooks_delete_body(inputs)
	return __en.settings_webhooks_delete_body(inputs)
});
/**
* | output |
* | --- |
* | "Delete {host}" |
*
* @param {Settings_Webhooks_Delete_NamedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_webhooks_delete_named = /** @type {((inputs: Settings_Webhooks_Delete_NamedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Webhooks_Delete_NamedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_webhooks_delete_named(inputs)
	if (locale === "cs") return __cs.settings_webhooks_delete_named(inputs)
	return __en.settings_webhooks_delete_named(inputs)
});
/**
* | output |
* | --- |
* | "Delete this endpoint?" |
*
* @param {Settings_Webhooks_Delete_TitleInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_webhooks_delete_title = /** @type {((inputs?: Settings_Webhooks_Delete_TitleInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Webhooks_Delete_TitleInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_webhooks_delete_title(inputs)
	if (locale === "cs") return __cs.settings_webhooks_delete_title(inputs)
	return __en.settings_webhooks_delete_title(inputs)
});
/**
* | output |
* | --- |
* | "Endpoint deleted" |
*
* @param {Settings_Webhooks_DeletedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_webhooks_deleted = /** @type {((inputs?: Settings_Webhooks_DeletedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Webhooks_DeletedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_webhooks_deleted(inputs)
	if (locale === "cs") return __cs.settings_webhooks_deleted(inputs)
	return __en.settings_webhooks_deleted(inputs)
});
/**
* | output |
* | --- |
* | "Deliveries" |
*
* @param {Settings_Webhooks_DeliveriesInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_webhooks_deliveries = /** @type {((inputs?: Settings_Webhooks_DeliveriesInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Webhooks_DeliveriesInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_webhooks_deliveries(inputs)
	if (locale === "cs") return __cs.settings_webhooks_deliveries(inputs)
	return __en.settings_webhooks_deliveries(inputs)
});
/**
* | output |
* | --- |
* | "No deliveries yet." |
*
* @param {Settings_Webhooks_Deliveries_EmptyInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_webhooks_deliveries_empty = /** @type {((inputs?: Settings_Webhooks_Deliveries_EmptyInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Webhooks_Deliveries_EmptyInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_webhooks_deliveries_empty(inputs)
	if (locale === "cs") return __cs.settings_webhooks_deliveries_empty(inputs)
	return __en.settings_webhooks_deliveries_empty(inputs)
});
/**
* | output |
* | --- |
* | "Load more" |
*
* @param {Settings_Webhooks_Deliveries_MoreInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_webhooks_deliveries_more = /** @type {((inputs?: Settings_Webhooks_Deliveries_MoreInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Webhooks_Deliveries_MoreInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_webhooks_deliveries_more(inputs)
	if (locale === "cs") return __cs.settings_webhooks_deliveries_more(inputs)
	return __en.settings_webhooks_deliveries_more(inputs)
});
/**
* | output |
* | --- |
* | "Deliveries to {host}" |
*
* @param {Settings_Webhooks_Deliveries_NamedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_webhooks_deliveries_named = /** @type {((inputs: Settings_Webhooks_Deliveries_NamedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Webhooks_Deliveries_NamedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_webhooks_deliveries_named(inputs)
	if (locale === "cs") return __cs.settings_webhooks_deliveries_named(inputs)
	return __en.settings_webhooks_deliveries_named(inputs)
});
/**
* | output |
* | --- |
* | "Done" |
*
* @param {Settings_Webhooks_DoneInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_webhooks_done = /** @type {((inputs?: Settings_Webhooks_DoneInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Webhooks_DoneInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_webhooks_done(inputs)
	if (locale === "cs") return __cs.settings_webhooks_done(inputs)
	return __en.settings_webhooks_done(inputs)
});
/**
* | output |
* | --- |
* | "Edit" |
*
* @param {Settings_Webhooks_EditInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_webhooks_edit = /** @type {((inputs?: Settings_Webhooks_EditInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Webhooks_EditInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_webhooks_edit(inputs)
	if (locale === "cs") return __cs.settings_webhooks_edit(inputs)
	return __en.settings_webhooks_edit(inputs)
});
/**
* | output |
* | --- |
* | "Edit {host}" |
*
* @param {Settings_Webhooks_Edit_NamedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_webhooks_edit_named = /** @type {((inputs: Settings_Webhooks_Edit_NamedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Webhooks_Edit_NamedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_webhooks_edit_named(inputs)
	if (locale === "cs") return __cs.settings_webhooks_edit_named(inputs)
	return __en.settings_webhooks_edit_named(inputs)
});
/**
* | output |
* | --- |
* | "Edit endpoint" |
*
* @param {Settings_Webhooks_Edit_TitleInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_webhooks_edit_title = /** @type {((inputs?: Settings_Webhooks_Edit_TitleInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Webhooks_Edit_TitleInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_webhooks_edit_title(inputs)
	if (locale === "cs") return __cs.settings_webhooks_edit_title(inputs)
	return __en.settings_webhooks_edit_title(inputs)
});
/**
* | output |
* | --- |
* | "No webhook endpoints yet." |
*
* @param {Settings_Webhooks_EmptyInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_webhooks_empty = /** @type {((inputs?: Settings_Webhooks_EmptyInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Webhooks_EmptyInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_webhooks_empty(inputs)
	if (locale === "cs") return __cs.settings_webhooks_empty(inputs)
	return __en.settings_webhooks_empty(inputs)
});
/**
* | output |
* | --- |
* | "Send deliveries to {host}" |
*
* @param {Settings_Webhooks_Enabled_NamedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_webhooks_enabled_named = /** @type {((inputs: Settings_Webhooks_Enabled_NamedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Webhooks_Enabled_NamedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_webhooks_enabled_named(inputs)
	if (locale === "cs") return __cs.settings_webhooks_enabled_named(inputs)
	return __en.settings_webhooks_enabled_named(inputs)
});
/**
* | output |
* | --- |
* | "Error: {code}" |
*
* @param {Settings_Webhooks_Error_CodeInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_webhooks_error_code = /** @type {((inputs: Settings_Webhooks_Error_CodeInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Webhooks_Error_CodeInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_webhooks_error_code(inputs)
	if (locale === "cs") return __cs.settings_webhooks_error_code(inputs)
	return __en.settings_webhooks_error_code(inputs)
});
/**
* | output |
* | --- |
* | "Channel access expiring soon" |
*
* @param {Settings_Webhooks_Event_Channel_ExpiringInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_webhooks_event_channel_expiring = /** @type {((inputs?: Settings_Webhooks_Event_Channel_ExpiringInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Webhooks_Event_Channel_ExpiringInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_webhooks_event_channel_expiring(inputs)
	if (locale === "cs") return __cs.settings_webhooks_event_channel_expiring(inputs)
	return __en.settings_webhooks_event_channel_expiring(inputs)
});
/**
* | output |
* | --- |
* | "Channel needs reconnecting" |
*
* @param {Settings_Webhooks_Event_Channel_Needs_ReauthInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_webhooks_event_channel_needs_reauth = /** @type {((inputs?: Settings_Webhooks_Event_Channel_Needs_ReauthInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Webhooks_Event_Channel_Needs_ReauthInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_webhooks_event_channel_needs_reauth(inputs)
	if (locale === "cs") return __cs.settings_webhooks_event_channel_needs_reauth(inputs)
	return __en.settings_webhooks_event_channel_needs_reauth(inputs)
});
/**
* | output |
* | --- |
* | "Channel reconnected" |
*
* @param {Settings_Webhooks_Event_Channel_ReconnectedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_webhooks_event_channel_reconnected = /** @type {((inputs?: Settings_Webhooks_Event_Channel_ReconnectedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Webhooks_Event_Channel_ReconnectedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_webhooks_event_channel_reconnected(inputs)
	if (locale === "cs") return __cs.settings_webhooks_event_channel_reconnected(inputs)
	return __en.settings_webhooks_event_channel_reconnected(inputs)
});
/**
* | output |
* | --- |
* | "Waiting to be posted by hand" |
*
* @param {Settings_Webhooks_Event_Destination_Awaiting_ManualInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_webhooks_event_destination_awaiting_manual = /** @type {((inputs?: Settings_Webhooks_Event_Destination_Awaiting_ManualInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Webhooks_Event_Destination_Awaiting_ManualInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_webhooks_event_destination_awaiting_manual(inputs)
	if (locale === "cs") return __cs.settings_webhooks_event_destination_awaiting_manual(inputs)
	return __en.settings_webhooks_event_destination_awaiting_manual(inputs)
});
/**
* | output |
* | --- |
* | "Blocked before publishing" |
*
* @param {Settings_Webhooks_Event_Destination_BlockedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_webhooks_event_destination_blocked = /** @type {((inputs?: Settings_Webhooks_Event_Destination_BlockedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Webhooks_Event_Destination_BlockedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_webhooks_event_destination_blocked(inputs)
	if (locale === "cs") return __cs.settings_webhooks_event_destination_blocked(inputs)
	return __en.settings_webhooks_event_destination_blocked(inputs)
});
/**
* | output |
* | --- |
* | "Failed on a channel" |
*
* @param {Settings_Webhooks_Event_Destination_FailedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_webhooks_event_destination_failed = /** @type {((inputs?: Settings_Webhooks_Event_Destination_FailedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Webhooks_Event_Destination_FailedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_webhooks_event_destination_failed(inputs)
	if (locale === "cs") return __cs.settings_webhooks_event_destination_failed(inputs)
	return __en.settings_webhooks_event_destination_failed(inputs)
});
/**
* | output |
* | --- |
* | "Published on a channel" |
*
* @param {Settings_Webhooks_Event_Destination_PublishedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_webhooks_event_destination_published = /** @type {((inputs?: Settings_Webhooks_Event_Destination_PublishedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Webhooks_Event_Destination_PublishedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_webhooks_event_destination_published(inputs)
	if (locale === "cs") return __cs.settings_webhooks_event_destination_published(inputs)
	return __en.settings_webhooks_event_destination_published(inputs)
});
/**
* | output |
* | --- |
* | "Publishing unconfirmed" |
*
* @param {Settings_Webhooks_Event_Destination_UnconfirmedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_webhooks_event_destination_unconfirmed = /** @type {((inputs?: Settings_Webhooks_Event_Destination_UnconfirmedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Webhooks_Event_Destination_UnconfirmedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_webhooks_event_destination_unconfirmed(inputs)
	if (locale === "cs") return __cs.settings_webhooks_event_destination_unconfirmed(inputs)
	return __en.settings_webhooks_event_destination_unconfirmed(inputs)
});
/**
* | output |
* | --- |
* | "Approval requested" |
*
* @param {Settings_Webhooks_Event_Post_Approval_RequestedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_webhooks_event_post_approval_requested = /** @type {((inputs?: Settings_Webhooks_Event_Post_Approval_RequestedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Webhooks_Event_Post_Approval_RequestedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_webhooks_event_post_approval_requested(inputs)
	if (locale === "cs") return __cs.settings_webhooks_event_post_approval_requested(inputs)
	return __en.settings_webhooks_event_post_approval_requested(inputs)
});
/**
* | output |
* | --- |
* | "Post approved" |
*
* @param {Settings_Webhooks_Event_Post_ApprovedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_webhooks_event_post_approved = /** @type {((inputs?: Settings_Webhooks_Event_Post_ApprovedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Webhooks_Event_Post_ApprovedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_webhooks_event_post_approved(inputs)
	if (locale === "cs") return __cs.settings_webhooks_event_post_approved(inputs)
	return __en.settings_webhooks_event_post_approved(inputs)
});
/**
* | output |
* | --- |
* | "Post finished on all its channels" |
*
* @param {Settings_Webhooks_Event_Post_CompletedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_webhooks_event_post_completed = /** @type {((inputs?: Settings_Webhooks_Event_Post_CompletedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Webhooks_Event_Post_CompletedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_webhooks_event_post_completed(inputs)
	if (locale === "cs") return __cs.settings_webhooks_event_post_completed(inputs)
	return __en.settings_webhooks_event_post_completed(inputs)
});
/**
* | output |
* | --- |
* | "Post rejected" |
*
* @param {Settings_Webhooks_Event_Post_RejectedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_webhooks_event_post_rejected = /** @type {((inputs?: Settings_Webhooks_Event_Post_RejectedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Webhooks_Event_Post_RejectedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_webhooks_event_post_rejected(inputs)
	if (locale === "cs") return __cs.settings_webhooks_event_post_rejected(inputs)
	return __en.settings_webhooks_event_post_rejected(inputs)
});
/**
* | output |
* | --- |
* | "Network app needs attention" |
*
* @param {Settings_Webhooks_Event_Provider_App_MisconfiguredInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_webhooks_event_provider_app_misconfigured = /** @type {((inputs?: Settings_Webhooks_Event_Provider_App_MisconfiguredInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Webhooks_Event_Provider_App_MisconfiguredInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_webhooks_event_provider_app_misconfigured(inputs)
	if (locale === "cs") return __cs.settings_webhooks_event_provider_app_misconfigured(inputs)
	return __en.settings_webhooks_event_provider_app_misconfigured(inputs)
});
/**
* | output |
* | --- |
* | "Test event" |
*
* @param {Settings_Webhooks_Event_Webhook_TestInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_webhooks_event_webhook_test = /** @type {((inputs?: Settings_Webhooks_Event_Webhook_TestInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Webhooks_Event_Webhook_TestInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_webhooks_event_webhook_test(inputs)
	if (locale === "cs") return __cs.settings_webhooks_event_webhook_test(inputs)
	return __en.settings_webhooks_event_webhook_test(inputs)
});
/**
* | output |
* | --- |
* | "Events" |
*
* @param {Settings_Webhooks_EventsInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_webhooks_events = /** @type {((inputs?: Settings_Webhooks_EventsInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Webhooks_EventsInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_webhooks_events(inputs)
	if (locale === "cs") return __cs.settings_webhooks_events(inputs)
	return __en.settings_webhooks_events(inputs)
});
/**
* | output |
* | --- |
* | "This endpoint was turned off because its deliveries kept failing. Fix the receiving server, then turn it back on." |
*
* @param {Settings_Webhooks_FailingInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_webhooks_failing = /** @type {((inputs?: Settings_Webhooks_FailingInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Webhooks_FailingInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_webhooks_failing(inputs)
	if (locale === "cs") return __cs.settings_webhooks_failing(inputs)
	return __en.settings_webhooks_failing(inputs)
});
/**
* | output |
* | --- |
* | "Deliveries have been failing since {time}." |
*
* @param {Settings_Webhooks_Failing_SinceInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_webhooks_failing_since = /** @type {((inputs: Settings_Webhooks_Failing_SinceInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Webhooks_Failing_SinceInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_webhooks_failing_since(inputs)
	if (locale === "cs") return __cs.settings_webhooks_failing_since(inputs)
	return __en.settings_webhooks_failing_since(inputs)
});
/**
* | output |
* | --- |
* | "HTTP {status}" |
*
* @param {Settings_Webhooks_Http_StatusInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_webhooks_http_status = /** @type {((inputs: Settings_Webhooks_Http_StatusInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Webhooks_Http_StatusInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_webhooks_http_status(inputs)
	if (locale === "cs") return __cs.settings_webhooks_http_status(inputs)
	return __en.settings_webhooks_http_status(inputs)
});
/**
* | output |
* | --- |
* | "Webhooks send an HTTPS request to your server whenever something happens in this workspace, such as a post going out or a channel needing to reconnect." |
*
* @param {Settings_Webhooks_IntroInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_webhooks_intro = /** @type {((inputs?: Settings_Webhooks_IntroInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Webhooks_IntroInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_webhooks_intro(inputs)
	if (locale === "cs") return __cs.settings_webhooks_intro(inputs)
	return __en.settings_webhooks_intro(inputs)
});
/**
* | output |
* | --- |
* | "Keep endpoint" |
*
* @param {Settings_Webhooks_Keep_EndpointInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_webhooks_keep_endpoint = /** @type {((inputs?: Settings_Webhooks_Keep_EndpointInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Webhooks_Keep_EndpointInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_webhooks_keep_endpoint(inputs)
	if (locale === "cs") return __cs.settings_webhooks_keep_endpoint(inputs)
	return __en.settings_webhooks_keep_endpoint(inputs)
});
/**
* | output |
* | --- |
* | "Keep secret" |
*
* @param {Settings_Webhooks_Keep_SecretInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_webhooks_keep_secret = /** @type {((inputs?: Settings_Webhooks_Keep_SecretInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Webhooks_Keep_SecretInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_webhooks_keep_secret(inputs)
	if (locale === "cs") return __cs.settings_webhooks_keep_secret(inputs)
	return __en.settings_webhooks_keep_secret(inputs)
});
/**
* | output |
* | --- |
* | "This workspace has as many endpoints as it can have. Delete one before you add another." |
*
* @param {Settings_Webhooks_LimitInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_webhooks_limit = /** @type {((inputs?: Settings_Webhooks_LimitInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Webhooks_LimitInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_webhooks_limit(inputs)
	if (locale === "cs") return __cs.settings_webhooks_limit(inputs)
	return __en.settings_webhooks_limit(inputs)
});
/**
* | output |
* | --- |
* | "Webhooks" |
*
* @param {Settings_Webhooks_NavInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_webhooks_nav = /** @type {((inputs?: Settings_Webhooks_NavInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Webhooks_NavInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_webhooks_nav(inputs)
	if (locale === "cs") return __cs.settings_webhooks_nav(inputs)
	return __en.settings_webhooks_nav(inputs)
});
/**
* | output |
* | --- |
* | "Next try {time}" |
*
* @param {Settings_Webhooks_Next_AttemptInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_webhooks_next_attempt = /** @type {((inputs: Settings_Webhooks_Next_AttemptInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Webhooks_Next_AttemptInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_webhooks_next_attempt(inputs)
	if (locale === "cs") return __cs.settings_webhooks_next_attempt(inputs)
	return __en.settings_webhooks_next_attempt(inputs)
});
/**
* | output |
* | --- |
* | "Off" |
*
* @param {Settings_Webhooks_OffInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_webhooks_off = /** @type {((inputs?: Settings_Webhooks_OffInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Webhooks_OffInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_webhooks_off(inputs)
	if (locale === "cs") return __cs.settings_webhooks_off(inputs)
	return __en.settings_webhooks_off(inputs)
});
/**
* | output |
* | --- |
* | "On" |
*
* @param {Settings_Webhooks_OnInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_webhooks_on = /** @type {((inputs?: Settings_Webhooks_OnInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Webhooks_OnInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_webhooks_on(inputs)
	if (locale === "cs") return __cs.settings_webhooks_on(inputs)
	return __en.settings_webhooks_on(inputs)
});
/**
* | output |
* | --- |
* | "Rotate secret" |
*
* @param {Settings_Webhooks_RotateInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_webhooks_rotate = /** @type {((inputs?: Settings_Webhooks_RotateInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Webhooks_RotateInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_webhooks_rotate(inputs)
	if (locale === "cs") return __cs.settings_webhooks_rotate(inputs)
	return __en.settings_webhooks_rotate(inputs)
});
/**
* | countPlural | output |
* | --- | --- |
* | "one" | "You get a new secret. For the next {count} hour, deliveries carry signatures from both secrets, so your server keeps accepting them while you switch over." |
* | * | "You get a new secret. For the next {count} hours, deliveries carry signatures from both secrets, so your server keeps accepting them while you switch over." |
*
* @param {Settings_Webhooks_Rotate_BodyInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_webhooks_rotate_body = /** @type {((inputs: Settings_Webhooks_Rotate_BodyInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Webhooks_Rotate_BodyInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_webhooks_rotate_body(inputs)
	if (locale === "cs") return __cs.settings_webhooks_rotate_body(inputs)
	return __en.settings_webhooks_rotate_body(inputs)
});
/**
* | output |
* | --- |
* | "Rotate" |
*
* @param {Settings_Webhooks_Rotate_ConfirmInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_webhooks_rotate_confirm = /** @type {((inputs?: Settings_Webhooks_Rotate_ConfirmInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Webhooks_Rotate_ConfirmInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_webhooks_rotate_confirm(inputs)
	if (locale === "cs") return __cs.settings_webhooks_rotate_confirm(inputs)
	return __en.settings_webhooks_rotate_confirm(inputs)
});
/**
* | output |
* | --- |
* | "Rotate the signing secret of {host}" |
*
* @param {Settings_Webhooks_Rotate_NamedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_webhooks_rotate_named = /** @type {((inputs: Settings_Webhooks_Rotate_NamedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Webhooks_Rotate_NamedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_webhooks_rotate_named(inputs)
	if (locale === "cs") return __cs.settings_webhooks_rotate_named(inputs)
	return __en.settings_webhooks_rotate_named(inputs)
});
/**
* | output |
* | --- |
* | "Rotate the signing secret?" |
*
* @param {Settings_Webhooks_Rotate_TitleInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_webhooks_rotate_title = /** @type {((inputs?: Settings_Webhooks_Rotate_TitleInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Webhooks_Rotate_TitleInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_webhooks_rotate_title(inputs)
	if (locale === "cs") return __cs.settings_webhooks_rotate_title(inputs)
	return __en.settings_webhooks_rotate_title(inputs)
});
/**
* | output |
* | --- |
* | "Endpoint saved" |
*
* @param {Settings_Webhooks_SavedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_webhooks_saved = /** @type {((inputs?: Settings_Webhooks_SavedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Webhooks_SavedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_webhooks_saved(inputs)
	if (locale === "cs") return __cs.settings_webhooks_saved(inputs)
	return __en.settings_webhooks_saved(inputs)
});
/**
* | output |
* | --- |
* | "Copy this secret now. You won't see it again." |
*
* @param {Settings_Webhooks_Secret_OnceInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_webhooks_secret_once = /** @type {((inputs?: Settings_Webhooks_Secret_OnceInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Webhooks_Secret_OnceInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_webhooks_secret_once(inputs)
	if (locale === "cs") return __cs.settings_webhooks_secret_once(inputs)
	return __en.settings_webhooks_secret_once(inputs)
});
/**
* | output |
* | --- |
* | "The previous secret keeps working until {time}." |
*
* @param {Settings_Webhooks_Secret_PreviousInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_webhooks_secret_previous = /** @type {((inputs: Settings_Webhooks_Secret_PreviousInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Webhooks_Secret_PreviousInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_webhooks_secret_previous(inputs)
	if (locale === "cs") return __cs.settings_webhooks_secret_previous(inputs)
	return __en.settings_webhooks_secret_previous(inputs)
});
/**
* | output |
* | --- |
* | "Signing secret" |
*
* @param {Settings_Webhooks_Secret_TitleInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_webhooks_secret_title = /** @type {((inputs?: Settings_Webhooks_Secret_TitleInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Webhooks_Secret_TitleInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_webhooks_secret_title(inputs)
	if (locale === "cs") return __cs.settings_webhooks_secret_title(inputs)
	return __en.settings_webhooks_secret_title(inputs)
});
/**
* | output |
* | --- |
* | "Your server uses it to check the webhook-signature header of every delivery." |
*
* @param {Settings_Webhooks_Secret_UseInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_webhooks_secret_use = /** @type {((inputs?: Settings_Webhooks_Secret_UseInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Webhooks_Secret_UseInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_webhooks_secret_use(inputs)
	if (locale === "cs") return __cs.settings_webhooks_secret_use(inputs)
	return __en.settings_webhooks_secret_use(inputs)
});
/**
* | output |
* | --- |
* | "Failed" |
*
* @param {Settings_Webhooks_State_DeadInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_webhooks_state_dead = /** @type {((inputs?: Settings_Webhooks_State_DeadInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Webhooks_State_DeadInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_webhooks_state_dead(inputs)
	if (locale === "cs") return __cs.settings_webhooks_state_dead(inputs)
	return __en.settings_webhooks_state_dead(inputs)
});
/**
* | output |
* | --- |
* | "Delivered" |
*
* @param {Settings_Webhooks_State_DeliveredInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_webhooks_state_delivered = /** @type {((inputs?: Settings_Webhooks_State_DeliveredInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Webhooks_State_DeliveredInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_webhooks_state_delivered(inputs)
	if (locale === "cs") return __cs.settings_webhooks_state_delivered(inputs)
	return __en.settings_webhooks_state_delivered(inputs)
});
/**
* | output |
* | --- |
* | "Sending" |
*
* @param {Settings_Webhooks_State_DeliveringInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_webhooks_state_delivering = /** @type {((inputs?: Settings_Webhooks_State_DeliveringInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Webhooks_State_DeliveringInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_webhooks_state_delivering(inputs)
	if (locale === "cs") return __cs.settings_webhooks_state_delivering(inputs)
	return __en.settings_webhooks_state_delivering(inputs)
});
/**
* | output |
* | --- |
* | "Waiting" |
*
* @param {Settings_Webhooks_State_PendingInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_webhooks_state_pending = /** @type {((inputs?: Settings_Webhooks_State_PendingInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Webhooks_State_PendingInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_webhooks_state_pending(inputs)
	if (locale === "cs") return __cs.settings_webhooks_state_pending(inputs)
	return __en.settings_webhooks_state_pending(inputs)
});
/**
* | output |
* | --- |
* | "Retry scheduled" |
*
* @param {Settings_Webhooks_State_Retry_WaitInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_webhooks_state_retry_wait = /** @type {((inputs?: Settings_Webhooks_State_Retry_WaitInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Webhooks_State_Retry_WaitInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_webhooks_state_retry_wait(inputs)
	if (locale === "cs") return __cs.settings_webhooks_state_retry_wait(inputs)
	return __en.settings_webhooks_state_retry_wait(inputs)
});
/**
* | output |
* | --- |
* | "Send test" |
*
* @param {Settings_Webhooks_TestInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_webhooks_test = /** @type {((inputs?: Settings_Webhooks_TestInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Webhooks_TestInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_webhooks_test(inputs)
	if (locale === "cs") return __cs.settings_webhooks_test(inputs)
	return __en.settings_webhooks_test(inputs)
});
/**
* | output |
* | --- |
* | "Turn the endpoint on before you send a test." |
*
* @param {Settings_Webhooks_Test_DisabledInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_webhooks_test_disabled = /** @type {((inputs?: Settings_Webhooks_Test_DisabledInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Webhooks_Test_DisabledInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_webhooks_test_disabled(inputs)
	if (locale === "cs") return __cs.settings_webhooks_test_disabled(inputs)
	return __en.settings_webhooks_test_disabled(inputs)
});
/**
* | output |
* | --- |
* | "You've sent too many test events to this endpoint. Try again in an hour." |
*
* @param {Settings_Webhooks_Test_LimitInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_webhooks_test_limit = /** @type {((inputs?: Settings_Webhooks_Test_LimitInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Webhooks_Test_LimitInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_webhooks_test_limit(inputs)
	if (locale === "cs") return __cs.settings_webhooks_test_limit(inputs)
	return __en.settings_webhooks_test_limit(inputs)
});
/**
* | output |
* | --- |
* | "Send a test event to {host}" |
*
* @param {Settings_Webhooks_Test_NamedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_webhooks_test_named = /** @type {((inputs: Settings_Webhooks_Test_NamedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Webhooks_Test_NamedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_webhooks_test_named(inputs)
	if (locale === "cs") return __cs.settings_webhooks_test_named(inputs)
	return __en.settings_webhooks_test_named(inputs)
});
/**
* | output |
* | --- |
* | "Test event queued. It goes out within a minute." |
*
* @param {Settings_Webhooks_Test_SentInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_webhooks_test_sent = /** @type {((inputs?: Settings_Webhooks_Test_SentInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Webhooks_Test_SentInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_webhooks_test_sent(inputs)
	if (locale === "cs") return __cs.settings_webhooks_test_sent(inputs)
	return __en.settings_webhooks_test_sent(inputs)
});
/**
* | output |
* | --- |
* | "Webhooks" |
*
* @param {Settings_Webhooks_TitleInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_webhooks_title = /** @type {((inputs?: Settings_Webhooks_TitleInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Webhooks_TitleInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_webhooks_title(inputs)
	if (locale === "cs") return __cs.settings_webhooks_title(inputs)
	return __en.settings_webhooks_title(inputs)
});
/**
* | output |
* | --- |
* | "Endpoint turned off" |
*
* @param {Settings_Webhooks_Turned_OffInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_webhooks_turned_off = /** @type {((inputs?: Settings_Webhooks_Turned_OffInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Webhooks_Turned_OffInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_webhooks_turned_off(inputs)
	if (locale === "cs") return __cs.settings_webhooks_turned_off(inputs)
	return __en.settings_webhooks_turned_off(inputs)
});
/**
* | output |
* | --- |
* | "Endpoint turned on" |
*
* @param {Settings_Webhooks_Turned_OnInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_webhooks_turned_on = /** @type {((inputs?: Settings_Webhooks_Turned_OnInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Webhooks_Turned_OnInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_webhooks_turned_on(inputs)
	if (locale === "cs") return __cs.settings_webhooks_turned_on(inputs)
	return __en.settings_webhooks_turned_on(inputs)
});
/**
* | output |
* | --- |
* | "Endpoint URL" |
*
* @param {Settings_Webhooks_UrlInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_webhooks_url = /** @type {((inputs?: Settings_Webhooks_UrlInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Webhooks_UrlInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_webhooks_url(inputs)
	if (locale === "cs") return __cs.settings_webhooks_url(inputs)
	return __en.settings_webhooks_url(inputs)
});
/**
* | output |
* | --- |
* | "An https address on the standard port, for example https://example.com/hooks." |
*
* @param {Settings_Webhooks_Url_HintInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_webhooks_url_hint = /** @type {((inputs?: Settings_Webhooks_Url_HintInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Webhooks_Url_HintInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_webhooks_url_hint(inputs)
	if (locale === "cs") return __cs.settings_webhooks_url_hint(inputs)
	return __en.settings_webhooks_url_hint(inputs)
});
/**
* | output |
* | --- |
* | "Use an https address on the standard port, with a host name and no user name or password." |
*
* @param {Settings_Webhooks_Url_InvalidInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_webhooks_url_invalid = /** @type {((inputs?: Settings_Webhooks_Url_InvalidInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Webhooks_Url_InvalidInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_webhooks_url_invalid(inputs)
	if (locale === "cs") return __cs.settings_webhooks_url_invalid(inputs)
	return __en.settings_webhooks_url_invalid(inputs)
});
/**
* | output |
* | --- |
* | "New {provider} channels connect through this app, and {provider} bills your developer account." |
*
* @param {Settings_Workspace_Apps_Active_NoteInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_workspace_apps_active_note = /** @type {((inputs: Settings_Workspace_Apps_Active_NoteInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Workspace_Apps_Active_NoteInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_workspace_apps_active_note(inputs)
	if (locale === "cs") return __cs.settings_workspace_apps_active_note(inputs)
	return __en.settings_workspace_apps_active_note(inputs)
});
/**
* | output |
* | --- |
* | "Callback URL" |
*
* @param {Settings_Workspace_Apps_CallbackInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_workspace_apps_callback = /** @type {((inputs?: Settings_Workspace_Apps_CallbackInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Workspace_Apps_CallbackInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_workspace_apps_callback(inputs)
	if (locale === "cs") return __cs.settings_workspace_apps_callback(inputs)
	return __en.settings_workspace_apps_callback(inputs)
});
/**
* | output |
* | --- |
* | "Add this callback URL to your app in the {provider} developer portal." |
*
* @param {Settings_Workspace_Apps_Callback_HintInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_workspace_apps_callback_hint = /** @type {((inputs: Settings_Workspace_Apps_Callback_HintInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Workspace_Apps_Callback_HintInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_workspace_apps_callback_hint(inputs)
	if (locale === "cs") return __cs.settings_workspace_apps_callback_hint(inputs)
	return __en.settings_workspace_apps_callback_hint(inputs)
});
/**
* | output |
* | --- |
* | "Cancel" |
*
* @param {Settings_Workspace_Apps_CancelInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_workspace_apps_cancel = /** @type {((inputs?: Settings_Workspace_Apps_CancelInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Workspace_Apps_CancelInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_workspace_apps_cancel(inputs)
	if (locale === "cs") return __cs.settings_workspace_apps_cancel(inputs)
	return __en.settings_workspace_apps_cancel(inputs)
});
/**
* | output |
* | --- |
* | "Client ID" |
*
* @param {Settings_Workspace_Apps_Client_IdInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_workspace_apps_client_id = /** @type {((inputs?: Settings_Workspace_Apps_Client_IdInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Workspace_Apps_Client_IdInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_workspace_apps_client_id(inputs)
	if (locale === "cs") return __cs.settings_workspace_apps_client_id(inputs)
	return __en.settings_workspace_apps_client_id(inputs)
});
/**
* | output |
* | --- |
* | "This client ID doesn't match the network's format. Copy it from the developer portal again." |
*
* @param {Settings_Workspace_Apps_Client_Id_InvalidInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_workspace_apps_client_id_invalid = /** @type {((inputs?: Settings_Workspace_Apps_Client_Id_InvalidInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Workspace_Apps_Client_Id_InvalidInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_workspace_apps_client_id_invalid(inputs)
	if (locale === "cs") return __cs.settings_workspace_apps_client_id_invalid(inputs)
	return __en.settings_workspace_apps_client_id_invalid(inputs)
});
/**
* | output |
* | --- |
* | "This client ID is already registered on this server." |
*
* @param {Settings_Workspace_Apps_Client_Id_TakenInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_workspace_apps_client_id_taken = /** @type {((inputs?: Settings_Workspace_Apps_Client_Id_TakenInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Workspace_Apps_Client_Id_TakenInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_workspace_apps_client_id_taken(inputs)
	if (locale === "cs") return __cs.settings_workspace_apps_client_id_taken(inputs)
	return __en.settings_workspace_apps_client_id_taken(inputs)
});
/**
* | output |
* | --- |
* | "Client secret" |
*
* @param {Settings_Workspace_Apps_Client_SecretInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_workspace_apps_client_secret = /** @type {((inputs?: Settings_Workspace_Apps_Client_SecretInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Workspace_Apps_Client_SecretInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_workspace_apps_client_secret(inputs)
	if (locale === "cs") return __cs.settings_workspace_apps_client_secret(inputs)
	return __en.settings_workspace_apps_client_secret(inputs)
});
/**
* | output |
* | --- |
* | "Paste the secret exactly as the developer portal shows it, without spaces or special characters." |
*
* @param {Settings_Workspace_Apps_Client_Secret_InvalidInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_workspace_apps_client_secret_invalid = /** @type {((inputs?: Settings_Workspace_Apps_Client_Secret_InvalidInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Workspace_Apps_Client_Secret_InvalidInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_workspace_apps_client_secret_invalid(inputs)
	if (locale === "cs") return __cs.settings_workspace_apps_client_secret_invalid(inputs)
	return __en.settings_workspace_apps_client_secret_invalid(inputs)
});
/**
* | output |
* | --- |
* | "Disable app" |
*
* @param {Settings_Workspace_Apps_DisableInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_workspace_apps_disable = /** @type {((inputs?: Settings_Workspace_Apps_DisableInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Workspace_Apps_DisableInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_workspace_apps_disable(inputs)
	if (locale === "cs") return __cs.settings_workspace_apps_disable(inputs)
	return __en.settings_workspace_apps_disable(inputs)
});
/**
* | output |
* | --- |
* | "Channels connected through this app stop publishing until you reconnect them. New {provider} connects then use this server's app, if it has one." |
*
* @param {Settings_Workspace_Apps_Disable_BodyInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_workspace_apps_disable_body = /** @type {((inputs: Settings_Workspace_Apps_Disable_BodyInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Workspace_Apps_Disable_BodyInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_workspace_apps_disable_body(inputs)
	if (locale === "cs") return __cs.settings_workspace_apps_disable_body(inputs)
	return __en.settings_workspace_apps_disable_body(inputs)
});
/**
* | output |
* | --- |
* | "Disable this app?" |
*
* @param {Settings_Workspace_Apps_Disable_TitleInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_workspace_apps_disable_title = /** @type {((inputs?: Settings_Workspace_Apps_Disable_TitleInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Workspace_Apps_Disable_TitleInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_workspace_apps_disable_title(inputs)
	if (locale === "cs") return __cs.settings_workspace_apps_disable_title(inputs)
	return __en.settings_workspace_apps_disable_title(inputs)
});
/**
* | output |
* | --- |
* | "App disabled" |
*
* @param {Settings_Workspace_Apps_DisabledInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_workspace_apps_disabled = /** @type {((inputs?: Settings_Workspace_Apps_DisabledInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Workspace_Apps_DisabledInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_workspace_apps_disabled(inputs)
	if (locale === "cs") return __cs.settings_workspace_apps_disabled(inputs)
	return __en.settings_workspace_apps_disabled(inputs)
});
/**
* | output |
* | --- |
* | "Your workspace already has an app for this network. Reload the page to see it." |
*
* @param {Settings_Workspace_Apps_ExistsInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_workspace_apps_exists = /** @type {((inputs?: Settings_Workspace_Apps_ExistsInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Workspace_Apps_ExistsInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_workspace_apps_exists(inputs)
	if (locale === "cs") return __cs.settings_workspace_apps_exists(inputs)
	return __en.settings_workspace_apps_exists(inputs)
});
/**
* | output |
* | --- |
* | "Right now, new {provider} channels connect through this server's app, if it has one. The server's operator pays {provider} for them, and your workspace pays ..." |
*
* @param {Settings_Workspace_Apps_InstanceInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_workspace_apps_instance = /** @type {((inputs: Settings_Workspace_Apps_InstanceInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Workspace_Apps_InstanceInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_workspace_apps_instance(inputs)
	if (locale === "cs") return __cs.settings_workspace_apps_instance(inputs)
	return __en.settings_workspace_apps_instance(inputs)
});
/**
* | output |
* | --- |
* | "Some networks bill the owner of the developer app for every post and read. Register your workspace's own app, and the network bills your developer account in..." |
*
* @param {Settings_Workspace_Apps_IntroInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_workspace_apps_intro = /** @type {((inputs?: Settings_Workspace_Apps_IntroInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Workspace_Apps_IntroInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_workspace_apps_intro(inputs)
	if (locale === "cs") return __cs.settings_workspace_apps_intro(inputs)
	return __en.settings_workspace_apps_intro(inputs)
});
/**
* | output |
* | --- |
* | "Keep app" |
*
* @param {Settings_Workspace_Apps_KeepInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_workspace_apps_keep = /** @type {((inputs?: Settings_Workspace_Apps_KeepInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Workspace_Apps_KeepInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_workspace_apps_keep(inputs)
	if (locale === "cs") return __cs.settings_workspace_apps_keep(inputs)
	return __en.settings_workspace_apps_keep(inputs)
});
/**
* | output |
* | --- |
* | "{provider} refused this app's credentials. Connecting {provider} channels fails until you replace the client secret here or fix the app's settings in the {pr..." |
*
* @param {Settings_Workspace_Apps_MisconfiguredInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_workspace_apps_misconfigured = /** @type {((inputs: Settings_Workspace_Apps_MisconfiguredInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Workspace_Apps_MisconfiguredInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_workspace_apps_misconfigured(inputs)
	if (locale === "cs") return __cs.settings_workspace_apps_misconfigured(inputs)
	return __en.settings_workspace_apps_misconfigured(inputs)
});
/**
* | output |
* | --- |
* | "Own apps" |
*
* @param {Settings_Workspace_Apps_NavInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_workspace_apps_nav = /** @type {((inputs?: Settings_Workspace_Apps_NavInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Workspace_Apps_NavInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_workspace_apps_nav(inputs)
	if (locale === "cs") return __cs.settings_workspace_apps_nav(inputs)
	return __en.settings_workspace_apps_nav(inputs)
});
/**
* | output |
* | --- |
* | "New client secret" |
*
* @param {Settings_Workspace_Apps_New_SecretInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_workspace_apps_new_secret = /** @type {((inputs?: Settings_Workspace_Apps_New_SecretInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Workspace_Apps_New_SecretInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_workspace_apps_new_secret(inputs)
	if (locale === "cs") return __cs.settings_workspace_apps_new_secret(inputs)
	return __en.settings_workspace_apps_new_secret(inputs)
});
/**
* | output |
* | --- |
* | "No network on this server takes a workspace's own app." |
*
* @param {Settings_Workspace_Apps_NoneInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_workspace_apps_none = /** @type {((inputs?: Settings_Workspace_Apps_NoneInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Workspace_Apps_NoneInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_workspace_apps_none(inputs)
	if (locale === "cs") return __cs.settings_workspace_apps_none(inputs)
	return __en.settings_workspace_apps_none(inputs)
});
/**
* | output |
* | --- |
* | "This network doesn't take a workspace's own app on this server." |
*
* @param {Settings_Workspace_Apps_Not_SupportedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_workspace_apps_not_supported = /** @type {((inputs?: Settings_Workspace_Apps_Not_SupportedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Workspace_Apps_Not_SupportedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_workspace_apps_not_supported(inputs)
	if (locale === "cs") return __cs.settings_workspace_apps_not_supported(inputs)
	return __en.settings_workspace_apps_not_supported(inputs)
});
/**
* | output |
* | --- |
* | "With your own app, your workspace pays {provider} directly for what it uses." |
*
* @param {Settings_Workspace_Apps_Own_HintInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_workspace_apps_own_hint = /** @type {((inputs: Settings_Workspace_Apps_Own_HintInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Workspace_Apps_Own_HintInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_workspace_apps_own_hint(inputs)
	if (locale === "cs") return __cs.settings_workspace_apps_own_hint(inputs)
	return __en.settings_workspace_apps_own_hint(inputs)
});
/**
* | output |
* | --- |
* | "Register app" |
*
* @param {Settings_Workspace_Apps_RegisterInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_workspace_apps_register = /** @type {((inputs?: Settings_Workspace_Apps_RegisterInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Workspace_Apps_RegisterInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_workspace_apps_register(inputs)
	if (locale === "cs") return __cs.settings_workspace_apps_register(inputs)
	return __en.settings_workspace_apps_register(inputs)
});
/**
* | output |
* | --- |
* | "App registered" |
*
* @param {Settings_Workspace_Apps_RegisteredInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_workspace_apps_registered = /** @type {((inputs?: Settings_Workspace_Apps_RegisteredInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Workspace_Apps_RegisteredInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_workspace_apps_registered(inputs)
	if (locale === "cs") return __cs.settings_workspace_apps_registered(inputs)
	return __en.settings_workspace_apps_registered(inputs)
});
/**
* | output |
* | --- |
* | "Replace secret" |
*
* @param {Settings_Workspace_Apps_ReplaceInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_workspace_apps_replace = /** @type {((inputs?: Settings_Workspace_Apps_ReplaceInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Workspace_Apps_ReplaceInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_workspace_apps_replace(inputs)
	if (locale === "cs") return __cs.settings_workspace_apps_replace(inputs)
	return __en.settings_workspace_apps_replace(inputs)
});
/**
* | output |
* | --- |
* | "Save secret" |
*
* @param {Settings_Workspace_Apps_Save_SecretInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_workspace_apps_save_secret = /** @type {((inputs?: Settings_Workspace_Apps_Save_SecretInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Workspace_Apps_Save_SecretInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_workspace_apps_save_secret(inputs)
	if (locale === "cs") return __cs.settings_workspace_apps_save_secret(inputs)
	return __en.settings_workspace_apps_save_secret(inputs)
});
/**
* | output |
* | --- |
* | "Client secret replaced" |
*
* @param {Settings_Workspace_Apps_Secret_ReplacedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_workspace_apps_secret_replaced = /** @type {((inputs?: Settings_Workspace_Apps_Secret_ReplacedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Workspace_Apps_Secret_ReplacedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_workspace_apps_secret_replaced(inputs)
	if (locale === "cs") return __cs.settings_workspace_apps_secret_replaced(inputs)
	return __en.settings_workspace_apps_secret_replaced(inputs)
});
/**
* | output |
* | --- |
* | "Status" |
*
* @param {Settings_Workspace_Apps_StatusInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_workspace_apps_status = /** @type {((inputs?: Settings_Workspace_Apps_StatusInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Workspace_Apps_StatusInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_workspace_apps_status(inputs)
	if (locale === "cs") return __cs.settings_workspace_apps_status(inputs)
	return __en.settings_workspace_apps_status(inputs)
});
/**
* | output |
* | --- |
* | "Active" |
*
* @param {Settings_Workspace_Apps_Status_ActiveInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_workspace_apps_status_active = /** @type {((inputs?: Settings_Workspace_Apps_Status_ActiveInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Workspace_Apps_Status_ActiveInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_workspace_apps_status_active(inputs)
	if (locale === "cs") return __cs.settings_workspace_apps_status_active(inputs)
	return __en.settings_workspace_apps_status_active(inputs)
});
/**
* | output |
* | --- |
* | "Needs attention" |
*
* @param {Settings_Workspace_Apps_Status_MisconfiguredInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_workspace_apps_status_misconfigured = /** @type {((inputs?: Settings_Workspace_Apps_Status_MisconfiguredInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Workspace_Apps_Status_MisconfiguredInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_workspace_apps_status_misconfigured(inputs)
	if (locale === "cs") return __cs.settings_workspace_apps_status_misconfigured(inputs)
	return __en.settings_workspace_apps_status_misconfigured(inputs)
});
/**
* | output |
* | --- |
* | "Your own network apps" |
*
* @param {Settings_Workspace_Apps_TitleInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const settings_workspace_apps_title = /** @type {((inputs?: Settings_Workspace_Apps_TitleInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Settings_Workspace_Apps_TitleInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.settings_workspace_apps_title(inputs)
	if (locale === "cs") return __cs.settings_workspace_apps_title(inputs)
	return __en.settings_workspace_apps_title(inputs)
});
/**
* | output |
* | --- |
* | "Upgrade now" |
*
* @param {System_Api_CriticalInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const system_api_critical = /** @type {((inputs?: System_Api_CriticalInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<System_Api_CriticalInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.system_api_critical(inputs)
	if (locale === "cs") return __cs.system_api_critical(inputs)
	return __en.system_api_critical(inputs)
});
/**
* | countPlural | output |
* | --- | --- |
* | "one" | "{count} day left" |
* | * | "{count} days left" |
*
* @param {System_Api_Days_LeftInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const system_api_days_left = /** @type {((inputs: System_Api_Days_LeftInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<System_Api_Days_LeftInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.system_api_days_left(inputs)
	if (locale === "cs") return __cs.system_api_days_left(inputs)
	return __en.system_api_days_left(inputs)
});
/**
* | output |
* | --- |
* | "Support has ended" |
*
* @param {System_Api_EndedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const system_api_ended = /** @type {((inputs?: System_Api_EndedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<System_Api_EndedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.system_api_ended(inputs)
	if (locale === "cs") return __cs.system_api_ended(inputs)
	return __en.system_api_ended(inputs)
});
/**
* | output |
* | --- |
* | "No end date announced" |
*
* @param {System_Api_No_SunsetInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const system_api_no_sunset = /** @type {((inputs?: System_Api_No_SunsetInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<System_Api_No_SunsetInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.system_api_no_sunset(inputs)
	if (locale === "cs") return __cs.system_api_no_sunset(inputs)
	return __en.system_api_no_sunset(inputs)
});
/**
* | output |
* | --- |
* | "Support ends {date}" |
*
* @param {System_Api_SunsetInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const system_api_sunset = /** @type {((inputs: System_Api_SunsetInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<System_Api_SunsetInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.system_api_sunset(inputs)
	if (locale === "cs") return __cs.system_api_sunset(inputs)
	return __en.system_api_sunset(inputs)
});
/**
* | output |
* | --- |
* | "Network API versions" |
*
* @param {System_Api_TitleInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const system_api_title = /** @type {((inputs?: System_Api_TitleInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<System_Api_TitleInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.system_api_title(inputs)
	if (locale === "cs") return __cs.system_api_title(inputs)
	return __en.system_api_title(inputs)
});
/**
* | output |
* | --- |
* | "Version {version}" |
*
* @param {System_Api_VersionInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const system_api_version = /** @type {((inputs: System_Api_VersionInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<System_Api_VersionInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.system_api_version(inputs)
	if (locale === "cs") return __cs.system_api_version(inputs)
	return __en.system_api_version(inputs)
});
/**
* | output |
* | --- |
* | "Upgrade soon" |
*
* @param {System_Api_WarnInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const system_api_warn = /** @type {((inputs?: System_Api_WarnInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<System_Api_WarnInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.system_api_warn(inputs)
	if (locale === "cs") return __cs.system_api_warn(inputs)
	return __en.system_api_warn(inputs)
});
/**
* | output |
* | --- |
* | "Took {duration}" |
*
* @param {System_Cron_DurationInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const system_cron_duration = /** @type {((inputs: System_Cron_DurationInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<System_Cron_DurationInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.system_cron_duration(inputs)
	if (locale === "cs") return __cs.system_cron_duration(inputs)
	return __en.system_cron_duration(inputs)
});
/**
* | output |
* | --- |
* | "Failed" |
*
* @param {System_Cron_FailedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const system_cron_failed = /** @type {((inputs?: System_Cron_FailedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<System_Cron_FailedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.system_cron_failed(inputs)
	if (locale === "cs") return __cs.system_cron_failed(inputs)
	return __en.system_cron_failed(inputs)
});
/**
* | output |
* | --- |
* | "Last started {when}" |
*
* @param {System_Cron_Last_RunInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const system_cron_last_run = /** @type {((inputs: System_Cron_Last_RunInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<System_Cron_Last_RunInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.system_cron_last_run(inputs)
	if (locale === "cs") return __cs.system_cron_last_run(inputs)
	return __en.system_cron_last_run(inputs)
});
/**
* | output |
* | --- |
* | "Never ran" |
*
* @param {System_Cron_NeverInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const system_cron_never = /** @type {((inputs?: System_Cron_NeverInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<System_Cron_NeverInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.system_cron_never(inputs)
	if (locale === "cs") return __cs.system_cron_never(inputs)
	return __en.system_cron_never(inputs)
});
/**
* | output |
* | --- |
* | "Running" |
*
* @param {System_Cron_RunningInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const system_cron_running = /** @type {((inputs?: System_Cron_RunningInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<System_Cron_RunningInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.system_cron_running(inputs)
	if (locale === "cs") return __cs.system_cron_running(inputs)
	return __en.system_cron_running(inputs)
});
/**
* | output |
* | --- |
* | "Overdue" |
*
* @param {System_Cron_StaleInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const system_cron_stale = /** @type {((inputs?: System_Cron_StaleInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<System_Cron_StaleInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.system_cron_stale(inputs)
	if (locale === "cs") return __cs.system_cron_stale(inputs)
	return __en.system_cron_stale(inputs)
});
/**
* | output |
* | --- |
* | "Background jobs" |
*
* @param {System_Cron_TitleInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const system_cron_title = /** @type {((inputs?: System_Cron_TitleInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<System_Cron_TitleInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.system_cron_title(inputs)
	if (locale === "cs") return __cs.system_cron_title(inputs)
	return __en.system_cron_title(inputs)
});
/**
* | output |
* | --- |
* | "App credentials rejected" |
*
* @param {System_Incident_App_Credentials_InvalidInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const system_incident_app_credentials_invalid = /** @type {((inputs?: System_Incident_App_Credentials_InvalidInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<System_Incident_App_Credentials_InvalidInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.system_incident_app_credentials_invalid(inputs)
	if (locale === "cs") return __cs.system_incident_app_credentials_invalid(inputs)
	return __en.system_incident_app_credentials_invalid(inputs)
});
/**
* | output |
* | --- |
* | "App suspended" |
*
* @param {System_Incident_App_SuspendedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const system_incident_app_suspended = /** @type {((inputs?: System_Incident_App_SuspendedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<System_Incident_App_SuspendedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.system_incident_app_suspended(inputs)
	if (locale === "cs") return __cs.system_incident_app_suspended(inputs)
	return __en.system_incident_app_suspended(inputs)
});
/**
* | countPlural | output |
* | --- | --- |
* | "one" | "{count} occurrence" |
* | * | "{count} occurrences" |
*
* @param {System_Incident_OccurrencesInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const system_incident_occurrences = /** @type {((inputs: System_Incident_OccurrencesInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<System_Incident_OccurrencesInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.system_incident_occurrences(inputs)
	if (locale === "cs") return __cs.system_incident_occurrences(inputs)
	return __en.system_incident_occurrences(inputs)
});
/**
* | output |
* | --- |
* | "Open" |
*
* @param {System_Incident_OpenInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const system_incident_open = /** @type {((inputs?: System_Incident_OpenInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<System_Incident_OpenInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.system_incident_open(inputs)
	if (locale === "cs") return __cs.system_incident_open(inputs)
	return __en.system_incident_open(inputs)
});
/**
* | output |
* | --- |
* | "Network outage" |
*
* @param {System_Incident_Provider_OutageInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const system_incident_provider_outage = /** @type {((inputs?: System_Incident_Provider_OutageInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<System_Incident_Provider_OutageInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.system_incident_provider_outage(inputs)
	if (locale === "cs") return __cs.system_incident_provider_outage(inputs)
	return __en.system_incident_provider_outage(inputs)
});
/**
* | output |
* | --- |
* | "App hit its rate limit" |
*
* @param {System_Incident_Rate_Limited_AppInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const system_incident_rate_limited_app = /** @type {((inputs?: System_Incident_Rate_Limited_AppInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<System_Incident_Rate_Limited_AppInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.system_incident_rate_limited_app(inputs)
	if (locale === "cs") return __cs.system_incident_rate_limited_app(inputs)
	return __en.system_incident_rate_limited_app(inputs)
});
/**
* | output |
* | --- |
* | "Resolved {when}" |
*
* @param {System_Incident_ResolvedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const system_incident_resolved = /** @type {((inputs: System_Incident_ResolvedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<System_Incident_ResolvedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.system_incident_resolved(inputs)
	if (locale === "cs") return __cs.system_incident_resolved(inputs)
	return __en.system_incident_resolved(inputs)
});
/**
* | output |
* | --- |
* | "First seen {first}, last seen {last}" |
*
* @param {System_Incident_SeenInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const system_incident_seen = /** @type {((inputs: System_Incident_SeenInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<System_Incident_SeenInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.system_incident_seen(inputs)
	if (locale === "cs") return __cs.system_incident_seen(inputs)
	return __en.system_incident_seen(inputs)
});
/**
* | output |
* | --- |
* | "API access level missing" |
*
* @param {System_Incident_Tier_Not_EnrolledInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const system_incident_tier_not_enrolled = /** @type {((inputs?: System_Incident_Tier_Not_EnrolledInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<System_Incident_Tier_Not_EnrolledInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.system_incident_tier_not_enrolled(inputs)
	if (locale === "cs") return __cs.system_incident_tier_not_enrolled(inputs)
	return __en.system_incident_tier_not_enrolled(inputs)
});
/**
* | output |
* | --- |
* | "No incidents in the last 7 days." |
*
* @param {System_Incidents_EmptyInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const system_incidents_empty = /** @type {((inputs?: System_Incidents_EmptyInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<System_Incidents_EmptyInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.system_incidents_empty(inputs)
	if (locale === "cs") return __cs.system_incidents_empty(inputs)
	return __en.system_incidents_empty(inputs)
});
/**
* | output |
* | --- |
* | "Network incidents" |
*
* @param {System_Incidents_TitleInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const system_incidents_title = /** @type {((inputs?: System_Incidents_TitleInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<System_Incidents_TitleInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.system_incidents_title(inputs)
	if (locale === "cs") return __cs.system_incidents_title(inputs)
	return __en.system_incidents_title(inputs)
});
/**
* | output |
* | --- |
* | "No data" |
*
* @param {System_No_DataInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const system_no_data = /** @type {((inputs?: System_No_DataInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<System_No_DataInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.system_no_data(inputs)
	if (locale === "cs") return __cs.system_no_data(inputs)
	return __en.system_no_data(inputs)
});
/**
* | output |
* | --- |
* | "OK" |
*
* @param {System_OkInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const system_ok = /** @type {((inputs?: System_OkInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<System_OkInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.system_ok(inputs)
	if (locale === "cs") return __cs.system_ok(inputs)
	return __en.system_ok(inputs)
});
/**
* | output |
* | --- |
* | "Last 24 hours" |
*
* @param {System_Slo_DayInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const system_slo_day = /** @type {((inputs?: System_Slo_DayInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<System_Slo_DayInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.system_slo_day(inputs)
	if (locale === "cs") return __cs.system_slo_day(inputs)
	return __en.system_slo_day(inputs)
});
/**
* | output |
* | --- |
* | "Published twice" |
*
* @param {System_Slo_DuplicatesInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const system_slo_duplicates = /** @type {((inputs?: System_Slo_DuplicatesInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<System_Slo_DuplicatesInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.system_slo_duplicates(inputs)
	if (locale === "cs") return __cs.system_slo_duplicates(inputs)
	return __en.system_slo_duplicates(inputs)
});
/**
* | output |
* | --- |
* | "Published on time" |
*
* @param {System_Slo_On_TimeInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const system_slo_on_time = /** @type {((inputs?: System_Slo_On_TimeInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<System_Slo_On_TimeInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.system_slo_on_time(inputs)
	if (locale === "cs") return __cs.system_slo_on_time(inputs)
	return __en.system_slo_on_time(inputs)
});
/**
* | output |
* | --- |
* | "Publishing goals" |
*
* @param {System_Slo_TitleInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const system_slo_title = /** @type {((inputs?: System_Slo_TitleInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<System_Slo_TitleInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.system_slo_title(inputs)
	if (locale === "cs") return __cs.system_slo_title(inputs)
	return __en.system_slo_title(inputs)
});
/**
* | countPlural | output |
* | --- | --- |
* | "one" | "{count} automatic post" |
* | * | "{count} automatic posts" |
*
* @param {System_Slo_TotalInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const system_slo_total = /** @type {((inputs: System_Slo_TotalInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<System_Slo_TotalInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.system_slo_total(inputs)
	if (locale === "cs") return __cs.system_slo_total(inputs)
	return __en.system_slo_total(inputs)
});
/**
* | output |
* | --- |
* | "Unconfirmed" |
*
* @param {System_Slo_UnconfirmedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const system_slo_unconfirmed = /** @type {((inputs?: System_Slo_UnconfirmedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<System_Slo_UnconfirmedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.system_slo_unconfirmed(inputs)
	if (locale === "cs") return __cs.system_slo_unconfirmed(inputs)
	return __en.system_slo_unconfirmed(inputs)
});
/**
* | output |
* | --- |
* | "Last 7 days" |
*
* @param {System_Slo_WeekInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const system_slo_week = /** @type {((inputs?: System_Slo_WeekInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<System_Slo_WeekInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.system_slo_week(inputs)
	if (locale === "cs") return __cs.system_slo_week(inputs)
	return __en.system_slo_week(inputs)
});
/**
* | output |
* | --- |
* | "On target" |
*
* @param {System_Target_MetInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const system_target_met = /** @type {((inputs?: System_Target_MetInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<System_Target_MetInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.system_target_met(inputs)
	if (locale === "cs") return __cs.system_target_met(inputs)
	return __en.system_target_met(inputs)
});
/**
* | output |
* | --- |
* | "Missed" |
*
* @param {System_Target_MissedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const system_target_missed = /** @type {((inputs?: System_Target_MissedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<System_Target_MissedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.system_target_missed(inputs)
	if (locale === "cs") return __cs.system_target_missed(inputs)
	return __en.system_target_missed(inputs)
});
/**
* | output |
* | --- |
* | "Dark" |
*
* @param {Theme_Option_DarkInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const theme_option_dark = /** @type {((inputs?: Theme_Option_DarkInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Theme_Option_DarkInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.theme_option_dark(inputs)
	if (locale === "cs") return __cs.theme_option_dark(inputs)
	return __en.theme_option_dark(inputs)
});
/**
* | output |
* | --- |
* | "Light" |
*
* @param {Theme_Option_LightInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const theme_option_light = /** @type {((inputs?: Theme_Option_LightInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Theme_Option_LightInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.theme_option_light(inputs)
	if (locale === "cs") return __cs.theme_option_light(inputs)
	return __en.theme_option_light(inputs)
});
/**
* | output |
* | --- |
* | "System" |
*
* @param {Theme_Option_SystemInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const theme_option_system = /** @type {((inputs?: Theme_Option_SystemInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Theme_Option_SystemInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.theme_option_system(inputs)
	if (locale === "cs") return __cs.theme_option_system(inputs)
	return __en.theme_option_system(inputs)
});