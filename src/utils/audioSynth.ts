/**
 * Web Audio API synthesizer for party sound effects and live microphone vocal pitch/energy analysis.
 * Zero external audio assets required; runs 100% reliably in-browser.
 */

export type MCVoiceGender = 'random' | 'girl' | 'man';

export interface MCHostInfo {
  gender: 'girl' | 'man';
  hostName: string;
  avatar: string;
  voiceTitle: string;
  voiceName?: string;
}

export interface MCSpeakOptions {
  gender?: MCVoiceGender;
  onPhrase?: (phrase: string, hostInfo: MCHostInfo) => void;
  onComplete?: () => void;
}

class AudioService {
  private ctx: AudioContext | null = null;
  private micStream: MediaStream | null = null;
  private micSource: MediaStreamAudioSourceNode | null = null;
  private analyser: AnalyserNode | null = null;
  private isListening = false;

  // Real-time singing stats during a song
  private sampleCount = 0;
  private totalRms = 0;
  private peakRms = 0;
  private activeSingingFrames = 0;
  private pitchVariations: number[] = [];

  private getContext(): AudioContext {
    if (!this.ctx || this.ctx.state === 'closed') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  // --- Sound Effects ---

  /**
   * Classic Videoke score tick: short retro electronic blip during score roll-up.
   * pitchRatio: 0 to 1 as score ticks up from 0 to final score.
   */
  playScoreTick(pitchRatio: number = 0.5) {
    try {
      const ctx = this.getContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      // Pitch steps up from 440Hz to 1250Hz as numbers roll up
      const freq = 440 + Math.min(1, Math.max(0, pitchRatio)) * 810;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.06, ctx.currentTime + 0.035);

      gain.gain.setValueAtTime(0.14, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.045);

      // Light retro click/snare hit
      const clickOsc = ctx.createOscillator();
      const clickGain = ctx.createGain();
      clickOsc.type = 'square';
      clickOsc.frequency.setValueAtTime(180, ctx.currentTime);
      clickGain.gain.setValueAtTime(0.06, ctx.currentTime);
      clickGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.02);
      clickOsc.connect(clickGain);
      clickGain.connect(ctx.destination);
      clickOsc.start(ctx.currentTime);
      clickOsc.stop(ctx.currentTime + 0.025);
    } catch {
      // ignore
    }
  }

  /**
   * The dramatic Videoke Score Impact Hit when the final score locks in!
   * Heavy gong/bell chime + bass kick + cymbal crash.
   */
  playVideokeScoreImpact(score: number = 90) {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;

      // 1. Tubular bell chime / gong (iconic videoke score bell)
      const gongFreqs = [523.25, 784, 1046.5, 1568, 2093]; // C5, G5, C6, G6, C7
      gongFreqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);

        const amp = 0.16 / (idx + 1);
        gain.gain.setValueAtTime(amp, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.8 + idx * 0.2);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 2.2);
      });

      // 2. Punchy sub kick hit
      const kickOsc = ctx.createOscillator();
      const kickGain = ctx.createGain();
      kickOsc.type = 'sine';
      kickOsc.frequency.setValueAtTime(150, now);
      kickOsc.frequency.exponentialRampToValueAtTime(36, now + 0.22);
      kickGain.gain.setValueAtTime(0.35, now);
      kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
      kickOsc.connect(kickGain);
      kickGain.connect(ctx.destination);
      kickOsc.start(now);
      kickOsc.stop(now + 0.25);

      // 3. Crash shimmer
      this.playCymbalCrash();
    } catch {
      // ignore
    }
  }

  /**
   * Iconic Videoke Machine Fanfare Jingle (Trumpet / Synth Brass fanfare)
   */
  playVideokeFanfare(score: number = 90) {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;

      if (score >= 90) {
        // High Score Fanfare: Ta-da-da-da-DAAA! (Iconic videoke brass fanfare)
        const brassNotes = [
          { f: 523.25, t: 0.0, d: 0.12 }, // C5
          { f: 659.25, t: 0.14, d: 0.12 }, // E5
          { f: 783.99, t: 0.28, d: 0.14 }, // G5
          { f: 1046.5, t: 0.44, d: 0.36 }, // C6
          { f: 1318.5, t: 0.82, d: 0.16 }, // E6
          { f: 1174.6, t: 1.00, d: 0.16 }, // D6
          { f: 1046.5, t: 1.18, d: 0.90 }, // C6 (grand finish)
        ];

        // Harmonizing brass chord on final hit
        const harmonyNotes = [
          { f: 523.25, t: 1.18, d: 0.90 }, // C5
          { f: 659.25, t: 1.18, d: 0.90 }, // E5
          { f: 783.99, t: 1.18, d: 0.90 }, // G5
        ];

        [...brassNotes, ...harmonyNotes].forEach((note) => {
          const osc = ctx.createOscillator();
          const filter = ctx.createBiquadFilter();
          const gain = ctx.createGain();

          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(note.f, now + note.t);

          // Warm brass filter
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(2600, now + note.t);

          gain.gain.setValueAtTime(0, now + note.t);
          gain.gain.linearRampToValueAtTime(0.2, now + note.t + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, now + note.t + note.d);

          osc.connect(filter);
          filter.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now + note.t);
          osc.stop(now + note.t + note.d + 0.05);
        });

        // Crowd whistle on celebration
        setTimeout(() => {
          this.playPartyWhistle();
        }, 1100);
      } else if (score >= 75) {
        // Good score fanfare: energetic major roll
        const notes = [
          { f: 392.00, t: 0.0, d: 0.14 }, // G4
          { f: 523.25, t: 0.16, d: 0.14 }, // C5
          { f: 659.25, t: 0.32, d: 0.16 }, // E5
          { f: 783.99, t: 0.50, d: 0.22 }, // G5
          { f: 1046.5, t: 0.74, d: 0.75 }, // C6
        ];

        notes.forEach((note) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(note.f, now + note.t);
          gain.gain.setValueAtTime(0, now + note.t);
          gain.gain.linearRampToValueAtTime(0.22, now + note.t + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, now + note.t + note.d);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + note.t);
          osc.stop(now + note.t + note.d + 0.05);
        });
      } else {
        // Cheerful encouragement jingle
        const notes = [
          { f: 523.25, t: 0.0, d: 0.16 }, // C5
          { f: 440.00, t: 0.18, d: 0.16 }, // A4
          { f: 349.23, t: 0.36, d: 0.18 }, // F4
          { f: 392.00, t: 0.56, d: 0.20 }, // G4
          { f: 523.25, t: 0.78, d: 0.60 }, // C5
        ];

        notes.forEach((note) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(note.f, now + note.t);
          gain.gain.setValueAtTime(0.2, now + note.t);
          gain.gain.exponentialRampToValueAtTime(0.001, now + note.t + note.d);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + note.t);
          osc.stop(now + note.t + note.d + 0.05);
        });
      }
    } catch {
      // ignore
    }
  }

  /**
   * Cheerful party whistle (high-frequency warble) typical of party videoke crowd
   */
  playPartyWhistle() {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(2200, now);
      osc.frequency.linearRampToValueAtTime(2800, now + 0.15);
      osc.frequency.linearRampToValueAtTime(2600, now + 0.35);

      // Tremolo / warble
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.setValueAtTime(14, now);
      lfoGain.gain.setValueAtTime(150, now);
      lfo.connect(osc.frequency);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      lfo.start(now);
      osc.start(now);
      lfo.stop(now + 0.45);
      osc.stop(now + 0.45);
    } catch {
      // ignore
    }
  }

  /**
   * Keywords to identify female speech voices
   */
  private readonly femaleKeywords = [
    'female', 'girl', 'woman', 'samantha', 'victoria', 'karen', 'zira', 'jenny', 'aria',
    'tessa', 'fiona', 'moira', 'veena', 'alice', 'susan', 'sara', 'sarah', 'amy', 'emma',
    'hazel', 'catherine', 'helena', 'heather', 'linda', 'claire', 'elizabeth', 'stephanie',
    'charlotte', 'kate', 'mary', 'anna', 'zoe', 'eva', 'grace', 'ruby', 'chloe', 'sophie',
    'amelia', 'lucy', 'natalie', 'maya', 'laura', 'olivia', 'isabella', 'mila', 'elena'
  ];

  /**
   * Keywords to identify male speech voices
   */
  private readonly maleKeywords = [
    'male', 'man', 'boy', 'guy', 'david', 'george', 'daniel', 'alex', 'fred', 'mark',
    'oliver', 'arthur', 'tom', 'james', 'robert', 'john', 'michael', 'brian', 'joshua',
    'kevin', 'ryan', 'eric', 'steven', 'andrew', 'paul', 'jason', 'justin', 'brandon',
    'samuel', 'patrick', 'jack', 'tyler', 'adam', 'nathan', 'henry', 'peter', 'ethan',
    'noah', 'sean', 'austin', 'jordan', 'logan', 'alan', 'richard', 'charles', 'matthew'
  ];

  private readonly girlHostNames = ['MC Maya', 'MC Sarah', 'MC Chloe', 'MC Bella', 'MC Gigi', 'MC Harper'];
  private readonly manHostNames = ['MC Marcus', 'MC Leo', 'MC Dave', 'MC Jax', 'MC Bruno', 'MC Ricky'];

  /**
   * Resolve an energetic, joyful voice matching either girl or man persona
   */
  private getMCVoiceByGender(targetGender: 'girl' | 'man'): {
    voice: SpeechSynthesisVoice | null;
    hostName: string;
    avatar: string;
    voiceTitle: string;
  } {
    let voices: SpeechSynthesisVoice[] = [];
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      voices = window.speechSynthesis.getVoices() || [];
    }

    if (targetGender === 'girl') {
      const hostName = this.girlHostNames[Math.floor(Math.random() * this.girlHostNames.length)];
      const femaleMatches = voices.filter((v) => {
        const name = (v.name + ' ' + v.voiceURI).toLowerCase();
        return this.femaleKeywords.some((k) => name.includes(k)) && !name.includes('bad');
      });

      // Prefer English female voice if available
      const enFemale = femaleMatches.find((v) => v.lang.startsWith('en')) || femaleMatches[0];
      return {
        voice: enFemale || voices.find((v) => v.lang.startsWith('en')) || voices[0] || null,
        hostName,
        avatar: '👩',
        voiceTitle: 'Joyful Girl MC'
      };
    } else {
      const hostName = this.manHostNames[Math.floor(Math.random() * this.manHostNames.length)];
      const maleMatches = voices.filter((v) => {
        const name = (v.name + ' ' + v.voiceURI).toLowerCase();
        return this.maleKeywords.some((k) => name.includes(k)) && !name.includes('bad');
      });

      // Prefer English male voice if available
      const enMale = maleMatches.find((v) => v.lang.startsWith('en')) || maleMatches[0];
      return {
        voice: enMale || voices.find((v) => v.lang.startsWith('en')) || voices[0] || null,
        hostName,
        avatar: '👨',
        voiceTitle: 'Happy Guy MC'
      };
    }
  }

  /**
   * Master of Ceremonies (MC / Party Emcee) speech announcement.
   * Plays in a super joyful, happy voice, randomly switching between a girl or man voice,
   * or following a user-selected gender option ('random' | 'girl' | 'man').
   */
  speakMasterOfCeremonies(
    score: number,
    singerName: string,
    optionsOrPhraseCb?: MCSpeakOptions | ((phrase: string) => void),
    onCompleteCb?: () => void
  ): { phrase: string; hostInfo: MCHostInfo } {
    try {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        return {
          phrase: '',
          hostInfo: {
            gender: 'girl',
            hostName: 'MC Maya',
            avatar: '👩',
            voiceTitle: 'Joyful Girl MC'
          }
        };
      }
      window.speechSynthesis.cancel(); // cancel any active speech

      const cleanName = singerName && singerName.trim() ? singerName.trim() : 'our superstar';

      // Parse options (supports backward-compatibility where 3rd arg was onPhrase callback)
      let targetGender: MCVoiceGender = 'random';
      let onPhrase: ((phrase: string, hostInfo: MCHostInfo) => void) | undefined;
      let onComplete: (() => void) | undefined = onCompleteCb;

      if (typeof optionsOrPhraseCb === 'function') {
        onPhrase = (phrase, _info) => (optionsOrPhraseCb as (p: string) => void)(phrase);
      } else if (optionsOrPhraseCb && typeof optionsOrPhraseCb === 'object') {
        targetGender = optionsOrPhraseCb.gender || 'random';
        onPhrase = optionsOrPhraseCb.onPhrase;
        if (optionsOrPhraseCb.onComplete) {
          onComplete = optionsOrPhraseCb.onComplete;
        }
      }

      // If random: 50% chance joyful girl, 50% chance happy man!
      const actualGender: 'girl' | 'man' =
        targetGender === 'random'
          ? Math.random() < 0.5
            ? 'girl'
            : 'man'
          : targetGender;

      const voiceData = this.getMCVoiceByGender(actualGender);

      const hostInfo: MCHostInfo = {
        gender: actualGender,
        hostName: voiceData.hostName,
        avatar: voiceData.avatar,
        voiceTitle: voiceData.voiceTitle,
        voiceName: voiceData.voice?.name
      };

      // Distinct, joyful, and happy scripts for Girl MC vs Guy MC
      let phrases: string[] = [];

      if (actualGender === 'girl') {
        // Joyful, happy, sweet, and enthusiastic Girl MC
        if (score >= 95) {
          phrases = [
            `Woo-hooo! Oh my gosh, hold on to your seats, everybody! Look at that gorgeous scoreboard! Give it up for our superstar, ${cleanName}! Scoring a phenomenal, jaw-dropping ${score} points! You were absolutely sparkling and dazzling up here! Put your hands together, party people!`,
            `Yay, yay, YAY! Oh my goodness, ${cleanName}, you just blew everyone away with an incredible ${score} points! What an angelic, powerhouse voice! You are a true queen of the stage tonight! Take a bow!`,
            `Oh look at that! Total perfection! Everyone make some noise for ${cleanName} with ${score} shining points! I am so in love with your singing! That was pure magic!`,
            `Woo! Can we get a massive cheer for ${cleanName}! A stunning ${score} points on the board! You brought so much joy, passion, and beauty to that song! Absolutely brilliant!`
          ];
        } else if (score >= 88) {
          phrases = [
            `Woo-hoo! Yes, yes! What a super fun and joyful performance by ${cleanName}! Bringing home a fabulous ${score} points! Big cheers and high-fives for ${cleanName}, everybody! You brought pure sunshine to this room!`,
            `Yay! That was so sweet and wonderful! Look at the board—${score} sparkling points for ${cleanName}! Keep that joy going, ladies and gentlemen! You were amazing!`,
            `Oh, that made my heart so happy! Let's hear it loud and clear for ${cleanName} with ${score} beautiful points! You got everyone smiling and dancing!`,
            `Make some noise, party people! ${cleanName} just lit up the whole stage with ${score} lovely points! Fantastic singing, darling!`
          ];
        } else if (score >= 78) {
          phrases = [
            `Yay! What a super fun tune! Let's hear it loud and happy for ${cleanName} with ${score} points! You brought so much positive energy and love to the stage! Fantastic job!`,
            `Aww, give some big love to ${cleanName} with ${score} points on the scoreboard! You were having so much fun up there, and we loved every single second of it!`,
            `Woo! That was delightful! Round of applause for ${cleanName} scoring ${score} points! You kept everyone dancing and clapping along!`
          ];
        } else {
          phrases = [
            `Aww, yes! That is what karaoke joy is all about! Big round of applause for ${cleanName} with ${score} points! You have the brightest smile and the best party spirit! Who wants to sing next!`,
            `Yay! Let's give big love to ${cleanName} with ${score} points! Pure happiness and great courage! You made us all smile, superstar!`
          ];
        }
      } else {
        // Cheerful, booming, hype, charismatic Guy MC
        if (score >= 95) {
          phrases = [
            `BOOM! Ladies and gentlemen, make some serious noise for ${cleanName}! Look at that board—a monstrous, jaw-dropping ${score} points! You absolutely owned that stage tonight, superstar! That was pure fire!`,
            `Whoaaaa! Hold the phone, party people! ${cleanName} just tore the roof off this place with a mammoth ${score} points! Give it up for our superstar! That was legendary!`,
            `Yes, yes, YES! Make some noise, everybody! An astounding ${score} points for ${cleanName}! That is gold-standard, world-class karaoke! Take a bow, my friend!`,
            `Oh my goodness! Unstoppable! Everyone cheer loud for ${cleanName}! A massive ${score} points! That is how you sing your heart out! Round of applause!`
          ];
        } else if (score >= 88) {
          phrases = [
            `Alright, alright! Now THAT is how you get a party rocking! Massive round of applause for ${cleanName} crushing it with ${score} points! You brought the house down, champion!`,
            `Make some noise, party people! ${cleanName} brought the rhythm, the groove, and ${score} big points! What a performance! Keep that music pumping!`,
            `Yes sir! Let's hear it loud for ${cleanName}! Rocking the microphone with ${score} wonderful points! You killed it up there, buddy!`,
            `Boom! ${cleanName} just lit up this whole party with ${score} points on the board! Outstanding vocals and pure energy!`
          ];
        } else if (score >= 78) {
          phrases = [
            `Hey, hey, hey! That's what I call good-time entertainment! Give some love to ${cleanName} scoring a solid ${score} points! Pure heart, pure fun, and great vibes all around!`,
            `Alright party people! Round of applause for ${cleanName} bringing the good times with ${score} points! Great singing, my friend!`,
            `Yes! What a jam! Let's hear it for ${cleanName} rocking ${score} points! You kept the whole crew hyped up!`
          ];
        } else {
          phrases = [
            `Yeah! That is what karaoke is all about—pure joy, no fear! Let's give huge love to ${cleanName} with ${score} points! What a champ! Keep that microphone hot!`,
            `Alright! Big respect for ${cleanName} bringing the fun with ${score} points! Pure entertainment! Who is stepping up next to rock the mic!`
          ];
        }
      }

      const phrase = phrases[Math.floor(Math.random() * phrases.length)];
      const utterance = new SpeechSynthesisUtterance(phrase);

      // Pitch and rate characteristics tailored to Joyful Girl vs Happy Guy
      if (actualGender === 'girl') {
        utterance.pitch = 1.34; // Bright, joyful, sparkly girl host register
        utterance.rate = 1.08; // Upbeat, lively cadence
      } else {
        utterance.pitch = 0.98; // Warm, resonant, energetic guy hypeman register
        utterance.rate = 1.06; // Punchy, brisk party cadence
      }
      utterance.volume = 1.0;

      if (voiceData.voice) {
        utterance.voice = voiceData.voice;
      }

      if (onPhrase) {
        onPhrase(phrase, hostInfo);
      }

      utterance.onend = () => {
        if (onComplete) onComplete();
      };

      utterance.onerror = () => {
        if (onComplete) onComplete();
      };

      // Play a quick celebratory whistle or cheer as MC kicks off
      if (score >= 90) {
        setTimeout(() => this.playPartyWhistle(), 80);
      }

      window.speechSynthesis.speak(utterance);
      return { phrase, hostInfo };
    } catch {
      return {
        phrase: '',
        hostInfo: {
          gender: 'girl',
          hostName: 'MC Maya',
          avatar: '👩',
          voiceTitle: 'Joyful Girl MC'
        }
      };
    }
  }

  /**
   * Stop any current Master of Ceremony speech
   */
  stopSpeech() {
    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    } catch {
      // ignore
    }
  }

  /**
   * Backward-compatible alias for speakMasterOfCeremonies
   */
  speakVideokeAnnouncer(score: number, singerName: string) {
    return this.speakMasterOfCeremonies(score, singerName).phrase;
  }

  playFanfare() {
    try {
      const ctx = this.getContext();
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      const times = [0, 0.15, 0.3, 0.48];

      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + times[idx]);

        gain.gain.setValueAtTime(0, ctx.currentTime + times[idx]);
        gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + times[idx] + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + times[idx] + (idx === 3 ? 1.0 : 0.4));

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime + times[idx]);
        osc.stop(ctx.currentTime + times[idx] + (idx === 3 ? 1.0 : 0.45));
      });
    } catch {
      // ignore
    }
  }

  /**
   * Authentic videoke crowd cheering, whistling, clapping, and roaring applause.
   * Multi-layered Web Audio synthesis with realistic acoustics (no synthetic voice).
   */
  playCheeringAndApplause(durationSeconds = 4.0) {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;

      // 1. Layer 1: Clapping & Applause (Pink noise + random clapping impulse transients)
      const bufferSize = Math.floor(ctx.sampleRate * durationSeconds);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);

      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        let sample = b0 + b1 + b2 + white * 0.2;
        // Periodic rapid clap bursts simulating hundreds of hands clapping
        if (Math.random() < 0.006) {
          sample += (Math.random() * 2 - 1) * 3.8;
        }
        data[i] = sample * 0.22;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const clapFilter = ctx.createBiquadFilter();
      clapFilter.type = 'bandpass';
      clapFilter.frequency.setValueAtTime(1250, now);
      clapFilter.Q.setValueAtTime(1.1, now);

      const clapGain = ctx.createGain();
      clapGain.gain.setValueAtTime(0.01, now);
      clapGain.gain.linearRampToValueAtTime(0.5, now + 0.25);
      clapGain.gain.setValueAtTime(0.5, now + durationSeconds * 0.65);
      clapGain.gain.exponentialRampToValueAtTime(0.001, now + durationSeconds);

      noise.connect(clapFilter);
      clapFilter.connect(clapGain);
      clapGain.connect(ctx.destination);
      noise.start(now);

      // 2. Layer 2: Crowd Cheering ("Woooo-Hooo!" vocalized harmonic formant sweeps)
      const cheerVoices = [
        { startFreq: 380, endFreq: 520, delay: 0.05, dur: 1.6 },
        { startFreq: 440, endFreq: 620, delay: 0.15, dur: 1.8 },
        { startFreq: 320, endFreq: 460, delay: 0.22, dur: 1.9 },
        { startFreq: 500, endFreq: 700, delay: 0.35, dur: 1.5 },
      ];

      cheerVoices.forEach(({ startFreq, endFreq, delay, dur }) => {
        const osc = ctx.createOscillator();
        const formantFilter = ctx.createBiquadFilter();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(startFreq, now + delay);
        osc.frequency.exponentialRampToValueAtTime(endFreq, now + delay + dur * 0.4);
        osc.frequency.linearRampToValueAtTime(endFreq * 0.92, now + delay + dur);

        // Vocal formant filter for realistic "Wooo" crowd cheer
        formantFilter.type = 'bandpass';
        formantFilter.frequency.setValueAtTime(650, now + delay);
        formantFilter.Q.setValueAtTime(3.5, now + delay);

        gain.gain.setValueAtTime(0.001, now + delay);
        gain.gain.linearRampToValueAtTime(0.14, now + delay + 0.15);
        gain.gain.exponentialRampToValueAtTime(0.001, now + delay + dur);

        osc.connect(formantFilter);
        formantFilter.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + delay);
        osc.stop(now + delay + dur + 0.05);
      });

      // 3. Layer 3: Excited Party Whistles at peak
      setTimeout(() => this.playPartyWhistle(), 250);
      setTimeout(() => this.playPartyWhistle(), 950);
    } catch {
      // ignore
    }
  }

  playApplause(durationSeconds = 3.5) {
    this.playCheeringAndApplause(durationSeconds);
  }

  playAirhorn() {
    try {
      const ctx = this.getContext();
      const freqs = [311.13, 370.0, 466.16]; // Eb4, Gb4, Bb4
      const bursts = [0, 0.18, 0.36];

      bursts.forEach((startDelay) => {
        freqs.forEach((f) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(f, ctx.currentTime + startDelay);
          osc.frequency.linearRampToValueAtTime(f * 1.04, ctx.currentTime + startDelay + 0.12);

          gain.gain.setValueAtTime(0.15, ctx.currentTime + startDelay);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startDelay + 0.14);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(ctx.currentTime + startDelay);
          osc.stop(ctx.currentTime + startDelay + 0.15);
        });
      });
    } catch {
      // ignore
    }
  }

  playDrumroll() {
    try {
      const ctx = this.getContext();
      // Rapid noise bursts accelerating
      const totalHits = 24;
      let delay = 0;
      for (let i = 0; i < totalHits; i++) {
        const interval = Math.max(0.03, 0.1 - (i / totalHits) * 0.07);
        delay += interval;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(140 + Math.random() * 30, ctx.currentTime + delay);

        gain.gain.setValueAtTime(0.05 + (i / totalHits) * 0.15, ctx.currentTime + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.05);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime + delay + 0.06);
      }

      // Final crash cymbal at end
      setTimeout(() => {
        this.playCymbalCrash();
      }, delay * 1000);
    } catch {
      // ignore
    }
  }

  playCymbalCrash() {
    try {
      const ctx = this.getContext();
      const bufferSize = ctx.sampleRate * 1.2;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.2;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(4500, ctx.currentTime);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      noise.start();
    } catch {
      // ignore
    }
  }

  playBuzzer() {
    try {
      const ctx = this.getContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(130, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch {
      // ignore
    }
  }

  playDing() {
    try {
      const ctx = this.getContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
      osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.08); // A6
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch {
      // ignore
    }
  }

  // --- Live Microphone Audio & Pitch Tracking ---

  async startMic(): Promise<boolean> {
    try {
      if (this.isListening && this.analyser) return true;
      const ctx = this.getContext();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      this.micStream = stream;
      this.micSource = ctx.createMediaStreamSource(stream);
      this.analyser = ctx.createAnalyser();
      this.analyser.fftSize = 512;
      this.analyser.smoothingTimeConstant = 0.8;

      this.micSource.connect(this.analyser);
      // NOTE: Do NOT connect analyser to ctx.destination to avoid mic feedback loop!

      this.isListening = true;
      this.resetSongStats();
      return true;
    } catch (err) {
      console.warn('Microphone access denied or unavailable:', err);
      this.isListening = false;
      return false;
    }
  }

  stopMic() {
    if (this.micStream) {
      this.micStream.getTracks().forEach((track) => track.stop());
      this.micStream = null;
    }
    if (this.micSource) {
      try {
        this.micSource.disconnect();
      } catch {
        // ignore
      }
      this.micSource = null;
    }
    this.analyser = null;
    this.isListening = false;
  }

  getIsListening(): boolean {
    return this.isListening;
  }

  resetSongStats() {
    this.sampleCount = 0;
    this.totalRms = 0;
    this.peakRms = 0;
    this.activeSingingFrames = 0;
    this.pitchVariations = [];
  }

  /**
   * Sample current microphone metrics for real-time visualization & score accumulation
   */
  sampleMic(): {
    volumePercent: number; // 0 - 100
    frequencyData: Uint8Array;
    estimatedPitchHz: number | null;
  } {
    const emptyResult = {
      volumePercent: 0,
      frequencyData: new Uint8Array(32),
      estimatedPitchHz: null,
    };

    if (!this.analyser || !this.isListening) {
      return emptyResult;
    }

    const bufferLength = this.analyser.frequencyBinCount;
    const freqData = new Uint8Array(bufferLength);
    this.analyser.getByteFrequencyData(freqData);

    const timeData = new Uint8Array(bufferLength);
    this.analyser.getByteTimeDomainData(timeData);

    // Calculate RMS volume
    let sumSquares = 0;
    for (let i = 0; i < bufferLength; i++) {
      const normalized = (timeData[i] - 128) / 128;
      sumSquares += normalized * normalized;
    }
    const rms = Math.sqrt(sumSquares / bufferLength);
    const volumePercent = Math.min(100, Math.round(rms * 280));

    // Estimate dominant vocal frequency (peak bin in human voice range: 80Hz - 1100Hz)
    const nyquist = (this.ctx?.sampleRate || 44100) / 2;
    const binWidth = nyquist / bufferLength;
    let maxAmp = 0;
    let peakBin = -1;

    for (let i = 2; i < bufferLength / 2; i++) {
      const freq = i * binWidth;
      if (freq >= 85 && freq <= 1150) {
        if (freqData[i] > maxAmp) {
          maxAmp = freqData[i];
          peakBin = i;
        }
      }
    }

    const estimatedPitchHz = maxAmp > 40 && peakBin > 0 ? Math.round(peakBin * binWidth) : null;

    // Track singing stats
    this.sampleCount++;
    this.totalRms += volumePercent;
    if (volumePercent > this.peakRms) this.peakRms = volumePercent;
    if (volumePercent > 12) {
      this.activeSingingFrames++;
      if (estimatedPitchHz) {
        this.pitchVariations.push(estimatedPitchHz);
      }
    }

    return {
      volumePercent,
      frequencyData: freqData.slice(0, 32),
      estimatedPitchHz,
    };
  }

  getAccumulatedStats() {
    const avgVolume = this.sampleCount > 0 ? this.totalRms / this.sampleCount : 0;
    const singingRatio = this.sampleCount > 0 ? this.activeSingingFrames / this.sampleCount : 0;

    // Calculate pitch consistency / stability
    let stabilityScore = 80;
    if (this.pitchVariations.length > 10) {
      let diffSum = 0;
      for (let i = 1; i < this.pitchVariations.length; i++) {
        diffSum += Math.abs(this.pitchVariations[i] - this.pitchVariations[i - 1]);
      }
      const avgDiff = diffSum / (this.pitchVariations.length - 1);
      // Reasonable pitch transitions for singing melody are ~15-60Hz
      stabilityScore = Math.max(65, Math.min(98, Math.round(95 - avgDiff * 0.25)));
    }

    return {
      samples: this.sampleCount,
      avgVolume,
      peakVolume: this.peakRms,
      singingRatio,
      stabilityScore,
      hasMicData: this.sampleCount > 20 && this.activeSingingFrames > 5,
    };
  }
}

export const audioService = new AudioService();
