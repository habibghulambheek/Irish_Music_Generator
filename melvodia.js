        // Configuration
        const API_URL = 'http://localhost:8000/generate';

        // DOM Elements
        const startCharInput = document.getElementById('startChar');
        const lengthInput = document.getElementById('length');
        const lengthValue = document.getElementById('lengthValue');
        const generateBtn = document.getElementById('generateBtn');
        const statusBadge = document.getElementById('statusBadge');
        const outputContent = document.getElementById('outputContent');
        const musicNotation = document.getElementById('music-notation');
        // global controls removed in favour of per-tune controls

        // State
        let tunes = [];                // array of ABC strings
        let visualObjs = [];           // visual object per tune
        let synths = {};               // synth instance per tune id
        let playingTuneId = null;

        // Update range slider value display
        lengthInput.addEventListener('input', (e) => {
            const value = e.target.value;
            lengthValue.textContent = value;
            
            // Update gradient
            const percentage = ((value - 100) / (2000 - 100)) * 100;
            e.target.style.background = `linear-gradient(to right, var(--accent) 0%, var(--accent) ${percentage}%, #E0E0E0 ${percentage}%, #E0E0E0 100%)`;
        });

        // Generate music
        async function generateMusic() {
            const startChar = startCharInput.value.trim();
            const length = parseInt(lengthInput.value);

            if (!startChar) {
                alert('Please enter a starting character');
                return;
            }

            // Update UI
            generateBtn.disabled = true;
            generateBtn.innerHTML = '<span class="loader"></span><span style="margin-left: 10px;">Generating...</span>';
            statusBadge.className = 'status-badge status-generating';
            statusBadge.textContent = 'Generating...';
            outputContent.innerHTML = '<div class="empty-state"><p>Creating your composition...</p></div>';
            musicNotation.style.display = 'none';

            try {
                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        start_char: startChar,
                        length: length
                    })
                });

                if (!response.ok) {
                    throw new Error('Failed to generate music');
                }

                const data = await response.json();

                // Normalize into an array of tunes
                if (Array.isArray(data.abc_notation)) {
                    tunes = data.abc_notation.slice();
                } else if (typeof data.abc_notation === 'string') {
                    tunes = [data.abc_notation];
                } else {
                    throw new Error('Unexpected API response format');
                }

                console.log('Received ABC notation array:', tunes);

                // Display the list of tunes (each separately)
                displayMusicList(tunes);

                // Update UI
                statusBadge.className = 'status-badge status-ready';
                statusBadge.textContent = 'Ready';

            } catch (error) {
                console.error('Error:', error);
                statusBadge.className = 'status-badge status-error';
                statusBadge.textContent = 'Error';
                outputContent.innerHTML = `
                    <div class="empty-state">
                        <h3>Something went wrong</h3>
                        <p>${error.message}</p>
                        <p style="margin-top: 10px; font-size: 0.9rem;">Make sure the API server is running at ${API_URL}</p>
                    </div>
                `;
            } finally {
                generateBtn.disabled = false;
                generateBtn.innerHTML = '<span>Generate Music</span>';
            }
        }

        // Display multiple tunes, each with its own notation and controls
        function displayMusicList(abcArray) {
            outputContent.style.display = 'block';
            outputContent.innerHTML = ''; // clear
            visualObjs = [];
            synths = {};
            playingTuneId = null;

            if (!window.ABCJS) {
                outputContent.innerHTML = '<div class="empty-state"><p style="color: #C62828;">ABC.js library not loaded</p></div>';
                return;
            }

            abcArray.forEach((abc, idx) => {
                const tuneId = `tune-${idx}`;

                // Create card for each tune
                const card = document.createElement('div');
                card.className = 'output-card';
                card.style.minHeight = 'auto';
                card.style.marginBottom = '16px';

                const header = document.createElement('div');
                header.className = 'output-header';

                const title = document.createElement('h3');
                title.className = 'output-title';
                title.textContent = `Composition #${idx + 1}`;

                const actionsWrap = document.createElement('div');

                // Buttons: play, pause, stop, download
                const playBtn = document.createElement('button');
                playBtn.className = 'control-btn primary';
                playBtn.textContent = '▶ Play';
                playBtn.id = `${tuneId}-play`;

                const pauseBtn = document.createElement('button');
                pauseBtn.className = 'control-btn';
                pauseBtn.textContent = '⏸ Pause';
                pauseBtn.id = `${tuneId}-pause`;
                pauseBtn.disabled = true;

                const stopBtn = document.createElement('button');
                stopBtn.className = 'control-btn';
                stopBtn.textContent = '⏹ Stop';
                stopBtn.id = `${tuneId}-stop`;
                stopBtn.disabled = true;

                const downloadBtn = document.createElement('button');
                downloadBtn.className = 'control-btn';
                downloadBtn.textContent = '⬇ Download MIDI';
                downloadBtn.id = `${tuneId}-download`;

                actionsWrap.appendChild(playBtn);
                actionsWrap.appendChild(pauseBtn);
                actionsWrap.appendChild(stopBtn);
                actionsWrap.appendChild(downloadBtn);

                header.appendChild(title);
                header.appendChild(actionsWrap);

                const notationDiv = document.createElement('div');
                notationDiv.id = tuneId;
                notationDiv.style.padding = '18px';
                notationDiv.style.background = '#FAFAFA';
                notationDiv.style.borderRadius = '12px';
                notationDiv.style.marginTop = '12px';

                card.appendChild(header);
                card.appendChild(notationDiv);

                outputContent.appendChild(card);

                // Render ABC into this tune's div
                try {
                    const vis = window.ABCJS.renderAbc(tuneId, abc, {
                        responsive: "resize",
                        staffwidth: Math.max(notationDiv.offsetWidth - 40, 300),
                    });
                    if (vis && vis.length > 0) {
                        visualObjs[idx] = vis[0];
                        console.log(`Rendered tune ${idx}`);
                    } else {
                        visualObjs[idx] = null;
                        notationDiv.innerHTML = `<p style="color: #C62828;">Could not render notation for this tune.</p>`;
                    }
                } catch (err) {
                    console.error('Render error for tune', idx, err);
                    visualObjs[idx] = null;
                    notationDiv.innerHTML = `<p style="color: #C62828;">Error rendering music notation: ${err.message}</p>`;
                }

                // Wire up controls for this tune
                playBtn.addEventListener('click', () => playTune(idx, playBtn, pauseBtn, stopBtn));
                pauseBtn.addEventListener('click', () => pauseTune(idx, playBtn, pauseBtn, stopBtn));
                stopBtn.addEventListener('click', () => stopTune(idx, playBtn, pauseBtn, stopBtn));
                downloadBtn.addEventListener('click', () => downloadTune(idx));
            });
        }

        // Play a specific tune
        async function playTune(idx, playBtn, pauseBtn, stopBtn) {
            if (!visualObjs[idx]) {
                alert('This tune cannot be played (no visual object).');
                return;
            }

            // If another tune is playing, stop it first
            if (playingTuneId !== null && playingTuneId !== idx) {
                const prevSynth = synths[playingTuneId];
                if (prevSynth) {
                    try { prevSynth.stop(); } catch (_) {}
                }
                // Optionally update previous buttons; simpler to reload UI on stop
            }

            try {
                let synth = synths[idx];
                if (!synth) {
                    if (!window.ABCJS.synth || !window.ABCJS.synth.CreateSynth) {
                        throw new Error('ABC.js synth not available');
                    }
                    synth = new window.ABCJS.synth.CreateSynth();
                    synths[idx] = synth;

                    await synth.init({
                        visualObj: visualObjs[idx],
                        options: {
                            ended: () => {
                                console.log(`Playback finished for tune ${idx}`);
                                playingTuneId = null;
                                playBtn.disabled = false;
                                pauseBtn.disabled = true;
                                stopBtn.disabled = true;
                            }
                        }
                    });
                    await synth.prime();
                }

                await synth.start();
                playingTuneId = idx;
                playBtn.disabled = true;
                pauseBtn.disabled = false;
                stopBtn.disabled = false;

            } catch (error) {
                console.error('Error playing tune:', error);
                alert(`Error playing music: ${error.message}\n\nTry generating the music again.`);
                playBtn.disabled = false;
                pauseBtn.disabled = true;
                stopBtn.disabled = true;
            }
        }

        // Pause tune
        function pauseTune(idx, playBtn, pauseBtn, stopBtn) {
            const synth = synths[idx];
            if (synth) {
                try {
                    synth.pause();
                    playingTuneId = null;
                    playBtn.disabled = false;
                    pauseBtn.disabled = true;
                } catch (err) {
                    console.error('Pause error:', err);
                }
            }
        }

        // Stop tune
        function stopTune(idx, playBtn, pauseBtn, stopBtn) {
            const synth = synths[idx];
            if (synth) {
                try {
                    synth.stop();
                } catch (err) {
                    console.error('Stop error:', err);
                }
            }
            playingTuneId = null;
            playBtn.disabled = false;
            pauseBtn.disabled = true;
            stopBtn.disabled = true;
        }

        // Download MIDI (per tune) with fallback to raw ABC if MIDI generation not available
        function downloadTune(idx) {
            const abcText = tunes[idx];
            if (!abcText) {
                alert('No music to download for this tune.');
                return;
            }

            // Helper: extract usable href or create blob URL
            function extractMidiHref(result) {
                if (!result) return null;

                // Direct data/blob URL string
                if (typeof result === 'string') {
                    const trimmed = result.trim();
                    if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) return { href: trimmed, revoke: false };
                    // Some ABCJS versions return an HTML string containing an <a> tag
                    if (trimmed.startsWith('<')) {
                        const tmp = document.createElement('div');
                        tmp.innerHTML = trimmed;
                        const a = tmp.querySelector('a');
                        if (a && a.href) return { href: a.href, revoke: false };
                        // fallback regex
                        const m = trimmed.match(/href=(["'])(.*?)\1/);
                        if (m && m[2]) return { href: m[2], revoke: false };
                    }
                    return null;
                }

                // DOM element (some ABCJS versions)
                if (result instanceof HTMLElement) {
                    const a = result.querySelector('a');
                    if (a && a.href) return { href: a.href, revoke: false };
                    return null;
                }

                // Binary data (ArrayBuffer / Uint8Array) -> create blob URL
                if (result instanceof ArrayBuffer || result instanceof Uint8Array) {
                    const array = result instanceof Uint8Array ? result.buffer : result;
                    const blob = new Blob([array], { type: 'audio/midi' });
                    const url = URL.createObjectURL(blob);
                    return { href: url, revoke: true };
                }

                // Unknown
                return null;
            }

            try {
                // Try MIDI via ABCJS if available
                if (window.ABCJS && window.ABCJS.synth && typeof window.ABCJS.synth.getMidiFile === 'function') {
                    let midiResult;
                    try {
                        // try raw abc first (some versions accept string)
                        midiResult = window.ABCJS.synth.getMidiFile(abcText);
                    } catch (e) {
                        // try visual object fallback
                        if (visualObjs[idx]) {
                            try { midiResult = window.ABCJS.synth.getMidiFile(visualObjs[idx]); } catch (e2) { midiResult = null; }
                        } else {
                            midiResult = null;
                        }
                    }

                    const extracted = extractMidiHref(midiResult);
                    if (extracted && extracted.href) {
                        const a = document.createElement('a');
                        a.href = extracted.href;
                        a.download = `melodia-${idx + 1}-${Date.now()}.mid`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        if (extracted.revoke) {
                            // revoke after a short delay to ensure download started
                            setTimeout(() => URL.revokeObjectURL(extracted.href), 2000);
                        }
                        console.log('MIDI downloaded for tune', idx);
                        return;
                    }
                }

                // Fallback: download ABC text as .abc file
                const blob = new Blob([abcText], { type: 'text/plain;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `melodia-${idx + 1}-${Date.now()}.abc`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                console.log('ABC file downloaded as fallback for tune', idx);

            } catch (error) {
                console.error('Error downloading tune', idx, error);
                alert(`Error creating download file: ${error.message}`);
            }
        }

        // Event listeners
        generateBtn.addEventListener('click', generateMusic);

        // Allow Enter key to generate
        startCharInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') generateMusic();
        });

        console.log('Music Generator initialized (multi-tune + per-tune download enabled)');
 