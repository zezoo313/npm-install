// تطبيق لعبة التخمين - العميل التفاعلي (Client-Side Logic)
// يدعم التزامن اللحظي، نظام النقاط (3 نقاط للفوز)، 3 محاولات تخمين، المساعدة المشروطة، وتثبيت PWA

// تسجيل Service Worker لدعم تثبيت اللعبة على الهواتف
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(err => {
      console.log('[PWA] ServiceWorker registration failed:', err);
    });
  });
}

// متغير حفظ حدث التثبيت المباشر على أندرويد/كروم
let deferredInstallPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  const installBtn = document.getElementById('btnInstallApp');
  if (installBtn) installBtn.style.display = 'inline-flex';
  const nativeSec = document.getElementById('nativeInstallSection');
  if (nativeSec) nativeSec.style.display = 'block';
});

// --- 1. محرك المؤثرات الصوتية (Web Audio API) ---
class SoundEngine {
  constructor() {
    this.ctx = null;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playTone(freq, type, duration, gainVal = 0.1) {
    try {
      this.init();
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  }

  playClick() {
    this.playTone(600, 'sine', 0.08, 0.05);
  }

  playJoin() {
    this.init();
    setTimeout(() => this.playTone(440, 'triangle', 0.12, 0.1), 0);
    setTimeout(() => this.playTone(660, 'triangle', 0.18, 0.12), 120);
    setTimeout(() => this.playTone(880, 'sine', 0.25, 0.15), 240);
  }

  playMessage() {
    this.init();
    this.playTone(520, 'sine', 0.1, 0.08);
    setTimeout(() => this.playTone(780, 'sine', 0.12, 0.08), 80);
  }

  playYes() {
    this.init();
    this.playTone(523.25, 'triangle', 0.15, 0.15); // C5
    setTimeout(() => this.playTone(659.25, 'triangle', 0.15, 0.15), 100); // E5
    setTimeout(() => this.playTone(783.99, 'sine', 0.3, 0.18), 200); // G5
  }

  playNo() {
    this.init();
    this.playTone(320, 'sawtooth', 0.15, 0.12);
    setTimeout(() => this.playTone(240, 'sawtooth', 0.25, 0.15), 120);
  }

  playUnlockAlert() {
    this.init();
    this.playTone(400, 'square', 0.1, 0.1);
    setTimeout(() => this.playTone(600, 'square', 0.1, 0.1), 100);
    setTimeout(() => this.playTone(800, 'square', 0.2, 0.12), 200);
  }

  playVictory() {
    this.init();
    const notes = [523, 659, 783, 1046];
    notes.forEach((freq, idx) => {
      setTimeout(() => this.playTone(freq, 'triangle', 0.25, 0.18), idx * 140);
    });
    setTimeout(() => {
      this.playTone(1046, 'sine', 0.6, 0.25);
    }, notes.length * 140);
  }

  playChampionFanfare() {
    this.init();
    const notes = [523, 659, 783, 1046, 1318];
    notes.forEach((freq, idx) => {
      setTimeout(() => this.playTone(freq, 'square', 0.3, 0.2), idx * 160);
    });
    setTimeout(() => {
      this.playTone(1046, 'triangle', 0.8, 0.3);
    }, notes.length * 160);
  }
}

const sounds = new SoundEngine();

// --- 2. محرك الاحتفال والألعاب النارية (Confetti Engine) ---
class ConfettiEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = [];
    this.animating = false;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  start(count = 120) {
    this.particles = [];
    const colors = ['#f43f5e', '#8b5cf6', '#ec4899', '#3b82f6', '#10b981', '#f59e0b', '#ffffff'];
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: this.canvas.width / 2 + (Math.random() - 0.5) * 80,
        y: this.canvas.height * 0.45,
        vx: (Math.random() - 0.5) * 16,
        vy: -Math.random() * 18 - 8,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 8 + 6,
        rotation: Math.random() * 360,
        rSpeed: (Math.random() - 0.5) * 12,
        gravity: 0.35,
        friction: 0.98,
        alpha: 1
      });
    }

    if (!this.animating) {
      this.animating = true;
      this.animate();
    }
  }

  animate() {
    if (!this.animating) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    let activeCount = 0;
    this.particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.vx *= p.friction;
      p.rotation += p.rSpeed;
      p.alpha -= 0.005;

      if (p.alpha > 0 && p.y < this.canvas.height + 50) {
        activeCount++;
        this.ctx.save();
        this.ctx.translate(p.x, p.y);
        this.ctx.rotate((p.rotation * Math.PI) / 180);
        this.ctx.globalAlpha = Math.max(0, p.alpha);
        this.ctx.fillStyle = p.color;
        this.ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 1.5);
        this.ctx.restore();
      }
    });

    if (activeCount > 0) {
      requestAnimationFrame(() => this.animate());
    } else {
      this.animating = false;
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }
}

