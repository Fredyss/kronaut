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
/** @typedef {{}} Compose_Keep_DraftInputs */
/** @typedef {{ channel: NonNullable<unknown> }} Compose_Main_OnlyInputs */
/** @typedef {{}} Compose_Media_ExclusiveInputs */
/** @typedef {{}} Compose_No_ChannelsInputs */
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
	return /** @type {LocalizedString} */ (`Přidat první komentář`)
};

export const compose_add_reply = /** @type {(inputs: Compose_Add_ReplyInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Přidat odpověď`)
};

export const compose_ai_generated_hint = /** @type {(inputs: Compose_Ai_Generated_HintInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Instagram ho označí jako vytvořený pomocí AI. Ostatní sítě takové označení nemají.`)
};

export const compose_ai_generated_label = /** @type {(inputs: Compose_Ai_Generated_LabelInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Obrázek ${i?.position} je vytvořený pomocí AI`)
};

export const compose_alt_text_hint = /** @type {(inputs: Compose_Alt_Text_HintInputs) => LocalizedString} */ (i) => {
	const countPlural = registry.plural("cs", i?.count, {}, true);
	if (countPlural === "one") return /** @type {LocalizedString} */ (`Popište obrázek pro lidi, kteří ho nevidí. Nejvýš ${i?.count} znak.`);
	if (countPlural === "few") return /** @type {LocalizedString} */ (`Popište obrázek pro lidi, kteří ho nevidí. Nejvýš ${i?.count} znaky.`);
	if (countPlural === "many") return /** @type {LocalizedString} */ (`Popište obrázek pro lidi, kteří ho nevidí. Nejvýš ${i?.count} znaku.`);
	return /** @type {LocalizedString} */ (`Popište obrázek pro lidi, kteří ho nevidí. Nejvýš ${i?.count} znaků.`)
};

export const compose_alt_text_label = /** @type {(inputs: Compose_Alt_Text_LabelInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Alternativní text k obrázku ${i?.position}`)
};

export const compose_channel_image_too_large = /** @type {(inputs: Compose_Channel_Image_Too_LargeInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Obrázek je větší než ${i?.max}, které tato síť přijme.`)
};

export const compose_channel_image_type = /** @type {(inputs: Compose_Channel_Image_TypeInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Tato síť nepřijímá formát některého z přiložených obrázků.`)
};

export const compose_channel_needs_image = /** @type {(inputs: Compose_Channel_Needs_ImageInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Potřebuje obrázek nebo video.`)
};

export const compose_channel_too_many_images = /** @type {(inputs: Compose_Channel_Too_Many_ImagesInputs) => LocalizedString} */ (i) => {
	const countPlural = registry.plural("cs", i?.count, {}, true);
	if (countPlural === "one") return /** @type {LocalizedString} */ (`Tato síť přijme nejvýš ${i?.count} obrázek.`);
	if (countPlural === "few") return /** @type {LocalizedString} */ (`Tato síť přijme nejvýš ${i?.count} obrázky.`);
	if (countPlural === "many") return /** @type {LocalizedString} */ (`Tato síť přijme nejvýš ${i?.count} obrázku.`);
	return /** @type {LocalizedString} */ (`Tato síť přijme nejvýš ${i?.count} obrázků.`)
};

