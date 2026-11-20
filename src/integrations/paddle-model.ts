import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import * as url from "node:url";

import { parse } from "yaml";

// Downloads the PaddleOCR model the tree extractor's second OCR engine uses, at a pinned revision,
// and writes the folder the site serves: the model, its dictionary, its license and a note on
// where it came from.

/**
 * The part of the model's configuration that lists its characters.
 */
type ModelConfig = {
    /**
     * How the model's output is decoded.
     */
    PostProcess?: ModelPostProcess;
};

/**
 * How the model's output is decoded.
 */
type ModelPostProcess = {
    /**
     * The characters the model recognizes, in the order of its output classes.
     */
    character_dict?: Array<unknown>;
};

/**
 * A file downloaded from the model's repository.
 */
type ModelFile = {
    /**
     * Its name in the repository.
     */
    name: string;

    /**
     * Its SHA-256 checksum, in hex.
     */
    checksum: string;
};

/**
 * The model's repository on Hugging Face.
 */
export const modelRepository = "PaddlePaddle/en_PP-OCRv5_mobile_rec_onnx";

/**
 * The revision of the model the site serves.
 */
export const modelRevision = "3fafbc3b5dcf93dd72add9f48368be8a3a2cd33b";
const modelFile: ModelFile = { name: "inference.onnx", checksum: "b5f833dfc5d0eb71da397b4efa06ebeee9b431b690a47d6af40d77d8eabc557f" };
const configFile: ModelFile = { name: "inference.yml", checksum: "27e91d0582f40168aa218303c76e184bc78fa7a5d105aad0cfbad8458b441067" };

const integrationsDirectory = path.dirname(url.fileURLToPath(import.meta.url));
const rootDirectory = path.dirname(path.dirname(integrationsDirectory));

/**
 * The folder the site serves the model from, once prepared.
 */
export const paddleModelDirectory = path.join(rootDirectory, "node_modules", ".cache", "open-paleo", "paddleocr-" + modelRevision);

/**
 * The files in that folder the site serves.
 */
export const paddleModelFiles = ["inference.onnx", "dict.txt", "LICENSE.txt", "README.txt"];

/**
 * Get a file's SHA-256 checksum.
 *
 * @param bytes - The file's contents.
 * @returns The checksum, in hex.
 */
function getChecksum(bytes: Uint8Array): string
{
    return crypto.createHash("sha256").update(bytes).digest("hex");
}

/**
 * Download a file from the model's repository, refusing it if its checksum differs.
 *
 * @param file - The file.
 * @returns Its contents.
 */
async function downloadModelFile(file: ModelFile): Promise<Buffer>
{
    const address = "https://huggingface.co/" + modelRepository + "/resolve/" + modelRevision + "/" + file.name;
    const response = await fetch(address, { headers: { "User-Agent": "open-paleo-build" } });

    if (!response.ok)
    {
        throw new Error("Could not download " + address + ": HTTP " + response.status);
    }

    const bytes = Buffer.from(await response.arrayBuffer());
    const checksum = getChecksum(bytes);

    if (checksum !== file.checksum)
    {
        throw new Error(address + " has checksum " + checksum + ", not " + file.checksum + ".");
    }

    return bytes;
}

/**
 * Create the dictionary file from the model's configuration: one character per line, in the
 * order PostProcess.character_dict gives them.
 *
 * @param configText - The text of inference.yml.
 * @returns The dictionary file's text.
 */
function createDictionary(configText: string): string
{
    const config = parse(configText) as ModelConfig;
    const characters = config.PostProcess?.character_dict;

    if (!Array.isArray(characters) || characters.length === 0)
    {
        throw new Error(configFile.name + " has no PostProcess.character_dict.");
    }

    return characters.map(String).join("\n") + "\n";
}

/**
 * Create the note on where the model came from.
 *
 * @returns The note's text.
 */
function createSourceNote(): string
{
    return [
        "The English text recognition model of PaddleOCR (PP-OCRv5 mobile), unmodified, from",
        "https://huggingface.co/" + modelRepository + " at revision " + modelRevision + ".",
        "It is licensed under the Apache License 2.0, in LICENSE.txt.",
        "",
        "dict.txt lists the characters the model recognizes, one per line, as PostProcess.character_dict",
        "in that repository's " + configFile.name + " gives them.",
        "",
    ].join("\n");
}

/**
 * Prepare the folder the site serves the model from, downloading the model unless an earlier
 * build already did.
 *
 * @returns The folder.
 */
export async function preparePaddleModel(): Promise<string>
{
    const modelPath = path.join(paddleModelDirectory, modelFile.name);
    const isReady = fs.existsSync(modelPath) && getChecksum(fs.readFileSync(modelPath)) === modelFile.checksum && paddleModelFiles.every((name) => fs.existsSync(path.join(paddleModelDirectory, name)));

    if (isReady)
    {
        return paddleModelDirectory;
    }

    const model = await downloadModelFile(modelFile);
    const config = await downloadModelFile(configFile);

    fs.mkdirSync(paddleModelDirectory, { recursive: true });
    fs.writeFileSync(path.join(paddleModelDirectory, "dict.txt"), createDictionary(config.toString("utf8")));
    fs.copyFileSync(path.join(integrationsDirectory, "apache-2.0.txt"), path.join(paddleModelDirectory, "LICENSE.txt"));
    fs.writeFileSync(path.join(paddleModelDirectory, "README.txt"), createSourceNote());

    // Write the model last, so an interrupted download is retried.
    fs.writeFileSync(modelPath + ".partial", model);
    fs.renameSync(modelPath + ".partial", modelPath);

    return paddleModelDirectory;
}
