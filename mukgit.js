import { firebaseConfig, ADMIN_EMAIL } from "./firebase-config.js";
import { rankPosts, formatPrice, validatePostInput, hasUserVoted, canDeletePost, canDeleteComment } from "./mukgit.utils.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore, collection, addDoc, onSnapshot,
  doc, updateDoc, deleteDoc, increment, arrayUnion, serverTimestamp,
  query, orderBy,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const postsCol = collection(db, "posts");

let currentUser = null;
let latestPosts = [];

// 사진은 Firestore 문서 안에 data URL(base64)로 직접 저장한다(Storage 미사용).
const MAX_IMAGE_DIM = 1000;
const MAX_IMAGE_BYTES = 900 * 1024; // 약 900KB — 나머지 필드 여유 확보

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
    body: d.body ?? "",
    votes: Number(d.votes ?? 0),
    ownerUid: d.ownerUid ?? "",
    voters: Array.isArray(d.voters) ? d.voters : [],
    createdAtMillis: created,
  };
}

function postCardHTML(p, rank) {
  const crown = rank === 1 ? "👑" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `#${rank}`;
  const voted = hasUserVoted(p, currentUser);
  const canDelete = canDeletePost(p, currentUser, ADMIN_EMAIL);
  return `
    <article class="post rank-${rank}" data-id="${escapeHtml(p.id)}">
      <img class="photo" src="${escapeHtml(p.imageUrl)}" alt="${escapeHtml(p.foodName)}" loading="lazy" />
      <div class="body">
        <span class="crown">${crown}</span>
        <div class="fname">${escapeHtml(p.foodName)}</div>
        <div class="sub">${escapeHtml(p.storeName)} · ${formatPrice(p.price)}</div>
        <div class="sub">by ${escapeHtml(p.author)}</div>
      </div>
      <div class="footer">
        <button class="vote-btn ${voted ? "voted" : ""}" data-action="vote" ${voted ? "disabled" : ""}>${voted ? "❤️" : "🤍"} ${p.votes}</button>
        ${canDelete ? `<button class="del-btn" data-action="del" title="삭제">🗑️</button>` : ""}
      </div>
    </article>`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// ---- 상세창 ----
const detailModal = $("#detail-modal");
let detailPostId = null;

function openDetail(post) {
  detailPostId = post.id;
  $("#d-photo").src = post.imageUrl;
  $("#d-photo").alt = post.foodName;
  $("#d-food").textContent = post.foodName;
  $("#d-meta").textContent = `${post.storeName} · ${formatPrice(post.price)} · by ${post.author}`;
  $("#d-body").textContent = post.body || "";
  updateCommentFormVisibility();
  commentListEl.innerHTML = "";
  subscribeComments(post.id);
  detailModal.hidden = false;
}

function closeDetail() {
  detailModal.hidden = true;
  detailPostId = null;
  if (commentsUnsub) { commentsUnsub(); commentsUnsub = null; }
  commentListEl.innerHTML = "";
}

$("#detail-close").addEventListener("click", closeDetail);
detailModal.addEventListener("click", (e) => { if (e.target === detailModal) closeDetail(); });

let commentsUnsub = null;
const commentListEl = $("#comment-list");
const commentForm = $("#comment-form");
const commentHint = $("#comment-login-hint");

function commentView(docSnap) {
  const d = docSnap.data();
  const created = d.createdAt && typeof d.createdAt.toMillis === "function"
    ? d.createdAt.toMillis() : 0;
  return {
    id: docSnap.id,
    name: d.name ?? "",
    text: d.text ?? "",
    commenterUid: d.commenterUid ?? "",
    createdAtMillis: created,
  };
}

function renderComments(comments) {
  if (comments.length === 0) {
    commentListEl.innerHTML = `<li class="comment-hint">아직 댓글이 없어요.</li>`;
    return;
  }
  commentListEl.innerHTML = comments.map((c) => {
    const del = canDeleteComment(c, currentUser, ADMIN_EMAIL)
      ? `<button class="c-del" data-action="del-comment" data-cid="${escapeHtml(c.id)}" title="삭제">🗑️</button>`
      : "";
    return `<li class="comment-item">${del}<span class="c-name">${escapeHtml(c.name)}</span><div class="c-text">${escapeHtml(c.text)}</div></li>`;
  }).join("");
}

function subscribeComments(postId) {
  const col = collection(db, "posts", postId, "comments");
  commentsUnsub = onSnapshot(query(col, orderBy("createdAt")), (snap) => {
    renderComments(snap.docs.map(commentView));
  }, (err) => {
    console.error(err);
    commentListEl.innerHTML = `<li class="comment-hint">댓글을 불러오지 못했어요.</li>`;
  });
}

function updateCommentFormVisibility() {
  const loggedIn = !!currentUser;
  commentForm.hidden = !loggedIn;
  commentHint.hidden = loggedIn;
}

commentForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!currentUser || !detailPostId) return;
  const name = $("#c-name").value.trim();
  const text = $("#c-text").value.trim();
  if (!name || !text) return;
  try {
    await addDoc(collection(db, "posts", detailPostId, "comments"), {
      name,
      text,
      commenterUid: currentUser.uid,
      createdAt: serverTimestamp(),
    });
    $("#c-text").value = "";
  } catch (err) {
    console.error(err);
    alert("댓글 작성에 실패했어요.");
  }
});