export const compose_channel_unsupported = /** @type {(inputs: Compose_Channel_UnsupportedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Zveřejňování v této síti zatím není podporováno.`)
};

export const compose_channel_video_unsupported = /** @type {(inputs: Compose_Channel_Video_UnsupportedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Video v této síti zatím není podporováno.`)
};

export const compose_channels_title = /** @type {(inputs: Compose_Channels_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Kanály`)
};

export const compose_check_content = /** @type {(inputs: Compose_Check_ContentInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Zkontrolujte obsah pro ${i?.channels}.`)
};

export const compose_comment_label = /** @type {(inputs: Compose_Comment_LabelInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`První komentář`)
};

export const compose_connect_channel = /** @type {(inputs: Compose_Connect_ChannelInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Připojit kanál`)
};

export const compose_customize = /** @type {(inputs: Compose_CustomizeInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Přizpůsobit pro ${i?.channel}`)
};

export const compose_customized = /** @type {(inputs: Compose_CustomizedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Přizpůsobeno`)
};

export const compose_edit_canceled_note = /** @type {(inputs: Compose_Edit_Canceled_NoteInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Zrušeno pro: ${i?.channels}. Uložením změny se z příspěvku odeberou; zaškrtnutím na kanál znovu publikujete.`)
};

export const compose_edit_queue_note = /** @type {(inputs: Compose_Edit_Queue_NoteInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Uložením se použijí nejbližší volné termíny ve frontě každého kanálu.`)
};

export const compose_edit_review_note = /** @type {(inputs: Compose_Edit_Review_NoteInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Uložením změněného obsahu se stáhne otevřená žádost o schválení.`)
};

export const compose_edit_series_note = /** @type {(inputs: Compose_Edit_Series_NoteInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Série tento koncept naplánuje na tento termín.`)
};

export const compose_edit_series_skip = /** @type {(inputs: Compose_Edit_Series_SkipInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Pokud příspěvek ponecháte jako koncept, tento výskyt série se přeskočí.`)
};

export const compose_error_ai_marked = /** @type {(inputs: Compose_Error_Ai_MarkedInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Obrázek ${i?.position} je v tomto pracovním prostoru už označený jako vytvořený pomocí AI a toto označení zatím nejde odstranit. Pokud ho chcete zveřejnit, zaškrtněte „Obrázek ${i?.position} je vytvořený pomocí AI“, nebo použijte jiný obrázek.`)
};

export const compose_error_approval_required = /** @type {(inputs: Compose_Error_Approval_RequiredInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Příspěvek je před naplánováním potřeba schválit.`)
};

export const compose_error_channel_gone = /** @type {(inputs: Compose_Error_Channel_GoneInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Příspěvek nejde uložit, protože jeden z jeho kanálů už není dostupný: ${i?.channels}.`)
};

export const compose_error_empty = /** @type {(inputs: Compose_Error_EmptyInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Napište text, nebo přidejte obrázek.`)
};

export const compose_error_empty_channel = /** @type {(inputs: Compose_Error_Empty_ChannelInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Pro ${i?.channel} napište text, nebo přidejte obrázek.`)
};

export const compose_error_fix = /** @type {(inputs: Compose_Error_FixInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Příspěvek zatím nelze odeslat. Opravte následující a zkuste to znovu:`)
};

export const compose_error_no_channel = /** @type {(inputs: Compose_Error_No_ChannelInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Vyberte alespoň jeden kanál.`)
};

export const compose_error_now_draft = /** @type {(inputs: Compose_Error_Now_DraftInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Příspěvek je teď koncept. Dalším uložením budete pokračovat.`)
};

export const compose_error_post_changed = /** @type {(inputs: Compose_Error_Post_ChangedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Příspěvek se od otevření změnil. Načtěte ho znovu, abyste viděli nejnovější verzi; vaše úpravy zde se ztratí.`)
};

export const compose_error_upload = /** @type {(inputs: Compose_Error_UploadInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Obrázek ${i?.position} se nepodařilo nahrát.`)
};

export const compose_error_upload_channel = /** @type {(inputs: Compose_Error_Upload_ChannelInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Obrázek ${i?.position} pro ${i?.channel} se nepodařilo nahrát.`)
};

export const compose_image_bad_type = /** @type {(inputs: Compose_Image_Bad_TypeInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`${i?.name}: přidat lze jen obrázky JPEG, PNG a WebP.`)
};

export const compose_image_move_down = /** @type {(inputs: Compose_Image_Move_DownInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Posunout obrázek ${i?.position} níž`)
};

export const compose_image_move_up = /** @type {(inputs: Compose_Image_Move_UpInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Posunout obrázek ${i?.position} výš`)
};

export const compose_image_position = /** @type {(inputs: Compose_Image_PositionInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Obrázek ${i?.position}`)
};

export const compose_image_too_big = /** @type {(inputs: Compose_Image_Too_BigInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`${i?.name}: soubor je větší než ${i?.max}.`)
};

export const compose_images_add = /** @type {(inputs: Compose_Images_AddInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Přidat obrázky`)
};

export const compose_images_hint = /** @type {(inputs: Compose_Images_HintInputs) => LocalizedString} */ (i) => {
	const countPlural = registry.plural("cs", i?.count, {}, true);
	if (countPlural === "one") return /** @type {LocalizedString} */ (`Nejvýš ${i?.count} obrázek ve formátu JPEG, PNG nebo WebP, každý do ${i?.max}.`);
	if (countPlural === "few") return /** @type {LocalizedString} */ (`Nejvýš ${i?.count} obrázky ve formátu JPEG, PNG nebo WebP, každý do ${i?.max}.`);
	if (countPlural === "many") return /** @type {LocalizedString} */ (`Nejvýš ${i?.count} obrázku ve formátu JPEG, PNG nebo WebP, každý do ${i?.max}.`);
	return /** @type {LocalizedString} */ (`Nejvýš ${i?.count} obrázků ve formátu JPEG, PNG nebo WebP, každý do ${i?.max}.`)
};

