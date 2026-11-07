import type { Genus, OpenPaleoDataset, Synonym } from "./dataset.ts";

/**
 * A run of prose that is either plain text or a genus or species name.
 */
export type ProseSegment = {
    /**
     * The text of the run.
     */
    text: string;

    /**
     * True when the run is a genus or species name, which is set in italics.
     */
    isTaxon: boolean;
};

/**
 * Matches a capitalized word, optionally followed by a lowercase word (a candidate genus and
 * species epithet), or an initial and a lowercase word (a candidate abbreviated binomial such
 * as "T. rex"). The lookarounds keep matches to whole words, accented letters included.
 */
const candidatePattern = /(?<!\p{L})(\p{Lu}\p{Ll}+)(?!\p{L})(?: (\p{Ll}[\p{Ll}-]*)(?!\p{L}))?|(?<!\p{L})(\p{Lu})\. (\p{Ll}[\p{Ll}-]*)(?!\p{L})/gu;

/**
 * Genus names this short can also be personal names.
 */
const shortGenusLength = 4;

/**
 * Matches a capitalized word and a space at the end of the text before a candidate.
 */
const precedingCapitalizedWordPattern = /\p{Lu}\p{Ll}+ $/u;

/**
 * The genus and species names in the dataset, used to find them in prose so they can be set
 * in italics.
 *
 * Names come from every genus, species and synonym. A capitalized word is a genus name only if
 * the dataset has that genus or a synonym with it; a following lowercase word joins it only if
 * the pair is a known binomial. An abbreviated binomial ("T. rex") matches when some known
 * binomial has that initial and epithet. Clade names are not matched: they stay roman.
 *
 * A genus name of four letters or fewer directly after another capitalized word is taken as
 * part of a personal name ("Liu Jian"), not as the genus Jian.
 */
export class TaxonNameIndex
{
    /**
     * Every genus name, including the genus part of synonyms.
     */
    private readonly genusNames = new Set<string>();

    /**
     * Every binomial: "Tyrannosaurus rex".
     */
    private readonly binomials = new Set<string>();

    /**
     * For each species epithet, the initials of the genera it appears with.
     */
    private readonly initialsByEpithet = new Map<string, Set<string>>();

    /**
     * Add a genus name, a binomial or a trinomial.
     *
     * @param name - The name. Names that do not start with a capital letter are ignored.
     */
    addName(name: string): void
    {
        const words = name.trim().split(/\s+/);
        const genus = words[0];

        if (!/^\p{Lu}\p{Ll}+$/u.test(genus))
        {
            return;
        }

        this.genusNames.add(genus);

        if (words.length >= 2)
        {
            const epithet = words[1];
            let initials = this.initialsByEpithet.get(epithet);

            if (!initials)
            {
                initials = new Set<string>();
                this.initialsByEpithet.set(epithet, initials);
            }

            this.binomials.add(genus + " " + epithet);
            initials.add(genus.charAt(0));
        }
    }

    /**
     * Report whether a word is a known genus name.
     *
     * @param word - The word.
     * @returns True if the dataset has a genus or synonym by that name.
     */
    hasGenus(word: string): boolean
    {
        return this.genusNames.has(word);
    }

    /**
     * Split prose into plain text and genus and species names.
     *
     * @param text - The prose.
     * @returns The runs, in order; joining their text gives back the input.
     */
    splitProse(text: string): Array<ProseSegment>
    {
        const segments = new Array<ProseSegment>();
        const pattern = new RegExp(candidatePattern);
        let plainStart = 0;
        let match = pattern.exec(text);

        while (match !== null)
        {
            const taxonLength = this.measureTaxonMatch(match, text);

            if (taxonLength > 0)
            {
                if (match.index > plainStart)
                {
                    segments.push({ text: text.slice(plainStart, match.index), isTaxon: false });
                }

                segments.push({ text: text.slice(match.index, match.index + taxonLength), isTaxon: true });
                plainStart = match.index + taxonLength;
                pattern.lastIndex = plainStart;
            }

            match = pattern.exec(text);
        }

        if (plainStart < text.length)
        {
            segments.push({ text: text.slice(plainStart), isTaxon: false });
        }

        return segments;
    }

    /**
     * Measure how much of a candidate match is a genus or species name.
     *
     * @param match - A match of the candidate pattern.
     * @param text - The prose the match was found in.
     * @returns The length of the name at the start of the match, or 0 if it is not one.
     */
    private measureTaxonMatch(match: RegExpExecArray, text: string): number
    {
        const genus = match[1];

        if (genus !== undefined)
        {
            if (!this.genusNames.has(genus))
            {
                return 0;
            }
            else if (
                genus.length <= shortGenusLength &&
                precedingCapitalizedWordPattern.test(text.slice(Math.max(0, match.index - 40), match.index))
            )
            {
                return 0;
            }
            else if (match[2] !== undefined && this.binomials.has(genus + " " + match[2]))
            {
                return match[0].length;
            }

            return genus.length;
        }

        const initials = this.initialsByEpithet.get(match[4]);

        return initials && initials.has(match[3]) ? match[0].length : 0;
    }
}

/**
 * Add the names of a list of synonyms to the index.
 *
 * @param index - The index.
 * @param synonyms - The synonyms, if any.
 */
function addSynonymNames(index: TaxonNameIndex, synonyms: Array<Synonym> | undefined): void
{
    for (const synonym of synonyms ?? [])
    {
        index.addName(synonym.name);
    }
}

/**
 * Add a genus, its species and all their synonyms to the index.
 *
 * @param index - The index.
 * @param genus - The genus record.
 */
function addGenusNames(index: TaxonNameIndex, genus: Genus): void
{
    index.addName(genus.genus);
    addSynonymNames(index, genus.synonyms);

    for (const species of genus.species)
    {
        index.addName(species.name);
        addSynonymNames(index, species.synonyms);

        if (species.erected_as)
        {
            index.addName(species.erected_as);
        }
    }
}

/**
 * Build the index of genus and species names from the dataset.
 *
 * @param dataset - The dataset.
 * @returns The index.
 */
export function createTaxonNameIndex(dataset: OpenPaleoDataset): TaxonNameIndex
{
    const index = new TaxonNameIndex();

    for (const name of Object.keys(dataset.genera))
    {
        addGenusNames(index, dataset.genera[name]);
    }

    return index;
}
