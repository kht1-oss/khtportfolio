import test from "node:test";
import assert from "node:assert/strict";
import {
  formatPrice,
  validatePostInput,
  rankPosts,
  hasUserVoted,
  canDeletePost,
} from "../mukgit.utils.js";

test("formatPrice: 숫자를 천단위 콤마 + 원으로", () => {
  assert.equal(formatPrice(28000), "28,000원");
  assert.equal(formatPrice("9000"), "9,000원");
  assert.equal(formatPrice(0), "0원");
});

test("formatPrice: 숫자가 아니면 빈 문자열", () => {
  assert.equal(formatPrice("abc"), "");
  assert.equal(formatPrice(NaN), "");
  assert.equal(formatPrice(undefined), "");
});

test("validatePostInput: 모든 값이 있으면 valid", () => {
  const r = validatePostInput({
    foodName: "피자",
    author: "민수",
    price: "28000",
    storeName: "미도리",
    hasImage: true,
  });
  assert.equal(r.valid, true);
  assert.deepEqual(r.errors, []);
});

test("validatePostInput: 누락/잘못된 값 각각 에러", () => {
  const r = validatePostInput({
    foodName: "  ",
    author: "",
    price: "비쌈",
    storeName: "",
    hasImage: false,
  });
  assert.equal(r.valid, false);
  assert.equal(r.errors.length, 5);
});

test("validatePostInput: 음수 가격 거부", () => {
  const r = validatePostInput({
    foodName: "x", author: "y", price: -100, storeName: "z", hasImage: true,
  });
  assert.equal(r.valid, false);
});

test("rankPosts: votes 내림차순 정렬", () => {
  const input = [
    { id: "a", votes: 3, createdAtMillis: 1 },
    { id: "b", votes: 10, createdAtMillis: 2 },
    { id: "c", votes: 7, createdAtMillis: 3 },
  ];
  const out = rankPosts(input);
  assert.deepEqual(out.map((p) => p.id), ["b", "c", "a"]);
});

test("rankPosts: 동률이면 최신(createdAtMillis 큰 것) 우선", () => {
  const input = [
    { id: "old", votes: 5, createdAtMillis: 100 },
    { id: "new", votes: 5, createdAtMillis: 200 },
  ];
  const out = rankPosts(input);
  assert.deepEqual(out.map((p) => p.id), ["new", "old"]);
});

test("rankPosts: 원본 배열을 변경하지 않음", () => {
  const input = [
    { id: "a", votes: 1, createdAtMillis: 1 },
    { id: "b", votes: 2, createdAtMillis: 2 },
  ];
  rankPosts(input);
  assert.deepEqual(input.map((p) => p.id), ["a", "b"]);
});

test("hasUserVoted: voters에 내 uid가 있으면 true", () => {
  assert.equal(hasUserVoted({ voters: ["u1", "u2"] }, { uid: "u1" }), true);
});

test("hasUserVoted: voters에 없으면 false", () => {
  assert.equal(hasUserVoted({ voters: ["u2"] }, { uid: "u1" }), false);
});

test("hasUserVoted: 비로그인/voters 없음은 false (안전)", () => {
  assert.equal(hasUserVoted({ voters: ["u1"] }, null), false);
  assert.equal(hasUserVoted({}, { uid: "u1" }), false);
});

test("canDeletePost: 소유자면 true", () => {
  assert.equal(
    canDeletePost({ ownerUid: "u1" }, { uid: "u1", email: "a@b.c" }, "admin@x.com"),
    true
  );
});

test("canDeletePost: 관리자 이메일이면 true", () => {
  assert.equal(
    canDeletePost({ ownerUid: "u2" }, { uid: "u1", email: "admin@x.com" }, "admin@x.com"),
    true
  );
});

test("canDeletePost: 남의 글이면 false", () => {
  assert.equal(
    canDeletePost({ ownerUid: "u2" }, { uid: "u1", email: "a@b.c" }, "admin@x.com"),
    false
  );
});

test("canDeletePost: 비로그인은 false", () => {
  assert.equal(canDeletePost({ ownerUid: "u1" }, null, "admin@x.com"), false);
});
