//const player = require("play-sound")();
const { exec } = require("child_process");
const path = require("path");
const audioPlay = require("audio-play");
const audioLoader = require("audio-loader");

class Queue {
  constructor() {
    this.items = [];
  }

  // Add an element to the queue
  enqueue(element) {
    if (!this.items.includes(element)) {
      // Check for duplicates
      this.items.push(element);
      console.log("Enqueued:", element);
      this.playSound();
      console.log("Sound played!");
    } else {
      console.log("Duplicate detected, not enqueuing:", element);
    }
  }

  // Remove and return the front element of the queue
  dequeue() {
    if (this.isEmpty()) {
      throw new Error("Queue is empty");
    }
    return this.items.shift();
  }

  // Return the front element of the queue without removing it
  peek() {
    if (this.isEmpty()) {
      throw new Error("Queue is empty");
    }
    return this.items[0];
  }

  // Check if the queue is empty
  isEmpty() {
    return this.items.length === 0;
  }

  // Get the size of the queue
  size() {
    return this.items.length;
  }

  // Clear the queue
  clear() {
    this.items = [];
  }
  async playSound() {
    const soundFilePath = path.resolve(__dirname, "audio_pings/ping1.wav"); // Use .mp3 or .wav
    console.log("Attempting to play sound from:", soundFilePath);

    try {
      const audioBuffer = await audioLoader(soundFilePath); // Load the audio file
      audioPlay(audioBuffer); // Play the audio
      console.log("Sound played successfully!");
    } catch (err) {
      console.error("Error playing sound:", err);
    }
  }
}

module.exports = Queue;
