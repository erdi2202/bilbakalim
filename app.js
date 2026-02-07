// ========== BİL BAKALIM - Sesli Bilgi Yarışması ==========

const CONTESTANTS = ["Akın", "Ragıp", "Birol", "Harun", "Özge", "Nuray", "Annem"];
const QUESTIONS_PER_GAME = 20;

let gameState = {
    currentQuestionIndex: 0,
    currentContestantIndex: 0,
    questions: [],
    scores: {},
    roundAnswers: [],
    allContestantsAnswered: false
};

// ========== EKRAN YÖNETİMİ ==========
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}

// ========== OYUN BAŞLATMA ==========
function startGame() {
    // Skorları sıfırla
    gameState.scores = {};
    CONTESTANTS.forEach(c => gameState.scores[c] = 0);

    // Soruları karıştır ve seç
    gameState.questions = shuffleArray([...QUESTIONS]).slice(0, QUESTIONS_PER_GAME);
    gameState.currentQuestionIndex = 0;

    showScreen('screen-game');
    document.getElementById('total-questions').textContent = gameState.questions.length;
    loadQuestion();
}

function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

// ========== SORU YÜKLEME ==========
function loadQuestion() {
    const q = gameState.questions[gameState.currentQuestionIndex];
    gameState.currentContestantIndex = 0;
    gameState.roundAnswers = [];
    gameState.allContestantsAnswered = false;

    document.getElementById('question-number').textContent = gameState.currentQuestionIndex + 1;
    document.getElementById('question-text').textContent = q.question;
    document.getElementById('answer-result').classList.add('hidden');
    document.getElementById('answer-input').value = '';

    updateActiveContestant();
    renderContestantsQueue();

    // Soruyu otomatik sesli oku
    setTimeout(() => speakQuestion(), 500);
}

// ========== SESLİ OKUMA (Text-to-Speech) ==========
function speakQuestion() {
    const q = gameState.questions[gameState.currentQuestionIndex];
    const btn = document.getElementById('btn-speak');

    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(q.question);
        utterance.lang = 'tr-TR';
        utterance.rate = 0.9;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        // Türkçe ses bul
        const setVoice = () => {
            const voices = window.speechSynthesis.getVoices();
            const turkishVoice = voices.find(v => v.lang.startsWith('tr'));
            if (turkishVoice) {
                utterance.voice = turkishVoice;
            }
        };

        if (window.speechSynthesis.getVoices().length > 0) {
            setVoice();
        } else {
            window.speechSynthesis.onvoiceschanged = setVoice;
        }

        utterance.onstart = () => btn.classList.add('speaking');
        utterance.onend = () => btn.classList.remove('speaking');
        utterance.onerror = () => btn.classList.remove('speaking');

        window.speechSynthesis.speak(utterance);
    }
}

// ========== YARIŞMACI YÖNETİMİ ==========
function updateActiveContestant() {
    const name = CONTESTANTS[gameState.currentContestantIndex];
    document.getElementById('active-contestant-name').textContent = name + " cevaplıyor...";
    document.getElementById('answer-input').value = '';
    document.getElementById('answer-input').focus();
}

function renderContestantsQueue() {
    const queue = document.getElementById('contestants-queue');
    queue.innerHTML = '';

    CONTESTANTS.forEach((name, i) => {
        const item = document.createElement('div');
        item.className = 'queue-item';

        if (i === gameState.currentContestantIndex && !gameState.allContestantsAnswered) {
            item.classList.add('active');
        } else if (gameState.roundAnswers.find(a => a.name === name)) {
            item.classList.add('done');
        }

        item.innerHTML = `
            <span>${name}</span>
            <span class="queue-score">${gameState.scores[name]} p</span>
        `;
        queue.appendChild(item);
    });
}

// ========== CEVAP GÖNDERİMİ ==========
function submitAnswer() {
    const input = document.getElementById('answer-input');
    const value = input.value.trim();

    if (value === '') {
        input.style.borderColor = '#f87171';
        setTimeout(() => input.style.borderColor = 'rgba(255,255,255,0.1)', 1000);
        return;
    }

    const answer = parseFloat(value);
    if (isNaN(answer)) {
        input.style.borderColor = '#f87171';
        setTimeout(() => input.style.borderColor = 'rgba(255,255,255,0.1)', 1000);
        return;
    }

    const name = CONTESTANTS[gameState.currentContestantIndex];
    gameState.roundAnswers.push({ name, answer });

    // Sonraki yarışmacıya geç
    gameState.currentContestantIndex++;

    if (gameState.currentContestantIndex >= CONTESTANTS.length) {
        // Tüm yarışmacılar cevapladı
        gameState.allContestantsAnswered = true;
        renderContestantsQueue();
        showRoundResult();
    } else {
        updateActiveContestant();
        renderContestantsQueue();
    }
}

