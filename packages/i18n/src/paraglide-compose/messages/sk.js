/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
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
/** @typedef {{}} Compose_Connect_ChannelInputs */
/** @typedef {{ channel: NonNullable<unknown> }} Compose_CustomizeInputs */
/** @typedef {{}} Compose_CustomizedInputs */
/** @typedef {{ position: NonNullable<unknown> }} Compose_Error_Ai_MarkedInputs */
/** @typedef {{}} Compose_Error_Approval_RequiredInputs */
/** @typedef {{}} Compose_Error_EmptyInputs */
/** @typedef {{ channel: NonNullable<unknown> }} Compose_Error_Empty_ChannelInputs */
/** @typedef {{}} Compose_Error_FixInputs */
/** @typedef {{}} Compose_Error_No_ChannelInputs */
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
/** @typedef {{ channel: NonNullable<unknown> }} Compose_Main_OnlyInputs */
/** @typedef {{}} Compose_Media_ExclusiveInputs */
/** @typedef {{}} Compose_No_ChannelsInputs */
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
	return /** @type {LocalizedString} */ (`Pridať prvý komentár`)
};

export const compose_add_reply = /** @type {(inputs: Compose_Add_ReplyInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Pridať odpoveď`)
};

export const compose_ai_generated_hint = /** @type {(inputs: Compose_Ai_Generated_HintInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Instagram ho označí ako vytvorený pomocou AI. Ostatné siete takéto označenie nemajú.`)
};

export const compose_ai_generated_label = /** @type {(inputs: Compose_Ai_Generated_LabelInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Obrázok ${i?.position} je vytvorený pomocou AI`)
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
	return /** @type {LocalizedString} */ (`Potrebuje obrázok alebo video.`)
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

export const compose_channel_video_unsupported = /** @type {(inputs: Compose_Channel_Video_UnsupportedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Video v tejto sieti zatiaľ nie je podporované.`)
};

export const compose_channels_title = /** @type {(inputs: Compose_Channels_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Kanály`)
};

export const compose_check_content = /** @type {(inputs: Compose_Check_ContentInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Skontrolujte obsah pre ${i?.channels}.`)
};

export const compose_comment_label = /** @type {(inputs: Compose_Comment_LabelInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Prvý komentár`)
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

export const compose_error_ai_marked = /** @type {(inputs: Compose_Error_Ai_MarkedInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Obrázok ${i?.position} je v tomto pracovnom priestore už označený ako vytvorený pomocou AI a toto označenie zatiaľ nejde odstrániť. Ak ho chcete uverejniť, zaškrtnite „Obrázok ${i?.position} je vytvorený pomocou AI“, alebo použite iný obrázok.`)
};

export const compose_error_approval_required = /** @type {(inputs: Compose_Error_Approval_RequiredInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Príspevok treba pred naplánovaním schváliť.`)
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

export const compose_main_only = /** @type {(inputs: Compose_Main_OnlyInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`${i?.channel} uverejní iba hlavný príspevok.`)
};

export const compose_media_exclusive = /** @type {(inputs: Compose_Media_ExclusiveInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Príspevok môže mať buď obrázky, alebo jedno video, nie oboje.`)
};

export const compose_no_channels = /** @type {(inputs: Compose_No_ChannelsInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Zatiaľ nemáte pripojený žiadny kanál.`)
};

export const compose_remove_comment = /** @type {(inputs: Compose_Remove_CommentInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Odstrániť prvý komentár`)
};

export const compose_remove_reply = /** @type {(inputs: Compose_Remove_ReplyInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Odstrániť odpoveď ${i?.position}`)
};

export const compose_reply_label = /** @type {(inputs: Compose_Reply_LabelInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Odpoveď ${i?.position}`)
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

export const compose_title = /** @type {(inputs: Compose_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Nový príspevok`)
};

export const compose_use_default = /** @type {(inputs: Compose_Use_DefaultInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Použiť obsah zo záložky Všetky kanály`)
};

export const compose_video_ai_label = /** @type {(inputs: Compose_Video_Ai_LabelInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Video je vytvorené pomocou AI`)
};

export const compose_video_ai_marked = /** @type {(inputs: Compose_Video_Ai_MarkedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Video je v tomto pracovnom priestore označené ako vytvorené pomocou AI a toto označenie sa nedá odstrániť.`)
};

export const compose_video_alt_label = /** @type {(inputs: Compose_Video_Alt_LabelInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Alternatívny text k videu`)
};

export const compose_video_bad_type = /** @type {(inputs: Compose_Video_Bad_TypeInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`${i?.name}: pridať sa dajú iba videá MP4, QuickTime a WebM.`)
};

export const compose_video_hint = /** @type {(inputs: Compose_Video_HintInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Alebo jedno video vo formáte MP4, QuickTime či WebM do ${i?.max}.`)
};

export const compose_video_limit = /** @type {(inputs: Compose_Video_LimitInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Príspevok môže obsahovať len jedno video.`)
};

export const compose_video_preview = /** @type {(inputs: Compose_Video_PreviewInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Náhľad súboru ${i?.name}`)
};

export const compose_video_processing = /** @type {(inputs: Compose_Video_ProcessingInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Spracúva sa…`)
};

export const compose_video_progress = /** @type {(inputs: Compose_Video_ProgressInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Priebeh nahrávania`)
};

export const compose_video_ready = /** @type {(inputs: Compose_Video_ReadyInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Pripravené`)
};

export const compose_video_ready_duration = /** @type {(inputs: Compose_Video_Ready_DurationInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Pripravené, ${i?.duration}`)
};

export const compose_video_retry = /** @type {(inputs: Compose_Video_RetryInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Skúsiť znova`)
};

export const compose_video_too_big = /** @type {(inputs: Compose_Video_Too_BigInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`${i?.name}: video je väčšie ako ${i?.max}.`)
};

export const compose_video_uploading = /** @type {(inputs: Compose_Video_UploadingInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Nahráva sa… ${i?.percent}`)
};