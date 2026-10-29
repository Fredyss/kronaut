import { getLocale, experimentalStaticLocale } from "../runtime.js"

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
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
import * as __en from "./en.js"
import * as __sk from "./sk.js"
import * as __cs from "./cs.js"
/**
* | output |
* | --- |
* | "AI-generated" |
*
* @param {Media_Ai_BadgeInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const media_ai_badge = /** @type {((inputs?: Media_Ai_BadgeInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Media_Ai_BadgeInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.media_ai_badge(inputs)
	if (locale === "cs") return __cs.media_ai_badge(inputs)
	return __en.media_ai_badge(inputs)
});
/**
* | output |
* | --- |
* | "The label stays: an API key or agent uploaded or labelled this file." |
*
* @param {Media_Ai_LockedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const media_ai_locked = /** @type {((inputs?: Media_Ai_LockedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Media_Ai_LockedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.media_ai_locked(inputs)
	if (locale === "cs") return __cs.media_ai_locked(inputs)
	return __en.media_ai_locked(inputs)
});
/**
* | output |
* | --- |
* | "Remove AI label" |
*
* @param {Media_Ai_RemoveInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const media_ai_remove = /** @type {((inputs?: Media_Ai_RemoveInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Media_Ai_RemoveInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.media_ai_remove(inputs)
	if (locale === "cs") return __cs.media_ai_remove(inputs)
	return __en.media_ai_remove(inputs)
});
/**
* | output |
* | --- |
* | "AI label removed." |
*
* @param {Media_Ai_RemovedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const media_ai_removed = /** @type {((inputs?: Media_Ai_RemovedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Media_Ai_RemovedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.media_ai_removed(inputs)
	if (locale === "cs") return __cs.media_ai_removed(inputs)
	return __en.media_ai_removed(inputs)
});
/**
* | countPlural | output |
* | --- | --- |
* | "one" | "New posts start with this description. Posts that already use the file keep their own. Up to {count} character." |
* | * | "New posts start with this description. Posts that already use the file keep their own. Up to {count} characters." |
*
* @param {Media_Alt_HintInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const media_alt_hint = /** @type {((inputs: Media_Alt_HintInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Media_Alt_HintInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.media_alt_hint(inputs)
	if (locale === "cs") return __cs.media_alt_hint(inputs)
	return __en.media_alt_hint(inputs)
});
/**
* | output |
* | --- |
* | "Alt text" |
*
* @param {Media_Alt_LabelInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const media_alt_label = /** @type {((inputs?: Media_Alt_LabelInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Media_Alt_LabelInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.media_alt_label(inputs)
	if (locale === "cs") return __cs.media_alt_label(inputs)
	return __en.media_alt_label(inputs)
});
/**
* | output |
* | --- |
* | "Save alt text" |
*
* @param {Media_Alt_SaveInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const media_alt_save = /** @type {((inputs?: Media_Alt_SaveInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Media_Alt_SaveInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.media_alt_save(inputs)
	if (locale === "cs") return __cs.media_alt_save(inputs)
	return __en.media_alt_save(inputs)
});
/**
* | output |
* | --- |
* | "Alt text saved." |
*
* @param {Media_Alt_SavedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const media_alt_saved = /** @type {((inputs?: Media_Alt_SavedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Media_Alt_SavedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.media_alt_saved(inputs)
	if (locale === "cs") return __cs.media_alt_saved(inputs)
	return __en.media_alt_saved(inputs)
});
/**
* | output |
* | --- |
* | "Delete" |
*
* @param {Media_DeleteInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const media_delete = /** @type {((inputs?: Media_DeleteInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Media_DeleteInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.media_delete(inputs)
	if (locale === "cs") return __cs.media_delete(inputs)
	return __en.media_delete(inputs)
});
/**
* | output |
* | --- |
* | "Delete this file? It leaves the library now, and its data is erased after 30 days." |
*
* @param {Media_Delete_BodyInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const media_delete_body = /** @type {((inputs?: Media_Delete_BodyInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Media_Delete_BodyInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.media_delete_body(inputs)
	if (locale === "cs") return __cs.media_delete_body(inputs)
	return __en.media_delete_body(inputs)
});
/**
* | output |
* | --- |
* | "Delete file" |
*
* @param {Media_Delete_ConfirmInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const media_delete_confirm = /** @type {((inputs?: Media_Delete_ConfirmInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Media_Delete_ConfirmInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.media_delete_confirm(inputs)
	if (locale === "cs") return __cs.media_delete_confirm(inputs)
	return __en.media_delete_confirm(inputs)
});
/**
* | output |
* | --- |
* | "File deleted." |
*
* @param {Media_DeletedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const media_deleted = /** @type {((inputs?: Media_DeletedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Media_DeletedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.media_deleted(inputs)
	if (locale === "cs") return __cs.media_deleted(inputs)
	return __en.media_deleted(inputs)
});
/**
* | output |
* | --- |
* | "Dimensions" |
*
* @param {Media_DimensionsInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const media_dimensions = /** @type {((inputs?: Media_DimensionsInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Media_DimensionsInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.media_dimensions(inputs)
	if (locale === "cs") return __cs.media_dimensions(inputs)
	return __en.media_dimensions(inputs)
});
/**
* | output |
* | --- |
* | "{width} × {height} px" |
*
* @param {Media_Dimensions_ValueInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const media_dimensions_value = /** @type {((inputs: Media_Dimensions_ValueInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Media_Dimensions_ValueInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.media_dimensions_value(inputs)
	if (locale === "cs") return __cs.media_dimensions_value(inputs)
	return __en.media_dimensions_value(inputs)
});
/**
* | output |
* | --- |
* | "Duration" |
*
* @param {Media_DurationInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const media_duration = /** @type {((inputs?: Media_DurationInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Media_DurationInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.media_duration(inputs)
	if (locale === "cs") return __cs.media_duration(inputs)
	return __en.media_duration(inputs)
});
/**
* | output |
* | --- |
* | "Images and videos you add to posts appear here." |
*
* @param {Media_Empty_BodyInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const media_empty_body = /** @type {((inputs?: Media_Empty_BodyInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Media_Empty_BodyInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.media_empty_body(inputs)
	if (locale === "cs") return __cs.media_empty_body(inputs)
	return __en.media_empty_body(inputs)
});
/**
* | output |
* | --- |
* | "Nothing of this kind yet." |
*
* @param {Media_Empty_FilteredInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const media_empty_filtered = /** @type {((inputs?: Media_Empty_FilteredInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Media_Empty_FilteredInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.media_empty_filtered(inputs)
	if (locale === "cs") return __cs.media_empty_filtered(inputs)
	return __en.media_empty_filtered(inputs)
});
/**
* | output |
* | --- |
* | "No media yet" |
*
* @param {Media_Empty_TitleInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const media_empty_title = /** @type {((inputs?: Media_Empty_TitleInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Media_Empty_TitleInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.media_empty_title(inputs)
	if (locale === "cs") return __cs.media_empty_title(inputs)
	return __en.media_empty_title(inputs)
});
/**
* | output |
* | --- |
* | "All" |
*
* @param {Media_Filter_AllInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const media_filter_all = /** @type {((inputs?: Media_Filter_AllInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Media_Filter_AllInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.media_filter_all(inputs)
	if (locale === "cs") return __cs.media_filter_all(inputs)
	return __en.media_filter_all(inputs)
});
/**
* | output |
* | --- |
* | "Images" |
*
* @param {Media_Filter_ImagesInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const media_filter_images = /** @type {((inputs?: Media_Filter_ImagesInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Media_Filter_ImagesInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.media_filter_images(inputs)
	if (locale === "cs") return __cs.media_filter_images(inputs)
	return __en.media_filter_images(inputs)
});
/**
* | output |
* | --- |
* | "Show" |
*
* @param {Media_Filter_LabelInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const media_filter_label = /** @type {((inputs?: Media_Filter_LabelInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Media_Filter_LabelInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.media_filter_label(inputs)
	if (locale === "cs") return __cs.media_filter_label(inputs)
	return __en.media_filter_label(inputs)
});
/**
* | output |
* | --- |
* | "Videos" |
*
* @param {Media_Filter_VideosInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const media_filter_videos = /** @type {((inputs?: Media_Filter_VideosInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Media_Filter_VideosInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.media_filter_videos(inputs)
	if (locale === "cs") return __cs.media_filter_videos(inputs)
	return __en.media_filter_videos(inputs)
});
/**
* | countPlural | output |
* | --- | --- |
* | "one" | "Used in {count} post" |
* | * | "Used in {count} posts" |
*
* @param {Media_In_UseInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const media_in_use = /** @type {((inputs: Media_In_UseInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Media_In_UseInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.media_in_use(inputs)
	if (locale === "cs") return __cs.media_in_use(inputs)
	return __en.media_in_use(inputs)
});
/**
* | output |
* | --- |
* | "A post still uses this file, so it can't be deleted." |
*
* @param {Media_In_Use_ErrorInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const media_in_use_error = /** @type {((inputs?: Media_In_Use_ErrorInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Media_In_Use_ErrorInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.media_in_use_error(inputs)
	if (locale === "cs") return __cs.media_in_use_error(inputs)
	return __en.media_in_use_error(inputs)
});
/**
* | output |
* | --- |
* | "Image" |
*
* @param {Media_Kind_ImageInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const media_kind_image = /** @type {((inputs?: Media_Kind_ImageInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Media_Kind_ImageInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.media_kind_image(inputs)
	if (locale === "cs") return __cs.media_kind_image(inputs)
	return __en.media_kind_image(inputs)
});
/**
* | output |
* | --- |
* | "Video" |
*
* @param {Media_Kind_VideoInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const media_kind_video = /** @type {((inputs?: Media_Kind_VideoInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Media_Kind_VideoInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.media_kind_video(inputs)
	if (locale === "cs") return __cs.media_kind_video(inputs)
	return __en.media_kind_video(inputs)
});
/**
* | output |
* | --- |
* | "Load more" |
*
* @param {Media_Load_MoreInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const media_load_more = /** @type {((inputs?: Media_Load_MoreInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Media_Load_MoreInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.media_load_more(inputs)
	if (locale === "cs") return __cs.media_load_more(inputs)
	return __en.media_load_more(inputs)
});
/**
* | output |
* | --- |
* | "Image uploaded {date}" |
*
* @param {Media_Open_ImageInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const media_open_image = /** @type {((inputs: Media_Open_ImageInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Media_Open_ImageInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.media_open_image(inputs)
	if (locale === "cs") return __cs.media_open_image(inputs)
	return __en.media_open_image(inputs)
});
/**
* | output |
* | --- |
* | "Video uploaded {date}" |
*
* @param {Media_Open_VideoInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const media_open_video = /** @type {((inputs: Media_Open_VideoInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Media_Open_VideoInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.media_open_video(inputs)
	if (locale === "cs") return __cs.media_open_video(inputs)
	return __en.media_open_video(inputs)
});
/**
* | output |
* | --- |
* | "Size" |
*
* @param {Media_SizeInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const media_size = /** @type {((inputs?: Media_SizeInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Media_SizeInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.media_size(inputs)
	if (locale === "cs") return __cs.media_size(inputs)
	return __en.media_size(inputs)
});
/**
* | output |
* | --- |
* | "Processing" |
*
* @param {Media_State_ProcessingInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const media_state_processing = /** @type {((inputs?: Media_State_ProcessingInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Media_State_ProcessingInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.media_state_processing(inputs)
	if (locale === "cs") return __cs.media_state_processing(inputs)
	return __en.media_state_processing(inputs)
});
/**
* | output |
* | --- |
* | "Rejected" |
*
* @param {Media_State_RejectedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const media_state_rejected = /** @type {((inputs?: Media_State_RejectedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Media_State_RejectedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.media_state_rejected(inputs)
	if (locale === "cs") return __cs.media_state_rejected(inputs)
	return __en.media_state_rejected(inputs)
});
/**
* | output |
* | --- |
* | "Images and videos uploaded to this workspace." |
*
* @param {Media_SubtitleInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const media_subtitle = /** @type {((inputs?: Media_SubtitleInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Media_SubtitleInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.media_subtitle(inputs)
	if (locale === "cs") return __cs.media_subtitle(inputs)
	return __en.media_subtitle(inputs)
});
/**
* | output |
* | --- |
* | "Media library" |
*
* @param {Media_TitleInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const media_title = /** @type {((inputs?: Media_TitleInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Media_TitleInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.media_title(inputs)
	if (locale === "cs") return __cs.media_title(inputs)
	return __en.media_title(inputs)
});
/**
* | output |
* | --- |
* | "Type" |
*
* @param {Media_TypeInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const media_type = /** @type {((inputs?: Media_TypeInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Media_TypeInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.media_type(inputs)
	if (locale === "cs") return __cs.media_type(inputs)
	return __en.media_type(inputs)
});
/**
* | output |
* | --- |
* | "Uploaded" |
*
* @param {Media_UploadedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const media_uploaded = /** @type {((inputs?: Media_UploadedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Media_UploadedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.media_uploaded(inputs)
	if (locale === "cs") return __cs.media_uploaded(inputs)
	return __en.media_uploaded(inputs)
});
/**
* | output |
* | --- |
* | "No post uses this file." |
*
* @param {Media_Usage_NoneInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const media_usage_none = /** @type {((inputs?: Media_Usage_NoneInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Media_Usage_NoneInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.media_usage_none(inputs)
	if (locale === "cs") return __cs.media_usage_none(inputs)
	return __en.media_usage_none(inputs)
});
/**
* | output |
* | --- |
* | "Scheduled for {when}" |
*
* @param {Media_Usage_ScheduledInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const media_usage_scheduled = /** @type {((inputs: Media_Usage_ScheduledInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Media_Usage_ScheduledInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.media_usage_scheduled(inputs)
	if (locale === "cs") return __cs.media_usage_scheduled(inputs)
	return __en.media_usage_scheduled(inputs)
});
/**
* | output |
* | --- |
* | "Used in" |
*
* @param {Media_Usage_TitleInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const media_usage_title = /** @type {((inputs?: Media_Usage_TitleInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Media_Usage_TitleInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.media_usage_title(inputs)
	if (locale === "cs") return __cs.media_usage_title(inputs)
	return __en.media_usage_title(inputs)
});
/**
* | output |
* | --- |
* | "Untitled post" |
*
* @param {Media_Usage_UntitledInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const media_usage_untitled = /** @type {((inputs?: Media_Usage_UntitledInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Media_Usage_UntitledInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.media_usage_untitled(inputs)
	if (locale === "cs") return __cs.media_usage_untitled(inputs)
	return __en.media_usage_untitled(inputs)
});