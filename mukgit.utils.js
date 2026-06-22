const VOTED_KEY = "mukgit_voted";

export function formatPrice(price) {
  const n = Number(price);
  if (!Number.isFinite(n)) return "";
  return n.toLocaleString("ko-KR") + "원";
}

export function validatePostInput(input) {
  const errors = [];
  if (!input || !String(input.foodName ?? "").trim()) errors.push("음식 이름을 입력하세요.");
  if (!input || !String(input.author ?? "").trim()) errors.push("작성자 이름을 입력하세요.");
  if (!input || !String(input.storeName ?? "").trim()) errors.push("가게 이름을 입력하세요.");
  const price = Number(input?.price);
  if (!Number.isFinite(price) || price < 0) errors.push("가격은 0 이상의 숫자여야 합니다.");
  if (!input || !input.hasImage) errors.push("사진을 선택하세요.");
  return { valid: errors.length === 0, errors };
}

export function rankPosts(posts) {
  return [...posts].sort((a, b) => {
    if (b.votes !== a.votes) return b.votes - a.votes;
    return (b.createdAtMillis ?? 0) - (a.createdAtMillis ?? 0);
  });
}

function readVoted(storage) {
  const raw = storage.getItem(VOTED_KEY) || "[]";
  try {
    const ids = JSON.parse(raw);
    return Array.isArray(ids) ? ids : [];
  } catch {
    return [];
  }
}

export function hasVoted(storage, id) {
  return readVoted(storage).includes(id);
}

export function markVoted(storage, id) {
  const ids = readVoted(storage);
  if (!ids.includes(id)) ids.push(id);
  storage.setItem(VOTED_KEY, JSON.stringify(ids));
}