// --- 3. حالة العميل والتحكم بالواجهة ---
const state = {
  socket: null,
  playerName: '',
  selectedAvatar: '🦁',
  roomCode: '',
  myRole: 'spectator', // 'master' | 'guesser'
  roomState: null,
  chosenAnimal: null,
  uploadedImageDataUrl: null,
  activePendingQuestionId: null,
  guessesLeft: 3,
  hintUnlocked: false
};

// تهيئة عناصر DOM
let confetti = null;

window.addEventListener('DOMContentLoaded', () => {
  confetti = new ConfettiEngine(document.getElementById('confettiCanvas'));
  initSocket();
  initPasscodeGate();
  initLobbyEvents();
  initChoosingEvents();
  initPlayingEvents();
  initModals();
  checkUrlForRoom();
});

// تهيئة اتصال Socket.IO
function initSocket() {
  state.socket = io({
    reconnectionAttempts: 5,
    timeout: 10000
  });

  state.socket.on('connect', () => {
    console.log('[Socket] متصل بالخادم بنجاح');
  });

  state.socket.on('error_message', (msg) => {
    showToast(msg, 'warning');
  });

  state.socket.on('room_created', ({ roomCode, state: rState }) => {
    sounds.playJoin();
    state.roomCode = roomCode;
    state.roomState = rState;
    state.myRole = rState.myRole;
    state.guessesLeft = rState.guessesLeft || 3;
    state.hintUnlocked = rState.hintUnlocked || false;
    updateHeaderRoom(roomCode);
    updateScoreboard(rState.scores);
    showWaitingView(roomCode);
  });

  state.socket.on('room_updated', (rState) => {
    state.roomState = rState;
    state.myRole = rState.myRole;
    state.guessesLeft = rState.guessesLeft || 3;
    state.hintUnlocked = rState.hintUnlocked || false;
    updateHeaderRoom(rState.roomCode);
    updateScoreboard(rState.scores);

    sounds.playJoin();
    showToast('انضم المنافس إلى الغرفة!', 'success');

    // الانتقال لمرحلة الاختيار
    if (rState.status === 'choosing') {
      renderChoosingScreen();
    } else if (rState.status === 'playing') {
      renderPlayingScreen();
    }
  });

  state.socket.on('secret_locked', (rState) => {
    state.roomState = rState;
    state.guessesLeft = rState.guessesLeft || 3;
    state.hintUnlocked = rState.hintUnlocked || false;
    updateScoreboard(rState.scores);
    sounds.playClick();
    showToast('تم قفل الصورة بنجاح! بدأ التحدي 🔒', 'info');
    renderPlayingScreen();
  });

  // طلب المساعدة (كشف الأسئلة المقترحة)
  state.socket.on('hint_requested', ({ guesserName, guesserAvatar }) => {
    sounds.playUnlockAlert();
    document.getElementById('hintGuesserAvatar').textContent = guesserAvatar || '🔍';
    document.getElementById('hintGuesserName').textContent = guesserName || 'المنافس';
    openModal('masterHintDecisionModal');
  });

  state.socket.on('hint_response', ({ approved, hintUnlocked, message }) => {
    state.hintUnlocked = hintUnlocked;
    if (approved) {
      sounds.playYes();
      showToast(message, 'success');
    } else {
      sounds.playNo();
      showToast(message, 'warning');
    }
    renderHintState(hintUnlocked);
  });

  state.socket.on('question_added', ({ question, totalQuestions }) => {
    sounds.playMessage();
    appendQuestionToChat(question);
    updateQuestionCounter(totalQuestions);

    // إذا كنت الماستر والسؤال ليس له إجابة، إظهار شريط الإجابة السريع
    if (state.myRole === 'master' && !question.answer) {
      showMasterAnswerBar(question);
    }
  });

  state.socket.on('question_answered', ({ questionId, answer, allQuestions }) => {
    if (answer === 'yes') {
      sounds.playYes();
    } else {
      sounds.playNo();
    }
    updateQuestionAnswerInChat(questionId, answer);

    if (state.myRole === 'master') {
      hideMasterAnswerBar();
    }
  });

  state.socket.on('unlock_requested', ({ unlockRequest, guessesLeft }) => {
    sounds.playUnlockAlert();
    if (state.myRole === 'master') {
      // إظهار نافذة الموافقة للماستر
      showMasterUnlockModal(unlockRequest);
    } else {
      showToast('تم إرسال طلب فك القفل إلى الماستر... بانتظار قراره ⏳', 'info');
    }
  });

  state.socket.on('unlock_rejected', ({ guessesLeft, message }) => {
    sounds.playNo();
    state.guessesLeft = guessesLeft;
    renderGuessesCounter(guessesLeft);
    showToast(message, 'warning');
    closeAllModals();
  });

  // فوز المخمن بالجولة بتخمين صحيح
  state.socket.on('game_revealed', ({ secret, winner, totalQuestions, scores, matchWinner, guessesLeft }) => {
    sounds.playVictory();
    confetti.start(160);
    state.guessesLeft = guessesLeft;
    updateScoreboard(scores);
    showRevealModal({
      secret,
      winner,
      totalQuestions,
      scores,
      isGuesserWin: true,
      attemptsUsed: 4 - guessesLeft
    });

    if (matchWinner) {
      setTimeout(() => {
        showMatchChampionModal(matchWinner, scores);
      }, 2000);
    }
  });

  // خسارة المخمن للجولة لاستنفاد 3 محاولات خاطئة (فوز الماستر)
  state.socket.on('round_lost_by_guesses', ({ secret, winner, totalQuestions, scores, matchWinner, message }) => {
    sounds.playNo();
    state.guessesLeft = 0;
    renderGuessesCounter(0);
    updateScoreboard(scores);
    showToast(message, 'warning');

    showRevealModal({
      secret,
      winner,
      totalQuestions,
      scores,
      isGuesserWin: false,
      attemptsUsed: 3
    });

    if (matchWinner) {
      setTimeout(() => {
        showMatchChampionModal(matchWinner, scores);
      }, 2000);
    }
  });

  state.socket.on('new_round_started', (rState) => {
    state.roomState = rState;
    state.myRole = rState.myRole;
    state.guessesLeft = rState.guessesLeft || 3;
    state.hintUnlocked = rState.hintUnlocked || false;
    updateScoreboard(rState.scores);
    closeAllModals();
    showToast('بدأت جولة جديدة وتم تبديل الأدوار! 🔄', 'success');
    renderChoosingScreen();
  });

  state.socket.on('match_reset', (rState) => {
    state.roomState = rState;
    state.myRole = rState.myRole;
    state.guessesLeft = 3;
    state.hintUnlocked = false;
    updateScoreboard(rState.scores);
    closeAllModals();
    showToast('تمت إعادة ضبط المباراة! النتيجة الآن 0 - 0 🎯', 'info');
    renderChoosingScreen();
  });

  state.socket.on('player_left', ({ message }) => {
    sounds.playNo();
    showToast(message, 'warning');
    setTimeout(() => {
      switchScreen('lobbyScreen');
    }, 2000);
  });
}

