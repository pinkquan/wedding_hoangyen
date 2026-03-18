(function () {
  "use strict";
  var W = window.__WeddingApp;
  if (!W) return;
  var $ = W.$;
  var $$ = W.$$;
  var showToast = W.showToast;
  var copyToClipboard = W.copyToClipboard;
  var prefersReducedMotion = W.prefersReducedMotion;
  var CONFIG = W.CONFIG;
  function initMusicPlayer() {
    const btn = $("#music-btn");
    const audio = $("#bg-audio");
    if (!btn || !audio) return;
    let playing = false;
    function togglePlay() {
      if (playing) {
        audio.pause();
        btn.classList.remove("playing");
        btn.setAttribute("title", "Phát nhạc nền");
        playing = false;
      } else {
        audio
          .play()
          .then(() => {
            btn.classList.add("playing");
            btn.setAttribute("title", "Dừng nhạc");
            playing = true;
          })
          .catch(() => {
            showToast("🔇 Trình duyệt chặn tự động phát nhạc. Nhấn để phát.");
          });
      }
    }
    btn.addEventListener("click", togglePlay);
    const autoPlayOnce = () => {
      if (!playing) {
        audio
          .play()
          .then(() => {
            btn.classList.add("playing");
            btn.setAttribute("title", "Dừng nhạc");
            playing = true;
          })
          .catch(() => { });
      }
      document.removeEventListener("touchstart", autoPlayOnce);
      document.removeEventListener("click", autoPlayOnce);
    };
    document.addEventListener("touchstart", autoPlayOnce, { once: true });
    document.addEventListener("click", autoPlayOnce, { once: true });
  }
  function initHeartsRain() {
    if (prefersReducedMotion()) return;
    const canvas = $("#hearts-canvas");
    if (!canvas) return;
    const EMOJIS = ["❤", "💗", "💓"];
    let heartCount = 0;
    let active = true;
    function createHeart() {
      if (heartCount >= 15) return;
      const el = document.createElement("span");
      el.classList.add("heart-rain-item");
      el.textContent = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
      const size = 10 + Math.random() * 12;
      const left = Math.random() * 98;
      const duration = 6 + Math.random() * 8;
      const delay = Math.random() * 3;
      el.style.cssText = `        left: ${left}%;        font-size: ${size}px;        animation-duration: ${duration}s;        animation-delay: ${delay}s;        color: ${Math.random() > 0.6 ? "#e63946" : "#ff6b9d"};      `;
      canvas.appendChild(el);
      heartCount++;
      el.addEventListener(
        "animationend",
        () => {
          el.remove();
          heartCount--;
        },
        { once: true },
      );
    }
    const timer = setInterval(() => {
      if (active) createHeart();
    }, CONFIG.heartRainInterval);
    for (let i = 0; i < 8; i++) {
      setTimeout(createHeart, i * 80);
    }
    document.addEventListener("visibilitychange", () => {
      active = !document.hidden;
    });
  }
  const DEMO_BLESSINGS = [
    {
      name: "Tuấn Anh",
      text: "Đồng tâm đồng lòng, xây dựng tổ ấm thịnh vượng!",
    },
    { name: "Hoàng", text: "💕 Mãi mãi hạnh phúc bên nhau nhé!" },
    { name: "Minh", text: "🌸 Tân hôn hạnh phúc, trăm năm bên nhau!" },
    { name: "Đức", text: "❤️ Chúc hai bạn trăm năm hạnh phúc!" },
    { name: "em Quân hehe", text: "💖 Chúc anh chị trăm năm hòa hợp, hạnh phúc~~~" },
    { name: "Lan", text: "✨ Hạnh phúc mãi mãi nhé!" },
    { name: "Phong", text: "💕 Hai bạn xứng đôi vừa lứa!" },
    { name: "Thảo", text: "🌸 Chúc mừng đám cưới, hạnh phúc trăm năm!" },
  ];
  let heartCountVal = 0;
  let blessingQueue = [];
  let _blessingFetchInProgress = false;
  let _lastBlessingFetchTime = 0;
  const BLESSING_FETCH_COOLDOWN_MS = 5000;
  var _blessingGuestName = null;
  const BLESSING_BUBBLE_CONFIG = Object.freeze({
    maxActive: 8,
    emitIntervalMs: 1450,
    originLeftMinPercent: 14,
    originLeftMaxPercent: 86,
    driftMidRange: 0.18,
    driftXRange: 0.42,
    liftMinRem: 1.35,
    liftMaxRem: 2.08,
    startRiseMinRem: 0.02,
    startRiseMaxRem: 0.1,
    tiltRangeDeg: 5,
    durationMinMs: 4600,
    durationMaxMs: 6600,
    delayMaxMs: 140,
    alphaMin: 0.83,
    alphaMax: 0.96,
  });
  function resolveGuestName() {
    var personalization = W.getInvitationPersonalization();
    if (personalization.guestName) {
      return Promise.resolve(personalization.guestName);
    }
    if (_blessingGuestName !== null) {
      return Promise.resolve(_blessingGuestName);
    }
    return showNameDialog();
  }
  function showNameDialog() {
    return new Promise(function (resolve) {
      var overlay = $("#blessing-name-dialog");
      var titleEl = $("#blessing-name-dialog-title");
      var anonymousLabel = $("#blessing-name-anonymous-label");
      var nameInput = $("#blessing-name-input");
      var submitBtn = $("#blessing-name-submit");
      var closeBtn = overlay
        ? overlay.querySelector(".blessing-name-dialog-close")
        : null;
      var radioNamed = overlay
        ? overlay.querySelector('input[value="named"]')
        : null;
      var radioAnon = overlay
        ? overlay.querySelector('input[value="anonymous"]')
        : null;
      if (!overlay) {
        _blessingGuestName = "";
        resolve("");
        return;
      }
      var dialogCfg = (W.CFG.blessings && W.CFG.blessings.name_dialog) || {};
      titleEl.textContent =
        dialogCfg.title || "Hãy cho vợ chồng mình biết tên của bạn";
      anonymousLabel.textContent =
        dialogCfg.anonymous_label ||
        "Điều đó không cần thiết, mình chỉ muốn chúc mừng hạnh phúc hai vợ chồng một cách tự nhiên nhất";
      nameInput.placeholder =
        dialogCfg.name_placeholder || "Nhập tên của bạn...";
      submitBtn.textContent = dialogCfg.submit_label || "Gửi lời chúc";
      if (radioNamed) radioNamed.checked = true;
      nameInput.value = "";
      nameInput.disabled = false;
      overlay.classList.add("open");
      setTimeout(function () {
        nameInput.focus();
      }, 100);
      var resolved = false;
      function cleanup() {
        overlay.classList.remove("open");
        submitBtn.removeEventListener("click", onSubmit);
        if (closeBtn) closeBtn.removeEventListener("click", onClose);
        overlay.removeEventListener("click", onOverlayClick);
        if (radioNamed) radioNamed.removeEventListener("change", onRadioChange);
        if (radioAnon) radioAnon.removeEventListener("change", onRadioChange);
      }
      function finalize(name) {
        if (resolved) return;
        resolved = true;
        _blessingGuestName = name;
        cleanup();
        resolve(name);
      }
      function onSubmit() {
        if (radioAnon && radioAnon.checked) {
          finalize("");
        } else {
          var name = nameInput.value.trim();
          finalize(name);
        }
      }
      function onClose() {
        finalize("");
      }
      function onOverlayClick(e) {
        if (e.target === overlay) {
          finalize("");
        }
      }
      function onRadioChange() {
        if (radioNamed && radioNamed.checked) {
          nameInput.disabled = false;
          nameInput.focus();
        } else {
          nameInput.disabled = true;
        }
      }
      submitBtn.addEventListener("click", onSubmit);
      if (closeBtn) closeBtn.addEventListener("click", onClose);
      overlay.addEventListener("click", onOverlayClick);
      if (radioNamed) radioNamed.addEventListener("change", onRadioChange);
      if (radioAnon) radioAnon.addEventListener("change", onRadioChange);
    });
  }
  function initBlessings() {
    const input = $("#blessing-input");
    const sendBtn = $("#btn-send-blessing");
    const msgBox = $("#blessing-messages");
    const heartBtn = $("#btn-shoot-hearts");
    const giftBtn = $("#btn-gift");
    const badge = $("#heart-count-badge");
    if (!input || !sendBtn || !msgBox) return;
    fetchHeartCount();
    fetchBlessings();
    let blessingsActive = !document.hidden;
    document.addEventListener("visibilitychange", () => {
      blessingsActive = !document.hidden;
      if (blessingsActive && blessingQueue.length === 0) {
        fetchBlessings();
      }
    });
    setInterval(() => {
      if (!blessingsActive) return;
      if (blessingQueue.length === 0) {
        fetchBlessings();
        return;
      }
      if (
        countActiveBlessingBubbles(msgBox) >= BLESSING_BUBBLE_CONFIG.maxActive
      )
        return;
      showNextBlessing(msgBox);
    }, BLESSING_BUBBLE_CONFIG.emitIntervalMs);
    DEMO_BLESSINGS.forEach((b, i) => {
      setTimeout(() => addBlessingToQueue(b), i * 2500 + 1000);
    });
    function sendBlessing() {
      var text = input.value.trim();
      if (!text) return;
      input.value = "";
      resolveGuestName().then(function (name) {
        var displayName = name || "Bạn";
        showImmediateBlessing({ name: displayName, text: text }, msgBox);
        showToast("💌 Đã gửi lời chúc!");
      });
    }
    sendBtn.addEventListener("click", sendBlessing);
    input.addEventListener("keypress", (e) => {
      if (e.key === "Enter") sendBlessing();
    });
    if (heartBtn) {
      heartBtn.addEventListener("click", () => {
        shootHearts(12);
        incrementHeartCount();
        if (badge) badge.textContent = heartCountVal;
      });
    }
    if (giftBtn) {
      giftBtn.addEventListener("click", () => {
        openGiftPopup();
      });
    }
  }
  function addBlessingToQueue(blessing) {
    blessingQueue.push(blessing);
  }
  function countActiveBlessingBubbles(msgBox) {
    return $$(".blessing-msg", msgBox).length;
  }
  function randomInRange(min, max) {
    return min + Math.random() * (max - min);
  }
  function setBlessingBubbleMotionVars(el) {
    const xMid = 0;
    const xOffset = 0;
    const yLift = randomInRange(
      BLESSING_BUBBLE_CONFIG.liftMinRem,
      BLESSING_BUBBLE_CONFIG.liftMaxRem,
    );
    const startRise = 0;
    const tilt = 0;
    const durationMs = Math.round(
      randomInRange(
        BLESSING_BUBBLE_CONFIG.durationMinMs,
        BLESSING_BUBBLE_CONFIG.durationMaxMs,
      ),
    );
    const delayMs = Math.round(
      randomInRange(0, BLESSING_BUBBLE_CONFIG.delayMaxMs),
    );
    const alpha = randomInRange(
      BLESSING_BUBBLE_CONFIG.alphaMin,
      BLESSING_BUBBLE_CONFIG.alphaMax,
    );
    const originXPercent = 2;
    el.style.setProperty("--bless-origin-x", `${originXPercent.toFixed(2)}%`);
    el.style.setProperty("--bless-x-mid", `${xMid.toFixed(3)}rem`);
    el.style.setProperty("--bless-x-offset", `${xOffset.toFixed(3)}rem`);
    el.style.setProperty("--bless-y-lift", `${yLift.toFixed(3)}rem`);
    el.style.setProperty("--bless-start-rise", `${startRise.toFixed(3)}rem`);
    el.style.setProperty("--bless-tilt", `${tilt.toFixed(2)}deg`);
    el.style.setProperty("--bless-duration", `${durationMs}ms`);
    el.style.setProperty("--bless-delay", `${delayMs}ms`);
    el.style.setProperty("--bless-alpha", alpha.toFixed(2));
  }
  function showNextBlessing(msgBox) {
    if (blessingQueue.length === 0) return false;
    if (countActiveBlessingBubbles(msgBox) >= BLESSING_BUBBLE_CONFIG.maxActive)
      return false;
    const blessing = blessingQueue.shift();
    if (!blessing) return false;
    const el = document.createElement("div");
    el.className = prefersReducedMotion()
      ? "blessing-msg blessing-msg--reduced"
      : "blessing-msg";
    el.innerHTML = `<strong>${escapeHtml(blessing.name)}:</strong> ${escapeHtml(blessing.text)}`;
    setBlessingBubbleMotionVars(el);
    msgBox.appendChild(el);
    el.addEventListener(
      "animationend",
      () => {
        el.remove();
      },
      { once: true },
    );
    return true;
  }
  function showImmediateBlessing(blessing, msgBox) {
    if (!blessing || !msgBox) return;
    const el = document.createElement("div");
    el.className = prefersReducedMotion()
      ? "blessing-msg blessing-msg--reduced"
      : "blessing-msg";
    el.innerHTML = `<strong>${escapeHtml(blessing.name)}:</strong> ${escapeHtml(blessing.text)}`;
    setBlessingBubbleMotionVars(el);
    msgBox.appendChild(el);
    el.addEventListener(
      "animationend",
      () => {
        el.remove();
      },
      { once: true },
    );
  }
  function escapeHtml(str) {
    const div = document.createElement("div");
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }
  function sampleBlessingsWithDecay(allBlessings, sampleSize, decayRate) {
    const sorted = [...allBlessings].sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
    const targetSize = Math.min(sampleSize, sorted.length);
    const sampled = [];
    const remaining = sorted.map((blessing, i) => ({
      blessing,
      probability: Math.pow(1 - decayRate, i),
    }));
    let attempts = 0;
    const maxAttempts = targetSize * 3;
    while (
      sampled.length < targetSize &&
      remaining.length > 0 &&
      attempts < maxAttempts
    ) {
      attempts++;
      for (
        let i = remaining.length - 1;
        i >= 0 && sampled.length < targetSize;
        i--
      ) {
        if (Math.random() < remaining[i].probability) {
          sampled.push(remaining[i].blessing);
          remaining.splice(i, 1);
        }
      }
    }
    while (sampled.length < targetSize && remaining.length > 0) {
      sampled.push(remaining.shift().blessing);
    }
    for (let i = sampled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [sampled[i], sampled[j]] = [sampled[j], sampled[i]];
    }
    return sampled;
  }
  function fetchBlessings() {
    if (_blessingFetchInProgress) return;
    const now = Date.now();
    if (now - _lastBlessingFetchTime < BLESSING_FETCH_COOLDOWN_MS) return;
    _blessingFetchInProgress = true;
    _lastBlessingFetchTime = now;
    const shuffled = [...DEMO_BLESSINGS].sort(() => Math.random() - 0.5);
    blessingQueue = shuffled;
    _blessingFetchInProgress = false;
  }
  function fetchHeartCount() {
    heartCountVal = 87;
    const badge = $("#heart-count-badge");
    if (badge) badge.textContent = heartCountVal;
  }
  function incrementHeartCount() {
    heartCountVal++;
    const badge = $("#heart-count-badge");
    if (badge) badge.textContent = heartCountVal > 99 ? "99+" : heartCountVal;
  }
  function shootHearts(count = 10) {
    const heartBtn = $("#btn-shoot-hearts");
    const origin = heartBtn?.getBoundingClientRect() ?? {
      left: window.innerWidth / 2,
      top: window.innerHeight - 80,
    };
    const cx = (origin.left + (origin.right || origin.left + 80)) / 2;
    const cy = (origin.top + (origin.bottom || origin.top + 36)) / 2;
    const EMOJIS = ["♥", "❤", "💕", "💗", "💓", "💞", "💖"];
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        const el = document.createElement("span");
        el.className = "heart-burst";
        el.textContent = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
        const angle = Math.random() * 340 - 170;
        const dist = 80 + Math.random() * 140;
        const tx = Math.cos((angle * Math.PI) / 180) * dist;
        const ty = Math.sin((angle * Math.PI) / 180) * dist - 40;
        el.style.cssText = `          left: ${cx}px;          top: ${cy}px;          --tx: ${tx}px;          --ty: ${ty}px;          font-size: ${14 + Math.random() * 14}px;          color: ${["#e63946", "#ff6b9d", "#ff4757", "#ff9fb3"][Math.floor(Math.random() * 4)]};        `;
        document.body.appendChild(el);
        el.addEventListener("animationend", () => el.remove(), { once: true });
      }, i * 60);
    }
  }
  window.shareWebsite = function () {
    if (navigator.share) {
      navigator
        .share({
          title: "Thiệp Cưới - Minh Tuấn & Hoàng Anh",
          text: "Mời bạn đến dự đám cưới của chúng tôi ngày 20/12/2026 🎉",
          url: window.location.href,
        })
        .catch(() => { });
    } else {
      copyLink();
    }
  };
  window.copyLink = function () {
    copyToClipboard(window.location.href).then((success) => {
      if (success) {
        showToast("📋 Đã sao chép đường dẫn!");
      } else {
        showToast("📋 " + window.location.href);
      }
    });
  };
  function initAutoScroll() {
    const SCROLL_SPEED = 0.6;
    const IDLE_DELAY = 3000;
    let autoScrollActive = false;
    let userInteracted = false;
    let rafId = null;
    let idleTimer = null;
    let lastScrollY = 0;
    function startAutoScroll() {
      if (userInteracted || autoScrollActive) return;
      autoScrollActive = true;
      function scrollFrame() {
        if (userInteracted) {
          autoScrollActive = false;
          return;
        }
        if (document.body.classList.contains("is-locked")) {
          rafId = requestAnimationFrame(scrollFrame);
          return;
        }
        const maxY = document.documentElement.scrollHeight - window.innerHeight;
        if (window.scrollY >= maxY) {
          autoScrollActive = false;
          return;
        }
        window.scrollBy(0, SCROLL_SPEED);
        rafId = requestAnimationFrame(scrollFrame);
      }
      rafId = requestAnimationFrame(scrollFrame);
    }
    function stopAutoScrollForever() {
      if (userInteracted) return;
      userInteracted = true;
      autoScrollActive = false;
      if (rafId) cancelAnimationFrame(rafId);
      if (idleTimer) clearTimeout(idleTimer);
      document.removeEventListener("touchstart", stopAutoScrollForever, {
        capture: true,
      });
      document.removeEventListener("touchmove", stopAutoScrollForever, {
        capture: true,
      });
      document.removeEventListener("click", stopAutoScrollForever, {
        capture: true,
      });
      document.removeEventListener("keydown", stopAutoScrollForever, {
        capture: true,
      });
      document.removeEventListener("wheel", stopAutoScrollForever, {
        capture: true,
      });
      document.removeEventListener("scroll", onScroll);
    }
    function onScroll() {
      if (Math.abs(window.scrollY - lastScrollY) > SCROLL_SPEED * 3) {
        stopAutoScrollForever();
      }
      lastScrollY = window.scrollY;
    }
    document.addEventListener("touchstart", stopAutoScrollForever, {
      capture: true,
      passive: true,
    });
    document.addEventListener("touchmove", stopAutoScrollForever, {
      capture: true,
      passive: true,
    });
    document.addEventListener("click", stopAutoScrollForever, {
      capture: true,
    });
    document.addEventListener("keydown", stopAutoScrollForever, {
      capture: true,
    });
    document.addEventListener("wheel", stopAutoScrollForever, {
      capture: true,
      passive: true,
    });
    document.addEventListener("scroll", onScroll, { passive: true });
    idleTimer = setTimeout(startAutoScroll, IDLE_DELAY);
  }
  function initSmoothScroll() {
    $$('a[href^="#"]').forEach((a) => {
      a.addEventListener("click", (e) => {
        const target = $(a.getAttribute("href"));
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: "smooth" });
        }
      });
    });
  }
  function initEnvelopeCover() {
    const cover = $("#envelope-cover");
    const btnOpen = $("#btn-open-envelope");
    const guestNameEl = $("#envelope-guest-name");
    if (!cover || !btnOpen) {
      document.body.classList.remove("is-locked");
      return;
    }
    const personalization = W.getInvitationPersonalization();
    const inviteTextEl = $(".envelope-invite-text");

    if (guestNameEl && personalization.guestName) {
      let displayName = personalization.guestName;
      if (personalization.pronounForTitle) {
        displayName = personalization.pronounForTitle + " " + displayName;
      }
      if (personalization.invitationTitle && personalization.invitationTitle.endsWith("!")) {
        displayName += "!";
      }
      guestNameEl.textContent = displayName;

      if (inviteTextEl) {
        inviteTextEl.style.display = "";
        if (personalization.phrase) {
          inviteTextEl.textContent = personalization.phrase;
        } else if (personalization.invitationTitle) {
          let titleStr = personalization.invitationTitle;
          let suffix = displayName.replace("!", "");
          let idx = titleStr.toLowerCase().lastIndexOf(suffix.toLowerCase());
          if (idx > 0) {
              inviteTextEl.textContent = titleStr.substring(0, idx).trim();
          }
        }
      }
    } else if (guestNameEl && personalization.invitationTitle) {
      guestNameEl.textContent = personalization.invitationTitle;
      if (inviteTextEl) inviteTextEl.style.display = "none";
    }
    const hostPronounEl = $("#envelope-host-pronoun");
    if (
      hostPronounEl &&
      personalization.pronouns &&
      personalization.pronouns[3]
    ) {
      hostPronounEl.textContent = personalization.pronouns[3].toLowerCase();
    }
    btnOpen.addEventListener("click", () => {
      cover.classList.add("is-hidden");
      document.body.classList.remove("is-locked");
      document.documentElement.style.overflow = "";
      setTimeout(() => {
        cover.remove();
      }, 1000);
      const audio = $("#bg-audio");
      const musicBtn = $("#music-btn");
      if (audio && audio.paused) {
        audio
          .play()
          .then(() => {
            if (musicBtn) {
              musicBtn.classList.add("playing");
              musicBtn.setAttribute("title", "Dừng nhạc");
            }
          })
          .catch(() => { });
      }
      setTimeout(() => {
        W.shootHearts(20);
      }, 300);
    });
  }
  W.shootHearts = shootHearts;
  W.shareWebsite = window.shareWebsite;
  W.copyLink = window.copyLink;
  W.register("musicPlayer", initMusicPlayer, 40);
  W.register("heartsRain", initHeartsRain, 50);
  W.register("blessings", initBlessings, 80);
  W.register("smoothScroll", initSmoothScroll, 120);
  W.register("autoScroll", initAutoScroll, 130);
  W.register("envelopeCover", initEnvelopeCover, 140);
})();
