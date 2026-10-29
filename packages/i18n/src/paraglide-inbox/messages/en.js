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
	return /** @type {LocalizedString} */ (`Canceled.`)
};

export const inbox_changed = /** @type {(inputs: Inbox_ChangedInputs) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`This item changed in the meantime. The list now shows its latest state.`)
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