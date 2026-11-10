const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const os = require('os');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  maxHttpBufferSize: 1e7 // 10MB to allow custom image upload
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));
// الرمز السري الرئيسي للوصول للتطبيق (المحدد من قبل زياد الربيعي)
const MASTER_PASSCODE = process.env.APP_PASSCODE || '8975522';

// مسار للتحقق من الرمز السري
app.post('/api/verify-passcode', (req, res) => {
  const { passcode } = req.body;
  if (!passcode) {
    return res.status(400).json({ success: false, message: 'يرجى إدخال الرمز السري' });
  }
  if (String(passcode).trim() === MASTER_PASSCODE) {
    return res.json({ success: true, message: 'تم التحقق بنجاح' });
  } else {
    return res.status(401).json({ success: false, message: 'الرمز السري غير صحيح!' });
  }
});

// مسار للحصول على معلومات الاتصال بالشبكة المحلية
app.get('/api/network-info', (req, res) => {
  res.json({
    localIp: getLocalIpAddress(),
    port: PORT
  });
});

// ذاكرة الغرف النشطة
const rooms = new Map();

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return rooms.has(code) ? generateRoomCode() : code;
}

function getFormattedScores(room) {
  return room.players.map(p => ({
    id: p.id,
    name: p.name,
    avatar: p.avatar,
    role: p.role,
    score: (room.scores && room.scores[p.id]) || 0
  }));
}

function getSanitizedGameState(room, socketId) {
  const player = room.players.find(p => p.id === socketId);
  const isMaster = player && player.role === 'master';
  const isRevealed = room.gameState.status === 'revealed';

  return {
    roomCode: room.code,
    players: room.players.map(p => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      role: p.role,
      isHost: p.isHost
    })),
    scores: getFormattedScores(room),
    status: room.gameState.status,
    roundNumber: room.gameState.roundNumber,
    questions: room.gameState.questions,
    unlockRequest: room.gameState.unlockRequest,
    winner: room.gameState.winner,
    guessesLeft: room.gameState.guessesLeft,
    hintUnlocked: room.gameState.hintUnlocked,
    matchWinner: room.gameState.matchWinner,
    // الصورة والاسم الحقيقيان يُكشفان للماستر دائماً، وللمخمن فقط عند فك القفل أو انتهاء الجولة
    secret: (isMaster || isRevealed) ? room.gameState.secret : (room.gameState.secret ? { isLocked: true } : null),
    myRole: player ? player.role : 'spectator'
  };
}