// --- 4. فحص الرابط إن كان يحتوي على رمز غرفة مباشر (?room=XXXX) ---
function checkUrlForRoom() {
  const params = new URLSearchParams(window.location.search);
  const roomParam = params.get('room');
  if (roomParam) {
    document.getElementById('joinRoomInput').value = roomParam.trim().toUpperCase();
    selectLobbyTab('join');
  }
}

// --- 4.5 بوابة الدخول بالرمز السري المخصص (8975522) ---
function initPasscodeGate() {
  const savedPasscode = localStorage.getItem('ziad_app_passcode');
  if (savedPasscode) {
    verifyPasscodeApi(savedPasscode, true);
  }

  const btnVerify = document.getElementById('btnVerifyPasscode');
  const inputPasscode = document.getElementById('inputAppPasscode');
  const btnToggleEye = document.getElementById('btnTogglePasscodeEye');

  if (btnToggleEye && inputPasscode) {
    btnToggleEye.addEventListener('click', () => {
      if (inputPasscode.type === 'password') {
        inputPasscode.type = 'text';
        btnToggleEye.textContent = '🔒';
      } else {
        inputPasscode.type = 'password';
        btnToggleEye.textContent = '👁️';
      }
    });
  }

  if (inputPasscode) {
    inputPasscode.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        btnVerify.click();
      }
    });
  }

  if (btnVerify) {
    btnVerify.addEventListener('click', () => {
      sounds.init();
      const code = (inputPasscode.value || '').trim();
      if (!code) {
        showPasscodeError('يرجى إدخال الرمز السري للمتابعة');
        return;
      }
      verifyPasscodeApi(code, false);
    });
  }
}

async function verifyPasscodeApi(code, isSilent) {
  try {
    const res = await fetch('/api/verify-passcode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passcode: code })
    });
    const data = await res.json();
    if (data.success) {
      localStorage.setItem('ziad_app_passcode', code);
      const errorMsg = document.getElementById('passcodeErrorMsg');
      if (errorMsg) errorMsg.style.display = 'none';
      switchScreen('lobbyScreen');
      if (!isSilent) {
        sounds.playYes();
        showToast('تم التحقق من الرمز السري بنجاح! مرحباً بك في اللعبة 🎮', 'success');
      }
    } else {
      if (!isSilent) {
        sounds.playNo();
        showPasscodeError('❌ الرمز السري غير صحيح! يرجى التأكد والمحاولة مجدداً.');
      } else {
        localStorage.removeItem('ziad_app_passcode');
      }
    }
  } catch (err) {
    console.error('Verify error:', err);
    if (!isSilent) {
      showPasscodeError('تعذر الاتصال بالخادم، يرجى المحاولة لاحقاً');
    }
  }
}