commentListEl.addEventListener("click", async (e) => {
  const btn = e.target.closest("button[data-action='del-comment']");
  if (!btn || !detailPostId) return;
  if (!confirm("이 댓글을 삭제할까요?")) return;
  try {
    await deleteDoc(doc(db, "posts", detailPostId, "comments", btn.dataset.cid));
  } catch (err) {
    console.error(err);
    alert("댓글 삭제에 실패했어요.");
  }
});

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

// ---- 로그인 ----
const loginBtn = $("#login-btn");
const logoutBtn = $("#logout-btn");
const userArea = $("#user-area");
const userName = $("#user-name");

loginBtn.addEventListener("click", async () => {
  try {
    await signInWithPopup(auth, provider);
  } catch (err) {
    console.error(err);
    alert("로그인에 실패했어요. 다시 시도해 주세요.");
  }
});
logoutBtn.addEventListener("click", () => signOut(auth));

function updateAuthUI() {
  if (currentUser) {
    loginBtn.hidden = true;
    userArea.hidden = false;
    userName.textContent = currentUser.displayName || "사용자";
  } else {
    loginBtn.hidden = false;
    userArea.hidden = true;
  }
}

onAuthStateChanged(auth, (user) => {
  currentUser = user;
  updateAuthUI();
  renderBoard(latestPosts);
});

// ---- 실시간 구독 ----
statusEl.textContent = "불러오는 중...";
onSnapshot(postsCol, (snap) => {
  statusEl.textContent = "";
  latestPosts = snap.docs.map(postToView);
  renderBoard(latestPosts);
}, (err) => {
  console.error(err);
  statusEl.textContent = "목록을 불러오지 못했어요. 새로고침해 주세요.";
});

// ---- 글쓰기 모달 ----
const modal = $("#write-modal");
const form = $("#write-form");
const errorsEl = $("#f-errors");
const submitBtn = $("#f-submit");

$("#open-write").addEventListener("click", () => {
  if (!currentUser) { alert("글을 올리려면 먼저 구글 로그인해 주세요."); return; }
  modal.hidden = false;
});
$("#f-cancel").addEventListener("click", () => closeModal());

function closeModal() {
  modal.hidden = true;
  form.reset();
  errorsEl.innerHTML = "";
}

