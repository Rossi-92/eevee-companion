import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { ANIMATION_MAP } from '../constants/animationMap.js';
import { EEVEELUTIONS } from '../constants/eeveelutions.js';

const REACTION_LINES = {
  head: ['Vee~!', 'That tickles!', 'Eevee loves head pats!'],
  body: ['Hehe!', 'That tickles, Lili!', 'Eevee is ticklish there!'],
  tail: ['My tail!', 'Wag wag wag!', 'Catch it if you can!'],
};

export default function Scene3D({
  mood,
  currentForm,
  timePhase,
  isSleeping,
  onReaction,
}) {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const moodRef = useRef(mood);
  const sleepingRef = useRef(isSleeping);

  useEffect(() => {
    moodRef.current = mood;
    const s = sceneRef.current;
    if (s?.mixer) {
      s.mixer.timeScale = (ANIMATION_MAP[mood] || ANIMATION_MAP.idle).timeScale;
    }
  }, [mood]);

  useEffect(() => {
    sleepingRef.current = isSleeping;
  }, [isSleeping]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) {
      return;
    }

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, mount.clientWidth / mount.clientHeight, 0.1, 100);
    camera.position.set(0, 1.5, 5.8);

    const ambient = new THREE.AmbientLight(0xffffff, 1.6);
    const directional = new THREE.DirectionalLight(0xfff1cc, 1.7);
    directional.position.set(4, 8, 5);
    const fill = new THREE.DirectionalLight(0x8db8ff, 0.9);
    fill.position.set(-4, 3, -1);
    scene.add(ambient, directional, fill);

    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(2, 48),
      new THREE.MeshBasicMaterial({
        color: 0x3b2a1d,
        transparent: true,
        opacity: 0.18,
      }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -1.15;
    scene.add(ground);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const state = {
      clock: new THREE.Clock(),
      renderer,
      scene,
      camera,
      directional,
      fill,
      currentRig: null,
      interactiveZones: [],
      reactionCooldownUntil: 0,
      gltfCache: new Map(),
      currentForm,
      mood,
      mixer: null,
      currentAction: null,
    };
    sceneRef.current = state;

    function buildFallbackRig(formName) {
      const form = EEVEELUTIONS[formName] || EEVEELUTIONS.eevee;
      const rig = new THREE.Group();
      const fur = new THREE.MeshStandardMaterial({
        color: new THREE.Color(form.themeColor),
        roughness: 0.85,
        metalness: 0.05,
      });
      const cream = new THREE.MeshStandardMaterial({ color: 0xf4e8d2, roughness: 0.9 });

      const body = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 24), fur);
      body.scale.set(1.2, 0.95, 1.4);
      body.position.y = -0.05;
      rig.add(body);

      const chest = new THREE.Mesh(new THREE.SphereGeometry(0.55, 20, 18), cream);
      chest.scale.set(1, 1.1, 0.7);
      chest.position.set(0, -0.18, 0.78);
      rig.add(chest);

      const head = new THREE.Mesh(new THREE.SphereGeometry(0.72, 28, 22), fur);
      head.position.set(0, 0.95, 0.32);
      rig.add(head);

      const leftEar = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.95, 16), fur);
      leftEar.position.set(-0.38, 1.72, 0.2);
      leftEar.rotation.z = -0.48;
      leftEar.rotation.x = 0.12;
      rig.add(leftEar);

      const rightEar = leftEar.clone();
      rightEar.position.x = 0.38;
      rightEar.rotation.z = 0.48;
      rig.add(rightEar);

      const tail = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 1.35, 6, 12), fur);
      tail.position.set(0.96, 0.15, -0.75);
      tail.rotation.z = 0.92;
      tail.rotation.x = 0.36;
      rig.add(tail);

      const legs = [
        [-0.42, -1.05, 0.58],
        [0.42, -1.05, 0.58],
        [-0.48, -1.05, -0.48],
        [0.48, -1.05, -0.48],
      ].map(([x, y, z]) => {
        const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.78, 4, 10), fur);
        leg.position.set(x, y, z);
        rig.add(leg);
        return leg;
      });

      const headZone = new THREE.Mesh(
        new THREE.SphereGeometry(0.9, 16, 12),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 }),
      );
      headZone.position.copy(head.position);
      headZone.userData.zone = 'head';
      rig.add(headZone);

      const bodyZone = new THREE.Mesh(
        new THREE.SphereGeometry(1.25, 16, 12),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 }),
      );
      bodyZone.position.set(0, 0.1, 0.12);
      bodyZone.userData.zone = 'body';
      rig.add(bodyZone);

      const tailZone = new THREE.Mesh(
        new THREE.SphereGeometry(0.55, 12, 10),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 }),
      );
      tailZone.position.copy(tail.position);
      tailZone.userData.zone = 'tail';
      rig.add(tailZone);

      rig.position.y = -0.15;
      rig.userData.parts = { head, leftEar, rightEar, tail, body, legs };
      rig.userData.interactiveZones = [headZone, bodyZone, tailZone];
      return rig;
    }

    async function loadForm(formName) {
      const fallbackRig = buildFallbackRig(formName);
      const modelPath = EEVEELUTIONS[formName]?.model;
      const loader = new GLTFLoader();
      const cached = state.gltfCache.get(formName);

      const useRig = (rig, clips = []) => {
        if (state.currentRig) {
          scene.remove(state.currentRig);
        }
        if (state.mixer) {
          state.mixer.stopAllAction();
          state.mixer = null;
          state.currentAction = null;
        }
        state.currentRig = rig;
        state.currentForm = formName;
        state.interactiveZones = rig.userData.interactiveZones || [];
        scene.add(rig);
        console.log(`[Scene3D] ${formName} clips:`, clips.length ? clips.map((c) => c.name) : ['fallback-rig']);
        const clip = clips.find((c) => c.name === 'Armature|ArmatureAction');
        if (clip) {
          const mixer = new THREE.AnimationMixer(rig);
          mixer.timeScale = (ANIMATION_MAP[moodRef.current] || ANIMATION_MAP.idle).timeScale;
          mixer.clipAction(clip).play();
          state.mixer = mixer;
        }
      };

      if (cached) {
        useRig(cached.scene.clone(true), cached.animations);
        return;
      }

      if (!modelPath) {
        useRig(fallbackRig);
        return;
      }

      try {
        const gltf = await loader.loadAsync(modelPath);
        state.gltfCache.set(formName, gltf);
        const rig = gltf.scene.clone(true);
        rig.scale.setScalar(1.8);
        rig.position.y = -1.15;
        rig.userData.parts = fallbackRig.userData.parts;
        // Clone hit zones and add them as children of the loaded rig so the
        // raycaster can find them. Divide positions/scale by the rig's own
        // scale (1.8) so they appear at the correct world-space size.
        const INV = 1 / 1.8;
        const zones = fallbackRig.userData.interactiveZones.map((zone) => {
          const z = zone.clone();
          z.position.multiplyScalar(INV);
          z.scale.setScalar(INV);
          rig.add(z);
          return z;
        });
        rig.userData.interactiveZones = zones;
        useRig(rig, gltf.animations);
      } catch {
        useRig(fallbackRig);
      }
    }

    function updateLighting(phase) {
      const lightMap = {
        night: [0x7f9adf, 0.8, 0x7191d5, 0.5],
        dawn: [0xffc39e, 1.2, 0xd18fd2, 0.6],
        morning: [0xffe6bf, 1.5, 0xb7d3ff, 0.9],
        day: [0xffffff, 1.7, 0xb9dcff, 1],
        golden: [0xffd18e, 1.45, 0xffc27a, 0.75],
        dusk: [0xbe8cff, 1.1, 0x6a85c8, 0.55],
      };
      const [mainColor, mainIntensity, fillColor, fillIntensity] = lightMap[phase] || lightMap.day;
      state.directional.color.setHex(mainColor);
      state.directional.intensity = mainIntensity;
      state.fill.color.setHex(fillColor);
      state.fill.intensity = fillIntensity;
    }

    let rafId;
    function animate() {
      rafId = requestAnimationFrame(animate);
      const delta = state.clock.getDelta();
      const elapsed = state.clock.elapsedTime;
      state.mixer?.update(delta);
      const rig = state.currentRig;
      const parts = rig?.userData?.parts;
      const currentMood = moodRef.current;
      const sleeping = sleepingRef.current;

      if (parts) {
        rig.position.y = -0.15 + Math.sin(elapsed * 1.1) * (sleeping ? 0.02 : 0.05);
        rig.rotation.y = Math.sin(elapsed / 7) * 0.12;
        parts.head.rotation.z = currentMood === 'thinking' ? 0.1 : Math.sin(elapsed * 0.6) * 0.02;
        parts.head.rotation.y =
          currentMood === 'talking' || currentMood === 'happy'
            ? Math.sin(elapsed * 3) * 0.06
            : 0;
        parts.leftEar.rotation.z = -0.48 + Math.sin(elapsed * 0.8) * 0.08;
        parts.rightEar.rotation.z = 0.48 - Math.sin(elapsed * 0.9) * 0.08;
        parts.tail.rotation.y =
          currentMood === 'excited' ? Math.sin(elapsed * 7) * 0.7 : Math.sin(elapsed * 3) * 0.24;
        parts.body.scale.y = sleeping ? 0.85 : 0.95 + Math.sin(elapsed * 2) * 0.02;
      }

      camera.position.x = Math.sin(elapsed / 7) * 0.12;
      camera.lookAt(0, 0.35, 0);
      renderer.render(scene, camera);
    }

    function onPointerDown(event) {
      if (Date.now() < state.reactionCooldownUntil || sleepingRef.current) {
        return;
      }

      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(state.interactiveZones, false);
      const hit = hits[0];

      if (!hit) {
        return;
      }

      state.reactionCooldownUntil = Date.now() + 2000;
      const zone = hit.object.userData.zone || 'body';
      const options = REACTION_LINES[zone] || REACTION_LINES.body;
      const line = options[Math.floor(Math.random() * options.length)];
      onReaction(zone, line);
    }

    function handleResize() {
      const width = mount.clientWidth;
      const height = mount.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    }

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('resize', handleResize);
    updateLighting(timePhase);
    loadForm(currentForm);
    animate();

    return () => {
      cancelAnimationFrame(rafId);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('resize', handleResize);
      state.mixer?.stopAllAction();
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, []);

  useEffect(() => {
    const sceneState = sceneRef.current;
    if (!sceneState) {
      return;
    }

    const lightMap = {
      night: [0x7f9adf, 0.8, 0x7191d5, 0.5],
      dawn: [0xffc39e, 1.2, 0xd18fd2, 0.6],
      morning: [0xffe6bf, 1.5, 0xb7d3ff, 0.9],
      day: [0xffffff, 1.7, 0xb9dcff, 1],
      golden: [0xffd18e, 1.45, 0xffc27a, 0.75],
      dusk: [0xbe8cff, 1.1, 0x6a85c8, 0.55],
    };
    const [mainColor, mainIntensity, fillColor, fillIntensity] = lightMap[timePhase] || lightMap.day;
    sceneState.directional.color.setHex(mainColor);
    sceneState.directional.intensity = mainIntensity;
    sceneState.fill.color.setHex(fillColor);
    sceneState.fill.intensity = fillIntensity;
  }, [timePhase]);

  useEffect(() => {
    const sceneState = sceneRef.current;
    if (!sceneState || sceneState.currentForm === currentForm) {
      return;
    }
    const mount = mountRef.current;
    if (!mount) {
      return;
    }

    const loader = new GLTFLoader();
    const form = EEVEELUTIONS[currentForm] || EEVEELUTIONS.eevee;
    const fallbackGroup = new THREE.Group();
    const simple = new THREE.Mesh(
      new THREE.SphereGeometry(1, 32, 16),
      new THREE.MeshStandardMaterial({ color: form.themeColor, roughness: 0.8 }),
    );
    fallbackGroup.add(simple);
    fallbackGroup.userData.parts = {
      head: simple,
      leftEar: simple,
      rightEar: simple,
      tail: simple,
      body: simple,
      legs: [],
    };
    fallbackGroup.userData.interactiveZones = [simple];
    fallbackGroup.position.y = -0.15;

    const useRig = (rig, clips = []) => {
      if (sceneState.currentRig) {
        sceneState.scene.remove(sceneState.currentRig);
      }
      if (sceneState.mixer) {
        sceneState.mixer.stopAllAction();
        sceneState.mixer = null;
        sceneState.currentAction = null;
      }
      sceneState.currentRig = rig;
      sceneState.currentForm = currentForm;
      sceneState.interactiveZones = rig.userData.interactiveZones || [];
      sceneState.scene.add(rig);
      console.log(`[Scene3D] ${currentForm} clips:`, clips.length ? clips.map((c) => c.name) : ['fallback-rig']);
      const clip = clips.find((c) => c.name === 'Armature|ArmatureAction');
      if (clip) {
        const mixer = new THREE.AnimationMixer(rig);
        mixer.timeScale = (ANIMATION_MAP[moodRef.current] || ANIMATION_MAP.idle).timeScale;
        mixer.clipAction(clip).play();
        sceneState.mixer = mixer;
      }
    };

    loader
      .loadAsync(form.model)
      .then((gltf) => {
        const rig = gltf.scene.clone(true);
        rig.scale.setScalar(1.8);
        rig.position.y = -1.15;
        rig.userData.parts = fallbackGroup.userData.parts;
        const INV = 1 / 1.8;
        const zones = fallbackGroup.userData.interactiveZones.map((zone) => {
          const z = zone.clone();
          z.position.multiplyScalar(INV);
          z.scale.setScalar(INV);
          rig.add(z);
          return z;
        });
        rig.userData.interactiveZones = zones;
        useRig(rig, gltf.animations);
      })
      .catch(() => {
        useRig(fallbackGroup);
      });
  }, [currentForm]);

  return <div ref={mountRef} style={styles.canvas} />;
}

const styles = {
  canvas: {
    position: 'absolute',
    left: '50%',
    bottom: 72,
    transform: 'translateX(-50%)',
    width: 'min(840px, 68vw)',
    height: 'min(640px, 62vh)',
    zIndex: 5,
    pointerEvents: 'auto',
  },
};
