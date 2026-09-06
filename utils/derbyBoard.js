import { AttachmentBuilder } from "discord.js";
import { loadDerbyChunks } from "./derbyItems.js";
import { renderDerbyChunk } from "./derbyRender.js";
import { letterEmoji, emojiToLetterIndex } from "./derbyLetters.js";
import { getBoard, setBoard, deleteBoard, findByMessageId } from "./derbyBoardStore.js";

function countReservations(message, chunkLength) {
  const counts = new Array(chunkLength).fill(0);
  for (const reaction of message.reactions.cache.values()) {
    const idx = emojiToLetterIndex(reaction.emoji.name);
    if (idx === -1 || idx >= chunkLength) continue;
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

    for (let i = 0; i < chunk.length; i++) {
      await message.react(letterEmoji(i));
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
  const counts = countReservations(message, chunk.length);
  const buffer = await renderDerbyChunk(chunk, counts);
  const attachment = new AttachmentBuilder(buffer, { name: `derby-${found.chunkIndex}.png` });
  await message.edit({ files: [attachment] });
}

export { deleteBoard };