io.on('connection', (socket) => {
  console.log(`[Socket] اتصال جديد: ${socket.id}`);

  // إنشاء غرفة جديدة
  socket.on('create_room', ({ playerName, avatar }) => {
    const roomCode = generateRoomCode();
    const newRoom = {
      code: roomCode,
      createdAt: Date.now(),
      players: [
        {
          id: socket.id,
          name: playerName || 'الماستر',
          avatar: avatar || '🦁',
          role: 'master',
          isHost: true
        }
      ],
      scores: {
        [socket.id]: 0
      },
      gameState: {
        status: 'waiting', // waiting, choosing, playing, requested_unlock, revealed
        roundNumber: 1,
        secret: null,
        questions: [],
        unlockRequest: null,
        winner: null,
        guessesLeft: 3,
        hintUnlocked: false,
        matchWinner: null
      }
    };

    rooms.set(roomCode, newRoom);
    socket.join(roomCode);
    socket.roomCode = roomCode;

    console.log(`[Room] أنشأ ${playerName} الغرفة: ${roomCode}`);
    socket.emit('room_created', {
      roomCode,
      state: getSanitizedGameState(newRoom, socket.id)
    });
  });

  // الانضمام لغرفة بمفتاح الدخول
  socket.on('join_room', ({ roomCode, playerName, avatar }) => {
    const formattedCode = (roomCode || '').trim().toUpperCase();
    const room = rooms.get(formattedCode);

    if (!room) {
      return socket.emit('error_message', 'رمز الغرفة غير صحيح أو أن الغرفة غير موجودة');
    }

    if (room.players.length >= 2 && !room.players.some(p => p.id === socket.id)) {
      return socket.emit('error_message', 'الغرفة ممتلئة باللاعبين (الحد الأقصى لاعبان حالياً)');
    }

    // إضافة اللاعب الثاني كمخمن
    const existingIndex = room.players.findIndex(p => p.id === socket.id);
    if (existingIndex === -1) {
      room.players.push({
        id: socket.id,
        name: playerName || 'المنافس',
        avatar: avatar || '🦊',
        role: 'guesser',
        isHost: false
      });
      room.scores[socket.id] = 0;
    }

    socket.join(formattedCode);
    socket.roomCode = formattedCode;

    // تحويل حالة الغرفة إلى مرحلة اختيار الماستر للصورة
    if (room.gameState.status === 'waiting') {
      room.gameState.status = 'choosing';
    }

    console.log(`[Room] انضم ${playerName} للغرفة ${formattedCode}`);

    // إشعار جميع المتواجدين بالغرفة بالتحديث
    room.players.forEach(p => {
      io.to(p.id).emit('room_updated', getSanitizedGameState(room, p.id));
    });
  });

  // الماستر يحدد الصورة السرية ويقفلها
  socket.on('set_secret', ({ secret }) => {
    const room = rooms.get(socket.roomCode);
    if (!room) return;

    const player = room.players.find(p => p.id === socket.id);
    if (!player || player.role !== 'master') {
      return socket.emit('error_message', 'فقط الماستر يمكنه تحديد الصورة');
    }

    if (!secret || !secret.name) {
      return socket.emit('error_message', 'يجب تحديد اسم أو صورة صحيحة');
    }

    room.gameState.secret = {
      name: secret.name.trim(),
      image: secret.image || null,
      category: secret.category || 'عام'
    };
    room.gameState.status = 'playing';
    room.gameState.questions = [];
    room.gameState.unlockRequest = null;
    room.gameState.winner = null;
    room.gameState.guessesLeft = 3;
    room.gameState.hintUnlocked = false;

    console.log(`[Secret] الماستر حدد الصورة السرية: ${secret.name} في الغرفة ${room.code}`);

    // إرسال التحديث للجميع
    room.players.forEach(p => {
      io.to(p.id).emit('secret_locked', getSanitizedGameState(room, p.id));
    });
  });

  // المخمن يطلب مساعدة (كشف الأسئلة المقترحة)
  socket.on('request_hint', () => {
    const room = rooms.get(socket.roomCode);
    if (!room) return;

    const player = room.players.find(p => p.id === socket.id);
    if (!player || player.role !== 'guesser') return;

    const master = room.players.find(p => p.role === 'master');
    if (master) {
      console.log(`[Hint] المخمن ${player.name} طلب مساعدة في الغرفة ${room.code}`);
      io.to(master.id).emit('hint_requested', {
        guesserName: player.name,
        guesserAvatar: player.avatar
      });
    }
  });

  // الماستر يوافق أو يرفض منح المساعدة
  socket.on('respond_hint', ({ approved }) => {
    const room = rooms.get(socket.roomCode);
    if (!room) return;

    const player = room.players.find(p => p.id === socket.id);
    if (!player || player.role !== 'master') return;

    if (approved) {
      room.gameState.hintUnlocked = true;
    }

    console.log(`[Hint] الماستر استجاب للمساعدة: ${approved ? 'موافق' : 'مرفوض'}`);

    room.players.forEach(p => {
      io.to(p.id).emit('hint_response', {
        approved,
        hintUnlocked: room.gameState.hintUnlocked,
        message: approved
          ? 'وافق الماستر على منح المساعدة! تم كشف الأسئلة المقترحة 💡'
          : 'رفض الماستر طلب المساعدة! استمر في التفكير وطرح أسئلتك 🔒'
      });
    });
  });

  // المخمن يطرح سؤالاً
  socket.on('ask_question', ({ questionText }) => {
    const room = rooms.get(socket.roomCode);
    if (!room) return;

    const player = room.players.find(p => p.id === socket.id);
    if (!player || player.role !== 'guesser') {
      return socket.emit('error_message', 'المخمن فقط هو من يطرح الأسئلة');
    }

    if (!questionText || !questionText.trim()) return;

    const questionObj = {
      id: 'q_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      senderName: player.name,
      senderAvatar: player.avatar,
      text: questionText.trim(),
      answer: null, // null, 'yes', 'no'
      timestamp: Date.now()
    };

    room.gameState.questions.push(questionObj);

    room.players.forEach(p => {
      io.to(p.id).emit('question_added', {
        question: questionObj,
        totalQuestions: room.gameState.questions.length
      });
    });
  });

  // الماستر يجيب بنعم أو لا
  socket.on('answer_question', ({ questionId, answer }) => {
    const room = rooms.get(socket.roomCode);
    if (!room) return;

    const player = room.players.find(p => p.id === socket.id);
    if (!player || player.role !== 'master') {
      return socket.emit('error_message', 'الماستر فقط هو المخول بالإجابة بنعم أو لا');
    }

    const question = room.gameState.questions.find(q => q.id === questionId);
    if (!question) return;

    if (answer !== 'yes' && answer !== 'no') return;

    question.answer = answer;
    question.answeredAt = Date.now();

    room.players.forEach(p => {
      io.to(p.id).emit('question_answered', {
        questionId,
        answer,
        allQuestions: room.gameState.questions
      });
    });
  });

  // المخمن يطلب فتح الصورة بعد تخمين الاسم
  socket.on('request_unlock', ({ guessName }) => {
    const room = rooms.get(socket.roomCode);
    if (!room) return;

    const player = room.players.find(p => p.id === socket.id);
    if (!player || player.role !== 'guesser') return;

    if (room.gameState.guessesLeft <= 0) {
      return socket.emit('error_message', 'لقد استنفدت جميع محاولات التخمين لهذه الجولة (3/3)');
    }

    if (!guessName || !guessName.trim()) {
      return socket.emit('error_message', 'يرجى كتابة اسم التخمين لطلب فتح الصورة');
    }

    room.gameState.status = 'requested_unlock';
    room.gameState.unlockRequest = {
      guessName: guessName.trim(),
      guesserName: player.name,
      guesserAvatar: player.avatar,
      timestamp: Date.now(),
      status: 'pending'
    };

    room.players.forEach(p => {
      io.to(p.id).emit('unlock_requested', {
        unlockRequest: room.gameState.unlockRequest,
        status: room.gameState.status,
        guessesLeft: room.gameState.guessesLeft
      });
    });
  });

  // الماستر يقرر الموافقة (إجابة صحيحة) أو الرفض
  socket.on('respond_unlock', ({ accepted }) => {
    const room = rooms.get(socket.roomCode);
    if (!room) return;

    const player = room.players.find(p => p.id === socket.id);
    if (!player || player.role !== 'master') return;

    const guesser = room.players.find(p => p.role === 'guesser');
    const master = room.players.find(p => p.role === 'master');

    if (accepted) {
      // إجابة صحيحة، فوز المخمن بالجولة ونيل +1 نقطة
      room.gameState.status = 'revealed';
      room.gameState.winner = guesser ? guesser.name : 'المخمّن';
      if (room.gameState.unlockRequest) {
        room.gameState.unlockRequest.status = 'accepted';
      }

      if (guesser) {
        room.scores[guesser.id] = (room.scores[guesser.id] || 0) + 1;
      }

      // التحقق من الفوز بالمباراة (3 نقاط)
      let matchWinner = null;
      if (guesser && room.scores[guesser.id] >= 3) {
        matchWinner = guesser;
        room.gameState.matchWinner = matchWinner.name;
      }

      console.log(`[Game] تخمين صحيح! المخمن ${guesser ? guesser.name : ''} كسب النقطة.`);

      room.players.forEach(p => {
        io.to(p.id).emit('game_revealed', {
          secret: room.gameState.secret,
          winner: room.gameState.winner,
          winnerRole: 'guesser',
          totalQuestions: room.gameState.questions.length,
          status: 'revealed',
          scores: getFormattedScores(room),
          matchWinner: matchWinner ? matchWinner.name : null,
          guessesLeft: room.gameState.guessesLeft
        });
      });
    } else {
      // إجابة خاطئة! خصم محاولة
      room.gameState.guessesLeft -= 1;

      console.log(`[Game] تخمين خاطئ في الغرفة ${room.code}. المحاولات المتبقية: ${room.gameState.guessesLeft}`);

      if (room.gameState.guessesLeft <= 0) {
        // استنفد 3 محاولات! يعتبر خاسراً للجولة ويكسب الماستر النقطة
        room.gameState.status = 'revealed';
        room.gameState.winner = master ? master.name : 'الماستر';
        if (room.gameState.unlockRequest) {
          room.gameState.unlockRequest.status = 'rejected';
        }

        if (master) {
          room.scores[master.id] = (room.scores[master.id] || 0) + 1;
        }

        let matchWinner = null;
        if (master && room.scores[master.id] >= 3) {
          matchWinner = master;
          room.gameState.matchWinner = matchWinner.name;
        }

        console.log(`[Game] المخمن خسر الجولة لاستنفاد 3 محاولات. الماستر يكسب النقطة.`);

        room.players.forEach(p => {
          io.to(p.id).emit('round_lost_by_guesses', {
            secret: room.gameState.secret,
            winner: master ? master.name : 'الماستر',
            winnerRole: 'master',
            totalQuestions: room.gameState.questions.length,
            status: 'revealed',
            scores: getFormattedScores(room),
            matchWinner: matchWinner ? matchWinner.name : null,
            guessesLeft: 0,
            message: 'استنفد المخمن محاولات التخمين الـ 3! كسب الماستر نقطة الجولة 👑'
          });
        });
      } else {
        // لا تزال هناك محاولات متبقية
        room.gameState.status = 'playing';
        if (room.gameState.unlockRequest) {
          room.gameState.unlockRequest.status = 'rejected';
        }

        room.players.forEach(p => {
          io.to(p.id).emit('unlock_rejected', {
            status: 'playing',
            guessesLeft: room.gameState.guessesLeft,
            message: `محاولة خاطئة! متبقي لديك (${room.gameState.guessesLeft}) من 3 محاولات.`
          });
        });
      }
    }
  });

  // تبديل الأدوار لجولة جديدة
  socket.on('switch_roles_rematch', () => {
    const room = rooms.get(socket.roomCode);
    if (!room) return;

    // تبديل الأدوار بين اللاعبين
    room.players.forEach(p => {
      p.role = p.role === 'master' ? 'guesser' : 'master';
    });

    room.gameState.roundNumber += 1;
    room.gameState.status = 'choosing';
    room.gameState.secret = null;
    room.gameState.questions = [];
    room.gameState.unlockRequest = null;
    room.gameState.winner = null;
    room.gameState.guessesLeft = 3;
    room.gameState.hintUnlocked = false;

    console.log(`[Rematch] بدأت جولة جديدة (${room.gameState.roundNumber}) في الغرفة ${room.code}`);

    room.players.forEach(p => {
      io.to(p.id).emit('new_round_started', getSanitizedGameState(room, p.id));
    });
  });

  // إعادة ضبط المباراة من الصفر (تصفير النقاط والبدء بـ 0-0)
  socket.on('reset_match', () => {
    const room = rooms.get(socket.roomCode);
    if (!room) return;

    room.players.forEach(p => {
      room.scores[p.id] = 0;
    });

    room.gameState.roundNumber = 1;
    room.gameState.status = 'choosing';
    room.gameState.secret = null;
    room.gameState.questions = [];
    room.gameState.unlockRequest = null;
    room.gameState.winner = null;
    room.gameState.guessesLeft = 3;
    room.gameState.hintUnlocked = false;
    room.gameState.matchWinner = null;

    console.log(`[Match Reset] تم تصفير نقاط المباراة في الغرفة ${room.code}`);

    room.players.forEach(p => {
      io.to(p.id).emit('match_reset', getSanitizedGameState(room, p.id));
    });
  });

  // انقطاع الاتصال
  socket.on('disconnect', () => {
    console.log(`[Socket] قطع الاتصال: ${socket.id}`);
    const roomCode = socket.roomCode;
    if (roomCode && rooms.has(roomCode)) {
      const room = rooms.get(roomCode);
      room.players = room.players.filter(p => p.id !== socket.id);

      if (room.players.length === 0) {
        rooms.delete(roomCode);
        console.log(`[Room] تم حذف الغرفة ${roomCode} لعدم وجود لاعبين`);
      } else {
        // إشعار اللاعب الآخر
        room.gameState.status = 'waiting';
        io.to(roomCode).emit('player_left', {
          message: 'لقد غادر المنافس الغرفة!',
          remainingPlayers: room.players
        });
      }
    }
  });
});

function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  const localIp = getLocalIpAddress();
  console.log(`====================================================`);
  console.log(`🎮 خادم لعبة التخمين يعمل بنجاح!`);
  console.log(`💻 من جهاز الكمبيوتر:   http://localhost:${PORT}`);
  console.log(`📱 من الهاتف (نفس الواي فاي): http://${localIp}:${PORT}`);
  console.log(`====================================================`);
});
