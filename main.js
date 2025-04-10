// --- DOM Element Selection ---
const form = document.getElementById('flashcard-form');
const cardFrontEl = document.getElementById('card-front');
const cardBackEl = document.getElementById('card-back');
const cardFrontP = cardFrontEl.querySelector('p');
const cardBackP = cardBackEl.querySelector('p');
const cardContainer = document.getElementById('flashcard');
const cardCounter = document.getElementById('card-counter');

const prevButton = document.getElementById('prev-button');
const flipButton = document.getElementById('flip-button');
const nextButton = document.getElementById('next-button');
const startQuizButton = document.getElementById('start-quiz-button');

// --- Quiz Elements ---
const interactiveArea = document.getElementById('interactive-area');
const flashcardSection = document.getElementById('flashcard-section');
const quizSection = document.getElementById('quiz-section');
const quizQuestionEl = document.getElementById('quiz-question');
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
let isQuizActive = false;

// Key for localStorage
const FLASHCARD_STORAGE_KEY = 'myFlashcardsAppData_v1_katex'; // Changed key for KaTeX version

// --- Initial Data (using LaTeX syntax) ---
const initialFlashcards = [
    {
        // Question includes LaTeX for f(x)=e^x part
        question: "Nguyên hàm của hàm số $f(x) = e^x$ là:",
        // Answers are LaTeX strings. Note the double backslashes \\ for \
        answers: [
            "$\\frac{e^{x+1}}{x+1} + C$", // LaTeX for A
            "$e^x + C$",             // LaTeX for B (Correct)
            "$\\frac{e^x}{x} + C$",         // LaTeX for C
            "$x \\cdot e^{x-1} + C$"      // LaTeX for D (using \\cdot for multiplication dot)
        ],
        correctAnswerIndex: 1 // Index 1 corresponds to the second answer (B)
    }
    // Add more default flashcards here if needed
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
            if (Array.isArray(parsedData)) {
                // Basic validation: check if items look like flashcards
                if (parsedData.every(item => item && typeof item.question === 'string' && Array.isArray(item.answers) && typeof item.correctAnswerIndex === 'number')) {
                     flashcards = parsedData;
                     console.log('Flashcards loaded from localStorage:', flashcards.length);
                } else {
                     console.warn('Stored data format is invalid. Using initial data.');
                     flashcards = [...initialFlashcards]; // Use copy of initial data
                }
            } else {
                console.warn('Stored data is not an array. Using initial data.');
                flashcards = [...initialFlashcards];
            }
        } catch (error) {
            console.error('Error parsing flashcards from localStorage:', error);
            flashcards = [...initialFlashcards]; // Use initial data on parse error
        }
    } else {
        console.log('No data in localStorage. Using initial data.');
        flashcards = [...initialFlashcards]; // Use copy of initial data
    }

    // Set initial card index after loading
    currentCardIndex = flashcards.length > 0 ? 0 : -1;
}

// --- KaTeX Rendering Helper ---
/**
 * Renders a LaTeX string into a target DOM element using KaTeX.
 * @param {string} latexString The LaTeX string to render.
 * @param {HTMLElement} targetElement The DOM element to render into.
 * @param {boolean} [isDisplayMode=false] Whether to use display mode (block) or inline mode.
 */
function renderMath(latexString, targetElement, isDisplayMode = false) {
    if (typeof katex === 'undefined') {
        console.error("KaTeX library is not loaded!");
        targetElement.textContent = latexString; // Fallback to raw text
        return;
    }
    try {
        katex.render(latexString, targetElement, {
            throwOnError: false, // Don't halt execution on minor errors
            displayMode: isDisplayMode
        });
    } catch (e) {
        console.error("KaTeX rendering error:", e);
        targetElement.textContent = latexString; // Fallback to raw text on error
    }
}

/**
 * Renders a LaTeX string to an HTML string using KaTeX.
 * @param {string} latexString The LaTeX string to render.
 * @param {boolean} [isDisplayMode=false] Whether to use display mode or inline mode.
 * @returns {string} The rendered HTML string or the original text on error.
 */
