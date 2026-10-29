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
import * as registry from "../registry.js"


export const media_ai_badge = /** @type {(inputs: Media_Ai_BadgeInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Vytvorené pomocou AI`)
};

export const media_ai_locked = /** @type {(inputs: Media_Ai_LockedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Označenie zostáva: súbor nahral alebo označil API kľúč či agent.`)
};

export const media_ai_remove = /** @type {(inputs: Media_Ai_RemoveInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Odstrániť označenie AI`)
};

export const media_ai_removed = /** @type {(inputs: Media_Ai_RemovedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Označenie AI je odstránené.`)
};

export const media_alt_hint = /** @type {(inputs: Media_Alt_HintInputs) => LocalizedString} */ (i) => {
	const countPlural = registry.plural("sk", i?.count, {}, true);
	if (countPlural === "one") return /** @type {LocalizedString} */ (`Nové príspevky začnú s týmto opisom. Príspevky, ktoré súbor už používajú, si ponechajú svoj. Najviac ${i?.count} znak.`);
	if (countPlural === "few") return /** @type {LocalizedString} */ (`Nové príspevky začnú s týmto opisom. Príspevky, ktoré súbor už používajú, si ponechajú svoj. Najviac ${i?.count} znaky.`);
	if (countPlural === "many") return /** @type {LocalizedString} */ (`Nové príspevky začnú s týmto opisom. Príspevky, ktoré súbor už používajú, si ponechajú svoj. Najviac ${i?.count} znaku.`);
	return /** @type {LocalizedString} */ (`Nové príspevky začnú s týmto opisom. Príspevky, ktoré súbor už používajú, si ponechajú svoj. Najviac ${i?.count} znakov.`)
};

export const media_alt_label = /** @type {(inputs: Media_Alt_LabelInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Alternatívny text`)
};

export const media_alt_save = /** @type {(inputs: Media_Alt_SaveInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Uložiť alternatívny text`)
};

export const media_alt_saved = /** @type {(inputs: Media_Alt_SavedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Alternatívny text je uložený.`)
};

export const media_delete = /** @type {(inputs: Media_DeleteInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Vymazať`)
};

export const media_delete_body = /** @type {(inputs: Media_Delete_BodyInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Vymazať tento súbor? Z knižnice zmizne hneď a jeho dáta sa zmažú po 30 dňoch.`)
};

export const media_delete_confirm = /** @type {(inputs: Media_Delete_ConfirmInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Vymazať súbor`)
};

export const media_deleted = /** @type {(inputs: Media_DeletedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Súbor je vymazaný.`)
};

export const media_dimensions = /** @type {(inputs: Media_DimensionsInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Rozmery`)
};

export const media_dimensions_value = /** @type {(inputs: Media_Dimensions_ValueInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`${i?.width} × ${i?.height} px`)
};

export const media_duration = /** @type {(inputs: Media_DurationInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Dĺžka`)
};

export const media_empty_body = /** @type {(inputs: Media_Empty_BodyInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Obrázky a videá, ktoré pridáte do príspevkov, sa zobrazia tu.`)
};

export const media_empty_filtered = /** @type {(inputs: Media_Empty_FilteredInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Tohto druhu tu zatiaľ nič nie je.`)
};

export const media_empty_title = /** @type {(inputs: Media_Empty_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Zatiaľ tu nie sú žiadne médiá`)
};

export const media_filter_all = /** @type {(inputs: Media_Filter_AllInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Všetko`)
};

export const media_filter_images = /** @type {(inputs: Media_Filter_ImagesInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Obrázky`)
};

export const media_filter_label = /** @type {(inputs: Media_Filter_LabelInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Zobraziť`)
};

export const media_filter_videos = /** @type {(inputs: Media_Filter_VideosInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Videá`)
};

export const media_in_use = /** @type {(inputs: Media_In_UseInputs) => LocalizedString} */ (i) => {
	const countPlural = registry.plural("sk", i?.count, {}, true);
	if (countPlural === "one") return /** @type {LocalizedString} */ (`Použité v ${i?.count} príspevku`);
	if (countPlural === "few") return /** @type {LocalizedString} */ (`Použité v ${i?.count} príspevkoch`);
	if (countPlural === "many") return /** @type {LocalizedString} */ (`Použité v ${i?.count} príspevku`);
	return /** @type {LocalizedString} */ (`Použité v ${i?.count} príspevkoch`)
};

export const media_in_use_error = /** @type {(inputs: Media_In_Use_ErrorInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Súbor ešte používa niektorý príspevok, preto sa nedá vymazať.`)
};

export const media_kind_image = /** @type {(inputs: Media_Kind_ImageInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Obrázok`)
};

export const media_kind_video = /** @type {(inputs: Media_Kind_VideoInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Video`)
};

export const media_load_more = /** @type {(inputs: Media_Load_MoreInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Načítať ďalšie`)
};

export const media_open_image = /** @type {(inputs: Media_Open_ImageInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Obrázok nahraný ${i?.date}`)
};

export const media_open_video = /** @type {(inputs: Media_Open_VideoInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Video nahrané ${i?.date}`)
};

export const media_size = /** @type {(inputs: Media_SizeInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Veľkosť`)
};

export const media_state_processing = /** @type {(inputs: Media_State_ProcessingInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Spracúva sa`)
};

export const media_state_rejected = /** @type {(inputs: Media_State_RejectedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Odmietnuté`)
};

export const media_subtitle = /** @type {(inputs: Media_SubtitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Obrázky a videá nahrané do tohto pracovného priestoru.`)
};

export const media_title = /** @type {(inputs: Media_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Knižnica médií`)
};

export const media_type = /** @type {(inputs: Media_TypeInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Typ`)
};

export const media_uploaded = /** @type {(inputs: Media_UploadedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Nahrané`)
};

export const media_usage_none = /** @type {(inputs: Media_Usage_NoneInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Tento súbor nepoužíva žiadny príspevok.`)
};

export const media_usage_scheduled = /** @type {(inputs: Media_Usage_ScheduledInputs) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Naplánované na ${i?.when}`)
};

export const media_usage_title = /** @type {(inputs: Media_Usage_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Použité v`)
};

export const media_usage_untitled = /** @type {(inputs: Media_Usage_UntitledInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Príspevok bez názvu`)
};