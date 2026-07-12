"use client"; 
import React, { useState, useEffect } from "react"; 


export default function Typewriter({
  words,
  typingSpeed = 100,
  deletingSpeed = 60,
  delayBetweenWords = 2500,
}: {
  words: string[];
  typingSpeed?: number;
  deletingSpeed?: number;
  delayBetweenWords?: number;
}) {
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [currentText, setCurrentText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    const fullWord = words[currentWordIndex];

    if (!isDeleting) {
      if (currentText === fullWord) {
        timer = setTimeout(() => setIsDeleting(true), delayBetweenWords);
      } else {
        timer = setTimeout(() => {
          setCurrentText(fullWord.substring(0, currentText.length + 1));
        }, typingSpeed);
      }
    } else {
      if (currentText === "") {
        timer = setTimeout(() => {
          setIsDeleting(false);
          setCurrentWordIndex((prev) => (prev + 1) % words.length);
        }, 0);
      } else {
        timer = setTimeout(() => {
          setCurrentText(fullWord.substring(0, currentText.length - 1));
        }, deletingSpeed);
      }
    }

    return () => clearTimeout(timer);
  }, [currentText, isDeleting, currentWordIndex, words, typingSpeed, deletingSpeed, delayBetweenWords]);

  return (
    <span className="inline-flex items-center text-left min-h-[1.2em]">
     
      <span className="bg-gradient-to-r from-teal-600 to-indigo-600 bg-clip-text text-transparent dark:from-teal-400 dark:to-indigo-400">
        {currentText}
      </span>
      {/* Separate cursor so it doesn't get masked out by the text gradient */}
      <span className="ml-1 inline-block w-[3px] h-[1em] bg-teal-600 dark:bg-teal-400 animate-pulse align-middle" />
    </span>
  );
}