import eeveeModel from '../../assets/models/eevee.glb?url';
import vaporeonModel from '../../assets/models/vaporeon.glb?url';
import jolteonModel from '../../assets/models/jolteon.glb?url';
import flareonModel from '../../assets/models/flareon.glb?url';
import espeonModel from '../../assets/models/espeon.glb?url';
import umbreonModel from '../../assets/models/umbreon.glb?url';
import leafeonModel from '../../assets/models/leafeon.glb?url';
import glaceonModel from '../../assets/models/glaceon.glb?url';

export const EEVEELUTIONS = {
  eevee: {
    name: 'Eevee',
    type: 'Normal',
    model: eeveeModel,
    themeColor: '#c8894d',
    particleEffect: null,
    ambientTint: 'transparent',
    cryFile: '/assets/audio/eevee_cry.ogg',
    personality: 'playful',
    idleLines: [
      'Eevee is sniffing the breeze for adventure.',
      'Do you think there are berries nearby, Lili?',
      'The forest feels cosy today.',
    ],
  },
  vaporeon: {
    name: 'Vaporeon',
    type: 'Water',
    model: vaporeonModel,
    themeColor: '#6390F0',
    particleEffect: 'bubbles',
    ambientTint: 'rgba(50,100,200,0.06)',
    cryFile: '/assets/audio/vaporeon_cry.ogg',
    personality: 'serene',
    idleLines: ['The air feels soft and watery today.'],
  },
  jolteon: {
    name: 'Jolteon',
    type: 'Electric',
    model: jolteonModel,
    themeColor: '#F7D02C',
    particleEffect: 'sparks',
    ambientTint: 'rgba(200,180,50,0.05)',
    cryFile: '/assets/audio/jolteon_cry.ogg',
    personality: 'zippy',
    idleLines: ['Zzzap! Jolteon is ready to race.'],
  },
  flareon: {
    name: 'Flareon',
    type: 'Fire',
    model: flareonModel,
    themeColor: '#EE8130',
    particleEffect: 'embers',
    ambientTint: 'rgba(200,100,30,0.05)',
    cryFile: '/assets/audio/flareon_cry.ogg',
    personality: 'warm',
    idleLines: ['Flareon feels wonderfully cosy.'],
  },
  espeon: {
    name: 'Espeon',
    type: 'Psychic',
    model: espeonModel,
    themeColor: '#F95587',
    particleEffect: 'psychicOrbs',
    ambientTint: 'rgba(180,80,150,0.04)',
    cryFile: '/assets/audio/espeon_cry.ogg',
    personality: 'thoughtful',
    idleLines: ['Espeon senses bright thoughts nearby.'],
  },
  umbreon: {
    name: 'Umbreon',
    type: 'Dark',
    model: umbreonModel,
    themeColor: '#705746',
    particleEffect: 'moonGlow',
    ambientTint: 'rgba(40,40,80,0.06)',
    cryFile: '/assets/audio/umbreon_cry.ogg',
    personality: 'cool',
    idleLines: ['Umbreon likes the quiet of the evening.'],
  },
  leafeon: {
    name: 'Leafeon',
    type: 'Grass',
    model: leafeonModel,
    themeColor: '#7AC74C',
    particleEffect: 'leaves',
    ambientTint: 'rgba(80,160,50,0.05)',
    cryFile: '/assets/audio/leafeon_cry.ogg',
    personality: 'nature-loving',
    idleLines: ['Leafeon could stay in this clearing all day.'],
  },
  glaceon: {
    name: 'Glaceon',
    type: 'Ice',
    model: glaceonModel,
    themeColor: '#96D9D6',
    particleEffect: 'snowflakes',
    ambientTint: 'rgba(100,180,200,0.05)',
    cryFile: '/assets/audio/glaceon_cry.ogg',
    personality: 'poised',
    idleLines: ['Glaceon loves crisp, cool air.'],
  },
};

export const EVOLUTION_NAMES = Object.keys(EEVEELUTIONS).filter((name) => name !== 'eevee');
