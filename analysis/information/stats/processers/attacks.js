export const info = { requiredIntent: "attack" }

export async function basic(intents) {
  return intents[0]
}