function showPasscodeError(msg) {
  const errorMsg = document.getElementById('passcodeErrorMsg');
  if (errorMsg) {
    errorMsg.textContent = msg;
    errorMsg.style.display = 'block';
  }
}

// --- 5. أحداث شاشة البداية (Lobby) ---
function initLobbyEvents() {
  const avatarBtns = document.querySelectorAll('.avatar-btn');
  avatarBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      avatarBtns.forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      state.selectedAvatar = btn.getAttribute('data-avatar');
      sounds.playClick();
    });
  });

  document.getElementById('tabCreateRoom').addEventListener('click', () => selectLobbyTab('create'));
  document.getElementById('tabJoinRoom').addEventListener('click', () => selectLobbyTab('join'));

  document.getElementById('btnCreateRoom').addEventListener('click', () => {
    sounds.init();
    const nameInput = document.getElementById('playerNameInput');
    state.playerName = (nameInput.value || '').trim() || 'الماستر';

    state.socket.emit('create_room', {
      playerName: state.playerName,
      avatar: state.selectedAvatar
    });
  });

  document.getElementById('btnJoinRoom').addEventListener('click', () => {
    sounds.init();
    const nameInput = document.getElementById('playerNameInput');
    const roomInput = document.getElementById('joinRoomInput');
    const code = (roomInput.value || '').trim().toUpperCase();

    if (!code) {
      return showToast('يرجى إدخال رمز الغرفة المكون من 4 خانات', 'warning');
    }

    state.playerName = (nameInput.value || '').trim() || 'المنافس';
    state.roomCode = code;

    state.socket.emit('join_room', {
      roomCode: code,
      playerName: state.playerName,
      avatar: state.selectedAvatar
    });
  });

  document.getElementById('btnCopyCode').addEventListener('click', () => {
    copyTextToClipboard(state.roomCode);
    showToast('تم نسخ رمز الغرفة بنجاح! 📋', 'success');
  });

  document.getElementById('btnShareLink').addEventListener('click', () => {
    const shareUrl = `${window.location.origin}/?room=${state.roomCode}`;
    if (navigator.share) {
      navigator.share({
        title: 'انضم إلي في لعبة التخمين!',
        text: `تحداني في لعبة التخمين! رمز الدخول: ${state.roomCode}`,
        url: shareUrl
      }).catch(() => {});
    } else {
      copyTextToClipboard(shareUrl);
      showToast('تم نسخ رابط التحدي المباشر! 🔗', 'success');
    }
  });

  // زر فتح نافذة تثبيت التطبيق
  const btnInstallApp = document.getElementById('btnInstallApp');
  if (btnInstallApp) {
    btnInstallApp.addEventListener('click', () => {
      sounds.playClick();
      openModal('installAppModal');
    });
  }

  // زر التثبيت المباشر على أندرويد
  const btnTriggerNative = document.getElementById('btnTriggerNativeInstall');
  if (btnTriggerNative) {
    btnTriggerNative.addEventListener('click', async () => {
      if (deferredInstallPrompt) {
        deferredInstallPrompt.prompt();
        const { outcome } = await deferredInstallPrompt.userChoice;
        console.log('[PWA] User choice outcome:', outcome);
        deferredInstallPrompt = null;
        closeModal('installAppModal');
      }
    });
  }
}

function selectLobbyTab(tab) {
  const tabCreate = document.getElementById('tabCreateRoom');
  const tabJoin = document.getElementById('tabJoinRoom');
  const createBox = document.getElementById('createRoomBox');
  const joinBox = document.getElementById('joinRoomBox');

  if (tab === 'create') {
    tabCreate.classList.add('active');
    tabJoin.classList.remove('active');
    createBox.style.display = 'block';
    joinBox.style.display = 'none';
  } else {
    tabJoin.classList.add('active');
    tabCreate.classList.remove('active');
    joinBox.style.display = 'block';
    createBox.style.display = 'none';
  }
}

function showWaitingView(code) {
  document.getElementById('displayRoomCode').textContent = code;
  document.getElementById('createRoomBox').style.display = 'none';
  document.getElementById('joinRoomBox').style.display = 'none';
  document.getElementById('lobbyTabsNav').style.display = 'none';
  document.getElementById('waitingPlayerBox').style.display = 'block';
}

