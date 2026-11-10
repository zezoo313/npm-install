// اختبار آلي شامل لدورة حياة لعبة التخمين
const { io } = require('socket.io-client');
const http = require('http');

const PORT = 3000;
const URL = `http://localhost:${PORT}`;

async function runTest() {
  console.log('--- بدء الاختبار الآلي للعبة التخمين ---');

  // التأكد من أن الخادم يستجيب
  await new Promise((resolve, reject) => {
    http.get(URL, (res) => {
      console.log(`[HTTP Test] كود استجابة الخادم: ${res.statusCode}`);
      if (res.statusCode === 200) resolve();
      else reject(new Error(`Server returned status ${res.statusCode}`));
    }).on('error', reject);
  });

  const masterSocket = io(URL);
  const guesserSocket = io(URL);

  let roomCode = null;

  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Test timed out')), 12000);

    // 1. الماستر ينشئ الغرفة
    masterSocket.on('connect', () => {
      console.log('✓ تم اتصال الماستر');
      masterSocket.emit('create_room', { playerName: 'سارة', avatar: '🦁' });
    });

    masterSocket.on('room_created', ({ roomCode: code }) => {
      roomCode = code;
      console.log(`✓ تم إنشاء الغرفة بنجاح، الرمز: ${roomCode}`);

      // 2. المخمن ينضم للغرفة
      guesserSocket.emit('join_room', { roomCode, playerName: 'عمر', avatar: '🦊' });
    });

    // 3. التحقق من انضمام المخمن وبدء مرحلة الاختيار
    guesserSocket.on('room_updated', (state) => {
      console.log(`✓ انضم المخمن بنجاح إلى الغرفة، حالة اللعبة: ${state.status}`);
      if (state.status === 'choosing' && state.myRole === 'guesser') {
        // الماستر يحدد الصورة السرية
        masterSocket.emit('set_secret', {
          secret: {
            name: 'الأسد',
            image: 'https://images.unsplash.com/photo-1546182990-dffeafbe841d',
            category: 'ثدييات مفترسة'
          }
        });
      }
    });

    // 4. المخمن يستلم إشعار قفل الصورة ويطرح سؤالاً
    guesserSocket.on('secret_locked', (state) => {
      console.log(`✓ استلم المخمن إشعار قفل الصورة بنجاح (مقفولة: ${state.secret.isLocked})`);
      guesserSocket.emit('ask_question', { questionText: 'هل هو من الثدييات؟' });
    });

    // 5. الماستر يستلم السؤال ويجيب بنعم
    masterSocket.on('question_added', ({ question }) => {
      console.log(`✓ استلم الماستر السؤال: "${question.text}"`);
      masterSocket.emit('answer_question', { questionId: question.id, answer: 'yes' });
    });

    // 6. المخمن يستلم إجابة "نعم" ويطلب فتح الصورة
    guesserSocket.on('question_answered', ({ answer }) => {
      console.log(`✓ استلم المخمن الإجابة: "${answer}"`);
      if (answer === 'yes') {
        guesserSocket.emit('request_unlock', { guessName: 'الأسد' });
      }
    });

    // 7. الماستر يستلم طلب فك القفل ويوافق
    masterSocket.on('unlock_requested', ({ unlockRequest }) => {
      console.log(`✓ استلم الماستر طلب فك القفل بتخمين: "${unlockRequest.guessName}"`);
      masterSocket.emit('respond_unlock', { accepted: true });
    });

    // 8. الطرفان يستلمان كشف الصورة وفوز المخمن
    let masterRevealed = false;
    let guesserRevealed = false;

    const checkFinished = () => {
      if (masterRevealed && guesserRevealed) {
        clearTimeout(timer);
        console.log('🎉 نجح الاختبار بالكامل! تم كشف الصورة ومزامنة اللعبة بنجاح بين اللاعبين.');
        masterSocket.disconnect();
        guesserSocket.disconnect();
        resolve();
      }
    };

    masterSocket.on('game_revealed', (data) => {
      console.log(`✓ الماستر: تم كشف السر: ${data.secret.name} والفائز: ${data.winner}`);
      masterRevealed = true;
      checkFinished();
    });

    guesserSocket.on('game_revealed', (data) => {
      console.log(`✓ المخمن: تم كشف السر: ${data.secret.name} والفائز: ${data.winner}`);
      guesserRevealed = true;
      checkFinished();
    });
  });

  console.log('--- انتهى الاختبار بنجاح تام 100% ---');
  process.exit(0);
}

runTest().catch((err) => {
  console.error('❌ فشل الاختبار:', err);
  process.exit(1);
});
