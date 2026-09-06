import { AttachmentBuilder } from "discord.js";
import { loadDerbyChunks } from "./derbyItems.js";
import { renderDerbyChunk } from "./derbyRender.js";
import { getEmojiForItem, getItemForEmojiId } from "./derbyEmojis.js";
import { getBoard, setBoard, deleteBoard, findByMessageId } from "./derbyBoardStore.js";

function countReservations(message, chunk) {
  const counts = new Array(chunk.length).fill(0);
  const indexByItem = new Map(chunk.map((item, i) => [item.item, i]));

  for (const reaction of message.reactions.cache.values()) {
    if (!reaction.emoji.id) continue; // not one of our custom item emoji
    const itemName = getItemForEmojiId(reaction.emoji.id);
    if (itemName === null) continue;
    const idx = indexByItem.get(itemName);
    if (idx === undefined) continue;
    counts[idx] = Math.max(0, reaction.count - 1); // exclude the bot's own seed reaction
  }
  return counts;
}

export async function postDerbyBoard(channel, guildId, neighborhoodId) {
  const existing = getBoard(guildId, neighborhoodId);
  if (existing) {
    for (const img of existing) {
      try {
        const msg = await channel.messages.fetch(img.messageId);
        await msg.delete();
      } catch {
        // already gone, nothing to clean up
      }
    }
  }

  const chunks = loadDerbyChunks();
  const images = [];

  for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
    const chunk = chunks[chunkIndex];
    const counts = new Array(chunk.length).fill(0);
    const buffer = await renderDerbyChunk(chunk, counts);
    const attachment = new AttachmentBuilder(buffer, { name: `derby-${chunkIndex}.png` });
    const message = await channel.send({ files: [attachment] });

    for (const item of chunk) {
      const emoji = getEmojiForItem(item.item);
      if (!emoji) continue;
      await message.react(`${emoji.emojiName}:${emoji.emojiId}`);
    }

    images.push({ chunkIndex, messageId: message.id });
  }

  setBoard(guildId, neighborhoodId, images);
  return images;
}

export async function refreshDerbyImage(rawMessage) {
  const found = findByMessageId(rawMessage.id);
  if (!found) return;

  const chunks = loadDerbyChunks();
  const chunk = chunks[found.chunkIndex];
  if (!chunk) return;

  const message = await rawMessage.fetch();
  const counts = countReservations(message, chunk);
  const buffer = await renderDerbyChunk(chunk, counts);
  const attachment = new AttachmentBuilder(buffer, { name: `derby-${found.chunkIndex}.png` });
  await message.edit({ files: [attachment] });
}

export { deleteBoard };
