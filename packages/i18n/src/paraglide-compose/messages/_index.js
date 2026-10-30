import { getLocale, experimentalStaticLocale } from "../runtime.js"

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Compose_Add_CommentInputs */
/** @typedef {{}} Compose_Add_ReplyInputs */
/** @typedef {{}} Compose_Ai_Generated_HintInputs */
/** @typedef {{ position: NonNullable<unknown> }} Compose_Ai_Generated_LabelInputs */
/** @typedef {{ count: NonNullable<unknown> }} Compose_Alt_Text_HintInputs */
/** @typedef {{ position: NonNullable<unknown> }} Compose_Alt_Text_LabelInputs */
/** @typedef {{}} Compose_BackInputs */
/** @typedef {{ max: NonNullable<unknown> }} Compose_Channel_Image_Too_LargeInputs */
/** @typedef {{}} Compose_Channel_Image_TypeInputs */
/** @typedef {{}} Compose_Channel_Needs_ImageInputs */
/** @typedef {{ count: NonNullable<unknown> }} Compose_Channel_Too_Many_ImagesInputs */
/** @typedef {{}} Compose_Channel_UnsupportedInputs */
/** @typedef {{}} Compose_Channel_Video_UnsupportedInputs */
/** @typedef {{}} Compose_Channels_TitleInputs */
/** @typedef {{ channels: NonNullable<unknown> }} Compose_Check_ContentInputs */
/** @typedef {{}} Compose_Comment_LabelInputs */
/** @typedef {{}} Compose_Connect_ChannelInputs */
/** @typedef {{ channel: NonNullable<unknown> }} Compose_CustomizeInputs */
/** @typedef {{}} Compose_CustomizedInputs */
/** @typedef {{ channels: NonNullable<unknown> }} Compose_Edit_Canceled_NoteInputs */
/** @typedef {{}} Compose_Edit_Queue_NoteInputs */
/** @typedef {{}} Compose_Edit_Review_NoteInputs */
/** @typedef {{}} Compose_Edit_Series_NoteInputs */
/** @typedef {{}} Compose_Edit_Series_SkipInputs */
/** @typedef {{ position: NonNullable<unknown> }} Compose_Error_Ai_MarkedInputs */
/** @typedef {{}} Compose_Error_Approval_RequiredInputs */
/** @typedef {{ channels: NonNullable<unknown> }} Compose_Error_Channel_GoneInputs */
/** @typedef {{}} Compose_Error_EmptyInputs */
/** @typedef {{ channel: NonNullable<unknown> }} Compose_Error_Empty_ChannelInputs */
/** @typedef {{}} Compose_Error_FixInputs */
/** @typedef {{}} Compose_Error_No_ChannelInputs */
/** @typedef {{}} Compose_Error_Now_DraftInputs */
/** @typedef {{}} Compose_Error_Post_ChangedInputs */
/** @typedef {{}} Compose_Error_TagsInputs */
/** @typedef {{}} Compose_Error_Tags_OpenedInputs */
/** @typedef {{}} Compose_Error_Tags_UnscheduledInputs */
/** @typedef {{ position: NonNullable<unknown> }} Compose_Error_UploadInputs */
/** @typedef {{ position: NonNullable<unknown>, channel: NonNullable<unknown> }} Compose_Error_Upload_ChannelInputs */
/** @typedef {{ name: NonNullable<unknown> }} Compose_Image_Bad_TypeInputs */
/** @typedef {{ position: NonNullable<unknown> }} Compose_Image_Move_DownInputs */
/** @typedef {{ position: NonNullable<unknown> }} Compose_Image_Move_UpInputs */
/** @typedef {{ position: NonNullable<unknown> }} Compose_Image_PositionInputs */
/** @typedef {{ name: NonNullable<unknown>, max: NonNullable<unknown> }} Compose_Image_Too_BigInputs */
/** @typedef {{}} Compose_Images_AddInputs */
/** @typedef {{ count: NonNullable<unknown>, max: NonNullable<unknown> }} Compose_Images_HintInputs */
/** @typedef {{ count: NonNullable<unknown> }} Compose_Images_LimitInputs */
/** @typedef {{}} Compose_Images_TitleInputs */
/** @typedef {{}} Compose_InheritsInputs */
/** @typedef {{}} Compose_Insert_Saved_TextInputs */
/** @typedef {{}} Compose_Keep_DraftInputs */
/** @typedef {{ channel: NonNullable<unknown> }} Compose_Main_OnlyInputs */
/** @typedef {{}} Compose_Media_ExclusiveInputs */
/** @typedef {{}} Compose_No_ChannelsInputs */
/** @typedef {{}} Compose_Preview_EmptyInputs */
/** @typedef {{}} Compose_Refused_Channel_TwiceInputs */
/** @typedef {{}} Compose_Refused_Channel_UnavailableInputs */
/** @typedef {{}} Compose_Refused_Item_OrderInputs */
/** @typedef {{}} Compose_Refused_Many_VideosInputs */
/** @typedef {{}} Compose_Refused_Media_UnavailableInputs */
/** @typedef {{}} Compose_Refused_Mixed_MediaInputs */
/** @typedef {{}} Compose_Refused_Part_LiveInputs */
/** @typedef {{}} Compose_Refused_Publish_TypeInputs */
/** @typedef {{}} Compose_Refused_Repeated_MediaInputs */
/** @typedef {{}} Compose_Refused_Reply_MediaInputs */
/** @typedef {{}} Compose_Refused_Rich_ContentInputs */
/** @typedef {{}} Compose_Reload_PostInputs */
/** @typedef {{}} Compose_Remove_CommentInputs */
/** @typedef {{ position: NonNullable<unknown> }} Compose_Remove_ReplyInputs */
/** @typedef {{ position: NonNullable<unknown> }} Compose_Reply_LabelInputs */
/** @typedef {{}} Compose_SubtitleInputs */
/** @typedef {{}} Compose_Tab_AllInputs */
/** @typedef {{}} Compose_Tab_ProblemsInputs */
/** @typedef {{}} Compose_Tabs_LabelInputs */
/** @typedef {{}} Compose_Text_LabelInputs */
/** @typedef {{}} Compose_TitleInputs */
/** @typedef {{}} Compose_Use_DefaultInputs */
/** @typedef {{}} Compose_Video_Ai_LabelInputs */
/** @typedef {{}} Compose_Video_Ai_MarkedInputs */
/** @typedef {{}} Compose_Video_Alt_LabelInputs */
/** @typedef {{ name: NonNullable<unknown> }} Compose_Video_Bad_TypeInputs */
/** @typedef {{}} Compose_Video_ExistingInputs */
/** @typedef {{ max: NonNullable<unknown> }} Compose_Video_HintInputs */
/** @typedef {{}} Compose_Video_LimitInputs */
/** @typedef {{ name: NonNullable<unknown> }} Compose_Video_PreviewInputs */
/** @typedef {{}} Compose_Video_ProcessingInputs */
/** @typedef {{}} Compose_Video_ProgressInputs */
/** @typedef {{}} Compose_Video_ReadyInputs */
/** @typedef {{ duration: NonNullable<unknown> }} Compose_Video_Ready_DurationInputs */
/** @typedef {{}} Compose_Video_RetryInputs */
/** @typedef {{ name: NonNullable<unknown>, max: NonNullable<unknown> }} Compose_Video_Too_BigInputs */
/** @typedef {{ percent: NonNullable<unknown> }} Compose_Video_UploadingInputs */
import * as __en from "./en.js"
import * as __sk from "./sk.js"
import * as __cs from "./cs.js"
/**
* | output |
* | --- |
* | "Add first comment" |
*
* @param {Compose_Add_CommentInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_add_comment = /** @type {((inputs?: Compose_Add_CommentInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_Add_CommentInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_add_comment(inputs)
	if (locale === "cs") return __cs.compose_add_comment(inputs)
	return __en.compose_add_comment(inputs)
});
/**
* | output |
* | --- |
* | "Add reply" |
*
* @param {Compose_Add_ReplyInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_add_reply = /** @type {((inputs?: Compose_Add_ReplyInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_Add_ReplyInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_add_reply(inputs)
	if (locale === "cs") return __cs.compose_add_reply(inputs)
	return __en.compose_add_reply(inputs)
});
/**
* | output |
* | --- |
* | "Instagram marks it as made with AI. The other networks have no such label." |
*
* @param {Compose_Ai_Generated_HintInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_ai_generated_hint = /** @type {((inputs?: Compose_Ai_Generated_HintInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_Ai_Generated_HintInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_ai_generated_hint(inputs)
	if (locale === "cs") return __cs.compose_ai_generated_hint(inputs)
	return __en.compose_ai_generated_hint(inputs)
});
/**
* | output |
* | --- |
* | "Image {position} is AI-generated" |
*
* @param {Compose_Ai_Generated_LabelInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_ai_generated_label = /** @type {((inputs: Compose_Ai_Generated_LabelInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_Ai_Generated_LabelInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_ai_generated_label(inputs)
	if (locale === "cs") return __cs.compose_ai_generated_label(inputs)
	return __en.compose_ai_generated_label(inputs)
});
/**
* | countPlural | output |
* | --- | --- |
* | "one" | "Describe the image for people who can't see it. Up to {count} character." |
* | * | "Describe the image for people who can't see it. Up to {count} characters." |
*
* @param {Compose_Alt_Text_HintInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_alt_text_hint = /** @type {((inputs: Compose_Alt_Text_HintInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_Alt_Text_HintInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_alt_text_hint(inputs)
	if (locale === "cs") return __cs.compose_alt_text_hint(inputs)
	return __en.compose_alt_text_hint(inputs)
});
/**
* | output |
* | --- |
* | "Alt text for image {position}" |
*
* @param {Compose_Alt_Text_LabelInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_alt_text_label = /** @type {((inputs: Compose_Alt_Text_LabelInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_Alt_Text_LabelInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_alt_text_label(inputs)
	if (locale === "cs") return __cs.compose_alt_text_label(inputs)
	return __en.compose_alt_text_label(inputs)
});
/**
* | output |
* | --- |
* | "Back" |
*
* @param {Compose_BackInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_back = /** @type {((inputs?: Compose_BackInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_BackInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_back(inputs)
	if (locale === "cs") return __cs.compose_back(inputs)
	return __en.compose_back(inputs)
});
/**
* | output |
* | --- |
* | "An image is larger than the {max} this network accepts." |
*
* @param {Compose_Channel_Image_Too_LargeInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_channel_image_too_large = /** @type {((inputs: Compose_Channel_Image_Too_LargeInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_Channel_Image_Too_LargeInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_channel_image_too_large(inputs)
	if (locale === "cs") return __cs.compose_channel_image_too_large(inputs)
	return __en.compose_channel_image_too_large(inputs)
});
/**
* | output |
* | --- |
* | "This network doesn't accept the format of an attached image." |
*
* @param {Compose_Channel_Image_TypeInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_channel_image_type = /** @type {((inputs?: Compose_Channel_Image_TypeInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_Channel_Image_TypeInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_channel_image_type(inputs)
	if (locale === "cs") return __cs.compose_channel_image_type(inputs)
	return __en.compose_channel_image_type(inputs)
});
/**
* | output |
* | --- |
* | "Needs an image or a video." |
*
* @param {Compose_Channel_Needs_ImageInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_channel_needs_image = /** @type {((inputs?: Compose_Channel_Needs_ImageInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_Channel_Needs_ImageInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_channel_needs_image(inputs)
	if (locale === "cs") return __cs.compose_channel_needs_image(inputs)
	return __en.compose_channel_needs_image(inputs)
});
/**
* | countPlural | output |
* | --- | --- |
* | "one" | "This network accepts at most {count} image." |
* | * | "This network accepts at most {count} images." |
*
* @param {Compose_Channel_Too_Many_ImagesInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_channel_too_many_images = /** @type {((inputs: Compose_Channel_Too_Many_ImagesInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_Channel_Too_Many_ImagesInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_channel_too_many_images(inputs)
	if (locale === "cs") return __cs.compose_channel_too_many_images(inputs)
	return __en.compose_channel_too_many_images(inputs)
});
/**
* | output |
* | --- |
* | "Posting to this network isn't supported yet." |
*
* @param {Compose_Channel_UnsupportedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_channel_unsupported = /** @type {((inputs?: Compose_Channel_UnsupportedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_Channel_UnsupportedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_channel_unsupported(inputs)
	if (locale === "cs") return __cs.compose_channel_unsupported(inputs)
	return __en.compose_channel_unsupported(inputs)
});
/**
* | output |
* | --- |
* | "Video isn't supported on this network yet." |
*
* @param {Compose_Channel_Video_UnsupportedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_channel_video_unsupported = /** @type {((inputs?: Compose_Channel_Video_UnsupportedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_Channel_Video_UnsupportedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_channel_video_unsupported(inputs)
	if (locale === "cs") return __cs.compose_channel_video_unsupported(inputs)
	return __en.compose_channel_video_unsupported(inputs)
});
/**
* | output |
* | --- |
* | "Channels" |
*
* @param {Compose_Channels_TitleInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_channels_title = /** @type {((inputs?: Compose_Channels_TitleInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_Channels_TitleInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_channels_title(inputs)
	if (locale === "cs") return __cs.compose_channels_title(inputs)
	return __en.compose_channels_title(inputs)
});
/**
* | output |
* | --- |
* | "Check the content for {channels}." |
*
* @param {Compose_Check_ContentInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_check_content = /** @type {((inputs: Compose_Check_ContentInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_Check_ContentInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_check_content(inputs)
	if (locale === "cs") return __cs.compose_check_content(inputs)
	return __en.compose_check_content(inputs)
});
/**
* | output |
* | --- |
* | "First comment" |
*
* @param {Compose_Comment_LabelInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_comment_label = /** @type {((inputs?: Compose_Comment_LabelInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_Comment_LabelInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_comment_label(inputs)
	if (locale === "cs") return __cs.compose_comment_label(inputs)
	return __en.compose_comment_label(inputs)
});
/**
* | output |
* | --- |
* | "Connect a channel" |
*
* @param {Compose_Connect_ChannelInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_connect_channel = /** @type {((inputs?: Compose_Connect_ChannelInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_Connect_ChannelInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_connect_channel(inputs)
	if (locale === "cs") return __cs.compose_connect_channel(inputs)
	return __en.compose_connect_channel(inputs)
});
/**
* | output |
* | --- |
* | "Customize for {channel}" |
*
* @param {Compose_CustomizeInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_customize = /** @type {((inputs: Compose_CustomizeInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_CustomizeInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_customize(inputs)
	if (locale === "cs") return __cs.compose_customize(inputs)
	return __en.compose_customize(inputs)
});
/**
* | output |
* | --- |
* | "Customized" |
*
* @param {Compose_CustomizedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_customized = /** @type {((inputs?: Compose_CustomizedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_CustomizedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_customized(inputs)
	if (locale === "cs") return __cs.compose_customized(inputs)
	return __en.compose_customized(inputs)
});
/**
* | output |
* | --- |
* | "Canceled on: {channels}. Saving a change removes these from the post; tick one to publish to it again." |
*
* @param {Compose_Edit_Canceled_NoteInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_edit_canceled_note = /** @type {((inputs: Compose_Edit_Canceled_NoteInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_Edit_Canceled_NoteInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_edit_canceled_note(inputs)
	if (locale === "cs") return __cs.compose_edit_canceled_note(inputs)
	return __en.compose_edit_canceled_note(inputs)
});
/**
* | output |
* | --- |
* | "Saving takes the next free slots in each channel's queue." |
*
* @param {Compose_Edit_Queue_NoteInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_edit_queue_note = /** @type {((inputs?: Compose_Edit_Queue_NoteInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_Edit_Queue_NoteInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_edit_queue_note(inputs)
	if (locale === "cs") return __cs.compose_edit_queue_note(inputs)
	return __en.compose_edit_queue_note(inputs)
});
/**
* | output |
* | --- |
* | "Saving changed content withdraws the open approval request." |
*
* @param {Compose_Edit_Review_NoteInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_edit_review_note = /** @type {((inputs?: Compose_Edit_Review_NoteInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_Edit_Review_NoteInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_edit_review_note(inputs)
	if (locale === "cs") return __cs.compose_edit_review_note(inputs)
	return __en.compose_edit_review_note(inputs)
});
/**
* | output |
* | --- |
* | "The series schedules this draft at that time." |
*
* @param {Compose_Edit_Series_NoteInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_edit_series_note = /** @type {((inputs?: Compose_Edit_Series_NoteInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_Edit_Series_NoteInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_edit_series_note(inputs)
	if (locale === "cs") return __cs.compose_edit_series_note(inputs)
	return __en.compose_edit_series_note(inputs)
});
/**
* | output |
* | --- |
* | "Keeping this as a draft skips this occurrence of the series." |
*
* @param {Compose_Edit_Series_SkipInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_edit_series_skip = /** @type {((inputs?: Compose_Edit_Series_SkipInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_Edit_Series_SkipInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_edit_series_skip(inputs)
	if (locale === "cs") return __cs.compose_edit_series_skip(inputs)
	return __en.compose_edit_series_skip(inputs)
});
/**
* | output |
* | --- |
* | "Image {position} is already marked as AI-generated in this workspace, and the mark can't be removed yet. Tick “Image {position} is AI-generated” to post it, ..." |
*
* @param {Compose_Error_Ai_MarkedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_error_ai_marked = /** @type {((inputs: Compose_Error_Ai_MarkedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_Error_Ai_MarkedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_error_ai_marked(inputs)
	if (locale === "cs") return __cs.compose_error_ai_marked(inputs)
	return __en.compose_error_ai_marked(inputs)
});
/**
* | output |
* | --- |
* | "This post needs an approval before it can be scheduled." |
*
* @param {Compose_Error_Approval_RequiredInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_error_approval_required = /** @type {((inputs?: Compose_Error_Approval_RequiredInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_Error_Approval_RequiredInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_error_approval_required(inputs)
	if (locale === "cs") return __cs.compose_error_approval_required(inputs)
	return __en.compose_error_approval_required(inputs)
});
/**
* | output |
* | --- |
* | "This post can't be saved because a channel it goes to is no longer available: {channels}." |
*
* @param {Compose_Error_Channel_GoneInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_error_channel_gone = /** @type {((inputs: Compose_Error_Channel_GoneInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_Error_Channel_GoneInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_error_channel_gone(inputs)
	if (locale === "cs") return __cs.compose_error_channel_gone(inputs)
	return __en.compose_error_channel_gone(inputs)
});
/**
* | output |
* | --- |
* | "Write some text or add an image." |
*
* @param {Compose_Error_EmptyInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_error_empty = /** @type {((inputs?: Compose_Error_EmptyInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_Error_EmptyInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_error_empty(inputs)
	if (locale === "cs") return __cs.compose_error_empty(inputs)
	return __en.compose_error_empty(inputs)
});
/**
* | output |
* | --- |
* | "Write some text or add an image for {channel}." |
*
* @param {Compose_Error_Empty_ChannelInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_error_empty_channel = /** @type {((inputs: Compose_Error_Empty_ChannelInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_Error_Empty_ChannelInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_error_empty_channel(inputs)
	if (locale === "cs") return __cs.compose_error_empty_channel(inputs)
	return __en.compose_error_empty_channel(inputs)
});
/**
* | output |
* | --- |
* | "The post can't go out yet. Fix the following and try again:" |
*
* @param {Compose_Error_FixInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_error_fix = /** @type {((inputs?: Compose_Error_FixInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_Error_FixInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_error_fix(inputs)
	if (locale === "cs") return __cs.compose_error_fix(inputs)
	return __en.compose_error_fix(inputs)
});
/**
* | output |
* | --- |
* | "Pick at least one channel." |
*
* @param {Compose_Error_No_ChannelInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_error_no_channel = /** @type {((inputs?: Compose_Error_No_ChannelInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_Error_No_ChannelInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_error_no_channel(inputs)
	if (locale === "cs") return __cs.compose_error_no_channel(inputs)
	return __en.compose_error_no_channel(inputs)
});
/**
* | output |
* | --- |
* | "The post is now a draft. Saving again continues from there." |
*
* @param {Compose_Error_Now_DraftInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_error_now_draft = /** @type {((inputs?: Compose_Error_Now_DraftInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_Error_Now_DraftInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_error_now_draft(inputs)
	if (locale === "cs") return __cs.compose_error_now_draft(inputs)
	return __en.compose_error_now_draft(inputs)
});
/**
* | output |
* | --- |
* | "This post changed after you opened it. Reload it to see the latest version; your edits here will be lost." |
*
* @param {Compose_Error_Post_ChangedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_error_post_changed = /** @type {((inputs?: Compose_Error_Post_ChangedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_Error_Post_ChangedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_error_post_changed(inputs)
	if (locale === "cs") return __cs.compose_error_post_changed(inputs)
	return __en.compose_error_post_changed(inputs)
});
/**
* | output |
* | --- |
* | "The post was saved, but its tags weren't. Saving again tries once more." |
*
* @param {Compose_Error_TagsInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_error_tags = /** @type {((inputs?: Compose_Error_TagsInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_Error_TagsInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_error_tags(inputs)
	if (locale === "cs") return __cs.compose_error_tags(inputs)
	return __en.compose_error_tags(inputs)
});
/**
* | output |
* | --- |
* | "The tags weren't saved, so nothing else in this save changed. Saving again tries once more." |
*
* @param {Compose_Error_Tags_OpenedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_error_tags_opened = /** @type {((inputs?: Compose_Error_Tags_OpenedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_Error_Tags_OpenedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_error_tags_opened(inputs)
	if (locale === "cs") return __cs.compose_error_tags_opened(inputs)
	return __en.compose_error_tags_opened(inputs)
});
/**
* | output |
* | --- |
* | "The post was saved as a draft, but its tags weren't, so it isn't scheduled yet. Saving again finishes it." |
*
* @param {Compose_Error_Tags_UnscheduledInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_error_tags_unscheduled = /** @type {((inputs?: Compose_Error_Tags_UnscheduledInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_Error_Tags_UnscheduledInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_error_tags_unscheduled(inputs)
	if (locale === "cs") return __cs.compose_error_tags_unscheduled(inputs)
	return __en.compose_error_tags_unscheduled(inputs)
});
/**
* | output |
* | --- |
* | "Image {position} couldn't be uploaded." |
*
* @param {Compose_Error_UploadInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_error_upload = /** @type {((inputs: Compose_Error_UploadInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_Error_UploadInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_error_upload(inputs)
	if (locale === "cs") return __cs.compose_error_upload(inputs)
	return __en.compose_error_upload(inputs)
});
/**
* | output |
* | --- |
* | "Image {position} for {channel} couldn't be uploaded." |
*
* @param {Compose_Error_Upload_ChannelInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_error_upload_channel = /** @type {((inputs: Compose_Error_Upload_ChannelInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_Error_Upload_ChannelInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_error_upload_channel(inputs)
	if (locale === "cs") return __cs.compose_error_upload_channel(inputs)
	return __en.compose_error_upload_channel(inputs)
});
/**
* | output |
* | --- |
* | "{name}: only JPEG, PNG and WebP images can be added." |
*
* @param {Compose_Image_Bad_TypeInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_image_bad_type = /** @type {((inputs: Compose_Image_Bad_TypeInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_Image_Bad_TypeInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_image_bad_type(inputs)
	if (locale === "cs") return __cs.compose_image_bad_type(inputs)
	return __en.compose_image_bad_type(inputs)
});
/**
* | output |
* | --- |
* | "Move image {position} down" |
*
* @param {Compose_Image_Move_DownInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_image_move_down = /** @type {((inputs: Compose_Image_Move_DownInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_Image_Move_DownInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_image_move_down(inputs)
	if (locale === "cs") return __cs.compose_image_move_down(inputs)
	return __en.compose_image_move_down(inputs)
});
/**
* | output |
* | --- |
* | "Move image {position} up" |
*
* @param {Compose_Image_Move_UpInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_image_move_up = /** @type {((inputs: Compose_Image_Move_UpInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_Image_Move_UpInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_image_move_up(inputs)
	if (locale === "cs") return __cs.compose_image_move_up(inputs)
	return __en.compose_image_move_up(inputs)
});
/**
* | output |
* | --- |
* | "Image {position}" |
*
* @param {Compose_Image_PositionInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_image_position = /** @type {((inputs: Compose_Image_PositionInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_Image_PositionInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_image_position(inputs)
	if (locale === "cs") return __cs.compose_image_position(inputs)
	return __en.compose_image_position(inputs)
});
/**
* | output |
* | --- |
* | "{name}: the file is larger than {max}." |
*
* @param {Compose_Image_Too_BigInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_image_too_big = /** @type {((inputs: Compose_Image_Too_BigInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_Image_Too_BigInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_image_too_big(inputs)
	if (locale === "cs") return __cs.compose_image_too_big(inputs)
	return __en.compose_image_too_big(inputs)
});
/**
* | output |
* | --- |
* | "Add images" |
*
* @param {Compose_Images_AddInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_images_add = /** @type {((inputs?: Compose_Images_AddInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_Images_AddInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_images_add(inputs)
	if (locale === "cs") return __cs.compose_images_add(inputs)
	return __en.compose_images_add(inputs)
});
/**
* | countPlural | output |
* | --- | --- |
* | "one" | "Up to {count} image: JPEG, PNG or WebP, at most {max} each." |
* | * | "Up to {count} images: JPEG, PNG or WebP, at most {max} each." |
*
* @param {Compose_Images_HintInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_images_hint = /** @type {((inputs: Compose_Images_HintInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_Images_HintInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_images_hint(inputs)
	if (locale === "cs") return __cs.compose_images_hint(inputs)
	return __en.compose_images_hint(inputs)
});
/**
* | countPlural | output |
* | --- | --- |
* | "one" | "A post can have at most {count} image." |
* | * | "A post can have at most {count} images." |
*
* @param {Compose_Images_LimitInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_images_limit = /** @type {((inputs: Compose_Images_LimitInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_Images_LimitInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_images_limit(inputs)
	if (locale === "cs") return __cs.compose_images_limit(inputs)
	return __en.compose_images_limit(inputs)
});
/**
* | output |
* | --- |
* | "Images" |
*
* @param {Compose_Images_TitleInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_images_title = /** @type {((inputs?: Compose_Images_TitleInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_Images_TitleInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_images_title(inputs)
	if (locale === "cs") return __cs.compose_images_title(inputs)
	return __en.compose_images_title(inputs)
});
/**
* | output |
* | --- |
* | "Uses the content from All channels." |
*
* @param {Compose_InheritsInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_inherits = /** @type {((inputs?: Compose_InheritsInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_InheritsInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_inherits(inputs)
	if (locale === "cs") return __cs.compose_inherits(inputs)
	return __en.compose_inherits(inputs)
});
/**
* | output |
* | --- |
* | "Insert saved text" |
*
* @param {Compose_Insert_Saved_TextInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_insert_saved_text = /** @type {((inputs?: Compose_Insert_Saved_TextInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_Insert_Saved_TextInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_insert_saved_text(inputs)
	if (locale === "cs") return __cs.compose_insert_saved_text(inputs)
	return __en.compose_insert_saved_text(inputs)
});
/**
* | output |
* | --- |
* | "Keep as draft" |
*
* @param {Compose_Keep_DraftInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_keep_draft = /** @type {((inputs?: Compose_Keep_DraftInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_Keep_DraftInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_keep_draft(inputs)
	if (locale === "cs") return __cs.compose_keep_draft(inputs)
	return __en.compose_keep_draft(inputs)
});
/**
* | output |
* | --- |
* | "{channel} will publish the main post only." |
*
* @param {Compose_Main_OnlyInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_main_only = /** @type {((inputs: Compose_Main_OnlyInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_Main_OnlyInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_main_only(inputs)
	if (locale === "cs") return __cs.compose_main_only(inputs)
	return __en.compose_main_only(inputs)
});
/**
* | output |
* | --- |
* | "A post can have images or one video, not both." |
*
* @param {Compose_Media_ExclusiveInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_media_exclusive = /** @type {((inputs?: Compose_Media_ExclusiveInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_Media_ExclusiveInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_media_exclusive(inputs)
	if (locale === "cs") return __cs.compose_media_exclusive(inputs)
	return __en.compose_media_exclusive(inputs)
});
/**
* | output |
* | --- |
* | "No channels are connected yet." |
*
* @param {Compose_No_ChannelsInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_no_channels = /** @type {((inputs?: Compose_No_ChannelsInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_No_ChannelsInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_no_channels(inputs)
	if (locale === "cs") return __cs.compose_no_channels(inputs)
	return __en.compose_no_channels(inputs)
});
/**
* | output |
* | --- |
* | "Nothing to preview yet." |
*
* @param {Compose_Preview_EmptyInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_preview_empty = /** @type {((inputs?: Compose_Preview_EmptyInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_Preview_EmptyInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_preview_empty(inputs)
	if (locale === "cs") return __cs.compose_preview_empty(inputs)
	return __en.compose_preview_empty(inputs)
});
/**
* | output |
* | --- |
* | "This post can't be edited because it goes to the same channel twice." |
*
* @param {Compose_Refused_Channel_TwiceInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_refused_channel_twice = /** @type {((inputs?: Compose_Refused_Channel_TwiceInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_Refused_Channel_TwiceInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_refused_channel_twice(inputs)
	if (locale === "cs") return __cs.compose_refused_channel_twice(inputs)
	return __en.compose_refused_channel_twice(inputs)
});
/**
* | output |
* | --- |
* | "This post can't be edited because one of its channels isn't available." |
*
* @param {Compose_Refused_Channel_UnavailableInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_refused_channel_unavailable = /** @type {((inputs?: Compose_Refused_Channel_UnavailableInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_Refused_Channel_UnavailableInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_refused_channel_unavailable(inputs)
	if (locale === "cs") return __cs.compose_refused_channel_unavailable(inputs)
	return __en.compose_refused_channel_unavailable(inputs)
});
/**
* | output |
* | --- |
* | "This post can't be edited because its items are in an order the composer can't show." |
*
* @param {Compose_Refused_Item_OrderInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_refused_item_order = /** @type {((inputs?: Compose_Refused_Item_OrderInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_Refused_Item_OrderInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_refused_item_order(inputs)
	if (locale === "cs") return __cs.compose_refused_item_order(inputs)
	return __en.compose_refused_item_order(inputs)
});
/**
* | output |
* | --- |
* | "This post can't be edited because it has more than one video." |
*
* @param {Compose_Refused_Many_VideosInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_refused_many_videos = /** @type {((inputs?: Compose_Refused_Many_VideosInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_Refused_Many_VideosInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_refused_many_videos(inputs)
	if (locale === "cs") return __cs.compose_refused_many_videos(inputs)
	return __en.compose_refused_many_videos(inputs)
});
/**
* | output |
* | --- |
* | "This post can't be edited because some of its media isn't available." |
*
* @param {Compose_Refused_Media_UnavailableInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_refused_media_unavailable = /** @type {((inputs?: Compose_Refused_Media_UnavailableInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_Refused_Media_UnavailableInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_refused_media_unavailable(inputs)
	if (locale === "cs") return __cs.compose_refused_media_unavailable(inputs)
	return __en.compose_refused_media_unavailable(inputs)
});
/**
* | output |
* | --- |
* | "This post can't be edited because it has images next to a video." |
*
* @param {Compose_Refused_Mixed_MediaInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_refused_mixed_media = /** @type {((inputs?: Compose_Refused_Mixed_MediaInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_Refused_Mixed_MediaInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_refused_mixed_media(inputs)
	if (locale === "cs") return __cs.compose_refused_mixed_media(inputs)
	return __en.compose_refused_mixed_media(inputs)
});
/**
* | output |
* | --- |
* | "This post can't be edited because a canceled destination is already live in part." |
*
* @param {Compose_Refused_Part_LiveInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_refused_part_live = /** @type {((inputs?: Compose_Refused_Part_LiveInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_Refused_Part_LiveInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_refused_part_live(inputs)
	if (locale === "cs") return __cs.compose_refused_part_live(inputs)
	return __en.compose_refused_part_live(inputs)
});
/**
* | output |
* | --- |
* | "This post can't be edited because its publish type isn't the one the composer would choose." |
*
* @param {Compose_Refused_Publish_TypeInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_refused_publish_type = /** @type {((inputs?: Compose_Refused_Publish_TypeInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_Refused_Publish_TypeInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_refused_publish_type(inputs)
	if (locale === "cs") return __cs.compose_refused_publish_type(inputs)
	return __en.compose_refused_publish_type(inputs)
});
/**
* | output |
* | --- |
* | "This post can't be edited because it uses the same media twice." |
*
* @param {Compose_Refused_Repeated_MediaInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_refused_repeated_media = /** @type {((inputs?: Compose_Refused_Repeated_MediaInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_Refused_Repeated_MediaInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_refused_repeated_media(inputs)
	if (locale === "cs") return __cs.compose_refused_repeated_media(inputs)
	return __en.compose_refused_repeated_media(inputs)
});
/**
* | output |
* | --- |
* | "This post can't be edited because a reply or comment has media." |
*
* @param {Compose_Refused_Reply_MediaInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_refused_reply_media = /** @type {((inputs?: Compose_Refused_Reply_MediaInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_Refused_Reply_MediaInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_refused_reply_media(inputs)
	if (locale === "cs") return __cs.compose_refused_reply_media(inputs)
	return __en.compose_refused_reply_media(inputs)
});
/**
* | output |
* | --- |
* | "This post can't be edited because its text has formatting the composer can't show." |
*
* @param {Compose_Refused_Rich_ContentInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_refused_rich_content = /** @type {((inputs?: Compose_Refused_Rich_ContentInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_Refused_Rich_ContentInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_refused_rich_content(inputs)
	if (locale === "cs") return __cs.compose_refused_rich_content(inputs)
	return __en.compose_refused_rich_content(inputs)
});
/**
* | output |
* | --- |
* | "Reload the post" |
*
* @param {Compose_Reload_PostInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_reload_post = /** @type {((inputs?: Compose_Reload_PostInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_Reload_PostInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_reload_post(inputs)
	if (locale === "cs") return __cs.compose_reload_post(inputs)
	return __en.compose_reload_post(inputs)
});
/**
* | output |
* | --- |
* | "Remove first comment" |
*
* @param {Compose_Remove_CommentInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_remove_comment = /** @type {((inputs?: Compose_Remove_CommentInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_Remove_CommentInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_remove_comment(inputs)
	if (locale === "cs") return __cs.compose_remove_comment(inputs)
	return __en.compose_remove_comment(inputs)
});
/**
* | output |
* | --- |
* | "Remove reply {position}" |
*
* @param {Compose_Remove_ReplyInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_remove_reply = /** @type {((inputs: Compose_Remove_ReplyInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_Remove_ReplyInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_remove_reply(inputs)
	if (locale === "cs") return __cs.compose_remove_reply(inputs)
	return __en.compose_remove_reply(inputs)
});
/**
* | output |
* | --- |
* | "Reply {position}" |
*
* @param {Compose_Reply_LabelInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_reply_label = /** @type {((inputs: Compose_Reply_LabelInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_Reply_LabelInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_reply_label(inputs)
	if (locale === "cs") return __cs.compose_reply_label(inputs)
	return __en.compose_reply_label(inputs)
});
/**
* | output |
* | --- |
* | "Write it once, pick the channels, then publish it now or schedule it." |
*
* @param {Compose_SubtitleInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_subtitle = /** @type {((inputs?: Compose_SubtitleInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_SubtitleInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_subtitle(inputs)
	if (locale === "cs") return __cs.compose_subtitle(inputs)
	return __en.compose_subtitle(inputs)
});
/**
* | output |
* | --- |
* | "All channels" |
*
* @param {Compose_Tab_AllInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_tab_all = /** @type {((inputs?: Compose_Tab_AllInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_Tab_AllInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_tab_all(inputs)
	if (locale === "cs") return __cs.compose_tab_all(inputs)
	return __en.compose_tab_all(inputs)
});
/**
* | output |
* | --- |
* | "has problems" |
*
* @param {Compose_Tab_ProblemsInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_tab_problems = /** @type {((inputs?: Compose_Tab_ProblemsInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_Tab_ProblemsInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_tab_problems(inputs)
	if (locale === "cs") return __cs.compose_tab_problems(inputs)
	return __en.compose_tab_problems(inputs)
});
/**
* | output |
* | --- |
* | "Content for each channel" |
*
* @param {Compose_Tabs_LabelInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_tabs_label = /** @type {((inputs?: Compose_Tabs_LabelInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_Tabs_LabelInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_tabs_label(inputs)
	if (locale === "cs") return __cs.compose_tabs_label(inputs)
	return __en.compose_tabs_label(inputs)
});
/**
* | output |
* | --- |
* | "Text" |
*
* @param {Compose_Text_LabelInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_text_label = /** @type {((inputs?: Compose_Text_LabelInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_Text_LabelInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_text_label(inputs)
	if (locale === "cs") return __cs.compose_text_label(inputs)
	return __en.compose_text_label(inputs)
});
/**
* | output |
* | --- |
* | "New post" |
*
* @param {Compose_TitleInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_title = /** @type {((inputs?: Compose_TitleInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_TitleInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_title(inputs)
	if (locale === "cs") return __cs.compose_title(inputs)
	return __en.compose_title(inputs)
});
/**
* | output |
* | --- |
* | "Use the content from All channels" |
*
* @param {Compose_Use_DefaultInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_use_default = /** @type {((inputs?: Compose_Use_DefaultInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_Use_DefaultInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_use_default(inputs)
	if (locale === "cs") return __cs.compose_use_default(inputs)
	return __en.compose_use_default(inputs)
});
/**
* | output |
* | --- |
* | "The video is AI-generated" |
*
* @param {Compose_Video_Ai_LabelInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_video_ai_label = /** @type {((inputs?: Compose_Video_Ai_LabelInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_Video_Ai_LabelInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_video_ai_label(inputs)
	if (locale === "cs") return __cs.compose_video_ai_label(inputs)
	return __en.compose_video_ai_label(inputs)
});
/**
* | output |
* | --- |
* | "This video is marked as AI-generated in this workspace, and the label can't be removed." |
*
* @param {Compose_Video_Ai_MarkedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_video_ai_marked = /** @type {((inputs?: Compose_Video_Ai_MarkedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_Video_Ai_MarkedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_video_ai_marked(inputs)
	if (locale === "cs") return __cs.compose_video_ai_marked(inputs)
	return __en.compose_video_ai_marked(inputs)
});
/**
* | output |
* | --- |
* | "Alt text for the video" |
*
* @param {Compose_Video_Alt_LabelInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_video_alt_label = /** @type {((inputs?: Compose_Video_Alt_LabelInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_Video_Alt_LabelInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_video_alt_label(inputs)
	if (locale === "cs") return __cs.compose_video_alt_label(inputs)
	return __en.compose_video_alt_label(inputs)
});
/**
* | output |
* | --- |
* | "{name}: only MP4, QuickTime and WebM videos can be added." |
*
* @param {Compose_Video_Bad_TypeInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_video_bad_type = /** @type {((inputs: Compose_Video_Bad_TypeInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_Video_Bad_TypeInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_video_bad_type(inputs)
	if (locale === "cs") return __cs.compose_video_bad_type(inputs)
	return __en.compose_video_bad_type(inputs)
});
/**
* | output |
* | --- |
* | "Video already in this post" |
*
* @param {Compose_Video_ExistingInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_video_existing = /** @type {((inputs?: Compose_Video_ExistingInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_Video_ExistingInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_video_existing(inputs)
	if (locale === "cs") return __cs.compose_video_existing(inputs)
	return __en.compose_video_existing(inputs)
});
/**
* | output |
* | --- |
* | "Or one MP4, QuickTime or WebM video up to {max}." |
*
* @param {Compose_Video_HintInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_video_hint = /** @type {((inputs: Compose_Video_HintInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_Video_HintInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_video_hint(inputs)
	if (locale === "cs") return __cs.compose_video_hint(inputs)
	return __en.compose_video_hint(inputs)
});
/**
* | output |
* | --- |
* | "A post can have only one video." |
*
* @param {Compose_Video_LimitInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_video_limit = /** @type {((inputs?: Compose_Video_LimitInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_Video_LimitInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_video_limit(inputs)
	if (locale === "cs") return __cs.compose_video_limit(inputs)
	return __en.compose_video_limit(inputs)
});
/**
* | output |
* | --- |
* | "Preview of {name}" |
*
* @param {Compose_Video_PreviewInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_video_preview = /** @type {((inputs: Compose_Video_PreviewInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_Video_PreviewInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_video_preview(inputs)
	if (locale === "cs") return __cs.compose_video_preview(inputs)
	return __en.compose_video_preview(inputs)
});
/**
* | output |
* | --- |
* | "Processing…" |
*
* @param {Compose_Video_ProcessingInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_video_processing = /** @type {((inputs?: Compose_Video_ProcessingInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_Video_ProcessingInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_video_processing(inputs)
	if (locale === "cs") return __cs.compose_video_processing(inputs)
	return __en.compose_video_processing(inputs)
});
/**
* | output |
* | --- |
* | "Upload progress" |
*
* @param {Compose_Video_ProgressInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_video_progress = /** @type {((inputs?: Compose_Video_ProgressInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_Video_ProgressInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_video_progress(inputs)
	if (locale === "cs") return __cs.compose_video_progress(inputs)
	return __en.compose_video_progress(inputs)
});
/**
* | output |
* | --- |
* | "Ready" |
*
* @param {Compose_Video_ReadyInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_video_ready = /** @type {((inputs?: Compose_Video_ReadyInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_Video_ReadyInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_video_ready(inputs)
	if (locale === "cs") return __cs.compose_video_ready(inputs)
	return __en.compose_video_ready(inputs)
});
/**
* | output |
* | --- |
* | "Ready, {duration}" |
*
* @param {Compose_Video_Ready_DurationInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_video_ready_duration = /** @type {((inputs: Compose_Video_Ready_DurationInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_Video_Ready_DurationInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_video_ready_duration(inputs)
	if (locale === "cs") return __cs.compose_video_ready_duration(inputs)
	return __en.compose_video_ready_duration(inputs)
});
/**
* | output |
* | --- |
* | "Retry" |
*
* @param {Compose_Video_RetryInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_video_retry = /** @type {((inputs?: Compose_Video_RetryInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_Video_RetryInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_video_retry(inputs)
	if (locale === "cs") return __cs.compose_video_retry(inputs)
	return __en.compose_video_retry(inputs)
});
/**
* | output |
* | --- |
* | "{name}: the video is larger than {max}." |
*
* @param {Compose_Video_Too_BigInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_video_too_big = /** @type {((inputs: Compose_Video_Too_BigInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_Video_Too_BigInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_video_too_big(inputs)
	if (locale === "cs") return __cs.compose_video_too_big(inputs)
	return __en.compose_video_too_big(inputs)
});
/**
* | output |
* | --- |
* | "Uploading… {percent}" |
*
* @param {Compose_Video_UploadingInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const compose_video_uploading = /** @type {((inputs: Compose_Video_UploadingInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Compose_Video_UploadingInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.compose_video_uploading(inputs)
	if (locale === "cs") return __cs.compose_video_uploading(inputs)
	return __en.compose_video_uploading(inputs)
});