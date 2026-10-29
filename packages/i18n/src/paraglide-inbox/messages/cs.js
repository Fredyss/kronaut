/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Inbox_CanceledInputs */
/** @typedef {{}} Inbox_ChangedInputs */
/** @typedef {{}} Inbox_Duplicate_AckInputs */
/** @typedef {{}} Inbox_Duplicate_BodyInputs */
/** @typedef {{}} Inbox_Duplicate_ConfirmInputs */
/** @typedef {{}} Inbox_Duplicate_TitleInputs */
/** @typedef {{}} Inbox_Empty_BodyInputs */
/** @typedef {{}} Inbox_Empty_TitleInputs */
/** @typedef {{}} Inbox_Mark_DoneInputs */
/** @typedef {{}} Inbox_Mark_PublishedInputs */
/** @typedef {{}} Inbox_MarkedInputs */
/** @typedef {{}} Inbox_ReconnectInputs */
/** @typedef {{}} Inbox_Send_AgainInputs */
/** @typedef {{}} Inbox_Sent_AgainInputs */
/** @typedef {{ shown: NonNullable<unknown>, total: NonNullable<unknown> }} Inbox_TruncatedInputs */
import * as registry from "../registry.js"


export const inbox_canceled = /** @type {(inputs: Inbox_CanceledInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Zrušeno.`)
};

export const inbox_changed = /** @type {(inputs: Inbox_ChangedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Položka se mezitím změnila. Seznam teď ukazuje její aktuální stav.`)
};

export const inbox_duplicate_ack = /** @type {(inputs: Inbox_Duplicate_AckInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Může se zveřejnit dvakrát`)
};

export const inbox_duplicate_body = /** @type {(inputs: Inbox_Duplicate_BodyInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Síť ho možná už přijala. Když ho odešlete znovu, může se zveřejnit dvakrát.`)
};

export const inbox_duplicate_confirm = /** @type {(inputs: Inbox_Duplicate_ConfirmInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Přesto odeslat`)
};

export const inbox_duplicate_title = /** @type {(inputs: Inbox_Duplicate_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Příspěvek už možná je zveřejněný`)
};

export const inbox_empty_body = /** @type {(inputs: Inbox_Empty_BodyInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Objeví se tu příspěvky, které selhaly, jsou zablokované nebo čekají na vás.`)
};

export const inbox_empty_title = /** @type {(inputs: Inbox_Empty_TitleInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Nic nevyžaduje vaši pozornost`)
};

export const inbox_mark_done = /** @type {(inputs: Inbox_Mark_DoneInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Označit jako hotový`)
};

export const inbox_mark_published = /** @type {(inputs: Inbox_Mark_PublishedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Označit jako zveřejněný`)
};

export const inbox_marked = /** @type {(inputs: Inbox_MarkedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Označeno jako zveřejněné.`)
};

export const inbox_reconnect = /** @type {(inputs: Inbox_ReconnectInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Znovu připojit kanál`)
};

export const inbox_send_again = /** @type {(inputs: Inbox_Send_AgainInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Odeslat znovu`)
};

export const inbox_sent_again = /** @type {(inputs: Inbox_Sent_AgainInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Brzy se odešle znovu.`)
};

export const inbox_truncated = /** @type {(inputs: Inbox_TruncatedInputs) => LocalizedString} */ (i) => {
	const totalPlural = registry.plural("cs", i?.total, {}, true);
	if (totalPlural === "one") return /** @type {LocalizedString} */ (`Zobrazují se jen nejnovější: ${i?.shown} z ${i?.total} položky.`);
	if (totalPlural === "few") return /** @type {LocalizedString} */ (`Zobrazují se jen nejnovější: ${i?.shown} z ${i?.total} položek.`);
	if (totalPlural === "many") return /** @type {LocalizedString} */ (`Zobrazují se jen nejnovější: ${i?.shown} z ${i?.total} položky.`);
	return /** @type {LocalizedString} */ (`Zobrazují se jen nejnovější: ${i?.shown} z ${i?.total} položek.`)
};