// --- 6. أحداث شاشة الاختيار (Choosing Screen) ---
function initChoosingEvents() {
  document.getElementById('tabPresetAnimals').addEventListener('click', () => {
    document.getElementById('tabPresetAnimals').classList.add('active');
    document.getElementById('tabCustomUpload').classList.remove('active');
    document.getElementById('presetAnimalsView').style.display = 'block';
    document.getElementById('customUploadView').style.display = 'none';
  });

  document.getElementById('tabCustomUpload').addEventListener('click', () => {
    document.getElementById('tabCustomUpload').classList.add('active');
    document.getElementById('tabPresetAnimals').classList.remove('active');
    document.getElementById('presetAnimalsView').style.display = 'none';
    document.getElementById('customUploadView').style.display = 'block';
  });

  const fileInput = document.getElementById('customImageInput');
  const dropBox = document.getElementById('uploadDropBox');

  dropBox.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      return showToast('يرجى اختيار ملف صورة صالح', 'warning');
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      state.uploadedImageDataUrl = event.target.result;
      const previewWrap = document.getElementById('uploadPreviewWrap');
      const previewImg = document.getElementById('uploadPreviewImg');
      previewImg.src = event.target.result;
      previewWrap.style.display = 'block';
      showToast('تم تحميل الصورة بنجاح! اكتب اسم الشيء أدناه 📷', 'success');
    };
    reader.readAsDataURL(file);
  });

  document.getElementById('btnConfirmSecret').addEventListener('click', () => {
    sounds.init();
    const isCustom = document.getElementById('tabCustomUpload').classList.contains('active');

    let secretPayload = null;

    if (isCustom) {
      const customName = (document.getElementById('customNameInput').value || '').trim();
      if (!customName) {
        return showToast('يرجى كتابة اسم الشيء المخفي بدقة', 'warning');
      }
      if (!state.uploadedImageDataUrl) {
        return showToast('يرجى اختيار صورة للشيء المخفي', 'warning');
      }

      secretPayload = {
        name: customName,
        image: state.uploadedImageDataUrl,
        category: 'صورة مخصصة'
      };
    } else {
      if (!state.chosenAnimal) {
        return showToast('يرجى النقر على أحد الحيوانات لاختياره', 'warning');
      }
      secretPayload = {
        name: state.chosenAnimal.name,
        image: state.chosenAnimal.image,
        category: state.chosenAnimal.category
      };
    }

    state.socket.emit('set_secret', { secret: secretPayload });
  });
}

function renderChoosingScreen() {
  switchScreen('choosingScreen');

  const isMaster = state.myRole === 'master';

  if (isMaster) {
    document.getElementById('masterChoosingView').style.display = 'block';
    document.getElementById('guesserWaitingChoiceView').style.display = 'none';

    const grid = document.getElementById('animalsGrid');
    grid.innerHTML = '';

    ANIMALS_LIBRARY.forEach(animal => {
      const card = document.createElement('div');
      card.className = 'animal-card';
      card.innerHTML = `
        <div class="animal-card-img-wrap">
          <img src="${animal.image}" alt="${animal.name}" loading="lazy" />
          <div class="selected-badge-check">✓</div>
        </div>
        <div class="animal-card-info">
          <div class="animal-card-title">
            <span>${animal.name}</span>
            <span>${animal.emoji}</span>
          </div>
          <div class="animal-card-cat">${animal.category}</div>
        </div>
      `;

      card.addEventListener('click', () => {
        sounds.playClick();
        document.querySelectorAll('.animal-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        state.chosenAnimal = animal;
      });

      grid.appendChild(card);
    });

    if (ANIMALS_LIBRARY.length > 0) {
      grid.children[0].click();
    }
  } else {
    document.getElementById('masterChoosingView').style.display = 'none';
    document.getElementById('guesserWaitingChoiceView').style.display = 'block';
  }
}

// --- 7. أحداث شاشة اللعب النشطة (Playing Screen) ---
function initPlayingEvents() {
  const chipsContainer = document.getElementById('quickQuestionsContainer');
  chipsContainer.innerHTML = '';

  QUICK_QUESTIONS.forEach(q => {
    const chip = document.createElement('button');
    chip.className = 'chip-btn';
    chip.textContent = q;
    chip.addEventListener('click', () => {
      sounds.playClick();
      sendQuestion(q);
    });
    chipsContainer.appendChild(chip);
  });

  const sendBtn = document.getElementById('btnSendQuestion');
  const questionInput = document.getElementById('questionInput');

  sendBtn.addEventListener('click', () => {
    const text = questionInput.value.trim();
    if (text) {
      sendQuestion(text);
      questionInput.value = '';
    }
  });

  questionInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      sendBtn.click();
    }
  });

  // طلب المساعدة من قبل المخمن
  document.getElementById('btnRequestHint').addEventListener('click', () => {
    sounds.playClick();
    state.socket.emit('request_hint');
    showToast('تم إرسال طلب المساعدة إلى الماستر... بانتظار قراره ⏳', 'info');
  });

  // قرارات الماستر في منح المساعدة
  document.getElementById('btnMasterAcceptHint').addEventListener('click', () => {
    sounds.init();
    state.socket.emit('respond_hint', { approved: true });
    closeModal('masterHintDecisionModal');
  });

  document.getElementById('btnMasterRejectHint').addEventListener('click', () => {
    sounds.init();
    state.socket.emit('respond_hint', { approved: false });
    closeModal('masterHintDecisionModal');
  });

  // إجابات الماستر (نعم / لا)
  document.getElementById('btnAnswerYes').addEventListener('click', () => {
    if (state.activePendingQuestionId) {
      state.socket.emit('answer_question', {
        questionId: state.activePendingQuestionId,
        answer: 'yes'
      });
    }
  });

  document.getElementById('btnAnswerNo').addEventListener('click', () => {
    if (state.activePendingQuestionId) {
      state.socket.emit('answer_question', {
        questionId: state.activePendingQuestionId,
        answer: 'no'
      });
    }
  });

  // زر المخمن: خمن واطلب فتح الصورة
  document.getElementById('btnRequestUnlock').addEventListener('click', () => {
    sounds.playClick();
    if (state.guessesLeft <= 0) {
      return showToast('لقد استنفدت جميع محاولات التخمين لهذه الجولة!', 'warning');
    }
    document.getElementById('guessInputModal').value = '';
    document.getElementById('modalAttemptsLeft').textContent = state.guessesLeft;
    openModal('guesserGuessModal');
  });

  document.getElementById('btnSubmitGuess').addEventListener('click', () => {
    sounds.init();
    const guess = (document.getElementById('guessInputModal').value || '').trim();
    if (!guess) {
      return showToast('يرجى كتابة اسم التخمين أولاً', 'warning');
    }

    state.socket.emit('request_unlock', { guessName: guess });
    closeModal('guesserGuessModal');
  });
}