// 이미지를 리사이즈 + JPEG 압축해서 data URL(base64 문자열)로 반환한다.
function compressImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > MAX_IMAGE_DIM || height > MAX_IMAGE_DIM) {
        const scale = Math.min(MAX_IMAGE_DIM / width, MAX_IMAGE_DIM / height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }
      const canvas = document.createElement("canvas");
      const render = () => {
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
      };
      render();

      let quality = 0.8;
      let dataUrl = canvas.toDataURL("image/jpeg", quality);
      let guard = 0;
      while (dataUrl.length > MAX_IMAGE_BYTES && guard < 12) {
        guard++;
        if (quality > 0.4) {
          quality = Math.round((quality - 0.1) * 10) / 10;
        } else {
          width = Math.round(width * 0.85);
          height = Math.round(height * 0.85);
          render();
          quality = 0.7;
        }
        dataUrl = canvas.toDataURL("image/jpeg", quality);
      }

      if (dataUrl.length > MAX_IMAGE_BYTES) {
        reject(new Error("이미지가 너무 큽니다. 더 작은 사진을 사용해 주세요."));
        return;
      }
      resolve(dataUrl);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("이미지를 불러오지 못했어요.")); };
    img.src = url;
  });
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!currentUser) { errorsEl.innerHTML = `<li>로그인 후 이용해 주세요.</li>`; return; }
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
  submitBtn.textContent = "작성 중...";
  try {
    const imageUrl = await compressImage(file);
    await addDoc(postsCol, {
      foodName: input.foodName.trim(),
      author: input.author.trim(),
      price: Number(input.price),
      storeName: input.storeName.trim(),
      body: $("#f-body").value.trim(),
      imageUrl,
      votes: 0,
      voters: [],
      ownerUid: currentUser.uid,
      createdAt: serverTimestamp(),
    });
    closeModal();
  } catch (err) {
    console.error(err);
    errorsEl.innerHTML = `<li>${escapeHtml(err.message || "저장에 실패했어요. 다시 시도해 주세요.")}</li>`;
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "작성";
  }
});

// ---- 추천 / 삭제 ----
boardEl.addEventListener("click", async (e) => {
  const card = e.target.closest(".post");
  if (!card) return;
  const id = card.dataset.id;
  const btn = e.target.closest("button[data-action]");
  if (!btn) {
    const post = latestPosts.find((p) => p.id === id);
    if (post) openDetail(post);
    return;
  }

  if (btn.dataset.action === "vote") {
    if (!currentUser) { alert("추천하려면 먼저 구글 로그인해 주세요."); return; }
    const post = latestPosts.find((p) => p.id === id);
    if (post && hasUserVoted(post, currentUser)) return;
    btn.disabled = true;
    try {
      await updateDoc(doc(db, "posts", id), {
        votes: increment(1),
        voters: arrayUnion(currentUser.uid),
      });
    } catch (err) {
      console.error(err);
      btn.disabled = false;
      alert("추천에 실패했어요. 다시 시도해 주세요.");
    }
    return;
  }

  if (btn.dataset.action === "del") {
    if (!confirm("이 글을 삭제할까요?")) return;
    try {
      await deleteDoc(doc(db, "posts", id));
    } catch (err) {
      console.error(err);
      alert("삭제에 실패했어요.");
    }
  }
});

// ---- 떠다니는 배경 이모지 ----
(function spawnBgEmojis() {
  const layer = document.getElementById("bg-emojis");
  if (!layer) return;
  const emojis = ["🤍", "❤️", "🩷", "🍕", "🍜", "🍣", "🍔", "🍝", "🥘", "🍰", "🍩"];
  const count = window.innerWidth < 560 ? 8 : 15;
  for (let i = 0; i < count; i++) {
    const el = document.createElement("span");
    el.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    el.style.left = Math.random() * 100 + "vw";
    el.style.fontSize = 20 + Math.random() * 22 + "px";
    el.style.animationDuration = 14 + Math.random() * 16 + "s";
    el.style.animationDelay = -Math.random() * 20 + "s";
    layer.appendChild(el);
  }
})();
