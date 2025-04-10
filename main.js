// --- DOM Element Selection ---
const form = document.getElementById('flashcard-form');
const cardFrontEl = document.getElementById('card-front');
const cardBackEl = document.getElementById('card-back');
const cardFrontP = cardFrontEl.querySelector('p'); // Target the paragraph inside
const cardBackP = cardBackEl.querySelector('p');  // Target the paragraph inside
const cardContainer = document.getElementById('flashcard');
const cardCounter = document.getElementById('card-counter');

const prevButton = document.getElementById('prev-button');
const flipButton = document.getElementById('flip-button');
const nextButton = document.getElementById('next-button');
// Add Start Quiz Button selector (assuming it exists in your final HTML)
const startQuizButton = document.getElementById('start-quiz-button');

// --- Quiz Elements ---
const interactiveArea = document.getElementById('interactive-area');
const flashcardSection = document.getElementById('flashcard-section');
const quizSection = document.getElementById('quiz-section');
const quizQuestionEl = document.getElementById('quiz-question'); // This is a <p> tag
const quizOptionsEl = document.getElementById('quiz-options');
const quizFeedbackEl = document.getElementById('quiz-feedback');
const prevQuizButton = document.getElementById('prev-quiz-button');
const nextQuizButton = document.getElementById('next-quiz-button');

// --- Application State ---
let flashcards = []; // Will be populated by loadFlashcards
let currentCardIndex = -1;
let currentQuizQuestionIndex = -1;
let quizIndices = [];
let correctlyAnsweredInQuiz = {};
let isQuizActive = false; // Flag to track if quiz mode is active

// Key for localStorage
const FLASHCARD_STORAGE_KEY = 'myFlashcardsAppData_v1_katex_rebuilt'; // Use a distinct key

// --- Initial Data (using LaTeX syntax) ---
const initialFlashcards = [
    {
        question: "Nguyên hàm của hàm số $f(x) = e^x$ là:",
        answers: [
            "$\\frac{e^{x+1}}{x+1} + C$",
            "$e^x + C$",
            "$\\frac{e^x}{x} + C$",
            "$x \\cdot e^{x-1} + C$"
        ],
        correctAnswerIndex: 1
    }
];

// --- Helper: Shuffle array ---
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// --- LocalStorage Functions ---
function saveFlashcardsToStorage() {
    try {
        localStorage.setItem(FLASHCARD_STORAGE_KEY, JSON.stringify(flashcards));
    } catch (error) {
        console.error('Error saving flashcards to localStorage:', error);
        alert('Could not save flashcards. Local storage might be full.');
    }
}

function loadFlashcards() {
    const storedData = localStorage.getItem(FLASHCARD_STORAGE_KEY);
    if (storedData) {
        try {
            const parsedData = JSON.parse(storedData);
            if (Array.isArray(parsedData) && parsedData.every(item => item && typeof item.question === 'string' && Array.isArray(item.answers) && typeof item.correctAnswerIndex === 'number')) {
                 flashcards = parsedData;
                 console.log('Flashcards loaded from localStorage:', flashcards.length);
            } else {
                 console.warn('Stored data format invalid. Using initial data.');
                 flashcards = [...initialFlashcards];
            }
        } catch (error) {
            console.error('Error parsing flashcards from localStorage:', error);
            flashcards = [...initialFlashcards];
        }
    } else {
        console.log('No data in localStorage. Using initial data.');
        flashcards = [...initialFlashcards];
    }
    currentCardIndex = flashcards.length > 0 ? 0 : -1;
}

// --- KaTeX Rendering Helper ---
function renderMath(latexString, targetElement, isDisplayMode = false) {
    if (typeof katex === 'undefined') {
        console.error("KaTeX library is not loaded!");
        targetElement.textContent = latexString; return;
    }
    try {
        katex.render(latexString, targetElement, { throwOnError: false, displayMode: isDisplayMode });
    } catch (e) {
        console.error("KaTeX rendering error:", e); targetElement.textContent = latexString;
    }
}

