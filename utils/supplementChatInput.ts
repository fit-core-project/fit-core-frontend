/**
 * Input text after the user cancels a pending question: put the question back,
 * but never overwrite something the user started typing meanwhile.
 */
export function restoreCanceledQuestion(currentInput: string, question: string): string {
    return currentInput.trim() ? currentInput : question
}