function renderMathToString(latexString, isDisplayMode = false) {
     if (typeof katex === 'undefined') {
        console.error("KaTeX library is not loaded!");
        return latexString; // Fallback
    }
    try {
       return katex.renderToString(latexString, {
            throwOnError: false,
            displayMode: isDisplayMode
        });
    } catch (e) {
        console.error("KaTeX rendering error to string:", e);
        return latexString; // Fallback
    }
}


// --- Form Submission ---
form.addEventListener('submit', function(event) {
    event.preventDefault();

    const questionInput = document.getElementById('question');
    const answerInputs = [
        document.getElementById('answer1'),
        document.getElementById('answer2'),
        document.getElementById('answer3'),
        document.getElementById('answer4')
    ];
    // IMPORTANT: Get values directly, assume they might contain LaTeX
    const question = questionInput.value; // No trim, preserve potential LaTeX spacing
    const answers = answerInputs.map(input => input.value); // No trim

    const correctAnswerInput = document.querySelector('input[name="correct_answer"]:checked');

    // Basic validation (non-empty)
    if (!question.trim()) {
         alert('Please enter the question.');
         questionInput.focus();
         return;
    }
     if (answers.some(ans => !ans.trim())) {
         alert('Please fill in all four answers.');
         const firstEmpty = answerInputs.find(input => !input.value.trim());
         if (firstEmpty) firstEmpty.focus();
         return;
     }
    if (!correctAnswerInput) {
        alert('Please select the correct answer.');
        return;
    }

    const correctAnswerIndex = parseInt(correctAnswerInput.value, 10) - 1;

    const flashcardData = {
        question: question, // Store raw input (potentially LaTeX)
        answers: answers,   // Store raw input (potentially LaTeX)
        correctAnswerIndex: correctAnswerIndex
    };

    flashcards.push(flashcardData);
    saveFlashcardsToStorage(); // Save immediately

    currentCardIndex = flashcards.length - 1;
    showCard(currentCardIndex); // Update display
    updateStartQuizButtonState();

    form.reset();
    questionInput.focus();
});

// --- Flashcard Viewer Logic ---
function showCard(index) {
    // Clear previous KaTeX content to avoid artifacts if elements are reused
    cardFrontP.innerHTML = '';
    cardBackP.innerHTML = '';

    if (flashcards.length === 0) {
        cardFrontP.textContent = 'Create a flashcard to start!'; // No KaTeX needed here
        interactiveArea.style.display = 'none';
        currentCardIndex = -1;
    } else {
        interactiveArea.style.display = 'flex';
        if (index < 0) index = 0;
        if (index >= flashcards.length) index = flashcards.length - 1;

        currentCardIndex = index;
        const card = flashcards[currentCardIndex];

        // Render question using KaTeX
        renderMath(card.question, cardFrontP, false); // Render inline

        // Render correct answer using KaTeX
        renderMath(card.answers[card.correctAnswerIndex], cardBackP, false); // Render inline

        cardContainer.classList.remove('flipped');
    }

    updateViewerButtonStates();
    updateCardCounter();
    updateStartQuizButtonState();

    if (!isQuizActive) {
        flashcardSection.style.display = 'block';
        quizSection.style.display = 'none';
    }
}

// --- Update UI States (no changes needed for KaTeX here) ---
function updateViewerButtonStates() {
    const hasCards = flashcards.length > 0;
    prevButton.disabled = !hasCards || currentCardIndex <= 0;
    nextButton.disabled = !hasCards || currentCardIndex >= flashcards.length - 1;
    flipButton.disabled = !hasCards;
}

function updateCardCounter() {
     cardCounter.textContent = `Card ${flashcards.length === 0 ? 0 : currentCardIndex + 1} of ${flashcards.length}`;
}

function updateStartQuizButtonState() {
    startQuizButton.disabled = flashcards.length === 0;
}