function renderMathToString(latexString, isDisplayMode = false) {
     if (typeof katex === 'undefined') { console.error("KaTeX library is not loaded!"); return latexString; }
    try {
       return katex.renderToString(latexString, { throwOnError: false, displayMode: isDisplayMode });
    } catch (e) { console.error("KaTeX rendering error to string:", e); return latexString; }
}

// --- Form Submission ---
form.addEventListener('submit', function(event) {
    event.preventDefault();

    const questionInput = document.getElementById('question');
    const answerInputs = [
        document.getElementById('answer1'), document.getElementById('answer2'),
        document.getElementById('answer3'), document.getElementById('answer4')
    ];
    const question = questionInput.value; // Get raw value for potential LaTeX
    const answers = answerInputs.map(input => input.value); // Get raw values

    const correctAnswerInput = document.querySelector('input[name="correct_answer"]:checked');

    // Basic validation
    if (!question.trim()) { alert('Please enter the question.'); questionInput.focus(); return; }
    if (answers.some(ans => !ans.trim())) {
        alert('Please fill in all four answers.');
        const firstEmpty = answerInputs.find(input => !input.value.trim());
        if (firstEmpty) firstEmpty.focus();
        return;
     }
    if (!correctAnswerInput) { alert('Please select the correct answer.'); return; }

    const correctAnswerIndex = parseInt(correctAnswerInput.value, 10) - 1;

    const flashcardData = {
        question: question, // Store raw text (might be LaTeX)
        answers: answers,   // Store raw text
        correctAnswerIndex: correctAnswerIndex
    };

    flashcards.push(flashcardData);
    saveFlashcardsToStorage(); // <<< SAVE TO LOCALSTORAGE
    console.log('Flashcard Created:', flashcardData);

    currentCardIndex = flashcards.length - 1; // Go to the new card
    showCard(currentCardIndex); // Update viewer display
    updateStartQuizButtonState(); // Enable quiz button if it was the first card

    // --- REMOVED: Don't automatically start quiz ---
    // startQuiz();

    form.reset();
    questionInput.focus(); // Focus back on question input
});

// --- Flashcard Viewer Logic ---
function showCard(index) {
    // Clear previous KaTeX rendering
    cardFrontP.innerHTML = '';
    cardBackP.innerHTML = '';

    if (flashcards.length === 0) {
        cardFrontP.textContent = 'Create a flashcard to start!'; // No KaTeX
        interactiveArea.style.display = 'none'; // Hide whole area if no cards
        currentCardIndex = -1;
    } else {
        interactiveArea.style.display = 'flex'; // Show the area
        if (index < 0) index = 0;
        if (index >= flashcards.length) index = flashcards.length - 1;

        currentCardIndex = index;
        const card = flashcards[currentCardIndex];

        // Render using KaTeX
        renderMath(card.question, cardFrontP);
        renderMath(card.answers[card.correctAnswerIndex], cardBackP);

        cardContainer.classList.remove('flipped'); // Show front by default
    }

    updateViewerButtonStates(); // Update nav buttons
    updateCardCounter(); // Update card count display
    updateStartQuizButtonState(); // Update quiz button state

    // Control section visibility based on quiz state
    if (!isQuizActive) {
        flashcardSection.style.display = 'block';
        quizSection.style.display = 'none';
    }
}

function updateViewerButtonStates() {
    const hasCards = flashcards.length > 0;
    prevButton.disabled = !hasCards || currentCardIndex <= 0;
    nextButton.disabled = !hasCards || currentCardIndex >= flashcards.length - 1;
    flipButton.disabled = !hasCards;
}

function updateCardCounter() {
     cardCounter.textContent = `Card ${flashcards.length === 0 ? 0 : currentCardIndex + 1} of ${flashcards.length}`;
}