function sendQuestion(text) {
  if (state.myRole !== 'guesser') {
    return showToast('المخمن فقط هو من يطرح الأسئلة!', 'warning');
  }

  state.socket.emit('ask_question', { questionText: text });
}

function renderPlayingScreen() {
  switchScreen('playingScreen');

  const isMaster = state.myRole === 'master';
  const stageCard = document.getElementById('secretStageCard');
  const stageImg = document.getElementById('secretStageImg');
  const secretTitle = document.getElementById('secretTitleBadge');
  const secretText = document.getElementById('secretNameText');

  const myPlayerRoleBadge = document.getElementById('myRoleBadge');
  myPlayerRoleBadge.className = `role-pill ${isMaster ? 'role-master' : 'role-guesser'}`;
  myPlayerRoleBadge.textContent = isMaster ? 'أنت الماستر 👑' : 'أنت المخمّن 🔍';

  document.getElementById('guesserControlZone').style.display = isMaster ? 'none' : 'block';
  document.getElementById('quickQuestionsStrip').style.display = isMaster ? 'none' : 'block';
  document.getElementById('masterAnswerBar').style.display = 'none';

  renderGuessesCounter(state.guessesLeft);
  renderHintState(state.hintUnlocked);

  if (isMaster) {
    stageCard.classList.remove('locked');
    stageCard.classList.add('unlocked');
    if (state.roomState && state.roomState.secret) {
      stageImg.src = state.roomState.secret.image || '';
      secretText.textContent = state.roomState.secret.name || '';
      secretTitle.style.display = 'flex';
    }
  } else {
    stageCard.classList.add('locked');
    stageCard.classList.remove('unlocked');
    secretTitle.style.display = 'none';
    if (state.roomState && state.roomState.secret && state.roomState.secret.image) {
      stageImg.src = state.roomState.secret.image;
    } else {
      stageImg.src = 'https://images.unsplash.com/photo-1546182990-dffeafbe841d?w=600&auto=format&fit=crop&q=80';
    }
  }

  const chatBox = document.getElementById('chatTimeline');
  chatBox.innerHTML = '';
  if (state.roomState && state.roomState.questions && state.roomState.questions.length > 0) {
    state.roomState.questions.forEach(q => appendQuestionToChat(q));
    updateQuestionCounter(state.roomState.questions.length);
  } else {
    chatBox.innerHTML = `
      <div class="chat-empty-state" id="chatEmptyState">
        <div class="empty-icon">💬</div>
        <p>لا توجد أسئلة بعد.<br>${isMaster ? 'في انتظار طرح المخمن لأول سؤال...' : 'اطرح سؤالك الأول لمعرفة السر!'}</p>
      </div>
    `;
    updateQuestionCounter(0);
  }
}

