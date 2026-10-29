import { getLocale, experimentalStaticLocale } from "../runtime.js"

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
import * as __en from "./en.js"
import * as __sk from "./sk.js"
import * as __cs from "./cs.js"
/**
* | output |
* | --- |
* | "Canceled." |
*
* @param {Inbox_CanceledInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const inbox_canceled = /** @type {((inputs?: Inbox_CanceledInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Inbox_CanceledInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.inbox_canceled(inputs)
	if (locale === "cs") return __cs.inbox_canceled(inputs)
	return __en.inbox_canceled(inputs)
});
/**
* | output |
* | --- |
* | "This item changed in the meantime. The list now shows its latest state." |
*
* @param {Inbox_ChangedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const inbox_changed = /** @type {((inputs?: Inbox_ChangedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Inbox_ChangedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.inbox_changed(inputs)
	if (locale === "cs") return __cs.inbox_changed(inputs)
	return __en.inbox_changed(inputs)
});
/**
* | output |
* | --- |
* | "This may post twice" |
*
* @param {Inbox_Duplicate_AckInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const inbox_duplicate_ack = /** @type {((inputs?: Inbox_Duplicate_AckInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Inbox_Duplicate_AckInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.inbox_duplicate_ack(inputs)
	if (locale === "cs") return __cs.inbox_duplicate_ack(inputs)
	return __en.inbox_duplicate_ack(inputs)
});
/**
* | output |
* | --- |
* | "The network may have received it. Sending it again could publish it twice." |
*
* @param {Inbox_Duplicate_BodyInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const inbox_duplicate_body = /** @type {((inputs?: Inbox_Duplicate_BodyInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Inbox_Duplicate_BodyInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.inbox_duplicate_body(inputs)
	if (locale === "cs") return __cs.inbox_duplicate_body(inputs)
	return __en.inbox_duplicate_body(inputs)
});
/**
* | output |
* | --- |
* | "Send again anyway" |
*
* @param {Inbox_Duplicate_ConfirmInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const inbox_duplicate_confirm = /** @type {((inputs?: Inbox_Duplicate_ConfirmInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Inbox_Duplicate_ConfirmInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.inbox_duplicate_confirm(inputs)
	if (locale === "cs") return __cs.inbox_duplicate_confirm(inputs)
	return __en.inbox_duplicate_confirm(inputs)
});
/**
* | output |
* | --- |
* | "It may already be live" |
*
* @param {Inbox_Duplicate_TitleInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const inbox_duplicate_title = /** @type {((inputs?: Inbox_Duplicate_TitleInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Inbox_Duplicate_TitleInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.inbox_duplicate_title(inputs)
	if (locale === "cs") return __cs.inbox_duplicate_title(inputs)
	return __en.inbox_duplicate_title(inputs)
});
/**
* | output |
* | --- |
* | "Posts that fail, get blocked or wait for you show up here." |
*
* @param {Inbox_Empty_BodyInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const inbox_empty_body = /** @type {((inputs?: Inbox_Empty_BodyInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Inbox_Empty_BodyInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.inbox_empty_body(inputs)
	if (locale === "cs") return __cs.inbox_empty_body(inputs)
	return __en.inbox_empty_body(inputs)
});
/**
* | output |
* | --- |
* | "Nothing needs your attention" |
*
* @param {Inbox_Empty_TitleInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const inbox_empty_title = /** @type {((inputs?: Inbox_Empty_TitleInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Inbox_Empty_TitleInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.inbox_empty_title(inputs)
	if (locale === "cs") return __cs.inbox_empty_title(inputs)
	return __en.inbox_empty_title(inputs)
});
/**
* | output |
* | --- |
* | "Mark as done" |
*
* @param {Inbox_Mark_DoneInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const inbox_mark_done = /** @type {((inputs?: Inbox_Mark_DoneInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Inbox_Mark_DoneInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.inbox_mark_done(inputs)
	if (locale === "cs") return __cs.inbox_mark_done(inputs)
	return __en.inbox_mark_done(inputs)
});
/**
* | output |
* | --- |
* | "Mark as published" |
*
* @param {Inbox_Mark_PublishedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const inbox_mark_published = /** @type {((inputs?: Inbox_Mark_PublishedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Inbox_Mark_PublishedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.inbox_mark_published(inputs)
	if (locale === "cs") return __cs.inbox_mark_published(inputs)
	return __en.inbox_mark_published(inputs)
});
/**
* | output |
* | --- |
* | "Marked as published." |
*
* @param {Inbox_MarkedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const inbox_marked = /** @type {((inputs?: Inbox_MarkedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Inbox_MarkedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.inbox_marked(inputs)
	if (locale === "cs") return __cs.inbox_marked(inputs)
	return __en.inbox_marked(inputs)
});
/**
* | output |
* | --- |
* | "Reconnect channel" |
*
* @param {Inbox_ReconnectInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const inbox_reconnect = /** @type {((inputs?: Inbox_ReconnectInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Inbox_ReconnectInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.inbox_reconnect(inputs)
	if (locale === "cs") return __cs.inbox_reconnect(inputs)
	return __en.inbox_reconnect(inputs)
});
/**
* | output |
* | --- |
* | "Send again" |
*
* @param {Inbox_Send_AgainInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const inbox_send_again = /** @type {((inputs?: Inbox_Send_AgainInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Inbox_Send_AgainInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.inbox_send_again(inputs)
	if (locale === "cs") return __cs.inbox_send_again(inputs)
	return __en.inbox_send_again(inputs)
});
/**
* | output |
* | --- |
* | "It will be sent again shortly." |
*
* @param {Inbox_Sent_AgainInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const inbox_sent_again = /** @type {((inputs?: Inbox_Sent_AgainInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Inbox_Sent_AgainInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs = {}, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.inbox_sent_again(inputs)
	if (locale === "cs") return __cs.inbox_sent_again(inputs)
	return __en.inbox_sent_again(inputs)
});
/**
* | totalPlural | output |
* | --- | --- |
* | "one" | "Showing only the newest {shown} of {total} item." |
* | * | "Showing only the newest {shown} of {total} items." |
*
* @param {Inbox_TruncatedInputs} inputs
* @param {{ locale?: "en" | "sk" | "cs" }} options
* @returns {LocalizedString}
*/
export const inbox_truncated = /** @type {((inputs: Inbox_TruncatedInputs, options?: { locale?: "en" | "sk" | "cs" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Inbox_TruncatedInputs, { locale?: "en" | "sk" | "cs" }, {}>} */ ((inputs, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "sk") return __sk.inbox_truncated(inputs)
	if (locale === "cs") return __cs.inbox_truncated(inputs)
	return __en.inbox_truncated(inputs)
});