// --- Flashcard Viewer Event Listeners (no changes needed) ---
flipButton.addEventListener('click', () => { /* ... */ });
cardContainer.addEventListener('click', (event) => { /* ... */ });
nextButton.addEventListener('click', () => { /* ... */ });
prevButton.addEventListener('click', () => { /* ... */ });

// --- Quiz Logic ---
startQuizButton.addEventListener('click', () => { /* ... */ });

function startQuiz() {
    if (flashcards.length === 0) return;
    isQuizActive = true;
    flashcardSection.style.display = 'none';
    quizSection.style.display = 'block';
    quizIndices = Array.from(flashcards.keys());
    shuffleArray(quizIndices);
    correctlyAnsweredInQuiz = {};
    currentQuizQuestionIndex = 0;
    displayQuizQuestion();
}

function hideQuiz() {
    isQuizActive = false;
    quizSection.style.display = 'none';
    flashcardSection.style.display = flashcards.length > 0 ? 'block' : 'none';
    if (cardContainer) cardContainer.classList.remove('flipped');
    // Re-render the current card in the viewer when exiting quiz
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
        quizQuestionEl.textContent = "Quiz Finished!"; // No KaTeX needed
        quizOptionsEl.innerHTML = `<p>You have completed all ${flashcards.length} questions.</p>`;
        quizFeedbackEl.textContent = "You can review your cards or start the quiz again.";
        nextQuizButton.style.display = 'none';
        prevQuizButton.style.display = quizIndices.length > 1 ? 'inline-block' : 'none';
        // Add Back button
        const backButton = document.createElement('button');
        backButton.textContent = 'Back to Viewer';
        backButton.style.marginTop = '10px';
        backButton.onclick = hideQuiz;
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

    // Render quiz question using KaTeX
    renderMath(card.question, quizQuestionEl, false); // Render inline

    // Prepare and shuffle answer options
    const answerOptions = card.answers.map((answer, index) => ({
        text: answer, // Store raw LaTeX string
        originalIndex: index
    }));
    shuffleArray(answerOptions);

    // Create and render answer buttons
    answerOptions.forEach((option, i) => {
        const button = document.createElement('button');
        button.classList.add('quiz-option-button');
        button.id = `quiz-option-${i}`;
        button.disabled = false;

        // Render LaTeX inside the button using renderMathToString
        const renderedHtml = renderMathToString(option.text, false); // Render inline
        button.innerHTML = renderedHtml; // Set button content to rendered HTML

        button.addEventListener('click', () => handleAnswerSelection(
            option.originalIndex,
            card.correctAnswerIndex,
            flashcardIndex,
            button
        ));
        quizOptionsEl.appendChild(button);
    });

    updateQuizButtonStates();
}

function handleAnswerSelection(selectedIndex, correctIndex, flashcardIndex, clickedButton) {
    // ... (logic for checking correctness, setting feedback, disabling buttons) ...
    // No changes needed here specifically for KaTeX rendering itself
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
        quizFeedbackEl.textContent = "Incorrect. Try again!";
        quizFeedbackEl.className = 'feedback-incorrect';
        clickedButton.disabled = true;
        clickedButton.classList.add('incorrect-answer-attempt');
    }
    updateQuizButtonStates();
}

// --- Update Quiz Button States (no changes needed) ---
function updateQuizButtonStates() { /* ... */ }

// --- Quiz Event Listeners (no changes needed) ---
nextQuizButton.addEventListener('click', () => { /* ... */ });
prevQuizButton.addEventListener('click', () => { /* ... */ });

// --- Initial Application Setup ---
function initializeApp() {
    // Ensure KaTeX is loaded before trying to render
    if (typeof katex === 'undefined') {
         console.warn("KaTeX not loaded yet, retrying initialization shortly...");
         // Retry after a short delay. In a real app, you might use onload events.
         setTimeout(initializeApp, 100);
         return;
    }
    console.log("KaTeX loaded, initializing app.");
    loadFlashcards();
    showCard(currentCardIndex); // First render happens here
    hideQuiz();
    updateStartQuizButtonState();
}

// Start the application
initializeApp();
