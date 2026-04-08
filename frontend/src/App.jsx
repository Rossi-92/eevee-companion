import { useEffect, useMemo, useRef, useState } from 'react';
import Background from './components/Background.jsx';
import ClockWidget from './components/ClockWidget.jsx';
import Controls from './components/Controls.jsx';
import LoadingScreen from './components/LoadingScreen.jsx';
import Scene3D from './components/Scene3D.jsx';
import SleepOverlay from './components/SleepOverlay.jsx';
import TrainerPIN from './components/TrainerPIN.jsx';
import WeatherWidget from './components/WeatherWidget.jsx';
import { EVOLUTION_NAMES, EEVEELUTIONS } from './constants/eeveelutions.js';
import { verifyPin, clearSession } from './systems/authManager.js';
import { sendMessage } from './systems/aiEngine.js';
import { audioManager } from './utils/audioManager.js';
import { normalizeMood } from './systems/moodEngine.js';
import { createSleepManager } from './systems/sleepManager.js';
import { getTimeOfDayState } from './systems/timeOfDay.js';
import { startContinuousListening, startListening, isVoiceInputSupported } from './systems/voiceInput.js';
import { speak } from './systems/voiceOutput.js';
import { fetchWeather } from './systems/weatherService.js';
import { acquireWakeLock, releaseWakeLock } from './utils/wakeLock.js';

