// All active GLB models contain exactly one animation clip named
// 'Armature|ArmatureAction'. Mood differentiation is achieved via timeScale
// (playback rate) plus the procedural layer in Scene3D.jsx.
export const ANIMATION_MAP = {
  idle:      { clip: 'Armature|ArmatureAction', timeScale: 1.0, fadeIn: 0.4 },
  happy:     { clip: 'Armature|ArmatureAction', timeScale: 1.3, fadeIn: 0.3 },
  excited:   { clip: 'Armature|ArmatureAction', timeScale: 1.9, fadeIn: 0.25 },
  thinking:  { clip: 'Armature|ArmatureAction', timeScale: 0.7, fadeIn: 0.5 },
  sad:       { clip: 'Armature|ArmatureAction', timeScale: 0.6, fadeIn: 0.5 },
  sleepy:    { clip: 'Armature|ArmatureAction', timeScale: 0.4, fadeIn: 1.0 },
  surprised: { clip: 'Armature|ArmatureAction', timeScale: 2.0, fadeIn: 0.2 },
  talking:   { clip: 'Armature|ArmatureAction', timeScale: 1.1, fadeIn: 0.3 },
};

export const MODEL_ANIMATION_OVERRIDES = {};
