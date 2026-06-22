import { firebaseConfig, ADMIN_PASSWORD } from "./firebase-config.js";
import { rankPosts, formatPrice, hasVoted, markVoted, validatePostInput } from "./mukgit.utils.js";
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
    price: Number(d.price ?? 0),
    storeName: d.storeName ?? "",
    imageUrl: d.imageUrl ?? "",
    votes: Number(d.votes ?? 0),
    imagePath: d.imagePath ?? "",
    createdAtMillis: created,
  };
}

function postCardHTML(p, rank) {
  const crown = rank === 1 ? "👑" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `#${rank}`;
  const voted = hasVoted(localStorage, p.id);
  return `
    <article class="post rank-${rank}" data-id="${escapeHtml(p.id)}" data-path="${escapeHtml(p.imagePath)}">
      <img class="photo" src="${escapeHtml(p.imageUrl)}" alt="${escapeHtml(p.foodName)}" loading="lazy" />
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

const modal = $("#write-modal");
const form = $("#write-form");
const errorsEl = $("#f-errors");
const submitBtn = $("#f-submit");

$("#open-write").addEventListener("click", () => { modal.hidden = false; });
$("#f-cancel").addEventListener("click", () => closeModal());
modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });

function closeModal() {
  modal.hidden = true;
  form.reset();
  errorsEl.innerHTML = "";
}

// 이미지를 최대 1000px로 리사이즈 + JPEG 압축
function compressImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const max = 1000;
      let { width, height } = img;
      if (width > max || height > max) {
        const scale = Math.min(max / width, max / height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      canvas.getContext("2d").drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("압축 실패"))),
        "image/jpeg", 0.8
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("이미지 로드 실패")); };
    img.src = url;
  });
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const file = $("#f-image").files[0];
  const input = {
    foodName: $("#f-food").value,
    author: $("#f-author").value,
    price: $("#f-price").value,
    storeName: $("#f-store").value,
    hasImage: !!file,
  };
  const { valid, errors } = validatePostInput(input);
  errorsEl.innerHTML = errors.map((m) => `<li>${escapeHtml(m)}</li>`).join("");
  if (!valid) return;

  submitBtn.disabled = true;
  submitBtn.textContent = "봉헌 중...";
  try {
    const blob = await compressImage(file);
    const path = `posts/${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, blob);
    const imageUrl = await getDownloadURL(storageRef);
    await addDoc(postsCol, {
      foodName: input.foodName.trim(),
      author: input.author.trim(),
      price: Number(input.price),
      storeName: input.storeName.trim(),
      imageUrl,
      imagePath: path,
      votes: 0,
      createdAt: serverTimestamp(),
    });
    closeModal();
  } catch (err) {
    console.error(err);
    errorsEl.innerHTML = `<li>저장에 실패했어요. 다시 시도해 주세요.</li>`;
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "봉헌";
  }
});

boardEl.addEventListener("click", async (e) => {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;
  const card = btn.closest(".post");
  const id = card.dataset.id;

  if (btn.dataset.action === "vote") {
    if (hasVoted(localStorage, id)) return;
    btn.disabled = true;
    try {
      await updateDoc(doc(db, "posts", id), { votes: increment(1) });
      markVoted(localStorage, id);
    } catch (err) {
      console.error(err);
      btn.disabled = false;
      alert("추천에 실패했어요. 다시 시도해 주세요.");
    }
    return;
  }

  if (btn.dataset.action === "del") {
    const pw = prompt("관리자 암호를 입력하세요:");
    if (pw === null) return;
    if (pw !== ADMIN_PASSWORD) { alert("암호가 일치하지 않습니다."); return; }
    try {
      const path = card.dataset.path;
      if (path) await deleteObject(ref(storage, path)).catch(() => {});
      await deleteDoc(doc(db, "posts", id));
    } catch (err) {
      console.error(err);
      alert("삭제에 실패했어요.");
    }
  }
});

// 다음 태스크에서 사용할 핸들 export 대용 (모듈 스코프 유지)
export { db, storage, postsCol, renderBoard, escapeHtml };