// --- Add function to update Start Quiz button state ---
function updateStartQuizButtonState() {
    // Check if button exists before trying to disable/enable it
    if (startQuizButton) {
        startQuizButton.disabled = flashcards.length === 0;
    } else {
        console.warn("Start Quiz button not found in the DOM.");
    }
}

// --- Flashcard Viewer Event Listeners ---
flipButton.addEventListener('click', () => {
    if (flashcards.length === 0 || isQuizActive) return; // Prevent flip during quiz
    cardContainer.classList.toggle('flipped');
});

cardContainer.addEventListener('click', (event) => {
    if (event.target.closest('#flashcard-controls') || flashcards.length === 0 || isQuizActive) return;
    if (event.target === cardContainer || event.target.closest('#card-front') || event.target.closest('#card-back')) {
       cardContainer.classList.toggle('flipped');
    }
});

nextButton.addEventListener('click', () => {
    if (currentCardIndex < flashcards.length - 1) {
        // Use showCard to handle index update and rendering
        showCard(currentCardIndex + 1);
    }
});

prevButton.addEventListener('click', () => {
    if (currentCardIndex > 0) {
        // Use showCard to handle index update and rendering
        showCard(currentCardIndex - 1);
    }
});

// --- Quiz Logic ---

// --- Add listener for Start Quiz button ---
if (startQuizButton) {
    startQuizButton.addEventListener('click', () => {
        if (flashcards.length > 0) {
            startQuiz();
        }
    });
}

function startQuiz() {
    if (flashcards.length === 0) return; // Should be disabled, but double-check
    isQuizActive = true;
    flashcardSection.style.display = 'none'; // Hide viewer
    quizSection.style.display = 'block';     // Show quiz
    quizIndices = Array.from(flashcards.keys());
    shuffleArray(quizIndices);
    correctlyAnsweredInQuiz = {}; // Reset progress
    currentQuizQuestionIndex = 0;
    displayQuizQuestion();
}

// --- Add function to hide quiz and return to viewer ---
function hideQuiz() {
    isQuizActive = false;
    quizSection.style.display = 'none';
    flashcardSection.style.display = flashcards.length > 0 ? 'block' : 'none';
    if (cardContainer) cardContainer.classList.remove('flipped');
    // Re-render current card in viewer
    if (currentCardIndex !== -1) {
        showCard(currentCardIndex);
    }
}

function displayQuizQuestion() {
    // Clear previous content
    quizQuestionEl.innerHTML = '';
    quizOptionsEl.innerHTML = '';
    quizFeedbackEl.textContent = '';
    quizFeedbackEl.className = '';

    if (!isQuizActive || !quizIndices || currentQuizQuestionIndex < 0) {
        hideQuiz(); return;
    }

    // --- End of Quiz ---
    if (currentQuizQuestionIndex >= quizIndices.length) {
        quizQuestionEl.textContent = "Quiz Finished!";
        quizOptionsEl.innerHTML = `<p>You have completed all ${flashcards.length} questions.</p>`;
        quizFeedbackEl.textContent = "Review cards or start quiz again.";
        nextQuizButton.style.display = 'none';
        prevQuizButton.style.display = quizIndices.length > 1 ? 'inline-block' : 'none';
        // Add Back button
        const backButton = document.createElement('button');
        backButton.textContent = 'Back to Viewer';
        backButton.style.marginTop = '10px';
        backButton.onclick = hideQuiz; // Use the hideQuiz function
        quizOptionsEl.appendChild(backButton);
        return;
    }

    // --- Display Current Question ---
    const flashcardIndex = quizIndices[currentQuizQuestionIndex];
    if (flashcardIndex === undefined || flashcardIndex >= flashcards.length) {
        console.error("Invalid flashcard index during quiz:", flashcardIndex);
        currentQuizQuestionIndex++; displayQuizQuestion(); return;
    }

    const card = flashcards[flashcardIndex];

    // Render question using KaTeX into the <p> tag
    renderMath(card.question, quizQuestionEl);

    // Prepare and shuffle answer options
    const answerOptions = card.answers.map((answer, index) => ({
        text: answer, // Raw LaTeX
        originalIndex: index
    }));
    shuffleArray(answerOptions);

    // Create and render answer buttons
    answerOptions.forEach((option, i) => {
        const button = document.createElement('button');
        button.classList.add('quiz-option-button');
        button.id = `quiz-option-${i}`;
        button.disabled = false;
        // Render LaTeX string into button's innerHTML
        button.innerHTML = renderMathToString(option.text);
        button.addEventListener('click', () => handleAnswerSelection(
            option.originalIndex, card.correctAnswerIndex, flashcardIndex, button
        ));
        quizOptionsEl.appendChild(button);
    });

    updateQuizButtonStates(); // Update nav buttons visibility
}

