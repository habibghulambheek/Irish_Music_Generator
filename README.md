# Melodia - AI Music Composer

Melodia is an AI-powered music composition tool that generates original melodies in ABC notation using a trained LSTM neural network. The application features a modern web interface where users can create unique musical compositions by specifying a starting character and sequence length.

## Project Motivation

After learning about recurrent neural networks and sequence generation, I wanted to apply these concepts to creative AI. Music generation presented an interesting challenge: teaching a model to understand musical structure, patterns, and create coherent compositions. This project combines deep learning, music theory, and web development into a practical application that demonstrates AI's creative potential.

## Problem Solved

Composing music requires understanding of musical theory, patterns, and structure. Melodia addresses this by:

- Automatically generating musical compositions in ABC notation
- Allowing users to control composition length and starting points
- Providing immediate playback and visualization of generated music
- Offering MIDI downloads for further editing in music software

This makes music composition accessible to anyone, regardless of their musical background.

## Learning Outcomes

Building this project taught me:

- How to implement and train LSTM networks for sequence generation
- Working with ABC notation and music21 for music processing
- Building a FastAPI backend with proper CORS configuration
- Creating an interactive frontend with ABC.js for music visualization
- Handling model checkpoints and state management in PyTorch
- Using mixed precision training with GradScaler for efficiency
- Managing vocabulary and character-to-index mappings for text generation
- Implementing proper error handling for production-ready APIs
- Working with the Irish folk music dataset and preprocessing techniques

The biggest challenge was understanding how to maintain LSTM state across generations and implementing proper sampling strategies to create musically coherent sequences rather than repetitive patterns.

## Installation Instructions

### Backend Setup

1. Clone this repository
2. Install Python dependencies:
```bash
pip install torch fastapi uvicorn python-multipart pydantic datasets music21
```

3. Ensure you have the required model files in the backend directory:
   - `my_ckpt` (trained model checkpoint)
   - `char2idx.pkl` (character to index mapping)
   - `idx2char.pkl` (index to character mapping)

4. Start the FastAPI server:
```bash
python main.py
```

The API will run on `http://localhost:8000`

### Frontend Setup

1. Open `index.html` in a modern web browser
2. Ensure the backend server is running before generating music

## Usage Instructions

1. Open the Melodia web interface in your browser
2. Enter a starting character (typically 'X' for a new tune in ABC notation)
3. Adjust the sequence length slider (100-2000 characters)
4. Click "Generate Music" to create a composition
5. View the musical notation rendered on screen
6. Use the playback controls:
   - **Play**: Start audio playback
   - **Pause**: Pause the current playback
   - **Stop**: Stop and reset playback
   - **Download MIDI**: Save the composition for use in other software
7. Generate multiple times to explore different variations

## Model Training Details

The model was trained on 5000 Irish folk tunes from the "irishman" dataset with the following architecture:

- **Embedding dimension**: 256
- **Hidden size**: 2048
- **Sequence length**: 400 characters
- **Batch size**: 64
- **Learning rate**: 3e-4
- **Training iterations**: 5000

Training achieved a final loss of approximately 0.086, demonstrating strong pattern learning. The loss curves show steady convergence across multiple training runs, with the model learning musical structure and ABC notation syntax.

## Technical Architecture

### Backend (FastAPI + PyTorch)

- LSTM model with embedding layer for character-level generation
- FastAPI endpoints for music generation
- Model state management with proper device handling
- Vocabulary pickling for consistent encoding/decoding

### Frontend (HTML + JavaScript + ABC.js)

- Modern, responsive design with organic background animations
- ABC.js integration for music notation rendering
- Audio synthesis for immediate playback
- Per-composition controls for multi-tune generation

## Folder Structure
```
Melodia/
│
├── main.py                 # FastAPI backend with LSTM model
├── index.html              # Frontend web interface
├── my_ckpt                 # Trained model checkpoint
├── char2idx.pkl            # Character to index mapping
├── idx2char.pkl            # Index to character mapping
└── README.md               # Project documentation
```

## Training Process

The model was trained using:

1. Data loading from the irishman dataset (5000 shuffled songs)
2. ABC notation preprocessing and vocabulary extraction
3. Character-level vectorization with batching
4. LSTM training with Adam optimizer and CrossEntropyLoss
5. Mixed precision training using GradScaler for efficiency
6. Regular checkpoint saving to Google Drive for persistence
7. Comet ML experiment tracking for loss monitoring

## Credits

This project was fully developed by Habib Ghulam Bheek, combining deep learning research, music theory, and web development into a cohesive application.

## Contributions Welcome

Contributions are encouraged! Feel free to:

- Report bugs or suggest improvements
- Propose new features (different music styles, more control parameters)
- Improve the model architecture or training process
- Enhance the user interface

---
