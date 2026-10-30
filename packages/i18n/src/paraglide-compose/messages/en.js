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
/** @typedef {{}} Compose_InsertInputs */
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
import * as registry from "../registry.js"


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

export const compose_back = /** @type {(inputs: Compose_BackInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Back`)
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

export const compose_connect_channel = /** @type {(inputs: Compose_Connect_ChannelInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Connect a channel`)
};

export const compose_customize = /** @type {(inputs: Compose_CustomizeInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Customize for ${i?.channel}`)
};

export const compose_customized = /** @type {(inputs: Compose_CustomizedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Customized`)
};

export const compose_edit_canceled_note = /** @type {(inputs: Compose_Edit_Canceled_NoteInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Canceled on: ${i?.channels}. Saving a change removes these from the post; tick one to publish to it again.`)
};

export const compose_edit_queue_note = /** @type {(inputs: Compose_Edit_Queue_NoteInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Saving takes the next free slots in each channel's queue.`)
};

export const compose_edit_review_note = /** @type {(inputs: Compose_Edit_Review_NoteInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Saving changed content withdraws the open approval request.`)
};

export const compose_edit_series_note = /** @type {(inputs: Compose_Edit_Series_NoteInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`The series schedules this draft at that time.`)
};

export const compose_edit_series_skip = /** @type {(inputs: Compose_Edit_Series_SkipInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Keeping this as a draft skips this occurrence of the series.`)
};

export const compose_error_ai_marked = /** @type {(inputs: Compose_Error_Ai_MarkedInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Image ${i?.position} is already marked as AI-generated in this workspace, and the mark can't be removed yet. Tick “Image ${i?.position} is AI-generated” to post it, or use a different image.`)
};

export const compose_error_approval_required = /** @type {(inputs: Compose_Error_Approval_RequiredInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`This post needs an approval before it can be scheduled.`)
};

export const compose_error_channel_gone = /** @type {(inputs: Compose_Error_Channel_GoneInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`This post can't be saved because a channel it goes to is no longer available: ${i?.channels}.`)
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

export const compose_error_now_draft = /** @type {(inputs: Compose_Error_Now_DraftInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`The post is now a draft. Saving again continues from there.`)
};

export const compose_error_post_changed = /** @type {(inputs: Compose_Error_Post_ChangedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`This post changed after you opened it. Reload it to see the latest version; your edits here will be lost.`)
};

export const compose_error_tags = /** @type {(inputs: Compose_Error_TagsInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`The post was saved, but its tags weren't. Saving again tries once more.`)
};

export const compose_error_tags_opened = /** @type {(inputs: Compose_Error_Tags_OpenedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`The tags weren't saved, so nothing else in this save changed. Saving again tries once more.`)
};

export const compose_error_tags_unscheduled = /** @type {(inputs: Compose_Error_Tags_UnscheduledInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`The post was saved as a draft, but its tags weren't, so it isn't scheduled yet. Saving again finishes it.`)
};

export const compose_error_upload = /** @type {(inputs: Compose_Error_UploadInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Image ${i?.position} couldn't be uploaded.`)
};

export const compose_error_upload_channel = /** @type {(inputs: Compose_Error_Upload_ChannelInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Image ${i?.position} for ${i?.channel} couldn't be uploaded.`)
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

export const compose_insert = /** @type {(inputs: Compose_InsertInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Insert`)
};

export const compose_insert_saved_text = /** @type {(inputs: Compose_Insert_Saved_TextInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Insert saved text`)
};

export const compose_keep_draft = /** @type {(inputs: Compose_Keep_DraftInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Keep as draft`)
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

export const compose_preview_empty = /** @type {(inputs: Compose_Preview_EmptyInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Nothing to preview yet.`)
};

export const compose_refused_channel_twice = /** @type {(inputs: Compose_Refused_Channel_TwiceInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`This post can't be edited because it goes to the same channel twice.`)
};

export const compose_refused_channel_unavailable = /** @type {(inputs: Compose_Refused_Channel_UnavailableInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`This post can't be edited because one of its channels isn't available.`)
};

export const compose_refused_item_order = /** @type {(inputs: Compose_Refused_Item_OrderInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`This post can't be edited because its items are in an order the composer can't show.`)
};

export const compose_refused_many_videos = /** @type {(inputs: Compose_Refused_Many_VideosInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`This post can't be edited because it has more than one video.`)
};

export const compose_refused_media_unavailable = /** @type {(inputs: Compose_Refused_Media_UnavailableInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`This post can't be edited because some of its media isn't available.`)
};

export const compose_refused_mixed_media = /** @type {(inputs: Compose_Refused_Mixed_MediaInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`This post can't be edited because it has images next to a video.`)
};

export const compose_refused_part_live = /** @type {(inputs: Compose_Refused_Part_LiveInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`This post can't be edited because a canceled destination is already live in part.`)
};

export const compose_refused_publish_type = /** @type {(inputs: Compose_Refused_Publish_TypeInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`This post can't be edited because its publish type isn't the one the composer would choose.`)
};

export const compose_refused_repeated_media = /** @type {(inputs: Compose_Refused_Repeated_MediaInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`This post can't be edited because it uses the same media twice.`)
};

export const compose_refused_reply_media = /** @type {(inputs: Compose_Refused_Reply_MediaInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`This post can't be edited because a reply or comment has media.`)
};

export const compose_refused_rich_content = /** @type {(inputs: Compose_Refused_Rich_ContentInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`This post can't be edited because its text has formatting the composer can't show.`)
};

export const compose_reload_post = /** @type {(inputs: Compose_Reload_PostInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Reload the post`)
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

export const compose_title = /** @type {(inputs: Compose_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`New post`)
};

export const compose_use_default = /** @type {(inputs: Compose_Use_DefaultInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Use the content from All channels`)
};

export const compose_video_ai_label = /** @type {(inputs: Compose_Video_Ai_LabelInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`The video is AI-generated`)
};

export const compose_video_ai_marked = /** @type {(inputs: Compose_Video_Ai_MarkedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`This video is marked as AI-generated in this workspace, and the label can't be removed.`)
};

export const compose_video_alt_label = /** @type {(inputs: Compose_Video_Alt_LabelInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Alt text for the video`)
};

export const compose_video_bad_type = /** @type {(inputs: Compose_Video_Bad_TypeInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`${i?.name}: only MP4, QuickTime and WebM videos can be added.`)
};

export const compose_video_existing = /** @type {(inputs: Compose_Video_ExistingInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Video already in this post`)
};

export const compose_video_hint = /** @type {(inputs: Compose_Video_HintInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Or one MP4, QuickTime or WebM video up to ${i?.max}.`)
};

export const compose_video_limit = /** @type {(inputs: Compose_Video_LimitInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`A post can have only one video.`)
};

export const compose_video_preview = /** @type {(inputs: Compose_Video_PreviewInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Preview of ${i?.name}`)
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

export const compose_video_retry = /** @type {(inputs: Compose_Video_RetryInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Retry`)
};

export const compose_video_too_big = /** @type {(inputs: Compose_Video_Too_BigInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`${i?.name}: the video is larger than ${i?.max}.`)
};

export const compose_video_uploading = /** @type {(inputs: Compose_Video_UploadingInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Uploading… ${i?.percent}`)
};