import { getLocale, experimentalStaticLocale } from "../runtime.js"

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Integrations_Api_Keys_AccessInputs */
/** @typedef {{}} Integrations_Api_Keys_Access_BrandsInputs */
/** @typedef {{}} Integrations_Api_Keys_Access_ChannelsInputs */
/** @typedef {{}} Integrations_Api_Keys_Access_EmptyInputs */
/** @typedef {{}} Integrations_Api_Keys_Access_InvalidInputs */
/** @typedef {{}} Integrations_Api_Keys_Access_No_BrandsInputs */
/** @typedef {{}} Integrations_Api_Keys_Access_No_ChannelsInputs */
/** @typedef {{}} Integrations_Api_Keys_Access_Not_RestrictedInputs */
/** @typedef {{}} Integrations_Api_Keys_Access_RestrictedInputs */
/** @typedef {{}} Integrations_Api_Keys_Access_WorkspaceInputs */
/** @typedef {{}} Integrations_Api_Keys_AddInputs */
/** @typedef {{ count: NonNullable<unknown> }} Integrations_Api_Keys_Brand_CountInputs */
/** @typedef {{}} Integrations_Api_Keys_CancelInputs */
/** @typedef {{ count: NonNullable<unknown> }} Integrations_Api_Keys_Channel_CountInputs */
/** @typedef {{}} Integrations_Api_Keys_CopiedInputs */
/** @typedef {{}} Integrations_Api_Keys_CopyInputs */
/** @typedef {{}} Integrations_Api_Keys_Copy_FailedInputs */
/** @typedef {{}} Integrations_Api_Keys_CreateInputs */
/** @typedef {{}} Integrations_Api_Keys_CreatedInputs */
/** @typedef {{ time: NonNullable<unknown> }} Integrations_Api_Keys_Created_AtInputs */
/** @typedef {{}} Integrations_Api_Keys_DoneInputs */
/** @typedef {{}} Integrations_Api_Keys_EmptyInputs */
/** @typedef {{ time: NonNullable<unknown> }} Integrations_Api_Keys_Expired_AtInputs */
/** @typedef {{ time: NonNullable<unknown> }} Integrations_Api_Keys_ExpiresInputs */
/** @typedef {{}} Integrations_Api_Keys_ExpiryInputs */
/** @typedef {{}} Integrations_Api_Keys_Expiry_HintInputs */
/** @typedef {{}} Integrations_Api_Keys_Expiry_In_PastInputs */
/** @typedef {{}} Integrations_Api_Keys_IntroInputs */
/** @typedef {{}} Integrations_Api_Keys_KeepInputs */
/** @typedef {{}} Integrations_Api_Keys_MoreInputs */
/** @typedef {{}} Integrations_Api_Keys_NameInputs */
/** @typedef {{}} Integrations_Api_Keys_Name_HintInputs */
/** @typedef {{ max: NonNullable<unknown> }} Integrations_Api_Keys_Name_InvalidInputs */
/** @typedef {{}} Integrations_Api_Keys_Never_ExpiresInputs */
/** @typedef {{ prefix: NonNullable<unknown> }} Integrations_Api_Keys_PrefixInputs */
/** @typedef {{ count: NonNullable<unknown> }} Integrations_Api_Keys_RateInputs */
/** @typedef {{ count: NonNullable<unknown> }} Integrations_Api_Keys_Rate_DefaultInputs */
/** @typedef {{}} Integrations_Api_Keys_Rate_LimitInputs */
/** @typedef {{ max: NonNullable<unknown>, count: NonNullable<unknown> }} Integrations_Api_Keys_Rate_Limit_HintInputs */
/** @typedef {{ max: NonNullable<unknown> }} Integrations_Api_Keys_Rate_Limit_InvalidInputs */
/** @typedef {{ reach: NonNullable<unknown> }} Integrations_Api_Keys_RestrictedInputs */
/** @typedef {{}} Integrations_Api_Keys_Restricted_NothingInputs */
/** @typedef {{}} Integrations_Api_Keys_RevokeInputs */
/** @typedef {{}} Integrations_Api_Keys_Revoke_BodyInputs */
/** @typedef {{ name: NonNullable<unknown> }} Integrations_Api_Keys_Revoke_NamedInputs */
/** @typedef {{}} Integrations_Api_Keys_Revoke_TitleInputs */
/** @typedef {{}} Integrations_Api_Keys_RevokedInputs */
/** @typedef {{ time: NonNullable<unknown> }} Integrations_Api_Keys_Revoked_AtInputs */
/** @typedef {{}} Integrations_Api_Keys_Scope_Ai_GenerateInputs */
/** @typedef {{}} Integrations_Api_Keys_Scope_Analytics_ReadInputs */
/** @typedef {{}} Integrations_Api_Keys_Scope_Audit_ReadInputs */
/** @typedef {{}} Integrations_Api_Keys_Scope_Brands_ReadInputs */
/** @typedef {{}} Integrations_Api_Keys_Scope_Channels_ReadInputs */
/** @typedef {{}} Integrations_Api_Keys_Scope_Comments_ReadInputs */
/** @typedef {{}} Integrations_Api_Keys_Scope_Comments_WriteInputs */
/** @typedef {{}} Integrations_Api_Keys_Scope_Groups_ReadInputs */
/** @typedef {{}} Integrations_Api_Keys_Scope_Media_ReadInputs */
/** @typedef {{}} Integrations_Api_Keys_Scope_Media_WriteInputs */
/** @typedef {{}} Integrations_Api_Keys_Scope_Posts_CancelInputs */
/** @typedef {{}} Integrations_Api_Keys_Scope_Posts_DraftInputs */
/** @typedef {{}} Integrations_Api_Keys_Scope_Posts_ReadInputs */
/** @typedef {{}} Integrations_Api_Keys_Scope_Posts_ScheduleInputs */
/** @typedef {{}} Integrations_Api_Keys_Scope_Posts_SubmitInputs */
/** @typedef {{}} Integrations_Api_Keys_ScopesInputs */
/** @typedef {{}} Integrations_Api_Keys_Scopes_HintInputs */
/** @typedef {{}} Integrations_Api_Keys_Scopes_InvalidInputs */
/** @typedef {{}} Integrations_Api_Keys_Status_ActiveInputs */
/** @typedef {{}} Integrations_Api_Keys_Status_ExpiredInputs */
/** @typedef {{}} Integrations_Api_Keys_Status_RevokedInputs */
/** @typedef {{}} Integrations_Api_Keys_TitleInputs */
/** @typedef {{}} Integrations_Api_Keys_Token_OnceInputs */
/** @typedef {{}} Integrations_Api_Keys_Token_TitleInputs */
/** @typedef {{}} Integrations_Api_Keys_Token_UseInputs */
/** @typedef {{}} Integrations_Api_Keys_Whole_WorkspaceInputs */
/** @typedef {{}} Integrations_Read_OnlyInputs */
/** @typedef {{}} Integrations_Webhooks_AddInputs */
/** @typedef {{ count: NonNullable<unknown> }} Integrations_Webhooks_AttemptsInputs */
/** @typedef {{}} Integrations_Webhooks_CancelInputs */
/** @typedef {{}} Integrations_Webhooks_CloseInputs */
/** @typedef {{}} Integrations_Webhooks_CopiedInputs */
/** @typedef {{}} Integrations_Webhooks_CopyInputs */
/** @typedef {{}} Integrations_Webhooks_Copy_FailedInputs */
/** @typedef {{}} Integrations_Webhooks_DeleteInputs */
/** @typedef {{}} Integrations_Webhooks_Delete_BodyInputs */
/** @typedef {{ host: NonNullable<unknown> }} Integrations_Webhooks_Delete_NamedInputs */
/** @typedef {{}} Integrations_Webhooks_Delete_TitleInputs */
/** @typedef {{}} Integrations_Webhooks_DeletedInputs */
/** @typedef {{}} Integrations_Webhooks_DeliveriesInputs */
/** @typedef {{}} Integrations_Webhooks_Deliveries_EmptyInputs */
/** @typedef {{}} Integrations_Webhooks_Deliveries_MoreInputs */
/** @typedef {{ host: NonNullable<unknown> }} Integrations_Webhooks_Deliveries_NamedInputs */
/** @typedef {{}} Integrations_Webhooks_DoneInputs */
/** @typedef {{}} Integrations_Webhooks_EditInputs */
/** @typedef {{ host: NonNullable<unknown> }} Integrations_Webhooks_Edit_NamedInputs */
/** @typedef {{}} Integrations_Webhooks_Edit_TitleInputs */
/** @typedef {{}} Integrations_Webhooks_EmptyInputs */
/** @typedef {{ host: NonNullable<unknown> }} Integrations_Webhooks_Enabled_NamedInputs */
/** @typedef {{ code: NonNullable<unknown> }} Integrations_Webhooks_Error_CodeInputs */
/** @typedef {{}} Integrations_Webhooks_Event_Channel_ExpiringInputs */
/** @typedef {{}} Integrations_Webhooks_Event_Channel_Needs_ReauthInputs */
/** @typedef {{}} Integrations_Webhooks_Event_Channel_ReconnectedInputs */
/** @typedef {{}} Integrations_Webhooks_Event_Destination_Awaiting_ManualInputs */
/** @typedef {{}} Integrations_Webhooks_Event_Destination_BlockedInputs */
/** @typedef {{}} Integrations_Webhooks_Event_Destination_FailedInputs */
/** @typedef {{}} Integrations_Webhooks_Event_Destination_PublishedInputs */
/** @typedef {{}} Integrations_Webhooks_Event_Destination_UnconfirmedInputs */
/** @typedef {{}} Integrations_Webhooks_Event_Post_Approval_RequestedInputs */
/** @typedef {{}} Integrations_Webhooks_Event_Post_ApprovedInputs */
/** @typedef {{}} Integrations_Webhooks_Event_Post_CompletedInputs */
/** @typedef {{}} Integrations_Webhooks_Event_Post_RejectedInputs */
/** @typedef {{}} Integrations_Webhooks_Event_Provider_App_MisconfiguredInputs */
/** @typedef {{}} Integrations_Webhooks_Event_Webhook_TestInputs */
/** @typedef {{}} Integrations_Webhooks_EventsInputs */
/** @typedef {{}} Integrations_Webhooks_FailingInputs */
/** @typedef {{ time: NonNullable<unknown> }} Integrations_Webhooks_Failing_SinceInputs */
/** @typedef {{ status: NonNullable<unknown> }} Integrations_Webhooks_Http_StatusInputs */
/** @typedef {{}} Integrations_Webhooks_IntroInputs */
/** @typedef {{}} Integrations_Webhooks_Keep_EndpointInputs */
/** @typedef {{}} Integrations_Webhooks_Keep_SecretInputs */
/** @typedef {{}} Integrations_Webhooks_LimitInputs */
/** @typedef {{ time: NonNullable<unknown> }} Integrations_Webhooks_Next_AttemptInputs */
/** @typedef {{}} Integrations_Webhooks_OffInputs */
/** @typedef {{}} Integrations_Webhooks_OnInputs */
/** @typedef {{}} Integrations_Webhooks_RotateInputs */
/** @typedef {{ count: NonNullable<unknown> }} Integrations_Webhooks_Rotate_BodyInputs */
/** @typedef {{}} Integrations_Webhooks_Rotate_ConfirmInputs */
/** @typedef {{ host: NonNullable<unknown> }} Integrations_Webhooks_Rotate_NamedInputs */
/** @typedef {{}} Integrations_Webhooks_Rotate_TitleInputs */
/** @typedef {{}} Integrations_Webhooks_SavedInputs */
/** @typedef {{}} Integrations_Webhooks_Secret_OnceInputs */
/** @typedef {{ time: NonNullable<unknown> }} Integrations_Webhooks_Secret_PreviousInputs */
/** @typedef {{}} Integrations_Webhooks_Secret_TitleInputs */
/** @typedef {{}} Integrations_Webhooks_Secret_UseInputs */
/** @typedef {{}} Integrations_Webhooks_State_DeadInputs */
/** @typedef {{}} Integrations_Webhooks_State_DeliveredInputs */
/** @typedef {{}} Integrations_Webhooks_State_DeliveringInputs */
/** @typedef {{}} Integrations_Webhooks_State_PendingInputs */
/** @typedef {{}} Integrations_Webhooks_State_Retry_WaitInputs */
/** @typedef {{}} Integrations_Webhooks_TestInputs */
/** @typedef {{}} Integrations_Webhooks_Test_DisabledInputs */
/** @typedef {{}} Integrations_Webhooks_Test_LimitInputs */
/** @typedef {{ host: NonNullable<unknown> }} Integrations_Webhooks_Test_NamedInputs */
/** @typedef {{}} Integrations_Webhooks_Test_SentInputs */
/** @typedef {{}} Integrations_Webhooks_TitleInputs */
/** @typedef {{}} Integrations_Webhooks_Turned_OffInputs */
/** @typedef {{}} Integrations_Webhooks_Turned_OnInputs */
/** @typedef {{}} Integrations_Webhooks_UrlInputs */
/** @typedef {{}} Integrations_Webhooks_Url_HintInputs */
/** @typedef {{}} Integrations_Webhooks_Url_InvalidInputs */
import * as __en from "./en.js"
import * as __sk from "./sk.js"
import * as __cs from "./cs.js"
/**
* | output |
* | --- |
* | "Access" |
*
* @param {Integrations_Api_Keys_AccessInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_api_keys_access = /** @type {((inputs?: Integrations_Api_Keys_AccessInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Api_Keys_AccessInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_api_keys_access(inputs)
	if (locale === "cs") return __cs.integrations_api_keys_access(inputs)
	return __en.integrations_api_keys_access(inputs)
});
/**
* | output |
* | --- |
* | "Brands" |
*
* @param {Integrations_Api_Keys_Access_BrandsInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_api_keys_access_brands = /** @type {((inputs?: Integrations_Api_Keys_Access_BrandsInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Api_Keys_Access_BrandsInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_api_keys_access_brands(inputs)
	if (locale === "cs") return __cs.integrations_api_keys_access_brands(inputs)
	return __en.integrations_api_keys_access_brands(inputs)
});
/**
* | output |
* | --- |
* | "Channels" |
*
* @param {Integrations_Api_Keys_Access_ChannelsInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_api_keys_access_channels = /** @type {((inputs?: Integrations_Api_Keys_Access_ChannelsInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Api_Keys_Access_ChannelsInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_api_keys_access_channels(inputs)
	if (locale === "cs") return __cs.integrations_api_keys_access_channels(inputs)
	return __en.integrations_api_keys_access_channels(inputs)
});
/**
* | output |
* | --- |
* | "Nothing is chosen yet, so this key would reach no brand and no channel." |
*
* @param {Integrations_Api_Keys_Access_EmptyInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_api_keys_access_empty = /** @type {((inputs?: Integrations_Api_Keys_Access_EmptyInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Api_Keys_Access_EmptyInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_api_keys_access_empty(inputs)
	if (locale === "cs") return __cs.integrations_api_keys_access_empty(inputs)
	return __en.integrations_api_keys_access_empty(inputs)
});
/**
* | output |
* | --- |
* | "One of the chosen brands or channels no longer exists. Reload the page and choose again." |
*
* @param {Integrations_Api_Keys_Access_InvalidInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_api_keys_access_invalid = /** @type {((inputs?: Integrations_Api_Keys_Access_InvalidInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Api_Keys_Access_InvalidInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_api_keys_access_invalid(inputs)
	if (locale === "cs") return __cs.integrations_api_keys_access_invalid(inputs)
	return __en.integrations_api_keys_access_invalid(inputs)
});
/**
* | output |
* | --- |
* | "This workspace has no brands." |
*
* @param {Integrations_Api_Keys_Access_No_BrandsInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_api_keys_access_no_brands = /** @type {((inputs?: Integrations_Api_Keys_Access_No_BrandsInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Api_Keys_Access_No_BrandsInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_api_keys_access_no_brands(inputs)
	if (locale === "cs") return __cs.integrations_api_keys_access_no_brands(inputs)
	return __en.integrations_api_keys_access_no_brands(inputs)
});
/**
* | output |
* | --- |
* | "This workspace has no channels." |
*
* @param {Integrations_Api_Keys_Access_No_ChannelsInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_api_keys_access_no_channels = /** @type {((inputs?: Integrations_Api_Keys_Access_No_ChannelsInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Api_Keys_Access_No_ChannelsInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_api_keys_access_no_channels(inputs)
	if (locale === "cs") return __cs.integrations_api_keys_access_no_channels(inputs)
	return __en.integrations_api_keys_access_no_channels(inputs)
});
/**
* | output |
* | --- |
* | "Brands and channels apply only to a key with restricted access." |
*
* @param {Integrations_Api_Keys_Access_Not_RestrictedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_api_keys_access_not_restricted = /** @type {((inputs?: Integrations_Api_Keys_Access_Not_RestrictedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Api_Keys_Access_Not_RestrictedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_api_keys_access_not_restricted(inputs)
	if (locale === "cs") return __cs.integrations_api_keys_access_not_restricted(inputs)
	return __en.integrations_api_keys_access_not_restricted(inputs)
});
/**
* | output |
* | --- |
* | "Only the brands and channels I choose" |
*
* @param {Integrations_Api_Keys_Access_RestrictedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_api_keys_access_restricted = /** @type {((inputs?: Integrations_Api_Keys_Access_RestrictedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Api_Keys_Access_RestrictedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_api_keys_access_restricted(inputs)
	if (locale === "cs") return __cs.integrations_api_keys_access_restricted(inputs)
	return __en.integrations_api_keys_access_restricted(inputs)
});
/**
* | output |
* | --- |
* | "The whole workspace" |
*
* @param {Integrations_Api_Keys_Access_WorkspaceInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_api_keys_access_workspace = /** @type {((inputs?: Integrations_Api_Keys_Access_WorkspaceInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Api_Keys_Access_WorkspaceInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_api_keys_access_workspace(inputs)
	if (locale === "cs") return __cs.integrations_api_keys_access_workspace(inputs)
	return __en.integrations_api_keys_access_workspace(inputs)
});
/**
* | output |
* | --- |
* | "Create API key" |
*
* @param {Integrations_Api_Keys_AddInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_api_keys_add = /** @type {((inputs?: Integrations_Api_Keys_AddInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Api_Keys_AddInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_api_keys_add(inputs)
	if (locale === "cs") return __cs.integrations_api_keys_add(inputs)
	return __en.integrations_api_keys_add(inputs)
});
/**
* | countPlural | output |
* | --- | --- |
* | "one" | "{count} brand" |
* | * | "{count} brands" |
*
* @param {Integrations_Api_Keys_Brand_CountInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_api_keys_brand_count = /** @type {((inputs: Integrations_Api_Keys_Brand_CountInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Api_Keys_Brand_CountInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_api_keys_brand_count(inputs)
	if (locale === "cs") return __cs.integrations_api_keys_brand_count(inputs)
	return __en.integrations_api_keys_brand_count(inputs)
});
/**
* | output |
* | --- |
* | "Cancel" |
*
* @param {Integrations_Api_Keys_CancelInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_api_keys_cancel = /** @type {((inputs?: Integrations_Api_Keys_CancelInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Api_Keys_CancelInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_api_keys_cancel(inputs)
	if (locale === "cs") return __cs.integrations_api_keys_cancel(inputs)
	return __en.integrations_api_keys_cancel(inputs)
});
/**
* | countPlural | output |
* | --- | --- |
* | "one" | "{count} channel" |
* | * | "{count} channels" |
*
* @param {Integrations_Api_Keys_Channel_CountInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_api_keys_channel_count = /** @type {((inputs: Integrations_Api_Keys_Channel_CountInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Api_Keys_Channel_CountInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_api_keys_channel_count(inputs)
	if (locale === "cs") return __cs.integrations_api_keys_channel_count(inputs)
	return __en.integrations_api_keys_channel_count(inputs)
});
/**
* | output |
* | --- |
* | "Key copied" |
*
* @param {Integrations_Api_Keys_CopiedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_api_keys_copied = /** @type {((inputs?: Integrations_Api_Keys_CopiedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Api_Keys_CopiedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_api_keys_copied(inputs)
	if (locale === "cs") return __cs.integrations_api_keys_copied(inputs)
	return __en.integrations_api_keys_copied(inputs)
});
/**
* | output |
* | --- |
* | "Copy key" |
*
* @param {Integrations_Api_Keys_CopyInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_api_keys_copy = /** @type {((inputs?: Integrations_Api_Keys_CopyInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Api_Keys_CopyInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_api_keys_copy(inputs)
	if (locale === "cs") return __cs.integrations_api_keys_copy(inputs)
	return __en.integrations_api_keys_copy(inputs)
});
/**
* | output |
* | --- |
* | "Couldn't copy. Select the key and copy it yourself." |
*
* @param {Integrations_Api_Keys_Copy_FailedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_api_keys_copy_failed = /** @type {((inputs?: Integrations_Api_Keys_Copy_FailedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Api_Keys_Copy_FailedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_api_keys_copy_failed(inputs)
	if (locale === "cs") return __cs.integrations_api_keys_copy_failed(inputs)
	return __en.integrations_api_keys_copy_failed(inputs)
});
/**
* | output |
* | --- |
* | "Create key" |
*
* @param {Integrations_Api_Keys_CreateInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_api_keys_create = /** @type {((inputs?: Integrations_Api_Keys_CreateInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Api_Keys_CreateInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_api_keys_create(inputs)
	if (locale === "cs") return __cs.integrations_api_keys_create(inputs)
	return __en.integrations_api_keys_create(inputs)
});
/**
* | output |
* | --- |
* | "API key created" |
*
* @param {Integrations_Api_Keys_CreatedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_api_keys_created = /** @type {((inputs?: Integrations_Api_Keys_CreatedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Api_Keys_CreatedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_api_keys_created(inputs)
	if (locale === "cs") return __cs.integrations_api_keys_created(inputs)
	return __en.integrations_api_keys_created(inputs)
});
/**
* | output |
* | --- |
* | "Created {time}" |
*
* @param {Integrations_Api_Keys_Created_AtInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_api_keys_created_at = /** @type {((inputs: Integrations_Api_Keys_Created_AtInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Api_Keys_Created_AtInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_api_keys_created_at(inputs)
	if (locale === "cs") return __cs.integrations_api_keys_created_at(inputs)
	return __en.integrations_api_keys_created_at(inputs)
});
/**
* | output |
* | --- |
* | "Done" |
*
* @param {Integrations_Api_Keys_DoneInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_api_keys_done = /** @type {((inputs?: Integrations_Api_Keys_DoneInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Api_Keys_DoneInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_api_keys_done(inputs)
	if (locale === "cs") return __cs.integrations_api_keys_done(inputs)
	return __en.integrations_api_keys_done(inputs)
});
/**
* | output |
* | --- |
* | "No API keys yet." |
*
* @param {Integrations_Api_Keys_EmptyInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_api_keys_empty = /** @type {((inputs?: Integrations_Api_Keys_EmptyInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Api_Keys_EmptyInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_api_keys_empty(inputs)
	if (locale === "cs") return __cs.integrations_api_keys_empty(inputs)
	return __en.integrations_api_keys_empty(inputs)
});
/**
* | output |
* | --- |
* | "Expired {time}" |
*
* @param {Integrations_Api_Keys_Expired_AtInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_api_keys_expired_at = /** @type {((inputs: Integrations_Api_Keys_Expired_AtInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Api_Keys_Expired_AtInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_api_keys_expired_at(inputs)
	if (locale === "cs") return __cs.integrations_api_keys_expired_at(inputs)
	return __en.integrations_api_keys_expired_at(inputs)
});
/**
* | output |
* | --- |
* | "Expires {time}" |
*
* @param {Integrations_Api_Keys_ExpiresInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_api_keys_expires = /** @type {((inputs: Integrations_Api_Keys_ExpiresInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Api_Keys_ExpiresInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_api_keys_expires(inputs)
	if (locale === "cs") return __cs.integrations_api_keys_expires(inputs)
	return __en.integrations_api_keys_expires(inputs)
});
/**
* | output |
* | --- |
* | "Valid until (optional)" |
*
* @param {Integrations_Api_Keys_ExpiryInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_api_keys_expiry = /** @type {((inputs?: Integrations_Api_Keys_ExpiryInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Api_Keys_ExpiryInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_api_keys_expiry(inputs)
	if (locale === "cs") return __cs.integrations_api_keys_expiry(inputs)
	return __en.integrations_api_keys_expiry(inputs)
});
/**
* | output |
* | --- |
* | "The key stops working at the end of this day in your time zone. Leave it empty for a key that doesn't expire." |
*
* @param {Integrations_Api_Keys_Expiry_HintInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_api_keys_expiry_hint = /** @type {((inputs?: Integrations_Api_Keys_Expiry_HintInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Api_Keys_Expiry_HintInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_api_keys_expiry_hint(inputs)
	if (locale === "cs") return __cs.integrations_api_keys_expiry_hint(inputs)
	return __en.integrations_api_keys_expiry_hint(inputs)
});
/**
* | output |
* | --- |
* | "Choose a day in the future." |
*
* @param {Integrations_Api_Keys_Expiry_In_PastInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_api_keys_expiry_in_past = /** @type {((inputs?: Integrations_Api_Keys_Expiry_In_PastInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Api_Keys_Expiry_In_PastInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_api_keys_expiry_in_past(inputs)
	if (locale === "cs") return __cs.integrations_api_keys_expiry_in_past(inputs)
	return __en.integrations_api_keys_expiry_in_past(inputs)
});
/**
* | output |
* | --- |
* | "API keys let your own scripts and tools use the Kronaut API for this workspace. A key can never approve posts, connect channels or change settings." |
*
* @param {Integrations_Api_Keys_IntroInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_api_keys_intro = /** @type {((inputs?: Integrations_Api_Keys_IntroInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Api_Keys_IntroInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_api_keys_intro(inputs)
	if (locale === "cs") return __cs.integrations_api_keys_intro(inputs)
	return __en.integrations_api_keys_intro(inputs)
});
/**
* | output |
* | --- |
* | "Keep key" |
*
* @param {Integrations_Api_Keys_KeepInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_api_keys_keep = /** @type {((inputs?: Integrations_Api_Keys_KeepInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Api_Keys_KeepInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_api_keys_keep(inputs)
	if (locale === "cs") return __cs.integrations_api_keys_keep(inputs)
	return __en.integrations_api_keys_keep(inputs)
});
/**
* | output |
* | --- |
* | "Load more" |
*
* @param {Integrations_Api_Keys_MoreInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_api_keys_more = /** @type {((inputs?: Integrations_Api_Keys_MoreInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Api_Keys_MoreInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_api_keys_more(inputs)
	if (locale === "cs") return __cs.integrations_api_keys_more(inputs)
	return __en.integrations_api_keys_more(inputs)
});
/**
* | output |
* | --- |
* | "Name" |
*
* @param {Integrations_Api_Keys_NameInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_api_keys_name = /** @type {((inputs?: Integrations_Api_Keys_NameInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Api_Keys_NameInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_api_keys_name(inputs)
	if (locale === "cs") return __cs.integrations_api_keys_name(inputs)
	return __en.integrations_api_keys_name(inputs)
});
/**
* | output |
* | --- |
* | "So you can tell your keys apart, for example the name of the tool that uses it." |
*
* @param {Integrations_Api_Keys_Name_HintInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_api_keys_name_hint = /** @type {((inputs?: Integrations_Api_Keys_Name_HintInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Api_Keys_Name_HintInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_api_keys_name_hint(inputs)
	if (locale === "cs") return __cs.integrations_api_keys_name_hint(inputs)
	return __en.integrations_api_keys_name_hint(inputs)
});
/**
* | output |
* | --- |
* | "Give the key a name of 1 to {max} characters." |
*
* @param {Integrations_Api_Keys_Name_InvalidInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_api_keys_name_invalid = /** @type {((inputs: Integrations_Api_Keys_Name_InvalidInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Api_Keys_Name_InvalidInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_api_keys_name_invalid(inputs)
	if (locale === "cs") return __cs.integrations_api_keys_name_invalid(inputs)
	return __en.integrations_api_keys_name_invalid(inputs)
});
/**
* | output |
* | --- |
* | "Doesn't expire" |
*
* @param {Integrations_Api_Keys_Never_ExpiresInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_api_keys_never_expires = /** @type {((inputs?: Integrations_Api_Keys_Never_ExpiresInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Api_Keys_Never_ExpiresInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_api_keys_never_expires(inputs)
	if (locale === "cs") return __cs.integrations_api_keys_never_expires(inputs)
	return __en.integrations_api_keys_never_expires(inputs)
});
/**
* | output |
* | --- |
* | "Starts with {prefix}" |
*
* @param {Integrations_Api_Keys_PrefixInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_api_keys_prefix = /** @type {((inputs: Integrations_Api_Keys_PrefixInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Api_Keys_PrefixInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_api_keys_prefix(inputs)
	if (locale === "cs") return __cs.integrations_api_keys_prefix(inputs)
	return __en.integrations_api_keys_prefix(inputs)
});
/**
* | countPlural | output |
* | --- | --- |
* | "one" | "{count} request a minute" |
* | * | "{count} requests a minute" |
*
* @param {Integrations_Api_Keys_RateInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_api_keys_rate = /** @type {((inputs: Integrations_Api_Keys_RateInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Api_Keys_RateInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_api_keys_rate(inputs)
	if (locale === "cs") return __cs.integrations_api_keys_rate(inputs)
	return __en.integrations_api_keys_rate(inputs)
});
/**
* | countPlural | output |
* | --- | --- |
* | "one" | "{count} request a minute (default)" |
* | * | "{count} requests a minute (default)" |
*
* @param {Integrations_Api_Keys_Rate_DefaultInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_api_keys_rate_default = /** @type {((inputs: Integrations_Api_Keys_Rate_DefaultInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Api_Keys_Rate_DefaultInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_api_keys_rate_default(inputs)
	if (locale === "cs") return __cs.integrations_api_keys_rate_default(inputs)
	return __en.integrations_api_keys_rate_default(inputs)
});
/**
* | output |
* | --- |
* | "Requests a minute (optional)" |
*
* @param {Integrations_Api_Keys_Rate_LimitInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_api_keys_rate_limit = /** @type {((inputs?: Integrations_Api_Keys_Rate_LimitInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Api_Keys_Rate_LimitInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_api_keys_rate_limit(inputs)
	if (locale === "cs") return __cs.integrations_api_keys_rate_limit(inputs)
	return __en.integrations_api_keys_rate_limit(inputs)
});
/**
* | output |
* | --- |
* | "From 1 to {max}. Leave it empty for the default of {count}." |
*
* @param {Integrations_Api_Keys_Rate_Limit_HintInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_api_keys_rate_limit_hint = /** @type {((inputs: Integrations_Api_Keys_Rate_Limit_HintInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Api_Keys_Rate_Limit_HintInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_api_keys_rate_limit_hint(inputs)
	if (locale === "cs") return __cs.integrations_api_keys_rate_limit_hint(inputs)
	return __en.integrations_api_keys_rate_limit_hint(inputs)
});
/**
* | output |
* | --- |
* | "Enter a whole number from 1 to {max}." |
*
* @param {Integrations_Api_Keys_Rate_Limit_InvalidInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_api_keys_rate_limit_invalid = /** @type {((inputs: Integrations_Api_Keys_Rate_Limit_InvalidInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Api_Keys_Rate_Limit_InvalidInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_api_keys_rate_limit_invalid(inputs)
	if (locale === "cs") return __cs.integrations_api_keys_rate_limit_invalid(inputs)
	return __en.integrations_api_keys_rate_limit_invalid(inputs)
});
/**
* | output |
* | --- |
* | "Restricted to {reach}" |
*
* @param {Integrations_Api_Keys_RestrictedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_api_keys_restricted = /** @type {((inputs: Integrations_Api_Keys_RestrictedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Api_Keys_RestrictedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_api_keys_restricted(inputs)
	if (locale === "cs") return __cs.integrations_api_keys_restricted(inputs)
	return __en.integrations_api_keys_restricted(inputs)
});
/**
* | output |
* | --- |
* | "Restricted, reaches nothing" |
*
* @param {Integrations_Api_Keys_Restricted_NothingInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_api_keys_restricted_nothing = /** @type {((inputs?: Integrations_Api_Keys_Restricted_NothingInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Api_Keys_Restricted_NothingInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_api_keys_restricted_nothing(inputs)
	if (locale === "cs") return __cs.integrations_api_keys_restricted_nothing(inputs)
	return __en.integrations_api_keys_restricted_nothing(inputs)
});
/**
* | output |
* | --- |
* | "Revoke" |
*
* @param {Integrations_Api_Keys_RevokeInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_api_keys_revoke = /** @type {((inputs?: Integrations_Api_Keys_RevokeInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Api_Keys_RevokeInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_api_keys_revoke(inputs)
	if (locale === "cs") return __cs.integrations_api_keys_revoke(inputs)
	return __en.integrations_api_keys_revoke(inputs)
});
/**
* | output |
* | --- |
* | "Tools that use it stop working with their next request. This can't be undone." |
*
* @param {Integrations_Api_Keys_Revoke_BodyInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_api_keys_revoke_body = /** @type {((inputs?: Integrations_Api_Keys_Revoke_BodyInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Api_Keys_Revoke_BodyInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_api_keys_revoke_body(inputs)
	if (locale === "cs") return __cs.integrations_api_keys_revoke_body(inputs)
	return __en.integrations_api_keys_revoke_body(inputs)
});
/**
* | output |
* | --- |
* | "Revoke {name}" |
*
* @param {Integrations_Api_Keys_Revoke_NamedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_api_keys_revoke_named = /** @type {((inputs: Integrations_Api_Keys_Revoke_NamedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Api_Keys_Revoke_NamedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_api_keys_revoke_named(inputs)
	if (locale === "cs") return __cs.integrations_api_keys_revoke_named(inputs)
	return __en.integrations_api_keys_revoke_named(inputs)
});
/**
* | output |
* | --- |
* | "Revoke this API key?" |
*
* @param {Integrations_Api_Keys_Revoke_TitleInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_api_keys_revoke_title = /** @type {((inputs?: Integrations_Api_Keys_Revoke_TitleInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Api_Keys_Revoke_TitleInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_api_keys_revoke_title(inputs)
	if (locale === "cs") return __cs.integrations_api_keys_revoke_title(inputs)
	return __en.integrations_api_keys_revoke_title(inputs)
});
/**
* | output |
* | --- |
* | "API key revoked" |
*
* @param {Integrations_Api_Keys_RevokedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_api_keys_revoked = /** @type {((inputs?: Integrations_Api_Keys_RevokedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Api_Keys_RevokedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_api_keys_revoked(inputs)
	if (locale === "cs") return __cs.integrations_api_keys_revoked(inputs)
	return __en.integrations_api_keys_revoked(inputs)
});
/**
* | output |
* | --- |
* | "Revoked {time}" |
*
* @param {Integrations_Api_Keys_Revoked_AtInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_api_keys_revoked_at = /** @type {((inputs: Integrations_Api_Keys_Revoked_AtInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Api_Keys_Revoked_AtInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_api_keys_revoked_at(inputs)
	if (locale === "cs") return __cs.integrations_api_keys_revoked_at(inputs)
	return __en.integrations_api_keys_revoked_at(inputs)
});
/**
* | output |
* | --- |
* | "Write text with AI" |
*
* @param {Integrations_Api_Keys_Scope_Ai_GenerateInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_api_keys_scope_ai_generate = /** @type {((inputs?: Integrations_Api_Keys_Scope_Ai_GenerateInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Api_Keys_Scope_Ai_GenerateInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_api_keys_scope_ai_generate(inputs)
	if (locale === "cs") return __cs.integrations_api_keys_scope_ai_generate(inputs)
	return __en.integrations_api_keys_scope_ai_generate(inputs)
});
/**
* | output |
* | --- |
* | "See analytics" |
*
* @param {Integrations_Api_Keys_Scope_Analytics_ReadInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_api_keys_scope_analytics_read = /** @type {((inputs?: Integrations_Api_Keys_Scope_Analytics_ReadInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Api_Keys_Scope_Analytics_ReadInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_api_keys_scope_analytics_read(inputs)
	if (locale === "cs") return __cs.integrations_api_keys_scope_analytics_read(inputs)
	return __en.integrations_api_keys_scope_analytics_read(inputs)
});
/**
* | output |
* | --- |
* | "See the audit log" |
*
* @param {Integrations_Api_Keys_Scope_Audit_ReadInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_api_keys_scope_audit_read = /** @type {((inputs?: Integrations_Api_Keys_Scope_Audit_ReadInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Api_Keys_Scope_Audit_ReadInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_api_keys_scope_audit_read(inputs)
	if (locale === "cs") return __cs.integrations_api_keys_scope_audit_read(inputs)
	return __en.integrations_api_keys_scope_audit_read(inputs)
});
/**
* | output |
* | --- |
* | "See brands" |
*
* @param {Integrations_Api_Keys_Scope_Brands_ReadInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_api_keys_scope_brands_read = /** @type {((inputs?: Integrations_Api_Keys_Scope_Brands_ReadInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Api_Keys_Scope_Brands_ReadInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_api_keys_scope_brands_read(inputs)
	if (locale === "cs") return __cs.integrations_api_keys_scope_brands_read(inputs)
	return __en.integrations_api_keys_scope_brands_read(inputs)
});
/**
* | output |
* | --- |
* | "See channels" |
*
* @param {Integrations_Api_Keys_Scope_Channels_ReadInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_api_keys_scope_channels_read = /** @type {((inputs?: Integrations_Api_Keys_Scope_Channels_ReadInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Api_Keys_Scope_Channels_ReadInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_api_keys_scope_channels_read(inputs)
	if (locale === "cs") return __cs.integrations_api_keys_scope_channels_read(inputs)
	return __en.integrations_api_keys_scope_channels_read(inputs)
});
/**
* | output |
* | --- |
* | "See comments" |
*
* @param {Integrations_Api_Keys_Scope_Comments_ReadInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_api_keys_scope_comments_read = /** @type {((inputs?: Integrations_Api_Keys_Scope_Comments_ReadInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Api_Keys_Scope_Comments_ReadInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_api_keys_scope_comments_read(inputs)
	if (locale === "cs") return __cs.integrations_api_keys_scope_comments_read(inputs)
	return __en.integrations_api_keys_scope_comments_read(inputs)
});
/**
* | output |
* | --- |
* | "Write comments" |
*
* @param {Integrations_Api_Keys_Scope_Comments_WriteInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_api_keys_scope_comments_write = /** @type {((inputs?: Integrations_Api_Keys_Scope_Comments_WriteInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Api_Keys_Scope_Comments_WriteInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_api_keys_scope_comments_write(inputs)
	if (locale === "cs") return __cs.integrations_api_keys_scope_comments_write(inputs)
	return __en.integrations_api_keys_scope_comments_write(inputs)
});
/**
* | output |
* | --- |
* | "See groups" |
*
* @param {Integrations_Api_Keys_Scope_Groups_ReadInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_api_keys_scope_groups_read = /** @type {((inputs?: Integrations_Api_Keys_Scope_Groups_ReadInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Api_Keys_Scope_Groups_ReadInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_api_keys_scope_groups_read(inputs)
	if (locale === "cs") return __cs.integrations_api_keys_scope_groups_read(inputs)
	return __en.integrations_api_keys_scope_groups_read(inputs)
});
/**
* | output |
* | --- |
* | "See media" |
*
* @param {Integrations_Api_Keys_Scope_Media_ReadInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_api_keys_scope_media_read = /** @type {((inputs?: Integrations_Api_Keys_Scope_Media_ReadInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Api_Keys_Scope_Media_ReadInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_api_keys_scope_media_read(inputs)
	if (locale === "cs") return __cs.integrations_api_keys_scope_media_read(inputs)
	return __en.integrations_api_keys_scope_media_read(inputs)
});
/**
* | output |
* | --- |
* | "Upload media" |
*
* @param {Integrations_Api_Keys_Scope_Media_WriteInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_api_keys_scope_media_write = /** @type {((inputs?: Integrations_Api_Keys_Scope_Media_WriteInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Api_Keys_Scope_Media_WriteInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_api_keys_scope_media_write(inputs)
	if (locale === "cs") return __cs.integrations_api_keys_scope_media_write(inputs)
	return __en.integrations_api_keys_scope_media_write(inputs)
});
/**
* | output |
* | --- |
* | "Cancel scheduled posts" |
*
* @param {Integrations_Api_Keys_Scope_Posts_CancelInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_api_keys_scope_posts_cancel = /** @type {((inputs?: Integrations_Api_Keys_Scope_Posts_CancelInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Api_Keys_Scope_Posts_CancelInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_api_keys_scope_posts_cancel(inputs)
	if (locale === "cs") return __cs.integrations_api_keys_scope_posts_cancel(inputs)
	return __en.integrations_api_keys_scope_posts_cancel(inputs)
});
/**
* | output |
* | --- |
* | "Create and edit drafts" |
*
* @param {Integrations_Api_Keys_Scope_Posts_DraftInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_api_keys_scope_posts_draft = /** @type {((inputs?: Integrations_Api_Keys_Scope_Posts_DraftInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Api_Keys_Scope_Posts_DraftInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_api_keys_scope_posts_draft(inputs)
	if (locale === "cs") return __cs.integrations_api_keys_scope_posts_draft(inputs)
	return __en.integrations_api_keys_scope_posts_draft(inputs)
});
/**
* | output |
* | --- |
* | "See posts" |
*
* @param {Integrations_Api_Keys_Scope_Posts_ReadInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_api_keys_scope_posts_read = /** @type {((inputs?: Integrations_Api_Keys_Scope_Posts_ReadInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Api_Keys_Scope_Posts_ReadInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_api_keys_scope_posts_read(inputs)
	if (locale === "cs") return __cs.integrations_api_keys_scope_posts_read(inputs)
	return __en.integrations_api_keys_scope_posts_read(inputs)
});
/**
* | output |
* | --- |
* | "Schedule posts" |
*
* @param {Integrations_Api_Keys_Scope_Posts_ScheduleInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_api_keys_scope_posts_schedule = /** @type {((inputs?: Integrations_Api_Keys_Scope_Posts_ScheduleInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Api_Keys_Scope_Posts_ScheduleInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_api_keys_scope_posts_schedule(inputs)
	if (locale === "cs") return __cs.integrations_api_keys_scope_posts_schedule(inputs)
	return __en.integrations_api_keys_scope_posts_schedule(inputs)
});
/**
* | output |
* | --- |
* | "Submit posts for approval" |
*
* @param {Integrations_Api_Keys_Scope_Posts_SubmitInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_api_keys_scope_posts_submit = /** @type {((inputs?: Integrations_Api_Keys_Scope_Posts_SubmitInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Api_Keys_Scope_Posts_SubmitInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_api_keys_scope_posts_submit(inputs)
	if (locale === "cs") return __cs.integrations_api_keys_scope_posts_submit(inputs)
	return __en.integrations_api_keys_scope_posts_submit(inputs)
});
/**
* | output |
* | --- |
* | "What the key may do" |
*
* @param {Integrations_Api_Keys_ScopesInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_api_keys_scopes = /** @type {((inputs?: Integrations_Api_Keys_ScopesInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Api_Keys_ScopesInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_api_keys_scopes(inputs)
	if (locale === "cs") return __cs.integrations_api_keys_scopes(inputs)
	return __en.integrations_api_keys_scopes(inputs)
});
/**
* | output |
* | --- |
* | "A key never gets more than your own role allows." |
*
* @param {Integrations_Api_Keys_Scopes_HintInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_api_keys_scopes_hint = /** @type {((inputs?: Integrations_Api_Keys_Scopes_HintInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Api_Keys_Scopes_HintInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_api_keys_scopes_hint(inputs)
	if (locale === "cs") return __cs.integrations_api_keys_scopes_hint(inputs)
	return __en.integrations_api_keys_scopes_hint(inputs)
});
/**
* | output |
* | --- |
* | "One of the chosen permissions can't be given to an API key. Reload the page and choose again." |
*
* @param {Integrations_Api_Keys_Scopes_InvalidInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_api_keys_scopes_invalid = /** @type {((inputs?: Integrations_Api_Keys_Scopes_InvalidInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Api_Keys_Scopes_InvalidInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_api_keys_scopes_invalid(inputs)
	if (locale === "cs") return __cs.integrations_api_keys_scopes_invalid(inputs)
	return __en.integrations_api_keys_scopes_invalid(inputs)
});
/**
* | output |
* | --- |
* | "Active" |
*
* @param {Integrations_Api_Keys_Status_ActiveInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_api_keys_status_active = /** @type {((inputs?: Integrations_Api_Keys_Status_ActiveInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Api_Keys_Status_ActiveInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_api_keys_status_active(inputs)
	if (locale === "cs") return __cs.integrations_api_keys_status_active(inputs)
	return __en.integrations_api_keys_status_active(inputs)
});
/**
* | output |
* | --- |
* | "Expired" |
*
* @param {Integrations_Api_Keys_Status_ExpiredInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_api_keys_status_expired = /** @type {((inputs?: Integrations_Api_Keys_Status_ExpiredInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Api_Keys_Status_ExpiredInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_api_keys_status_expired(inputs)
	if (locale === "cs") return __cs.integrations_api_keys_status_expired(inputs)
	return __en.integrations_api_keys_status_expired(inputs)
});
/**
* | output |
* | --- |
* | "Revoked" |
*
* @param {Integrations_Api_Keys_Status_RevokedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_api_keys_status_revoked = /** @type {((inputs?: Integrations_Api_Keys_Status_RevokedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Api_Keys_Status_RevokedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_api_keys_status_revoked(inputs)
	if (locale === "cs") return __cs.integrations_api_keys_status_revoked(inputs)
	return __en.integrations_api_keys_status_revoked(inputs)
});
/**
* | output |
* | --- |
* | "API keys" |
*
* @param {Integrations_Api_Keys_TitleInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_api_keys_title = /** @type {((inputs?: Integrations_Api_Keys_TitleInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Api_Keys_TitleInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_api_keys_title(inputs)
	if (locale === "cs") return __cs.integrations_api_keys_title(inputs)
	return __en.integrations_api_keys_title(inputs)
});
/**
* | output |
* | --- |
* | "Copy this key now. You won't see it again." |
*
* @param {Integrations_Api_Keys_Token_OnceInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_api_keys_token_once = /** @type {((inputs?: Integrations_Api_Keys_Token_OnceInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Api_Keys_Token_OnceInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_api_keys_token_once(inputs)
	if (locale === "cs") return __cs.integrations_api_keys_token_once(inputs)
	return __en.integrations_api_keys_token_once(inputs)
});
/**
* | output |
* | --- |
* | "API key" |
*
* @param {Integrations_Api_Keys_Token_TitleInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_api_keys_token_title = /** @type {((inputs?: Integrations_Api_Keys_Token_TitleInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Api_Keys_Token_TitleInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_api_keys_token_title(inputs)
	if (locale === "cs") return __cs.integrations_api_keys_token_title(inputs)
	return __en.integrations_api_keys_token_title(inputs)
});
/**
* | output |
* | --- |
* | "Send it with every request in this header:" |
*
* @param {Integrations_Api_Keys_Token_UseInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_api_keys_token_use = /** @type {((inputs?: Integrations_Api_Keys_Token_UseInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Api_Keys_Token_UseInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_api_keys_token_use(inputs)
	if (locale === "cs") return __cs.integrations_api_keys_token_use(inputs)
	return __en.integrations_api_keys_token_use(inputs)
});
/**
* | output |
* | --- |
* | "Whole workspace" |
*
* @param {Integrations_Api_Keys_Whole_WorkspaceInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_api_keys_whole_workspace = /** @type {((inputs?: Integrations_Api_Keys_Whole_WorkspaceInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Api_Keys_Whole_WorkspaceInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_api_keys_whole_workspace(inputs)
	if (locale === "cs") return __cs.integrations_api_keys_whole_workspace(inputs)
	return __en.integrations_api_keys_whole_workspace(inputs)
});
/**
* | output |
* | --- |
* | "Only owners and admins can change these settings." |
*
* @param {Integrations_Read_OnlyInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_read_only = /** @type {((inputs?: Integrations_Read_OnlyInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Read_OnlyInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_read_only(inputs)
	if (locale === "cs") return __cs.integrations_read_only(inputs)
	return __en.integrations_read_only(inputs)
});
/**
* | output |
* | --- |
* | "Add endpoint" |
*
* @param {Integrations_Webhooks_AddInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_webhooks_add = /** @type {((inputs?: Integrations_Webhooks_AddInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Webhooks_AddInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_webhooks_add(inputs)
	if (locale === "cs") return __cs.integrations_webhooks_add(inputs)
	return __en.integrations_webhooks_add(inputs)
});
/**
* | countPlural | output |
* | --- | --- |
* | "one" | "{count} attempt" |
* | * | "{count} attempts" |
*
* @param {Integrations_Webhooks_AttemptsInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_webhooks_attempts = /** @type {((inputs: Integrations_Webhooks_AttemptsInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Webhooks_AttemptsInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_webhooks_attempts(inputs)
	if (locale === "cs") return __cs.integrations_webhooks_attempts(inputs)
	return __en.integrations_webhooks_attempts(inputs)
});
/**
* | output |
* | --- |
* | "Cancel" |
*
* @param {Integrations_Webhooks_CancelInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_webhooks_cancel = /** @type {((inputs?: Integrations_Webhooks_CancelInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Webhooks_CancelInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_webhooks_cancel(inputs)
	if (locale === "cs") return __cs.integrations_webhooks_cancel(inputs)
	return __en.integrations_webhooks_cancel(inputs)
});
/**
* | output |
* | --- |
* | "Close" |
*
* @param {Integrations_Webhooks_CloseInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_webhooks_close = /** @type {((inputs?: Integrations_Webhooks_CloseInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Webhooks_CloseInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_webhooks_close(inputs)
	if (locale === "cs") return __cs.integrations_webhooks_close(inputs)
	return __en.integrations_webhooks_close(inputs)
});
/**
* | output |
* | --- |
* | "Secret copied" |
*
* @param {Integrations_Webhooks_CopiedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_webhooks_copied = /** @type {((inputs?: Integrations_Webhooks_CopiedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Webhooks_CopiedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_webhooks_copied(inputs)
	if (locale === "cs") return __cs.integrations_webhooks_copied(inputs)
	return __en.integrations_webhooks_copied(inputs)
});
/**
* | output |
* | --- |
* | "Copy secret" |
*
* @param {Integrations_Webhooks_CopyInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_webhooks_copy = /** @type {((inputs?: Integrations_Webhooks_CopyInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Webhooks_CopyInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_webhooks_copy(inputs)
	if (locale === "cs") return __cs.integrations_webhooks_copy(inputs)
	return __en.integrations_webhooks_copy(inputs)
});
/**
* | output |
* | --- |
* | "Couldn't copy. Select the secret and copy it yourself." |
*
* @param {Integrations_Webhooks_Copy_FailedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_webhooks_copy_failed = /** @type {((inputs?: Integrations_Webhooks_Copy_FailedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Webhooks_Copy_FailedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_webhooks_copy_failed(inputs)
	if (locale === "cs") return __cs.integrations_webhooks_copy_failed(inputs)
	return __en.integrations_webhooks_copy_failed(inputs)
});
/**
* | output |
* | --- |
* | "Delete" |
*
* @param {Integrations_Webhooks_DeleteInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_webhooks_delete = /** @type {((inputs?: Integrations_Webhooks_DeleteInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Webhooks_DeleteInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_webhooks_delete(inputs)
	if (locale === "cs") return __cs.integrations_webhooks_delete(inputs)
	return __en.integrations_webhooks_delete(inputs)
});
/**
* | output |
* | --- |
* | "Deliveries still waiting for it are dropped. This can't be undone." |
*
* @param {Integrations_Webhooks_Delete_BodyInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_webhooks_delete_body = /** @type {((inputs?: Integrations_Webhooks_Delete_BodyInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Webhooks_Delete_BodyInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_webhooks_delete_body(inputs)
	if (locale === "cs") return __cs.integrations_webhooks_delete_body(inputs)
	return __en.integrations_webhooks_delete_body(inputs)
});
/**
* | output |
* | --- |
* | "Delete {host}" |
*
* @param {Integrations_Webhooks_Delete_NamedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_webhooks_delete_named = /** @type {((inputs: Integrations_Webhooks_Delete_NamedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Webhooks_Delete_NamedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_webhooks_delete_named(inputs)
	if (locale === "cs") return __cs.integrations_webhooks_delete_named(inputs)
	return __en.integrations_webhooks_delete_named(inputs)
});
/**
* | output |
* | --- |
* | "Delete this endpoint?" |
*
* @param {Integrations_Webhooks_Delete_TitleInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_webhooks_delete_title = /** @type {((inputs?: Integrations_Webhooks_Delete_TitleInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Webhooks_Delete_TitleInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_webhooks_delete_title(inputs)
	if (locale === "cs") return __cs.integrations_webhooks_delete_title(inputs)
	return __en.integrations_webhooks_delete_title(inputs)
});
/**
* | output |
* | --- |
* | "Endpoint deleted" |
*
* @param {Integrations_Webhooks_DeletedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_webhooks_deleted = /** @type {((inputs?: Integrations_Webhooks_DeletedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Webhooks_DeletedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_webhooks_deleted(inputs)
	if (locale === "cs") return __cs.integrations_webhooks_deleted(inputs)
	return __en.integrations_webhooks_deleted(inputs)
});
/**
* | output |
* | --- |
* | "Deliveries" |
*
* @param {Integrations_Webhooks_DeliveriesInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_webhooks_deliveries = /** @type {((inputs?: Integrations_Webhooks_DeliveriesInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Webhooks_DeliveriesInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_webhooks_deliveries(inputs)
	if (locale === "cs") return __cs.integrations_webhooks_deliveries(inputs)
	return __en.integrations_webhooks_deliveries(inputs)
});
/**
* | output |
* | --- |
* | "No deliveries yet." |
*
* @param {Integrations_Webhooks_Deliveries_EmptyInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_webhooks_deliveries_empty = /** @type {((inputs?: Integrations_Webhooks_Deliveries_EmptyInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Webhooks_Deliveries_EmptyInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_webhooks_deliveries_empty(inputs)
	if (locale === "cs") return __cs.integrations_webhooks_deliveries_empty(inputs)
	return __en.integrations_webhooks_deliveries_empty(inputs)
});
/**
* | output |
* | --- |
* | "Load more" |
*
* @param {Integrations_Webhooks_Deliveries_MoreInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_webhooks_deliveries_more = /** @type {((inputs?: Integrations_Webhooks_Deliveries_MoreInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Webhooks_Deliveries_MoreInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_webhooks_deliveries_more(inputs)
	if (locale === "cs") return __cs.integrations_webhooks_deliveries_more(inputs)
	return __en.integrations_webhooks_deliveries_more(inputs)
});
/**
* | output |
* | --- |
* | "Deliveries to {host}" |
*
* @param {Integrations_Webhooks_Deliveries_NamedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_webhooks_deliveries_named = /** @type {((inputs: Integrations_Webhooks_Deliveries_NamedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Webhooks_Deliveries_NamedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_webhooks_deliveries_named(inputs)
	if (locale === "cs") return __cs.integrations_webhooks_deliveries_named(inputs)
	return __en.integrations_webhooks_deliveries_named(inputs)
});
/**
* | output |
* | --- |
* | "Done" |
*
* @param {Integrations_Webhooks_DoneInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_webhooks_done = /** @type {((inputs?: Integrations_Webhooks_DoneInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Webhooks_DoneInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_webhooks_done(inputs)
	if (locale === "cs") return __cs.integrations_webhooks_done(inputs)
	return __en.integrations_webhooks_done(inputs)
});
/**
* | output |
* | --- |
* | "Edit" |
*
* @param {Integrations_Webhooks_EditInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_webhooks_edit = /** @type {((inputs?: Integrations_Webhooks_EditInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Webhooks_EditInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_webhooks_edit(inputs)
	if (locale === "cs") return __cs.integrations_webhooks_edit(inputs)
	return __en.integrations_webhooks_edit(inputs)
});
/**
* | output |
* | --- |
* | "Edit {host}" |
*
* @param {Integrations_Webhooks_Edit_NamedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_webhooks_edit_named = /** @type {((inputs: Integrations_Webhooks_Edit_NamedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Webhooks_Edit_NamedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_webhooks_edit_named(inputs)
	if (locale === "cs") return __cs.integrations_webhooks_edit_named(inputs)
	return __en.integrations_webhooks_edit_named(inputs)
});
/**
* | output |
* | --- |
* | "Edit endpoint" |
*
* @param {Integrations_Webhooks_Edit_TitleInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_webhooks_edit_title = /** @type {((inputs?: Integrations_Webhooks_Edit_TitleInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Webhooks_Edit_TitleInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_webhooks_edit_title(inputs)
	if (locale === "cs") return __cs.integrations_webhooks_edit_title(inputs)
	return __en.integrations_webhooks_edit_title(inputs)
});
/**
* | output |
* | --- |
* | "No webhook endpoints yet." |
*
* @param {Integrations_Webhooks_EmptyInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_webhooks_empty = /** @type {((inputs?: Integrations_Webhooks_EmptyInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Webhooks_EmptyInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_webhooks_empty(inputs)
	if (locale === "cs") return __cs.integrations_webhooks_empty(inputs)
	return __en.integrations_webhooks_empty(inputs)
});
/**
* | output |
* | --- |
* | "Send deliveries to {host}" |
*
* @param {Integrations_Webhooks_Enabled_NamedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_webhooks_enabled_named = /** @type {((inputs: Integrations_Webhooks_Enabled_NamedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Webhooks_Enabled_NamedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_webhooks_enabled_named(inputs)
	if (locale === "cs") return __cs.integrations_webhooks_enabled_named(inputs)
	return __en.integrations_webhooks_enabled_named(inputs)
});
/**
* | output |
* | --- |
* | "Error: {code}" |
*
* @param {Integrations_Webhooks_Error_CodeInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_webhooks_error_code = /** @type {((inputs: Integrations_Webhooks_Error_CodeInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Webhooks_Error_CodeInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_webhooks_error_code(inputs)
	if (locale === "cs") return __cs.integrations_webhooks_error_code(inputs)
	return __en.integrations_webhooks_error_code(inputs)
});
/**
* | output |
* | --- |
* | "Channel access expiring soon" |
*
* @param {Integrations_Webhooks_Event_Channel_ExpiringInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_webhooks_event_channel_expiring = /** @type {((inputs?: Integrations_Webhooks_Event_Channel_ExpiringInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Webhooks_Event_Channel_ExpiringInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_webhooks_event_channel_expiring(inputs)
	if (locale === "cs") return __cs.integrations_webhooks_event_channel_expiring(inputs)
	return __en.integrations_webhooks_event_channel_expiring(inputs)
});
/**
* | output |
* | --- |
* | "Channel needs reconnecting" |
*
* @param {Integrations_Webhooks_Event_Channel_Needs_ReauthInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_webhooks_event_channel_needs_reauth = /** @type {((inputs?: Integrations_Webhooks_Event_Channel_Needs_ReauthInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Webhooks_Event_Channel_Needs_ReauthInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_webhooks_event_channel_needs_reauth(inputs)
	if (locale === "cs") return __cs.integrations_webhooks_event_channel_needs_reauth(inputs)
	return __en.integrations_webhooks_event_channel_needs_reauth(inputs)
});
/**
* | output |
* | --- |
* | "Channel reconnected" |
*
* @param {Integrations_Webhooks_Event_Channel_ReconnectedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_webhooks_event_channel_reconnected = /** @type {((inputs?: Integrations_Webhooks_Event_Channel_ReconnectedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Webhooks_Event_Channel_ReconnectedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_webhooks_event_channel_reconnected(inputs)
	if (locale === "cs") return __cs.integrations_webhooks_event_channel_reconnected(inputs)
	return __en.integrations_webhooks_event_channel_reconnected(inputs)
});
/**
* | output |
* | --- |
* | "Waiting to be posted by hand" |
*
* @param {Integrations_Webhooks_Event_Destination_Awaiting_ManualInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_webhooks_event_destination_awaiting_manual = /** @type {((inputs?: Integrations_Webhooks_Event_Destination_Awaiting_ManualInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Webhooks_Event_Destination_Awaiting_ManualInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_webhooks_event_destination_awaiting_manual(inputs)
	if (locale === "cs") return __cs.integrations_webhooks_event_destination_awaiting_manual(inputs)
	return __en.integrations_webhooks_event_destination_awaiting_manual(inputs)
});
/**
* | output |
* | --- |
* | "Blocked before publishing" |
*
* @param {Integrations_Webhooks_Event_Destination_BlockedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_webhooks_event_destination_blocked = /** @type {((inputs?: Integrations_Webhooks_Event_Destination_BlockedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Webhooks_Event_Destination_BlockedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_webhooks_event_destination_blocked(inputs)
	if (locale === "cs") return __cs.integrations_webhooks_event_destination_blocked(inputs)
	return __en.integrations_webhooks_event_destination_blocked(inputs)
});
/**
* | output |
* | --- |
* | "Failed on a channel" |
*
* @param {Integrations_Webhooks_Event_Destination_FailedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_webhooks_event_destination_failed = /** @type {((inputs?: Integrations_Webhooks_Event_Destination_FailedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Webhooks_Event_Destination_FailedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_webhooks_event_destination_failed(inputs)
	if (locale === "cs") return __cs.integrations_webhooks_event_destination_failed(inputs)
	return __en.integrations_webhooks_event_destination_failed(inputs)
});
/**
* | output |
* | --- |
* | "Published on a channel" |
*
* @param {Integrations_Webhooks_Event_Destination_PublishedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_webhooks_event_destination_published = /** @type {((inputs?: Integrations_Webhooks_Event_Destination_PublishedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Webhooks_Event_Destination_PublishedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_webhooks_event_destination_published(inputs)
	if (locale === "cs") return __cs.integrations_webhooks_event_destination_published(inputs)
	return __en.integrations_webhooks_event_destination_published(inputs)
});
/**
* | output |
* | --- |
* | "Publishing unconfirmed" |
*
* @param {Integrations_Webhooks_Event_Destination_UnconfirmedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_webhooks_event_destination_unconfirmed = /** @type {((inputs?: Integrations_Webhooks_Event_Destination_UnconfirmedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Webhooks_Event_Destination_UnconfirmedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_webhooks_event_destination_unconfirmed(inputs)
	if (locale === "cs") return __cs.integrations_webhooks_event_destination_unconfirmed(inputs)
	return __en.integrations_webhooks_event_destination_unconfirmed(inputs)
});
/**
* | output |
* | --- |
* | "Approval requested" |
*
* @param {Integrations_Webhooks_Event_Post_Approval_RequestedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_webhooks_event_post_approval_requested = /** @type {((inputs?: Integrations_Webhooks_Event_Post_Approval_RequestedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Webhooks_Event_Post_Approval_RequestedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_webhooks_event_post_approval_requested(inputs)
	if (locale === "cs") return __cs.integrations_webhooks_event_post_approval_requested(inputs)
	return __en.integrations_webhooks_event_post_approval_requested(inputs)
});
/**
* | output |
* | --- |
* | "Post approved" |
*
* @param {Integrations_Webhooks_Event_Post_ApprovedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_webhooks_event_post_approved = /** @type {((inputs?: Integrations_Webhooks_Event_Post_ApprovedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Webhooks_Event_Post_ApprovedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_webhooks_event_post_approved(inputs)
	if (locale === "cs") return __cs.integrations_webhooks_event_post_approved(inputs)
	return __en.integrations_webhooks_event_post_approved(inputs)
});
/**
* | output |
* | --- |
* | "Post finished on all its channels" |
*
* @param {Integrations_Webhooks_Event_Post_CompletedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_webhooks_event_post_completed = /** @type {((inputs?: Integrations_Webhooks_Event_Post_CompletedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Webhooks_Event_Post_CompletedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_webhooks_event_post_completed(inputs)
	if (locale === "cs") return __cs.integrations_webhooks_event_post_completed(inputs)
	return __en.integrations_webhooks_event_post_completed(inputs)
});
/**
* | output |
* | --- |
* | "Post rejected" |
*
* @param {Integrations_Webhooks_Event_Post_RejectedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_webhooks_event_post_rejected = /** @type {((inputs?: Integrations_Webhooks_Event_Post_RejectedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Webhooks_Event_Post_RejectedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_webhooks_event_post_rejected(inputs)
	if (locale === "cs") return __cs.integrations_webhooks_event_post_rejected(inputs)
	return __en.integrations_webhooks_event_post_rejected(inputs)
});
/**
* | output |
* | --- |
* | "Network app needs attention" |
*
* @param {Integrations_Webhooks_Event_Provider_App_MisconfiguredInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_webhooks_event_provider_app_misconfigured = /** @type {((inputs?: Integrations_Webhooks_Event_Provider_App_MisconfiguredInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Webhooks_Event_Provider_App_MisconfiguredInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_webhooks_event_provider_app_misconfigured(inputs)
	if (locale === "cs") return __cs.integrations_webhooks_event_provider_app_misconfigured(inputs)
	return __en.integrations_webhooks_event_provider_app_misconfigured(inputs)
});
/**
* | output |
* | --- |
* | "Test event" |
*
* @param {Integrations_Webhooks_Event_Webhook_TestInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_webhooks_event_webhook_test = /** @type {((inputs?: Integrations_Webhooks_Event_Webhook_TestInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Webhooks_Event_Webhook_TestInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_webhooks_event_webhook_test(inputs)
	if (locale === "cs") return __cs.integrations_webhooks_event_webhook_test(inputs)
	return __en.integrations_webhooks_event_webhook_test(inputs)
});
/**
* | output |
* | --- |
* | "Events" |
*
* @param {Integrations_Webhooks_EventsInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_webhooks_events = /** @type {((inputs?: Integrations_Webhooks_EventsInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Webhooks_EventsInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_webhooks_events(inputs)
	if (locale === "cs") return __cs.integrations_webhooks_events(inputs)
	return __en.integrations_webhooks_events(inputs)
});
/**
* | output |
* | --- |
* | "This endpoint was turned off because its deliveries kept failing. Fix the receiving server, then turn it back on." |
*
* @param {Integrations_Webhooks_FailingInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_webhooks_failing = /** @type {((inputs?: Integrations_Webhooks_FailingInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Webhooks_FailingInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_webhooks_failing(inputs)
	if (locale === "cs") return __cs.integrations_webhooks_failing(inputs)
	return __en.integrations_webhooks_failing(inputs)
});
/**
* | output |
* | --- |
* | "Deliveries have been failing since {time}." |
*
* @param {Integrations_Webhooks_Failing_SinceInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_webhooks_failing_since = /** @type {((inputs: Integrations_Webhooks_Failing_SinceInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Webhooks_Failing_SinceInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_webhooks_failing_since(inputs)
	if (locale === "cs") return __cs.integrations_webhooks_failing_since(inputs)
	return __en.integrations_webhooks_failing_since(inputs)
});
/**
* | output |
* | --- |
* | "HTTP {status}" |
*
* @param {Integrations_Webhooks_Http_StatusInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_webhooks_http_status = /** @type {((inputs: Integrations_Webhooks_Http_StatusInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Webhooks_Http_StatusInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_webhooks_http_status(inputs)
	if (locale === "cs") return __cs.integrations_webhooks_http_status(inputs)
	return __en.integrations_webhooks_http_status(inputs)
});
/**
* | output |
* | --- |
* | "Webhooks send an HTTPS request to your server whenever something happens in this workspace, such as a post going out or a channel needing to reconnect." |
*
* @param {Integrations_Webhooks_IntroInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_webhooks_intro = /** @type {((inputs?: Integrations_Webhooks_IntroInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Webhooks_IntroInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_webhooks_intro(inputs)
	if (locale === "cs") return __cs.integrations_webhooks_intro(inputs)
	return __en.integrations_webhooks_intro(inputs)
});
/**
* | output |
* | --- |
* | "Keep endpoint" |
*
* @param {Integrations_Webhooks_Keep_EndpointInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_webhooks_keep_endpoint = /** @type {((inputs?: Integrations_Webhooks_Keep_EndpointInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Webhooks_Keep_EndpointInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_webhooks_keep_endpoint(inputs)
	if (locale === "cs") return __cs.integrations_webhooks_keep_endpoint(inputs)
	return __en.integrations_webhooks_keep_endpoint(inputs)
});
/**
* | output |
* | --- |
* | "Keep secret" |
*
* @param {Integrations_Webhooks_Keep_SecretInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_webhooks_keep_secret = /** @type {((inputs?: Integrations_Webhooks_Keep_SecretInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Webhooks_Keep_SecretInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_webhooks_keep_secret(inputs)
	if (locale === "cs") return __cs.integrations_webhooks_keep_secret(inputs)
	return __en.integrations_webhooks_keep_secret(inputs)
});
/**
* | output |
* | --- |
* | "This workspace has as many endpoints as it can have. Delete one before you add another." |
*
* @param {Integrations_Webhooks_LimitInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_webhooks_limit = /** @type {((inputs?: Integrations_Webhooks_LimitInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Webhooks_LimitInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_webhooks_limit(inputs)
	if (locale === "cs") return __cs.integrations_webhooks_limit(inputs)
	return __en.integrations_webhooks_limit(inputs)
});
/**
* | output |
* | --- |
* | "Next try {time}" |
*
* @param {Integrations_Webhooks_Next_AttemptInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_webhooks_next_attempt = /** @type {((inputs: Integrations_Webhooks_Next_AttemptInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Webhooks_Next_AttemptInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_webhooks_next_attempt(inputs)
	if (locale === "cs") return __cs.integrations_webhooks_next_attempt(inputs)
	return __en.integrations_webhooks_next_attempt(inputs)
});
/**
* | output |
* | --- |
* | "Off" |
*
* @param {Integrations_Webhooks_OffInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_webhooks_off = /** @type {((inputs?: Integrations_Webhooks_OffInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Webhooks_OffInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_webhooks_off(inputs)
	if (locale === "cs") return __cs.integrations_webhooks_off(inputs)
	return __en.integrations_webhooks_off(inputs)
});
/**
* | output |
* | --- |
* | "On" |
*
* @param {Integrations_Webhooks_OnInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_webhooks_on = /** @type {((inputs?: Integrations_Webhooks_OnInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Webhooks_OnInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_webhooks_on(inputs)
	if (locale === "cs") return __cs.integrations_webhooks_on(inputs)
	return __en.integrations_webhooks_on(inputs)
});
/**
* | output |
* | --- |
* | "Rotate secret" |
*
* @param {Integrations_Webhooks_RotateInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_webhooks_rotate = /** @type {((inputs?: Integrations_Webhooks_RotateInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Webhooks_RotateInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_webhooks_rotate(inputs)
	if (locale === "cs") return __cs.integrations_webhooks_rotate(inputs)
	return __en.integrations_webhooks_rotate(inputs)
});
/**
* | countPlural | output |
* | --- | --- |
* | "one" | "You get a new secret. For the next {count} hour, deliveries carry signatures from both secrets, so your server keeps accepting them while you switch over." |
* | * | "You get a new secret. For the next {count} hours, deliveries carry signatures from both secrets, so your server keeps accepting them while you switch over." |
*
* @param {Integrations_Webhooks_Rotate_BodyInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_webhooks_rotate_body = /** @type {((inputs: Integrations_Webhooks_Rotate_BodyInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Webhooks_Rotate_BodyInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_webhooks_rotate_body(inputs)
	if (locale === "cs") return __cs.integrations_webhooks_rotate_body(inputs)
	return __en.integrations_webhooks_rotate_body(inputs)
});
/**
* | output |
* | --- |
* | "Rotate" |
*
* @param {Integrations_Webhooks_Rotate_ConfirmInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_webhooks_rotate_confirm = /** @type {((inputs?: Integrations_Webhooks_Rotate_ConfirmInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Webhooks_Rotate_ConfirmInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_webhooks_rotate_confirm(inputs)
	if (locale === "cs") return __cs.integrations_webhooks_rotate_confirm(inputs)
	return __en.integrations_webhooks_rotate_confirm(inputs)
});
/**
* | output |
* | --- |
* | "Rotate the signing secret of {host}" |
*
* @param {Integrations_Webhooks_Rotate_NamedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_webhooks_rotate_named = /** @type {((inputs: Integrations_Webhooks_Rotate_NamedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Webhooks_Rotate_NamedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_webhooks_rotate_named(inputs)
	if (locale === "cs") return __cs.integrations_webhooks_rotate_named(inputs)
	return __en.integrations_webhooks_rotate_named(inputs)
});
/**
* | output |
* | --- |
* | "Rotate the signing secret?" |
*
* @param {Integrations_Webhooks_Rotate_TitleInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_webhooks_rotate_title = /** @type {((inputs?: Integrations_Webhooks_Rotate_TitleInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Webhooks_Rotate_TitleInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_webhooks_rotate_title(inputs)
	if (locale === "cs") return __cs.integrations_webhooks_rotate_title(inputs)
	return __en.integrations_webhooks_rotate_title(inputs)
});
/**
* | output |
* | --- |
* | "Endpoint saved" |
*
* @param {Integrations_Webhooks_SavedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_webhooks_saved = /** @type {((inputs?: Integrations_Webhooks_SavedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Webhooks_SavedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_webhooks_saved(inputs)
	if (locale === "cs") return __cs.integrations_webhooks_saved(inputs)
	return __en.integrations_webhooks_saved(inputs)
});
/**
* | output |
* | --- |
* | "Copy this secret now. You won't see it again." |
*
* @param {Integrations_Webhooks_Secret_OnceInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_webhooks_secret_once = /** @type {((inputs?: Integrations_Webhooks_Secret_OnceInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Webhooks_Secret_OnceInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_webhooks_secret_once(inputs)
	if (locale === "cs") return __cs.integrations_webhooks_secret_once(inputs)
	return __en.integrations_webhooks_secret_once(inputs)
});
/**
* | output |
* | --- |
* | "The previous secret keeps working until {time}." |
*
* @param {Integrations_Webhooks_Secret_PreviousInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_webhooks_secret_previous = /** @type {((inputs: Integrations_Webhooks_Secret_PreviousInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Webhooks_Secret_PreviousInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_webhooks_secret_previous(inputs)
	if (locale === "cs") return __cs.integrations_webhooks_secret_previous(inputs)
	return __en.integrations_webhooks_secret_previous(inputs)
});
/**
* | output |
* | --- |
* | "Signing secret" |
*
* @param {Integrations_Webhooks_Secret_TitleInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_webhooks_secret_title = /** @type {((inputs?: Integrations_Webhooks_Secret_TitleInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Webhooks_Secret_TitleInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_webhooks_secret_title(inputs)
	if (locale === "cs") return __cs.integrations_webhooks_secret_title(inputs)
	return __en.integrations_webhooks_secret_title(inputs)
});
/**
* | output |
* | --- |
* | "Your server uses it to check the webhook-signature header of every delivery." |
*
* @param {Integrations_Webhooks_Secret_UseInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_webhooks_secret_use = /** @type {((inputs?: Integrations_Webhooks_Secret_UseInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Webhooks_Secret_UseInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_webhooks_secret_use(inputs)
	if (locale === "cs") return __cs.integrations_webhooks_secret_use(inputs)
	return __en.integrations_webhooks_secret_use(inputs)
});
/**
* | output |
* | --- |
* | "Failed" |
*
* @param {Integrations_Webhooks_State_DeadInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_webhooks_state_dead = /** @type {((inputs?: Integrations_Webhooks_State_DeadInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Webhooks_State_DeadInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_webhooks_state_dead(inputs)
	if (locale === "cs") return __cs.integrations_webhooks_state_dead(inputs)
	return __en.integrations_webhooks_state_dead(inputs)
});
/**
* | output |
* | --- |
* | "Delivered" |
*
* @param {Integrations_Webhooks_State_DeliveredInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_webhooks_state_delivered = /** @type {((inputs?: Integrations_Webhooks_State_DeliveredInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Webhooks_State_DeliveredInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_webhooks_state_delivered(inputs)
	if (locale === "cs") return __cs.integrations_webhooks_state_delivered(inputs)
	return __en.integrations_webhooks_state_delivered(inputs)
});
/**
* | output |
* | --- |
* | "Sending" |
*
* @param {Integrations_Webhooks_State_DeliveringInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_webhooks_state_delivering = /** @type {((inputs?: Integrations_Webhooks_State_DeliveringInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Webhooks_State_DeliveringInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_webhooks_state_delivering(inputs)
	if (locale === "cs") return __cs.integrations_webhooks_state_delivering(inputs)
	return __en.integrations_webhooks_state_delivering(inputs)
});
/**
* | output |
* | --- |
* | "Waiting" |
*
* @param {Integrations_Webhooks_State_PendingInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_webhooks_state_pending = /** @type {((inputs?: Integrations_Webhooks_State_PendingInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Webhooks_State_PendingInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_webhooks_state_pending(inputs)
	if (locale === "cs") return __cs.integrations_webhooks_state_pending(inputs)
	return __en.integrations_webhooks_state_pending(inputs)
});
/**
* | output |
* | --- |
* | "Retry scheduled" |
*
* @param {Integrations_Webhooks_State_Retry_WaitInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_webhooks_state_retry_wait = /** @type {((inputs?: Integrations_Webhooks_State_Retry_WaitInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Webhooks_State_Retry_WaitInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_webhooks_state_retry_wait(inputs)
	if (locale === "cs") return __cs.integrations_webhooks_state_retry_wait(inputs)
	return __en.integrations_webhooks_state_retry_wait(inputs)
});
/**
* | output |
* | --- |
* | "Send test" |
*
* @param {Integrations_Webhooks_TestInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_webhooks_test = /** @type {((inputs?: Integrations_Webhooks_TestInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Webhooks_TestInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_webhooks_test(inputs)
	if (locale === "cs") return __cs.integrations_webhooks_test(inputs)
	return __en.integrations_webhooks_test(inputs)
});
/**
* | output |
* | --- |
* | "Turn the endpoint on before you send a test." |
*
* @param {Integrations_Webhooks_Test_DisabledInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_webhooks_test_disabled = /** @type {((inputs?: Integrations_Webhooks_Test_DisabledInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Webhooks_Test_DisabledInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_webhooks_test_disabled(inputs)
	if (locale === "cs") return __cs.integrations_webhooks_test_disabled(inputs)
	return __en.integrations_webhooks_test_disabled(inputs)
});
/**
* | output |
* | --- |
* | "You've sent too many test events to this endpoint. Try again in an hour." |
*
* @param {Integrations_Webhooks_Test_LimitInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_webhooks_test_limit = /** @type {((inputs?: Integrations_Webhooks_Test_LimitInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Webhooks_Test_LimitInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_webhooks_test_limit(inputs)
	if (locale === "cs") return __cs.integrations_webhooks_test_limit(inputs)
	return __en.integrations_webhooks_test_limit(inputs)
});
/**
* | output |
* | --- |
* | "Send a test event to {host}" |
*
* @param {Integrations_Webhooks_Test_NamedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_webhooks_test_named = /** @type {((inputs: Integrations_Webhooks_Test_NamedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Webhooks_Test_NamedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_webhooks_test_named(inputs)
	if (locale === "cs") return __cs.integrations_webhooks_test_named(inputs)
	return __en.integrations_webhooks_test_named(inputs)
});
/**
* | output |
* | --- |
* | "Test event queued. It goes out within a minute." |
*
* @param {Integrations_Webhooks_Test_SentInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_webhooks_test_sent = /** @type {((inputs?: Integrations_Webhooks_Test_SentInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Webhooks_Test_SentInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_webhooks_test_sent(inputs)
	if (locale === "cs") return __cs.integrations_webhooks_test_sent(inputs)
	return __en.integrations_webhooks_test_sent(inputs)
});
/**
* | output |
* | --- |
* | "Webhooks" |
*
* @param {Integrations_Webhooks_TitleInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_webhooks_title = /** @type {((inputs?: Integrations_Webhooks_TitleInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Webhooks_TitleInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_webhooks_title(inputs)
	if (locale === "cs") return __cs.integrations_webhooks_title(inputs)
	return __en.integrations_webhooks_title(inputs)
});
/**
* | output |
* | --- |
* | "Endpoint turned off" |
*
* @param {Integrations_Webhooks_Turned_OffInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_webhooks_turned_off = /** @type {((inputs?: Integrations_Webhooks_Turned_OffInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Webhooks_Turned_OffInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_webhooks_turned_off(inputs)
	if (locale === "cs") return __cs.integrations_webhooks_turned_off(inputs)
	return __en.integrations_webhooks_turned_off(inputs)
});
/**
* | output |
* | --- |
* | "Endpoint turned on" |
*
* @param {Integrations_Webhooks_Turned_OnInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_webhooks_turned_on = /** @type {((inputs?: Integrations_Webhooks_Turned_OnInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Webhooks_Turned_OnInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_webhooks_turned_on(inputs)
	if (locale === "cs") return __cs.integrations_webhooks_turned_on(inputs)
	return __en.integrations_webhooks_turned_on(inputs)
});
/**
* | output |
* | --- |
* | "Endpoint URL" |
*
* @param {Integrations_Webhooks_UrlInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_webhooks_url = /** @type {((inputs?: Integrations_Webhooks_UrlInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Webhooks_UrlInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_webhooks_url(inputs)
	if (locale === "cs") return __cs.integrations_webhooks_url(inputs)
	return __en.integrations_webhooks_url(inputs)
});
/**
* | output |
* | --- |
* | "An https address on the standard port, for example https://example.com/hooks." |
*
* @param {Integrations_Webhooks_Url_HintInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_webhooks_url_hint = /** @type {((inputs?: Integrations_Webhooks_Url_HintInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Webhooks_Url_HintInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_webhooks_url_hint(inputs)
	if (locale === "cs") return __cs.integrations_webhooks_url_hint(inputs)
	return __en.integrations_webhooks_url_hint(inputs)
});
/**
* | output |
* | --- |
* | "Use an https address on the standard port, with a host name and no user name or password." |
*
* @param {Integrations_Webhooks_Url_InvalidInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const integrations_webhooks_url_invalid = /** @type {((inputs?: Integrations_Webhooks_Url_InvalidInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Integrations_Webhooks_Url_InvalidInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.integrations_webhooks_url_invalid(inputs)
	if (locale === "cs") return __cs.integrations_webhooks_url_invalid(inputs)
	return __en.integrations_webhooks_url_invalid(inputs)
});