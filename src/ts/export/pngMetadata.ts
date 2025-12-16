/**
 * PNG Metadata Utility
 * Embeds tEXt chunks into PNG files without external libraries
 *
 * PNG file structure:
 * - 8-byte signature
 * - Chunks: [length(4)] [type(4)] [data(length)] [crc(4)]
 * - IHDR chunk (must be first)
 * - ... other chunks ...
 * - IEND chunk (must be last)
 *
 * We insert tEXt chunks after IHDR but before IDAT
 */

/**
 * Metadata that can be embedded in PNG files
 */
export interface PngMetadata {
  /** Software used to create the image */
  Software?: string;
  /** Title of the image */
  Title?: string;
  /** Description/ability text */
  Description?: string;
  /** Author (from script meta) */
  Author?: string;
  /** Source script name */
  Source?: string;
  /** JSON comment with additional data */
  Comment?: string;
}

/**
 * CRC32 lookup table for PNG chunk checksums
 */
const CRC_TABLE: number[] = (() => {
  const table: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c;
  }
  return table;
})();

/**
 * Calculate CRC32 checksum for PNG chunk
 */
function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = CRC_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/**
 * Create a PNG tEXt chunk
 * Format: keyword + null byte + text
 */
function createTextChunk(keyword: string, text: string): Uint8Array {
  const keywordBytes = new TextEncoder().encode(keyword);
  const textBytes = new TextEncoder().encode(text);

  // Chunk data: keyword + null separator + text
  const dataLength = keywordBytes.length + 1 + textBytes.length;
  const chunkData = new Uint8Array(dataLength);
  chunkData.set(keywordBytes, 0);
  chunkData[keywordBytes.length] = 0; // null separator
  chunkData.set(textBytes, keywordBytes.length + 1);

  // Full chunk: length(4) + type(4) + data + crc(4)
  const chunkType = new TextEncoder().encode('tEXt');
  const fullChunk = new Uint8Array(4 + 4 + dataLength + 4);
  const view = new DataView(fullChunk.buffer);

  // Write length (big-endian)
  view.setUint32(0, dataLength, false);

  // Write chunk type
  fullChunk.set(chunkType, 4);

  // Write data
  fullChunk.set(chunkData, 8);

  // Calculate CRC over type + data
  const crcData = new Uint8Array(4 + dataLength);
  crcData.set(chunkType, 0);
  crcData.set(chunkData, 4);
  const crc = crc32(crcData);
  view.setUint32(8 + dataLength, crc, false);

  return fullChunk;
}

/**
 * Find the position of the first IDAT chunk in a PNG
 * We insert our tEXt chunks before IDAT
 */
function findIdatPosition(pngData: Uint8Array): number {
  const view = new DataView(pngData.buffer, pngData.byteOffset, pngData.byteLength);

  // Skip PNG signature (8 bytes)
  let pos = 8;

  while (pos < pngData.length) {
    const length = view.getUint32(pos, false);
    const type = new TextDecoder().decode(pngData.slice(pos + 4, pos + 8));

    if (type === 'IDAT') {
      return pos;
    }

    // Move to next chunk: length(4) + type(4) + data(length) + crc(4)
    pos += 12 + length;
  }

  // Fallback: return position after IHDR (8 + 25 = 33)
  return 33;
}

/**
 * Embed metadata into a PNG blob
 * @param pngBlob - Original PNG blob
 * @param metadata - Metadata to embed
 * @returns New PNG blob with embedded metadata
 */