export const compose_images_limit = /** @type {(inputs: Compose_Images_LimitInputs) => LocalizedString} */ (i) => {
	const countPlural = registry.plural("cs", i?.count, {}, true);
	if (countPlural === "one") return /** @type {LocalizedString} */ (`Příspěvek může mít nejvýš ${i?.count} obrázek.`);
	if (countPlural === "few") return /** @type {LocalizedString} */ (`Příspěvek může mít nejvýš ${i?.count} obrázky.`);
	if (countPlural === "many") return /** @type {LocalizedString} */ (`Příspěvek může mít nejvýš ${i?.count} obrázku.`);
	return /** @type {LocalizedString} */ (`Příspěvek může mít nejvýš ${i?.count} obrázků.`)
};

export const compose_images_title = /** @type {(inputs: Compose_Images_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Obrázky`)
};

export const compose_inherits = /** @type {(inputs: Compose_InheritsInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Používá obsah ze záložky Všechny kanály.`)
};

export const compose_keep_draft = /** @type {(inputs: Compose_Keep_DraftInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Ponechat jako koncept`)
};

export const compose_main_only = /** @type {(inputs: Compose_Main_OnlyInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`${i?.channel} zveřejní jen hlavní příspěvek.`)
};

export const compose_media_exclusive = /** @type {(inputs: Compose_Media_ExclusiveInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Příspěvek může mít buď obrázky, nebo jedno video, ne obojí.`)
};

export const compose_no_channels = /** @type {(inputs: Compose_No_ChannelsInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Zatím nemáte připojený žádný kanál.`)
};

export const compose_refused_channel_twice = /** @type {(inputs: Compose_Refused_Channel_TwiceInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Příspěvek nejde upravit, protože míří dvakrát do stejného kanálu.`)
};

export const compose_refused_channel_unavailable = /** @type {(inputs: Compose_Refused_Channel_UnavailableInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Příspěvek nejde upravit, protože jeden z jeho kanálů není dostupný.`)
};

export const compose_refused_item_order = /** @type {(inputs: Compose_Refused_Item_OrderInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Příspěvek nejde upravit, protože jeho části jsou v pořadí, které editor neumí zobrazit.`)
};

export const compose_refused_many_videos = /** @type {(inputs: Compose_Refused_Many_VideosInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Příspěvek nejde upravit, protože má více než jedno video.`)
};

export const compose_refused_media_unavailable = /** @type {(inputs: Compose_Refused_Media_UnavailableInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Příspěvek nejde upravit, protože některá jeho média nejsou dostupná.`)
};

export const compose_refused_mixed_media = /** @type {(inputs: Compose_Refused_Mixed_MediaInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Příspěvek nejde upravit, protože má obrázky spolu s videem.`)
};

export const compose_refused_part_live = /** @type {(inputs: Compose_Refused_Part_LiveInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Příspěvek nejde upravit, protože zrušené umístění je už částečně zveřejněné.`)
};

export const compose_refused_publish_type = /** @type {(inputs: Compose_Refused_Publish_TypeInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Příspěvek nejde upravit, protože jeho typ zveřejnění není ten, který by zvolil editor.`)
};

export const compose_refused_repeated_media = /** @type {(inputs: Compose_Refused_Repeated_MediaInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Příspěvek nejde upravit, protože používá stejné médium dvakrát.`)
};

export const compose_refused_reply_media = /** @type {(inputs: Compose_Refused_Reply_MediaInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Příspěvek nejde upravit, protože odpověď nebo komentář obsahuje média.`)
};

export const compose_refused_rich_content = /** @type {(inputs: Compose_Refused_Rich_ContentInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Příspěvek nejde upravit, protože text má formátování, které editor neumí zobrazit.`)
};

export const compose_reload_post = /** @type {(inputs: Compose_Reload_PostInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Znovu načíst příspěvek`)
};

export const compose_remove_comment = /** @type {(inputs: Compose_Remove_CommentInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Odebrat první komentář`)
};

export const compose_remove_reply = /** @type {(inputs: Compose_Remove_ReplyInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Odebrat odpověď ${i?.position}`)
};

export const compose_reply_label = /** @type {(inputs: Compose_Reply_LabelInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Odpověď ${i?.position}`)
};

export const compose_subtitle = /** @type {(inputs: Compose_SubtitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Napište ho jednou, vyberte kanály a pak ho zveřejněte hned, nebo naplánujte.`)
};

export const compose_tab_all = /** @type {(inputs: Compose_Tab_AllInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Všechny kanály`)
};

export const compose_tab_problems = /** @type {(inputs: Compose_Tab_ProblemsInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`obsahuje chyby`)
};

export const compose_tabs_label = /** @type {(inputs: Compose_Tabs_LabelInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Obsah pro jednotlivé kanály`)
};

export const compose_text_label = /** @type {(inputs: Compose_Text_LabelInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Text`)
};

export const compose_title = /** @type {(inputs: Compose_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Nový příspěvek`)
};

export const compose_use_default = /** @type {(inputs: Compose_Use_DefaultInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Použít obsah ze záložky Všechny kanály`)
};

export const compose_video_ai_label = /** @type {(inputs: Compose_Video_Ai_LabelInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Video je vytvořené pomocí AI`)
};

export const compose_video_ai_marked = /** @type {(inputs: Compose_Video_Ai_MarkedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Video je v tomto pracovním prostoru označené jako vytvořené pomocí AI a toto označení nejde odstranit.`)
};

export const compose_video_alt_label = /** @type {(inputs: Compose_Video_Alt_LabelInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Alternativní text k videu`)
};

export const compose_video_bad_type = /** @type {(inputs: Compose_Video_Bad_TypeInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`${i?.name}: přidat jde jen videa MP4, QuickTime a WebM.`)
};

export const compose_video_existing = /** @type {(inputs: Compose_Video_ExistingInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Video, které už je v tomto příspěvku`)
};

export const compose_video_hint = /** @type {(inputs: Compose_Video_HintInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Nebo jedno video ve formátu MP4, QuickTime či WebM do ${i?.max}.`)
};

export const compose_video_limit = /** @type {(inputs: Compose_Video_LimitInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Příspěvek může obsahovat jen jedno video.`)
};

export const compose_video_preview = /** @type {(inputs: Compose_Video_PreviewInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Náhled souboru ${i?.name}`)
};

export const compose_video_processing = /** @type {(inputs: Compose_Video_ProcessingInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Zpracovává se…`)
};

export const compose_video_progress = /** @type {(inputs: Compose_Video_ProgressInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Průběh nahrávání`)
};

export const compose_video_ready = /** @type {(inputs: Compose_Video_ReadyInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Připraveno`)
};

export const compose_video_ready_duration = /** @type {(inputs: Compose_Video_Ready_DurationInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Připraveno, ${i?.duration}`)
};

export const compose_video_retry = /** @type {(inputs: Compose_Video_RetryInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Zkusit znovu`)
};

export const compose_video_too_big = /** @type {(inputs: Compose_Video_Too_BigInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`${i?.name}: video je větší než ${i?.max}.`)
};

export const compose_video_uploading = /** @type {(inputs: Compose_Video_UploadingInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Nahrává se… ${i?.percent}`)
};