function renderGuessesCounter(count) {
  const heartsElem = document.getElementById('guessesHearts');
  const numElem = document.getElementById('guessesNum');
  const btnNum = document.getElementById('btnAttemptsLeftNum');
  const modalNum = document.getElementById('modalAttemptsLeft');

  let heartsStr = '❤️❤️❤️';
  if (count === 2) heartsStr = '❤️❤️🖤';
  else if (count === 1) heartsStr = '❤️🖤🖤';
  else if (count <= 0) heartsStr = '🖤🖤🖤';

  if (heartsElem) heartsElem.textContent = heartsStr;
  if (numElem) numElem.textContent = `(${count}/3)`;
  if (btnNum) btnNum.textContent = count;
  if (modalNum) modalNum.textContent = count;
}

function renderHintState(unlocked) {
  const lockedBox = document.getElementById('hintRequestBox');
  const unlockedBox = document.getElementById('hintUnlockedBox');

  if (unlocked) {
    if (lockedBox) lockedBox.style.display = 'none';
    if (unlockedBox) unlockedBox.style.display = 'block';
  } else {
    if (lockedBox) lockedBox.style.display = 'block';
    if (unlockedBox) unlockedBox.style.display = 'none';
  }
}

function updateScoreboard(scores) {
  const sb = document.getElementById('matchScoreboard');
  if (!scores || scores.length < 2) {
    if (sb) sb.style.display = 'none';
    return;
  }

  sb.style.display = 'flex';
  const p1 = scores[0];
  const p2 = scores[1];

  document.getElementById('sp1Avatar').textContent = p1.avatar || '🦁';
  document.getElementById('sp1Name').textContent = p1.name || 'اللاعب 1';
  document.getElementById('sp1Points').textContent = p1.score || 0;

  document.getElementById('sp2Avatar').textContent = p2.avatar || '🦊';
  document.getElementById('sp2Name').textContent = p2.name || 'اللاعب 2';
  document.getElementById('sp2Points').textContent = p2.score || 0;
}

function appendQuestionToChat(q) {
  const emptyState = document.getElementById('chatEmptyState');
  if (emptyState) emptyState.remove();

  const chatBox = document.getElementById('chatTimeline');
  const bubble = document.createElement('div');
  bubble.className = 'question-bubble';
  bubble.id = `bubble_${q.id}`;

  let answerHtml = '';
  if (!q.answer) {
    answerHtml = `<span class="badge-waiting-answer">⏳ بانتظار إجابة الماستر</span>`;
  } else if (q.answer === 'yes') {
    answerHtml = `<span class="badge-answer-yes">✅ نـعـم</span>`;
  } else {
    answerHtml = `<span class="badge-answer-no">❌ لا</span>`;
  }

  bubble.innerHTML = `
    <div class="question-bubble-header">
      <span class="question-sender">${q.senderAvatar || '🔍'} ${q.senderName || 'المخمن'}</span>
      <span class="question-time">${formatTime(q.timestamp)}</span>
    </div>
    <div class="question-bubble-text">${escapeHtml(q.text)}</div>
    <div class="answer-badge-container">${answerHtml}</div>
  `;

  chatBox.appendChild(bubble);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function updateQuestionAnswerInChat(qId, answer) {
  const bubble = document.getElementById(`bubble_${qId}`);
  if (!bubble) return;

  const container = bubble.querySelector('.answer-badge-container');
  if (container) {
    if (answer === 'yes') {
      container.innerHTML = `<span class="badge-answer-yes">✅ نـعـم</span>`;
    } else {
      container.innerHTML = `<span class="badge-answer-no">❌ لا</span>`;
    }
  }
}

function showMasterAnswerBar(q) {
  state.activePendingQuestionId = q.id;
  const bar = document.getElementById('masterAnswerBar');
  const textElem = document.getElementById('pendingQuestionText');
  textElem.textContent = `"${q.text}"`;
  bar.style.display = 'block';
  bar.scrollIntoView({ behavior: 'smooth', block: 'end' });
}

function hideMasterAnswerBar() {
  state.activePendingQuestionId = null;
  document.getElementById('masterAnswerBar').style.display = 'none';
}

function updateQuestionCounter(count) {
  const counter = document.getElementById('questionsCountBadge');
  if (counter) counter.textContent = `الأسئلة: ${count}`;
}

// --- 8. النوافذ المنبثقة والموافقة على فك القفل (Modals) ---
function initModals() {
  document.getElementById('btnMasterAcceptUnlock').addEventListener('click', () => {
    sounds.init();
    state.socket.emit('respond_unlock', { accepted: true });
    closeModal('masterUnlockDecisionModal');
  });

  document.getElementById('btnMasterRejectUnlock').addEventListener('click', () => {
    sounds.init();
    state.socket.emit('respond_unlock', { accepted: false });
    closeModal('masterUnlockDecisionModal');
  });

  document.getElementById('btnNewRound').addEventListener('click', () => {
    sounds.init();
    state.socket.emit('switch_roles_rematch');
  });

  document.getElementById('btnRestartMatch').addEventListener('click', () => {
    sounds.init();
    state.socket.emit('reset_match');
  });

  document.querySelectorAll('.modal-overlay').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal && (modal.id === 'guesserGuessModal' || modal.id === 'installAppModal')) {
        closeModal(modal.id);
      }
    });
  });
}

