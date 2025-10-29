import { BoardState, WordInfo } from '../types/board';

export interface ScoreBreakdown {
    points: number;  // Sum of all letter scores
    multi: number;   // Total number of letters
    total: number;   // points × multi
}

export interface PlayScore {
    totalScore: number;
    breakdown: ScoreBreakdown;
}

/**
 * Calculate score for a single word using the formula: (sum of letter scores) × word length
 */
export function calculateWordScore(word: WordInfo, board: BoardState): number {
    let points = 0;
    let letterCount = 0;

    if (word.direction === 'horizontal') {
        // Calculate for horizontal word
        for (let col = word.position.col; col < word.position.col + word.word.length; col++) {
            const cell = board[word.position.row][col];
            if (cell.tile) {
                points += cell.tile.score;
                letterCount++;
            }
        }
    } else {
        // Calculate for vertical word
        for (let row = word.position.row; row < word.position.row + word.word.length; row++) {
            const cell = board[row][word.position.col];
            if (cell.tile) {
                points += cell.tile.score;
                letterCount++;
            }
        }
    }

    return points * letterCount;
}

/**
 * Calculate score breakdown for current (unlocked) words
 */
export function calculateCurrentPlayScore(board: BoardState): PlayScore {
    const words = findAllWords(board);
    const currentWords = words.filter(w => !w.isLocked);
    
    let totalScore = 0;
    let totalPoints = 0;
    let totalLetters = 0;

    for (const word of currentWords) {
        const wordScore = calculateWordScore(word, board);
        totalScore += wordScore;
        
        // Add to breakdown totals
        if (word.direction === 'horizontal') {
            for (let col = word.position.col; col < word.position.col + word.word.length; col++) {
                const cell = board[word.position.row][col];
                if (cell.tile) {
                    totalPoints += cell.tile.score;
                    totalLetters++;
                }
            }
        } else {
            for (let row = word.position.row; row < word.position.row + word.word.length; row++) {
                const cell = board[row][word.position.col];
                if (cell.tile) {
                    totalPoints += cell.tile.score;
                    totalLetters++;
                }
            }
        }
    }

    return {
        totalScore,
        breakdown: {
            points: totalPoints,
            multi: totalLetters,
            total: totalPoints * totalLetters
        }
    };
}

/**
 * Calculate cumulative score from all played (locked) words
 */
export function calculateTotalScore(board: BoardState): number {
    const words = findAllWords(board);
    const playedWords = words.filter(w => w.isLocked);
    
    let totalScore = 0;
    for (const word of playedWords) {
        totalScore += calculateWordScore(word, board);
    }

    return totalScore;
}

// Import the findAllWords function from boardUtils
import { findAllWords } from './boardUtils';
