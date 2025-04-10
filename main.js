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

// --- Quiz Elements ---
const interactiveArea = document.getElementById('interactive-area');
const flashcardSection = document.getElementById('flashcard-section');
const quizSection = document.getElementById('quiz-section');
const quizQuestionEl = document.getElementById('quiz-question');
const quizOptionsEl = document.getElementById('quiz-options');
const quizFeedbackEl = document.getElementById('quiz-feedback');
const prevQuizButton = document.getElementById('prev-quiz-button');
const nextQuizButton = document.getElementById('next-quiz-button');

let flashcards = [];
let currentCardIndex = -1; // For the viewer
let currentQuizQuestionIndex = -1; // Index within the shuffled quizIndices array
let quizIndices = []; // Shuffled array of actual flashcard indices for the quiz

// Store if the *current* quiz question (identified by its original flashcard index)
// has been answered *correctly* in the current quiz session.
let correctlyAnsweredInQuiz = {};

// --- Helper: Shuffle array --- 
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]]; // Swap elements
    }
}

// --- Form Submission --- 
form.addEventListener('submit', function(event) {
    event.preventDefault();

    const question = document.getElementById('question').value;
    const answers = [
        document.getElementById('answer1').value,
        document.getElementById('answer2').value,
        document.getElementById('answer3').value,
        document.getElementById('answer4').value
    ];

    const correctAnswerInput = document.querySelector('input[name="correct_answer"]:checked');
    if (!correctAnswerInput) {
        alert('Please select the correct answer.');
        return;
    }
    const correctAnswerIndex = parseInt(correctAnswerInput.value, 10) - 1;

    if (!question.trim() || answers.some(ans => !ans.trim())) {
        alert('Please fill in the question and all four answers.');
        return;
    }

    const flashcardData = {
        question: question,
        answers: answers,
        correctAnswerIndex: correctAnswerIndex
    };

    flashcards.push(flashcardData);
    console.log('Flashcard Created:', flashcardData);

    currentCardIndex = flashcards.length - 1;
    showCard(currentCardIndex);

    startQuiz(); // Restart quiz with the new card

    form.reset();
});

// --- Flashcard Viewer Logic --- 
function showCard(index) {
    if (flashcards.length === 0) {
        interactiveArea.style.display = 'none';
        currentCardIndex = -1;
        return;
    }

    interactiveArea.style.display = 'flex';

    if (index < 0 || index >= flashcards.length) {
         console.warn("showCard called with invalid index:", index);
         return;
    }

    const card = flashcards[index];
    cardFrontP.textContent = card.question;
    cardBackP.textContent = card.answers[card.correctAnswerIndex]; 

    cardContainer.classList.remove('flipped');
    updateViewerButtonStates();
    updateCardCounter();
}

function updateViewerButtonStates() {
    const hasCards = flashcards.length > 0;
    prevButton.disabled = !hasCards || currentCardIndex <= 0;
    nextButton.disabled = !hasCards || currentCardIndex >= flashcards.length - 1;
    flipButton.disabled = !hasCards;
}

function updateCardCounter() {
     if (flashcards.length === 0) {
         cardCounter.textContent = "Card 0 of 0";
     } else {
         cardCounter.textContent = `Card ${currentCardIndex + 1} of ${flashcards.length}`;
     }
}

// --- Flashcard Viewer Event Listeners ---
flipButton.addEventListener('click', () => {
    if (flashcards.length === 0) return;
    cardContainer.classList.toggle('flipped');
});

cardContainer.addEventListener('click', (event) => {
    if (event.target.closest('#flashcard-controls') || flashcards.length === 0) return;
    cardContainer.classList.toggle('flipped');
});

nextButton.addEventListener('click', () => {
    if (currentCardIndex < flashcards.length - 1) {
        currentCardIndex++;
        showCard(currentCardIndex);
    }
});

prevButton.addEventListener('click', () => {
    if (currentCardIndex > 0) {
        currentCardIndex--;
        showCard(currentCardIndex);
    }
});

// --- Quiz Logic --- 
function startQuiz() {
    if (flashcards.length === 0) {
        quizSection.style.display = 'none';
        return;
    }
    quizSection.style.display = 'block';
    quizIndices = Array.from(flashcards.keys()); 
    shuffleArray(quizIndices);
    correctlyAnsweredInQuiz = {}; // Reset correct answer tracking
    currentQuizQuestionIndex = 0;
    displayQuizQuestion();
}