const REACTION_SOUNDS = {
  head: 'touch_chirp',
  body: 'touch_giggle',
  tail: 'touch_swish',
};

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinError, setPinError] = useState('');
  const [isSubmittingPin, setIsSubmittingPin] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [weather, setWeather] = useState({
    temp: 14,
    condition: 'cloudy',
    label: 'Cloudy',
    icon: 'cloud',
  });
  const [mood, setMood] = useState('idle');
  const [convoState, setConvoState] = useState('resting');
  const [chatBubble, setChatBubble] = useState('Eevee is waiting in the clearing.');
  const [isSleeping, setIsSleeping] = useState(false);
  const [currentForm, setCurrentForm] = useState('eevee');
  const [pokemonOfTheDay, setPokemonOfTheDay] = useState('');
  const [pokemonBadgeVisible, setPokemonBadgeVisible] = useState(true);
  const [voiceSupported] = useState(isVoiceInputSupported());
  const [history, setHistory] = useState([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [evolutionFlash, setEvolutionFlash] = useState(false);
  const [ambientTint, setAmbientTint] = useState('transparent');
  const [faceTrackingNote, setFaceTrackingNote] = useState('');
  const lastInteractionRef = useRef(Date.now());
  const authRef = useRef(false);
  const sleepingRef = useRef(false);
  const speakingRef = useRef(false);
  const listeningRef = useRef(false);
  const formRef = useRef('eevee');
  const stopWakeWordRef = useRef(() => {});
  const sleepManagerRef = useRef(null);
  const shakeSamplesRef = useRef([]);

  const timeState = useMemo(
    () => getTimeOfDayState(now, weather.condition),
    [now, weather.condition],
  );

  useEffect(() => {
    authRef.current = isAuthenticated;
  }, [isAuthenticated]);

  useEffect(() => {
    sleepingRef.current = isSleeping;
  }, [isSleeping]);

  useEffect(() => {
    speakingRef.current = isSpeaking;
  }, [isSpeaking]);

  useEffect(() => {
    listeningRef.current = isListening;
  }, [isListening]);

  useEffect(() => {
    formRef.current = currentForm;
  }, [currentForm]);

  useEffect(() => {
    const loadingTimer = window.setTimeout(() => setIsLoading(false), 120);

    return () => {
      window.clearTimeout(loadingTimer);
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      stopWakeWordRef.current?.();
      stopWakeWordRef.current = () => {};
      sleepManagerRef.current?.stop();
      sleepManagerRef.current = null;
      releaseWakeLock();
      return;
    }

    let weatherTimer;
    const clockTimer = window.setInterval(() => setNow(new Date()), 1000);

    audioManager.preloadAll();
    acquireWakeLock();
    fetchWeather(buildApiHandlers()).then(setWeather);

    sleepManagerRef.current = createSleepManager({
      onIdleLine: (line) => {
        if (!sleepingRef.current && authRef.current && !speakingRef.current) {
          setChatBubble(line);
          setConvoState('idle');
        }
      },
      onSleep: () => handleSleep(),
      getCurrentForm: () => formRef.current,
    });
    sleepManagerRef.current.poke();

    function onVisibilityChange() {
      if (document.visibilityState === 'visible' && !sleepingRef.current) {
        acquireWakeLock();
      }
    }

    function onDeviceMotion(event) {
      const accel = event.accelerationIncludingGravity;
      if (!accel) {
        return;
      }

      const total = Math.sqrt(
        (accel.x || 0) ** 2 + (accel.y || 0) ** 2 + (accel.z || 0) ** 2,
      );
      const nowTime = Date.now();
      shakeSamplesRef.current = [
        ...shakeSamplesRef.current.filter((sample) => nowTime - sample.time < 500),
        { time: nowTime, total },
      ];

      const strong = shakeSamplesRef.current.filter((sample) => sample.total > 15);
      if (strong.length >= 3 && !sleepingRef.current) {
        shakeSamplesRef.current = [];
        triggerBubble('Woah! Eevee almost fell over!', 'surprised', 'reacting');
        audioManager.playSound('touch_chirp');
      }
    }

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('devicemotion', onDeviceMotion);

    if (!('FaceDetector' in window)) {
      setFaceTrackingNote('Local face tracking is not available in this browser, so Eevee uses gentle idle glances instead.');
    } else {
      setFaceTrackingNote('');
    }

    weatherTimer = window.setInterval(async () => {
      setWeather(await fetchWeather(buildApiHandlers()));
    }, 30 * 60 * 1000);

    return () => {
      window.clearInterval(clockTimer);
      window.clearInterval(weatherTimer);
      stopWakeWordRef.current?.();
      stopWakeWordRef.current = () => {};
      sleepManagerRef.current?.stop();
      sleepManagerRef.current = null;
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('devicemotion', onDeviceMotion);
      releaseWakeLock();
    };
  }, [isAuthenticated]);

  useEffect(() => {
    stopWakeWordRef.current?.();
    stopWakeWordRef.current = () => {};

    if (!isAuthenticated || !voiceSupported || isListening || isSpeaking) {
      return;
    }

    stopWakeWordRef.current = startContinuousListening((transcript) => {
      if (!authRef.current || listeningRef.current || speakingRef.current) {
        return;
      }

      if (sleepingRef.current) {
        handleWake();
      }

      const cleaned = transcript
        .replace(/(^|\b)(hi eevee|hey eevee|eevee)[,\s:]*/i, '')
        .trim();

      if (cleaned) {
        void runConversation(cleaned);
        return;
      }

      void handleTalk();
    });

    return () => {
      stopWakeWordRef.current?.();
      stopWakeWordRef.current = () => {};
    };
  }, [isAuthenticated, voiceSupported, isListening, isSpeaking]);

  function buildApiHandlers() {
    return {
      onUnauthorized: () => {
        clearSession();
        setIsAuthenticated(false);
        setPinError('Trainer session expired. Please enter the PIN again.');
      },
      onRateLimited: () => {
        setChatBubble('Eevee is resting for a moment.');
      },
    };
  }

  function buildContext() {
    const lastMinutes = Math.max(0, Math.round((Date.now() - lastInteractionRef.current) / 60000));
    return {
      time: now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      phase: timeState.phase,
      date: now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
      dayOfWeek: now.toLocaleDateString('en-GB', { weekday: 'long' }),
      weather: `${weather.label}, ${weather.temp}°C`,
      form: EEVEELUTIONS[currentForm]?.name || 'Eevee',
      lastInteraction: lastMinutes,
    };
  }

  async function handlePinSubmit(pin) {
    if (pin.length !== 4) {
      setPinError('Eevee needs all 4 digits.');
      return;
    }

    try {
      setIsSubmittingPin(true);
      setPinError('');
      await verifyPin(pin);
      setIsAuthenticated(true);
      setConvoState('awake');
      setChatBubble('Vee! Eevee is here and ready to play.');
      setMood('happy');
      sleepManagerRef.current?.poke();
    } catch (error) {
      setPinError(error.message);
    } finally {
      setIsSubmittingPin(false);
    }
  }

  function triggerBubble(text, nextMood = 'happy', nextState = 'awake') {
    lastInteractionRef.current = Date.now();
    sleepManagerRef.current?.poke();
    setChatBubble(text);
    setMood(nextMood);
    setConvoState(nextState);
    setPokemonBadgeVisible(true);
    window.clearTimeout(triggerBubble.timeoutId);
    window.clearTimeout(triggerBubble.badgeTimeoutId);
    triggerBubble.timeoutId = window.setTimeout(() => {
      setMood('idle');
      setConvoState('resting');
    }, 5000);
    triggerBubble.badgeTimeoutId = window.setTimeout(() => {
      setPokemonBadgeVisible(false);
    }, 30000);
  }

  async function runConversation(message) {
    if (!isAuthenticated || isSleeping) {
      return;
    }

    try {
      setConvoState('thinking');
      setMood('thinking');
      setChatBubble('...');
      const context = buildContext();
      const result = await sendMessage({
        message,
        context,
        history,
        handlers: buildApiHandlers(),
      });
      setHistory((current) => [
        ...current.slice(-19),
        { role: 'user', content: message },
        { role: 'assistant', content: result.text },
      ]);
      setPokemonOfTheDay(result.pokemonOfTheDay || pokemonOfTheDay);
      setIsSpeaking(true);
      triggerBubble(result.text, normalizeMood(result.text, result.mood), 'speaking');
      await speak(result.text, result.mood, buildApiHandlers());
    } catch (error) {
      setMood('sad');
      setConvoState('resting');
      console.error('[conversation] request failed', error);
    } finally {
      setIsSpeaking(false);
    }
  }

  async function handleTalk() {
    if (isListening || isSpeaking || !isAuthenticated || isSleeping) {
      return;
    }

    if (!voiceSupported) {
      await runConversation('Hello Eevee');
      return;
    }

    try {
      setIsListening(true);
      setConvoState('listening');
      setMood('thinking');
      setChatBubble('Listening...');
      const transcript = await startListening();
      await runConversation(transcript || 'Hello Eevee');
    } catch {
      await runConversation('Hello Eevee');
    } finally {
      setIsListening(false);
    }
  }

  function handlePet() {
    triggerBubble('Warm cuddles make Eevee happy.', 'happy', 'playing');
  }

  function handleSleep() {
    sleepManagerRef.current?.stop();
    setIsSleeping(true);
    setMood('sleepy');
    setConvoState('sleeping');
    setChatBubble('Yawn... goodnight, Lili.');
    releaseWakeLock();
  }

  function handleWake() {
    acquireWakeLock();
    sleepManagerRef.current?.poke();
    setIsSleeping(false);
    setMood('happy');
    setConvoState('awake');
    setChatBubble('Hi again! Eevee woke right up.');
    audioManager.playSound('wake_chime');
  }

  function handleReaction(zone, line) {
    triggerBubble(line, 'happy', 'playing');
    audioManager.playSound(REACTION_SOUNDS[zone] || 'touch_chirp');
  }

  async function handleEvolution(targetForm) {
    if (!isAuthenticated || isSleeping) {
      return;
    }

    const nextForm =
      targetForm ||
      EVOLUTION_NAMES.filter((name) => name !== currentForm)[
        Math.floor(Math.random() * EVOLUTION_NAMES.filter((name) => name !== currentForm).length)
      ];
    if (!nextForm) {
      return;
    }

    audioManager.playSound('evolution');
    setEvolutionFlash(true);
    window.setTimeout(() => {
      setCurrentForm(nextForm);
      setAmbientTint(EEVEELUTIONS[nextForm].ambientTint);
    }, 500);
    window.setTimeout(() => setEvolutionFlash(false), 1500);
    await runConversation(`Eevee, evolve [EVOLUTION:${nextForm}]`);
  }

  async function handlePokemonBadge() {
    setPokemonBadgeVisible(true);
    await runConversation('Tell me about the Pokémon of the Day');
  }

  const showCompanion = isAuthenticated && !isLoading;

  return (
    <div style={styles.app}>
      <Background timeState={timeState} />
      {showCompanion ? <ClockWidget now={now} tone={timeState.widgetTone} /> : null}
      {showCompanion ? (
        <>
          <Scene3D
            mood={mood}
            currentForm={currentForm}
            timePhase={timeState.phase}
            isSleeping={isSleeping}
            onReaction={handleReaction}
            onActivate={handleTalk}
          />

          <WeatherWidget weather={weather} tone={timeState.widgetTone} />
          <Controls 
            onTalk={handleTalk} 
            onPet={handlePet} 
            onSleep={handleSleep} 
            onEvolve={() => handleEvolution()} 
            disabled={isSleeping || isSpeaking || isListening} 
          />
          {evolutionFlash ? <div style={styles.flash} /> : null}
        </>
      ) : null}

      {isLoading && <LoadingScreen />}
      {!isAuthenticated && !isLoading && (
        <TrainerPIN
          onSubmit={handlePinSubmit}
          isSubmitting={isSubmittingPin}
          error={pinError}
        />
      )}
      <SleepOverlay visible={isSleeping} onWake={handleWake} />
    </div>
  );
}

const styles = {
  app: {
    position: 'relative',
    width: '100vw',
    height: '100vh',
    overflow: 'hidden',
  },
  flash: {
    position: 'absolute',
    inset: 0,
    zIndex: 21,
    background: 'radial-gradient(circle at center, rgba(255,255,255,0.95), rgba(255,255,255,0.1))',
    animation: 'flashFade 1.5s ease forwards',
  },
};
