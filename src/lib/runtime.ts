/** True in the single-file shareable build, which runs without a server (no accounts, AI or file downloads). */
export const STANDALONE = process.env.NEXT_PUBLIC_STANDALONE === "1";
