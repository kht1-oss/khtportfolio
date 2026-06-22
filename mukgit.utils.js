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

export function hasUserVoted(post, user) {
  return !!user && Array.isArray(post?.voters) && post.voters.includes(user.uid);
}

export function canDeletePost(post, user, adminEmail) {
  if (!user) return false;
  return post?.ownerUid === user.uid || user.email === adminEmail;
}

export function canDeleteComment(comment, user, adminEmail) {
  if (!user) return false;
  return comment?.commenterUid === user.uid || user.email === adminEmail;
}

export function canEditPost(post, user) {
  return !!user && post?.ownerUid === user.uid;
}