export async function embedPngMetadata(pngBlob: Blob, metadata: PngMetadata): Promise<Blob> {
  // Read the original PNG data
  const arrayBuffer = await pngBlob.arrayBuffer();
  const pngData = new Uint8Array(arrayBuffer);

  // Create tEXt chunks for each metadata field
  const textChunks: Uint8Array[] = [];

  if (metadata.Software) {
    textChunks.push(createTextChunk('Software', metadata.Software));
  }
  if (metadata.Title) {
    textChunks.push(createTextChunk('Title', metadata.Title));
  }
  if (metadata.Description) {
    textChunks.push(createTextChunk('Description', metadata.Description));
  }
  if (metadata.Author) {
    textChunks.push(createTextChunk('Author', metadata.Author));
  }
  if (metadata.Source) {
    textChunks.push(createTextChunk('Source', metadata.Source));
  }
  if (metadata.Comment) {
    textChunks.push(createTextChunk('Comment', metadata.Comment));
  }

  if (textChunks.length === 0) {
    return pngBlob; // No metadata to add
  }

  // Calculate total size of new chunks
  const totalNewSize = textChunks.reduce((sum, chunk) => sum + chunk.length, 0);

  // Find where to insert (before IDAT)
  const insertPos = findIdatPosition(pngData);

  // Create new PNG with inserted chunks
  const newPng = new Uint8Array(pngData.length + totalNewSize);

  // Copy data before insertion point
  newPng.set(pngData.slice(0, insertPos), 0);

  // Insert text chunks
  let offset = insertPos;
  for (const chunk of textChunks) {
    newPng.set(chunk, offset);
    offset += chunk.length;
  }

  // Copy remaining data
  newPng.set(pngData.slice(insertPos), offset);

  return new Blob([newPng], { type: 'image/png' });
}

/**
 * Create metadata object for a character token
 */
export function createCharacterMetadata(
  characterName: string,
  team: string,
  ability?: string,
  characterId?: string,
  edition?: string,
  scriptName?: string,
  scriptAuthor?: string
): PngMetadata {
  const comment: Record<string, string> = {
    type: 'character',
    team,
  };

  if (characterId) comment.id = characterId;
  if (edition) comment.edition = edition;

  return {
    Software: 'Clocktower Token Generator',
    Title: characterName,
    Description: ability ? `${team.charAt(0).toUpperCase() + team.slice(1)} - ${ability}` : team,
    Author: scriptAuthor,
    Source: scriptName,
    Comment: JSON.stringify(comment),
  };
}

/**
 * Create metadata object for a reminder token
 */
export function createReminderMetadata(
  parentCharacter: string,
  reminderText: string,
  team: string,
  scriptName?: string,
  scriptAuthor?: string
): PngMetadata {
  const comment = {
    type: 'reminder',
    parentCharacter,
    reminderText,
    team,
  };

  return {
    Software: 'Clocktower Token Generator',
    Title: `${parentCharacter} - ${reminderText}`,
    Description: `Reminder token for ${parentCharacter}`,
    Author: scriptAuthor,
    Source: scriptName,
    Comment: JSON.stringify(comment),
  };
}

/**
 * Create metadata object for a meta token (script name, almanac, pandemonium)
 */
export function createMetaTokenMetadata(
  tokenType: 'script-name' | 'almanac' | 'pandemonium',
  scriptName?: string,
  scriptAuthor?: string
): PngMetadata {
  const titles: Record<string, string> = {
    'script-name': scriptName || 'Script Name',
    almanac: `${scriptName || 'Script'} Almanac`,
    pandemonium: 'Pandemonium Institute',
  };

  const descriptions: Record<string, string> = {
    'script-name': 'Script name token',
    almanac: 'Almanac QR code token',
    pandemonium: 'Pandemonium Institute token',
  };

  return {
    Software: 'Clocktower Token Generator',
    Title: titles[tokenType],
    Description: descriptions[tokenType],
    Author: scriptAuthor,
    Source: scriptName,
    Comment: JSON.stringify({ type: tokenType }),
  };
}

/**
 * Token interface for metadata building (minimal fields needed)
 */
interface TokenForMetadata {
  name: string;
  type: string;
  team?: string;
  reminderText?: string;
  parentCharacter?: string;
}

/**
 * Build PNG metadata for a token
 * @param token - Token object with name, type, team, and optional reminder info
 * @returns PngMetadata object ready for embedding
 */
export function buildTokenMetadata(token: TokenForMetadata): PngMetadata {
  const metadata: PngMetadata = {
    Title: token.name,
    Description: `${token.type} token${token.team ? ` - ${token.team}` : ''}`,
    Source: 'Clocktower Token Generator',
  };

  // Build comment JSON with token details
  if (token.reminderText) {
    metadata.Comment = JSON.stringify({
      type: token.type,
      team: token.team,
      reminderText: token.reminderText,
      parentCharacter: token.parentCharacter,
    });
  } else {
    metadata.Comment = JSON.stringify({
      type: token.type,
      team: token.team,
    });
  }

  return metadata;
}
