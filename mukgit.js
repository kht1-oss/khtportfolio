import { firebaseConfig, ADMIN_PASSWORD } from "./firebase-config.js";
import { rankPosts, formatPrice, hasVoted, markVoted } from "./mukgit.utils.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore, collection, addDoc, onSnapshot,
  doc, updateDoc, deleteDoc, increment, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  getStorage, ref, uploadBytes, getDownloadURL, deleteObject,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);
const postsCol = collection(db, "posts");

const $ = (sel) => document.querySelector(sel);
const boardEl = $("#board");
const emptyEl = $("#empty");
const statusEl = $("#status");

function postToView(docSnap) {
  const d = docSnap.data();
  const created = d.createdAt && typeof d.createdAt.toMillis === "function"
    ? d.createdAt.toMillis() : 0;
  return {
    id: docSnap.id,
    foodName: d.foodName ?? "",
    author: d.author ?? "",
    price: d.price ?? 0,
    storeName: d.storeName ?? "",
    imageUrl: d.imageUrl ?? "",
    votes: d.votes ?? 0,
    imagePath: d.imagePath ?? "",
    createdAtMillis: created,
  };
}

function postCardHTML(p, rank) {
  const crown = rank === 1 ? "👑" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `#${rank}`;
  const voted = hasVoted(localStorage, p.id);
  return `
    <article class="post rank-${rank}" data-id="${p.id}" data-path="${p.imagePath}">
      <img class="photo" src="${p.imageUrl}" alt="${escapeHtml(p.foodName)}" loading="lazy" />
      <div class="body">
        <span class="crown">${crown}</span>
        <div class="fname">${escapeHtml(p.foodName)}</div>
        <div class="sub">${escapeHtml(p.storeName)} · ${formatPrice(p.price)}</div>
        <div class="sub">by ${escapeHtml(p.author)}</div>
      </div>
      <div class="footer">
        <button class="vote-btn" data-action="vote" ${voted ? "disabled" : ""}>▲ ${p.votes}</button>
        <button class="del-btn" data-action="del" title="삭제">🗑️</button>
      </div>
    </article>`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function renderBoard(posts) {
  const ranked = rankPosts(posts);
  emptyEl.hidden = ranked.length > 0;
  if (ranked.length === 0) { boardEl.innerHTML = ""; return; }

  const top3 = ranked.slice(0, 3);
  const rest = ranked.slice(3);

  // 시상대: 2위(왼), 1위(가운데), 3위(오른) 순서로 배치
  const podiumOrder = [top3[1], top3[0], top3[2]].filter(Boolean);
  const podiumHTML = podiumOrder
    .map((p) => postCardHTML(p, ranked.indexOf(p) + 1))
    .join("");
  const restHTML = rest.map((p) => postCardHTML(p, ranked.indexOf(p) + 1)).join("");

  boardEl.innerHTML =
    `<div class="podium">${podiumHTML}</div>` +
    (restHTML ? `<div class="grid-rest">${restHTML}</div>` : "");
}

// 실시간 구독
statusEl.textContent = "불러오는 중...";
onSnapshot(postsCol, (snap) => {
  statusEl.textContent = "";
  const posts = snap.docs.map(postToView);
  renderBoard(posts);
}, (err) => {
  console.error(err);
  statusEl.textContent = "목록을 불러오지 못했어요. 새로고침해 주세요.";
});

// 다음 태스크에서 사용할 핸들 export 대용 (모듈 스코프 유지)
export { db, storage, postsCol, renderBoard, escapeHtml };
