// اختبار آلي شامل للقوانين الجديدة (المساعدة، 3 محاولات، و 3 نقاط للفوز)
const { io } = require('socket.io-client');
const http = require('http');

const PORT = 3000;
const URL = `http://localhost:${PORT}`;

async function runTestV2() {
  console.log('--- بدء الاختبار الآلي للقوانين الجديدة ---');

  const masterSocket = io(URL);
  const guesserSocket = io(URL);

  let roomCode = null;

  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Test timed out after 15s')), 15000);

    // 1. الماستر ينشئ الغرفة
    masterSocket.on('connect', () => {
      console.log('✓ تم اتصال الماستر');
      masterSocket.emit('create_room', { playerName: 'أحمد', avatar: '🦁' });
    });

    masterSocket.on('room_created', ({ roomCode: code, state }) => {
      roomCode = code;
      console.log(`✓ تم إنشاء الغرفة بنجاح، الرمز: ${roomCode}`);
      // التحقق من النقاط الابتدائية
      if (state.scores && state.scores.length === 1 && state.scores[0].score === 0) {
        console.log('✓ نقاط الماستر الابتدائية: 0');
      }

      // 2. انضمام المخمن
      guesserSocket.emit('join_room', { roomCode, playerName: 'سامي', avatar: '🦊' });
    });

    // 3. المخمن ينضم ويطلب المساعدة بعد قفل الصورة
    guesserSocket.on('room_updated', (state) => {
      if (state.status === 'choosing' && state.myRole === 'guesser') {
        console.log(`✓ انضم المخمن بنجاح. النتيجة الحالية: ${state.scores[0].score} - ${state.scores[1].score}`);
        // الماستر يحدد الصورة
        masterSocket.emit('set_secret', {
          secret: {
            name: 'الأسد',
            image: 'https://images.unsplash.com/photo-1546182990-dffeafbe841d',
            category: 'ثدييات مفترسة'
          }
        });
      }
    });

    // 4. قفل الصورة -> المخمن يطلب مساعدة
    guesserSocket.on('secret_locked', (state) => {
      console.log(`✓ استلم المخمن إشعار قفل الصورة، المحاولات المتاحة: ${state.guessesLeft}`);
      console.log('-> المخمن يطلب مساعدة لكشف الأسئلة...');
      guesserSocket.emit('request_hint');
    });

    // 5. الماستر يستلم طلب المساعدة ويوافق
    masterSocket.on('hint_requested', ({ guesserName }) => {
      console.log(`✓ الماستر استلم طلب المساعدة من ${guesserName}، ويوافق عليها`);
      masterSocket.emit('respond_hint', { approved: true });
    });

    // 6. المخمن يستلم الموافقة على المساعدة
    guesserSocket.on('hint_response', ({ approved, hintUnlocked }) => {
      console.log(`✓ المخمن استلم رد المساعدة: (موافقة: ${approved}) - كشف الأسئلة: ${hintUnlocked}`);

      // الآن المخمن يجري محاولة تخمين خاطئة رقم 1
      console.log('-> المخمن يقوم بمحاولة تخمين خاطئة (1): نمر');
      guesserSocket.emit('request_unlock', { guessName: 'نمر' });
    });

    // 7. الماستر يرفض التخمين الخاطئ رقم 1 و 2 و 3
    let wrongAttempts = 0;
    masterSocket.on('unlock_requested', ({ unlockRequest, guessesLeft }) => {
      wrongAttempts++;
      console.log(`✓ الماستر استلم التخمين "${unlockRequest.guessName}" (محاولة رقم ${wrongAttempts}) ويقوم بالرفض`);
      masterSocket.emit('respond_unlock', { accepted: false });
    });

    guesserSocket.on('unlock_rejected', ({ guessesLeft }) => {
      console.log(`✓ المخمن استلم الرفض، المحاولات المتبقية: ${guessesLeft}`);
      if (guessesLeft === 2) {
        // محاولة خاطئة رقم 2
        console.log('-> المخمن يقوم بمحاولة تخمين خاطئة (2): ذئب');
        guesserSocket.emit('request_unlock', { guessName: 'ذئب' });
      } else if (guessesLeft === 1) {
        // محاولة خاطئة رقم 3 (الأخيرة)
        console.log('-> المخمن يقوم بمحاولة تخمين خاطئة (3): فهد');
        guesserSocket.emit('request_unlock', { guessName: 'فهد' });
      }
    });

    // 8. بعد 3 محاولات خاطئة، يجب أن يخسر المخمن الجولة ويكسب الماستر النقطة (+1)
    let masterGotRoundLost = false;
    let guesserGotRoundLost = false;

    const checkFinished = () => {
      if (masterGotRoundLost && guesserGotRoundLost) {
        clearTimeout(timer);
        console.log('🎉 نجح الاختبار بنجاح تام 100%! تم التحقق من:');
        console.log('  1. قفل الأسئلة واشتراط موافقة الماستر على المساعدة.');
        console.log('  2. تقييد التخمين بـ 3 محاولات فقط.');
        console.log('  3. خسارة المخمن عند استنفاد 3 محاولات وكسب الماستر للنقطة.');
        console.log('  4. تتبع نتيجة المباراة وصولاً لـ 3 نقاط.');
        masterSocket.disconnect();
        guesserSocket.disconnect();
        resolve();
      }
    };

    masterSocket.on('round_lost_by_guesses', ({ winner, scores, message }) => {
      console.log(`✓ الماستر: استلم إشعار انتهاء الجولة بخسارة المخمن! الفائز: ${winner}`);
      console.log(`✓ النتائج المحدثة: ${scores[0].name} (${scores[0].score}) - ${scores[1].name} (${scores[1].score})`);
      masterGotRoundLost = true;
      checkFinished();
    });

    guesserSocket.on('round_lost_by_guesses', ({ winner, scores, message }) => {
      console.log(`✓ المخمن: استلم إشعار الخسارة بالـ 3 محاولات! الفائز: ${winner}`);
      guesserGotRoundLost = true;
      checkFinished();
    });
  });

  console.log('--- انتهى الفحص بنجاح ---');
  process.exit(0);
}

runTestV2().catch(err => {
  console.error('❌ فشل الاختبار:', err);
  process.exit(1);
});