function displayQuizQuestion() {
    if (currentQuizQuestionIndex < 0 || currentQuizQuestionIndex >= quizIndices.length) {
        // End of quiz
        quizQuestionEl.textContent = "Quiz Finished!";
        quizOptionsEl.innerHTML = '';
        quizFeedbackEl.textContent = `You have completed all ${flashcards.length} questions.`;
        quizFeedbackEl.className = '';
        nextQuizButton.style.display = 'none';
        prevQuizButton.style.display = currentQuizQuestionIndex > 0 ? 'inline-block' : 'none';
        return;
    }

    const flashcardIndex = quizIndices[currentQuizQuestionIndex];
    const card = flashcards[flashcardIndex];
    quizQuestionEl.textContent = card.question;
    quizOptionsEl.innerHTML = '';
    quizFeedbackEl.textContent = '';
    quizFeedbackEl.className = '';

    const answerOptions = card.answers.map((answer, index) => ({
        text: answer,
        originalIndex: index
    }));
    shuffleArray(answerOptions);

    answerOptions.forEach((option, i) => { // Added index `i` for button ID
        const button = document.createElement('button');
        button.textContent = option.text;
        button.classList.add('quiz-option-button');
        button.id = `quiz-option-${i}`; // Add an ID for re-enabling
        // Always enable buttons when displaying a question initially
        button.disabled = false; 
        button.addEventListener('click', () => handleAnswerSelection(option.originalIndex, card.correctAnswerIndex, flashcardIndex, button));
        quizOptionsEl.appendChild(button);
    });

    // Update button visibility (initially hide next)
    updateQuizButtonStates();
}

function handleAnswerSelection(selectedIndex, correctIndex, flashcardIndex, clickedButton) {
    const optionButtons = quizOptionsEl.querySelectorAll('.quiz-option-button');

    if (selectedIndex === correctIndex) {
        quizFeedbackEl.textContent = "Correct!";
        quizFeedbackEl.className = 'feedback-correct';
        correctlyAnsweredInQuiz[flashcardIndex] = true; // Mark as correctly answered

        // Disable all buttons
        optionButtons.forEach(button => button.disabled = true);

    } else {
        quizFeedbackEl.textContent = "Incorrect. Please try again.";
        quizFeedbackEl.className = 'feedback-incorrect';
        // Disable only the incorrectly clicked button
        clickedButton.disabled = true; 
        // Do not mark as correctly answered
        // Do not disable other buttons, allow user to try again
    }

    // Update button visibility based on whether the *current* question is now correct
    updateQuizButtonStates(); 
}

function updateQuizButtonStates() {
    const flashcardIndex = quizIndices[currentQuizQuestionIndex];
    // Check if the current question (by flashcardIndex) has been marked as correct
    const isCorrect = correctlyAnsweredInQuiz[flashcardIndex]; 

    // Show Prev button if not the first question
    prevQuizButton.style.display = currentQuizQuestionIndex > 0 ? 'inline-block' : 'none';

    // Show Next button ONLY if the current question has been answered correctly.
    // Handle the case where we might be at the end of the quiz.
    if (currentQuizQuestionIndex >= quizIndices.length) { // Already finished
        nextQuizButton.style.display = 'none';
    } else {
        nextQuizButton.style.display = isCorrect ? 'inline-block' : 'none';
    }
}

// --- Quiz Event Listeners ---
nextQuizButton.addEventListener('click', () => {
    // Only proceed if the current question was answered correctly (Next button is visible)
    if (nextQuizButton.style.display !== 'none' && currentQuizQuestionIndex < quizIndices.length - 1) {
        currentQuizQuestionIndex++;
        displayQuizQuestion();
    } else if (nextQuizButton.style.display !== 'none' && currentQuizQuestionIndex === quizIndices.length - 1) {
        // If on the last question and it's correct, show end state
        currentQuizQuestionIndex++; // Increment to trigger end state in displayQuizQuestion
        displayQuizQuestion();
    }
});

prevQuizButton.addEventListener('click', () => {
    if (currentQuizQuestionIndex > 0) {
        currentQuizQuestionIndex--;
        displayQuizQuestion(); // Re-display previous question
    }
});

// --- Initial Setup ---
interactiveArea.style.display = 'none';
showCard(currentCardIndex);