// ========== TUR SONUCU ==========
function showRoundResult() {
    const q = gameState.questions[gameState.currentQuestionIndex];
    const correctAnswer = q.answer;

    // Farkları hesapla ve sırala
    const results = gameState.roundAnswers.map(a => ({
        ...a,
        diff: Math.abs(a.answer - correctAnswer)
    })).sort((a, b) => a.diff - b.diff);

    // En yakın cevabı veren kazanır (1 puan)
    const winner = results[0];
    gameState.scores[winner.name] += 1;

    // Eşit uzaklıkta olanlar da puan alır
    results.forEach(r => {
        if (r.diff === winner.diff && r.name !== winner.name) {
            gameState.scores[r.name] += 1;
        }
    });

    // Sonuçları göster
    document.getElementById('result-title').textContent = `Soru ${gameState.currentQuestionIndex + 1} Sonucu`;
    document.getElementById('result-correct-answer').innerHTML =
        `Doğru Cevap: <strong>${formatNumber(correctAnswer)} ${q.unit}</strong>`;

    const listEl = document.getElementById('result-answers-list');
    listEl.innerHTML = '';

    results.forEach((r, i) => {
        const item = document.createElement('div');
        item.className = 'result-answer-item' + (r.diff === winner.diff ? ' winner' : '');
        item.innerHTML = `
            <span class="name">${r.diff === winner.diff ? '✅ ' : ''}${r.name}</span>
            <span class="answer-val">${formatNumber(r.answer)} ${q.unit}</span>
            <span class="diff">(fark: ${formatNumber(r.diff)})</span>
        `;
        listEl.appendChild(item);
    });

    // Kazananları bul
    const winners = results.filter(r => r.diff === winner.diff);
    let winnerText;
    if (winners.length === 1) {
        winnerText = `🎉 ${winner.name} kazandı! (+1 puan)`;
    } else {
        winnerText = `🎉 ${winners.map(w => w.name).join(' & ')} kazandı! (+1 puan)`;
    }
    document.getElementById('result-winner').textContent = winnerText;

    // Kazananı sesli oku
    speakText(winnerText.replace('🎉 ', ''));

    document.getElementById('answer-result').classList.remove('hidden');

    // Son soru mu?
    if (gameState.currentQuestionIndex >= gameState.questions.length - 1) {
        document.getElementById('btn-next-question').textContent = 'Sonuçları Gör 🏆';
    } else {
        document.getElementById('btn-next-question').textContent = 'Sonraki Soru →';
    }
}

function speakText(text) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'tr-TR';
        utterance.rate = 0.9;
        const voices = window.speechSynthesis.getVoices();
        const turkishVoice = voices.find(v => v.lang.startsWith('tr'));
        if (turkishVoice) utterance.voice = turkishVoice;
        window.speechSynthesis.speak(utterance);
    }
}

function formatNumber(num) {
    return num.toLocaleString('tr-TR');
}

// ========== SONRAKİ SORU ==========
function nextQuestion() {
    gameState.currentQuestionIndex++;

    if (gameState.currentQuestionIndex >= gameState.questions.length) {
        showEndScreen();
    } else {
        loadQuestion();
    }
}

// ========== SKOR TABLOSU ==========
function showScoreboard() {
    renderScoreboard('scoreboard-list');
    showScreen('screen-scoreboard');
}

function renderScoreboard(containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';

    const sorted = Object.entries(gameState.scores)
        .sort((a, b) => b[1] - a[1]);

    sorted.forEach(([name, score], i) => {
        const item = document.createElement('div');
        item.className = 'scoreboard-item';
        item.innerHTML = `
            <span class="rank">${i + 1}</span>
            <span class="sb-name">${name}</span>
            <span class="sb-score">${score} puan</span>
        `;
        container.appendChild(item);
    });
}

// ========== OYUN SONU ==========
function showEndScreen() {
    const sorted = Object.entries(gameState.scores)
        .sort((a, b) => b[1] - a[1]);

    const [winnerName, winnerScore] = sorted[0];

    document.getElementById('winner-name').textContent = winnerName;
    document.getElementById('winner-score').textContent = winnerScore + ' puan';

    // Final skor tablosu
    const finalEl = document.getElementById('final-scoreboard');
    finalEl.innerHTML = '';

    sorted.forEach(([name, score], i) => {
        const item = document.createElement('div');
        item.className = 'final-sb-item';
        item.innerHTML = `
            <span class="f-rank">${i + 1}.</span>
            <span class="f-name">${name}</span>
            <span class="f-score">${score} puan</span>
        `;
        finalEl.appendChild(item);
    });

    showScreen('screen-end');

    // Kazananı sesli söyle
    setTimeout(() => {
        speakText(`Oyun bitti! Birinci ${winnerName}, ${winnerScore} puanla kazandı. Tebrikler!`);
    }, 500);
}

// ========== EVENT LISTENERS ==========
document.addEventListener('DOMContentLoaded', () => {
    // Ana ekran
    document.getElementById('btn-start').addEventListener('click', startGame);

    // Oyun ekranı
    document.getElementById('btn-speak').addEventListener('click', speakQuestion);
    document.getElementById('btn-submit-answer').addEventListener('click', submitAnswer);
    document.getElementById('btn-next-question').addEventListener('click', nextQuestion);
    document.getElementById('btn-scoreboard').addEventListener('click', showScoreboard);

    // Enter ile cevap gönder
    document.getElementById('answer-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') submitAnswer();
    });

    // Skor tablosu
    document.getElementById('btn-back-game').addEventListener('click', () => showScreen('screen-game'));

    // Tekrar oyna
    document.getElementById('btn-restart').addEventListener('click', () => {
        showScreen('screen-home');
    });

    // Sesleri önceden yükle
    if ('speechSynthesis' in window) {
        window.speechSynthesis.getVoices();
    }
});