function showMasterUnlockModal(req) {
  document.getElementById('unlockGuesserAvatar').textContent = req.guesserAvatar || '🔍';
  document.getElementById('unlockGuesserName').textContent = req.guesserName || 'المنافس';
  document.getElementById('unlockGuessWord').textContent = `"${req.guessName}"`;
  openModal('masterUnlockDecisionModal');
}

function showRevealModal({ secret, winner, totalQuestions, scores, isGuesserWin, attemptsUsed }) {
  closeAllModals();

  const titleElem = document.getElementById('revealModalTitle');
  const descElem = document.getElementById('revealModalDesc');
  const iconElem = document.getElementById('revealModalIcon');

  if (isGuesserWin) {
    iconElem.textContent = '🎉';
    titleElem.textContent = 'مبروووك! تم كشف السر';
    titleElem.style.color = '#34d399';
    descElem.innerHTML = `البطل الفائز بالجولة: <strong style="color: #fbbf24;">${winner}</strong> (+1 نقطة)`;
  } else {
    iconElem.textContent = '👑';
    titleElem.textContent = 'انتهت محاولات التخمين (3/3)';
    titleElem.style.color = '#f87171';
    descElem.innerHTML = `فاز الماستر بالجولة: <strong style="color: #fbbf24;">${winner}</strong> (+1 نقطة)`;
  }

  document.getElementById('revealWinnerName').textContent = winner || '';
  document.getElementById('revealSecretName').textContent = secret ? secret.name : '';
  document.getElementById('revealSecretImg').src = secret ? secret.image : '';
  document.getElementById('revealQuestionsTotal').textContent = totalQuestions || 0;
  document.getElementById('revealAttemptsUsed').textContent = `${attemptsUsed}/3`;

  // ملخص نقاط المباراة في المودال
  const pillsContainer = document.getElementById('roundScoresPills');
  if (pillsContainer && scores) {
    pillsContainer.innerHTML = '';
    scores.forEach(p => {
      const pill = document.createElement('div');
      pill.className = 'rss-player-pill';
      pill.innerHTML = `
        <span>${p.avatar || '👤'}</span>
        <span>${p.name}:</span>
        <span class="rss-score-badge">${p.score}</span>
      `;
      pillsContainer.appendChild(pill);
    });
  }

  openModal('gameRevealModal');
}

function showMatchChampionModal(winnerName, scores) {
  closeAllModals();
  sounds.playChampionFanfare();
  confetti.start(240);

  document.getElementById('championPlayerName').textContent = winnerName;

  const winnerData = scores ? scores.find(s => s.name === winnerName) : null;
  if (winnerData) {
    document.getElementById('championAvatar').textContent = winnerData.avatar || '👑';
  }

  openModal('matchChampionModal');
}

function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add('active');
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove('active');
}

function closeAllModals() {
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
}

// --- 9. دوال مساعدة وإشعارات ---
function switchScreen(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const target = document.getElementById(screenId);
  if (target) target.classList.add('active');
}

function updateHeaderRoom(code) {
  const badge = document.getElementById('headerRoomBadge');
  if (badge) {
    badge.innerHTML = `غرفة: <span class="code-highlight">${code}</span>`;
    badge.style.display = 'flex';
  }
}

function showToast(text, type = 'info') {
  const toast = document.getElementById('toastNotice');
  const icon = type === 'success' ? '✅' : type === 'warning' ? '⚠️' : 'ℹ️';
  toast.innerHTML = `<span>${icon}</span> <span>${text}</span>`;
  toast.classList.add('show');

  setTimeout(() => {
    toast.classList.remove('show');
  }, 3200);
}

function copyTextToClipboard(text) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
  } else {
    fallbackCopy(text);
  }
}

function fallbackCopy(text) {
  const input = document.createElement('input');
  input.value = text;
  document.body.appendChild(input);
  input.select();
  document.execCommand('copy');
  document.body.removeChild(input);
}

function formatTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, m => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[m]);
}