function handleAnswerSelection(selectedIndex, correctIndex, flashcardIndex, clickedButton) {
    const optionButtons = quizOptionsEl.querySelectorAll('.quiz-option-button');
    const isCorrect = selectedIndex === correctIndex;

    optionButtons.forEach(btn => {
        btn.classList.remove('correct-answer-highlight', 'incorrect-answer-attempt');
    });

    if (isCorrect) {
        quizFeedbackEl.textContent = "Correct!";
        quizFeedbackEl.className = 'feedback-correct';
        correctlyAnsweredInQuiz[flashcardIndex] = true;
        optionButtons.forEach(button => button.disabled = true);
        clickedButton.classList.add('correct-answer-highlight');
    } else {
        quizFeedbackEl.textContent = "Incorrect. Please try again.";
        quizFeedbackEl.className = 'feedback-incorrect';
        clickedButton.disabled = true;
        clickedButton.classList.add('incorrect-answer-attempt');
    }
    updateQuizButtonStates(); // Update nav buttons based on correctness
}

function updateQuizButtonStates() {
    if (!isQuizActive || !quizIndices || currentQuizQuestionIndex < 0 || currentQuizQuestionIndex >= quizIndices.length) {
         nextQuizButton.style.display = 'none';
         // Let end-of-quiz logic handle Prev button if finished
         if (currentQuizQuestionIndex >= quizIndices.length) return;
         // Hide Prev if state is invalid before finishing
         prevQuizButton.style.display = 'none';
        return;
    }

    const flashcardIndex = quizIndices[currentQuizQuestionIndex];
    const isCurrentQuestionCorrect = correctlyAnsweredInQuiz[flashcardIndex];

    prevQuizButton.style.display = currentQuizQuestionIndex > 0 ? 'inline-block' : 'none';
    nextQuizButton.style.display = isCurrentQuestionCorrect ? 'inline-block' : 'none';
}

// --- Quiz Event Listeners ---
nextQuizButton.addEventListener('click', () => {
    // Proceed only if Next button is visible (current question is correct)
    if (nextQuizButton.style.display !== 'none' && currentQuizQuestionIndex < quizIndices.length) {
        currentQuizQuestionIndex++;
        displayQuizQuestion();
    }
});

prevQuizButton.addEventListener('click', () => {
    if (prevQuizButton.style.display !== 'none' && currentQuizQuestionIndex > 0) {
        currentQuizQuestionIndex--;
        displayQuizQuestion(); // Re-display previous question
    }
});

// --- Initial Application Setup ---
function initializeApp() {
    // Check if KaTeX is loaded
    if (typeof katex === 'undefined') {
         console.warn("KaTeX not ready, retrying init...");
         setTimeout(initializeApp, 100); // Simple retry mechanism
         return;
    }
    console.log("KaTeX ready. Initializing app.");
    loadFlashcards();           // Load data first
    showCard(currentCardIndex); // Display initial card/state (will also hide quiz initially)
    // updateStartQuizButtonState(); // Called within showCard
    // hideQuiz(); // Called within showCard based on isQuizActive flag
}

// Run the initializer
initializeApp();

