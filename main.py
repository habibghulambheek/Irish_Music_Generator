# main.py

import os
import pickle
import torch
import torch.nn as nn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# --- Model Definition ---
class LTSM_Model(nn.Module):
    def __init__(self, vocab_size, embedding_size, hidden_size):
        super(LTSM_Model, self).__init__()
        self.vocab_size = vocab_size
        self.embedding_size = embedding_size
        self.hidden_size = hidden_size
        self.embeddings = nn.Embedding(vocab_size, embedding_size)
        self.lstm = nn.LSTM(embedding_size, hidden_size, batch_first=True)
        self.linear = nn.Linear(hidden_size, vocab_size)

    def init_hidden(self, batch_size, device):
        return (torch.zeros(1, batch_size, self.hidden_size).to(device),
                torch.zeros(1, batch_size, self.hidden_size).to(device))

    def forward(self, x, state=None, return_state=True):
        device = x.device
        batch_size = x.shape[0]
        if state is None:
            state = self.init_hidden(batch_size, device)
        x = self.embeddings(x)
        x, state = self.lstm(x, state)
        x = self.linear(x)
        return (x, state) if return_state else x

# --- Application State ---
# We use a dictionary to store our model and related data.
# This ensures they are loaded only once.
app_state = {}

# --- FastAPI App Initialization ---
app = FastAPI(
    title="Music Generation API",
    description="An API to generate music using a pre-trained LSTM model.",
    version="1.0.0",
)

# --- CORS Middleware ---
# This allows your frontend (even when opened as a local file) to communicate with the backend.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# --- Lifespan Events (Startup/Shutdown) ---
@app.on_event("startup")
async def startup_event():
    """
    On startup, load the model, vocabulary, and set the device.
    """
    curr_dir = os.getcwd()
    
    # Define paths
    idx2char_path = os.path.join(curr_dir, 'idx2char.pkl')
    char2idx_path = os.path.join(curr_dir, 'char2idx.pkl')
    checkpoint_path = os.path.join(curr_dir, 'my_ckpt')

    # Check for file existence
    for path in [idx2char_path, char2idx_path, checkpoint_path]:
        if not os.path.exists(path):
            raise FileNotFoundError(f"Required file not found: {path}")

    # Load vocabulary
    app_state['idx2char'] = pickle.load(open(idx2char_path, 'rb'))
    app_state['char2idx'] = pickle.load(open(char2idx_path, 'rb'))
    
    # Set device
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    app_state['device'] = device
    
    # Instantiate the model
    model = LTSM_Model(
        vocab_size=len(app_state['idx2char']),
        embedding_size=256,
        hidden_size=2048
    )
    
    # Load the checkpoint
    try:
        checkpoint = torch.load(checkpoint_path, map_location=device)
        model.load_state_dict(checkpoint)
    except Exception as e:
        raise RuntimeError(f"Error loading model checkpoint: {e}")

    # Move model to device and set to evaluation mode
    model = model.to(device)
    model.eval()
    
    app_state['model'] = model
    print(f"Model loaded successfully on device: {device}")


# --- Music Generation Logic ---
def generate_music(model, char, seq_length, char2idx, idx2char, device):
    """
    Generates a sequence of characters (music) based on a starting character.
    """
    if char not in char2idx:
        raise ValueError(f"Character '{char}' not in vocabulary.")

    input_seq = torch.tensor([[char2idx[char]]]).to(device)
    sequence = [char]
    
    curr_state = model.init_hidden(input_seq.shape[0], device)

    with torch.no_grad(): # Disable gradient calculation for inference
        for _ in range(seq_length):
            logits, curr_state = model(input_seq, curr_state)
            logits = logits.view(-1, logits.shape[-1])
            
            # Use softmax to get probabilities and multinomial to sample
            probabilities = torch.softmax(logits, dim=-1)
            next_token = torch.multinomial(probabilities, num_samples=1)
            
            input_seq = next_token
            sequence.append(idx2char[next_token.item()])
            
    return ''.join(sequence)

# --- API Endpoint ---
class GenerateRequest(BaseModel):
    start_char: str
    length: int

@app.post("/generate")
async def generate_endpoint(request: GenerateRequest):
    """
    Endpoint to generate music. Takes a starting character and sequence length.
    """
    try:
        music_sequence = generate_music(
            model=app_state['model'],
            char=request.start_char,
            seq_length=request.length,
            char2idx=app_state['char2idx'],
            idx2char=app_state['idx2char'],
            device=app_state['device']
        )
        tunes = music_sequence.split('/n/n')
        print(len(tunes),tunes)
        return {"abc_notation": tunes}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        # Catch-all for any other unexpected errors during generation
        raise HTTPException(status_code=500, detail=f"An internal error occurred: {e}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

