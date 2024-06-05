// Documentation typedefs
/**
 * A data structure for outputing any metadata that is rendered at the bottom
 * of a Roll chat card.
 *
 * @typedef {Object} Tag
 * @property {string} tag Text that will be addeded as a class on an HTMLElement
 * @property {string} text The text rendered on the card.
 */

import { DiceSFRPG } from "../dice.js";

/**
 * A structure for passing data into an HTML for for use in data- attributes.
 *
 * @typedef {Object} HtmlData
 * @property {string} name The name of the data property sans data-
 * @property {string} value The value of the data property.
 */

/**
 * A custom implementation for the foundry {@link Roll} class.
 *
 * @inheritdoc
 */
export default class SFRPGRoll extends Roll {
    constructor(formula, data = {}, options = {}) {
        const rollData = {
            formula: formula,
            data: data,
            options: options
        };
        Hooks.callAll("onBeforeRoll", rollData);

        super(rollData.formula, rollData.data, rollData.options);

        /** @type {Tag[]} */
        this.tags = rollData.data.tags;
        /** @type {string} */
        this.breakdown = rollData.data.breakdown;
        /** @type {HtmlData[]} */
        this.htmlData = rollData.data.htmlData;
    }

    /**
     * Return a prettified formula of the roll with Math terms such as "floor()" and "lookupRange()" resolved.
     *
     * Used for before the prettified formula created by Roll.evaluate() is available.
     * @type {string}
     */
    get simplifiedFormula() {
        const terms = foundry.dice.terms;
        if (this._evaluated) return this.formula;
        const newterms = this.terms.map(t => {
            if (t instanceof terms.OperatorTerm || t instanceof terms.StringTerm) return t;
            if (t.isDeterministic) {
                let total = 0;
                try {
                    total = t?.total || Roll.safeEval(t.expression);
                } catch {
                    total = Roll.safeEval(t.expression);
                }
                return new terms.NumericTerm({number: total});
            }
            return t;
        });
        return DiceSFRPG.simplifyRollFormula(Roll.fromTerms(newterms).formula) || "0";
    }

    /** @inheritdoc */
    static CHAT_TEMPLATE = "systems/sfrpg/templates/dice/roll.hbs";
    /** @inheritdoc */
    static TOOLTIP_TEMPLATE = "systems/sfrpg/templates/dice/tooltip.hbs";

    static MATH_PROXY = new Proxy(Math, {
        has: () => true, // Include everything
        get: (t, k) => k === Symbol.unscopables ? undefined : t[k]
        // set: () => console.error("You may not set properties of the Roll.MATH_PROXY environment") // Yes-op!
    });

    static registerMathFunctions() {
        function lookup(value) {
            for (let i = 1; i < arguments.length - 1; i += 2) {
                if (arguments[i] === value) {
                    return arguments[i + 1];
                }
            }
            return 0;
        }

        function lookupRange(value, lowestValue) {
            let baseValue = lowestValue;
            for (let i = 2; i < arguments.length - 1; i += 2) {
                if (arguments[i] > value) {
                    return baseValue;
                }
                baseValue = arguments[i + 1];
            }
            return baseValue;
        }

        this.MATH_PROXY = foundry.utils.mergeObject(this.MATH_PROXY, {
            eq: (a, b) => a === b,
            gt: (a, b) => a > b,
            gte: (a, b) => a >= b,
            lt: (a, b) => a < b,
            lte: (a, b) => a <= b,
            ne:(a, b) => a !== b,
            ternary: (condition, ifTrue, ifFalse) => (condition ? ifTrue : ifFalse),
            lookup,
            lookupRange
        });

    }

    /** @override */
    async render(chatOptions = {}) {
        chatOptions = foundry.utils.mergeObject({
            user: game.user.id,
            flavor: null,
            template: this.constructor.CHAT_TEMPLATE,
            blind: false
        }, chatOptions);
        const isPrivate = chatOptions.isPrivate;

        if (chatOptions?.breakdown) this.breakdown = chatOptions.breakdown;
        if (chatOptions?.tags) this.tags = chatOptions.tags;
        if (chatOptions?.htmlData) this.htmlData = chatOptions.htmlData;

        // Execute the roll, if needed
        if (!this._evaluated) await this.evaluate();

        // Define chat data
        const chatData = {
            formula: isPrivate ? "???" : this.formula,
            flavor: isPrivate ? null : chatOptions.flavor,
            user: chatOptions.user,
            tooltip: isPrivate ? "" : await this.getTooltip(),
            customTooltip: chatOptions.customTooltip,
            total: isPrivate ? "?" : Math.round(this.total * 100) / 100,
            tags: this.tags,
            breakdown: this.breakdown,
            htmlData: this.htmlData,
            rollNotes: this.htmlData?.find(x => x.name === "rollNotes")?.value
        };

        // Render the roll display template
        return renderTemplate(chatOptions.template, chatData);
    }

    /*
     * Parse a formula expression using the compiled peggy grammar.
     * @param {string} formula  The original string expression to parse.
     * @param {object} data     A data object used to substitute for attributes in the formula.
     * @returns {RollTerm[]}
     *
    static parse(formula, data) {
        if ( !formula ) return [];

        const functionTermRegex = Object.getOwnPropertyNames(this.MATH_PROXY).join("|");
        // const regex = new RegExp(`(?:((?:${functionTermRegex})\\([a-zA-Z0-9.,@\\s(\\)[\\]]*\\))d\\d+)`, "g");

        const regex = new RegExp(`${functionTermRegex}\\(`, "g");
        const matches = formula.matchAll(regex);

        for (const match of matches) {
            const start = match.index;
            const end = end + match[0].length;

            const lastBracketIdx = getLastBracketIdx(formula, end);

            const substring = formula.substring(start, lastBracketIdx);
            formula = formula.replace(substring, `(${substring})`);
        }

        const getLastBracketIdx = (formula, firstBracketIdx) => {
            if (formula.length === 0) return null;

            let bracketCount = 1;
            let lastBracketIdx = 0;
            for (let i = 0; i <= formula.length; i++) {
                if (formula[i] === "(") {
                    bracketCount++;
                }
                else if (formula[i] === ")") {
                    bracketCount--;
                    if (bracketCount === 0) lastBracketIdx = i;
                }
            }
            return lastBracketIdx;
        };

        return super.parse(formula, data);
    } */
}
